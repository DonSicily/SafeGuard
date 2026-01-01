import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { setupPushNotifications } from '../../utils/notifications';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/login`, { email, password });
      
      await AsyncStorage.setItem('auth_token', response.data.token);
      await AsyncStorage.setItem('user_id', response.data.user_id);
      await AsyncStorage.setItem('user_role', response.data.role);
      await AsyncStorage.setItem('is_premium', String(response.data.is_premium));

      // Setup push notifications after successful login
      try {
        const pushSetup = await setupPushNotifications();
        console.log('Push notifications setup:', pushSetup ? 'success' : 'skipped');
      } catch (pushError) {
        console.log('Push notification setup error (non-fatal):', pushError);
      }

      // Route based on role
      if (response.data.role === 'security') {
        router.replace('/security/home');
      } else {
        router.replace('/');
      }
    } catch (error: any) {
      Alert.alert('Login Failed', error.response?.data?.detail || 'Invalid credentials');
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
            <Text style={styles.subtitle}>Welcome Back</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#64748B" />
              <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#64748B" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748B" />
              <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#64748B" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginButtonText}>Login</Text>}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/auth/register')}>
                <Text style={styles.linkText}>Sign Up</Text>
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
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 48 },
  appName: { fontSize: 36, fontWeight: 'bold', color: '#fff', marginTop: 16 },
  subtitle: { fontSize: 16, color: '#94A3B8', marginTop: 8 },
  form: { width: '100%' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, paddingHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  input: { flex: 1, color: '#fff', fontSize: 16, paddingVertical: 16, marginLeft: 12 },
  loginButton: { backgroundColor: '#EF4444', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  loginButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: '#94A3B8', fontSize: 14 },
  linkText: { color: '#3B82F6', fontSize: 14, fontWeight: '600' },
});
