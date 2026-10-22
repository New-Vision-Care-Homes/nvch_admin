"use client";

// ─── AppActivityPanel ─────────────────────────────────────────────────────────
//
// "App Activity" content shared by the shift detail page and the clock-out
// review approval page: whether the caregiver's app kept answering the
// server's background checks during the shift, and how the phone was set up at
// clock-in.
//
// A panel, like ServiceLocationPanel: content only. The caller wraps it in its
// own Card / CardHeader ("App Activity") / CardContent.
//
// Both pages pass the same two objects, from different places:
//   shift page    — shift.presence / shift.clockInDevice (live)
//   approval page — subjectContext.presence / subjectContext.clockIn.device
//                   (a snapshot taken when the review opened)
//
// Props:
//   presence {object|null}  the app activity check — null when the shift was never checked
//   device   {object|null}  phone setup at clock-in — null for app builds that don't send it

import { InfoField } from "@components/UI/Form/Card";
import StatusBadge from "@components/UI/Feedback/Badge";
import { Smartphone, ChevronDown, Info } from "lucide-react";
import { formatDateTime, DISPLAY_TZ } from "@/utils/dates";
import { utcToDisplayTime } from "@/utils/timeHandling";
import styles from "./AppActivityPanel.module.css";

const PRESENCE_META = {
	active:        { label: "Active",     tone: "success" },
	not_active:    { label: "Inactive", tone: "danger"  },
	not_monitored: { label: "Not monitored",  tone: "neutral" },
};

// presence.notMonitoredReason
const NOT_MONITORED_REASONS = {
	no_device:               "No registered phone",
	app_version_unsupported: "App version is too old",
	push_unavailable:        "Notifications unavailable",
};

// Phone setup at clock-in — [key, label, value → display text, value → is it OK?].
// "unknown" / null values read as "Unknown" and aren't flagged either way.
const SHARED_DEVICE_FIELDS = [
	["locationPermission",  "Location Access",      { always: "Always", whileInUse: "While using the app", denied: "Denied" }, (v) => v === "always"],
	["locationAccuracy",    "Precise Location",     { full: "On", reduced: "Off (approximate)" },                              (v) => v === "full"],
	["notifications",       "Notifications",        { allowed: "Allowed", denied: "Denied" },                                  (v) => v === "allowed"],
];

// Each platform lists only the settings its phones have. An unknown platform gets the shared ones.
const DEVICE_FIELDS = {
	ios: [
		...SHARED_DEVICE_FIELDS,
		["backgroundRefresh",   "Background Refresh",       { available: "On", denied: "Off", restricted: "Restricted" },             (v) => v === "available"],
		["powerSaving",         "Low Power Mode",           { true: "On", false: "Off" },                                              (v) => v === false],
	],
	android: [
		...SHARED_DEVICE_FIELDS,
		["batteryOptimization", "Battery Optimisation",     { unrestricted: "Unrestricted", optimized: "Optimised", restricted: "Restricted" }, (v) => v === "unrestricted"],
		["powerSaving",         "Battery Saver",            { true: "On", false: "Off" },                                              (v) => v === false],
	],
};

const PLATFORM_LABELS = { ios: "iPhone", android: "Android" };

/** Shown when hovering the info icon next to the status. */
const NOT_ACTIVE_HINT = "\"Inactive\" is a warning, not proof: no signal, a dead battery, "
	+ "Battery Saver/Low Power Mode or the phone's own throttling can also leave checks unanswered.";

/** The line under the status badge: "checked …" / "since …". */
function describePresence(presence) {
	if (!presence) return "The app wasn't checked during this shift.";
	if (presence.status === "active") {
		return `checked ${formatDateTime(presence.lastSeenAt)}`;
	}
	if (presence.status === "not_active") {
		const lastReply = presence.lastSeenAt ? ` (last reply ${utcToDisplayTime(presence.lastSeenAt, DISPLAY_TZ)})` : "";
		return `since ${formatDateTime(presence.silentSince)}${lastReply}`;
	}
	const reason = NOT_MONITORED_REASONS[presence.notMonitoredReason];
	return reason ? `${reason}` : "This phone or app version can't be checked.";
}

