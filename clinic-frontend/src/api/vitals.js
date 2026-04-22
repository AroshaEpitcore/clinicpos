import api from './index';

export const vitalsApi = {
  record:          (data) => api.post('/vitals', data),
  getByAppointment:(id)   => api.get(`/vitals/appointment/${id}`),
};
