"use client";

import { Card, CardHeader, CardContent, InfoField } from "@components/UI/Form/Card";
import StatusBadge from "@components/UI/Feedback/Badge";
import GeofenceMap from "@components/UI/Map/GeofenceMap";
import {
    User, Home, CalendarDays, ExternalLink, ClockAlert,
    MapPin, MessageSquare, Activity, Smartphone, BadgeCheck,
} from "lucide-react";
import { formatDateTime, DISPLAY_TZ } from "@/utils/dates";
import { utcToDisplayTime } from "@/utils/timeHandling";
import { CLOCK_OUT_TRIGGER_LABELS } from "../../_utils/approvalMeta";
import styles from "../approval_detail.module.css";

// ─── ClockOutReviewApproval ───────────────────────────────────────────────────
//
// Renders the left-column subject cards for clock_out_review approvals: a
// shift ended without a verified clock-out at the home (signed out by the
// system or the app, or clocked out off-site), and the reviewer decides how
// much of it to pay. subjectContext is a snapshot taken when the review opened;
// explanation and decision are filled in later.
//
// Five cards:
//   1. What happened — caregiver, house, shift link, trigger, clock-in/out,
//                      credited end and hours, reminders sent, prior reviews
//   2. Map           — site circle with clock-in, clock-out and location-check
//                      pins. Polygon geofences send site: null, so the map
//                      only renders for circle geofences.
//   3. App activity  — whether the app kept answering the background checks,
//                      gaps, Low Power Mode, and the phone setup at clock-in
//   4. Explanation   — the caregiver's note, or when it's due
//   5. Outcome       — subjectContext.decision, once decided
//
// Props:
//   approvalId      {string}  — keys the map so it re-initialises per approval
//   subjectContext  {object}  — approval.subjectContext
//   caregiverName   {string}
//   onNavigateShift {fn}      — navigate to the shift detail page

const TRIGGER_DESCRIPTIONS = {
    server_auto:     "The caregiver never clocked out, so the server closed the shift 10 minutes after its scheduled end. No location was captured.",
    app_auto:        "The app clocked the caregiver out automatically 5 minutes after the scheduled end.",
    off_site_manual: "The caregiver clocked out themselves from outside the shift's location.",
};

const REMINDER_LABELS = {
    "t-15m": "15 min before end — shift checklist",
    "t-5m":  "5 min before end — \"Clock out in 5 minutes\"",
    "t0":    "At the end — \"Your shift has ended\"",
};

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

const PRESENCE_META = {
    active:        { label: "App active",     tone: "success" },
    not_active:    { label: "App not active", tone: "danger"  },
    not_monitored: { label: "Not monitored",  tone: "neutral" },
};

// Phone setup at clock-in — [label, value → display text, value → is it OK?].
// "unknown" / null values read as "Unknown" and aren't flagged either way.
const DEVICE_FIELDS = [
    ["locationPermission",  "Location Access",     { always: "Always", whileInUse: "While using the app", denied: "Denied" }, (v) => v === "always"],
    ["locationAccuracy",    "Precise Location",    { full: "On", reduced: "Off (approximate)" },                              (v) => v === "full"],
    ["notifications",       "Notifications",       { allowed: "Allowed", denied: "Denied" },                                  (v) => v === "allowed"],
    ["backgroundRefresh",   "Background Refresh",  { available: "On", denied: "Off", restricted: "Restricted", not_applicable: "N/A (Android)" }, (v) => v === "available" || v === "not_applicable"],
    ["batteryOptimization", "Battery Optimisation", { unrestricted: "Unrestricted", optimized: "Optimised", restricted: "Restricted", not_applicable: "N/A (iOS)" }, (v) => v === "unrestricted" || v === "not_applicable"],
    ["powerSaving",         "Low Power Mode",      { true: "On", false: "Off" },                                              (v) => v === false],
];

const PLATFORM_LABELS = { ios: "iPhone", android: "Android" };

/** "14:18" in business time — for times within a single shift. */
function formatTime(iso) {
    return utcToDisplayTime(iso, DISPLAY_TZ) || "—";
}

function formatHours(hours) {
    return Number.isFinite(hours) ? `${Math.round(hours * 100) / 100} h` : "—";
}

function formatMeters(meters) {
    return Number.isFinite(meters) ? `${Math.round(meters)} m` : null;
}

/** "120 m from the site · outside" — distance plus the geofence verdict when known. */
function describePosition(distanceMeters, insideGeofence, accuracy) {
    const parts = [];
    const distance = formatMeters(distanceMeters);
    if (distance) parts.push(`${distance} from the site`);
    if (insideGeofence === true)  parts.push("inside the geofence");
    if (insideGeofence === false) parts.push("outside the geofence");
    const acc = formatMeters(accuracy);
    if (acc) parts.push(`GPS accuracy ±${acc}`);
    return parts.join(" · ");
}

