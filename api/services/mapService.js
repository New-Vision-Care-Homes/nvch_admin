// src/api/services/mapService.js
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

let initialized = false;

/**
 * Must be called on CLIENT before any importLibrary
 */
export const initGoogleMaps = async () => {
  if (initialized) return;

  if (typeof window === "undefined") return;

  setOptions({
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
    version: "weekly",
    libraries: ["maps", "marker", "geometry", "geocoding"],
  });

  initialized = true;
};

export const mapService = {
  async loadMaps() {
    await initGoogleMaps();
    return await importLibrary("maps");
  },

  async geocodeAddress(address) {
    if (!address) throw new Error("Address is required");

    await initGoogleMaps();

    const { Geocoder } = await importLibrary("geocoding");
    const geocoder = new Geocoder();

    return new Promise((resolve, reject) => {
      geocoder.geocode({ address }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          resolve(results[0].geometry.location);
        } else {
          reject(new Error(`Geocoding failed: ${status}`));
        }
      });
    });
  },
};

