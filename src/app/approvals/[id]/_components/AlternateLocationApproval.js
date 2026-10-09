"use client";

import { useState } from "react";
import { Card, CardHeader, CardContent, InfoField } from "@components/UI/Form/Card";
import GeofenceMap from "@components/UI/Map/GeofenceMap";
import {
    User, Home, CalendarDays, ExternalLink,
    MapPin, MessageSquare, Camera, ImageOff,
} from "lucide-react";
import { formatDateTime } from "@/utils/dates";
import styles from "../approval_detail.module.css";

// ─── AlternateLocationApproval ────────────────────────────────────────────────
//
// Renders the left-column subject cards for alternate_location_clock_in
// approvals: the caregiver clocked in outside the shift's geofence and sent a
// written explanation plus a live photo taken with the app's camera.
//
// Three cards:
//   1. Request — caregiver, house, shift link, clock-in time / distance /
//                address, and the caregiver's explanation
//   2. Photo   — the photo and its capture metadata. fileUrl is a 1-hour signed
//                link, so a page left open longer falls back to a plain link.
//   3. Map     — shift location vs. clock-in point. Polygon geofences send
//                site: null, so the map only renders for circle geofences.
//
// Props:
//   approvalId      {string}  — keys the map so it re-initialises per approval
//   subjectContext  {object}  — approval.subjectContext
//   caregiverName   {string}
//   onNavigateShift {fn}      — navigate to the shift detail page

const LENS_LABELS = { back: "Back", front: "Front" };

function formatMeters(meters) {
    return Number.isFinite(meters) ? `${Math.round(meters)} m` : null;
}

