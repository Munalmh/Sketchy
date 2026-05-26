import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import type { Stroke } from '../types';
import { Trash2, ShieldAlert, Edit2 } from 'lucide-react';

interface CanvasProps {
  isDrawer: boolean;
  socket: Socket | null;
  roomId: string;
  canvasHistory?: Stroke[];
}

const COLORS = [
  '#000000', // Black
  '#ffffff', // White
  '#4B5563', // Gray
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Yellow
  '#10B981', // Green
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#78350F', // Brown
];

const BRUSH_SIZES = [
  { label: 'S', value: 4 },
  { label: 'M', value: 10 },
  { label: 'L', value: 20 },
  { label: 'XL', value: 40 },
];

export const Canvas: React.FC<CanvasProps> = ({ isDrawer, socket, roomId, canvasHistory = [] }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(10);
  const [isEraser, setIsEraser] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Keep track of last drawn position
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize canvas context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    contextRef.current = ctx;
  }, []);

  // Helper to draw a single stroke segment on the local canvas
  const drawSegment = useCallback((stroke: Stroke) => {
    const ctx = contextRef.current;
    if (!ctx) return;

    ctx.beginPath();
    ctx.strokeStyle = stroke.isEraser ? '#ffffff' : stroke.color;
    ctx.lineWidth = stroke.size;

    if (stroke.lastX !== null && stroke.lastY !== null) {
      ctx.moveTo(stroke.lastX, stroke.lastY);
      ctx.lineTo(stroke.x, stroke.y);
    } else {
      // Draw a single dot
      ctx.moveTo(stroke.x, stroke.y);
      ctx.lineTo(stroke.x, stroke.y);
    }
    ctx.stroke();
    ctx.closePath();
  }, []);

  // Re-draw whole history when it changes (e.g. on join or clear)
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all segments in history
    canvasHistory.forEach(stroke => {
      drawSegment(stroke);
    });
  }, [canvasHistory, drawSegment]);

  // Handle incoming socket events for drawing
  useEffect(() => {
    if (!socket) return;

    const handleDrawStroke = (stroke: Stroke) => {
      drawSegment(stroke);
    };

    const handleClearCanvas = () => {
      const canvas = canvasRef.current;
      const ctx = contextRef.current;
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    socket.on('draw_stroke', handleDrawStroke);
    socket.on('clear_canvas', handleClearCanvas);

    return () => {
      socket.off('draw_stroke', handleDrawStroke);
      socket.off('clear_canvas', handleClearCanvas);
    };
  }, [socket, drawSegment]);

  // Translate client mouse/touch event into logical 800x500 coordinates
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Map screen bounds to logical 800x500 space
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    return { x, y };
  };

  // Drawing event handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawer) return;

    // Prevent default touch scrolling
    if (e.cancelable) {
      e.preventDefault();
    }

    const pos = getCoordinates(e);
    if (!pos) return;

    setIsDrawing(true);
    lastPosRef.current = pos;

    // Draw single dot on click/tap
    const stroke: Stroke = {
      x: pos.x,
      y: pos.y,
      lastX: null,
      lastY: null,
      color,
      size: brushSize,
      isEraser,
    };

    drawSegment(stroke);
    if (socket) {
      socket.emit('draw_stroke', { roomId, stroke });
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawer || !lastPosRef.current) return;

    // Prevent default touch scrolling
    if (e.cancelable) {
      e.preventDefault();
    }

    const pos = getCoordinates(e);
    if (!pos) return;

    const lastPos = lastPosRef.current;

    // Throttling optimization: only draw if cursor moved more than a minimum distance
    const dist = Math.hypot(pos.x - lastPos.x, pos.y - lastPos.y);
    if (dist < 1.5) return;

    const stroke: Stroke = {
      x: pos.x,
      y: pos.y,
      lastX: lastPos.x,
      lastY: lastPos.y,
      color,
      size: brushSize,
      isEraser,
    };

    drawSegment(stroke);
    if (socket) {
      socket.emit('draw_stroke', { roomId, stroke });
    }

    lastPosRef.current = pos;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPosRef.current = null;
  };

  const handleClear = () => {
    if (!isDrawer) return;
    if (socket) {
      socket.emit('clear_canvas', { roomId });
    }
  };

  return (
    <div className="flex flex-col h-full select-none">
      {/* Logical Canvas Container */}
      <div className="relative flex-grow bg-slate-900/40 rounded-2xl p-2 border border-slate-700/30 shadow-xl overflow-hidden aspect-[8/5]">
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`w-full h-full bg-white rounded-xl shadow-inner object-contain transition-all ${
            isDrawer ? 'cursor-crosshair' : 'cursor-not-allowed pointer-events-none'
          }`}
        />
        
        {/* Read-Only Indicator overlay */}
        {!isDrawer && (
          <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/50 flex items-center gap-2 text-xs font-semibold text-slate-300">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Spectating drawing...</span>
          </div>
        )}
      </div>

      {/* Canvas Toolbars (Only visible/active for Drawer) */}
      {isDrawer && (
        <div className="flex flex-wrap items-center justify-between gap-4 mt-3 bg-slate-800/80 border border-slate-700/50 p-3 rounded-2xl shadow-lg backdrop-blur-md transition-all duration-300">
          
          {/* Colors Selection */}
          <div className="flex flex-wrap gap-1.5 items-center">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  setIsEraser(false);
                }}
                style={{ backgroundColor: c }}
                className={`w-7 h-7 rounded-lg border-2 relative transition-all duration-150 ${
                  !isEraser && color === c
                    ? 'border-white scale-110 shadow-md ring-2 ring-indigo-500'
                    : 'border-slate-700 hover:scale-105'
                }`}
                title={c}
              >
                {c === '#ffffff' && (
                  <div className="absolute inset-0 bg-slate-100/20 rounded-md border border-slate-300 pointer-events-none" />
                )}
              </button>
            ))}
            
            {/* Custom Color Input */}
            <div className="w-7 h-7 rounded-lg border-2 border-slate-700 relative overflow-hidden flex items-center justify-center hover:scale-105 transition-all">
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  setIsEraser(false);
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Custom color picker"
              />
              <span className="text-xs pointer-events-none text-slate-300 font-bold">+</span>
            </div>
          </div>

          {/* Tools & Brush sizes */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Mode selection (Draw vs Erase) */}
            <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-700/30">
              <button
                onClick={() => setIsEraser(false)}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all ${
                  !isEraser
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Edit2 className="w-3.5 h-3.5" />
                Draw
              </button>
              <button
                onClick={() => setIsEraser(true)}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all ${
                  isEraser
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-3.5 h-3.5 flex items-center justify-center">🧽</span>
                Eraser
              </button>
            </div>

            {/* Brush Sizes */}
            <div className="flex items-center gap-1.5 bg-slate-900/50 p-1 rounded-xl border border-slate-700/30">
              {BRUSH_SIZES.map((size) => (
                <button
                  key={size.value}
                  onClick={() => setBrushSize(size.value)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                    brushSize === size.value
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {size.label}
                </button>
              ))}
            </div>

            {/* Current brush indicator */}
            <div className="flex items-center gap-2 border-l border-slate-700/50 pl-3">
              <div
                style={{
                  width: `${Math.max(4, Math.min(30, brushSize))}px`,
                  height: `${Math.max(4, Math.min(30, brushSize))}px`,
                  backgroundColor: isEraser ? '#ffffff' : color,
                }}
                className="rounded-full border border-slate-400/50 shadow-sm"
              />
            </div>

            {/* Clear Canvas */}
            <button
              onClick={handleClear}
              className="bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 hover:text-rose-100 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
              title="Clear all drawings"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Canvas
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
export default Canvas;
