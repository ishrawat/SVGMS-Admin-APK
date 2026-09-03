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
} from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import Icon from '@expo/vector-icons/Feather';
import { globalStyles } from '../../src/styles/global';

interface Donor {
  id: string;
  name: string;
  donation: string;
  description: string;
  photoUrl: string;
  date: string;
}

// Cloudinary config
const CLOUDINARY = {
  cloudName: 'zh3vg8mi',
  uploadPreset: 'school_notices',
};

export default function AdminBhamashahScreen() {
  const router = useRouter();
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Form states
  const [name, setName] = useState('');
  const [donation, setDonation] = useState('');
  const [description, setDescription] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'loading'>('success');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.replace('/login');
      }
    });

    loadDonors();

    return () => unsubscribe();
  }, []);

  const loadDonors = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(
        query(collection(db, 'donors'), orderBy('date', 'desc'))
      );
      
      const donorsData: Donor[] = [];
      snapshot.forEach((doc) => {
        donorsData.push({ id: doc.id, ...doc.data() } as Donor);
      });
      
      setDonors(donorsData);
    } catch (error) {
      console.error('Error loading donors:', error);
      setToastMessage('Failed to load donors');
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
        name: 'donor.jpg',
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

  const addDonor = async () => {
    if (!name.trim()) {
      setToastMessage('Please enter the donor name');
      setToastType('error');
      return;
    }

    if (!donation.trim()) {
      setToastMessage('Please enter donation details');
      setToastType('error');
      return;
    }

    setToastMessage('Adding donor...');
    setToastType('loading');

    try {
      let photoUrl = '';

      // Upload photo if selected
      if (selectedImage) {
        photoUrl = await uploadToCloudinary(selectedImage);
      }

      // Save to Firestore
      await addDoc(collection(db, 'donors'), {
        name: name.trim(),
        donation: donation.trim(),
        description: description.trim() || '',
        photoUrl: photoUrl,
        date: new Date().toISOString(),
      });

      setToastMessage('✅ Donor added successfully!');
      setToastType('success');

      setName('');
      setDonation('');
      setDescription('');
      setSelectedImage(null);

      await loadDonors();

      setTimeout(() => {
        setToastMessage('');
      }, 3000);
    } catch (error: any) {
      console.error('Error:', error);
      setToastMessage('❌ Error: ' + error.message);
      setToastType('error');
    }
  };

  const deleteDonor = async (id: string, name: string) => {
    Alert.alert(
      'Delete Donor',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'donors', id));
              setToastMessage('🗑️ Donor deleted!');
              setToastType('success');
              await loadDonors();
            } catch (error: any) {
              setToastMessage('❌ Error: ' + error.message);
              setToastType('error');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Unknown date';
    }
  };

  const renderDonor = ({ item }: { item: Donor }) => (
    <View style={[globalStyles.glassCard, styles.donorCard]}>
      <View style={styles.cardContent}>
        <View style={styles.cardLeft}>
          {item.photoUrl ? (
            <Image source={{ uri: item.photoUrl }} style={styles.donorPhoto} />
          ) : (
            <View style={styles.donorPhotoPlaceholder}>
              <Text style={styles.donorInitial}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.donorInfo}>
            <Text style={styles.donorName}>{item.name}</Text>
            <Text style={styles.donorDonation}>{item.donation}</Text>
            {item.description ? (
              <Text style={styles.donorDescription}>{item.description}</Text>
            ) : null}
            <Text style={styles.donorDate}>📅 {formatDate(item.date)}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteDonor(item.id, item.name)}
        >
          <Icon name="trash-2" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
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
              <View>
                <Text style={styles.headerTitle}>🙏 Bhamashah Management</Text>
                <Text style={styles.headerSubtitle}>Manage school donors & contributions</Text>
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

          {/* Add Donor Form */}
          <View style={[globalStyles.glassCard, styles.formContainer]}>
            <Text style={styles.formTitle}>➕ Add Donor</Text>

            <Text style={styles.formLabel}>Donor Name *</Text>
            <TextInput
              style={[globalStyles.glassInput, styles.input]}
              placeholder="e.g., Mr. Rajesh Sharma"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.formLabel}>Donation Details *</Text>
            <TextInput
              style={[globalStyles.glassInput, styles.input]}
              placeholder="e.g., ₹50,000 for Computers"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={donation}
              onChangeText={setDonation}
            />

            <Text style={styles.formLabel}>Description (Optional)</Text>
            <TextInput
              style={[globalStyles.glassInput, styles.input, styles.textArea]}
              placeholder="Brief description about the donation..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

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
                onPress={addDonor}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#0a1628" />
                ) : (
                  <Text style={styles.addButtonText}>➕ Add Donor</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setName('');
                  setDonation('');
                  setDescription('');
                  setSelectedImage(null);
                  setToastMessage('Form cleared');
                  setToastType('success');
                  setTimeout(() => setToastMessage(''), 1500);
                }}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Donors List */}
          <View style={[globalStyles.glassCard, styles.listContainer]}>
            <Text style={styles.listTitle}>📋 All Donors</Text>

            {loading ? (
              <ActivityIndicator size="large" color="#d4af37" style={styles.loader} />
            ) : donors.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🤝</Text>
                <Text style={styles.emptyText}>No donors added yet.</Text>
              </View>
            ) : (
              <FlatList
                data={donors}
                renderItem={renderDonor}
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
  listTitle: {
    fontSize: 18,
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
  },
  donorCard: {
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
  donorPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  donorPhotoPlaceholder: {
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
  donorInitial: {
    fontSize: 22,
    fontWeight: '700',
    color: '#d4af37',
  },
  donorInfo: {
    flex: 1,
  },
  donorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  donorDonation: {
    fontSize: 13,
    color: '#d4af37',
    fontWeight: '500',
    marginTop: 2,
  },
  donorDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  donorDate: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
  },
});