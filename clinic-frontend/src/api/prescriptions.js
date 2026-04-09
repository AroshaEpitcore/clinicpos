import api from './index';

export const prescriptionsApi = {
  list:       (params)    => api.get('/prescriptions', { params }),
  create:     (data)      => api.post('/prescriptions', data),
  getById:    (id)        => api.get(`/prescriptions/${id}`),
  getByPatient: (patientId) => api.get(`/prescriptions/patient/${patientId}`),
};
