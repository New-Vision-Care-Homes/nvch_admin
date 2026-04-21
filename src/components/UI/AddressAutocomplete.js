"use client";

// ─────────────────────────────────────────────────────────────────────────────
// AddressAutocomplete.js
//
// A reusable address search input powered by Google Places Autocomplete.
//
// HOW IT WORKS:
//   1. User starts typing an address (minimum 3 characters).
//   2. Component calls Google Places API and shows a dropdown of suggestions.
//   3. When the user clicks or keyboard-selects a suggestion:
//      - Google Places fetches the full details for that address.
//      - The component extracts street, city, province, country, postal code,
//        and GPS coordinates from the response.
//      - It calls `onAddressSelect(...)` with all those values.
//   4. The parent form (react-hook-form) uses setValue() to fill in the
//      individual address fields automatically.
//
// PROPS:
//   onAddressSelect(data) – required – called when user picks an address.
//                           data = { street, city, state, country, postalCode,
//                                    latitude, longitude }
//   label       – optional – label text shown above the input. Default: "Search Address"
//   placeholder – optional – placeholder text inside the input.
//   error       – optional – error message string from yup validation.
//   id          – optional – HTML id for the input element.
//
// RESTRICTIONS:
//   Only Canadian addresses are returned in the suggestions.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { MapPin, Search, Loader } from "lucide-react";
import styles from "./AddressAutocomplete.module.css";
import cardStyles from "./Card.module.css";

