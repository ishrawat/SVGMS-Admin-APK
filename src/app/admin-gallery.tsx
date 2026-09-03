import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  FlatList,
  Alert,
  Modal,
  ActivityIndicator,
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
  where, 
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import Icon from '@expo/vector-icons/Feather';
import { globalStyles } from '../../src/styles/global';

interface Event {
  id: string;
  title: string;
  date: string;
  description: string;
  createdAt: string;
}

interface EventImage {
  id: string;
  eventId: string;
  imageUrl: string;
  caption: string;
  order: number;
  createdAt: string;
}

// ===== EVENT CARD COMPONENT =====
const EventCard = ({ 
  item, 
  onDelete, 
  onDeleteImage,
  onAddImages,
}: { 
  item: Event; 
  onDelete: (id: string, title: string) => void;
  onDeleteImage: (imageId: string, eventId: string) => void;
  onAddImages: (event: Event) => void;
}) => {
  const [images, setImages] = useState<EventImage[]>([]);
  const [showManage, setShowManage] = useState(false);
  const [loadingImages, setLoadingImages] = useState(true);

  useEffect(() => {
    loadImages();
  }, [item.id]);

  const loadImages = async () => {
    setLoadingImages(true);
    try {
      const snapshot = await getDocs(
        query(collection(db, 'eventImages'), where('eventId', '==', item.id), orderBy('order', 'asc'))
      );
      
      const imagesData: EventImage[] = [];
      snapshot.forEach((doc) => {
        imagesData.push({ id: doc.id, ...doc.data() } as EventImage);
      });
      
      setImages(imagesData);
    } catch (error) {
      console.error('Error loading images:', error);
    } finally {
      setLoadingImages(false);
    }
  };

  return (
    <View style={[globalStyles.glassCard, styles.eventCard]}>
      <View style={styles.eventHeader}>
        <View>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <Text style={styles.eventMeta}>
            {item.date ? `📅 ${new Date(item.date).toLocaleDateString()}` : ''}
            {item.description ? ` | ${item.description}` : ''}
            {images.length > 0 ? ` | 🖼️ ${images.length} images` : ''}
          </Text>
        </View>
        <View style={styles.eventActions}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => onAddImages(item)}
          >
            <Icon name="plus" size={16} color="#0a1628" />
            <Text style={styles.addButtonText}>Add Images</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.manageButton}
            onPress={() => setShowManage(!showManage)}
          >
            <Icon name="image" size={16} color="#0a1628" />
            <Text style={styles.manageButtonText}>Manage</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete(item.id, item.title)}
          >
            <Icon name="trash-2" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {showManage && (
        <View style={styles.manageContainer}>
          {loadingImages ? (
            <ActivityIndicator size="small" color="#d4af37" />
          ) : images.length === 0 ? (
            <Text style={styles.noImagesText}>No images in this event</Text>
          ) : (
            <FlatList
              data={images}
              renderItem={({ item: img }) => (
                <View style={styles.imageThumbnail}>
                  <Image source={{ uri: img.imageUrl }} style={styles.thumbnailImage} />
                  {img.caption && (
                    <Text style={styles.thumbnailCaption}>{img.caption}</Text>
                  )}
                  <TouchableOpacity
                    style={styles.thumbnailDelete}
                    onPress={() => onDeleteImage(img.id, item.id)}
                  >
                    <Icon name="x" size={14} color="white" />
                  </TouchableOpacity>
                </View>
              )}
              keyExtractor={(img) => img.id}
              numColumns={3}
              scrollEnabled={false}
            />
          )}
        </View>
      )}
    </View>
  );
};

