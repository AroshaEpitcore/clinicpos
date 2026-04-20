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
  list:        (params)    => api.get('/tenants', { params }),
  get:         (id)        => api.get(`/tenants/${id}`),
  create:      (body)      => api.post('/tenants', body),
  update:      (id, body)  => api.put(`/tenants/${id}`, body),
  suspend:     (id)        => api.put(`/tenants/${id}/suspend`),
  activate:    (id)        => api.put(`/tenants/${id}/activate`),
  impersonate: (id)        => api.post(`/tenants/${id}/impersonate`),
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

export default api;
