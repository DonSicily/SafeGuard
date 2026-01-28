import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || 'https://guardwatch-14.preview.emergentagent.com';

interface Report {
  id: string;
  type: string;
  caption: string;
  is_anonymous: boolean;
  uploaded: boolean;
  created_at: string;
}

export default function ReportList() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const getToken = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) return token;
    } catch (e) {}
    return await AsyncStorage.getItem('auth_token');
  };

  const loadReports = async () => {
    try {
      const token = await getToken();
      const response = await axios.get(`${BACKEND_URL}/api/report/my-reports`, {
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderReportItem = ({ item }: { item: Report }) => (
    <View style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <View style={styles.reportIcon}>
          <Ionicons
            name={item.type === 'video' ? 'videocam' : 'mic'}
            size={24}
            color={item.type === 'video' ? '#10B981' : '#8B5CF6'}
          />
        </View>
        <View style={styles.reportInfo}>
          <View style={styles.reportTitleRow}>
            <Text style={styles.reportType}>
              {item.type === 'video' ? 'Video Report' : 'Audio Report'}
            </Text>
            {item.is_anonymous && (
              <View style={styles.anonymousBadge}>
                <Ionicons name="eye-off" size={12} color="#64748B" />
                <Text style={styles.anonymousText}>Anonymous</Text>
              </View>
            )}
          </View>
          <Text style={styles.reportCaption} numberOfLines={2}>
            {item.caption || 'No caption'}
          </Text>
          <Text style={styles.reportDate}>{formatDate(item.created_at)}</Text>
        </View>
      </View>

      <View style={styles.reportFooter}>
        <View
          style={[
            styles.uploadStatus,
            item.uploaded
              ? styles.uploadStatusSuccess
              : styles.uploadStatusPending,
          ]}
        >
          <Ionicons
            name={item.uploaded ? 'checkmark-circle' : 'cloud-upload-outline'}
            size={16}
            color={item.uploaded ? '#10B981' : '#F59E0B'}
          />
          <Text
            style={[
              styles.uploadStatusText,
              item.uploaded
                ? styles.uploadStatusTextSuccess
                : styles.uploadStatusTextPending,
            ]}
          >
            {item.uploaded ? 'Uploaded' : 'Pending Upload'}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Reports</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={80} color="#64748B" />
          <Text style={styles.emptyText}>No Reports Yet</Text>
          <Text style={styles.emptySubtext}>
            Your submitted reports will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          renderItem={renderReportItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  placeholder: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
  },
  listContent: {
    padding: 20,
  },
  reportCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  reportHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportInfo: {
    flex: 1,
  },
  reportTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  reportType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  anonymousBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  anonymousText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  reportCaption: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 12,
    color: '#64748B',
  },
  reportFooter: {
    borderTopWidth: 1,
    borderTopColor: '#0F172A',
    paddingTop: 12,
  },
  uploadStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadStatusSuccess: {},
  uploadStatusPending: {},
  uploadStatusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  uploadStatusTextSuccess: {
    color: '#10B981',
  },
  uploadStatusTextPending: {
    color: '#F59E0B',
  },
});
