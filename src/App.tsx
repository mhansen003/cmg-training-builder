import { useState } from 'react';
import './App.css';
import FileUpload from './components/FileUpload';
import EditorModal from './components/EditorModal';
import ADOImportModal from './components/ADOImportModal';
import { DOCUMENT_OPTIONS } from './config/documentOptions';
import { processFiles } from './utils/fileProcessor';
import { generateTrainingDocument, enhanceTextWithAI, cleanupContentWithAI, generateClarifyingQuestions, categorizeFeatures } from './services/openai';
import { downloadAsZip, downloadSingleDocument } from './utils/zipGenerator';
import type { GeneratedDoc, DocumentType } from './types';
import type { ADOWorkItem } from './services/ado';

type AppStep = 'upload' | 'wizard' | 'processing' | 'preview';

interface WizardQuestion {
  question: string;
  answer: string;
}

function App() {
  const [step, setStep] = useState<AppStep>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [manualText, setManualText] = useState<string>('');
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [selectedOutputs, setSelectedOutputs] = useState<DocumentType[]>(['release-notes', 'training-guide']);
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDoc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<Record<string, 'pending' | 'processing' | 'complete'>>({});
  const [selectedForDownload, setSelectedForDownload] = useState<Set<number>>(new Set());
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Wizard state
  const [wizardQuestions, setWizardQuestions] = useState<WizardQuestion[]>([]);
  const [sourceContent, setSourceContent] = useState<string>('');
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  // Regenerate state
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  // Add more artifacts state
  const [showAddMoreModal, setShowAddMoreModal] = useState(false);
  const [additionalOutputs, setAdditionalOutputs] = useState<DocumentType[]>([]);
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const [generatingTypes, setGeneratingTypes] = useState<DocumentType[]>([]);

  // ADO import state
  const [showADOImportModal, setShowADOImportModal] = useState(false);

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

  const handleCheckAll = () => {
    if (selectedOutputs.length === DOCUMENT_OPTIONS.length) {
      // If all are selected, unselect all
      setSelectedOutputs([]);
    } else {
      // Otherwise, select all
      setSelectedOutputs(DOCUMENT_OPTIONS.map(opt => opt.id));
    }
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
    setShowAnalysisModal(true);
    setProgressMessage('Analyzing content...');

    try {
      // Get content from either files or manual text
      let combinedContent: string;

      if (files.length > 0) {
        const { combinedContent: fileContent } = await processFiles(files);
        combinedContent = fileContent;
      } else {
        combinedContent = manualText;
      }

      // Categorize features if multiple exist
      setProgressMessage('Detecting and categorizing features...');
      const { hasMultipleFeatures, categorizedContent } = await categorizeFeatures(combinedContent);

      if (hasMultipleFeatures) {
        setProgressMessage('Multiple features detected! Organizing content...');
        // Add a small delay so user can see the message
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // Store the categorized content
      setSourceContent(categorizedContent);

      // Generate clarifying questions based on categorized content
      setProgressMessage('Generating clarifying questions...');
      const questions = await generateClarifyingQuestions(categorizedContent, selectedOutputs);

      // Close the analysis modal
      setShowAnalysisModal(false);
      setProgressMessage('');

      if (questions.length > 0) {
        // If there are questions, show the wizard
        setWizardQuestions(questions.map(q => ({ question: q, answer: '' })));
        setStep('wizard');
      } else {
        // No questions needed, proceed directly to generation
        await proceedWithGeneration(categorizedContent);
      }
    } catch (err: any) {
      console.error('Error during pre-generation:', err);
      setShowAnalysisModal(false);
      setError(err.message || 'Failed to analyze content. Please try again.');
      setProgressMessage('');
    }
  };

  const proceedWithGeneration = async (combinedContent: string) => {
    setError(null);
    setStep('processing');
    setProgressMessage('Generating documents with AI...');

    // Initialize progress tracking
    const initialProgress: Record<string, 'pending' | 'processing' | 'complete'> = {};
    selectedOutputs.forEach(type => {
      initialProgress[type] = 'pending';
    });
    setGenerationProgress(initialProgress);

    try {
      // Mark all documents as processing and generate in parallel
      const processingProgress: Record<string, 'pending' | 'processing' | 'complete'> = {};
      selectedOutputs.forEach(type => {
        processingProgress[type] = 'processing';
      });
      setGenerationProgress(processingProgress);

      // Generate all documents in parallel for faster results
      const generationPromises = selectedOutputs.map(async (docType) => {
        const startTime = Date.now();
        try {
          const content = await generateTrainingDocument(docType, combinedContent, (msg) => {
            setProgressMessage(msg);
          });

          // Mark this document as complete
          setGenerationProgress(prev => ({ ...prev, [docType]: 'complete' }));

          const duration = Date.now() - startTime;
          return { type: docType, content, generatedAt: new Date(), durationMs: duration };
        } catch (err: any) {
          // Mark as complete even on error
          setGenerationProgress(prev => ({ ...prev, [docType]: 'complete' }));

          const duration = Date.now() - startTime;
          return {
            type: docType,
            content: '',
            error: err.message || 'Generation failed',
            generatedAt: new Date(),
            durationMs: duration
          };
        }
      });

      // Wait for all documents to complete
      const results = await Promise.all(generationPromises);

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
          generatedAt: result.generatedAt,
          durationMs: result.durationMs,
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

  const handleWizardAnswerChange = (index: number, answer: string) => {
    const updatedQuestions = [...wizardQuestions];
    updatedQuestions[index].answer = answer;
    setWizardQuestions(updatedQuestions);
  };

  const handleSkipWizard = async () => {
    // Proceed with original content
    await proceedWithGeneration(sourceContent);
  };

  const handleWizardContinue = async () => {
    // Append answers to source content
    const answeredQuestions = wizardQuestions.filter(q => q.answer.trim());
    let enhancedContent = sourceContent;

    if (answeredQuestions.length > 0) {
      enhancedContent += '\n\n## Additional Context\n\n';
      answeredQuestions.forEach(q => {
        enhancedContent += `**${q.question}**\n${q.answer}\n\n`;
      });
    }

    await proceedWithGeneration(enhancedContent);
  };

  const handleReset = () => {
    setStep('upload');
    setFiles([]);
    setManualText('');
    setSelectedOutputs(['release-notes', 'training-guide']);
    setGeneratedDocs([]);
    setError(null);
    setProgressMessage('');
    setGenerationProgress({});
    setSelectedForDownload(new Set());
    setViewingIndex(null);
    setEditingIndex(null);
    setIsViewerOpen(false);
    setIsEditorOpen(false);
    setWizardQuestions([]);
    setSourceContent('');
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * Handle importing ADO work items
   * Converts ADO work item data to text format for processing
   */
  const handleADOImport = (workItems: ADOWorkItem[]) => {
    if (workItems.length === 0) return;

    if (workItems.length === 1) {
      const wi = workItems[0];
      const description = wi.fields['System.Description'] || '';
      const strippedDescription = description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

      const importedText = `Imported from ADO #${wi.id}\n\nTitle: ${wi.fields['System.Title']}\n\nDescription:\n${strippedDescription}`;
      setManualText(importedText);
    } else {
      // Multiple work items - combine
      const combinedText = workItems.map(wi => {
        const description = wi.fields['System.Description'] || '';
        const strippedDescription = description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
        return `ADO #${wi.id}: ${wi.fields['System.Title']}\n${strippedDescription}`;
      }).join('\n\n---\n\n');

      const importedText = `Imported ${workItems.length} work items from ADO:\n\n${combinedText}`;
      setManualText(importedText);
    }
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
      setToastMessage('✓ HTML copied to clipboard!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err: any) {
      setToastMessage('✗ Failed to copy to clipboard');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const getSummary = (content: string): string => {
    // Extract first 200 characters or first paragraph as summary
    const textContent = content.replace(/<[^>]*>/g, '').substring(0, 200);
    return textContent + '...';
  };

  const handleOpenViewer = (index: number) => {
    setViewingIndex(index);
    setIsViewerOpen(true);
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

  const handleAICleanup = async (content: string): Promise<string> => {
    try {
      const cleanedContent = await cleanupContentWithAI(content);
      setToastMessage('✓ Content polished with AI!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return cleanedContent;
    } catch (error: any) {
      console.error('AI cleanup failed:', error);
      setToastMessage('✗ AI cleanup failed: ' + error.message);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      throw error;
    }
  };

  const handleRegenerateArtifact = async (index: number) => {
    try {
      const doc = generatedDocs[index];
      setRegeneratingIndex(index);

      // Regenerate this specific document
      const startTime = Date.now();
      const newContent = await generateTrainingDocument(doc.type, sourceContent, (msg) => {
        console.log('Regenerating:', msg);
      });
      const duration = Date.now() - startTime;

      // Update the document in the array
      const updatedDocs = [...generatedDocs];
      updatedDocs[index] = {
        ...updatedDocs[index],
        content: newContent,
        generatedAt: new Date(),
        durationMs: duration,
      };
      setGeneratedDocs(updatedDocs);

      setToastMessage('✓ Document regenerated successfully!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error: any) {
      console.error('Regeneration failed:', error);
      setToastMessage('✗ Regeneration failed: ' + error.message);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const handleAddMoreClick = () => {
    setAdditionalOutputs([]);
    setShowAddMoreModal(true);
  };

  const handleAdditionalOutputToggle = (outputId: DocumentType) => {
    setAdditionalOutputs(prev =>
      prev.includes(outputId)
        ? prev.filter(id => id !== outputId)
        : [...prev, outputId]
    );
  };

  const getAlreadyGeneratedTypes = (): DocumentType[] => {
    return generatedDocs.map(doc => doc.type);
  };

  const getAvailableTypes = (): DocumentType[] => {
    const alreadyGenerated = getAlreadyGeneratedTypes();
    return DOCUMENT_OPTIONS.map(opt => opt.id).filter(id => !alreadyGenerated.includes(id));
  };

  const handleGenerateAdditional = async () => {
    if (additionalOutputs.length === 0) return;

    setIsGeneratingMore(true);
    setShowAddMoreModal(false);

    // Set the types we're generating to show ghost cards
    setGeneratingTypes(additionalOutputs);

    try {
      // Generate additional documents
      const generationPromises = additionalOutputs.map(async (docType) => {
        const startTime = Date.now();
        try {
          const content = await generateTrainingDocument(docType, sourceContent, (msg) => {
            setProgressMessage(msg);
          });

          const duration = Date.now() - startTime;
          return { type: docType, content, generatedAt: new Date(), durationMs: duration };
        } catch (err: any) {
          const duration = Date.now() - startTime;
          return {
            type: docType,
            content: '',
            error: err.message || 'Generation failed',
            generatedAt: new Date(),
            durationMs: duration
          };
        }
      });

      const results = await Promise.all(generationPromises);

      // Convert to GeneratedDoc format
      const newDocs: GeneratedDoc[] = results.map(result => {
        const option = DOCUMENT_OPTIONS.find(o => o.id === result.type);
        return {
          filename: option?.label || result.type,
          content: result.error
            ? `# Error generating ${option?.label}\n\n${result.error}`
            : result.content,
          type: result.type,
          format: 'markdown' as const,
          generatedAt: result.generatedAt,
          durationMs: result.durationMs,
        };
      });

      // Add new docs to existing ones
      setGeneratedDocs(prev => [...prev, ...newDocs]);

      // Select new documents for download by default
      const currentCount = generatedDocs.length;
      setSelectedForDownload(prev => {
        const newSet = new Set(prev);
        newDocs.forEach((_, idx) => newSet.add(currentCount + idx));
        return newSet;
      });

      setToastMessage(`✓ ${newDocs.length} additional document(s) generated!`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      setAdditionalOutputs([]);
    } catch (error: any) {
      console.error('Error generating additional documents:', error);
      setToastMessage('✗ Failed to generate additional documents');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setIsGeneratingMore(false);
      setProgressMessage('');
      setGeneratingTypes([]);
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
            <button
              className="btn-header-ado"
              onClick={() => setShowADOImportModal(true)}
              disabled={step !== 'upload'}
              title={step !== 'upload' ? 'Import ADO is only available on the main screen' : 'Import work items from Azure DevOps'}
            >
              <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Import ADO
            </button>
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
            <div className="two-column-layout">
              {/* Left Column: Output Selection */}
              <div className="left-column">
                <div className="output-options-sidebar">
                  <h3>📝 Select Output Types</h3>
                  <label className="checkbox-item check-all-item">
                    <input
                      type="checkbox"
                      checked={selectedOutputs.length === DOCUMENT_OPTIONS.length}
                      onChange={handleCheckAll}
                    />
                    <div className="checkbox-content">
                      <span className="checkbox-label" style={{ fontWeight: 600 }}>Check All</span>
                    </div>
                  </label>
                  <div className="checkbox-list">
                    {DOCUMENT_OPTIONS.map(option => (
                      <label key={option.id} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={selectedOutputs.includes(option.id)}
                          onChange={() => handleOutputToggle(option.id)}
                        />
                        <div className="checkbox-content">
                          <span className="checkbox-label">
                            <span className="artifact-icon">{option.icon}</span>
                            {option.label}
                          </span>
                          <span className="checkbox-description">{option.description}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Text Input and File Upload */}
              <div className="right-column">
                <div className="section-header">
                  <p>Drop documents or screen shots of your feature, describe it in text below, or click <strong>Import ADO</strong> above to import from Azure DevOps</p>
                </div>

                <textarea
                  className="content-textarea-black"
                  placeholder="Paste or type your change request details here..."
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  rows={6}
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

                <div className="divider">
                  <span>OR UPLOAD FILES</span>
                </div>

                <FileUpload
                  files={files}
                  onFilesSelected={handleFilesSelected}
                  onRemoveFile={handleRemoveFile}
                />

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
            </div>
          </div>
        )}

        {step === 'wizard' && (
          <div className="wizard-section">
            <div className="wizard-container">
              <div className="wizard-header">
                <h2>✨ Help Us Create Better Documents</h2>
                <p>We've identified a few questions that could help improve your communications. Answering these is optional—you can skip this step if you prefer.</p>
              </div>

              <div className="wizard-questions">
                {wizardQuestions.map((q, index) => (
                  <div key={index} className="wizard-question">
                    <label className="question-label">
                      <span className="question-number">{index + 1}</span>
                      <span className="question-text">{q.question}</span>
                    </label>
                    <textarea
                      className="question-input"
                      placeholder="Your answer (optional)..."
                      value={q.answer}
                      onChange={(e) => handleWizardAnswerChange(index, e.target.value)}
                      rows={3}
                    />
                  </div>
                ))}
              </div>

              <div className="wizard-actions">
                <button
                  className="btn-wizard-skip"
                  onClick={handleSkipWizard}
                >
                  Skip Questions
                </button>
                <button
                  className="btn-wizard-continue"
                  onClick={handleWizardContinue}
                >
                  <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Continue to Generate
                </button>
              </div>
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
                    <div className="progress-item-header">
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
                    {status === 'processing' && (
                      <div className="progress-bar-container">
                        <div className="progress-bar-fill"></div>
                      </div>
                    )}
                    {status === 'complete' && (
                      <div className="progress-bar-container">
                        <div className="progress-bar-fill complete"></div>
                      </div>
                    )}
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

            <div className="document-grid-view">
              {/* Grid Header */}
              <div className="grid-header">
                <div className="grid-col-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedForDownload.size === generatedDocs.length && generatedDocs.length > 0}
                    onChange={() => {
                      if (selectedForDownload.size === generatedDocs.length) {
                        setSelectedForDownload(new Set());
                      } else {
                        setSelectedForDownload(new Set(generatedDocs.map((_, idx) => idx)));
                      }
                    }}
                    title="Select all documents"
                  />
                </div>
                <div className="grid-col-document">Document</div>
                <div className="grid-col-preview">Preview</div>
                <div className="grid-col-actions">Actions</div>
                <div className="grid-col-meta">Info</div>
              </div>

              {/* Grid Body */}
              {generatedDocs.map((doc, index) => {
                const docOption = DOCUMENT_OPTIONS.find(o => o.id === doc.type);
                return (
                  <div key={index} className={`grid-row ${selectedForDownload.has(index) ? 'selected' : ''}`}>
                    {/* Regenerating Overlay */}
                    {regeneratingIndex === index && (
                      <div className="grid-row-overlay">
                        <div className="regenerating-spinner"></div>
                        <span>Regenerating...</span>
                      </div>
                    )}

                    {/* Checkbox Column */}
                    <div className="grid-col-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedForDownload.has(index)}
                        onChange={() => toggleDownloadSelection(index)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    {/* Document Column */}
                    <div className="grid-col-document">
                      <span className="doc-icon">{docOption?.icon}</span>
                      <div className="doc-info">
                        <h4 className="doc-title">{doc.filename}</h4>
                        {doc.generatedAt && (
                          <span className="doc-time">
                            {new Date(doc.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {doc.durationMs && ` • ${(doc.durationMs / 1000).toFixed(1)}s`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Preview Column */}
                    <div className="grid-col-preview">
                      <p className="preview-text">{getSummary(doc.content)}</p>
                    </div>

                    {/* Actions Column */}
                    <div className="grid-col-actions">
                      <button
                        className="btn-grid-action btn-view"
                        onClick={() => handleOpenViewer(index)}
                        title="View full content"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>

                      <button
                        className="btn-grid-action btn-edit"
                        onClick={() => handleOpenEditor(index)}
                        title="Edit document"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>

                      <button
                        className="btn-grid-action btn-copy"
                        onClick={() => handleCopyHtml(doc)}
                        title="Copy HTML"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>

                      <button
                        className="btn-grid-action btn-download"
                        onClick={() => handleDownloadSingle(doc)}
                        title="Download"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                    </div>

                    {/* Meta Column */}
                    <div className="grid-col-meta">
                      <button
                        className="btn-regenerate-compact"
                        onClick={() => handleRegenerateArtifact(index)}
                        title="Regenerate with AI"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Regenerate
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Ghost Rows for Generating Documents */}
              {generatingTypes.map((docType) => {
                const docOption = DOCUMENT_OPTIONS.find(o => o.id === docType);
                return (
                  <div key={`generating-${docType}`} className="grid-row generating">
                    <div className="grid-row-overlay">
                      <div className="regenerating-spinner"></div>
                      <span>Generating...</span>
                    </div>

                    <div className="grid-col-checkbox">
                      <input type="checkbox" checked disabled />
                    </div>

                    <div className="grid-col-document">
                      <span className="doc-icon">{docOption?.icon}</span>
                      <div className="doc-info">
                        <h4 className="doc-title">{docOption?.label || docType}</h4>
                        <span className="doc-time">⏱️ Generating...</span>
                      </div>
                    </div>

                    <div className="grid-col-preview">
                      <p className="preview-text placeholder-text">Generating content with AI...</p>
                    </div>

                    <div className="grid-col-actions">
                      <button className="btn-grid-action btn-view" disabled>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button className="btn-grid-action btn-edit" disabled>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button className="btn-grid-action btn-copy" disabled>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button className="btn-grid-action btn-download" disabled>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                    </div>

                    <div className="grid-col-meta">
                      <button className="btn-regenerate-compact" disabled>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Regenerate
                      </button>
                    </div>
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

              {getAvailableTypes().length > 0 && (
                <button
                  className="btn-add-more"
                  onClick={handleAddMoreClick}
                  disabled={isGeneratingMore}
                >
                  <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {isGeneratingMore ? 'Generating...' : 'Generate More Artifacts'}
                </button>
              )}

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

      {/* View Modal (Read-Only) */}
      <EditorModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        content={viewingIndex !== null ? generatedDocs[viewingIndex].content : ''}
        onSave={() => {}} // No-op for viewing
        title={viewingIndex !== null ? generatedDocs[viewingIndex].filename : ''}
        readOnly={true}
      />

      {/* WYSIWYG Editor Modal */}
      <EditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        content={editingIndex !== null ? generatedDocs[editingIndex].content : ''}
        onSave={handleSaveEdit}
        title={editingIndex !== null ? generatedDocs[editingIndex].filename : ''}
        onAICleanup={handleAICleanup}
      />

      {/* Analysis Modal */}
      {showAnalysisModal && (
        <div className="modal-overlay">
          <div className="analysis-modal">
            <div className="analysis-spinner"></div>
            <h2 className="analysis-title">Preparing Your Documents</h2>
            <p className="analysis-message">{progressMessage}</p>
            <div className="analysis-dots">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        </div>
      )}

      {/* Add More Artifacts Modal */}
      {showAddMoreModal && (
        <div className="modal-overlay" onClick={() => setShowAddMoreModal(false)}>
          <div className="add-more-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Generate Additional Artifacts</h2>
              <button className="modal-close" onClick={() => setShowAddMoreModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-description">
                Select the additional document types you'd like to generate from your source content:
              </p>

              <div className="output-options">
                {getAvailableTypes().map(typeId => {
                  const option = DOCUMENT_OPTIONS.find(o => o.id === typeId);
                  if (!option) return null;

                  return (
                    <label key={option.id} className="output-option">
                      <input
                        type="checkbox"
                        checked={additionalOutputs.includes(option.id)}
                        onChange={() => handleAdditionalOutputToggle(option.id)}
                      />
                      <div className="option-content">
                        <div className="option-header">
                          <span className="option-icon">{option.icon}</span>
                          <span className="option-label">{option.label}</span>
                        </div>
                        <span className="option-description">{option.description}</span>
                      </div>
                    </label>
                  );
                })}
              </div>

              {getAvailableTypes().length === 0 && (
                <p className="no-options-message">
                  ✓ All document types have been generated!
                </p>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-modal-cancel" onClick={() => setShowAddMoreModal(false)}>
                Cancel
              </button>
              <button
                className="btn-modal-generate"
                onClick={handleGenerateAdditional}
                disabled={additionalOutputs.length === 0}
              >
                <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate {additionalOutputs.length > 0 ? additionalOutputs.length : ''} Document{additionalOutputs.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADO Import Modal */}
      <ADOImportModal
        isOpen={showADOImportModal}
        onClose={() => setShowADOImportModal(false)}
        onImport={handleADOImport}
      />

      {/* Toast Notification */}
      {showToast && (
        <div className="toast">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default App;
