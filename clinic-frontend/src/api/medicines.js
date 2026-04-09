import api from './index';

export const medicinesApi = {
  list:       (params)   => api.get('/medicines', { params }),
  lowStock:   ()         => api.get('/medicines/low-stock'),
  nearExpiry: ()         => api.get('/medicines/near-expiry'),
  create:     (data)     => api.post('/medicines', data),
  update:     (id, data) => api.put(`/medicines/${id}`, data),
  remove:     (id)       => api.delete(`/medicines/${id}`),
};
