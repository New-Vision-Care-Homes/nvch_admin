// ============================================================
// trainingService.js
// ------------------------------------------------------------
// HTTP layer for admin-scheduled trainings (e.g. UMAB).
//
// All methods unwrap axios's `data.data` so callers receive
// the backend payload directly (no nesting).
//
// Permissions required by the backend:
//   Read       — view_trainings OR view_payroll (either is sufficient)
//   Write      — manage_trainings
//   Attendance — manage_trainings, manage_all_training_attendance, or
//                manage_assigned_training_attendance (only for trainings the
//                admin is listed on in trainers[])
// ============================================================

import axiosClient from '../axiosClient';
import { API_ENDPOINTS } from '../endpoints';

export const trainingService = {

    // ── Read ──────────────────────────────────────────────────────────────────

    /**
     * List trainings.
     * Params: { from?, to?, type? } — from/to filter on startTime, type is an
     * exact trainingType match (must be one of the slugs from getTypes()).
     * All optional and combinable.
     * Response shape: { trainings: Training[] }
     */
    getAll: async (params = {}) => {
        const { data } = await axiosClient.get(API_ENDPOINTS.TRAININGS.BASE, { params });
        return data?.data;
    },

    /**
     * Fetch a single training by ID.
     * Response shape: { training: Training }
     */
    getById: async (id) => {
        const { data } = await axiosClient.get(API_ENDPOINTS.TRAININGS.BY_ID(id));
        return data?.data;
    },

    /**
     * Fetch the canonical, closed set of training types (slug + display label).
     * Response shape: { trainingTypes: [{ value, label }] }
     */
    getTypes: async () => {
        const { data } = await axiosClient.get(API_ENDPOINTS.TRAININGS.TYPES);
        return data?.data?.trainingTypes ?? [];
    },

    // ── Write ─────────────────────────────────────────────────────────────────

    /** Create a new training. Returns { training } on success (201). */
    create: async (body) => {
        const { data } = await axiosClient.post(API_ENDPOINTS.TRAININGS.BASE, body);
        return data?.data;
    },

    /**
     * Partial update — only send fields to change.
     * Sending site, trainers, or payRules replaces the whole value.
     */
    update: async (id, body) => {
        const { data } = await axiosClient.put(API_ENDPOINTS.TRAININGS.BY_ID(id), body);
        return data?.data;
    },

    /** Cancel a training (soft — sets status: "cancelled", keeps the record). */
    cancel: async (id) => {
        const { data } = await axiosClient.delete(API_ENDPOINTS.TRAININGS.BY_ID(id));
        return data?.data;
    },

    // ── Attendees ────────────────────────────────────────────────────────────

    /**
     * Add attendees (sequential, partial-success).
     * Response shape: { training, summary: { total, added, failed }, failed: [] }
     */
    addAttendees: async (id, caregiverIds) => {
        const { data } = await axiosClient.post(API_ENDPOINTS.TRAININGS.ATTENDEES(id), { caregiverIds });
        return data?.data;
    },

    /** Remove an attendee. Response shape: { training } */
    removeAttendee: async (id, caregiverId) => {
        const { data } = await axiosClient.delete(API_ENDPOINTS.TRAININGS.ATTENDEE_BY_ID(id, caregiverId));
        return data?.data;
    },

    /**
     * Set an attendee's status.
     * body: { status, retakeDate?, notes? }
     * Response shape: { training }
     */
    setAttendeeStatus: async (id, caregiverId, body) => {
        const { data } = await axiosClient.put(API_ENDPOINTS.TRAININGS.ATTENDEE_BY_ID(id, caregiverId), body);
        return data?.data;
    },

    // ── Attendance (supervisor overrides, portal-only) ──────────────────────────

    /**
     * Fix one attendee's clock pair — enter a missing clock-in, close a
     * dangling clock-out, correct a time, or wipe a side.
     * body: { clockInAt?, clockOutAt?, note? } — omit a field to leave it as-is,
     * send null to clear it. At least one clock field is required.
     * Response shape: { training }
     */
    setAttendeeAttendance: async (id, caregiverId, body) => {
        const { data } = await axiosClient.put(API_ENDPOINTS.TRAININGS.ATTENDEE_ATTENDANCE(id, caregiverId), body);
        return data?.data;
    },

    /**
     * Bulk clock in the caregivers present ("take the register").
     * Sequential, partial-success — mirrors addAttendees.
     * body: { caregiverIds, at?, note? }
     * Response shape: { training, summary: { total, updated, failed }, failed: [] }
     */
    bulkClockIn: async (id, body) => {
        const { data } = await axiosClient.post(API_ENDPOINTS.TRAININGS.ATTENDANCE_CLOCK_IN(id), body);
        return data?.data;
    },

    /**
     * Bulk clock out. Same request/response shape as bulkClockIn.
     */
    bulkClockOut: async (id, body) => {
        const { data } = await axiosClient.post(API_ENDPOINTS.TRAININGS.ATTENDANCE_CLOCK_OUT(id), body);
        return data?.data;
    },
};
