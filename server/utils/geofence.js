/* ─────────────────────────────────────────────
   Geofence Utility — Distance Calculator
   
   Uses Haversine formula to calculate distance
   between two GPS coordinates in meters.
   ───────────────────────────────────────────── */

/**
 * Calculate distance between two lat/lng points
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lng1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lng2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters

  const toRad = (deg) => deg * Math.PI / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}


/**
 * Check if a point is inside the geofence
 * @param {number} userLat   - User's latitude
 * @param {number} userLng   - User's longitude
 * @param {number} officeLat - Office latitude
 * @param {number} officeLng - Office longitude
 * @param {number} radiusM   - Allowed radius in meters
 * @returns {{ inside: boolean, distance: number }}
 */
function checkGeofence(userLat, userLng, officeLat, officeLng, radiusM) {
  const distance = getDistanceMeters(userLat, userLng, officeLat, officeLng);
  return {
    inside: distance <= radiusM,
    distance: Math.round(distance),
  };
}

module.exports = { getDistanceMeters, checkGeofence };
