"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Bell, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "./Navbar.module.css";
import logoImg from "@/assets/logo/nv.png";
import avatarImg from "@/assets/img/navbar/avatar.jpg";

export default function Navbar() {
	const [search, setSearch] = useState("");
	const router = useRouter();

	const handleSearch = () => {
		alert(`Searching: ${search}`);
	};

	const handleLogout = () => {
		// 1. Remove JWT from localStorage
		localStorage.removeItem("token");

		// 2. Redirect to login page
		router.push("/login");
	};

	return (
		<nav className={styles.navbar}>
			<div className={styles.container}>
				{/* Logo */}
				<Image src={logoImg} alt="App Icon" width={80} height={39} />

				<div className={styles.element}>
					{/* Search */}
					<div className={styles.search}>
						<span className={styles.searchIcon}>
							<Search size={16} color="#9095A0" />
						</span>
						<input
							type="text"
							placeholder="Search..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleSearch()}
						/>
					</div>

					{/* Notification */}
					<Link href="/notification" className={styles.notification}>
						<Bell size={16} />
						<span>Notification</span>
					</Link>

					{/* Logout */}
					<button
						onClick={handleLogout}
						className={styles.logout}
					>
						<LogOut size={16} />
						<span>Logout</span>
					</button>

					{/* Profile Image */}
					<Image
						src={avatarImg}
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
