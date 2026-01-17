import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Slider from '@react-native-community/slider';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Conditionally import MapView only for native
let MapView: any, Marker: any, Circle: any;
if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
    Circle = Maps.Circle;
  } catch (e) {
    console.log('Maps not available');
  }
}

export default function SetLocation() {
  const router = useRouter();
  const [region, setRegion] = useState({
    latitude: 9.0820,
    longitude: 8.6753,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  });
  const [markerCoords, setMarkerCoords] = useState({ latitude: 9.0820, longitude: 8.6753 });
  const [radiusKm, setRadiusKm] = useState(10);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCurrentLocation();
    loadSavedLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setRegion({ ...coords, latitudeDelta: 0.5, longitudeDelta: 0.5 });
        setMarkerCoords(coords);
      }
    } catch (error) {
      console.error('Failed to get location:', error);
    }
  };

  const loadSavedLocation = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${BACKEND_URL}/api/security/team-location`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.latitude !== 0 && response.data.longitude !== 0) {
        const coords = { latitude: response.data.latitude, longitude: response.data.longitude };
        setMarkerCoords(coords);
        setRegion({ ...coords, latitudeDelta: 0.5, longitudeDelta: 0.5 });
        setRadiusKm(response.data.radius_km);
      }
    } catch (error) {
      console.error('Failed to load saved location:', error);
    }
  };

  const saveTeamLocation = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      await axios.post(`${BACKEND_URL}/api/security/set-location`, {
        latitude: markerCoords.latitude,
        longitude: markerCoords.longitude,
        radius_km: radiusKm
      }, { headers: { Authorization: `Bearer ${token}` } });

      Alert.alert('Success', 'Team location updated', [{ text: 'OK', onPress: () => router.replace('/security/home') }]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save location');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/security/home")} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Set Team Location</Text>
        <View style={styles.placeholder} />
      </View>

      {Platform.OS !== 'web' && MapView ? (
        <MapView
          style={styles.map}
          region={region}
          onPress={(e) => setMarkerCoords(e.nativeEvent.coordinate)}
        >
          <Marker coordinate={markerCoords} title="Team Location" />
          <Circle
            center={markerCoords}
            radius={radiusKm * 1000}
            strokeColor="rgba(59, 130, 246, 0.5)"
            fillColor="rgba(59, 130, 246, 0.1)"
          />
        </MapView>
      ) : (
        <View style={styles.webMapPlaceholder}>
          <Ionicons name="map" size={80} color="#64748B" />
          <Text style={styles.webMapText}>Interactive map available on mobile devices</Text>
          <View style={styles.coordinatesBox}>
            <Text style={styles.coordinatesLabel}>Current Location:</Text>
            <TextInput
              style={styles.coordinateInput}
              placeholder="Latitude"
              placeholderTextColor="#64748B"
              value={String(markerCoords.latitude)}
              onChangeText={(val) => setMarkerCoords({...markerCoords, latitude: parseFloat(val) || 0})}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.coordinateInput}
              placeholder="Longitude"
              placeholderTextColor="#64748B"
              value={String(markerCoords.longitude)}
              onChangeText={(val) => setMarkerCoords({...markerCoords, longitude: parseFloat(val) || 0})}
              keyboardType="numeric"
            />
          </View>
        </View>
      )}

      <View style={styles.controls}>
        <View style={styles.radiusControl}>
          <Text style={styles.radiusLabel}>Search Radius: {radiusKm}km</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={50}
            step={1}
            value={radiusKm}
            onValueChange={setRadiusKm}
            minimumTrackTintColor="#3B82F6"
            maximumTrackTintColor="#334155"
            thumbTintColor="#3B82F6"
          />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={saveTeamLocation} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Location</Text>}
        </TouchableOpacity>

        <Text style={styles.helpText}>Tap on map to set location. Adjust radius to set coverage area.</Text>
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
  map: { flex: 1 },
  webMapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, backgroundColor: '#1E293B' },
  webMapText: { fontSize: 16, color: '#94A3B8', marginTop: 16, textAlign: 'center' },
  coordinatesBox: { marginTop: 32, width: '100%', gap: 12 },
  coordinatesLabel: { fontSize: 16, fontWeight: '600', color: '#fff', textAlign: 'center', marginBottom: 8 },
  coordinateInput: { backgroundColor: '#0F172A', borderRadius: 8, padding: 12, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#334155', textAlign: 'center' },
  controls: { backgroundColor: '#1E293B', padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  radiusControl: { marginBottom: 20 },
  radiusLabel: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 12 },
  slider: { width: '100%', height: 40 },
  saveButton: { backgroundColor: '#3B82F6', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  saveButtonText: { fontSize: 18, fontWeight: '600', color: '#fff' },
  helpText: { fontSize: 12, color: '#94A3B8', textAlign: 'center', lineHeight: 18 },
});
