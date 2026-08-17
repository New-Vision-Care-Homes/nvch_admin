// ─── Numeric formatters ───────────────────────────────────────────────────────

export function fmtHours(n) {
    if (n == null || n === 0) return "—";
    return Number(n).toFixed(2);
}

export function fmtDollars(n) {
    if (n == null || n === 0) return "—";
    return `$${Number(n).toFixed(2)}`;
}

export function fmtDayHeader(isoDate) {
    if (!isoDate) return "";
    const [, month, day] = isoDate.split("-");
    return `${parseInt(month, 10)}/${parseInt(day, 10)}`;
}


// ─── Notes column helpers ─────────────────────────────────────────────────────
//
// The Notes column in DailyTable surfaces non-zero supplemental fields that
// aren't shown as their own columns (everything except `hours.regular`).
// The same logic feeds both the browser tooltip and the Excel export cell.

/**
 * Hours sub-fields to surface in Notes, in display order.
 * `hours.regular` is intentionally excluded — it already has its own column.
 */
const HOURS_NOTE_FIELDS = [
    { key: "other",               label: "Other"         },
    { key: "overtime",            label: "Overtime"      },
    { key: "stat_pay",            label: "Holiday"       },
    { key: "stat_hours_paid",     label: "Stat Paid"     },
    { key: "stat_hours_banked",   label: "Stat Banked"   },
    { key: "training",            label: "Training"      },
    { key: "staff_meeting",       label: "Staff Mtg"     },
    { key: "sick",                label: "Sick"          },
    { key: "bereavement",         label: "Bereavement"   },
    { key: "banked_hours_paid",   label: "Banked Paid"   },
    { key: "hours_banked",        label: "Banked"        },
    { key: "night_sleeps",        label: "Night Sleeps"  },
    { key: "night_sleeps_banked", label: "Night Banked"  },
];

/** Dollar sub-fields to surface in Notes. */
const DOLLARS_NOTE_FIELDS = [
    { key: "retro_bonus",    label: "Retro Bonus" },
    { key: "vacation_pay",   label: "Vacation Pay" },
    { key: "regular_salary", label: "Salary"       },
];

/**
 * Build the list of non-zero supplemental items for a staff row.
 * Returns an empty array when everything is zero.
 *
 * @param  {object} staffRow  — one element of coverSheet.staff
 * @returns {{ label: string, value: string }[]}
 */
export function buildNoteItems(staffRow) {
    const items = [];

    HOURS_NOTE_FIELDS.forEach(({ key, label }) => {
        const val = staffRow.hours?.[key];
        if (val != null && val !== 0) {
            items.push({ label, value: `${val} h` });
        }
    });

    DOLLARS_NOTE_FIELDS.forEach(({ key, label }) => {
        const val = staffRow.dollars?.[key];
        if (val != null && val !== 0) {
            items.push({ label, value: `$${Number(val).toFixed(2)}` });
        }
    });

    return items;
}

/**
 * Format note items as a single newline-separated string for use in the
 * CSS data-tip attribute (tooltip) and in the Excel export cell.
 *
 * @param  {{ label: string, value: string }[]} items
 * @returns {string}  e.g. "Overtime: 4 h\nTraining: 2 h"
 */
export function formatNoteText(items) {
    return items.map(({ label, value }) => `${label}: ${value}`).join("\n");
}
