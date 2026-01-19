import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import EmergencyCategoryModal from '../../components/EmergencyCategoryModal';

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || 'https://guardwatch-14.preview.emergentagent.com';
const LOCATION_TASK = 'background-location-panic';

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }
  if (data) {
    const { locations } = data as any;
    const location = locations[0];
    try {
      const token = await AsyncStorage.getItem('auth_token');
      await axios.post(`${BACKEND_URL}/api/panic/location`, {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: new Date().toISOString()
      }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) {
      console.error('Failed to send panic location:', err);
    }
  }
});

export default function PanicActive() {
  const router = useRouter();
  const [isTracking, setIsTracking] = useState(false);
  const [panicId, setPanicId] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(true); // Show modal first
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isTracking]);

  const handleAppStateChange = (nextAppState: string) => {
    if (nextAppState === 'active' && isTracking) {
      Alert.alert('Panic Mode Active', 'Your location is being tracked discreetly.', [
        { text: 'Continue', onPress: () => {} },
        { text: 'Stop Panic', style: 'destructive', onPress: deactivatePanicMode }
      ]);
    }
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setShowCategoryModal(false);
    activatePanicMode(category);
  };

  const handleCategoryCancel = () => {
    setShowCategoryModal(false);
    router.back();
  };

  const activatePanicMode = async (category?: string) => {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission required');
        router.back();
        return;
      }

      await Location.requestBackgroundPermissionsAsync();

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.post(`${BACKEND_URL}/api/panic/activate`, {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: new Date().toISOString(),
        emergency_category: category || selectedCategory || 'other'
      }, { headers: { Authorization: `Bearer ${token}` } });

      setPanicId(response.data.panic_id);
      setIsTracking(true);

      startLocationTracking(token!);

      Alert.alert('Panic Mode Activated', 'Nearby security agencies have been alerted. Stay safe.');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to activate panic mode');
      console.error(error);
      router.back();
    }
  };

  const startLocationTracking = async (token: string) => {
    intervalRef.current = setInterval(async () => {
      try {
        const location = await Location.getCurrentPositionAsync({ 
          accuracy: Location.Accuracy.High,
          timeInterval: 5000
        });
        await axios.post(`${BACKEND_URL}/api/panic/location`, {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          timestamp: new Date().toISOString()
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.log('Panic location updated:', location.coords.latitude, location.coords.longitude);
      } catch (error) {
        console.error('Location tracking error:', error);
      }
    }, 30000);

    // Note: Background location tracking (startLocationUpdatesAsync) only works in APK/development builds
    // For Expo Go, we use interval-based tracking above
    try {
      if (Location.startLocationUpdatesAsync) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK, {
          accuracy: Location.Accuracy.High,
          timeInterval: 30000,
          distanceInterval: 0,
          foregroundService: { 
            notificationTitle: 'SafeGuard Active', 
            notificationBody: 'Location tracking for your safety' 
          },
        });
        console.log('Background location tracking started');
      }
    } catch (bgError) {
      console.log('Background tracking not available (Expo Go limitation):', bgError);
    }
  };

  const deactivatePanicMode = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (intervalRef.current) clearInterval(intervalRef.current);
      
      // Stop background tracking if it was started
      try {
        if (Location.stopLocationUpdatesAsync) {
          await Location.stopLocationUpdatesAsync(LOCATION_TASK);
        }
      } catch (bgError) {
        console.log('Background tracking stop error (expected in Expo Go):', bgError);
      }
      await axios.post(`${BACKEND_URL}/api/panic/deactivate`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setIsTracking(false);
      Alert.alert('Success', 'Panic mode deactivated', [{ text: 'OK', onPress: () => router.replace('/civil/home') }]);
    } catch (error) {
      Alert.alert('Error', 'Failed to deactivate');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Emergency Category Selection Modal */}
      <EmergencyCategoryModal
        visible={showCategoryModal}
        onSelect={handleCategorySelect}
        onCancel={handleCategoryCancel}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="alert-circle" size={100} color="#EF4444" />
          <Text style={styles.title}>PANIC MODE ACTIVE</Text>
          <Text style={styles.subtitle}>Location being tracked discreetly</Text>
        </View>

        <View style={styles.infoBox}>
          <View style={styles.infoItem}>
            <Ionicons name="location" size={24} color="#10B981" />
            <Text style={styles.infoText}>GPS Tracking: Active</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="time" size={24} color="#10B981" />
            <Text style={styles.infoText}>Update: Every 30 seconds</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="shield-checkmark" size={24} color="#10B981" />
            <Text style={styles.infoText}>Nearby agencies alerted</Text>
          </View>
        </View>

        <View style={styles.warningBox}>
          <Ionicons name="warning" size={24} color="#F59E0B" />
          <Text style={styles.warningText}>Tracking continues in background. App will remain discreet.</Text>
        </View>

        <TouchableOpacity style={styles.deactivateButton} onPress={() => {
          Alert.alert('Deactivate?', 'Are you safe now?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Yes, I\'m Safe', onPress: deactivatePanicMode }
          ]);
        }}>
          <Text style={styles.deactivateText}>I'm Safe - Stop Tracking</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { flex: 1, padding: 24, justifyContent: 'space-between' },
  header: { alignItems: 'center', marginTop: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#EF4444', marginTop: 24, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#94A3B8', marginTop: 8, textAlign: 'center' },
  infoBox: { backgroundColor: '#1E293B', borderRadius: 16, padding: 24, gap: 20 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  infoText: { fontSize: 16, color: '#fff', flex: 1 },
  warningBox: { flexDirection: 'row', backgroundColor: '#1E293B', borderRadius: 12, padding: 16, gap: 12, borderWidth: 1, borderColor: '#F59E0B' },
  warningText: { flex: 1, fontSize: 14, color: '#F59E0B', lineHeight: 20 },
  deactivateButton: { backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginBottom: 20 },
  deactivateText: { fontSize: 18, fontWeight: '600', color: '#fff' },
});
