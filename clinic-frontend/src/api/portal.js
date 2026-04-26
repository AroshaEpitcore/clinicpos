/**
 * portal.js — Public API client for the patient booking portal (Phase 5.4)
 *
 * No JWT auth. Sends X-Tenant-Subdomain so the backend can identify the clinic.
 * Used only by BookingPage (/book) which is accessible without login.
 */

import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api/v1';
const SUBDOMAIN = import.meta.env.VITE_TENANT_SUBDOMAIN || '';

const publicApi = axios.create({ baseURL: BASE });

// Attach tenant subdomain header on every request
publicApi.interceptors.request.use(config => {
  if (SUBDOMAIN) {
    config.headers['X-Tenant-Subdomain'] = SUBDOMAIN;
  }
  return config;
});

export const portalApi = {
  /** Get clinic info (name, phone, address, portal enabled flag) */
  getInfo: () => publicApi.get('/portal/info'),

  /** Get list of active doctors */
  getDoctors: () => publicApi.get('/portal/doctors'),

  /** Get available time slots for a doctor on a date */
  getSlots: (doctorId, date) =>
    publicApi.get(`/portal/doctors/${doctorId}/slots`, { params: { date } }),

  /** Submit a booking */
  book: (data) => publicApi.post('/portal/book', data),

  /** Look up a booking by reference (e.g., BK-000001) */
  getBooking: (reference) => publicApi.get(`/portal/booking/${reference}`),

  /** Waiting-room TV display — public queue data grouped by doctor */
  getQueueDisplay: () => publicApi.get('/portal/queue-display'),

  /** All public data for the clinic's own website page */
  getWebsite: () => publicApi.get('/portal/website'),
};
