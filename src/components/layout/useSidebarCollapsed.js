"use client";
import { useState } from "react";

const SIDEBAR_COLLAPSED_KEY = "sidebarCollapsed";

// Several routes (scheduling, settings) build their own Navbar+Sidebar shell
// instead of going through PageLayout, and each one remounts on navigation —
// so the collapsed preference is read straight from localStorage in the
// initializer (not a post-mount effect) to avoid a flash of the expanded
// sidebar every time the user clicks a nav link.
export function useSidebarCollapsed() {
	const [collapsed, setCollapsed] = useState(() =>
		typeof window !== "undefined" && window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true"
	);

	const toggleCollapsed = () => {
		setCollapsed((current) => {
			const next = !current;
			window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
			return next;
		});
	};

	return [collapsed, toggleCollapsed];
}
