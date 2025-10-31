import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import './FileUpload.css';

interface FileUploadProps {
  files: File[];
  onFilesSelected: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
}

function FileUpload({ files, onFilesSelected, onRemoveFile }: FileUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Add new files to existing files
    onFilesSelected([...files, ...acceptedFiles]);
  }, [files, onFilesSelected]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject
  } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/gif': ['.gif'],
      'text/csv': ['.csv'],
    },
    multiple: true,
  });

  const getDropzoneClassName = () => {
    let className = 'file-upload-zone';
    if (isDragActive) className += ' drag-active';
    if (isDragAccept) className += ' drag-accept';
    if (isDragReject) className += ' drag-reject';
    return className;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="file-upload-container">
      <div {...getRootProps()} className={getDropzoneClassName()}>
        <input {...getInputProps()} />
        <svg className="upload-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>

        {isDragActive ? (
          <div>
            {isDragAccept && <h3>Drop files here to upload</h3>}
            {isDragReject && <h3>Some files are not supported</h3>}
          </div>
        ) : (
          <div>
            <h3>Drop files here or click to browse</h3>
            <p>Supported: PDF, DOCX, TXT, Excel, Images</p>
            <p className="file-hint">You can upload multiple files at once</p>
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="file-list">
          <h3>📎 Uploaded Files ({files.length})</h3>
          <div className="file-items">
            {files.map((file, index) => (
              <div key={`${file.name}-${index}`} className="file-item">
                <div className="file-info">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{formatFileSize(file.size)}</span>
                </div>
                <button
                  className="btn-remove"
                  onClick={() => onRemoveFile(index)}
                  aria-label="Remove file"
                  type="button"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default FileUpload;
