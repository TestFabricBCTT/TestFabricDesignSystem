import { useState, useMemo } from 'react';
import { Box, Tooltip, alpha } from '@mui/material';
import type { GovernanceNode, GovernanceEdge } from '@/data/governanceData';

interface FlowDiagramProps {
  nodes: GovernanceNode[];
  edges: GovernanceEdge[];
}

// SVG viewBox dimensions
const VB_W = 1000;
const VB_H = 500;

// Node dimensions
const NODE_W = 90;
const NODE_H = 70;
const EXT_NODE_W = 70;
const EXT_NODE_H = 50;

/** Convert node % position to SVG coordinates (center of node) */
function nodeCenter(node: GovernanceNode): { cx: number; cy: number } {
  return {
    cx: (node.x / 100) * VB_W,
    cy: (node.y / 100) * VB_H,
  };
}

/** Calculate edge path between two nodes */
function edgePath(
  fromNode: GovernanceNode,
  toNode: GovernanceNode,
): string {
  const from = nodeCenter(fromNode);
  const to = nodeCenter(toNode);

  const fw = fromNode.isExternal ? EXT_NODE_W / 2 : NODE_W / 2;
  const tw = toNode.isExternal ? EXT_NODE_W / 2 : NODE_W / 2;
  const fh = fromNode.isExternal ? EXT_NODE_H / 2 : NODE_H / 2;
  const th = toNode.isExternal ? EXT_NODE_H / 2 : NODE_H / 2;

  const dx = to.cx - from.cx;
  const dy = to.cy - from.cy;

  // Special route for long backward edges (e.g. PA→User): go below the flow
  if (dx < -VB_W * 0.4) {
    const exitX = from.cx;
    const exitY = from.cy + fh;
    const entryX = to.cx;
    const entryY = to.cy + th;
    const belowY = VB_H - 30;
    return `M ${exitX} ${exitY} L ${exitX} ${belowY} L ${entryX} ${belowY} L ${entryX} ${entryY}`;
  }

  // Determine exit/entry points based on direction
  let x1: number, y1: number, x2: number, y2: number;

  if (Math.abs(dy) > Math.abs(dx) * 0.8) {
    // Mostly vertical
    if (dy < 0) {
      // Going up
      x1 = from.cx;
      y1 = from.cy - fh;
      x2 = to.cx;
      y2 = to.cy + th;
    } else {
      // Going down
      x1 = from.cx;
      y1 = from.cy + fh;
      x2 = to.cx;
      y2 = to.cy - th;
    }
  } else {
    // Mostly horizontal
    if (dx > 0) {
      x1 = from.cx + fw;
      y1 = from.cy;
      x2 = to.cx - tw;
      y2 = to.cy;
    } else {
      x1 = from.cx - fw;
      y1 = from.cy;
      x2 = to.cx + tw;
      y2 = to.cy;
    }
  }

  // Use a smooth curve
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  // For mostly straight paths, just use a line
  if (Math.abs(dy) < 10 || Math.abs(dx) < 10) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  // For curved paths, use quadratic bezier
  return `M ${x1} ${y1} Q ${midX} ${y1} ${midX} ${midY} Q ${midX} ${y2} ${x2} ${y2}`;
}

/** Label position along an edge */
function labelPos(
  fromNode: GovernanceNode,
  toNode: GovernanceNode,
): { x: number; y: number } {
  const from = nodeCenter(fromNode);
  const to = nodeCenter(toNode);
  const dx = to.cx - from.cx;

  // Long backward edges route below — label at bottom
  if (dx < -VB_W * 0.4) {
    return { x: (from.cx + to.cx) / 2, y: VB_H - 22 };
  }

  return {
    x: (from.cx + to.cx) / 2,
    y: (from.cy + to.cy) / 2,
  };
}

// ============================================
// NODE COMPONENT
// ============================================

interface NodeBoxProps {
  node: GovernanceNode;
  isHovered: boolean;
  onHover: (id: string | null) => void;
}

const NodeBox = ({ node, isHovered, onHover }: NodeBoxProps) => {
  const { cx, cy } = nodeCenter(node);
  const w = node.isExternal ? EXT_NODE_W : NODE_W;
  const h = node.isExternal ? EXT_NODE_H : NODE_H;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const rx = node.isExternal ? 25 : 12;

  return (
    <Tooltip
      title={node.description}
      arrow
      placement="top"
      slotProps={{
        tooltip: {
          sx: {
            bgcolor: '#1E293B',
            border: `1px solid ${alpha(node.cor, 0.4)}`,
            fontSize: '0.75rem',
            maxWidth: 240,
          },
        },
        arrow: { sx: { color: '#1E293B' } },
      }}
    >
      <g
        onMouseEnter={() => onHover(node.id)}
        onMouseLeave={() => onHover(null)}
        style={{ cursor: 'pointer' }}
      >
        {/* Glow effect */}
        {isHovered && (
          <rect
            x={x - 3}
            y={y - 3}
            width={w + 6}
            height={h + 6}
            rx={rx + 2}
            fill="none"
            stroke={node.cor}
            strokeWidth="2"
            opacity="0.5"
          >
            <animate
              attributeName="opacity"
              values="0.3;0.7;0.3"
              dur="2s"
              repeatCount="indefinite"
            />
          </rect>
        )}

        {/* Node background */}
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx={rx}
          fill={alpha(node.cor, 0.15)}
          stroke={node.cor}
          strokeWidth={isHovered ? 2 : 1.5}
          strokeOpacity={isHovered ? 1 : 0.6}
        />

        {/* Sigla */}
        <text
          x={cx}
          y={node.isExternal ? cy + 1 : cy - 5}
          textAnchor="middle"
          dominantBaseline="central"
          fill={node.cor}
          fontSize={node.isExternal ? 12 : 18}
          fontWeight="700"
          fontFamily="Inter, sans-serif"
        >
          {node.sigla}
        </text>

        {/* Nome (only for non-external) */}
        {!node.isExternal && (
          <text
            x={cx}
            y={cy + 16}
            textAnchor="middle"
            dominantBaseline="central"
            fill={alpha('#FFFFFF', 0.6)}
            fontSize="8"
            fontFamily="Inter, sans-serif"
          >
            {node.nome.length > 16 ? node.nome.substring(0, 14) + '...' : node.nome}
          </text>
        )}

        {/* Pulse animation for agents */}
        {!node.isExternal && (
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            rx={rx}
            fill="none"
            stroke={node.cor}
            strokeWidth="1"
            opacity="0"
          >
            <animate
              attributeName="opacity"
              values="0;0.3;0"
              dur="3s"
              repeatCount="indefinite"
              begin={`${Math.random() * 2}s`}
            />
            <animate
              attributeName="strokeWidth"
              values="1;3;1"
              dur="3s"
              repeatCount="indefinite"
              begin={`${Math.random() * 2}s`}
            />
          </rect>
        )}
      </g>
    </Tooltip>
  );
};

