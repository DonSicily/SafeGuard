import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function SecurityPanics() {
  const router = useRouter();
  const [panics, setPanics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPanics();
    const interval = setInterval(loadPanics, 15000); // More frequent updates for panics
    return () => clearInterval(interval);
  }, []);

  const loadPanics = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${BACKEND_URL}/api/security/nearby-panics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPanics(response.data);
    } catch (error) {
      console.error('Failed to load panics:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderPanic = ({ item }: any) => (
    <View style={styles.panicCard}>
      <View style={styles.panicHeader}>
        <View style={styles.panicIcon}>
          <Ionicons name="alert-circle" size={36} color="#EF4444" />
        </View>
        <View style={styles.panicInfo}>
          <Text style={styles.panicTitle}>🚨 ACTIVE PANIC</Text>
          <Text style={styles.panicEmail}>{item.user_email}</Text>
          {item.user_phone && (
            <Text style={styles.panicPhone}>📞 {item.user_phone}</Text>
          )}
        </View>
      </View>

      <View style={styles.panicDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="time" size={16} color="#94A3B8" />
          <Text style={styles.detailText}>
            Activated: {new Date(item.activated_at).toLocaleTimeString()}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location" size={16} color="#94A3B8" />
          <Text style={styles.detailText}>
            {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="pulse" size={16} color="#10B981" />
          <Text style={styles.detailText}>
            {item.location_count} location updates
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.actionButton}>
        <Ionicons name="map" size={20} color="#fff" />
        <Text style={styles.actionButtonText}>View on Map</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/security/home")} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Active Panics</Text>
        <TouchableOpacity onPress={loadPanics}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EF4444" />
        </View>
      ) : (
        <FlatList
          data={panics}
          renderItem={renderPanic}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="shield-checkmark" size={80} color="#64748B" />
              <Text style={styles.emptyText}>No active panics</Text>
              <Text style={styles.emptySubtext}>All clear in your area</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 20 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#fff', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#64748B', marginTop: 8 },
  panicCard: { backgroundColor: '#1E293B', borderRadius: 16, padding: 20, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#EF4444' },
  panicHeader: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  panicIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(239, 68, 68, 0.1)', justifyContent: 'center', alignItems: 'center' },
  panicInfo: { flex: 1 },
  panicTitle: { fontSize: 16, fontWeight: 'bold', color: '#EF4444', marginBottom: 8 },
  panicEmail: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 4 },
  panicPhone: { fontSize: 14, color: '#94A3B8' },
  panicDetails: { gap: 12, marginBottom: 16 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 14, color: '#94A3B8' },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#EF4444', borderRadius: 8, paddingVertical: 14 },
  actionButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
