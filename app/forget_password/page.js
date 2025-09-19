"use client"; 
import React, { useState } from "react";
import Image from "next/image";
import styles from "./forget_password_page.module.css";
import Link from "next/link";

export default function ForgetPasswordPage() {

	const [email, setEmail] = useState('');

	function handleSubmit(e){
		e.preventDefault();
		console.log("Email:", email);
	}

	return (
		<div className={styles.page}>
			<div className={styles.container}>

				<Image
					src="/logo/nv.png"
					alt="Logo"
					width={183}
					height={64}
					className={styles.logo}
				/>

				<div className={styles.title}>
					<h1>Forgot Password</h1>
				</div>

				<form className={styles.form} onSubmit={handleSubmit}>

					<label htmlFor="email">Email Address</label>
					<input
						type="email"
						id="email"
						name="email"
						placeholder="Enter your registered email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
					/>

					<button type="submit" className={styles.resetButton}>
						Send Reset Link
					</button>

					<div className={styles.button}>
						<div>Remember your password? </div>
						<Link href="/login">
							<button className={styles.goBackButton}>
								Login In
							</button>
						</Link>
					</div>
				</form>
			</div>
		</div>
	);
}