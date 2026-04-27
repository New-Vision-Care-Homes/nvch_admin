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
        const token = localStorage.getItem("token");
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

    // 2. Auto-Logout Logic
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;

        let timeoutId;

        const logout = () => {
            localStorage.removeItem("token");
            router.replace("/");
        };

        const resetTimer = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(logout, INACTIVITY_TIMEOUT);
        };

        const events = ["mousemove", "keydown", "scroll", "click"];

        const setupListeners = () => {
            events.forEach((event) => {
                window.addEventListener(event, resetTimer);
            });
        };

        const cleanupListeners = () => {
            events.forEach((event) => {
                window.removeEventListener(event, resetTimer);
            });
            clearTimeout(timeoutId);
        };

        resetTimer();
        setupListeners();

        return () => {
            cleanupListeners();
        };
    }, [pathname, router]);

    // Show nothing while evaluating authorization to prevent flickering of protected pages
    const isPublicPath = publicPaths.includes(pathname) || pathname === "/";
    if (!isAuthorized && !isPublicPath) {
        return null;
    }

    return <>{children}</>;
}
