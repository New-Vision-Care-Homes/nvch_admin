"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import PageLayout from "@components/layout/PageLayout";
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import styles from "./add_new_client.module.css";
import { useRouter } from "next/navigation";

import { IdRule, nameRule, emailRule, phoneRule, shortTextRule, longTextRule, dateRule, pinRule, clientIdRule, birthRule } from "@app/validation";


const schema = yup.object({
    clientId: IdRule,
    firstName: nameRule.required("First name is required"),
    lastName: nameRule.required("Last name is required"),
    email: emailRule,
    phone: phoneRule,
    birth: birthRule,
	region: yup.string()
        .oneOf(["Central", "Windsor", "HRM", "Yarmouth", "Shelburne", "South Shore"], "Please select a valid region")
        .required("Region is required"),
    notes: longTextRule,
    // Address
    street: shortTextRule.required(),
    city: shortTextRule.required(),
    state: shortTextRule.required(),
    pinCode: pinRule,
    country: shortTextRule.required(),
    latitude: null,
    longitude: null,
    // Emergency Contact
    emergencyFName: nameRule,
    emergencyLName: nameRule,
    emergencyPhone: phoneRule,
    relationship: shortTextRule,
    // SDM
    sdmFName: nameRule,
    sdmLName: nameRule,
    sdmPhone: phoneRule,
    sdmEmail: emailRule,
    // Care Plan
    chronicConditions: longTextRule,
    allergies: longTextRule,
    pastSurgeries: longTextRule,
    prescriptionMedications: longTextRule,
    otcMedications: longTextRule,
    dosageSchedule: longTextRule,
    dietaryRestrictions: longTextRule,
    mobilityAssistanceNeeds: longTextRule,
    cognitiveStatus: longTextRule,
    dailyCareTasks: longTextRule,
    emergencyProcedures: longTextRule,
    communicationPreferences: longTextRule,
    otherInstructions: longTextRule,
});

