#!/usr/bin/env python3
"""
SafeGuard Backend API Testing - Admin and Enhanced Security Features
Testing the new Admin and enhanced Security features in SafeGuard backend
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

class SafeGuardAdminTester:
    def __init__(self):
        self.admin_token = None
        self.test_results = []
        
    def log_test(self, test_name, success, details="", response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if response_data and not success:
            print(f"   Response: {response_data}")
        print()
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details,
            'response': response_data
        })
    
    def make_request(self, method, endpoint, data=None, token=None, expect_status=200):
        """Make HTTP request with proper headers"""
        url = f"{API_BASE}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
            
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, timeout=15)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=15)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
            
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None
    
    def test_admin_login(self):
        """Test Admin Login with credentials admin1@safeguard.com / Admin123!"""
        print("Testing Admin Login...")
        
        response = self.make_request('POST', '/admin/login', {
            "email": "admin1@safeguard.com",
            "password": "Admin123!"
        })
        
        if not response:
            self.log_test("Admin Login", False, "Request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            if 'token' in data and data.get('role') == 'admin':
                self.admin_token = data['token']
                self.log_test(
                    "Admin Login", 
                    True, 
                    f"Successfully logged in as admin. User ID: {data.get('user_id')}, Email: {data.get('email')}"
                )
                return True
            else:
                self.log_test("Admin Login", False, "Response missing token or incorrect role", data)
                return False
        else:
            self.log_test("Admin Login", False, f"HTTP {response.status_code}", response.text)
            return False
    
    def test_admin_dashboard(self):
        """Test Admin Dashboard (requires admin token)"""
        print("Testing Admin Dashboard...")
        
        if not self.admin_token:
            self.log_test("Admin Dashboard", False, "No admin token available")
            return False
            
        response = self.make_request('GET', '/admin/dashboard', token=self.admin_token)
        
        if not response:
            self.log_test("Admin Dashboard", False, "Request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            required_fields = ['total_users', 'civil_users', 'security_users', 'admin_users', 
                             'active_panics', 'total_panics', 'total_reports', 'recent_24h']
            
            if all(field in data for field in required_fields):
                self.log_test(
                    "Admin Dashboard", 
                    True, 
                    f"Dashboard stats retrieved: {data['total_users']} total users, {data['civil_users']} civil, {data['security_users']} security, {data['admin_users']} admin"
                )
                return True
            else:
                missing = [f for f in required_fields if f not in data]
                self.log_test("Admin Dashboard", False, f"Missing fields: {missing}", data)
                return False
        else:
            self.log_test("Admin Dashboard", False, f"HTTP {response.status_code}", response.text)
            return False
    
    def test_admin_users_list(self):
        """Test Admin Users List"""
        print("Testing Admin Users List...")
        
        if not self.admin_token:
            self.log_test("Admin Users List", False, "No admin token available")
            return False
            
        response = self.make_request('GET', '/admin/users', token=self.admin_token)
        
        if not response:
            self.log_test("Admin Users List", False, "Request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            if 'users' in data and 'total' in data:
                users = data['users']
                self.log_test(
                    "Admin Users List", 
                    True, 
                    f"Retrieved {len(users)} users out of {data['total']} total. Sample user roles: {[u.get('role') for u in users[:3]]}"
                )
                return True
            else:
                self.log_test("Admin Users List", False, "Response missing 'users' or 'total' field", data)
                return False
        else:
            self.log_test("Admin Users List", False, f"HTTP {response.status_code}", response.text)
            return False
    
    def test_admin_invite_codes(self):
        """Test Admin Invite Codes - verify SECURITY2025 exists"""
        print("Testing Admin Invite Codes...")
        
        if not self.admin_token:
            self.log_test("Admin Invite Codes", False, "No admin token available")
            return False
            
        response = self.make_request('GET', '/admin/invite-codes', token=self.admin_token)
        
        if not response:
            self.log_test("Admin Invite Codes", False, "Request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            if 'codes' in data:
                codes = data['codes']
                code_names = [code.get('code') for code in codes]
                
                if 'SECURITY2025' in code_names:
                    security_code = next(c for c in codes if c.get('code') == 'SECURITY2025')
                    self.log_test(
                        "Admin Invite Codes", 
                        True, 
                        f"Found SECURITY2025 code. Used: {security_code.get('used_count')}/{security_code.get('max_uses')}. Total codes: {len(codes)}"
                    )
                    return True
                else:
                    self.log_test("Admin Invite Codes", False, f"SECURITY2025 not found. Available codes: {code_names}")
                    return False
            else:
                self.log_test("Admin Invite Codes", False, "Response missing 'codes' field", data)
                return False
        else:
            self.log_test("Admin Invite Codes", False, f"HTTP {response.status_code}", response.text)
            return False
    
    def test_security_registration_with_new_fields(self):
        """Test Security Registration with new fields"""
        print("Testing Security Registration with New Fields...")
        
        # Generate unique email for this test
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        test_email = f"testsecurity_{timestamp}@test.com"
        
        response = self.make_request('POST', '/auth/register', {
            "email": test_email,
            "password": "Test123!",
            "confirm_password": "Test123!",
            "role": "security",
            "invite_code": "SECURITY2025",
            "full_name": "Test Security User",
            "security_sub_role": "team_member",
            "team_name": "Alpha Team"
        })
        
        if not response:
            self.log_test("Security Registration with New Fields", False, "Request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            if 'token' in data and data.get('role') == 'security':
                self.log_test(
                    "Security Registration with New Fields", 
                    True, 
                    f"Successfully registered security user: {test_email} with team_member role in Alpha Team. User ID: {data.get('user_id')}"
                )
                return True
            else:
                self.log_test("Security Registration with New Fields", False, "Response missing token or incorrect role", data)
                return False
        else:
            self.log_test("Security Registration with New Fields", False, f"HTTP {response.status_code}", response.text)
            return False
    
    def run_all_tests(self):
        """Run all admin and security tests"""
        print("=" * 80)
        print("SAFEGUARD ADMIN & ENHANCED SECURITY FEATURES TESTING")
        print("=" * 80)
        print(f"Backend URL: {API_BASE}")
        print(f"Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # Test sequence
        tests = [
            ("Admin Login", self.test_admin_login),
            ("Admin Dashboard", self.test_admin_dashboard),
            ("Admin Users List", self.test_admin_users_list),
            ("Admin Invite Codes", self.test_admin_invite_codes),
            ("Security Registration with New Fields", self.test_security_registration_with_new_fields)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            try:
                if test_func():
                    passed += 1
            except Exception as e:
                self.log_test(test_name, False, f"Exception: {str(e)}")
        
        print("=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        print(f"Tests Passed: {passed}/{total}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED! Admin and enhanced security features are working correctly.")
        else:
            print("⚠️  Some tests failed. Check the details above.")
        
        print()
        return passed == total

if __name__ == "__main__":
    tester = SafeGuardAdminTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)