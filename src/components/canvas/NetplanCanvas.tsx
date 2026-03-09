import React, { useCallback, useRef, useState, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
  ConnectionLineType,
} from 'reactflow';
import type {
  Node,
  Edge,
  NodeTypes,
  EdgeTypes,
  Connection
} from 'reactflow';
import 'reactflow/dist/style.css';

import useNetplanStore from '../../store/useNetplanStore';
import useProjectStore from '../../store/useProjectStore';

import RouterNode from '../nodes/RouterNode';
import SwitchNode from '../nodes/SwitchNode';
import ServerNode from '../nodes/ServerNode';
import FirewallNode from '../nodes/FirewallNode';
import CloudNode from '../nodes/CloudNode';
import PCNode from '../nodes/PCNode';
import AccessPointNode from '../nodes/AccessPointNode';
import AnnotationNode from '../nodes/AnnotationNode';
import IconNode from '../nodes/IconNode';

import LANEdge from '../edges/LANEdge';
import WLANEdge from '../edges/WLANEdge';
import FiberEdge from '../edges/FiberEdge';

// Definiere die nodeTypes und edgeTypes außerhalb der Komponente,
// aber umschließe sie mit React.memo, um sicherzustellen, dass sie nicht neu erstellt werden
const nodeTypes = {
  router: RouterNode,
  switch: SwitchNode,
  server: ServerNode,
  firewall: FirewallNode,
  cloud: CloudNode,
  pc: PCNode,
  accessPoint: AccessPointNode,
  annotation: AnnotationNode,
  icon: IconNode,
};

const edgeTypes = {
  LAN: LANEdge,
  WLAN: WLANEdge,
  Fiber: FiberEdge,
};

const NetplanCanvas: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { currentProject } = useProjectStore();
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setNodes,
    saveToDatabase,
    selectNode,
    selectEdge,
  } = useNetplanStore();
  
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  
  // Das Fallenlassen von Knoten auf den Canvas behandeln
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      
      if (!reactFlowInstance) return;
      
      const dataString = event.dataTransfer.getData('application/reactflow');
      
      // Prüfen, ob das fallengelassene Element gültig ist
      if (typeof dataString === 'undefined' || !dataString) {
        return;
      }

      const { type, ...data } = JSON.parse(dataString);
      
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      
      // Einen neuen Knoten erstellen
      const newNode: Node = {
        id: `${type}_${Date.now()}`,
        type,
        position,
        data: { hostname: '', ipAddress: '', vlan: '', credentials: '', ...data },
      };
      
      setNodes([...nodes, newNode]);
      
      // In die Datenbank speichern, wenn wir ein aktuelles Projekt haben
      if (currentProject?.id) {
        saveToDatabase(currentProject.id);
      }
    },
    [reactFlowInstance, nodes, setNodes, currentProject, saveToDatabase]
  );
  
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);
  
  // Knotenauswahl-Handler
  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    selectNode(node);
  };
  
  // Kantenauswahl-Handler
  const onEdgeClick = (_: React.MouseEvent, edge: Edge) => {
    selectEdge(edge);
  };
  
  // Alles abwählen, wenn auf den Canvas geklickt wird
  const onPaneClick = () => {
    selectNode(null);
    selectEdge(null);
  };

  // Nach dem Verbinden von Knoten automatisch speichern
  const handleConnect = useCallback(
    (connection: Connection) => {
      onConnect(connection);
      
      // In die Datenbank speichern, wenn wir ein aktuelles Projekt haben
      if (currentProject?.id) {
        // Leichte Verzögerung, um sicherzustellen, dass der State aktualisiert wurde
        setTimeout(() => {
          saveToDatabase(currentProject.id);
        }, 100);
      }
    },
    [onConnect, currentProject, saveToDatabase]
  );
  
  return (
    <div 
      className="w-full h-full" 
      ref={reactFlowWrapper}
      id="netplan-canvas-container"
    >
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionLineType={ConnectionLineType.Step}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          connectionRadius={30}
          defaultEdgeOptions={{
            type: 'LAN',
            data: { type: 'LAN' }
          }}
        >
          <Background gap={16} size={1} />
          <Controls />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
};

export default NetplanCanvas;