import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

function FilterModal({ isOpen, onClose, filters, onFiltersChange, vendors }) {
  const [localFilters, setLocalFilters] = useState({
    year: '',
    major: '',
    needsVisa: false,
    flaggedOnly: false
  });

  // Extract unique majors from all vendors
  const allMajors = React.useMemo(() => {
    const majorsSet = new Set();
    vendors.forEach(vendor => {
      if (vendor.MajorsHired && Array.isArray(vendor.MajorsHired)) {
        vendor.MajorsHired.forEach(major => {
          if (major && major.trim()) {
            majorsSet.add(major.trim());
          }
        });
      }
    });
    return Array.from(majorsSet).sort();
  }, [vendors]);

  // Extract unique years from all vendors
  const allYears = React.useMemo(() => {
    const yearsSet = new Set();
    vendors.forEach(vendor => {
      if (vendor.YearsHired && Array.isArray(vendor.YearsHired)) {
        vendor.YearsHired.forEach(year => {
          if (year && year.trim()) {
            yearsSet.add(year.trim());
          }
        });
      }
    });
    return Array.from(yearsSet).sort();
  }, [vendors]);

  // Initialize local filters when modal opens or filters prop changes
  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters);
    }
  }, [isOpen, filters]);

  function handleApplyFilters() {
    onFiltersChange(localFilters);
    onClose();
  }

  function handleClearFilters() {
    const clearedFilters = {
      year: '',
      major: '',
      needsVisa: false,
      flaggedOnly: false
    };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  }

  function getActiveFilterCount() {
    let count = 0;
    if (filters.year) count++;
    if (filters.major) count++;
    if (filters.needsVisa) count++;
    if (filters.flaggedOnly) count++;
    return count;
  }

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl sm:text-2xl font-bold">Filter Companies</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-3xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Year Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Year
            </label>
            <select
              value={localFilters.year}
              onChange={(e) => setLocalFilters({ ...localFilters, year: e.target.value })}
              className="w-full p-2 border rounded text-sm sm:text-base"
            >
              <option value="">All Years</option>
              {allYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Major Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Major
            </label>
            <select
              value={localFilters.major}
              onChange={(e) => setLocalFilters({ ...localFilters, major: e.target.value })}
              className="w-full p-2 border rounded text-sm sm:text-base"
            >
              <option value="">All Majors</option>
              {allMajors.map(major => (
                <option key={major} value={major}>{major}</option>
              ))}
            </select>
          </div>

          {/* Visa Sponsorship Filter */}
          <div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={localFilters.needsVisa}
                onChange={(e) => setLocalFilters({ ...localFilters, needsVisa: e.target.checked })}
                className="mr-3 w-4 h-4"
              />
              <span className="text-sm sm:text-base">
                Only show companies that sponsor H1B visas
              </span>
            </label>
          </div>

          {/* Flagged Companies Filter */}
          <div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={localFilters.flaggedOnly}
                onChange={(e) => setLocalFilters({ ...localFilters, flaggedOnly: e.target.checked })}
                className="mr-3 w-4 h-4"
              />
              <span className="text-sm sm:text-base">
                Only show flagged companies
              </span>
            </label>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleClearFilters}
            className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded hover:bg-gray-300 text-sm sm:text-base"
          >
            Clear All
          </button>
          <button
            onClick={handleApplyFilters}
            className="flex-1 bg-iise-navy text-white py-2 px-4 rounded hover:bg-iise-blue text-sm sm:text-base"
          >
            Apply Filters
          </button>
        </div>

        {getActiveFilterCount() > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            {getActiveFilterCount()} filter{getActiveFilterCount() !== 1 ? 's' : ''} active
          </div>
        )}
      </div>
    </div>
  );

  // Use portal to render modal at body level, ensuring it appears above everything
  return createPortal(modalContent, document.body);
}

export default FilterModal;
