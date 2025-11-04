# SafeGuard App - API Requirements for Full Functionality

## Current Status: 🟡 Partially Functional (Core features work, but using mocked integrations)

---

## 🔴 CRITICAL APIs (Required for Production APK)

### 1. **Firebase Cloud Storage** 
**Purpose:** Store large video and audio files from reports  
**Current Status:** ❌ MOCKED - Files are saved with local URIs only  
**Why Needed:** Video/audio files need cloud storage for:
- Security users to access and view reports
- Persistent storage across devices
- Bandwidth optimization with compression

**What You Need to Provide:**
- Firebase Project credentials (JSON service account key)
- Storage bucket name

**Setup Instructions:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or use existing
3. Enable **Cloud Storage**
4. Download service account JSON key from Project Settings → Service Accounts
5. Provide me with:
   ```
   FIREBASE_STORAGE_BUCKET=your-app.appspot.com
   FIREBASE_SERVICE_ACCOUNT_JSON=<paste the full JSON content>
   ```

---

### 2. **Push Notifications (Expo Push Notifications or FCM)**
**Purpose:** Alert security users when panic button is pressed or reports are submitted nearby  
**Current Status:** ❌ MOCKED - Notifications are only logged, not sent  
**Why Needed:** Critical for security response - they need instant alerts

**What You Need to Provide:**

**Option A: Expo Push Notifications (Easier, Recommended)**
- No API key needed initially
- Works automatically with Expo Go and EAS builds
- I just need confirmation to implement

**Option B: Firebase Cloud Messaging (FCM)**
- Firebase Project Server Key
- FCM credentials

**Setup Instructions (Option A - Recommended):**
1. Just confirm you want Expo Push Notifications
2. I'll implement it (no keys needed for now)
3. You'll need to configure when publishing to app stores

**Setup Instructions (Option B - FCM):**
1. Same Firebase project from Step 1
2. Enable **Cloud Messaging** in Firebase Console
3. Get Server Key from Project Settings → Cloud Messaging
4. Provide:
   ```
   FCM_SERVER_KEY=your-fcm-server-key
   ```

---

### 3. **Paystack Payment Gateway**
**Purpose:** Process premium subscription payments (₦2,000/month)  
**Current Status:** ❌ MOCKED - Payment always succeeds, no real charges  
**Why Needed:** To actually charge users for premium features

**What You Need to Provide:**
- Paystack Secret Key
- Paystack Public Key

**Setup Instructions:**
1. Create account at [Paystack](https://paystack.com)
2. Complete business verification
3. Get API keys from Settings → API Keys & Webhooks
4. Provide:
   ```
   PAYSTACK_SECRET_KEY=sk_live_xxxxx (or sk_test_xxxxx for testing)
   PAYSTACK_PUBLIC_KEY=pk_live_xxxxx (or pk_test_xxxxx for testing)
   ```

**Note:** Start with TEST keys for initial APK testing, then switch to LIVE keys for production.

---

## 🟢 OPTIONAL APIs (App works without these, but better with them)

### 4. **Google OAuth (Social Login)**
**Purpose:** Allow users to sign in with Google account  
**Current Status:** ⚠️ BASIC MOCK - Accepts any Google ID, doesn't verify  
**Why Needed:** Better user experience, faster registration

**What You Need to Provide:**
- Google OAuth Client ID
- Google OAuth Client Secret

**Setup Instructions:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project
3. Enable Google Sign-In API
4. Create OAuth 2.0 credentials for Android
5. Add your app's SHA-1 fingerprint
6. Provide:
   ```
   GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=xxxxx
   ```

---

### 5. **Email Service (SendGrid/Mailgun)**
**Purpose:** Send email verification, password reset, receipt emails  
**Current Status:** ✅ Auto-verified (email verification skipped)  
**Why Needed:** Security and user account management

**What You Need to Provide:**
- SendGrid API Key OR Mailgun API Key

**Setup Instructions (SendGrid - Recommended):**
1. Create account at [SendGrid](https://sendgrid.com)
2. Verify your sender email/domain
3. Create API Key
4. Provide:
   ```
   SENDGRID_API_KEY=SG.xxxxx
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   ```

---

## 📊 Summary Table

| Service | Priority | Status | Impact if Missing |
|---------|----------|--------|-------------------|
| Firebase Storage | 🔴 Critical | ❌ Mocked | Videos/audio not accessible by security users |
| Push Notifications | 🔴 Critical | ❌ Mocked | Security won't get panic/report alerts |
| Paystack | 🔴 Critical | ❌ Mocked | Can't charge for premium features |
| Google OAuth | 🟡 Optional | ⚠️ Basic | Users must register manually |
| Email Service | 🟡 Optional | ✅ Skipped | No email verification/password reset |

---

## ⚡ Quick Start Options

### Option 1: Minimum Viable Production (Recommended First)
**Get these 3 APIs:**
1. ✅ Firebase Storage (for video/audio)
2. ✅ Expo Push Notifications (no key needed initially)
3. ✅ Paystack TEST keys (for testing payments)

**Timeline:** ~1 hour setup, 2-3 hours for me to integrate
**Result:** Fully functional app for beta testing

---

### Option 2: Full Production Ready
**Get all 5 APIs above**

**Timeline:** ~2 hours setup, 4-5 hours for me to integrate
**Result:** Production-ready app with all features

---

### Option 3: Test APK (Current State)
**Use existing mocked services**

**Timeline:** Ready now
**Result:** APK for UI/UX testing only, core features simulated
**Limitations:** 
- No real video/audio storage
- No push notifications
- Payments always succeed
- Can't test real-world workflows

---

## 🎯 My Recommendation

**For your next step:**

1. **Get Firebase Storage** (30 min) - Most critical for media files
2. **Use Expo Push** (I'll implement, no keys needed) - For alerts
3. **Get Paystack TEST keys** (15 min) - To test payment flow

Once you provide these, I'll integrate them and then we can build a **fully functional APK** ready for real testing.

---

## 📝 How to Provide the Keys

Just reply with:

```
FIREBASE_STORAGE_BUCKET=your-bucket-name.appspot.com
FIREBASE_SERVICE_ACCOUNT_JSON={
  "type": "service_account",
  "project_id": "...",
  ...
}

PAYSTACK_SECRET_KEY=sk_test_xxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxx

EXPO_PUSH=YES (I'll implement)
```

Or let me know if you want to proceed with **Option 3** (test APK with current mocked state) and integrate APIs later.
