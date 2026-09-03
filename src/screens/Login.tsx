import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { colors, globalStyles } from '../styles/global';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setMessage('Please enter email and password');
      return;
    }

    setLoading(true);
    setMessage('Logging in...');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (!userDoc.exists()) {
        const studentDoc = await getDoc(doc(db, 'students', user.uid));
        if (studentDoc.exists() && studentDoc.data()?.role === 'student') {
          await auth.signOut();
          setMessage('Students cannot access admin panel');
          setLoading(false);
          return;
        }
        setMessage('No staff account found');
        setLoading(false);
        await auth.signOut();
        return;
      }

      const userData = userDoc.data();
      if (userData.role !== 'staff' && userData.role !== 'admin') {
        await auth.signOut();
        setMessage('Access denied. Staff or Admin only.');
        setLoading(false);
        return;
      }

      setMessage('Login successful!');
      setLoading(false);
      navigation.replace('AdminDashboard');

    } catch (error: any) {
      setMessage(error.message);
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      style={styles.container}
      colors={['#0a1628', '#1a2a4a', '#0a1628']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.loginContainer}>
          {/* Animated glow behind logo */}
          <View style={styles.glowContainer}>
            <View style={styles.glowOrb} />
          </View>

          {/* Glass Card */}
          <View style={[globalStyles.glassCard, styles.loginCard]}>
            {/* Decorative accent line */}
            <View style={styles.accentLine} />

            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logo}
            />

            <Text style={globalStyles.heading}>Welcome Back</Text>
            <Text style={[globalStyles.subheading, styles.loginSubtitle]}>
              SVGMS Bhim Administration
            </Text>

            <TextInput
              style={[globalStyles.glassInput, styles.input]}
              placeholder="Email address"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TextInput
              style={[globalStyles.glassInput, styles.input]}
              placeholder="Password"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[globalStyles.primaryButton, styles.loginButton]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#0a1628" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {message ? (
              <Text style={[
                styles.message,
                message.includes('successful') ? styles.success : styles.error
              ]}>
                {message}
              </Text>
            ) : null}

            {/* Decorative bottom elements */}
            <View style={styles.decorativeDots}>
              <View style={[styles.dot, styles.dotActive]} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  glowContainer: {
    position: 'absolute',
    top: -100,
    right: -100,
  },
  glowOrb: {
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 100,
    elevation: 100,
  },
  loginCard: {
    width: '100%',
    maxWidth: 420,
    padding: 32,
    position: 'relative',
    overflow: 'hidden',
  },
  accentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: 4,
    backgroundColor: '#d4af37',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  loginSubtitle: {
    marginBottom: 28,
    textAlign: 'center',
  },
  input: {
    width: '100%',
  },
  loginButton: {
    width: '100%',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#0a1628',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  message: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 14,
  },
  success: {
    color: '#10b981',
  },
  error: {
    color: '#ef4444',
  },
  decorativeDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dotActive: {
    backgroundColor: '#d4af37',
    width: 20,
  },
});