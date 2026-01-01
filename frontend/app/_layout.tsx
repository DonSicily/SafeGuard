import React, { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { 
  addNotificationReceivedListener, 
  addNotificationResponseListener,
  NotificationData 
} from '../utils/notifications';
import { startQueueProcessor } from '../utils/offlineQueue';

export default function RootLayout() {
  const router = useRouter();
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    // Start offline queue processor
    const stopQueueProcessor = startQueueProcessor();

    // Listen for notifications received while app is foregrounded
    notificationListener.current = addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as NotificationData;
      console.log('Notification received in foreground:', data);
      
      // Show an in-app alert for important notifications
      if (data?.type === 'panic') {
        Alert.alert(
          '🚨 EMERGENCY ALERT',
          notification.request.content.body || 'Panic alert nearby!',
          [
            { text: 'View', onPress: () => router.push('/security/panics') },
            { text: 'Dismiss', style: 'cancel' }
          ]
        );
      }
    });

    // Listen for notification taps (user interacts with notification)
    responseListener.current = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data as NotificationData;
      console.log('Notification tapped:', data);
      
      // Navigate based on notification type
      if (data?.type === 'panic') {
        router.push('/security/panics');
      } else if (data?.type === 'report') {
        router.push('/security/reports');
      }
    });

    return () => {
      stopQueueProcessor();
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0F172A' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ headerShown: false }} />
        <Stack.Screen name="civil/home" options={{ headerShown: false }} />
        <Stack.Screen name="civil/panic-active" options={{ headerShown: false }} />
        <Stack.Screen name="civil/escort" options={{ headerShown: false }} />
        <Stack.Screen name="security/home" options={{ headerShown: false }} />
        <Stack.Screen name="security/set-location" options={{ headerShown: false }} />
        <Stack.Screen name="security/reports" options={{ headerShown: false }} />
        <Stack.Screen name="security/panics" options={{ headerShown: false }} />
        <Stack.Screen name="report/index" options={{ headerShown: false }} />
        <Stack.Screen name="report/audio" options={{ headerShown: false }} />
        <Stack.Screen name="report/list" options={{ headerShown: false }} />
        <Stack.Screen name="premium" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
