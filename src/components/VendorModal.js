import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

function VendorModal({ vendor, onClose, onSubmitResume, userRole, onFlagChange }) {
  const { currentUser } = useAuth();
  const [isFlagged, setIsFlagged] = useState(false);
  const [flagId, setFlagId] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const isStudent = userRole === 'student';

  useEffect(() => {
    if (isStudent && vendor && currentUser) {
      checkFlagStatus();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendor?.id, currentUser?.uid, isStudent]);

  async function checkFlagStatus() {
    try {
      setLoading(true);
      const flagsQuery = query(
        collection(db, 'companyFlags'),
        where('studentId', '==', currentUser.uid),
        where('companyId', '==', vendor.id)
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
    } catch (error) {
      console.error('Error checking flag status:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleFlag() {
    if (!isStudent || !currentUser) return;
    
    try {
      if (isFlagged) {
        // Unflag - delete the flag document
        if (flagId) {
          await deleteDoc(doc(db, 'companyFlags', flagId));
          setIsFlagged(false);
          setFlagId(null);
          if (onFlagChange) onFlagChange();
        }
      } else {
        // Flag - create a flag document
        const flagData = {
          studentId: currentUser.uid,
          companyId: vendor.id,
          companyName: vendor.name,
          flaggedAt: serverTimestamp()
        };
        
        const flagRef = await addDoc(collection(db, 'companyFlags'), flagData);
        setIsFlagged(true);
        setFlagId(flagRef.id);
        if (onFlagChange) onFlagChange();
      }
    } catch (error) {
      console.error('Error toggling flag:', error);
      alert('Error updating flag: ' + error.message);
    }
  }

  if (!vendor) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
    >
      <div className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex-1">{vendor.name}</h2>
          <div className="flex gap-2 items-center">
            {isStudent && (
              <button
                onClick={handleToggleFlag}
                disabled={loading}
                className={`px-3 py-1.5 rounded text-sm font-medium ${
                  isFlagged 
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                } disabled:opacity-50`}
                title={isFlagged ? 'Unflag company' : 'Flag company'}
              >
                {isFlagged ? '⭐ Flagged' : '☆ Flag'}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-3xl leading-none flex-shrink-0"
            >
              ×
            </button>
          </div>
        </div>

        {vendor.logo && (
          <div className="flex justify-center mb-4 -mt-2">
            <img 
              src={vendor.logo} 
              alt={vendor.name}
              className="w-56 h-56 sm:w-72 sm:h-72 object-contain"
            />
          </div>
        )}

        {vendor.description && (
          <div className="mb-6">
            <p className="text-gray-700 text-base sm:text-lg leading-relaxed">
              {vendor.description}
            </p>
          </div>
        )}

        <div className="border-t border-gray-200 pt-4 mb-4">
          <div className="space-y-3">
            {vendor.MajorsHired && vendor.MajorsHired.length > 0 && (
              <p className="text-gray-600 text-sm sm:text-base">
                <strong className="text-gray-800">Majors Sought:</strong> {vendor.MajorsHired.join(', ')}
              </p>
            )}
            {vendor.Industry && (
              <p className="text-gray-600 text-sm sm:text-base">
                <strong className="text-gray-800">Industry:</strong> {vendor.Industry}
              </p>
            )}
            {vendor.PositionTypes && vendor.PositionTypes.length > 0 && (
              <p className="text-gray-600 text-sm sm:text-base">
                <strong className="text-gray-800">Position Types:</strong> {vendor.PositionTypes.join(', ')}
              </p>
            )}
            {vendor.PositionsHiring && vendor.PositionsHiring.length > 0 && (
              <p className="text-gray-600 text-sm sm:text-base">
                <strong className="text-gray-800">Positions Hiring:</strong> {vendor.PositionsHiring.join(', ')}
              </p>
            )}
            {vendor.YearsHired && vendor.YearsHired.length > 0 && (
              <p className="text-gray-600 text-sm sm:text-base">
                <strong className="text-gray-800">Anticipated Graduation Dates Hiring For:</strong> {vendor.YearsHired.join(', ')}
              </p>
            )}
            {vendor.SponsorVisa && (
              <p className="text-gray-600 text-sm sm:text-base">
                <strong className="text-gray-800">Sponsors H1B Visa:</strong> {vendor.SponsorVisa}
              </p>
            )}
          </div>
        </div>

        {onSubmitResume && typeof onSubmitResume === 'function' && (
          <button
            onClick={() => onSubmitResume(vendor)}
            className="w-full bg-iise-navy text-white py-2 sm:py-3 px-4 rounded hover:bg-iise-blue text-sm sm:text-base"
          >
            Submit Resume
          </button>
        )}
      </div>
    </div>
  );
}

export default VendorModal;
