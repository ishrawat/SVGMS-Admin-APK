import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  FlatList,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../src/firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import Icon from '@expo/vector-icons/Feather';
import { globalStyles } from '../../src/styles/global';

const { width } = Dimensions.get('window');

interface DashboardCard {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  route: string;
  badge?: string;
  gradient: string[];
}

// ===== ALL CARDS WITH ROUTES =====
const cards: DashboardCard[] = [
  {
    id: 'gallery',
    title: 'Gallery',
    subtitle: 'Upload & manage images',
    icon: 'image',
    route: '/admin-gallery',
    badge: 'Active',
    gradient: ['rgba(212, 175, 55, 0.15)', 'rgba(212, 175, 55, 0.05)'],
  },
  {
    id: 'notices',
    title: 'Notices',
    subtitle: 'Upload PDF notices',
    icon: 'file-text',
    route: '/admin-notices',
    badge: 'Active',
    gradient: ['rgba(59, 130, 246, 0.15)', 'rgba(59, 130, 246, 0.05)'],
  },
  {
    id: 'students',
    title: 'Student Management',
    subtitle: 'Manage students & activity',
    icon: 'users',
    route: '/admin-students',
    badge: 'Active',
    gradient: ['rgba(16, 185, 129, 0.15)', 'rgba(16, 185, 129, 0.05)'],
  },
  {
    id: 'employees',
    title: 'Employee Management',
    subtitle: 'Manage staff & teachers',
    icon: 'user-plus',
    route: '/admin-employees',
    badge: 'Active',
    gradient: ['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0.05)'],
  },
  
  {
    id: 'awards',
    title: 'Awards',
    subtitle: 'Manage achievements',
    icon: 'award',
    route: '/admin-awards',
    badge: 'Active',
    gradient: ['rgba(236, 72, 153, 0.15)', 'rgba(236, 72, 153, 0.05)'],
  },
  {
    id: 'bhamashah',
    title: 'Bhamashah',
    subtitle: 'Manage donors',
    icon: 'heart',
    route: '/admin-bhamashah',
    badge: 'Active',
    gradient: ['rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.05)'],
  },
  {
    id: 'skills',
    title: 'Free Skills',
    subtitle: 'Manage skill resources',
    icon: 'cpu',
    route: '/admin-skills',
    badge: 'Active',
    gradient: ['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0.05)'],
  },
  {
    id: 'thought',
    title: 'Thought of Day',
    subtitle: 'Update daily thought',
    icon: 'message-circle',
    route: '/admin-thought',
    badge: 'Active',
    gradient: ['rgba(236, 72, 153, 0.15)', 'rgba(236, 72, 153, 0.05)'],
  },
  {
    id: 'ticker',
    title: 'Ticker',
    subtitle: 'Manage scrolling news',
    icon: 'trending-up',
    route: '/admin-ticker',
    badge: 'Active',
    gradient: ['rgba(59, 130, 246, 0.15)', 'rgba(59, 130, 246, 0.05)'],
  },
  {
    id: 'shortlist',
    title: 'Shortlist',
    subtitle: 'Admission shortlists',
    icon: 'list',
    route: '/admin-shortlist',
    badge: 'Active',
    gradient: ['rgba(16, 185, 129, 0.15)', 'rgba(16, 185, 129, 0.05)'],
  },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');
  const [stats, setStats] = useState({
    posts: 0,
    notices: 0,
    events: 0,
    exams: 0,
    achievements: 0,
  });

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserEmail(user.email || '');
    }
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'posts'));
      let posts = 0, notices = 0, events = 0, exams = 0, achievements = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        posts++;
        if (data.category === 'Notice' || data.category === 'Notices') notices++;
        else if (data.category === 'Event') events++;
        else if (data.category === 'Exam Update') exams++;
        else if (data.category === 'Achievement') achievements++;
      });

      setStats({ posts, notices, events, exams, achievements });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              router.replace('/login');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  const handleCardPress = (card: DashboardCard) => {
    if (card.badge === 'Coming Soon') {
      Alert.alert('Coming Soon', `${card.title} feature is under development.`);
      return;
    }
    router.push(card.route);
  };

  const renderCard = ({ item }: { item: DashboardCard }) => (
    <TouchableOpacity
      style={styles.cardWrapper}
      onPress={() => handleCardPress(item)}
      activeOpacity={0.8}
    >
      <LinearGradient
        style={styles.card}
        colors={item.gradient as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.iconContainer}>
          <Icon name={item.icon as any} size={22} color="#d4af37" />
        </View>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
        {item.badge && (
          <View style={[
            styles.badge,
            item.badge === 'Active' ? styles.badgeActive : styles.badgeComing
          ]}>
            <Text style={[
              styles.badgeText,
              item.badge === 'Active' ? styles.badgeTextActive : styles.badgeTextComing
            ]}>
              {item.badge}
            </Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderStat = (label: string, value: number, icon: string) => (
    <View style={styles.statItem}>
      <Icon name={icon as any} size={16} color="#d4af37" />
      <Text style={styles.statNumber}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <LinearGradient
      style={globalStyles.container}
      colors={['#0a1628', '#1a2a4a', '#0a1628']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.wrapper}>
          {/* Header */}
          <View style={[globalStyles.glassCard, styles.header]}>
            <View style={styles.headerTop}>
              <View style={styles.brand}>
                <Image
                  source={require('../../assets/images/logo.png')}
                  style={styles.logo}
                />
                <View>
                  <Text style={styles.brandTitle}>SVGMS Admin</Text>
                  <Text style={styles.brandSubtitle}>
                    Swami Vivekanand Model School
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Icon name="log-out" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.userRow}>
              <Icon name="mail" size={14} color="rgba(255,255,255,0.4)" />
              <Text style={styles.userEmail}>{userEmail}</Text>
            </View>
          </View>

          {/* Welcome Banner */}
          <View style={[globalStyles.glassCard, styles.welcomeBanner]}>
            <LinearGradient
              style={styles.welcomeGradient}
              colors={['rgba(212, 175, 55, 0.1)', 'rgba(212, 175, 55, 0.02)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.welcomeTitle}>Welcome back, Teacher</Text>
              <Text style={styles.welcomeSubtitle}>
                Manage school content, students, and staff from one place.
              </Text>
            </LinearGradient>
          </View>

          {/* Dashboard Grid */}
          <FlatList
            data={cards}
            renderItem={renderCard}
            keyExtractor={(item) => item.id}
            numColumns={3}
            scrollEnabled={false}
            contentContainerStyle={styles.grid}
          />

          {/* Quick Stats */}
          <View style={[globalStyles.glassCard, styles.statsContainer]}>
            <Text style={styles.statsTitle}>Quick Stats</Text>
            <View style={styles.statsGrid}>
              {renderStat('Posts', stats.posts, 'file-text')}
              {renderStat('Notices', stats.notices, 'bell')}
              {renderStat('Events', stats.events, 'calendar')}
              {renderStat('Exams', stats.exams, 'book-open')}
              {renderStat('Achievements', stats.achievements, 'award')}
            </View>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  wrapper: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    padding: 20,
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  brandSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.2,
  },
  logoutButton: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  userEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  welcomeBanner: {
    padding: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  welcomeGradient: {
    padding: 0,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
  },
  grid: {
    paddingVertical: 4,
  },
  cardWrapper: {
    flex: 1,
    margin: 4,
  },
  card: {
    minHeight: 110,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  cardSubtitle: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  badgeComing: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  badgeText: {
    fontSize: 7,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  badgeTextActive: {
    color: '#10b981',
  },
  badgeTextComing: {
    color: '#f59e0b',
  },
  statsContainer: {
    padding: 20,
    marginTop: 8,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statItem: {
    flex: 1,
    minWidth: 60,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
    letterSpacing: 0.2,
  },
});