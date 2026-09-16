import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

function FloorPlanConfig() {
  const { currentUser, userRole, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const [floorPlanImage, setFloorPlanImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageWidthInput, setImageWidthInput] = useState('');
  const [imageHeightInput, setImageHeightInput] = useState('');
  const [numBooths, setNumBooths] = useState('');
  const [boothCoordinates, setBoothCoordinates] = useState({});
  const [currentFloorPlan, setCurrentFloorPlan] = useState(null);

  React.useEffect(() => {
    if (!currentUser || userRole !== 'organizer') {
      navigate('/login');
      return;
    }
    loadCurrentFloorPlan();
  }, [currentUser, userRole, navigate]);

  function getImageDimensions(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Could not load image to read dimensions'));
      };
      img.src = objectUrl;
    });
  }

  async function loadCurrentFloorPlan() {
    try {
      const floorPlanDoc = await getDoc(doc(db, 'config', 'floorPlan'));
      if (floorPlanDoc.exists()) {
        const data = floorPlanDoc.data();
        setCurrentFloorPlan(data);
        if (data.imageUrl) {
          setImagePreview(data.imageUrl);
        }
        if (data.boothCoordinates) {
          setBoothCoordinates(data.boothCoordinates);
          setNumBooths(Object.keys(data.boothCoordinates).length.toString());
        }
        if (data.imageWidth != null) setImageWidthInput(String(data.imageWidth));
        if (data.imageHeight != null) setImageHeightInput(String(data.imageHeight));
      }
    } catch (error) {
      console.error('Error loading floor plan:', error);
    }
  }

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (file) {
      setFloorPlanImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleNumBoothsChange(e) {
    const num = parseInt(e.target.value) || 0;
    setNumBooths(e.target.value);
    
    // Initialize booth coordinates
    const newCoordinates = {};
    for (let i = 1; i <= num; i++) {
      const boothKey = i.toString();
      newCoordinates[boothKey] = boothCoordinates[boothKey] || { x: '', y: '' };
    }
    
    // Remove booths beyond the new number
    Object.keys(boothCoordinates).forEach(key => {
      if (parseInt(key) > num) {
        delete newCoordinates[key];
      }
    });
    
    setBoothCoordinates(newCoordinates);
  }

  function handleCoordinateChange(boothNumber, coordinate, value) {
    setBoothCoordinates(prev => ({
      ...prev,
      [boothNumber]: {
        ...prev[boothNumber],
        [coordinate]: value
      }
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (!floorPlanImage && !currentFloorPlan?.imageUrl) {
        setError('Please upload a floor plan image');
        setLoading(false);
        return;
      }

      if (!numBooths || parseInt(numBooths) === 0) {
        setError('Please enter the number of booths');
        setLoading(false);
        return;
      }

      // Validate all coordinates are filled
      const numBoothsInt = parseInt(numBooths);
      for (let i = 1; i <= numBoothsInt; i++) {
        const boothKey = i.toString();
        const coords = boothCoordinates[boothKey];
        if (!coords || !coords.x || !coords.y) {
          setError(`Please fill in coordinates for booth ${i}`);
          setLoading(false);
          return;
        }
        if (isNaN(parseFloat(coords.x)) || isNaN(parseFloat(coords.y))) {
          setError(`Invalid coordinates for booth ${i}`);
          setLoading(false);
          return;
        }
      }

      let imageUrl = currentFloorPlan?.imageUrl;
      let imageWidth = currentFloorPlan?.imageWidth ?? 1266;
      let imageHeight = currentFloorPlan?.imageHeight ?? 1188;

      // Use manual dimensions if both entered; else auto-detect from new upload; else keep current
      const manualW = imageWidthInput.trim() ? parseInt(imageWidthInput, 10) : NaN;
      const manualH = imageHeightInput.trim() ? parseInt(imageHeightInput, 10) : NaN;
      if (!Number.isNaN(manualW) && !Number.isNaN(manualH) && manualW > 0 && manualH > 0) {
        imageWidth = manualW;
        imageHeight = manualH;
      } else if (floorPlanImage) {
        const dimensions = await getImageDimensions(floorPlanImage);
        imageWidth = dimensions.width;
        imageHeight = dimensions.height;
      }

      if (floorPlanImage) {
        const imageRef = ref(storage, `floor-plans/${Date.now()}_${floorPlanImage.name}`);
        await uploadBytes(imageRef, floorPlanImage);
        imageUrl = await getDownloadURL(imageRef);
      }

      // Prepare booth coordinates object with proper types (in original image scale)
      const formattedCoordinates = {};
      Object.keys(boothCoordinates).forEach(key => {
        const coords = boothCoordinates[key];
        formattedCoordinates[key] = {
          x: parseFloat(coords.x),
          y: parseFloat(coords.y)
        };
      });

      // If image is too large for the map area, scale dimensions and all booth coords proportionally
      const MAX_MAP_DIMENSION = 2000;
      const maxSize = Math.max(imageWidth, imageHeight);
      let scale = 1;
      if (maxSize > MAX_MAP_DIMENSION) {
        scale = MAX_MAP_DIMENSION / maxSize;
        imageWidth = Math.round(imageWidth * scale);
        imageHeight = Math.round(imageHeight * scale);
        Object.keys(formattedCoordinates).forEach(key => {
          const c = formattedCoordinates[key];
          formattedCoordinates[key] = {
            x: Math.round(c.x * scale * 100) / 100,
            y: Math.round(c.y * scale * 100) / 100
          };
        });
      }

      // Save to Firebase (image URL, dimensions, booth coords; vendors get x,y from booth below)
      await setDoc(doc(db, 'config', 'floorPlan'), {
        imageUrl: imageUrl,
        imageWidth: imageWidth,
        imageHeight: imageHeight,
        boothCoordinates: formattedCoordinates,
        numBooths: numBoothsInt,
        updatedAt: new Date(),
        updatedBy: currentUser.uid
      });

      // Update each vendor document with new x,y from their booth number
      const vendorsSnap = await getDocs(collection(db, 'vendors'));
      let updatedCount = 0;
      for (const vendorDoc of vendorsSnap.docs) {
        const data = vendorDoc.data();
        const boothKey = data.booth != null ? String(data.booth) : '';
        const coords = boothKey ? formattedCoordinates[boothKey] : null;
        if (coords) {
          await updateDoc(vendorDoc.ref, { x: coords.x, y: coords.y });
          updatedCount += 1;
        }
      }

      setMessage(
        updatedCount > 0
          ? `Floor plan saved. Updated ${updatedCount} vendor position${updatedCount !== 1 ? 's' : ''} to match new booth coordinates.`
          : 'Floor plan configuration saved successfully!'
      );
      
      // Reset form after a delay
      setTimeout(() => {
        setFloorPlanImage(null);
        setNumBooths('');
        setBoothCoordinates({});
        loadCurrentFloorPlan();
      }, 2000);
    } catch (err) {
      console.error('Error saving floor plan:', err);
      setError(err.message || 'Failed to save floor plan configuration');
    } finally {
      setLoading(false);
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
                onClick={() => navigate('/organizer')}
                className="flex-1 sm:flex-none bg-white text-iise-navy px-3 py-1.5 sm:px-4 sm:py-2 rounded hover:bg-gray-100 text-sm"
              >
                Back to Dashboard
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
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">Floor Plan Configuration</h1>

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

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
          {/* Image Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Floor Plan Image *</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full p-2 border rounded"
            />
            {imagePreview && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Preview:</p>
                <img 
                  src={imagePreview} 
                  alt="Floor plan preview" 
                  className="max-w-full h-auto border rounded"
                  style={{ maxHeight: '400px' }}
                />
              </div>
            )}
            {currentFloorPlan?.imageUrl && !imagePreview && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Current floor plan:</p>
                <img 
                  src={currentFloorPlan.imageUrl} 
                  alt="Current floor plan" 
                  className="max-w-full h-auto border rounded"
                  style={{ maxHeight: '400px' }}
                />
              </div>
            )}
          </div>

          {/* Image dimensions (optional) – ensures correct aspect ratio on the map */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Image dimensions (optional)</label>
            <p className="text-xs text-gray-500 mb-2">
              Enter width and height in pixels so the map displays with the correct aspect ratio. Leave blank to auto-detect from the uploaded image.
            </p>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">Width (px)</label>
                <input
                  type="number"
                  min="1"
                  value={imageWidthInput}
                  onChange={(e) => setImageWidthInput(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="e.g. 1920"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">Height (px)</label>
                <input
                  type="number"
                  min="1"
                  value={imageHeightInput}
                  onChange={(e) => setImageHeightInput(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="e.g. 1080"
                />
              </div>
            </div>
          </div>

          {/* Number of Booths */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Number of Booths *</label>
            <input
              type="number"
              min="1"
              value={numBooths}
              onChange={handleNumBoothsChange}
              className="w-full p-2 border rounded"
              placeholder="Enter number of booths"
              required
            />
          </div>

          {/* Booth Coordinates */}
          {numBooths && parseInt(numBooths) > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium mb-4">Booth Coordinates *</label>
              <div className="space-y-4 max-h-96 overflow-y-auto border rounded p-4">
                {Array.from({ length: parseInt(numBooths) }, (_, i) => {
                  const boothNumber = (i + 1).toString();
                  const coords = boothCoordinates[boothNumber] || { x: '', y: '' };
                  return (
                    <div key={boothNumber} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center border-b pb-3">
                      <div className="font-semibold text-sm sm:text-base min-w-[80px]">
                        Booth {boothNumber}:
                      </div>
                      <div className="flex gap-3 flex-1">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-600 mb-1">X Coordinate</label>
                          <input
                            type="number"
                            step="0.01"
                            value={coords.x}
                            onChange={e => handleCoordinateChange(boothNumber, 'x', e.target.value)}
                            className="w-full p-2 border rounded"
                            placeholder="X"
                            required
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-600 mb-1">Y Coordinate</label>
                          <input
                            type="number"
                            step="0.01"
                            value={coords.y}
                            onChange={e => handleCoordinateChange(boothNumber, 'y', e.target.value)}
                            className="w-full p-2 border rounded"
                            placeholder="Y"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Tip: Click on the floor plan image to find coordinates, or use an image editor to get pixel coordinates.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-iise-navy text-white p-3 rounded hover:bg-iise-blue disabled:bg-gray-400 text-lg font-semibold"
          >
            {loading ? 'Saving...' : 'Save Floor Plan Configuration'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default FloorPlanConfig;
