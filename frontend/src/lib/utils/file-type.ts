import { 
  File, 
  FileText, 
  FileSpreadsheet, 
  Presentation, 
  Image, 
  FileIcon 
} from "lucide-react";

export function detectFileType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return 'pdf';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
    case 'webp':
      return 'image';
    case 'txt':
    case 'md':
    case 'json':
    case 'csv':
    case 'log':
      return 'text';
    case 'doc':
    case 'docx':
    case 'odt':
      return 'document';
    case 'xls':
    case 'xlsx':
    case 'ods':
      return 'spreadsheet';
    case 'ppt':
    case 'pptx':
    case 'odp':
      return 'presentation';
    default:
      return 'binary';
  }
}

export function getFileIcon(type: string) {
  const iconMap = {
    'document': FileText,
    'spreadsheet': FileSpreadsheet,
    'presentation': Presentation,
    'file': File,
    'pdf': FileIcon,
    'image': Image,
    'text': FileText,
    'binary': File
  };

  return iconMap[type as keyof typeof iconMap] || File;
}
