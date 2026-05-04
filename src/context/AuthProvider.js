"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

const publicPaths = ["/", "/forget_password"]; // Add any other public paths here
const defaultProtectedPath = "/dashboard"; // Where to redirect if a logged-in user visits a public path

export default function AuthProvider({ children }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState(false);

    // 1. Route Protection Logic
    useEffect(() => {
        const token = sessionStorage.getItem("token");
        const isPublicPath = publicPaths.includes(pathname);
        const isExactRoot = pathname === "/";

        // Logic check
        if (!token && !isPublicPath && !isExactRoot) {
            router.replace("/");
            return;
        }

        if (token && isPublicPath) {
            router.replace(defaultProtectedPath);
            return;
        }

        setIsAuthorized(true);
    }, [pathname, router]);

    // 2. Auto-Logout Logic (Cross-tab supported)
    useEffect(() => {
        const token = sessionStorage.getItem("token");
        if (!token) return;

        const logout = () => {
            sessionStorage.removeItem("token");
            localStorage.setItem("logoutEvent", Date.now().toString()); // broadcast logout to other tabs
            router.replace("/");
        };

        const updateActivity = () => {
            localStorage.setItem("lastActivity", Date.now().toString());
        };

        // Initialize activity on mount if not present
        if (!localStorage.getItem("lastActivity")) {
            updateActivity();
        }

        let throttleTimer;
        const throttledUpdateActivity = () => {
            if (throttleTimer) return;
            throttleTimer = setTimeout(() => {
                updateActivity();
                throttleTimer = null;
            }, 1000); // throttle to 1 update per second
        };

        const checkInactivity = () => {
            const lastActivity = parseInt(localStorage.getItem("lastActivity") || "0", 10);
            // If the time since last activity is greater than timeout, log out
            if (Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
                logout();
            }
        };

        // Check for inactivity every 5 seconds
        const intervalId = setInterval(checkInactivity, 5000);

        const events = ["mousemove", "keydown", "scroll", "click"];

        const setupListeners = () => {
            events.forEach((event) => {
                window.addEventListener(event, throttledUpdateActivity);
            });
        };

        const cleanupListeners = () => {
            events.forEach((event) => {
                window.removeEventListener(event, throttledUpdateActivity);
            });
            clearInterval(intervalId);
            if (throttleTimer) clearTimeout(throttleTimer);
        };

        // Listen for storage events to sync logout across tabs
        const handleStorageChange = (e) => {
            if (e.key === "logoutEvent") {
                sessionStorage.removeItem("token");
                router.replace("/");
            }
        };
        window.addEventListener("storage", handleStorageChange);

        // Initial setup
        setupListeners();

        return () => {
            cleanupListeners();
            window.removeEventListener("storage", handleStorageChange);
        };
    }, [pathname, router]);

    // Show nothing while evaluating authorization to prevent flickering of protected pages
    const isPublicPath = publicPaths.includes(pathname) || pathname === "/";
    if (!isAuthorized && !isPublicPath) {
        return null;
    }

    return <>{children}</>;
}
