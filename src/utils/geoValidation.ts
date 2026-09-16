/**
 * Geographic coordinate validation and calculation utilities.
 * Bounds are set to cover Pakistan with a small buffer.
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Haversine formula — great-circle distance in kilometres between two GPS points.
 */
export function haversineDistanceKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Estimate ETA in whole minutes given distance and average speed.
 * @param distanceKm   straight-line distance in km
 * @param speedKmh     average speed in km/h (default 40 km/h for urban emergency vehicles)
 * @param minMinutes   minimum ETA in minutes (default 1)
 */
export function estimateEtaMinutes(
  distanceKm: number,
  speedKmh = 40,
  minMinutes = 1,
): number {
  const raw = (distanceKm / speedKmh) * 60;
  return Math.max(minMinutes, Math.ceil(raw));
}

const PAKISTAN_BOUNDS = {
  lat: { min: 23.0, max: 37.5 },
  lon: { min: 60.0, max: 77.5 },
};

/**
 * Returns true if the coordinates fall within Pakistan's geographic bounding box.
 */
export function isWithinPakistan(latitude: number, longitude: number): boolean {
  return (
    latitude  >= PAKISTAN_BOUNDS.lat.min &&
    latitude  <= PAKISTAN_BOUNDS.lat.max &&
    longitude >= PAKISTAN_BOUNDS.lon.min &&
    longitude <= PAKISTAN_BOUNDS.lon.max
  );
}

/**
 * Returns true if both values are finite numbers (not NaN, Infinity, etc.).
 */
export function isValidCoordinate(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude  >= -90  && latitude  <= 90 &&
    longitude >= -180 && longitude <= 180
  );
}

/**
 * Full validation: finite values AND within Pakistan.
 * Returns an error string if invalid, or null if valid.
 */
export function validatePakistanCoordinates(
  latitude: number,
  longitude: number,
): string | null {
  if (!isValidCoordinate(latitude, longitude)) {
    return 'Invalid coordinates: latitude must be −90–90 and longitude −180–180';
  }
  if (!isWithinPakistan(latitude, longitude)) {
    return `Coordinates (${latitude}, ${longitude}) are outside the supported service area`;
  }
  return null;
}
