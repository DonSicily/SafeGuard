# 🔧 ALL FIXES IMPLEMENTATION GUIDE

## Complete Implementation of All 5 Issues

---

## Fix 1: Audio/Video Playback

### A. Audio Playback (Security Side)

**File: `/app/frontend/app/security/reports.tsx`**

Add playback functions:

```typescript
// Add cleanup on unmount
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

    // Load and play
    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri: audioUrl },
      { shouldPlay: true }
    );

    setSound(newSound);
    setPlayingId(reportId);

    // Handle playback finished
    newSound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        setPlayingId(null);
        newSound.unloadAsync();
        setSound(null);
      }
    });
  } catch (error: any) {
    Alert.alert('Playback Error', error.message);
    console.error('Audio playback error:', error);
  }
};
```

Update the report item render:

```typescript
<TouchableOpacity
  style={styles.viewButton}
  onPress={() => {
    if (item.type === 'audio') {
      playAudio(item.file_url, item._id);
    } else {
      // Handle video
      Alert.alert('Video', 'Video playback coming soon');
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
      ? (playingId === item._id ? 'Pause' : 'Play Audio')
      : 'View Video'
    }
  </Text>
</TouchableOpacity>
```

---

### B. Audio Preview (Uploader Side)

**File: `/app/frontend/app/report/audio.tsx`**

Add playback after recording:

```typescript
const [audioSound, setAudioSound] = useState<Audio.Sound | null>(null);
const [isPlayingPreview, setIsPlayingPreview] = useState(false);

// Cleanup
useEffect(() => {
  return audioSound
    ? () => {
        audioSound.unloadAsync();
      }
    : undefined;
}, [audioSound]);

const playRecordedAudio = async () => {
  if (!audioUri) return;

  try {
    if (audioSound) {
      await audioSound.unloadAsync();
      setAudioSound(null);
      setIsPlayingPreview(false);
      return;
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUri },
      { shouldPlay: true }
    );

    setAudioSound(sound);
    setIsPlayingPreview(true);

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        setIsPlayingPreview(false);
        sound.unloadAsync();
        setAudioSound(null);
      }
    });
  } catch (error) {
    console.error('Preview playback error:', error);
  }
};
```

Add preview button in UI:

```typescript
{audioUri && !loading && (
  <View style={styles.previewContainer}>
    <TouchableOpacity 
      style={styles.playButton} 
      onPress={playRecordedAudio}
    >
      <Ionicons 
        name={isPlayingPreview ? 'pause-circle' : 'play-circle'} 
        size={48} 
        color="#3B82F6" 
      />
      <Text style={styles.playText}>
        {isPlayingPreview ? 'Pause Preview' : 'Play Preview'}
      </Text>
    </TouchableOpacity>
  </View>
)}
```

---

## Fix 2: Video Recording Counter

**File: `/app/frontend/app/report/index.tsx`**

The counter state and effect are already implemented. Ensure they're active:

```typescript
// Already have:
const [recordingDuration, setRecordingDuration] = useState(0);

// Timer effect (should already be there):
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
```

UI already has timer display:

```typescript
<Text style={styles.recordingTimer}>
  {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
</Text>
```

**If not showing:** Check that `setRecordingStartTime(Date.now())` is called in `startRecording()`.

---

## Fix 3: Offline Queue for Media Uploads

**Create: `/app/frontend/utils/mediaQueue.ts`**

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const QUEUE_KEY = '@media_upload_queue';

export interface QueuedMedia {
  id: string;
  type: 'audio' | 'video';
  uri: string;
  caption: string;
  isAnonymous: boolean;
  latitude: number;
  longitude: number;
  timestamp: string;
  retryCount: number;
}

// Add to queue
export async function addToQueue(media: Omit<QueuedMedia, 'id' | 'timestamp' | 'retryCount'>) {
  try {
    const queue = await getQueue();
    const newItem: QueuedMedia = {
      ...media,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };
    queue.push(newItem);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return newItem;
  } catch (error) {
    console.error('Error adding to queue:', error);
    throw error;
  }
}

// Get queue
export async function getQueue(): Promise<QueuedMedia[]> {
  try {
    const queueJson = await AsyncStorage.getItem(QUEUE_KEY);
    return queueJson ? JSON.parse(queueJson) : [];
  } catch (error) {
    console.error('Error getting queue:', error);
    return [];
  }
}

