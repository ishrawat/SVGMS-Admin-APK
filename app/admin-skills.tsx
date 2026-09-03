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
  Keyboard,
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
import Icon from '@expo/vector-icons/Feather';
import { globalStyles } from '../../src/styles/global';

interface Platform {
  name: string;
  url: string;
}

interface Skill {
  id: string;
  icon: string;
  name: string;
  category: string;
  description: string;
  platforms: Platform[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const CATEGORIES = [
  'Coding',
  'Data Science',
  'Design',
  'Digital Marketing',
  'Languages',
  'Soft Skills',
  'Other',
];

const CATEGORY_ICONS: Record<string, string> = {
  'Coding': '💻',
  'Data Science': '📊',
  'Design': '🎨',
  'Digital Marketing': '🌐',
  'Languages': '🗣️',
  'Soft Skills': '💼',
  'Other': '📌',
};

export default function AdminSkillsScreen() {
  const router = useRouter();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form states
  const [icon, setIcon] = useState('📌');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Coding');
  const [description, setDescription] = useState('');
  const [platforms, setPlatforms] = useState<Platform[]>([{ name: '', url: '' }]);
  
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'loading'>('success');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.replace('/login');
      }
    });

    loadSkills();

    return () => unsubscribe();
  }, []);

  const loadSkills = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(
        query(collection(db, 'skills'), orderBy('category', 'asc'))
      );
      
      const skillsData: Skill[] = [];
      snapshot.forEach((doc) => {
        skillsData.push({ id: doc.id, ...doc.data() } as Skill);
      });
      
      setSkills(skillsData);
    } catch (error) {
      console.error('Error loading skills:', error);
      setToastMessage('Failed to load skills');
      setToastType('error');
    } finally {
      setLoading(false);
    }
  };

  const addPlatformRow = () => {
    setPlatforms([...platforms, { name: '', url: '' }]);
  };

  const removePlatformRow = (index: number) => {
    if (platforms.length <= 1) {
      setToastMessage('Keep at least one platform');
      setToastType('error');
      return;
    }
    const newPlatforms = [...platforms];
    newPlatforms.splice(index, 1);
    setPlatforms(newPlatforms);
  };

  const updatePlatform = (index: number, field: keyof Platform, value: string) => {
    const newPlatforms = [...platforms];
    newPlatforms[index][field] = value;
    setPlatforms(newPlatforms);
  };

  const resetForm = () => {
    setIcon('📌');
    setName('');
    setCategory('Coding');
    setDescription('');
    setPlatforms([{ name: '', url: '' }]);
    setEditingId(null);
  };

  const saveSkill = async () => {
    if (!name.trim()) {
      setToastMessage('Please enter a skill name');
      setToastType('error');
      return;
    }

    const validPlatforms = platforms.filter(p => p.name.trim() && p.url.trim());
    if (validPlatforms.length === 0) {
      setToastMessage('Please add at least one platform');
      setToastType('error');
      return;
    }

    setToastMessage(editingId ? 'Updating skill...' : 'Adding skill...');
    setToastType('loading');

    try {
      const skillData = {
        icon: icon.trim() || '📌',
        name: name.trim(),
        category: category,
        description: description.trim(),
        platforms: validPlatforms,
        isActive: true,
        updatedAt: new Date().toISOString(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'skills', editingId), skillData);
        setToastMessage('✅ Skill updated successfully!');
        setToastType('success');
      } else {
        await addDoc(collection(db, 'skills'), {
          ...skillData,
          createdAt: new Date().toISOString(),
        });
        setToastMessage('✅ Skill added successfully!');
        setToastType('success');
      }

      resetForm();
      await loadSkills();

      setTimeout(() => {
        setToastMessage('');
      }, 3000);
    } catch (error: any) {
      console.error('Error:', error);
      setToastMessage('❌ Error: ' + error.message);
      setToastType('error');
    }
  };

  const editSkill = async (id: string) => {
    try {
      const docRef = doc(db, 'skills', id);
      const docSnap = await getDocs(query(collection(db, 'skills')));
      
      // Find the skill with matching id
      const skill = skills.find(s => s.id === id);
      if (!skill) {
        setToastMessage('Skill not found');
        setToastType('error');
        return;
      }

      setEditingId(id);
      setIcon(skill.icon || '📌');
      setName(skill.name || '');
      setCategory(skill.category || 'Coding');
      setDescription(skill.description || '');
      setPlatforms(skill.platforms && skill.platforms.length > 0 
        ? skill.platforms 
        : [{ name: '', url: '' }]
      );

      // Scroll to form
      setToastMessage('✏️ Editing skill');
      setToastType('success');
      setTimeout(() => setToastMessage(''), 2000);
    } catch (error: any) {
      console.error('Error loading skill for edit:', error);
      setToastMessage('❌ Error loading skill: ' + error.message);
      setToastType('error');
    }
  };

  const deleteSkill = async (id: string, name: string) => {
    Alert.alert(
      'Delete Skill',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'skills', id));
              setToastMessage('🗑️ Skill deleted!');
              setToastType('success');
              if (editingId === id) resetForm();
              await loadSkills();
            } catch (error: any) {
              setToastMessage('❌ Error: ' + error.message);
              setToastType('error');
            }
          },
        },
      ]
    );
  };

  const renderSkill = ({ item }: { item: Skill }) => (
    <View style={[globalStyles.glassCard, styles.skillCard]}>
      <View style={styles.cardContent}>
        <View style={styles.cardLeft}>
          <View style={styles.skillIconContainer}>
            <Text style={styles.skillIcon}>{item.icon || '📌'}</Text>
          </View>
          <View style={styles.skillInfo}>
            <View style={styles.skillHeader}>
              <Text style={styles.skillName}>{item.name}</Text>
              <Text style={styles.skillCategory}>{item.category}</Text>
            </View>
            {item.description ? (
              <Text style={styles.skillDescription}>{item.description}</Text>
            ) : null}
            <View style={styles.platformsContainer}>
              {item.platforms && item.platforms.map((p, idx) => (
                <View key={idx} style={styles.platformBadge}>
                  <Icon name="link" size={10} color="rgba(255,255,255,0.4)" />
                  <Text style={styles.platformBadgeText} numberOfLines={1}>
                    {p.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => editSkill(item.id)}
          >
            <Icon name="edit-2" size={14} color="#d4af37" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => deleteSkill(item.id, item.name)}
          >
            <Icon name="trash-2" size={14} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const isEditing = !!editingId;

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
                <Text style={styles.headerTitle}>🎓 Free Skills Management</Text>
                <Text style={styles.headerSubtitle}>Manage skill resources & platforms</Text>
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

          {/* Add/Edit Skill Form */}
          <View style={[globalStyles.glassCard, styles.formContainer]}>
            <Text style={styles.formTitle}>
              {isEditing ? '✏️ Edit Skill' : '➕ Add New Skill'}
            </Text>

            <Text style={styles.formLabel}>Icon</Text>
            <TextInput
              style={[globalStyles.glassInput, styles.input, styles.iconInput]}
              placeholder="e.g., 💻, 📊, 🎨"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={icon}
              onChangeText={setIcon}
              maxLength={2}
            />

            <Text style={styles.formLabel}>Skill Name *</Text>
            <TextInput
              style={[globalStyles.glassInput, styles.input]}
              placeholder="e.g., Python Programming"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.formLabel}>Category *</Text>
            <View style={styles.categorySelector}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryOption,
                    category === cat && styles.categoryOptionActive,
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={styles.categoryOptionText}>
                    {CATEGORY_ICONS[cat]} {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>Description</Text>
            <TextInput
              style={[globalStyles.glassInput, styles.input, styles.textArea]}
              placeholder="Brief description of the skill..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.formLabel}>Platforms (Course Providers)</Text>
            {platforms.map((platform, index) => (
              <View key={index} style={styles.platformRow}>
                <TextInput
                  style={[globalStyles.glassInput, styles.platformInput]}
                  placeholder="Platform name"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={platform.name}
                  onChangeText={(text) => updatePlatform(index, 'name', text)}
                />
                <TextInput
                  style={[globalStyles.glassInput, styles.platformInput, styles.urlInput]}
                  placeholder="URL"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={platform.url}
                  onChangeText={(text) => updatePlatform(index, 'url', text)}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.removePlatformButton}
                  onPress={() => removePlatformRow(index)}
                >
                  <Icon name="x" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addPlatformButton}
              onPress={addPlatformRow}
            >
              <Icon name="plus" size={16} color="#d4af37" />
              <Text style={styles.addPlatformText}>Add Platform</Text>
            </TouchableOpacity>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[globalStyles.primaryButton, styles.saveButton]}
                onPress={saveSkill}
              >
                <Text style={styles.saveButtonText}>
                  {isEditing ? '💾 Update Skill' : '➕ Add Skill'}
                </Text>
              </TouchableOpacity>
              {isEditing && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={resetForm}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Skills List */}
          <View style={[globalStyles.glassCard, styles.listContainer]}>
            <Text style={styles.listTitle}>📋 All Skills</Text>

            {loading ? (
              <ActivityIndicator size="large" color="#d4af37" style={styles.loader} />
            ) : skills.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🎓</Text>
                <Text style={styles.emptyText}>No skills added yet.</Text>
              </View>
            ) : (
              <FlatList
                data={skills}
                renderItem={renderSkill}
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
  iconInput: {
    width: 60,
    textAlign: 'center',
    fontSize: 24,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  categoryOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  categoryOptionActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  categoryOptionText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  platformInput: {
    flex: 1,
    marginBottom: 0,
  },
  urlInput: {
    flex: 2,
  },
  removePlatformButton: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
  },
  addPlatformButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    marginBottom: 16,
  },
  addPlatformText: {
    color: '#d4af37',
    fontSize: 13,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  saveButton: {
    flex: 2,
    paddingVertical: 14,
  },
  saveButtonText: {
    color: '#0a1628',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cancelButtonText: {
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
  skillCard: {
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
  skillIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  skillIcon: {
    fontSize: 20,
  },
  skillInfo: {
    flex: 1,
  },
  skillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  skillCategory: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  skillDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  platformsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  platformBadgeText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    maxWidth: 80,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
  },
  editButton: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
});