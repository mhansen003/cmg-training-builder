import { useState, useEffect } from 'react';
import { searchADOWorkItems, type ADOWorkItem } from '../services/ado';
import './ADOImportModal.css';

interface ADOImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (selectedWorkItems: ADOWorkItem[]) => void;
}

export default function ADOImportModal({ isOpen, onClose, onImport }: ADOImportModalProps) {
  const [searchText, setSearchText] = useState('');
  const [workItemType, setWorkItemType] = useState('User Story');
  const [state, setState] = useState('');
  const [project, setProject] = useState('All Projects');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ADOWorkItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchText('');
      setState('');
      setProject('All Projects');
      setSearchResults([]);
      setSelectedIds(new Set());
      setError(null);
      // Auto-search on open to show recent items
      handleSearch('');
    }
  }, [isOpen]);

  const handleSearch = async (searchQuery?: string) => {
    setIsSearching(true);
    setError(null);

    try {
      const query = searchQuery !== undefined ? searchQuery : searchText;

      const result = await searchADOWorkItems({
        searchText: query.trim() || undefined,
        workItemType,
        state: state || undefined,
        project,
        maxResults: 50
      });

      setSearchResults(result.workItems);

      if (result.count === 0) {
        setError('No work items found matching your search criteria');
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.response?.data?.message || 'Failed to search ADO work items. Please check your configuration.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSelection = (workItemId: number) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(workItemId)) {
      newSelection.delete(workItemId);
    } else {
      newSelection.add(workItemId);
    }
    setSelectedIds(newSelection);
  };

  const handleImport = () => {
    const selected = searchResults.filter(wi => selectedIds.has(wi.id));
    if (selected.length === 0) {
      setError('Please select at least one work item to import');
      return;
    }
    onImport(selected);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (!isOpen) return null;

  const selectedWorkItems = searchResults.filter(wi => selectedIds.has(wi.id));

  return (
    <div className="ado-modal-overlay" onClick={onClose}>
      <div className="ado-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="ado-modal-header">
          <h2>Import from Azure DevOps</h2>
          <button className="ado-modal-close" onClick={onClose} aria-label="Close modal">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="ado-modal-body">
          {/* Search and Filters */}
          <div className="ado-search-section">
            <div className="ado-search-bar">
              <input
                type="text"
                placeholder="Search work items by title..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyPress={handleKeyPress}
                className="ado-search-input"
              />
              <button
                onClick={() => handleSearch()}
                disabled={isSearching}
                className="ado-search-btn"
              >
                {isSearching ? (
                  <>
                    <div className="spinner-sm"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search
                  </>
                )}
              </button>
            </div>

            <div className="ado-filters">
              <div className="ado-filter-group">
                <label htmlFor="project">Project</label>
                <select
                  id="project"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  className="ado-filter-select"
                >
                  <option value="All Projects">All Projects</option>
                  <option value="EX Intake and Change Management">EX Intake and Change Management</option>
                  <option value="AIO Portal">AIO Portal</option>
                  <option value="Build and Lock Portal">Build and Lock Portal</option>
                  <option value="Clear">Clear</option>
                  <option value="HomeFundIt">HomeFundIt</option>
                  <option value="List and Lock">List and Lock</option>
                  <option value="Marketing Hub">Marketing Hub</option>
                  <option value="SmartApp">SmartApp</option>
                </select>
              </div>

              <div className="ado-filter-group">
                <label htmlFor="workItemType">Work Item Type</label>
                <select
                  id="workItemType"
                  value={workItemType}
                  onChange={(e) => setWorkItemType(e.target.value)}
                  className="ado-filter-select"
                >
                  <option value="User Story">User Story</option>
                  <option value="Bug">Bug</option>
                  <option value="Task">Task</option>
                  <option value="Feature">Feature</option>
                </select>
              </div>

              <div className="ado-filter-group">
                <label htmlFor="state">State</label>
                <select
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="ado-filter-select"
                >
                  <option value="">All States</option>
                  <option value="New">New</option>
                  <option value="Active">Active</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                  <option value="Removed">Removed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="ado-error-message">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Results Section */}
          <div className="ado-results-section">
            <div className="ado-results-header">
              <h3>Search Results ({searchResults.length})</h3>
              {searchResults.length > 0 && (
                <span className="ado-selected-count">
                  {selectedIds.size} selected
                </span>
              )}
            </div>

            <div className="ado-results-list">
              {isSearching ? (
                <div className="ado-loading">
                  <div className="spinner-lg"></div>
                  <p>Searching Azure DevOps...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="ado-empty-state">
                  <p>No work items found. Try adjusting your search criteria.</p>
                </div>
              ) : (
                searchResults.map((workItem) => (
                  <div
                    key={workItem.id}
                    className={`ado-work-item ${selectedIds.has(workItem.id) ? 'selected' : ''}`}
                    onClick={() => toggleSelection(workItem.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(workItem.id)}
                      onChange={() => toggleSelection(workItem.id)}
                      className="ado-work-item-checkbox"
                    />
                    <div className="ado-work-item-content">
                      <div className="ado-work-item-header">
                        <span className="ado-work-item-id">#{workItem.id}</span>
                        {workItem.fields['System.TeamProject'] && (
                          <span className="ado-work-item-project">
                            {workItem.fields['System.TeamProject']}
                          </span>
                        )}
                        <span className={`ado-work-item-state state-${workItem.fields['System.State'].toLowerCase().replace(/\s+/g, '-')}`}>
                          {workItem.fields['System.State']}
                        </span>
                      </div>
                      <h4 className="ado-work-item-title">
                        {workItem.fields['System.Title']}
                      </h4>
                      {workItem.fields['System.Tags'] && (
                        <div className="ado-work-item-tags">
                          {workItem.fields['System.Tags'].split(';').map((tag: string, idx: number) => (
                            <span key={idx} className="ado-tag">{tag.trim()}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Include List */}
          {selectedWorkItems.length > 0 && (
            <div className="ado-include-list">
              <h3>Selected for Import ({selectedWorkItems.length})</h3>
              <div className="ado-include-items">
                {selectedWorkItems.map((wi) => (
                  <div key={wi.id} className="ado-include-item">
                    <span className="ado-include-id">#{wi.id}</span>
                    <span className="ado-include-title">{wi.fields['System.Title']}</span>
                    <button
                      onClick={() => toggleSelection(wi.id)}
                      className="ado-include-remove"
                      aria-label="Remove from selection"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="ado-modal-footer">
          <button className="ado-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="ado-btn-import"
            onClick={handleImport}
            disabled={selectedIds.size === 0}
          >
            Import {selectedIds.size > 0 && `(${selectedIds.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}
