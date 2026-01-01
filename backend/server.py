from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Body, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import bcrypt
import jwt
from bson import ObjectId
import math
import hashlib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create geospatial indexes
async def create_indexes():
    await db.civil_reports.create_index([("location", "2dsphere")])
    await db.civil_tracks.create_index([("currentLocation.coordinates", "2dsphere")])
    await db.security_teams.create_index([("teamLocation.coordinates", "2dsphere")])

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'safeguard-secret-key-2025')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24 * 30  # 30 days

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ===== MODELS =====
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    confirm_password: str
    phone: Optional[str] = None
    full_name: Optional[str] = None
    role: str = "civil"  # "civil" or "security"
    invite_code: Optional[str] = None  # Required for security role
    security_sub_role: Optional[str] = None  # "supervisor" or "team_member" for security
    team_name: Optional[str] = None  # Optional team name for security

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class AdminLogin(BaseModel):
    email: EmailStr
    password: str

class GoogleAuthData(BaseModel):
    google_id: str
    email: EmailStr
    name: str
    role: str = "civil"

class LocationPoint(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    emergency_category: Optional[str] = None  # For panic events: violence, robbery, kidnapping, etc.

class SetTeamLocation(BaseModel):
    latitude: float
    longitude: float
    radius_km: float = 10.0  # Default 10km radius

class ReportCreate(BaseModel):
    type: str  # "video" or "audio"
    caption: Optional[str] = None
    is_anonymous: bool = False
    file_url: Optional[str] = None
    thumbnail: Optional[str] = None
    uploaded: bool = False
    latitude: float
    longitude: float

class UserSearch(BaseModel):
    search_term: str  # phone or email

class AppCustomization(BaseModel):
    app_name: str
    app_logo: str

class UpdateLocation(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None

class UpdateStatus(BaseModel):
    status: str  # "available", "busy", "responding", "offline"

class UpdateSecuritySettings(BaseModel):
    visibility_radius_km: Optional[int] = None
    status: Optional[str] = None
    is_visible: Optional[bool] = None

class SendMessage(BaseModel):
    to_user_id: str
    content: str
    message_type: str = "text"  # "text", "image", "location", "voice"

class CreateInviteCode(BaseModel):
    code: Optional[str] = None  # Auto-generate if not provided
    max_uses: int = 10
    expires_days: int = 30

# ===== HELPER FUNCTIONS =====
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        'user_id': user_id,
        'email': email,
        'role': role,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.split(' ')[1]
    payload = verify_token(token)
    user = await db.users.find_one({'_id': ObjectId(payload['user_id'])})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in km using Haversine formula"""
    R = 6371  # Earth's radius in km
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c

def geohash(lat: float, lon: float, precision: int = 6) -> str:
    """Simple geohash implementation"""
    return hashlib.md5(f"{lat:.{precision}f},{lon:.{precision}f}".encode()).hexdigest()[:precision]

# Import services
from services import (
    firebase_service,
    paystack_service,
    expo_push_service,
    email_service
)

# Real Push Notification using Expo
async def send_push_notification(user_ids: List[str], title: str, body: str, data: dict = None):
    """Send push notification using Expo Push Service"""
    try:
        # Get push tokens for these users
        users_with_tokens = await db.users.find({
            '_id': {'$in': [ObjectId(uid) for uid in user_ids]},
            'push_token': {'$exists': True, '$ne': None}
        }).to_list(length=None)
        
        tokens = [user.get('push_token') for user in users_with_tokens if user.get('push_token')]
        
        if not tokens:
            logging.info(f"No push tokens found for {len(user_ids)} users")
            return {"status": "no_tokens", "sent_to": 0}
        
        # Send via Expo Push Service
        result = await expo_push_service.send_push_notification(
            tokens=tokens,
            title=title,
            body=body,
            data=data or {},
            priority='high'
        )
        
        logging.info(f"Push notification sent: {result['success']} success, {result['failed']} failed")
        return {"status": "sent", "sent_to": result['success'], "failed": result['failed']}
        
    except Exception as e:
        logging.error(f"Push notification error: {e}")
        return {"status": "error", "sent_to": 0, "error": str(e)}

# ===== AUTHENTICATION ROUTES =====
@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    # Check passwords match
    if user_data.password != user_data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    
    # Check if user exists
    existing_user = await db.users.find_one({'email': user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate security role
    if user_data.role == "security":
        if not user_data.invite_code or user_data.invite_code != "SECURITY2025":
            raise HTTPException(status_code=403, detail="Invalid security invite code")
    
    # Create user
    user = {
        'email': user_data.email,
        'phone': user_data.phone,
        'password': hash_password(user_data.password),
        'role': user_data.role,
        'is_premium': False,
        'is_verified': True,  # Auto-verify for demo
        'app_name': 'SafeGuard',
        'app_logo': 'shield',
        'created_at': datetime.utcnow(),
        'google_id': None
    }
    
    result = await db.users.insert_one(user)
    user_id = str(result.inserted_id)
    
    # Create security team if security user
    if user_data.role == "security":
        team = {
            'user_id': user_id,
            'teamLocation': {
                'type': 'Point',
                'coordinates': [0, 0]  # Default, user will set
            },
            'radius_km': 10.0,
            'created_at': datetime.utcnow()
        }
        await db.security_teams.insert_one(team)
    
    token = create_token(user_id, user_data.email, user_data.role)
    
    return {
        'token': token,
        'user_id': user_id,
        'email': user_data.email,
        'role': user_data.role,
        'is_premium': False
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({'email': credentials.email})
    if not user or not user.get('password'):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(str(user['_id']), user['email'], user.get('role', 'civil'))
    
    return {
        'token': token,
        'user_id': str(user['_id']),
        'email': user['email'],
        'role': user.get('role', 'civil'),
        'is_premium': user.get('is_premium', False)
    }

@api_router.post("/auth/google")
async def google_auth(auth_data: GoogleAuthData):
    user = await db.users.find_one({'google_id': auth_data.google_id})
    
    if not user:
        user = {
            'email': auth_data.email,
            'name': auth_data.name,
            'google_id': auth_data.google_id,
            'password': None,
            'role': auth_data.role,
            'is_premium': False,
            'is_verified': True,
            'app_name': 'SafeGuard',
            'app_logo': 'shield',
            'created_at': datetime.utcnow()
        }
        result = await db.users.insert_one(user)
        user_id = str(result.inserted_id)
    else:
        user_id = str(user['_id'])
    
    token = create_token(user_id, auth_data.email, user.get('role', auth_data.role))
    
    return {
        'token': token,
        'user_id': user_id,
        'email': auth_data.email,
        'role': user.get('role', auth_data.role),
        'is_premium': user.get('is_premium', False)
    }

# ===== USER ROUTES =====
@api_router.get("/user/profile")
async def get_profile(user = Depends(get_current_user)):
    return {
        'id': str(user['_id']),
        'email': user['email'],
        'phone': user.get('phone'),
        'role': user.get('role', 'civil'),
        'is_premium': user.get('is_premium', False),
        'app_name': user.get('app_name', 'SafeGuard'),
        'app_logo': user.get('app_logo', 'shield'),
        'created_at': user.get('created_at')
    }

@api_router.put("/user/customize-app")
async def customize_app(customization: AppCustomization, user = Depends(get_current_user)):
    await db.users.update_one(
        {'_id': user['_id']},
        {'$set': {'app_name': customization.app_name, 'app_logo': customization.app_logo}}
    )
    return {'message': 'App customization updated'}

# ===== CIVIL USER ROUTES =====
@api_router.post("/panic/activate")
async def activate_panic(panic_data: LocationPoint, user = Depends(get_current_user)):
    if user.get('role') != 'civil':
        raise HTTPException(status_code=403, detail="Only civil users can activate panic")
    
    # Map category labels for notifications
    CATEGORY_LABELS = {
        'violence': 'Violence/Assault',
        'robbery': 'Armed Robbery',
        'kidnapping': 'Kidnapping/Abduction',
        'burglary': 'Break-in/Burglary',
        'medical': 'Medical Emergency',
        'fire': 'Fire/Accident',
        'harassment': 'Harassment/Stalking',
        'other': 'Emergency'
    }
    
    category = panic_data.emergency_category or 'other'
    category_label = CATEGORY_LABELS.get(category, 'Emergency')
    
    panic_event = {
        'user_id': str(user['_id']),
        'activated_at': datetime.utcnow(),
        'is_active': True,
        'emergency_category': category,
        'location': {
            'type': 'Point',
            'coordinates': [panic_data.longitude, panic_data.latitude]
        },
        'locations': [{
            'latitude': panic_data.latitude,
            'longitude': panic_data.longitude,
            'accuracy': panic_data.accuracy,
            'timestamp': panic_data.timestamp
        }]
    }
    result = await db.panic_events.insert_one(panic_event)
    
    # Notify nearby security users
    security_teams = await db.security_teams.find({
        'teamLocation.coordinates': {
            '$near': {
                '$geometry': {'type': 'Point', 'coordinates': [panic_data.longitude, panic_data.latitude]},
                '$maxDistance': 50000  # 50km max
            }
        }
    }).to_list(100)
    
    security_user_ids = [team['user_id'] for team in security_teams]
    if security_user_ids:
        # Send push notifications with category
        await send_push_notification(
            security_user_ids,
            f"🚨 {category_label.upper()} ALERT",
            f"{category_label} reported nearby at {panic_data.latitude:.4f}, {panic_data.longitude:.4f}",
            {'type': 'panic', 'event_id': str(result.inserted_id), 'category': category}
        )
        
        # Send email alerts to security users
        try:
            security_users = await db.users.find({
                '_id': {'$in': [ObjectId(uid) for uid in security_user_ids]}
            }).to_list(length=None)
            
            for sec_user in security_users:
                if sec_user.get('email'):
                    await email_service.send_panic_alert_email(
                        to_email=sec_user['email'],
                        reporter_name=user.get('email', 'Unknown'),
                        latitude=panic_data.latitude,
                        longitude=panic_data.longitude,
                        timestamp=datetime.utcnow()
                    )
        except Exception as e:
            logging.error(f"Error sending panic emails: {e}")
    
    return {'panic_id': str(result.inserted_id), 'message': 'Panic activated'}

@api_router.post("/panic/location")
async def log_panic_location(location: LocationPoint, user = Depends(get_current_user)):
    panic_event = await db.panic_events.find_one({'user_id': str(user['_id']), 'is_active': True})
    if not panic_event:
        raise HTTPException(status_code=404, detail="No active panic")
    
    await db.panic_events.update_one(
        {'_id': panic_event['_id']},
        {'$push': {'locations': {
            'latitude': location.latitude,
            'longitude': location.longitude,
            'accuracy': location.accuracy,
            'timestamp': location.timestamp
        }}}
    )
    return {'message': 'Location logged'}

@api_router.post("/panic/deactivate")
async def deactivate_panic(user = Depends(get_current_user)):
    await db.panic_events.update_one(
        {'user_id': str(user['_id']), 'is_active': True},
        {'$set': {'is_active': False, 'deactivated_at': datetime.utcnow()}}
    )
    return {'message': 'Panic deactivated'}

@api_router.post("/escort/action")
async def escort_action(action: str = Body(...), location: LocationPoint = Body(...), user = Depends(get_current_user)):
    if user.get('role') != 'civil':
        raise HTTPException(status_code=403, detail="Only civil users can use escort")
    if not user.get('is_premium'):
        raise HTTPException(status_code=403, detail="Premium feature")
    
    if action == 'start':
        session = {
            'user_id': str(user['_id']),
            'started_at': datetime.utcnow(),
            'is_active': True,
            'currentLocation': {
                'type': 'Point',
                'coordinates': [location.longitude, location.latitude]
            },
            'locations': []
        }
        result = await db.escort_sessions.insert_one(session)
        
        # Create real-time track document
        await db.civil_tracks.insert_one({
            'user_id': str(user['_id']),
            'session_id': str(result.inserted_id),
            'currentLocation': {
                'type': 'Point',
                'coordinates': [location.longitude, location.latitude],
                'timestamp': datetime.utcnow()
            },
            'is_active': True
        })
        
        return {'session_id': str(result.inserted_id), 'message': 'Escort started'}
    
    elif action == 'stop':
        session = await db.escort_sessions.find_one({'user_id': str(user['_id']), 'is_active': True})
        if not session:
            raise HTTPException(status_code=404, detail="No active session")
        
        # Schedule deletion after 24h
        await db.escort_sessions.update_one(
            {'_id': session['_id']},
            {'$set': {'is_active': False, 'ended_at': datetime.utcnow(), 'delete_at': datetime.utcnow() + timedelta(hours=24)}}
        )
        await db.civil_tracks.delete_one({'user_id': str(user['_id']), 'session_id': str(session['_id'])})
        
        return {'message': 'Arrived safely. Data will be deleted in 24h'}

@api_router.post("/escort/location")
async def log_escort_location(location: LocationPoint, user = Depends(get_current_user)):
    if not user.get('is_premium'):
        raise HTTPException(status_code=403, detail="Premium feature")
    
    session = await db.escort_sessions.find_one({'user_id': str(user['_id']), 'is_active': True})
    if not session:
        raise HTTPException(status_code=404, detail="No active session")
    
    # Update session history
    await db.escort_sessions.update_one(
        {'_id': session['_id']},
        {'$push': {'locations': {
            'latitude': location.latitude,
            'longitude': location.longitude,
            'timestamp': location.timestamp
        }}}
    )
    
    # Update real-time track
    await db.civil_tracks.update_one(
        {'user_id': str(user['_id']), 'is_active': True},
        {'$set': {
            'currentLocation': {
                'type': 'Point',
                'coordinates': [location.longitude, location.latitude],
                'timestamp': datetime.utcnow()
            }
        }}
    )
    
    return {'message': 'Location logged'}

@api_router.post("/report/create")
async def create_report(report: ReportCreate, user = Depends(get_current_user)):
    if user.get('role') != 'civil':
        raise HTTPException(status_code=403, detail="Only civil users can create reports")
    
    report_data = {
        'user_id': str(user['_id']),
        'type': report.type,
        'caption': report.caption,
        'is_anonymous': report.is_anonymous,
        'file_url': report.file_url,
        'thumbnail': report.thumbnail,
        'uploaded': report.uploaded,
        'location': {
            'type': 'Point',
            'coordinates': [report.longitude, report.latitude]
        },
        'geohash': geohash(report.latitude, report.longitude),
        'created_at': datetime.utcnow()
    }
    
    result = await db.civil_reports.insert_one(report_data)
    
    # Notify nearby security
    security_teams = await db.security_teams.find({
        'teamLocation.coordinates': {
            '$near': {
                '$geometry': {'type': 'Point', 'coordinates': [report.longitude, report.latitude]},
                '$maxDistance': 50000
            }
        }
    }).to_list(100)
    
    security_user_ids = [team['user_id'] for team in security_teams]
    if security_user_ids:
        await send_push_notification(
            security_user_ids,
            f"📹 New {report.type.upper()} Report",
            f"Report submitted nearby: {report.caption or 'No caption'}",
            {'type': 'report', 'report_id': str(result.inserted_id)}
        )
    
    return {'report_id': str(result.inserted_id), 'message': 'Report created'}

@api_router.get("/report/my-reports")
async def get_my_reports(user = Depends(get_current_user)):
    reports = await db.civil_reports.find({'user_id': str(user['_id'])}).sort('created_at', -1).to_list(100)
    return [{
        'id': str(r['_id']),
        'type': r['type'],
        'caption': r.get('caption'),
        'is_anonymous': r.get('is_anonymous'),
        'file_url': r.get('file_url'),
        'thumbnail': r.get('thumbnail'),
        'uploaded': r.get('uploaded'),
        'latitude': r['location']['coordinates'][1],
        'longitude': r['location']['coordinates'][0],
        'created_at': r['created_at']
    } for r in reports]

# ===== SECURITY USER ROUTES =====
@api_router.post("/security/set-location")
async def set_team_location(location: SetTeamLocation, user = Depends(get_current_user)):
    if user.get('role') != 'security':
        raise HTTPException(status_code=403, detail="Security users only")
    
    await db.security_teams.update_one(
        {'user_id': str(user['_id'])},
        {'$set': {
            'teamLocation': {
                'type': 'Point',
                'coordinates': [location.longitude, location.latitude]
            },
            'radius_km': location.radius_km,
            'updated_at': datetime.utcnow()
        }},
        upsert=True
    )
    return {'message': 'Team location set'}

@api_router.get("/security/team-location")
async def get_team_location(user = Depends(get_current_user)):
    if user.get('role') != 'security':
        raise HTTPException(status_code=403, detail="Security users only")
    
    team = await db.security_teams.find_one({'user_id': str(user['_id'])})
    if not team:
        return {'latitude': 0, 'longitude': 0, 'radius_km': 10.0}
    
    return {
        'latitude': team['teamLocation']['coordinates'][1],
        'longitude': team['teamLocation']['coordinates'][0],
        'radius_km': team.get('radius_km', 10.0)
    }

@api_router.get("/security/nearby-reports")
async def get_nearby_reports(user = Depends(get_current_user)):
    if user.get('role') != 'security':
        raise HTTPException(status_code=403, detail="Security users only")
    
    team = await db.security_teams.find_one({'user_id': str(user['_id'])})
    if not team:
        return []
    
    radius_meters = team.get('radius_km', 10.0) * 1000
    
    reports = await db.civil_reports.find({
        'location': {
            '$near': {
                '$geometry': team['teamLocation'],
                '$maxDistance': radius_meters
            }
        }
    }).sort('created_at', -1).to_list(100)
    
    result = []
    for r in reports:
        user_info = await db.users.find_one({'_id': ObjectId(r['user_id'])})
        result.append({
            'id': str(r['_id']),
            'type': r['type'],
            'caption': r.get('caption'),
            'is_anonymous': r.get('is_anonymous'),
            'file_url': r.get('file_url'),
            'thumbnail': r.get('thumbnail'),
            'latitude': r['location']['coordinates'][1],
            'longitude': r['location']['coordinates'][0],
            'created_at': r['created_at'],
            'user_email': user_info['email'] if not r.get('is_anonymous') else 'Anonymous',
            'user_phone': user_info.get('phone') if not r.get('is_anonymous') else 'Anonymous'
        })
    
    return result

@api_router.get("/security/nearby-panics")
async def get_nearby_panics(user = Depends(get_current_user)):
    if user.get('role') != 'security':
        raise HTTPException(status_code=403, detail="Security users only")
    
    team = await db.security_teams.find_one({'user_id': str(user['_id'])})
    if not team:
        return []
    
    radius_meters = team.get('radius_km', 10.0) * 1000
    
    panics = await db.panic_events.find({
        'is_active': True,
        'location': {
            '$near': {
                '$geometry': team['teamLocation'],
                '$maxDistance': radius_meters
            }
        }
    }).sort('activated_at', -1).to_list(50)
    
    result = []
    for p in panics:
        user_info = await db.users.find_one({'_id': ObjectId(p['user_id'])})
        latest_location = p['locations'][-1] if p.get('locations') else None
        result.append({
            'id': str(p['_id']),
            'user_email': user_info['email'],
            'user_phone': user_info.get('phone'),
            'activated_at': p['activated_at'],
            'latitude': latest_location['latitude'] if latest_location else p['location']['coordinates'][1],
            'longitude': latest_location['longitude'] if latest_location else p['location']['coordinates'][0],
            'location_count': len(p.get('locations', []))
        })
    
    return result

@api_router.post("/security/search-user")
async def search_user(search: UserSearch, user = Depends(get_current_user)):
    if user.get('role') != 'security':
        raise HTTPException(status_code=403, detail="Security users only")
    
    # Search by phone or email
    civil_user = await db.users.find_one({
        '$or': [
            {'email': search.search_term},
            {'phone': search.search_term}
        ],
        'role': 'civil'
    })
    
    if not civil_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get current track
    current_track = await db.civil_tracks.find_one({'user_id': str(civil_user['_id']), 'is_active': True})
    
    # Get historical sessions
    sessions = await db.escort_sessions.find(
        {'user_id': str(civil_user['_id'])}
    ).sort('started_at', -1).limit(10).to_list(10)
    
    return {
        'user_id': str(civil_user['_id']),
        'email': civil_user['email'],
        'phone': civil_user.get('phone'),
        'is_premium': civil_user.get('is_premium', False),
        'current_location': {
            'latitude': current_track['currentLocation']['coordinates'][1],
            'longitude': current_track['currentLocation']['coordinates'][0],
            'timestamp': current_track['currentLocation']['timestamp']
        } if current_track else None,
        'recent_sessions': [{
            'session_id': str(s['_id']),
            'started_at': s['started_at'],
            'ended_at': s.get('ended_at'),
            'is_active': s.get('is_active', False),
            'location_count': len(s.get('locations', []))
        } for s in sessions]
    }

@api_router.get("/security/user-history/{user_id}")
async def get_user_history(user_id: str, user = Depends(get_current_user)):
    if user.get('role') != 'security':
        raise HTTPException(status_code=403, detail="Security users only")
    
    # Get all escort sessions for this user
    sessions = await db.escort_sessions.find(
        {'user_id': user_id}
    ).sort('started_at', -1).to_list(50)
    
    result = []
    for s in sessions:
        result.append({
            'session_id': str(s['_id']),
            'started_at': s['started_at'],
            'ended_at': s.get('ended_at'),
            'is_active': s.get('is_active', False),
            'locations': s.get('locations', [])
        })
    
    return result

# ===== PUSH TOKEN MANAGEMENT =====
@api_router.post("/push-token/register")
async def register_push_token(token: str = Body(...), user = Depends(get_current_user)):
    """Register Expo push token for user"""
    try:
        # Validate token format
        if not expo_push_service.is_valid_token(token):
            raise HTTPException(status_code=400, detail="Invalid Expo push token format")
        
        # Update user's push token
        await db.users.update_one(
            {'_id': user['_id']},
            {'$set': {
                'push_token': token,
                'push_token_updated_at': datetime.utcnow()
            }}
        )
        
        logging.info(f"Push token registered for user {user['email']}")
        return {'message': 'Push token registered successfully'}
        
    except Exception as e:
        logging.error(f"Push token registration error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/push-token/unregister")
async def unregister_push_token(user = Depends(get_current_user)):
    """Unregister push token"""
    try:
        await db.users.update_one(
            {'_id': user['_id']},
            {'$unset': {'push_token': '', 'push_token_updated_at': ''}}
        )
        return {'message': 'Push token unregistered successfully'}
    except Exception as e:
        logging.error(f"Push token unregister error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== PAYMENT ROUTES (REAL PAYSTACK) =====
@api_router.post("/payment/init")
async def init_payment(amount: float = Body(...), user = Depends(get_current_user)):
    """Initialize Paystack payment for premium subscription"""
    try:
        # Generate unique reference
        reference = f"SGD_{uuid.uuid4().hex[:12].upper()}"
        
        # Convert amount to kobo (₦2,000 = 200000 kobo)
        amount_in_kobo = int(amount * 100)
        
        # Initialize payment with Paystack
        result = await paystack_service.initialize_transaction(
            email=user['email'],
            amount=amount_in_kobo,
            reference=reference,
            callback_url=None  # Can add callback URL for mobile app
        )
        
        if result.get('status'):
            data = result.get('data', {})
            
            # Store payment reference in database
            await db.payment_transactions.insert_one({
                'user_id': str(user['_id']),
                'reference': reference,
                'amount': amount,
                'amount_kobo': amount_in_kobo,
                'status': 'pending',
                'created_at': datetime.utcnow()
            })
            
            return {
                'status': True,
                'authorization_url': data.get('authorization_url'),
                'access_code': data.get('access_code'),
                'reference': reference,
                'message': 'Payment initialized successfully'
            }
        else:
            raise HTTPException(status_code=400, detail="Payment initialization failed")
            
    except Exception as e:
        logging.error(f"Payment init error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/payment/verify/{reference}")
async def verify_payment(reference: str, user = Depends(get_current_user)):
    """Verify Paystack payment and activate premium"""
    try:
        # Verify payment with Paystack
        result = await paystack_service.verify_transaction(reference)
        
        if result.get('status'):
            data = result.get('data', {})
            
            if data.get('status') == 'success':
                # Update user to premium
                await db.users.update_one(
                    {'_id': user['_id']},
                    {'$set': {
                        'is_premium': True,
                        'premium_activated_at': datetime.utcnow()
                    }}
                )
                
                # Update transaction status
                await db.payment_transactions.update_one(
                    {'reference': reference},
                    {'$set': {
                        'status': 'completed',
                        'verified_at': datetime.utcnow(),
                        'paystack_data': data
                    }}
                )
                
                # Send confirmation email
                try:
                    await email_service.send_payment_confirmation(
                        to_email=user['email'],
                        amount=data.get('amount', 0) / 100,  # Convert from kobo
                        reference=reference
                    )
                except Exception as e:
                    logging.error(f"Email send error: {e}")
                
                return {
                    'status': 'success',
                    'message': 'Premium activated successfully!',
                    'amount': data.get('amount', 0) / 100,
                    'paid_at': data.get('paid_at')
                }
            else:
                return {
                    'status': 'failed',
                    'message': f"Payment status: {data.get('status')}"
                }
        else:
            raise HTTPException(status_code=400, detail="Payment verification failed")
            
    except Exception as e:
        logging.error(f"Payment verification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup():
    await create_indexes()
    logger.info("MongoDB indexes created")

@app.on_event("shutdown")
async def shutdown():
    client.close()
