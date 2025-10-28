"use client";

import {React, useState} from "react";
import Sidebar from "@components/layout/Sidebar";
import Navbar from "@components/layout/Navbar";
import Tabs from "./components/Tabs";
import Button from "@components/UI/Button";
import { Card, CardHeader, CardContent, InfoField } from "@components/UI/Card";
import styles from "./setting.module.css";
import Image from "next/image";
import Link from "next/link";
import { Edit, Activity, Undo2 } from "lucide-react";
import Modal from "@components/UI/Modal";

export default function Page() {

	return (
		<div className={styles.page}>
			<Navbar />
			<div className={styles.container}>
				<Sidebar />
				<div className={styles.body}>
					{/* Header */}
					<h1>Settings and Administration</h1>
					{/* Tabbed Content */}
					<div className={styles.tabs}>
						<Tabs />
					</div>
				</div>
			</div>
		</div>
	);
}