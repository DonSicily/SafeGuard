import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator, Switch, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraType, CameraView } from 'expo-camera';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || 'https://guardwatch-14.preview.emergentagent.com';
const MIN_RECORDING_DURATION = 2; // Minimum 2 seconds recording

export default function Report() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [caption, setCaption] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraRef, setCameraRef] = useState<any>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [location, setLocation] = useState<any>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const recordingPromiseRef = useRef<Promise<any> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for recording indicator
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

  // Timer effect for recording duration display
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
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, recordingStartTime]);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      const { status: micStatus } = await Camera.requestMicrophonePermissionsAsync();
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      
      setHasPermission(cameraStatus === 'granted' && micStatus === 'granted');
      
      if (locationStatus === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({ 
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 0
          });
          setLocation(loc);
          console.log('Location obtained:', loc.coords.latitude, loc.coords.longitude);
        } catch (locError: any) {
          console.error('Location error:', locError);
          Alert.alert(
            'Location Service Required',
            'Please enable Location Services in your device settings.\n\n' +
            '1. Go to Settings\n' +
            '2. Enable Location/GPS\n' +
            '3. Restart the app\n\n' +
            'Video recording will use default location for now.',
            [{ text: 'OK' }]
          );
          // Use default location as fallback
          setLocation({ coords: { latitude: 9.0820, longitude: 8.6753 } } as any);
        }
      } else {
        // Use default location if permission denied
        setLocation({ coords: { latitude: 9.0820, longitude: 8.6753 } } as any);
      }
    } catch (error) {
      console.error('Permission error:', error);
      Alert.alert('Error', 'Failed to get permissions');
    }
  };

  const startRecording = async () => {
    if (!cameraRef) {
      Alert.alert('Error', 'Camera not ready. Please wait.');
      return;
    }

    if (!cameraReady) {
      Alert.alert('Please Wait', 'Camera is still initializing...');
      return;
    }

    console.log('Starting recording...');
    setIsRecording(true);
    setRecordingStartTime(Date.now());
    
    try {
      // Start recording and handle promise separately
      recordingPromiseRef.current = cameraRef.recordAsync({ 
        maxDuration: 300, // 5 minutes max
        quality: '720p'
      });
      
      // Handle the promise completion
      const video = await recordingPromiseRef.current;
      
      console.log('Recording completed:', video);
      if (video && video.uri) {
        setRecordingUri(video.uri);
        const finalDuration = recordingStartTime ? Math.round((Date.now() - recordingStartTime) / 1000) : recordingDuration;
        console.log('Video saved successfully, duration:', finalDuration);
        Alert.alert('Video Recorded', `Recording saved (${formatDuration(finalDuration)})`);
      }
    } catch (error: any) {
      console.log('Recording error/stop:', error?.message);
      // Check if video was saved despite error (common on stop)
      if (error?.message?.toLowerCase().includes('stopped') || 
          error?.message?.toLowerCase().includes('abort') ||
          error?.message?.toLowerCase().includes('cancel')) {
        // Recording was manually stopped - this is expected
        console.log('Recording was stopped by user');
      } else {
        Alert.alert('Recording Error', error?.message || 'Unknown error occurred');
      }
    } finally {
      setIsRecording(false);
      setRecordingStartTime(null);
      recordingPromiseRef.current = null;
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    
    // Check minimum recording duration
    if (recordingDuration < MIN_RECORDING_DURATION) {
      Alert.alert(
        'Recording Too Short', 
        `Please record for at least ${MIN_RECORDING_DURATION} seconds. Current: ${recordingDuration}s`
      );
      return;
    }

    if (cameraRef && recordingPromiseRef.current) {
      console.log('User clicked stop after', recordingDuration, 'seconds');
      cameraRef.stopRecording();
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const onCameraReady = () => {
    console.log('Camera is ready');
    setCameraReady(true);
  };

  const submitReport = async () => {
    if (!recordingUri) {
      Alert.alert('Error', 'Please record a video first');
      return;
    }

    setLoading(true);
    try {
      // Get current location if not already available
      let currentLocation = location;
      if (!currentLocation) {
        try {
          currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        } catch (err) {
          // Use default location if GPS fails
          currentLocation = { coords: { latitude: 9.0820, longitude: 8.6753 } };
        }
      }

      const token = await AsyncStorage.getItem('auth_token');
      await axios.post(
        `${BACKEND_URL}/api/report/create`,
        {
          type: 'video',
          caption: caption || 'Live security report',
          is_anonymous: isAnonymous,
          file_url: recordingUri,
          thumbnail: 'data:image/png;base64,placeholder',
          uploaded: false,
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert('Success!', 'Your video report has been submitted successfully.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Submit error:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.permissionText}>Requesting permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Ionicons name="camera-off" size={80} color="#64748B" />
          <Text style={styles.permissionText}>Camera & microphone permissions required</Text>
          <TouchableOpacity style={styles.button} onPress={requestPermissions}>
            <Text style={styles.buttonText}>Grant Permissions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
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
            {/* Recording Timer Overlay - Large & Prominent */}
            {isRecording && (
              <View style={styles.timerOverlay}>
                <View style={styles.timerContainer}>
                  <Animated.View style={[styles.recordingDotLarge, { transform: [{ scale: pulseAnim }] }]} />
                  <Text style={styles.timerText}>{formatDuration(recordingDuration)}</Text>
                </View>
                <Text style={styles.recordingLabel}>RECORDING</Text>
                {recordingDuration < MIN_RECORDING_DURATION && (
                  <Text style={styles.minDurationHint}>Record at least {MIN_RECORDING_DURATION} seconds</Text>
                )}
              </View>
            )}

            {/* Camera Ready Indicator */}
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
              <TouchableOpacity 
                style={[
                  styles.stopButton, 
                  recordingDuration < MIN_RECORDING_DURATION && styles.stopButtonDisabled
                ]} 
                onPress={stopRecording}
              >
                <View style={styles.stopButtonInner} />
              </TouchableOpacity>
            )}
            
            {/* Duration hint below button */}
            <Text style={styles.controlHint}>
              {!isRecording ? 'Tap to start recording' : `Tap to stop${recordingDuration < MIN_RECORDING_DURATION ? ` (wait ${MIN_RECORDING_DURATION - recordingDuration}s)` : ''}`}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.formContainer}>
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={60} color="#10B981" />
            <Text style={styles.successText}>Video Recorded Successfully</Text>
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

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
            <Text style={styles.infoText}>
              Video saved locally. Will be uploaded to secure cloud storage when you add Firebase credentials.
            </Text>
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={submitReport} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit Report</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.retakeButton} onPress={() => { setRecordingUri(null); setCaption(''); }}>
            <Text style={styles.retakeButtonText}>Record Again</Text>
          </TouchableOpacity>
        </View>
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
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  permissionText: { fontSize: 16, color: '#94A3B8', marginTop: 16, marginBottom: 24, textAlign: 'center' },
  button: { backgroundColor: '#3B82F6', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12, marginBottom: 12 },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  backButton: { paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderColor: '#64748B' },
  backButtonText: { fontSize: 16, fontWeight: '600', color: '#64748B' },
  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
  
  // New Timer Overlay Styles
  timerOverlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    alignItems: 'center', 
    paddingTop: 40,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.4)'
  },
  timerContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(239, 68, 68, 0.9)', 
    paddingHorizontal: 24, 
    paddingVertical: 12, 
    borderRadius: 30 
  },
  recordingDotLarge: { 
    width: 16, 
    height: 16, 
    borderRadius: 8, 
    backgroundColor: '#fff', 
    marginRight: 12 
  },
  timerText: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: '#fff', 
    fontVariant: ['tabular-nums']
  },
  recordingLabel: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#fff', 
    marginTop: 8, 
    letterSpacing: 2 
  },
  minDurationHint: { 
    fontSize: 12, 
    color: '#FCD34D', 
    marginTop: 4 
  },
  
  // Loading Overlay
  loadingOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    color: '#fff', 
    marginTop: 12, 
    fontSize: 16 
  },
  
  // Camera Controls
  cameraControls: { 
    position: 'absolute', 
    bottom: 40, 
    left: 0, 
    right: 0, 
    alignItems: 'center' 
  },
  recordButton: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: 'rgba(255,255,255,0.3)', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff'
  },
  disabledButton: { 
    opacity: 0.5 
  },
  recordButtonInner: { 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    backgroundColor: '#EF4444' 
  },
  stopButton: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: 'rgba(239, 68, 68, 0.3)', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#EF4444'
  },
  stopButtonDisabled: { 
    opacity: 0.5 
  },
  stopButtonInner: { 
    width: 32, 
    height: 32, 
    backgroundColor: '#EF4444', 
    borderRadius: 4 
  },
  controlHint: { 
    color: '#fff', 
    fontSize: 14, 
    marginTop: 12, 
    textShadowColor: 'rgba(0,0,0,0.5)', 
    textShadowOffset: { width: 0, height: 1 }, 
    textShadowRadius: 2 
  },
  
  // Form Styles
  formContainer: { flex: 1, padding: 24 },
  successBox: { alignItems: 'center', marginTop: 20, marginBottom: 32 },
  successText: { fontSize: 18, fontWeight: '600', color: '#10B981', marginTop: 16 },
  inputContainer: { marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 8 },
  textArea: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16, minHeight: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: '#334155' },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E293B', padding: 16, borderRadius: 12, marginBottom: 24 },
  switchLabel: { fontSize: 16, fontWeight: '600', color: '#fff' },
  switchDescription: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
  infoBox: { flexDirection: 'row', backgroundColor: '#1E293B', borderRadius: 12, padding: 16, gap: 12, marginBottom: 24 },
  infoText: { flex: 1, fontSize: 14, color: '#64748B', lineHeight: 20 },
  submitButton: { backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginBottom: 16 },
  submitButtonText: { fontSize: 18, fontWeight: '600', color: '#fff' },
  retakeButton: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#64748B' },
  retakeButtonText: { fontSize: 16, fontWeight: '600', color: '#64748B' },
});
