import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { notificationService } from "@/services/api/services/notificationService";

// ─── Constants ────────────────────────────────────────────────────────────────

// Max attempts to re-mint a stream token before giving up.
// Network drops on the EventSource itself have no cap — we keep retrying those.
const MAX_TOKEN_RETRIES = 3;

// How many seconds before expiry we treat the cached token as "stale".
const TOKEN_EXPIRY_BUFFER_MS = 10_000; // 10 s

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Returns a valid SSE stream token.
 *
 * On login, a token is minted and stored in sessionStorage together with its
 * expiry timestamp.  If the cached token still has more than TOKEN_EXPIRY_BUFFER_MS
 * remaining we reuse it — no extra request.  Otherwise we mint a fresh one.
 */
async function getValidStreamToken() {
	const cached = sessionStorage.getItem("sseStreamToken");
	const expiry = parseInt(sessionStorage.getItem("sseStreamTokenExpiry") || "0", 10);
	const stillValid = cached && expiry - Date.now() > TOKEN_EXPIRY_BUFFER_MS;

	if (stillValid) return cached;

	// Token is missing or about to expire — mint a fresh one.
	const { streamToken, expiresIn } = await notificationService.getStreamToken();
	sessionStorage.setItem("sseStreamToken", streamToken);
	sessionStorage.setItem("sseStreamTokenExpiry", String(Date.now() + expiresIn * 1000));
	return streamToken;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages all notification data and the live SSE stream for the admin portal.
 *
 * @param {string | object} options
 *   Pass a notification ID string to enter "detail mode" (fetches one item).
 *   Pass an object for list/SSE options:
 *   - notificationId {string}  – fetch a single notification
 *   - params         {object}  – list query params: page, limit, unread, todo
 *   - enableSSE      {boolean} – open the live SSE stream (mount once in Navbar)
 *   - fetchList      {boolean} – fetch the notification list (default true;
 *                                pass false when you only need the badge count)
 */
export const useNotifications = (options = {}) => {
	const queryClient = useQueryClient();

	// ── Parse options ──────────────────────────────────────────────────────────

	const notificationId  = typeof options === "string" ? options : options.notificationId;
	const params          = typeof options === "object" && options.params ? options.params : {};
	const enableSSE       = typeof options === "object" ? (options.enableSSE       ?? false) : false;
	const fetchList       = typeof options === "object" ? (options.fetchList       ?? true)  : true;
	const onNotification  = typeof options === "object" ? (options.onNotification  ?? null)  : null;

	// ── SSE refs ───────────────────────────────────────────────────────────────

	// Stable ref for the caller's onNotification callback — avoids stale closures
	// inside the SSE event handler without adding it as a connectSSE dependency.
	const onNotificationRef = useRef(onNotification);
	useEffect(() => { onNotificationRef.current = onNotification; }, [onNotification]);

	const eventSourceRef    = useRef(null); // the active EventSource instance
	const reconnectFnRef    = useRef(null); // always points to the latest connectSSE (avoids stale closures)
	const reconnectTimerRef = useRef(null); // pending setTimeout id for the next reconnect
	// Monotonic counter — incremented at the start of every connectSSE call.
	// Each async invocation captures its own snapshot; if the counter has advanced
	// by the time the async work resolves, a newer call has taken over and this one
	// should abort rather than open a second EventSource.
	const connectIdRef      = useRef(0);

	// Separate retry counters so token-mint failures don't eat into connection-drop retries.
	const tokenRetryRef = useRef(0); // # of consecutive getStreamToken failures (non-auth)
	const connRetryRef  = useRef(0); // # of consecutive EventSource drops (network / server)

	// True when SSE is permanently degraded (401/403 from the server).
	// Initialised from the flag set during login so the bell is already correct on first render.
	const [sseUnavailable, setSseUnavailable] = useState(
		() => typeof window !== "undefined" && sessionStorage.getItem("sseUnavailable") === "true"
	);

	// ── Error helper ───────────────────────────────────────────────────────────

	const getErrorMessage = (err) =>
		err?.response?.data?.details?.[0]?.msg ||
		err?.response?.data?.error ||
		"An unexpected error occurred";

	// ── Queries ────────────────────────────────────────────────────────────────

	// Notification history list (newest first, paginated).
	// Disabled when showing a single item, or when the caller only needs the count.
	const notificationsQuery = useQuery({
		queryKey: ["notifications", params],
		queryFn:  () => notificationService.getAll(params),
		enabled:  !notificationId && fetchList,
		placeholderData: keepPreviousData,
	});

	// Unread count + pending-action count — drives the bell badge.
	const countQuery = useQuery({
		queryKey: ["notifications", "count"],
		queryFn:  notificationService.getCount,
		enabled:  !notificationId,
	});

	// Single notification detail — only active when notificationId is provided.
	const notificationDetailQuery = useQuery({
		queryKey: ["notification", notificationId],
		queryFn:  () => notificationService.getOne(notificationId),
		enabled:  !!notificationId,
	});

	// ── Mutations ──────────────────────────────────────────────────────────────

	// Clear the unread dot on one notification (call this on tap, before navigating).
	const markReadMutation = useMutation({
		mutationFn: notificationService.markRead,
		onSuccess:  () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
	});

	// Clear every unread dot at once ("mark all read" button).
	const markAllReadMutation = useMutation({
		mutationFn: notificationService.markAllRead,
		onSuccess:  () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
	});

	// Admin broadcast compose (requires send_broadcast_notifications permission).
	const broadcastMutation = useMutation({
		mutationFn: notificationService.broadcast,
	});

	// ── SSE connection ─────────────────────────────────────────────────────────

	const connectSSE = useCallback(async () => {
		// Close any existing connection and cancel a pending reconnect timer.
		eventSourceRef.current?.close();
		clearTimeout(reconnectTimerRef.current);

		// Stamp this invocation so stale async completions can detect they've been
		// superseded (e.g. React StrictMode double-fires the effect before the first
		// async token fetch resolves, which would otherwise open two EventSources).
		const myId = ++connectIdRef.current;

		// ── Step 1: get a valid stream token ──────────────────────────────────
		// Uses the cached token from sessionStorage when possible to avoid a
		// redundant API call (the token was already minted during login).
		let streamToken;
		try {
			streamToken = await getValidStreamToken();
			if (connectIdRef.current !== myId) return; // superseded — abort silently
			tokenRetryRef.current = 0; // successful mint — reset the error counter
		} catch (err) {
			if (connectIdRef.current !== myId) return; // superseded — abort silently
			const status = err?.response?.status;

			if (status === 401 || status === 403) {
				// Auth error — retrying won't help, mark the bell as degraded and stop.
				setSseUnavailable(true);
				sessionStorage.setItem("sseUnavailable", "true");
				return;
			}

			// Transient error (network, server down while minting).
			// Retry with exponential backoff, but cap at MAX_TOKEN_RETRIES.
			if (tokenRetryRef.current < MAX_TOKEN_RETRIES) {
				const delay = Math.min(2000 * Math.pow(2, tokenRetryRef.current), 30_000);
				tokenRetryRef.current += 1;
				reconnectTimerRef.current = setTimeout(() => reconnectFnRef.current?.(), delay);
			}
			return;
		}

		// ── Step 2: open the SSE connection ───────────────────────────────────
		// EventSource cannot send an Authorization header, so the token is passed
		// as a query param instead (the server issues a short-lived token for this).
		const base = process.env.NEXT_PUBLIC_API_URL || "https://nvch-server.onrender.com";
		const es = new EventSource(`${base}/api/notifications/stream?token=${streamToken}`);

		// Connection established successfully.
		es.onopen = () => {
			connRetryRef.current  = 0;  // reset both counters
			tokenRetryRef.current = 0;
			setSseUnavailable(false);
			sessionStorage.removeItem("sseUnavailable");
		};

		// ── Step 3: handle incoming notification events ───────────────────────
		// The server also sends `: ping` heartbeat comments to keep the connection
		// alive — EventSource ignores comment lines automatically, no code needed.
		es.addEventListener("notification", (event) => {
			// Parse the payload so callers (e.g. Navbar toast) can read title/body.
			let payload = null;
			try { payload = JSON.parse(event.data); } catch {}
			onNotificationRef.current?.(payload);

			// Invalidate both the list and count (prefix match covers both).
			// No optimistic setQueryData — that caused a wrong-number flash for the
			// sender, since the server is the only reliable source of the true count.
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
		});

		// ── Step 4: handle connection drops ───────────────────────────────────
		// Network loss or server restart → reconnect forever with exponential
		// backoff (2 s → 4 s → … → 60 s max).  No hard cap: we keep trying until
		// the network comes back.  connRetryRef resets to 0 on the next onopen.
		es.onerror = () => {
			es.close();
			const delay = Math.min(2000 * Math.pow(2, connRetryRef.current), 60_000);
			connRetryRef.current += 1;
			reconnectTimerRef.current = setTimeout(() => reconnectFnRef.current?.(), delay);
		};

		eventSourceRef.current = es;
	}, [queryClient, setSseUnavailable]);

	// Keep reconnectFnRef pointing at the latest connectSSE so callbacks inside
	// onerror / setTimeout always call the current version, not a stale closure.
	useEffect(() => {
		reconnectFnRef.current = connectSSE;
	}, [connectSSE]);

	// Start SSE when enableSSE is true; clean up when the component unmounts
	// (e.g. on logout the Navbar unmounts, which closes the stream).
	useEffect(() => {
		if (!enableSSE) return;
		connectSSE();
		return () => {
			clearTimeout(reconnectTimerRef.current);
			eventSourceRef.current?.close();
		};
	}, [enableSSE, connectSSE]);

	// ── Aggregate errors ───────────────────────────────────────────────────────

	const fetchError =
		notificationsQuery.error  ||
		countQuery.error          ||
		notificationDetailQuery.error;

	const actionError =
		markReadMutation.error    ||
		markAllReadMutation.error ||
		broadcastMutation.error;

	// ── Return ─────────────────────────────────────────────────────────────────

	return {
		// ── Data ──────────────────────────────────────────────────────────────
		notifications:      notificationsQuery.data?.notifications ?? [],
		notificationDetail: notificationDetailQuery.data,
		unreadCount:        countQuery.data?.unread          ?? 0,
		pendingActionsCount: countQuery.data?.pendingActions ?? 0,

		// ── Pagination ────────────────────────────────────────────────────────
		totalPages:  notificationsQuery.data?.pagination?.pages ?? 0,
		currentPage: notificationsQuery.data?.pagination?.current ?? 1,
		totalCount:  notificationsQuery.data?.pagination?.total  ?? 0,

		// ── Loading states ────────────────────────────────────────────────────
		isNotificationsLoading: notificationsQuery.isLoading || notificationDetailQuery.isLoading,
		isCountLoading:         countQuery.isLoading,
		isActionPending:
			markReadMutation.isPending    ||
			markAllReadMutation.isPending ||
			broadcastMutation.isPending,

		// ── Errors ────────────────────────────────────────────────────────────
		// fetchNotificationError  → show via an <ErrorState> component
		// actionNotificationError → show via a toast or inline message
		fetchNotificationError:  fetchError   ? getErrorMessage(fetchError)  : null,
		actionNotificationError: actionError  ? getErrorMessage(actionError) : null,

		// ── Actions ───────────────────────────────────────────────────────────
		markRead:        markReadMutation.mutateAsync,
		markAllRead:     markAllReadMutation.mutateAsync,
		sendBroadcast:   broadcastMutation.mutateAsync,
		isBroadcastPending: broadcastMutation.isPending,
		broadcastError:  broadcastMutation.error ? getErrorMessage(broadcastMutation.error) : null,

		// ── SSE state ─────────────────────────────────────────────────────────
		// True when live updates are unavailable (auth error during token mint).
		// The Navbar uses this to show an amber dot on the bell icon.
		sseUnavailable,

		// ── Refetch helpers ───────────────────────────────────────────────────
		refetch:      notificationsQuery.refetch,
		refetchCount: countQuery.refetch,
	};
};
