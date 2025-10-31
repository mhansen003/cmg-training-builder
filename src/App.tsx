import { useState } from 'react';
import './App.css';
import FileUpload from './components/FileUpload';
import { DOCUMENT_OPTIONS } from './config/documentOptions';
import { processFiles } from './utils/fileProcessor';
import { generateMultipleDocuments } from './services/openai';
import { downloadAsZip, downloadSingleDocument } from './utils/zipGenerator';
import type { GeneratedDoc, DocumentType } from './types';

type AppStep = 'upload' | 'processing' | 'preview';

function App() {
  const [step, setStep] = useState<AppStep>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [selectedOutputs, setSelectedOutputs] = useState<DocumentType[]>(['release-notes', 'training-guide']);
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDoc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  const handleFilesSelected = (newFiles: File[]) => {
    setFiles(newFiles);
    setError(null);
  };

  const handleOutputToggle = (outputId: DocumentType) => {
    setSelectedOutputs(prev =>
      prev.includes(outputId)
        ? prev.filter(id => id !== outputId)
        : [...prev, outputId]
    );
  };

  const handleGenerate = async () => {
    if (files.length === 0) {
      setError('Please upload at least one file');
      return;
    }
    if (selectedOutputs.length === 0) {
      setError('Please select at least one output type');
      return;
    }

    setError(null);
    setStep('processing');
    setProgressMessage('Processing uploaded files...');

    try {
      // Process files to extract content
      const { combinedContent } = await processFiles(files);
      setProgressMessage('Files processed. Generating documents with AI...');

      // Generate documents using OpenAI
      const results = await generateMultipleDocuments(
        selectedOutputs,
        combinedContent,
        (msg) => setProgressMessage(msg)
      );

      // Convert results to GeneratedDoc format
      const docs: GeneratedDoc[] = results.map(result => {
        const option = DOCUMENT_OPTIONS.find(o => o.id === result.type);
        return {
          filename: option?.label || result.type,
          content: result.error
            ? `# Error generating ${option?.label}\n\n${result.error}`
            : result.content,
          type: result.type,
          format: 'markdown' as const,
        };
      });

      setGeneratedDocs(docs);
      setProgressMessage('✓ All documents generated successfully!');
      setStep('preview');
    } catch (err: any) {
      console.error('Error generating documents:', err);
      setError(err.message || 'Failed to generate documents. Please try again.');
      setStep('upload');
    }
  };

  const handleReset = () => {
    setStep('upload');
    setFiles([]);
    setSelectedOutputs(['release-notes', 'training-guide']);
    setGeneratedDocs([]);
    setError(null);
    setProgressMessage('');
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDownloadZip = async () => {
    try {
      setProgressMessage('Creating ZIP file...');
      const projectName = files[0]?.name.split('.')[0] || 'training-project';
      await downloadAsZip(generatedDocs, projectName);
      setProgressMessage('✓ ZIP file downloaded!');
    } catch (err: any) {
      setError(err.message || 'Failed to download ZIP file');
    }
  };

  const handleDownloadSingle = (doc: GeneratedDoc) => {
    try {
      downloadSingleDocument(doc);
    } catch (err: any) {
      setError(err.message || 'Failed to download document');
    }
  };

  const handleCopyHtml = async (doc: GeneratedDoc) => {
    try {
      await navigator.clipboard.writeText(doc.content);
      setProgressMessage('✓ HTML copied to clipboard!');
      setTimeout(() => setProgressMessage(''), 3000);
    } catch (err: any) {
      setError('Failed to copy to clipboard');
    }
  };

  const toggleCardExpand = (index: number) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const getSummary = (content: string): string => {
    // Extract first 200 characters or first paragraph as summary
    const textContent = content.replace(/<[^>]*>/g, '').substring(0, 200);
    return textContent + '...';
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-container">
          <div className="header-left">
            <div className="logo">
              <span className="logo-cmg">CMG</span>
              <span className="logo-financial">FINANCIAL</span>
            </div>
            <div className="header-divider"></div>
            <h1 className="header-title">Communications Builder</h1>
          </div>
          <div className="header-right">
            <button className="btn-header" onClick={handleReset}>
              <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Project
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {error && (
          <div className="alert alert-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {step === 'upload' && (
          <div className="upload-section">
            <div className="section-header">
              <h2>Create Communications with AI</h2>
              <p>
                Upload your documents, transcripts, or specifications, and let AI generate
                professional communications automatically.
              </p>
            </div>

            <FileUpload
              files={files}
              onFilesSelected={handleFilesSelected}
              onRemoveFile={handleRemoveFile}
            />

            <div className="divider">
              <span>SELECT OUTPUT TYPES</span>
            </div>

            <div className="output-options">
              <h3>📝 Communications to Generate</h3>
              <div className="checkbox-grid">
                {DOCUMENT_OPTIONS.map(option => (
                  <label key={option.id} className="checkbox-card">
                    <input
                      type="checkbox"
                      checked={selectedOutputs.includes(option.id)}
                      onChange={() => handleOutputToggle(option.id)}
                    />
                    <div className="checkbox-content">
                      <span className="checkbox-label">{option.label}</span>
                      <span className="checkbox-description">{option.description}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="action-container">
              <button
                className="btn-generate"
                onClick={handleGenerate}
                disabled={files.length === 0 || selectedOutputs.length === 0}
              >
                <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate Communications with AI
              </button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="processing-section">
            <div className="spinner"></div>
            <h2>Generating Your Communications...</h2>
            <p>Our AI is analyzing your content and creating professional communications.</p>
            {progressMessage && (
              <p style={{ marginTop: '1rem', color: '#9bc53d', fontWeight: 600 }}>
                {progressMessage}
              </p>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="preview-section">
            <div className="section-header">
              <h2>✓ Documents Generated Successfully!</h2>
              <p>Review your generated communications below.</p>
            </div>

            <div className="document-grid">
              {generatedDocs.map((doc, index) => {
                const isExpanded = expandedCards.has(index);
                const isHtml = /<[a-z][\s\S]*>/i.test(doc.content);

                return (
                  <div key={index} className="document-card-modern">
                    {/* Card Header */}
                    <div className="card-header">
                      <h3 className="card-title">{doc.filename}</h3>
                    </div>

                    {/* Card Summary */}
                    <div className="card-summary">
                      <p>{getSummary(doc.content)}</p>
                    </div>

                    {/* Card Actions */}
                    <div className="card-actions">
                      <button
                        className="btn-card-action btn-expand"
                        onClick={() => toggleCardExpand(index)}
                        title={isExpanded ? "Collapse" : "Expand to view full content"}
                      >
                        <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          {isExpanded ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          )}
                        </svg>
                        {isExpanded ? 'Collapse' : 'Expand'}
                      </button>

                      {isHtml && (
                        <button
                          className="btn-card-action btn-copy"
                          onClick={() => handleCopyHtml(doc)}
                          title="Copy HTML to clipboard"
                        >
                          <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy HTML
                        </button>
                      )}

                      <button
                        className="btn-card-action btn-download-primary"
                        onClick={() => handleDownloadSingle(doc)}
                        title="Download this document"
                      >
                        <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download
                      </button>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="card-expanded-content">
                        {isHtml ? (
                          <div
                            className="html-content"
                            dangerouslySetInnerHTML={{ __html: doc.content }}
                          />
                        ) : (
                          <pre className="text-content">{doc.content}</pre>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {progressMessage && (
              <p style={{ textAlign: 'center', color: '#9bc53d', fontWeight: 600, marginBottom: '1rem' }}>
                {progressMessage}
              </p>
            )}

            <div className="action-container">
              <button className="btn-primary" onClick={handleDownloadZip}>
                <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download All as ZIP
              </button>
              <button className="btn-secondary" onClick={handleReset}>
                Create New Project
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-section">
            <div className="footer-logo">
              <span className="logo-cmg">CMG</span>
              <span className="logo-financial">FINANCIAL</span>
            </div>
            <p style={{ fontSize: '0.85rem', lineHeight: '1.6', marginTop: '0.5rem' }}>
              Communications Builder
              <br />
              Powered by AI
            </p>
          </div>

          <div className="footer-section">
            <h4>Resources</h4>
            <ul>
              <li><a href="https://www.cmgfi.com" target="_blank" rel="noopener noreferrer">CMG Financial</a></li>
              <li><a href="https://www.cmgfi.com/about" target="_blank" rel="noopener noreferrer">About Us</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Technology</h4>
            <ul>
              <li><a href="https://openai.com" target="_blank" rel="noopener noreferrer">Powered by OpenAI GPT-4</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} CMG Financial. All rights reserved. | NMLS# 1820</p>
          <p style={{ marginTop: '0.5rem' }}>
            AI-powered Communications Builder
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
