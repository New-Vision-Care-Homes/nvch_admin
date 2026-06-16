"use client";

import ReactPaginate from "react-paginate";
import styles from "./Pagination.module.css";

export default function Pagination({
	pageCount,
	forcePage,
	onPageChange,
	pageRangeDisplayed = 3,
	marginPagesDisplayed = 1,
}) {
	if (!pageCount || pageCount <= 1) return null;

	return (
		<ReactPaginate
			pageCount={Math.max(pageCount, 1)}
			forcePage={forcePage}
			onPageChange={onPageChange}
			pageRangeDisplayed={pageRangeDisplayed}
			marginPagesDisplayed={marginPagesDisplayed}
			breakLabel="..."
			previousLabel="Prev"
			nextLabel="Next"
			containerClassName={styles.pagination}
			pageClassName={styles.pageItem}
			pageLinkClassName={styles.pageLink}
			previousClassName={styles.pageItem}
			previousLinkClassName={styles.pageLink}
			nextClassName={styles.pageItem}
			nextLinkClassName={styles.pageLink}
			breakClassName={styles.pageItem}
			breakLinkClassName={styles.pageLink}
			activeClassName={styles.active}
			disabledClassName={styles.disabled}
		/>
	);
}
