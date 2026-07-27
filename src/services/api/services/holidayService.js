// ============================================================
// holidayService.js
// ------------------------------------------------------------
// HTTP layer for the stat-holiday calendar.
//
// All methods unwrap axios's `data.data` so callers receive
// the backend payload directly (no nesting).
//
// Permissions required by the backend:
//   Read  — view_holidays OR view_payroll (either is sufficient)
//   Write — manage_holidays
// ============================================================

import axiosClient from '../axiosClient';
import { API_ENDPOINTS } from '../endpoints';

export const holidayService = {

    // ── Read ──────────────────────────────────────────────────────────────────

    /**
     * List holidays.
     *
     * Params (mutually exclusive filter modes):
     *   { year }                         — all holidays in a calendar year
     *   { payYear, periodNumber }         — holidays inside a specific pay period
     *
     * Optional:
     *   { isActive: "true" | "false" }   — filter by soft-enable state; omit to return both
     *
     * Response shape: { year?, payPeriod?, holidays: Holiday[] }
     */
    getAll: async (params = {}) => {
        const { data } = await axiosClient.get(API_ENDPOINTS.HOLIDAYS.BASE, { params });
        return data?.data;
    },

    /**
     * Fetch a single holiday by ID.
     * Response shape: { holiday: Holiday }
     */
    getById: async (id) => {
        const { data } = await axiosClient.get(API_ENDPOINTS.HOLIDAYS.BY_ID(id));
        return data?.data;
    },

    // ── Write ─────────────────────────────────────────────────────────────────

    /** Create a new holiday. Returns { holiday } on success (201). */
    create: async (body) => {
        const { data } = await axiosClient.post(API_ENDPOINTS.HOLIDAYS.BASE, body);
        return data?.data;
    },

    /**
     * Partial update — only send fields to change.
     * Sending caregiverRules replaces the entire array.
     */
    update: async (id, body) => {
        const { data } = await axiosClient.put(API_ENDPOINTS.HOLIDAYS.BY_ID(id), body);
        return data?.data;
    },

    /** Hard-delete a holiday. Soft-disable via update({ isActive: false }) instead. */
    delete: async (id) => {
        const { data } = await axiosClient.delete(API_ENDPOINTS.HOLIDAYS.BY_ID(id));
        return data;
    },
};