function formatCoordinates(location) {
    if (!Number.isFinite(location?.latitude) || !Number.isFinite(location?.longitude)) return null;
    const accuracy = formatMeters(location.accuracy);
    return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}${accuracy ? ` (±${accuracy})` : ""}`;
}

export default function AlternateLocationApproval({
    approvalId,
    subjectContext,
    caregiverName,
    onNavigateShift,
}) {
    // Keyed by URL rather than a boolean: a refetch brings a freshly signed
    // URL, which deserves another load attempt.
    const [failedPhotoUrl, setFailedPhotoUrl] = useState(null);

    const ctx             = subjectContext ?? {};
    const photo           = ctx.photo ?? {};
    const clockInLocation = ctx.clockInLocation ?? null;
    const site            = ctx.site ?? null;
    const photoUrl        = ctx.fileUrl ?? null;
    const photoLoadFailed = !!photoUrl && failedPhotoUrl === photoUrl;

    const hasSiteCoordinates = Number.isFinite(site?.latitude) && Number.isFinite(site?.longitude);

    const clockInDistance  = formatMeters(ctx.distanceMeters);
    const clockInAccuracy  = formatMeters(clockInLocation?.accuracy);
    const clockInAddress   = clockInLocation?.address || formatCoordinates(clockInLocation);
    const photoCoordinates = formatCoordinates(photo);
    const photoDistance    = formatMeters(photo.distanceMeters);
    const photoSize        = Number.isFinite(photo.sizeBytes) ? `${Math.round(photo.sizeBytes / 1024)} KB` : null;
    const photoDimensions  = photo.width && photo.height ? `${photo.width} × ${photo.height}` : null;

    return (
        <>
            {/* ── Request ──────────────────────────────────────────────────── */}
            <Card>
                <CardHeader>
                    <span className={styles.cardTitleInner}>
                        <MapPin size={15} />
                        Alternate Location Clock-In
                    </span>
                </CardHeader>
                <CardContent>
                    <div className={styles.subjectBlock}>

                        {/* Caregiver */}
                        <div className={styles.subjectRow}>
                            <div className={styles.subjectIconBox}>
                                <User size={16} color="#2563eb" />
                            </div>
                            <div className={styles.subjectRowBody}>
                                <span className={styles.subjectRowLabel}>Caregiver</span>
                                <span className={styles.subjectRowValue}>{caregiverName}</span>
                            </div>
                        </div>

                        {/* House */}
                        <div className={styles.subjectRow}>
                            <div className={styles.subjectIconBox}>
                                <Home size={16} color="#2563eb" />
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
                                <CalendarDays size={16} color="#2563eb" />
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
                        <InfoField label="Clocked In">
                            {formatDateTime(ctx.clockedInAt)}
                        </InfoField>
                        <InfoField label="Distance from Shift Location">
                            {clockInDistance
                                ? `${clockInDistance}${clockInAccuracy ? ` (GPS accuracy ±${clockInAccuracy})` : ""}`
                                : "—"}
                        </InfoField>
                        <InfoField label="Clock-In Address">
                            {clockInAddress || "—"}
                        </InfoField>
                        <InfoField label="Caregiver's Explanation">
                            <div className={styles.decisionReasonBox}>
                                <MessageSquare size={13} style={{ marginRight: 6, verticalAlign: "middle", color: "#9ca3af" }} />
                                {ctx.note || "—"}
                            </div>
                        </InfoField>
                    </div>
                </CardContent>
            </Card>

            {/* ── Photo ────────────────────────────────────────────────────── */}
            <Card>
                <CardHeader>
                    <span className={styles.cardTitleInner}>
                        <Camera size={15} />
                        Location Photo
                    </span>
                </CardHeader>
                <CardContent>
                    {!photoUrl ? (
                        <div className={`${styles.fileFallback} ${styles.photoPreview}`}>
                            <ImageOff size={32} color="#d1d5db" />
                            <p className={styles.fileFallbackText}>
                                The photo couldn&apos;t be loaded. Reload the page to try again.
                            </p>
                        </div>
                    ) : photoLoadFailed ? (
                        <div className={`${styles.fileFallback} ${styles.photoPreview}`}>
                            <ImageOff size={32} color="#d1d5db" />
                            <p className={styles.fileFallbackText}>
                                The photo link may have expired. Reload the page to get a fresh one.
                            </p>
                            <a
                                href={photoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.fileFallbackLink}
                            >
                                <ExternalLink size={14} />
                                Open photo
                            </a>
                        </div>
                    ) : (
                        <a
                            href={photoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${styles.fileImageWrap} ${styles.photoPreview}`}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element -- evidence photo behind a short-lived signed URL, shown as-is */}
                            <img
                                src={photoUrl}
                                alt={`Photo ${caregiverName} took at clock-in`}
                                className={styles.fileImage}
                                onError={() => setFailedPhotoUrl(photoUrl)}
                            />
                            <div className={styles.fileImageOverlay}>
                                <ExternalLink size={18} />
                                Open full size
                            </div>
                        </a>
                    )}

                    <div className={styles.photoDetailsGrid}>
                        <InfoField label="Taken (phone clock)">
                            {formatDateTime(photo.capturedAt)}
                        </InfoField>
                        <InfoField label="Uploaded (verified by AWS)">
                            {formatDateTime(photo.uploadedAt)}
                        </InfoField>
                        <InfoField label="Camera">
                            {LENS_LABELS[photo.lens] ?? "—"}
                        </InfoField>
                        <InfoField label="Size">
                            {photoSize
                                ? `${photoSize}${photoDimensions ? ` · ${photoDimensions}` : ""}`
                                : photoDimensions ?? "—"}
                        </InfoField>
                        <InfoField label="Distance from Shift Location">
                            {photoDistance ?? "—"}
                        </InfoField>
                        <InfoField label="Photo Location">
                            {photo.address || photoCoordinates ? (
                                <>
                                    {photo.address && <div>{photo.address}</div>}
                                    {photoCoordinates && <div className={styles.coordinatesText}>{photoCoordinates}</div>}
                                </>
                            ) : "—"}
                        </InfoField>
                    </div>
                </CardContent>
            </Card>

            {/* ── Map ──────────────────────────────────────────────────────── */}
            {hasSiteCoordinates && (
                <Card>
                    <CardHeader>
                        <span className={styles.cardTitleInner}>
                            <MapPin size={15} />
                            Shift Location vs. Clock-In
                        </span>
                    </CardHeader>
                    <CardContent>
                        <GeofenceMap
                            key={approvalId}
                            center={{ latitude: site.latitude, longitude: site.longitude }}
                            radius={site.radius}
                            height="300px"
                            clockInLocation={clockInLocation}
                        />
                    </CardContent>
                </Card>
            )}
        </>
    );
}
