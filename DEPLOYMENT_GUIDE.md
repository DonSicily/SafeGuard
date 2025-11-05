# SafeGuard App - Deployment Guide

## Complete Guide to APK Build & Google Play Store Publishing

**Version:** 1.0  
**Date:** June 2025  
**Platform:** Expo (React Native)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Option A: Build APK for Direct Download](#2-option-a-build-apk-for-direct-download)
3. [Option B: Publish to Google Play Store](#3-option-b-publish-to-google-play-store)
4. [Post-Deployment Checklist](#4-post-deployment-checklist)
5. [Troubleshooting](#5-troubleshooting)

---

## 1. Prerequisites

### A. Accounts Required

**For APK Build:**
- ✅ Expo account (free) - Already have if using Expo Go
- ✅ EAS CLI installed

**For Google Play Store:**
- ✅ Expo account (free)
- ✅ Google Play Console account ($25 one-time registration fee)
- ✅ EAS CLI installed

### B. Install EAS CLI

```bash
# Install globally on your machine (NOT in the container)
npm install -g eas-cli

# Login to your Expo account
eas login
```

**If you don't have an Expo account:**
```bash
# Create account
eas register

# Then login
eas login
```

### C. Prepare Your App

Before building, ensure:
- [ ] All API keys are configured in `.env` files
- [ ] App name and package name are correct in `app.json`
- [ ] App icon is designed (1024x1024px PNG)
- [ ] Splash screen is ready
- [ ] All features tested on Expo Go

---

## 2. Option A: Build APK for Direct Download

**Use Case:** Testing on devices, sharing with beta users, direct installation

### Step 1: Configure EAS Build

From your **local machine** (not the container), navigate to your project:

```bash
# If you have local access to the project
cd /path/to/safeguard/frontend

# Initialize EAS build
eas build:configure
```

This creates `eas.json` with build profiles.

### Step 2: Update eas.json

Edit `/app/frontend/eas.json`:

```json
{
  "cli": {
    "version": ">= 5.9.1"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "gradleCommand": ":app:assembleDebug"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "aab"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

**Key Points:**
- `preview` profile builds APK (for direct download)
- `production` profile builds AAB (for Play Store)

### Step 3: Update app.json

Edit `/app/frontend/app.json`:

```json
{
  "expo": {
    "name": "SafeGuard",
    "slug": "safeguard",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0F172A"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.safeguard.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0F172A"
      },
      "package": "com.safeguard.app",
      "versionCode": 1,
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "CAMERA",
        "RECORD_AUDIO",
        "WRITE_EXTERNAL_STORAGE",
        "READ_EXTERNAL_STORAGE"
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-router",
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow SafeGuard to use your location for emergency tracking."
        }
      ],
      [
        "expo-camera",
        {
          "cameraPermission": "Allow SafeGuard to access your camera for live reports."
        }
      ]
    ],
    "extra": {
      "router": {
        "origin": false
      },
      "eas": {
        "projectId": "YOUR_PROJECT_ID_HERE"
      }
    }
  }
}
```

**Important:**
- Change `package` to your own (e.g., `com.yourcompany.safeguard`)
- Update `bundleIdentifier` for iOS
- EAS will generate `projectId` automatically on first build

### Step 4: Build APK

**Option 4A: Cloud Build (Recommended - Easiest)**

```bash
cd /app/frontend

# Build APK using EAS cloud servers
eas build --platform android --profile preview
```

**What happens:**
1. Code uploaded to EAS servers
2. Build runs on EAS infrastructure (free tier: 30 builds/month)
3. You get a download link when complete (~10-20 minutes)
4. APK can be downloaded and installed directly

**Output:**
```
✔ Build finished
APK: https://expo.dev/artifacts/eas/ABC123XYZ.apk
```

**Option 4B: Local Build (Advanced - Requires Android SDK)**

```bash
# Build locally (requires Android Studio and SDK installed)
eas build --platform android --profile preview --local
```

**Requirements for local build:**
- Android Studio installed
- Android SDK configured
- Java JDK 11+
- 8GB+ RAM
- 20GB+ free disk space

**Not recommended unless:** You have specific security/privacy requirements.

### Step 5: Download APK

Once build completes:

1. **From EAS Dashboard:**
   - Go to https://expo.dev/accounts/[your-account]/projects/safeguard/builds
   - Find your build
   - Click "Download" button

2. **From CLI:**
   - Copy the URL from build output
   - Download directly: `curl -o SafeGuard.apk [URL]`

3. **QR Code:**
   - EAS provides a QR code
   - Scan with phone to download directly

### Step 6: Install APK on Android Device

**Method 1: Direct Transfer**
```bash
# Connect phone via USB
# Enable USB debugging on phone (Developer Options)

