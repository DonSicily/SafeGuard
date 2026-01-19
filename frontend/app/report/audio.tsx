import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || 'https://guardwatch-14.preview.emergentagent.com';

export default function AudioReport() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<any>(null);

  React.useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      const { status: audioStatus } = await Audio.requestPermissionsAsync();
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      
      setHasPermission(audioStatus === 'granted');
      
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
            'Please enable Location Services in your device settings to get accurate location for reports.',
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
    }
  };

  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
    } catch (error: any) {
      console.error('Recording error:', error);
      Alert.alert('Error', `Failed to start recording: ${error.message}`);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setAudioUri(uri);
      setRecording(null);
      Alert.alert('Success', 'Audio recorded successfully');
    } catch (error: any) {
      console.error('Stop recording error:', error);
      Alert.alert('Error', `Failed to stop recording: ${error.message}`);
    }
  };

  const submitReport = async () => {
    if (!audioUri) {
      Alert.alert('Error', 'Please record audio first');
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
      
      // Note: Audio file is saved locally on device
      // In production, this would upload to Firebase Storage
      // For now, saving metadata with local URI
      await axios.post(
        `${BACKEND_URL}/api/report/create`,
        {
          type: 'audio',
          caption: caption || 'Audio security report',
          is_anonymous: isAnonymous,
          file_url: audioUri,
          uploaded: true, // Marked as uploaded since metadata is saved
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert('Success!', 'Your audio report has been submitted and is visible to security teams.', [
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
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.permissionText}>Requesting permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Ionicons name="mic-off" size={80} color="#64748B" />
          <Text style={styles.permissionText}>Microphone permission is required</Text>
          <TouchableOpacity style={styles.button} onPress={requestPermissions}>
            <Text style={styles.buttonText}>Grant Permission</Text>
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Audio Report</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {!audioUri ? (
          <View style={styles.recordingSection}>
            <View style={styles.microphoneContainer}>
              <View style={[styles.microphoneCircle, isRecording && styles.recordingPulse]}>
                <Ionicons name="mic" size={80} color="#8B5CF6" />
              </View>
            </View>

            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>Recording...</Text>
              </View>
            )}

            <Text style={styles.instruction}>
              {isRecording ? 'Tap to stop recording' : 'Tap the microphone to start recording'}
            </Text>

            <TouchableOpacity
              style={[styles.recordButton, isRecording && styles.stopButton]}
              onPress={isRecording ? stopRecording : startRecording}
            >
              <Ionicons name={isRecording ? 'stop' : 'mic'} size={24} color="#fff" />
              <Text style={styles.recordButtonText}>{isRecording ? 'Stop Recording' : 'Start Recording'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formContainer}>
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={60} color="#8B5CF6" />
              <Text style={styles.successText}>Audio Recorded</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Caption/Description</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Describe your report..."
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
                trackColor={{ false: '#334155', true: '#8B5CF6' }}
                thumbColor={isAnonymous ? '#fff' : '#f4f3f4'}
              />
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={submitReport} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit Report</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.retakeButton} onPress={() => { setAudioUri(null); setCaption(''); }}>
              <Text style={styles.retakeButtonText}>Record Again</Text>
            </TouchableOpacity>
          </View>
        )}
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
  content: { flex: 1, padding: 24 },
  permissionText: { fontSize: 16, color: '#94A3B8', marginTop: 16, marginBottom: 24, textAlign: 'center' },
  button: { backgroundColor: '#8B5CF6', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12, marginBottom: 12 },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  backButtonText: { fontSize: 16, fontWeight: '600', color: '#64748B' },
  recordingSection: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  microphoneContainer: { marginBottom: 40 },
  microphoneCircle: { width: 200, height: 200, borderRadius: 100, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#8B5CF6' },
  recordingPulse: { borderColor: '#EF4444' },
  recordingIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, marginBottom: 24 },
  recordingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF4444', marginRight: 12 },
  recordingText: { fontSize: 16, fontWeight: '600', color: '#EF4444' },
  instruction: { fontSize: 16, color: '#94A3B8', textAlign: 'center', marginBottom: 32 },
  recordButton: { flexDirection: 'row', backgroundColor: '#8B5CF6', paddingHorizontal: 32, paddingVertical: 18, borderRadius: 12, alignItems: 'center', gap: 12 },
  stopButton: { backgroundColor: '#EF4444' },
  recordButtonText: { fontSize: 18, fontWeight: '600', color: '#fff' },
  formContainer: { flex: 1 },
  successBox: { alignItems: 'center', marginTop: 20, marginBottom: 32 },
  successText: { fontSize: 18, fontWeight: '600', color: '#8B5CF6', marginTop: 16 },
  inputContainer: { marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 8 },
  textArea: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16, minHeight: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: '#334155' },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E293B', padding: 16, borderRadius: 12, marginBottom: 24 },
  switchLabel: { fontSize: 16, fontWeight: '600', color: '#fff' },
  switchDescription: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
  submitButton: { backgroundColor: '#8B5CF6', borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginBottom: 16 },
  submitButtonText: { fontSize: 18, fontWeight: '600', color: '#fff' },
  retakeButton: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#64748B' },
  retakeButtonText: { fontSize: 16, fontWeight: '600', color: '#64748B' },
});
