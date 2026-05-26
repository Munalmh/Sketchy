import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import type { Stroke } from '../types';
import { Trash2, ShieldAlert, Edit2, PaintBucket } from 'lucide-react';

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

// Helper to parse hex string to RGBA object for flood fill
function hexToRGBA(hex: string) {
  let r = 0, g = 0, b = 0, a = 255;
  const cleanedHex = hex.replace('#', '');
  if (cleanedHex.length === 3) {
    r = parseInt(cleanedHex[0] + cleanedHex[0], 16);
    g = parseInt(cleanedHex[1] + cleanedHex[1], 16);
    b = parseInt(cleanedHex[2] + cleanedHex[2], 16);
  } else if (cleanedHex.length === 6) {
    r = parseInt(cleanedHex.substring(0, 2), 16);
    g = parseInt(cleanedHex.substring(2, 4), 16);
    b = parseInt(cleanedHex.substring(4, 6), 16);
  }
  return { r, g, b, a };
}

export const Canvas: React.FC<CanvasProps> = ({ isDrawer, socket, roomId, canvasHistory = [] }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(10);
  const [tool, setTool] = useState<'pencil' | 'eraser' | 'fill'>('pencil');
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Track how many segments of the history have already been drawn locally
  const renderedCountRef = useRef(0);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize canvas context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    contextRef.current = ctx;
  }, []);

  // Scanline Flood Fill implementation
  const performFloodFill = useCallback((startX: number, startY: number, fillHexColor: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = contextRef.current;
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const startXInt = Math.floor(startX);
    const startYInt = Math.floor(startY);

    if (startXInt < 0 || startXInt >= width || startYInt < 0 || startYInt >= height) return;

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const fillRGBA = hexToRGBA(fillHexColor);

    const startIndex = (startYInt * width + startXInt) * 4;
    const startR = data[startIndex];
    const startG = data[startIndex + 1];
    const startB = data[startIndex + 2];
    const startA = data[startIndex + 3];

    // If start color is already the fill color, return
    if (
      startR === fillRGBA.r &&
      startG === fillRGBA.g &&
      startB === fillRGBA.b &&
      startA === fillRGBA.a
    ) {
      return;
    }

    const queue: [number, number][] = [[startXInt, startYInt]];

    const colorsMatch = (idx: number) => {
      // 10 units color tolerance
      return (
        Math.abs(data[idx] - startR) < 10 &&
        Math.abs(data[idx + 1] - startG) < 10 &&
        Math.abs(data[idx + 2] - startB) < 10 &&
        Math.abs(data[idx + 3] - startA) < 10
      );
    };

    const setPixelColor = (idx: number) => {
      data[idx] = fillRGBA.r;
      data[idx + 1] = fillRGBA.g;
      data[idx + 2] = fillRGBA.b;
      data[idx + 3] = fillRGBA.a;
    };

    while (queue.length > 0) {
      const current = queue.pop();
      if (!current) continue;

      const [cx, cy] = current;
      let left = cx;
      let right = cx;

      while (left > 0 && colorsMatch((cy * width + (left - 1)) * 4)) {
        left--;
      }

      while (right < width - 1 && colorsMatch((cy * width + (right + 1)) * 4)) {
        right++;
      }

      for (let x = left; x <= right; x++) {
        setPixelColor((cy * width + x) * 4);
      }

      // Check row above
      if (cy > 0) {
        let inSegment = false;
        for (let x = left; x <= right; x++) {
          const idx = ((cy - 1) * width + x) * 4;
          if (colorsMatch(idx)) {
            if (!inSegment) {
              queue.push([x, cy - 1]);
              inSegment = true;
            }
          } else {
            inSegment = false;
          }
        }
      }

      // Check row below
      if (cy < height - 1) {
        let inSegment = false;
        for (let x = left; x <= right; x++) {
          const idx = ((cy + 1) * width + x) * 4;
          if (colorsMatch(idx)) {
            if (!inSegment) {
              queue.push([x, cy + 1]);
              inSegment = true;
            }
          } else {
            inSegment = false;
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, []);

  // Helper to draw a single stroke segment on the local canvas
  const drawSegment = useCallback((stroke: Stroke) => {
    if (stroke.isFill) {
      performFloodFill(stroke.x, stroke.y, stroke.color);
      return;
    }

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
  }, [performFloodFill]);

  // Performance-Optimized drawing: Only draw new incoming segments since last counter
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    if (canvasHistory.length === 0) {
      // Clear canvas completely
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      renderedCountRef.current = 0;
      return;
    }

    const startIndex = renderedCountRef.current;
    if (startIndex > canvasHistory.length) {
      // State reset or round mismatch, redraw everything
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvasHistory.forEach(stroke => {
        drawSegment(stroke);
      });
    } else {
      // Incremental render of only new elements (extremely fast!)
      for (let i = startIndex; i < canvasHistory.length; i++) {
        drawSegment(canvasHistory[i]);
      }
    }
    renderedCountRef.current = canvasHistory.length;
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
        renderedCountRef.current = 0;
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

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    return { x, y };
  };

  // Drawing event handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawer) return;

    if (e.cancelable) {
      e.preventDefault();
    }

    const pos = getCoordinates(e);
    if (!pos) return;

    // 1. Paint Bucket Fill mode
    if (tool === 'fill') {
      const stroke: Stroke = {
        x: pos.x,
        y: pos.y,
        lastX: null,
        lastY: null,
        color,
        size: 0,
        isEraser: false,
        isFill: true
      };
      
      // Perform local fill
      performFloodFill(pos.x, pos.y, color);
      
      // Broadcast fill event
      if (socket) {
        socket.emit('draw_stroke', { roomId, stroke });
      }
      return;
    }

    // 2. Normal Drawing mode
    setIsDrawing(true);
    lastPosRef.current = pos;

    const stroke: Stroke = {
      x: pos.x,
      y: pos.y,
      lastX: null,
      lastY: null,
      color,
      size: brushSize,
      isEraser: tool === 'eraser',
    };

    drawSegment(stroke);
    if (socket) {
      socket.emit('draw_stroke', { roomId, stroke });
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawer || !lastPosRef.current || tool === 'fill') return;

    if (e.cancelable) {
      e.preventDefault();
    }

    const pos = getCoordinates(e);
    if (!pos) return;

    const lastPos = lastPosRef.current;

    // Minimum distance threshold to ensure smooth curve segmenting and zero network lag
    const dist = Math.hypot(pos.x - lastPos.x, pos.y - lastPos.y);
    if (dist < 1.0) return;

    const stroke: Stroke = {
      x: pos.x,
      y: pos.y,
      lastX: lastPos.x,
      lastY: lastPos.y,
      color,
      size: brushSize,
      isEraser: tool === 'eraser',
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

  // Generate dynamic inline cursor style depending on current tool
  const getCursorStyle = () => {
    if (!isDrawer) return { cursor: 'not-allowed' };
    
    if (tool === 'eraser') {
      // Red square shape representing eraser
      return {
        cursor: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23ef4444' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='3' width='18' height='18' rx='4'/></svg>") 12 12, crosshair`
      };
    }
    
    if (tool === 'fill') {
      // Paint bucket icon for flood fill
      return {
        cursor: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2310b981' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-5-4-5-4-3 2.4-5 4-3 3.5-3 5.5a7 7 0 0 0 7 7z'/></svg>") 12 12, crosshair`
      };
    }

    // Classic blue pencil icon pointing to bottom-left (hotspot 2 22)
    return {
      cursor: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='%234f46e5' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z'/><path d='m15 5 4 4'/></svg>") 2 22, crosshair`
    };
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
          style={getCursorStyle()}
          className="w-full h-full bg-white rounded-xl shadow-inner transition-all"
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
                  if (tool === 'eraser') {
                    setTool('pencil');
                  }
                }}
                style={{ backgroundColor: c }}
                className={`w-7 h-7 rounded-lg border-2 relative transition-all duration-150 ${
                  tool !== 'eraser' && color === c
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
                  if (tool === 'eraser') {
                    setTool('pencil');
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Custom color picker"
              />
              <span className="text-xs pointer-events-none text-slate-300 font-bold">+</span>
            </div>
          </div>

          {/* Tools & Brush sizes */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Mode selection (Draw vs Erase vs Fill) */}
            <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-700/30">
              <button
                onClick={() => setTool('pencil')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all ${
                  tool === 'pencil'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Edit2 className="w-3.5 h-3.5" />
                Draw
              </button>
              <button
                onClick={() => setTool('fill')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all ${
                  tool === 'fill'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <PaintBucket className="w-3.5 h-3.5" />
                Fill
              </button>
              <button
                onClick={() => setTool('eraser')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all ${
                  tool === 'eraser'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-3.5 h-3.5 flex items-center justify-center">🧽</span>
                Eraser
              </button>
            </div>

            {/* Brush Sizes (disabled during fill mode) */}
            <div className={`flex items-center gap-1.5 bg-slate-900/50 p-1 rounded-xl border border-slate-700/30 transition-all ${
              tool === 'fill' ? 'opacity-30 pointer-events-none' : ''
            }`}>
              {BRUSH_SIZES.map((size) => (
                <button
                  key={size.value}
                  onClick={() => setBrushSize(size.value)}
                  disabled={tool === 'fill'}
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
                  width: `${tool === 'fill' ? 14 : Math.max(4, Math.min(30, brushSize))}px`,
                  height: `${tool === 'fill' ? 14 : Math.max(4, Math.min(30, brushSize))}px`,
                  backgroundColor: tool === 'eraser' ? '#ffffff' : color,
                }}
                className={`border border-slate-400/50 shadow-sm transition-all ${
                  tool === 'fill' ? 'rounded-md clip-path-bucket' : 'rounded-full'
                }`}
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
