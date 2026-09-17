// Pay category metadata — single source of truth for labels/units/write rules.
//
// Per the backend pay-categories spec, only these categories accept a manual
// entry: retro_bonus ($), bereavement, training, staff_meeting (hours),
// vacation_pay_accrued ($), vacation_pay ($), and hours_banked (hours).
// hours_banked and vacation_pay_accrued are the two that accept a signed (±)
// amount so a balance can be restated; every other writable category is
// positive-only and is undone with a void, not a minus row. Everything else
// (regular, overtime, other, stat_pay, banked_hours_paid — all derived/auto/
// approval-sourced — plus the disabled placeholders) is read-only here, but
// still needs a label since GET .../entries can return any category.
// Writable categories are listed first (in the order they should appear in
// an entry-category dropdown — the first one is the form's default
// selection), followed by the read-only derived/auto/approval categories.
export const PAY_CATEGORIES = [
	{ value: "retro_bonus",          label: "Retro Bonus",             unit: "dollars", writable: true },
	{ value: "bereavement",          label: "Bereavement",             unit: "hours",   writable: true },
	{ value: "staff_meeting",        label: "Staff Meeting",           unit: "hours",   writable: true },
	{ value: "training",             label: "Training",                unit: "hours",   writable: true },
	{ value: "vacation_pay",         label: "Vacation Pay",            unit: "dollars", writable: true },
	{ value: "hours_banked",         label: "Banked Hours Correction", unit: "hours",   writable: true, signed: true },
	{ value: "vacation_pay_accrued", label: "Vacation Pay Accrued",    unit: "dollars", writable: true, signed: true },

	{ value: "regular",           label: "Regular",           unit: "hours", writable: false },
	{ value: "overtime",          label: "Overtime",          unit: "hours", writable: false },
	{ value: "other",             label: "Other",             unit: "hours", writable: false },
	{ value: "stat_pay",          label: "Holiday (Stat)",    unit: "hours", writable: false },
	{ value: "banked_hours_paid", label: "Banked Hours Paid", unit: "hours", writable: false },
];

export const WRITABLE_PAY_CATEGORIES = PAY_CATEGORIES.filter((c) => c.writable);

export const PAY_CATEGORY_LABELS = Object.fromEntries(
	PAY_CATEGORIES.map((c) => [c.value, c.label])
);
