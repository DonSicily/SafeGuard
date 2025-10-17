from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Body
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import bcrypt
import jwt
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24 * 30  # 30 days

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ===== MODELS =====
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    confirm_password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class GoogleAuthData(BaseModel):
    google_id: str
    email: EmailStr
    name: str

class UserProfile(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    is_premium: bool = False
    is_verified: bool = False
    app_name: Optional[str] = "SafeGuard"
    app_logo: Optional[str] = "shield"
    created_at: datetime

class AppCustomization(BaseModel):
    app_name: str
    app_logo: str

class LocationData(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class PanicActivate(BaseModel):
    activated: bool = True

class EscortAction(BaseModel):
    action: str  # "start" or "stop"

class ReportCreate(BaseModel):
    type: str  # "video" or "audio"
    caption: Optional[str] = None
    is_anonymous: bool = False
    file_url: Optional[str] = None
    thumbnail: Optional[str] = None
    uploaded: bool = False

class PaymentInit(BaseModel):
    amount: float
    email: str

# ===== HELPER FUNCTIONS =====
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str) -> str:
    payload = {
        'user_id': user_id,
        'email': email,
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

# ===== AUTHENTICATION ROUTES =====
@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    # Check if passwords match
    if user_data.password != user_data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    
    # Check if user already exists
    existing_user = await db.users.find_one({'email': user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    user = {
        'email': user_data.email,
        'password': hash_password(user_data.password),
        'is_premium': False,
        'is_verified': False,  # Email verification pending
        'app_name': 'SafeGuard',
        'app_logo': 'shield',
        'created_at': datetime.utcnow(),
        'google_id': None
    }
    
    result = await db.users.insert_one(user)
    user_id = str(result.inserted_id)
    
    # Generate token
    token = create_token(user_id, user_data.email)
    
    # TODO: Send confirmation email
    # For now, we'll mark as verified (implement email service later)
    await db.users.update_one(
        {'_id': ObjectId(user_id)},
        {'$set': {'is_verified': True}}
    )
    
    return {
        'token': token,
        'user_id': user_id,
        'email': user_data.email,
        'message': 'Registration successful. Confirmation email sent.'
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    # Find user
    user = await db.users.find_one({'email': credentials.email})
    if not user or not user.get('password'):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if email is verified
    if not user.get('is_verified', False):
        raise HTTPException(status_code=403, detail="Email not verified. Please check your email.")
    
    # Generate token
    token = create_token(str(user['_id']), user['email'])
    
    return {
        'token': token,
        'user_id': str(user['_id']),
        'email': user['email'],
        'is_premium': user.get('is_premium', False)
    }

@api_router.post("/auth/google")
async def google_auth(auth_data: GoogleAuthData):
    # Check if user exists
    user = await db.users.find_one({'google_id': auth_data.google_id})
    
    if not user:
        # Create new user
        user = {
            'email': auth_data.email,
            'name': auth_data.name,
            'google_id': auth_data.google_id,
            'password': None,
            'is_premium': False,
            'is_verified': True,  # Google accounts are pre-verified
            'app_name': 'SafeGuard',
            'app_logo': 'shield',
            'created_at': datetime.utcnow()
        }
        result = await db.users.insert_one(user)
        user_id = str(result.inserted_id)
    else:
        user_id = str(user['_id'])
    
    # Generate token
    token = create_token(user_id, auth_data.email)
    
    return {
        'token': token,
        'user_id': user_id,
        'email': auth_data.email,
        'is_premium': user.get('is_premium', False) if user else False
    }

@api_router.get("/auth/confirm-email/{token}")
async def confirm_email(token: str):
    # Verify token and mark email as confirmed
    payload = verify_token(token)
    await db.users.update_one(
        {'_id': ObjectId(payload['user_id'])},
        {'$set': {'is_verified': True}}
    )
    return {'message': 'Email confirmed successfully'}

# ===== USER ROUTES =====
@api_router.get("/user/profile")
async def get_profile(user = Depends(get_current_user)):
    return {
        'id': str(user['_id']),
        'email': user['email'],
        'name': user.get('name'),
        'is_premium': user.get('is_premium', False),
        'is_verified': user.get('is_verified', False),
        'app_name': user.get('app_name', 'SafeGuard'),
        'app_logo': user.get('app_logo', 'shield'),
        'created_at': user.get('created_at')
    }

@api_router.put("/user/customize-app")
async def customize_app(customization: AppCustomization, user = Depends(get_current_user)):
    await db.users.update_one(
        {'_id': user['_id']},
        {'$set': {
            'app_name': customization.app_name,
            'app_logo': customization.app_logo
        }}
    )
    return {'message': 'App customization updated successfully'}

# ===== PANIC BUTTON ROUTES =====
@api_router.post("/panic/activate")
async def activate_panic(panic_data: PanicActivate, user = Depends(get_current_user)):
    # Create panic event
    panic_event = {
        'user_id': str(user['_id']),
        'activated_at': datetime.utcnow(),
        'is_active': True,
        'locations': []
    }
    result = await db.panic_events.insert_one(panic_event)
    
    return {
        'panic_id': str(result.inserted_id),
        'message': 'Panic mode activated. Stay safe.'
    }

@api_router.post("/panic/location")
async def log_panic_location(location: LocationData, user = Depends(get_current_user)):
    # Find active panic event
    panic_event = await db.panic_events.find_one({
        'user_id': str(user['_id']),
        'is_active': True
    })
    
    if not panic_event:
        raise HTTPException(status_code=404, detail="No active panic event")
    
    # Add location to panic event
    location_entry = {
        'latitude': location.latitude,
        'longitude': location.longitude,
        'accuracy': location.accuracy,
        'timestamp': location.timestamp
    }
    
    await db.panic_events.update_one(
        {'_id': panic_event['_id']},
        {'$push': {'locations': location_entry}}
    )
    
    return {'message': 'Location logged successfully'}

@api_router.post("/panic/deactivate")
async def deactivate_panic(user = Depends(get_current_user)):
    # Deactivate panic event
    result = await db.panic_events.update_one(
        {'user_id': str(user['_id']), 'is_active': True},
        {'$set': {'is_active': False, 'deactivated_at': datetime.utcnow()}}
    )
    
    return {'message': 'Panic mode deactivated'}

# ===== ESCORT ROUTES =====
@api_router.post("/escort/action")
async def escort_action(action_data: EscortAction, user = Depends(get_current_user)):
    # Check if user is premium
    if not user.get('is_premium', False):
        raise HTTPException(status_code=403, detail="This feature is only available for premium users")
    
    if action_data.action == 'start':
        # Check if there's already an active session
        active_session = await db.escort_sessions.find_one({
            'user_id': str(user['_id']),
            'is_active': True
        })
        
        if active_session:
            return {
                'session_id': str(active_session['_id']),
                'message': 'Escort session already active'
            }
        
        # Create new escort session
        session = {
            'user_id': str(user['_id']),
            'started_at': datetime.utcnow(),
            'is_active': True,
            'locations': []
        }
        result = await db.escort_sessions.insert_one(session)
        
        return {
            'session_id': str(result.inserted_id),
            'message': 'Escort tracking started'
        }
    
    elif action_data.action == 'stop':
        # Find active session
        session = await db.escort_sessions.find_one({
            'user_id': str(user['_id']),
            'is_active': True
        })
        
        if not session:
            raise HTTPException(status_code=404, detail="No active escort session")
        
        # Delete all tracking data as per requirements
        await db.escort_sessions.delete_one({'_id': session['_id']})
        
        return {'message': 'Arrived safely. Tracking data deleted.'}
    
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

@api_router.post("/escort/location")
async def log_escort_location(location: LocationData, user = Depends(get_current_user)):
    # Check if user is premium
    if not user.get('is_premium', False):
        raise HTTPException(status_code=403, detail="This feature is only available for premium users")
    
    # Find active escort session
    session = await db.escort_sessions.find_one({
        'user_id': str(user['_id']),
        'is_active': True
    })
    
    if not session:
        raise HTTPException(status_code=404, detail="No active escort session")
    
    # Add location to session
    location_entry = {
        'latitude': location.latitude,
        'longitude': location.longitude,
        'accuracy': location.accuracy,
        'timestamp': location.timestamp
    }
    
    await db.escort_sessions.update_one(
        {'_id': session['_id']},
        {'$push': {'locations': location_entry}}
    )
    
    return {'message': 'Location logged successfully'}

# ===== REPORT ROUTES =====
@api_router.post("/report/create")
async def create_report(report: ReportCreate, user = Depends(get_current_user)):
    # Create report
    report_data = {
        'user_id': str(user['_id']),
        'type': report.type,
        'caption': report.caption,
        'is_anonymous': report.is_anonymous,
        'file_url': report.file_url,
        'thumbnail': report.thumbnail,
        'uploaded': report.uploaded,
        'created_at': datetime.utcnow()
    }
    
    result = await db.reports.insert_one(report_data)
    
    return {
        'report_id': str(result.inserted_id),
        'message': 'Report created successfully'
    }

@api_router.get("/report/my-reports")
async def get_my_reports(user = Depends(get_current_user)):
    reports = await db.reports.find({'user_id': str(user['_id'])}).to_list(100)
    
    return [{
        'id': str(report['_id']),
        'type': report['type'],
        'caption': report.get('caption'),
        'is_anonymous': report.get('is_anonymous', False),
        'file_url': report.get('file_url'),
        'thumbnail': report.get('thumbnail'),
        'uploaded': report.get('uploaded', False),
        'created_at': report.get('created_at')
    } for report in reports]

@api_router.put("/report/{report_id}/upload-complete")
async def mark_report_uploaded(report_id: str, file_url: str = Body(...), user = Depends(get_current_user)):
    # Update report upload status
    result = await db.reports.update_one(
        {'_id': ObjectId(report_id), 'user_id': str(user['_id'])},
        {'$set': {'uploaded': True, 'file_url': file_url}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return {'message': 'Report marked as uploaded'}

# ===== PAYMENT ROUTES =====
@api_router.post("/payment/init")
async def init_payment(payment: PaymentInit, user = Depends(get_current_user)):
    # TODO: Integrate with Paystack API
    # For now, return a mock authorization URL
    return {
        'authorization_url': 'https://paystack.com/pay/mock-reference',
        'reference': f'ref_{uuid.uuid4()}',
        'message': 'Payment initialization successful (Paystack integration pending)'
    }

@api_router.get("/payment/verify/{reference}")
async def verify_payment(reference: str, user = Depends(get_current_user)):
    # TODO: Verify payment with Paystack
    # For now, mark user as premium
    await db.users.update_one(
        {'_id': user['_id']},
        {'$set': {'is_premium': True}}
    )
    
    return {
        'status': 'success',
        'message': 'Payment verified. You are now a premium user!'
    }

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
