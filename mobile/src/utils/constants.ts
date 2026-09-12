export const CATEGORIES = [
  { id: 'pothole', label: 'Pothole', icon: '🕳️', department: 'PWD', weight: 20 },
  { id: 'garbage', label: 'Garbage', icon: '🗑️', department: 'Municipal Corporation', weight: 15 },
  { id: 'streetlight', label: 'Street Light', icon: '💡', department: 'Electrical Department', weight: 12 },
  { id: 'water_leak', label: 'Water Leak', icon: '💧', department: 'Water Supply', weight: 18 },
  { id: 'drainage', label: 'Drainage', icon: '🚰', department: 'Drainage Board', weight: 16 },
  { id: 'road_damage', label: 'Road Damage', icon: '🛣️', department: 'PWD', weight: 19 },
  { id: 'construction', label: 'Construction', icon: '🏗️', department: 'Urban Development', weight: 14 },
  { id: 'other', label: 'Other', icon: '📌', department: 'General', weight: 10 },
];

export const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F9A825',
  ASSIGNED: '#1565C0',
  IN_PROGRESS: '#7B1FA2',
  RESOLVED: '#2E7D32',
  REJECTED: '#D32F2F',
};

export const SEVERITY_COLORS: Record<string, string> = {
  LOW: '#2E7D32',
  MEDIUM: '#F9A825',
  HIGH: '#E65100',
  CRITICAL: '#D32F2F',
};

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export const getCategoryById = (id: string) => {
  return CATEGORIES.find((c) => c.id === id);
};
