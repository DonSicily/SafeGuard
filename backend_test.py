#!/usr/bin/env python3
"""
SafeGuard Security Mobile App - Backend API Testing
Tests all backend endpoints for authentication, panic button, escort, reports, and payments
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional

class SafeGuardAPITester:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.api_url = f"{self.base_url}/api"
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test results"""
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'timestamp': datetime.now().isoformat(),
            'response_data': response_data
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if not success and response_data:
            print(f"   Response: {response_data}")
        print()

    def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None, auth_required: bool = False) -> requests.Response:
        """Make HTTP request with optional authentication"""
        url = f"{self.api_url}{endpoint}"
        request_headers = headers or {}
        
        if auth_required and self.auth_token:
            request_headers['Authorization'] = f'Bearer {self.auth_token}'
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, headers=request_headers)
            elif method.upper() == 'POST':
                request_headers['Content-Type'] = 'application/json'
                response = self.session.post(url, json=data, headers=request_headers)
            elif method.upper() == 'PUT':
                request_headers['Content-Type'] = 'application/json'
                response = self.session.put(url, json=data, headers=request_headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
        except Exception as e:
            print(f"Request failed: {e}")
            raise

    # ===== AUTHENTICATION TESTS =====
    
    def test_user_registration(self):
        """Test user registration endpoint"""
        test_email = "sarah.connor@safeguard.com"
        test_password = "TerminatorHunter2025!"
        
        data = {
            "email": test_email,
            "password": test_password,
            "confirm_password": test_password
        }
        
        try:
            response = self.make_request('POST', '/auth/register', data)
            
            if response.status_code == 200:
                response_data = response.json()
                if 'token' in response_data and 'user_id' in response_data:
                    self.auth_token = response_data['token']
                    self.user_id = response_data['user_id']
                    self.log_test("User Registration", True, f"User registered successfully with email: {test_email}")
                    return True
                else:
                    self.log_test("User Registration", False, "Missing token or user_id in response", response_data)
            else:
                self.log_test("User Registration", False, f"HTTP {response.status_code}", response.json())
        except Exception as e:
            self.log_test("User Registration", False, f"Exception: {str(e)}")
        
        return False

    def test_user_login(self):
        """Test user login endpoint"""
        test_email = "sarah.connor@safeguard.com"
        test_password = "TerminatorHunter2025!"
        
        data = {
            "email": test_email,
            "password": test_password
        }
        
        try:
            response = self.make_request('POST', '/auth/login', data)
            
            if response.status_code == 200:
                response_data = response.json()
                if 'token' in response_data:
                    self.auth_token = response_data['token']
                    self.user_id = response_data['user_id']
                    self.log_test("User Login", True, f"Login successful for: {test_email}")
                    return True
                else:
                    self.log_test("User Login", False, "Missing token in response", response_data)
            else:
                self.log_test("User Login", False, f"HTTP {response.status_code}", response.json())
        except Exception as e:
            self.log_test("User Login", False, f"Exception: {str(e)}")
        
        return False

    def test_google_auth(self):
        """Test Google OAuth authentication (mock data)"""
        data = {
            "google_id": "google_12345678901234567890",
            "email": "john.reese@safeguard.com",
            "name": "John Reese"
        }
        
        try:
            response = self.make_request('POST', '/auth/google', data)
            
            if response.status_code == 200:
                response_data = response.json()
                if 'token' in response_data:
                    self.log_test("Google OAuth", True, f"Google auth successful for: {data['email']}")
                    return True
                else:
                    self.log_test("Google OAuth", False, "Missing token in response", response_data)
            else:
                self.log_test("Google OAuth", False, f"HTTP {response.status_code}", response.json())
        except Exception as e:
            self.log_test("Google OAuth", False, f"Exception: {str(e)}")
        
        return False

    def test_get_user_profile(self):
        """Test getting user profile (requires authentication)"""
        try:
            response = self.make_request('GET', '/user/profile', auth_required=True)
            
            if response.status_code == 200:
                response_data = response.json()
                required_fields = ['id', 'email', 'is_premium', 'is_verified', 'app_name', 'app_logo']
                if all(field in response_data for field in required_fields):
                    self.log_test("Get User Profile", True, f"Profile retrieved for user: {response_data.get('email')}")
                    return True
                else:
                    missing_fields = [f for f in required_fields if f not in response_data]
                    self.log_test("Get User Profile", False, f"Missing fields: {missing_fields}", response_data)
            else:
                self.log_test("Get User Profile", False, f"HTTP {response.status_code}", response.json())
        except Exception as e:
            self.log_test("Get User Profile", False, f"Exception: {str(e)}")
        
        return False

    def test_customize_app(self):
        """Test app customization endpoint"""
        data = {
            "app_name": "MySecurityApp",
            "app_logo": "custom_shield"
        }
        
        try:
            response = self.make_request('PUT', '/user/customize-app', data, auth_required=True)
            
            if response.status_code == 200:
                self.log_test("App Customization", True, f"App customized: {data['app_name']}")
                return True
            else:
                self.log_test("App Customization", False, f"HTTP {response.status_code}", response.json())
        except Exception as e:
            self.log_test("App Customization", False, f"Exception: {str(e)}")
        
        return False

    def test_protected_endpoint_without_auth(self):
        """Test that protected endpoints fail without authentication"""
        # Temporarily clear auth token
        temp_token = self.auth_token
        self.auth_token = None
        
        try:
            response = self.make_request('GET', '/user/profile', auth_required=False)
            
            if response.status_code == 401:
                self.log_test("Protected Endpoint Security", True, "Correctly rejected unauthenticated request")
                success = True
            else:
                self.log_test("Protected Endpoint Security", False, f"Expected 401, got {response.status_code}")
                success = False
        except Exception as e:
            self.log_test("Protected Endpoint Security", False, f"Exception: {str(e)}")
            success = False
        finally:
            # Restore auth token
            self.auth_token = temp_token
        
        return success

    # ===== PANIC BUTTON TESTS =====
    
    def test_panic_activation(self):
        """Test panic button activation"""
        data = {"activated": True}
        
        try:
            response = self.make_request('POST', '/panic/activate', data, auth_required=True)
            
            if response.status_code == 200:
                response_data = response.json()
                if 'panic_id' in response_data:
                    self.panic_id = response_data['panic_id']
                    self.log_test("Panic Activation", True, f"Panic activated with ID: {self.panic_id}")
                    return True
                else:
                    self.log_test("Panic Activation", False, "Missing panic_id in response", response_data)
            else:
                self.log_test("Panic Activation", False, f"HTTP {response.status_code}", response.json())
        except Exception as e:
            self.log_test("Panic Activation", False, f"Exception: {str(e)}")
        
        return False

    def test_panic_location_logging(self):
        """Test logging GPS location during panic"""
        data = {
            "latitude": 40.7128,
            "longitude": -74.0060,
            "accuracy": 5.0,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        try:
            response = self.make_request('POST', '/panic/location', data, auth_required=True)
            
            if response.status_code == 200:
                self.log_test("Panic Location Logging", True, f"Location logged: {data['latitude']}, {data['longitude']}")
                return True
            else:
                self.log_test("Panic Location Logging", False, f"HTTP {response.status_code}", response.json())
        except Exception as e:
            self.log_test("Panic Location Logging", False, f"Exception: {str(e)}")
        
        return False

    def test_panic_deactivation(self):
        """Test panic button deactivation"""
        try:
            response = self.make_request('POST', '/panic/deactivate', auth_required=True)
            
            if response.status_code == 200:
                self.log_test("Panic Deactivation", True, "Panic mode deactivated successfully")
                return True
            else:
                self.log_test("Panic Deactivation", False, f"HTTP {response.status_code}", response.json())
        except Exception as e:
            self.log_test("Panic Deactivation", False, f"Exception: {str(e)}")
        
        return False

    # ===== ESCORT TESTS =====
    
    def test_escort_non_premium_user(self):
        """Test escort feature for non-premium user (should fail)"""
        data = {"action": "start"}
        
        try:
            response = self.make_request('POST', '/escort/action', data, auth_required=True)
            
            if response.status_code == 403:
                self.log_test("Escort Non-Premium Access Control", True, "Correctly blocked non-premium user")
                return True
            else:
                self.log_test("Escort Non-Premium Access Control", False, f"Expected 403, got {response.status_code}")
        except Exception as e:
            self.log_test("Escort Non-Premium Access Control", False, f"Exception: {str(e)}")
        
        return False

    def test_upgrade_to_premium(self):
        """Upgrade user to premium for escort testing"""
        # Use payment verification to upgrade to premium
        mock_reference = "ref_test_premium_upgrade"
        
        try:
            response = self.make_request('GET', f'/payment/verify/{mock_reference}', auth_required=True)
            
            if response.status_code == 200:
                self.log_test("Premium Upgrade", True, "User upgraded to premium successfully")
                return True
            else:
                self.log_test("Premium Upgrade", False, f"HTTP {response.status_code}", response.json())
        except Exception as e:
            self.log_test("Premium Upgrade", False, f"Exception: {str(e)}")
        
        return False

    def test_escort_start_session(self):
        """Test starting escort session (premium user)"""
        data = {"action": "start"}
        
        try:
            response = self.make_request('POST', '/escort/action', data, auth_required=True)
            
            if response.status_code == 200:
                response_data = response.json()
                if 'session_id' in response_data:
                    self.escort_session_id = response_data['session_id']
                    self.log_test("Escort Start Session", True, f"Escort session started: {self.escort_session_id}")
                    return True
                else:
                    self.log_test("Escort Start Session", False, "Missing session_id in response", response_data)
            else:
                self.log_test("Escort Start Session", False, f"HTTP {response.status_code}", response.json())
        except Exception as e:
            self.log_test("Escort Start Session", False, f"Exception: {str(e)}")
        
        return False

    def test_escort_location_logging(self):
        """Test logging GPS location during escort"""
        data = {
            "latitude": 40.7589,
            "longitude": -73.9851,
            "accuracy": 3.0,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        try:
            response = self.make_request('POST', '/escort/location', data, auth_required=True)
            
            if response.status_code == 200:
                self.log_test("Escort Location Logging", True, f"Escort location logged: {data['latitude']}, {data['longitude']}")
                return True
            else:
                self.log_test("Escort Location Logging", False, f"HTTP {response.status_code}", response.json())
        except Exception as e:
            self.log_test("Escort Location Logging", False, f"Exception: {str(e)}")
        
        return False

    def test_escort_stop_session(self):
        """Test stopping escort session and deleting data"""
        data = {"action": "stop"}
        
        try:
            response = self.make_request('POST', '/escort/action', data, auth_required=True)
            
            if response.status_code == 200:
                self.log_test("Escort Stop Session", True, "Escort session stopped and data deleted")
                return True
            else:
                self.log_test("Escort Stop Session", False, f"HTTP {response.status_code}", response.json())
        except Exception as e:
            self.log_test("Escort Stop Session", False, f"Exception: {str(e)}")
        
        return False

    # ===== REPORT TESTS =====
    
    def test_create_video_report(self):
        """Test creating a video report"""
        data = {
            "type": "video",
            "caption": "Suspicious activity near Central Park",
            "is_anonymous": False,
            "file_url": "https://example.com/video123.mp4",
            "thumbnail": "https://example.com/thumb123.jpg",
            "uploaded": False
        }
        
        try:
            response = self.make_request('POST', '/report/create', data, auth_required=True)
            
            if response.status_code == 200:
                response_data = response.json()
                if 'report_id' in response_data:
                    self.video_report_id = response_data['report_id']
                    self.log_test("Create Video Report", True, f"Video report created: {self.video_report_id}")
                    return True
                else:
                    self.log_test("Create Video Report", False, "Missing report_id in response", response_data)
            else:
                self.log_test("Create Video Report", False, f"HTTP {response.status_code}", response.json())
        except Exception as e:
            self.log_test("Create Video Report", False, f"Exception: {str(e)}")
        
        return False

    def test_create_audio_report(self):
        """Test creating an audio report"""
        data = {
            "type": "audio",
            "caption": "Emergency call recording",
            "is_anonymous": True,
            "file_url": "https://example.com/audio456.mp3",
            "uploaded": False
        }
        
        try:
            response = self.make_request('POST', '/report/create', data, auth_required=True)
            
            if response.status_code == 200:
                response_data = response.json()
                if 'report_id' in response_data:
                    self.audio_report_id = response_data['report_id']
                    self.log_test("Create Audio Report", True, f"Audio report created: {self.audio_report_id}")
                    return True
                else:
                    self.log_test("Create Audio Report", False, "Missing report_id in response", response_data)
            else:
                self.log_test("Create Audio Report", False, f"HTTP {response.status_code}", response.json())
        except Exception as e:
            self.log_test("Create Audio Report", False, f"Exception: {str(e)}")
        
        return False

    def test_get_user_reports(self):
        """Test retrieving user's reports"""
        try:
            response = self.make_request('GET', '/report/my-reports', auth_required=True)
            
            if response.status_code == 200:
                reports = response.json()
                if isinstance(reports, list) and len(reports) >= 2:
                    self.log_test("Get User Reports", True, f"Retrieved {len(reports)} reports")
                    return True
                else:
                    self.log_test("Get User Reports", False, f"Expected list with 2+ reports, got: {reports}")
            else:
                self.log_test("Get User Reports", False, f"HTTP {response.status_code}", response.json())
        except Exception as e:
            self.log_test("Get User Reports", False, f"Exception: {str(e)}")
        
        return False

    def test_mark_report_uploaded(self):
        """Test marking a report as uploaded"""
        if not hasattr(self, 'video_report_id'):
            self.log_test("Mark Report Uploaded", False, "No video report ID available")
            return False
        
        file_url = "https://cdn.safeguard.com/uploads/video123_final.mp4"
        
        try:
            response = self.make_request('PUT', f'/report/{self.video_report_id}/upload-complete', 
                                      data=file_url, auth_required=True)
            
            if response.status_code == 200:
                self.log_test("Mark Report Uploaded", True, f"Report {self.video_report_id} marked as uploaded")
                return True
            else:
                self.log_test("Mark Report Uploaded", False, f"HTTP {response.status_code}", response.json())
        except Exception as e:
            self.log_test("Mark Report Uploaded", False, f"Exception: {str(e)}")
        
        return False

    # ===== PAYMENT TESTS =====
    
    def test_payment_initialization(self):
        """Test payment initialization (Paystack placeholder)"""
        data = {
            "amount": 2999.99,
            "email": "sarah.connor@safeguard.com"
        }
        
        try:
            response = self.make_request('POST', '/payment/init', data, auth_required=True)
            
            if response.status_code == 200:
                response_data = response.json()
                required_fields = ['authorization_url', 'reference']
                if all(field in response_data for field in required_fields):
                    self.payment_reference = response_data['reference']
                    self.log_test("Payment Initialization", True, f"Payment initialized: {self.payment_reference}")
                    return True
                else:
                    missing_fields = [f for f in required_fields if f not in response_data]
                    self.log_test("Payment Initialization", False, f"Missing fields: {missing_fields}", response_data)
            else:
                self.log_test("Payment Initialization", False, f"HTTP {response.status_code}", response.json())
        except Exception as e:
            self.log_test("Payment Initialization", False, f"Exception: {str(e)}")
        
        return False

    def test_payment_verification(self):
        """Test payment verification and premium upgrade"""
        mock_reference = "ref_test_verification"
        
        try:
            response = self.make_request('GET', f'/payment/verify/{mock_reference}', auth_required=True)
            
            if response.status_code == 200:
                response_data = response.json()
                if response_data.get('status') == 'success':
                    self.log_test("Payment Verification", True, "Payment verified and user upgraded to premium")
                    return True
                else:
                    self.log_test("Payment Verification", False, f"Unexpected status: {response_data.get('status')}", response_data)
            else:
                self.log_test("Payment Verification", False, f"HTTP {response.status_code}", response.json())
        except Exception as e:
            self.log_test("Payment Verification", False, f"Exception: {str(e)}")
        
        return False

    # ===== MAIN TEST RUNNER =====
    
    def run_all_tests(self):
        """Run all backend API tests"""
        print("🔒 SafeGuard Security Mobile App - Backend API Testing")
        print("=" * 60)
        print()
        
        # Authentication Tests
        print("🔐 AUTHENTICATION TESTS")
        print("-" * 30)
        self.test_user_registration()
        self.test_user_login()
        self.test_google_auth()
        self.test_get_user_profile()
        self.test_customize_app()
        self.test_protected_endpoint_without_auth()
        
        # Panic Button Tests
        print("🚨 PANIC BUTTON TESTS")
        print("-" * 30)
        self.test_panic_activation()
        self.test_panic_location_logging()
        self.test_panic_deactivation()
        
        # Escort Tests
        print("🛡️ SECURITY ESCORT TESTS")
        print("-" * 30)
        self.test_escort_non_premium_user()
        self.test_upgrade_to_premium()
        self.test_escort_start_session()
        self.test_escort_location_logging()
        self.test_escort_stop_session()
        
        # Report Tests
        print("📹 REPORT TESTS")
        print("-" * 30)
        self.test_create_video_report()
        self.test_create_audio_report()
        self.test_get_user_reports()
        self.test_mark_report_uploaded()
        
        # Payment Tests
        print("💳 PAYMENT TESTS")
        print("-" * 30)
        self.test_payment_initialization()
        self.test_payment_verification()
        
        # Summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result['success'])
        failed = len(self.test_results) - passed
        
        print(f"Total Tests: {len(self.test_results)}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"Success Rate: {(passed/len(self.test_results)*100):.1f}%")
        
        if failed > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  ❌ {result['test']}: {result['details']}")
        
        print("\n" + "=" * 60)


def main():
    """Main function to run the tests"""
    # Get backend URL from environment
    backend_url = "https://guardcam.preview.emergentagent.com"
    
    print(f"Testing backend at: {backend_url}")
    print()
    
    # Create tester instance and run tests
    tester = SafeGuardAPITester(backend_url)
    tester.run_all_tests()


if __name__ == "__main__":
    main()