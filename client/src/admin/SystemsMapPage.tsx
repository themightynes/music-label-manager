import { useMemo, useState } from 'react';
import GameLayout from '@/layouts/GameLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ZoomIn, ZoomOut, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';
import {
  NODES,
  EDGES,
  NON_EDGES,
  DOMAINS,
  NODES_BY_ID,
  type SystemNode,
  type SystemEdge,
  type NonEdge,
  type DomainId,
} from '@/admin/systemsMapData';

// ─────────────────────────────────────────────────────────────────────────────
// Domain → Tailwind class map (v2 neon tokens). Written as literal strings so
// Tailwind's JIT scanner picks them up — dynamically built class names would
// not be found in source and would silently drop out of the build.
// ─────────────────────────────────────────────────────────────────────────────

const DOMAIN_TW: Record<DomainId, { text: string; stroke: string; fill: string; border: string; dot: string }> = {
  resources: { text: 'text-neon-green', stroke: 'stroke-neon-green', fill: 'fill-neon-green', border: 'border-neon-green/40', dot: 'bg-neon-green' },
  meetings: { text: 'text-neon-purple', stroke: 'stroke-neon-purple', fill: 'fill-neon-purple', border: 'border-neon-purple/40', dot: 'bg-neon-purple' },
  artist: { text: 'text-neon-magenta', stroke: 'stroke-neon-magenta', fill: 'fill-neon-magenta', border: 'border-neon-magenta/40', dot: 'bg-neon-magenta' },
  production: { text: 'text-neon-amber', stroke: 'stroke-neon-amber', fill: 'fill-neon-amber', border: 'border-neon-amber/40', dot: 'bg-neon-amber' },
  release: { text: 'text-neon-cyan', stroke: 'stroke-neon-cyan', fill: 'fill-neon-cyan', border: 'border-neon-cyan/40', dot: 'bg-neon-cyan' },
  live: { text: 'text-neon-blue', stroke: 'stroke-neon-blue', fill: 'fill-neon-blue', border: 'border-neon-blue/40', dot: 'bg-neon-blue' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Layout constants (curated static layout, 6 domain columns left→right)
// ─────────────────────────────────────────────────────────────────────────────

const COL_WIDTH = 270;
const ROW_HEIGHT = 96;
const NODE_W = 180;
const NODE_H = 56;
const PAD_X = 40;
const PAD_TOP = 60;

interface Pos {
  x: number;
  y: number;
}

function nodePos(node: SystemNode): Pos {
  return { x: PAD_X + node.col * COL_WIDTH, y: PAD_TOP + node.row * ROW_HEIGHT };
}

const maxRow = Math.max(...NODES.map((n) => n.row));
const VIEW_W = PAD_X * 2 + 5 * COL_WIDTH + NODE_W;
const VIEW_H = PAD_TOP + (maxRow + 1) * ROW_HEIGHT + 40;

type PanelState =
  | { type: 'node'; id: string }
  | { type: 'edge'; id: string }
  | { type: 'nonedge'; id: string }
  | null;

function anchorPoint(from: SystemNode, to: SystemNode, which: 'from' | 'to'): Pos {
  const fromPos = nodePos(from);
  const toPos = nodePos(to);
  if (to.col > from.col) {
    return which === 'from'
      ? { x: fromPos.x + NODE_W, y: fromPos.y + NODE_H / 2 }
      : { x: toPos.x, y: toPos.y + NODE_H / 2 };
  }
  if (to.col < from.col) {
    return which === 'from'
      ? { x: fromPos.x, y: fromPos.y + NODE_H / 2 }
      : { x: toPos.x + NODE_W, y: toPos.y + NODE_H / 2 };
  }
  // Same column: connect vertically
  const fromBelow = to.row > from.row;
  return which === 'from'
    ? { x: fromPos.x + NODE_W / 2, y: fromBelow ? fromPos.y + NODE_H : fromPos.y }
    : { x: toPos.x + NODE_W / 2, y: fromBelow ? toPos.y : toPos.y + NODE_H };
}

function bezierPath(from: SystemNode, to: SystemNode): string {
  const start = anchorPoint(from, to, 'from');
  const end = anchorPoint(from, to, 'to');
  if (to.col === from.col) {
    const midY = (start.y + end.y) / 2;
    return `M ${start.x} ${start.y} C ${start.x} ${midY}, ${end.x} ${midY}, ${end.x} ${end.y}`;
  }
  const dx = Math.max(60, Math.abs(end.x - start.x) * 0.5);
  const c1x = start.x + (end.x > start.x ? dx : -dx);
  const c2x = end.x + (end.x > start.x ? -dx : dx);
  return `M ${start.x} ${start.y} C ${c1x} ${start.y}, ${c2x} ${end.y}, ${end.x} ${end.y}`;
}

function midPoint(from: SystemNode, to: SystemNode): Pos {
  const start = anchorPoint(from, to, 'from');
  const end = anchorPoint(from, to, 'to');
  return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
}

export default function SystemsMapPage() {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelState>(null);
  const [showNonEdges, setShowNonEdges] = useState(false);
  const [nonEdgesPanelOpen, setNonEdgesPanelOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const selectedNodeId = panel?.type === 'node' ? panel.id : null;
  const selectedEdgeId = panel?.type === 'edge' ? panel.id : null;
  const selectedNonEdgeId = panel?.type === 'nonedge' ? panel.id : null;

  const activeNodeId = hoveredNodeId ?? selectedNodeId;

  const edgesFrom = useMemo(() => {
    const map = new Map<string, SystemEdge[]>();
    for (const e of EDGES) {
      if (!map.has(e.from)) map.set(e.from, []);
      map.get(e.from)!.push(e);
    }
    return map;
  }, []);
  const edgesTo = useMemo(() => {
    const map = new Map<string, SystemEdge[]>();
    for (const e of EDGES) {
      if (!map.has(e.to)) map.set(e.to, []);
      map.get(e.to)!.push(e);
    }
    return map;
  }, []);

  const connectedEdgeIds = useMemo(() => {
    if (!activeNodeId) return null;
    const ids = new Set<string>();
    EDGES.forEach((e) => {
      if (e.from === activeNodeId || e.to === activeNodeId) ids.add(e.id);
    });
    return ids;
  }, [activeNodeId]);

  const connectedNodeIds = useMemo(() => {
    if (!activeNodeId) return null;
    const ids = new Set<string>([activeNodeId]);
    EDGES.forEach((e) => {
      if (e.from === activeNodeId) ids.add(e.to);
      if (e.to === activeNodeId) ids.add(e.from);
    });
    return ids;
  }, [activeNodeId]);

  const dimming = Boolean(activeNodeId || selectedEdgeId);

  const selectedEdge = selectedEdgeId ? EDGES.find((e) => e.id === selectedEdgeId) ?? null : null;
  const selectedNode = selectedNodeId ? NODES_BY_ID[selectedNodeId] ?? null : null;
  const selectedNonEdge = selectedNonEdgeId ? NON_EDGES.find((n) => n.id === selectedNonEdgeId) ?? null : null;

  return (
    <GameLayout>
      <div className="w-full max-w-none px-4 pt-6 space-y-4">
        <div className="glass-panel rounded-card border border-white/10 p-4 space-y-2">
          <h1 className="text-2xl font-bold text-text-primary font-display">Systems Map</h1>
          <p className="text-sm text-text-body">
            Hand-verified snapshot of shared/engine as of 2026-07-10 (balance-integrity arc: knob liberation + 4
            new/changed edges) — edges cite code; config values read live from data/balance. Doc-sync: re-verify
            when engine formulas change.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs">
            <span className="text-text-label uppercase tracking-wide">Legend:</span>
            {DOMAINS.map((d) => (
              <span key={d.id} className="flex items-center gap-1.5">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${DOMAIN_TW[d.id].dot}`} />
                <span className="text-text-body font-mono">{d.label}</span>
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-6 border-b-2 border-dashed border-warning" />
              <span className="text-warning font-mono">HARDCODED (not tunable via JSON)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-6 border-b-2 border-dashed border-negative" />
              <span className="text-negative font-mono">Non-edge (assumed, missing/shadowed)</span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 glass-panel rounded-card border border-white/10 p-3">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))} title="Zoom in">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))} title="Zoom out">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setZoom(1)} title="Reset zoom">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <span className="text-xs text-text-muted font-mono ml-1">{Math.round(zoom * 100)}%</span>
          </div>
          <label className="flex items-center gap-2 text-sm text-text-body">
            <Switch checked={showNonEdges} onCheckedChange={setShowNonEdges} />
            Show assumed-but-missing connections
          </label>
        </div>

        <div className="flex flex-col gap-4">
          {/* Diagram — full width; detail panel sits BELOW so the diagram gets the whole viewport width */}
          <div className="glass-panel rounded-card border border-white/10 p-2 overflow-x-auto w-full">
            <svg
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              width={VIEW_W * zoom}
              height={VIEW_H * zoom}
              className="block"
            >
              <defs>
                {DOMAINS.map((d) => (
                  <marker
                    key={d.id}
                    id={`arrow-${d.id}`}
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="7"
                    markerHeight="7"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" className={DOMAIN_TW[d.id].fill} />
                  </marker>
                ))}
                <marker id="arrow-negative" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" className="fill-negative" />
                </marker>
              </defs>

              {/* Domain column headers */}
              {DOMAINS.map((d, i) => (
                <text
                  key={d.id}
                  x={PAD_X + i * COL_WIDTH + NODE_W / 2}
                  y={28}
                  textAnchor="middle"
                  className={`font-mono text-[11px] uppercase tracking-wide ${DOMAIN_TW[d.id].text}`}
                >
                  {d.label}
                </text>
              ))}

              {/* Real edges */}
              {EDGES.map((edge) => {
                const from = NODES_BY_ID[edge.from];
                const to = NODES_BY_ID[edge.to];
                if (!from || !to) return null;
                const isActive = edge.id === selectedEdgeId || connectedEdgeIds?.has(edge.id);
                const opacity = isActive ? 1 : dimming ? 0.08 : 0.4;
                const strokeWidth = isActive ? 3 : 1.5;
                const domainCls = DOMAIN_TW[from.domain];
                return (
                  <path
                    key={edge.id}
                    d={bezierPath(from, to)}
                    fill="none"
                    className={domainCls.stroke}
                    style={{ opacity, transition: 'opacity 120ms ease' }}
                    strokeWidth={strokeWidth}
                    strokeDasharray={edge.hardcoded ? '7 4' : undefined}
                    markerEnd={`url(#arrow-${from.domain})`}
                    onClick={() => setPanel({ type: 'edge', id: edge.id })}
                    cursor="pointer"
                  />
                );
              })}

              {/* Non-edges (ghost, toggle-controlled) */}
              {showNonEdges &&
                NON_EDGES.map((ne) => {
                  const from = NODES_BY_ID[ne.from];
                  const to = NODES_BY_ID[ne.to];
                  if (!from || !to) return null;
                  const isActive = ne.id === selectedNonEdgeId;
                  const mid = midPoint(from, to);
                  return (
                    <g key={ne.id}>
                      <path
                        d={bezierPath(from, to)}
                        fill="none"
                        className="stroke-negative"
                        strokeDasharray="4 5"
                        strokeWidth={isActive ? 3 : 1.5}
                        style={{ opacity: isActive ? 0.9 : 0.45 }}
                        markerEnd="url(#arrow-negative)"
                        onClick={() => setPanel({ type: 'nonedge', id: ne.id })}
                        cursor="pointer"
                      />
                      <text
                        x={mid.x}
                        y={mid.y + 4}
                        textAnchor="middle"
                        className="fill-negative font-mono text-[10px] cursor-pointer"
                        onClick={() => setPanel({ type: 'nonedge', id: ne.id })}
                      >
                        ✕
                      </text>
                    </g>
                  );
                })}

              {/* Nodes */}
              {NODES.map((node) => {
                const pos = nodePos(node);
                const isActive = node.id === selectedNodeId || connectedNodeIds?.has(node.id);
                const opacity = isActive || !dimming ? 1 : 0.25;
                const domainCls = DOMAIN_TW[node.domain];
                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    style={{ opacity, transition: 'opacity 120ms ease', cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() => setPanel({ type: 'node', id: node.id })}
                  >
                    <rect
                      width={NODE_W}
                      height={NODE_H}
                      rx={12}
                      className={`fill-surface-panel ${domainCls.border}`}
                      stroke="currentColor"
                      strokeWidth={node.id === selectedNodeId ? 2.5 : 1}
                    />
                    <rect width={6} height={NODE_H} rx={3} className={domainCls.fill} />
                    <text
                      x={NODE_W / 2 + 3}
                      y={NODE_H / 2 + 4}
                      textAnchor="middle"
                      className="fill-text-primary font-mono text-[12px]"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Explainer + non-edges side by side under the diagram */}
          <div className="flex flex-col lg:flex-row gap-4 items-start">
          {/* Detail panel */}
          <div className="w-full lg:flex-1 min-w-0 glass-panel rounded-card border border-white/10 p-4 max-h-[45vh] overflow-y-auto space-y-3">
            {!panel && (
              <p className="text-sm text-text-muted">
                Hover a node to see its connections. Click a node or an edge for full detail — mechanism, formula,
                current values, and code references.
              </p>
            )}

            {selectedNode && (
              <NodePanel
                node={selectedNode}
                inbound={edgesTo.get(selectedNode.id) ?? []}
                outbound={edgesFrom.get(selectedNode.id) ?? []}
                onSelectEdge={(id) => setPanel({ type: 'edge', id })}
              />
            )}

            {selectedEdge && (
              <EdgePanel edge={selectedEdge} onBack={() => setPanel({ type: 'node', id: selectedEdge.from })} />
            )}

            {selectedNonEdge && <NonEdgePanel nonEdge={selectedNonEdge} />}
          </div>

          {/* Non-edges collapsible panel (always available, independent of the toggle) */}
          <div className="w-full lg:flex-1 min-w-0 glass-panel rounded-card border border-white/10 max-h-[45vh] overflow-y-auto">
          <button
            className="w-full flex items-center justify-between p-3 text-left"
            onClick={() => setNonEdgesPanelOpen((v) => !v)}
          >
            <span className="text-sm font-semibold text-negative flex items-center gap-2">
              {nonEdgesPanelOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Assumed-but-missing / shadowed connections ({NON_EDGES.length})
            </span>
          </button>
          {nonEdgesPanelOpen && (
            <div className="p-3 pt-0 space-y-2">
              {NON_EDGES.map((ne) => (
                <button
                  key={ne.id}
                  onClick={() => setPanel({ type: 'nonedge', id: ne.id })}
                  className={`w-full text-left rounded-lg border p-2.5 text-xs transition-colors ${
                    selectedNonEdgeId === ne.id
                      ? 'border-negative/60 bg-negative/10'
                      : 'border-white/10 hover:border-negative/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] border-negative/40 text-negative">
                      {NODES_BY_ID[ne.from]?.label ?? ne.from} → {NODES_BY_ID[ne.to]?.label ?? ne.to}
                    </Badge>
                  </div>
                  <div className="text-text-body">{ne.claim}</div>
                </button>
              ))}
            </div>
          )}
          </div>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}

function ValueRow({ v }: { v: { label: string; value: number | string; source: string; configPath?: string; ref?: string } }) {
  return (
    <div className="flex items-start justify-between gap-2 text-xs py-1 border-b border-white/5 last:border-0">
      <div className="text-text-label">{v.label}</div>
      <div className="text-right">
        <div className="font-mono text-text-primary">{String(v.value)}</div>
        {v.source === 'hardcoded' ? (
          <Badge variant="outline" className="text-[9px] border-warning/40 text-warning mt-0.5">
            HARDCODED
          </Badge>
        ) : (
          <div className="text-[9px] text-neon-cyan/80 font-mono mt-0.5">{v.configPath}</div>
        )}
        {v.ref && <div className="text-[9px] text-text-muted font-mono mt-0.5">{v.ref}</div>}
      </div>
    </div>
  );
}

function EdgeRow({ edge, direction, onSelect }: { edge: SystemEdge; direction: 'in' | 'out'; onSelect: () => void }) {
  const other = direction === 'in' ? NODES_BY_ID[edge.from] : NODES_BY_ID[edge.to];
  return (
    <button onClick={onSelect} className="w-full text-left rounded-lg border border-white/10 hover:border-white/30 p-2 text-xs space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-text-primary font-medium">
          {direction === 'in' ? '← ' : '→ '}
          {other?.label ?? (direction === 'in' ? edge.from : edge.to)}
        </span>
        {edge.hardcoded && (
          <Badge variant="outline" className="text-[9px] border-warning/40 text-warning shrink-0">
            HARDCODED
          </Badge>
        )}
      </div>
      <div className="text-text-muted">{edge.mechanism}</div>
    </button>
  );
}

function NodePanel({
  node,
  inbound,
  outbound,
  onSelectEdge,
}: {
  node: SystemNode;
  inbound: SystemEdge[];
  outbound: SystemEdge[];
  onSelectEdge: (id: string) => void;
}) {
  const domainCls = DOMAIN_TW[node.domain];
  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${domainCls.dot}`} />
          <h2 className="text-lg font-semibold text-text-primary">{node.label}</h2>
        </div>
        <p className="text-xs text-text-body mt-1.5 leading-relaxed">{node.description}</p>
      </div>

      <div>
        <div className="text-xs font-semibold text-text-label uppercase tracking-wide mb-1.5">
          Inbound ({inbound.length})
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-1.5">
          {inbound.length === 0 && <div className="text-xs text-text-muted italic">None modeled.</div>}
          {inbound.map((e) => (
            <EdgeRow key={e.id} edge={e} direction="in" onSelect={() => onSelectEdge(e.id)} />
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-text-label uppercase tracking-wide mb-1.5">
          Outbound ({outbound.length})
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-1.5">
          {outbound.length === 0 && <div className="text-xs text-text-muted italic">None modeled.</div>}
          {outbound.map((e) => (
            <EdgeRow key={e.id} edge={e} direction="out" onSelect={() => onSelectEdge(e.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function EdgePanel({ edge, onBack }: { edge: SystemEdge; onBack: () => void }) {
  const from = NODES_BY_ID[edge.from];
  const to = NODES_BY_ID[edge.to];
  return (
    <div className="space-y-3">
      <button onClick={onBack} className="text-xs text-text-muted hover:text-text-body">
        ← back to {from?.label ?? edge.from}
      </button>
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          {from?.label ?? edge.from} → {to?.label ?? edge.to}
        </h2>
        <div className="text-xs text-text-muted mt-0.5">{edge.mechanism}</div>
        {edge.hardcoded && (
          <Badge variant="outline" className="text-[10px] border-warning/40 text-warning mt-1.5">
            Contains HARDCODED value(s)
          </Badge>
        )}
      </div>
      <div className="rounded-lg bg-black/20 border border-white/10 p-2">
        <div className="text-[10px] text-text-label uppercase tracking-wide mb-1">Formula</div>
        <div className="text-xs font-mono text-text-primary leading-relaxed">{edge.formula}</div>
      </div>
      <div>
        <div className="text-[10px] text-text-label uppercase tracking-wide mb-1">Current values</div>
        {edge.values.map((v, i) => (
          <ValueRow key={i} v={v} />
        ))}
      </div>
      {edge.note && (
        <div className="rounded-lg bg-warning/10 border border-warning/30 p-2 text-xs text-warning">{edge.note}</div>
      )}
      <div className="text-[10px] text-text-muted font-mono">{edge.ref}</div>
    </div>
  );
}

function NonEdgePanel({ nonEdge }: { nonEdge: NonEdge }) {
  const from = NODES_BY_ID[nonEdge.from];
  const to = NODES_BY_ID[nonEdge.to];
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-negative">
          {from?.label ?? nonEdge.from} ✕→ {to?.label ?? nonEdge.to}
        </h2>
        <Badge variant="outline" className="text-[10px] border-negative/40 text-negative mt-1.5">
          Non-edge
        </Badge>
      </div>
      <div>
        <div className="text-[10px] text-text-label uppercase tracking-wide mb-1">Assumed claim</div>
        <div className="text-xs text-text-body italic">{nonEdge.claim}</div>
      </div>
      <div>
        <div className="text-[10px] text-text-label uppercase tracking-wide mb-1">Evidence</div>
        <div className="text-xs text-text-primary leading-relaxed">{nonEdge.evidence}</div>
      </div>
    </div>
  );
}
