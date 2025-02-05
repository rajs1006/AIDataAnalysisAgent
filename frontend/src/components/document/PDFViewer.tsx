import React, { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Info,
  ZoomIn,
  ZoomOut,
  Maximize2,
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

  if (!pdfUrl)
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-lg font-medium">Loading PDF...</div>
      </div>
    );

  if (loadError) {
    return (
      <Card className="flex items-center justify-center h-full p-8 bg-red-50">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-red-600">PDF Loading Error</h2>
          <p className="text-red-500">{loadError}</p>
          <p className="text-sm text-gray-600">
            Please try uploading the PDF again or check the file integrity.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="pdf" className="w-full h-full flex flex-col">
      {/* <TabsList className="grid w-full grid-cols-3 p-1 bg-gray-100 rounded-lg">
        <TabsTrigger value="pdf" className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          PDF View
        </TabsTrigger>
        {parsedContent && (
          <TabsTrigger value="text" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Text Content
          </TabsTrigger>
        )}
        {parsedContent?.metadata && (
          <TabsTrigger value="metadata" className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            Metadata
          </TabsTrigger>
        )}
      </TabsList> */}

      <TabsContent
        value="pdf"
        className="flex-grow relative bg-gray-50 rounded-lg mt-4"
      >
        <div className="absolute top-4 right-4 flex gap-2 bg-white px-3 py-2 rounded-full shadow-md z-10">
          <Button
            variant="outline"
            size="icon"
            onClick={zoomOut}
            className="hover:bg-gray-100"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={zoomIn}
            className="hover:bg-gray-100"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={fitToWidth}
            className="hover:bg-gray-100"
            title="Fit to Width"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="w-full h-full p-4">
          <div className="flex flex-col items-center pdf-container">
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
              <div className="shadow-lg rounded-lg overflow-hidden">
                <Page
                  pageNumber={pageNumber}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="bg-white"
                  scale={scale}
                  onLoadSuccess={onPageLoadSuccess}
                />
              </div>
            </Document>
          </div>
        </ScrollArea>

        {numPages && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-white px-4 py-2 rounded-full shadow-md">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
              disabled={pageNumber <= 1}
              className="hover:bg-gray-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              Page {pageNumber} of {numPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
              disabled={pageNumber >= numPages}
              className="hover:bg-gray-100"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </TabsContent>

      {parsedContent && (
        <TabsContent value="text" className="flex-grow mt-4">
          <ScrollArea className="w-full h-full">
            <div className="max-w-4xl mx-auto p-8 bg-white">
              <div className="prose prose-slate lg:prose-lg">
                {parsedContent.text.map((pageText, index) => (
                  <div key={index} className="mb-8">
                    <div
                      className="text-gray-800 leading-7"
                      style={{
                        fontFamily:
                          "ui-serif, Georgia, Cambria, Times New Roman, Times, serif",
                        fontSize: "1.125rem",
                        lineHeight: "1.8",
                      }}
                    >
                      {pageText.split("\n").map(
                        (paragraph, pIndex) =>
                          paragraph.trim() && (
                            <p key={pIndex} className="mb-6">
                              {paragraph}
                            </p>
                          )
                      )}
                    </div>
                    <div className="text-gray-400 text-sm mt-4 border-t pt-2">
                      Page {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      )}
    </Tabs>
  );
}
