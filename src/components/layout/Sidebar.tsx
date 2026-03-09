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

// Hardcodierte Liste der Icons aus /public/iconset
const iconList = [
  'Antenna--Streamline-Ultimate.svg', 'App-Window-Text--Streamline-Ultimate.svg',
  'Archive-Locker--Streamline-Ultimate.svg', 'Bluetooth-Transfer--Streamline-Ultimate.svg',
  'Cellular-Network-Lte--Streamline-Ultimate.svg', 'Database-1--Streamline-Ultimate.svg',
  'Database-2--Streamline-Ultimate.svg', 'Ethernet-Port--Streamline-Ultimate.svg',
  'Hard-Drive-1--Streamline-Ultimate.svg', 'Hierarchy-3--Streamline-Ultimate.svg',
  'Hierarchy-5--Streamline-Ultimate.svg', 'Human-Resources-Hierarchy-1--Streamline-Ultimate.svg',
  'Keyboard-Wireless--Streamline-Ultimate.svg', 'Monitor-Transfer-1--Streamline-Ultimate.svg',
  'Network--Streamline-Ultimate.svg', 'Router-Signal--Streamline-Ultimate.svg',
  'Router-Signal-1--Streamline-Ultimate.svg', 'Rss-Feed--Streamline-Ultimate.svg',
  'Satellite--Streamline-Ultimate.svg', 'Server-Add--Streamline-Ultimate.svg',
  'Server-Refresh-1--Streamline-Ultimate.svg', 'Server-Share--Streamline-Ultimate.svg',
  'Server-Star-1--Streamline-Ultimate.svg', 'Signal-Full--Streamline-Ultimate.svg',
  'Task-List-Text-1--Streamline-Ultimate.svg', 'Upload-Square-1--Streamline-Ultimate.svg'
];

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
  const onDragStart = (event: React.DragEvent, data: string) => {
    event.dataTransfer.setData('application/reactflow', data);
    event.dataTransfer.effectAllowed = 'move';
  };
  
  // Funktion zum Bereinigen des Icon-Namens für die Anzeige
  const formatIconName = (name: string) => {
    return name.replace(/--Streamline-Ultimate.svg/g, '').replace(/-/g, ' ');
  };

  return (
    <aside className="w-64 bg-gray-100 p-4 shadow-md overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">Netzwerkkomponenten</h2>
      <div className="space-y-2">
        {nodeTypes.map((item) => {
          const Icon = item.icon;
          const dragData = JSON.stringify({ type: item.type });
          return (
            <div
              key={item.type}
              className="flex items-center p-2 rounded cursor-grab bg-white shadow-sm hover:bg-gray-50"
              onDragStart={(e) => onDragStart(e, dragData)}
              draggable
            >
              <Icon className="mr-2" size={20} />
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>

      <h2 className="text-lg font-semibold mt-6 mb-4">Zusatz-Icons</h2>
      <div className="space-y-2">
        {iconList.map((iconName) => {
          const dragData = JSON.stringify({ type: 'icon', icon: iconName });
          return (
            <div
              key={iconName}
              className="flex items-center p-2 rounded cursor-grab bg-white shadow-sm hover:bg-gray-50"
              onDragStart={(e) => onDragStart(e, dragData)}
              draggable
            >
              <img src={`${import.meta.env.BASE_URL}iconset/${iconName}`} alt={iconName} className="mr-2 w-5 h-5" />
              <span className="text-xs">{formatIconName(iconName)}</span>
            </div>
          );
        })}
      </div>
    </aside>
  );
};

export default Sidebar;
