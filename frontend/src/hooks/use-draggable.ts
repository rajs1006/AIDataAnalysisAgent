import { useState, useRef, useCallback, useEffect } from 'react';

interface DraggableOptions {
  initialX?: number;
  initialY?: number;
  initialWidth?: number;
  initialHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export const useDraggable = ({
  initialX = 0,
  initialY = 0,
  initialWidth = 300,
  initialHeight = 400,
  minWidth = 200,
  minHeight = 200,
  maxWidth = window.innerWidth * 0.8,
  maxHeight = window.innerHeight * 0.8
}: DraggableOptions = {}) => {
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  const startDrag = useCallback((e: MouseEvent) => {
    if (dragRef.current && e.target === dragRef.current) {
      setIsDragging(true);
      // Prevent text selection during drag
      e.preventDefault();
    }
  }, []);

  const startResize = useCallback((e: MouseEvent) => {
    if (resizeRef.current && e.target === resizeRef.current) {
      setIsResizing(true);
      e.preventDefault();
    }
  }, []);

  const stopDrag = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  const drag = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition(prev => ({
        x: Math.max(0, Math.min(prev.x + e.movementX, window.innerWidth - size.width)),
        y: Math.max(0, Math.min(prev.y + e.movementY, window.innerHeight - size.height))
      }));
    }
    
    if (isResizing) {
      setSize(prev => ({
        width: Math.max(minWidth, Math.min(prev.width + e.movementX, maxWidth)),
        height: Math.max(minHeight, Math.min(prev.height + e.movementY, maxHeight))
      }));
    }
  }, [isDragging, isResizing, size, minWidth, minHeight, maxWidth, maxHeight]);

  useEffect(() => {
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);

    return () => {
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('mouseup', stopDrag);
    };
  }, [drag, stopDrag]);

  return {
    position,
    size,
    isDragging,
    isResizing,
    dragRef,
    resizeRef,
    startDrag,
    startResize
  };
};
