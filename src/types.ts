// Node-Typen
export interface NodeData {
  hostname?: string;
  ipAddress?: string;
  vlan?: string;
  credentials?: string;
  icon?: string;
  overlayIcon?: string;
}

// Edge-Typen
export interface EdgeData {
  sourcePort?: string;
  targetPort?: string;
  type: 'LAN' | 'WLAN' | 'Fiber';
}