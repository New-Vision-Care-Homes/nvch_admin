"use client";

import Link from "next/link";
import React, { useState } from "react";
import Image from "next/image";
import styles from "./Navbar.module.css";

export default function Navbar() {
	const [search, setSearch] = useState("");

	const handleSearch = () => {
		alert(`Searching: ${search}`);
	};

	return (
		<nav className={styles.navbar}>
			<div className={styles.container}>
				<Image src="/logo/nv.png" alt="App Icon" width={80} height={39} />

				<div className={styles.element}>
					{/* Search */}
					<div className={styles.search}>
						<span className={styles.searchIcon}>
							<Image src="/img/navbar/search.svg" alt="Search Icon" width={16} height={16} />
						</span>
						<input
							type="text"
							placeholder="Search..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									handleSearch();
								}
							}}
						/>
					</div>

					{/* Notification */}
					<Link href='/' className={styles.notification}>
						<Image
							src="/img/navbar/notification.svg"
							alt="Notification"
							width={16}
							height={16}
							className={styles.icon}
						/>
						<span>Notification</span>
					</Link>

					{/* Logout */}
					<Link href='/login' className={styles.logout}>
						<Image
							src="/img/navbar/logout.svg"
							alt="Logout"
							width={16}
							height={16}
						/>
						<span>Logout</span>
					</Link>
					

					{/* Profile Image */}
					<Image
						src="/img/navbar/avatar.jpg"
						alt="profile img"
						width={36}
						height={36}
						className={styles.avatar}
					/>
				</div>
			</div>
		</nav>
	);
}
