# SafeGuard Demo Accounts

## 📱 Civil User Accounts (3)

### Account 1
- **Name:** Adebayo Okonkwo
- **Email:** civil1@safeguard.app
- **Password:** SafeGuard2025!
- **Phone:** +234-901-234-5678
- **Role:** Civil User
- **Premium:** No (can be upgraded)

### Account 2
- **Name:** Chioma Nwosu
- **Email:** civil2@safeguard.app
- **Password:** SafeGuard2025!
- **Phone:** +234-902-345-6789
- **Role:** Civil User
- **Premium:** No (can be upgraded)

### Account 3
- **Name:** Emeka Ibrahim
- **Email:** civil3@safeguard.app
- **Password:** SafeGuard2025!
- **Phone:** +234-903-456-7890
- **Role:** Civil User
- **Premium:** No (can be upgraded)

---

## 🛡️ Security Personnel Accounts (2)

### Security Account 1
- **Name:** Officer John Okoro
- **Email:** security1@safeguard.app
- **Password:** SecurePass2025!
- **Phone:** +234-910-111-2222
- **Role:** Security Personnel
- **Features:** Dashboard, Panic Alerts, Reports, User Tracking

### Security Account 2
- **Name:** Officer Blessing Adamu
- **Email:** security2@safeguard.app
- **Password:** SecurePass2025!
- **Phone:** +234-911-222-3333
- **Role:** Security Personnel
- **Features:** Dashboard, Panic Alerts, Reports, User Tracking

---

## 🎯 Demo Scenarios

### Scenario 1: Panic Button Test
1. Login with **civil1@safeguard.app**
2. Press the red panic button on home screen
3. Allow location permissions
4. Phone will simulate sleep (discreet mode)
5. Login with **security1@safeguard.app** on another device
6. Check "Nearby Panics" - you'll see the alert if within radius

### Scenario 2: Live Report
1. Login with **civil2@safeguard.app**
2. Go to "Live Report" (video) or "Audio Report"
3. Record a test incident (remember: video needs 1+ seconds)
4. Add caption and submit
5. Login with **security2@safeguard.app**
6. Check "Nearby Reports" to see the submission

### Scenario 3: Premium Upgrade
1. Login with **civil3@safeguard.app**
2. Go to "Premium" screen
3. Click "Upgrade Now"
4. Test with Paystack test card:
   - Card: 5060 6666 6666 6666
   - CVV: 123
   - Expiry: 12/26
   - PIN: 1234
   - OTP: 123456
5. Premium features unlocked (Security Escort)

### Scenario 4: Security Escort (Premium)
1. Upgrade **civil1@safeguard.app** to premium (see Scenario 3)
2. Toggle "Security Escort" on home screen
3. Tracking starts automatically
4. Move around (if possible) to test GPS tracking
5. Click "ARRIVED" when done
6. Check with security account to see tracking history

### Scenario 5: Security Team Setup
1. Login with **security1@safeguard.app**
2. Go to "Set Team Location"
3. Tap on map to set your team's location
4. Set radius (5km, 10km, etc.)
5. Save
6. Now you'll only receive alerts for incidents within that radius

---

## 📝 Notes for Demos

**Important Points:**
- All accounts are fully functional and ready to use
- Civil accounts can be upgraded to Premium for testing
- Security accounts have full access to dashboard features
- Test payments use Paystack TEST keys (no real charges)
- Location services require device GPS/location permissions

**Best Demo Practices:**
1. **Show panic flow first** - Most impressive feature
2. **Demonstrate geospatial matching** - Login on 2 devices (civil + security)
3. **Highlight real-time updates** - Show location tracking live
4. **Showcase premium features** - Security Escort, Premium UI
5. **Emphasize privacy** - Anonymous reports, auto-delete tracking

**Common Demo Issues:**
- **Video recording error:** Need to record for at least 1 second before stopping
- **No panic alerts showing:** Security user needs to set team location first and be within radius
- **Location not updating:** Check device location permissions are enabled
- **Expo Go not loading:** Re-scan QR code or check network connection

---

## 🔐 Security Notes

- **Passwords:** Use the provided passwords for demos only
- **Production:** Change all demo account passwords before launch
- **Data:** Demo account data can be cleared/reset anytime
- **Privacy:** Do not use demo accounts for real emergencies

---

## 📊 Quick Stats

- **Total Accounts Created:** 5 (3 Civil, 2 Security)
- **All Accounts:** Email verified and ready to use
- **Premium Status:** All free tier (upgradable via in-app payment)
- **Database:** MongoDB collection 'users'

---

## 🆘 Support

If any demo account has issues:
1. Check backend logs: `sudo supervisorctl tail backend`
2. Verify account in database
3. Reset password if needed
4. Contact development team

---

**Created:** June 2025  
**Last Updated:** June 2025  
**Status:** Active and Ready for Demos
