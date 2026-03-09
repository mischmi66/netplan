import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { NodeData } from '../../types.ts';

const IconNode: React.FC<NodeProps<NodeData>> = ({ data }) => {
  const iconName = data.icon || 'Network--Streamline-Ultimate.svg';
  const iconPath = `/iconset/${iconName}`;

  return (
    <div className="bg-transparent w-12 h-12 flex items-center justify-center">
       <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-500 !w-2 !h-2"
        isConnectable={true}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-gray-500 !w-2 !h-2"
        isConnectable={true}
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-gray-500 !w-2 !h-2"
        isConnectable={true}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-gray-500 !w-2 !h-2"
        isConnectable={true}
      />
      <img src={iconPath} alt={data.hostname || 'Icon'} className="w-full h-full object-contain" />
    </div>
  );
};

export default memo(IconNode);