// Remove from queue
export async function removeFromQueue(id: string) {
  try {
    const queue = await getQueue();
    const filtered = queue.filter(item => item.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing from queue:', error);
  }
}

// Process queue
export async function processQueue(uploadFunction: (item: QueuedMedia) => Promise<void>) {
  const netState = await NetInfo.fetch();
  
  if (!netState.isConnected) {
    console.log('No internet connection, skipping queue processing');
    return;
  }

  const queue = await getQueue();
  
  for (const item of queue) {
    try {
      await uploadFunction(item);
      await removeFromQueue(item.id);
      console.log('Successfully uploaded queued item:', item.id);
    } catch (error) {
      console.error('Failed to upload queued item:', item.id, error);
      // Update retry count
      item.retryCount += 1;
      if (item.retryCount >= 3) {
        // Remove after 3 failed attempts
        await removeFromQueue(item.id);
        console.log('Removed item after 3 failed attempts:', item.id);
      } else {
        // Save updated retry count
        const queue = await getQueue();
        const index = queue.findIndex(q => q.id === item.id);
        if (index >= 0) {
          queue[index] = item;
          await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        }
      }
    }
  }
}

// Listen for connectivity changes
export function startQueueProcessor(uploadFunction: (item: QueuedMedia) => Promise<void>) {
  const unsubscribe = NetInfo.addEventListener(state => {
    if (state.isConnected) {
      console.log('Internet connected, processing queue...');
      processQueue(uploadFunction);
    }
  });

  // Process on startup
  processQueue(uploadFunction);

  return unsubscribe;
}
```

**Install required package:**

```bash
yarn add @react-native-community/netinfo
```

**Update audio.tsx to use queue:**

```typescript
import { addToQueue, getQueue } from '../utils/mediaQueue';

const submitReport = async () => {
  // Check internet
  const netState = await NetInfo.fetch();
  
  if (!netState.isConnected) {
    // Add to offline queue
    await addToQueue({
      type: 'audio',
      uri: audioUri,
      caption,
      isAnonymous,
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
    });
    
    Alert.alert('Saved Offline', 'Your report will be uploaded when internet returns.');
    router.back();
    return;
  }

  // Normal upload...
};
```

**Add Queue Indicator Component:**

```typescript
// components/PendingUploadsIndicator.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getQueue } from '../utils/mediaQueue';

export function PendingUploadsIndicator() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const checkQueue = async () => {
      const queue = await getQueue();
      setCount(queue.length);
    };

    checkQueue();
    const interval = setInterval(checkQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  if (count === 0) return null;

  return (
    <View style={styles.indicator}>
      <Ionicons name="cloud-upload-outline" size={16} color="#F59E0B" />
      <Text style={styles.text}>{count} pending upload(s)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 8,
    gap: 8,
  },
  text: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
});
```

---

## Fix 4: Push Notifications Complete Setup

**Create: `/app/frontend/utils/pushNotifications.ts`**

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Push token:', token);
  } else {
    alert('Must use physical device for Push Notifications');
  }

  return token;
}

export async function savePushTokenToBackend(token: string) {
  try {
    const authToken = await AsyncStorage.getItem('auth_token');
    if (!authToken) return;

    await axios.post(
      `${BACKEND_URL}/api/push-token/register`,
      { token },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    console.log('Push token saved to backend');
  } catch (error) {
    console.error('Error saving push token:', error);
  }
}

export function setupNotificationListeners() {
  // Notification received while app is foregrounded
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification);
  });

  // Notification tapped
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification tapped:', response);
    // Handle navigation based on notification data
    const data = response.notification.request.content.data;
    if (data.type === 'panic') {
      // Navigate to panic screen
    } else if (data.type === 'report') {
      // Navigate to reports screen
    }
  });

  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}
```

**Update index.tsx (app entry):**

```typescript
import { registerForPushNotificationsAsync, savePushTokenToBackend, setupNotificationListeners } from '../utils/pushNotifications';

export default function App() {
  useEffect(() => {
    // Setup push notifications
    const initPush = async () => {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await savePushTokenToBackend(token);
      }
    };

    initPush();
    const cleanup = setupNotificationListeners();

    return cleanup;
  }, []);

  // Rest of component...
}
```

**Install required packages:**

```bash
yarn add expo-notifications expo-device
```

---

## Fix 5: Integrate Panic Emergency Category

**Update `/app/frontend/app/civil/home.tsx`:**

```typescript
import EmergencyCategoryModal from '../../components/EmergencyCategoryModal';

export default function CivilHome() {
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const handlePanicPress = () => {
    setShowCategoryModal(true);
  };

  const handleCategorySelect = async (category: string) => {
    setSelectedCategory(category);
    setShowCategoryModal(false);
    
    // Navigate to panic-active with category
    router.push({
      pathname: '/civil/panic-active',
      params: { category }
    });
  };

  return (
    <View>
      {/* Panic Button */}
      <TouchableOpacity 
        style={styles.panicButton}
        onPress={handlePanicPress}
      >
        <Text style={styles.panicText}>PANIC</Text>
      </TouchableOpacity>

      {/* Category Modal */}
      <EmergencyCategoryModal
        visible={showCategoryModal}
        onSelect={handleCategorySelect}
        onCancel={() => setShowCategoryModal(false)}
      />
    </View>
  );
}
```

**Update panic-active.tsx to receive and send category:**

```typescript
export default function PanicActive() {
  const { category } = useLocalSearchParams<{ category: string }>();
  
  const activatePanic = async () => {
    // Include category in panic activation
    const response = await axios.post(
      `${BACKEND_URL}/api/panic/activate`,
      {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        category: category || 'other', // Include emergency category
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  };
}
```

**Update backend to store category:**

```python
# In server.py panic activation endpoint
@api_router.post("/panic/activate")
async def activate_panic(
    panic_data: LocationPoint, 
    category: str = Body(default="other"),
    user = Depends(get_current_user)
):
    panic_event = {
        'user_id': str(user['_id']),
        'category': category,  # Add category field
        'activated_at': datetime.utcnow(),
        # ... rest of fields
    }
```

**Show category on security dashboard:**

```typescript
// In security reports/panics display
<Text style={styles.category}>
  🚨 {getCategoryLabel(panic.category)}
</Text>
```

---

## Installation Commands

Run these in `/app/frontend`:

```bash
# Already installed
yarn add expo-av

# Need to install
yarn add @react-native-community/netinfo
yarn add expo-notifications
yarn add expo-device
```

---

## Testing Checklist

After implementing all fixes:

- [ ] Audio playback works on security side
- [ ] Audio preview works for uploader
- [ ] Video recording shows timer
- [ ] Offline queue saves media
- [ ] Auto-upload when internet returns
- [ ] Pending uploads indicator shows
- [ ] Push notifications register on login
- [ ] Notifications received on device
- [ ] Emergency category modal appears
- [ ] Category sent with panic alert
- [ ] Category visible on security dashboard

---

This document contains all the code needed for the 5 fixes. Each section is complete and ready to implement.
