import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Index() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showPanicPrompt, setShowPanicPrompt] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        // Not logged in, redirect to auth
        router.replace('/auth/login');
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setLoading(false);
    }
  };

  const handlePanicButton = () => {
    Alert.alert(
      '🚨 PANIC MODE',
      'Activating panic mode will:\n\n• Enable GPS tracking\n• Put phone to sleep\n• Hide app when unlocked\n• Send location to authorities\n\nAre you in danger?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setShowPanicPrompt(false)
        },
        {
          text: 'ACTIVATE',
          style: 'destructive',
          onPress: () => {
            // Navigate to panic mode
            router.push('/panic/active');
          }
        }
      ]
    );
  };

  const handleDecline = () => {
    setShowPanicPrompt(false);
    // Navigate to main app
    router.replace('/home');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#EF4444" />
      </SafeAreaView>
    );
  }

  if (showPanicPrompt) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="shield-checkmark" size={60} color="#EF4444" />
          <Text style={styles.appName}>SafeGuard</Text>
          <Text style={styles.tagline}>Your Safety, Our Priority</Text>
        </View>

        <View style={styles.panicSection}>
          <Text style={styles.emergencyText}>Emergency Situation?</Text>
          
          <TouchableOpacity
            style={styles.panicButton}
            onPress={handlePanicButton}
            activeOpacity={0.8}
          >
            <Ionicons name="alert-circle" size={80} color="#fff" />
            <Text style={styles.panicButtonText}>PANIC</Text>
            <Text style={styles.panicSubtext}>Tap for Emergency</Text>
          </TouchableOpacity>

          <Text style={styles.orText}>or</Text>

          <TouchableOpacity
            style={styles.declineButton}
            onPress={handleDecline}
          >
            <Text style={styles.declineText}>I'm Safe - Enter App</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            In panic mode, your location will be tracked and sent to authorities
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  tagline: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 8,
  },
  panicSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emergencyText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 40,
  },
  panicButton: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  panicButtonText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  panicSubtext: {
    fontSize: 14,
    color: '#FEE2E2',
    marginTop: 4,
  },
  orText: {
    fontSize: 18,
    color: '#64748B',
    marginVertical: 32,
  },
  declineButton: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  declineText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3B82F6',
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