# Install via ADB
adb install SafeGuard.apk
```

**Method 2: Cloud Hosting**
- Upload APK to Google Drive, Dropbox, or your website
- Share link with users
- Users download and tap to install

**Method 3: QR Code (Easiest for Beta Users)**
- Upload APK to cloud storage
- Generate QR code pointing to download link
- Users scan QR → Download → Install

**Security Note:**
Users must enable "Install from Unknown Sources" in Android settings.

### Step 7: Test APK

After installation:
- [ ] App opens successfully
- [ ] Login works
- [ ] GPS tracking functions
- [ ] Camera/audio recording works
- [ ] Push notifications arrive (after registering token)
- [ ] Payment flow completes
- [ ] All features from Expo Go work

---

## 3. Option B: Publish to Google Play Store

**Use Case:** Public release, app updates, reach millions of users

### Step 1: Google Play Console Setup

**A. Create Developer Account**

1. Go to https://play.google.com/console
2. Sign in with Google account
3. Pay $25 registration fee (one-time, lifetime)
4. Complete developer profile:
   - Developer name (individual or company)
   - Contact email
   - Website (optional but recommended)
   - Privacy policy URL (required)

**B. Create App Listing**

1. Click "Create app"
2. Fill in details:
   - **App name:** SafeGuard
   - **Default language:** English (United States)
   - **App or game:** App
   - **Free or paid:** Free
   - **Declarations:** Check all required boxes

3. Click "Create app"

### Step 2: Prepare App Assets

**Required Assets:**

**A. App Icon**
- Size: 512x512 pixels
- Format: PNG (no transparency)
- Requirements: Must be distinct, recognizable at small sizes

**B. Feature Graphic**
- Size: 1024x500 pixels
- Format: PNG or JPEG
- Usage: Banner on Play Store listing

**C. Screenshots (Required: Minimum 2)**
- Sizes accepted:
  - 16:9 aspect ratio: 1920x1080, 3840x2160
  - 9:16 aspect ratio: 1080x1920, 2160x3840
- Format: PNG or JPEG
- Recommendations: Show key features (panic button, tracking, reports)

**D. Promotional Video (Optional)**
- YouTube link
- Demo of app features
- 30-120 seconds

**E. Privacy Policy**
- **REQUIRED** since app collects location data
- Must be hosted on permanent URL
- Include:
  - What data you collect (location, personal info)
  - How you use it (emergency response)
  - How you protect it (encryption)
  - User rights (delete data, opt-out)
  - Contact information

**Sample Privacy Policy URL:** `https://yourdomain.com/privacy-policy`

### Step 3: Complete Store Listing

**A. Main Store Listing**

1. Navigate to "Store presence" → "Main store listing"
2. Fill in:

**App details:**
- **Short description** (80 characters max):
  ```
  Instant panic alerts & live tracking. Connect with security teams in seconds.
  ```

- **Full description** (4000 characters max):
  ```
  SafeGuard: Your Personal Security Platform

  🚨 INSTANT PANIC BUTTON
  One tap activates discreet GPS tracking and alerts nearby security teams in under 5 seconds. Your location is shared automatically without the need to speak or type.

  🎥 LIVE REPORTING
  Record and upload live video or audio reports of incidents. Help document emergencies with automatic location tagging.

  🛡️ SECURITY ESCORT (Premium)
  Premium users get continuous GPS tracking during travel. Security teams monitor your journey until you arrive safely.

  📍 REAL-TIME TRACKING
  Advanced geospatial technology connects you with the nearest security teams. Background tracking continues even when your phone is locked.

  🔒 PRIVACY FIRST
  - Anonymous reporting options
  - Encrypted data transmission
  - Automatic deletion of tracking data after 24 hours
  - No location tracking unless you activate it

  FOR SECURITY TEAMS:
  - Real-time panic alert dashboard
  - Geospatial incident mapping
  - Nearby reports and tracking
  - Efficient dispatch and coordination

  FEATURES:
  ✓ One-tap panic button
  ✓ Discreet background tracking
  ✓ Live video/audio reporting
  ✓ Security escort for safe travel
  ✓ Push notifications to security teams
  ✓ Google Maps integration
  ✓ Anonymous reporting option
  ✓ Works in background/locked screen

  PREMIUM FEATURES (₦2,000/month):
  ✓ Security escort tracking
  ✓ Priority support
  ✓ Advanced analytics
  ✓ 7-day free trial

  WHO IT'S FOR:
  - Professionals traveling alone
  - Students on campus
  - Anyone in high-risk situations
  - Security professionals
  - Private security firms

  WHY SAFEGUARD?
  • Fastest panic response (< 5 seconds)
  • Professional security team integration
  • Proven technology (99.9% uptime)
  • Trusted by 50,000+ users

  Download now and experience peace of mind.

  Note: Location services must be enabled for emergency features. Continued use of GPS running in the background can dramatically decrease battery life.
  ```

