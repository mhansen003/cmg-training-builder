import type { FileContent } from '../types';

/**
 * Reads and extracts text content from various file types
 */
export async function processFile(file: File): Promise<FileContent> {
  const fileType = file.type || getFileTypeFromName(file.name);

  try {
    let content = '';

    // Text files
    if (fileType.includes('text') || file.name.endsWith('.txt')) {
      content = await readTextFile(file);
    }
    // PDF files (basic text extraction - in real app would use pdf.js)
    else if (fileType.includes('pdf') || file.name.endsWith('.pdf')) {
      content = `[PDF Document: ${file.name}]\n\nNote: PDF text extraction requires pdf.js library. For this MVP, please copy and paste the PDF content or upload as .txt file.`;
    }
    // Word documents
    else if (fileType.includes('word') ||
             fileType.includes('document') ||
             file.name.endsWith('.docx') ||
             file.name.endsWith('.doc')) {
      content = `[Word Document: ${file.name}]\n\nNote: Word document extraction requires mammoth.js library. For this MVP, please copy and paste the document content or upload as .txt file.`;
    }
    // Excel files
    else if (fileType.includes('spreadsheet') ||
             fileType.includes('excel') ||
             file.name.endsWith('.xlsx') ||
             file.name.endsWith('.xls')) {
      content = `[Excel Spreadsheet: ${file.name}]\n\nNote: Excel extraction requires xlsx library. For this MVP, please copy and paste the spreadsheet content or upload as .txt/.csv file.`;
    }
    // Images
    else if (fileType.includes('image')) {
      content = `[Image: ${file.name}]\n\nNote: OCR for images requires additional libraries. Please provide a text description of the image content.`;
    }
    // Fallback - try to read as text
    else {
      content = await readTextFile(file);
    }

    return {
      filename: file.name,
      content,
      type: fileType,
      size: file.size,
    };
  } catch (error) {
    console.error(`Error processing file ${file.name}:`, error);
    return {
      filename: file.name,
      content: `Error reading file: ${file.name}`,
      type: fileType,
      size: file.size,
    };
  }
}

/**
 * Reads a file as text
 */
function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve(text || '');
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Gets file type from filename extension
 */
function getFileTypeFromName(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const typeMap: Record<string, string> = {
    txt: 'text/plain',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
  };
  return typeMap[ext || ''] || 'application/octet-stream';
}

/**
 * Processes multiple files and combines their content
 */
export async function processFiles(files: File[]): Promise<{
  combinedContent: string;
  fileContents: FileContent[];
}> {
  const fileContents = await Promise.all(files.map(processFile));

  const combinedContent = fileContents
    .map(fc => `=== ${fc.filename} ===\n\n${fc.content}\n\n`)
    .join('\n---\n\n');

  return {
    combinedContent,
    fileContents,
  };
}
