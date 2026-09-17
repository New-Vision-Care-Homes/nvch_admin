/**
 * Attaches a document-level mousedown listener that calls `onOutside` when the
 * click lands outside `ref`. Call inside a `useEffect` and return the cleanup:
 *
 *   useEffect(() => attachClickOutside(wrapperRef, () => setOpen(false)), []);
 *
 * More reliable than an onBlur+setTimeout, which can misfire before a
 * mousedown-selected option inside the same wrapper registers its click.
 */
export function attachClickOutside(ref, onOutside) {
	function handleClickOutside(e) {
		if (ref.current && !ref.current.contains(e.target)) {
			onOutside();
		}
	}
	document.addEventListener("mousedown", handleClickOutside);
	return () => document.removeEventListener("mousedown", handleClickOutside);
}