export default function AppActivityPanel({ presence, device }) {
	const presenceMeta = PRESENCE_META[presence?.status] ?? PRESENCE_META.not_monitored;
	const isMonitored  = presence && presence.status !== "not_monitored";
	// What this phone calls its power-saving setting, for the "Seen on at" row
	const powerSavingLabel = DEVICE_FIELDS[device?.platform]?.find(([key]) => key === "powerSaving")?.[1] ?? "Low Power Mode";
	
	// Phone setup rows. Each value gets a state that colours it:
	//   good    — set up right (green)          e.g. Precise Location "On", Low Power Mode "Off"
	//   bad     — weakens the checks (red)      e.g. Notifications "Denied", Low Power Mode "On"
	//   unknown — the app couldn't tell (amber)
	// Only "bad" counts towards "N settings need attention".
	const deviceRows = device
		? (DEVICE_FIELDS[device.platform] ?? SHARED_DEVICE_FIELDS).map(([key, label, valueLabels, isOk]) => {
			const text  = valueLabels[String(device[key])] ?? "Unknown";
			const state = text === "Unknown"     ? "unknown"
				: isOk(device[key])               ? "good"
				: "bad";
			return { key, label, text, state };
		})
		: [];
	const weakSettings = deviceRows.filter((row) => row.state === "bad").length;

	return (
		<>
			{/* "Status" label, badge and hint on one row — InfoField would stack the label above */}
			<div className={styles.statusField}>
				<div className={styles.statusRow}>
					<span className={styles.statusLabel}>Status</span>
					<StatusBadge label={presenceMeta.label} tone={presenceMeta.tone} size="pill" />
					{/* Hover hint — the browser's own tooltip (title), same as hovering a shift on
					    the scheduling page. Only where checks ran, so "inactive" can apply. */}
					{isMonitored && presenceMeta.label === "Inactive" && (
						<span className={styles.hint} title={NOT_ACTIVE_HINT} aria-label={NOT_ACTIVE_HINT}>
							<Info size={14} />
						</span>
					)}
				</div>
				<div className={styles.mutedText}>{describePresence(presence)}</div>
			</div>

			{isMonitored && (
				<>
					<div className={styles.detailsGrid}>
						<InfoField label="Checks Answered">
							{`${presence.pingsAnswered ?? 0} of ${presence.pingsSent ?? 0}`}
						</InfoField>
						<InfoField label={powerSavingLabel}>
							{presence.powerSavingSeenAt
								? `Seen on at ${utcToDisplayTime(presence.powerSavingSeenAt, DISPLAY_TZ)}`
								: "Not seen"}
						</InfoField>
					</div>
					<InfoField label="Gaps">
						{!presence.gaps?.length ? "None" : (
							<ul className={styles.plainList}>
								{presence.gaps.map((gap) => (
									<li key={gap.firstMissedPingAt}>
										Inactive {utcToDisplayTime(gap.firstMissedPingAt, DISPLAY_TZ)} – {gap.endedAt ? utcToDisplayTime(gap.endedAt, DISPLAY_TZ) : "clock-out"}
									</li>
								))}
							</ul>
						)}
					</InfoField>
				</>
			)}

			{/* Phone setup — collapsed to a one-line summary; rarely needed in full */}
			{!device ? (
				<div className={styles.subheading}>
					<Smartphone size={13} />
					Phone Setup at Clock-In
					<span className={styles.phoneSetupSummary}>Not reported — the app version used doesn&apos;t send it</span>
				</div>
			) : (
				<details className={styles.phoneSetup}>
					<summary className={styles.subheading}>
						<Smartphone size={13} />
						Phone Setup at Clock-In
						<span className={`${styles.phoneSetupSummary} ${weakSettings ? styles.phoneSetupSummaryBad : ""}`}>
							{weakSettings
								// "needs attention", not "off" — a setting can be wrong by being
								// on (Low Power Mode) as well as off (notifications)
								? `${weakSettings} setting${weakSettings === 1 ? " needs" : "s need"} attention`
								: "All settings OK"}
						</span>
						<ChevronDown size={14} className={styles.phoneSetupChevron} />
					</summary>
					<div className={styles.detailsGrid}>
						<InfoField label="Phone">
							{[PLATFORM_LABELS[device.platform] ?? device.platform, device.appVersion && `app ${device.appVersion}`]
								.filter(Boolean).join(" · ") || "—"}
						</InfoField>
						{deviceRows.map(({ key, label, text, state }) => (
							<InfoField key={key} label={label}>
								<span className={styles[`setting_${state}`]}>{text}</span>
							</InfoField>
						))}
					</div>
				</details>
			)}
		</>
	);
}
