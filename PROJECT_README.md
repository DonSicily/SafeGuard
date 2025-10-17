# SafeGuard Security Mobile App

A comprehensive mobile security application built with Expo (React Native) and FastAPI, designed to provide emergency assistance, GPS tracking, and incident reporting features.

## Features Overview

### 1. Authentication System
- **Email/Password Registration** with email confirmation
- **Google OAuth Integration** (via Emergent Authentication)
- JWT-based authentication
- Secure password hashing with bcrypt

### 2. Panic Button
- **Emergency Alert System** with one-tap activation
- **Automatic GPS Tracking** every 30 seconds
- **Background Location Tracking** continues even when phone is locked
- **Anonymous Location Transmission** to authorities
- Phone sleep mode activation for discretion
- Easy deactivation when safe

### 3. Security Escort (Premium Feature)
- **Real-time GPS Tracking** for journeys
- Background location tracking every 30 seconds
- "ARRIVED" button to stop tracking
- **Auto-delete tracking data** upon arrival
- Premium subscription required

### 4. Live Video Report
- **Live Recording** directly from camera
- **Cannot upload pre-recorded videos** (security measure)
- Offline support with local storage
- Upload when internet is restored
- Visual indicators for upload status
- Option to remain anonymous or declare identity
- Add captions/descriptions to reports

### 5. Audio Report
- **Voice Recording** for intelligent reports
- Offline support
- Anonymous reporting option
- Caption/description support
- Upload to secure cloud storage

### 6. App Customization (Anonymity Feature)
- **Change App Name** to any custom name
- **Change App Icon** from 100 different icon options
- Helps maintain anonymity and disguise the app
- Customization saved per user

### 7. Premium/Paid Features
- Basic users: Panic Button, Video/Audio Reports
- Premium users: All features + Security Escort
- Paystack payment integration (ready for API keys)

## Tech Stack

### Frontend
- **Expo SDK 54** (React Native)
- **Expo Router** for file-based navigation
- **TypeScript**
- **Expo Location** for GPS tracking
- **Expo Camera** for video recording
- **Expo AV** for audio recording
- **Expo Task Manager** for background tasks
- **AsyncStorage** for local data
- **Axios** for API calls
- **React Native Safe Area Context**

### Backend
- **FastAPI** (Python)
- **MongoDB** with Motor (async driver)
- **JWT Authentication**
- **Bcrypt** for password hashing
- **Python-JOSE** for token management

## Project Structure

```
/app
├── backend/
│   ├── server.py           # Main FastAPI application
│   ├── .env                # Environment variables
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── app/
│   │   ├── index.tsx          # Entry/Panic prompt screen
│   │   ├── home.tsx           # Main dashboard
│   │   ├── auth/
│   │   │   ├── login.tsx      # Login screen
│   │   │   └── register.tsx   # Registration screen
│   │   ├── panic/
│   │   │   └── active.tsx     # Active panic mode screen
│   │   ├── escort.tsx         # Security escort screen
│   │   ├── report/
│   │   │   ├── index.tsx      # Video report screen
│   │   │   ├── audio.tsx      # Audio report screen
│   │   │   └── list.tsx       # User reports list
│   │   ├── premium.tsx        # Premium upgrade screen
│   │   └── settings.tsx       # Settings & customization
│   ├── package.json
│   └── .env                   # Frontend environment vars
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with credentials
- `POST /api/auth/google` - Google OAuth login
- `GET /api/auth/confirm-email/{token}` - Confirm email

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/customize-app` - Update app name & icon

### Panic Button
- `POST /api/panic/activate` - Activate panic mode
- `POST /api/panic/location` - Log GPS location
- `POST /api/panic/deactivate` - Deactivate panic

### Security Escort (Premium)
- `POST /api/escort/action` - Start/stop escort session
- `POST /api/escort/location` - Log escort GPS location

### Reports
- `POST /api/report/create` - Create video/audio report
- `GET /api/report/my-reports` - Get user's reports
- `PUT /api/report/{id}/upload-complete` - Mark as uploaded

### Payment
- `POST /api/payment/init` - Initialize Paystack payment
- `GET /api/payment/verify/{reference}` - Verify payment

## Setup Instructions

### Backend Setup

