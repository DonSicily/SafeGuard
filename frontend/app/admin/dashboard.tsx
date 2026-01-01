import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [adminName, setAdminName] = useState('Admin');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const name = await AsyncStorage.getItem('admin_name');
      setAdminName(name || 'Admin');

      const response = await axios.get(`${BACKEND_URL}/api/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error: any) {
      if (error.response?.status === 403 || error.response?.status === 401) {
        Alert.alert('Access Denied', 'Please login as admin');
        router.replace('/admin/login');
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    router.replace('/admin/login');
  };

  const StatCard = ({ title, value, icon, color, onPress }: any) => (
    <TouchableOpacity style={[styles.statCard, { borderLeftColor: color }]} onPress={onPress}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.adminName}>{adminName}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />}
      >
        <Text style={styles.sectionTitle}>Overview</Text>
        
        <View style={styles.statsGrid}>
          <StatCard 
            title="Total Users" 
            value={stats?.total_users || 0} 
            icon="people" 
            color="#3B82F6"
            onPress={() => router.push('/admin/users')}
          />
          <StatCard 
            title="Civil Users" 
            value={stats?.civil_users || 0} 
            icon="person" 
            color="#10B981"
            onPress={() => router.push('/admin/users?role=civil')}
          />
          <StatCard 
            title="Security Users" 
            value={stats?.security_users || 0} 
            icon="shield" 
            color="#F59E0B"
            onPress={() => router.push('/admin/users?role=security')}
          />
          <StatCard 
            title="Active Panics" 
            value={stats?.active_panics || 0} 
            icon="alert-circle" 
            color="#EF4444"
            onPress={() => router.push('/admin/panics')}
          />
        </View>

        <Text style={styles.sectionTitle}>Last 24 Hours</Text>
        <View style={styles.recentStats}>
          <View style={styles.recentItem}>
            <Ionicons name="alert" size={20} color="#EF4444" />
            <Text style={styles.recentValue}>{stats?.recent_24h?.panics || 0}</Text>
            <Text style={styles.recentLabel}>Panics</Text>
          </View>
          <View style={styles.recentDivider} />
          <View style={styles.recentItem}>
            <Ionicons name="document-text" size={20} color="#3B82F6" />
            <Text style={styles.recentValue}>{stats?.recent_24h?.reports || 0}</Text>
            <Text style={styles.recentLabel}>Reports</Text>
          </View>
          <View style={styles.recentDivider} />
          <View style={styles.recentItem}>
            <Ionicons name="person-add" size={20} color="#10B981" />
            <Text style={styles.recentValue}>{stats?.recent_24h?.new_users || 0}</Text>
            <Text style={styles.recentLabel}>New Users</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/admin/users')}>
            <Ionicons name="people" size={28} color="#3B82F6" />
            <Text style={styles.actionText}>Manage Users</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/admin/security-map')}>
            <Ionicons name="map" size={28} color="#10B981" />
            <Text style={styles.actionText}>Security Map</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/admin/panics')}>
            <Ionicons name="alert-circle" size={28} color="#EF4444" />
            <Text style={styles.actionText}>View Panics</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/admin/reports')}>
            <Ionicons name="videocam" size={28} color="#F59E0B" />
            <Text style={styles.actionText}>View Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/admin/invite-codes')}>
            <Ionicons name="key" size={28} color="#8B5CF6" />
            <Text style={styles.actionText}>Invite Codes</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  greeting: { fontSize: 14, color: '#64748B' },
  adminName: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  logoutButton: { padding: 8 },
  content: { flex: 1, padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 16, marginTop: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { width: '48%', backgroundColor: '#1E293B', borderRadius: 16, padding: 16, borderLeftWidth: 4 },
  statIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  statTitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  recentStats: { flexDirection: 'row', backgroundColor: '#1E293B', borderRadius: 16, padding: 20, marginBottom: 24, alignItems: 'center' },
  recentItem: { flex: 1, alignItems: 'center' },
  recentValue: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginVertical: 4 },
  recentLabel: { fontSize: 12, color: '#64748B' },
  recentDivider: { width: 1, height: 40, backgroundColor: '#334155' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { width: '31%', backgroundColor: '#1E293B', borderRadius: 16, padding: 16, alignItems: 'center', gap: 8 },
  actionText: { fontSize: 12, color: '#94A3B8', textAlign: 'center' },
});
