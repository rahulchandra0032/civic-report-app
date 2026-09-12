const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

const getToken = (): string | null => localStorage.getItem('admin_token');

const apiRequest = async (method: string, endpoint: string, data?: any) => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.detail || error.message || 'Request failed');
  }

  return response.json();
};

export const adminApi = {
  auth: {
    login: (phone: string, otp: string) =>
      apiRequest('POST', '/auth/verify-otp', { phone, otp }),
  },

  dashboard: {
    getStats: () => apiRequest('GET', '/admin/dashboard'),
  },

  issues: {
    list: (params?: Record<string, any>) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return apiRequest('GET', `/admin/issues${query}`);
    },
    get: (id: string) => apiRequest('GET', `/issues/${id}`),
    update: (id: string, data: any) => apiRequest('PATCH', `/admin/issues/${id}`, data),
    assign: (issueId: string, data: any) =>
      apiRequest('POST', `/admin/assign?issue_id=${issueId}`, data),
  },

  sla: {
    getReport: () => apiRequest('GET', '/admin/sla-report'),
  },

  geo: {
    heatmap: (params?: Record<string, any>) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return apiRequest('GET', `/geo/heatmap${query}`);
    },
    nearby: (lat: number, lng: number, radius?: number) => {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
        ...(radius && { radius: radius.toString() }),
      });
      return apiRequest('GET', `/geo/nearby?${params}`);
    },
  },

  wards: {
    list: () => apiRequest('GET', '/wards'),
    boundaries: () => apiRequest('GET', '/wards/boundaries'),
  },
};
