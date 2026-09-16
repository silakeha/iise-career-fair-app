import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import ResumeViewer from '../components/ResumeViewer';

function RecruiterDashboard() {
  const { currentUser, userRole, logout, updateCompany } = useAuth();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [flaggedResumes, setFlaggedResumes] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedResume, setSelectedResume] = useState(null);
  const [selectedResumeType, setSelectedResumeType] = useState(null);
  
  // Form state for editing company
  const [editDescription, setEditDescription] = useState('');
  const [editLogo, setEditLogo] = useState('');
  const [editLogoFile, setEditLogoFile] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [editMajorsHired, setEditMajorsHired] = useState('');
  const [editYearsHired, setEditYearsHired] = useState('');
  const [editSponsorVisa, setEditSponsorVisa] = useState('');

  const loadData = useCallback(async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
        
        const companyName = userDoc.data().companyName;
        const vendorsSnapshot = await getDocs(collection(db, 'vendors'));
        const matchingVendor = vendorsSnapshot.docs.find(
          d => d.data().name.toLowerCase() === companyName.toLowerCase()
        );

        if (matchingVendor) {
          const vendorData = {
            id: matchingVendor.id,
            ...matchingVendor.data()
          };
          setCompanyData(vendorData);
          
          // Initialize form fields
          setEditDescription(vendorData.description || '');
          setEditLogo(vendorData.logo || '');
          setEditLogoFile(null);
          setEditMajorsHired(Array.isArray(vendorData.MajorsHired) 
            ? vendorData.MajorsHired.join(', ') 
            : (vendorData.MajorsHired || ''));
          setEditYearsHired(Array.isArray(vendorData.YearsHired) 
            ? vendorData.YearsHired.join(', ') 
            : (vendorData.YearsHired || ''));
          setEditSponsorVisa(vendorData.SponsorVisa || '');
          
          const resumesQuery = query(
            collection(db, 'resumes'),
            where('vendorId', '==', matchingVendor.id)
          );
          const resumesSnapshot = await getDocs(resumesQuery);
          const resumesList = resumesSnapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
          }));
          setResumes(resumesList);
        }
      }
      
      // Load flagged resumes
      const flagsQuery = query(
        collection(db, 'resumeFlags'),
        where('recruiterId', '==', currentUser.uid)
      );
      const flagsSnapshot = await getDocs(flagsQuery);
      const flaggedList = flagsSnapshot.docs.map(d => ({
        flagId: d.id,
        ...d.data()
      }));
      setFlaggedResumes(flaggedList);
    } catch (error) {
      console.error('Error loading data:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      let errorMessage = `Failed to load company data: ${error.message || error.code || 'Unknown error'}`;
      
      // Provide helpful error messages for common issues
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        errorMessage += '. Please ensure: 1) Firestore rules are deployed (see DEPLOY_RULES.md), 2) Your user document exists with role="recruiter", 3) You are logged in correctly.';
      }
      
      setError(errorMessage);
    }
    setLoading(false);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || userRole !== 'recruiter') {
      navigate('/login');
      return;
    }

    loadData();
  }, [currentUser, userRole, navigate, loadData]);

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  function handleEditClick() {
    setIsEditing(true);
    setMessage('');
    setError('');
  }

  function handleCancelEdit() {
    setIsEditing(false);
    // Reset form to original values
    if (companyData) {
      setEditDescription(companyData.description || '');
      setEditLogo(companyData.logo || '');
      setEditLogoFile(null);
      setEditMajorsHired(Array.isArray(companyData.MajorsHired) 
        ? companyData.MajorsHired.join(', ') 
        : (companyData.MajorsHired || ''));
      setEditYearsHired(Array.isArray(companyData.YearsHired) 
        ? companyData.YearsHired.join(', ') 
        : (companyData.YearsHired || ''));
      setEditSponsorVisa(companyData.SponsorVisa || '');
    }
    setMessage('');
    setError('');
    
    // Reset file input
    const fileInput = document.getElementById('editLogoFile');
    if (fileInput) fileInput.value = '';
  }

  async function handleSaveCompany(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    
    try {
      if (!companyData) {
        throw new Error('Company data not loaded');
      }
      
      let logoUrl = editLogo || null;

      // Upload logo file if provided
      if (editLogoFile) {
        setLogoUploading(true);
        try {
          const fileRef = ref(storage, `company-logos/${Date.now()}_${editLogoFile.name}`);
          await uploadBytes(fileRef, editLogoFile);
          logoUrl = await getDownloadURL(fileRef);
        } catch (uploadError) {
          setError('Failed to upload logo: ' + uploadError.message);
          setSaving(false);
          setLogoUploading(false);
          return;
        }
        setLogoUploading(false);
      }
      
      const updatedData = {
        description: editDescription || null,
        logo: logoUrl,
        MajorsHired: editMajorsHired 
          ? editMajorsHired.split(',').map(m => m.trim()).filter(m => m)
          : [],
        YearsHired: editYearsHired 
          ? editYearsHired.split(',').map(y => y.trim()).filter(y => y)
          : [],
        SponsorVisa: editSponsorVisa || null
      };
      
      await updateCompany(companyData.id, updatedData);
      
      // Reset file state
      setEditLogoFile(null);
      const fileInput = document.getElementById('editLogoFile');
      if (fileInput) fileInput.value = '';
      
      // Reload data to get updated company info
      await loadData();
      setIsEditing(false);
      setMessage('Company information updated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to update company information');
    } finally {
      setSaving(false);
    }
  }

  const filteredResumes = resumes.filter(resume => {
    if (filter === 'all') return true;
    return resume.status === filter;
  });

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-xl">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header - Mobile Responsive */}
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
              {userProfile?.name || 'Recruiter'} - {userProfile?.companyName} - {currentUser?.email}
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
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}
        
        {message && (
          <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm">
            {message}
          </div>
        )}

        {/* Company Info */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
            <h2 className="text-lg sm:text-xl font-bold">Company Information</h2>
            {!isEditing && (
              <button
                onClick={handleEditClick}
                className="w-full sm:w-auto bg-iise-navy text-white px-4 py-2 rounded hover:bg-iise-blue text-sm sm:text-base"
              >
                ✏️ Edit Company Information
              </button>
            )}
          </div>
          
          {isEditing ? (
            <form onSubmit={handleSaveCompany} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Company Name</label>
                <input
                  type="text"
                  value={companyData?.name || ''}
                  className="w-full p-2 border rounded bg-gray-50"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Company name cannot be changed</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="w-full p-2 border rounded"
                  rows="4"
                  placeholder="Enter company description..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Logo (Upload File or Enter URL)</label>
                <div className="space-y-2">
                  <input
                    type="file"
                    id="editLogoFile"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files[0];
                      if (file) {
                        setEditLogoFile(file);
                        setEditLogo(''); // Clear URL if file is selected
                      }
                    }}
                    className="w-full p-2 border rounded"
                  />
                  {editLogoFile && (
                    <p className="text-xs text-gray-600">Selected: {editLogoFile.name}</p>
                  )}
                  <div className="text-center text-gray-500 text-sm">OR</div>
                  <input
                    type="url"
                    value={editLogo}
                    onChange={e => {
                      setEditLogo(e.target.value);
                      setEditLogoFile(null); // Clear file if URL is entered
                      const fileInput = document.getElementById('editLogoFile');
                      if (fileInput) fileInput.value = '';
                    }}
                    className="w-full p-2 border rounded"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Majors Hired (comma-separated)</label>
                <input
                  type="text"
                  value={editMajorsHired}
                  onChange={e => setEditMajorsHired(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Industrial Engineering, Computer Science, Engineering, Business"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Years Hired (comma-separated)</label>
                <input
                  type="text"
                  value={editYearsHired}
                  onChange={e => setEditYearsHired(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="1st, 2nd, 3rd, 4+"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Sponsors H1B Visa</label>
                <input
                  type="text"
                  value={editSponsorVisa}
                  onChange={e => setEditSponsorVisa(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Yes/No"
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving || logoUploading}
                  className="flex-1 bg-iise-navy text-white px-4 py-2 rounded hover:bg-iise-blue disabled:bg-gray-400"
                >
                  {logoUploading ? 'Uploading Logo...' : saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 disabled:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <p className="text-sm sm:text-base mb-1"><strong>Company:</strong> {userProfile?.companyName}</p>
              <p className="text-sm sm:text-base mb-1"><strong>Email:</strong> {currentUser?.email}</p>
              {companyData?.booth && (
                <p className="text-sm sm:text-base mb-1"><strong>Booth:</strong> {companyData.booth}</p>
              )}
              {companyData?.description && (
                <div className="mt-3 mb-3">
                  <p className="text-sm font-medium mb-1">Description:</p>
                  <p className="text-sm text-gray-700">{companyData.description}</p>
                </div>
              )}
              {companyData?.MajorsHired && companyData.MajorsHired.length > 0 && (
                <div className="mt-3 mb-3">
                  <p className="text-sm font-medium mb-1">Majors Hired:</p>
                  <p className="text-sm text-gray-700">
                    {Array.isArray(companyData.MajorsHired) 
                      ? companyData.MajorsHired.join(', ') 
                      : companyData.MajorsHired}
                  </p>
                </div>
              )}
              {companyData?.YearsHired && companyData.YearsHired.length > 0 && (
                <div className="mt-3 mb-3">
                  <p className="text-sm font-medium mb-1">Years Hired:</p>
                  <p className="text-sm text-gray-700">
                    {Array.isArray(companyData.YearsHired) 
                      ? companyData.YearsHired.join(', ') 
                      : companyData.YearsHired}
                  </p>
                </div>
              )}
              {companyData?.SponsorVisa && (
                <div className="mt-3 mb-3">
                  <p className="text-sm font-medium mb-1">Sponsors H1B Visa:</p>
                  <p className="text-sm text-gray-700">{companyData.SponsorVisa}</p>
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t">
                <button
                  onClick={() => navigate('/resume-book')}
                  className="w-full sm:w-auto bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-sm sm:text-base"
                >
                  📖 View Event Resume Book
                </button>
                <p className="text-xs text-gray-600 mt-2">Access resumes from all students who opted into the event-wide resume book</p>
              </div>
            </>
          )}
        </div>

        {/* Flagged Resumes Section */}
        {flaggedResumes.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold mb-4">⭐ Flagged Resumes ({flaggedResumes.length})</h2>
            <div className="space-y-3 sm:space-y-4">
              {flaggedResumes.map(flag => (
                <div key={flag.flagId} className="border rounded p-3 sm:p-4 hover:bg-gray-50 bg-yellow-50 border-yellow-200">
                  <div className="flex flex-col gap-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-base sm:text-lg mb-1">{flag.studentName}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 mb-1">
                        <strong>Email:</strong> <span className="break-all">{flag.studentEmail}</span>
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600 mb-1">
                        <strong>Major:</strong> {flag.studentMajor}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600 mb-1">
                        <strong>Source:</strong> {flag.resumeType === 'resumeBook' ? 'Event Resume Book' : 'Company Submissions'}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => {
                          // Reconstruct resume object from flag data
                          // For resumeBook type: id should be studentId
                          // For resume type: id should be resumeId (resume document ID)
                          // If resumeId doesn't exist (old flags), try to extract from resumeIdentifier
                          let resumeId;
                          if (flag.resumeType === 'resumeBook') {
                            resumeId = flag.studentId;
                          } else {
                            // For resume type, use resumeId if available
                            // Otherwise try to extract from resumeIdentifier (format: resume_<id>)
                            if (flag.resumeId) {
                              resumeId = flag.resumeId;
                            } else if (flag.resumeIdentifier && flag.resumeIdentifier.startsWith('resume_')) {
                              resumeId = flag.resumeIdentifier.replace('resume_', '');
                            } else {
                              // Fallback: we'll need to find the resume document
                              // For now, use studentId but this might cause issues
                              resumeId = flag.studentId;
                            }
                          }
                          
                          const resumeData = {
                            id: resumeId,
                            studentId: flag.studentId,
                            studentName: flag.studentName,
                            studentEmail: flag.studentEmail,
                            studentMajor: flag.studentMajor,
                            resumeUrl: flag.resumeUrl,
                            resumeFileName: flag.resumeFileName,
                            fileUrl: flag.resumeUrl,
                            fileName: flag.resumeFileName
                          };
                          setSelectedResume(resumeData);
                          setSelectedResumeType(flag.resumeType);
                        }}
                        className="flex-1 bg-iise-navy text-white px-4 py-2 rounded hover:bg-iise-blue text-center text-sm"
                      >
                        View Resume & Comments
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resumes Section */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold">Resumes Submitted to Your Company</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded text-sm ${
                  filter === 'all' 
                    ? 'bg-iise-navy text-white' 
                    : 'bg-gray-200'
                }`}
              >
                All ({resumes.length})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded text-sm ${
                  filter === 'pending' 
                    ? 'bg-iise-navy text-white' 
                    : 'bg-gray-200'
                }`}
              >
                Pending
              </button>
            </div>
          </div>

          {filteredResumes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 text-sm sm:text-base mb-2">
                {resumes.length === 0 
                  ? 'No resumes submitted to your company yet.' 
                  : 'No resumes match this filter.'}
              </p>
              {resumes.length === 0 && (
                <p className="text-xs sm:text-sm text-gray-500">
                  Students can submit resumes to your company from the interactive map or their dashboard.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredResumes.map(resume => (
                <div key={resume.id} className="border rounded p-3 sm:p-4 hover:bg-gray-50">
                  <div className="flex flex-col gap-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-base sm:text-lg mb-1">{resume.studentName}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 mb-1">
                        <strong>Email:</strong> <span className="break-all">{resume.studentEmail}</span>
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600 mb-1">
                        <strong>Major:</strong> {resume.studentMajor}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600 mb-1">
                        <strong>Submitted:</strong> {resume.submittedAt?.toDate().toLocaleDateString()} at {resume.submittedAt?.toDate().toLocaleTimeString()}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600 break-all">
                        <strong>File:</strong> {resume.fileName}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => {
                          setSelectedResume(resume);
                          setSelectedResumeType('resume');
                        }}
                        className="flex-1 bg-iise-navy text-white px-4 py-2 rounded hover:bg-iise-blue text-center text-sm"
                      >
                        View & Comment
                      </button>
                      <a
                        href={resume.fileUrl}
                        download={resume.fileName}
                        className="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-center text-sm"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Resume Viewer Modal */}
      {selectedResume && (
        <ResumeViewer
          resume={selectedResume}
          resumeType={selectedResumeType}
          onClose={() => {
            setSelectedResume(null);
            setSelectedResumeType(null);
            // Reload data to refresh flags
            loadData();
          }}
        />
      )}
    </div>
  );
}

export default RecruiterDashboard;