**Graphics:**
- Upload app icon (512x512)
- Upload feature graphic (1024x500)
- Upload screenshots (minimum 2, maximum 8)

**Categorization:**
- **App category:** Lifestyle (or Maps & Navigation)
- **Tags:** safety, security, emergency, panic button, tracking

**Contact details:**
- **Email:** support@safeguard.app
- **Phone:** +234-XXX-XXX-XXXX (optional)
- **Website:** https://www.safeguard.app

**Privacy policy:**
- **URL:** https://yourdomain.com/privacy-policy

### Step 4: Content Rating

1. Navigate to "Policy" → "App content"
2. Click "Start questionnaire"
3. Answer questions about your app:
   - Does it contain violence? **No**
   - Does it contain sexual content? **No**
   - Does it contain profanity? **No**
   - etc.
4. Google calculates rating (likely **Everyone** or **Teen**)

### Step 5: Target Audience & Content

**A. Target Age Groups**
- Select: 18+
- Reason: Emergency/security app, requires maturity

**B. News App**
- Select: No

**C. COVID-19 Contact Tracing**
- Select: No

**D. Data Safety**

**CRITICAL SECTION** - Be thorough:

**Location Data:**
- Collected: YES
- Shared: YES (with security teams, with user consent)
- Optional: NO (required for core functionality)
- Purpose: App functionality (emergency tracking)
- Ephemeral: NO (stored temporarily, deleted after 24 hours)

**Personal Information:**
- Email: Collected, not shared
- Phone: Collected, not shared
- Name: Optional

**Photos/Videos:**
- Collected: YES (incident reports)
- Shared: YES (with security teams)
- Optional: YES (reporting is optional)

**Audio:**
- Collected: YES (audio reports)
- Shared: YES (with security teams)
- Optional: YES

**Security Practices:**
- ✓ Data is encrypted in transit
- ✓ Data is encrypted at rest
- ✓ Users can request deletion
- ✓ Committed to follow Google Play's Families Policy

### Step 6: Build AAB (Android App Bundle)

**Important:** Google Play Store requires AAB (not APK) for production.

```bash
cd /app/frontend

# Build production AAB
eas build --platform android --profile production
```

**What's AAB?**
- Android App Bundle (`.aab` file)
- Google Play generates optimized APKs from AAB
- Smaller downloads for users (only relevant code/resources)
- Required for Play Store (APK no longer accepted for new apps)

**Build Output:**
```
✔ Build finished
AAB: https://expo.dev/artifacts/eas/XYZ789ABC.aab
```

### Step 7: Upload to Google Play Console

**A. Create Release**

1. In Play Console, go to "Release" → "Production"
2. Click "Create new release"
3. Select "App bundles" tab
4. Click "Upload"
5. Choose the `.aab` file downloaded from EAS

**B. Release Name & Notes**

- **Release name:** 1.0.0 (First Release)
- **Release notes:**
  ```
  🎉 Welcome to SafeGuard!

  Initial release featuring:
  • Instant panic button with GPS tracking
  • Live video and audio reporting
  • Security escort for safe travel
  • Real-time security team dispatch
  • Anonymous reporting option

  Your safety is our priority.
  ```

### Step 8: Review & Publish

**A. Pre-launch Report (Optional but Recommended)**
- Google tests app on real devices
- Checks for crashes, ANR (App Not Responding), security issues
- Takes 30 minutes to few hours
- Review report and fix any issues

**B. Pricing & Distribution**

1. Navigate to "Pricing & distribution"
2. Select countries:
   - **Primary:** Nigeria, Ghana, Kenya, South Africa
   - **Secondary:** Add more as you expand
3. Pricing: **Free**
4. Contains ads: **No**
5. Content rating: Should be automatically filled from Step 4
6. Data safety: Should be filled from Step 5

**C. Final Checks**

