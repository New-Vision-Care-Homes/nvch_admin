import {
	Bell,
	AlertTriangle,
	Clock,
	Megaphone,
	CircleOff,
	ClipboardCheck,
	PiggyBank,
	House,
	Smartphone,
	Timer,
	Scale,
	Banknote,
	DollarSign,
	FileWarning,
	AlarmClockCheck,
	MapPin,
	Thermometer,
	ClockAlert,
} from "lucide-react";

/**
 * Notification icons shared by the notification page and the Navbar bell
 * dropdown, so a notification looks the same in both places.
 */

/**
 * Maps each notification type to an icon component + colour palette.
 * Portal-only: per the notification spec, shift_assigned, shifts_bulk_created,
 * shift_starting_soon, training_assigned, and training_outcome surface on
 * mobile only and are intentionally omitted here. approval_decided is kept —
 * the portal does receive it in practice.
 */
export const TYPE_CONFIG = {
	// Shift lifecycle
	shift_missed:                { Icon: AlertTriangle,  color: "#dc2626", bg: "#fef2f2" },
	shift_late_start:            { Icon: Clock,          color: "#d97706", bg: "#fffbeb" },
	shift_missed_reporting:      { Icon: AlertTriangle,  color: "#ea580c", bg: "#fff7ed" },
	shift_late_reporting:        { Icon: Clock,          color: "#d97706", bg: "#fffbeb" },
	shift_auto_ended:            { Icon: CircleOff,      color: "#6b7280", bg: "#f3f4f6" },
	// Payroll / house-hours review — house icon with a small corner badge
	// signalling *why* it's flagged (overdue vs. not started).
	house_hours_review_overdue:  { Icon: House, color: "#dc2626", bg: "#fef2f2", BadgeIcon: AlertTriangle, badgeColor: "#dc2626" },
	// Purple is reserved for approval_requested (see APPROVAL_SUBJECT_ICONS) —
	// this used to share that purple, which muddied "purple = needs approval".
	house_hours_review_not_done: { Icon: House, color: "#2563eb", bg: "#eff6ff", BadgeIcon: Clock,         badgeColor: "#2563eb" },
	bank_cap_exceeded:           { Icon: PiggyBank,      color: "#d97706", bg: "#fffbeb" },
	caregiver_device_enrolled:   { Icon: Smartphone,     color: "#0891b2", bg: "#ecfeff" },
	// Broadcasts & approvals — broadcast gets its own color, shared with nothing
	// else, so it reads as its own distinct category at a glance.
	broadcast:                   { Icon: Megaphone,      color: "#db2777", bg: "#fdf2f8" },
	approval_requested:          { Icon: ClipboardCheck, color: "#7c3aed", bg: "#f5f3ff" },
	// A caregiver's certificate is nearing its expiryDate — admin-facing copy of
	// the reminder (the caregiver gets their own mobile-only copy of this event).
	caregiver_certificate_expiring_soon: { Icon: FileWarning, color: "#ca8a04", bg: "#fefce8" },
	// A client's weekly allowable hours were changed. Recipients are resolved by
	// permission slug, not by home/region — distinct indigo so it doesn't read
	// as a house-hours-review item (which uses blue).
	client_allowable_hours_changed: { Icon: AlarmClockCheck, color: "#4f46e5", bg: "#eef2ff" },
};

/**
 * Icon override for approval_requested notifications, keyed by the approval's
 * subjectType (n.data?.subjectType) — mirrors the icons ApprovalRow.js uses
 * per type in the queue list. Every approval_requested notification keeps the
 * same purple color/bg from TYPE_CONFIG regardless of subject type — only the
 * icon differs — so "purple" reads as "needs your approval" at a glance.
 * caregiver_certificate has no entry here; it falls back to the default
 * ClipboardCheck icon from TYPE_CONFIG.
 */
export const APPROVAL_SUBJECT_ICONS = {
	overtime_acknowledgment: Timer,
	overtime_mandate:        Scale,
	banked_hours_payout:     Banknote,
	vacation_pay_request:    DollarSign,
	paid_sick_time_request:  Thermometer,
	caregiver_device_change: Smartphone,
	alternate_location_clock_in: MapPin,
	clock_out_review:        ClockAlert,
};

const FALLBACK_CONFIG = { Icon: Bell, color: "#6b7280", bg: "#f9fafb" };

/**
 * Resolves a notification's look: `{ Icon, color, bg, BadgeIcon?, badgeColor? }`.
 * Unknown types get a grey bell.
 */
export function getNotificationIcon(n) {
	const config = TYPE_CONFIG[n.type] ?? FALLBACK_CONFIG;
	const subjectIcon = n.type === "approval_requested" && APPROVAL_SUBJECT_ICONS[n.data?.subjectType];
	return subjectIcon ? { ...config, Icon: subjectIcon } : config;
}
