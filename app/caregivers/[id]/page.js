"use client";

import React, { useState, useEffect, useCallback } from "react";
import PageLayout from "@components/layout/PageLayout";
import Tabs from "./components/Tabs";
import Button from "@components/UI/Button";
import { Card, CardHeader, InfoField } from "@components/UI/Card";
import styles from "./caregiver_profile.module.css";
import Image from "next/image";
import Link from "next/link";
import { Edit, Activity, Undo2 } from "lucide-react";
import Modal from "@components/UI/Modal";
import { useParams } from "next/navigation";

// Base URL for the API server
const API_BASE_URL = "https://nvch-server.onrender.com/api/auth/admin/users";

export default function Page() {
    const { id } = useParams();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Modal state for success/error messages
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [message, setMessage] = useState("");
    
    // --- API Calls ---

    // 1. Fetch User Data (GET)
    const fetchUser = useCallback(async () => {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
            setMessage("Authentication failed. Please log in again.");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/${id}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await res.json();

            if (res.ok) {
                setUser(data.data.user);
            } else {
                setMessage(data.message || "Failed to fetch user data.");
                setIsModalOpen(true);
            }
        } catch (err) {
            console.error("Fetch User Error:", err);
            setMessage("Error connecting to server to fetch user data.");
            setIsModalOpen(true);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]); // Dependency array includes useCallback function

    // 2. Handle Active/Inactive Status Update (PUT)
    const handleActive = async () => {  
        const token = localStorage.getItem("token");    
        if (!user || !token) return;

        // Calculate the status we are SENDING to the server
        const newActiveStatus = !user.isActive; 
        
        try {
            const res = await fetch(`${API_BASE_URL}/${id}`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ isActive: newActiveStatus }), // Use correct field name
            });
            
            const data = await res.json();
            
            if (res.ok) {
                const statusText = newActiveStatus ? "active" : "inactive";
                setUser(prevUser => ({
                    ...prevUser,
                    isActive: newActiveStatus,
                }));

                setMessage(`The user has been ${statusText}d`);
                setIsModalOpen(true);
            } else {
                setMessage(data.message || "Failed to update user status.");
                setIsModalOpen(true);
            }
        } catch (error) {
            console.error("Status Update Error:", error);
            setMessage("A critical error occurred during status update.");
            setIsModalOpen(true);
        }
    }

    // --- Utility Handlers ---

    function handleCancel() {
        setIsModalOpen(false);
    }
    
    // --- Render Logic ---

    if (loading) return <p>Loading user data...</p>;
    if (!user) return <p>User data not found or failed to load.</p>;

    const activeStatus = user.isActive;

    return (
        <>
            <PageLayout>
                {/* Header */}
                <div className={styles.header}>
                    <h1>Caregiver Profile: {user.firstName} {user.lastName}</h1>
                    <div className={styles.headerActions}>
                        <Button
                            variant="primary"
                            icon={<Activity size={16} />}
                            onClick={handleActive}
                            // Use the actual user.isActive state for styling
                            className={`${activeStatus ? styles.inactive : styles.active}`}
                        >
                            {activeStatus ? "Inactive" : "Active"}
                        </Button>
                        <Link href="/caregivers">
                            <Button variant="secondary" icon={<Undo2 size={16}/>}>Back</Button>
                        </Link>
                    </div>
                </div>

                {/* Caregiver Overview */}
                <Card>
                    <CardHeader>Caregiver Overview</CardHeader>
                    <div className={styles.content}>
                        <div className={styles.text}>
                            <div className={styles.column}>
                                <InfoField label="Caregiver ID">{user.employeeId}</InfoField>
                                <InfoField label="Next Appointment">2024-08-05 (10:00 AM)</InfoField>
                            </div>
                            <div className={styles.column}>
                                <InfoField label="Status">{activeStatus ? "Active" : "Inactive"}</InfoField>
                                <InfoField label="Care Plan Status">On Track</InfoField>
                            </div>
                            <div className={styles.column}>
                                <InfoField label="Last Visit">2024-07-28</InfoField>
                            </div>
                        </div>
                        <div className={styles.picture}>
                            <Image
                                src="/img/navbar/avatar.jpg"
                                alt="Profile Photo"
                                width={100}
                                height={100}
                                className={styles.image}
                            />
                            <Button variant="secondary" size="sm" icon={<Edit size={16}/>}>Edit</Button>
                        </div>
                    </div>
                </Card>

                {/* Tabbed Content */}
                <div className={styles.tabs}>
                    <Tabs />
                </div>
                {/* End Tabbed Content */}
            </PageLayout>

            <Modal isOpen={isModalOpen} onClose={handleCancel}>
                <h2>{message}</h2>
            </Modal>
        </>
    );
}
