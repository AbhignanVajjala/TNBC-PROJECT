import React, { useEffect, useRef, useState } from 'react';
import { RotateCw, Play, Pause, ZoomIn, ZoomOut, Maximize2, ShieldCheck } from 'lucide-react';

interface MolecularViewerProps {
  receptorName: string;
  ligandName: string;
  score: number;
  deltaG: number;
  kd: number;
  ipTM: number;
  interfaceArea: number;
}

export const MolecularViewer: React.FC<MolecularViewerProps> = ({
  receptorName,
  ligandName,
  score,
  deltaG,
  kd,
  ipTM,
  interfaceArea,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [renderMode, setRenderMode] = useState<'ribbon' | 'surface' | 'hotspots'>('ribbon');
  const [showDistances, setShowDistances] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(1);

  // Rotation state angles
  const rotRef = useRef({ x: 0.35, y: -0.45 });
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    // Generate deterministic 3D pseudo-atoms for receptor and ligand
    const receptorAtoms: { x: number; y: number; z: number; r: number; color: string; label?: string }[] = [];
    const ligandAtoms: { x: number; y: number; z: number; r: number; color: string; label?: string }[] = [];

    // Receptor backbone (alpha-helix & beta-sandwich motif)
    for (let i = 0; i < 48; i++) {
      const t = i / 48;
      const angle = t * Math.PI * 5;
      const x = -85 + Math.cos(angle) * 32 + (t - 0.5) * 40;
      const y = (t - 0.5) * 160 + Math.sin(t * Math.PI * 4) * 20;
      const z = Math.sin(angle) * 32;
      receptorAtoms.push({
        x,
        y,
        z,
        r: i % 4 === 0 ? 5.5 : 4,
        color: i % 2 === 0 ? '#A6543D' : '#C76A52',
        label: i === 24 ? 'Glu108' : i === 36 ? 'Tyr184' : undefined
      });
    }

    // Ligand backbone (modular annexin / discoidin repeat motif)
    for (let i = 0; i < 48; i++) {
      const t = i / 48;
      const angle = t * Math.PI * 4.5 + Math.PI;
      const x = 75 + Math.cos(angle) * 30 - (t - 0.5) * 30;
      const y = (t - 0.5) * 150 + Math.cos(t * Math.PI * 3) * 18;
      const z = Math.sin(angle) * 30;
      ligandAtoms.push({
        x,
        y,
        z,
        r: i % 4 === 0 ? 5.5 : 4,
        color: i % 2 === 0 ? '#3E4F3F' : '#556D56',
        label: i === 20 ? 'Arg162' : i === 32 ? 'Phe210' : undefined
      });
    }

    // Resize canvas
    const handleResize = () => {
      if (!containerRef.current || !canvas) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    // Render loop
    const render = () => {
      if (isRotating && !isDraggingRef.current) {
        rotRef.current.y += 0.007;
        rotRef.current.x += 0.002;
      }

      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      ctx.clearRect(0, 0, width, height);

      // Background subtle gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#263427');
      bgGrad.addColorStop(1, '#1A231B');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle membrane guideline on exosome side
      ctx.save();
      ctx.strokeStyle = 'rgba(143, 160, 133, 0.2)';
      ctx.setLineDash([4, 6]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(width * 0.75, height * 0.5, height * 0.45, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.restore();

      const cx = width / 2;
      const cy = height / 2;
      const currentZoom = zoom;

      // 3D rotation matrix projection
      const cosX = Math.cos(rotRef.current.x);
      const sinX = Math.sin(rotRef.current.x);
      const cosY = Math.cos(rotRef.current.y);
      const sinY = Math.sin(rotRef.current.y);

      const project = (pt: { x: number; y: number; z: number }) => {
        // Rotate around Y
        const x1 = pt.x * cosY - pt.z * sinY;
        const z1 = pt.x * sinY + pt.z * cosY;
        // Rotate around X
        const y2 = pt.y * cosX - z1 * sinX;
        const z2 = pt.y * sinX + z1 * cosX;

        // Perspective projection
        const fov = 420;
        const scale = (fov / (fov + z2)) * currentZoom;
        return {
          px: cx + x1 * scale,
          py: cy + y2 * scale,
          pz: z2,
          scale
        };
      };

      // Collect all projected elements for depth sorting
      type Drawable =
        | { type: 'atom'; pz: number; px: number; py: number; r: number; color: string; label?: string }
        | { type: 'bond'; pz: number; x1: number; y1: number; x2: number; y2: number; color: string; width: number }
        | { type: 'contact'; pz: number; x1: number; y1: number; x2: number; y2: number; label: string; dist: string };

      const drawables: Drawable[] = [];

      // Receptor backbone bonds
      for (let i = 0; i < receptorAtoms.length - 1; i++) {
        const p1 = project(receptorAtoms[i]);
        const p2 = project(receptorAtoms[i + 1]);
        drawables.push({
          type: 'bond',
          pz: (p1.pz + p2.pz) / 2,
          x1: p1.px,
          y1: p1.py,
          x2: p2.px,
          y2: p2.py,
          color: renderMode === 'surface' ? 'rgba(166, 84, 61, 0.4)' : '#A6543D',
          width: renderMode === 'surface' ? 8 * p1.scale : 3.5 * p1.scale
        });
      }

      // Ligand backbone bonds
      for (let i = 0; i < ligandAtoms.length - 1; i++) {
        const p1 = project(ligandAtoms[i]);
        const p2 = project(ligandAtoms[i + 1]);
        drawables.push({
          type: 'bond',
          pz: (p1.pz + p2.pz) / 2,
          x1: p1.px,
          y1: p1.py,
          x2: p2.px,
          y2: p2.py,
          color: renderMode === 'surface' ? 'rgba(143, 160, 133, 0.4)' : '#6D8B6F',
          width: renderMode === 'surface' ? 8 * p1.scale : 3.5 * p1.scale
        });
      }

      // Atoms
      receptorAtoms.forEach((a) => {
        const p = project(a);
        drawables.push({
          type: 'atom',
          pz: p.pz,
          px: p.px,
          py: p.py,
          r: renderMode === 'surface' ? a.r * 2.2 * p.scale : a.r * p.scale,
          color: a.color,
          label: a.label
        });
      });

      ligandAtoms.forEach((a) => {
        const p = project(a);
        drawables.push({
          type: 'atom',
          pz: p.pz,
          px: p.px,
          py: p.py,
          r: renderMode === 'surface' ? a.r * 2.2 * p.scale : a.r * p.scale,
          color: a.color,
          label: a.label
        });
      });

      // Interface contact vectors between receptor and ligand hotspots
      if (showDistances) {
        const pR1 = project(receptorAtoms[24]); // Glu108
        const pL1 = project(ligandAtoms[20]);   // Arg162
        drawables.push({
          type: 'contact',
          pz: (pR1.pz + pL1.pz) / 2,
          x1: pR1.px,
          y1: pR1.py,
          x2: pL1.px,
          y2: pL1.py,
          label: 'Salt Bridge',
          dist: '2.8 Å'
        });

        const pR2 = project(receptorAtoms[36]); // Tyr184
        const pL2 = project(ligandAtoms[32]);   // Phe210
        drawables.push({
          type: 'contact',
          pz: (pR2.pz + pL2.pz) / 2,
          x1: pR2.px,
          y1: pR2.py,
          x2: pL2.px,
          y2: pL2.py,
          label: 'Pi-Stacking',
          dist: '3.4 Å'
        });
      }

      // Depth sort: render furthest first
      drawables.sort((a, b) => b.pz - a.pz);

      // Draw all items
      drawables.forEach((item) => {
        if (item.type === 'bond') {
          ctx.beginPath();
          ctx.moveTo(item.x1, item.y1);
          ctx.lineTo(item.x2, item.y2);
          ctx.strokeStyle = item.color;
          ctx.lineWidth = item.width;
          ctx.lineCap = 'round';
          ctx.stroke();
        } else if (item.type === 'atom') {
          ctx.beginPath();
          ctx.arc(item.px, item.py, Math.max(1, item.r), 0, Math.PI * 2);
          ctx.fillStyle = item.color;
          ctx.fill();

          // Subtle shading highlight
          ctx.beginPath();
          ctx.arc(item.px - item.r * 0.3, item.py - item.r * 0.3, Math.max(0.5, item.r * 0.35), 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.fill();

          if (renderMode === 'hotspots' && item.label) {
            ctx.fillStyle = '#FAF8F4';
            ctx.font = '10px Inter, sans-serif';
            ctx.fillText(item.label, item.px + 8, item.py - 4);
          }
        } else if (item.type === 'contact') {
          // Dashed glowing contact vector line
          ctx.save();
          ctx.strokeStyle = '#E3B873';
          ctx.lineWidth = 1.8;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(item.x1, item.y1);
          ctx.lineTo(item.x2, item.y2);
          ctx.stroke();

          // Midpoint distance tag
          const mx = (item.x1 + item.x2) / 2;
          const my = (item.y1 + item.y2) / 2;
          ctx.fillStyle = '#2C3A2D';
          ctx.fillRect(mx - 22, my - 10, 44, 16);
          ctx.strokeStyle = '#E3B873';
          ctx.strokeRect(mx - 22, my - 10, 44, 16);
          ctx.fillStyle = '#FAF8F4';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(item.dist, mx, my - 1);
          ctx.restore();
        }
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
    };
  }, [isRotating, renderMode, showDistances, zoom]);

  // Drag rotation handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    rotRef.current.y += dx * 0.008;
    rotRef.current.x += dy * 0.008;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - lastMouseRef.current.x;
    const dy = e.touches[0].clientY - lastMouseRef.current.y;
    rotRef.current.y += dx * 0.008;
    rotRef.current.x += dy * 0.008;
    lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  const handleReset = () => {
    rotRef.current = { x: 0.35, y: -0.45 };
    setZoom(1);
    setIsRotating(true);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[400px] sm:h-[460px] rounded-lg overflow-hidden border border-forest/30 select-none cursor-grab active:cursor-grabbing bg-[#263427] shadow-inner"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Molecular Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Top Left: Complex Title & Quick Metrics Pill */}
      <div className="absolute top-3.5 left-3.5 flex flex-col gap-1.5 pointer-events-none">
        <div className="inline-flex items-center gap-2 bg-[#1A231B]/85 backdrop-blur-md px-3 py-1.5 rounded border border-forest/40 text-xs text-[#FAF8F4] font-sans">
          <span className="w-2 h-2 rounded-full bg-terracotta"></span>
          <span className="font-medium text-[11px]">{receptorName}</span>
          <span className="text-forest/60">×</span>
          <span className="w-2 h-2 rounded-full bg-sage"></span>
          <span className="font-medium text-[11px]">{ligandName}</span>
        </div>
        <div className="inline-flex items-center gap-3 bg-[#1A231B]/80 backdrop-blur-md px-3 py-1 rounded border border-forest/30 text-[10px] font-mono text-[#FAF8F4]/80">
          <span>ipTM: <b className="text-sage">{ipTM}</b></span>
          <span>ΔG: <b className="text-[#E3B873]">{deltaG} kcal/mol</b></span>
          <span>Kd: <b className="text-cream">{kd} nM</b></span>
          <span>Area: <b className="text-[#FAF8F4]">{interfaceArea} Å²</b></span>
        </div>
      </div>

      {/* Top Right: Style Selector Pills */}
      <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 bg-[#1A231B]/80 backdrop-blur-md p-1 rounded border border-forest/40">
        <button
          onClick={() => setRenderMode('ribbon')}
          className={`px-2.5 py-1 text-[10px] font-sans font-medium rounded transition-all ${
            renderMode === 'ribbon' ? 'bg-forest text-white' : 'text-[#FAF8F4]/70 hover:text-white'
          }`}
          title="Cartoon backbone ribbons"
        >
          Ribbon
        </button>
        <button
          onClick={() => setRenderMode('surface')}
          className={`px-2.5 py-1 text-[10px] font-sans font-medium rounded transition-all ${
            renderMode === 'surface' ? 'bg-forest text-white' : 'text-[#FAF8F4]/70 hover:text-white'
          }`}
          title="Surface envelope representation"
        >
          Surface
        </button>
        <button
          onClick={() => setRenderMode('hotspots')}
          className={`px-2.5 py-1 text-[10px] font-sans font-medium rounded transition-all ${
            renderMode === 'hotspots' ? 'bg-forest text-white' : 'text-[#FAF8F4]/70 hover:text-white'
          }`}
          title="Residue contacts & labels"
        >
          Hotspots
        </button>
      </div>

      {/* Bottom Left: Legend */}
      <div className="absolute bottom-3.5 left-3.5 hidden sm:flex items-center gap-4 bg-[#1A231B]/80 backdrop-blur-md px-3 py-1.5 rounded border border-forest/30 text-[10px] font-sans text-[#FAF8F4]/80 pointer-events-none">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-1.5 rounded-sm bg-terracotta"></span>
          <span>Target Ectodomain</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-1.5 rounded-sm bg-sage"></span>
          <span>EV Scaffold Loop</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-0.5 border-t border-dashed border-[#E3B873]"></span>
          <span>Contact Vectors</span>
        </div>
      </div>

      {/* Bottom Right: Interactive Controls */}
      <div className="absolute bottom-3.5 right-3.5 flex items-center gap-1.5 bg-[#1A231B]/85 backdrop-blur-md p-1.5 rounded border border-forest/40">
        <button
          onClick={() => setShowDistances(!showDistances)}
          className={`p-1.5 rounded text-xs transition-colors ${
            showDistances ? 'text-[#E3B873] bg-forest/40' : 'text-[#FAF8F4]/60 hover:text-white'
          }`}
          title="Toggle distance measurement vectors"
        >
          <ShieldCheck className="w-4 h-4" />
        </button>
        <button
          onClick={() => setIsRotating(!isRotating)}
          className="p-1.5 text-[#FAF8F4]/70 hover:text-white rounded transition-colors"
          title={isRotating ? 'Pause rotation' : 'Resume auto-rotation'}
        >
          {isRotating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button
          onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}
          className="p-1.5 text-[#FAF8F4]/70 hover:text-white rounded transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.65, z - 0.15))}
          className="p-1.5 text-[#FAF8F4]/70 hover:text-white rounded transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleReset}
          className="p-1.5 text-[#FAF8F4]/70 hover:text-white rounded transition-colors"
          title="Reset camera orientation"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
