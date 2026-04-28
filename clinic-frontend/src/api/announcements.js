import api from './index';

export const announcementsApi = {
  list:    ()   => api.get('/settings/announcements'),
  dismiss: (id) => api.post(`/settings/announcements/${id}/dismiss`),
};
