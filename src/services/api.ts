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

// Globale Server-Status-Variable
let serverAvailable = true;
let serverErrorShown = false;

// Fehleranzeige-Funktion (wird durch UI-Komponenten überschrieben)
let showServerErrorDialog = (error: any) => {
  console.error('Server-Fehler (keine UI-Handler registriert):', error);
};

// Fehleranzeige-Handler registrieren
export const registerServerErrorHandler = (handler: (error: any) => void) => {
  showServerErrorDialog = handler;
};

// Prüft, ob der Server erreichbar ist
export const checkServerHealth = async (): Promise<boolean> => {
  try {
    const baseURL = getBaseURL().replace('/api', '');
    const response = await axios.get(`${baseURL}/api/projects`, {
      timeout: 5000
    });
    serverAvailable = response.status >= 200 && response.status < 300;
    return serverAvailable;
  } catch (error) {
    console.error('Server Health Check failed:', error);
    serverAvailable = false;
    return false;
  }
};

// Axios-Instanz mit Basis-URL und Standardkonfiguration
const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000 // 10 Sekunden Timeout
});

// Request Interceptor für Fehlerbehandlung
api.interceptors.request.use(
  (config) => {
    if (!serverAvailable && !serverErrorShown) {
      console.warn('Server nicht verfügbar, aber Request wird trotzdem gesendet');
    }
    return config;
  },
  (error) => {
    console.error('Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

// Response Interceptor für Fehlerbehandlung
api.interceptors.response.use(
  (response) => {
    // Erfolgreiche Antwort
    serverAvailable = true;
    return response;
  },
  (error) => {
    // Fehlerbehandlung
    console.error('API Error:', {
      message: error.message,
      code: error.code,
      response: error.response?.status,
      url: error.config?.url
    });
    
    // Verbindungsfehler (Server nicht erreichbar)
    if (error.code === 'ECONNREFUSED' || error.code === 'ECONNABORTED' || error.message.includes('Network Error')) {
      serverAvailable = false;
      
      // Fehlerdialog nur einmal anzeigen
      if (!serverErrorShown) {
        serverErrorShown = true;
        
        // Fehler an UI-Komponente weiterleiten
        showServerErrorDialog({
          title: 'Server nicht erreichbar',
          message: 'Der Backend-Server ist nicht erreichbar.',
          detail: 'Bitte stellen Sie sicher, dass der Server auf Port 3030 läuft und überprüfen Sie Ihre Netzwerkverbindung.',
          type: 'error'
        });
      }
    }
    
    // Timeout-Fehler
    if (error.code === 'ETIMEDOUT') {
      serverAvailable = false;
      
      if (!serverErrorShown) {
        serverErrorShown = true;
        showServerErrorDialog({
          title: 'Server-Timeout',
          message: 'Der Server antwortet nicht.',
          detail: 'Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es später erneut.',
          type: 'warning'
        });
      }
    }
    
    return Promise.reject(error);
  }
);

// Server-Status exportieren
export const isServerAvailable = () => serverAvailable;
export const resetServerErrorFlag = () => {
  serverErrorShown = false;
};

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