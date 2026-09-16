import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import FloorPlanMap from '../components/FloorPlanMap';
import VendorModal from '../components/VendorModal';
import FilterModal from '../components/FilterModal';

// Stable color per booth (same booth = same color across filters)
const BOOTH_COLORS = [
  '#e11d48', '#ea580c', '#ca8a04', '#65a30d', '#0d9488', '#2563eb',
  '#4f46e5', '#7c3aed', '#c026d3', '#db2777', '#0891b2', '#dc2626',
  '#16a34a', '#9333ea', '#0e7490', '#be123c', '#b45309', '#4d7c0f',
];

function MapView() {
  const { currentUser, userRole, logout } = useAuth();
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [floorPlanConfig, setFloorPlanConfig] = useState(null); // { imageUrl, imageWidth, imageHeight }
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    year: '',
    major: '',
    needsVisa: false,
    flaggedOnly: false
  });
  const [flaggedCompanyIds, setFlaggedCompanyIds] = useState(new Set());

  const loadFlaggedCompanies = useCallback(async () => {
    if (!currentUser || userRole !== 'student') return;
    
    try {
      const flagsQuery = query(
        collection(db, 'companyFlags'),
        where('studentId', '==', currentUser.uid)
      );
      const flagsSnapshot = await getDocs(flagsQuery);
      const flaggedIds = new Set(flagsSnapshot.docs.map(doc => doc.data().companyId));
      setFlaggedCompanyIds(flaggedIds);
    } catch (error) {
      console.error('Error loading flagged companies:', error);
    }
  }, [currentUser, userRole]);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    loadVendors();
    loadFloorPlanConfig();
    if (userRole === 'student') {
      loadFlaggedCompanies();
    }
  }, [currentUser, navigate, userRole, loadFlaggedCompanies]);

  async function loadFloorPlanConfig() {
    try {
      const floorPlanDoc = await getDoc(doc(db, 'config', 'floorPlan'));
      if (floorPlanDoc.exists()) {
        setFloorPlanConfig(floorPlanDoc.data());
      } else {
        setFloorPlanConfig(null);
      }
    } catch (error) {
      console.error('Error loading floor plan config:', error);
      setFloorPlanConfig(null);
    }
  }

  async function loadVendors() {
    try {
      const vendorsCollection = collection(db, 'vendors');
      const vendorSnapshot = await getDocs(vendorsCollection);
      const vendorList = vendorSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVendors(vendorList);
    } catch (error) {
      console.error('Error loading vendors:', error);
    }
    setLoading(false);
  }


  function handleVendorClick(vendor) {
    setSelectedVendor(vendor);
  }

  function handleSubmitResume(vendor) {
    setSelectedVendor(null);
    if (userRole === 'student') {
      navigate('/student', { state: { selectedVendor: vendor } });
    }
  }

  async function handleLogout() {
    try {
      // Small delay to allow map cleanup before navigation
      await logout();
      // Use setTimeout to allow React to clean up the map component
      setTimeout(() => {
        navigate('/login');
      }, 100);
    } catch (error) {
      console.error('Logout error:', error);
      // Navigate even if logout fails
      setTimeout(() => {
        navigate('/login');
      }, 100);
    }
  }

  function goToDashboard() {
    if (userRole === 'student') {
      navigate('/student');
    } else if (userRole === 'recruiter') {
      navigate('/recruiter');
    } else if (userRole === 'organizer') {
      navigate('/organizer');
    }
  }

  // Filter vendors based on selected filters
  const filteredVendors = vendors.filter(vendor => {
    // Flagged filter - only show flagged companies if filter is enabled
    if (filters.flaggedOnly && userRole === 'student') {
      if (!flaggedCompanyIds.has(vendor.id)) {
        return false;
      }
    }

    // Year filter - only filter if vendor has YearsHired data
    if (filters.year) {
      if (vendor.YearsHired && (Array.isArray(vendor.YearsHired) || vendor.YearsHired)) {
        const yearsHired = Array.isArray(vendor.YearsHired) 
          ? vendor.YearsHired.map(y => y?.toString().trim())
          : [vendor.YearsHired?.toString().trim()].filter(Boolean);
        if (yearsHired.length > 0 && !yearsHired.includes(filters.year)) {
          return false;
        }
      }
      // If vendor has no YearsHired data, don't filter them out
    }

    // Major filter - only filter if vendor has MajorsHired data
    if (filters.major) {
      if (vendor.MajorsHired && (Array.isArray(vendor.MajorsHired) || vendor.MajorsHired)) {
        const majorsHired = Array.isArray(vendor.MajorsHired)
          ? vendor.MajorsHired.map(m => m?.toString().trim())
          : [vendor.MajorsHired?.toString().trim()].filter(Boolean);
        if (majorsHired.length > 0 && !majorsHired.includes(filters.major)) {
          return false;
        }
      }
      // If vendor has no MajorsHired data, don't filter them out
    }

    // Visa sponsorship filter - only filter if vendor has SponsorVisa data
    if (filters.needsVisa) {
      // Only filter out if vendor explicitly has SponsorVisa data that indicates "No"
      if (vendor.SponsorVisa !== undefined && vendor.SponsorVisa !== null && vendor.SponsorVisa !== '') {
        const sponsorVisaStr = vendor.SponsorVisa.toString().toLowerCase();
        if (sponsorVisaStr === 'false' || sponsorVisaStr === 'no' || sponsorVisaStr === '0') {
          return false;
        }
      }
      // If vendor has no SponsorVisa data, don't filter them out
    }

    return true;
  });

  function handleFiltersChange(newFilters) {
    setFilters(newFilters);
  }

  function getActiveFilterCount() {
    let count = 0;
    if (filters.year) count++;
    if (filters.major) count++;
    if (filters.needsVisa) count++;
    if (filters.flaggedOnly) count++;
    return count;
  }

  const boothToColor = useMemo(() => {
    const sortedBooths = [...new Set(filteredVendors.map(v => v.booth != null ? String(v.booth) : '').filter(Boolean))]
      .sort((a, b) => {
        const na = Number(a);
        const nb = Number(b);
        if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
        return a.localeCompare(b, undefined, { numeric: true });
      });
    const map = {};
    sortedBooths.forEach((booth, i) => {
      map[booth] = BOOTH_COLORS[i % BOOTH_COLORS.length];
    });
    map[''] = BOOTH_COLORS[0]; // fallback for missing booth
    return map;
  }, [filteredVendors]);

  const filteredVendorsWithColor = useMemo(() => {
    return filteredVendors.map(v => ({
      ...v,
      boothColor: boothToColor[v.booth != null ? String(v.booth) : ''] || BOOTH_COLORS[0],
    }));
  }, [filteredVendors, boothToColor]);

  function handleFlagChange() {
    // Reload flagged companies when a flag is toggled
    if (userRole === 'student') {
      loadFlaggedCompanies();
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-xl">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header - Mobile Responsive */}
      <div className="bg-iise-navy text-white p-4 sm:p-6">
        <div className="flex justify-between items-center">
          <img 
            src="/iiselogo_white.webp" 
            alt="IISE Logo" 
            className="h-12 sm:h-16 object-contain cursor-pointer"
            onClick={() => navigate('/')}
          />
          
          {/* Mobile Menu Button */}
          <button
            className="sm:hidden text-white"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Desktop Menu */}
          <div className="hidden sm:flex gap-3 items-center">
            <span className="text-xs sm:text-sm">
              {currentUser?.email} ({userRole})
            </span>
            {userRole === 'student' && (
              <button
                onClick={() => setShowFilterModal(true)}
                className="bg-white text-iise-navy px-3 py-1.5 sm:px-4 sm:py-2 rounded hover:bg-gray-100 text-sm relative"
              >
                Filters
                {getActiveFilterCount() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-iise-gold text-iise-navy text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {getActiveFilterCount()}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={goToDashboard}
              className="bg-white text-iise-navy px-3 py-1.5 sm:px-4 sm:py-2 rounded hover:bg-gray-100 text-sm"
            >
              Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-500 px-3 py-1.5 sm:px-4 sm:py-2 rounded hover:bg-red-600 text-sm"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {showMobileMenu && (
          <div className="sm:hidden mt-3 space-y-2">
            <div className="text-xs text-gray-200 mb-2">
              {currentUser?.email} ({userRole})
            </div>
            {userRole === 'student' && (
              <button
                onClick={() => {
                  setShowFilterModal(true);
                  setShowMobileMenu(false);
                }}
                className="w-full bg-white text-iise-navy px-4 py-2 rounded hover:bg-gray-100 text-sm relative"
              >
                Filters
                {getActiveFilterCount() > 0 && (
                  <span className="absolute top-1 right-4 bg-iise-gold text-iise-navy text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {getActiveFilterCount()}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => {
                goToDashboard();
                setShowMobileMenu(false);
              }}
              className="w-full bg-white text-iise-navy px-4 py-2 rounded hover:bg-gray-100 text-sm"
            >
              My Dashboard
            </button>
            <button
              onClick={() => {
                handleLogout();
                setShowMobileMenu(false);
              }}
              className="w-full bg-red-500 px-4 py-2 rounded hover:bg-red-600 text-sm"
            >
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Map Instructions - Mobile Responsive */}
      <div className="bg-yellow-50 border-b border-yellow-200 p-2 sm:p-3 text-center">
        <p className="text-xs sm:text-sm text-gray-700">
          <span className="hidden sm:inline">Click on markers to view vendor details. Use mouse wheel or pinch to zoom.</span>
          <span className="sm:hidden">Tap markers for details. Pinch to zoom.</span>
        </p>
      </div>

      {/* Map + Company list (list on right) */}
      <div className="flex-1 flex flex-col sm:flex-row min-h-0">
        {/* Map (left) - fills all space to the left of the list; Leaflet fits bounds with uniform scale inside */}
        <div className="flex-1 relative min-h-[300px] min-w-0">
          {vendors.length > 0 && currentUser ? (
            <FloorPlanMap 
              key={`${currentUser.uid}-${floorPlanConfig?.imageUrl ?? 'default'}`}
              vendors={filteredVendorsWithColor}
              onVendorClick={handleVendorClick}
              floorPlanImageUrl={floorPlanConfig?.imageUrl}
              imageWidth={floorPlanConfig?.imageWidth}
              imageHeight={floorPlanConfig?.imageHeight}
            />
          ) : vendors.length === 0 ? (
            <div className="h-full flex items-center justify-center p-4">
              <div className="text-center">
                <p className="text-lg sm:text-xl mb-4">No vendors found</p>
                <p className="text-sm sm:text-base text-gray-600">Add vendors in Firebase Console to see them on the map</p>
              </div>
            </div>
          ) : null}
          {filteredVendors.length === 0 && vendors.length > 0 && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded text-sm z-10">
              No companies match your filters. Try adjusting your search criteria.
            </div>
          )}
          {/* Floating Filter Button - Only for students */}
          {userRole === 'student' && vendors.length > 0 && (
            <button
              onClick={() => setShowFilterModal(true)}
              className="absolute bottom-4 right-4 bg-iise-navy text-white p-3 sm:p-4 rounded-full shadow-lg hover:bg-iise-blue z-10 flex items-center gap-2"
              aria-label="Open filters"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {getActiveFilterCount() > 0 && (
                <span className="bg-iise-gold text-iise-navy text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {getActiveFilterCount()}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Company list / key (right) - uses same filteredVendors as map, with booth colors */}
        {vendors.length > 0 && currentUser && (
          <div className="sm:w-56 lg:w-64 shrink-0 bg-white border-t sm:border-t-0 sm:border-l border-gray-200 flex flex-col min-h-0">
            <div className="p-3 border-b border-gray-200 shrink-0">
              <h3 className="font-semibold text-iise-navy text-sm sm:text-base">
                Companies ({filteredVendors.length})
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Booth • Company</p>
            </div>
            <ul className="flex-1 overflow-y-auto p-2 space-y-0.5 min-h-[120px] sm:min-h-0">
              {[...filteredVendorsWithColor]
                .sort((a, b) => {
                  const boothA = a.booth != null ? Number(a.booth) : NaN;
                  const boothB = b.booth != null ? Number(b.booth) : NaN;
                  if (!Number.isNaN(boothA) && !Number.isNaN(boothB)) return boothA - boothB;
                  return String(a.booth ?? '').localeCompare(String(b.booth ?? ''), undefined, { numeric: true });
                })
                .map(vendor => (
                  <li key={vendor.id}>
                    <button
                      type="button"
                      onClick={() => handleVendorClick(vendor)}
                      className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-iise-navy/10 focus:bg-iise-navy/10 focus:outline-none flex items-center gap-2"
                    >
                      <span
                        className="shrink-0 w-3 h-3 rounded-sm border border-gray-300"
                        style={{ backgroundColor: vendor.boothColor }}
                        aria-hidden
                      />
                      <span className="font-medium text-gray-500 tabular-nums shrink-0">{vendor.booth ?? '—'}</span>
                      <span className="text-gray-400 shrink-0">•</span>
                      <span className="text-gray-900 truncate min-w-0">{vendor.name ?? 'Unknown'}</span>
                    </button>
                  </li>
                ))}
            </ul>
            {filteredVendors.length === 0 && (
              <p className="p-3 text-sm text-gray-500">No companies match current filters.</p>
            )}
          </div>
        )}
      </div>

      {/* Vendor Modal */}
      {selectedVendor && userRole === 'student' && (
        <VendorModal
          vendor={selectedVendor}
          onClose={() => setSelectedVendor(null)}
          onSubmitResume={handleSubmitResume}
          userRole={userRole}
          onFlagChange={handleFlagChange}
        />
      )}

      {userRole === 'student' && (
        <FilterModal
          isOpen={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          vendors={vendors}
        />
      )}

      {selectedVendor && userRole === 'recruiter' && (
        <VendorModal
          vendor={selectedVendor}
          onClose={() => setSelectedVendor(null)}
          onSubmitResume={() => {}}
          userRole={userRole}
        />
      )}

      {selectedVendor && userRole === 'organizer' && (
        <VendorModal
          vendor={selectedVendor}
          onClose={() => setSelectedVendor(null)}
          onSubmitResume={() => {}}
          userRole={userRole}
        />
      )}
    </div>
  );
}

export default MapView;