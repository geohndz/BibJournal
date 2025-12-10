import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Ruler, Mountain, Gauge, Flag } from 'lucide-react';
import { calculateRouteStats } from '../lib/gpxParser';

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

// Create mile marker with number
function createMileMarker(mileNumber) {
  return L.divIcon({
    className: 'custom-mile-marker',
    html: `
      <div style="
        background-color: #000000;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: bold;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">${mileNumber}</div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
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
 * Calculate distance between two points using Haversine formula (in miles)
 */
function haversineDistanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate mile markers along the route
 * Returns array of { mile: number, position: [lat, lon], index: number }
 */
function calculateMileMarkers(coordinates, totalDistanceMiles) {
  if (!coordinates || coordinates.length === 0 || totalDistanceMiles <= 0) {
    return [];
  }

  const mileMarkers = [];
  let cumulativeDistance = 0;
  let currentMile = 1;
  const targetMile = 1; // Start looking for mile 1

  for (let i = 1; i < coordinates.length; i++) {
    const prev = coordinates[i - 1];
    const curr = coordinates[i];
    
    const segmentDistance = haversineDistanceMiles(prev.lat, prev.lon, curr.lat, curr.lon);
    cumulativeDistance += segmentDistance;

    // Check if we've passed the current mile marker
    while (currentMile <= Math.floor(totalDistanceMiles) && cumulativeDistance >= currentMile) {
      // Find the exact position where this mile occurs
      // Interpolate between prev and curr
      const distanceToMile = currentMile - (cumulativeDistance - segmentDistance);
      const ratio = distanceToMile / segmentDistance;
      
      const mileLat = prev.lat + (curr.lat - prev.lat) * ratio;
      const mileLon = prev.lon + (curr.lon - prev.lon) * ratio;
      
      mileMarkers.push({
        mile: currentMile,
        position: [mileLat, mileLon],
        index: i - 1,
      });
      
      currentMile++;
    }
  }

  return mileMarkers;
}

/**
 * Format pace from minutes per mile to MM:SS format
 */
function formatPace(minutesPerMile) {
  const minutes = Math.floor(minutesPerMile);
  const seconds = Math.floor((minutesPerMile - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format time in seconds to HH:MM:SS format
 */
function formatTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Component for visualizing GPX route on a map
 */
export function RouteVisualization({ routeData }) {
  // Recalculate stats if they're missing but we have coordinates with time data
  const stats = useMemo(() => {
    console.log('=== RouteVisualization Stats Debug ===');
    console.log('routeData:', routeData);
    
    if (!routeData || !routeData.stats) {
      console.log('No routeData or stats found');
      return null;
    }
    
    console.log('Existing stats:', routeData.stats);
    console.log('Stats keys:', Object.keys(routeData.stats));
    console.log('hasTimeData:', routeData.stats.hasTimeData);
    console.log('averagePacePerMile:', routeData.stats.averagePacePerMile);
    console.log('totalTime:', routeData.stats.totalTime);
    
    // Check if coordinates have time data
    if (routeData.coordinates && routeData.coordinates.length > 0) {
      console.log('Coordinates found:', routeData.coordinates.length, 'points');
      console.log('First coordinate:', routeData.coordinates[0]);
      console.log('First coordinate has time?', !!routeData.coordinates[0]?.time);
      console.log('First coordinate time value:', routeData.coordinates[0]?.time);
      
      // Check multiple coordinates for time data
      let timeDataCount = 0;
      for (let i = 0; i < Math.min(routeData.coordinates.length, 10); i++) {
        if (routeData.coordinates[i]?.time) {
          timeDataCount++;
        }
      }
      console.log('Coordinates with time data (first 10):', timeDataCount);
    } else {
      console.log('No coordinates found');
    }
    
    // If stats are missing pace/time but coordinates have time data, recalculate
    if (routeData.coordinates && 
        routeData.coordinates.length > 0 && 
        routeData.coordinates[0]?.time &&
        (!routeData.stats.hasTimeData || routeData.stats.averagePacePerMile === null || routeData.stats.averagePacePerMile === undefined)) {
      console.log('✅ RECALCULATING stats with time data from coordinates...');
      const recalculatedStats = calculateRouteStats(routeData.coordinates);
      console.log('✅ Recalculated stats:', recalculatedStats);
      console.log('Recalculated hasTimeData:', recalculatedStats.hasTimeData);
      console.log('Recalculated averagePacePerMile:', recalculatedStats.averagePacePerMile);
      console.log('Recalculated totalTime:', recalculatedStats.totalTime);
      return recalculatedStats;
    } else {
      console.log('❌ Not recalculating - conditions not met');
      if (!routeData.coordinates || routeData.coordinates.length === 0) {
        console.log('  - No coordinates');
      }
      if (!routeData.coordinates[0]?.time) {
        console.log('  - First coordinate has no time data');
      }
      if (routeData.stats.hasTimeData && routeData.stats.averagePacePerMile) {
        console.log('  - Stats already have time data and pace');
      }
    }
    
    console.log('Returning existing stats');
    return routeData.stats;
  }, [routeData]);

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

  // Calculate mile markers
  const mileMarkers = useMemo(() => {
    if (!routeData || !routeData.coordinates || !routeData.stats || !routeData.stats.distance) {
      return [];
    }
    
    // Convert distance from km to miles
    const totalDistanceMiles = routeData.stats.distance * 0.621371;
    
    return calculateMileMarkers(routeData.coordinates, totalDistanceMiles);
  }, [routeData]);

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
          
          {/* Mile markers */}
          {mileMarkers.map((marker, index) => (
            <Marker
              key={`mile-${marker.mile}-${index}`}
              position={marker.position}
              icon={createMileMarker(marker.mile)}
            >
              <Popup>Mile {marker.mile}</Popup>
            </Marker>
          ))}
          
          {/* Fit map to route bounds */}
          {bounds && <FitBounds bounds={bounds} />}
        </MapContainer>
      </div>
      
      {/* Route stats - Sticky note style cards */}
      {stats && (
        <div className="mt-4">
          {/* Info message if time data is missing */}
          {stats && !stats.hasTimeData && routeData.coordinates && routeData.coordinates.length > 0 && !routeData.coordinates[0]?.time && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              <p className="font-medium mb-1">⚠️ Pace and time data not available</p>
              <p>This GPX file was uploaded before time tracking was added. To see pace and total time, please edit this entry and re-upload the GPX file.</p>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Distance */}
          {stats.distance && (
            <div className="bg-gray-200 rounded-lg p-4 shadow-sm transform rotate-[-2deg] hover:rotate-0 transition-transform">
              <div className="flex items-center gap-2 text-gray-700 mb-2">
                <Ruler className="w-4 h-4" />
                <div className="text-xs font-medium uppercase tracking-wide">Distance</div>
              </div>
              <div className="font-bold text-lg text-gray-900">
                {stats.distance.toFixed(2)} km
              </div>
            </div>
          )}
          
          {/* Elevation Gain */}
          {stats.elevationGain !== undefined && stats.elevationGain > 0 && (
            <div className="bg-gray-200 rounded-lg p-4 shadow-sm transform rotate-[2deg] hover:rotate-0 transition-transform">
              <div className="flex items-center gap-2 text-gray-700 mb-2">
                <Mountain className="w-4 h-4" />
                <div className="text-xs font-medium uppercase tracking-wide">Elevation</div>
              </div>
              <div className="font-bold text-lg text-gray-900">
                {stats.elevationGain.toFixed(0)} m
              </div>
            </div>
          )}
          
          {/* Pace */}
          {stats?.hasTimeData && 
           stats?.averagePacePerMile !== null && 
           stats?.averagePacePerMile !== undefined && 
           !isNaN(stats.averagePacePerMile) && 
           stats.averagePacePerMile > 0 && (
            <div className="bg-gray-200 rounded-lg p-4 shadow-sm transform rotate-[-1.5deg] hover:rotate-0 transition-transform">
              <div className="flex items-center gap-2 text-gray-700 mb-2">
                <Gauge className="w-4 h-4" />
                <div className="text-xs font-medium uppercase tracking-wide">Pace</div>
              </div>
              <div className="font-bold text-lg text-gray-900">
                {formatPace(stats.averagePacePerMile)} /mi
              </div>
            </div>
          )}
          
          {/* Total Time */}
          {stats?.hasTimeData && 
           stats?.totalTime !== null && 
           stats?.totalTime !== undefined && 
           stats.totalTime > 0 && (
            <div className="bg-gray-200 rounded-lg p-4 shadow-sm transform rotate-[1.5deg] hover:rotate-0 transition-transform">
              <div className="flex items-center gap-2 text-gray-700 mb-2">
                <Flag className="w-4 h-4" />
                <div className="text-xs font-medium uppercase tracking-wide">Total Time</div>
              </div>
              <div className="font-bold text-lg text-gray-900">
                {formatTime(stats.totalTime)}
              </div>
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
}