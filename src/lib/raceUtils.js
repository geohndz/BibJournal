/**
 * Get display name for race type
 * Combines raceDistance and raceType, or falls back to old raceType format for backward compatibility
 */
export function getRaceTypeDisplay(entry) {
  // New format: has both raceDistance and raceType
  if (entry.raceDistance && entry.raceType) {
    return `${entry.raceDistance} ${entry.raceType}`;
  }
  
  // Backward compatibility: old format with just raceType
  if (entry.raceType && !entry.raceDistance) {
    return entry.raceType;
  }
  
  // Fallback
  return entry.raceDistance || entry.raceType || 'Unknown';
}

/**
 * Get race type for filtering/sorting
 * Returns a consistent string for grouping
 */
export function getRaceTypeForFilter(entry) {
  // New format: combine distance and type
  if (entry.raceDistance && entry.raceType) {
    return `${entry.raceDistance} ${entry.raceType}`;
  }
  
  // Backward compatibility
  if (entry.raceType && !entry.raceDistance) {
    return entry.raceType;
  }
  
  return entry.raceDistance || entry.raceType || 'Unknown';
}

