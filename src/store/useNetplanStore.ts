import { create } from 'zustand';
import { 
  addEdge, 
  applyEdgeChanges, 
  applyNodeChanges,
} from 'reactflow';
import type { 
  Edge, 
  Node, 
  OnNodesChange,
  OnEdgesChange,
  OnConnect
} from 'reactflow';
import { netplanApi } from '../services/api';
import type { NodeData, EdgeData } from '../types.ts';

interface NetplanState {
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  selectedNode: Node<NodeData> | null;
  selectedEdge: Edge<EdgeData> | null;
  loading: boolean;
  error: string | null;
  toastMessage: string | null;
  
  // Aktionen
  showToast: (message: string) => void;
  resetCanvas: () => void;
  setNodes: (nodes: Node<NodeData>[]) => void;
  setEdges: (edges: Edge<EdgeData>[]) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void;
  updateEdgeData: (edgeId: string, data: Partial<EdgeData>) => void;
  
  saveToDatabase: (projectId: number) => Promise<void>;
  loadFromDatabase: (projectId: number) => Promise<void>;
  
  selectNode: (node: Node<NodeData> | null) => void;
  selectEdge: (edge: Edge<EdgeData> | null) => void;
}

const useNetplanStore = create<NetplanState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  selectedEdge: null,
  loading: false,
  error: null,
  toastMessage: null,

  showToast: (message) => {
    set({ toastMessage: message });
    setTimeout(() => set({ toastMessage: null }), 3000);
  },

  resetCanvas: () => {
    set({ nodes: [], edges: [], selectedNode: null, selectedEdge: null });
  },
  
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  
  onConnect: (connection) => {
    // Standardmäßig LAN-Verbindung
    const edgeType: EdgeData['type'] = 'LAN';
    
    set({
      edges: addEdge({
        ...connection,
        data: { type: edgeType, sourcePort: '', targetPort: '' }
      }, get().edges),
    });
  },
  
  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, ...data },
          };
        }
        return node;
      }),
    });
  },
  
  updateEdgeData: (edgeId, data) => {
    set({
      edges: get().edges.map((edge) => {
        if (edge.id === edgeId) {
          const mergedData: EdgeData = { ...edge.data, ...data } as EdgeData;

          const newEdge: Edge<EdgeData> = {
            ...edge,
            data: mergedData,
          };

          if (data.type) {
            newEdge.type = data.type; // Passt den Edge-Typ für die benutzerdefinierten Edge-Komponenten an
            if (data.type === 'WLAN') {
              newEdge.style = { strokeDasharray: '5 5', stroke: '#888' };
            } else if (data.type === 'Fiber') {
              // Stil für Glasfaser, z.B. eine andere Farbe
              newEdge.style = { stroke: '#ff00ff' }; // Magenta für Glasfaser
            } else {
              // Standard-Stil für LAN zurücksetzen
              newEdge.style = {}; 
            }
          }
          
          return newEdge;
        }
        return edge;
      }),
    });
  },
  
  saveToDatabase: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const { nodes, edges } = get();
      
      await netplanApi.saveNetplan(projectId, { nodes, edges });
      
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  loadFromDatabase: async (projectId) => {
    set({ loading: true, error: null, nodes: [], edges: [] });
    try {
      // Knoten laden
      const nodesResponse = await netplanApi.getNodes(projectId);
      const nodesData = nodesResponse.data;
      
      const nodes: Node<NodeData>[] = nodesData.map((dbNode: any) => {
        const { positionX, positionY, hostname, ipAddress, vlan, credentials, ...rest } = dbNode;
        
        return {
          id: rest.id,
          type: rest.type,
          position: { x: positionX, y: positionY },
          data: { hostname, ipAddress, vlan, credentials },
        };
      });
      
      // Kanten laden
      const edgesResponse = await netplanApi.getEdges(projectId);
      const edgesData = edgesResponse.data;
      
      const edges: Edge<EdgeData>[] = edgesData.map((dbEdge: any) => {
        const { sourcePort, targetPort, type, ...rest } = dbEdge;
        
        return {
          ...rest,
          data: { sourcePort, targetPort, type },
        };
      });
      
      set({ nodes, edges, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  selectNode: (node) => set({ selectedNode: node, selectedEdge: null }),
  selectEdge: (edge) => set({ selectedEdge: edge, selectedNode: null }),
}));

export default useNetplanStore;