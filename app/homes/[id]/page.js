"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import PageLayout from "@components/layout/PageLayout";
import { Card, CardHeader, CardContent } from "@components/UI/Card";
import { Table, TableHeader, TableContent, TableCell } from "@components/UI/Table";
import Button from "@components/UI/Button";
import { useHomes } from "@/hooks/useHomes";
import { useClients } from "@/hooks/useClients";
import { useCaregivers } from "@/hooks/useCaregivers";
import { useAdmins } from "@/hooks/useAdmins";
import { useGoogleMap } from "@/hooks/useGoogleMap";
import { Edit, Search, Eye } from "lucide-react";
import Link from "next/link";
import styles from "./home_detail.module.css";

export default function HomeDetailPage() {
	const { id } = useParams();
	const router = useRouter();
	const { homeDetail: home, isLoading, isError, errorMessage } = useHomes(id);

	// Normalise admins — API may return [{ admin: {...}, adminLevel }] or flat user objects
	const normalisedAdmins = (home?.admins || []).map(entry =>
		typeof entry.admin === "object" && entry.admin !== null
			? { ...entry.admin, adminLevel: entry.adminLevel || "supervisor" }
			: { ...entry, adminLevel: entry.adminLevel || "supervisor" }
	);

	// Debounce utility
	const debounce = (func, delay) => {
		let timeoutId;
		return function (...args) {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => func.apply(this, args), delay);
		};
	};

	// --- Caregiver Search ---
	const [caregiverSearch, setCaregiverSearch] = useState("");
	const [caregiverSearchParams, setCaregiverSearchParams] = useState({});
	const { caregivers: searchedCaregivers } = useCaregivers(caregiverSearchParams);

	const searchCaregivers = (searchTerm) => {
		if (searchTerm.length < 2) {
			setCaregiverSearchParams({});
			return;
		}
		setCaregiverSearchParams({ search: searchTerm, page: 1, limit: 10 });
	};

	const debouncedSearchCaregivers = useCallback(debounce(searchCaregivers, 300), []);
	useEffect(() => { debouncedSearchCaregivers(caregiverSearch); }, [caregiverSearch, debouncedSearchCaregivers]);

	const displayCaregivers = useMemo(() => {
		const assigned = home?.caregivers || [];
		if (!caregiverSearch || caregiverSearch.length < 2) return assigned;
		if (!searchedCaregivers) return [];
		// Intersection of searched caregivers and assigned caregivers
		return assigned.filter(c => searchedCaregivers.some(sc => sc.id === c.id));
	}, [home?.caregivers, caregiverSearch, searchedCaregivers]);

	// --- Client Search ---
	const [clientSearch, setClientSearch] = useState("");
	const [clientSearchParams, setClientSearchParams] = useState({});
	const { clients: searchedClients } = useClients(clientSearchParams);

	const searchClients = (searchTerm) => {
		if (searchTerm.length < 2) {
			setClientSearchParams({});
			return;
		}
		setClientSearchParams({ search: searchTerm, page: 1, limit: 10 });
	};

	const debouncedSearchClients = useCallback(debounce(searchClients, 300), []);
	useEffect(() => { debouncedSearchClients(clientSearch); }, [clientSearch, debouncedSearchClients]);

	const displayClients = useMemo(() => {
		const assigned = home?.clients || [];
		if (!clientSearch || clientSearch.length < 2) return assigned;
		if (!searchedClients) return [];
		return assigned.filter(c => searchedClients.some(sc => sc.id === c.id));
	}, [home?.clients, clientSearch, searchedClients]);

	// --- Admin Search ---
	const [adminSearch, setAdminSearch] = useState("");
	const [adminSearchParams, setAdminSearchParams] = useState({});
	const { admins: searchedAdmins } = useAdmins(adminSearchParams);

	const searchAdmins = (searchTerm) => {
		if (searchTerm.length < 2) {
			setAdminSearchParams({});
			return;
		}
		setAdminSearchParams({ search: searchTerm, page: 1, limit: 10 });
	};

	const debouncedSearchAdmins = useCallback(debounce(searchAdmins, 300), []);
	useEffect(() => { debouncedSearchAdmins(adminSearch); }, [adminSearch, debouncedSearchAdmins]);

	const displayAdmins = useMemo(() => {
		const assigned = normalisedAdmins;
		if (!adminSearch || adminSearch.length < 2) return assigned;
		if (!searchedAdmins) return [];
		return assigned.filter(a => searchedAdmins.some(sa => (sa.id || sa._id) === (a.id || a._id)));
	}, [normalisedAdmins, adminSearch, searchedAdmins]);

	const InfoItem = ({ label, children }) => (
		<div className={styles.infoItem}>
			<span className={styles.infoLabel}>{label}</span>
			<span className={styles.infoValue}>{children}</span>
		</div>
	);

	// Build the map center from stored GPS coords (or default)
	const gpsCenter = home?.gpsCoordinates
		? { lat: home.gpsCoordinates.latitude, lng: home.gpsCoordinates.longitude }
		: undefined;

	const { mapRef, isLoaded } = useGoogleMap({
		initialCenter: gpsCenter,
		initialRadius: home?.defaultGeofence?.radius || 200,
	});

	if (isLoading) return <PageLayout><div>Loading home details...</div></PageLayout>;
	if (isError || !home) return <PageLayout><div>Error: {errorMessage || "Home not found"}</div></PageLayout>;

	return (
		<PageLayout>
			<div className={styles.header}>
				<h1>{home.name}</h1>
				<div className={styles.buttons}>
					<Button variant="secondary" onClick={() => router.push("/homes")}>Back</Button>
					<Link href={`/homes/${id}/edit`}>
						<Button variant="primary" icon={<Edit size={16} />}>Edit</Button>
					</Link>
				</div>
			</div>

			<div className={styles.content}>

				{/* Basic Information */}
				<Card>
					<CardHeader>Basic Information</CardHeader>
					<CardContent>
						<div className={styles.infoGrid}>
							<InfoItem label="Home Name">{home.name}</InfoItem>
							<InfoItem label="Region">{home.region}</InfoItem>
							<InfoItem label="Status">
								<span className={`${styles.statusPill} ${home.isActive ? styles.statusActive : styles.statusInactive}`}>
									{home.isActive ? "Active" : "Inactive"}
								</span>
							</InfoItem>
							<InfoItem label="Opened At">
								{home.openedAt ? format(new Date(home.openedAt), "MMM d, yyyy") : "—"}
							</InfoItem>
							<InfoItem label="Program Types">
								<div className={styles.chipRow}>
									{(home.programTypes || []).map(t => (
										<span key={t} className={styles.chip}>{t}</span>
									))}
								</div>
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
									{[home.address.street, home.address.city, home.address.province, home.address.postalCode, home.address.country]
										.filter(Boolean).join(", ")}
								</span>
							</div>
						)}
						{/* Geofence info */}
						{home.defaultGeofence?.radius && (
							<div className={styles.infoItem} style={{ marginBottom: '1rem' }}>
								<span className={styles.infoLabel}>Geofence</span>
								<span className={styles.infoValue}>
									{home.defaultGeofence.radius} m ({home.defaultGeofence.shape})
								</span>
							</div>
						)}
						{/* Google Map */}
						<div style={{ width: '100%', height: '380px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #DEE1E6FF' }}>
							{isLoaded
								? <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
								: <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#f5f5f5', color: '#6b7280' }}>Loading map...</div>
							}
						</div>
					</CardContent>
				</Card>

				{/* Settings */}
				<Card>
					<CardHeader>Settings</CardHeader>
					<CardContent>
						<div className={styles.infoGrid}>
							<InfoItem label="Night Checks">
								<span className={`${styles.statusPill} ${home.nightChecksEnabled ? styles.statusEnabled : styles.statusDisabled}`}>
									{home.nightChecksEnabled ? `Enabled — every ${home.nightCheckFrequency} min` : "Disabled"}
								</span>
							</InfoItem>
							<InfoItem label="Allow Temporary Leave">
								{home.allowTemporaryLeave ? "Yes" : "No"}
							</InfoItem>
							<InfoItem label="Require Location Check-In">
								{home.requireLocationCheckIn ? "Yes" : "No"}
							</InfoItem>
						</div>
					</CardContent>
				</Card>

				{/* Caregivers */}
				<Card>
					<CardHeader>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
							<span>Caregivers ({home.caregivers?.length || 0})</span>
							<div style={{ position: "relative", width: "250px" }}>
								<Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
								<input
									type="text"
									placeholder="Search caregivers..."
									value={caregiverSearch}
									onChange={(e) => setCaregiverSearch(e.target.value)}
									style={{ width: "100%", padding: "8px 12px 8px 36px", fontSize: "0.9rem", borderRadius: "8px", border: "1px solid #e5e7eb", outline: "none", transition: "border-color 0.2s" }}
									onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
									onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
								/>
							</div>
						</div>
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
											<Link href={`/caregivers/${c.id || c._id}`}>
												<Button variant="secondary" icon={<Eye size={16} />} style={{ fontSize: "0.85rem", padding: "6px 12px" }}>View Detail</Button>
											</Link>
										</TableCell>
									</TableContent>
								))}
							</Table>
						) : (
							<p style={{ color: "#6b7280", fontSize: "0.9rem" }}>No caregivers found.</p>
						)}
					</CardContent>
				</Card>

				{/* Clients */}
				<Card>
					<CardHeader>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
							<span>Clients ({home.clients?.length || 0})</span>
							<div style={{ position: "relative", width: "250px" }}>
								<Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
								<input
									type="text"
									placeholder="Search clients..."
									value={clientSearch}
									onChange={(e) => setClientSearch(e.target.value)}
									style={{ width: "100%", padding: "8px 12px 8px 36px", fontSize: "0.9rem", borderRadius: "8px", border: "1px solid #e5e7eb", outline: "none", transition: "border-color 0.2s" }}
									onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
									onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
								/>
							</div>
						</div>
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
											<Link href={`/clients/${c.id || c._id}`}>
												<Button variant="secondary" icon={<Eye size={16} />} style={{ fontSize: "0.85rem", padding: "6px 12px" }}>View Detail</Button>
											</Link>
										</TableCell>
									</TableContent>
								))}
							</Table>
						) : (
							<p style={{ color: "#6b7280", fontSize: "0.9rem" }}>No clients found.</p>
						)}
					</CardContent>
				</Card>

				{/* Admins */}
				<Card>
					<CardHeader>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
							<span>Admins ({normalisedAdmins.length})</span>
							<div style={{ position: "relative", width: "250px" }}>
								<Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
								<input
									type="text"
									placeholder="Search admins..."
									value={adminSearch}
									onChange={(e) => setAdminSearch(e.target.value)}
									style={{ width: "100%", padding: "8px 12px 8px 36px", fontSize: "0.9rem", borderRadius: "8px", border: "1px solid #e5e7eb", outline: "none", transition: "border-color 0.2s" }}
									onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
									onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
								/>
							</div>
						</div>
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
										<TableCell style={{ textTransform: "capitalize" }}>{a.adminLevel}</TableCell>
										<TableCell>
											<div style={{ cursor: "not-allowed", display: "inline-block" }}>
												<Button variant="secondary" icon={<Eye size={16} />} style={{ fontSize: "0.85rem", padding: "6px 12px", opacity: 0.5, pointerEvents: "none" }}>View Detail</Button>
											</div>
										</TableCell>
									</TableContent>
								))}
							</Table>
						) : (
							<p style={{ color: "#6b7280", fontSize: "0.9rem" }}>No admins found.</p>
						)}
					</CardContent>
				</Card>

			</div>
		</PageLayout>
	);
}
