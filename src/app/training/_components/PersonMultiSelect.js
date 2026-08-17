"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Loader2, X } from "lucide-react";
import { useCaregivers } from "@/hooks/useCaregivers";
import { useAdmins } from "@/hooks/useAdmins";
import PersonName from "./PersonName";
import styles from "./PersonMultiSelect.module.css";

// ── Debounce ──────────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

/**
 * Debounced search-and-chip multi-select scoped to a single role.
 *
 * @param {"admin"|"caregiver"} role     - Which pool to search
 * @param {object[]}  selected           - Currently selected [{ _id, firstName, lastName }]
 * @param {Function}  onAdd              - Called with the selected person on pick
 * @param {Function}  onRemove           - Called with the removed person's _id
 * @param {string}    [placeholder]      - Search input placeholder
 * @param {boolean}   [disabled]         - Disable all controls
 */
export default function PersonMultiSelect({ role, selected, onAdd, onRemove, placeholder, disabled }) {
    const [query, setQuery]   = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const debouncedQuery      = useDebounce(query, 350);
    const wrapperRef          = useRef(null);

    const hasQuery = !!debouncedQuery.trim();

    const { caregivers, isCaregiverLoading } = useCaregivers({
        search: debouncedQuery,
        enabled: hasQuery && role === "caregiver",
    });
    const { admins, isAdminLoading } = useAdmins({
        search: debouncedQuery,
        enabled: hasQuery && role === "admin",
    });

    const pool = role === "caregiver" ? caregivers : admins;
    const isFetching = role === "caregiver" ? isCaregiverLoading : isAdminLoading;

    const selectedIds = new Set(selected.map((p) => p._id));
    const results = pool
        .map((p) => ({ ...p, _id: p._id || p.id }))
        .filter((p) => !selectedIds.has(p._id));

    useEffect(() => {
        const handler = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    function handleSelect(person) {
        onAdd({ _id: person._id, firstName: person.firstName, lastName: person.lastName });
        setQuery("");
        setIsOpen(false);
    }

    return (
        <div className={styles.searchField} ref={wrapperRef}>
            <div className={styles.searchInputRow}>
                <Search size={15} className={styles.searchIcon} />
                <input
                    type="text"
                    className={styles.searchInput}
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
                    onFocus={() => { if (query) setIsOpen(true); }}
                    placeholder={placeholder || `Search ${role === "caregiver" ? "caregivers" : "admins"} by name or email...`}
                    disabled={disabled}
                />
                {isFetching && <Loader2 size={14} className={styles.searchSpinner} />}
            </div>

            {isOpen && hasQuery && (
                <div className={styles.searchDropdown}>
                    {isFetching ? (
                        <p className={styles.searchEmpty}>Searching…</p>
                    ) : results.length === 0 ? (
                        <p className={styles.searchEmpty}>No results found</p>
                    ) : (
                        results.map((person) => (
                            <button
                                key={person._id}
                                type="button"
                                className={styles.searchOption}
                                onClick={() => handleSelect(person)}
                            >
                                {person.firstName} {person.lastName}
                            </button>
                        ))
                    )}
                </div>
            )}

            {selected.length > 0 && (
                <div className={styles.chipList}>
                    {selected.map((p) => (
                        <span key={p._id} className={styles.chip}>
                            <PersonName role={role} person={p} />
                            <button
                                type="button"
                                className={styles.chipRemove}
                                onClick={() => onRemove(p._id)}
                                disabled={disabled}
                            >
                                <X size={11} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
