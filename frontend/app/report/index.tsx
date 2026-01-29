import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator, Switch, Platform, Animated, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraView } from 'expo-camera';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || 'https://guardlogin.preview.emergentagent.com';
const MIN_RECORDING_DURATION = 2;

export default function Report() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [caption, setCaption] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cameraRef, setCameraRef] = useState<any>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [location, setLocation] = useState<any>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const recordingPromiseRef = useRef<Promise<any> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isRecording]);

  useEffect(() => {
    let interval: any;
    if (isRecording && recordingStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        setRecordingDuration(elapsed);
      }, 100);
    } else {
      setRecordingDuration(0);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isRecording, recordingStartTime]);

  useEffect(() => {
    requestPermissions();
  }, []);

  const getToken = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) return token;
    } catch (e) {}
    return await AsyncStorage.getItem('auth_token');
  };

  const requestPermissions = async () => {
    try {
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      const { status: micStatus } = await Camera.requestMicrophonePermissionsAsync();
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      
      setHasPermission(cameraStatus === 'granted' && micStatus === 'granted');
      
      if (locationStatus === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          setLocation(loc);
        } catch (locError) {
          setLocation({ coords: { latitude: 9.0820, longitude: 8.6753 } } as any);
        }
      } else {
        setLocation({ coords: { latitude: 9.0820, longitude: 8.6753 } } as any);
      }
    } catch (error) {
      console.error('Permission error:', error);
    }
  };

  const startRecording = async () => {
    if (!cameraRef || !cameraReady) {
      Alert.alert('Please Wait', 'Camera is still initializing...');
      return;
    }

    setIsRecording(true);
    setRecordingStartTime(Date.now());
    
    try {
      recordingPromiseRef.current = cameraRef.recordAsync({ maxDuration: 300, quality: '720p' });
      const video = await recordingPromiseRef.current;
      
      if (video && video.uri) {
        setRecordingUri(video.uri);
        Alert.alert('Video Recorded', `Recording saved (${formatDuration(recordingDuration)})`);
      }
    } catch (error: any) {
      if (!error?.message?.toLowerCase().includes('stopped')) {
        Alert.alert('Recording Error', error?.message || 'Unknown error');
      }
    } finally {
      setIsRecording(false);
      setRecordingStartTime(null);
      recordingPromiseRef.current = null;
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    if (recordingDuration < MIN_RECORDING_DURATION) {
      Alert.alert('Recording Too Short', `Please record for at least ${MIN_RECORDING_DURATION} seconds.`);
      return;
    }
    if (cameraRef && recordingPromiseRef.current) {
      cameraRef.stopRecording();
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const onCameraReady = () => setCameraReady(true);

  const submitReport = async () => {
    if (!recordingUri) {
      Alert.alert('Error', 'Please record a video first');
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    
    try {
      let currentLocation = location;
      if (!currentLocation) {
        try {
          currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        } catch (err) {
          currentLocation = { coords: { latitude: 9.0820, longitude: 8.6753 } };
        }
      }

      const token = await getToken();
      
      // Step 1: Read the video file
      setUploadProgress(10);
      const fileInfo = await FileSystem.getInfoAsync(recordingUri);
      if (!fileInfo.exists) {
        throw new Error('Video file not found');
      }

      // Step 2: Convert to base64 for upload
      setUploadProgress(20);
      const base64Video = await FileSystem.readAsStringAsync(recordingUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Step 3: Upload to backend with file data
      setUploadProgress(40);
      
      const response = await axios.post(
        `${BACKEND_URL}/api/report/upload-video`,
        {
          video_data: base64Video,
          caption: caption || 'Live security report',
          is_anonymous: isAnonymous,
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          duration_seconds: recordingDuration
        },
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 120000, // 2 minute timeout for large uploads
          onUploadProgress: (progressEvent) => {
            const progress = progressEvent.loaded / (progressEvent.total || 1);
            setUploadProgress(40 + Math.round(progress * 50));
          }
        }
      );

      setUploadProgress(100);

      Alert.alert('Success!', 'Your video report has been uploaded successfully.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Submit error:', error);
      
      let errorMessage = 'Failed to upload report.';
      if (error.response) {
        errorMessage = error.response.data?.detail || errorMessage;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Upload timed out. Try with a shorter video.';
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      // Offer to save locally
      Alert.alert(
        'Upload Failed',
        `${errorMessage}\n\nWould you like to save the report locally and retry later?`,
        [
          { text: 'Discard', style: 'destructive' },
          { 
            text: 'Save Locally', 
            onPress: () => saveReportLocally()
          }
        ]
      );
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const saveReportLocally = async () => {
    try {
      const token = await getToken();
      let currentLocation = location || { coords: { latitude: 9.0820, longitude: 8.6753 } };
      
      await axios.post(
        `${BACKEND_URL}/api/report/create`,
        {
          type: 'video',
          caption: caption || 'Live security report',
          is_anonymous: isAnonymous,
          file_url: recordingUri,
          uploaded: false,
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert('Saved!', 'Report saved locally. It will be uploaded when connection improves.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save report locally.');
    }
  };

  const retryUpload = () => {
    Alert.alert(
      'Retry Upload',
      'This will attempt to upload the video again. Make sure you have a stable internet connection.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Retry', onPress: submitReport }
      ]
    );
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.permissionText}>Requesting permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="camera-off" size={80} color="#64748B" />
          <Text style={styles.permissionText}>Camera & microphone permissions required</Text>
          <TouchableOpacity style={styles.button} onPress={requestPermissions}>
            <Text style={styles.buttonText}>Grant Permissions</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Video Report</Text>
        <View style={styles.placeholder} />
      </View>

      {!recordingUri ? (
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            ref={(ref) => setCameraRef(ref)}
            onCameraReady={onCameraReady}
            mode="video"
          >
            {isRecording && (
              <View style={styles.timerOverlay}>
                <View style={styles.timerContainer}>
                  <Animated.View style={[styles.recordingDotLarge, { transform: [{ scale: pulseAnim }] }]} />
                  <Text style={styles.timerText}>{formatDuration(recordingDuration)}</Text>
                </View>
                <Text style={styles.recordingLabel}>RECORDING</Text>
              </View>
            )}

            {!cameraReady && !isRecording && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>Initializing camera...</Text>
              </View>
            )}
          </CameraView>

          <View style={styles.cameraControls}>
            {!isRecording ? (
              <TouchableOpacity 
                style={[styles.recordButton, !cameraReady && styles.disabledButton]} 
                onPress={startRecording}
                disabled={!cameraReady}
              >
                <View style={styles.recordButtonInner} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
                <View style={styles.stopButtonInner} />
              </TouchableOpacity>
            )}
            <Text style={styles.controlHint}>
              {!isRecording ? 'Tap to start' : 'Tap to stop'}
            </Text>
          </View>
        </View>
      ) : (
        <ScrollView style={styles.formContainer} contentContainerStyle={styles.formContent}>
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={60} color="#10B981" />
            <Text style={styles.successText}>Video Recorded</Text>
            <Text style={styles.durationText}>Duration: {formatDuration(recordingDuration)}</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Caption/Description</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Describe what happened..."
              placeholderTextColor="#64748B"
              value={caption}
              onChangeText={setCaption}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.switchContainer}>
            <View>
              <Text style={styles.switchLabel}>Submit Anonymously</Text>
              <Text style={styles.switchDescription}>Your identity will not be revealed</Text>
            </View>
            <Switch
              value={isAnonymous}
              onValueChange={setIsAnonymous}
              trackColor={{ false: '#334155', true: '#3B82F6' }}
              thumbColor={isAnonymous ? '#fff' : '#f4f3f4'}
            />
          </View>

          {/* Upload Progress */}
          {loading && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {uploadProgress < 40 ? 'Preparing video...' : 
                 uploadProgress < 90 ? 'Uploading...' : 'Almost done...'}
                {' '}{uploadProgress}%
              </Text>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.submitButton, loading && styles.disabledButton]} 
            onPress={submitReport} 
            disabled={loading}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.submitButtonText}>Uploading...</Text>
              </View>
            ) : (
              <>
                <Ionicons name="cloud-upload" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Upload Report</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Retry Button - shown when not loading */}
          {!loading && (
            <TouchableOpacity style={styles.retryButton} onPress={retryUpload}>
              <Ionicons name="refresh" size={20} color="#F59E0B" />
              <Text style={styles.retryButtonText}>Retry Upload</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.retakeButton} 
            onPress={() => { setRecordingUri(null); setCaption(''); }}
            disabled={loading}
          >
            <Text style={styles.retakeButtonText}>Record Again</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#fff' },
  placeholder: { width: 32 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  permissionText: { fontSize: 16, color: '#94A3B8', marginTop: 16, textAlign: 'center' },
  button: { backgroundColor: '#3B82F6', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12, marginTop: 16 },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
  timerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', paddingTop: 40, paddingBottom: 20, backgroundColor: 'rgba(0,0,0,0.4)' },
  timerContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.9)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30 },
  recordingDotLarge: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff', marginRight: 12 },
  timerText: { fontSize: 32, fontWeight: 'bold', color: '#fff', fontVariant: ['tabular-nums'] },
  recordingLabel: { fontSize: 14, fontWeight: '600', color: '#fff', marginTop: 8, letterSpacing: 2 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#fff', marginTop: 12, fontSize: 16 },
  cameraControls: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
  recordButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#fff' },
  disabledButton: { opacity: 0.5 },
  recordButtonInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#EF4444' },
  stopButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(239, 68, 68, 0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#EF4444' },
  stopButtonInner: { width: 32, height: 32, backgroundColor: '#EF4444', borderRadius: 4 },
  controlHint: { color: '#fff', fontSize: 14, marginTop: 12 },
  formContainer: { flex: 1 },
  formContent: { padding: 24 },
  successBox: { alignItems: 'center', marginBottom: 24 },
  successText: { fontSize: 18, fontWeight: '600', color: '#10B981', marginTop: 12 },
  durationText: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 8 },
  textArea: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16, minHeight: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: '#334155' },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E293B', padding: 16, borderRadius: 12, marginBottom: 20 },
  switchLabel: { fontSize: 16, fontWeight: '600', color: '#fff' },
  switchDescription: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
  progressContainer: { marginBottom: 20 },
  progressBar: { height: 8, backgroundColor: '#1E293B', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 4 },
  progressText: { fontSize: 14, color: '#94A3B8', marginTop: 8, textAlign: 'center' },
  submitButton: { backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginBottom: 12, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  submitButtonText: { fontSize: 18, fontWeight: '600', color: '#fff' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  retryButton: { backgroundColor: '#F59E0B20', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 12, flexDirection: 'row', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#F59E0B' },
  retryButtonText: { fontSize: 16, fontWeight: '600', color: '#F59E0B' },
  retakeButton: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#64748B' },
  retakeButtonText: { fontSize: 16, fontWeight: '600', color: '#64748B' },
});
