/**
 * patientPortal.js — API client for the patient login portal.
 *
 * Uses a separate axios instance with patient JWT from localStorage.
 * Tenant identified via X-Tenant-Subdomain (same as all other frontend APIs).
 */

import axios from 'axios';

const BASE      = import.meta.env.VITE_API_URL || '/api/v1';
const SUBDOMAIN = import.meta.env.VITE_TENANT_SUBDOMAIN || '';
const TOKEN_KEY = 'patient_token';

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use(config => {
  if (SUBDOMAIN) config.headers['X-Tenant-Subdomain'] = SUBDOMAIN;
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

export const patientPortalApi = {
  // ── Auth ────────────────────────────────────────────────────────────────────
  register: (data)       => api.post('/patient-portal/register', data),
  login:    (data)       => api.post('/patient-portal/login', data),
  changePassword: (data) => api.post('/patient-portal/change-password', data),

  // ── Profile ─────────────────────────────────────────────────────────────────
  getMe:    ()     => api.get('/patient-portal/me'),
  updateMe: (data) => api.put('/patient-portal/me', data),

  // ── Dashboard summary ────────────────────────────────────────────────────────
  getSummary: () => api.get('/patient-portal/summary'),

  // ── Appointments ─────────────────────────────────────────────────────────────
  getAppointments:    ()   => api.get('/patient-portal/appointments'),
  cancelAppointment:  (id) => api.delete(`/patient-portal/appointments/${id}`),

  // ── Clinical records ─────────────────────────────────────────────────────────
  getConsultations: () => api.get('/patient-portal/consultations'),
  getPrescriptions: () => api.get('/patient-portal/prescriptions'),
  getLabs:          () => api.get('/patient-portal/labs'),

  // ── Billing ──────────────────────────────────────────────────────────────────
  getInvoices:   ()   => api.get('/patient-portal/invoices'),
  getInvoice:    (id) => api.get(`/patient-portal/invoices/${id}`),
};

export const PATIENT_TOKEN_KEY = TOKEN_KEY;
