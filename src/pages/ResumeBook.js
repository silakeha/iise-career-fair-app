import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ResumeViewer from '../components/ResumeViewer';

function ResumeBook() {
  const { currentUser, userRole, logout } = useAuth();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [companyResumes, setCompanyResumes] = useState([]);
  const [viewMode, setViewMode] = useState('all'); // 'all' or 'company'
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResume, setSelectedResume] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  const loadResumeBook = useCallback(async () => {
    try {
      // Load user profile to get company name
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
        const companyName = userDoc.data().companyName;
        
        // Find matching vendor
        const vendorsSnapshot = await getDocs(collection(db, 'vendors'));
        const matchingVendor = vendorsSnapshot.docs.find(
          d => d.data().name.toLowerCase() === companyName.toLowerCase()
        );
        
        if (matchingVendor) {
          // Load company-specific resumes
          const companyResumesQuery = query(
            collection(db, 'resumes'),
            where('vendorId', '==', matchingVendor.id)
          );
          const companyResumesSnapshot = await getDocs(companyResumesQuery);
          const companyResumesList = companyResumesSnapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
          }));
          setCompanyResumes(companyResumesList);
        }
      }
      
      // Load overall resume book
      const resumeBookSnapshot = await getDocs(collection(db, 'resumeBook'));
      const resumeList = resumeBookSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setResumes(resumeList);
    } catch (error) {
      console.error('Error loading resume book:', error);
    }
    setLoading(false);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || userRole !== 'recruiter') {
      navigate('/login');
      return;
    }

    loadResumeBook();
  }, [currentUser, userRole, navigate, loadResumeBook]);

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  const currentResumeList = viewMode === 'all' ? resumes : companyResumes;
  
  const filteredResumes = currentResumeList.filter(resume => {
    const search = searchTerm.toLowerCase();
    return (
      resume.studentName?.toLowerCase().includes(search) ||
      resume.studentEmail?.toLowerCase().includes(search) ||
      resume.studentMajor?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-xl">Loading resume book...</p>
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
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={() => navigate('/recruiter')}
              className="bg-white text-iise-navy px-3 py-1.5 sm:px-4 sm:py-2 rounded hover:bg-gray-100 text-sm"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => navigate('/')}
              className="bg-white text-iise-navy px-3 py-1.5 sm:px-4 sm:py-2 rounded hover:bg-gray-100 text-sm"
            >
              View Map
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-500 px-3 py-1.5 sm:px-4 sm:py-2 rounded hover:bg-red-600 text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-iise-navy/20 rounded-lg p-4 mb-6">
          <p className="text-sm sm:text-base text-gray-700">
            {viewMode === 'all' 
              ? 'This resume book contains resumes from students who opted to share their information with all recruiters at the event.'
              : `Viewing resumes submitted specifically to ${userProfile?.companyName || 'your company'}.`}
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">View Mode</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('all')}
                  className={`px-4 py-2 rounded text-sm font-medium ${
                    viewMode === 'all'
                      ? 'bg-iise-navy text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Overall Resume Book ({resumes.length})
                </button>
                <button
                  onClick={() => setViewMode('company')}
                  className={`px-4 py-2 rounded text-sm font-medium ${
                    viewMode === 'company'
                      ? 'bg-iise-navy text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Company Submissions ({companyResumes.length})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
          <label className="block text-sm font-medium mb-2">Search Students</label>
          <input
            type="text"
            placeholder="Search by name, email, or major..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border rounded text-sm sm:text-base"
          />
        </div>

        {/* Resume List */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold mb-4">
            All Resumes ({filteredResumes.length})
          </h2>

          {filteredResumes.length === 0 ? (
            <p className="text-gray-600 text-sm sm:text-base">
              {resumes.length === 0 
                ? 'No resumes in the book yet.' 
                : 'No resumes match your search.'}
            </p>
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
                      {resume.addedAt && (
                        <p className="text-xs sm:text-sm text-gray-600 mb-1">
                          <strong>Added:</strong> {resume.addedAt?.toDate().toLocaleDateString()}
                        </p>
                      )}
                      {resume.submittedAt && (
                        <p className="text-xs sm:text-sm text-gray-600 mb-1">
                          <strong>Submitted:</strong> {resume.submittedAt?.toDate().toLocaleDateString()}
                        </p>
                      )}
                      <p className="text-xs sm:text-sm text-gray-600 break-all">
                        <strong>File:</strong> {resume.resumeFileName || resume.fileName}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => {
                          setSelectedResume(resume);
                        }}
                        className="flex-1 bg-iise-navy text-white px-4 py-2 rounded hover:bg-iise-blue text-center text-sm"
                      >
                        View & Comment
                      </button>
                      <a
                        href={resume.resumeUrl || resume.fileUrl}
                        download={resume.resumeFileName || resume.fileName}
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
          resumeType={viewMode === 'all' ? 'resumeBook' : 'resume'}
          onClose={() => {
            setSelectedResume(null);
            // Reload to refresh flags/comments
            loadResumeBook();
          }}
        />
      )}
    </div>
  );
}

export default ResumeBook;