// ============================================
// EDGE COMPONENT
// ============================================

interface EdgeLineProps {
  edge: GovernanceEdge;
  fromNode: GovernanceNode;
  toNode: GovernanceNode;
  isHovered: boolean;
  onHover: (key: string | null) => void;
  markerId: string;
}

const EdgeLine = ({ edge, fromNode, toNode, isHovered, onHover, markerId }: EdgeLineProps) => {
  const d = edgePath(fromNode, toNode);
  const lp = labelPos(fromNode, toNode);
  const edgeKey = `${edge.from}-${edge.to}`;

  return (
    <Tooltip
      title={edge.description}
      arrow
      placement="top"
      slotProps={{
        tooltip: {
          sx: {
            bgcolor: '#1E293B',
            border: `1px solid ${alpha('#FFFFFF', 0.2)}`,
            fontSize: '0.75rem',
            maxWidth: 280,
          },
        },
        arrow: { sx: { color: '#1E293B' } },
      }}
    >
      <g
        onMouseEnter={() => onHover(edgeKey)}
        onMouseLeave={() => onHover(null)}
        style={{ cursor: 'pointer' }}
      >
        {/* Invisible wider path for hover target */}
        <path
          d={d}
          fill="none"
          stroke="transparent"
          strokeWidth="20"
        />

        {/* Visible path */}
        <path
          d={d}
          fill="none"
          stroke={isHovered ? '#FFFFFF' : alpha('#FFFFFF', 0.3)}
          strokeWidth={isHovered ? 2 : 1.2}
          markerEnd={`url(#${markerId})`}
          strokeDasharray={edge.isAutomatic ? 'none' : '6 4'}
        >
          {edge.isAutomatic && (
            <animate
              attributeName="stroke-dashoffset"
              values="20;0"
              dur="1.5s"
              repeatCount="indefinite"
            />
          )}
        </path>

        {/* Label background */}
        <rect
          x={lp.x - edge.label.length * 3 - 4}
          y={lp.y - 8}
          width={edge.label.length * 6 + 8}
          height={16}
          rx="4"
          fill={isHovered ? '#1E293B' : alpha('#0A1628', 0.85)}
          stroke={isHovered ? alpha('#FFFFFF', 0.3) : 'none'}
          strokeWidth="0.5"
        />

        {/* Label text */}
        <text
          x={lp.x}
          y={lp.y}
          textAnchor="middle"
          dominantBaseline="central"
          fill={isHovered ? '#FFFFFF' : alpha('#FFFFFF', 0.5)}
          fontSize="7.5"
          fontFamily="Inter, sans-serif"
          fontWeight={isHovered ? '600' : '400'}
        >
          {edge.label}
        </text>
      </g>
    </Tooltip>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const FlowDiagram = ({ nodes, edges }: FlowDiagramProps) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);

  const nodeMap = useMemo(() => {
    const map: Record<string, GovernanceNode> = {};
    for (const n of nodes) map[n.id] = n;
    return map;
  }, [nodes]);

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 900,
        mx: 'auto',
        '& svg': { display: 'block' },
      }}
    >
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: 'auto' }}
      >
        <defs>
          {/* Arrow marker */}
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon
              points="0 0, 8 3, 0 6"
              fill={alpha('#FFFFFF', 0.5)}
            />
          </marker>
          <marker
            id="arrowhead-hover"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#FFFFFF" />
          </marker>
        </defs>

        {/* Edges (behind nodes) */}
        {edges.map((edge) => {
          const from = nodeMap[edge.from];
          const to = nodeMap[edge.to];
          if (!from || !to) return null;
          const key = `${edge.from}-${edge.to}`;
          const hovered = hoveredEdge === key;
          return (
            <EdgeLine
              key={key}
              edge={edge}
              fromNode={from}
              toNode={to}
              isHovered={hovered}
              onHover={setHoveredEdge}
              markerId={hovered ? 'arrowhead-hover' : 'arrowhead'}
            />
          );
        })}

        {/* Nodes (on top) */}
        {nodes.map((node) => (
          <NodeBox
            key={node.id}
            node={node}
            isHovered={hoveredNode === node.id}
            onHover={setHoveredNode}
          />
        ))}
      </svg>
    </Box>
  );
};

export default FlowDiagram;