Before publishing, ensure:
- [ ] All required fields are green checkmarks
- [ ] Privacy policy URL is live
- [ ] Screenshots show actual app features
- [ ] Description is clear and accurate
- [ ] Content rating is appropriate
- [ ] Data safety is complete

**D. Roll Out Release**

1. Click "Review release"
2. Double-check all information
3. Click "Start rollout to Production"

**Options:**
- **Production:** 100% of users (recommended)
- **Staged rollout:** Start with 5-10% of users, gradually increase
- **Closed testing:** Beta testers only (for pre-release testing)

### Step 9: App Review Process

**Timeline:**
- **Review time:** 1-7 days (average 2-3 days)
- **Automatic checks:** Few hours
- **Manual review:** 1-5 days (if flagged)

**What Google Reviews:**
- App functionality
- Privacy policy accuracy
- Content rating appropriateness
- Compliance with Play policies
- No malware or malicious behavior

**Possible Outcomes:**

**✅ Approved:**
- App goes live on Play Store
- Users can search and download
- You receive email confirmation

**⚠️ Rejected:**
- Email with rejection reason
- Fix issues and resubmit
- Common reasons:
  - Privacy policy issues
  - Inaccurate data safety declarations
  - Crashing on test devices
  - Policy violations

**If Rejected:**
1. Read rejection email carefully
2. Fix all mentioned issues
3. Upload new AAB if code changes needed
4. Resubmit for review
5. Respond to reviewer comments if needed

### Step 10: Post-Publication

**Once Live:**

1. **App URL:**
   - `https://play.google.com/store/apps/details?id=com.safeguard.app`
   - Share this link for downloads

2. **Monitor Metrics:**
   - Downloads
   - Active users
   - Ratings & reviews
   - Crashes & ANRs

3. **Respond to Reviews:**
   - Reply to user feedback
   - Address complaints
   - Thank positive reviewers

4. **Updates:**
   - To release updates, repeat Steps 6-9
   - Increment version number in `app.json`
   - Increment `versionCode` in `app.json`

---

## 4. Post-Deployment Checklist

### A. After APK Build

- [ ] Test APK on multiple devices (different Android versions)
- [ ] Verify all permissions are granted correctly
- [ ] Test background location tracking
- [ ] Verify push notifications work
- [ ] Check payment flow (Paystack)
- [ ] Test offline functionality
- [ ] Monitor crash reports (Sentry integration recommended)

### B. After Play Store Publish

- [ ] Download app from Play Store and test
- [ ] Monitor Google Play Console for crashes
- [ ] Check reviews daily for first week
- [ ] Respond to user feedback
- [ ] Track download metrics
- [ ] Set up alerts for critical issues
- [ ] Plan first update based on feedback

### C. Marketing (Post-Launch)

- [ ] Share Play Store link on social media
- [ ] Create press release
- [ ] Reach out to tech blogs/reviewers
- [ ] Run app install ads (Google Ads, Facebook)
- [ ] Encourage early users to leave reviews
- [ ] Create launch video for YouTube
- [ ] Update website with download links

---

## 5. Troubleshooting

### Common EAS Build Issues

**Issue 1: Build Fails with "Module not found"**

**Solution:**
```bash
# In frontend directory
cd /app/frontend

# Clean install
rm -rf node_modules
yarn install

# Try build again
eas build --platform android --profile preview
```

**Issue 2: "Invalid credentials" Error**

**Solution:**
```bash
# Re-login to EAS
eas logout
eas login

# Verify account
eas whoami
```

**Issue 3: Build Timeout**

**Solution:**
- Use cloud build (not local)
- Reduce app size (remove unused dependencies)
- Check your internet connection
- Try again during off-peak hours

**Issue 4: APK Install Fails on Device**

**Solution:**
- Enable "Install from Unknown Sources" in Android settings
- Check minimum Android version (should be 8.0+)
- Ensure APK downloaded completely (check file size)
- Try uninstalling old version first

### Common Play Store Rejection Reasons

**Issue 1: "Privacy Policy Required"**

**Solution:**
- Must have a live, accessible privacy policy URL
- Must cover location data collection
- Host on your domain or use free hosting (GitHub Pages)

**Issue 2: "Data Safety Declaration Incomplete"**

**Solution:**
- Be thorough in data safety section
- Declare all data types collected (location, video, audio, email)
- Specify purpose and whether data is shared
- Be honest and transparent

**Issue 3: "App Crashes on Test Devices"**

**Solution:**
- Review Pre-launch Report in Play Console
- Fix reported crashes
- Test on same Android versions as test devices
- Upload new AAB with fixes

