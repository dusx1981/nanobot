import axios from 'axios';

const API_URL = 'http://localhost:8000';

export const api = {
  getProviders: () => axios.get(`${API_URL}/api/providers`),
  addProvider: (provider) => axios.post(`${API_URL}/api/providers`, provider),
  deleteProvider: (id) => axios.delete(`${API_URL}/api/providers/${id}`),
  getChannels: () => axios.get(`${API_URL}/api/channels`),
  toggleChannel: (id, enabled) => axios.post(`${API_URL}/api/channels/${id}/toggle?enabled=${enabled}`),
  getTemplates: () => axios.get(`${API_URL}/api/templates`),
  getTemplate: (name) => axios.get(`${API_URL}/api/templates/${name}`),
  updateTemplate: (name, content) => axios.put(`${API_URL}/api/templates/${name}`, { name, content }),
};
