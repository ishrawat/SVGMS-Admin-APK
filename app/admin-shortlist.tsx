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
  Linking,
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
import * as DocumentPicker from 'expo-document-picker';
import Icon from '@expo/vector-icons/Feather';
import { globalStyles } from '../../src/styles/global';

interface Shortlist {
  id: string;
  title: string;
  message: string;
  pdfUrl: string;
  pdfName: string;
  date: string;
}

// Cloudinary config
const CLOUDINARY = {
  cloudName: 'zh3vg8mi',
  uploadPreset: 'school_notices',
};

export default function AdminShortlistScreen() {
  const router = useRouter();
  const [shortlists, setShortlists] = useState<Shortlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  
  // Form states
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [messageText, setMessageText] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'loading'>('success');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.replace('/login');
      }
    });

    loadShortlists();

    return () => unsubscribe();
  }, []);

  const loadShortlists = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(
        query(collection(db, 'shortlist'), orderBy('date', 'desc'))
      );
      
      const shortlistsData: Shortlist[] = [];
      snapshot.forEach((doc) => {
        shortlistsData.push({ id: doc.id, ...doc.data() } as Shortlist);
      });
      
      setShortlists(shortlistsData);
    } catch (error) {
      console.error('Error loading shortlists:', error);
      setMessageText('Failed to load shortlists');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const pickPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      console.log('📄 Selected file:', file);
      setSelectedFile(file);
      setMessageText(`✅ Selected: ${file.name}`);
      setMessageType('success');
    } catch (error) {
      console.error('Error picking PDF:', error);
      Alert.alert('Error', 'Failed to pick PDF file');
    }
  };

  const uploadShortlist = async () => {
    if (!title.trim()) {
      setMessageText('Please enter a title');
      setMessageType('error');
      return;
    }

    if (!selectedFile) {
      setMessageText('Please select a PDF file');
      setMessageType('error');
      return;
    }

    setUploading(true);
    setMessageText('Uploading shortlist...');
    setMessageType('loading');

    try {
      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', {
        uri: selectedFile.uri,
        type: 'application/pdf',
        name: selectedFile.name || 'shortlist.pdf',
      } as any);
      formData.append('upload_preset', CLOUDINARY.uploadPreset);
      formData.append('resource_type', 'raw');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/raw/upload`,
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

      // Save to Firestore
      await addDoc(collection(db, 'shortlist'), {
        title: title.trim(),
        message: message.trim() || '',
        pdfUrl: data.secure_url,
        pdfName: selectedFile.name || 'shortlist.pdf',
        date: new Date().toISOString(),
      });

      setMessageText('✅ Shortlist uploaded successfully!');
      setMessageType('success');

      setTitle('');
      setMessage('');
      setSelectedFile(null);

      await loadShortlists();
    } catch (error: any) {
      console.error('Upload error:', error);
      setMessageText('❌ Error uploading shortlist: ' + error.message);
      setMessageType('error');
    } finally {
      setUploading(false);
    }
  };

  const deleteShortlist = async (id: string, title: string) => {
    Alert.alert(
      'Delete Shortlist',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'shortlist', id));
              setMessageText('🗑️ Shortlist deleted successfully!');
              setMessageType('success');
              await loadShortlists();
            } catch (error: any) {
              setMessageText('❌ Error: ' + error.message);
              setMessageType('error');
            }
          },
        },
      ]
    );
  };

  const openPDF = async (url: string, name: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open PDF');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open PDF');
    }
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

  const renderShortlist = ({ item }: { item: Shortlist }) => (
    <View style={[globalStyles.glassCard, styles.shortlistCard]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardMeta}>
            📅 {formatDate(item.date)}
            {item.pdfName ? ` | 📄 ${item.pdfName}` : ''}
          </Text>
          {item.message ? (
            <Text style={styles.cardMessage}>{item.message}</Text>
          ) : null}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.pdfButton]}
            onPress={() => openPDF(item.pdfUrl, item.pdfName)}
          >
            <Icon name="file-text" size={14} color="#0a1628" />
            <Text style={styles.pdfButtonText}>PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => deleteShortlist(item.id, item.title)}
          >
            <Icon name="trash-2" size={14} color="#ef4444" />
          </TouchableOpacity>
        </View>
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
                <Text style={styles.headerTitle}>📋 Shortlist Management</Text>
                <Text style={styles.headerSubtitle}>Upload & manage admission shortlists</Text>
              </View>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.push('/admin')}
              >
                <Icon name="arrow-left" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Message */}
          {messageText ? (
            <View style={[
              styles.messageContainer,
              messageType === 'success' && styles.messageSuccess,
              messageType === 'error' && styles.messageError,
              messageType === 'loading' && styles.messageLoading,
            ]}>
              <Text style={styles.messageText}>{messageText}</Text>
            </View>
          ) : null}

          {/* Upload Form */}
          <View style={[globalStyles.glassCard, styles.formContainer]}>
            <Text style={styles.formTitle}>📤 Upload Shortlist PDF</Text>

            <Text style={styles.formLabel}>Title *</Text>
            <TextInput
              style={[globalStyles.glassInput, styles.input]}
              placeholder="e.g., Class 11 Admission Shortlist"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.formLabel}>Message / Description</Text>
            <TextInput
              style={[globalStyles.glassInput, styles.input, styles.textArea]}
              placeholder="Brief description about the shortlist..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={styles.filePicker}
              onPress={pickPDF}
            >
              <Icon name="file" size={24} color="#d4af37" />
              <Text style={styles.filePickerText}>
                {selectedFile ? selectedFile.name : 'Select PDF File'}
              </Text>
              <Text style={styles.filePickerSubtext}>
                Only PDF files allowed
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={uploadShortlist}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#0a1628" />
              ) : (
                <Text style={styles.uploadButtonText}>📤 Upload Shortlist</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Shortlists List */}
          <View style={[globalStyles.glassCard, styles.listContainer]}>
            <Text style={styles.listTitle}>📋 All Shortlists</Text>

            {loading ? (
              <ActivityIndicator size="large" color="#d4af37" style={styles.loader} />
            ) : shortlists.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyText}>No shortlists uploaded yet.</Text>
              </View>
            ) : (
              <FlatList
                data={shortlists}
                renderItem={renderShortlist}
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
  messageContainer: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
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
  filePicker: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  filePickerText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  filePickerSubtext: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    marginTop: 4,
  },
  uploadButton: {
    backgroundColor: '#d4af37',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#0a1628',
    fontSize: 16,
    fontWeight: '700',
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
  shortlistCard: {
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#d4af37',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  cardMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  cardMessage: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  pdfButton: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
  },
  pdfButtonText: {
    fontSize: 12,
    color: '#d4af37',
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
});