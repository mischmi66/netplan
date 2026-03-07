import axios from 'axios';

// Basis-URL für API: Aus Umgebungsvariable oder Standardwert
const getBaseURL = () => {
  if (import.meta.env.PROD) {
    // In Electron-Production: Backend läuft auf localhost:3030
    // Verwendet VITE_API_URL aus .env oder Fallback
    return import.meta.env.VITE_API_URL || 'http://localhost:3030/api';
  }
  // In Development: Proxy über Vite
  return '/api';
};

// Axios-Instanz mit Basis-URL und Standardkonfiguration
const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json'
  }
});

// Projekt-APIs
export const projectApi = {
  // Alle Projekte laden
  getAll: () => api.get('/projects'),
  
  // Zuletzt geöffnetes Projekt laden
  getLastOpened: () => api.get('/projects/last-opened'),
  
  // Einzelnes Projekt nach ID laden
  getById: (id: number) => api.get(`/projects/${id}`),
  
  // Neues Projekt erstellen
  create: (data: { name: string; location?: string }) => 
    api.post('/projects', data),
  
  // Projekt aktualisieren
  update: (id: number, data: { name: string; location?: string }) => 
    api.put(`/projects/${id}`, data),
  
  // Projekt als zuletzt geöffnet markieren
  markAsOpen: (id: number) => api.put(`/projects/${id}/open`)
};

// Netplan-APIs (Knoten und Kanten)
export const netplanApi = {
  // Alle Knoten eines Projekts laden
  getNodes: (projectId: number) => 
    api.get(`/projects/${projectId}/nodes`),
  
  // Alle Kanten eines Projekts laden
  getEdges: (projectId: number) => 
    api.get(`/projects/${projectId}/edges`),
  
  // Vollständigen Netplan speichern
  saveNetplan: (projectId: number, data: { nodes: any[]; edges: any[] }) => 
    api.post(`/projects/${projectId}/save`, data)
};

export default api;