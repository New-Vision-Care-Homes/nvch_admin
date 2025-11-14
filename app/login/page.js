"use client"; 
import React, { useState } from "react";
import Image from "next/image";
import styles from "./login_page.module.css";
import Link from "next/link";
import { useRouter } from "next/navigation";


export default function LoginPage() {

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [errorMsg ,setErrorMsg] = useState("");
	const [checkbox, setCheckBox] = useState(false);

	const router = useRouter();

	const handleSubmit = async (e) => {
		e.preventDefault();
		setErrorMsg("");
	  
		try {
			const res = await fetch("https://nvch-server.onrender.com/api/auth/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ email, password }),
		  	});
	  
			const data = await res.json();
		
			if (res.ok) {
				const token = data?.data?.token;
				if (!token) {
					setErrorMsg("Login failed");
					console.log("Login failed: no token received");
					return;
				}
				localStorage.setItem("token", token);	  
				localStorage.setItem("user", JSON.stringify(data.data.user));  
				router.push("/dashboard");
				console.log("login successfully")
			} else {
				setErrorMsg(data.message || "Wrong Email or Password");
			}
		} catch (err) {
			console.error("Error connecting to server:", err);
			setErrorMsg("Error connecting to server");
		}
	};
	  
	  

	return (
		<div className={styles.page}>
			<div className={styles.container}>

				<Image
					src="/img/login/login_img.png"
					alt="Logo"
					width={500}
					height={240}
					className={styles.logo}
				/>
				<Image
					src="/logo/nv.png"
					alt="Logo"
					width={183}
					height={64}
					className={styles.logo}
				/>

				<div className={styles.title}>
					<h1>Welcome to CareConnect</h1>
					<h2>Your centralized portal for home care management</h2>
				</div>

				<form className={styles.form} onSubmit={handleSubmit}>

					<label htmlFor="login_email">Username or Email</label>
					<input
						type="email"
						id="login_email"
						name="email"
						placeholder="Enter your username or email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
					/>
					<div className={styles.inputWrapper}>
						<label htmlFor="login_password">Password</label>
						<input
							type={showPassword ? "text" : "password"}
							id="login_password"
							name="password"
							placeholder="Enter your password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
						/>
						<div
							className={styles.eyeIcon}
							onClick={() => setShowPassword(!showPassword)}
						>
							<Image
								src={showPassword ? "/img/login/eye_open.svg" : "/img/login/eye_close.svg"}
								alt={showPassword ? "Hide password" : "Show password"}
								width={18}
								height={18}
							/>
						</div>
					</div>
					{/*
					<label className={styles.checkbox}>
						<input
							type="checkbox"
							id="login_checkbox"
							name="checkbox"
							checked={checkbox}
							onChange={() => setCheckBox(!checkbox)}
						/>
						<span className={styles.checkmark}></span>
						Remember me
					</label>


					 */}
					
					<div className={styles.button}>

						<button type="submit" className={styles.loginButton} onClick={handleSubmit}>
							Login
						</button>

						<Link href="/forget_password">
							<button className={styles.forgetButton}>
								Forgot Password?
							</button>
						</Link>
					</div>
					<div>{errorMsg}</div>
				</form>
			</div>
		</div>
	);
}
