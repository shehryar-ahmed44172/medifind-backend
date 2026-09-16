/**
 * Unit tests — geoValidation utilities
 *
 * Pure functions, no DB required.
 */

import {
  haversineDistanceKm,
  estimateEtaMinutes,
  isWithinPakistan,
  isValidCoordinate,
  validatePakistanCoordinates,
} from '../../../src/utils/geoValidation';

// ── haversineDistanceKm ───────────────────────────────────────────────────────

describe('haversineDistanceKm', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineDistanceKm(31.5, 74.3, 31.5, 74.3)).toBe(0);
  });

  it('calculates known distance: Lahore to Islamabad (~267 km)', () => {
    // Lahore: 31.5497°N, 74.3436°E
    // Islamabad: 33.6844°N, 73.0479°E
    const dist = haversineDistanceKm(31.5497, 74.3436, 33.6844, 73.0479);
    expect(dist).toBeGreaterThan(250);
    expect(dist).toBeLessThan(290);
  });

  it('is approximately symmetric', () => {
    const d1 = haversineDistanceKm(31.5, 74.3, 33.7, 73.0);
    const d2 = haversineDistanceKm(33.7, 73.0, 31.5, 74.3);
    expect(Math.abs(d1 - d2)).toBeLessThan(0.001);
  });

  it('returns a positive value for different points', () => {
    expect(haversineDistanceKm(31.0, 74.0, 32.0, 75.0)).toBeGreaterThan(0);
  });

  it('handles crossing meridians', () => {
    // Two points ~1° apart should be roughly 111 km
    const dist = haversineDistanceKm(30.0, 0.0, 31.0, 0.0);
    expect(dist).toBeGreaterThan(105);
    expect(dist).toBeLessThan(115);
  });
});

// ── estimateEtaMinutes ────────────────────────────────────────────────────────

describe('estimateEtaMinutes', () => {
  it('returns at least the minimum (default 1 min)', () => {
    expect(estimateEtaMinutes(0)).toBe(1);
    expect(estimateEtaMinutes(0.1)).toBe(1);
  });

  it('calculates correctly at 40 km/h', () => {
    // 20 km at 40 km/h = 30 min
    expect(estimateEtaMinutes(20, 40)).toBe(30);
  });

  it('rounds up to nearest whole minute', () => {
    // 1.5 km at 40 km/h = 2.25 min → ceil → 3
    expect(estimateEtaMinutes(1.5, 40)).toBe(3);
  });

  it('respects custom minimum', () => {
    expect(estimateEtaMinutes(0, 40, 5)).toBe(5);
  });

  it('returns 0 when explicitly passed as distance = 0 and min = 0', () => {
    expect(estimateEtaMinutes(0, 40, 0)).toBe(0);
  });
});

// ── isValidCoordinate ─────────────────────────────────────────────────────────

describe('isValidCoordinate', () => {
  it('accepts valid coordinates', () => {
    expect(isValidCoordinate(31.5, 74.3)).toBe(true);
    expect(isValidCoordinate(0, 0)).toBe(true);
    expect(isValidCoordinate(-90, -180)).toBe(true);
    expect(isValidCoordinate(90, 180)).toBe(true);
  });

  it('rejects NaN', () => {
    expect(isValidCoordinate(NaN, 74.3)).toBe(false);
    expect(isValidCoordinate(31.5, NaN)).toBe(false);
  });

  it('rejects Infinity', () => {
    expect(isValidCoordinate(Infinity, 74.3)).toBe(false);
    expect(isValidCoordinate(31.5, -Infinity)).toBe(false);
  });

  it('rejects out-of-range latitude', () => {
    expect(isValidCoordinate(91, 74.3)).toBe(false);
    expect(isValidCoordinate(-91, 74.3)).toBe(false);
  });

  it('rejects out-of-range longitude', () => {
    expect(isValidCoordinate(31.5, 181)).toBe(false);
    expect(isValidCoordinate(31.5, -181)).toBe(false);
  });
});

// ── isWithinPakistan ──────────────────────────────────────────────────────────

describe('isWithinPakistan', () => {
  it('accepts Lahore', () => {
    expect(isWithinPakistan(31.5497, 74.3436)).toBe(true);
  });

  it('accepts Karachi', () => {
    expect(isWithinPakistan(24.8607, 67.0011)).toBe(true);
  });

  it('accepts Peshawar', () => {
    expect(isWithinPakistan(34.0151, 71.5249)).toBe(true);
  });

  it('rejects Dubai (outside bounds)', () => {
    expect(isWithinPakistan(25.2048, 55.2708)).toBe(false);
  });

  it('rejects London (outside bounds)', () => {
    expect(isWithinPakistan(51.5074, -0.1278)).toBe(false);
  });

  it('rejects coordinates just outside north bound', () => {
    expect(isWithinPakistan(38.0, 70.0)).toBe(false);
  });

  it('rejects coordinates just outside south bound', () => {
    expect(isWithinPakistan(22.0, 70.0)).toBe(false);
  });
});

// ── validatePakistanCoordinates ───────────────────────────────────────────────

describe('validatePakistanCoordinates', () => {
  it('returns null for valid Pakistan coordinates', () => {
    expect(validatePakistanCoordinates(31.5, 74.3)).toBeNull();
    expect(validatePakistanCoordinates(24.86, 67.0)).toBeNull();
  });

  it('returns error string for invalid latitude', () => {
    const result = validatePakistanCoordinates(200, 74.3);
    expect(result).not.toBeNull();
    expect(result).toMatch(/invalid/i);
  });

  it('returns error string for out-of-Pakistan coordinates', () => {
    const result = validatePakistanCoordinates(51.5, -0.1);
    expect(result).not.toBeNull();
    expect(result).toMatch(/outside/i);
  });

  it('returns error for NaN input', () => {
    const result = validatePakistanCoordinates(NaN, 74.3);
    expect(result).not.toBeNull();
  });
});
