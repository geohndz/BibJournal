import { logEvent } from 'firebase/analytics';
import { analytics } from './firebase';

/**
 * Analytics utility functions for tracking user interactions
 */

// Check if analytics is available
const isAnalyticsAvailable = () => {
  return analytics !== null && typeof window !== 'undefined';
};

/**
 * Track page views
 */
export const trackPageView = (pageName) => {
  if (!isAnalyticsAvailable()) return;
  
  logEvent(analytics, 'page_view', {
    page_title: pageName,
    page_location: window.location.href,
  });
};

/**
 * Track race entry creation
 */
export const trackRaceCreated = (raceType, hasBibPhoto, hasFinisherPhoto, hasMedalPhoto, hasGPX) => {
  if (!isAnalyticsAvailable()) return;
  
  logEvent(analytics, 'race_entry_created', {
    race_type: raceType,
    has_bib_photo: hasBibPhoto,
    has_finisher_photo: hasFinisherPhoto,
    has_medal_photo: hasMedalPhoto,
    has_gpx_file: hasGPX,
  });
};

/**
 * Track race entry update
 */
export const trackRaceUpdated = (raceType) => {
  if (!isAnalyticsAvailable()) return;
  
  logEvent(analytics, 'race_entry_updated', {
    race_type: raceType,
  });
};

/**
 * Track race entry deletion
 */
export const trackRaceDeleted = (raceType) => {
  if (!isAnalyticsAvailable()) return;
  
  logEvent(analytics, 'race_entry_deleted', {
    race_type: raceType,
  });
};

/**
 * Track race entry viewed
 */
export const trackRaceViewed = (raceType) => {
  if (!isAnalyticsAvailable()) return;
  
  logEvent(analytics, 'race_entry_viewed', {
    race_type: raceType,
  });
};

/**
 * Track view mode change
 */
export const trackViewModeChanged = (viewMode) => {
  if (!isAnalyticsAvailable()) return;
  
  logEvent(analytics, 'view_mode_changed', {
    view_mode: viewMode, // 'grid' or 'list'
  });
};

/**
 * Track filter usage
 */
export const trackFilterApplied = (raceTypes) => {
  if (!isAnalyticsAvailable()) return;
  
  logEvent(analytics, 'filter_applied', {
    race_types: raceTypes.join(','),
    filter_count: raceTypes.length,
  });
};

/**
 * Track user login
 */
export const trackLogin = (method) => {
  if (!isAnalyticsAvailable()) return;
  
  logEvent(analytics, 'login', {
    method: method, // 'email' or 'google'
  });
};

/**
 * Track user signup
 */
export const trackSignup = (method) => {
  if (!isAnalyticsAvailable()) return;
  
  logEvent(analytics, 'sign_up', {
    method: method, // 'email' or 'google'
  });
};

/**
 * Track user logout
 */
export const trackLogout = () => {
  if (!isAnalyticsAvailable()) return;
  
  logEvent(analytics, 'logout');
};

/**
 * Track form started (when user opens the form)
 */
export const trackFormStarted = (isEdit) => {
  if (!isAnalyticsAvailable()) return;
  
  logEvent(analytics, 'form_started', {
    is_edit: isEdit,
  });
};

/**
 * Track form abandoned (when user closes form without saving)
 */
export const trackFormAbandoned = (isEdit) => {
  if (!isAnalyticsAvailable()) return;
  
  logEvent(analytics, 'form_abandoned', {
    is_edit: isEdit,
  });
};

/**
 * Track image upload
 */
export const trackImageUploaded = (imageType) => {
  if (!isAnalyticsAvailable()) return;
  
  logEvent(analytics, 'image_uploaded', {
    image_type: imageType, // 'bib', 'finisher', 'medal'
  });
};

/**
 * Track GPX file upload
 */
export const trackGPXUploaded = () => {
  if (!isAnalyticsAvailable()) return;
  
  logEvent(analytics, 'gpx_uploaded');
};

/**
 * Track search/filter cleared
 */
export const trackFilterCleared = () => {
  if (!isAnalyticsAvailable()) return;
  
  logEvent(analytics, 'filter_cleared');
};

/**
 * Track total entries count (for user engagement metrics)
 */
export const trackTotalEntries = (count) => {
  if (!isAnalyticsAvailable()) return;
  
  logEvent(analytics, 'total_entries', {
    entry_count: count,
  });
};

