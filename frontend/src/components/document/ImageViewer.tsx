import React from 'react';

interface ImageViewerProps {
  blob: Blob;
}

export function ImageViewer({ blob }: ImageViewerProps) {
  const imageUrl = URL.createObjectURL(blob);

  return (
    <div className="flex justify-center items-center p-4">
      <img 
        src={imageUrl} 
        alt="File preview" 
        className="max-w-full max-h-[80vh] object-contain"
        onLoad={() => URL.revokeObjectURL(imageUrl)}
      />
    </div>
  );
}
