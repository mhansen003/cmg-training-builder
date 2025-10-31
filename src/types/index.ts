export interface GeneratedDoc {
  filename: string;
  content: string;
  type: DocumentType;
  format: 'markdown' | 'html' | 'txt';
}

export type DocumentType =
  | 'release-notes'
  | 'training-guide'
  | 'email'
  | 'quick-ref'
  | 'faq'
  | 'manual';

export interface DocumentOption {
  id: DocumentType;
  label: string;
  description: string;
  prompt: string;
}

export interface FileContent {
  filename: string;
  content: string;
  type: string;
  size: number;
}
