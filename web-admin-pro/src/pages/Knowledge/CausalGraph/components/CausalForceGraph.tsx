import { BgColorsOutlined, ExpandOutlined, SwapOutlined } from '@ant-design/icons';
import { useNavigate } from '@umijs/max';
import { Spin } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CausalGraphData } from '@/services/knowledge';
import { signColor } from './SignBadge';

type ForceGraphComponent = React.ComponentType<any>;

const legendItems = [
  { color: signColor('positive'), label: '正向因果效应' },
  { color: signColor('negative'), label: '负向因果效应' },
  { color: signColor('null'), label: '无显著效应' },
  { color: signColor('mixed'), label: '混合因果符号' },
];

function label(value: string, max = 28) {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

export function CausalForceGraph({
  data,
  height = 560,
  highlightNode,
  highlightEdge,
  onNodeClick,
  onEdgeClick,
}: {
  data: CausalGraphData;
  height?: number;
  highlightNode?: string;
  highlightEdge?: { source: string; target: string };
  onNodeClick?: (id: string) => void;
  onEdgeClick?: (source: string, target: string) => void;
}) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const [width, setWidth] = useState(900);
  const [Graph, setGraph] = useState<ForceGraphComponent>();
  const [legendOpen, setLegendOpen] = useState(true);

  useEffect(() => {
    let alive = true;
    import('react-force-graph-2d').then((module) => {
      if (alive) {
        setGraph(() => module.default as ForceGraphComponent);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setWidth(Math.max(320, entry.contentRect.width));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!graphRef.current) {
      return;
    }
    graphRef.current.d3Force('charge')?.strength(-220);
    graphRef.current.d3Force('link')?.distance((link: any) => Math.max(80, 170 - Number(link.width) * 10));
    graphRef.current.d3VelocityDecay?.(0.35);
  }, [Graph, data]);

  const graphData = useMemo(
    () => ({
      nodes: data.nodes.map((node) => ({
        id: node.id,
        label: node.label,
        val: Math.min(24, Math.max(5, Math.sqrt(node.occurrences || 1) * 0.75)),
        subfield: node.dominantSubfield,
      })),
      links: data.edges.map((edge) => ({
        source: edge.source,
        target: edge.target,
        claimId: edge.claimId,
        width: Math.max(1.5, Math.log(1 + edge.recordCount) * 1.25),
        color: signColor(edge.dominantSignCategory),
        dashed: edge.disagreement > 0.4,
      })),
    }),
    [data],
  );

  return (
    <div
      ref={containerRef}
      style={{
        background: '#fff',
        border: '1px solid #f0f0f0',
        borderRadius: 8,
        height,
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
      }}
    >
      {Graph ? (
        <Graph
          ref={graphRef}
          graphData={graphData}
          width={width}
          height={height}
          backgroundColor="#ffffff"
          nodeRelSize={5}
          nodeLabel={(node: any) => `${node.label}${node.subfield ? ` · ${node.subfield}` : ''}`}
          nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const radius = node.val * 1.15;
            const highlighted = node.id === highlightNode;
            const fontSize = Math.max(9, Math.min(14, 12 / Math.max(globalScale, 0.9)));
            const text = label(node.label, Math.max(12, Math.floor(24 / Math.max(globalScale, 0.9))));
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
            ctx.fillStyle = highlighted ? '#1677ff' : '#245b9e';
            ctx.fill();
            if (highlighted) {
              ctx.lineWidth = 2.5;
              ctx.strokeStyle = '#f59f00';
              ctx.stroke();
            }
            ctx.font = `600 ${fontSize}px AlibabaSans, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const textWidth = ctx.measureText(text).width;
            const labelY = node.y - radius - fontSize;
            ctx.fillStyle = 'rgba(255,255,255,0.92)';
            ctx.fillRect(node.x - textWidth / 2 - 6, labelY - fontSize / 2 - 3, textWidth + 12, fontSize + 6);
            ctx.fillStyle = '#1f2937';
            ctx.fillText(text, node.x, labelY);
          }}
          linkColor={(link: any) => link.color}
          linkWidth={(link: any) => {
            const source = link.source.id ?? link.source;
            const target = link.target.id ?? link.target;
            return highlightEdge?.source === source && highlightEdge?.target === target ? link.width * 2.4 : link.width;
          }}
          linkLineDash={(link: any) => (link.dashed ? [6, 4] : null)}
          linkDirectionalArrowLength={9}
          linkDirectionalArrowRelPos={0.88}
          linkDirectionalArrowColor={(link: any) => link.color}
          cooldownTicks={140}
          onNodeClick={(node: any) => {
            onNodeClick?.(node.id);
            if (!onNodeClick) {
              navigate(`/knowledge/causal-graph/nodes/${encodeURIComponent(node.id)}`);
            }
          }}
          onLinkClick={(link: any) => {
            const source = link.source.id ?? link.source;
            const target = link.target.id ?? link.target;
            onEdgeClick?.(source, target);
            if (!onEdgeClick) {
              navigate(
                `/knowledge/causal-graph/edges?cause=${encodeURIComponent(source)}&effect=${encodeURIComponent(target)}`,
              );
            }
          }}
        />
      ) : (
        <div style={{ alignItems: 'center', display: 'flex', height, justifyContent: 'center' }}>
          <Spin />
          </div>
        )}
      <aside
        aria-label="线色图例"
        style={{
          backdropFilter: 'blur(14px)',
          background: 'rgba(255, 255, 255, 0.72)',
          border: '1px solid rgba(215, 226, 240, 0.9)',
          borderRadius: 13,
          bottom: 12,
          boxShadow: '0 6px 14px rgba(31, 41, 55, 0.15)',
          left: 12,
          maxWidth: 'calc(100% - 24px)',
          padding: legendOpen ? '10px 12px' : '6px 8px',
          position: 'absolute',
          width: legendOpen ? 352 : 'auto',
          zIndex: 1,
        }}
      >
        <button
          aria-expanded={legendOpen}
          onClick={() => setLegendOpen((open) => !open)}
          style={{
            alignItems: 'center',
            background: 'transparent',
            border: 0,
            color: '#44546a',
            cursor: 'pointer',
            display: 'flex',
            fontSize: 15,
            fontWeight: 700,
            gap: 6,
            padding: 0,
            width: '100%',
          }}
          type="button"
        >
          <BgColorsOutlined style={{ color: '#3978e7' }} />
          线色图例
          <span style={{ color: '#8aa0bf', fontSize: 11, fontWeight: 500, marginLeft: 'auto' }}>
            点击{legendOpen ? '隐藏' : '显示'}
          </span>
        </button>
        {legendOpen ? (
          <div style={{ borderTop: '1px solid #e3eaf3', marginTop: 10, paddingTop: 10 }}>
            <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              {legendItems.map((item) => (
                <div key={item.label} style={{ alignItems: 'center', display: 'flex', gap: 10 }}>
                  <span style={{ background: item.color, borderRadius: 999, height: 6, width: 32 }} />
                  <span style={{ color: '#44546a', fontSize: 14, fontWeight: 650 }}>{item.label}</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid #e3eaf3', color: '#8aa0bf', fontSize: 12, lineHeight: 1.65, paddingTop: 8 }}>
              <div style={{ alignItems: 'center', display: 'flex', gap: 6 }}>
                <ExpandOutlined /> 虚线表示主张的因果影响方向分歧超过 40%
              </div>
              <div style={{ alignItems: 'center', display: 'flex', gap: 6 }}>
                <SwapOutlined /> 边的粗细代表主张在数据库中的重复验证程度
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
