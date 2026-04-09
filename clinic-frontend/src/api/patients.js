import api from './index';

export const patientsApi = {
  list: (params) =>
    api.get('/patients', { params }),

  getById: (id) =>
    api.get(`/patients/${id}`),

  create: (data) =>
    api.post('/patients', data),

  update: (id, data) =>
    api.put(`/patients/${id}`, data),

  softDelete: (id) =>
    api.delete(`/patients/${id}`),

  checkDuplicate: (params) =>
    api.get('/patients/check-duplicate', { params }),

  searchReturning: (phone) =>
    api.get('/patients/returning', { params: { phone } }),
};
