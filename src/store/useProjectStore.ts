import { create } from 'zustand';
import { projectApi } from '../services/api';
import useNetplanStore from './useNetplanStore'; // Import Netplan store

interface Project {
  id: number;
  name: string;
  location: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectState {
  currentProject: Project | null;
  loading: boolean;
  error: string | null;
  
  // Aktionen
  newProject: () => void;
  createProject: (name: string, location: string) => Promise<void>;
  loadProject: (id: number) => Promise<void>;
  loadLastOpenedProject: () => Promise<void>;
  updateProject: (data: Partial<Project>) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
}

const useProjectStore = create<ProjectState>((set, get) => ({
  currentProject: null,
  loading: false,
  error: null,

  newProject: () => {
    set({ currentProject: null });
  },
  
  createProject: async (name, location) => {
    set({ loading: true, error: null });
    try {
      const response = await projectApi.create({ name, location });
      set({ currentProject: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  loadProject: async (id) => {
    set({ loading: true, error: null });
    try {
      // Projekt laden
      const response = await projectApi.getById(id);
      
      // Als zuletzt geöffnet markieren
      await projectApi.markAsOpen(id);
      
      set({ currentProject: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  loadLastOpenedProject: async () => {
    set({ loading: true, error: null });
    try {
      const response = await projectApi.getLastOpened();
      set({ 
        currentProject: response.data || null, 
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  updateProject: async (data) => {
    if (!get().currentProject) return;
    
    set({ loading: true, error: null });
    try {
      const { id } = get().currentProject!;
      const response = await projectApi.update(id, data as any);
      
      set({ currentProject: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  deleteProject: async (id) => {
    set({ loading: true, error: null });
    try {
      await projectApi.delete(id);
      
      // Wenn das gelöschte Projekt das aktuell geöffnete war, zurücksetzen
      if (get().currentProject?.id === id) {
        set({ currentProject: null });
        useNetplanStore.getState().resetCanvas(); // Canvas leeren
      }

      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  }
}));

export default useProjectStore;