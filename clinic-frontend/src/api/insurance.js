import api from './index';

export const insuranceApi = {
  // Invoice lookup (for New Claim modal)
  lookupInvoice: (invoice_number) =>
    api.get('/insurance/lookup-invoice', { params: { invoice_number } }),

  // Providers
  getProviders:   ()           => api.get('/insurance/providers'),
  createProvider: (data)       => api.post('/insurance/providers', data),
  updateProvider: (id, data)   => api.put(`/insurance/providers/${id}`, data),
  deleteProvider: (id)         => api.delete(`/insurance/providers/${id}`),

  // Claims
  getClaims:         (params)      => api.get('/insurance/claims', { params }),
  getClaim:          (id)          => api.get(`/insurance/claims/${id}`),
  createClaim:       (data)        => api.post('/insurance/claims', data),
  updateClaimStatus: (id, data)    => api.put(`/insurance/claims/${id}/status`, data),

  // Corporate accounts
  getCorporateAccounts:    ()        => api.get('/insurance/corporate-accounts'),
  createCorporateAccount:  (data)    => api.post('/insurance/corporate-accounts', data),
  updateCorporateAccount:  (id, data)=> api.put(`/insurance/corporate-accounts/${id}`, data),
  deleteCorporateAccount:  (id)      => api.delete(`/insurance/corporate-accounts/${id}`),
  getCorporateSummary:     (id, month) =>
    api.get(`/insurance/corporate-accounts/${id}/summary`, { params: { month } }),
};
