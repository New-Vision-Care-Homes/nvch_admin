"use client";

/* ==========================================================================
	SCOPE: Imports & Dependencies
========================================================================== */
import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { useGoogleMapsLoader } from "@/hooks/useGoogleMapsLoader";
import styles from "./GeofenceMap.module.css";

/* ==========================================================================
	SCOPE: Main Component
========================================================================== */
/**
 * GeofenceMap
 * A reusable Google Map component that shows a location pin + geofence circle.
 * Supports both read-only (view) and interactive (edit) modes.
 */
export default function GeofenceMap({
	center,
	radius = 100,
	onMapReady,
	height = "360px",
	className = "",
}) {
	/* ==========================================================================
		SCOPE: State & References
	========================================================================== */
	const { isLoaded, loadError } = useGoogleMapsLoader();
	const divRef = useRef(null);
	const mapInstanceRef = useRef(null);
	const markerRef = useRef(null);
	const circleRef = useRef(null);

	/* ==========================================================================
		SCOPE: Map Initialization
	========================================================================== */
	useEffect(() => {
		if (!isLoaded || !divRef.current || mapInstanceRef.current) return;

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

		if (onMapReady) {
			onMapReady({ mapInstance, marker, circle });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isLoaded]);

	/* ==========================================================================
		SCOPE: Sync Props (Radius & Center)
	========================================================================== */
	useEffect(() => {
		const r = Number(radius);
		if (!isNaN(r) && r > 0 && circleRef.current) {
			circleRef.current.setRadius(r);
		}
	}, [radius]);

	useEffect(() => {
		const lat = center?.latitude ?? center?.lat;
		const lng = center?.longitude ?? center?.lng;
		if (!lat || !lng) return;
		const newCenter = { lat, lng };

		if (mapInstanceRef.current) mapInstanceRef.current.panTo(newCenter);
		if (markerRef.current) markerRef.current.setPosition(newCenter);
		if (circleRef.current) circleRef.current.setCenter(newCenter);
	}, [center?.latitude, center?.longitude, center?.lat, center?.lng]);

	/* ==========================================================================
		SCOPE: Render Helpers
	========================================================================== */
	const wrapperStyle = { height };

	/* ==========================================================================
		SCOPE: Render
	========================================================================== */
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
			<div ref={divRef} className={styles.mapContainer} />
		</div>
	);
}
