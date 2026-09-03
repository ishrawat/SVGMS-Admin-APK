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
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { auth, db } from '../../src/firebase/config';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
} from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import Icon from '@expo/vector-icons/Feather';
import { globalStyles } from '../../src/styles/global';

interface Award {
  id: string;
  category: 'competition' | 'topper' | 'alumni';
  name: string;
  year: string;
  photoUrl: string;
  // Competition fields
  class?: string;
  achievement?: string;
  position?: string;
  // Topper fields
  rank?: string;
  marks?: string;
  // Alumni fields
  batch?: string;
  profession?: string;
  message?: string;
}

type Category = 'competition' | 'topper' | 'alumni';

const CATEGORY_LABELS: Record<Category, string> = {
  competition: '🏅 Competition Winners',
  topper: '📚 Class Toppers',
  alumni: '🎓 Proud Alumni',
};

const CATEGORY_COLORS: Record<Category, string> = {
  competition: '#1565c0',
  topper: '#2e7d32',
  alumni: '#e65100',
};

// Cloudinary config
const CLOUDINARY = {
  cloudName: 'zh3vg8mi',
  uploadPreset: 'school_notices',
};

export default function AdminAwardsScreen() {
  const router = useRouter();
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all');
  
  // Form states
  const [category, setCategory] = useState<Category>('competition');
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  
  // Competition fields
  const [compClass, setCompClass] = useState('');
  const [compAchievement, setCompAchievement] = useState('');
  const [compPosition, setCompPosition] = useState('1st Prize');
  
  // Topper fields
  const [topperClass, setTopperClass] = useState('');
  const [topperRank, setTopperRank] = useState('1st');
  const [topperMarks, setTopperMarks] = useState('');
  
  // Alumni fields
  const [alumniBatch, setAlumniBatch] = useState('');
  const [alumniProfession, setAlumniProfession] = useState('');
  const [alumniAchievement, setAlumniAchievement] = useState('');
  const [alumniMessage, setAlumniMessage] = useState('');
  
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'loading'>('success');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.replace('/login');
      }
    });

    loadAwards('all');

    return () => unsubscribe();
  }, []);

  const loadAwards = async (categoryFilter: Category | 'all') => {
    setLoading(true);
    try {
      let q = query(collection(db, 'awards'), orderBy('year', 'desc'));

      if (categoryFilter !== 'all') {
        q = query(q, where('category', '==', categoryFilter));
      }

      const snapshot = await getDocs(q);
      
      const awardsData: Award[] = [];
      snapshot.forEach((doc) => {
        awardsData.push({ id: doc.id, ...doc.data() } as Award);
      });
      
      setAwards(awardsData);
    } catch (error) {
      console.error('Error loading awards:', error);
      setToastMessage('Failed to load awards');
      setToastType('error');
    } finally {
      setLoading(false);
    }
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
      setSelectedImage(result.assets[0].uri);
    }
  };

  const uploadToCloudinary = async (uri: string) => {
    setUploading(true);
    setToastMessage('Uploading photo...');
    setToastType('loading');

    try {
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        type: 'image/jpeg',
        name: 'award.jpg',
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

  const resetForm = () => {
    setName('');
    setYear('');
    setCompClass('');
    setCompAchievement('');
    setCompPosition('1st Prize');
    setTopperClass('');
    setTopperRank('1st');
    setTopperMarks('');
    setAlumniBatch('');
    setAlumniProfession('');
    setAlumniAchievement('');
    setAlumniMessage('');
    setSelectedImage(null);
  };

  const addAward = async () => {
    if (!name.trim() || !year.trim()) {
      setToastMessage('Please fill in all required fields');
      setToastType('error');
      return;
    }

    // Validate category-specific fields
    if (category === 'alumni') {
      if (!alumniBatch.trim()) {
        setToastMessage('Please enter the batch year');
        setToastType('error');
        return;
      }
      if (!alumniProfession.trim()) {
        setToastMessage('Please enter the profession');
        setToastType('error');
        return;
      }
    }

    setToastMessage('Adding award...');
    setToastType('loading');

    try {
      let photoUrl = '';

      if (selectedImage) {
        photoUrl = await uploadToCloudinary(selectedImage);
      }

      let awardData: any = {
        category: category,
        name: name.trim(),
        year: year.trim(),
        photoUrl: photoUrl,
      };

      if (category === 'competition') {
        awardData.class = compClass.trim();
        awardData.achievement = compAchievement.trim();
        awardData.position = compPosition;
      } else if (category === 'topper') {
        awardData.class = topperClass.trim();
        awardData.rank = topperRank;
        awardData.marks = topperMarks.trim();
      } else if (category === 'alumni') {
        awardData.batch = alumniBatch.trim();
        awardData.profession = alumniProfession.trim();
        awardData.achievement = alumniAchievement.trim();
        awardData.message = alumniMessage.trim();
      }

      await addDoc(collection(db, 'awards'), awardData);

      setToastMessage('✅ Award added successfully!');
      setToastType('success');

      resetForm();
      loadAwards(filterCategory);

      setTimeout(() => {
        setToastMessage('');
      }, 3000);
    } catch (error: any) {
      console.error('Error:', error);
      setToastMessage('❌ Error: ' + error.message);
      setToastType('error');
    }
  };

  const deleteAward = async (id: string, name: string) => {
    Alert.alert(
      'Delete Award',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'awards', id));
              setToastMessage('🗑️ Award deleted!');
              setToastType('success');
              loadAwards(filterCategory);
            } catch (error: any) {
              setToastMessage('❌ Error: ' + error.message);
              setToastType('error');
            }
          },
        },
      ]
    );
  };

  const getCategoryLabel = (cat: string) => {
    return CATEGORY_LABELS[cat as Category] || cat;
  };

  const getCategoryColor = (cat: string) => {
    return CATEGORY_COLORS[cat as Category] || '#666';
  };

  const getCategoryBadgeStyle = (cat: string) => {
    const colors: Record<string, any> = {
      competition: styles.badgeCompetition,
      topper: styles.badgeTopper,
      alumni: styles.badgeAlumni,
    };
    return colors[cat] || styles.badgeDefault;
  };

  const renderAward = ({ item }: { item: Award }) => {
    let details = '';
    if (item.category === 'competition') {
      details = `${item.achievement || ''} ${item.position || ''} ${item.class ? '| ' + item.class : ''}`;
    } else if (item.category === 'topper') {
      details = `Rank ${item.rank || ''} ${item.marks || ''} ${item.class ? '| ' + item.class : ''}`;
    } else if (item.category === 'alumni') {
      details = `Batch ${item.batch || ''} | ${item.profession || ''}`;
    }

    return (
      <View style={[globalStyles.glassCard, styles.awardCard]}>
        <View style={styles.cardContent}>
          <View style={styles.cardLeft}>
            {item.photoUrl ? (
              <Image source={{ uri: item.photoUrl }} style={styles.awardPhoto} />
            ) : (
              <View style={styles.awardPhotoPlaceholder}>
                <Text style={styles.awardInitial}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.awardInfo}>
              <View style={styles.awardHeader}>
                <Text style={styles.awardName}>{item.name}</Text>
                <View style={[styles.categoryBadge, getCategoryBadgeStyle(item.category)]}>
                  <Text style={styles.categoryBadgeText}>
                    {getCategoryLabel(item.category)}
                  </Text>
                </View>
              </View>
              <Text style={styles.awardDetails}>
                📅 {item.year} {details ? `| ${details}` : ''}
                {item.photoUrl ? ' | 📸 Photo' : ''}
              </Text>
              {item.category === 'alumni' && item.message && (
                <Text style={styles.alumniMessage}>💬 {item.message}</Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteAward(item.id, item.name)}
          >
            <Icon name="trash-2" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const getFormTitle = () => {
    const titles: Record<Category, string> = {
      competition: '➕ Add Competition Winner',
      topper: '➕ Add Class Topper',
      alumni: '➕ Add Proud Alumni',
    };
    return titles[category] || '➕ Add Award';
  };

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
                <Text style={styles.headerTitle}>🏆 Awards Management</Text>
                <Text style={styles.headerSubtitle}>Manage achievements & recognitions</Text>
              </View>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.push('/admin')}
              >
                <Icon name="arrow-left" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Toast Message */}
          {toastMessage ? (
            <View style={[
              styles.toastContainer,
              toastType === 'success' && styles.toastSuccess,
              toastType === 'error' && styles.toastError,
              toastType === 'loading' && styles.toastLoading,
            ]}>
              <Text style={styles.toastText}>{toastMessage}</Text>
            </View>
          ) : null}

          {/* Add Award Form */}
          <View style={[globalStyles.glassCard, styles.formContainer]}>
            <Text style={styles.formTitle}>{getFormTitle()}</Text>

            <Text style={styles.formLabel}>Category</Text>
            <View style={styles.categorySelector}>
              {(['competition', 'topper', 'alumni'] as Category[]).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryOption,
                    category === cat && styles.categoryOptionActive,
                  ]}
                  onPress={() => {
                    setCategory(cat);
                    resetForm();
                  }}
                >
                  <Text style={[
                    styles.categoryOptionText,
                    category === cat && styles.categoryOptionTextActive,
                  ]}>
                    {CATEGORY_LABELS[cat]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>Name *</Text>
            <TextInput
              style={[globalStyles.glassInput, styles.input]}
              placeholder="Full name"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={name}
              onChangeText={setName}
            />

            {/* Competition Fields */}
            {category === 'competition' && (
              <>
                <Text style={styles.formLabel}>Class</Text>
                <TextInput
                  style={[globalStyles.glassInput, styles.input]}
                  placeholder="e.g., 10-A"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={compClass}
                  onChangeText={setCompClass}
                />

                <Text style={styles.formLabel}>Achievement / Competition *</Text>
                <TextInput
                  style={[globalStyles.glassInput, styles.input]}
                  placeholder="e.g., Maths Olympiad"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={compAchievement}
                  onChangeText={setCompAchievement}
                />

                <Text style={styles.formLabel}>Position</Text>
                <View style={styles.positionSelector}>
                  {['1st Prize', '2nd Prize', '3rd Prize', 'Winner', 'Runner Up', 'Participant'].map((pos) => (
                    <TouchableOpacity
                      key={pos}
                      style={[
                        styles.positionOption,
                        compPosition === pos && styles.positionOptionActive,
                      ]}
                      onPress={() => setCompPosition(pos)}
                    >
                      <Text style={[
                        styles.positionOptionText,
                        compPosition === pos && styles.positionOptionTextActive,
                      ]}>
                        {pos}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Topper Fields */}
            {category === 'topper' && (
              <>
                <Text style={styles.formLabel}>Class</Text>
                <TextInput
                  style={[globalStyles.glassInput, styles.input]}
                  placeholder="e.g., 10-A"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={topperClass}
                  onChangeText={setTopperClass}
                />

                <Text style={styles.formLabel}>Rank *</Text>
                <View style={styles.rankSelector}>
                  {['1st', '2nd', '3rd'].map((rank) => (
                    <TouchableOpacity
                      key={rank}
                      style={[
                        styles.rankOption,
                        topperRank === rank && styles.rankOptionActive,
                      ]}
                      onPress={() => setTopperRank(rank)}
                    >
                      <Text style={[
                        styles.rankOptionText,
                        topperRank === rank && styles.rankOptionTextActive,
                      ]}>
                        {rank}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.formLabel}>Marks / Percentage</Text>
                <TextInput
                  style={[globalStyles.glassInput, styles.input]}
                  placeholder="e.g., 95.6%"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={topperMarks}
                  onChangeText={setTopperMarks}
                />
              </>
            )}

            {/* Alumni Fields */}
            {category === 'alumni' && (
              <>
                <Text style={styles.formLabel}>Batch (Passing Year) *</Text>
                <TextInput
                  style={[globalStyles.glassInput, styles.input]}
                  placeholder="e.g., 2015"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={alumniBatch}
                  onChangeText={setAlumniBatch}
                />

                <Text style={styles.formLabel}>Profession *</Text>
                <TextInput
                  style={[globalStyles.glassInput, styles.input]}
                  placeholder="e.g., Doctor"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={alumniProfession}
                  onChangeText={setAlumniProfession}
                />

                <Text style={styles.formLabel}>Achievement</Text>
                <TextInput
                  style={[globalStyles.glassInput, styles.input]}
                  placeholder="e.g., MBBS from AIIMS"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={alumniAchievement}
                  onChangeText={setAlumniAchievement}
                />

                <Text style={styles.formLabel}>Message to Students</Text>
                <TextInput
                  style={[globalStyles.glassInput, styles.input, styles.textArea]}
                  placeholder="Write a message for current students..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={alumniMessage}
                  onChangeText={setAlumniMessage}
                  multiline
                  numberOfLines={3}
                />
              </>
            )}

            {/* Year (Common) */}
            <Text style={styles.formLabel}>Year *</Text>
            <TextInput
              style={[globalStyles.glassInput, styles.input]}
              placeholder="e.g., 2026"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={year}
              onChangeText={setYear}
            />

            {/* Photo Upload */}
            <TouchableOpacity
              style={styles.imagePicker}
              onPress={pickImage}
            >
              {selectedImage ? (
                <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
              ) : (
                <View style={styles.imagePickerPlaceholder}>
                  <Icon name="camera" size={28} color="rgba(255,255,255,0.3)" />
                  <Text style={styles.imagePickerText}>Tap to add photo</Text>
                  <Text style={styles.imagePickerSubtext}>Square image recommended</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[globalStyles.primaryButton, styles.addButton]}
                onPress={addAward}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#0a1628" />
                ) : (
                  <Text style={styles.addButtonText}>➕ Add Award</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  resetForm();
                  setToastMessage('Form cleared');
                  setToastType('success');
                  setTimeout(() => setToastMessage(''), 1500);
                }}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Awards List */}
          <View style={[globalStyles.glassCard, styles.listContainer]}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>📋 All Awards</Text>
              <View style={styles.filterContainer}>
                {(['all', 'competition', 'topper', 'alumni'] as const).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.filterChip,
                      filterCategory === cat && styles.filterChipActive,
                    ]}
                    onPress={() => {
                      setFilterCategory(cat);
                      loadAwards(cat);
                    }}
                  >
                    <Text style={[
                      styles.filterChipText,
                      filterCategory === cat && styles.filterChipTextActive,
                    ]}>
                      {cat === 'all' ? 'All' : CATEGORY_LABELS[cat].split(' ').slice(1).join(' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#d4af37" style={styles.loader} />
            ) : awards.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🏆</Text>
                <Text style={styles.emptyText}>No awards added yet.</Text>
              </View>
            ) : (
              <FlatList
                data={awards}
                renderItem={renderAward}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            )}
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
  toastContainer: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  toastSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderLeftColor: '#10b981',
  },
  toastError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderLeftColor: '#ef4444',
  },
  toastLoading: {
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    borderLeftColor: '#6b7280',
  },
  toastText: {
    color: '#ffffff',
    fontSize: 14,
  },
  formContainer: {
    padding: 20,
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  input: {
    marginBottom: 12,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categorySelector: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  categoryOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  categoryOptionActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  categoryOptionText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  categoryOptionTextActive: {
    color: '#d4af37',
  },
  positionSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  positionOption: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  positionOptionActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  positionOptionText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  positionOptionTextActive: {
    color: '#d4af37',
  },
  rankSelector: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  rankOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  rankOptionActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  rankOptionText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  rankOptionTextActive: {
    color: '#d4af37',
  },
  imagePicker: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
  },
  imagePickerPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  imagePickerText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    marginTop: 8,
  },
  imagePickerSubtext: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 11,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  addButton: {
    flex: 2,
    paddingVertical: 14,
  },
  addButtonText: {
    color: '#0a1628',
    fontSize: 15,
    fontWeight: '700',
  },
  clearButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  clearButtonText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  listContainer: {
    padding: 20,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  filterChipText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },
  filterChipTextActive: {
    color: '#d4af37',
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
  awardCard: {
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#d4af37',
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  awardPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  awardPhotoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  awardInitial: {
    fontSize: 22,
    fontWeight: '700',
    color: '#d4af37',
  },
  awardInfo: {
    flex: 1,
  },
  awardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  awardName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeCompetition: {
    backgroundColor: 'rgba(21, 101, 192, 0.2)',
  },
  badgeTopper: {
    backgroundColor: 'rgba(46, 125, 50, 0.2)',
  },
  badgeAlumni: {
    backgroundColor: 'rgba(230, 81, 0, 0.2)',
  },
  badgeDefault: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#ffffff',
  },
  awardDetails: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  alumniMessage: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
  },
});