import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraType } from 'expo-camera';
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
  const [cameraRef, setCameraRef] = useState<Camera | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  React.useEffect(() => {
    requestPermission();
  }, []);

  const requestPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const startRecording = async () => {
    if (!cameraRef) return;

    try {
      setIsRecording(true);
      const video = await cameraRef.recordAsync({
        maxDuration: 300, // 5 minutes max
      });
      setRecordingUri(video.uri);
      setIsRecording(false);
      
      Alert.alert(
        'Recording Complete',
        'Your video has been recorded. Add a caption and submit your report.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to record video');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (cameraRef && isRecording) {
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
      const token = await AsyncStorage.getItem('auth_token');
      
      // In a real app, you would:
      // 1. Upload video to Firebase Storage
      // 2. Get the download URL
      // 3. Create report with URL
      
      // For now, we'll create a report with placeholder URL
      await axios.post(
        `${BACKEND_URL}/api/report/create`,
        {
          type: 'video',
          caption: caption || 'Live security report',
          is_anonymous: isAnonymous,
          file_url: 'firebase://placeholder-url', // Will be replaced with actual Firebase URL
          thumbnail: 'data:image/png;base64,placeholder', // Thumbnail from video
          uploaded: false, // Will be true after Firebase upload
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert(
        'Success',
        'Your report has been submitted. Video will be uploaded when internet is available.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#10B981" />
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Ionicons name="camera-off" size={80} color="#64748B" />
          <Text style={styles.permissionText}>Camera permission is required</Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Grant Permission</Text>
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
        <Text style={styles.headerTitle}>Live Video Report</Text>
        <View style={styles.placeholder} />
      </View>

      {!recordingUri ? (
        <View style={styles.cameraContainer}>
          <Camera
            style={styles.camera}
            type={CameraType.back}
            ref={(ref) => setCameraRef(ref)}
          >
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>RECORDING</Text>
              </View>
            )}
          </Camera>

          <View style={styles.cameraControls}>
            {!isRecording ? (
              <TouchableOpacity
                style={styles.recordButton}
                onPress={startRecording}
              >
                <View style={styles.recordButtonInner} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.stopButton}
                onPress={stopRecording}
              >
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
              <Text style={styles.switchDescription}>
                Your identity will not be revealed
              </Text>
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
              Video will be uploaded to secure cloud storage. If offline, it will be saved locally and uploaded when internet is restored.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={submitReport}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Report</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.retakeButton}
            onPress={() => {
              setRecordingUri(null);
              setCaption('');
            }}
          >
            <Text style={styles.retakeButtonText}>Record Again</Text>
          </TouchableOpacity>
        </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionText: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 16,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    margin: 20,
    alignSelf: 'flex-start',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  cameraControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EF4444',
  },
  stopButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButtonInner: {
    width: 40,
    height: 40,
    backgroundColor: '#EF4444',
    borderRadius: 4,
  },
  formContainer: {
    flex: 1,
    padding: 24,
  },
  successBox: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 32,
  },
  successText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 16,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#334155',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  switchDescription: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  retakeButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#64748B',
  },
  retakeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
});
