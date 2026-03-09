import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { Router } from 'lucide-react';
import type { NodeData } from '../../types.ts';

const RouterNode: React.FC<NodeProps<NodeData>> = ({ data }) => {
  return (
    <div className="min-w-[150px] bg-white border-2 border-router rounded shadow-md relative">
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-router !w-3 !h-3"
        isConnectable={true}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-router !w-3 !h-3"
        isConnectable={true}
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-router !w-3 !h-3"
        isConnectable={true}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-router !w-3 !h-3"
        isConnectable={true}
      />

      {data.overlayIcon && (
        <img
          src={`${import.meta.env.BASE_URL}iconset/${data.overlayIcon}`}
          alt="Overlay Icon"
          className="absolute top-1 right-1 w-5 h-5 object-contain"
        />
      )}
      
      <div className="p-2">
        <div className="flex items-center justify-center mb-2">
          <Router size={32} className="text-router" />
        </div>
        <div className="text-center font-bold text-sm truncate">
          {data.hostname || 'Router'}
        </div>
        {data.ipAddress && (
          <div className="text-center text-xs text-gray-600 truncate">
            {data.ipAddress}
          </div>
        )}
        {data.vlan && (
          <div className="text-center text-xs text-gray-600 truncate">
            VLAN: {data.vlan}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(RouterNode);