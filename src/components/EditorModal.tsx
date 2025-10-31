import { useState, useRef, useEffect } from 'react';
import './EditorModal.css';

interface EditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  onSave: (newContent: string) => void;
  title: string;
}

export default function EditorModal({ isOpen, onClose, content, onSave, title }: EditorModalProps) {
  const [editedContent, setEditedContent] = useState(content);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditedContent(content);
  }, [content]);

  const handleSave = () => {
    const htmlContent = editorRef.current?.innerHTML || editedContent;
    onSave(htmlContent);
    onClose();
  };

  const handleCancel = () => {
    setEditedContent(content);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit {title}</h2>
          <button className="modal-close" onClick={handleCancel}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="editor-toolbar">
            <button
              onClick={() => document.execCommand('bold')}
              title="Bold"
              className="toolbar-btn"
            >
              <strong>B</strong>
            </button>
            <button
              onClick={() => document.execCommand('italic')}
              title="Italic"
              className="toolbar-btn"
            >
              <em>I</em>
            </button>
            <button
              onClick={() => document.execCommand('underline')}
              title="Underline"
              className="toolbar-btn"
            >
              <u>U</u>
            </button>
            <div className="toolbar-divider"></div>
            <button
              onClick={() => document.execCommand('formatBlock', false, 'h2')}
              title="Heading 2"
              className="toolbar-btn"
            >
              H2
            </button>
            <button
              onClick={() => document.execCommand('formatBlock', false, 'h3')}
              title="Heading 3"
              className="toolbar-btn"
            >
              H3
            </button>
            <button
              onClick={() => document.execCommand('formatBlock', false, 'p')}
              title="Paragraph"
              className="toolbar-btn"
            >
              P
            </button>
            <div className="toolbar-divider"></div>
            <button
              onClick={() => document.execCommand('insertUnorderedList')}
              title="Bullet List"
              className="toolbar-btn"
            >
              • List
            </button>
            <button
              onClick={() => document.execCommand('insertOrderedList')}
              title="Numbered List"
              className="toolbar-btn"
            >
              1. List
            </button>
          </div>

          <div
            ref={editorRef}
            className="wysiwyg-editor"
            contentEditable
            dangerouslySetInnerHTML={{ __html: editedContent }}
            onInput={(e) => setEditedContent(e.currentTarget.innerHTML)}
          />
        </div>

        <div className="modal-footer">
          <button className="btn-modal-cancel" onClick={handleCancel}>
            Cancel
          </button>
          <button className="btn-modal-save" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
