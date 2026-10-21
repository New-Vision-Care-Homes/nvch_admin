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
// The snapshot has no silentSince or notMonitoredReason, so "inactive since"
// falls back to the open gap's first missed check, and the reason is optional.
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

// presence.notMonitoredReason (live shifts only)
const NOT_MONITORED_REASONS = {
	no_device:               "no registered phone",
	app_version_unsupported: "app version too old",
	push_unavailable:        "notifications unavailable",
};

// Phone setup at clock-in — [key, label, value → display text, value → is it OK?].
// "unknown" / null values read as "Unknown" and aren't flagged either way.
const DEVICE_FIELDS = [
	["locationPermission",  "Location Access",      { always: "Always", whileInUse: "While using the app", denied: "Denied" }, (v) => v === "always"],
	["locationAccuracy",    "Precise Location",     { full: "On", reduced: "Off (approximate)" },                              (v) => v === "full"],
	["notifications",       "Notifications",        { allowed: "Allowed", denied: "Denied" },                                  (v) => v === "allowed"],
	["backgroundRefresh",   "Background Refresh",   { available: "On", denied: "Off", restricted: "Restricted", not_applicable: "N/A (Android)" }, (v) => v === "available" || v === "not_applicable"],
	["batteryOptimization", "Battery Optimisation", { unrestricted: "Unrestricted", optimized: "Optimised", restricted: "Restricted", not_applicable: "N/A (iOS)" }, (v) => v === "unrestricted" || v === "not_applicable"],
	["powerSaving",         "Low Power Mode",       { true: "On", false: "Off" },                                              (v) => v === false],
];

const PLATFORM_LABELS = { ios: "iPhone", android: "Android" };

/** Shown when hovering the info icon next to the status. */
const NOT_ACTIVE_HINT = "\"Inactive\" is a warning, not proof: no signal, a dead battery, "
	+ "Low Power Mode or the phone's own throttling can also leave checks unanswered.";

/** "14:18" in business time — for times within a single shift. */
function formatTime(iso) {
	return utcToDisplayTime(iso, DISPLAY_TZ) || "—";
}

/** The line under the status badge: "App active (checked …)" / "App inactive since …". */
function describePresence(presence) {
	if (!presence) return "The app wasn't checked during this shift.";
	if (presence.status === "active") {
		return `checked ${formatDateTime(presence.lastSeenAt)}`;
	}
	if (presence.status === "not_active") {
		// Live shifts carry silentSince; the approval snapshot only has the gaps,
		// whose open one (no endedAt) is the current quiet stretch.
		const since = presence.silentSince ?? presence.gaps?.find((gap) => !gap.endedAt)?.firstMissedPingAt;
		const lastReply = presence.lastSeenAt ? ` (last reply ${formatTime(presence.lastSeenAt)})` : "";
		return `since ${formatDateTime(since)}${lastReply}`;
	}
	const reason = NOT_MONITORED_REASONS[presence.notMonitoredReason];
	return reason ? `${reason}` : "This phone or app version can't be checked.";
}

export default function AppActivityPanel({ presence, device }) {
	const presenceMeta = PRESENCE_META[presence?.status] ?? PRESENCE_META.not_monitored;
	const isMonitored  = presence && presence.status !== "not_monitored";

	// Phone setup rows. Each value gets a state that colours it:
	//   good    — set up right (green)          e.g. Precise Location "On", Low Power Mode "Off"
	//   bad     — weakens the checks (red)      e.g. Notifications "Denied", Low Power Mode "On"
	//   unknown — the app couldn't tell (amber)
	//   na      — doesn't apply to this phone (plain), e.g. "N/A (Android)"
	// Only "bad" counts towards "N settings need attention".
	const deviceRows = device
		? DEVICE_FIELDS
			// Battery optimisation is an Android setting — iPhones have none, so hide it
			.filter(([key]) => !(key === "batteryOptimization" && device.platform === "ios"))
			.map(([key, label, valueLabels, isOk]) => {
				const text  = valueLabels[String(device[key])] ?? "Unknown";
				const state = text === "Unknown"     ? "unknown"
					: text.startsWith("N/A")          ? "na"
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
						<InfoField label="Low Power Mode">
							{presence.powerSavingSeenAt
								? `Seen on at ${formatTime(presence.powerSavingSeenAt)}`
								: "Not seen"}
						</InfoField>
					</div>
					<InfoField label="Gaps">
						{!presence.gaps?.length ? "None" : (
							<ul className={styles.plainList}>
								{presence.gaps.map((gap) => (
									<li key={gap.firstMissedPingAt}>
										Inactive {formatTime(gap.firstMissedPingAt)} – {gap.endedAt ? formatTime(gap.endedAt) : "clock-out"}
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
