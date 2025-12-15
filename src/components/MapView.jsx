import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatDate } from '../lib/dateUtils';

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconRetinaUrl: iconRetina,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Create colored circle markers for start/finish
function createCircleMarker(color) {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

const finishMarkerIcon = createCircleMarker('#ef4444'); // Red

// Create bib image marker
function createBibMarker(bibImageUrl) {
  return L.divIcon({
    className: 'custom-bib-marker',
    html: `
      <div style="
        width: 120px;
        height: 80px;
        border-radius: 8px;
        overflow: hidden;
        border: 3px solid white;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        background: white;
      ">
        <img 
          src="${bibImageUrl}" 
          alt="Bib" 
          style="
            width: 100%;
            height: 100%;
            object-fit: cover;
          "
        />
      </div>
    `,
    iconSize: [120, 80],
    iconAnchor: [60, 40],
    popupAnchor: [0, -40],
  });
}

/**
 * Component to fit map bounds to all routes
 */
function FitBounds({ bounds }) {
  const map = useMap();
  
  useEffect(() => {
    if (bounds && map) {
      // Add padding to bounds
      const padding = 0.05; // 5% padding
      const latPadding = (bounds.maxLat - bounds.minLat) * padding;
      const lonPadding = (bounds.maxLon - bounds.minLon) * padding;
      
      map.fitBounds([
        [bounds.minLat - latPadding, bounds.minLon - lonPadding],
        [bounds.maxLat + latPadding, bounds.maxLon + lonPadding]
      ], {
        padding: [20, 20],
        maxZoom: 15
      });
    }
  }, [bounds, map]);
  
  return null;
}

/**
 * Calculate bounding box for multiple sets of coordinates
 */
function calculateBoundsForAllRoutes(entriesWithRoutes) {
  if (!entriesWithRoutes || entriesWithRoutes.length === 0) {
    return null;
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;

  entriesWithRoutes.forEach(entry => {
    if (entry.routeData?.coordinates && entry.routeData.coordinates.length > 0) {
      entry.routeData.coordinates.forEach(coord => {
        minLat = Math.min(minLat, coord.lat);
        maxLat = Math.max(maxLat, coord.lat);
        minLon = Math.min(minLon, coord.lon);
        maxLon = Math.max(maxLon, coord.lon);
      });
    }
  });

  if (minLat === Infinity) return null;

  return {
    minLat,
    maxLat,
    minLon,
    maxLon,
  };
}

/**
 * Map view component showing all GPX routes
 */
export function MapView({ entries, onViewRace }) {

  // Filter entries that have route data
  const entriesWithRoutes = useMemo(() => {
    return entries.filter(entry => 
      entry.routeData && 
      entry.routeData.coordinates && 
      entry.routeData.coordinates.length > 0
    );
  }, [entries]);

  // Calculate bounds for all routes
  const bounds = useMemo(() => {
    return calculateBoundsForAllRoutes(entriesWithRoutes);
  }, [entriesWithRoutes]);

  // Calculate center point for initial map view
  const center = useMemo(() => {
    if (!bounds) return [0, 0];
    return [
      (bounds.minLat + bounds.maxLat) / 2,
      (bounds.minLon + bounds.maxLon) / 2
    ];
  }, [bounds]);

  if (entriesWithRoutes.length === 0) {
    return (
      <div className="fixed inset-0 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg mb-2">No routes to display</p>
          <p className="text-gray-400 text-sm">Add entries with GPX files to see them on the map</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-50 z-30">
      {/* Map Container - Full width */}
      <div className="w-full h-full relative">
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Fit bounds to all routes */}
          {bounds && <FitBounds bounds={bounds} />}
          
          {/* Render all routes */}
          {entriesWithRoutes.map((entry, index) => {
            const routePoints = entry.routeData.coordinates.map(coord => [coord.lat, coord.lon]);
            const startPoint = routePoints[0];
            const endPoint = routePoints[routePoints.length - 1];
            
            // Get bib image URL (prefer cropped/processed, fallback to original)
            const bibImageUrl = entry.bibPhoto 
              ? (entry.bibPhoto.cropped || entry.bibPhoto.processed || entry.bibPhoto.original)
              : null;
            
            return (
              <div key={entry.id}>
                {/* Route polyline */}
                <Polyline
                  positions={routePoints}
                  color="#000000"
                  weight={4}
                  opacity={0.8}
                />
                
                {/* Bib marker at start point */}
                {startPoint && bibImageUrl && (
                  <Marker position={startPoint} icon={createBibMarker(bibImageUrl)}>
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold">{entry.raceName}</div>
                        {entry.date && (
                          <div className="text-xs text-gray-500 mt-1">
                            {formatDate(entry.date, 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )}
                
                {/* Finish marker */}
                {endPoint && (
                  <Marker position={endPoint} icon={finishMarkerIcon}>
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold">{entry.raceName}</div>
                        <div className="text-gray-600">Finish</div>
                        {entry.date && (
                          <div className="text-xs text-gray-500 mt-1">
                            {formatDate(entry.date, 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )}
              </div>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}

