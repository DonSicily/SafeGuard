import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || 'https://guardwatch-14.preview.emergentagent.com';

export default function Escort() {
  const router = useRouter();
  const [isTracking, setIsTracking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingPremium, setCheckingPremium] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    checkPremiumStatus();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const getToken = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) return token;
    } catch (e) {}
    return await AsyncStorage.getItem('auth_token');
  };

  const checkPremiumStatus = async () => {
    setCheckingPremium(true);
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert('Error', 'Please login again');
        router.replace('/auth/login');
        return;
      }

      const response = await axios.get(`${BACKEND_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });

      const premium = response.data?.is_premium === true;
      setIsPremium(premium);
      
      if (!premium) {
        Alert.alert(
          'Premium Feature',
          'Security Escort is a premium feature. Would you like to upgrade?',
          [
            { text: 'Go Back', onPress: () => router.back() },
            { text: 'Upgrade', onPress: () => router.replace('/premium') }
          ]
        );
      }
    } catch (error: any) {
      console.error('Error checking premium:', error);
      // Fallback to local storage
      const storedPremium = await AsyncStorage.getItem('is_premium');
      const premium = storedPremium === 'true' || storedPremium === 'True';
      setIsPremium(premium);
      
      if (!premium) {
        Alert.alert('Premium Required', 'This feature requires premium subscription.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } finally {
      setCheckingPremium(false);
    }
  };

  const startEscort = async () => {
    if (!isPremium) {
      Alert.alert('Premium Required', 'Please upgrade to use Security Escort.');
      return;
    }

    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission required');
        setLoading(false);
        return;
      }

      await Location.requestBackgroundPermissionsAsync();

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const token = await getToken();
      const response = await axios.post(`${BACKEND_URL}/api/escort/action`, {
        action: 'start',
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          timestamp: new Date().toISOString()
        }
      }, { 
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000 
      });

      setSessionId(response.data.session_id);
      setIsTracking(true);
      startLocationTracking(token!);
      Alert.alert('Success', 'Escort tracking started');
    } catch (error: any) {
      console.error('Start escort error:', error);
      let errorMessage = 'Failed to start escort';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection.';
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const startLocationTracking = async (token: string) => {
    intervalRef.current = setInterval(async () => {
      try {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        await axios.post(`${BACKEND_URL}/api/escort/location`, {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          timestamp: new Date().toISOString()
        }, { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000 
        });
        console.log('Location tracked');
      } catch (error) {
        console.error('Location tracking error:', error);
      }
    }, 30000);
  };

  const stopEscort = async () => {
    Alert.alert('Arrived Safely?', 'Stopping will delete all tracking data.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes, I Arrived', onPress: async () => {
        setLoading(true);
        try {
          if (intervalRef.current) clearInterval(intervalRef.current);
          const token = await getToken();
          await axios.post(`${BACKEND_URL}/api/escort/action`, {
            action: 'stop',
            location: { latitude: 0, longitude: 0, timestamp: new Date().toISOString() }
          }, { 
            headers: { Authorization: `Bearer ${token}` },
            timeout: 15000 
          });

          setIsTracking(false);
          setSessionId(null);
          Alert.alert('Success', 'Arrived safely! Data deleted.', [{ text: 'OK', onPress: () => router.back() }]);
        } catch (error) {
          Alert.alert('Error', 'Failed to stop escort');
        } finally {
          setLoading(false);
        }
      }}
    ]);
  };

  // Show loading while checking premium
  if (checkingPremium) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Checking access...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security Escort</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="navigate" size={100} color={isTracking ? '#10B981' : '#3B82F6'} />
        </View>

        <Text style={styles.title}>{isTracking ? 'Escort Active' : 'Start Security Escort'}</Text>
        <Text style={styles.description}>
          {isTracking
            ? 'Your journey is being tracked. Click ARRIVED when you reach safely.'
            : 'Track your journey. Data will be auto-deleted when you arrive.'}
        </Text>

        {isTracking && (
          <View style={styles.statusBox}>
            <View style={styles.statusItem}>
              <Ionicons name="location" size={24} color="#10B981" />
              <Text style={styles.statusText}>GPS Tracking Active</Text>
            </View>
            <View style={styles.statusItem}>
              <Ionicons name="time" size={24} color="#10B981" />
              <Text style={styles.statusText}>Every 30 seconds</Text>
            </View>
            <View style={styles.statusItem}>
              <Ionicons name="shield-checkmark" size={24} color="#10B981" />
              <Text style={styles.statusText}>Data Protected</Text>
            </View>
          </View>
        )}

        <View style={styles.buttonContainer}>
          {!isTracking ? (
            <TouchableOpacity style={styles.startButton} onPress={startEscort} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="play" size={24} color="#fff" />
                  <Text style={styles.buttonText}>Start Escort</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.arrivedButton} onPress={stopEscort} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  <Text style={styles.buttonText}>ARRIVED</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#64748B" />
          <Text style={styles.infoText}>Premium Feature: Continuous GPS tracking until you arrive safely.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#fff' },
  placeholder: { width: 32 },
  content: { flex: 1, padding: 24, justifyContent: 'space-between' },
  iconContainer: { alignItems: 'center', marginTop: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginTop: 24 },
  description: { fontSize: 16, color: '#94A3B8', textAlign: 'center', lineHeight: 24, marginTop: 16 },
  statusBox: { backgroundColor: '#1E293B', borderRadius: 16, padding: 24, gap: 20, marginTop: 32 },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  statusText: { fontSize: 16, color: '#fff' },
  buttonContainer: { marginTop: 32 },
  startButton: { flexDirection: 'row', backgroundColor: '#3B82F6', borderRadius: 12, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', gap: 12 },
  arrivedButton: { flexDirection: 'row', backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', gap: 12 },
  buttonText: { fontSize: 18, fontWeight: '600', color: '#fff' },
  infoBox: { flexDirection: 'row', backgroundColor: '#1E293B', borderRadius: 12, padding: 16, gap: 12, marginTop: 24 },
  infoText: { flex: 1, fontSize: 14, color: '#64748B', lineHeight: 20 },
});
