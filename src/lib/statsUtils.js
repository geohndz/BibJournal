/**
 * Get distance in kilometers for a race distance
 */
export function getDistanceInKm(raceDistance) {
  const distanceMap = {
    '5K': 5,
    '10K': 10,
    'Half Marathon': 21.0975,
    'Marathon': 42.195,
    'Ultra': 50, // Estimate
    'Triathlon': 51.5, // Estimate (Olympic distance)
    'Other': 0, // Unknown
  };
  
  return distanceMap[raceDistance] || 0;
}

/**
 * Parse finish time string (e.g., "3:45:30" or "1:30:00") to total seconds
 */
export function parseTimeToSeconds(timeString) {
  if (!timeString || typeof timeString !== 'string') return null;
  
  // Remove any whitespace
  const cleaned = timeString.trim();
  
  // Split by colon
  const parts = cleaned.split(':').map(part => {
    const num = Number(part.trim());
    return isNaN(num) ? 0 : num;
  });
  
  if (parts.length === 3) {
    // HH:MM:SS format
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // MM:SS format (assume minutes:seconds)
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1 && parts[0] > 0) {
    // Just a number, assume it's total seconds
    return parts[0];
  }
  
  return null;
}

/**
 * Format seconds to pace string (e.g., "5:30/km")
 */
export function formatPace(secondsPerKm) {
  if (!secondsPerKm || secondsPerKm === 0) return null;
  
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.floor(secondsPerKm % 60);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}

/**
 * Calculate stats from race entries
 */
