"use client";

import React from "react";
import { FileNode } from "@/lib/types/files";
// import { PDFViewer } from "./PDFViewer";
// const PDFViewer = dynamic(() => import("./PDFViewer"), {
//   ssr: false,
// });
import { ImageViewer } from "./ImageViewer";
import { TextViewer } from "./TextViewer";

import dynamic from "next/dynamic";

const PDFViewer = dynamic(
  () => import("./PDFViewer").then((mod) => mod.PDFViewer),
  { ssr: false }
);

interface FileContentRendererProps {
  blob: Blob;
  fileNode: FileNode;
}

export function FileContentRenderer({
  blob,
  fileNode,
}: FileContentRendererProps) {
  console.log("FileContentRenderer   ", fileNode);
  // Determine file type based on mime_type or extension
  const fileType =
    fileNode.extension?.toLowerCase() || blob.type.split("/")[1] || "unknown";

  console.log("FileContentRenderer - fileType:", fileType);
  console.log("FileContentRenderer - blob:", blob);
  console.log("FileContentRenderer - fileNode:", fileNode);

  // Render different components based on file type
  switch (fileType) {
    case "pdf":
    case ".pdf":
    case "application/pdf":
      return <PDFViewer blob={blob} />;

    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "webp":
      return <ImageViewer blob={blob} />;

    case "txt":
    case "md":
    case "json":
    case "csv":
    case "log":
      return <TextViewer blob={blob} />;

    default:
      return (
        <div className="p-4 text-center text-gray-500">
          Unsupported file type: {fileType}
          <div className="mt-2">
            <a
              href={URL.createObjectURL(blob)}
              download={fileNode.name}
              className="text-blue-500 hover:underline"
            >
              Download File
            </a>
          </div>
        </div>
      );
  }
}
