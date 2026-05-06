"use client";

/**
 * GeofenceMap.js
 * ─────────────────────────────────────────────────────────────────────────────
 * A reusable Google Map component that shows a location pin + geofence circle.
 * Supports both read-only (view) and interactive (edit) modes.
 *
 * PROPS:
 *   center     { latitude, longitude }   – Map center & marker position
 *   radius     number                    – Geofence circle radius in metres
 *   isLoaded   boolean                   – Whether the Maps JS API is loaded
 *   loadError  Error|undefined           – Any API load error
 *   onMapReady (refs) => void            – Called once the map is initialised,
 *                                          passing { mapInstance, marker, circle }
 *                                          so the parent can imperatively update.
 *   height     string                    – CSS height for the map (default "360px")
 *   className  string                    – Extra CSS class on the wrapper
 *
 * USAGE (view mode – no updates needed):
 *   <GeofenceMap
 *     center={{ latitude: 44.6488, longitude: -63.5752 }}
 *     radius={500}
 *   />
 *
 * USAGE (edit mode – parent controls panning):
 *   const mapRefs = useRef(null);
 *   ...
 *   <GeofenceMap
 *     center={formData.geofence.center}
 *     radius={formData.geofence.radius}
 *     onMapReady={(refs) => { mapRefs.current = refs; }}
 *   />
 *   // then call mapRefs.current.mapInstance.panTo(...) etc.
 */

import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { useGoogleMapsLoader } from "@/hooks/useGoogleMapsLoader";
import styles from "./GeofenceMap.module.css";

export default function GeofenceMap({
	center,
	radius = 100,
	onMapReady,
	height = "360px",
	className = "",
}) {
	const { isLoaded, loadError } = useGoogleMapsLoader();
	const divRef = useRef(null);
	const mapInstanceRef = useRef(null);
	const markerRef = useRef(null);
	const circleRef = useRef(null);

	// ── Build / rebuild the map once the API is ready ─────────────────────────
	useEffect(() => {
		if (!isLoaded || !divRef.current || mapInstanceRef.current) return;

		// Resolve center — accept both {latitude,longitude} and {lat,lng}
		const lat = center?.latitude ?? center?.lat ?? 44.6488;
		const lng = center?.longitude ?? center?.lng ?? -63.5752;
		const mapCenter = { lat, lng };
		const mapRadius = Number(radius) || 100;

		const mapInstance = new window.google.maps.Map(divRef.current, {
			center: mapCenter,
			zoom: 15,
			mapTypeControl: false,
			streetViewControl: false,
			fullscreenControl: false,
			zoomControlOptions: {
				position: window.google.maps.ControlPosition.RIGHT_CENTER,
			},
		});

		const marker = new window.google.maps.Marker({
			position: mapCenter,
			map: mapInstance,
			draggable: false,
		});

		const circle = new window.google.maps.Circle({
			strokeColor: "#3b82f6",
			strokeOpacity: 0.85,
			strokeWeight: 2,
			fillColor: "#3b82f6",
			fillOpacity: 0.12,
			map: mapInstance,
			center: mapCenter,
			radius: mapRadius,
			draggable: false,
			editable: false,
			clickable: false,
		});

		mapInstanceRef.current = mapInstance;
		markerRef.current = marker;
		circleRef.current = circle;

		// Notify parent so it can imperatively update the map
		if (onMapReady) {
			onMapReady({ mapInstance, marker, circle });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isLoaded]);

	// ── Keep circle radius in sync when prop changes ──────────────────────────
	useEffect(() => {
		const r = Number(radius);
		if (!isNaN(r) && r > 0 && circleRef.current) {
			circleRef.current.setRadius(r);
		}
	}, [radius]);

	// ── Keep map center in sync when prop changes (read-only mode) ────────────
	useEffect(() => {
		const lat = center?.latitude ?? center?.lat;
		const lng = center?.longitude ?? center?.lng;
		if (!lat || !lng) return;
		const newCenter = { lat, lng };
		if (mapInstanceRef.current) mapInstanceRef.current.panTo(newCenter);
		if (markerRef.current) markerRef.current.setPosition(newCenter);
		if (circleRef.current) circleRef.current.setCenter(newCenter);
	}, [center?.latitude, center?.longitude, center?.lat, center?.lng]);

	// ── Render ────────────────────────────────────────────────────────────────
	const wrapperStyle = { height };

	if (loadError) {
		return (
			<div className={`${styles.wrapper} ${styles.stateBox} ${className}`} style={wrapperStyle}>
				<AlertTriangle size={24} className={styles.errorIcon} />
				<p className={styles.stateText}>Failed to load Google Maps</p>
			</div>
		);
	}

	if (!isLoaded) {
		return (
			<div className={`${styles.wrapper} ${styles.stateBox} ${className}`} style={wrapperStyle}>
				<div className={styles.spinner} />
				<p className={styles.stateText}>Loading map…</p>
			</div>
		);
	}

	return (
		<div className={`${styles.wrapper} ${className}`} style={wrapperStyle}>
			<div ref={divRef} style={{ width: "100%", height: "100%", borderRadius: "inherit" }} />
		</div>
	);
}
