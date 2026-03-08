import React, { useEffect } from 'react';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import InspectorPanel from './components/layout/InspectorPanel';
import NetplanCanvas from './components/canvas/NetplanCanvas';
import useProjectStore from './store/useProjectStore';
import useNetplanStore from './store/useNetplanStore';
import Toast from './components/ui/Toast';

const App: React.FC = () => {
  const { currentProject, loadLastOpenedProject } = useProjectStore();
  const { loadFromDatabase, toastMessage, showToast } = useNetplanStore();
  
  // Letztes geöffnetes Projekt beim App-Start laden
  useEffect(() => {
    loadLastOpenedProject().then(() => {
      if (currentProject?.id) {
        loadFromDatabase(currentProject.id);
      }
    });
  }, []);
  
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 relative">
          <NetplanCanvas />
        </div>
        <InspectorPanel />
      </div>
      {toastMessage && (
        <Toast 
          message={toastMessage} 
          onClose={() => showToast('')} 
        />
      )}
    </div>
  );
};

export default App;
