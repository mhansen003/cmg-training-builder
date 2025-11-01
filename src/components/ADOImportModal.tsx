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
  const [workItemType, setWorkItemType] = useState('All Types');
  const [state, setState] = useState('');
  const [project, setProject] = useState('All Projects');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ADOWorkItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // New advanced filters
  const [iterationPath, setIterationPath] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [createdDateFrom, setCreatedDateFrom] = useState('');
  const [createdDateTo, setCreatedDateTo] = useState('');
  const [changedDateFrom, setChangedDateFrom] = useState('');
  const [changedDateTo, setChangedDateTo] = useState('');

  // View modal state
  const [viewingWorkItem, setViewingWorkItem] = useState<ADOWorkItem | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchText('');
      setWorkItemType('All Types');
      setState('');
      setProject('All Projects');
      setIterationPath('');
      setAssignedTo('');
      setCreatedBy('');
      setCreatedDateFrom('');
      setCreatedDateTo('');
      setChangedDateFrom('');
      setChangedDateTo('');
      setSearchResults([]);
      setSelectedIds(new Set());
      setError(null);
      // Don't auto-search - wait for user to click Search button
    }
  }, [isOpen]);

  const handleSearch = async (searchQuery?: string) => {
    setIsSearching(true);
    setError(null);

    try {
      const query = searchQuery !== undefined ? searchQuery : searchText;

      const result = await searchADOWorkItems({
        searchText: query.trim() || undefined,
        workItemType: workItemType === 'All Types' ? undefined : workItemType,
        state: state || undefined,
        project,
        iterationPath: iterationPath || undefined,
        assignedTo: assignedTo || undefined,
        createdBy: createdBy || undefined,
        createdDateFrom: createdDateFrom || undefined,
        createdDateTo: createdDateTo || undefined,
        changedDateFrom: changedDateFrom || undefined,
        changedDateTo: changedDateTo || undefined,
        maxResults: 50
      });

      setSearchResults(result.workItems);

      if (result.count === 0) {
        setError('No work items found matching your search criteria');
      }
    } catch (err: any) {
      console.error('Search error:', err);
      console.error('Response data:', err.response?.data);

      // Show detailed error message
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to search ADO work items';
      const errorDetails = err.response?.data?.details;

      if (errorDetails) {
        console.error('Error details:', errorDetails);
        setError(`${errorMessage}\n\nDetails: ${JSON.stringify(errorDetails, null, 2)}`);
      } else {
        setError(errorMessage);
      }

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
                placeholder="Search work items by title (optional - leave empty to see all)..."
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

            <p className="ado-search-hint">
              💡 No filters? We'll show work items changed in the last 12 months across all projects
            </p>

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
                  <option value="All Types">All Types</option>
                  <option value="User Story">User Story</option>
                  <option value="Bug">Bug</option>
                  <option value="Task">Task</option>
                  <option value="Feature">Feature</option>
                  <option value="Epic">Epic</option>
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

              <div className="ado-filter-group">
                <label htmlFor="iterationPath">Sprint/Iteration</label>
                <input
                  id="iterationPath"
                  type="text"
                  value={iterationPath}
                  onChange={(e) => setIterationPath(e.target.value)}
                  placeholder="e.g., Sprint 23"
                  className="ado-filter-select"
                />
              </div>
            </div>

            <div className="ado-filters-row-2">
              <div className="ado-filter-group">
                <label htmlFor="assignedTo">Assigned To</label>
                <input
                  id="assignedTo"
                  type="text"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="Name or email"
                  className="ado-filter-select"
                />
              </div>

              <div className="ado-filter-group">
                <label htmlFor="createdBy">Created By</label>
                <input
                  id="createdBy"
                  type="text"
                  value={createdBy}
                  onChange={(e) => setCreatedBy(e.target.value)}
                  placeholder="Name or email"
                  className="ado-filter-select"
                />
              </div>

              <div className="ado-filter-group">
                <label htmlFor="createdDateFrom">Created Date From</label>
                <input
                  id="createdDateFrom"
                  type="date"
                  value={createdDateFrom}
                  onChange={(e) => setCreatedDateFrom(e.target.value)}
                  className="ado-filter-select"
                />
              </div>
            </div>

            <div className="ado-filters-row-2">
              <div className="ado-filter-group">
                <label htmlFor="createdDateTo">Created Date To</label>
                <input
                  id="createdDateTo"
                  type="date"
                  value={createdDateTo}
                  onChange={(e) => setCreatedDateTo(e.target.value)}
                  className="ado-filter-select"
                />
              </div>

              <div className="ado-filter-group">
                <label htmlFor="changedDateFrom">Changed Date From</label>
                <input
                  id="changedDateFrom"
                  type="date"
                  value={changedDateFrom}
                  onChange={(e) => setChangedDateFrom(e.target.value)}
                  className="ado-filter-select"
                />
              </div>

              <div className="ado-filter-group">
                <label htmlFor="changedDateTo">Changed Date To</label>
                <input
                  id="changedDateTo"
                  type="date"
                  value={changedDateTo}
                  onChange={(e) => setChangedDateTo(e.target.value)}
                  className="ado-filter-select"
                />
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
                searchResults.map((workItem) => {
                  const description = workItem.fields['System.Description'] || '';
                  const strippedDescription = description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
                  const descriptionPreview = strippedDescription.length > 150
                    ? strippedDescription.substring(0, 150) + '...'
                    : strippedDescription;

                  return (
                    <div
                      key={workItem.id}
                      className={`ado-work-item ${selectedIds.has(workItem.id) ? 'selected' : ''}`}
                    >
                      <div className="ado-work-item-header-row">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(workItem.id)}
                          onChange={() => toggleSelection(workItem.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="ado-work-item-checkbox"
                        />
                        <button
                          className="ado-work-item-view-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingWorkItem(workItem);
                          }}
                          title="View full details"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </div>
                      <div
                        className="ado-work-item-content"
                        onClick={() => toggleSelection(workItem.id)}
                      >
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
                          {workItem.fields['System.IterationPath'] && (
                            <span className="ado-work-item-iteration">
                              📅 {workItem.fields['System.IterationPath'].split('\\').pop()}
                            </span>
                          )}
                        </div>
                        <h4 className="ado-work-item-title">
                          {workItem.fields['System.Title']}
                        </h4>
                        {descriptionPreview && (
                          <p className="ado-work-item-description">
                            {descriptionPreview}
                          </p>
                        )}
                        {workItem.fields['System.Tags'] && (
                          <div className="ado-work-item-tags">
                            {workItem.fields['System.Tags'].split(';').map((tag: string, idx: number) => (
                              <span key={idx} className="ado-tag">{tag.trim()}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
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

      {/* View Work Item Modal */}
      {viewingWorkItem && (
        <div className="ado-view-modal-overlay" onClick={() => setViewingWorkItem(null)}>
          <div className="ado-view-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="ado-view-modal-header">
              <div>
                <h2>Work Item #{viewingWorkItem.id}</h2>
                <p className="ado-view-modal-type">{viewingWorkItem.fields['System.WorkItemType']}</p>
              </div>
              <button className="ado-modal-close" onClick={() => setViewingWorkItem(null)} aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="ado-view-modal-body">
              <div className="ado-view-field">
                <label>Title</label>
                <div className="ado-view-value">{viewingWorkItem.fields['System.Title']}</div>
              </div>

              {viewingWorkItem.fields['System.Description'] && (
                <div className="ado-view-field">
                  <label>Description</label>
                  <div
                    className="ado-view-value ado-view-html"
                    dangerouslySetInnerHTML={{ __html: viewingWorkItem.fields['System.Description'] }}
                  />
                </div>
              )}

              <div className="ado-view-field-grid">
                {viewingWorkItem.fields['System.TeamProject'] && (
                  <div className="ado-view-field">
                    <label>Project</label>
                    <div className="ado-view-value">{viewingWorkItem.fields['System.TeamProject']}</div>
                  </div>
                )}

                <div className="ado-view-field">
                  <label>State</label>
                  <div className="ado-view-value">
                    <span className={`ado-work-item-state state-${viewingWorkItem.fields['System.State'].toLowerCase().replace(/\s+/g, '-')}`}>
                      {viewingWorkItem.fields['System.State']}
                    </span>
                  </div>
                </div>

                {viewingWorkItem.fields['System.IterationPath'] && (
                  <div className="ado-view-field">
                    <label>Iteration</label>
                    <div className="ado-view-value">{viewingWorkItem.fields['System.IterationPath']}</div>
                  </div>
                )}

                {viewingWorkItem.fields['System.AreaPath'] && (
                  <div className="ado-view-field">
                    <label>Area Path</label>
                    <div className="ado-view-value">{viewingWorkItem.fields['System.AreaPath']}</div>
                  </div>
                )}

                {viewingWorkItem.fields['System.CreatedDate'] && (
                  <div className="ado-view-field">
                    <label>Created Date</label>
                    <div className="ado-view-value">
                      {new Date(viewingWorkItem.fields['System.CreatedDate']).toLocaleString()}
                    </div>
                  </div>
                )}

                {viewingWorkItem.fields['System.ChangedDate'] && (
                  <div className="ado-view-field">
                    <label>Changed Date</label>
                    <div className="ado-view-value">
                      {new Date(viewingWorkItem.fields['System.ChangedDate']).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              {viewingWorkItem.fields['System.Tags'] && (
                <div className="ado-view-field">
                  <label>Tags</label>
                  <div className="ado-work-item-tags">
                    {viewingWorkItem.fields['System.Tags'].split(';').map((tag: string, idx: number) => (
                      <span key={idx} className="ado-tag">{tag.trim()}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="ado-view-field">
                <label>ADO Link</label>
                <div className="ado-view-value">
                  <a href={viewingWorkItem.url} target="_blank" rel="noopener noreferrer" className="ado-view-link">
                    Open in Azure DevOps ↗
                  </a>
                </div>
              </div>
            </div>

            <div className="ado-view-modal-footer">
              <button className="ado-btn-cancel" onClick={() => setViewingWorkItem(null)}>
                Close
              </button>
              <button
                className="ado-btn-import"
                onClick={() => {
                  toggleSelection(viewingWorkItem.id);
                  setViewingWorkItem(null);
                }}
              >
                {selectedIds.has(viewingWorkItem.id) ? 'Remove from Selection' : 'Add to Selection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
