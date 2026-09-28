"use client";

import { createContext, useContext, useState } from "react";

// Lets the form rendered inside a profile tab (Info, Care Plan, etc.) report
// whether it has unsaved edits, so the tab bar can warn before switching away
// and discarding them.
const TabDirtyContext = createContext(null);

export function TabDirtyProvider({ children }) {
    const [isDirty, setIsDirty] = useState(false);
    return (
        <TabDirtyContext.Provider value={{ isDirty, setIsDirty }}>
            {children}
        </TabDirtyContext.Provider>
    );
}

export function useTabDirty() {
    const ctx = useContext(TabDirtyContext);
    if (!ctx) throw new Error("useTabDirty must be used within a TabDirtyProvider");
    return ctx;
}
