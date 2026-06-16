"use client";

/**
 * Browser geolocation + reverse geocoding.
 *
 * PRIVACY: the device's coordinates are converted to a COARSE AREA
 * (city / region / country) in the browser and only the area is ever kept —
 * raw latitude/longitude are never stored or sent to the backend. The user is
 * never asked to type a ZIP code or city; the area comes from the device.
 */

/** Coarse, non-PII area derived from a location. No coordinates retained. */
export interface GeoArea {
  /** Administrative city used for matching, e.g. "Cupertino" / "Dubai". */
  city: string;
  /** State / province / emirate, e.g. "California" / "Maharashtra". */
  region: string;
  /** Country (display form), e.g. "USA" / "India". */
  country: string;
  /** Pretty label, e.g. "Cupertino, California, USA". */
  label: string;
  /** Optional ZIP/postcode (legacy; not required for matching). */
  zipCode: string;
}

export class GeoError extends Error {
  constructor(
    message: string,
    public code: "unsupported" | "denied" | "unavailable" | "timeout" | "geocode",
  ) {
    super(message);
    this.name = "GeoError";
  }
}

/** Promisified navigator.geolocation.getCurrentPosition. */
function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      reject(new GeoError("Location isn't supported on this device.", "unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, (err) => {
      const code =
        err.code === err.PERMISSION_DENIED
          ? "denied"
          : err.code === err.TIMEOUT
            ? "timeout"
            : "unavailable";
      const message =
        code === "denied"
          ? "Location access was blocked. Allow it in your browser to continue."
          : code === "timeout"
            ? "We couldn't pin your location in time. Please try again."
            : "We couldn't read your location. Please try again.";
      reject(new GeoError(message, code));
    }, {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 60000,
    });
  });
}

/** Common long country names → short forms used in the area label. */
const COUNTRY_SHORT: Record<string, string> = {
  US: "USA",
  AE: "UAE",
  GB: "UK",
};

export function shortCountry(countryName: string, countryCode: string): string {
  return COUNTRY_SHORT[countryCode?.toUpperCase()] ?? countryName;
}

/** Builds "Locality, Region, Country" picking the most specific parts. */
function buildLabel(opts: {
  locality: string;
  city: string;
  region: string;
  country: string;
  zipCode: string;
}): string {
  const { locality, city, region, country, zipCode } = opts;
  const segs: string[] = [];
  const place = locality || city;
  if (place) segs.push(place);
  if (region && region !== place) segs.push(region);
  else if (city && city !== place && !segs.includes(city)) segs.push(city);
  if (country) segs.push(country);
  if (segs.length) return segs.join(", ");
  if (zipCode) return `ZIP ${zipCode}`;
  return "your area";
}

/**
 * Reverse-geocode coordinates to a coarse area using BigDataCloud's free,
 * key-less, CORS-enabled client endpoint. Used for BOTH the user's onboarding
 * location and the admin/ER map picker, so both sides resolve cities the same
 * way (and therefore match). Throws GeoError("geocode") on failure.
 */
export async function reverseGeocodeArea(
  latitude: number,
  longitude: number,
): Promise<GeoArea> {
  let data: Record<string, unknown>;
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("bad status");
    data = await res.json();
  } catch {
    throw new GeoError("We couldn't determine the area for that location.", "geocode");
  }

  const locality = String(data.locality ?? "").trim();
  const city = String((data.city as string) || locality).trim();
  const region = String(data.principalSubdivision ?? "").trim();
  const countryName = String(data.countryName ?? "").trim();
  const countryCode = String(data.countryCode ?? "").trim();
  const zipCode = String(data.postcode ?? "").trim();
  const country = shortCountry(countryName, countryCode);

  return {
    city,
    region,
    country,
    zipCode,
    label: buildLabel({ locality, city, region, country, zipCode }),
  };
}

/**
 * Full onboarding pipeline: request browser location, then resolve it to a
 * coarse area. Coordinates are used transiently and never returned/stored.
 */
export async function locateUser(): Promise<GeoArea> {
  const position = await getCurrentPosition();
  const { latitude, longitude } = position.coords;
  return reverseGeocodeArea(latitude, longitude);
}
