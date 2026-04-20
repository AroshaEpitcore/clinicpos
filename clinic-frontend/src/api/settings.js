import api from './index';

export const settingsApi = {
  get:              ()           => api.get('/settings'),
  getSubscription:  ()           => api.get('/settings/subscription'),
  update:           (data)       => api.put('/settings', data),
  uploadLogo:       (file)       => {
    const form = new FormData();
    form.append('logo', file);
    return api.post('/settings/logo', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  deleteLogo:       ()           => api.delete('/settings/logo'),
  uploadSignature:  (staffId, file) => {
    const form = new FormData();
    form.append('signature', file);
    return api.post(`/settings/staff/${staffId}/signature`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  deleteSignature:  (staffId)    => api.delete(`/settings/staff/${staffId}/signature`),
};
