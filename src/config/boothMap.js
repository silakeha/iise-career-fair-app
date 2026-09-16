// Booth number to coordinate mapping
// Format: { boothNumber: { x: number, y: number } }
// Coordinates are based on the floor plan image dimensions (1188 x 1266)

export const BOOTH_COORDINATES = {
  // Coordinates converted from bottom-left origin to top-left origin
  // Image height is 1266, so: newY = 1266 - oldY
  '1': { x: 700, y: 1156 },   // 1266 - 110 = 1156
  '2': { x: 817, y: 1156 },   // 1266 - 110 = 1156
  '3': { x: 935, y: 1161 },   // 1266 - 105 = 1161
  '4': { x: 1090, y: 636 },   // 1266 - 630 = 636
  '5': { x: 1090, y: 791 },   // 1266 - 475 = 791
  '6': { x: 1090, y: 961 },   // 1266 - 305 = 961
  '7': { x: 1090, y: 1109 },  // 1266 - 157 = 1109
  '8': { x: 140, y: 1070 },   // 1266 - 196 = 1070
  '9': { x: 140, y: 916 },    // 1266 - 350 = 916
  '10': { x: 140, y: 756 },   // 1266 - 510 = 756
  '11': { x: 140, y: 616 },   // 1266 - 650 = 616
  '12': { x: 230, y: 1156 },  // 1266 - 110 = 1156
  '13': { x: 340, y: 1156 },  // 1266 - 110 = 1156
  '14': { x: 440, y: 1156 },  // 1266 - 110 = 1156
  '15': { x: 455, y: 636 },   // 1266 - 630 = 636
  '16': { x: 455, y: 741 },   // 1266 - 525 = 741
  '17': { x: 455, y: 851 },   // 1266 - 415 = 851
  '18': { x: 800, y: 636 },   // 1266 - 630 = 636
  '19': { x: 800, y: 741 },   // 1266 - 525 = 741
  '20': { x: 800, y: 851 },   // 1266 - 415 = 851
};

// Store Firebase floor plan data (will be set dynamically)
let firebaseBoothCoordinates = null;

// Set Firebase booth coordinates (called from components that load from Firebase)
export function setFirebaseBoothCoordinates(coordinates) {
  firebaseBoothCoordinates = coordinates;
}

// Get available booth numbers as an array
export function getAvailableBooths() {
  const coords = firebaseBoothCoordinates || BOOTH_COORDINATES;
  return Object.keys(coords).sort((a, b) => parseInt(a) - parseInt(b));
}

// Get coordinates for a specific booth number
// Uses Firebase data if available, falls back to static data
export function getBoothCoordinates(boothNumber) {
  const coords = firebaseBoothCoordinates || BOOTH_COORDINATES;
  return coords[boothNumber] || null;
}

// Check if a booth number exists
export function isValidBooth(boothNumber) {
  const coords = firebaseBoothCoordinates || BOOTH_COORDINATES;
  return boothNumber in coords;
}
