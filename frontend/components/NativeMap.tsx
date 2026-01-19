import React from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Only import maps on native platforms
let MapView: any = null;
let Marker: any = null;
let Circle: any = null;

// Use dynamic require only on native
if (Platform.OS !== 'web') {
  try {
    const RNMaps = require('react-native-maps');
    MapView = RNMaps.default;
    Marker = RNMaps.Marker;
    Circle = RNMaps.Circle;
  } catch (e) {
    console.log('react-native-maps not available');
  }
}

interface NativeMapProps {
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  markerCoords: {
    latitude: number;
    longitude: number;
  };
  radiusKm: number;
  onPress: (coords: { latitude: number; longitude: number }) => void;
  onMarkerChange: (coords: { latitude: number; longitude: number }) => void;
}

export function NativeMap({ region, markerCoords, radiusKm, onPress, onMarkerChange }: NativeMapProps) {
  // Web fallback
  if (Platform.OS === 'web' || !MapView) {
    return (
      <View style={styles.webMapPlaceholder}>
        <Ionicons name="map" size={80} color="#64748B" />
        <Text style={styles.webMapText}>Interactive map available on mobile devices</Text>
        <View style={styles.coordinatesBox}>
          <Text style={styles.coordinatesLabel}>Current Location:</Text>
          <TextInput
            style={styles.coordinateInput}
            placeholder="Latitude"
            placeholderTextColor="#64748B"
            value={String(markerCoords.latitude.toFixed(6))}
            onChangeText={(val) => onMarkerChange({ ...markerCoords, latitude: parseFloat(val) || 0 })}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.coordinateInput}
            placeholder="Longitude"
            placeholderTextColor="#64748B"
            value={String(markerCoords.longitude.toFixed(6))}
            onChangeText={(val) => onMarkerChange({ ...markerCoords, longitude: parseFloat(val) || 0 })}
            keyboardType="numeric"
          />
        </View>
      </View>
    );
  }

  // Native map
  return (
    <MapView
      style={styles.map}
      region={region}
      onPress={(e: any) => onPress(e.nativeEvent.coordinate)}
    >
      <Marker coordinate={markerCoords} title="Team Location" />
      <Circle
        center={markerCoords}
        radius={radiusKm * 1000}
        strokeColor="rgba(59, 130, 246, 0.5)"
        fillColor="rgba(59, 130, 246, 0.1)"
      />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { 
    flex: 1 
  },
  webMapPlaceholder: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 40, 
    backgroundColor: '#1E293B' 
  },
  webMapText: { 
    fontSize: 16, 
    color: '#94A3B8', 
    marginTop: 16, 
    textAlign: 'center' 
  },
  coordinatesBox: { 
    marginTop: 32, 
    width: '100%', 
    gap: 12 
  },
  coordinatesLabel: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#fff', 
    textAlign: 'center', 
    marginBottom: 8 
  },
  coordinateInput: { 
    backgroundColor: '#0F172A', 
    borderRadius: 8, 
    padding: 12, 
    color: '#fff', 
    fontSize: 16, 
    borderWidth: 1, 
    borderColor: '#334155', 
    textAlign: 'center' 
  },
});
