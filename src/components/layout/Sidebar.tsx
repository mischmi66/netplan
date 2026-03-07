import React from 'react';
import { 
  Router, 
  Server, 
  HardDrive, 
  Shield, 
  Cloud, 
  Monitor, 
  Wifi,
  Type
} from 'lucide-react';

// Knotentypen mit ihren entsprechenden Icons und Bezeichnungen definieren
const nodeTypes = [
  { type: 'router', icon: Router, label: 'Router' },
  { type: 'switch', icon: HardDrive, label: 'Switch' },
  { type: 'server', icon: Server, label: 'Server' },
  { type: 'firewall', icon: Shield, label: 'Firewall' },
  { type: 'cloud', icon: Cloud, label: 'Cloud' },
  { type: 'pc', icon: Monitor, label: 'PC' },
  { type: 'accessPoint', icon: Wifi, label: 'Access Point' },
  { type: 'annotation', icon: Type, label: 'Text-Label' },
];

const Sidebar: React.FC = () => {
  // Drag-Start für einen Knotentyp behandeln
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };
  
  return (
    <aside className="w-64 bg-gray-100 p-4 shadow-md overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">Netzwerkkomponenten</h2>
      <div className="space-y-2">
        {nodeTypes.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.type}
              className="flex items-center p-2 rounded cursor-grab bg-white shadow-sm hover:bg-gray-50"
              onDragStart={(e) => onDragStart(e, item.type)}
              draggable
            >
              <Icon className="mr-2" size={20} />
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>
    </aside>
  );
};

export default Sidebar;