"use client";

import { useAdmins } from "@/hooks/useAdmins";
import { useCaregivers } from "@/hooks/useCaregivers";
import { personName } from "@/utils/formatting";

/**
 * Renders a person's name from either a populated object ({ firstName, lastName, ... })
 * or a bare id (a plain id string, or an object holding only an id with no name fields —
 * e.g. a locally-seeded selection whose name hasn't been fetched yet), fetching the
 * detail record by id when needed.
 *
 * @param {"admin"|"caregiver"} role
 * @param {object|string} person - Populated person object, or its id
 */
export default function PersonName({ role, person }) {
    const isObject = person && typeof person === "object";
    const hasName  = isObject && (person.firstName || person.lastName);
    const id       = isObject ? (person._id || person.id) : person;

    const { adminDetail } = useAdmins(!hasName && role === "admin" ? (id || "") : "");
    const { caregiverDetail } = useCaregivers(!hasName && role === "caregiver" ? (id || "") : "");

    if (!person) return "—";
    if (hasName) return personName(person);

    const fetched = role === "admin" ? adminDetail : caregiverDetail;
    return fetched ? personName(fetched) : (id || "—");
}
