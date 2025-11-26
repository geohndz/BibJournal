// Utility to get random images from assets/images folder
import image1 from '../assets/images/capstone-events-4oK5BlObZXg-unsplash.jpg';
import image2 from '../assets/images/leo_visions-Bn-up_Zrtcw-unsplash.jpg';
import image3 from '../assets/images/miguel-a-amutio-hBfiJshiBvc-unsplash.jpg';
import image4 from '../assets/images/pietro-rampazzo-x5GcXFvJJhI-unsplash.jpg';
import image5 from '../assets/images/quan-you-zhang-d6Sbmz4O0E4-unsplash.jpg';

const RACE_IMAGES = [image1, image2, image3, image4, image5];

/**
 * Get a random image from the race images collection
 * Uses entry ID or current time as seed for consistency
 */
export function getRandomRaceImage(seed = null) {
  if (seed === null) {
    seed = Date.now();
  }
  
  // Use seed to get consistent random selection
  const index = Math.abs(seed) % RACE_IMAGES.length;
  return RACE_IMAGES[index];
}

/**
 * Get all race images
 */
export function getAllRaceImages() {
  return RACE_IMAGES;
}

