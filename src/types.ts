// Node-Typen
export interface NodeData {
  hostname?: string;
  ipAddress?: string;
  vlan?: string;
  credentials?: string;
}

// Edge-Typen
export interface EdgeData {
  sourcePort?: string;
  targetPort?: string;
  type: 'LAN' | 'WLAN' | 'Fiber';
}