import api from './index';

export const pharmacyApi = {
  // Suppliers
  getSuppliers:    ()         => api.get('/pharmacy/suppliers'),
  createSupplier:  (data)     => api.post('/pharmacy/suppliers', data),
  updateSupplier:  (id, data) => api.put(`/pharmacy/suppliers/${id}`, data),
  deleteSupplier:  (id)       => api.delete(`/pharmacy/suppliers/${id}`),

  // Purchase Orders
  getPurchaseOrders: (params) => api.get('/pharmacy/purchase-orders', { params }),
  getPurchaseOrder:  (id)     => api.get(`/pharmacy/purchase-orders/${id}`),
  createPurchaseOrder: (data) => api.post('/pharmacy/purchase-orders', data),
  receivePurchaseOrder: (id, data) => api.put(`/pharmacy/purchase-orders/${id}/receive`, data),

  // Dispense queue
  getDispenseQueue: (date)   => api.get('/pharmacy/dispense', { params: { date } }),
  dispense:         (id)     => api.post(`/pharmacy/dispense/${id}`),

  // Stock adjustments
  getAdjustments:    (params) => api.get('/pharmacy/stock-adjustments', { params }),
  createAdjustment:  (data)   => api.post('/pharmacy/stock-adjustments', data),
};
