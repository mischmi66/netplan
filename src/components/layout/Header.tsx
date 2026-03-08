import React, { useState, useEffect } from 'react';
import { Save, FileDown, Folder, FilePlus } from 'lucide-react';
import useProjectStore from '../../store/useProjectStore';
import useNetplanStore from '../../store/useNetplanStore';
import { exportToPDF } from '../../utils/export';
import ProjectSelectionModal from './ProjectSelectionModal';

const Header: React.FC = () => {
  const { currentProject, createProject, updateProject, newProject } = useProjectStore();
  const { saveToDatabase, showToast, resetCanvas } = useNetplanStore();
  
  const [showProjectModal, setShowProjectModal] = useState(false);
  
  const [projectName, setProjectName] = useState(currentProject?.name || '');
  const [location, setLocation] = useState(currentProject?.location || '');
  
  // Formularfelder aktualisieren, wenn sich currentProject ändert
  useEffect(() => {
    if (currentProject) {
      setProjectName(currentProject.name);
      setLocation(currentProject.location || '');
    } else {
      // Wenn kein Projekt geladen ist (z.B. nach "Neu"), Felder leeren
      setProjectName('');
      setLocation('');
    }
  }, [currentProject]);
  
  // Projektdaten speichern
  const saveProject = async () => {
    try {
      if (currentProject) {
        await updateProject({ name: projectName, location });
        await saveToDatabase(currentProject.id);
        showToast('Projekt erfolgreich gespeichert!');
      } else if (projectName) {
        await createProject(projectName, location);
        // Nach dem Erstellen ist das Projekt im Store, wir müssen es uns holen um die ID zu haben
        const newId = useProjectStore.getState().currentProject?.id;
        if (newId) {
          await saveToDatabase(newId);
        }
        showToast('Projekt erfolgreich erstellt!');
      } else {
        console.warn('Kein Projektname angegeben');
        showToast('Bitte geben Sie einen Projektnamen an.');
      }
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      showToast('Fehler beim Speichern des Projekts.');
    }
  };

  const handleNewProject = () => {
    newProject();
    resetCanvas();
  };
  
  // Netzwerkdiagramm als PDF exportieren
  const handleExport = () => {
    console.log('PDF-Export-Button wurde geklickt');
    
    if (!currentProject) {
      console.warn('Kein aktuelles Projekt für Export verfügbar');
      return;
    }
    
    console.log('Starte PDF-Export für Projekt:', currentProject.name);
    
    try {
      exportToPDF('netplan-canvas-container');
      console.log('PDF-Export-Funktion aufgerufen');
    } catch (error) {
      console.error('Fehler beim PDF-Export:', error);
      console.error('Fehlerdetails:', (error as Error).message);
    }
  };

  // Projekt-Modal öffnen
  const openProjectModal = () => {
    console.log('Öffnen-Button wurde geklickt');
    setShowProjectModal(true);
  };

  // Projekt-Modal schließen
  const closeProjectModal = () => {
    setShowProjectModal(false);
  };

  // Projekt auswählen und laden (wird vom Modal aufgerufen)
  // Diese Funktion wird von ProjectSelectionModal verwendet
  
  return (
    <header className="bg-gray-800 text-white p-4 shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <img 
            src={import.meta.env.VITE_LOGO_PATH || '/netplan_logo.jpeg'} 
            alt="Netplan Logo" 
            className="h-10 max-h-10" 
          />
          <h1 className="text-xl font-bold">Netplan</h1>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Projektname"
              className="px-2 py-1 rounded bg-gray-700 text-white"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              data-project-name
            />
            <input
              type="text"
              placeholder={`Standort (z.B. ${import.meta.env.VITE_LOCATION_PLACEHOLDER_NAME || 'Standort'})`}
              className="px-2 py-1 rounded bg-gray-700 text-white"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              data-project-location
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            className="px-3 py-1 bg-gray-600 rounded hover:bg-gray-700 flex items-center"
            onClick={handleNewProject}
            title="Neues Projekt erstellen"
          >
            <FilePlus size={16} className="mr-1" />
            Neu
          </button>
          <button
            className="px-3 py-1 bg-gray-600 rounded hover:bg-gray-700 flex items-center"
            onClick={openProjectModal}
            title="Projekt öffnen"
          >
            <Folder size={16} className="mr-1" />
            Öffnen
          </button>
          <button
            className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 flex items-center"
            onClick={saveProject}
            title="Projekt speichern"
          >
            <Save size={16} className="mr-1" />
            Speichern
          </button>
          <button
            className="px-3 py-1 bg-green-600 rounded hover:bg-green-700 flex items-center"
            onClick={handleExport}
            disabled={!currentProject}
            title="Als PDF exportieren"
          >
            <FileDown size={16} className="mr-1" />
            PDF Export
          </button>
          <span className="text-sm text-gray-400">
            {currentProject?.createdAt ? 
              `Erstellt: ${new Date(currentProject.createdAt).toLocaleDateString('de-DE')}` : ''}
          </span>
        </div>
      </div>
      <ProjectSelectionModal
        isOpen={showProjectModal}
        onClose={closeProjectModal}
      />
    </header>
  );
};

export default Header;