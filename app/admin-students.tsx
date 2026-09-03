import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { auth, db } from '../../src/firebase/config';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import Icon from '@expo/vector-icons/Feather';
import { globalStyles } from '../../src/styles/global';

interface Student {
  id: string;
  uid: string;
  name: string;
  class: string;
  rollNo: number;
  email: string;
  totalPoints: number;
  streak: number;
  isBanned: boolean;
  joinedDate: string;
  achievements: string[];
}

const CLASS_OPTIONS = [
  '8-A', '8-B', '9-A', '9-B', '10-A', '10-B', '11-A', '11-B', '12-A', '12-B',
];

export default function AdminStudentsScreen() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'loading'>('success');

  // Form states
  const [name, setName] = useState('');
  const [studentClass, setStudentClass] = useState('8-A');
  const [rollNo, setRollNo] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.replace('/login');
      }
    });

    loadStudents();

    return () => unsubscribe();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(
        query(collection(db, 'students'), orderBy('name'))
      );
      
      const studentsData: Student[] = [];
      snapshot.forEach((doc) => {
        studentsData.push({ id: doc.id, ...doc.data() } as Student);
      });
      
      setStudents(studentsData);
      setFilteredStudents(studentsData);
    } catch (error) {
      console.error('Error loading students:', error);
      Alert.alert('Error', 'Failed to load students');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadStudents();
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredStudents(students);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = students.filter(
      (s) =>
        (s.name || '').toLowerCase().includes(lowerQuery) ||
        (s.class || '').toLowerCase().includes(lowerQuery) ||
        (s.email || '').toLowerCase().includes(lowerQuery)
    );
    setFilteredStudents(filtered);
  };

  const createStudent = async () => {
    if (!name || !email || !password || !rollNo) {
      setMessage('Please fill in all required fields');
      setMessageType('error');
      return;
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters');
      setMessageType('error');
      return;
    }

    setCreating(true);
    setMessage('Creating account...');
    setMessageType('loading');

    try {
      // 1. Create Auth Account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Save to Firestore
      await addDoc(collection(db, 'students'), {
        uid: user.uid,
        name: name.trim(),
        class: studentClass,
        rollNo: parseInt(rollNo),
        email: email.trim(),
        totalPoints: 0,
        streak: 0,
        isBanned: false,
        joinedDate: new Date().toISOString(),
        achievements: [],
      });

      // Sign out the created user and sign back in as admin
      await auth.signOut();
      // Re-login as admin (stored in localStorage handled by Firebase)
      
      setMessage('✅ Student created successfully!');
      setMessageType('success');

      setTimeout(() => {
        setModalVisible(false);
        setCreating(false);
        resetForm();
        loadStudents();
        setMessage('');
      }, 1500);
    } catch (error: any) {
      console.error('Create student error:', error);
      setMessage('❌ ' + (error.message || 'Failed to create student'));
      setMessageType('error');
      setCreating(false);
    }
  };

  const resetForm = () => {
    setName('');
    setStudentClass('8-A');
    setRollNo('');
    setEmail('');
    setPassword('');
    setMessage('');
  };

  const toggleBan = async (studentId: string, currentBanStatus: boolean) => {
    const action = currentBanStatus ? 'unban' : 'ban';
    Alert.alert(
      currentBanStatus ? 'Unban Student' : 'Ban Student',
      `Are you sure you want to ${action} this student?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: currentBanStatus ? 'Unban' : 'Ban',
          style: currentBanStatus ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'students', studentId), {
                isBanned: !currentBanStatus,
                bannedReason: !currentBanStatus ? 'Banned by admin' : '',
                bannedAt: !currentBanStatus ? new Date().toISOString() : null,
              });

              Alert.alert('Success', `Student ${action}ed successfully`);
              loadStudents();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to toggle ban');
            }
          },
        },
      ]
    );
  };

  const deleteStudent = async (studentId: string, studentName: string) => {
    Alert.alert(
      'Delete Student',
      `Are you sure you want to permanently delete "${studentName}"? This cannot be undone!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'students', studentId));
              Alert.alert('Success', 'Student deleted successfully');
              loadStudents();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete student');
            }
          },
        },
      ]
    );
  };

  const getStatusBadgeStyle = (isBanned: boolean) => {
    return isBanned ? styles.statusBanned : styles.statusActive;
  };

  const getStatusText = (isBanned: boolean) => {
    return isBanned ? '🔴 Banned' : '🟢 Active';
  };

  const renderStudent = ({ item, index }: { item: Student; index: number }) => (
    <LinearGradient
      style={[
        styles.studentCard,
        item.isBanned && styles.studentCardBanned,
      ]}
      colors={item.isBanned 
        ? ['rgba(239, 68, 68, 0.08)', 'rgba(239, 68, 68, 0.02)']
        : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.cardRow}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardIndex}>#{index + 1}</Text>
          <View>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardDetails}>
              {item.class} • Roll #{item.rollNo}
            </Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.statusBadge, getStatusBadgeStyle(item.isBanned)]}>
            <Text style={styles.statusText}>{getStatusText(item.isBanned)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardRow}>
        <View style={styles.cardMeta}>
          <Icon name="mail" size={14} color="rgba(255,255,255,0.4)" />
          <Text style={styles.cardMetaText}>{item.email}</Text>
        </View>
        <View style={styles.cardMeta}>
          <Icon name="star" size={14} color="#d4af37" />
          <Text style={styles.cardMetaText}>{item.totalPoints || 0} pts</Text>
        </View>
        <View style={styles.cardMeta}>
          <Icon name="zap" size={14} color="#f59e0b" />
          <Text style={styles.cardMetaText}>{item.streak || 0} streak</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionView]}
          onPress={() => Alert.alert('Student Activity', `Viewing activity for ${item.name}`)}
        >
          <Icon name="bar-chart-2" size={14} color="#60a5fa" />
          <Text style={styles.actionViewText}>Activity</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, item.isBanned ? styles.actionUnban : styles.actionBan]}
          onPress={() => toggleBan(item.id, item.isBanned)}
        >
          <Icon name={item.isBanned ? "check-circle" : "slash"} size={14} color={item.isBanned ? "#10b981" : "#f59e0b"} />
          <Text style={[styles.actionText, item.isBanned ? styles.actionUnbanText : styles.actionBanText]}>
            {item.isBanned ? 'Unban' : 'Ban'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionDelete]}
          onPress={() => deleteStudent(item.id, item.name)}
        >
          <Icon name="trash-2" size={14} color="#ef4444" />
          <Text style={styles.actionDeleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  return (
    <LinearGradient
      style={globalStyles.container}
      colors={['#0a1628', '#1a2a4a', '#0a1628']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#d4af37" />
        }
      >
        <View style={styles.wrapper}>
          {/* Header */}
          <View style={[globalStyles.glassCard, styles.header]}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.headerTitle}>👥 Student Management</Text>
                <Text style={styles.headerSubtitle}>Manage student accounts & activity</Text>
              </View>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.push('/admin')}
              >
                <Icon name="arrow-left" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={[globalStyles.glassCard, styles.statBox]}>
              <Text style={styles.statNumber}>{students.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={[globalStyles.glassCard, styles.statBox, styles.statActive]}>
              <Text style={[styles.statNumber, styles.statActiveNumber]}>
                {students.filter(s => !s.isBanned).length}
              </Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={[globalStyles.glassCard, styles.statBox, styles.statBanned]}>
              <Text style={[styles.statNumber, styles.statBannedNumber]}>
                {students.filter(s => s.isBanned).length}
              </Text>
              <Text style={styles.statLabel}>Banned</Text>
            </View>
          </View>

          {/* Search & Create */}
          <View style={[globalStyles.glassCard, styles.toolbar]}>
            <View style={styles.searchContainer}>
              <Icon name="search" size={16} color="rgba(255,255,255,0.4)" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, class, email..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={searchQuery}
                onChangeText={handleSearch}
              />
            </View>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setModalVisible(true)}
            >
              <Icon name="plus" size={18} color="#0a1628" />
              <Text style={styles.createButtonText}>Create</Text>
            </TouchableOpacity>
          </View>

          {/* Student List */}
          <View style={[globalStyles.glassCard, styles.listContainer]}>
            <Text style={styles.listTitle}>
              Students ({filteredStudents.length})
            </Text>

            {loading ? (
              <ActivityIndicator size="large" color="#d4af37" style={styles.loader} />
            ) : filteredStudents.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>👀</Text>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No students match your search' : 'No students added yet'}
                </Text>
                {!searchQuery && (
                  <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={() => setModalVisible(true)}
                  >
                    <Text style={styles.emptyButtonText}>Add Your First Student</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <FlatList
                data={filteredStudents}
                renderItem={renderStudent}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            )}
          </View>
        </View>
      </ScrollView>

      {/* Create Student Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setModalVisible(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[globalStyles.glassCard, styles.modalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>➕ Create Student</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <Icon name="x" size={24} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>

            {message ? (
              <View style={[
                styles.messageContainer,
                messageType === 'success' && styles.messageSuccess,
                messageType === 'error' && styles.messageError,
                messageType === 'loading' && styles.messageLoading,
              ]}>
                <Text style={styles.messageText}>{message}</Text>
              </View>
            ) : null}

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalLabel}>Full Name *</Text>
              <TextInput
                style={[globalStyles.glassInput, styles.modalInput]}
                placeholder="e.g., Priya Singh"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.modalLabel}>Class *</Text>
              <View style={styles.classPicker}>
                {CLASS_OPTIONS.map((cls) => (
                  <TouchableOpacity
                    key={cls}
                    style={[
                      styles.classOption,
                      studentClass === cls && styles.classOptionActive,
                    ]}
                    onPress={() => setStudentClass(cls)}
                  >
                    <Text style={[
                      styles.classOptionText,
                      studentClass === cls && styles.classOptionTextActive,
                    ]}>
                      {cls}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Roll Number *</Text>
              <TextInput
                style={[globalStyles.glassInput, styles.modalInput]}
                placeholder="e.g., 15"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={rollNo}
                onChangeText={setRollNo}
                keyboardType="numeric"
              />

              <Text style={styles.modalLabel}>Email *</Text>
              <TextInput
                style={[globalStyles.glassInput, styles.modalInput]}
                placeholder="student@email.com"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.modalLabel}>Password *</Text>
              <TextInput
                style={[globalStyles.glassInput, styles.modalInput]}
                placeholder="Min 6 characters"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[globalStyles.primaryButton, styles.modalSaveButton]}
                  onPress={createStudent}
                  disabled={creating}
                >
                  {creating ? (
                    <ActivityIndicator color="#0a1628" />
                  ) : (
                    <Text style={styles.modalSaveButtonText}>➕ Create Account</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setModalVisible(false);
                    resetForm();
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  statActive: {
    borderTopWidth: 3,
    borderTopColor: '#10b981',
  },
  statBanned: {
    borderTopWidth: 3,
    borderTopColor: '#ef4444',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  statActiveNumber: {
    color: '#10b981',
  },
  statBannedNumber: {
    color: '#ef4444',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    color: '#ffffff',
    fontSize: 14,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d4af37',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 4,
  },
  createButtonText: {
    color: '#0a1628',
    fontWeight: '600',
    fontSize: 14,
  },
  listContainer: {
    padding: 16,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  loader: {
    marginTop: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 16,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  emptyButtonText: {
    color: '#d4af37',
    fontWeight: '500',
  },
  studentCard: {
    padding: 14,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  studentCardBanned: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardIndex: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '600',
    minWidth: 30,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  cardDetails: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusBanned: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardMetaText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  actionView: {
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
  },
  actionViewText: {
    fontSize: 11,
    color: '#60a5fa',
    fontWeight: '500',
  },
  actionBan: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  actionBanText: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '500',
  },
  actionUnban: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  actionUnbanText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '500',
  },
  actionDelete: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  actionDeleteText: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '500',
  },
  actionText: {
    fontSize: 11,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  modalInput: {
    marginBottom: 12,
  },
  classPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  classOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  classOptionActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  classOptionText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  classOptionTextActive: {
    color: '#d4af37',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalSaveButton: {
    flex: 2,
    paddingVertical: 12,
  },
  modalSaveButtonText: {
    color: '#0a1628',
    fontSize: 14,
    fontWeight: '700',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalCancelText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  messageContainer: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  messageSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderLeftColor: '#10b981',
  },
  messageError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderLeftColor: '#ef4444',
  },
  messageLoading: {
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    borderLeftColor: '#6b7280',
  },
  messageText: {
    color: '#ffffff',
    fontSize: 13,
  },
});