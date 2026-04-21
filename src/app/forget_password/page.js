"use client";
import React, { useState } from "react";
import Image from "next/image";
import styles from "./forget_password_page.module.css";
import Link from "next/link";
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Card";
import logoImg from "@/assets/logo/nv.png";

import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { emailRule } from "@/utils/validation";

const schema = yup.object({
	email: emailRule,
});

export default function ForgetPasswordPage() {

	const [message, setMessage] = useState("");

	const { register, handleSubmit, formState: { errors } } = useForm({
		resolver: yupResolver(schema),
	});

	const onSubmit = async (formData) => {
		setMessage("");

		try {
			const res = await fetch("https://nvch-server.onrender.com/api/auth/forgot-password", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ email: formData.email }),
			});

			const data = await res.json();

			if (res.ok) {
				setMessage(data.message || "If an account exists, a reset link has been sent.");
			} else {
				setMessage(data.message || "Something went wrong.");
			}
		} catch (err) {
			setMessage("Error connecting to server");
		}
	};

	return (
		<div className={styles.page}>
			<div className={styles.container}>

				<Image
					src={logoImg}
					alt="Logo"
					width={183}
					height={64}
					className={styles.logo}
				/>

				<div className={styles.title}>
					<h1>Forgot Password</h1>
				</div>

				<form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
					<InputField label="Email Address" name="email" register={register} error={errors.email} placeholder="Enter your registered email" />

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
				<div>{message}</div>
			</div>
		</div>
	);
}