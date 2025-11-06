import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraType, CameraView } from 'expo-camera';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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
  const recordingPromiseRef = React.useRef<Promise<any> | null>(null);

  React.useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      const { status: micStatus } = await Camera.requestMicrophonePermissionsAsync();
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      
      setHasPermission(cameraStatus === 'granted' && micStatus === 'granted');
      
      if (locationStatus === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setLocation(loc);
      }
    } catch (error) {
      console.error('Permission error:', error);
      Alert.alert('Error', 'Failed to get permissions');
    }
  };

  const startRecording = async () => {
    if (!cameraRef) {
      Alert.alert('Error', 'Camera not ready');
      return;
    }

    try {
      setIsRecording(true);
      setRecordingStartTime(Date.now());
      
      // Start recording
      const video = await cameraRef.recordAsync({ 
        maxDuration: 300,
        quality: '720p'
      });
      
      // Recording completed (either by stopRecording or max duration)
      setIsRecording(false);
      const duration = recordingStartTime ? (Date.now() - recordingStartTime) / 1000 : 0;
      setRecordingStartTime(null);
      
      console.log('Recording completed, duration:', duration, 'seconds');
      
      if (video && video.uri) {
        setRecordingUri(video.uri);
        Alert.alert('Success', `Video recorded successfully (${Math.round(duration)}s)`);
      }
    } catch (error: any) {
      console.error('Recording error:', error);
      setIsRecording(false);
      setRecordingStartTime(null);
      
      // Only show meaningful errors to user
      // Some errors are expected when user stops recording
      if (error.message && !error.message.toLowerCase().includes('stopped')) {
        Alert.alert('Recording Error', error.message);
      }
    }
  };

  const stopRecording = () => {
    if (cameraRef && isRecording) {
      console.log('Stopping recording...');
      cameraRef.stopRecording();
    }
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
          >
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>RECORDING</Text>
              </View>
            )}
          </CameraView>

          <View style={styles.cameraControls}>
            {!isRecording ? (
              <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
                <View style={styles.recordButtonInner} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
                <View style={styles.stopButtonInner} />
              </TouchableOpacity>
            )}
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
  recordingIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, margin: 20, alignSelf: 'flex-start' },
  recordingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF4444', marginRight: 8 },
  recordingText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  cameraControls: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
  recordButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  recordButtonInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#EF4444' },
  stopButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  stopButtonInner: { width: 40, height: 40, backgroundColor: '#EF4444', borderRadius: 4 },
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
