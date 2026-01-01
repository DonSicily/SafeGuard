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
        self.auth_token = None
        self.user_id = None
        self.test_results = []
        
    def log_test(self, test_name, success, details="", response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if response_data and not success:
            print(f"   Response: {response_data}")
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details,
            'response_data': response_data
        })
        
    def make_request(self, method, endpoint, data=None, token=None, expect_status=200):
        """Make HTTP request with proper headers"""
        url = f"{API_BASE}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        elif self.auth_token:
            headers['Authorization'] = f'Bearer {self.auth_token}'
            
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}
                
            return {
                'status_code': response.status_code,
                'data': response_data,
                'success': response.status_code == expect_status
            }
        except Exception as e:
            print(f"Request failed: {e}")
            return {
                'status_code': 0,
                'data': {'error': str(e)},
                'success': False
            }

    def register_test_user(self):
        """Register a test user for authentication"""
        print("\n=== REGISTERING TEST USER ===")
        test_email = f"pushtest_{datetime.now().strftime('%Y%m%d_%H%M%S')}@gmail.com"
        
        user_data = {
            "email": test_email,
            "password": "TestPass123!",
            "confirm_password": "TestPass123!",
            "phone": "+2348123456789",
            "role": "civil"
        }
        
        response = self.make_request("POST", "/auth/register", user_data)
        
        if response["success"]:
            data = response["data"]
            self.auth_token = data.get("token")
            self.user_id = data.get("user_id")
            self.log_test(
                "User Registration", 
                True, 
                f"Registered user: {test_email}",
                {"user_id": self.user_id, "email": test_email}
            )
            return True
        else:
            self.log_test(
                "User Registration", 
                False, 
                f"Failed to register user: {response['data']}",
                response['data']
            )
            return False

    def test_push_token_registration(self):
        """Test push token registration endpoint"""
        print("\n=== TESTING PUSH TOKEN REGISTRATION ===")
        
        # Test 1: Valid Expo push token
        print("\n1. Testing valid Expo push token...")
        valid_token = "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
        response = self.make_request("POST", "/push-token/register", valid_token)
        
        if response["success"]:
            self.log_test(
                "Push Token Registration - Valid Token",
                True,
                "Successfully registered valid Expo push token",
                response["data"]
            )
        else:
            self.log_test(
                "Push Token Registration - Valid Token",
                False,
                f"Failed to register valid token: {response['data']}",
                response['data']
            )
        
        # Test 2: Invalid token format (missing ExponentPushToken prefix)
        print("\n2. Testing invalid token format (no prefix)...")
        invalid_token = "InvalidTokenFormat123"
        response = self.make_request("POST", "/push-token/register", invalid_token, expect_status=400)
        
        if response["success"]:
            self.log_test(
                "Push Token Validation - Invalid Format",
                True,
                "Correctly rejected invalid token format",
                response["data"]
            )
        else:
            self.log_test(
                "Push Token Validation - Invalid Format",
                False,
                f"Should have rejected invalid token but got: {response['status_code']} - {response['data']}",
                response['data']
            )
        
        # Test 3: Invalid token format (missing brackets)
        print("\n3. Testing invalid token format (no brackets)...")
        invalid_token2 = "ExponentPushTokenWithoutBrackets"
        response = self.make_request("POST", "/push-token/register", invalid_token2, expect_status=400)
        
        if response["success"]:
            self.log_test(
                "Push Token Validation - Missing Brackets",
                True,
                "Correctly rejected token without proper brackets",
                response["data"]
            )
        else:
            self.log_test(
                "Push Token Validation - Missing Brackets",
                False,
                f"Should have rejected token without brackets but got: {response['status_code']} - {response['data']}",
                response['data']
            )
        
        # Test 4: Authentication requirement (test without token)
        print("\n4. Testing authentication requirement...")
        temp_token = self.auth_token
        self.auth_token = None
        
        response = self.make_request("POST", "/push-token/register", valid_token, expect_status=401)
        
        if response["success"]:
            self.log_test(
                "Push Token Authentication Requirement",
                True,
                "Correctly requires authentication",
                response["data"]
            )
        else:
            self.log_test(
                "Push Token Authentication Requirement",
                False,
                f"Should require authentication but got: {response['status_code']} - {response['data']}",
                response['data']
            )
        
        # Restore auth token
        self.auth_token = temp_token

    def test_panic_activation_with_categories(self):
        """Test panic activation with emergency categories"""
        print("\n=== TESTING PANIC ACTIVATION WITH EMERGENCY CATEGORIES ===")
        
        # Test categories as specified in the review request
        test_categories = [
            "violence",
            "robbery", 
            "kidnapping",
            "medical",
            "fire",
            "other"
        ]
        
        for i, category in enumerate(test_categories, 1):
            print(f"\n{i}. Testing panic activation with category: {category}")
            
            # Test panic activation with specific category
            panic_data = {
                "latitude": 6.5244,  # Lagos coordinates
                "longitude": 3.3792,
                "accuracy": 10.0,
                "emergency_category": category
            }
            
            response = self.make_request("POST", "/panic/activate", panic_data)
            
            if response["success"]:
                panic_id = response["data"].get("panic_id")
                self.log_test(
                    f"Panic Activation - Category: {category}",
                    True,
                    f"Successfully activated panic with category '{category}', panic_id: {panic_id}",
                    {"panic_id": panic_id, "category": category}
                )
                
                # Deactivate panic to clean up
                deactivate_response = self.make_request("POST", "/panic/deactivate")
                if deactivate_response["success"]:
                    print(f"   ✓ Panic deactivated successfully")
                else:
                    print(f"   ⚠ Warning: Failed to deactivate panic: {deactivate_response['data']}")
                
            else:
                self.log_test(
                    f"Panic Activation - Category: {category}",
                    False,
                    f"Failed to activate panic with category '{category}': {response['data']}",
                    response['data']
                )
        
        # Test panic activation without category (should default to 'other')
        print(f"\n{len(test_categories)+1}. Testing panic activation without category (should default)...")
        panic_data_no_category = {
            "latitude": 6.5244,
            "longitude": 3.3792,
            "accuracy": 10.0
        }
        
        response = self.make_request("POST", "/panic/activate", panic_data_no_category)
        
        if response["success"]:
            panic_id = response["data"].get("panic_id")
            self.log_test(
                "Panic Activation - No Category (Default)",
                True,
                f"Successfully activated panic without category (should default to 'other'), panic_id: {panic_id}",
                {"panic_id": panic_id}
            )
            
            # Deactivate panic
            deactivate_response = self.make_request("POST", "/panic/deactivate")
            if deactivate_response["success"]:
                print(f"   ✓ Panic deactivated successfully")
            
        else:
            self.log_test(
                "Panic Activation - No Category (Default)",
                False,
                f"Failed to activate panic without category: {response['data']}",
                response['data']
            )

    def test_panic_authentication_requirement(self):
        """Test that panic activation requires authentication"""
        print("\n=== TESTING PANIC AUTHENTICATION REQUIREMENT ===")
        
        # Test without authentication
        temp_token = self.auth_token
        self.auth_token = None
        
        panic_data = {
            "latitude": 6.5244,
            "longitude": 3.3792,
            "accuracy": 10.0,
            "emergency_category": "violence"
        }
        
        response = self.make_request("POST", "/panic/activate", panic_data, expect_status=401)
        
        if response["success"]:
            self.log_test(
                "Panic Authentication Requirement",
                True,
                "Correctly requires authentication for panic activation",
                response["data"]
            )
        else:
            self.log_test(
                "Panic Authentication Requirement",
                False,
                f"Should require authentication but got: {response['status_code']} - {response['data']}",
                response['data']
            )
        
        # Restore auth token
        self.auth_token = temp_token

    def run_focused_tests(self):
        """Run the specific tests requested in the review"""
        print("🚀 Starting SafeGuard Backend API Tests - Push Token & Panic Category Focus")
        print(f"Backend URL: {API_BASE}")
        print(f"Timestamp: {datetime.now().isoformat()}")
        
        # Register test user first
        if not self.register_test_user():
            print("❌ Failed to register test user. Cannot proceed with authenticated tests.")
            return
        
        # Run specific tests as requested
        self.test_push_token_registration()
        self.test_panic_activation_with_categories()
        self.test_panic_authentication_requirement()
        
        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")
        
        print("\n✅ PASSED TESTS:")
        for result in self.test_results:
            if result["success"]:
                print(f"  - {result['test']}: {result['details']}")
        
        print("="*80)

def main():
    """Main test runner"""
    tester = SafeGuardAPITester()
    tester.run_focused_tests()

if __name__ == "__main__":
    main()