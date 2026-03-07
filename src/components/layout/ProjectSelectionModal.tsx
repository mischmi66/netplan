import React, { useState, useEffect } from 'react';
import { X, Folder, Clock, Calendar, MapPin } from 'lucide-react';
import { projectApi } from '../../services/api';
import useProjectStore from '../../store/useProjectStore';
import useNetplanStore from '../../store/useNetplanStore';

interface Project {
  id: number;
  name: string;
  location: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProjectSelectionModal: React.FC<ProjectSelectionModalProps> = ({ isOpen, onClose }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { loadProject, currentProject } = useProjectStore();
  const { loadFromDatabase } = useNetplanStore();

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await projectApi.getAll();
      setProjects(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden der Projekte');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = async (projectId: number) => {
    try {
      await loadProject(projectId);
      
      // Netplan-Daten laden
      await loadFromDatabase(projectId);
      
      onClose();
    } catch (err: any) {
      console.error('Fehler beim Laden des Projekts:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-11/12 max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Folder className="text-blue-400" size={24} />
            <h2 className="text-xl font-bold text-white">Projektauswahl</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
            title="Schließen"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-grow">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-400 mb-4">{error}</div>
              <button
                onClick={fetchProjects}
                className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
              >
                Erneut versuchen
              </button>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Folder size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg">Keine Projekte gefunden</p>
              <p className="mt-2">Erstellen Sie Ihr erstes Projekt</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-blue-500 hover:bg-gray-750 ${
                    currentProject?.id === project.id 
                      ? 'border-blue-500 bg-gray-750' 
                      : 'border-gray-700 bg-gray-800'
                  }`}
                  onClick={() => handleProjectSelect(project.id)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-lg text-white flex items-center">
                        <Folder size={18} className="mr-2 text-blue-400" />
                        {project.name}
                      </h3>
                      {project.location && (
                        <p className="text-gray-300 mt-1 flex items-center">
                          <MapPin size={14} className="mr-1" />
                          {project.location}
                        </p>
                      )}
                    </div>
                    {currentProject?.id === project.id && (
                      <span className="px-2 py-1 text-xs bg-blue-500 text-white rounded">
                        Aktuell
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-4 text-sm text-gray-400 space-y-1">
                    <div className="flex items-center">
                      <Calendar size={14} className="mr-2" />
                      Erstellt: {formatDate(project.createdAt)}
                    </div>
                    <div className="flex items-center">
                      <Clock size={14} className="mr-2" />
                      Aktualisiert: {formatDate(project.updatedAt)}
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <button
                      className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProjectSelect(project.id);
                      }}
                    >
                      Öffnen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-gray-700 flex justify-between">
          <div className="text-sm text-gray-400">
            {projects.length} {projects.length === 1 ? 'Projekt' : 'Projekte'} gefunden
          </div>
          <div className="flex space-x-3">
            <button
              onClick={fetchProjects}
              className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
            >
              Aktualisieren
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectSelectionModal;