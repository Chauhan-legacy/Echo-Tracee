/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useRef, useState, useEffect } from 'react';
import { EyeOff, Plus, Trash2, Check, X } from 'lucide-react';
import { VisualFindingBox } from '../types';

interface ManualBlurToolProps {
  frames: HTMLCanvasElement[];
  existingBoxes: VisualFindingBox[];
  onUpdateBoxes: (boxes: VisualFindingBox[]) => void;
  onClose: () => void;
}

export const ManualBlurTool: React.FC<ManualBlurToolProps> = ({
  frames,
  existingBoxes,
  onUpdateBoxes,
  onClose,
}) => {
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);
  const [boxes, setBoxes] = useState<VisualFindingBox[]>(existingBoxes);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentDragBox, setCurrentDragBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [newBoxLabel, setNewBoxLabel] = useState('Manual Redaction');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Redraw canvas with current frame and bounding boxes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || frames.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentFrame = frames[currentFrameIdx] || frames[0];
    canvas.width = currentFrame.width;
    canvas.height = currentFrame.height;

    // Draw video frame
    ctx.drawImage(currentFrame, 0, 0);

    // Draw existing boxes
    boxes.forEach((box, i) => {
      ctx.strokeStyle = '#A32A1F'; // brick red
      ctx.lineWidth = 3;
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      ctx.fillStyle = '#A32A1F';
      ctx.fillRect(box.x, Math.max(0, box.y - 20), Math.min(box.width, 140), 20);

      ctx.fillStyle = '#FAF5EB';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText(`${i + 1}. ${box.label}`, box.x + 4, Math.max(14, box.y - 6));
    });

    // Draw active drag box
    if (currentDragBox) {
      ctx.strokeStyle = '#8BCF55'; // lime
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(currentDragBox.x, currentDragBox.y, currentDragBox.w, currentDragBox.h);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(139, 207, 85, 0.2)';
      ctx.fillRect(currentDragBox.x, currentDragBox.y, currentDragBox.w, currentDragBox.h);
    }
  }, [currentFrameIdx, frames, boxes, currentDragBox]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    setStartPoint(coords);
    setCurrentDragBox({ x: coords.x, y: coords.y, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return;
    const coords = getCanvasCoords(e);
    const x = Math.min(startPoint.x, coords.x);
    const y = Math.min(startPoint.y, coords.y);
    const w = Math.abs(coords.x - startPoint.x);
    const h = Math.abs(coords.y - startPoint.y);
    setCurrentDragBox({ x, y, w, h });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentDragBox) return;
    setIsDrawing(false);

    if (currentDragBox.w > 15 && currentDragBox.h > 15) {
      const newBox: VisualFindingBox = {
        x: Math.round(currentDragBox.x),
        y: Math.round(currentDragBox.y),
        width: Math.round(currentDragBox.w),
        height: Math.round(currentDragBox.h),
        label: newBoxLabel,
        type: 'card',
        timestamp: 0,
      };
      const updated = [...boxes, newBox];
      setBoxes(updated);
      onUpdateBoxes(updated);
    }
    setCurrentDragBox(null);
    setStartPoint(null);
  };

  const handleDeleteBox = (index: number) => {
    const updated = boxes.filter((_, i) => i !== index);
    setBoxes(updated);
    onUpdateBoxes(updated);
  };

  return (
    <div className="rounded-xl border border-hairline bg-card p-4 shadow-md space-y-4">
      <div className="flex items-center justify-between border-b border-hairline pb-3">
        <div className="flex items-center gap-2">
          <EyeOff className="h-5 w-5 text-forest" />
          <h4 className="font-serif font-bold text-ink text-base">
            Manual Visual Redaction Tool
          </h4>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1.5 text-muted hover:bg-sunken hover:text-ink transition"
          aria-label="Close manual redaction tool"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="text-xs text-muted leading-relaxed">
        Click and drag on any frame below to define an irreversible 24px mosaic blur region. The redaction carries across all frames.
      </p>

      {/* Frame selector if video has multiple frames */}
      {frames.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted">Select Frame:</span>
          <input
            type="range"
            min={0}
            max={frames.length - 1}
            value={currentFrameIdx}
            onChange={e => setCurrentFrameIdx(Number(e.target.value))}
            className="flex-1 accent-forest cursor-pointer"
          />
          <span className="text-xs font-mono text-ink">
            Frame {currentFrameIdx + 1} / {frames.length}
          </span>
        </div>
      )}

      {/* Interactive Canvas */}
      <div className="relative overflow-hidden rounded-lg border border-hairline bg-deep-forest flex items-center justify-center">
        {frames.length === 0 ? (
          <div className="py-12 text-center text-xs font-mono text-muted">
            No video frames available to redact.
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="max-h-[380px] w-auto max-w-full cursor-crosshair select-none"
          />
        )}
      </div>

      {/* Box Label Input & Active List */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium text-ink">New Box Label:</label>
          <input
            type="text"
            value={newBoxLabel}
            onChange={e => setNewBoxLabel(e.target.value)}
            className="rounded border border-hairline bg-page px-2 py-1 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-forest"
            placeholder="e.g. Credit Card, Face, Document"
          />
          <span className="text-[11px] text-muted italic">
            Drag on canvas to place.
          </span>
        </div>

        {/* Existing Boxes Pills */}
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-ink">Active Redaction Targets ({boxes.length}):</span>
          {boxes.length === 0 ? (
            <p className="text-xs text-muted">No visual regions currently marked for redaction.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {boxes.map((b, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border border-hairline bg-page p-2 text-xs"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="h-2 w-2 rounded-full bg-brick" />
                    <span className="font-medium text-ink truncate">{b.label}</span>
                    <span className="font-mono text-[10px] text-muted">
                      ({b.width}x{b.height}px)
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteBox(idx)}
                    className="p-1 text-brick hover:bg-card rounded transition"
                    title="Remove box"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-hairline">
        <button
          onClick={onClose}
          className="flex min-h-[44px] items-center gap-1.5 rounded-lg bg-forest px-4 py-2 font-mono text-xs font-bold text-cream hover:bg-forest/90 transition"
        >
          <Check className="h-4 w-4" />
          <span>Done Redacting ({boxes.length} targets)</span>
        </button>
      </div>
    </div>
  );
};
