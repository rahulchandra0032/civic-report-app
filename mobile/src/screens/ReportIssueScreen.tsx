import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
  FlatList,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import { api } from '../services/api';
import { offlineQueue } from '../services/storage';
import NetInfo from '@react-native-community/netinfo';

const CATEGORIES = [
  { id: 'pothole', label: '🕳️ Pothole', color: '#E65100' },
  { id: 'garbage', label: '🗑️ Garbage', color: '#2E7D32' },
  { id: 'streetlight', label: '💡 Street Light', color: '#F9A825' },
  { id: 'water_leak', label: '💧 Water Leak', color: '#1565C0' },
  { id: 'drainage', label: '🚰 Drainage', color: '#6A1B9A' },
  { id: 'road_damage', label: '🛣️ Road Damage', color: '#BF360C' },
  { id: 'construction', label: '🏗️ Construction', color: '#4E342E' },
  { id: 'other', label: '📌 Other', color: '#546E7A' },
];

export default function ReportIssueScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [aiResult, setAiResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location permission is required to report issues');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const reverseGeo = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      const address = reverseGeo[0]
        ? [reverseGeo[0].name, reverseGeo[0].street, reverseGeo[0].district, reverseGeo[0].city]
            .filter(Boolean)
            .join(', ')
        : '';

      setLocation({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        address,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not get location');
    } finally {
      setLocationLoading(false);
    }
  };

  const pickImage = async (useCamera: boolean) => {
    const permResult = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permResult.granted) {
      Alert.alert('Permission needed', `${useCamera ? 'Camera' : 'Gallery'} permission is required`);
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          allowsEditing: true,
          aspect: [4, 3],
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          allowsEditing: true,
          aspect: [4, 3],
        });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setImageUri(uri);

      try {
        const aiResult = await api.ai.process(uri);
        setAiResult(aiResult);
        if (!category && aiResult.classification?.category) {
          setCategory(aiResult.classification.category);
          if (!title) {
            setTitle(aiResult.classification.category.replace('_', ' ').toUpperCase());
          }
        }
      } catch (error) {
        console.log('AI classification skipped:', error);
      }
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    if (!category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    if (!imageUri) {
      Alert.alert('Error', 'Please take or select a photo');
      return;
    }
    if (!location) {
      Alert.alert('Error', 'Location is required');
      return;
    }

    setLoading(true);
    try {
      const netInfo = await NetInfo.fetch();

      const issueData = {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        image_url: imageUri,
        latitude: location.lat,
        longitude: location.lng,
        address: location.address || undefined,
      };

      if (netInfo.isConnected) {
        await api.issues.create(issueData);
        Alert.alert('Success', 'Issue reported successfully!', [
          { text: 'OK', onPress: () => navigation.navigate('IssueList') },
        ]);
      } else {
        await offlineQueue.add(issueData);
        Alert.alert('Saved Offline', 'Issue saved. It will be submitted when you are back online.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Report an Issue</Text>

      {/* Photo Section */}
      <View style={styles.photoSection}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>📷</Text>
            <Text style={styles.placeholderLabel}>Take or select a photo</Text>
          </View>
        )}
        <View style={styles.photoButtons}>
          <TouchableOpacity style={styles.photoBtn} onPress={() => pickImage(true)}>
            <Text style={styles.photoBtnText}>📷 Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoBtn} onPress={() => pickImage(false)}>
            <Text style={styles.photoBtnText}>🖼️ Gallery</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* AI Classification Result */}
      {aiResult?.classification && (
        <View style={styles.aiResult}>
          <Text style={styles.aiLabel}>🤖 AI Classification:</Text>
          <Text style={styles.aiCategory}>
            {aiResult.classification.category.replace('_', ' ').toUpperCase()}
          </Text>
          <Text style={styles.aiConfidence}>
            Confidence: {(aiResult.classification.confidence * 100).toFixed(1)}%
          </Text>
          {aiResult.severity && (
            <Text style={[styles.aiSeverity, { color: getSeverityColor(aiResult.severity.severity_level) }]}>
              Severity: {aiResult.severity.severity_level} (Score: {aiResult.severity.severity_score})
            </Text>
          )}
        </View>
      )}

      {/* Category Selection */}
      <Text style={styles.label}>Category *</Text>
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryChip,
              category === item.id && { backgroundColor: item.color, borderColor: item.color },
            ]}
            onPress={() => setCategory(item.id)}
          >
            <Text
              style={[
                styles.categoryChipText,
                category === item.id && { color: '#fff' },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
        showsHorizontalScrollIndicator={false}
        style={styles.categoryList}
      />

      {/* Title */}
      <Text style={styles.label}>Title *</Text>
      <TextInput
        style={styles.input}
        placeholder="Brief description of the issue"
        value={title}
        onChangeText={setTitle}
      />

      {/* Description */}
      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Detailed description (optional)"
        multiline
        numberOfLines={4}
        value={description}
        onChangeText={setDescription}
      />

      {/* Location */}
      <Text style={styles.label}>📍 Location</Text>
      {locationLoading ? (
        <View style={styles.locationBox}>
          <ActivityIndicator color="#1565C0" />
          <Text style={styles.locationText}>Getting location...</Text>
        </View>
      ) : location ? (
        <View style={styles.locationBox}>
          <Text style={styles.locationCoords}>
            {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
          </Text>
          <Text style={styles.locationAddress}>{location.address}</Text>
          <TouchableOpacity onPress={getCurrentLocation}>
            <Text style={styles.refreshLocation}>Refresh Location</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.locationBox} onPress={getCurrentLocation}>
          <Text style={styles.locationText}>Tap to get location</Text>
        </TouchableOpacity>
      )}

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>Submit Report</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function getSeverityColor(level: string): string {
  switch (level) {
    case 'CRITICAL': return '#D32F2F';
    case 'HIGH': return '#E65100';
    case 'MEDIUM': return '#F9A825';
    case 'LOW': return '#2E7D32';
    default: return '#666';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#1565C0', marginBottom: 20 },
  photoSection: { marginBottom: 16 },
  preview: { width: '100%', height: 200, borderRadius: 12, marginBottom: 8 },
  placeholder: {
    width: '100%', height: 200, borderRadius: 12, backgroundColor: '#E3F2FD',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#BBDEFB',
    borderStyle: 'dashed', marginBottom: 8,
  },
  placeholderText: { fontSize: 48 },
  placeholderLabel: { color: '#666', marginTop: 8 },
  photoButtons: { flexDirection: 'row', gap: 12 },
  photoBtn: {
    flex: 1, backgroundColor: '#1565C0', borderRadius: 8, padding: 12, alignItems: 'center',
  },
  photoBtnText: { color: '#fff', fontWeight: '600' },
  aiResult: {
    backgroundColor: '#E8F5E9', padding: 12, borderRadius: 8, marginBottom: 16,
    borderLeftWidth: 4, borderLeftColor: '#2E7D32',
  },
  aiLabel: { fontSize: 14, color: '#2E7D32', fontWeight: '600' },
  aiCategory: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20', marginTop: 4 },
  aiConfidence: { fontSize: 14, color: '#555', marginTop: 2 },
  aiSeverity: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 8 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 12,
    padding: 14, fontSize: 16, marginBottom: 12,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  categoryList: { marginBottom: 8 },
  categoryChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', marginRight: 8,
  },
  categoryChipText: { fontSize: 14, color: '#333' },
  locationBox: {
    backgroundColor: '#fff', padding: 14, borderRadius: 12, borderWidth: 1,
    borderColor: '#ddd', marginBottom: 16,
  },
  locationCoords: { fontSize: 14, color: '#666', fontFamily: 'monospace' },
  locationAddress: { fontSize: 14, color: '#333', marginTop: 4 },
  locationText: { color: '#1565C0', textAlign: 'center' },
  refreshLocation: { color: '#1565C0', marginTop: 8, textAlign: 'center' },
  submitBtn: {
    backgroundColor: '#2E7D32', borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
