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
  updateDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore';
import * as DocumentPicker from 'expo-document-picker';
import Icon from '@expo/vector-icons/Feather';
import { globalStyles } from '../../src/styles/global';

interface TickerMessage {
  id: string;
  message: string;
  pdfUrl: string | null;
  pdfName: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
}

// Cloudinary config
const CLOUDINARY = {
  cloudName: 'zh3vg8mi',
  uploadPreset: 'school_notices',
};

export default function AdminTickerScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<TickerMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  
  // Form states
  const [messageText, setMessageText] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'loading'>('success');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.replace('/login');
      }
    });

    loadMessages();

    return () => unsubscribe();
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(
        query(collection(db, 'ticker'), orderBy('createdAt', 'desc'))
      );
      
      const messagesData: TickerMessage[] = [];
      snapshot.forEach((doc) => {
        messagesData.push({ id: doc.id, ...doc.data() } as TickerMessage);
      });
      
      setMessages(messagesData);
    } catch (error) {
      console.error('Error loading messages:', error);
      setToastMessage('Failed to load messages');
      setToastType('error');
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
      setSelectedFile(file);
      setToastMessage(`✅ Selected: ${file.name}`);
      setToastType('success');
    } catch (error) {
      console.error('Error picking PDF:', error);
      Alert.alert('Error', 'Failed to pick PDF file');
    }
  };

  const addMessage = async () => {
    if (!messageText.trim()) {
      setToastMessage('Please enter a message');
      setToastType('error');
      return;
    }

    setUploading(true);
    setToastMessage('Adding message...');
    setToastType('loading');

    try {
      let pdfUrl = null;
      let pdfName = null;

      // Upload PDF if selected
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', {
          uri: selectedFile.uri,
          type: 'application/pdf',
          name: selectedFile.name || 'ticker.pdf',
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

        if (data.secure_url) {
          pdfUrl = data.secure_url;
          pdfName = selectedFile.name;
        } else {
          throw new Error('PDF upload failed');
        }
      }

      const user = auth.currentUser;
      await addDoc(collection(db, 'ticker'), {
        message: messageText.trim(),
        pdfUrl: pdfUrl,
        pdfName: pdfName,
        isActive: true,
        createdAt: new Date().toISOString(),
        createdBy: user?.email || 'Admin',
      });

      setToastMessage('✅ Message added successfully!');
      setToastType('success');

      setMessageText('');
      setSelectedFile(null);

      await loadMessages();

      setTimeout(() => {
        setToastMessage('');
      }, 3000);
    } catch (error: any) {
      console.error('Error:', error);
      setToastMessage('❌ Error: ' + error.message);
      setToastType('error');
    } finally {
      setUploading(false);
    }
  };

  const deleteMessage = async (id: string) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'ticker', id));
              setToastMessage('🗑️ Message deleted!');
              setToastType('success');
              await loadMessages();
            } catch (error: any) {
              setToastMessage('❌ Error: ' + error.message);
              setToastType('error');
            }
          },
        },
      ]
    );
  };

  const toggleMessage = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'ticker', id), {
        isActive: !currentStatus,
      });
      setToastMessage(`✅ Message ${!currentStatus ? 'shown' : 'hidden'}!`);
      setToastType('success');
      await loadMessages();
    } catch (error: any) {
      setToastMessage('❌ Error: ' + error.message);
      setToastType('error');
    }
  };

  const openPDF = async (url: string) => {
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
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Unknown date';
    }
  };

  const renderMessage = ({ item }: { item: TickerMessage }) => (
    <View style={[
      globalStyles.glassCard,
      styles.messageCard,
      !item.isActive && styles.messageCardInactive,
    ]}>
      <View style={styles.cardContent}>
        <View style={styles.cardLeft}>
          <Text style={styles.messageText}>
            {item.message}
            {item.pdfUrl && (
              <Text style={styles.pdfBadge}> 📄 PDF</Text>
            )}
          </Text>
          <Text style={styles.messageMeta}>
            📅 {formatDate(item.createdAt)}
            {item.createdBy ? ` | 👤 ${item.createdBy}` : ''}
            {item.isActive ? ' 🟢 Active' : ' 🔴 Inactive'}
          </Text>
          {item.pdfName && (
            <Text style={styles.pdfName}>📎 {item.pdfName}</Text>
          )}
        </View>
        <View style={styles.cardActions}>
          {item.pdfUrl && (
            <TouchableOpacity
              style={[styles.actionButton, styles.pdfButton]}
              onPress={() => openPDF(item.pdfUrl!)}
            >
              <Icon name="file-text" size={14} color="#ffffff" />
              <Text style={styles.pdfButtonText}>PDF</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, item.isActive ? styles.hideButton : styles.showButton]}
            onPress={() => toggleMessage(item.id, item.isActive)}
          >
            <Text style={[
              styles.actionButtonText,
              item.isActive ? styles.hideButtonText : styles.showButtonText,
            ]}>
              {item.isActive ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => deleteMessage(item.id)}
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
                <Text style={styles.headerTitle}>📢 Ticker Management</Text>
                <Text style={styles.headerSubtitle}>Manage scrolling news messages</Text>
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

          {/* Add Message Form */}
          <View style={[globalStyles.glassCard, styles.formContainer]}>
            <Text style={styles.formTitle}>✏️ Add New Message</Text>

            <Text style={styles.formLabel}>Message *</Text>
            <TextInput
              style={[globalStyles.glassInput, styles.input, styles.textArea]}
              placeholder="Enter your message here..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={messageText}
              onChangeText={setMessageText}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={styles.filePicker}
              onPress={pickPDF}
            >
              <Icon name="paperclip" size={20} color="#d4af37" />
              <Text style={styles.filePickerText}>
                {selectedFile ? selectedFile.name : 'Attach PDF (Optional)'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addButton}
              onPress={addMessage}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#0a1628" />
              ) : (
                <Text style={styles.addButtonText}>➕ Add Message</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Messages List */}
          <View style={[globalStyles.glassCard, styles.listContainer]}>
            <Text style={styles.listTitle}>📋 All Messages</Text>
            <Text style={styles.listSubtitle}>
              Active messages appear on the website ticker
            </Text>

            {loading ? (
              <ActivityIndicator size="large" color="#d4af37" style={styles.loader} />
            ) : messages.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyText}>No messages yet. Add one above!</Text>
              </View>
            ) : (
              <FlatList
                data={messages}
                renderItem={renderMessage}
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
  filePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  filePickerText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    flex: 1,
  },
  addButton: {
    backgroundColor: '#d4af37',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#0a1628',
    fontSize: 15,
    fontWeight: '700',
  },
  listContainer: {
    padding: 20,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  listSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
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
  messageCard: {
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  messageCardInactive: {
    borderLeftColor: 'rgba(255,255,255,0.2)',
    opacity: 0.6,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLeft: {
    flex: 1,
  },
  messageText: {
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 20,
  },
  pdfBadge: {
    color: '#d4af37',
    fontWeight: '600',
  },
  messageMeta: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },
  pdfName: {
    fontSize: 11,
    color: 'rgba(212, 175, 55, 0.6)',
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 0,
    marginLeft: 10,
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
    backgroundColor: '#28a745',
  },
  pdfButtonText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '500',
  },
  hideButton: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  hideButtonText: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '500',
  },
  showButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  showButtonText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '500',
  },
});