import React, { memo } from 'react';
import {
  getSmoothStepPath,
  EdgeLabelRenderer,
  Position,
} from 'reactflow';
import type {
  EdgeProps
} from 'reactflow';
import type { EdgeData } from '../../types.ts';

const FiberEdge: React.FC<EdgeProps<EdgeData>> = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition: sourcePosition || Position.Bottom,
    targetX,
    targetY,
    targetPosition: targetPosition || Position.Top,
  });

  return (
    <>
      <path
        id={id}
        className={`react-flow__edge-path ${selected ? 'stroke-[4px]' : 'stroke-[3px]'}`}
        d={edgePath}
        stroke="#5C80BC"
        fill="none"
      />
      
      {data?.sourcePort && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${sourceX}px,${sourceY}px)`,
              pointerEvents: 'all',
            }}
            className="px-1 py-0.5 rounded bg-white text-xs border shadow-sm"
          >
            {data.sourcePort}
          </div>
        </EdgeLabelRenderer>
      )}
      
      {data?.targetPort && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${targetX}px,${targetY}px)`,
              pointerEvents: 'all',
            }}
            className="px-1 py-0.5 rounded bg-white text-xs border shadow-sm"
          >
            {data.targetPort}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default memo(FiberEdge);