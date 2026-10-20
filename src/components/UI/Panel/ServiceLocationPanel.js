"use client";

// ─── ServiceLocationPanel ─────────────────────────────────────────────────────
//
// The "Service Location" layout shared by the shift detail page and the
// clock-out review approval page: coloured address blocks on the left
// (service address, clock-in, clock-out, end-of-shift location check) and the
// GeofenceMap on the right with matching pins. It stacks into one column when
// its container is narrow (a container query), so it fits both the full-width
// shift card and the approval page's half-width column.
//
// The caller wraps it in its own Card and passes plain values:
//
//   site          {{ latitude, longitude, radius }|null}  null → no map, just the blocks
//   noMapText     {string}   shown in place of the map when site is null
//   serviceAddress{string}
//   clockIn       {{ location, address, distanceMeters }}
//   clockOut      {{ location, address, distanceMeters, insideGeofence, note }}
//                 note — replaces the value when there's no location
//                        (e.g. "No location — closed by the system")
//   locationCheck {object|null}  the end-of-shift GPS check, as stored on the shift
//   mapKey        {string}   re-initialises the map when it changes
//
// A (0, 0) location is the server's "no fix" placeholder for a system close,
// so it's never drawn as a pin.

import GeofenceMap from "@components/UI/Map/GeofenceMap";
import { MapPin, LogIn, LogOut, LocateFixed } from "lucide-react";
import { utcToDisplayTime } from "@/utils/timeHandling";
import { DISPLAY_TZ } from "@/utils/dates";
import styles from "./ServiceLocationPanel.module.css";

const LOCATION_CHECK_LABELS = {
	received:    "Received",
	no_response: "No response",
	sent:        "Sent, no reply yet",
	not_sent:    "Not sent",
};

const NOT_SENT_REASON_LABELS = {
	no_device:               "no registered phone",
	app_version_unsupported: "app version too old",
	push_unavailable:        "notifications unavailable",
	push_failed:             "the push failed",
};

function formatMeters(meters) {
	return Number.isFinite(meters) ? `${Math.round(meters)} m` : null;
}

/** "120 m from the site · outside the geofence" — whatever is known. */
function describePosition({ distanceMeters, insideGeofence } = {}) {
	const parts = [];
	const distance = formatMeters(distanceMeters);
	if (distance) parts.push(`${distance} from the site`);
	if (insideGeofence === true)  parts.push("inside the geofence");
	if (insideGeofence === false) parts.push("outside the geofence");
	return parts.join(" · ");
}

/** A real GPS fix — not missing, and not the (0, 0) system-close placeholder. */
function isRealFix(location) {
	return Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude)
		&& !(location.latitude === 0 && location.longitude === 0);
}

/** One coloured block: label, main value, and an optional muted line under it. */
function LocationBlock({ tone, Icon, label, value, detail }) {
	return (
		<div className={`${styles.block} ${styles[tone]}`}>
			<div className={styles.blockIcon}><Icon size={13} /></div>
			<div className={styles.blockBody}>
				<p className={styles.blockLabel}>{label}</p>
				<p className={styles.blockValue}>{value}</p>
				{detail && <p className={styles.blockDetail}>{detail}</p>}
			</div>
		</div>
	);
}

/**
 * Block content for a clock-in / clock-out: the address with the distance under
 * it; without an address the distance is the value; with neither, the note
 * (or "Recorded — see the map" when there is a pin). Returns null for "nothing to show".
 */
function describeClockPoint(point, position) {
	const address = point?.location?.address || point?.address || null;
	if (address) return { value: address, detail: position || null };
	if (point?.note) return { value: point.note, detail: null };
	if (position) return { value: position, detail: null };
	if (isRealFix(point?.location)) return { value: "Recorded — see the map", detail: null };
	return null;
}

export default function ServiceLocationPanel({
	site,
	noMapText = "No map for this shift's location.",
	serviceAddress,
	clockIn,
	clockOut,
	locationCheck,
	mapKey,
}) {
	const hasMap = Number.isFinite(site?.latitude) && Number.isFinite(site?.longitude);

	const clockInBlock  = describeClockPoint(clockIn,  formatMeters(clockIn?.distanceMeters) && `${formatMeters(clockIn.distanceMeters)} from the site`);
	const clockOutBlock = describeClockPoint(clockOut, describePosition(clockOut));

	const checkPin = locationCheck?.status === "received" && isRealFix(locationCheck)
		? { latitude: locationCheck.latitude, longitude: locationCheck.longitude }
		: null;

	const checkValue = locationCheck && [
		LOCATION_CHECK_LABELS[locationCheck.status] ?? locationCheck.status,
		locationCheck.status === "not_sent" && NOT_SENT_REASON_LABELS[locationCheck.notSentReason]
			? ` — ${NOT_SENT_REASON_LABELS[locationCheck.notSentReason]}` : "",
		locationCheck.respondedAt ? ` at ${utcToDisplayTime(locationCheck.respondedAt, DISPLAY_TZ)}` : "",
	].join("");
	const checkDetail = locationCheck?.status === "received"
		? [describePosition(locationCheck), locationCheck.staleFix && "older GPS fix", locationCheck.isMocked && "mocked location reported"]
			.filter(Boolean).join(" · ")
		: locationCheck?.status === "no_response"
		? "A phone whose app was swiped away can't answer — this isn't proof the caregiver had left."
		: null;

	const hasBlocks = serviceAddress || clockInBlock || clockOutBlock || locationCheck;

	return (
		<div className={styles.panel}>
			<div className={styles.layout}>

				{/* Address blocks — colours match the map pins */}
				<div className={styles.info}>
					{serviceAddress && (
						<LocationBlock tone="blue" Icon={MapPin} label="Service Address" value={serviceAddress} />
					)}
					{clockInBlock && (
						<LocationBlock tone="green" Icon={LogIn} label="Clock In" {...clockInBlock} />
					)}
					{clockOutBlock && (
						<LocationBlock tone="red" Icon={LogOut} label="Clock Out" {...clockOutBlock} />
					)}
					{locationCheck && (
						<LocationBlock
							tone="amber"
							Icon={LocateFixed}
							label="Location Check (5 min before end)"
							value={checkValue}
							detail={checkDetail}
						/>
					)}
					{!hasBlocks && <p className={styles.empty}>No address recorded.</p>}
				</div>

				{/* Map */}
				{hasMap ? (
					<div className={styles.mapWrap}>
						<GeofenceMap
							key={mapKey}
							center={{ latitude: site.latitude, longitude: site.longitude }}
							radius={site.radius || 100}
							height="100%"
							clockInLocation={isRealFix(clockIn?.location) ? clockIn.location : null}
							clockOutLocation={isRealFix(clockOut?.location) ? clockOut.location : null}
							locationCheckLocation={checkPin}
						/>
					</div>
				) : (
					<p className={`${styles.empty} ${styles.noMap}`}>{noMapText}</p>
				)}
			</div>
		</div>
	);
}
