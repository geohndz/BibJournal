import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

// Green icon for start
const StartIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconRetinaUrl: iconRetina,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Red icon for finish
const FinishIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconRetinaUrl: iconRetina,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Create colored circle markers for start/finish
function createCircleMarker(color) {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

const startMarkerIcon = createCircleMarker('#10b981'); // Green
const finishMarkerIcon = createCircleMarker('#ef4444'); // Red

/**
 * Component to fit map bounds to route
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
 * Calculate bounding box for coordinates
 */
function calculateBounds(coordinates) {
  const lats = coordinates.map(c => c.lat);
  const lons = coordinates.map(c => c.lon);
  
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLon: Math.min(...lons),
    maxLon: Math.max(...lons),
  };
}

/**
 * Component for visualizing GPX route on a map
 */
export function RouteVisualization({ routeData }) {
  // Calculate bounds for the route
  const bounds = useMemo(() => {
    if (!routeData || !routeData.coordinates || routeData.coordinates.length === 0) {
      return null;
    }
    return routeData.bounds || calculateBounds(routeData.coordinates);
  }, [routeData]);

  // Convert coordinates to Leaflet format [lat, lon]
  const routePoints = useMemo(() => {
    if (!routeData || !routeData.coordinates) return [];
    return routeData.coordinates.map(coord => [coord.lat, coord.lon]);
  }, [routeData]);

  // Calculate center point for initial map view
  const center = useMemo(() => {
    if (!bounds) return [0, 0];
    return [
      (bounds.minLat + bounds.maxLat) / 2,
      (bounds.minLon + bounds.maxLon) / 2
    ];
  }, [bounds]);

  // Get start and end points
  const startPoint = useMemo(() => {
    if (!routePoints || routePoints.length === 0) return null;
    return routePoints[0];
  }, [routePoints]);

  const endPoint = useMemo(() => {
    if (!routePoints || routePoints.length === 0) return null;
    return routePoints[routePoints.length - 1];
  }, [routePoints]);

  if (!routeData || !routeData.coordinates || routeData.coordinates.length === 0) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <p>No route data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="relative bg-white rounded-lg overflow-hidden" style={{ height: '500px' }}>
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
          dragging={false}
          touchZoom={false}
          doubleClickZoom={false}
          boxZoom={false}
          keyboard={false}
          className="z-0"
        >
          {/* OpenStreetMap tiles */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Route polyline */}
          <Polyline
            positions={routePoints}
            pathOptions={{
              color: '#000000',
              weight: 3,
              opacity: 1,
            }}
          />
          
          {/* Start marker */}
          {startPoint && (
            <Marker position={startPoint} icon={startMarkerIcon}>
              <Popup>Start</Popup>
            </Marker>
          )}
          
          {/* Finish marker */}
          {endPoint && (
            <Marker position={endPoint} icon={finishMarkerIcon}>
              <Popup>Finish</Popup>
            </Marker>
          )}
          
          {/* Fit map to route bounds */}
          {bounds && <FitBounds bounds={bounds} />}
        </MapContainer>
      </div>
      
      {/* Route stats */}
      {routeData.stats && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {routeData.stats.distance && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Distance</div>
              <div className="font-bold text-lg text-gray-900">{routeData.stats.distance.toFixed(2)} km</div>
            </div>
          )}
          {routeData.stats.elevationGain !== undefined && routeData.stats.elevationGain > 0 && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Elevation Gain</div>
              <div className="font-bold text-lg text-gray-900">{routeData.stats.elevationGain.toFixed(0)} m</div>
            </div>
          )}
          {routeData.stats.minElevation !== undefined && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Min Elevation</div>
              <div className="font-bold text-lg text-gray-900">{routeData.stats.minElevation.toFixed(0)} m</div>
            </div>
          )}
          {routeData.stats.maxElevation !== undefined && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Max Elevation</div>
              <div className="font-bold text-lg text-gray-900">{routeData.stats.maxElevation.toFixed(0)} m</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}