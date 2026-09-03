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

interface Notice {
  id: string;
  title: string;
  description: string;
  pdfUrl: string;
  pdfName: string;
  author: string;
  date: string;
}

// Cloudinary config (same as your web)
const CLOUDINARY = {
  cloudName: 'zh3vg8mi',
  uploadPreset: 'school_notices',
};

export default function AdminNoticesScreen() {
  const router = useRouter();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'loading'>('success');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.replace('/login');
      }
    });

    loadNotices();

    return () => unsubscribe();
  }, []);

  const loadNotices = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(
        query(collection(db, 'notices'), orderBy('date', 'desc'))
      );
      
      const noticesData: Notice[] = [];
      snapshot.forEach((doc) => {
        noticesData.push({ id: doc.id, ...doc.data() } as Notice);
      });
      
      setNotices(noticesData);
    } catch (error) {
      console.error('Error loading notices:', error);
      setMessage('Failed to load notices');
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
      setMessage(`✅ Selected: ${file.name}`);
      setMessageType('success');
    } catch (error) {
      console.error('Error picking PDF:', error);
      Alert.alert('Error', 'Failed to pick PDF file');
    }
  };

  const uploadNotice = async () => {
    if (!title.trim()) {
      setMessage('Please enter a notice title');
      setMessageType('error');
      return;
    }

    if (!selectedFile) {
      setMessage('Please select a PDF file');
      setMessageType('error');
      return;
    }

    setUploading(true);
    setMessage('Uploading notice...');
    setMessageType('loading');

    try {
      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', {
        uri: selectedFile.uri,
        type: 'application/pdf',
        name: selectedFile.name || 'notice.pdf',
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

      // Save to Firestore
      const user = auth.currentUser;
      await addDoc(collection(db, 'notices'), {
        title: title.trim(),
        description: description.trim() || '',
        pdfUrl: data.secure_url,
        pdfName: selectedFile.name || 'notice.pdf',
        author: user?.email || 'Admin',
        date: new Date().toISOString(),
      });

      setMessage('✅ Notice uploaded successfully!');
      setMessageType('success');
      
      setTitle('');
      setDescription('');
      setSelectedFile(null);
      
      await loadNotices();
    } catch (error: any) {
      console.error('Upload error:', error);
      setMessage('❌ Error uploading notice: ' + error.message);
      setMessageType('error');
    } finally {
      setUploading(false);
    }
  };

  const deleteNotice = async (id: string, title: string) => {
    Alert.alert(
      'Delete Notice',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'notices', id));
              setMessage('✅ Notice deleted successfully!');
              setMessageType('success');
              await loadNotices();
            } catch (error: any) {
              setMessage('❌ Error: ' + error.message);
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

  const renderNotice = ({ item }: { item: Notice }) => (
    <View style={[globalStyles.glassCard, styles.noticeCard]}>
      <View style={styles.noticeHeader}>
        <Text style={styles.noticeTitle}>{item.title}</Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteNotice(item.id, item.title)}
        >
          <Icon name="trash-2" size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.noticeMeta}>
        📅 {formatDate(item.date)} | 👤 {item.author || 'Admin'}
        {item.pdfName ? ` | 📄 ${item.pdfName}` : ''}
      </Text>
      
      {item.description ? (
        <Text style={styles.noticeDescription}>{item.description}</Text>
      ) : null}
      
      {item.pdfUrl ? (
        <TouchableOpacity
          style={styles.pdfButton}
          onPress={() => openPDF(item.pdfUrl, item.pdfName)}
        >
          <Icon name="file-text" size={18} color="white" />
          <Text style={styles.pdfButtonText}>📥 Download PDF</Text>
        </TouchableOpacity>
      ) : null}
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
                <Text style={styles.headerTitle}>📄 Notices Management</Text>
                <Text style={styles.headerSubtitle}>Upload & manage PDF notices</Text>
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

          {/* Upload Form */}
          <View style={[globalStyles.glassCard, styles.formContainer]}>
            <Text style={styles.formTitle}>📤 Upload New Notice</Text>
            
            <TextInput
              style={[globalStyles.glassInput, styles.input]}
              placeholder="Notice Title"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={title}
              onChangeText={setTitle}
            />
            
            <TextInput
              style={[globalStyles.glassInput, styles.input, styles.textArea]}
              placeholder="Brief description (optional)"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={description}
              onChangeText={setDescription}
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
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={uploadNotice}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#0a1628" />
              ) : (
                <Text style={styles.uploadButtonText}>📤 Upload Notice</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Notices List */}
          <View style={[globalStyles.glassCard, styles.listContainer]}>
            <Text style={styles.listTitle}>📋 All Notices</Text>
            
            {loading ? (
              <ActivityIndicator size="large" color="#d4af37" style={styles.loader} />
            ) : notices.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyText}>No notices uploaded yet.</Text>
              </View>
            ) : (
              <FlatList
                data={notices}
                renderItem={renderNotice}
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
    marginBottom: 20,
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
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  input: {
    width: '100%',
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
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  filePickerText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
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
  noticeCard: {
    padding: 16,
    marginBottom: 12,
  },
  noticeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  deleteButton: {
    padding: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
  },
  noticeMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
    marginBottom: 8,
  },
  noticeDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
    lineHeight: 20,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 8,
  },
  pdfButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});