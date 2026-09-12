import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker, Heatmap } from 'react-native-maps';
import * as Location from 'expo-location';
import { api } from '../services/api';

interface MapIssue {
  id: string;
  title: string;
  category: string;
  severity: string;
  latitude: number;
  longitude: number;
}

const SEVERITY_COLORS: Record<string, string> = {
  LOW: '#2E7D32',
  MEDIUM: '#F9A825',
  HIGH: '#E65100',
  CRITICAL: '#D32F2F',
};

const CATEGORY_ICONS: Record<string, string> = {
  pothole: '🕳️',
  garbage: '🗑️',
  streetlight: '💡',
  water_leak: '💧',
  drainage: '🚰',
  road_damage: '🛣️',
  construction: '🏗️',
  other: '📌',
};

export default function MapScreen({ navigation }: any) {
  const [issues, setIssues] = useState<MapIssue[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initLocation();
    fetchNearbyIssues();
  }, []);

  const initLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    }
  };

  const fetchNearbyIssues = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const result = await api.geo.nearby(loc.coords.latitude, loc.coords.longitude, 5000);
      const mapped = result.features.map((f: any) => ({
        id: f.properties.id,
        title: f.properties.title,
        category: f.properties.category,
        severity: f.properties.severity,
        latitude: f.geometry.coordinates[1],
        longitude: f.geometry.coordinates[0],
      }));
      setIssues(mapped);
    } catch (error) {
      console.log('Error fetching issues:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1565C0" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  const region = location
    ? {
        latitude: location.lat,
        longitude: location.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }
    : {
        latitude: 23.3441,
        longitude: 85.3096,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={region} showsUserLocation={true}>
        {issues.map((issue) => (
          <Marker
            key={issue.id}
            coordinate={{ latitude: issue.latitude, longitude: issue.longitude }}
            title={issue.title}
            description={`${issue.category} - ${issue.severity}`}
            onCalloutPress={() =>
              navigation.navigate('IssueDetail', { issueId: issue.id })
            }
          >
            <View
              style={[
                styles.marker,
                { backgroundColor: SEVERITY_COLORS[issue.severity] || '#999' },
              ]}
            >
              <Text style={styles.markerText}>
                {CATEGORY_ICONS[issue.category] || '📌'}
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Severity:</Text>
        {Object.entries(SEVERITY_COLORS).map(([level, color]) => (
          <View key={level} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{level}</Text>
          </View>
        ))}
      </View>

      <View style={styles.statsBar}>
        <Text style={styles.statsText}>📍 {issues.length} issues nearby</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#666' },
  map: { flex: 1 },
  marker: {
    width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff', elevation: 4,
  },
  markerText: { fontSize: 18 },
  legend: {
    position: 'absolute', bottom: 80, left: 12, backgroundColor: '#fff',
    borderRadius: 8, padding: 10, elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
  },
  legendTitle: { fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { fontSize: 11, color: '#666' },
  statsBar: {
    position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: '#fff',
    borderRadius: 12, padding: 14, alignItems: 'center', elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4,
  },
  statsText: { fontSize: 16, fontWeight: '600', color: '#1565C0' },
});
