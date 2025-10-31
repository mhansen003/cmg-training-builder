import { useState, useRef, useEffect, useMemo } from 'react';
import './EditorModal.css';

interface EditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  onSave: (newContent: string) => void;
  title: string;
  readOnly?: boolean;
  onAICleanup?: (content: string) => Promise<string>;
}

export default function EditorModal({ isOpen, onClose, content, onSave, title, readOnly = false, onAICleanup }: EditorModalProps) {
  const [editedContent, setEditedContent] = useState(content);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditedContent(content);
  }, [content]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleSelectionChange = () => {
      // Debounce to prevent rapid updates during selection
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || !editorRef.current) {
          setHasSelection(false);
          return;
        }

        // Only update if the selection is within the editor
        const isWithinEditor = editorRef.current.contains(selection.anchorNode);
        if (isWithinEditor) {
          const hasText = selection.toString().trim().length > 0;
          setHasSelection(hasText);
        } else {
          setHasSelection(false);
        }
      }, 50); // Small delay to prevent interference during selection
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  // Memoize button text to prevent unnecessary re-renders
  const polishButtonText = useMemo(() => {
    return hasSelection ? 'Polish Selected Text' : 'Polish All Content';
  }, [hasSelection]);

  const handleSave = () => {
    const htmlContent = editorRef.current?.innerHTML || editedContent;
    onSave(htmlContent);
    onClose();
  };

  const handleCancel = () => {
    if (!readOnly) {
      setEditedContent(content);
    }
    onClose();
  };

  const handleAICleanup = async () => {
    if (!onAICleanup) return;

    setIsCleaningUp(true);
    try {
      const selection = window.getSelection();

      if (hasSelection && selection && selection.toString().trim().length > 0) {
        // Clean up only the selected text
        const selectedText = selection.toString();
        const cleanedText = await onAICleanup(selectedText);

        // Replace the selection with cleaned content
        const range = selection.getRangeAt(0);
        range.deleteContents();

        // Create a temporary div to parse the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cleanedText;

        // Insert the cleaned content
        const fragment = document.createDocumentFragment();
        while (tempDiv.firstChild) {
          fragment.appendChild(tempDiv.firstChild);
        }
        range.insertNode(fragment);

        // Update the edited content
        if (editorRef.current) {
          setEditedContent(editorRef.current.innerHTML);
        }
      } else {
        // Clean up all content
        const currentContent = editorRef.current?.innerHTML || editedContent;
        const cleanedContent = await onAICleanup(currentContent);
        setEditedContent(cleanedContent);
        if (editorRef.current) {
          editorRef.current.innerHTML = cleanedContent;
        }
      }
    } catch (error) {
      console.error('AI cleanup failed:', error);
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleInsertImage = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      document.execCommand('insertImage', false, url);
    }
  };

  const handleInsertLink = () => {
    const url = prompt('Enter link URL:');
    if (url) {
      document.execCommand('createLink', false, url);
    }
  };

  const handleTextColor = () => {
    const color = prompt('Enter color (e.g., #FF0000 or red):');
    if (color) {
      document.execCommand('foreColor', false, color);
    }
  };

  const handleHighlight = () => {
    const color = prompt('Enter highlight color (e.g., #FFFF00 or yellow):');
    if (color) {
      document.execCommand('hiliteColor', false, color);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{readOnly ? 'View' : 'Edit'} {title}</h2>
          <button className="modal-close" onClick={handleCancel}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {!readOnly && (
            <>
              {/* AI Cleanup Button */}
              {onAICleanup && (
                <div className="ai-cleanup-bar">
                  <button
                    onClick={handleAICleanup}
                    disabled={isCleaningUp}
                    className="btn-ai-cleanup"
                    title="Clean up and improve this content with AI"
                  >
                    {isCleaningUp ? (
                      <>
                        <div className="spinner-tiny"></div>
                        Polishing with AI...
                      </>
                    ) : (
                      <>
                        <svg className="btn-icon-sm" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        ✨ {polishButtonText}
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Main Toolbar */}
              <div className="editor-toolbar">
                {/* Text Formatting */}
                <button onClick={() => document.execCommand('bold')} title="Bold" className="toolbar-btn">
                  <strong>B</strong>
                </button>
                <button onClick={() => document.execCommand('italic')} title="Italic" className="toolbar-btn">
                  <em>I</em>
                </button>
                <button onClick={() => document.execCommand('underline')} title="Underline" className="toolbar-btn">
                  <u>U</u>
                </button>
                <div className="toolbar-divider"></div>

                {/* Headings */}
                <button onClick={() => document.execCommand('formatBlock', false, 'h2')} title="Heading 2" className="toolbar-btn">
                  H2
                </button>
                <button onClick={() => document.execCommand('formatBlock', false, 'h3')} title="Heading 3" className="toolbar-btn">
                  H3
                </button>
                <button onClick={() => document.execCommand('formatBlock', false, 'p')} title="Paragraph" className="toolbar-btn">
                  P
                </button>
                <div className="toolbar-divider"></div>

                {/* Lists */}
                <button onClick={() => document.execCommand('insertUnorderedList')} title="Bullet List" className="toolbar-btn">
                  • List
                </button>
                <button onClick={() => document.execCommand('insertOrderedList')} title="Numbered List" className="toolbar-btn">
                  1. List
                </button>
                <div className="toolbar-divider"></div>

                {/* Alignment */}
                <button onClick={() => document.execCommand('justifyLeft')} title="Align Left" className="toolbar-btn">
                  ⇤
                </button>
                <button onClick={() => document.execCommand('justifyCenter')} title="Center" className="toolbar-btn">
                  ⇥⇤
                </button>
                <button onClick={() => document.execCommand('justifyRight')} title="Align Right" className="toolbar-btn">
                  ⇥
                </button>
                <div className="toolbar-divider"></div>

                {/* Colors & Styling */}
                <button onClick={handleTextColor} title="Text Color" className="toolbar-btn">
                  🎨
                </button>
                <button onClick={handleHighlight} title="Highlight" className="toolbar-btn">
                  🖍️
                </button>
                <div className="toolbar-divider"></div>

                {/* Insert */}
                <button onClick={handleInsertLink} title="Insert Link" className="toolbar-btn">
                  🔗
                </button>
                <button onClick={handleInsertImage} title="Insert Image" className="toolbar-btn">
                  🖼️
                </button>
              </div>
            </>
          )}

          <div
            ref={editorRef}
            className="wysiwyg-editor"
            contentEditable={!readOnly}
            dangerouslySetInnerHTML={{ __html: editedContent }}
            onInput={(e) => !readOnly && setEditedContent(e.currentTarget.innerHTML)}
            style={readOnly ? { cursor: 'default' } : {}}
          />
        </div>

        {!readOnly && (
          <div className="modal-footer">
            <button className="btn-modal-cancel" onClick={handleCancel}>
              Cancel
            </button>
            <button className="btn-modal-save" onClick={handleSave}>
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
