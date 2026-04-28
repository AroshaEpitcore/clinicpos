import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1/admin',
  headers: { 'Content-Type': 'application/json' },
});

// Attach token from localStorage on every request
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('admin_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// 401 → clear session and redirect to login
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const adminAuthApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
};

export const adminDashboardApi = {
  get: () => api.get('/dashboard'),
};

export const adminTenantsApi = {
  list:              (params)          => api.get('/tenants', { params }),
  get:               (id)             => api.get(`/tenants/${id}`),
  create:            (body)           => api.post('/tenants', body),
  update:            (id, body)       => api.put(`/tenants/${id}`, body),
  suspend:           (id)             => api.put(`/tenants/${id}/suspend`),
  activate:          (id)             => api.put(`/tenants/${id}/activate`),
  impersonate:       (id)             => api.post(`/tenants/${id}/impersonate`),
  setWebsiteEnabled: (id, enabled)    => api.patch(`/tenants/${id}/website-enabled`, { enabled }),
};

export const adminFlagsApi = {
  get:    (tenantId)        => api.get(`/feature-flags/${tenantId}`),
  update: (tenantId, flags) => api.put(`/feature-flags/${tenantId}`, { flags }),
};

export const adminPlansApi = {
  list:       ()          => api.get('/plans'),
  create:     (body)      => api.post('/plans', body),
  update:     (id, body)  => api.put(`/plans/${id}`, body),
  deactivate: (id)        => api.delete(`/plans/${id}`),
};

export const adminSubscriptionsApi = {
  list:       ()                    => api.get('/subscriptions'),
  setplan:    (tenantId, body)      => api.put(`/tenants/${tenantId}/subscription`, body),
  renew:      (tenantId)            => api.post(`/tenants/${tenantId}/renew`),
};

export const adminPlatformApi = {
  get:      ()               => api.get('/platform'),
  set:      (key, value)     => api.put('/platform', { key, value }),
  setBatch: (settings)       => api.put('/platform/batch', { settings }),
};

export const adminSystemApi = {
  health: ()       => api.get('/system/health'),
  logs:   (params) => api.get('/system/logs', { params }),
};

export const adminEnquiriesApi = {
  list:     ()   => api.get('/enquiries'),
  markRead: (id) => api.patch(`/enquiries/${id}/read`),
  delete:   (id) => api.delete(`/enquiries/${id}`),
};

export const adminAnnouncementsApi = {
  list:    ()          => api.get('/announcements'),
  create:  (body)      => api.post('/announcements', body),
  update:  (id, body)  => api.put(`/announcements/${id}`, body),
  publish: (id)        => api.patch(`/announcements/${id}/publish`),
  archive: (id)        => api.patch(`/announcements/${id}/archive`),
  delete:  (id)        => api.delete(`/announcements/${id}`),
};

export default api;
