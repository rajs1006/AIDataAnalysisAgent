# Frontend Integration Guide for File Hierarchy and Blob Storage

## Endpoints Overview

### 1. File Hierarchy Endpoint
- **URL**: `/api/v1/connectors/files/{connector_id}/hierarchy`
- **Method**: GET
- **Authentication**: Required (Bearer Token)

#### Request
```typescript
interface FileHierarchyRequest {
  connector_id: string;
}
```

#### Response
```typescript
interface FileNode {
  name: string;
  type: 'file' | 'directory';
  files?: string[];
  children?: Record<string, FileNode>;
}

interface FileHierarchyResponse {
  hierarchy: Record<string, FileNode>;
  total_files: number;
  total_directories: number;
}
```

#### Example Frontend Usage
```typescript
async function fetchFileHierarchy(connectorId: string) {
  try {
    const response = await axios.get<FileHierarchyResponse>(
      `/api/v1/connectors/files/${connectorId}/hierarchy`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    // Render file hierarchy
    renderFileTree(response.data.hierarchy);
  } catch (error) {
    // Handle error (e.g., connector not found, unauthorized)
    handleError(error);
  }
}
```

### 2. File Blob Retrieval Endpoint
- **URL**: `/api/v1/connectors/files/{connector_id}/blob/{file_id}`
- **Method**: GET
- **Authentication**: Required (Bearer Token)

#### Request
```typescript
interface FileBlobRequest {
  connector_id: string;
  file_id: string;
}
```

#### Response
- Raw file blob with appropriate Content-Type header
- Content-Disposition header for filename

#### Example Frontend Usage for Different File Types

```typescript
async function retrieveFileBlob(connectorId: string, fileId: string) {
  try {
    const response = await axios.get(
      `/api/v1/connectors/files/${connectorId}/blob/${fileId}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        responseType: 'blob'
      }
    );

    const contentType = response.headers['content-type'];
    const filename = extractFilenameFromHeader(response.headers);

    // Handle different file types
    switch (true) {
      case contentType.includes('pdf'):
        renderPDF(response.data);
        break;
      case contentType.includes('image'):
        displayImage(response.data);
        break;
      case contentType.includes('text'):
        displayTextFile(response.data);
        break;
      default:
        downloadFile(response.data, filename, contentType);
    }
  } catch (error) {
    // Handle errors (e.g., file not found, unauthorized)
    handleError(error);
  }
}

// PDF Rendering Example (using PDF.js)
function renderPDF(pdfBlob: Blob) {
  const pdfUrl = URL.createObjectURL(pdfBlob);
  pdfjsLib.getDocument(pdfUrl).promise.then(pdf => {
    // Render PDF pages
  });
}
```

## Error Handling

### Common Error Responses

```typescript
interface ErrorResponse {
  detail: string;
  status_code: number;
}

// Possible error scenarios
enum ErrorScenarios {
  ConnectorNotFound = 404,
  FileNotFound = 404,
  Unauthorized = 403,
  FileSizeLimitExceeded = 413,
  InternalServerError = 500
}
```

## Best Practices

1. Always handle potential errors
2. Use loading states during file retrieval
3. Implement proper authorization checks
4. Consider file size limits (50MB default)
5. Use appropriate file viewers/renderers based on content type

## Recommended Frontend Libraries
- `axios` for API requests
- `pdf.js` for PDF rendering
- `file-type` for advanced file type detection

## Performance Considerations
- Implement lazy loading for large file hierarchies
- Use caching mechanisms for frequently accessed files
- Consider pagination for extensive file lists
