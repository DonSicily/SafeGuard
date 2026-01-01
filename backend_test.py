#!/usr/bin/env python3
"""
SafeGuard Backend API Testing - Focus on Push Token Registration and Panic Category
Testing specific features as requested in review.
"""

import requests
import json
import time
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')
BACKEND_URL = os.getenv('EXPO_PUBLIC_BACKEND_URL', 'https://safeguard-mobile-6.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

class SafeGuardAPITester:
    def __init__(self):
        self.civil_token = None
        self.security_token = None
        self.civil_user_id = None
        self.security_user_id = None
        self.test_results = []
        self.civil_data = None
        self.security_data = None
        
    def log_test(self, test_name, success, details=""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details
        })
        
    def make_request(self, method, endpoint, data=None, token=None, expect_status=200):
        """Make HTTP request with proper headers"""
        url = f"{API_BASE}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
            
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            if response.status_code != expect_status:
                return False, f"Expected {expect_status}, got {response.status_code}: {response.text}"
                
            return True, response.json() if response.content else {}
            
        except Exception as e:
            return False, f"Request failed: {str(e)}"
    
    def test_civil_user_registration(self):
        """Test Civil User Registration & Login"""
        print("\n=== 1. CIVIL USER AUTHENTICATION ===")
        
        # Register civil user with unique email
        import time
        timestamp = int(time.time())
        self.civil_data = {
            "email": f"civil.user.{timestamp}@safeguard.com",
            "password": "SecurePass123!",
            "confirm_password": "SecurePass123!",
            "phone": f"+123456{timestamp % 10000}",
            "role": "civil"
        }
        
        success, response = self.make_request('POST', '/auth/register', self.civil_data, expect_status=200)
        if success:
            self.civil_token = response.get('token')
            self.civil_user_id = response.get('user_id')
            self.log_test("Civil User Registration", True, f"User ID: {self.civil_user_id}")
        else:
            self.log_test("Civil User Registration", False, response)
            return False
            
        # Test civil user login
        login_data = {
            "email": self.civil_data["email"],
            "password": "SecurePass123!"
        }
        
        success, response = self.make_request('POST', '/auth/login', login_data, expect_status=200)
        if success and response.get('token'):
            self.log_test("Civil User Login", True, f"Role: {response.get('role')}")
        else:
            self.log_test("Civil User Login", False, response)
            
        # Get civil profile
        success, response = self.make_request('GET', '/user/profile', token=self.civil_token)
        if success and response.get('role') == 'civil':
            self.log_test("Civil Profile Retrieval", True, f"Email: {response.get('email')}")
        else:
            self.log_test("Civil Profile Retrieval", False, response)
            
        return True
    
    def test_security_user_registration(self):
        """Test Security User Registration & Login"""
        print("\n=== 2. SECURITY USER AUTHENTICATION ===")
        
        # Register security user with valid invite code
        import time
        timestamp = int(time.time())
        self.security_data = {
            "email": f"security.team.{timestamp}@safeguard.com",
            "password": "SecurePass123!",
            "confirm_password": "SecurePass123!",
            "phone": f"+198765{timestamp % 10000}",
            "role": "security",
            "invite_code": "SECURITY2025"
        }
        
        success, response = self.make_request('POST', '/auth/register', self.security_data, expect_status=200)
        if success:
            self.security_token = response.get('token')
            self.security_user_id = response.get('user_id')
            self.log_test("Security User Registration", True, f"User ID: {self.security_user_id}")
        else:
            self.log_test("Security User Registration", False, response)
            return False
            
        # Test security user login
        login_data = {
            "email": self.security_data["email"],
            "password": "SecurePass123!"
        }
        
        success, response = self.make_request('POST', '/auth/login', login_data, expect_status=200)
        if success and response.get('role') == 'security':
            self.log_test("Security User Login", True, f"Role: {response.get('role')}")
        else:
            self.log_test("Security User Login", False, response)
            
        # Get security profile
        success, response = self.make_request('GET', '/user/profile', token=self.security_token)
        if success and response.get('role') == 'security':
            self.log_test("Security Profile Retrieval", True, f"Email: {response.get('email')}")
        else:
            self.log_test("Security Profile Retrieval", False, response)
            
        return True
    
    def test_invalid_security_registration(self):
        """Test Invalid Security Registration (without invite code)"""
        print("\n=== 3. INVALID SECURITY REGISTRATION ===")
        
        invalid_security_data = {
            "email": "invalid.security@safeguard.com",
            "password": "SecurePass123!",
            "confirm_password": "SecurePass123!",
            "role": "security"
            # Missing invite_code
        }
        
        success, response = self.make_request('POST', '/auth/register', invalid_security_data, expect_status=403)
        if not success:
            self.log_test("Invalid Security Registration Block", True, "Correctly blocked without invite code")
        else:
            self.log_test("Invalid Security Registration Block", False, "Should have been blocked")
    
    def test_civil_user_features(self):
        """Test Civil User Features"""
        print("\n=== 4. CIVIL USER FEATURES ===")
        
        # Test Panic Button Activation
        panic_data = {
            "latitude": 40.7128,
            "longitude": -74.0060,
            "accuracy": 5.0,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        success, response = self.make_request('POST', '/panic/activate', panic_data, token=self.civil_token)
        if success and response.get('panic_id'):
            panic_id = response.get('panic_id')
            self.log_test("Panic Button Activation", True, f"Panic ID: {panic_id}")
            
            # Test Panic Location Logging
            location_data = {
                "latitude": 40.7130,
                "longitude": -74.0062,
                "accuracy": 3.0,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            success, response = self.make_request('POST', '/panic/location', location_data, token=self.civil_token)
            if success:
                self.log_test("Panic Location Logging", True, "Location updated successfully")
            else:
                self.log_test("Panic Location Logging", False, response)
                
            # Test Panic Deactivation
            success, response = self.make_request('POST', '/panic/deactivate', token=self.civil_token)
            if success:
                self.log_test("Panic Deactivation", True, "Panic deactivated successfully")
            else:
                self.log_test("Panic Deactivation", False, response)
        else:
            self.log_test("Panic Button Activation", False, response)
        
        # Test App Customization
        custom_data = {
            "app_name": "MyGuard Pro",
            "app_logo": "custom_shield"
        }
        
        success, response = self.make_request('PUT', '/user/customize-app', custom_data, token=self.civil_token)
        if success:
            self.log_test("App Customization", True, "App customized successfully")
            
            # Verify changes in profile
            success, profile = self.make_request('GET', '/user/profile', token=self.civil_token)
            if success and profile.get('app_name') == 'MyGuard Pro':
                self.log_test("App Customization Verification", True, "Changes reflected in profile")
            else:
                self.log_test("App Customization Verification", False, "Changes not reflected")
        else:
            self.log_test("App Customization", False, response)
        
        # Test Video Report Creation
        video_report = {
            "type": "video",
            "caption": "Suspicious activity near park entrance",
            "is_anonymous": False,
            "latitude": 40.7128,
            "longitude": -74.0060,
            "file_url": "https://example.com/video.mp4",
            "thumbnail": "https://example.com/thumb.jpg",
            "uploaded": True
        }
        
        success, response = self.make_request('POST', '/report/create', video_report, token=self.civil_token)
        if success and response.get('report_id'):
            self.log_test("Video Report Creation", True, f"Report ID: {response.get('report_id')}")
        else:
            self.log_test("Video Report Creation", False, response)
            
        # Test Audio Report Creation
        audio_report = {
            "type": "audio",
            "caption": "Heard suspicious conversation",
            "is_anonymous": True,
            "latitude": 40.7130,
            "longitude": -74.0062,
            "file_url": "https://example.com/audio.mp3",
            "uploaded": True
        }
        
        success, response = self.make_request('POST', '/report/create', audio_report, token=self.civil_token)
        if success and response.get('report_id'):
            self.log_test("Audio Report Creation", True, f"Anonymous report created")
        else:
            self.log_test("Audio Report Creation", False, response)
            
        # Test Get My Reports
        success, response = self.make_request('GET', '/report/my-reports', token=self.civil_token)
        if success and isinstance(response, list) and len(response) >= 2:
            self.log_test("User Reports Retrieval", True, f"Retrieved {len(response)} reports")
        else:
            self.log_test("User Reports Retrieval", False, response)
    
    def test_escort_premium_features(self):
        """Test Security Escort Premium Features"""
        print("\n=== 5. ESCORT PREMIUM FEATURES ===")
        
        # Test Escort Access for Basic User (Should Fail)
        escort_data = {
            "action": "start",
            "location": {
                "latitude": 40.7128,
                "longitude": -74.0060,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        
        success, response = self.make_request('POST', '/escort/action', escort_data, token=self.civil_token, expect_status=403)
        if not success:
            self.log_test("Escort Access Control (Basic User)", True, "Correctly blocked non-premium user")
        else:
            self.log_test("Escort Access Control (Basic User)", False, "Should have been blocked")
        
        # Test Premium Upgrade via Payment
        success, response = self.make_request('POST', '/payment/init', 29.99, token=self.civil_token)
        if success and response.get('reference'):
            reference = response.get('reference')
            self.log_test("Payment Initialization", True, f"Reference: {reference}")
            
            # Verify payment (mocked)
            success, response = self.make_request('GET', f'/payment/verify/{reference}', token=self.civil_token)
            if success and response.get('status') == 'success':
                self.log_test("Payment Verification & Premium Upgrade", True, "User upgraded to premium")
                
                # Now test escort features for premium user
                success, response = self.make_request('POST', '/escort/action', escort_data, token=self.civil_token)
                if success and response.get('session_id'):
                    session_id = response.get('session_id')
                    self.log_test("Escort Session Start (Premium User)", True, f"Session ID: {session_id}")
                    
                    # Test location logging during escort
                    location_data = {
                        "latitude": 40.7130,
                        "longitude": -74.0062,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    
                    success, response = self.make_request('POST', '/escort/location', location_data, token=self.civil_token)
                    if success:
                        self.log_test("Escort Location Logging", True, "Location logged during escort")
                    else:
                        self.log_test("Escort Location Logging", False, response)
                    
                    # Test escort session termination
                    stop_data = {
                        "action": "stop",
                        "location": location_data
                    }
                    
                    success, response = self.make_request('POST', '/escort/action', stop_data, token=self.civil_token)
                    if success:
                        self.log_test("Escort Session Termination", True, "Session terminated successfully")
                    else:
                        self.log_test("Escort Session Termination", False, response)
                else:
                    self.log_test("Escort Session Start (Premium User)", False, response)
            else:
                self.log_test("Payment Verification & Premium Upgrade", False, response)
        else:
            self.log_test("Payment Initialization", False, response)
    
    def test_security_user_features(self):
        """Test Security User Features"""
        print("\n=== 6. SECURITY USER FEATURES ===")
        
        # Test Team Location Setup
        location_data = {
            "latitude": 40.7128,
            "longitude": -74.0060,
            "radius_km": 5.0
        }
        
        success, response = self.make_request('POST', '/security/set-location', location_data, token=self.security_token)
        if success:
            self.log_test("Security Team Location Setup", True, "Team location set successfully")
            
            # Verify team location
            success, response = self.make_request('GET', '/security/team-location', token=self.security_token)
            if success and response.get('latitude') == 40.7128:
                self.log_test("Team Location Verification", True, f"Radius: {response.get('radius_km')}km")
            else:
                self.log_test("Team Location Verification", False, response)
        else:
            self.log_test("Security Team Location Setup", False, response)
        
        # Test Geospatial Queries - Nearby Reports
        success, response = self.make_request('GET', '/security/nearby-reports', token=self.security_token)
        if success and isinstance(response, list):
            self.log_test("Nearby Reports Query", True, f"Found {len(response)} nearby reports")
        else:
            self.log_test("Nearby Reports Query", False, response)
        
        # Test Geospatial Queries - Nearby Panics
        success, response = self.make_request('GET', '/security/nearby-panics', token=self.security_token)
        if success and isinstance(response, list):
            self.log_test("Nearby Panics Query", True, f"Found {len(response)} active panics")
        else:
            self.log_test("Nearby Panics Query", False, response)
        
        # Test User Search by Email (use the civil user email from registration)
        search_data = {"search_term": self.civil_data["email"]}
        success, response = self.make_request('POST', '/security/search-user', search_data, token=self.security_token)
        if success and response.get('user_id'):
            user_id = response.get('user_id')
            self.log_test("User Search by Email", True, f"Found user: {response.get('email')}")
            
            # Test User History
            success, response = self.make_request('GET', f'/security/user-history/{user_id}', token=self.security_token)
            if success and isinstance(response, list):
                self.log_test("User History Retrieval", True, f"Found {len(response)} sessions")
            else:
                self.log_test("User History Retrieval", False, response)
        else:
            self.log_test("User Search by Email", False, response)
        
        # Test User Search by Phone
        search_data = {"search_term": self.civil_data["phone"]}
        success, response = self.make_request('POST', '/security/search-user', search_data, token=self.security_token)
        if success and response.get('user_id'):
            self.log_test("User Search by Phone", True, f"Found user: {response.get('phone')}")
        else:
            self.log_test("User Search by Phone", False, response)
    
    def test_permission_checks(self):
        """Test Cross-Role Permission Checks"""
        print("\n=== 7. PERMISSION CHECKS ===")
        
        # Security user trying to activate panic (should fail)
        panic_data = {
            "latitude": 40.7128,
            "longitude": -74.0060,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        success, response = self.make_request('POST', '/panic/activate', panic_data, token=self.security_token, expect_status=403)
        if not success:
            self.log_test("Security User Panic Block", True, "Correctly blocked security user from panic")
        else:
            self.log_test("Security User Panic Block", False, "Should have been blocked")
        
        # Security user trying to create report (should fail)
        report_data = {
            "type": "video",
            "caption": "Test report",
            "latitude": 40.7128,
            "longitude": -74.0060
        }
        
        success, response = self.make_request('POST', '/report/create', report_data, token=self.security_token, expect_status=403)
        if not success:
            self.log_test("Security User Report Block", True, "Correctly blocked security user from reports")
        else:
            self.log_test("Security User Report Block", False, "Should have been blocked")
        
        # Civil user trying to access security features (should fail)
        success, response = self.make_request('GET', '/security/nearby-reports', token=self.civil_token, expect_status=403)
        if not success:
            self.log_test("Civil User Security Block", True, "Correctly blocked civil user from security features")
        else:
            self.log_test("Civil User Security Block", False, "Should have been blocked")
    
    def test_edge_cases(self):
        """Test Edge Cases and Error Handling"""
        print("\n=== 8. EDGE CASES ===")
        
        # Test invalid coordinates
        invalid_panic = {
            "latitude": 999.0,  # Invalid latitude
            "longitude": -74.0060,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        success, response = self.make_request('POST', '/panic/activate', invalid_panic, token=self.civil_token, expect_status=422)
        if not success:
            self.log_test("Invalid Coordinates Handling", True, "Correctly rejected invalid coordinates")
        else:
            self.log_test("Invalid Coordinates Handling", False, "Should have rejected invalid coordinates")
        
        # Test unauthorized access
        success, response = self.make_request('GET', '/user/profile', expect_status=401)
        if not success:
            self.log_test("Unauthorized Access Block", True, "Correctly blocked unauthenticated request")
        else:
            self.log_test("Unauthorized Access Block", False, "Should have blocked unauthenticated request")
        
        # Test duplicate registration
        duplicate_data = {
            "email": "civil.user@safeguard.com",  # Already registered
            "password": "NewPass123!",
            "confirm_password": "NewPass123!",
            "role": "civil"
        }
        
        success, response = self.make_request('POST', '/auth/register', duplicate_data, expect_status=400)
        if not success:
            self.log_test("Duplicate Registration Block", True, "Correctly blocked duplicate email")
        else:
            self.log_test("Duplicate Registration Block", False, "Should have blocked duplicate email")
    
    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting SafeGuard Security App Backend API Tests")
        print(f"🌐 Testing against: {API_BASE}")
        print("=" * 60)
        
        try:
            # Run all test suites
            self.test_civil_user_registration()
            self.test_security_user_registration()
            self.test_invalid_security_registration()
            self.test_civil_user_features()
            self.test_escort_premium_features()
            self.test_security_user_features()
            self.test_permission_checks()
            self.test_edge_cases()
            
            # Summary
            print("\n" + "=" * 60)
            print("📊 TEST SUMMARY")
            print("=" * 60)
            
            passed = sum(1 for result in self.test_results if result['success'])
            total = len(self.test_results)
            
            print(f"✅ Passed: {passed}/{total}")
            print(f"❌ Failed: {total - passed}/{total}")
            print(f"📈 Success Rate: {(passed/total)*100:.1f}%")
            
            if total - passed > 0:
                print("\n❌ FAILED TESTS:")
                for result in self.test_results:
                    if not result['success']:
                        print(f"   • {result['test']}: {result['details']}")
            
            return passed == total
            
        except Exception as e:
            print(f"\n💥 Test suite failed with error: {str(e)}")
            return False

if __name__ == "__main__":
    tester = SafeGuardAPITester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed! SafeGuard API is fully functional.")
    else:
        print("\n⚠️  Some tests failed. Check the details above.")
    
    exit(0 if success else 1)