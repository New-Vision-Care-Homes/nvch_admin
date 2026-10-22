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
//   clockIn       {{ location, address, distanceMeters, insideGeofence }}
//   clockOut      {{ location, address, distanceMeters, insideGeofence, note }}
//                 insideGeofence — true / false adds "inside" / "outside the
//                        geofence"; null or missing says neither (same rule
//                        for clock-in, clock-out and the location check)
//                 note — replaces the value when there's no location
//                        (e.g. "No location — closed by the system")
//   locationCheck {object|null}  the end-of-shift GPS check, as stored on the shift
//   mapKey        {string}   re-initialises the map when it changes
//
// A (0, 0) location is the server's "no fix" placeholder for a system close,
// so it's never drawn as a pin.

import GeofenceMap from "@components/UI/Map/GeofenceMap";
import { MapPin, LogIn, LogOut, LocateFixed, TriangleAlert, History } from "lucide-react";
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

/**
 * "120 m from the site · outside the geofence" — whatever is known. A null
 * insideGeofence (no geofence to compare against) says neither.
 */
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

const FLAG_ICONS = { warning: TriangleAlert, stale: History };

/**
 * One coloured block: label, main value, an optional muted line under it, and
 * any flags ({ kind: "warning" | "stale", text }) as their own lines below.
 */
function LocationBlock({ tone, Icon, label, value, detail, flags }) {
	return (
		<div className={`${styles.block} ${styles[tone]}`}>
			<div className={styles.blockIcon}><Icon size={13} /></div>
			<div className={styles.blockBody}>
				<p className={styles.blockLabel}>{label}</p>
				<p className={styles.blockValue}>{value}</p>
				{detail && <p className={styles.blockDetail}>{detail}</p>}
				{flags?.map(({ kind, text }) => {
					const FlagIcon = FLAG_ICONS[kind];
					return (
						<p key={kind} className={`${styles.blockFlag} ${styles[`flag_${kind}`]}`}>
							<FlagIcon size={12} className={styles.blockFlagIcon} />
							<span>{text}</span>
						</p>
					);
				})}
			</div>
		</div>
	);
}

/**
 * Block content for any point — clock-in, clock-out or location check — in one
 * order:
 *   1. the address, with the distance / inside-outside under it
 *   2. a note when there's no location ("No location — closed by the system",
 *      "No response", "Not sent — …"), with its own detail line if any
 *   3. the distance / inside-outside ("120 m from the site · outside the geofence")
 *   4. "Recorded — see the map" when there's only a pin
 * Any point.flags are passed through. Returns null for "nothing to show".
 */
function describePoint(point) {
	if (!point) return null;
	const flags = point.flags?.length ? point.flags : null;
	const position = describePosition(point);
	const address = point.location?.address || point.address || null;
	if (address) return { value: address, detail: position || null, flags };
	if (point.note) return { value: point.note, detail: point.noteDetail ?? null, flags };
	if (position) return { value: position, detail: null, flags };
	if (isRealFix(point.location)) return { value: "Recorded — see the map", detail: null, flags };
	return null;
}

/**
 * Warnings about how trustworthy a received fix is: a fake-GPS app was on, or
 * the reading was old / the phone's cached last-known location.
 */
function checkFlags(check) {
	const flags = [];
	if (check.isMocked === true) {
		flags.push({ kind: "warning", text: "Fake GPS app was on — this location can't be trusted" });
	}
	if (check.fixSource === "lastKnown") {
		flags.push({ kind: "stale", text: "Cached reading — the phone's last known location, not a fresh fix" });
	} else if (check.staleFix === true) {
		flags.push({ kind: "stale", text: "Old reading — the GPS fix was out of date" });
	}
	return flags;
}

/**
 * The location check as a point: a received check is a location with its
 * distance and inside/outside (plus fake-GPS / old-reading flags); a received
 * check with a fixError is a note with the reason; any other result is a note
 * ("No response", "Not sent — app version too old", "Sent, no reply yet").
 */
function checkToPoint(check) {
	if (!check) return null;
	if (check.status === "received") {
		const flags = checkFlags(check);
		// The phone answered but couldn't get a location
		if (check.fixError) {
			return { note: "Received — no location", noteDetail: String(check.fixError), flags };
		}
		const point = {
			location:       { latitude: check.latitude, longitude: check.longitude },
			distanceMeters: check.distanceMeters,
			insideGeofence: check.insideGeofence,
			flags,
		};
		// Received but nothing to show at all — still say it came back
		return describePosition(point) || isRealFix(point.location) ? point : { note: LOCATION_CHECK_LABELS.received, flags };
	}
	const reason = check.status === "not_sent" ? NOT_SENT_REASON_LABELS[check.notSentReason] : null;
	return {
		note: `${LOCATION_CHECK_LABELS[check.status] ?? check.status}${reason ? ` — ${reason}` : ""}`,
		noteDetail: check.status === "no_response"
			? "A phone whose app was swiped away can't answer — this isn't proof the caregiver had left."
			: null,
	};
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

	const checkPoint = checkToPoint(locationCheck);

	// Same rule for all three blocks, and a pin wherever there's a real fix
	const clockInBlock  = describePoint(clockIn);
	const clockOutBlock = describePoint(clockOut);
	const checkBlock    = describePoint(checkPoint);
	const pin = (point) => (isRealFix(point?.location) ? point.location : null);

	const hasBlocks = serviceAddress || clockInBlock || clockOutBlock || checkBlock;

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
					{checkBlock && (
						<LocationBlock tone="amber" Icon={LocateFixed} label="Location Check (5 min before end)" {...checkBlock} />
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
							clockInLocation={pin(clockIn)}
							clockOutLocation={pin(clockOut)}
							locationCheckLocation={pin(checkPoint)}
						/>
					</div>
				) : (
					<p className={`${styles.empty} ${styles.noMap}`}>{noMapText}</p>
				)}
			</div>
		</div>
	);
}
