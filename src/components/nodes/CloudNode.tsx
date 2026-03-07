import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { Cloud } from 'lucide-react';
import type { NodeData } from '../../types.ts';

const CloudNode: React.FC<NodeProps<NodeData>> = ({ data }) => {
  return (
    <div className="min-w-[150px] bg-white border-2 border-cloud rounded shadow-md">
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-cloud !w-3 !h-3"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-cloud !w-3 !h-3"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-cloud !w-3 !h-3"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-cloud !w-3 !h-3"
      />
      
      <div className="p-2">
        <div className="flex items-center justify-center mb-2">
          <Cloud size={32} className="text-cloud" />
        </div>
        <div className="text-center font-bold text-sm truncate">
          {data.hostname || 'Cloud'}
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

export default memo(CloudNode);