export function calculateStats(entries) {
  const stats = {
    totalRaces: entries.length,
    totalDistance: 0,
    averagePace: null,
    favoriteDistance: null,
  };

  if (entries.length === 0) {
    return stats;
  }

  // Calculate total distance and collect finish times with distances
  const paceData = [];
  const distanceCounts = {};

  entries.forEach(entry => {
    // Get ACTUAL distance and time from GPX routeData (priority)
    let actualDistanceKm = null;
    let actualTimeSeconds = null;
    let paceSource = 'none';
    
    // Priority 1: Use GPX routeData for actual distance and time
    if (entry.routeData && entry.routeData.stats) {
      const routeStats = entry.routeData.stats;
      
      // Use actual distance from GPX (in kilometers)
      if (routeStats.distance && routeStats.distance > 0) {
        actualDistanceKm = routeStats.distance;
      }
      
      // Use actual time from GPX (in seconds)
      if (routeStats.totalTime && routeStats.totalTime > 0) {
        actualTimeSeconds = routeStats.totalTime;
        paceSource = 'routeData.totalTime';
      }
    }
    
    // Priority 2: If no GPX data, try finishTime with race distance (fallback, less accurate)
    if (!actualDistanceKm || !actualTimeSeconds) {
      // Get categorical distance for fallback calculation only
      let categoricalDistance = entry.raceDistance;
      
      // If no raceDistance, try to extract from old raceType format
      if (!categoricalDistance && entry.raceType) {
        const oldType = entry.raceType;
        if (['5K', '10K', 'Half Marathon', 'Marathon', 'Ultra', 'Triathlon', 'Other'].includes(oldType)) {
          categoricalDistance = oldType;
        }
      }
      
      // Only use categorical distance if we don't have GPX data
      if (!actualDistanceKm && categoricalDistance) {
        actualDistanceKm = getDistanceInKm(categoricalDistance);
      }
      
      // Try to get time from finishTime field
      if (!actualTimeSeconds && entry.results && entry.results.finishTime) {
        actualTimeSeconds = parseTimeToSeconds(entry.results.finishTime);
        paceSource = 'finishTime';
      }
    }
    
    // Add to total distance ONLY if we have actual distance from GPX
    // Don't use categorical distance for total distance calculation
    if (entry.routeData && entry.routeData.stats && entry.routeData.stats.distance && entry.routeData.stats.distance > 0) {
      stats.totalDistance += entry.routeData.stats.distance;
      console.log('Added GPX distance to total:', entry.routeData.stats.distance, 'km from', entry.raceName);
    }
    
    // Count categorical distance for favorite distance (regardless of GPX)
    // This is just for categorization, not calculation
    let categoricalDistance = entry.raceDistance;
    if (!categoricalDistance && entry.raceType) {
      const oldType = entry.raceType;
      if (['5K', '10K', 'Half Marathon', 'Marathon', 'Ultra', 'Triathlon', 'Other'].includes(oldType)) {
        categoricalDistance = oldType;
      }
    }
    if (categoricalDistance) {
      distanceCounts[categoricalDistance] = (distanceCounts[categoricalDistance] || 0) + 1;
    }

    // Calculate pace ONLY if we have both actual time and distance from GPX
    // Don't calculate pace using categorical distance - must use GPX data
    if (entry.routeData && entry.routeData.stats) {
      const routeStats = entry.routeData.stats;
      
      // Must have both GPX distance and GPX time to calculate pace
      if (routeStats.distance && routeStats.distance > 0 && 
          routeStats.totalTime && routeStats.totalTime > 0) {
        const paceSecondsPerKm = routeStats.totalTime / routeStats.distance;
        paceData.push(paceSecondsPerKm);
        console.log('Added pace data from GPX:', {
          entry: entry.raceName,
          source: 'routeData',
          gpxDistance: routeStats.distance.toFixed(2),
          gpxTime: routeStats.totalTime.toFixed(2),
          paceSecondsPerKm: paceSecondsPerKm.toFixed(2),
          formatted: formatPace(paceSecondsPerKm),
          averagePacePerMile: routeStats.averagePacePerMile
        });
      } else {
        console.log('GPX data incomplete for pace calculation:', entry.raceName, {
          hasDistance: !!(routeStats.distance && routeStats.distance > 0),
          hasTime: !!(routeStats.totalTime && routeStats.totalTime > 0),
          routeStats
        });
      }
    } else if (entry.results && entry.results.finishTime && 
               entry.routeData && entry.routeData.stats && 
               entry.routeData.stats.distance && entry.routeData.stats.distance > 0) {
      // Fallback: use finishTime with GPX distance if GPX time not available
      const finishTimeSeconds = parseTimeToSeconds(entry.results.finishTime);
      if (finishTimeSeconds && finishTimeSeconds > 0) {
        const paceSecondsPerKm = finishTimeSeconds / entry.routeData.stats.distance;
        paceData.push(paceSecondsPerKm);
        console.log('Added pace data from finishTime + GPX distance:', {
          entry: entry.raceName,
          source: 'finishTime + routeData.distance',
          gpxDistance: entry.routeData.stats.distance.toFixed(2),
          finishTimeSeconds: finishTimeSeconds.toFixed(2),
          paceSecondsPerKm: paceSecondsPerKm.toFixed(2),
          formatted: formatPace(paceSecondsPerKm)
        });
      }
    } else {
      console.log('No pace data for entry:', entry.raceName, {
        hasRouteData: !!(entry.routeData && entry.routeData.stats),
        routeStats: entry.routeData?.stats,
        hasFinishTime: !!(entry.results && entry.results.finishTime)
      });
    }
  });

  // Calculate average pace
  console.log('Pace data collected:', paceData.length, 'entries');
  if (paceData.length > 0) {
    const totalPaceSeconds = paceData.reduce((sum, pace) => sum + pace, 0);
    const averagePaceSeconds = totalPaceSeconds / paceData.length;
    stats.averagePace = formatPace(averagePaceSeconds);
    console.log('Average pace calculated:', stats.averagePace, 'from', averagePaceSeconds, 'seconds/km');
  } else {
    console.log('No pace data available - cannot calculate average pace');
  }

  // Find favorite distance
  const distanceEntries = Object.entries(distanceCounts);
  if (distanceEntries.length > 0) {
    const sorted = distanceEntries.sort((a, b) => b[1] - a[1]);
    stats.favoriteDistance = sorted[0][0];
  }

  return stats;
}

