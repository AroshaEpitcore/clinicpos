import api from './index';

export const invoicesApi = {
  create:          (data)          => api.post('/invoices', data),
  list:            (params)        => api.get('/invoices', { params }),
  getById:         (id)            => api.get(`/invoices/${id}`),
  getByPatient:    (patientId)     => api.get(`/invoices/patient/${patientId}`),
  checkConsult:    (consultId)     => api.get(`/invoices/check/${consultId}`),
  addItem:         (id, data)      => api.put(`/invoices/${id}/items`, { action: 'add',    ...data }),
  removeItem:      (id, itemId)    => api.put(`/invoices/${id}/items`, { action: 'remove', item_id: itemId }),
  pay:             (id, data)      => api.post(`/invoices/${id}/pay`, data),
  downloadPdf:     (id)            => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
};

export const customServicesApi = {
  list:   (params) => api.get('/custom-services', { params }),
  create: (data)   => api.post('/custom-services', data),
  update: (id, data) => api.put(`/custom-services/${id}`, data),
  remove: (id)     => api.delete(`/custom-services/${id}`),
};

export const doctorFeesApi = {
  list:   ()              => api.get('/doctor-fees'),
  update: (doctorId, data) => api.put(`/doctor-fees/${doctorId}`, data),
};

export const endOfDayApi = {
  list:       (params) => api.get('/end-of-day', { params }),
  getSummary: (date)   => api.get(`/end-of-day/summary/${date}`),
  getByDate:  (date)   => api.get(`/end-of-day/${date}`),
  close:      (data)   => api.post('/end-of-day', data),
};
