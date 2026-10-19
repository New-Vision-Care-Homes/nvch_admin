"use client";

import { Card, CardHeader, CardContent, InfoField } from "@components/UI/Form/Card";
import StatusBadge from "@components/UI/Feedback/Badge";
import ServiceLocationPanel from "@components/UI/Map/ServiceLocationPanel";
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
//   2. Map           — ServiceLocationPanel (shared with the shift detail
//                      page): address blocks beside the map with clock-in,
//                      clock-out and location-check pins. Polygon geofences
//                      send site: null, so only the blocks show.
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

    // The open gap (no endedAt) is the current quiet stretch — its first missed
    // check is when the app stopped answering.
    const openGap      = presence?.gaps?.find((gap) => !gap.endedAt) ?? null;
    const presenceMeta = PRESENCE_META[presence?.status] ?? PRESENCE_META.not_monitored;

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
                    <ServiceLocationPanel
                        mapKey={approvalId}
                        site={site}
                        noMapText="No map — this shift's location isn't a circle geofence."
                        serviceAddress={site?.address}
                        clockIn={{ location: clockIn.location, distanceMeters: clockIn.distanceMeters }}
                        clockOut={isServerClose
                            ? { note: "No location — closed by the system" }
                            : {
                                location:       clockOut.location,
                                distanceMeters: clockOut.distanceMeters,
                                insideGeofence: clockOut.insideGeofence,
                            }}
                        locationCheck={locationCheck}
                    />
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
