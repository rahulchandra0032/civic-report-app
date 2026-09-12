import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { api } from '../services/api';
import { offlineQueue, QueuedIssue } from '../services/storage';

interface Issue {
  id: string;
  title: string;
  category: string;
  status: string;
  severity: string;
  image_url_before: string;
  upvotes: number;
  created_at: string;
  address?: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F9A825',
  ASSIGNED: '#1565C0',
  IN_PROGRESS: '#7B1FA2',
  RESOLVED: '#2E7D32',
  REJECTED: '#D32F2F',
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

export default function IssueListScreen({ navigation }: any) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [offlineIssues, setOfflineIssues] = useState<QueuedIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchIssues = useCallback(async (pageNum: number = 1, refresh = false) => {
    try {
      const result = await api.issues.list({ page: pageNum, per_page: 20 });
      if (refresh) {
        setIssues(result.issues);
      } else {
        setIssues((prev) => [...prev, ...result.issues]);
      }
      setHasMore(result.issues.length === 20);
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchOfflineIssues = async () => {
    const offline = await offlineQueue.getUnsynced();
    setOfflineIssues(offline);
  };

  useEffect(() => {
    fetchIssues(1, true);
    fetchOfflineIssues();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchIssues(1, true);
    await fetchOfflineIssues();
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchIssues(nextPage);
    }
  };

  const handleUpvote = async (issueId: string) => {
    try {
      const updated = await api.issues.upvote(issueId);
      setIssues((prev) =>
        prev.map((i) => (i.id === issueId ? { ...i, upvotes: updated.upvotes } : i))
      );
    } catch (error: any) {
      console.log('Upvote error:', error.message);
    }
  };

  const renderIssue = ({ item }: { item: Issue }) => (
    <TouchableOpacity
      style={styles.issueCard}
      onPress={() => navigation.navigate('IssueDetail', { issueId: item.id })}
    >
      <Image source={{ uri: item.image_url_before }} style={styles.issueImage} />
      <View style={styles.issueInfo}>
        <View style={styles.issueHeader}>
          <Text style={styles.issueIcon}>{CATEGORY_ICONS[item.category] || '📌'}</Text>
          <Text style={styles.issueTitle} numberOfLines={1}>{item.title}</Text>
        </View>
        <Text style={styles.issueCategory}>{item.category.replace('_', ' ')}</Text>
        {item.address && (
          <Text style={styles.issueAddress} numberOfLines={1}>📍 {item.address}</Text>
        )}
        <View style={styles.issueFooter}>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] || '#999' }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
          <TouchableOpacity style={styles.upvoteBtn} onPress={() => handleUpvote(item.id)}>
            <Text style={styles.upvoteText}>👍 {item.upvotes}</Text>
          </TouchableOpacity>
          <Text style={styles.severityText}>{item.severity}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderOfflineItem = ({ item }: { item: QueuedIssue }) => (
    <View style={[styles.issueCard, styles.offlineCard]}>
      <View style={styles.offlineBadge}>
        <Text style={styles.offlineBadgeText}>⚡ Offline</Text>
      </View>
      <View style={styles.issueInfo}>
        <Text style={styles.issueTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.issueCategory}>{item.category.replace('_', ' ')}</Text>
        <Text style={styles.offlineTime}>
          Saved: {new Date(item.createdAt).toLocaleString()}
        </Text>
      </View>
    </View>
  );

  if (loading && issues.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1565C0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={issues}
        keyExtractor={(item) => item.id}
        renderItem={renderIssue}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          offlineIssues.length > 0 ? (
            <View style={styles.offlineSection}>
              <Text style={styles.offlineSectionTitle}>
                📥 Pending Sync ({offlineIssues.length})
              </Text>
              <FlatList
                horizontal
                data={offlineIssues}
                keyExtractor={(item) => item.id}
                renderItem={renderOfflineItem}
                showsHorizontalScrollIndicator={false}
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No issues reported yet</Text>
            <Text style={styles.emptySubtext}>Be the first to report an issue!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 12 },
  issueCard: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, marginBottom: 12,
    overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3,
  },
  issueImage: { width: 100, height: 100 },
  issueInfo: { flex: 1, padding: 12 },
  issueHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  issueIcon: { fontSize: 18, marginRight: 6 },
  issueTitle: { fontSize: 16, fontWeight: '600', color: '#333', flex: 1 },
  issueCategory: { fontSize: 13, color: '#888', textTransform: 'capitalize' },
  issueAddress: { fontSize: 12, color: '#666', marginTop: 4 },
  issueFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  upvoteBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#E3F2FD' },
  upvoteText: { fontSize: 13, color: '#1565C0' },
  severityText: { fontSize: 12, color: '#999', marginLeft: 'auto' },
  offlineCard: { borderLeftWidth: 4, borderLeftColor: '#FF9800' },
  offlineBadge: { backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  offlineBadgeText: { color: '#E65100', fontSize: 11, fontWeight: '600' },
  offlineTime: { fontSize: 12, color: '#999', marginTop: 4 },
  offlineSection: { marginBottom: 16 },
  offlineSectionTitle: { fontSize: 16, fontWeight: '600', color: '#E65100', marginBottom: 8 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, color: '#666' },
  emptySubtext: { fontSize: 14, color: '#999', marginTop: 4 },
});
