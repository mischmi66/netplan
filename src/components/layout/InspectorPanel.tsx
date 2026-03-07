import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import useNetplanStore from '../../store/useNetplanStore';

const InspectorPanel: React.FC = () => {
  const { selectedNode, selectedEdge, updateNodeData, updateEdgeData } = useNetplanStore();
  
  // Knoten-Daten-Status
  const [hostname, setHostname] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [vlan, setVlan] = useState('');
  const [credentials, setCredentials] = useState('');
  const [showCredentials, setShowCredentials] = useState(false);
  
  // Kanten-Daten-Status
  const [sourcePort, setSourcePort] = useState('');
  const [targetPort, setTargetPort] = useState('');
  const [edgeType, setEdgeType] = useState<'LAN' | 'WLAN' | 'Fiber'>('LAN');
  
  // Formular aktualisieren, wenn sich der ausgewählte Knoten ändert
  useEffect(() => {
    if (selectedNode) {
      setHostname(selectedNode.data?.hostname || '');
      setIpAddress(selectedNode.data?.ipAddress || '');
      setVlan(selectedNode.data?.vlan || '');
      setCredentials(selectedNode.data?.credentials || '');
    }
  }, [selectedNode]);
  
  // Formular aktualisieren, wenn sich die ausgewählte Kante ändert
  useEffect(() => {
    if (selectedEdge) {
      setSourcePort(selectedEdge.data?.sourcePort || '');
      setTargetPort(selectedEdge.data?.targetPort || '');
      setEdgeType(selectedEdge.data?.type || 'LAN');
    }
  }, [selectedEdge]);
  
  // Knotendaten speichern
  const saveNodeData = () => {
    if (selectedNode) {
      // Für annotationNodes verwenden wir ipAddress als Textfeld
      const nodeData = selectedNode.type === 'annotation' 
        ? { hostname, ipAddress, vlan: '', credentials: '' }
        : { hostname, ipAddress, vlan, credentials };
      
      updateNodeData(selectedNode.id, nodeData);
    }
  };
  
  // Kantendaten speichern
  const saveEdgeData = () => {
    if (selectedEdge) {
      updateEdgeData(selectedEdge.id, {
        sourcePort,
        targetPort,
        type: edgeType
      });
    }
  };
  
  // Umschalten der Anzeige von Zugangsdaten
  const toggleCredentialsVisibility = () => {
    setShowCredentials(!showCredentials);
  };
  
  // Den Inspector-Panel basierend auf der Auswahl rendern
  if (!selectedNode && !selectedEdge) {
    return (
      <aside className="w-72 bg-gray-100 p-4 shadow-md">
        <div className="text-center text-gray-500 italic">
          Wählen Sie einen Knoten oder eine Verbindung aus, um die Eigenschaften zu bearbeiten
        </div>
      </aside>
    );
  }
  
  if (selectedNode) {
    const isAnnotation = selectedNode.type === 'annotation';
    
    return (
      <aside className="w-72 bg-gray-100 p-4 shadow-md overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">
          {isAnnotation ? 'Text-Label Eigenschaften' : 'Knoteneigenschaften'}
        </h2>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm">
              {isAnnotation ? 'Beschriftung' : 'Hostname'}
            </label>
            <input
              type="text"
              className="w-full p-2 rounded border"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
            />
          </div>
          
          {isAnnotation ? (
            <div className="space-y-1">
              <label className="block text-sm">Anmerkung / Text</label>
              <textarea
                className="w-full p-2 rounded border min-h-[100px]"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                placeholder="Geben Sie hier Ihre Notiz ein..."
              />
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <label className="block text-sm">IP-Adresse</label>
                <input
                  type="text"
                  className="w-full p-2 rounded border"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                />
              </div>
              
              <div className="space-y-1">
                <label className="block text-sm">VLAN</label>
                <input
                  type="text"
                  className="w-full p-2 rounded border"
                  value={vlan}
                  onChange={(e) => setVlan(e.target.value)}
                />
              </div>
              
              <div className="space-y-1">
                <label className="block text-sm">Zugangsdaten (nicht exportiert)</label>
                <div className="relative">
                  <input
                    type={showCredentials ? "text" : "password"}
                    className="w-full p-2 rounded border pr-10"
                    value={credentials}
                    onChange={(e) => setCredentials(e.target.value)}
                    data-credentials-field
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={toggleCredentialsVisibility}
                  >
                    {showCredentials ? 
                      <EyeOff size={20} className="text-gray-500" /> : 
                      <Eye size={20} className="text-gray-500" />
                    }
                  </button>
                </div>
              </div>
            </>
          )}
          
          <button
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={saveNodeData}
          >
            Änderungen übernehmen
          </button>
        </div>
      </aside>
    );
  }
  
  if (selectedEdge) {
    return (
      <aside className="w-72 bg-gray-100 p-4 shadow-md overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Verbindungseigenschaften</h2>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm">Quell-Port</label>
            <input
              type="text"
              className="w-full p-2 rounded border"
              placeholder="z.B. Eth1"
              value={sourcePort}
              onChange={(e) => setSourcePort(e.target.value)}
            />
          </div>
          
          <div className="space-y-1">
            <label className="block text-sm">Ziel-Port</label>
            <input
              type="text"
              className="w-full p-2 rounded border"
              placeholder="z.B. Port 24"
              value={targetPort}
              onChange={(e) => setTargetPort(e.target.value)}
            />
          </div>
          
          <div className="space-y-1">
            <label className="block text-sm">Verbindungstyp</label>
            <select
              className="w-full p-2 rounded border"
              value={edgeType}
              onChange={(e) => setEdgeType(e.target.value as 'LAN' | 'WLAN' | 'Fiber')}
            >
              <option value="LAN">LAN (durchgezogen)</option>
              <option value="WLAN">WLAN (gestrichelt)</option>
              <option value="Fiber">Glasfaser (farbig)</option>
            </select>
          </div>
          
          <button
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={saveEdgeData}
          >
            Änderungen übernehmen
          </button>
        </div>
      </aside>
    );
  }
  
  // Dies sollte niemals passieren, aber TypeScript erfordert eine Rückgabe
  return null;
};

export default InspectorPanel;