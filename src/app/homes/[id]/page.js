"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import PageLayout from "@components/layout/PageLayout";
import { Card, CardHeader, CardContent } from "@components/UI/Card";
import { Table, TableHeader, TableContent, TableCell } from "@components/UI/Table";
import Button from "@components/UI/Button";
import IconButton from "@components/UI/IconButton";
import { useHomes } from "@/hooks/useHomes";
import { useProfile } from "@/hooks/useProfile";
import GeofenceMap from "@/components/UI/GeofenceMap";
import { Edit, Search, Eye } from "lucide-react";
import Link from "next/link";
import styles from "./home_detail.module.css";
import ErrorState from "@components/UI/ErrorState";
import { HOME_TYPE_COLORS, REGION_COLORS, COLOR_FALLBACK } from "@/utils/dropdown_list";

export default function HomeDetailPage() {
	const { id } = useParams();
	const router = useRouter();
	const { homeDetail: home, isLoading, fetchError } = useHomes(id);
	const { profile } = useProfile();
	const canEdit = profile?.permissionSlugs?.includes("update_home");

	// Normalise admins — API may return [{ admin: {...}, adminLevel }] or flat user objects
	const normalisedAdmins = (home?.admins || []).map(entry =>
		typeof entry.admin === "object" && entry.admin !== null
			? { ...entry.admin, adminLevel: entry.adminLevel || "supervisor" }
			: { ...entry, adminLevel: entry.adminLevel || "supervisor" }
	);

	// --- Caregiver Search ---
	const [caregiverSearch, setCaregiverSearch] = useState("");
	const displayCaregivers = useMemo(() => {
		const assigned = home?.caregivers || [];
		if (!caregiverSearch) return assigned;
		const q = caregiverSearch.toLowerCase();
		return assigned.filter(c =>
			`${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
			(c.email || "").toLowerCase().includes(q) ||
			(c.phone || "").toLowerCase().includes(q)
		);
	}, [home?.caregivers, caregiverSearch]);

	// --- Client Search ---
	const [clientSearch, setClientSearch] = useState("");
	const displayClients = useMemo(() => {
		const assigned = home?.clients || [];
		if (!clientSearch) return assigned;
		const q = clientSearch.toLowerCase();
		return assigned.filter(c =>
			`${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
			(c.email || "").toLowerCase().includes(q) ||
			(c.phone || "").toLowerCase().includes(q)
		);
	}, [home?.clients, clientSearch]);

	// --- Admin Search ---
	const [adminSearch, setAdminSearch] = useState("");
	const displayAdmins = useMemo(() => {
		if (!adminSearch) return normalisedAdmins;
		const q = adminSearch.toLowerCase();
		return normalisedAdmins.filter(a =>
			`${a.firstName} ${a.lastName}`.toLowerCase().includes(q) ||
			(a.email || "").toLowerCase().includes(q)
		);
	}, [normalisedAdmins, adminSearch]);

	const InfoItem = ({ label, children }) => (
		<div className={styles.infoItem}>
			<span className={styles.infoLabel}>{label}</span>
			<span className={styles.infoValue}>{children}</span>
		</div>
	);

	const gpsCenter = home?.gpsCoordinates
		? { lat: home.gpsCoordinates.latitude, lng: home.gpsCoordinates.longitude }
		: undefined;

	if (fetchError || isLoading) return (
		<PageLayout>
			<ErrorState
				isLoading={isLoading}
				errorMessage={fetchError || "Home not found"}
				onRetry={() => window.location.reload()}
			/>
		</PageLayout>
	);

	return (
		<PageLayout>
			<div className={styles.header}>
				<h1>{home.name}</h1>
				<div className={styles.buttons}>
					<Button variant="secondary" onClick={() => router.push("/homes")}>Back</Button>
					{canEdit && (
						<Link href={`/homes/${id}/edit`}>
							<Button variant="primary" icon={<Edit size={16} />}>Edit</Button>
						</Link>
					)}
				</div>
			</div>

			<div className={styles.content}>

				{/* Basic Information */}
				<Card>
					<CardHeader>Basic Information</CardHeader>
					<CardContent>
						<div className={styles.infoGrid}>
							<InfoItem label="Home Name">{home.name}</InfoItem>
							<InfoItem label="Region">
								{home.region ? (() => {
									const c = REGION_COLORS[home.region] ?? COLOR_FALLBACK;
									return <span style={{ display: "inline-block", padding: "0.2rem 0.65rem", borderRadius: "20px", fontSize: "0.78rem", fontWeight: 500, background: c.bg, border: `1px solid ${c.border}`, color: c.text, whiteSpace: "nowrap" }}>{home.region}</span>;
								})() : "—"}
							</InfoItem>
							<InfoItem label="Status">
								<span className={`${styles.statusPill} ${home.isActive ? styles.statusActive : styles.statusInactive}`}>
									{home.isActive ? "Active" : "Inactive"}
								</span>
							</InfoItem>
							<InfoItem label="Opened At">
								{home.openedAt ? format(new Date(home.openedAt), "MMM d, yyyy") : "—"}
							</InfoItem>
							<InfoItem label="Home Type">
								{home.homeType ? (() => {
									const c = HOME_TYPE_COLORS[home.homeType] ?? COLOR_FALLBACK;
									return <span style={{ display: "inline-block", padding: "0.2rem 0.65rem", borderRadius: "20px", fontSize: "0.78rem", fontWeight: 500, background: c.bg, border: `1px solid ${c.border}`, color: c.text, whiteSpace: "nowrap" }}>{home.homeType}</span>;
								})() : "—"}
							</InfoItem>
							<InfoItem label="Notes">{home.notes || "—"}</InfoItem>
						</div>
					</CardContent>
				</Card>

				{/* Location */}
				<Card>
					<CardHeader>Location &amp; Geofence</CardHeader>
					<CardContent>
						{/* Full address string */}
						{home.address && (
							<div className={styles.infoItem} style={{ marginBottom: '1rem' }}>
								<span className={styles.infoLabel}>Address</span>
								<span className={styles.infoValue}>
									{[home.address.unit, home.address.street, home.address.city, home.address.province, home.address.postalCode, home.address.country]
										.filter(Boolean).join(", ")}
								</span>
							</div>
						)}
						{/* Google Map */}
						<div style={{ width: '100%', height: '380px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #DEE1E6FF' }}>
							<GeofenceMap
								center={{ latitude: gpsCenter?.lat || 44.6476, longitude: gpsCenter?.lng || -63.5728 }}
								radius={100}
								height="100%"
							/>
						</div>
					</CardContent>
				</Card>


				{/* Caregivers */}
				<Card>
					<CardHeader actions={
						<div className={styles.searchWrap}>
							<Search size={14} className={styles.searchIcon} />
							<input
								className={styles.searchInput}
								type="text"
								placeholder="Search caregivers…"
								value={caregiverSearch}
								onChange={(e) => setCaregiverSearch(e.target.value)}
							/>
						</div>
					}>
						Caregivers ({home.caregivers?.length || 0})
					</CardHeader>
					<CardContent>
						{displayCaregivers.length > 0 ? (
							<Table>
								<TableHeader>
									<TableCell>Name</TableCell>
									<TableCell>Email</TableCell>
									<TableCell>Phone</TableCell>
									<TableCell>Action</TableCell>
								</TableHeader>
								{displayCaregivers.map(c => (
									<TableContent key={c.id || c._id}>
										<TableCell>{c.firstName} {c.lastName}</TableCell>
										<TableCell>{c.email || "—"}</TableCell>
										<TableCell>{c.phone || "—"}</TableCell>
										<TableCell>
											<IconButton href={`/caregivers/${c.id || c._id}`} title="View Caregiver">
												<Eye size={14} />
											</IconButton>
										</TableCell>
									</TableContent>
								))}
							</Table>
						) : (
							<p className={styles.emptyText}>No caregivers found.</p>
						)}
					</CardContent>
				</Card>

				{/* Clients */}
				<Card>
					<CardHeader actions={
						<div className={styles.searchWrap}>
							<Search size={14} className={styles.searchIcon} />
							<input
								className={styles.searchInput}
								type="text"
								placeholder="Search clients…"
								value={clientSearch}
								onChange={(e) => setClientSearch(e.target.value)}
							/>
						</div>
					}>
						Clients ({home.clients?.length || 0})
					</CardHeader>
					<CardContent>
						{displayClients.length > 0 ? (
							<Table>
								<TableHeader>
									<TableCell>Name</TableCell>
									<TableCell>Email</TableCell>
									<TableCell>Phone</TableCell>
									<TableCell>Action</TableCell>
								</TableHeader>
								{displayClients.map(c => (
									<TableContent key={c.id || c._id}>
										<TableCell>{c.firstName} {c.lastName}</TableCell>
										<TableCell>{c.email || "—"}</TableCell>
										<TableCell>{c.phone || "—"}</TableCell>
										<TableCell>
											<IconButton href={`/clients/${c.id || c._id}`} title="View Client">
												<Eye size={14} />
											</IconButton>
										</TableCell>
									</TableContent>
								))}
							</Table>
						) : (
							<p className={styles.emptyText}>No clients found.</p>
						)}
					</CardContent>
				</Card>

				{/* Admins */}
				<Card>
					<CardHeader actions={
						<div className={styles.searchWrap}>
							<Search size={14} className={styles.searchIcon} />
							<input
								className={styles.searchInput}
								type="text"
								placeholder="Search admins…"
								value={adminSearch}
								onChange={(e) => setAdminSearch(e.target.value)}
							/>
						</div>
					}>
						Admins ({normalisedAdmins.length})
					</CardHeader>
					<CardContent>
						{displayAdmins.length > 0 ? (
							<Table>
								<TableHeader>
									<TableCell>Name</TableCell>
									<TableCell>Email</TableCell>
									<TableCell>Level</TableCell>
									<TableCell>Action</TableCell>
								</TableHeader>
								{displayAdmins.map(a => (
									<TableContent key={a.id || a._id}>
										<TableCell>{a.firstName} {a.lastName}</TableCell>
										<TableCell>{a.email || "—"}</TableCell>
										<TableCell className={styles.capitalize}>{a.adminLevel}</TableCell>
										<TableCell>
											<IconButton disabled title="View Admin">
												<Eye size={14} />
											</IconButton>
										</TableCell>
									</TableContent>
								))}
							</Table>
						) : (
							<p className={styles.emptyText}>No admins found.</p>
						)}
					</CardContent>
				</Card>

			</div>
		</PageLayout>
	);
}
