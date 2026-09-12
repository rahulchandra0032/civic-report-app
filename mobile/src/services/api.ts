import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_BASE_URL = 'http://localhost:8000/api/v1';
const AI_SERVICE_URL = 'http://localhost:8001';

const getToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync('auth_token');
  } catch {
    return null;
  }
};

const apiRequest = async (
  method: string,
  endpoint: string,
  data?: any,
  isFormData = false
) => {
  const token = await getToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const config: any = {
    method,
    headers,
  };

  if (data) {
    config.body = isFormData ? data : JSON.stringify(data);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.detail || error.message || 'Request failed');
  }

  return response.json();
};

export const api = {
  auth: {
    sendOtp: (phone: string) => apiRequest('POST', '/auth/send-otp', { phone }),
    verifyOtp: (phone: string, otp: string) =>
      apiRequest('POST', '/auth/verify-otp', { phone, otp }),
    register: (phone: string, name: string) =>
      apiRequest('POST', '/auth/register', { phone, name }),
  },

  issues: {
    create: (issueData: any) => apiRequest('POST', '/issues', issueData),
    list: (params?: Record<string, any>) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return apiRequest('GET', `/issues${query}`);
    },
    get: (id: string) => apiRequest('GET', `/issues/${id}`),
    update: (id: string, data: any) => apiRequest('PATCH', `/issues/${id}`, data),
    upvote: (id: string) => apiRequest('POST', `/issues/${id}/upvote`),
    myIssues: (params?: Record<string, any>) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return apiRequest('GET', `/issues/my${query}`);
    },
  },

  wards: {
    list: () => apiRequest('GET', '/wards'),
    boundaries: () => apiRequest('GET', '/wards/boundaries'),
    density: (id: number) => apiRequest('GET', `/wards/${id}/density`),
  },

  geo: {
    nearby: (lat: number, lng: number, radius?: number) => {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
        ...(radius && { radius: radius.toString() }),
      });
      return apiRequest('GET', `/geo/nearby?${params}`);
    },
    heatmap: (params?: Record<string, any>) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return apiRequest('GET', `/geo/heatmap${query}`);
    },
  },

  admin: {
    dashboard: () => apiRequest('GET', '/admin/dashboard'),
    issues: (params?: Record<string, any>) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return apiRequest('GET', `/admin/issues${query}`);
    },
    updateIssue: (id: string, data: any) => apiRequest('PATCH', `/admin/issues/${id}`, data),
    assign: (issueId: string, data: any) =>
      apiRequest('POST', `/admin/assign?issue_id=${issueId}`, data),
    slaReport: () => apiRequest('GET', '/admin/sla-report'),
  },

  ai: {
    classify: async (imageUri: string) => {
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri: imageUri,
        name: filename,
        type,
      } as any);

      const token = await getToken();
      const response = await fetch(`${AI_SERVICE_URL}/classify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token || ''}`,
        },
        body: formData,
      });

      return response.json();
    },

    process: async (imageUri: string) => {
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri: imageUri,
        name: filename,
        type,
      } as any);

      const token = await getToken();
      const response = await fetch(`${AI_SERVICE_URL}/process`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token || ''}`,
        },
        body: formData,
      });

      return response.json();
    },
  },
};
