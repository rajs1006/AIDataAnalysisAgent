import React, { useState, useRef, useCallback } from 'react';
import { useDraggable } from '@/hooks/use-draggable';
import { Button } from '@/components/ui/button';
import { X, Minimize2, Maximize2, Pin, PinOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggableChatPopupProps {
  onClose: () => void;
  onPin: (isPinned: boolean) => void;
}

export const DraggableChatPopup: React.FC<DraggableChatPopupProps> = ({ 
  onClose, 
  onPin 
}) => {
  const [isPinned, setIsPinned] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  const {
    position, 
    size, 
    dragRef,
    startDrag,
    startResize
  } = useDraggable({
    initialWidth: isMaximized ? window.innerWidth * 0.8 : 300,
    initialHeight: isMaximized ? window.innerHeight * 0.8 : 400
  });

  const toggleMaximize = useCallback(() => {
    setIsMaximized(prev => !prev);
  }, []);

  const togglePin = useCallback(() => {
    const newPinnedState = !isPinned;
    setIsPinned(newPinnedState);
    onPin(newPinnedState);
  }, [isPinned, onPin]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (headerRef.current && e.target === headerRef.current) {
      startDrag(e.nativeEvent);
    }
  }, [startDrag]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    startResize(e.nativeEvent);
  }, [startResize]);

  return (
    <div 
      className={cn(
        "fixed bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out",
        isMaximized ? "w-[80%] h-[80%]" : "w-[300px] h-[400px]"
      )}
      style={{
        left: `${position.x}px`, 
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`
      }}
    >
      {/* Draggable Header */}
      <div 
        ref={headerRef}
        onMouseDown={handleMouseDown}
        className="w-full h-10 bg-gray-100 dark:bg-gray-700 rounded-t-lg flex items-center justify-between px-3 cursor-move"
      >
        <span className="text-sm font-semibold">Chat</span>
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={togglePin}
            title={isPinned ? "Unpin" : "Pin"}
          >
            {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleMaximize}
            title={isMaximized ? "Minimize" : "Maximize"}
          >
            {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            title="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chat Content */}
      <div className="p-4 overflow-auto h-[calc(100%-2.5rem)]">
        {/* Placeholder for chat content */}
        <div className="text-gray-500 dark:text-gray-400">
          Chat content goes here
        </div>
      </div>

      {/* Resize Handle */}
      <div 
        ref={resizeRef}
        onMouseDown={handleResizeMouseDown}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
      />
    </div>
  );
};
