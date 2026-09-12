import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { api } from '../services/api';
import * as SecureStore from 'expo-secure-store';

interface IssueDetail {
  id: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  severity: string;
  severity_score?: number;
  image_url_before: string;
  image_url_after?: string;
  latitude: number;
  longitude: number;
  address?: string;
  ward_id?: number;
  reporter_id: string;
  upvotes: number;
  ai_confidence?: number;
  created_at: string;
  updated_at: string;
  assigned_at?: string;
  resolved_at?: string;
  sla_deadline?: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F9A825',
  ASSIGNED: '#1565C0',
  IN_PROGRESS: '#7B1FA2',
  RESOLVED: '#2E7D32',
  REJECTED: '#D32F2F',
};

const SEVERITY_COLORS: Record<string, string> = {
  LOW: '#2E7D32',
  MEDIUM: '#F9A825',
  HIGH: '#E65100',
  CRITICAL: '#D32F2F',
};

export default function IssueDetailScreen({ route, navigation }: any) {
  const { issueId } = route.params;
  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [upvoting, setUpvoting] = useState(false);

  useEffect(() => {
    fetchIssue();
  }, [issueId]);

  const fetchIssue = async () => {
    try {
      const data = await api.issues.get(issueId);
      setIssue(data);
    } catch (error: any) {
      Alert.alert('Error', error.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async () => {
    if (upvoting) return;
    setUpvoting(true);
    try {
      const updated = await api.issues.upvote(issueId);
      setIssue((prev) => prev ? { ...prev, upvotes: updated.upvotes } : null);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setUpvoting(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  const getTimeRemaining = (deadline?: string) => {
    if (!deadline) return null;
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff <= 0) return { text: 'SLA Breached', color: '#D32F2F' };
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return { text: `${days}d ${hours % 24}h remaining`, color: '#2E7D32' };
    return { text: `${hours}h remaining`, color: hours < 12 ? '#E65100' : '#2E7D32' };
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1565C0" />
      </View>
    );
  }

  if (!issue) return null;

  const slaInfo = getTimeRemaining(issue.sla_deadline);

  return (
    <ScrollView style={styles.container}>
      <Image source={{ uri: issue.image_url_before }} style={styles.image} />

      {issue.image_url_after && (
        <View style={styles.resolutionSection}>
          <Text style={styles.resolutionLabel}>✅ Resolution Photo:</Text>
          <Image source={{ uri: issue.image_url_after }} style={styles.resolutionImage} />
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.title}>{issue.title}</Text>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: STATUS_COLORS[issue.status] }]}>
            <Text style={styles.badgeText}>{issue.status}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: SEVERITY_COLORS[issue.severity] }]}>
            <Text style={styles.badgeText}>{issue.severity}</Text>
          </View>
          {issue.severity_score !== undefined && (
            <View style={[styles.badge, { backgroundColor: '#666' }]}>
              <Text style={styles.badgeText}>Score: {issue.severity_score.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {issue.description && (
          <Text style={styles.description}>{issue.description}</Text>
        )}

        <View style={styles.infoCard}>
          <InfoRow label="Category" value={issue.category.replace('_', ' ')} />
          <InfoRow label="📍 Location" value={`${issue.latitude.toFixed(6)}, ${issue.longitude.toFixed(6)}`} />
          {issue.address && <InfoRow label="Address" value={issue.address} />}
          {issue.ward_id && <InfoRow label="Ward" value={`#${issue.ward_id}`} />}
          <InfoRow label="Reported" value={formatDate(issue.created_at)} />
          {issue.assigned_at && <InfoRow label="Assigned" value={formatDate(issue.assigned_at)} />}
          {issue.resolved_at && <InfoRow label="Resolved" value={formatDate(issue.resolved_at)} />}
          {issue.ai_confidence !== undefined && (
            <InfoRow label="AI Confidence" value={`${(issue.ai_confidence * 100).toFixed(1)}%`} />
          )}
        </View>

        {slaInfo && (
          <View style={[styles.slaCard, { borderLeftColor: slaInfo.color }]}>
            <Text style={[styles.slaText, { color: slaInfo.color }]}>⏰ {slaInfo.text}</Text>
            <Text style={styles.slaDeadline}>Deadline: {formatDate(issue.sla_deadline)}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.upvoteBtn, upvoting && styles.upvoteBtnDisabled]}
          onPress={handleUpvote}
          disabled={upvoting}
        >
          <Text style={styles.upvoteBtnText}>👍 Upvote ({issue.upvotes})</Text>
        </TouchableOpacity>

        <Text style={styles.lastUpdated}>
          Last updated: {formatDate(issue.updated_at)}
        </Text>
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: 250 },
  resolutionSection: { padding: 12, backgroundColor: '#E8F5E9' },
  resolutionLabel: { fontSize: 14, fontWeight: '600', color: '#2E7D32', marginBottom: 8 },
  resolutionImage: { width: '100%', height: 150, borderRadius: 8 },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  badgeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  description: { fontSize: 16, color: '#555', marginBottom: 16, lineHeight: 22 },
  infoCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  infoLabel: { fontSize: 14, color: '#888', flex: 1 },
  infoValue: { fontSize: 14, color: '#333', fontWeight: '500', flex: 2, textAlign: 'right' },
  slaCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 16,
    borderLeftWidth: 4, elevation: 1,
  },
  slaText: { fontSize: 16, fontWeight: '600' },
  slaDeadline: { fontSize: 13, color: '#999', marginTop: 4 },
  upvoteBtn: {
    backgroundColor: '#1565C0', borderRadius: 12, padding: 16, alignItems: 'center',
    marginBottom: 16,
  },
  upvoteBtnDisabled: { opacity: 0.6 },
  upvoteBtnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  lastUpdated: { fontSize: 12, color: '#999', textAlign: 'center' },
});
