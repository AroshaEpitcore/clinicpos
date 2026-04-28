import api from './index';

export const appointmentsApi = {
  list:         (params) => api.get('/appointments', { params }),
  myDay:        ()       => api.get('/appointments/my-day'),
  create:       (data)   => api.post('/appointments', data),
  updateStatus: (id, status) => api.put(`/appointments/${id}`, { status }),
  makeEmergency:(id)     => api.put(`/appointments/${id}/emergency`),
  cancel:       (id)     => api.delete(`/appointments/${id}`),
};

export const doctorsApi = {
  list:           ()              => api.get('/doctors'),
  slots:          (id, date)      => api.get(`/doctors/${id}/slots`, { params: { date } }),
  getSchedule:    (doctorId)      => api.get(`/doctors/schedules/${doctorId}`),
  saveScheduleDay:(data)          => api.post('/doctors/schedules', data),
  listHolidays:   ()              => api.get('/doctors/holidays'),
  addHoliday:     (data)          => api.post('/doctors/holidays', data),
  deleteHoliday:  (id)            => api.delete(`/doctors/holidays/${id}`),
};
