import React, { useState, useEffect, useCallback } from 'react';
import type { ImageInfo, Vector2D, CropTarget } from '../types';
import { SCALE_PRESETS } from '../constants';

interface CropPreviewProps {
  imageInfo: ImageInfo;
  target: CropTarget;
  position: Vector2D;
  onPositionChange: (id: string, newPosition: Vector2D) => void;
  layout: {
    container: { width: number; height: number };
    image: { width: number; height: number };
  };
  zoom: number;
  onZoomChange: (zoom: number) => void;
  scale: number;
  onScaleChange: (scale: number) => void;
}

const CropPreview: React.FC<CropPreviewProps> = ({ 
  imageInfo, 
  target, 
  position, 
  onPositionChange, 
  layout, 
  zoom, 
  onZoomChange,
  scale,
  onScaleChange
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const { container, image } = layout;

  const clampPosition = useCallback((pos: Vector2D): Vector2D => {
    const minX = container.width - image.width;
    const minY = container.height - image.height;
    
    return {
      x: Math.min(0, Math.max(minX, pos.x)),
      y: Math.min(0, Math.max(minY, pos.y)),
    };
  }, [container.width, container.height, image.width, image.height]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const newPos = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    };
    onPositionChange(target.id, clampPosition(newPos));
  }, [isDragging, dragStart, onPositionChange, target.id, clampPosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-2 mb-3">
        <span className="px-3 py-1 bg-indigo-900 text-indigo-100 text-sm font-bold rounded-full border border-indigo-700">
          Target: {target.width} × {target.height}
        </span>
      </div>
      
      {/* Container */}
      <div
        className="relative bg-gray-800 border-4 border-gray-700 cursor-move overflow-hidden rounded-lg shadow-2xl group"
        style={{ width: container.width, height: container.height }}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseUp}
      >
        {/* Overlay Instruction */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 pointer-events-none z-10">
          <span className="text-white drop-shadow-md text-sm font-semibold bg-black/50 px-2 py-1 rounded">
            Drag to Pan
          </span>
        </div>

        {/* Image */}
        <img
          src={imageInfo.src}
          alt="Crop preview"
          className="absolute max-w-none select-none"
          style={{
            width: image.width,
            height: image.height,
            transform: `translate(${position.x}px, ${position.y}px)`,
            willChange: 'transform',
            imageRendering: 'high-quality' as any
          }}
          draggable="false"
        />
      </div>

      <div className="w-full mt-4 bg-gray-800 p-3 rounded-lg border border-gray-700 space-y-3">
          {/* Zoom Control */}
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider w-12">Zoom</span>
            <input 
                type="range" 
                min="1" 
                max="2" 
                step="0.01" 
                value={zoom} 
                onChange={(e) => onZoomChange(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
            />
            <span className="text-sm font-mono text-indigo-300 w-12 text-right">{zoom.toFixed(1)}x</span>
          </div>

          {/* Scale Control */}
          <div className="flex items-center justify-between gap-4">
             <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider w-12">Ratio</span>
             <div className="flex-1 flex justify-between gap-1">
                {SCALE_PRESETS.map((s) => (
                  <button
                    key={s}
                    onClick={() => onScaleChange(s)}
                    className={`flex-1 text-[10px] sm:text-xs py-1 px-1 rounded transition-colors ${
                      scale === s 
                        ? 'bg-indigo-600 text-white font-bold shadow-sm' 
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
             </div>
             <span className="w-12"></span> {/* Spacer for alignment */}
          </div>
      </div>
    </div>
  );
};

export default CropPreview;