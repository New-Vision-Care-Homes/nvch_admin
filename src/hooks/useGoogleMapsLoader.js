"use client";

import { useJsApiLoader } from "@react-google-maps/api";

const LIBRARIES = ["places", "geometry"];

export function useGoogleMapsLoader() {
	return useJsApiLoader({
		googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
		libraries: LIBRARIES,
	});
}
