import React from 'react';

// Hardcodierte Liste der Icons aus /public/iconset - in einer echten App würde man dies automatisieren
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

interface IconGalleryProps {
  selectedValue: string | undefined;
  onSelect: (iconName: string) => void;
}

const IconGallery: React.FC<IconGalleryProps> = ({ selectedValue, onSelect }) => {
  return (
    <div className="mt-4">
      <h4 className="font-semibold text-gray-700 mb-2">Overlay Icon</h4>
      <div className="grid grid-cols-5 gap-2 p-2 bg-gray-100 rounded border border-gray-200 max-h-48 overflow-y-auto">
        {iconList.map((icon) => (
          <button
            key={icon}
            onClick={() => onSelect(icon)}
            className={`p-1 rounded flex items-center justify-center transition-colors ${
              selectedValue === icon
                ? 'bg-blue-500 ring-2 ring-blue-300'
                : 'bg-white hover:bg-gray-200'
            }`}
          >
            <img 
              src={`/iconset/${icon}`} 
              alt={icon} 
              className="w-8 h-8 object-contain"
            />
          </button>
        ))}
      </div>
       {selectedValue && (
        <button
          onClick={() => onSelect('')} // Leerer String zum Entfernen
          className="mt-2 text-xs text-red-500 hover:text-red-700"
        >
          Icon entfernen
        </button>
      )}
    </div>
  );
};

export default IconGallery;
