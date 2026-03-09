import React from 'react';
import useNetplanStore from '../../store/useNetplanStore';
import { Wifi, WifiOff, Cloud, CloudOff, RefreshCw } from 'lucide-react';

const StatusBar: React.FC = () => {
  const syncStatus = useNetplanStore((state) => state.syncStatus);

  let statusIcon: React.ReactNode;
  let statusText: string;
  let bgColor: string;

  switch (syncStatus) {
    case 'online':
      statusIcon = <Cloud size={16} className="text-green-300" />;
      statusText = 'Mit TrueNAS synchronisiert';
      bgColor = 'bg-gray-700';
      break;
    case 'offline':
      statusIcon = <CloudOff size={16} className="text-red-300" />;
      statusText = 'Offline: Änderungen nur lokal gespeichert';
      bgColor = 'bg-red-800';
      break;
    case 'syncing':
      statusIcon = <RefreshCw size={16} className="animate-spin" />;
      statusText = 'Synchronisiere...';
      bgColor = 'bg-gray-700';
      break;
    case 'disabled':
        statusIcon = <WifiOff size={16} />;
        statusText = 'Nur lokaler Modus';
        bgColor = 'bg-gray-700';
        break;
    default:
      statusIcon = <WifiOff size={16} />;
      statusText = 'Unbekannter Status';
      bgColor = 'bg-gray-800';
  }

  return (
    <div className={`fixed bottom-0 left-0 right-0 h-6 ${bgColor} text-white text-xs flex items-center px-4 z-50`}>
      <div className="flex items-center gap-2">
        {statusIcon}
        <span>{statusText}</span>
      </div>
    </div>
  );
};

export default StatusBar;