function hasCoordinates(location) {
    return Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude);
}

/**
 * Address on top with the distance underneath — never raw coordinates. Without
 * an address the distance becomes the main line; the map shows the exact spot.
 */
function LocationSummary({ address, position }) {
    if (!address && !position) return "Recorded — see the map";
    if (!address) return position;
    return (
        <>
            <div>{address}</div>
            {position && <div className={styles.mutedText}>{position}</div>}
        </>
    );
}

export default function ClockOutReviewApproval({
    approvalId,
    subjectContext,
    caregiverName,
    onNavigateShift,
}) {
    const ctx           = subjectContext ?? {};
    const site          = ctx.site ?? null;
    const clockIn       = ctx.clockIn ?? {};
    const clockOut      = ctx.clockOut ?? {};
    const locationCheck = ctx.locationCheck ?? null;
    const presence      = ctx.presence ?? null;
    const device        = clockIn.device ?? null;
    const explanation   = ctx.explanation ?? null;
    const decision      = ctx.decision ?? null;
    const reminders     = ctx.remindersSent ?? [];
    const prior         = ctx.priorReviews30d ?? null;
    const isServerClose = ctx.trigger === "server_auto";

    const hasSiteCoordinates = hasCoordinates(site);
    const checkPin = locationCheck?.status === "received" && hasCoordinates(locationCheck)
        ? { latitude: locationCheck.latitude, longitude: locationCheck.longitude }
        : null;

    // The open gap (no endedAt) is the current quiet stretch — its first missed
    // check is when the app stopped answering.
    const openGap      = presence?.gaps?.find((gap) => !gap.endedAt) ?? null;
    const presenceMeta = PRESENCE_META[presence?.status] ?? PRESENCE_META.not_monitored;

    const clockOutPosition = describePosition(clockOut.distanceMeters, clockOut.insideGeofence, clockOut.accuracy);

    return (
        <>
            {/* ── What happened ────────────────────────────────────────────── */}
            <Card>
                <CardHeader>
                    <span className={styles.cardTitleInner}>
                        <ClockAlert size={15} />
                        What Happened
                    </span>
                </CardHeader>
                <CardContent>
                    <div className={styles.subjectBlock}>

                        {/* Caregiver */}
                        <div className={styles.subjectRow}>
                            <div className={styles.subjectIconBox}>
                                <User size={16} color="#d97706" />
                            </div>
                            <div className={styles.subjectRowBody}>
                                <span className={styles.subjectRowLabel}>Caregiver</span>
                                <span className={styles.subjectRowValue}>{caregiverName}</span>
                            </div>
                        </div>

                        {/* House */}
                        <div className={styles.subjectRow}>
                            <div className={styles.subjectIconBox}>
                                <Home size={16} color="#d97706" />
                            </div>
                            <div className={styles.subjectRowBody}>
                                <span className={styles.subjectRowLabel}>House</span>
                                <span className={styles.subjectRowValue}>{ctx.homeName || "Client visit"}</span>
                            </div>
                        </div>

                        {/* Shift link */}
                        <div
                            className={`${styles.subjectRow} ${styles.subjectRowLink}`}
                            role="button"
                            tabIndex={0}
                            onClick={onNavigateShift}
                            onKeyDown={(event) => event.key === "Enter" && onNavigateShift()}
                        >
                            <div className={styles.subjectIconBox}>
                                <CalendarDays size={16} color="#d97706" />
                            </div>
                            <div className={styles.subjectRowBody}>
                                <span className={styles.subjectRowLabel}>Shift Window</span>
                                <span className={styles.subjectRowValue}>
                                    {ctx.shiftStartTime && ctx.shiftEndTime
                                        ? `${formatDateTime(ctx.shiftStartTime)} – ${formatDateTime(ctx.shiftEndTime)}`
                                        : "View Shift"}
                                </span>
                            </div>
                            <ExternalLink size={13} className={styles.subjectRowLinkIcon} />
                        </div>

                    </div>

                    <div style={{ marginTop: "12px" }}>
                        <InfoField label="What Happened">
                            <strong>{CLOCK_OUT_TRIGGER_LABELS[ctx.trigger] ?? "Clock-out review"}</strong>
                            {TRIGGER_DESCRIPTIONS[ctx.trigger] && (
                                <div className={styles.mutedText}>{TRIGGER_DESCRIPTIONS[ctx.trigger]}</div>
                            )}
                        </InfoField>
                        <div className={styles.photoDetailsGrid}>
                            <InfoField label="Clocked In (paid from)">
                                {formatDateTime(clockIn.at)}
                            </InfoField>
                            <InfoField label="Signed Out At">
                                {formatDateTime(clockOut.recordedAt)}
                            </InfoField>
                            <InfoField label="Credited End">
                                {formatDateTime(clockOut.creditedEndTime)}
                            </InfoField>
                            <InfoField label="Hours Credited">
                                {formatHours(ctx.hoursCredited)}
                            </InfoField>
                        </div>
                        {clockOut.endEarlyReason && (
                            <InfoField label="Reason for Ending Early">
                                {clockOut.endEarlyReason}
                            </InfoField>
                        )}
                        <InfoField label="Reminders Sent">
                            {reminders.length === 0 ? "None" : (
                                <ul className={styles.plainList}>
                                    {reminders.map((reminder) => (
                                        <li key={reminder.stage}>
                                            <span className={styles.plainListTime}>{formatTime(reminder.at)}</span>
                                            {REMINDER_LABELS[reminder.stage] ?? reminder.stage}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </InfoField>
                        <InfoField label="Clock-Out Reviews in the Last 30 Days">
                            {prior?.total
                                ? `${prior.total} earlier review${prior.total === 1 ? "" : "s"}${prior.rejected ? ` · ${prior.rejected} rejected` : ""}`
                                : "None"}
                        </InfoField>
                    </div>
                </CardContent>
            </Card>

            {/* ── Caregiver's explanation ──────────────────────────────────── */}
            <Card>
                <CardHeader>
                    <span className={styles.cardTitleInner}>
                        <MessageSquare size={15} />
                        Caregiver&apos;s Explanation
                    </span>
                </CardHeader>
                <CardContent>
                    {explanation ? (
                        <>
                            <div className={styles.decisionReasonBox}>{explanation.note}</div>
                            <div className={styles.photoDetailsGrid}>
                                <InfoField label="Time They Left">
                                    {explanation.leftAt ? formatDateTime(explanation.leftAt) : "Not given"}
                                </InfoField>
                                <InfoField label="Submitted">
                                    {formatDateTime(explanation.submittedAt)}
                                </InfoField>
                            </div>
                        </>
                    ) : decision ? (
                        <p className={styles.mutedText} style={{ margin: 0 }}>No explanation was submitted.</p>
                    ) : (
                        <p className={styles.mutedText} style={{ margin: 0 }}>
                            Not submitted yet — they have until <strong>{formatDateTime(ctx.explanationDueAt)}</strong>.
                            {ctx.awaitingExplanation && " Pay can't be reduced until they explain or the deadline passes."}
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* ── Outcome ──────────────────────────────────────────────────── */}
            {decision && (
                <Card>
                    <CardHeader>
                        <span className={styles.cardTitleInner}>
                            <BadgeCheck size={15} />
                            Outcome
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className={styles.photoDetailsGrid}>
                            <InfoField label="Decision">
                                <StatusBadge
                                    label={decision.outcome === "rejected" ? "Rejected" : "Approved"}
                                    tone={decision.outcome === "rejected" ? "danger" : "success"}
                                    size="pill"
                                />
                            </InfoField>
                            <InfoField label="Paid Until">
                                {formatDateTime(decision.paidUntil)}
                            </InfoField>
                            <InfoField label="Hours Before">
                                {formatHours(decision.hoursBefore)}
                            </InfoField>
                            <InfoField label="Hours Paid">
                                {formatHours(decision.hoursAfter)}
                                {decision.hoursAfter === decision.hoursBefore && (
                                    <span className={styles.mutedText}> (unchanged)</span>
                                )}
                            </InfoField>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ── Map ──────────────────────────────────────────────────────── */}
            <Card>
                <CardHeader>
                    <span className={styles.cardTitleInner}>
                        <MapPin size={15} />
                        Service Location
                    </span>
                </CardHeader>
                <CardContent>
                    {hasSiteCoordinates ? (
                        <GeofenceMap
                            key={approvalId}
                            center={{ latitude: site.latitude, longitude: site.longitude }}
                            radius={site.radius}
                            height="300px"
                            clockInLocation={hasCoordinates(clockIn.location) ? clockIn.location : null}
                            clockOutLocation={hasCoordinates(clockOut.location) ? clockOut.location : null}
                            locationCheckLocation={checkPin}
                        />
                    ) : (
                        <p className={styles.mutedText} style={{ margin: 0 }}>
                            No map — this shift&apos;s location isn&apos;t a circle geofence.
                        </p>
                    )}

                    <div style={{ marginTop: "12px" }}>
                        <InfoField label="Clock-In Location">
                            {clockIn.location ? (
                                <LocationSummary
                                    address={clockIn.location.address}
                                    position={formatMeters(clockIn.distanceMeters) && `${formatMeters(clockIn.distanceMeters)} from the site`}
                                />
                            ) : "—"}
                        </InfoField>
                        <InfoField label="Clock-Out Location">
                            {isServerClose ? (
                                "No location — closed by the system"
                            ) : clockOut.location ? (
                                <LocationSummary address={clockOut.location.address} position={clockOutPosition} />
                            ) : "—"}
                        </InfoField>
                        <InfoField label="Location Check (5 min before end)">
                            {!locationCheck ? "None sent" : (
                                <>
                                    <div>
                                        {LOCATION_CHECK_LABELS[locationCheck.status] ?? locationCheck.status}
                                        {locationCheck.status === "not_sent" && NOT_SENT_REASON_LABELS[locationCheck.notSentReason]
                                            ? ` — ${NOT_SENT_REASON_LABELS[locationCheck.notSentReason]}`
                                            : ""}
                                        {locationCheck.respondedAt ? ` at ${formatTime(locationCheck.respondedAt)}` : ""}
                                    </div>
                                    {locationCheck.status === "received" && (
                                        <div className={styles.mutedText}>
                                            {describePosition(locationCheck.distanceMeters, locationCheck.insideGeofence, locationCheck.accuracy)}
                                            {locationCheck.staleFix ? " · older GPS fix" : ""}
                                            {locationCheck.isMocked ? " · mocked location reported" : ""}
                                        </div>
                                    )}
                                    {locationCheck.status === "no_response" && (
                                        <div className={styles.mutedText}>
                                            A phone whose app was swiped away can&apos;t answer — this isn&apos;t proof the caregiver had left.
                                        </div>
                                    )}
                                </>
                            )}
                        </InfoField>
                    </div>
                </CardContent>
            </Card>

            {/* ── App activity ─────────────────────────────────────────────── */}
            <Card>
                <CardHeader>
                    <span className={styles.cardTitleInner}>
                        <Activity size={15} />
                        App Activity
                    </span>
                </CardHeader>
                <CardContent>
                    <InfoField label="Status">
                        <StatusBadge label={presenceMeta.label} tone={presenceMeta.tone} size="pill" />
                        <div className={styles.mutedText}>
                            {!presence
                                ? "The app wasn't checked during this shift."
                                : presence.status === "not_active"
                                ? `Not answering since ${formatTime(openGap?.firstMissedPingAt)}${presence.lastSeenAt ? ` (last reply ${formatTime(presence.lastSeenAt)})` : ""}`
                                : presence.status === "active"
                                ? `Last reply ${formatTime(presence.lastSeenAt)}`
                                : "This phone or app version can't be checked."}
                        </div>
                    </InfoField>
                    {presence && presence.status !== "not_monitored" && (
                        <>
                            <div className={styles.photoDetailsGrid}>
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
                                                Not active {formatTime(gap.firstMissedPingAt)} – {gap.endedAt ? formatTime(gap.endedAt) : "clock-out"}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </InfoField>
                            <p className={styles.mutedText} style={{ margin: "4px 0 16px" }}>
                                &quot;Not active&quot; is a warning, not proof: no signal, a dead battery, Low Power Mode
                                or the phone&apos;s own throttling can also leave checks unanswered.
                            </p>
                        </>
                    )}
                    <div className={styles.cardSubheading}>
                        <Smartphone size={13} />
                        Phone Setup at Clock-In
                    </div>
                    {!device ? (
                        <p className={styles.mutedText} style={{ margin: 0 }}>
                            Not reported — the app version used doesn&apos;t send it.
                        </p>
                    ) : (
                        <div className={styles.photoDetailsGrid}>
                            <InfoField label="Phone">
                                {[PLATFORM_LABELS[device.platform] ?? device.platform, device.appVersion && `app ${device.appVersion}`]
                                    .filter(Boolean).join(" · ") || "—"}
                            </InfoField>
                            {DEVICE_FIELDS.map(([key, label, valueLabels, isOk]) => {
                                const value = device[key];
                                const text  = valueLabels[String(value)] ?? "Unknown";
                                const known = text !== "Unknown" && !text.startsWith("N/A");
                                return (
                                    <InfoField key={key} label={label}>
                                        <span style={known && !isOk(value) ? { color: "#b91c1c", fontWeight: 600 } : undefined}>
                                            {text}
                                        </span>
                                    </InfoField>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
}
