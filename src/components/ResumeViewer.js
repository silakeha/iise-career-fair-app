import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  getDoc,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

function ResumeViewer({ resume, resumeType = 'resumeBook', onClose }) {
  const { currentUser } = useAuth();
  const [isFlagged, setIsFlagged] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingComment, setSavingComment] = useState(false);
  const [flagId, setFlagId] = useState(null);

  // Determine resume identifier based on type
  const resumeIdentifier = resumeType === 'resumeBook' 
    ? `resumeBook_${resume.id}` 
    : `resume_${resume.id}`;

  const loadFlagAndComments = useCallback(async () => {
    try {
      setLoading(true);
      
      // Check if this resume is flagged by current recruiter
      const flagsQuery = query(
        collection(db, 'resumeFlags'),
        where('recruiterId', '==', currentUser.uid),
        where('resumeIdentifier', '==', resumeIdentifier)
      );
      const flagsSnapshot = await getDocs(flagsQuery);
      
      if (!flagsSnapshot.empty) {
        const flagDoc = flagsSnapshot.docs[0];
        setIsFlagged(true);
        setFlagId(flagDoc.id);
      } else {
        setIsFlagged(false);
        setFlagId(null);
      }

      // Load comments for this resume (only current recruiter's comments)
      const commentsQuery = query(
        collection(db, 'resumeComments'),
        where('resumeIdentifier', '==', resumeIdentifier),
        where('recruiterId', '==', currentUser.uid)
      );
      const commentsSnapshot = await getDocs(commentsQuery);
      
      const commentsList = [];
      for (const commentDoc of commentsSnapshot.docs) {
        const commentData = commentDoc.data();
        // Since comments are private, we know this is the current recruiter's comment
        // Get current recruiter info
        let recruiterName = 'You';
        let recruiterCompany = '';
        
        try {
          const recruiterDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (recruiterDoc.exists()) {
            const recruiterData = recruiterDoc.data();
            recruiterName = recruiterData?.name || 'You';
            recruiterCompany = recruiterData?.companyName || '';
          }
        } catch (error) {
          console.warn('Error fetching recruiter info:', error);
        }
        
        commentsList.push({
          id: commentDoc.id,
          ...commentData,
          recruiterName,
          recruiterCompany
        });
      }
      
      // Sort comments by timestamp (newest first)
      commentsList.sort((a, b) => {
        const aTime = a.createdAt?.toMillis() || 0;
        const bTime = b.createdAt?.toMillis() || 0;
        return bTime - aTime;
      });
      
      setComments(commentsList);
    } catch (error) {
      console.error('Error loading flag and comments:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser.uid, resumeIdentifier]);

  useEffect(() => {
    loadFlagAndComments();
  }, [loadFlagAndComments]);

  async function handleToggleFlag() {
    try {
      if (isFlagged) {
        // Unflag - delete the flag document
        if (flagId) {
          await deleteDoc(doc(db, 'resumeFlags', flagId));
          setIsFlagged(false);
          setFlagId(null);
        }
      } else {
        // Flag - create a flag document
        const flagData = {
          recruiterId: currentUser.uid,
          resumeIdentifier: resumeIdentifier,
          resumeId: resume.id, // Store the resume document ID for reconstruction
          studentId: resume.studentId || (resumeType === 'resumeBook' ? resume.id : null),
          studentName: resume.studentName,
          studentEmail: resume.studentEmail,
          studentMajor: resume.studentMajor,
          resumeUrl: resume.resumeUrl || resume.fileUrl,
          resumeFileName: resume.resumeFileName || resume.fileName,
          resumeType: resumeType,
          flaggedAt: serverTimestamp()
        };
        
        const flagRef = await addDoc(collection(db, 'resumeFlags'), flagData);
        setIsFlagged(true);
        setFlagId(flagRef.id);
      }
    } catch (error) {
      console.error('Error toggling flag:', error);
      alert('Error updating flag: ' + error.message);
    }
  }

  async function handleAddComment(e) {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSavingComment(true);
      
      const commentData = {
        recruiterId: currentUser.uid,
        resumeIdentifier: resumeIdentifier,
        studentId: resume.studentId || (resumeType === 'resumeBook' ? resume.id : null),
        studentName: resume.studentName,
        comment: newComment.trim(),
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'resumeComments'), commentData);
      setNewComment('');
      
      // Reload comments
      await loadFlagAndComments();
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Error adding comment: ' + error.message);
    } finally {
      setSavingComment(false);
    }
  }

  const resumeUrl = resume.resumeUrl || resume.fileUrl;
  const resumeFileName = resume.resumeFileName || resume.fileName;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-iise-navy text-white p-4 flex justify-between items-center">
          <div className="flex-1">
            <h2 className="text-lg font-bold">{resume.studentName}</h2>
            <p className="text-sm opacity-90">{resume.studentEmail}</p>
            <p className="text-sm opacity-90">Major: {resume.studentMajor}</p>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={handleToggleFlag}
              className={`px-4 py-2 rounded text-sm font-medium ${
                isFlagged 
                  ? 'bg-yellow-500 hover:bg-yellow-600' 
                  : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              {isFlagged ? '⭐ Flagged' : '☆ Flag'}
            </button>
            <button
              onClick={onClose}
              className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded text-sm"
            >
              Close
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* PDF Viewer */}
          <div className="flex-1 overflow-auto bg-gray-100 p-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <p>Loading...</p>
              </div>
            ) : (
              <div className="bg-white shadow-lg rounded">
                <iframe
                  src={resumeUrl}
                  className="w-full h-full min-h-[600px]"
                  title={resumeFileName}
                  style={{ border: 'none' }}
                />
              </div>
            )}
          </div>

          {/* Comments Sidebar */}
          <div className="w-80 bg-white border-l flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-bold text-lg">My Comments</h3>
              <p className="text-sm text-gray-600">{comments.length} comment{comments.length !== 1 ? 's' : ''}</p>
              <p className="text-xs text-gray-500 mt-1">Comments are private to you</p>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments.length === 0 ? (
                <p className="text-gray-500 text-sm">No comments yet. Be the first to comment!</p>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="border rounded p-3 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-sm">{comment.recruiterName}</p>
                        <p className="text-xs text-gray-600">{comment.recruiterCompany}</p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {comment.createdAt?.toDate().toLocaleDateString()} {comment.createdAt?.toDate().toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800">{comment.comment}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Form */}
            <div className="p-4 border-t">
              <form onSubmit={handleAddComment} className="space-y-2">
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full p-2 border rounded text-sm resize-none"
                  rows="3"
                  disabled={savingComment}
                />
                <button
                  type="submit"
                  disabled={savingComment || !newComment.trim()}
                  className="w-full bg-iise-navy text-white px-4 py-2 rounded hover:bg-iise-blue disabled:bg-gray-400 text-sm"
                >
                  {savingComment ? 'Adding...' : 'Add Comment'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResumeViewer;
