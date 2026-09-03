import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { auth, db } from '../../src/firebase/config';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import Icon from '@expo/vector-icons/Feather';
import { globalStyles } from '../../src/styles/global';

interface Thought {
  message: string;
  author: string;
  date: string;
}

export default function AdminThoughtScreen() {
  const router = useRouter();
  const [thought, setThought] = useState<Thought | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [author, setAuthor] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'loading'>('success');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.replace('/login');
      }
    });

    loadCurrentThought();

    return () => unsubscribe();
  }, []);

  const loadCurrentThought = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'thoughts', 'current');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setThought(docSnap.data() as Thought);
      } else {
        setThought(null);
      }
    } catch (error) {
      console.error('Error loading thought:', error);
      setToastMessage('Failed to load thought');
      setToastType('error');
    } finally {
      setLoading(false);
    }
  };

  const updateThought = async () => {
    if (!message.trim()) {
      setToastMessage('Please enter a thought');
      setToastType('error');
      return;
    }

    setUpdating(true);
    setToastMessage('Updating thought...');
    setToastType('loading');

    try {
      const authorName = author.trim() || 'Principal';
      
      await setDoc(doc(db, 'thoughts', 'current'), {
        message: message.trim(),
        author: authorName,
        date: new Date().toISOString(),
      });

      setToastMessage('✅ Thought updated successfully!');
      setToastType('success');

      setMessage('');
      setAuthor('');
      await loadCurrentThought();

      // Clear success message after 3 seconds
      setTimeout(() => {
        setToastMessage('');
      }, 3000);
    } catch (error: any) {
      console.error('Error updating thought:', error);
      setToastMessage('❌ Error: ' + error.message);
      setToastType('error');
    } finally {
      setUpdating(false);
    }
  };

  const deleteThought = async () => {
    Alert.alert(
      'Remove Thought',
      'Are you sure you want to remove the current thought?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'thoughts', 'current'));
              setToastMessage('🗑️ Thought removed!');
              setToastType('success');
              await loadCurrentThought();

              setTimeout(() => {
                setToastMessage('');
              }, 3000);
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
                <Text style={styles.headerTitle}>💭 Thought of the Day</Text>
                <Text style={styles.headerSubtitle}>Update and manage daily thoughts</Text>
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

          {/* Current Thought Card */}
          <View style={[globalStyles.glassCard, styles.currentThoughtCard]}>
            <Text style={styles.currentLabel}>📖 Current Thought</Text>
            
            {loading ? (
              <ActivityIndicator size="small" color="#d4af37" style={styles.loader} />
            ) : thought ? (
              <>
                <Text style={styles.thoughtQuote}>"{thought.message}"</Text>
                <Text style={styles.thoughtMeta}>
                  — {thought.author || 'Principal'} • {formatDate(thought.date)}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.thoughtEmpty}>No thought set yet.</Text>
                <Text style={styles.thoughtEmptySub}>Add a thought below</Text>
              </>
            )}
          </View>

          {/* Update Form */}
          <View style={[globalStyles.glassCard, styles.formContainer]}>
            <Text style={styles.formTitle}>✏️ Update Thought</Text>

            <Text style={styles.formLabel}>New Thought / Quote *</Text>
            <TextInput
              style={[globalStyles.glassInput, styles.input, styles.textArea]}
              placeholder="Enter the thought of the day..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.formLabel}>Author</Text>
            <TextInput
              style={[globalStyles.glassInput, styles.input]}
              placeholder="e.g., Principal"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={author}
              onChangeText={setAuthor}
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[globalStyles.primaryButton, styles.updateButton]}
                onPress={updateThought}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#0a1628" />
                ) : (
                  <Text style={styles.updateButtonText}>📤 Update Thought</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={deleteThought}
              >
                <Icon name="trash-2" size={18} color="#ef4444" />
                <Text style={styles.deleteButtonText}>Remove</Text>
              </TouchableOpacity>
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
  currentThoughtCard: {
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#d4af37',
  },
  currentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  loader: {
    marginTop: 10,
  },
  thoughtQuote: {
    fontSize: 18,
    fontWeight: '500',
    color: '#ffffff',
    fontStyle: 'italic',
    lineHeight: 26,
    marginBottom: 6,
  },
  thoughtMeta: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  thoughtEmpty: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
  },
  thoughtEmptySub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 4,
  },
  formContainer: {
    padding: 20,
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  updateButton: {
    flex: 2,
    paddingVertical: 14,
  },
  updateButtonText: {
    color: '#0a1628',
    fontSize: 15,
    fontWeight: '700',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  deleteButtonText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
});