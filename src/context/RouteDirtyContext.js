"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "next/navigation";

// Global counterpart to TabDirtyContext: lets a standalone page (reached via
// the sidebar, not a Tabs.js) report unsaved edits, so sidebar/in-app link
// navigation can warn before discarding them. Resets on every route change so
// a stale "dirty" flag from the page just left never leaks into the next one.
const RouteDirtyContext = createContext(null);

export function RouteDirtyProvider({ children }) {
    const [isDirty, setIsDirty] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setIsDirty(false);
    }, [pathname]);

    return (
        <RouteDirtyContext.Provider value={{ isDirty, setIsDirty }}>
            {children}
        </RouteDirtyContext.Provider>
    );
}

export function useRouteDirty() {
    const ctx = useContext(RouteDirtyContext);
    if (!ctx) throw new Error("useRouteDirty must be used within a RouteDirtyProvider");
    return ctx;
}
