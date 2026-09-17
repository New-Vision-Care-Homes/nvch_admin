"use client";
import { useState, useCallback } from "react";

// True only for the page load that's currently running — computed once when
// this module is first evaluated. A hard refresh re-executes the module (so
// this gets recomputed), but a Next.js client-side navigation ("list ->
// detail -> back") reuses the already-loaded module, so this stays whatever
// it was for the rest of that browser session. That's what lets us tell "the
// user just hit refresh" apart from "the user navigated within the app".
const isHardReload =
	typeof window !== "undefined" &&
	typeof window.performance?.getEntriesByType === "function" &&
	window.performance.getEntriesByType("navigation")[0]?.type === "reload";

// isHardReload stays true for the rest of the document's life once a reload
// has happened, so it can't be checked directly on every mount — that would
// also wipe state on every later "list -> detail -> back" remount, not just
// the one right after the refresh. Tracking which keys have already had the
// post-reload wipe applied lets each key reset exactly once, then persist
// normally for the remainder of the session.
const reloadHandledKeys = new Set();

// Persists UI state (e.g. list filters) to sessionStorage so it survives a
// "list -> detail -> back" navigation instead of resetting to defaults. Each
// page.js remounts on navigation, so the value is read straight from
// sessionStorage in the initializer (not a post-mount effect) to avoid a
// flash of the default value before the persisted one takes over.
//
// A manual browser refresh, however, should NOT restore the old filters —
// so the first time a given key is read after a reload, any stored value is
// discarded once instead of being read back.
//
// `initialValue` may be a plain value or a lazy initializer function (like
// useState's own API) — useful when computing the default is non-trivial
// (e.g. "the current time") and shouldn't run on every render just to be
// thrown away once sessionStorage already has a value.
export function usePersistedState(key, initialValue) {
	const [state, setState] = useState(() => {
		const getDefault = () => (typeof initialValue === "function" ? initialValue() : initialValue);
		if (typeof window === "undefined") return getDefault();
		if (isHardReload && !reloadHandledKeys.has(key)) {
			reloadHandledKeys.add(key);
			window.sessionStorage.removeItem(key);
			return getDefault();
		}
		try {
			const stored = window.sessionStorage.getItem(key);
			return stored !== null ? JSON.parse(stored) : getDefault();
		} catch {
			return getDefault();
		}
	});

	// Stable identity (like the native useState setter) so it can safely be
	// omitted from effect dependency arrays.
	const setPersistedState = useCallback((value) => {
		setState((current) => {
			const next = typeof value === "function" ? value(current) : value;
			window.sessionStorage.setItem(key, JSON.stringify(next));
			return next;
		});
	}, [key]);

	return [state, setPersistedState];
}
