import api from './index';

export const reportsApi = {
  daily:       (date)         => api.get('/reports/daily',        { params: { date } }),
  monthly:     (year, month)  => api.get('/reports/monthly',      { params: { year, month } }),
  doctors:     (from, to)     => api.get('/reports/doctors',      { params: { from, to } }),
  medicines:   ()             => api.get('/reports/medicines'),
  patients:    (from, to)     => api.get('/reports/patients',     { params: { from, to } }),
  appointments:(from, to)     => api.get('/reports/appointments',  { params: { from, to } }),
  eodHistory:  (from, to)     => api.get('/reports/end-of-day/history', { params: { from, to } }),
};
