"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
// Assume these components and validation rules are defined in your project
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import styles from "./info.module.css";
import { nameRule, emailRule, phoneRule, pinRule, birthRule, shortTextRule, longTextRule } from "@app/validation";
import { useParams } from "next/navigation";

// API Endpoint for user management
const API_BASE_URL = "https://nvch-server.onrender.com/api/auth/admin/users";

// --- 1. Data Cleaning/Flattening Function ---
/**
 * Transforms nested API data into a flat structure suitable for the form's fields.
 * Also ensures all fields have safe default values (e.g., "" instead of null/undefined).
 * @param {object} apiData - Raw user data from the API.
 * @returns {object} Flattened object with safe default values for use with RHF's reset().
 */
const cleanFetchedData = (apiData) => {
    // Return empty object if no API data is provided (used for initial defaultValues)
    if (!apiData) return {};
	console.log("apidata: ", apiData);
    
    // Base fields (using optional chaining and nullish coalescing for safety)
    const cleanData = {
        firstName: apiData.firstName || "",
        lastName: apiData.lastName || "",
        gender: apiData.gender || "",
        // Format date string for HTML input type="date" (YYYY-MM-DD)
        birth: apiData.dateOfBirth?.split('T')[0] || "", 
        phone: apiData.phone || "",
        email: apiData.email || "",
		street: apiData.address.street || "",
		city: apiData.address.city || "",
		state: apiData.address.state || "",
		country: apiData.address.country || "",
		pincode: apiData.address.pinCode || "",
        notes: apiData.notes || "",
    };

    // --- Flattening Nested Objects ---
    
    // Emergency Contact
    const emergencyContact = apiData.emergencyContact || {};
    // Assuming name is stored as "First Last" and needs to be split
    const emergencyNameParts = emergencyContact.name?.split(' ') || [];
    cleanData.emergencyFName = emergencyNameParts[0] || "";
    cleanData.emergencyLName = emergencyNameParts.slice(1).join(' ') || "";
    cleanData.emergencyPhone = emergencyContact.phone || "";
    cleanData.relationship = emergencyContact.relationship || "";

    // Statutory Decision Maker (SDM)
    const sdm = apiData.statutoryDecisionMaker || {};
    const sdmNameParts = sdm.name?.split(' ') || [];
    cleanData.sdmFName = sdmNameParts[0] || "";
    cleanData.sdmLName = sdmNameParts.slice(1).join(' ') || "";
    cleanData.sdmPhone = sdm.phoneNumber || "";
    cleanData.sdmEmail = sdm.email || "";
    
    return cleanData;
};


// --- 2. Yup Validation Schema ---
const schema = yup.object({
	firstName: nameRule.required("First name is required"),
	lastName: nameRule.required("Last name is required"),
	email: emailRule,
	phone: phoneRule,
	gender: shortTextRule.required("Gender is required"),
	birth: birthRule,
	notes: longTextRule,
	// Address
	street: shortTextRule.required(),
	city: shortTextRule.required(),
	state: shortTextRule.required(),
	pincode: pinRule,
	country: shortTextRule.required(),
	latitude: null,
	longitude: null,
	// Emergency Contact
	emergencyFName: nameRule.optional(),
	emergencyLName: nameRule.optional(),
	emergencyPhone: phoneRule.optional(),
	relationship: shortTextRule.optional(),
	// SDM
	sdmFName: nameRule,
	sdmLName: nameRule,
	sdmPhone: phoneRule,
	sdmEmail: emailRule,
});