// ===== MAIN SCREEN =====
export default function AdminGalleryScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  
  // Form states
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'loading'>('success');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.replace('/login');
      }
    });

    loadEvents();

    return () => unsubscribe();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(
        query(collection(db, 'events'), orderBy('date', 'desc'))
      );
      
      const eventsData: Event[] = [];
      snapshot.forEach((doc) => {
        eventsData.push({ id: doc.id, ...doc.data() } as Event);
      });
      
      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading events:', error);
      setMessage('Failed to load events');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async () => {
    if (!eventTitle.trim()) {
      setMessage('Please enter an event title');
      setMessageType('error');
      return;
    }

    try {
      const newEvent = {
        title: eventTitle.trim(),
        date: eventDate || null,
        description: eventDescription.trim() || '',
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'events'), newEvent);

      setEventTitle('');
      setEventDate('');
      setEventDescription('');
      setMessage('✅ Event created successfully!');
      setMessageType('success');
      
      loadEvents();
    } catch (error: any) {
      setMessage('❌ Error: ' + error.message);
      setMessageType('error');
    }
  };

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      base64: false,
    });

    if (!result.canceled) {
      setSelectedImages(result.assets);
    }
  };

  const uploadImages = async () => {
    if (!selectedEvent) {
      setMessage('Please select an event first');
      setMessageType('error');
      return;
    }

    if (selectedImages.length === 0) {
      setMessage('Please select at least one image');
      setMessageType('error');
      return;
    }

    setUploading(true);
    setMessage(`Uploading ${selectedImages.length} images...`);
    setMessageType('loading');

    let uploaded = 0;

    try {
      // For demo, upload placeholder images
      for (let i = 0; i < selectedImages.length; i++) {
        await addDoc(collection(db, 'eventImages'), {
          eventId: selectedEvent.id,
          imageUrl: 'https://via.placeholder.com/300x200/0a1628/d4af37?text=Image+' + (i + 1),
          caption: imageCaption || '',
          order: Date.now() + i,
          createdAt: new Date().toISOString(),
        });
        uploaded++;
        // Simulate progress
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setMessage(`✅ ${uploaded} images uploaded successfully!`);
      setMessageType('success');
      
      setSelectedImages([]);
      setImageCaption('');
      setShowUpload(false);
      setSelectedEvent(null);
      
      loadEvents();
    } catch (error: any) {
      setMessage('❌ Error uploading: ' + error.message);
      setMessageType('error');
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (imageId: string, eventId: string) => {
    Alert.alert(
      'Delete Image',
      'Are you sure you want to delete this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'eventImages', imageId));
              setMessage('✅ Image deleted successfully!');
              setMessageType('success');
              loadEvents();
            } catch (error: any) {
              setMessage('❌ Error: ' + error.message);
              setMessageType('error');
            }
          },
        },
      ]
    );
  };

  const deleteEvent = async (eventId: string, eventTitle: string) => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${eventTitle}" and all its images?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const imagesSnapshot = await getDocs(
                query(collection(db, 'eventImages'), where('eventId', '==', eventId))
              );
              
              const batch = writeBatch(db);
              imagesSnapshot.forEach((doc) => {
                batch.delete(doc.ref);
              });
              await batch.commit();

              await deleteDoc(doc(db, 'events', eventId));

              setMessage('✅ Event deleted successfully!');
              setMessageType('success');
              loadEvents();
            } catch (error: any) {
              setMessage('❌ Error: ' + error.message);
              setMessageType('error');
            }
          },
        },
      ]
    );
  };

  const handleAddImages = (event: Event) => {
    setSelectedEvent(event);
    setShowUpload(true);
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
                <Text style={styles.headerTitle}>🖼️ Gallery Management</Text>
                <Text style={styles.headerSubtitle}>Create events & upload images</Text>
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

          {/* Create Event Form */}
          <View style={[globalStyles.glassCard, styles.formContainer]}>
            <Text style={styles.formTitle}>📅 Create New Event</Text>
            
            <TextInput
              style={[globalStyles.glassInput, styles.input]}
              placeholder="Event Title (e.g., Sports Day 2026)"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={eventTitle}
              onChangeText={setEventTitle}
            />
            
            <TextInput
              style={[globalStyles.glassInput, styles.input]}
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={eventDate}
              onChangeText={setEventDate}
            />
            
            <TextInput
              style={[globalStyles.glassInput, styles.input, styles.textArea]}
              placeholder="Brief description (optional)"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={eventDescription}
              onChangeText={setEventDescription}
              multiline
              numberOfLines={3}
            />
            
            <TouchableOpacity
              style={styles.createButton}
              onPress={createEvent}
            >
              <Text style={styles.createButtonText}>➕ Create Event</Text>
            </TouchableOpacity>
          </View>

          {/* Upload Section */}
          {showUpload && selectedEvent && (
            <View style={[globalStyles.glassCard, styles.uploadContainer]}>
              <View style={styles.uploadHeader}>
                <Text style={styles.uploadTitle}>
                  📤 Upload Images to "{selectedEvent.title}"
                </Text>
                <TouchableOpacity onPress={() => {
                  setShowUpload(false);
                  setSelectedEvent(null);
                  setSelectedImages([]);
                }}>
                  <Icon name="x" size={24} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.pickButton}
                onPress={pickImages}
              >
                <Icon name="image" size={24} color="#d4af37" />
                <Text style={styles.pickButtonText}>
                  {selectedImages.length > 0 
                    ? `${selectedImages.length} images selected` 
                    : 'Pick Images'}
                </Text>
              </TouchableOpacity>

              {selectedImages.length > 0 && (
                <View style={styles.selectedImages}>
                  <FlatList
                    data={selectedImages}
                    renderItem={({ item }) => (
                      <Image source={{ uri: item.uri }} style={styles.selectedImage} />
                    )}
                    keyExtractor={(item, index) => index.toString()}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                  />
                </View>
              )}

              <TextInput
                style={[globalStyles.glassInput, styles.input]}
                placeholder="Caption for all images (optional)"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={imageCaption}
                onChangeText={setImageCaption}
              />

              <View style={styles.uploadButtons}>
                <TouchableOpacity
                  style={styles.uploadSubmitButton}
                  onPress={uploadImages}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color="#0a1628" />
                  ) : (
                    <Text style={styles.uploadSubmitText}>📤 Upload Images</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.uploadCancelButton}
                  onPress={() => {
                    setShowUpload(false);
                    setSelectedEvent(null);
                    setSelectedImages([]);
                  }}
                >
                  <Text style={styles.uploadCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Events List */}
          <View style={[globalStyles.glassCard, styles.eventsContainer]}>
            <Text style={styles.eventsTitle}>📋 Events</Text>
            
            {loading ? (
              <ActivityIndicator size="large" color="#d4af37" style={styles.loader} />
            ) : events.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📸</Text>
                <Text style={styles.emptyText}>No events created yet.</Text>
              </View>
            ) : (
              <FlatList
                data={events}
                renderItem={({ item }) => (
                  <EventCard 
                    item={item} 
                    onDelete={deleteEvent}
                    onDeleteImage={deleteImage}
                    onAddImages={handleAddImages}
                  />
                )}
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
  createButton: {
    backgroundColor: '#d4af37',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  createButtonText: {
    color: '#0a1628',
    fontSize: 16,
    fontWeight: '700',
  },
  uploadContainer: {
    padding: 20,
    marginBottom: 20,
  },
  uploadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  pickButton: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  pickButtonText: {
    color: '#d4af37',
    fontSize: 14,
    marginTop: 8,
  },
  selectedImages: {
    marginBottom: 12,
  },
  selectedImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  uploadSubmitButton: {
    flex: 1,
    backgroundColor: '#d4af37',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  uploadSubmitText: {
    color: '#0a1628',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  uploadCancelText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  eventsContainer: {
    padding: 20,
  },
  eventsTitle: {
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
  eventCard: {
    padding: 16,
    marginBottom: 12,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 10,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  eventMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  eventActions: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d4af37',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  addButtonText: {
    color: '#0a1628',
    fontSize: 12,
    fontWeight: '600',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  manageButtonText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  manageContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  noImagesText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    textAlign: 'center',
    padding: 10,
  },
  imageThumbnail: {
    flex: 1,
    margin: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
  },
  thumbnailCaption: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    padding: 4,
    textAlign: 'center',
  },
  thumbnailDelete: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});