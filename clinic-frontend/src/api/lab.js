import api from './index';

export const labApi = {
  // Test catalog
  getTests:    (params) => api.get('/lab/tests', { params }),
  createTest:  (data)   => api.post('/lab/tests', data),
  updateTest:  (id, data) => api.put(`/lab/tests/${id}`, data),
  deleteTest:  (id)     => api.delete(`/lab/tests/${id}`),

  // Requests
  getRequests:   (params) => api.get('/lab/requests', { params }),
  getRequest:    (id)     => api.get(`/lab/requests/${id}`),
  createRequest: (data)   => api.post('/lab/requests', data),
  enterResult:   (id, formData) => api.put(`/lab/requests/${id}/result`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  // Patient history
  getPatientHistory: (patientId) => api.get(`/lab/patients/${patientId}`),
};