// Tell the Google Maps loader which extra library we need.
// "places" is required for AutocompleteService and PlacesService.
const LIBRARIES = ["places", "geometry"];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: parseAddressComponents
//
// Google Places returns an array of "address_components", where each item
// represents one part of the address (e.g. street number, city, province...).
// This helper picks out the parts we care about and returns a clean object.
// ─────────────────────────────────────────────────────────────────────────────
function parseAddressComponents(components, formattedAddress) {
  // Find the long name (e.g. "Nova Scotia") for a given component type
  const get = (type) =>
    components.find((c) => c.types.includes(type))?.long_name || "";

  // Find the short name (e.g. "NS" or "B3H 4R2") for a given component type
  const getShort = (type) =>
    components.find((c) => c.types.includes(type))?.short_name || "";

  // Build the street address by combining the street number ("123") and
  // the route ("Main St"). Fall back to just the route, or the first
  // segment of the full formatted address if neither is available.
  const streetNumber = get("street_number");
  const route = get("route");
  const street =
    streetNumber && route
      ? `${streetNumber} ${route}`
      : route || streetNumber || formattedAddress.split(",")[0];

  // City: Google uses different component types depending on the region,
  // so we try each one in priority order until we find a value.
  const city =
    get("locality") ||                      // most common city type
    get("sublocality") ||                   // used in some urban areas
    get("postal_town") ||                   // used in some Canadian addresses
    get("administrative_area_level_3") ||
    get("administrative_area_level_2");

  const state = get("administrative_area_level_1"); // Province, e.g. "Nova Scotia"
  const country = get("country");                     // e.g. "Canada"
  const postalCode = getShort("postal_code");            // e.g. "B3H 4R2"

  return { street, city, state, country, postalCode };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: AddressAutocomplete
// ─────────────────────────────────────────────────────────────────────────────
export default function AddressAutocomplete({
  onAddressSelect,
  label = "Search Address",
  placeholder = "Start typing an address...",
  error,
  id = "address-autocomplete",
}) {

  // ── State ─────────────────────────────────────────────────────────────────
  const [inputValue, setInputValue] = useState("");    // text the user typed
  const [suggestions, setSuggestions] = useState([]);    // dropdown list items
  const [isOpen, setIsOpen] = useState(false); // is the dropdown visible?
  const [isSelecting, setIsSelecting] = useState(false); // loading after user selects
  const [activeIndex, setActiveIndex] = useState(-1);    // keyboard-highlighted row
  const [isSearching, setIsSearching] = useState(false); // loading suggestions

  // ── Refs ──────────────────────────────────────────────────────────────────
  const inputRef = useRef(null); // the <input> DOM element
  const autocompleteServiceRef = useRef(null); // Google AutocompleteService instance
  const placesServiceRef = useRef(null); // Google PlacesService instance
  const containerRef = useRef(null); // wrapper div — used for click-outside
  const debounceRef = useRef(null); // stores the debounce timer ID

  // ── Load Google Maps JavaScript API ───────────────────────────────────────
  // useJsApiLoader injects the Google Maps <script> tag into the page.
  // isLoaded becomes true once that script finishes loading.
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
    libraries: LIBRARIES,
  });

  // ── Effect: Set up Google Places services once the API is ready ───────────
  useEffect(() => {
    if (!isLoaded || !window.google) return;

    // AutocompleteService: gives us address predictions as the user types
    autocompleteServiceRef.current =
      new window.google.maps.places.AutocompleteService();

    // PlacesService: gives us full address details for a selected prediction.
    // It requires a map or a DOM element — we pass a hidden div since
    // we don't have a visible map on this page.
    const dummyDiv = document.createElement("div");
    placesServiceRef.current =
      new window.google.maps.places.PlacesService(dummyDiv);
  }, [isLoaded]);

  // ── Effect: Close the dropdown when the user clicks outside ───────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    // Remove the listener when the component unmounts to avoid memory leaks
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Function: Fetch address suggestions from Google ────────────────────────
  // Only fires after the user types at least 3 characters.
  // Results are restricted to Canadian addresses only.
  const fetchSuggestions = useCallback((value) => {
    if (!autocompleteServiceRef.current || value.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsSearching(true);

    autocompleteServiceRef.current.getPlacePredictions(
      {
        input: value,
        types: ["address"],                        // only street addresses, no POIs
        componentRestrictions: { country: ["ca"] }, // Canada only
      },
      (predictions, status) => {
        setIsSearching(false);
        const OK = window.google.maps.places.PlacesServiceStatus.OK;

        if (status === OK && predictions) {
          setSuggestions(predictions); // fill the dropdown with results
          setIsOpen(true);
          setActiveIndex(-1);
        } else {
          // No results or an error — hide the dropdown
          setSuggestions([]);
          setIsOpen(false);
        }
      }
    );
  }, []);

  // ── Handler: User types in the input ──────────────────────────────────────
  // We debounce the API call by 300 ms so we don't fire a request on every
  // single keystroke.
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);

    // Cancel any previously scheduled search
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // If the field was cleared, hide the dropdown immediately
    if (!value.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    // Wait 300 ms after the user stops typing, then call the API
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  // ── Handler: User selects a suggestion from the dropdown ──────────────────
  // We fetch the full place details so we can extract individual address parts.
  const handleSelect = (prediction) => {
    if (!placesServiceRef.current) return;

    // Show loading state and close the dropdown right away
    setIsSelecting(true);
    setInputValue(prediction.description); // fill the input with the full address
    setSuggestions([]);
    setIsOpen(false);

    placesServiceRef.current.getDetails(
      {
        placeId: prediction.place_id,
        // Only request the fields we need (keeps API quota usage low)
        fields: ["address_components", "formatted_address", "geometry"],
      },
      (place, status) => {
        setIsSelecting(false);
        const OK = window.google.maps.places.PlacesServiceStatus.OK;

        if (status === OK && place) {
          // Break the response into individual parts (street, city, etc.)
          const parsed = parseAddressComponents(
            place.address_components || [],
            place.formatted_address || prediction.description
          );

          // Extract GPS coordinates if available
          const coords = place.geometry?.location
            ? {
              latitude: place.geometry.location.lat(),
              longitude: place.geometry.location.lng(),
            }
            : {};

          // Send all values back to the parent form via onAddressSelect
          onAddressSelect({ ...parsed, ...coords });
        }
      }
    );
  };

  // ── Handler: Keyboard navigation inside the dropdown ──────────────────────
  // Arrow Down / Arrow Up  → move the highlighted row up or down
  // Enter                  → select the currently highlighted row
  // Escape                 → close the dropdown without selecting anything
  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  // ── Helper: Bold the matched part of each suggestion ──────────────────────
  // Google returns `matched_substrings` which tells us exactly which characters
  // in the suggestion text match what the user typed.
  // We wrap those characters in <strong> so they appear bold.
  function highlightMatch(text, matchedSubstrings) {
    if (!matchedSubstrings || matchedSubstrings.length === 0) return text;

    const parts = [];
    let lastIndex = 0;

    matchedSubstrings.forEach(({ offset, length }) => {
      parts.push(text.slice(lastIndex, offset));
      parts.push(
        <strong key={offset} className={styles.highlight}>
          {text.slice(offset, offset + length)}
        </strong>
      );
      lastIndex = offset + length;
    });

    parts.push(text.slice(lastIndex)); // remaining text after the last match
    return parts;
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.wrapper} ref={containerRef}>

      {/* Label shown above the search input */}
      <label className={cardStyles.label} htmlFor={id}>
        {label}
      </label>

      {/* Input row: magnifying-glass icon + text input + spinning loader */}
      <div className={styles.inputWrapper}>
        <Search size={16} className={styles.searchIcon} />

        <input
          id={id}
          ref={inputRef}
          type="text"
          autoComplete="off"      // disable the browser's own autocomplete popup
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            // Re-open the dropdown if we already have suggestions loaded
            if (suggestions.length > 0) setIsOpen(true);
          }}
          // Show "Loading..." while the Google Maps API script is starting up
          placeholder={!isLoaded ? "Loading Google Maps..." : placeholder}
          // Disable the field while the API loads or while fetching place details
          disabled={!isLoaded || isSelecting}
          className={`${styles.input} ${error ? styles.inputError : ""}`}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={`${id}-listbox`}
          aria-activedescendant={
            activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined
          }
        />

        {/* Spinning loader — visible while fetching suggestions or place details */}
        {(isSearching || isSelecting) && (
          <Loader size={16} className={styles.spinner} />
        )}
      </div>

      {/* Validation error message (comes from react-hook-form / yup) */}
      {error && <p className={styles.errorText}>{error}</p>}

      {/* Suggestions dropdown — only rendered when there are results to show */}
      {isOpen && suggestions.length > 0 && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className={styles.dropdown}
        >
          {suggestions.map((prediction, index) => (
            <li
              key={prediction.place_id}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`${styles.option} ${index === activeIndex ? styles.optionActive : ""
                }`}
              onMouseDown={(e) => {
                // Use onMouseDown instead of onClick because onClick fires
                // after the input's onBlur, which would close the dropdown first.
                e.preventDefault();
                handleSelect(prediction);
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <MapPin size={14} className={styles.pinIcon} />
              <span className={styles.optionText}>
                {/* Bold the part of the address that matches what the user typed */}
                {highlightMatch(
                  prediction.description,
                  prediction.matched_substrings
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