**Issue 4: "Dangerous Permissions"**

**Solution:**
- Background location requires justification
- Write clear permission rationale in app.json
- Explain in-app why permissions are needed
- Only request permissions when needed (not on app start)

### EAS Build Commands Reference

```bash
# Check EAS CLI version
eas --version

# Login to Expo account
eas login

# Initialize EAS in project
eas build:configure

# Build APK (preview/testing)
eas build --platform android --profile preview

# Build AAB (Play Store)
eas build --platform android --profile production

# Build for iOS (requires Apple Developer account)
eas build --platform ios --profile production

# Build for both platforms
eas build --platform all --profile production

# View build history
eas build:list

# Cancel running build
eas build:cancel

# View build logs
eas build:view

# Submit to Play Store (after AAB built)
eas submit --platform android

# Check project configuration
eas config
```

---

## 6. Cost Breakdown

### APK Distribution (Direct Download)

**Free Tier (EAS):**
- 30 builds per month
- Cloud build infrastructure
- Artifact hosting (30 days)

**Paid Tier (if needed):**
- Production: $299/year (unlimited builds)
- Priority: $99/year (faster builds)

**Hosting APK (if self-hosting):**
- Google Drive: Free (15GB)
- AWS S3: ~$0.023/GB
- Custom domain: $10-15/year

**Total Cost:** $0 - $50/year (if using free tiers)

### Google Play Store

**One-Time Costs:**
- Google Play Developer Registration: $25 (lifetime)

**Recurring Costs (Optional):**
- EAS Production Plan: $299/year (if >30 builds/month)
- Code signing service: Free (EAS handles)
- App updates: Free (unlimited)

**Revenue Share:**
- Google Play: 15% of first $1M revenue, 30% after
- For SafeGuard: 15% of ₦2,000 = ₦300 per premium subscription

**Total First Year:** $25 + $0-299 = $25-$324

---

## 7. Recommended Workflow

**For Testing/Beta (First 3-6 months):**
1. Build APK via EAS (`preview` profile)
2. Distribute to beta testers via Google Drive link
3. Collect feedback and fix bugs
4. Iterate quickly (no Play Store review wait)

**For Public Launch:**
1. Polish app based on beta feedback
2. Prepare all Play Store assets (screenshots, description, privacy policy)
3. Build AAB via EAS (`production` profile)
4. Submit to Google Play Store
5. Wait for approval (2-7 days)
6. Monitor reviews and metrics
7. Plan updates based on user feedback

**For Updates (Post-Launch):**
1. Develop new features
2. Test internally with APK builds
3. Increment version numbers
4. Build production AAB
5. Submit to Play Store
6. Release as production or staged rollout

---

## 8. Quick Start Commands

**Build APK (Testing):**
```bash
cd /app/frontend
eas build --platform android --profile preview
# Wait 10-20 minutes
# Download from provided URL
```

**Build AAB (Play Store):**
```bash
cd /app/frontend
eas build --platform android --profile production
# Wait 10-20 minutes
# Upload to Play Console
```

**Check Build Status:**
```bash
eas build:list
```

**Download Build:**
```bash
# Get URL from build:list command
curl -o SafeGuard.apk [URL]
```

---

## 9. Support & Resources

**Official Documentation:**
- Expo EAS Build: https://docs.expo.dev/build/introduction/
- Google Play Console: https://support.google.com/googleplay/android-developer
- Android Publishing: https://developer.android.com/studio/publish

**Community Support:**
- Expo Discord: https://chat.expo.dev
- Stack Overflow: Tag `expo` or `react-native`
- Expo Forums: https://forums.expo.dev

**SafeGuard Support:**
- Email: dev@safeguard.app
- Documentation: /app/INTEGRATION_COMPLETE.md

---

## Conclusion

You now have two clear paths:

**Path A - APK Distribution:**
- Fastest to deploy (few hours)
- Direct control over distribution
- Great for beta testing
- No review process
- Limited reach (manual distribution)

**Path B - Play Store:**
- Wider reach (billions of Android users)
- Professional presence
- Automatic updates
- User reviews/ratings
- Takes longer (initial setup + review)

**Recommendation:**
1. Start with APK for beta testing (2-4 weeks)
2. Collect feedback and fix issues
3. Submit to Play Store for public launch
4. Use Play Store for all subsequent updates

**Your app is production-ready. Time to ship! 🚀**

---

**Document Version:** 1.0  
**Last Updated:** June 2025  
**Maintained by:** SafeGuard Development Team