export default function Info() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState(null);
    const { id } = useParams();

    const { 
        register, 
        handleSubmit, 
        formState: { errors }, 
        reset, // Key function for loading data and implementing "Cancel"
        watch // Used for displaying the user's name in the header
    } = useForm({
        resolver: yupResolver(schema),
        // Initialize form with safe, empty defaults using cleanFetchedData(null)
        defaultValues: cleanFetchedData(null), 
    });

    // --- 3. Data Loading (Fetch User Data) ---
    const fetchUser = useCallback(async () => {
        setIsLoading(true);
        setMessage(null);
        const token = localStorage.getItem("token");
        
        if (!token) {
            setMessage("Authentication failed. Please log in again.");
            setIsLoading(false);
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

            if (res.ok && data.data.user) {
                const cleanedData = cleanFetchedData(data.data.user);
				console.log("data: ", cleanedData);
                // Use reset() to populate the form fields with fetched data
                // This also sets the starting point for the "Cancel" action
                reset(cleanedData); 
                setMessage("Profile data loaded successfully.");
            } else {
                const errorMsg = data.error || data.message || "Failed to fetch user data.";
                setMessage(`Error fetching user: ${errorMsg}`);
            }
        } catch (err) {
            console.error("Fetch User Error:", err);
            setMessage("Error connecting to server to fetch user data.");
        } finally {
            setIsLoading(false);
        }
    }, [id, reset]); // Dependencies: id for endpoint, reset for RHF

    useEffect(() => {
        // Fetch data only once the component mounts and the ID is available
        if(id) {
             fetchUser();
        }
    }, [id, fetchUser]);


    // --- 4. Form Submission (Update User Data) ---
    const onSubmit = async (data) => {
		console.log("check if onsubmit is working");
        setIsSubmitting(true);
        setMessage(null);
        const token = localStorage.getItem("token");

        // --- Re-nest/Structure data for API Submission ---
		const submissionBody = {
			email: data.email,
			firstName: data.firstName,
			lastName: data.lastName,
			phone: data.phone,
			dateOfBirth: data.birth,
			notes: data.notes ? data.notes : null,
		  
			address: {
				street: data.street,
				city: data.city,
				state: data.state,
				pinCode: data.pincode,
				country: data.country,
				gpsCoordinates: {
					"latitude": 44.6488,
      				"longitude": -63.5752
				},
			},

			emergencyContact: {
				name: `${data.emergencyFName} ${data.emergencyLName}`.trim(),
				phone: data.emergencyPhone,
				relationship: data.relationship
			},
		  
			statutoryDecisionMaker: {
				name: `${data.sdmFName} ${data.sdmLName}`.trim(),
				phoneNumber: data.sdmPhone,
				email: data.sdmEmail,
			},
        };

		console.log("submitbody: ", submissionBody)

        try {
            const res = await fetch(`${API_BASE_URL}/${id}`, {
                method: "PUT", // Use PUT or PATCH for updating resources
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(submissionBody),
            });
            
            const resData = await res.json();

            if (res.ok) {
                // If update is successful, reset the form again with the *latest* data
                // This ensures "Cancel" will revert to this newly saved state.
                const updatedData = cleanFetchedData(resData.data.user); 
                reset(updatedData); 
                setMessage("✅ User data updated successfully!");
            } else {
                const errorMsg = resData.error || resData.message || `Failed to update user (Status ${res.status}).`;
                setMessage(`Error saving: ${errorMsg}`);
            }
        } catch (err) {
            console.error("Submission Error:", err);
            setMessage("Network error or invalid response during submission.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- 5. Cancel Action ---
    const handleCancel = () => {
        // Calling reset() without arguments reverts the form to the last state 
        // that was passed to reset() (i.e., the state loaded from the API).
        reset(); 
        setMessage("Changes cancelled. Form restored to last saved state.");
    };


    if (isLoading) {
        return <div className={styles.loading}>Loading user profile...</div>;
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            {/* Global Message Display */}
            {message && <div className={`${styles.global_message} ${message.startsWith('✅') ? styles.success : styles.error}`}>{message}</div>}

            <div className={styles.body}>
                <Card>
                    <CardHeader>Basic Information</CardHeader>
                    <CardContent>
                        <div className={styles.card_row_2}>
                            <InputField label="First Name" name="firstName" register={register} error={errors.firstName} />
                            <InputField label="Last Name" name="lastName" register={register} error={errors.lastName} />
                        </div>
                        <div className={styles.card_row_2}>
                            <InputField label="Date of Birth" name="birth" register={register} error={errors.birth} type="date" />
							{/*
                            <InputField label="Gender" name="gender" type="select" register={register} error={errors.gender}   
                                options={[
                                    { label: "Male", value: "male" },
                                    { label: "Female", value: "female" },
                                    { label: "Other", value: "other" },
                                ]} />
							*/}
							<InputField label="Address" name="street" register={register} error={errors.street} />
                        </div>
                        <div className={styles.card_row_2}>
							<InputField label="City" name="city" register={register} error={errors.city} />
							<InputField label="State" name="state" register={register} error={errors.state} />
							<InputField label="Country" name="country" register={register} error={errors.country} />
							<InputField label="Postal Code" name="pincode" register={register} error={errors.pincode} />
                        </div>
                        <div className={styles.card_row_1}>
                            <InputField label="Notes" name="notes" type="textarea" rows={4} register={register} error={errors.notes} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>Contact Details</CardHeader>
                    <CardContent>
                        <div className={styles.card_row_2}>
                            <InputField label="Phone" name="phone" register={register} error={errors.phone} />
                            <InputField label="Email" name="email" register={register} error={errors.email} />
                        </div>
                    </CardContent>
                </Card>
                
                {/* Emergency Contact */}
                <Card>
                    <CardHeader>Emergency Contact</CardHeader>
                    <CardContent>
                        <div className={styles.card_row_2}>
                            <InputField label="First Name" name="emergencyFName" register={register} error={errors.emergencyFName} />
                            <InputField label="Last Name" name="emergencyLName" register={register} error={errors.emergencyLName} />
                        </div>
                        <div className={styles.card_row_2}>
                            <InputField label="Relationship" name="relationship" register={register} error={errors.relationship} />
                            <InputField label="Phone" name="emergencyPhone" register={register} error={errors.emergencyPhone} />
                        </div>
                    </CardContent>
                </Card>

                {/* Statutory Decision Maker (SDM) */}
                <Card>
                    <CardHeader>Statutory Decision Maker (SDM)</CardHeader>
                    <CardContent>
                        <div className={styles.card_row_2}>
                            <InputField label="First Name" name="sdmFName" register={register} error={errors.sdmFName} />
                            <InputField label="Last Name" name="sdmLName" register={register} error={errors.sdmLName} />
                        </div>
                        <div className={styles.card_row_2}>
                            <InputField label="Phone" name="sdmPhone" register={register} error={errors.sdmPhone} />
                            <InputField label="Email" name="sdmEmail" register={register} error={errors.sdmEmail} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className={styles.buttons}>
                {/* The type="button" prevents accidental form submission on click */}
                <Button variant="secondary" onClick={handleCancel} type="button">Cancel</Button>
                <Button type="submit" variant="primary" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
            </div>
        </form>
    );
}
