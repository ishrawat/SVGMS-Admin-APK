import { StyleSheet } from 'react-native';

// ===== MODERN GLASSMORPHISM COLOR SCHEME =====
export const colors = {
  // Primary gradient colors
  primary: '#0a2540',
  primaryLight: '#1e3d59',
  
  // Glass colors
  glassBg: 'rgba(255, 255, 255, 0.12)',
  glassBorder: 'rgba(255, 255, 255, 0.18)',
  glassShadow: 'rgba(255, 255, 255, 0.05)',
  
  // Accent
  accent: '#d4af37',
  accentGlow: 'rgba(212, 175, 55, 0.3)',
  
  // Status
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  
  // Text
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  
  // Background gradient
  gradientStart: '#0a1628',
  gradientEnd: '#1a2a4a',
};

export const globalStyles = StyleSheet.create({
  // Main container with gradient background
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
  },
  
  // Glass card component
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    backdropFilter: 'blur(20px)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 10,
    overflow: 'hidden',
  },
  
  // Glowing accent border
  accentBorder: {
    borderLeftWidth: 4,
    borderLeftColor: '#d4af37',
  },
  
  // Glass input
  glassInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    padding: 14,
    color: '#ffffff',
    fontSize: 15,
    marginBottom: 14,
    backdropFilter: 'blur(10px)',
  },
  
  // Glass button
  glassButton: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  
  // Primary button (solid accent)
  primaryButton: {
    backgroundColor: '#d4af37',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  
  // Text styles
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  
  subheading: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.3,
  },
  
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  
  body: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 22,
  },
  
  // Utility
  flexCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  gap: (size: number) => ({
    gap: size,
  }),
  
  padding: (size: number) => ({
    padding: size,
  }),
  
  margin: (size: number) => ({
    margin: size,
  }),
});