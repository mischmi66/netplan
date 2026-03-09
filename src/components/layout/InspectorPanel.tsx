import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import useNetplanStore from '../../store/useNetplanStore';
import IconGallery from '../shared/IconGallery';

const InspectorPanel: React.FC = () => {
  const { selectedNode, selectedEdge, updateNodeData, updateEdgeData } = useNetplanStore();
  
  // Node state
  const [hostname, setHostname] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [vlan, setVlan] = useState('');
  const [credentials, setCredentials] = useState('');
  const [showCredentials, setShowCredentials] = useState(false);
  
  // Edge state
  const [sourcePort, setSourcePort] = useState('');
  const [targetPort, setTargetPort] = useState('');
  const [edgeType, setEdgeType] = useState<'LAN' | 'WLAN' | 'Fiber'>('LAN');
  
  useEffect(() => {
    if (selectedNode) {
      setHostname(selectedNode.data?.hostname || '');
      setIpAddress(selectedNode.data?.ipAddress || '');
      setVlan(selectedNode.data?.vlan || '');
      setCredentials(selectedNode.data?.credentials || '');
    }
  }, [selectedNode]);
  
  useEffect(() => {
    if (selectedEdge) {
      setSourcePort(selectedEdge.data?.sourcePort || '');
      setTargetPort(selectedEdge.data?.targetPort || '');
      setEdgeType(selectedEdge.data?.type || 'LAN');
    }
  }, [selectedEdge]);
  
  const saveNodeData = () => {
    if (selectedNode) {
      const nodeData = selectedNode.type === 'annotation' 
        ? { hostname, ipAddress }
        : { hostname, ipAddress, vlan, credentials, overlayIcon: selectedNode.data?.overlayIcon };
      updateNodeData(selectedNode.id, nodeData);
    }
  };

  const saveEdgeData = () => {
    if (selectedEdge) {
      updateEdgeData(selectedEdge.id, {
        sourcePort,
        targetPort,
        type: edgeType
      });
    }
  };

  const handleOverlayIconSelect = (iconName: string) => {
    if (selectedNode) {
      updateNodeData(selectedNode.id, { overlayIcon: iconName });
    }
  };
   
  const toggleCredentialsVisibility = () => {
    setShowCredentials(!showCredentials);
  };
  
  if (!selectedNode && !selectedEdge) {
    return (
      <aside className="w-72 bg-gray-100 p-4 shadow-md">
        <div className="text-center text-gray-500 italic">
          Select a node or edge to edit its properties
        </div>
      </aside>
    );
  }
  
  if (selectedNode) {
    const isAnnotation = selectedNode.type === 'annotation';
    return (
      <aside className="w-72 bg-gray-100 p-4 shadow-md overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">
          {isAnnotation ? 'Annotation Properties' : 'Node Properties'}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm">
              {isAnnotation ? 'Label' : 'Hostname'}
            </label>
            <input
              type="text"
              className="w-full p-2 rounded border"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
            />
          </div>
          
          {isAnnotation ? (
            <div>
              <label className="block text-sm">Text</label>
              <textarea
                className="w-full p-2 rounded border min-h-[100px]"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm">IP Address</label>
                <input
                  type="text"
                  className="w-full p-2 rounded border"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm">VLAN</label>
                <input
                  type="text"
                  className="w-full p-2 rounded border"
                  value={vlan}
                  onChange={(e) => setVlan(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm">Credentials</label>
                <div className="relative">
                  <input
                    type={showCredentials ? "text" : "password"}
                    className="w-full p-2 rounded border pr-10"
                    value={credentials}
                    onChange={(e) => setCredentials(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={toggleCredentialsVisibility}
                  >
                    {showCredentials ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </>
          )}

          {selectedNode.type !== 'annotation' && selectedNode.type !== 'icon' && (
            <IconGallery
              selectedValue={selectedNode.data?.overlayIcon}
              onSelect={handleOverlayIconSelect}
            />
          )}
          
          <button
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={saveNodeData}
          >
            Apply Changes
          </button>
        </div>
      </aside>
    );
  }
  
  if (selectedEdge) {
    return (
      <aside className="w-72 bg-gray-100 p-4 shadow-md overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Edge Properties</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm">Source Port</label>
            <input
              type="text"
              className="w-full p-2 rounded border"
              value={sourcePort}
              onChange={(e) => setSourcePort(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm">Target Port</label>
            <input
              type="text"
              className="w-full p-2 rounded border"
              value={targetPort}
              onChange={(e) => setTargetPort(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm">Connection Type</label>
            <select
              className="w-full p-2 rounded border"
              value={edgeType}
              onChange={(e) => setEdgeType(e.target.value as 'LAN' | 'WLAN' | 'Fiber')}
            >
              <option value="LAN">LAN</option>
              <option value="WLAN">WLAN</option>
              <option value="Fiber">Fiber</option>
            </select>
          </div>
          
          <button
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={saveEdgeData}
          >
            Apply Changes
          </button>
        </div>
      </aside>
    );
  }
  
  return null;
};

export default InspectorPanel;
