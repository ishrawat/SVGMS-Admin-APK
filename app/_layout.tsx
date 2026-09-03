import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack>
        {/* Auth - No header */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        
        {/* Dashboard */}
        <Stack.Screen 
          name="admin" 
          options={{ 
            title: 'SVGMS Admin',
            headerStyle: { backgroundColor: '#0a1628' },
            headerTintColor: '#ffffff',
          }} 
        />
        
        {/* All Admin Features */}
        <Stack.Screen name="admin-gallery" options={{ title: 'Gallery', headerStyle: { backgroundColor: '#0a1628' }, headerTintColor: '#ffffff', headerBackTitle: 'Dashboard' }} />
        <Stack.Screen name="admin-notices" options={{ title: 'Notices', headerStyle: { backgroundColor: '#0a1628' }, headerTintColor: '#ffffff', headerBackTitle: 'Dashboard' }} />
        <Stack.Screen name="admin-students" options={{ title: 'Students', headerStyle: { backgroundColor: '#0a1628' }, headerTintColor: '#ffffff', headerBackTitle: 'Dashboard' }} />
        <Stack.Screen name="admin-employees" options={{ title: 'Employees', headerStyle: { backgroundColor: '#0a1628' }, headerTintColor: '#ffffff', headerBackTitle: 'Dashboard' }} />
        <Stack.Screen name="admin-awards" options={{ title: 'Awards', headerStyle: { backgroundColor: '#0a1628' }, headerTintColor: '#ffffff', headerBackTitle: 'Dashboard' }} />
        <Stack.Screen name="admin-bhamashah" options={{ title: 'Bhamashah', headerStyle: { backgroundColor: '#0a1628' }, headerTintColor: '#ffffff', headerBackTitle: 'Dashboard' }} />
        <Stack.Screen name="admin-skills" options={{ title: 'Skills', headerStyle: { backgroundColor: '#0a1628' }, headerTintColor: '#ffffff', headerBackTitle: 'Dashboard' }} />
        <Stack.Screen name="admin-thought" options={{ title: 'Thought of Day', headerStyle: { backgroundColor: '#0a1628' }, headerTintColor: '#ffffff', headerBackTitle: 'Dashboard' }} />
        <Stack.Screen name="admin-ticker" options={{ title: 'Ticker', headerStyle: { backgroundColor: '#0a1628' }, headerTintColor: '#ffffff', headerBackTitle: 'Dashboard' }} />
        <Stack.Screen name="admin-shortlist" options={{ title: 'Shortlist', headerStyle: { backgroundColor: '#0a1628' }, headerTintColor: '#ffffff', headerBackTitle: 'Dashboard' }} />
      </Stack>
    </>
  );
}