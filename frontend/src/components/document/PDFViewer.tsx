"use client";

import React, { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PDFViewerProps {
  blob: Blob;
  parsedContent?: {
    text: string[];
    metadata?: Record<string, any>;
  };
}

export function PDFViewer({ blob, parsedContent }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    try {
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    } catch (error) {
      setLoadError(
        `Failed to process PDF: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }, [blob]);

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.1, 2));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.1, 0.5));
  const fitToWidth = () => {
    if (width) {
      const containerWidth =
        document.querySelector(".pdf-container")?.clientWidth || 800;
      setScale(containerWidth / width);
    }
  };

  const onPageLoadSuccess = ({ width: originalWidth }: { width: number }) => {
    setWidth(originalWidth);
  };

  if (!pdfUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-950 text-gray-300">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-lg">Loading PDF...</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-950">
        <Card className="bg-gray-900 border-gray-800 text-gray-100 p-8 max-w-md">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-red-500/10 rounded-full">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-red-400">PDF Loading Error</h2>
            <p className="text-gray-400">{loadError}</p>
            <p className="text-sm text-gray-500">
              Please try uploading the PDF again or check the file integrity.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-gray-950" style={{ zIndex: 1 }}>
      <ScrollArea className="flex-1 relative" style={{ zIndex: 1 }}>
        {/* Zoom Controls */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex gap-1 bg-gray-900/80 backdrop-blur-sm border border-gray-800/50 rounded-lg p-1 shadow-lg z-20">
          <Button
            variant="ghost"
            size="icon"
            onClick={zoomOut}
            className="h-8 w-8 hover:bg-gray-800 rounded text-gray-300 hover:text-gray-100"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <div className="h-8 px-3 flex items-center text-sm text-gray-300 border-l border-r border-gray-800">
            {Math.round(scale * 100)}%
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={zoomIn}
            className="h-8 w-8 hover:bg-gray-800 rounded text-gray-300 hover:text-gray-100"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={fitToWidth}
            className="h-8 w-8 hover:bg-gray-800 rounded text-gray-300 hover:text-gray-100"
            title="Fit to Width"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-col items-center pdf-container p-8">
          <Document
            file={pdfUrl}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={(error: Error) =>
              setLoadError(
                `Failed to load PDF: ${error.message || "Unknown error"}`
              )
            }
            className="flex flex-col items-center"
          >
            <div className="shadow-xl">
              <Page
                pageNumber={pageNumber}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                scale={scale}
                onLoadSuccess={onPageLoadSuccess}
                className="bg-white"
              />
            </div>
          </Document>
        </div>
      </ScrollArea>

      {/* Page Navigation */}
      {numPages && (
        <div className="flex justify-center py-8 border-t border-gray-800 bg-gray-900/30 backdrop-blur-sm">
          <div className="flex items-center gap-1 bg-gray-900/80 backdrop-blur-sm border border-gray-800/50 rounded-lg p-1 shadow-lg">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
              disabled={pageNumber <= 1}
              className="h-8 w-8 hover:bg-gray-800 rounded text-gray-300 hover:text-gray-100 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="h-8 px-3 flex items-center text-sm text-gray-300 border-l border-r border-gray-800">
              Page {pageNumber} of {numPages}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
              disabled={pageNumber >= numPages}
              className="h-8 w-8 hover:bg-gray-800 rounded text-gray-300 hover:text-gray-100 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Add these styles to your CSS
const styles = `
.react-pdf__Page__textContent {
  border: none !important;
}

.react-pdf__Page__annotations {
  border: none !important;
}
`;
