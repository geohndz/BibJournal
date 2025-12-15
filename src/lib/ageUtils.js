/**
 * Calculate age from birthday
 * @param {string|Date} birthday - Birthday in YYYY-MM-DD format or Date object
 * @returns {number} Age in years
 */
export function calculateAge(birthday) {
  if (!birthday) {
    return null;
  }

  const birthDate = typeof birthday === 'string' 
    ? new Date(birthday) 
    : birthday;
  
  if (isNaN(birthDate.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  // Adjust age if birthday hasn't occurred this year
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age >= 0 ? age : null;
}

/**
 * Calculate age division based on age
 * Common age divisions in running races:
 * - Under 18, 18-19, 20-24, 25-29, 30-34, 35-39, 40-44, 45-49, 50-54, 55-59, 60-64, 65-69, 70+
 */
export function getAgeDivision(age) {
  if (!age || typeof age !== 'number' || age < 1) {
    return '';
  }

  if (age < 18) {
    return 'Under 18';
  } else if (age >= 18 && age <= 19) {
    return '18-19';
  } else if (age >= 20 && age <= 24) {
    return '20-24';
  } else if (age >= 25 && age <= 29) {
    return '25-29';
  } else if (age >= 30 && age <= 34) {
    return '30-34';
  } else if (age >= 35 && age <= 39) {
    return '35-39';
  } else if (age >= 40 && age <= 44) {
    return '40-44';
  } else if (age >= 45 && age <= 49) {
    return '45-49';
  } else if (age >= 50 && age <= 54) {
    return '50-54';
  } else if (age >= 55 && age <= 59) {
    return '55-59';
  } else if (age >= 60 && age <= 64) {
    return '60-64';
  } else if (age >= 65 && age <= 69) {
    return '65-69';
  } else {
    return '70+';
  }
}

/**
 * Calculate age division from birthday
 * @param {string|Date} birthday - Birthday in YYYY-MM-DD format or Date object
 * @returns {string} Age division
 */
export function getAgeDivisionFromBirthday(birthday) {
  const age = calculateAge(birthday);
  return getAgeDivision(age);
}

