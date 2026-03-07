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
  OnConnect,
  Connection
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
  
  // Aktionen
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
    // Neue Kante mit dem entsprechenden Typ basierend auf Quell- und Zielknoten erstellen
    const sourceNode = get().nodes.find(node => node.id === connection.source);
    const targetNode = get().nodes.find(node => node.id === connection.target);
    
    // Standardmäßig LAN-Verbindung, könnte aber Logik implementiert werden, um basierend auf Knotentypen zu entscheiden
    const edgeType: EdgeData['type'] = 'LAN';
    
    set({
      edges: addEdge<EdgeData>({
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
          return {
            ...edge,
            data: { ...edge.data, ...data },
          };
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