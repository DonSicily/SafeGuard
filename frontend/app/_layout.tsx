import React, { useEffect, useRef, useState } from 'react';
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { startQueueProcessor } from '../utils/offlineQueue';
import { useNavigationContainerRef, CommonActions } from '@react-navigation/native';

// Configure notification handler ONCE at module level
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type NotificationData = {
  type?: 'panic' | 'report' | 'general' | 'chat';
  event_id?: string;
  report_id?: string;
  conversation_id?: string;
};

export default function RootLayout() {
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const navigationRef = useNavigationContainerRef();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const queueCleanup = useRef<(() => void) | null>(null);

  // Handle navigation state changes
  useEffect(() => {
    if (navigationRef?.current) {
      setIsNavigationReady(true);
    }
  }, [navigationRef]);

  // Initialize offline queue processor (no navigation required)
  useEffect(() => {
    queueCleanup.current = startQueueProcessor();
    
    return () => {
      if (queueCleanup.current) {
        queueCleanup.current();
      }
    };
  }, []);

  // Set up notification listeners (only when navigation is ready)
  useEffect(() => {
    if (!isNavigationReady) return;

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
            { 
              text: 'View', 
              onPress: () => {
                if (navigationRef?.current?.isReady()) {
                  navigationRef.current.dispatch(
                    CommonActions.navigate({ name: 'security/panics' })
                  );
                }
              } 
            },
            { text: 'Dismiss', style: 'cancel' }
          ]
        );
      }
    });

    // Listen for notification taps (user interacts with notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as NotificationData;
      console.log('Notification tapped:', data);
      
      if (!navigationRef?.current?.isReady()) return;
      
      // Navigate based on notification type
      if (data?.type === 'panic') {
        navigationRef.current.dispatch(
          CommonActions.navigate({ name: 'security/panics' })
        );
      } else if (data?.type === 'report') {
        navigationRef.current.dispatch(
          CommonActions.navigate({ name: 'security/reports' })
        );
      } else if (data?.type === 'chat' && data?.conversation_id) {
        navigationRef.current.dispatch(
          CommonActions.navigate({ 
            name: 'security/chat/[id]',
            params: { id: data.conversation_id }
          })
        );
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [isNavigationReady]);

  return (
    <SafeAreaProvider>
      <Slot />
    </SafeAreaProvider>
  );
}
