import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, addDoc, query, where, getDocs, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

function StudentDashboard() {
  const { currentUser, userRole, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [vendors, setVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [submittedResumes, setSubmittedResumes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [addToResumeBook, setAddToResumeBook] = useState(false);
  const [isInResumeBook, setIsInResumeBook] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      }

      // Check if student is already in resume book
      const resumeBookDoc = await getDoc(doc(db, 'resumeBook', currentUser.uid));
      setIsInResumeBook(resumeBookDoc.exists());

      const vendorsSnapshot = await getDocs(collection(db, 'vendors'));
      const vendorList = vendorsSnapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setVendors(vendorList);

      const resumesQuery = query(
        collection(db, 'resumes'),
        where('studentId', '==', currentUser.uid)
      );
      const resumesSnapshot = await getDocs(resumesQuery);
      const resumesList = await Promise.all(
        resumesSnapshot.docs.map(async (resumeDoc) => {
          const resumeData = resumeDoc.data();
          const vendorDoc = await getDoc(doc(db, 'vendors', resumeData.vendorId));
          return {
            id: resumeDoc.id,
            ...resumeData,
            vendorName: vendorDoc.exists() ? vendorDoc.data().name : 'Unknown'
          };
        })
      );
      setSubmittedResumes(resumesList);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || userRole !== 'student') {
      navigate('/login');
      return;
    }

    loadData();

    if (location.state?.selectedVendor) {
      setSelectedVendorId(location.state.selectedVendor.id);
    }
  }, [currentUser, userRole, navigate, location, loadData]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!resumeFile) {
      setMessage('Please select a resume file to upload');
      return;
    }
    if (!selectedVendorId && !addToResumeBook) {
      setMessage('Please select a company and/or add your resume to the event resume book');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Use a fixed path per student so re-uploads override everywhere
      const fileRef = ref(storage, `resumes/${currentUser.uid}/resume`);
      await uploadBytes(fileRef, resumeFile);
      const fileUrl = await getDownloadURL(fileRef);
      const fileName = resumeFile.name;
      const now = new Date();
      const studentData = {
        studentId: currentUser.uid,
        studentEmail: currentUser.email,
        studentName: userProfile?.name || 'Unknown',
        studentMajor: userProfile?.major || 'Unknown'
      };

      // Update all existing resume submissions for this student to the new file (override everywhere)
      const resumesQuery = query(
        collection(db, 'resumes'),
        where('studentId', '==', currentUser.uid)
      );
      const resumesSnapshot = await getDocs(resumesQuery);
      for (const resumeDoc of resumesSnapshot.docs) {
        await updateDoc(resumeDoc.ref, {
          fileUrl,
          fileName,
          studentName: studentData.studentName,
          studentMajor: studentData.studentMajor,
          submittedAt: now
        });
      }

      // If submitting to a company: update existing or create new
      if (selectedVendorId) {
        const existing = submittedResumes.find(r => r.vendorId === selectedVendorId);
        if (existing) {
          await updateDoc(doc(db, 'resumes', existing.id), {
            fileUrl,
            fileName,
            studentName: studentData.studentName,
            studentMajor: studentData.studentMajor,
            submittedAt: now
          });
        } else {
          await addDoc(collection(db, 'resumes'), {
            ...studentData,
            vendorId: selectedVendorId,
            fileUrl,
            fileName,
            submittedAt: now,
            status: 'pending'
          });
        }
      }

      // Add or update event resume book
      const resumeBookRef = doc(db, 'resumeBook', currentUser.uid);
      const existingBook = await getDoc(resumeBookRef);
      if (addToResumeBook || !selectedVendorId) {
        // Create or update resume book entry (resume-book-only or checkbox checked)
        await setDoc(resumeBookRef, {
          ...studentData,
          resumeUrl: fileUrl,
          resumeFileName: fileName,
          addedAt: existingBook.exists() ? existingBook.data().addedAt : now
        });
        setIsInResumeBook(true);
      } else if (existingBook.exists()) {
        // Override: they uploaded to a company only; still update resume book if they're in it
        await updateDoc(resumeBookRef, {
          resumeUrl: fileUrl,
          resumeFileName: fileName,
          studentName: studentData.studentName,
          studentMajor: studentData.studentMajor
        });
      }

      const parts = [];
      if (selectedVendorId) parts.push('Company submission updated.');
      if (addToResumeBook || !selectedVendorId) parts.push('Event resume book updated.');
      setMessage('Resume uploaded successfully! ' + parts.join(' '));
      setResumeFile(null);
      setSelectedVendorId('');
      setAddToResumeBook(false);

      const fileInput = document.getElementById('resumeInput');
      if (fileInput) fileInput.value = '';

      await loadData();
    } catch (error) {
      console.error('Error submitting resume:', error);
      setMessage('Error submitting resume: ' + error.message);
    }

    setLoading(false);
  }

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
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
            <span className="text-xs sm:text-sm">{currentUser?.email}</span>
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
        {/* Profile Section */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Your Profile</h2>
          <p className="text-sm sm:text-base mb-1"><strong>Name:</strong> {userProfile?.name || 'Not set'}</p>
          <p className="text-sm sm:text-base mb-1"><strong>Major:</strong> {userProfile?.major || 'Not set'}</p>
          <p className="text-sm sm:text-base mb-2"><strong>Email:</strong> {currentUser?.email}</p>
          {isInResumeBook && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mt-3 text-sm">
              ✓ Your resume is in the event-wide resume book
            </div>
          )}
        </div>

        {/* Submit Resume Section */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Submit Resume</h2>
          
          {message && (
            <div className={`p-3 rounded mb-4 text-sm ${
              message.includes('success') 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Upload Resume (PDF only)
              </label>
              <input
                id="resumeInput"
                type="file"
                accept=".pdf"
                onChange={(e) => setResumeFile(e.target.files[0])}
                className="w-full p-2 border rounded text-sm"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                You can re-upload anytime; your new resume will replace the previous one everywhere (all companies and resume book).
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Optional: Submit to a specific company
              </label>
              <select
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                className="w-full p-2 border rounded text-sm sm:text-base"
              >
                <option value="">None — resume book only</option>
                {vendors.map(vendor => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name} - Booth {vendor.booth}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={addToResumeBook}
                  onChange={(e) => setAddToResumeBook(e.target.checked)}
                  className="mt-1 mr-3"
                />
                <span className="text-sm">
                  <strong>Add my resume to the event-wide resume book</strong>
                  <br />
                  <span className="text-gray-600">
                    Visible to all recruiters at the event. You can check this with or without selecting a company above.
                  </span>
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-iise-navy text-white px-6 py-2 rounded hover:bg-iise-blue disabled:bg-gray-400 text-sm sm:text-base"
            >
              {loading ? 'Submitting...' : 'Submit Resume'}
            </button>
          </form>
        </div>

        {/* Submitted Resumes Section */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Your Submissions</h2>
          
          {submittedResumes.length === 0 ? (
            <p className="text-gray-600 text-sm sm:text-base">You have not submitted any resumes yet.</p>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {submittedResumes.map(resume => (
                <div key={resume.id} className="border rounded p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-base sm:text-lg">{resume.vendorName}</h3>
                      <p className="text-xs sm:text-sm text-gray-600">
                        Submitted: {resume.submittedAt?.toDate().toLocaleDateString()}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600 break-all">
                        File: {resume.fileName}
                      </p>
                    </div>
                    <a
                      href={resume.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 text-sm text-center"
                    >
                      View Resume
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;