import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export const BRAND = '#1857a4';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: BRAND },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#f4f6fb' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Group Decision OS' }} />
        <Stack.Screen name="decisions/index" options={{ title: 'Decisions' }} />
        <Stack.Screen name="decisions/new" options={{ title: 'New Decision' }} />
        <Stack.Screen name="decisions/[id]" options={{ title: 'Decision' }} />
        <Stack.Screen name="invite/[token]" options={{ title: 'Invitation' }} />
      </Stack>
    </>
  );
}
