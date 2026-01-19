import React, { useEffect, useRef } from 'react';
import { Stack, useRouter, useRootNavigationState } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { startQueueProcessor } from '../utils/offlineQueue';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

type NotificationData = {
  type?: 'panic' | 'report' | 'general' | 'chat';
  event_id?: string;
  report_id?: string;
  conversation_id?: string;
};

// Separate component for notification handling that uses router
function NotificationHandler() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Wait for navigation to be ready
    if (!rootNavigationState?.key) return;

    // Start offline queue processor
    const stopQueueProcessor = startQueueProcessor();

    // Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
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
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as NotificationData;
      console.log('Notification tapped:', data);
      
      // Navigate based on notification type
      if (data?.type === 'panic') {
        router.push('/security/panics');
      } else if (data?.type === 'report') {
        router.push('/security/reports');
      } else if (data?.type === 'chat' && data?.conversation_id) {
        router.push(`/security/chat/${data.conversation_id}`);
      }
    });

    return () => {
      stopQueueProcessor();
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [rootNavigationState?.key]);

  return null;
}

export default function RootLayout() {
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
        <Stack.Screen name="security/nearby" options={{ headerShown: false }} />
        <Stack.Screen name="security/settings" options={{ headerShown: false }} />
        <Stack.Screen name="security/chat/index" options={{ headerShown: false }} />
        <Stack.Screen name="security/chat/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="admin/login" options={{ headerShown: false }} />
        <Stack.Screen name="admin/dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="admin/users" options={{ headerShown: false }} />
        <Stack.Screen name="admin/panics" options={{ headerShown: false }} />
        <Stack.Screen name="admin/reports" options={{ headerShown: false }} />
        <Stack.Screen name="admin/security-map" options={{ headerShown: false }} />
        <Stack.Screen name="admin/invite-codes" options={{ headerShown: false }} />
        <Stack.Screen name="report/index" options={{ headerShown: false }} />
        <Stack.Screen name="report/audio" options={{ headerShown: false }} />
        <Stack.Screen name="report/list" options={{ headerShown: false }} />
        <Stack.Screen name="premium" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
      </Stack>
      <NotificationHandler />
    </SafeAreaProvider>
  );
}
