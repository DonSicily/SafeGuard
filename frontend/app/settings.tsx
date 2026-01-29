import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || 'https://guardlogin.preview.emergentagent.com';

const ICON_OPTIONS = ['shield', 'shield-checkmark', 'lock-closed', 'lock-open', 'key', 'finger-print', 'eye', 'eye-off', 'pulse', 'heart', 'flash', 'star', 'moon', 'sunny', 'cloudy', 'rainy', 'snow', 'thunderstorm', 'partly-sunny', 'water', 'flame', 'leaf', 'flower', 'paw', 'bug', 'airplane', 'car', 'bicycle', 'boat', 'bus', 'rocket', 'train', 'walk', 'fitness', 'basketball', 'football', 'baseball', 'golf', 'tennisball', 'trophy', 'medal', 'ribbon', 'rose', 'earth', 'globe', 'map', 'location', 'navigate', 'compass', 'pin', 'home', 'business', 'school', 'library', 'briefcase', 'calendar', 'time', 'alarm', 'stopwatch', 'timer', 'notifications', 'chatbubble', 'mail', 'call', 'videocam', 'camera', 'mic', 'musical-notes', 'volume-high', 'headset', 'cart', 'bag', 'pricetag', 'card', 'cash', 'gift', 'balloon', 'cafe', 'pizza', 'beer', 'wine', 'ice-cream', 'nutrition', 'restaurant', 'fast-food', 'book', 'newspaper', 'bookmark', 'document', 'folder', 'calculator', 'clipboard', 'create', 'pencil', 'brush', 'color-palette', 'image', 'images', 'aperture', 'barcode'];

export default function Settings() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [appName, setAppName] = useState('SafeGuard');
  const [selectedIcon, setSelectedIcon] = useState('shield');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${BACKEND_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserProfile(response.data);
      setAppName(response.data.app_name || 'SafeGuard');
      setSelectedIcon(response.data.app_logo || 'shield');
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const saveCustomization = async () => {
    if (!appName.trim()) {
      Alert.alert('Error', 'App name cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      await axios.put(`${BACKEND_URL}/api/user/customize-app`, {
        app_name: appName,
        app_logo: selectedIcon
      }, { headers: { Authorization: `Bearer ${token}` } });

      Alert.alert('Success', 'App customization saved');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to save customization');
    } finally {
      setLoading(false);
    }
  };

  const renderIconItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[styles.iconItem, selectedIcon === item && styles.iconItemSelected]}
      onPress={() => { setSelectedIcon(item); setShowIconPicker(false); }}
    >
      <Ionicons name={item as any} size={32} color="#fff" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          {userProfile && (
            <View style={styles.profileCard}>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Email:</Text>
                <Text style={styles.profileValue}>{userProfile.email}</Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Status:</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{userProfile.is_premium ? 'Premium' : 'Basic'}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Customization</Text>
          <Text style={styles.sectionDescription}>Change app name and icon for anonymity</Text>

          <View style={styles.customizationCard}>
            <Text style={styles.label}>App Name</Text>
            <TextInput
              style={styles.input}
              value={appName}
              onChangeText={setAppName}
              placeholder="Enter app name"
              placeholderTextColor="#64748B"
            />

            <Text style={[styles.label, { marginTop: 20 }]}>App Icon</Text>
            <TouchableOpacity style={styles.iconSelector} onPress={() => setShowIconPicker(!showIconPicker)}>
              <View style={styles.selectedIconContainer}>
                <Ionicons name={selectedIcon as any} size={40} color="#fff" />
                <Text style={styles.iconName}>{selectedIcon}</Text>
              </View>
              <Ionicons name="chevron-down" size={24} color="#64748B" />
            </TouchableOpacity>

            {showIconPicker && (
              <View style={styles.iconPicker}>
                <Text style={styles.iconPickerTitle}>Choose from 100 icons:</Text>
                <FlatList
                  data={ICON_OPTIONS}
                  renderItem={renderIconItem}
                  keyExtractor={(item) => item}
                  numColumns={5}
                  scrollEnabled={false}
                  contentContainerStyle={styles.iconGrid}
                />
              </View>
            )}

            <TouchableOpacity style={styles.saveButton} onPress={saveCustomization} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="save" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Save Customization</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutText}>SafeGuard Security App</Text>
            <Text style={styles.aboutVersion}>Version 2.0.0</Text>
            <Text style={styles.aboutDescription}>Two-tier security system with geospatial tracking</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#fff' },
  placeholder: { width: 32 },
  content: { padding: 20 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 8 },
  sectionDescription: { fontSize: 14, color: '#94A3B8', marginBottom: 16 },
  profileCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16 },
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  profileLabel: { fontSize: 14, color: '#94A3B8' },
  profileValue: { fontSize: 16, color: '#fff', fontWeight: '500' },
  statusBadge: { backgroundColor: '#3B82F6', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  customizationCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 8 },
  input: { backgroundColor: '#0F172A', borderRadius: 8, padding: 12, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#334155' },
  iconSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#334155' },
  selectedIconContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconName: { fontSize: 16, color: '#fff' },
  iconPicker: { marginTop: 16 },
  iconPickerTitle: { fontSize: 14, color: '#94A3B8', marginBottom: 12 },
  iconGrid: { gap: 8 },
  iconItem: { flex: 1, aspectRatio: 1, backgroundColor: '#0F172A', borderRadius: 8, justifyContent: 'center', alignItems: 'center', margin: 4, borderWidth: 2, borderColor: 'transparent' },
  iconItemSelected: { borderColor: '#3B82F6' },
  saveButton: { flexDirection: 'row', backgroundColor: '#3B82F6', borderRadius: 8, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  aboutCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 20, alignItems: 'center' },
  aboutText: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 8 },
  aboutVersion: { fontSize: 14, color: '#64748B', marginBottom: 16 },
  aboutDescription: { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },
});
