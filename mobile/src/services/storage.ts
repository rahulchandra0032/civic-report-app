import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'offline_issue_queue';

export interface QueuedIssue {
  id: string;
  title: string;
  description?: string;
  category: string;
  imageUri: string;
  latitude: number;
  longitude: number;
  address?: string;
  createdAt: string;
  synced: boolean;
}

export const offlineQueue = {
  add: async (issue: Omit<QueuedIssue, 'id' | 'createdAt' | 'synced'>) => {
    const queue = await offlineQueue.getAll();
    const newIssue: QueuedIssue = {
      ...issue,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      synced: false,
    };
    queue.push(newIssue);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return newIssue;
  },

  getAll: async (): Promise<QueuedIssue[]> => {
    try {
      const data = await AsyncStorage.getItem(QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  getUnsynced: async (): Promise<QueuedIssue[]> => {
    const all = await offlineQueue.getAll();
    return all.filter((issue) => !issue.synced);
  },

  markSynced: async (id: string) => {
    const queue = await offlineQueue.getAll();
    const updated = queue.map((issue) =>
      issue.id === id ? { ...issue, synced: true } : issue
    );
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
  },

  remove: async (id: string) => {
    const queue = await offlineQueue.getAll();
    const updated = queue.filter((issue) => issue.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
  },

  clearSynced: async () => {
    const queue = await offlineQueue.getAll();
    const updated = queue.filter((issue) => !issue.synced);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
  },

  count: async (): Promise<number> => {
    const unsynced = await offlineQueue.getUnsynced();
    return unsynced.length;
  },
};
