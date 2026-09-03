import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
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
} from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import Icon from '@expo/vector-icons/Feather';
import { globalStyles } from '../../src/styles/global';

interface Employee {
  id: string;
  name: string;
  post: string;
  qualification: string;
  department: string;
  email: string;
  phone: string;
  joiningDate: string;
  leavingDate?: string;
  status: 'active' | 'left';
  photoURL?: string;
  legacyMessage?: string;
  createdAt: string;
  addedBy: string;
}

const POST_OPTIONS = [
  'Principal',
  'Sr. Teacher',
  'Sr. Lecturer',
  'Teacher',
  'Lecturer',
  'Staff',
  'Other',
];

const DEPARTMENTS = [
  'Science',
  'Arts',
  'Commerce',
  'Mathematics',
  'Languages',
  'Administration',
  'Sports',
  'Other',
];

// Cloudinary config
const CLOUDINARY = {
  cloudName: 'zh3vg8mi',
  uploadPreset: 'school_notices',
};

export default function AdminEmployeesScreen() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [legacyModalVisible, setLegacyModalVisible] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0, legacy: 0 });

  // Form states
  const [name, setName] = useState('');
  const [post, setPost] = useState('');
  const [qualification, setQualification] = useState('');
  const [department, setDepartment] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [leavingDate, setLeavingDate] = useState('');
  const [legacyMessage, setLegacyMessage] = useState('');
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'legacy' | 'all'>('all');
  const [selectedPost, setSelectedPost] = useState('all');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.replace('/login');
      }
    });

    loadEmployees();

    return () => unsubscribe();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(
        query(collection(db, 'employees'), orderBy('name'))
      );
      
      const employeesData: Employee[] = [];
      snapshot.forEach((doc) => {
        employeesData.push({ id: doc.id, ...doc.data() } as Employee);
      });
      
      setEmployees(employeesData);
      updateStats(employeesData);
    } catch (error) {
      console.error('Error loading employees:', error);
      Alert.alert('Error', 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (data: Employee[]) => {
    const active = data.filter(e => e.status !== 'left');
    const legacy = data.filter(e => e.status === 'left');
    setStats({
      total: data.length,
      active: active.length,
      legacy: legacy.length,
    });
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: false,
    });

    if (!result.canceled) {
      setPhotoURL(result.assets[0].uri);
    }
  };

  const uploadToCloudinary = async (uri: string) => {
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      } as any);
      formData.append('upload_preset', CLOUDINARY.uploadPreset);
      formData.append('resource_type', 'auto');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/upload`,
        {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const data = await response.json();

      if (!data.secure_url) {
        throw new Error(data.error?.message || 'Upload failed');
      }

      return data.secure_url;
    } catch (error: any) {
      console.error('Upload error:', error);
      throw new Error(error.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const saveEmployee = async () => {
    if (!name || !post || !qualification || !joiningDate) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      let uploadedPhotoURL = photoURL;

      // If photo is selected and it's not already a URL (i.e., it's a local file)
      if (photoURL && !photoURL.startsWith('http')) {
        uploadedPhotoURL = await uploadToCloudinary(photoURL);
      }

      const employeeData = {
        name: name.trim(),
        post: post,
        qualification: qualification.trim(),
        department: department.trim() || '',
        email: email.trim() || '',
        phone: phone.trim() || '',
        joiningDate: joiningDate,
        status: 'active' as const,
        addedBy: auth.currentUser?.email || 'admin',
        createdAt: new Date().toISOString(),
        ...(uploadedPhotoURL ? { photoURL: uploadedPhotoURL } : {}),
      };

      if (editingId) {
        await updateDoc(doc(db, 'employees', editingId), {
          ...employeeData,
          updatedAt: new Date().toISOString(),
        });
        Alert.alert('Success', 'Employee updated successfully');
      } else {
        await addDoc(collection(db, 'employees'), employeeData);
        Alert.alert('Success', 'Employee added successfully');
      }

      closeModal();
      await loadEmployees();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save employee');
    }
  };

  const markAsLegacy = async () => {
    if (!selectedEmployeeId || !leavingDate) {
      Alert.alert('Error', 'Please select a leaving date');
      return;
    }

    try {
      await updateDoc(doc(db, 'employees', selectedEmployeeId), {
        status: 'left',
        leavingDate: leavingDate,
        legacyMessage: legacyMessage.trim() || '',
        updatedAt: new Date().toISOString(),
      });

      Alert.alert('Success', 'Employee marked as Legacy Member');
      closeLegacyModal();
      await loadEmployees();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to mark as legacy');
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setPost('');
    setQualification('');
    setDepartment('');
    setEmail('');
    setPhone('');
    setJoiningDate('');
    setPhotoURL(null);
    setModalVisible(true);
  };

  const openEditModal = (employee: Employee) => {
    setEditingId(employee.id);
    setName(employee.name || '');
    setPost(employee.post || '');
    setQualification(employee.qualification || '');
    setDepartment(employee.department || '');
    setEmail(employee.email || '');
    setPhone(employee.phone || '');
    setJoiningDate(employee.joiningDate || '');
    setPhotoURL(employee.photoURL || null);
    setModalVisible(true);
  };

  const openLegacyModal = (id: string) => {
    setSelectedEmployeeId(id);
    setLeavingDate(new Date().toISOString().split('T')[0]);
    setLegacyMessage('');
    setLegacyModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setName('');
    setPost('');
    setQualification('');
    setDepartment('');
    setEmail('');
    setPhone('');
    setJoiningDate('');
    setPhotoURL(null);
  };

  const closeLegacyModal = () => {
    setLegacyModalVisible(false);
    setSelectedEmployeeId(null);
    setLeavingDate('');
    setLegacyMessage('');
  };

  const getFilteredEmployees = () => {
    let filtered = [...employees];

    // Tab filter
    if (activeTab === 'active') {
      filtered = filtered.filter(e => e.status !== 'left');
    } else if (activeTab === 'legacy') {
      filtered = filtered.filter(e => e.status === 'left');
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        (e.name || '').toLowerCase().includes(query) ||
        (e.post || '').toLowerCase().includes(query) ||
        (e.department || '').toLowerCase().includes(query)
      );
    }

    // Post filter
    if (selectedPost !== 'all') {
      filtered = filtered.filter(e => e.post === selectedPost);
    }

    return filtered;
  };

  const getUniquePosts = () => {
    const posts = new Set(employees.map(e => e.post).filter(Boolean));
    return ['all', ...Array.from(posts)] as string[];
  };

  const getEmployeeInitials = (name: string) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  const renderEmployeeCard = ({ item }: { item: Employee }) => {
    const isLegacy = item.status === 'left';
    const experience = isLegacy ? 'Legacy Member' : 'Active';

    return (
      <LinearGradient
        style={[
          styles.card,
          isLegacy ? styles.legacyCard : styles.activeCard,
        ]}
        colors={isLegacy 
          ? ['rgba(212, 175, 55, 0.08)', 'rgba(212, 175, 55, 0.02)'] 
          : ['rgba(16, 185, 129, 0.08)', 'rgba(16, 185, 129, 0.02)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            {item.photoURL ? (
              <Image source={{ uri: item.photoURL }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{getEmployeeInitials(item.name)}</Text>
              </View>
            )}
            <View>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={[styles.cardPost, isLegacy && styles.legacyPost]}>
                {isLegacy ? 'Former ' : ''}{item.post}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, isLegacy ? styles.legacyBadge : styles.activeBadge]}>
            <Text style={styles.statusBadgeText}>{isLegacy ? '🏅 Legacy' : '🟢 Active'}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardQualification}>{item.qualification || 'Qualification not specified'}</Text>
          <View style={styles.cardDetails}>
            <Text style={styles.cardDetail}>
              📅 {isLegacy && item.joiningDate && item.leavingDate
                ? `${formatDate(item.joiningDate)} → ${formatDate(item.leavingDate)}`
                : `Joined: ${formatDate(item.joiningDate)}`
              }
            </Text>
            {item.department && (
              <Text style={styles.cardDetail}>🏢 {item.department}</Text>
            )}
          </View>
          {isLegacy && item.legacyMessage && (
            <View style={styles.legacyMessageContainer}>
              <Text style={styles.legacyQuote}>❝</Text>
              <Text style={styles.legacyMessageText}>{item.legacyMessage}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardActions}>
          {!isLegacy && (
            <>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => openEditModal(item)}
              >
                <Icon name="edit-2" size={14} color="#60a5fa" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.legacyActionButton}
                onPress={() => openLegacyModal(item.id)}
              >
                <Icon name="award" size={14} color="#d4af37" />
                <Text style={styles.legacyActionText}>Mark Legacy</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </LinearGradient>
    );
  };

  const filteredEmployees = getFilteredEmployees();

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
              <View>
                <Text style={styles.headerTitle}>👤 Employee Management</Text>
                <Text style={styles.headerSubtitle}>Manage staff, teachers & personnel</Text>
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
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={[globalStyles.glassCard, styles.statBox, styles.statActive]}>
              <Text style={[styles.statNumber, styles.statActiveNumber]}>{stats.active}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={[globalStyles.glassCard, styles.statBox, styles.statLegacy]}>
              <Text style={[styles.statNumber, styles.statLegacyNumber]}>{stats.legacy}</Text>
              <Text style={styles.statLabel}>Legacy</Text>
            </View>
            <TouchableOpacity
              style={[globalStyles.glassCard, styles.statBox, styles.statAdd]}
              onPress={openAddModal}
            >
              <Text style={styles.statAddText}>+</Text>
              <Text style={styles.statLabel}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'active' && styles.tabActive]}
              onPress={() => setActiveTab('active')}
            >
              <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
                🟢 Active <Text style={styles.tabBadge}>{stats.active}</Text>
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'legacy' && styles.tabActive]}
              onPress={() => setActiveTab('legacy')}
            >
              <Text style={[styles.tabText, activeTab === 'legacy' && styles.tabTextActive]}>
                🏅 Legacy <Text style={[styles.tabBadge, styles.tabBadgeLegacy]}>{stats.legacy}</Text>
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'all' && styles.tabActive]}
              onPress={() => setActiveTab('all')}
            >
              <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
                📋 All <Text style={styles.tabBadge}>{stats.total}</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Toolbar */}
          <View style={[globalStyles.glassCard, styles.toolbar]}>
            <View style={styles.searchContainer}>
              <Icon name="search" size={16} color="rgba(255,255,255,0.4)" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, post, department..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <View style={styles.filterContainer}>
              <Text style={styles.filterLabel}>Post:</Text>
              {getUniquePosts().map((post) => (
                <TouchableOpacity
                  key={post}
                  style={[
                    styles.filterChip,
                    selectedPost === post && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedPost(post)}
                >
                  <Text style={[
                    styles.filterChipText,
                    selectedPost === post && styles.filterChipTextActive,
                  ]}>
                    {post === 'all' ? 'All' : post}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Employee List */}
          <View style={[globalStyles.glassCard, styles.listContainer]}>
            {loading ? (
              <ActivityIndicator size="large" color="#d4af37" style={styles.loader} />
            ) : filteredEmployees.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>👀</Text>
                <Text style={styles.emptyText}>No employees found</Text>
              </View>
            ) : (
              <FlatList
                data={filteredEmployees}
                renderItem={renderEmployeeCard}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            )}
          </View>
        </View>
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[globalStyles.glassCard, styles.modalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? '✏️ Edit Employee' : '➕ Add Employee'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Icon name="x" size={24} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Photo Upload */}
              <TouchableOpacity style={styles.photoUpload} onPress={pickImage}>
                {photoURL ? (
                  <Image source={{ uri: photoURL }} style={styles.photoPreview} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Icon name="camera" size={24} color="rgba(255,255,255,0.4)" />
                    <Text style={styles.photoPlaceholderText}>Add Photo</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TextInput
                style={[globalStyles.glassInput, styles.modalInput]}
                placeholder="Full Name *"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={name}
                onChangeText={setName}
              />

              <View style={styles.modalRow}>
                <TouchableOpacity
                  style={[styles.modalSelect, styles.modalSelectHalf]}
                  onPress={() => {
                    Alert.alert(
                      'Select Post',
                      'Choose the position',
                      POST_OPTIONS.map((p) => ({
                        text: p,
                        onPress: () => setPost(p),
                      }))
                    );
                  }}
                >
                  <Text style={[styles.modalSelectText, !post && styles.modalSelectPlaceholder]}>
                    {post || 'Post *'}
                  </Text>
                  <Icon name="chevron-down" size={16} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSelect, styles.modalSelectHalf]}
                  onPress={() => {
                    Alert.alert(
                      'Select Department',
                      'Choose the department',
                      DEPARTMENTS.map((d) => ({
                        text: d,
                        onPress: () => setDepartment(d),
                      }))
                    );
                  }}
                >
                  <Text style={[styles.modalSelectText, !department && styles.modalSelectPlaceholder]}>
                    {department || 'Department'}
                  </Text>
                  <Icon name="chevron-down" size={16} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={[globalStyles.glassInput, styles.modalInput]}
                placeholder="Qualification *"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={qualification}
                onChangeText={setQualification}
              />

              <TextInput
                style={[globalStyles.glassInput, styles.modalInput]}
                placeholder="Email"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />

              <TextInput
                style={[globalStyles.glassInput, styles.modalInput]}
                placeholder="Phone"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              <TextInput
                style={[globalStyles.glassInput, styles.modalInput]}
                placeholder="Joining Date (YYYY-MM-DD) *"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={joiningDate}
                onChangeText={setJoiningDate}
              />

              <TouchableOpacity
                style={[globalStyles.primaryButton, styles.modalSaveButton]}
                onPress={saveEmployee}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#0a1628" />
                ) : (
                  <Text style={styles.modalSaveButtonText}>
                    💾 {editingId ? 'Update' : 'Save'} Employee
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Legacy Modal */}
      <Modal
        visible={legacyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeLegacyModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[globalStyles.glassCard, styles.modalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🏅 Mark as Legacy Member</Text>
              <TouchableOpacity onPress={closeLegacyModal}>
                <Icon name="x" size={24} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>

            <Text style={styles.legacyInfo}>
              Enter the date this employee left and optionally add a farewell message.
            </Text>

            <TextInput
              style={[globalStyles.glassInput, styles.modalInput]}
              placeholder="Leaving Date (YYYY-MM-DD) *"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={leavingDate}
              onChangeText={setLeavingDate}
            />

            <TextInput
              style={[globalStyles.glassInput, styles.modalInput, styles.textArea]}
              placeholder="Legacy Message (Optional)"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={legacyMessage}
              onChangeText={setLegacyMessage}
              multiline
              numberOfLines={4}
            />

            <View style={styles.legacyWarning}>
              <Icon name="alert-triangle" size={16} color="#f59e0b" />
              <Text style={styles.legacyWarningText}>
                This message will be permanently displayed on the public page.
                It cannot be edited after saving.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.modalActionDanger]}
                onPress={markAsLegacy}
              >
                <Text style={styles.modalActionButtonText}>✅ Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.modalActionCancel]}
                onPress={closeLegacyModal}
              >
                <Text style={styles.modalActionButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
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
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    minHeight: 70,
    justifyContent: 'center',
  },
  statActive: {
    borderTopWidth: 3,
    borderTopColor: '#10b981',
  },
  statLegacy: {
    borderTopWidth: 3,
    borderTopColor: '#d4af37',
  },
  statAdd: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    borderStyle: 'dashed',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  statActiveNumber: {
    color: '#10b981',
  },
  statLegacyNumber: {
    color: '#d4af37',
  },
  statAddText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#d4af37',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tabText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  tabBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  tabBadgeLegacy: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    color: '#d4af37',
  },
  toolbar: {
    padding: 16,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    color: '#ffffff',
    fontSize: 14,
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginRight: 4,
    alignSelf: 'center',
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  filterChipText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  filterChipTextActive: {
    color: '#d4af37',
  },
  listContainer: {
    padding: 16,
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
  },
  card: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  activeCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  legacyCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#d4af37',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  cardName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  cardPost: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  legacyPost: {
    color: '#d4af37',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  legacyBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  cardBody: {
    marginBottom: 10,
  },
  cardQualification: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  cardDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardDetail: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  legacyMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  legacyQuote: {
    fontSize: 16,
    color: '#d4af37',
    marginRight: 6,
  },
  legacyMessageText: {
    flex: 1,
    fontSize: 12,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 16,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
  },
  editButtonText: {
    fontSize: 12,
    color: '#60a5fa',
    fontWeight: '500',
  },
  legacyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  legacyActionText: {
    fontSize: 12,
    color: '#d4af37',
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
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalInput: {
    marginBottom: 12,
  },
  modalRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  modalSelect: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 14,
  },
  modalSelectHalf: {
    flex: 1,
  },
  modalSelectText: {
    color: '#ffffff',
    fontSize: 15,
  },
  modalSelectPlaceholder: {
    color: 'rgba(255,255,255,0.4)',
  },
  photoUpload: {
    alignItems: 'center',
    marginBottom: 16,
  },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 4,
  },
  modalSaveButton: {
    marginTop: 8,
  },
  modalSaveButtonText: {
    color: '#0a1628',
    fontSize: 16,
    fontWeight: '700',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  legacyInfo: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 16,
  },
  legacyWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  legacyWarningText: {
    flex: 1,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    lineHeight: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalActionDanger: {
    backgroundColor: '#dc3545',
  },
  modalActionCancel: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  modalActionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});