import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { MessageSquare } from 'lucide-react';
import type { NodeData } from '../../types.ts';

const AnnotationNode: React.FC<NodeProps<NodeData>> = ({ data, selected }) => {
  return (
    <div className={`min-w-[180px] bg-white/80 border rounded shadow ${selected ? 'border-annotation border-2' : 'border-gray-200'}`}>
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-annotation !w-2 !h-2 !opacity-70"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-annotation !w-2 !h-2 !opacity-70"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-annotation !w-2 !h-2 !opacity-70"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-annotation !w-2 !h-2 !opacity-70"
      />
      
      <div className="p-3">
        <div className="flex items-center justify-center mb-2">
          <MessageSquare className="text-annotation" size={20} />
        </div>
        {data.hostname && (
          <div className="text-center font-medium text-sm truncate mb-1">
            {data.hostname}
          </div>
        )}
        {data.ipAddress && (
          <div className="text-xs text-gray-700 whitespace-pre-wrap break-words leading-relaxed text-center">
            {data.ipAddress}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(AnnotationNode);