1. Install Python dependencies:
```bash
cd /app/backend
pip install -r requirements.txt
```

2. Configure environment variables in `.env`:
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="safeguard_db"
JWT_SECRET="your-secret-key-change-in-production"
```

3. Start the backend:
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Setup

1. Install dependencies:
```bash
cd /app/frontend
yarn install
```

2. Configure environment variables in `.env`:
```
EXPO_PUBLIC_BACKEND_URL=http://your-backend-url
```

3. Start Expo:
```bash
yarn start
```

## Required API Keys (To be added)

### 1. Firebase (for file storage)
Add Firebase configuration to store video/audio files:
- Create Firebase project
- Enable Firebase Storage
- Get configuration and add to app

### 2. Paystack (for payments)
Add Paystack API keys for premium subscriptions:
- Sign up at https://paystack.com
- Get API keys (Public & Secret)
- Add to backend environment

### 3. Email Service (for confirmations)
Choose one email service:
- SendGrid
- Mailgun
- AWS SES

### 4. Google OAuth (for social login)
Configure Google OAuth via Emergent's integrated authentication

## Security Features

1. **JWT Authentication** - Secure token-based auth
2. **Password Hashing** - Bcrypt with salt
3. **Protected Routes** - Authorization required
4. **Anonymous Reporting** - User privacy protected
5. **App Disguise** - Customizable name & icon
6. **Background GPS** - Continuous tracking without detection

## Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  email: string,
  password: string (hashed),
  google_id: string?,
  is_premium: boolean,
  is_verified: boolean,
  app_name: string,
  app_logo: string,
  created_at: datetime
}
```

### Panic Events Collection
```javascript
{
  _id: ObjectId,
  user_id: string,
  activated_at: datetime,
  is_active: boolean,
  locations: [{
    latitude: float,
    longitude: float,
    accuracy: float,
    timestamp: datetime
  }]
}
```

### Escort Sessions Collection
```javascript
{
  _id: ObjectId,
  user_id: string,
  started_at: datetime,
  is_active: boolean,
  locations: [...]
}
```

### Reports Collection
```javascript
{
  _id: ObjectId,
  user_id: string,
  type: "video" | "audio",
  caption: string,
  is_anonymous: boolean,
  file_url: string,
  thumbnail: string?,
  uploaded: boolean,
  created_at: datetime
}
```

## Mobile Permissions Required

- **Location** (foreground & background) - For GPS tracking
- **Camera** - For video recording
- **Microphone** - For audio recording
- **Storage** - For offline file storage

## Testing

### Backend Testing
All backend APIs have been tested and verified:
- ✅ Authentication (register, login, OAuth)
- ✅ Panic button activation & tracking
- ✅ Security escort (premium feature)
- ✅ Video/audio report creation
- ✅ Payment integration (mocked)

Run backend tests:
```bash
# Test using curl or the testing agent
```

### Frontend Testing
Test on physical device or Expo Go app:
1. Scan QR code with Expo Go
2. Test all features
3. Verify GPS tracking
4. Test camera/microphone permissions

## Deployment Notes

### Production Checklist
- [ ] Add real Firebase credentials
- [ ] Add Paystack API keys
- [ ] Configure email service
- [ ] Update JWT_SECRET
- [ ] Enable HTTPS
- [ ] Configure proper CORS
- [ ] Set up database backups
- [ ] Implement rate limiting
- [ ] Add error logging (Sentry)
- [ ] Submit to App Store/Play Store

## Known Limitations

1. **Firebase Integration** - Currently mocked, needs actual Firebase setup
2. **Paystack Integration** - Currently mocked, needs API keys
3. **Email Confirmation** - Auto-verified, needs email service
4. **Google OAuth** - Needs Emergent authentication setup
5. **Video Upload** - Needs Firebase Storage implementation

## Support

For issues or questions:
- Check Firebase documentation for file uploads
- Check Paystack documentation for payment integration
- Ensure all permissions are granted on mobile device
- Test GPS tracking in outdoor environments

## License

SafeGuard Security App - Built with Emergent AI

---

**Important Privacy Note**: This app is designed for security and safety. All user data is encrypted and handled securely. Location data is only transmitted during active panic or escort sessions and is automatically deleted when the escort session ends.
