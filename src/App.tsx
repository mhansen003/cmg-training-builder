import { useState } from 'react';
import './App.css';
import FileUpload from './components/FileUpload';
import EditorModal from './components/EditorModal';
import { DOCUMENT_OPTIONS } from './config/documentOptions';
import { processFiles } from './utils/fileProcessor';
import { generateTrainingDocument, enhanceTextWithAI } from './services/openai';
import { downloadAsZip, downloadSingleDocument } from './utils/zipGenerator';
import type { GeneratedDoc, DocumentType } from './types';

type AppStep = 'upload' | 'processing' | 'preview';

function App() {
  const [step, setStep] = useState<AppStep>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [manualText, setManualText] = useState<string>('');
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [selectedOutputs, setSelectedOutputs] = useState<DocumentType[]>(['release-notes', 'training-guide']);
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDoc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<Record<string, 'pending' | 'processing' | 'complete'>>({});
  const [selectedForDownload, setSelectedForDownload] = useState<Set<number>>(new Set());

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

  const handleEnhanceText = async () => {
    if (!manualText.trim()) {
      setError('Please enter some content to enhance');
      return;
    }

    setError(null);
    setIsEnhancing(true);
    setProgressMessage('Enhancing your content with AI...');

    try {
      const enhanced = await enhanceTextWithAI(manualText, (msg) => {
        setProgressMessage(msg);
      });
      setManualText(enhanced);
      setProgressMessage('✓ Content enhanced successfully!');
      setTimeout(() => setProgressMessage(''), 3000);
    } catch (err: any) {
      console.error('Error enhancing text:', err);
      setError(err.message || 'Failed to enhance content. Please try again.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    // Check if we have either files or manual text
    if (files.length === 0 && !manualText.trim()) {
      setError('Please upload files or enter content to generate documents');
      return;
    }
    if (selectedOutputs.length === 0) {
      setError('Please select at least one output type');
      return;
    }

    setError(null);
    setStep('processing');
    setProgressMessage('Processing content...');

    // Initialize progress tracking
    const initialProgress: Record<string, 'pending' | 'processing' | 'complete'> = {};
    selectedOutputs.forEach(type => {
      initialProgress[type] = 'pending';
    });
    setGenerationProgress(initialProgress);

    try {
      // Get content from either files or manual text
      let combinedContent: string;

      if (files.length > 0) {
        const { combinedContent: fileContent } = await processFiles(files);
        combinedContent = fileContent;
        setProgressMessage('Files processed. Generating documents with AI...');
      } else {
        combinedContent = manualText;
        setProgressMessage('Content ready. Generating documents with AI...');
      }

      // Generate documents one by one to track progress
      const results: Array<{ type: DocumentType; content: string; error?: string }> = [];

      for (const docType of selectedOutputs) {
        try {
          // Mark as processing
          setGenerationProgress(prev => ({ ...prev, [docType]: 'processing' }));

          const content = await generateTrainingDocument(docType, combinedContent, (msg) => {
            setProgressMessage(msg);
          });

          results.push({ type: docType, content });

          // Mark as complete
          setGenerationProgress(prev => ({ ...prev, [docType]: 'complete' }));
        } catch (err: any) {
          results.push({
            type: docType,
            content: '',
            error: err.message || 'Generation failed'
          });
          setGenerationProgress(prev => ({ ...prev, [docType]: 'complete' }));
        }
      }

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
      // Select all documents for download by default
      setSelectedForDownload(new Set(docs.map((_, idx) => idx)));
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
    setManualText('');
    setSelectedOutputs(['release-notes', 'training-guide']);
    setGeneratedDocs([]);
    setError(null);
    setProgressMessage('');
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const toggleDownloadSelection = (index: number) => {
    setSelectedForDownload(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleDownloadZip = async () => {
    try {
      if (selectedForDownload.size === 0) {
        setError('Please select at least one document to download');
        return;
      }

      setProgressMessage('Creating ZIP file...');
      const projectName = files[0]?.name.split('.')[0] || 'training-project';

      // Filter to only include selected documents
      const selectedDocs = generatedDocs.filter((_, index) => selectedForDownload.has(index));

      await downloadAsZip(selectedDocs, projectName);
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

  const handleOpenEditor = (index: number) => {
    setEditingIndex(index);
    setIsEditorOpen(true);
  };

  const handleSaveEdit = (newContent: string) => {
    if (editingIndex !== null) {
      const updatedDocs = [...generatedDocs];
      updatedDocs[editingIndex] = {
        ...updatedDocs[editingIndex],
        content: newContent,
      };
      setGeneratedDocs(updatedDocs);
      setProgressMessage('✓ Changes saved!');
      setTimeout(() => setProgressMessage(''), 3000);
    }
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
              <span>OR TYPE CONTENT DIRECTLY</span>
            </div>

            <div className="text-input-section">
              <div className="text-input-header">
                <h3>✍️ Quick Content Entry</h3>
                <p>Paste notes, bullet points, or rough content here. Use "Enhance with AI" to polish it before generating documents.</p>
              </div>

              <textarea
                className="content-textarea"
                placeholder="Enter your content here...

Examples:
• New feature launch for loan processing system
• Improved appraisal ordering workflow
• Updated pricing calculator with real-time rates
• Training session on compliance procedures
• Release of new mobile app features

Or paste meeting notes, specifications, or any content you want to transform into professional communications."
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                rows={12}
              />

              {manualText.trim() && (
                <div className="text-input-actions">
                  <button
                    className="btn-enhance"
                    onClick={handleEnhanceText}
                    disabled={isEnhancing}
                  >
                    {isEnhancing ? (
                      <>
                        <div className="spinner-small"></div>
                        Enhancing...
                      </>
                    ) : (
                      <>
                        <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        Enhance with AI
                      </>
                    )}
                  </button>
                  <button
                    className="btn-clear"
                    onClick={() => setManualText('')}
                  >
                    Clear
                  </button>
                </div>
              )}

              {progressMessage && !isEnhancing && (
                <p className="enhance-success">{progressMessage}</p>
              )}
            </div>

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
                disabled={(files.length === 0 && !manualText.trim()) || selectedOutputs.length === 0}
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

            {/* Progress Checklist */}
            <div className="progress-checklist">
              {selectedOutputs.map((docType) => {
                const option = DOCUMENT_OPTIONS.find(o => o.id === docType);
                const status = generationProgress[docType] || 'pending';

                return (
                  <div key={docType} className={`progress-item progress-${status}`}>
                    <div className="progress-icon">
                      {status === 'complete' && (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="icon-complete">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {status === 'processing' && (
                        <div className="spinner-small"></div>
                      )}
                      {status === 'pending' && (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="icon-pending">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    <span className="progress-label">{option?.label || docType}</span>
                  </div>
                );
              })}
            </div>

            {progressMessage && (
              <p style={{ marginTop: '1.5rem', color: '#9bc53d', fontWeight: 600 }}>
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
                      <div className="card-header-content">
                        <label className="download-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedForDownload.has(index)}
                            onChange={() => toggleDownloadSelection(index)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="checkbox-label-small">Include in ZIP</span>
                        </label>
                        <h3 className="card-title">{doc.filename}</h3>
                      </div>
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

                      <button
                        className="btn-card-action btn-edit"
                        onClick={() => handleOpenEditor(index)}
                        title="Edit this document"
                      >
                        <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
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
              <button
                className="btn-primary"
                onClick={handleDownloadZip}
                disabled={selectedForDownload.size === 0}
              >
                <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download {selectedForDownload.size === generatedDocs.length ? 'All' : selectedForDownload.size} as ZIP
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

      {/* WYSIWYG Editor Modal */}
      <EditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        content={editingIndex !== null ? generatedDocs[editingIndex].content : ''}
        onSave={handleSaveEdit}
        title={editingIndex !== null ? generatedDocs[editingIndex].filename : ''}
      />
    </div>
  );
}

export default App;
