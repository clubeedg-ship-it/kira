import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface GraphNode {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  connections: number;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const json = await res.json();
  return json.data;
}

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_VISIBLE_NODES = 200;

const NODE_COLORS: Record<string, string> = {
  person: '#8b5cf6',
  company: '#3b82f6',
  project: '#10b981',
  product: '#f59e0b',
  technology: '#06b6d4',
  location: '#ef4444',
  tool: '#6366f1',
  event: '#ec4899',
  document: '#78716c',
  service: '#14b8a6',
  organization: '#a855f7',
  platform: '#f97316',
  database: '#84cc16',
};

// ── Component ────────────────────────────────────────────────────────────────

export default function Knowledge() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const animRef = useRef<number>(0);
  const renderRef = useRef<() => void>(() => {});

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Fetch graph data
  const { data: graphData, isLoading } = useQuery({
    queryKey: ['knowledge-graph', filterType, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(MAX_VISIBLE_NODES) });
      if (filterType !== 'all') params.set('type', filterType);
      if (debouncedSearch) params.set('search', debouncedSearch);
      return apiFetch<{ nodes: any[]; edges: any[]; stats: any }>(
        `/api/v1/knowledge/graph?${params}`,
      );
    },
    staleTime: 30000,
  });

  // Force simulation
  useEffect(() => {
    if (!graphData?.nodes?.length) {
      nodesRef.current = [];
      edgesRef.current = [];
      return;
    }

    const nodes: GraphNode[] = graphData.nodes.map((n: any, i: number) => ({
      ...n,
      x: 500 + (Math.random() - 0.5) * 400,
      y: 400 + (Math.random() - 0.5) * 300,
      vx: 0,
      vy: 0,
      connections: Number(n.connections) || 0,
    }));

    nodesRef.current = nodes;
    edgesRef.current = graphData.edges || [];

    let iterations = 0;
    const simulate = () => {
      const ns = nodesRef.current;
      const es = edgesRef.current;

      // Repulsion — reduced strength with force capping
      const repulsionStrength = 800;
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const dx = ns[j].x - ns[i].x;
          const dy = ns[j].y - ns[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) + 1;
          const cappedDist = Math.max(dist, 30);
          const force = repulsionStrength / (cappedDist * cappedDist);
          const cappedForce = Math.min(force, 5);
          const fx = (dx / dist) * cappedForce;
          const fy = (dy / dist) * cappedForce;
          ns[i].vx -= fx;
          ns[i].vy -= fy;
          ns[j].vx += fx;
          ns[j].vy += fy;
        }
      }

      // Attraction via edges — stronger spring with ideal distance
      const nodeMap = new Map(ns.map((n) => [n.id, n]));
      const springStrength = 0.05;
      for (const e of es) {
        const s = nodeMap.get(e.source);
        const t = nodeMap.get(e.target);
        if (!s || !t) continue;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 1;
        const idealDist = 80;
        const displacement = dist - idealDist;
        const force = displacement * springStrength;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        s.vx += fx;
        s.vy += fy;
        t.vx -= fx;
        t.vy -= fy;
      }

      // Center gravity — much stronger
      const canvas = canvasRef.current;
      const centerX = canvas?.width ? canvas.width / 2 : 500;
      const centerY = canvas?.height ? canvas.height / 2 : 400;
      const gravityStrength = 0.02;
      for (const n of ns) {
        n.vx += (centerX - n.x) * gravityStrength;
        n.vy += (centerY - n.y) * gravityStrength;
      }

      // Apply velocity with damping + bounding box
      const damping = Math.max(0.85 - iterations * 0.002, 0.3);
      for (const n of ns) {
        n.vx *= damping;
        n.vy *= damping;
        n.x += n.vx;
        n.y += n.vy;

        // Bounding box
        const maxX = centerX + 400;
        const maxY = centerY + 300;
        const minX = centerX - 400;
        const minY = centerY - 300;
        n.x = Math.max(minX, Math.min(maxX, n.x));
        n.y = Math.max(minY, Math.min(maxY, n.y));
      }

      iterations++;
      renderRef.current();
      if (iterations < 200) {
        animRef.current = requestAnimationFrame(simulate);
      }
    };

    simulate();
    return () => cancelAnimationFrame(animRef.current);
  }, [graphData]);

  // Render
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.translate(offset.x + w / 2, offset.y + h / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-w / 2, -h / 2);

    const ns = nodesRef.current;
    const es = edgesRef.current;
    const nodeMap = new Map(ns.map((n) => [n.id, n]));

    // Edges
    ctx.strokeStyle = 'rgba(100, 100, 120, 0.15)';
    ctx.lineWidth = 0.5;
    for (const e of es) {
      const s = nodeMap.get(e.source);
      const t = nodeMap.get(e.target);
      if (!s || !t) continue;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);
      ctx.stroke();
    }

    // Nodes
    for (const n of ns) {
      const radius = Math.max(3, Math.min(12, Math.sqrt(n.connections + 1) * 2));
      const color = NODE_COLORS[n.type] || '#6b7280';
      const isSelected = selectedNode?.id === n.id;

      if (isSelected) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      if (radius > 5 || isSelected || zoom > 1.5) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = `${isSelected ? '12' : '9'}px system-ui`;
        ctx.textAlign = 'center';
        ctx.fillText(n.name.slice(0, 20), n.x, n.y + radius + 12);
      }
    }

    ctx.restore();
  }, [zoom, offset, selectedNode]);

  // Keep renderRef in sync
  useEffect(() => {
    renderRef.current = render;
  }, [render]);

  // Re-render on state changes
  useEffect(() => {
    render();
  }, [render]);

  // Resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      render();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [render]);

  // Mouse handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.1, Math.min(5, z * (e.deltaY > 0 ? 0.9 : 1.1))));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging) {
      setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setDragging(false);

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx =
      (e.clientX - rect.left - offset.x - canvas.width / 2) / zoom + canvas.width / 2;
    const my =
      (e.clientY - rect.top - offset.y - canvas.height / 2) / zoom + canvas.height / 2;

    let closest: GraphNode | null = null;
    let minDist = 20;
    for (const n of nodesRef.current) {
      const d = Math.sqrt((n.x - mx) ** 2 + (n.y - my) ** 2);
      if (d < minDist) {
        minDist = d;
        closest = n;
      }
    }
    setSelectedNode(closest);
  };

  const stats = graphData?.stats || {};

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div>
          <h1 className="text-lg font-semibold text-zinc-200">Knowledge Graph</h1>
          <p className="text-xs text-zinc-500">
            {stats.entities || nodesRef.current.length} entities ·{' '}
            {stats.relationships || edgesRef.current.length} relationships
            {nodesRef.current.length > 0 &&
              nodesRef.current.length < (stats.entities || 0) &&
              ` (showing top ${nodesRef.current.length})`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entities..."
              className="pl-7 pr-3 py-1.5 w-48 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-violet-500/50"
            />
          </div>
          {/* Type filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300"
          >
            <option value="all">All types</option>
            {[
              'person',
              'company',
              'project',
              'product',
              'technology',
              'location',
              'tool',
              'event',
              'service',
              'organization',
            ].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {/* Zoom */}
          <button
            onClick={() => setZoom((z) => Math.min(5, z * 1.3))}
            className="p-1.5 bg-zinc-800 rounded text-zinc-400 hover:text-white"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.1, z * 0.7))}
            className="p-1.5 bg-zinc-800 rounded text-zinc-400 hover:text-white"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setOffset({ x: 0, y: 0 });
            }}
            className="p-1.5 bg-zinc-800 rounded text-zinc-400 hover:text-white"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Graph */}
      <div className="flex-1 relative bg-zinc-950">
        <canvas
          ref={canvasRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        />

        {/* Legend */}
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 p-2 bg-zinc-900/80 backdrop-blur-sm rounded-lg border border-zinc-800">
          {Object.entries(NODE_COLORS)
            .slice(0, 10)
            .map(([type, color]) => (
              <button
                key={type}
                onClick={() => setFilterType(filterType === type ? 'all' : type)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors ${
                  filterType === type
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                {type}
              </button>
            ))}
        </div>

        {/* Selected node detail */}
        {selectedNode && (
          <div className="absolute top-3 right-3 w-72 p-3 bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ background: NODE_COLORS[selectedNode.type] || '#6b7280' }}
              />
              <span className="text-sm font-medium text-zinc-200">{selectedNode.name}</span>
            </div>
            <div className="text-[10px] text-zinc-500 space-y-1">
              <div>
                Type: <span className="text-zinc-400">{selectedNode.type}</span>
              </div>
              <div>
                Connections: <span className="text-zinc-400">{selectedNode.connections}</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="mt-2 text-[10px] text-violet-400 hover:text-violet-300"
            >
              Close
            </button>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80">
            <p className="text-sm text-zinc-500">Loading graph...</p>
          </div>
        )}
      </div>
    </div>
  );
}
