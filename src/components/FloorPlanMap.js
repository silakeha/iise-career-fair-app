import React, { useEffect, useRef } from 'react';
import { MapContainer, ImageOverlay, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function SetViewOnLoad({ bounds, imageWidth, imageHeight }) {
  const map = useMap();
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    function doFit() {
      if (!map || !isMountedRef.current || !map.getContainer()?.parentNode) return;
      try {
        const el = map.getContainer();
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        if (w <= 0 || h <= 0) return;
        const bW = imageWidth ?? 1266;
        const bH = imageHeight ?? 1188;
        // Use uniform scale so the image is never stretched to 1:1: scale = min(w/bW, h/bH)
        // In CRS.Simple, scale(zoom) = 2^zoom, so zoom = log2(scale)
        const scale = Math.min(w / bW, h / bH);
        const zoom = Math.log2(Math.max(scale, 0.01)); // clamp scale from below
        const center = [bH / 2, bW / 2];
        map.setView(center, zoom);
      } catch (e) {
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }

    doFit();
    const t = setTimeout(doFit, 100);
    const el = map?.getContainer();
    if (el && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(doFit);
      ro.observe(el);
      return () => {
        clearTimeout(t);
        ro.disconnect();
      };
    }
    return () => clearTimeout(t);
  }, [map, bounds, imageWidth, imageHeight]);

  return null;
}

const DEFAULT_IMAGE_WIDTH = 1266;
const DEFAULT_IMAGE_HEIGHT = 1188;

function FloorPlanMap({ vendors, onVendorClick, floorPlanImageUrl, imageWidth, imageHeight }) {
  const mapInstanceRef = useRef(null);
  const isMountedRef = useRef(true);

  const width = imageWidth ?? DEFAULT_IMAGE_WIDTH;
  const height = imageHeight ?? DEFAULT_IMAGE_HEIGHT;
  const bounds = [[0, 0], [height, width]];
  const center = [height / 2, width / 2];
  const imageUrl = floorPlanImageUrl || '/floor-plan.png';

  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      
      // Clean up map instance
      if (mapInstanceRef.current) {
        try {
          const map = mapInstanceRef.current;
          // Remove all event listeners
          map.off();
          // Remove the map from DOM
          map.remove();
        } catch (error) {
          // Silently handle cleanup errors
        }
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="h-full w-full">
      <MapContainer
        center={center}
        zoom={-1}
        minZoom={-2}
        maxZoom={1}
        crs={L.CRS.Simple}
        style={{ height: '100%', width: '100%', background: '#e5e7eb' }}
        zoomControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        touchZoom={true}
        whenCreated={(mapInstance) => {
          mapInstanceRef.current = mapInstance;
        }}
      >
        <SetViewOnLoad bounds={bounds} imageWidth={width} imageHeight={height} />
        <ImageOverlay
          key={imageUrl}
          url={imageUrl}
          bounds={bounds}
        />
        {vendors.map(vendor => {
          const color = vendor.boothColor || '#2563eb';
          const boothLabel = vendor.booth != null && vendor.booth !== '' ? String(vendor.booth) : '—';
          // Pin-shaped marker (same shape as default Leaflet marker), colored by booth, with booth number inside
          const icon = L.divIcon({
            className: 'booth-marker',
            html: `<div style="position:relative;width:25px;height:41px;">
              <svg width="25" height="41" viewBox="0 0 25 41" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));">
                <path fill="${color}" stroke="white" stroke-width="1.5" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z"/>
                <text x="12.5" y="15" text-anchor="middle" fill="white" font-size="9" font-weight="bold" font-family="system-ui,sans-serif">${boothLabel}</text>
              </svg>
            </div>`,
            iconSize: [25, 41],
            iconAnchor: [12.5, 41],
          });
          return (
            <Marker
              key={vendor.id}
              position={[vendor.y, vendor.x]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  if (isMountedRef.current) {
                    onVendorClick(vendor);
                  }
                }
              }}
            >
              <Popup>
                <div className="text-center">
                  <strong className="text-lg">{vendor.name}</strong>
                  <br />
                  <span className="text-sm text-gray-600">Booth: {vendor.booth}</span>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

export default FloorPlanMap;