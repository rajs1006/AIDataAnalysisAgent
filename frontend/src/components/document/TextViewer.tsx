import React, { useState, useEffect } from 'react';

interface TextViewerProps {
  blob: Blob;
  maxSize?: number; // in bytes, default 10MB
}

export function TextViewer({ blob, maxSize = 10 * 1024 * 1024 }: TextViewerProps) {
  const [text, setText] = useState<string>('');
  const [isFullFileLoaded, setIsFullFileLoaded] = useState(false);
  const [isLargeFile, setIsLargeFile] = useState(false);

  useEffect(() => {
    const loadText = async () => {
      // Check file size
      if (blob.size > maxSize) {
        setIsLargeFile(true);
        // Load first 1MB of content
        const slice = blob.slice(0, 1024 * 1024);
        const partialText = await slice.text();
        setText(partialText);
        return;
      }

      // Load full text for small files
      const fullText = await blob.text();
      setText(fullText);
      setIsFullFileLoaded(true);
    };

    loadText();
  }, [blob, maxSize]);

  const handleLoadFullFile = async () => {
    const fullText = await blob.text();
    setText(fullText);
    setIsFullFileLoaded(true);
  };

  return (
    <div className="p-4 bg-white rounded-md shadow-sm">
      <pre className="whitespace-pre-wrap break-words max-h-[80vh] overflow-auto">
        {text}
      </pre>
      {isLargeFile && !isFullFileLoaded && (
        <div className="mt-4 text-center">
          <p className="text-yellow-600 mb-2">
            File is larger than {maxSize / 1024 / 1024}MB. Only partial content is shown.
          </p>
          <button 
            onClick={handleLoadFullFile}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Load Full File
          </button>
        </div>
      )}
    </div>
  );
}
