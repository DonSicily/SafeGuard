import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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
        <Stack.Screen name="report/index" options={{ headerShown: false }} />
        <Stack.Screen name="report/audio" options={{ headerShown: false }} />
        <Stack.Screen name="report/list" options={{ headerShown: false }} />
        <Stack.Screen name="premium" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
