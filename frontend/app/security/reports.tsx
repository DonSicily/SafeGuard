import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import { Audio } from 'expo-av';
import { getAuthToken, clearAuthData } from '../../utils/auth';

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || 'https://guardlogin.preview.emergentagent.com';

export default function SecurityReports() {
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
    const interval = setInterval(loadReports, 30000);
    return () => clearInterval(interval);
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const playAudio = async (audioUrl: string, reportId: string) => {
    try {
      // Stop current audio if playing
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
        if (playingId === reportId) {
          setPlayingId(null);
          return;
        }
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      console.log('Loading audio from:', audioUrl);

      // Load and play
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );

      setSound(newSound);
      setPlayingId(reportId);

      // Handle playback finished
      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingId(null);
          newSound.unloadAsync();
          setSound(null);
        }
      });

      console.log('Audio playing:', reportId);
    } catch (error: any) {
      console.error('Audio playback error:', error);
      Alert.alert('Playback Error', 'Unable to play audio file. ' + error.message);
    }
  };

  const loadReports = async () => {
    try {
      const token = await getToken();
      const response = await axios.get(`${BACKEND_URL}/api/security/nearby-reports`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000
      });
      setReports(response.data);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReports();
  };

  const renderReport = ({ item }: any) => (
    <View style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <View style={styles.reportIcon}>
          <Ionicons
            name={item.type === 'video' ? 'videocam' : 'mic'}
            size={28}
            color={item.type === 'video' ? '#10B981' : '#8B5CF6'}
          />
        </View>
        <View style={styles.reportInfo}>
          <Text style={styles.reportType}>{item.type.toUpperCase()} Report</Text>
          <Text style={styles.reportCaption} numberOfLines={2}>
            {item.caption || 'No caption'}
          </Text>
          <Text style={styles.reportDate}>
            {new Date(item.created_at).toLocaleString()}
          </Text>
        </View>
      </View>

      <View style={styles.reportFooter}>
        <Text style={styles.userInfo}>
          {item.is_anonymous ? '🔒 Anonymous' : `👤 ${item.user_email}`}
        </Text>
        <View style={styles.locationBadge}>
          <Ionicons name="location" size={14} color="#3B82F6" />
          <Text style={styles.locationText}>
            {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
          </Text>
        </View>
      </View>

      {item.file_url && (
        <TouchableOpacity 
          style={styles.viewButton}
          onPress={() => {
            if (item.type === 'audio') {
              playAudio(item.file_url, item._id);
            } else {
              Alert.alert('Video', 'Video playback - Opening in browser or external player');
            }
          }}
        >
          <Ionicons 
            name={
              item.type === 'audio' 
                ? (playingId === item._id ? 'pause-circle' : 'play-circle')
                : 'videocam'
            } 
            size={20} 
            color="#3B82F6" 
          />
          <Text style={styles.viewButtonText}>
            {item.type === 'audio' 
              ? (playingId === item._id ? 'Pause Audio' : 'Play Audio')
              : 'View Video'
            }
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/security/home")} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nearby Reports</Text>
        <TouchableOpacity onPress={loadReports}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={reports}
          renderItem={renderReport}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={80} color="#64748B" />
              <Text style={styles.emptyText}>No reports in your area</Text>
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
  emptyText: { fontSize: 16, color: '#64748B', marginTop: 16 },
  reportCard: { backgroundColor: '#1E293B', borderRadius: 16, padding: 20, marginBottom: 16 },
  reportHeader: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  reportIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  reportInfo: { flex: 1 },
  reportType: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 6 },
  reportCaption: { fontSize: 14, color: '#94A3B8', marginBottom: 8, lineHeight: 20 },
  reportDate: { fontSize: 12, color: '#64748B' },
  reportFooter: { borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 12, gap: 8 },
  userInfo: { fontSize: 14, color: '#94A3B8' },
  locationBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationText: { fontSize: 12, color: '#3B82F6', fontWeight: '500' },
  viewButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0F172A', borderRadius: 8, paddingVertical: 12, marginTop: 12 },
  viewButtonText: { fontSize: 14, fontWeight: '600', color: '#3B82F6' },
});
