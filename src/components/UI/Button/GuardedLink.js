"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRouteDirty } from "@/context/RouteDirtyContext";
import UnsavedChangesModal from "../Modal/UnsavedChangesModal";

/**
 * Drop-in replacement for next/link's Link that warns before navigating away
 * from a page with unsaved edits (per RouteDirtyContext), instead of silently
 * discarding them.
 */
export default function GuardedLink({ href, onClick, children, ...rest }) {
    const { isDirty, setIsDirty } = useRouteDirty();
    const router = useRouter();
    const pathname = usePathname();
    const [confirming, setConfirming] = useState(false);

    function handleClick(e) {
        // href === pathname means this click isn't actually going anywhere —
        // without this check, confirming here would setIsDirty(false) and
        // push a no-op navigation, desyncing the context from the form's
        // real (still-dirty) state without ever re-syncing it.
        if (isDirty && href !== pathname) {
            e.preventDefault();
            setConfirming(true);
            return;
        }
        onClick?.(e);
    }

    function confirmLeave() {
        setIsDirty(false);
        setConfirming(false);
        onClick?.();
        router.push(href);
    }

    return (
        <>
            <Link href={href} onClick={handleClick} {...rest}>
                {children}
            </Link>
            <UnsavedChangesModal
                isOpen={confirming}
                onClose={() => setConfirming(false)}
                onConfirm={confirmLeave}
            />
        </>
    );
}
