import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('civil');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (role === 'security' && !inviteCode) {
      Alert.alert('Error', 'Security users require an invite code');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/register`, {
        email,
        phone: phone || null,
        password,
        confirm_password: confirmPassword,
        role,
        invite_code: inviteCode || null
      });

      await AsyncStorage.setItem('auth_token', response.data.token);
      await AsyncStorage.setItem('user_id', response.data.user_id);
      await AsyncStorage.setItem('user_role', response.data.role);
      await AsyncStorage.setItem('is_premium', String(response.data.is_premium));

      Alert.alert('Success!', 'Registration successful', [
        { text: 'OK', onPress: () => {
          if (response.data.role === 'security') {
            router.replace('/security/home');
          } else {
            router.replace('/');
          }
        }}
      ]);
    } catch (error: any) {
      Alert.alert('Registration Failed', error.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Ionicons name="shield-checkmark" size={80} color="#EF4444" />
            <Text style={styles.appName}>SafeGuard</Text>
            <Text style={styles.subtitle}>Create Your Account</Text>
          </View>

          <View style={styles.form}>
            {/* Role Selection */}
            <Text style={styles.label}>I am a:</Text>
            <View style={styles.roleContainer}>
              <TouchableOpacity
                style={[styles.roleButton, role === 'civil' && styles.roleButtonActive]}
                onPress={() => setRole('civil')}
              >
                <Ionicons name="person" size={24} color={role === 'civil' ? '#fff' : '#64748B'} />
                <Text style={[styles.roleText, role === 'civil' && styles.roleTextActive]}>Civil User</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.roleButton, role === 'security' && styles.roleButtonActive]}
                onPress={() => setRole('security')}
              >
                <Ionicons name="shield" size={24} color={role === 'security' ? '#fff' : '#64748B'} />
                <Text style={[styles.roleText, role === 'security' && styles.roleTextActive]}>Security Agency</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#64748B" />
              <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#64748B" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#64748B" />
              <TextInput style={styles.input} placeholder="Phone (optional)" placeholderTextColor="#64748B" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748B" />
              <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#64748B" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748B" />
              <TextInput style={styles.input} placeholder="Confirm Password" placeholderTextColor="#64748B" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} />
            </View>

            {role === 'security' && (
              <View style={styles.inputContainer}>
                <Ionicons name="key-outline" size={20} color="#64748B" />
                <TextInput style={styles.input} placeholder="Security Invite Code" placeholderTextColor="#64748B" value={inviteCode} onChangeText={setInviteCode} autoCapitalize="characters" />
              </View>
            )}

            <TouchableOpacity style={styles.registerButton} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerButtonText}>Create Account</Text>}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.linkText}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 20 },
  header: { alignItems: 'center', marginBottom: 32 },
  appName: { fontSize: 36, fontWeight: 'bold', color: '#fff', marginTop: 16 },
  subtitle: { fontSize: 16, color: '#94A3B8', marginTop: 8 },
  form: { width: '100%' },
  label: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 12 },
  roleContainer: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  roleButton: { flex: 1, backgroundColor: '#1E293B', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 2, borderColor: '#334155' },
  roleButtonActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  roleText: { fontSize: 14, color: '#64748B', marginTop: 8, fontWeight: '600' },
  roleTextActive: { color: '#fff' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, paddingHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  input: { flex: 1, color: '#fff', fontSize: 16, paddingVertical: 16, marginLeft: 12 },
  registerButton: { backgroundColor: '#EF4444', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  registerButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: '#94A3B8', fontSize: 14 },
  linkText: { color: '#3B82F6', fontSize: 14, fontWeight: '600' },
});
