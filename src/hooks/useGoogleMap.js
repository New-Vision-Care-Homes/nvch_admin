import { useState, useEffect, useRef, useCallback } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';

/**
 * Libraries required for the map.
 * 'places' is for the Autocomplete service.
 */
const LIBRARIES = ['places', 'geometry'];

/**
 * Default configuration for the map
 */
const DEFAULT_CENTER = {
	lat: 45.5017,
	lng: -73.5673,
};
const DEFAULT_RADIUS = 500;

/**
 * Custom Hook: useGoogleMap
 * -------------------------
 * Encapsulates Google Maps logic.
 * Default values are now handled internal to the hook, but can be overridden by props if needed.
 * 
 * @param {Object} props (Optional)
 * @param {string} props.apiKey - (Optional) API Key, defaults to process.env
 * @param {Object} props.initialCenter - (Optional) { lat, lng }
 * @param {number} props.initialRadius - (Optional) radius in meters
 */
export const useGoogleMap = ({
	apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
	initialCenter = DEFAULT_CENTER,
	initialRadius = DEFAULT_RADIUS
} = {}) => {

	// --- STATE ---
	const [map, setMap] = useState(null);
	const [marker, setMarker] = useState(null);
	const [circle, setCircle] = useState(null);
	const [autocomplete, setAutocomplete] = useState(null);

	// Data state exposed to the component
	const [address, setAddress] = useState('');
	const [radius, setRadius] = useState(initialRadius);
	const [center, setCenter] = useState(initialCenter);

	// --- REFS ---
	const mapRef = useRef(null);
	const inputRef = useRef(null);

	// Refs for listeners to avoid stale closures
	const mapInstanceRef = useRef(null);
	const markerInstanceRef = useRef(null);
	const circleInstanceRef = useRef(null);

	// --- LOAD SCRIPT ---
	const { isLoaded, loadError } = useJsApiLoader({
		googleMapsApiKey: apiKey,
		libraries: LIBRARIES,
	});

	// --- INITIALIZE MAP ---
	useEffect(() => {
		if (isLoaded && mapRef.current && !map) {
			// 1. Create Map
			const mapInstance = new window.google.maps.Map(mapRef.current, {
				center: initialCenter,
				zoom: 14,
				mapTypeControl: false,
				streetViewControl: false,
			});

			// 2. Create Marker
			const markerInstance = new window.google.maps.Marker({
				position: initialCenter,
				map: mapInstance,
				draggable: false,
			});

			// 3. Create Circle
			const circleInstance = new window.google.maps.Circle({
				strokeColor: "#FF0000",
				strokeOpacity: 0.8,
				strokeWeight: 2,
				fillColor: "#FF0000",
				fillOpacity: 0.35,
				map: mapInstance,
				center: initialCenter,
				radius: initialRadius,
				draggable: false,
				editable: false,
				clickable: false,
			});

			setMap(mapInstance);
			setMarker(markerInstance);
			setCircle(circleInstance);

			mapInstanceRef.current = mapInstance;
			markerInstanceRef.current = markerInstance;
			circleInstanceRef.current = circleInstance;
		}
	}, [isLoaded, mapRef, map, initialCenter, initialRadius]);


	// --- INITIALIZE AUTOCOMPLETE ---
	useEffect(() => {
		if (isLoaded && inputRef.current && !autocomplete) {

			const autocompleteInstance = new window.google.maps.places.Autocomplete(inputRef.current, {
				fields: ["geometry", "formatted_address"],
				componentRestrictions: { country: "ca" },
			});

			autocompleteInstance.addListener("place_changed", () => {
				const place = autocompleteInstance.getPlace();

				if (!place.geometry || !place.geometry.location) {
					return;
				}

				const location = place.geometry.location;
				const newCenter = { lat: location.lat(), lng: location.lng() };

				setCenter(newCenter);
				setAddress(place.formatted_address);

				if (mapInstanceRef.current) {
					mapInstanceRef.current.panTo(location);
					mapInstanceRef.current.setZoom(15);
				}
				if (markerInstanceRef.current) {
					markerInstanceRef.current.setPosition(location);
				}
				if (circleInstanceRef.current) {
					circleInstanceRef.current.setCenter(location);
				}
			});

			setAutocomplete(autocompleteInstance);
		}
	}, [isLoaded, inputRef, autocomplete]);

	// --- HANDLE RADIUS CHANGES ---
	const updateRadius = useCallback((newRadius) => {
		const r = parseFloat(newRadius);
		if (!isNaN(r) && r > 0) {
			setRadius(r);
			if (circleInstanceRef.current) {
				circleInstanceRef.current.setRadius(r);
			}
		}
	}, []);

	// Sync external radius updates
	useEffect(() => {
		if (circle && radius !== circle.getRadius()) {
			circle.setRadius(radius);
		}
	}, [radius, circle]);


	return {
		mapRef,
		inputRef,
		isLoaded,
		loadError,
		address,
		radius,
		center,
		updateRadius,
		setAddress,
	};
};
