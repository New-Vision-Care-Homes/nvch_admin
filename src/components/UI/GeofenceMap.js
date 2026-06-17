"use client";

/* ==========================================================================
	SCOPE: Imports & Dependencies
========================================================================== */
import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useGoogleMapsLoader } from "@/hooks/useGoogleMapsLoader";
import styles from "./GeofenceMap.module.css";

/* ==========================================================================
	SCOPE: Helpers
========================================================================== */
function pinIcon(color) {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36"><path d="M14 0C6.268 0 0 6.268 0 14c0 9.941 14 22 14 22s14-12.059 14-22C28 6.268 21.732 0 14 0z" fill="${color}"/><circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/></svg>`;
	return {
		url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
		scaledSize: new window.google.maps.Size(28, 36),
		anchor: new window.google.maps.Point(14, 36),
	};
}

/* ==========================================================================
	SCOPE: Main Component
========================================================================== */
/**
 * GeofenceMap
 * A reusable Google Map component that shows a location pin + geofence circle.
 * Optionally renders clock-in (green) and clock-out (red) pins when provided.
 */
export default function GeofenceMap({
	center,
	radius = 100,
	onMapReady,
	height = "360px",
	className = "",
	clockInLocation = null,
	clockOutLocation = null,
}) {
	/* ==========================================================================
		SCOPE: State & References
	========================================================================== */
	const { isLoaded, loadError } = useGoogleMapsLoader();
	const divRef = useRef(null);
	const mapInstanceRef = useRef(null);
	const markerRef = useRef(null);
	const circleRef = useRef(null);
	const clockInMarkerRef = useRef(null);
	const clockOutMarkerRef = useRef(null);
	const [pinsOverlap, setPinsOverlap] = useState(false);

	/* ==========================================================================
		SCOPE: Resize observer — re-triggers Google Maps layout when the container
		       changes size (e.g. flex parent resizes, window narrows) to prevent
		       the map from going blank.
	========================================================================== */
	useEffect(() => {
		if (!isLoaded || !divRef.current) return;
		const observer = new ResizeObserver(() => {
			if (mapInstanceRef.current) {
				window.google.maps.event.trigger(mapInstanceRef.current, "resize");
			}
		});
		observer.observe(divRef.current);
		return () => observer.disconnect();
	}, [isLoaded]);

	/* ==========================================================================
		SCOPE: Map Initialization
	========================================================================== */
	useEffect(() => {
		if (!isLoaded || !divRef.current || mapInstanceRef.current) return;

		const lat = center?.latitude ?? center?.lat ?? 44.6476;
		const lng = center?.longitude ?? center?.lng ?? -63.5728;
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

		// Scheduled location — blue pin
		const marker = new window.google.maps.Marker({
			position: mapCenter,
			map: mapInstance,
			draggable: false,
			icon: pinIcon("#3b82f6"),
			title: "Scheduled Location",
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

		const ciLat = clockInLocation?.latitude ?? clockInLocation?.lat;
		const ciLng = clockInLocation?.longitude ?? clockInLocation?.lng;
		const coLat = clockOutLocation?.latitude ?? clockOutLocation?.lat;
		const coLng = clockOutLocation?.longitude ?? clockOutLocation?.lng;
		const hasCi = ciLat != null && ciLng != null;
		const hasCo = coLat != null && coLng != null;

		// Detect overlapping pins — offset clock-in slightly north so both are visible
		const overlapping = hasCi && hasCo && ciLat === coLat && ciLng === coLng;
		if (overlapping) setPinsOverlap(true);
		const ciRenderLat = overlapping ? ciLat + 0.00015 : ciLat;

		// Clock In marker — green pin
		if (hasCi) {
			const ciMarker = new window.google.maps.Marker({
				position: { lat: ciRenderLat, lng: ciLng },
				map: mapInstance,
				draggable: false,
				icon: pinIcon("#22c55e"),
				title: overlapping ? "Clock In (same location as Clock Out)" : "Clock In",
			});
			clockInMarkerRef.current = ciMarker;
		}

		// Clock Out marker — red pin
		if (hasCo) {
			const coMarker = new window.google.maps.Marker({
				position: { lat: coLat, lng: coLng },
				map: mapInstance,
				draggable: false,
				icon: pinIcon("#ef4444"),
				title: overlapping ? "Clock Out (same location as Clock In)" : "Clock Out",
			});
			clockOutMarkerRef.current = coMarker;
		}

		// Auto-fit bounds when clock pins are present so all markers are visible
		if (hasCi || hasCo) {
			const bounds = new window.google.maps.LatLngBounds();
			bounds.extend(mapCenter);
			if (hasCi) bounds.extend({ lat: ciRenderLat, lng: ciLng });
			if (hasCo) bounds.extend({ lat: coLat, lng: coLng });
			mapInstance.fitBounds(bounds, 80);
		}

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
		SCOPE: Render
	========================================================================== */
	const wrapperStyle = { height };
	const showLegend = clockInLocation || clockOutLocation;

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
			{showLegend && (
				<div className={styles.legend}>
					<div className={styles.legendItem}>
						<span className={styles.legendDot} style={{ background: "#3b82f6" }} />
						<span>Scheduled</span>
					</div>
					{clockInLocation && (
						<div className={styles.legendItem}>
							<span className={styles.legendDot} style={{ background: "#22c55e" }} />
							<span>Clock In{pinsOverlap ? " (offset)" : ""}</span>
						</div>
					)}
					{clockOutLocation && (
						<div className={styles.legendItem}>
							<span className={styles.legendDot} style={{ background: "#ef4444" }} />
							<span>Clock Out</span>
						</div>
					)}
					{pinsOverlap && (
						<div className={styles.legendOverlapNotice}>
							<AlertTriangle size={11} />
							<span>Clock In &amp; Out at same location</span>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