export default function Page() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    const { register, handleSubmit, watch, formState: { errors } } = useForm({
        resolver: yupResolver(schema)
    });

    const onSubmit = async (data) => {
        setLoading(true);
        const body = {
            email: data.email,
            password: "SecurePass123!",
            firstName: data.firstName,
            lastName: data.lastName,
            role: "client",
            phone: data.phone,
            clientId: data.clientId,
            dateOfBirth: data.birth,
			region: data.region,
          
            address: {
                street: data.street,
                city: data.city,
                state: data.state,
                pinCode: data.pinCode,
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
          
            carePlan: {
                medicalCondition: {
                    chronicConditions: data.chronicConditions ? data.chronicConditions : null,
                    allergies: data.allergies ? data.allergies : null,
                    pastSurgeries: data.pastSurgeries ? data.pastSurgeries : null,
                },
                currentMedications: {
                    prescriptionMedications: data.prescriptionMedications ? data.prescriptionMedications : null,
                    otcMedications: data.otcMedications ? data.otcMedications : null,
                    dosageSchedule: data.dosageSchedule ? data.dosageSchedule : null,
                },
                specialNotes: {
                    dietaryRestrictions: data.dietaryRestrictions ? data.dietaryRestrictions : null,
                    mobilityAssistanceNeeds: data.mobilityAssistanceNeeds ? data.mobilityAssistanceNeeds : null,
                    cognitiveStatus: data.cognitiveStatus ? data.cognitiveStatus : null,
                },
                careInstructions: {
                    dailyCareTasks: data.dailyCareTasks ? data.dailyCareTasks : null,
                    emergencyProcedures: data.emergencyProcedures ? data.emergencyProcedures : null,
                    communicationPreferences: data.communicationPreferences ? data.communicationPreferences : null,
                    otherInstructions: data.otherInstructions ? data.otherInstructions : null,
                },
            },
            
            notes: data.notes ? data.notes : null,
        };
          

        try {
            const token = localStorage.getItem("token");
            console.log("body: ", body);
            const res = await fetch("https://nvch-server.onrender.com/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(body)
        });
            const resData = await res.json();
            if (res.ok){
                router.push("/clients");
                setErrorMsg(null);
            }
            else {
                // Error: Status 400, 401, 500, etc.    
                // Check the response status for common errors
                const serverMessage = "An unknown error occurred on the server.";
                if (res.status === 400) {
                    let errorMessage = "";
                    
                    // 1. Check if the 'details' array exists and contains items
                    if (resData.details && Array.isArray(resData.details) && resData.details.length > 0) {
                        
                        // 2. Use .map() to extract the message and path for each error
                        const detailMessages = resData.details.map(detail => {
                            // Create a clear path string, like "(clientId)"
                            const path = detail.path ? `(${detail.path})` : '';
                            
                            // Format the message: "Client ID must contain only uppercase letters and numbers (clientId)"
                            return `${detail.msg} ${path}`;
                        });
                        
                        // 3. Use .join() to combine all messages into one string
                        errorMessage += detailMessages.join(' | '); // Using " | " for clear separation
                        
                    } else {
                        // Fallback if the 'details' array is missing or empty
                        errorMessage += resData.error || serverMessage;
                    }
                
                    console.error("400 Error:", errorMessage);
                    setErrorMsg(errorMessage); // Pass the concatenated message to your state
            
                } else if (res.status === 401 || res.status === 403) {
                    // Authentication/Authorization error (e.g., invalid token)
                    const errorMessage = resData.message || "Authentication failed. Please log in again.";
                    console.error("Auth Error:", errorMessage);
                    setErrorMsg(errorMessage);
    
                } else {
                    // General Server or Client Error
                    const errorMessage = resData.message || `Failed to register client (Status ${res.status}).`;
                    console.error(errorMessage);
                    setErrorMsg(errorMessage);
                }
            }
        } catch (err) {
            // This catches network errors (no connection) or JSON parsing errors (server sends non-JSON)
            console.error("Caught critical error:", err);
            setErrorMsg("Could not connect to the server or received an invalid response.");
        } finally {
            // This is the single most important line to fix the 'stuck in loading' issue.
            setLoading(false); 
        }
    };

    function handleCancel() {
        router.push("/clients");
    }

    return (
        <PageLayout>
            <div className={styles.header}>
                <h1>Client Profile: Add New Client</h1>
                <div className={styles.buttons}>
                    <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
                    <Button variant="primary" type="submit" onClick={handleSubmit(onSubmit)} disabled={loading}>
                        {loading ? "Saving..." : "Save"}
                    </Button>
                </div>
            </div>

            <div className={styles.content}>
                <div className={styles.rightPanel} style={{ width: '100%' }}> 
                    {/* Personal Info */}
                    <Card>
						<CardHeader>Personal Information</CardHeader>
                        <CardContent>
                            {errorMsg!==null ? <div className={styles.formError}>Error: {errorMsg}</div> : null}
                            <InputField label="Client ID" name="clientId" register={register} error={errors.clientId} />
                            <div className={styles.row2}>
                                <InputField label="First Name" name="firstName" register={register} error={errors.firstName} />
                                <InputField label="Last Name" name="lastName" register={register} error={errors.lastName} />
                            </div>
                            <div className={styles.row2}>
                                <InputField label="Date of Birth" name="birth" register={register} error={errors.birth} />
                                <InputField label="Region" name="region" type="select" register={register} error={errors.region}
                                    options={[{ label: "Central", value: "Central" }, { label: "Windsor", value: "Windsor" }, { label: "HRM", value: "HRM" }, { label: "Yarmouth", value: "Yarmouth" }, { label: "Shelburne", value: "Shelburne" }, { label: "South Shore", value: "South Shore" }]}
                                />
                            </div>

                            {/* Address */}
                            <div className={styles.row2}>
                                <InputField label="Street" name="street" register={register} error={errors.street} />
                                <InputField label="City" name="city" register={register} error={errors.city} />
                            </div>
                            <div className={styles.row2}>
                                <InputField label="Province" name="state" register={register} error={errors.state} />
                                <InputField label="Country" name="country" register={register} error={errors.country} />
                                <InputField label="Postal Code" name="pinCode" register={register} error={errors.pinCode} />
                            </div>
                            {/*
                            <div className={styles.row2}>
                                <InputField label="Latitude" name="latitude" register={register} error={errors.latitude} />
                                <InputField label="Longitude" name="longitude" register={register} error={errors.longitude} />
                            </div>
                            */}

                            <div className={styles.row2}>
                                <InputField label="Phone" name="phone" register={register} error={errors.phone} />
                                <InputField label="Email" name="email" register={register} error={errors.email} />
                            </div>
                            <InputField label="Notes" name="notes" type="textarea" rows={4} register={register} error={errors.notes} />
                        </CardContent>
                    </Card>

                    {/* Emergency Contact */}
                    <Card>
                        <CardHeader>Emergency Contact</CardHeader>
                        <CardContent className={styles.cardContent}>
                            <div className={styles.row2}>
                                <InputField label="First Name" name="emergencyFName" register={register} error={errors.emergencyFName} />
                                <InputField label="Last Name" name="emergencyLName" register={register} error={errors.emergencyLName} />
                            </div>
                            <div className={styles.row2}>
                                <InputField label="Relationship" name="relationship" register={register} error={errors.relationship} />
                                <InputField label="Phone" name="emergencyPhone" register={register} error={errors.emergencyPhone} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* SDM */}
                    <Card>
                        <CardHeader>Statutory Decision Maker (SDM)</CardHeader>
                        <CardContent>
                            <div className={styles.row2}>
                                <InputField label="First Name" name="sdmFName" register={register} error={errors.sdmFName} />
                                <InputField label="Last Name" name="sdmLName" register={register} error={errors.sdmLName} />
                            </div>
                            <div className={styles.row2}>
                                <InputField label="Phone" name="sdmPhone" register={register} error={errors.sdmPhone} />
                                <InputField label="Email" name="sdmEmail" register={register} error={errors.sdmEmail} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Care Plan */}
                    <Card>
                        <CardHeader>Medical Conditions</CardHeader>
                        <CardContent>
                            <InputField label="Chronic Conditions" name="chronicConditions" register={register} error={errors.chronicConditions} />
                            <InputField label="Allergies" name="allergies" register={register} error={errors.allergies} />
                            <InputField label="Past Surgeries" name="pastSurgeries" register={register} error={errors.pastSurgeries} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>Current Medications</CardHeader>
                        <CardContent>
                            <InputField label="Prescription Medications" name="prescriptionMedications" register={register} error={errors.prescriptionMedications} />
                            <InputField label="OTC Medications" name="otcMedications" register={register} error={errors.otcMedications} />
                            <InputField label="Dosage & Schedule" name="dosageSchedule" register={register} error={errors.dosageSchedule} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>Special Notes</CardHeader>
                        <CardContent>
                            <InputField label="Dietary Restrictions" name="dietaryRestrictions" register={register} error={errors.dietaryRestrictions} />
                            <InputField label="Mobility & Assistance Needs" name="mobilityAssistanceNeeds" register={register} error={errors.mobilityAssistanceNeeds} />
                            <InputField label="Cognitive Status" name="cognitiveStatus" register={register} error={errors.cognitiveStatus} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>Care Instructions</CardHeader>
                        <CardContent>
                            <InputField label="Daily Care Tasks" name="dailyCareTasks" register={register} error={errors.dailyCareTasks} />
                            <InputField label="Emergency Procedures" name="emergencyProcedures" register={register} error={errors.emergencyProcedures} />
                            <InputField label="Communication Preferences" name="communicationPreferences" register={register} error={errors.communicationPreferences} />
                            <InputField label="Other Instructions" name="otherInstructions" register={register} error={errors.otherInstructions} type="textarea" rows={3} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </PageLayout>
    );
}

