import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { getAvailableBooths, getBoothCoordinates, setFirebaseBoothCoordinates } from '../config/boothMap';

function OrganizerDashboard() {
  const { currentUser, userRole, logout, createRecruiterAccount, createCompany, updateCompany, deleteCompany } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  // Recruiter creation form state
  const [recruiterEmail, setRecruiterEmail] = useState('');
  const [recruiterName, setRecruiterName] = useState('');
  const [recruiterCompanyName, setRecruiterCompanyName] = useState('');
  const [showRecruiterForm, setShowRecruiterForm] = useState(false);
  
  // Company creation form state
  const [companyName, setCompanyName] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [companyLogoFile, setCompanyLogoFile] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [boothNumber, setBoothNumber] = useState('');
  const [companyX, setCompanyX] = useState('');
  const [companyY, setCompanyY] = useState('');
  const [majorsHired, setMajorsHired] = useState('');
  const [yearsHired, setYearsHired] = useState('');
  const [sponsorVisa, setSponsorVisa] = useState('');
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  
  const [companies, setCompanies] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [editingCompanyId, setEditingCompanyId] = useState(null);
  const [editBoothNumber, setEditBoothNumber] = useState('');
  
  // Full company edit form state
  const [editingCompany, setEditingCompany] = useState(null);
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editCompanyDescription, setEditCompanyDescription] = useState('');
  const [editCompanyLogo, setEditCompanyLogo] = useState('');
  const [editCompanyLogoFile, setEditCompanyLogoFile] = useState(null);
  const [editCompanyBooth, setEditCompanyBooth] = useState('');
  const [editCompanyX, setEditCompanyX] = useState('');
  const [editCompanyY, setEditCompanyY] = useState('');
  const [editCompanyMajorsHired, setEditCompanyMajorsHired] = useState('');
  const [editCompanyYearsHired, setEditCompanyYearsHired] = useState('');
  const [editCompanySponsorVisa, setEditCompanySponsorVisa] = useState('');
  const [deletingCompanyId, setDeletingCompanyId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(''); // Clear any previous errors
    let companiesLoaded = false;
    let recruitersLoaded = false;
    
    try {
      // Load companies
      const companiesSnapshot = await getDocs(collection(db, 'vendors'));
      const companiesList = companiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCompanies(companiesList);
      companiesLoaded = true;
    } catch (error) {
      console.error('Error loading companies:', error);
      // Don't set error yet - check if recruiters load
    }
    
    try {
      // Load recruiters
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const recruitersList = usersSnapshot.docs
        .filter(doc => doc.data().role === 'recruiter')
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      setRecruiters(recruitersList);
      recruitersLoaded = true;
    } catch (error) {
      console.error('Error loading recruiters:', error);
      // Don't set error yet - check if companies loaded
    }
    
    // Load floor plan configuration from Firebase and update booth coordinates
    try {
      const floorPlanDoc = await getDoc(doc(db, 'config', 'floorPlan'));
      if (floorPlanDoc.exists() && floorPlanDoc.data().boothCoordinates) {
        setFirebaseBoothCoordinates(floorPlanDoc.data().boothCoordinates);
      }
    } catch (error) {
      // Silently fail - will use static coordinates
      console.log('Using static booth coordinates');
    }
    
    // Only show error if both failed to load
    // If at least one loaded successfully, don't show error
    if (!companiesLoaded && !recruitersLoaded) {
      setError('Failed to load data');
    } else {
      setError(''); // Clear error if any data loaded
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    // Clear error on mount/remount
    setError('');
    
    // Wait a moment for userRole to be set
    if (currentUser === null) {
      navigate('/login');
      return;
    }
    
    // If userRole is still null, wait a bit more (auth might still be loading)
    if (userRole === null) {
      return;
    }
    
    // If userRole is set but not organizer, redirect
    if (userRole !== 'organizer') {
      navigate('/login');
      return;
    }
    
    // User is organizer, load data
    loadData();
  }, [currentUser, userRole, navigate, loadData]);

  async function handleCreateRecruiter(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (!recruiterName.trim()) {
      setError('Please enter the recruiter\'s name');
      return;
    }
    
    if (!recruiterCompanyName) {
      setError('Please select a company');
      return;
    }
    
    if (companies.length === 0) {
      setError('No companies available. Please create a company first.');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await createRecruiterAccount(recruiterEmail, recruiterName.trim(), recruiterCompanyName);
      
      // Show success message
      setMessage(`Recruiter account created successfully for ${recruiterName} at ${recruiterCompanyName}. A password setup email has been sent to ${recruiterEmail}. ${result.message}`);
      
      // Reset form
      setRecruiterEmail('');
      setRecruiterName('');
      setRecruiterCompanyName('');
      setShowRecruiterForm(false);
      
      // Stop loading
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  // Handle booth selection - auto-populate coordinates
  function handleBoothSelection(booth) {
    setBoothNumber(booth);
    if (booth) {
      const coordinates = getBoothCoordinates(booth);
      if (coordinates) {
        setCompanyX(coordinates.x.toString());
        setCompanyY(coordinates.y.toString());
      }
    } else {
      setCompanyX('');
      setCompanyY('');
    }
  }

  // Get available booths (exclude already taken ones)
  function getAvailableBoothsList() {
    const allBooths = getAvailableBooths();
    const takenBooths = new Set(companies.map(c => c.booth?.toString()).filter(Boolean));
    return allBooths.filter(booth => !takenBooths.has(booth));
  }

  // Get all booths for editing (no filtering - allow swaps)
  function getAllBoothsList() {
    return getAvailableBooths();
  }

  async function handleBoothChange(companyId, newBoothNumber) {
    if (!newBoothNumber) {
      setError('Please select a booth number');
      return;
    }

    const coordinates = getBoothCoordinates(newBoothNumber);
    if (!coordinates) {
      setError('Invalid booth number');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      await updateCompany(companyId, {
        booth: newBoothNumber,
        x: coordinates.x,
        y: coordinates.y
      });

      setMessage(`Company booth updated to ${newBoothNumber}`);
      setEditingCompanyId(null);
      setEditBoothNumber('');
      await loadData(); // Reload data to show updated booth
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function startEditingBooth(company) {
    setEditingCompanyId(company.id);
    setEditBoothNumber(company.booth?.toString() || '');
    setError('');
    setMessage('');
  }

  function cancelEditingBooth() {
    setEditingCompanyId(null);
    setEditBoothNumber('');
  }

  // Handle booth selection for editing - auto-populate coordinates
  function handleEditBoothSelection(booth) {
    setEditCompanyBooth(booth);
    if (booth) {
      const coordinates = getBoothCoordinates(booth);
      if (coordinates) {
        setEditCompanyX(coordinates.x.toString());
        setEditCompanyY(coordinates.y.toString());
      }
    } else {
      setEditCompanyX('');
      setEditCompanyY('');
    }
  }

  function startEditingCompany(company) {
    setEditingCompany(company);
    setEditCompanyName(company.name || '');
    setEditCompanyDescription(company.description || '');
    setEditCompanyLogo(company.logo || '');
    setEditCompanyLogoFile(null);
    setEditCompanyBooth(company.booth?.toString() || '');
    setEditCompanyX(company.x?.toString() || '');
    setEditCompanyY(company.y?.toString() || '');
    setEditCompanyMajorsHired(company.MajorsHired ? company.MajorsHired.join(', ') : '');
    setEditCompanyYearsHired(company.YearsHired ? company.YearsHired.join(', ') : '');
    setEditCompanySponsorVisa(company.SponsorVisa || '');
    setError('');
    setMessage('');
  }

  function cancelEditingCompany() {
    setEditingCompany(null);
    setEditCompanyName('');
    setEditCompanyDescription('');
    setEditCompanyLogo('');
    setEditCompanyLogoFile(null);
    setEditCompanyBooth('');
    setEditCompanyX('');
    setEditCompanyY('');
    setEditCompanyMajorsHired('');
    setEditCompanyYearsHired('');
    setEditCompanySponsorVisa('');
  }

  async function handleSaveCompany(e) {
    e.preventDefault();
    if (!editingCompany) return;

    setError('');
    setMessage('');
    setLoading(true);

    try {
      let logoUrl = editCompanyLogo || null;

      // Upload logo file if provided
      if (editCompanyLogoFile) {
        setLogoUploading(true);
        try {
          const fileRef = ref(storage, `company-logos/${Date.now()}_${editCompanyLogoFile.name}`);
          await uploadBytes(fileRef, editCompanyLogoFile);
          logoUrl = await getDownloadURL(fileRef);
        } catch (uploadError) {
          setError('Failed to upload logo: ' + uploadError.message);
          setLoading(false);
          setLogoUploading(false);
          return;
        }
        setLogoUploading(false);
      }

      // If booth changed, get new coordinates
      let x = editCompanyX ? parseFloat(editCompanyX) : null;
      let y = editCompanyY ? parseFloat(editCompanyY) : null;
      
      if (editCompanyBooth) {
        const coordinates = getBoothCoordinates(editCompanyBooth);
        if (coordinates) {
          x = coordinates.x;
          y = coordinates.y;
        }
      }

      const updatedData = {
        name: editCompanyName,
        description: editCompanyDescription || null,
        logo: logoUrl,
        booth: editCompanyBooth || null,
        x: x,
        y: y,
        MajorsHired: editCompanyMajorsHired 
          ? editCompanyMajorsHired.split(',').map(m => m.trim()).filter(m => m)
          : [],
        YearsHired: editCompanyYearsHired 
          ? editCompanyYearsHired.split(',').map(y => y.trim()).filter(y => y)
          : [],
        SponsorVisa: editCompanySponsorVisa || null
      };

      await updateCompany(editingCompany.id, updatedData);

      // Reset file state
      setEditCompanyLogoFile(null);
      const fileInput = document.getElementById('editCompanyLogoFile');
      if (fileInput) fileInput.value = '';

      setMessage(`Company "${editCompanyName}" updated successfully`);
      cancelEditingCompany();
      await loadData(); // Reload data to show updated company
    } catch (err) {
      setError(err.message || 'Failed to update company information');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCompany(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    
    try {
      if (!boothNumber) {
        setError('Please select a booth number');
        setLoading(false);
        return;
      }

      let logoUrl = companyLogo || null;

      // Upload logo file if provided
      if (companyLogoFile) {
        setLogoUploading(true);
        try {
          const fileRef = ref(storage, `company-logos/${Date.now()}_${companyLogoFile.name}`);
          await uploadBytes(fileRef, companyLogoFile);
          logoUrl = await getDownloadURL(fileRef);
        } catch (uploadError) {
          setError('Failed to upload logo: ' + uploadError.message);
          setLoading(false);
          setLogoUploading(false);
          return;
        }
        setLogoUploading(false);
      }

      const companyData = {
        name: companyName,
        description: companyDescription,
        logo: logoUrl,
        booth: boothNumber,
        x: companyX ? parseFloat(companyX) : null,
        y: companyY ? parseFloat(companyY) : null,
        MajorsHired: majorsHired ? majorsHired.split(',').map(m => m.trim()) : [],
        YearsHired: yearsHired ? yearsHired.split(',').map(y => y.trim()) : [],
        SponsorVisa: sponsorVisa || null
      };
      
      await createCompany(companyData);
      setMessage(`Company "${companyName}" created successfully at Booth ${boothNumber}`);
      // Reset form
      setCompanyName('');
      setCompanyDescription('');
      setCompanyLogo('');
      setCompanyLogoFile(null);
      setBoothNumber('');
      setCompanyX('');
      setCompanyY('');
      setMajorsHired('');
      setYearsHired('');
      setSponsorVisa('');
      setShowCompanyForm(false);
      
      // Reset file input
      const fileInput = document.getElementById('companyLogoFile');
      if (fileInput) fileInput.value = '';
      
      await loadData(); // Reload data to show new company
    } catch (err) {
      setError(err.message);
    }
    
    setLoading(false);
  }

  async function handleDeleteCompany(companyId, companyName) {
    if (!window.confirm(`Are you sure you want to delete "${companyName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingCompanyId(companyId);
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await deleteCompany(companyId);
      setMessage(`Company "${companyName}" deleted successfully`);
      await loadData(); // Reload data to remove deleted company
    } catch (err) {
      setError(err.message || 'Failed to delete company');
    } finally {
      setLoading(false);
      setDeletingCompanyId(null);
    }
  }

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // Show loading state while checking auth or loading data
  if (loading || userRole === null) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-xl">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-iise-navy text-white p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <img 
            src="/iiselogo_white.webp" 
            alt="IISE Logo" 
            className="h-12 sm:h-16 object-contain cursor-pointer"
            onClick={() => navigate('/')}
          />
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
            <span className="text-xs sm:text-sm break-all">
              {currentUser?.email}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/')}
                className="flex-1 sm:flex-none bg-white text-iise-navy px-3 py-1.5 sm:px-4 sm:py-2 rounded hover:bg-gray-100 text-sm"
              >
                Back to Map
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 sm:flex-none bg-red-500 px-3 py-1.5 sm:px-4 sm:py-2 rounded hover:bg-red-600 text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        {error && error.trim() && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}
        
        {message && (
          <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm">
            {message}
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => {
              setShowCompanyForm(!showCompanyForm);
              setShowRecruiterForm(false);
            }}
            className="bg-iise-navy text-white p-4 rounded-lg hover:bg-iise-blue text-lg font-semibold"
          >
            {showCompanyForm ? 'Cancel' : '+ Create Company'}
          </button>
          <button
            onClick={() => {
              setShowRecruiterForm(!showRecruiterForm);
              setShowCompanyForm(false);
            }}
            className="bg-green-500 text-white p-4 rounded-lg hover:bg-green-600 text-lg font-semibold"
          >
            {showRecruiterForm ? 'Cancel' : '+ Create Recruiter Account'}
          </button>
          <button
            onClick={() => navigate('/organizer/floor-plan')}
            className="bg-purple-500 text-white p-4 rounded-lg hover:bg-purple-600 text-lg font-semibold"
          >
            ⚙️ Configure Floor Plan
          </button>
        </div>

        {/* Create Company Form */}
        {showCompanyForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Create New Company</h2>
            <form onSubmit={handleCreateCompany}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Company Name *</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={companyDescription}
                    onChange={e => setCompanyDescription(e.target.value)}
                    className="w-full p-2 border rounded"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Logo (Upload File or Enter URL)</label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      id="companyLogoFile"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files[0];
                        if (file) {
                          setCompanyLogoFile(file);
                          setCompanyLogo(''); // Clear URL if file is selected
                        }
                      }}
                      className="w-full p-2 border rounded"
                    />
                    {companyLogoFile && (
                      <p className="text-xs text-gray-600">Selected: {companyLogoFile.name}</p>
                    )}
                    <div className="text-center text-gray-500 text-sm">OR</div>
                    <input
                      type="url"
                      value={companyLogo}
                      onChange={e => {
                        setCompanyLogo(e.target.value);
                        setCompanyLogoFile(null); // Clear file if URL is entered
                        const fileInput = document.getElementById('companyLogoFile');
                        if (fileInput) fileInput.value = '';
                      }}
                      className="w-full p-2 border rounded"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Booth Number *</label>
                  <select
                    value={boothNumber}
                    onChange={e => handleBoothSelection(e.target.value)}
                    className="w-full p-2 border rounded"
                    required
                  >
                    <option value="">Select a booth...</option>
                    {getAvailableBoothsList().map(booth => (
                      <option key={booth} value={booth}>
                        Booth {booth}
                      </option>
                    ))}
                  </select>
                  {boothNumber && (
                    <p className="text-xs text-gray-500 mt-1">
                      Coordinates: X={companyX}, Y={companyY}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">X Coordinate (auto-filled)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={companyX}
                      onChange={e => setCompanyX(e.target.value)}
                      className="w-full p-2 border rounded bg-gray-50"
                      placeholder="Auto-filled from booth"
                      readOnly={!!boothNumber}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Y Coordinate (auto-filled)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={companyY}
                      onChange={e => setCompanyY(e.target.value)}
                      className="w-full p-2 border rounded bg-gray-50"
                      placeholder="Auto-filled from booth"
                      readOnly={!!boothNumber}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Majors Hired (comma-separated)</label>
                  <input
                    type="text"
                    value={majorsHired}
                    onChange={e => setMajorsHired(e.target.value)}
                    className="w-full p-2 border rounded"
                    placeholder="Industrial Engineering, Computer Science, Engineering, Business"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Years Hired (comma-separated)</label>
                  <input
                    type="text"
                    value={yearsHired}
                    onChange={e => setYearsHired(e.target.value)}
                    className="w-full p-2 border rounded"
                    placeholder="1st, 2nd, 3rd, 4+"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sponsors H1B Visa</label>
                  <input
                    type="text"
                    value={sponsorVisa}
                    onChange={e => setSponsorVisa(e.target.value)}
                    className="w-full p-2 border rounded"
                    placeholder="Yes/No"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || logoUploading}
                  className="w-full bg-iise-navy text-white p-2 rounded hover:bg-iise-blue disabled:bg-gray-400"
                >
                  {logoUploading ? 'Uploading Logo...' : loading ? 'Creating...' : 'Create Company'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Create Recruiter Form */}
        {showRecruiterForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Create New Recruiter Account</h2>
            <form onSubmit={handleCreateRecruiter}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input
                    type="text"
                    value={recruiterName}
                    onChange={e => setRecruiterName(e.target.value)}
                    className="w-full p-2 border rounded"
                    required
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <input
                    type="email"
                    value={recruiterEmail}
                    onChange={e => setRecruiterEmail(e.target.value)}
                    className="w-full p-2 border rounded"
                    required
                    placeholder="recruiter@company.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    A password setup email will be sent to this address
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Company *</label>
                  {companies.length === 0 ? (
                    <div className="w-full p-2 border rounded bg-gray-50 text-gray-500">
                      No companies available. Please create a company first.
                    </div>
                  ) : (
                    <select
                      value={recruiterCompanyName}
                      onChange={e => setRecruiterCompanyName(e.target.value)}
                      className="w-full p-2 border rounded"
                      required
                    >
                      <option value="">Select a company...</option>
                      {companies.map(company => (
                        <option key={company.id} value={company.name}>
                          {company.name} {company.booth && `(Booth ${company.booth})`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600 disabled:bg-gray-400"
                >
                  {loading ? 'Creating...' : 'Create Recruiter Account'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Companies List */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Companies ({companies.length})</h2>
          {companies.length === 0 ? (
            <p className="text-gray-600">No companies created yet.</p>
          ) : (
            <div className="space-y-4">
              {companies.map(company => (
                <div key={company.id}>
                  {editingCompany?.id === company.id ? (
                    <div className="border rounded p-4 bg-gray-50">
                      <h3 className="text-lg font-semibold mb-4">Edit Company: {company.name}</h3>
                      <form onSubmit={handleSaveCompany} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Company Name *</label>
                          <input
                            type="text"
                            value={editCompanyName}
                            onChange={e => setEditCompanyName(e.target.value)}
                            className="w-full p-2 border rounded"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Description</label>
                          <textarea
                            value={editCompanyDescription}
                            onChange={e => setEditCompanyDescription(e.target.value)}
                            className="w-full p-2 border rounded"
                            rows="3"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Logo (Upload File or Enter URL)</label>
                          <div className="space-y-2">
                            <input
                              type="file"
                              id="editCompanyLogoFile"
                              accept="image/*"
                              onChange={e => {
                                const file = e.target.files[0];
                                if (file) {
                                  setEditCompanyLogoFile(file);
                                  setEditCompanyLogo(''); // Clear URL if file is selected
                                }
                              }}
                              className="w-full p-2 border rounded"
                            />
                            {editCompanyLogoFile && (
                              <p className="text-xs text-gray-600">Selected: {editCompanyLogoFile.name}</p>
                            )}
                            <div className="text-center text-gray-500 text-sm">OR</div>
                            <input
                              type="url"
                              value={editCompanyLogo}
                              onChange={e => {
                                setEditCompanyLogo(e.target.value);
                                setEditCompanyLogoFile(null); // Clear file if URL is entered
                                const fileInput = document.getElementById('editCompanyLogoFile');
                                if (fileInput) fileInput.value = '';
                              }}
                              className="w-full p-2 border rounded"
                              placeholder="https://example.com/logo.png"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Booth Number</label>
                          <select
                            value={editCompanyBooth}
                            onChange={e => handleEditBoothSelection(e.target.value)}
                            className="w-full p-2 border rounded"
                          >
                            <option value="">No booth assigned</option>
                            {getAllBoothsList().map(booth => (
                              <option key={booth} value={booth}>
                                Booth {booth}
                              </option>
                            ))}
                          </select>
                          {editCompanyBooth && (
                            <p className="text-xs text-gray-500 mt-1">
                              Coordinates: X={editCompanyX}, Y={editCompanyY}
                            </p>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">X Coordinate (auto-filled)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editCompanyX}
                              onChange={e => setEditCompanyX(e.target.value)}
                              className="w-full p-2 border rounded bg-gray-50"
                              placeholder="Auto-filled from booth"
                              readOnly={!!editCompanyBooth}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Y Coordinate (auto-filled)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editCompanyY}
                              onChange={e => setEditCompanyY(e.target.value)}
                              className="w-full p-2 border rounded bg-gray-50"
                              placeholder="Auto-filled from booth"
                              readOnly={!!editCompanyBooth}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Majors Hired (comma-separated)</label>
                          <input
                            type="text"
                            value={editCompanyMajorsHired}
                            onChange={e => setEditCompanyMajorsHired(e.target.value)}
                            className="w-full p-2 border rounded"
                            placeholder="Industrial Engineering, Computer Science, Engineering, Business"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Years Hired (comma-separated)</label>
                          <input
                            type="text"
                            value={editCompanyYearsHired}
                            onChange={e => setEditCompanyYearsHired(e.target.value)}
                            className="w-full p-2 border rounded"
                            placeholder="1st, 2nd, 3rd, 4+"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Sponsors H1B Visa</label>
                          <input
                            type="text"
                            value={editCompanySponsorVisa}
                            onChange={e => setEditCompanySponsorVisa(e.target.value)}
                            className="w-full p-2 border rounded"
                            placeholder="Yes/No"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={loading || logoUploading}
                            className="flex-1 bg-iise-navy text-white p-2 rounded hover:bg-iise-blue disabled:bg-gray-400"
                          >
                            {logoUploading ? 'Uploading Logo...' : loading ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditingCompany}
                            disabled={loading || logoUploading}
                            className="flex-1 bg-gray-500 text-white p-2 rounded hover:bg-gray-600 disabled:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="border rounded p-3">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                        <div className="flex-1">
                          <h3 className="font-semibold">
                            {company.name}
                            {company.booth && <span className="ml-2 text-iise-navy">(Booth {company.booth})</span>}
                          </h3>
                          {company.description && (
                            <p className="text-sm text-gray-600 mt-1">{company.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Coordinates: ({company.x || 'N/A'}, {company.y || 'N/A'})
                          </p>
                          {company.MajorsHired && company.MajorsHired.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              Majors: {company.MajorsHired.join(', ')}
                            </p>
                          )}
                          {company.YearsHired && company.YearsHired.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              Years: {company.YearsHired.join(', ')}
                            </p>
                          )}
                          {company.SponsorVisa && (
                            <p className="text-xs text-gray-500 mt-1">
                              Sponsors Visa: {company.SponsorVisa}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          {editingCompanyId === company.id ? (
                            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                              <select
                                value={editBoothNumber}
                                onChange={e => setEditBoothNumber(e.target.value)}
                                className="p-2 border rounded text-sm"
                                disabled={loading}
                              >
                                <option value="">Select booth...</option>
                                {getAllBoothsList().map(booth => (
                                  <option key={booth} value={booth}>
                                    Booth {booth}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleBoothChange(company.id, editBoothNumber)}
                                disabled={loading || !editBoothNumber}
                                className="bg-iise-navy text-white px-3 py-2 rounded hover:bg-iise-blue disabled:bg-gray-400 text-sm"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEditingBooth}
                                disabled={loading}
                                className="bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600 disabled:bg-gray-400 text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditingCompany(company)}
                                className="bg-iise-navy text-white px-3 py-2 rounded hover:bg-iise-blue text-sm"
                              >
                                ✏️ Edit Company
                              </button>
                              <button
                                onClick={() => startEditingBooth(company)}
                                className="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 text-sm"
                              >
                                Change Booth Only
                              </button>
                              <button
                                onClick={() => handleDeleteCompany(company.id, company.name)}
                                disabled={loading || deletingCompanyId === company.id}
                                className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 disabled:bg-gray-400 text-sm"
                              >
                                {deletingCompanyId === company.id ? 'Deleting...' : '🗑️ Delete'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recruiters List */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Recruiters ({recruiters.length})</h2>
          {recruiters.length === 0 ? (
            <p className="text-gray-600">No recruiter accounts created yet.</p>
          ) : (
            <div className="space-y-2">
              {recruiters.map(recruiter => (
                <div key={recruiter.id} className="border rounded p-3">
                  <h3 className="font-semibold">{recruiter.name || 'Unnamed Recruiter'}</h3>
                  <p className="text-sm text-gray-600">{recruiter.companyName}</p>
                  <p className="text-sm text-gray-600">{recruiter.email}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Created: {recruiter.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrganizerDashboard;
