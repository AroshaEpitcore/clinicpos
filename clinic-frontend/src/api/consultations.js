import api from './index';

export const consultationsApi = {
  list:         (params)      => api.get('/consultations', { params }),
  create:       (data)        => api.post('/consultations', data),
  getById:      (id)          => api.get(`/consultations/${id}`),
  getByPatient: (patientId)   => api.get(`/consultations/patient/${patientId}`),
  update:       (id, data)    => api.put(`/consultations/${id}`, data),
};
