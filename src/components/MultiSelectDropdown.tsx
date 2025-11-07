import { useState, useRef, useEffect } from 'react';
import './MultiSelectDropdown.css';

interface Option {
  value: string;
  label: string;
}

interface MultiSelectDropdownProps {
  label: string;
  options: Option[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  allOptionLabel?: string;
}

export default function MultiSelectDropdown({
  label,
  options,
  selectedValues,
  onChange,
  disabled = false,
  allOptionLabel = 'All'
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAllSelected = selectedValues.length === 0 || selectedValues.includes('all');

  const handleToggleOption = (value: string) => {
    if (value === 'all') {
      onChange([]);
    } else {
      if (selectedValues.includes(value)) {
        onChange(selectedValues.filter(v => v !== value));
      } else {
        onChange([...selectedValues.filter(v => v !== 'all'), value]);
      }
    }
  };

  const handleSelectAll = () => {
    onChange([]);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const getDisplayText = () => {
    if (isAllSelected) {
      return allOptionLabel;
    }
    if (selectedValues.length === 1) {
      const option = options.find(o => o.value === selectedValues[0]);
      return option?.label || selectedValues[0];
    }
    return `${selectedValues.length} selected`;
  };

  return (
    <div className="multi-select-container" ref={dropdownRef}>
      <label className="multi-select-label">{label}</label>
      <div className={`multi-select-dropdown ${disabled ? 'disabled' : ''}`}>
        <button
          type="button"
          className="multi-select-trigger"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <span className="multi-select-value">{getDisplayText()}</span>
          <svg
            className={`multi-select-arrow ${isOpen ? 'open' : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="multi-select-menu">
            <div className="multi-select-search">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>

            <div className="multi-select-actions">
              <button
                type="button"
                onClick={handleSelectAll}
                className="multi-select-action-btn"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="multi-select-action-btn"
              >
                Clear
              </button>
            </div>

            <div className="multi-select-options">
              <div
                className={`multi-select-option ${isAllSelected ? 'selected' : ''}`}
                onClick={() => handleToggleOption('all')}
              >
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={() => handleToggleOption('all')}
                  readOnly={false}
                />
                <span>{allOptionLabel}</span>
              </div>

              {filteredOptions.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <div
                    key={option.value}
                    className={`multi-select-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleToggleOption(option.value)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleOption(option.value)}
                      readOnly={false}
                    />
                    <span>{option.label}</span>
                  </div>
                );
              })}

              {filteredOptions.length === 0 && (
                <div className="multi-select-no-results">No results found</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
