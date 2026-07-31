"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import PageLayout from "@components/layout/PageLayout";
import ErrorState from "@components/UI/ErrorState";
import Button from "@components/UI/Button";
import ActionMessage from "@components/UI/ActionMessage";
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Card";
import GeofenceMap from "@components/UI/GeofenceMap";
import AddressAutocomplete from "@components/UI/AddressAutocomplete";
import { useTrainings } from "@/hooks/useTrainings";
import { useTrainingTypeDropdown } from "@/utils/dropdownList/trainingType";
import PayRulesSection, { EMPLOYMENT_STATUS_OPTIONS } from "../../_components/PayRulesSection";
import PersonMultiSelect from "../../_components/PersonMultiSelect";
import { X, Save, Loader } from "lucide-react";
import styles from "./edit.module.css";

const STATUS_OPTIONS = [
    { value: "scheduled", label: "Scheduled" },
    { value: "completed", label: "Completed" },
];

// Best-effort split of a stored "street, city, province, postalCode, country" address
// string back into its parts, matching the join order used when the address was first
// selected via AddressAutocomplete (see handleAddressSelect below).
function splitAddress(address) {
    const parts = (address || "").split(",").map((p) => p.trim()).filter(Boolean);
    return {
        street:     parts[0] || "",
        city:       parts[1] || "",
        province:   parts[2] || "",
        postalCode: parts[3] || "",
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────

const schema = yup.object({
    title:        yup.string().trim().required("Title is required."),
    trainingType: yup.string().trim().required("Training type is required."),
    site: yup.object({
        name: yup.string().trim().required("Site name is required."),
    }),
    // Only geofenceStreet gates "an address exists" here — unlike the create page, an
    // existing training already has a valid address/geofence on load, and the split
    // city/province/postal fields are best-effort (parsed from a single stored string,
    // not guaranteed to align perfectly), so they shouldn't block saving unedited data.
    geofenceStreet:     yup.string().required("Please search and select a site address."),
    geofenceCity:       yup.string().optional(),
    geofenceProvince:   yup.string().optional(),
    geofencePostalCode: yup.string().optional(),
    startTime: yup.string().required("Start time is required."),
    endTime:   yup.string().required("End time is required.")
        .test("after-start", "End time must be after start time.", function(value) {
            const { startTime } = this.parent;
            if (!startTime || !value) return true;
            return new Date(value) > new Date(startTime);
        })
        .test("same-day", "Start and end time must be on the same day — a multi-day training should be created as separate sessions, one per day.", function(value) {
            const { startTime } = this.parent;
            if (!startTime || !value) return true;
            return startTime.slice(0, 10) === value.slice(0, 10);
        }),
    status:                yup.string().oneOf(["scheduled", "completed"]).required(),
    generatesCertificate:  yup.boolean().optional(),
    certificationType:     yup.string().when("generatesCertificate", {
        is:        true,
        then:      (s) => s.required("Certification type is required when generating a certificate."),
        otherwise: (s) => s.optional(),
    }),
    certificateValidityMonths: yup.number()
        .transform((_v, o) => (o === "" ? null : +o))
        .nullable()
        .optional(),
    payRules: yup.array().of(
        yup.object({
            employmentStatus: yup.string().required("Select an employment type."),
            payMode:          yup.string().required(),
            fixedHours:       yup.number()
                                  .transform((_v, o) => (o === "" ? null : +o))
                                  .nullable()
                                  .when("payMode", {
                                      is:        "fixed_hours",
                                      then:      (s) => s.typeError("Enter valid fixed hours.").moreThan(0, "Enter valid fixed hours.").required("Enter valid fixed hours."),
                                      otherwise: (s) => s.nullable().optional(),
                                  }),
        })
    ).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function EditTrainingPage() {
    const { id } = useParams();
    const router = useRouter();

    const { training, isLoading, fetchError, refetch, updateTraining, isActionPending, actionError } =
        useTrainings(id);
    const { trainingTypeOptions } = useTrainingTypeDropdown();

    const { register, handleSubmit, watch, setValue, control, reset, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            title:                     "",
            trainingType:              "",
            site:                      { name: "" },
            geofenceStreet:            "",
            geofenceCity:              "",
            geofenceProvince:          "",
            geofencePostalCode:        "",
            startTime:                 "",
            endTime:                   "",
            status:                    "scheduled",
            generatesCertificate:      false,
            certificationType:         "",
            certificateValidityMonths: "",
            payRules:                  [],
        },
    });

    const { fields, append, remove, update } = useFieldArray({ control, name: "payRules" });

    // ── Site / geofence ────────────────────────────────────────────────────────
    const [mapCenter, setMapCenter] = useState({ lat: 44.6476, lng: -63.5728 });
    const [geofenceAddress, setGeofenceAddress] = useState("");
    const mapRefsRef = useRef(null);

    // ── Trainers ────────────────────────────────────────────────────────────────
    const [trainers, setTrainers] = useState([]);

    // Seed form when training data loads
    useEffect(() => {
        if (training) {
            const toDateTimeLocal = (iso) => (iso ? iso.slice(0, 16) : "");
            const address = splitAddress(training.site?.address);
            reset({
                title:                     training.title,
                trainingType:              training.trainingType,
                site:                      { name: training.site?.name || "" },
                geofenceStreet:            address.street,
                geofenceCity:              address.city,
                geofenceProvince:          address.province,
                geofencePostalCode:        address.postalCode,
                startTime:                 toDateTimeLocal(training.startTime),
                endTime:                   toDateTimeLocal(training.endTime),
                status:                    training.status === "cancelled" ? "scheduled" : training.status,
                generatesCertificate:      training.generatesCertificate,
                certificationType:         training.certificationType || "",
                certificateValidityMonths: training.certificateValidityMonths || "",
                payRules: (training.payRules ?? []).map((rule) => ({
                    employmentStatus: rule.employmentStatus,
                    payMode:          rule.payMode,
                    fixedHours:       rule.fixedHours != null ? String(rule.fixedHours) : "",
                })),
            });
            setGeofenceAddress(training.site?.address || "");
            const center = training.site?.geofence?.center;
            if (center) setMapCenter({ lat: center.latitude, lng: center.longitude });
            setTrainers((training.trainers ?? []).map((t) => (
                typeof t === "object" ? { _id: t._id || t.id, firstName: t.firstName, lastName: t.lastName } : { _id: t, firstName: "", lastName: "" }
            )));
        }
    }, [training, reset]);

    const generatesCertificate = watch("generatesCertificate");

    const handleAddressSelect = useCallback((data) => {
        const { street, city, state, postalCode, country, latitude, longitude } = data;

        if (street)     setValue("geofenceStreet", street, { shouldValidate: false });
        if (city)       setValue("geofenceCity", city, { shouldValidate: false });
        if (state)      setValue("geofenceProvince", state, { shouldValidate: false });
        if (postalCode) setValue("geofencePostalCode", postalCode, { shouldValidate: false });

        const fullAddress = [street, city, state, postalCode, country].filter(Boolean).join(", ");
        setGeofenceAddress(fullAddress);

        if (latitude && longitude) {
            const newCenter = { lat: latitude, lng: longitude };
            setMapCenter(newCenter);
            if (mapRefsRef.current) {
                const { mapInstance, marker, circle } = mapRefsRef.current;
                mapInstance?.panTo(newCenter);
                mapInstance?.setZoom(15);
                marker?.setPosition(newCenter);
                circle?.setCenter(newCenter);
            }
        }
    }, [setValue]);

    // ── Pay rule helpers ───────────────────────────────────────────────────────
    const usedTypes      = fields.map((r) => r.employmentStatus).filter(Boolean);
    const availableTypes = EMPLOYMENT_STATUS_OPTIONS.filter((o) => !usedTypes.includes(o.value));
    const canAddRule     = availableTypes.length > 0;

    const addRule = () => {
        if (!canAddRule) return;
        append({ employmentStatus: availableTypes[0].value, payMode: "fixed_hours", fixedHours: "" });
    };
    const removeRule = (index) => remove(index);
    const updateRule = (index, field, value) => {
        const { id: _id, ...current } = fields[index];
        const updated = { ...current, [field]: value };
        if (field === "payMode" && value !== "fixed_hours") updated.fixedHours = "";
        update(index, updated);
    };

    const ruleErrors = {};
    (errors.payRules ?? []).forEach((ruleErr, i) => {
        if (ruleErr?.employmentStatus) ruleErrors[`rule_${i}_type`]  = ruleErr.employmentStatus.message;
        if (ruleErr?.fixedHours)       ruleErrors[`rule_${i}_hours`] = ruleErr.fixedHours.message;
    });

    // ── Submit ─────────────────────────────────────────────────────────────────
    const onSubmit = (data) => {
        const payload = {
            title:        data.title.trim(),
            trainingType: data.trainingType.trim(),
            site: {
                name: data.site.name.trim(),
                address: geofenceAddress || undefined,
                geofence: {
                    center: { latitude: mapCenter.lat, longitude: mapCenter.lng },
                    radius: 100,
                    shape:  "circle",
                },
            },
            startTime: data.startTime,
            endTime:   data.endTime,
            status:    data.status,
            trainers:  trainers.map((t) => t._id),
            generatesCertificate: data.generatesCertificate,
            payRules: data.payRules.map((rule) => {
                const entry = { employmentStatus: rule.employmentStatus, payMode: rule.payMode };
                if (rule.payMode === "fixed_hours") entry.fixedHours = Number(rule.fixedHours);
                return entry;
            }),
        };
        if (data.generatesCertificate) {
            payload.certificationType = data.certificationType.trim();
            if (data.certificateValidityMonths) {
                payload.certificateValidityMonths = Number(data.certificateValidityMonths);
            }
        }
        updateTraining({ id, body: payload }, {
            onSuccess: () => router.push(`/training/${id}`),
        });
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <PageLayout>

            <ErrorState isLoading={isLoading} errorMessage={fetchError} onRetry={refetch} />

            {!isLoading && !fetchError && (
                <>
                    <div className={styles.header}>
                        <div>
                            <h1>Edit Training</h1>
                            <p className={styles.pageSubtitle}>Update this session&apos;s details, schedule, and pay rules.</p>
                        </div>
                        <div className={styles.buttons}>
                            <Button variant="secondary" icon={<X size={16} />} onClick={() => router.push(`/training/${id}`)} disabled={isActionPending}>
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                icon={isActionPending ? <Loader size={16} className={styles.spin} /> : <Save size={16} />}
                                onClick={handleSubmit(onSubmit)}
                                disabled={isActionPending}
                            >
                                {isActionPending ? "Saving…" : "Save Changes"}
                            </Button>
                        </div>
                    </div>

                    {actionError && <ActionMessage variant="error" message={actionError} />}

                    <div className={styles.content}>
                        <div className={styles.rightPanel} style={{ width: "100%" }}>

                            {/* Basic Info / Schedule / Site */}
                            <Card>
                                <CardHeader>Basic Info</CardHeader>
                                <CardContent>
                                    <div className={styles.row2}>
                                        <InputField label="Title" name="title" register={register} error={errors.title} required />
                                        <InputField label="Training Type" name="trainingType" type="select" register={register} error={errors.trainingType} options={trainingTypeOptions} required />
                                    </div>
                                    <InputField label="Status" name="status" type="select" register={register} error={errors.status} options={STATUS_OPTIONS} />

                                    <p className={styles.sectionDivider}>Schedule</p>
                                    <div className={styles.row2}>
                                        <InputField label="Start Time" name="startTime" type="datetime-local" register={register} control={control} error={errors.startTime} required />
                                        <InputField label="End Time" name="endTime" type="datetime-local" register={register} control={control} error={errors.endTime} required />
                                    </div>

                                    <p className={styles.sectionDivider}>Site</p>
                                    <InputField label="Site Name" name="site.name" register={register} error={errors.site?.name} required />

                                    <div className={styles.siteRow}>
                                        <div className={styles.siteMapWrap}>
                                            <GeofenceMap
                                                center={mapCenter}
                                                radius={100}
                                                onMapReady={(refs) => { mapRefsRef.current = refs; }}
                                                height="100%"
                                            />
                                        </div>
                                        <div className={styles.siteAddressWrap}>
                                            <AddressAutocomplete
                                                label="Search Site Address"
                                                onAddressSelect={handleAddressSelect}
                                                placeholder="Start typing an address..."
                                                id="training-edit-address-autocomplete"
                                                register={register}
                                                error={errors.geofenceStreet?.message}
                                                mode="split"
                                                fieldNames={{
                                                    street:     "geofenceStreet",
                                                    city:       "geofenceCity",
                                                    state:      "geofenceProvince",
                                                    postalCode: "geofencePostalCode",
                                                    country:    null,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Trainers */}
                            <Card>
                                <CardHeader>Trainers (optional)</CardHeader>
                                <CardContent>
                                    <PersonMultiSelect
                                        role="admin"
                                        selected={trainers}
                                        onAdd={(p) => setTrainers((prev) => [...prev, p])}
                                        onRemove={(pid) => setTrainers((prev) => prev.filter((t) => t._id !== pid))}
                                        disabled={isActionPending}
                                    />
                                </CardContent>
                            </Card>

                            {/* Certificate */}
                            <Card>
                                <CardHeader>Certificate</CardHeader>
                                <CardContent>
                                    <div className={styles.toggleRow}>
                                        <div className={styles.toggleInfo}>
                                            <span className={styles.toggleLabel}>Generates Certificate</span>
                                            <span className={styles.toggleDesc}>
                                                Awards a pending certificate through the approval flow when an attendee is marked completed.
                                            </span>
                                        </div>
                                        <label className={styles.toggle}>
                                            <input
                                                type="checkbox"
                                                checked={generatesCertificate}
                                                onChange={(e) => setValue("generatesCertificate", e.target.checked, { shouldValidate: true })}
                                                disabled={isActionPending}
                                            />
                                            <span className={styles.toggleSlider} />
                                        </label>
                                    </div>

                                    {generatesCertificate && (
                                        <div className={styles.row2}>
                                            <InputField label="Certification Type" name="certificationType" register={register} error={errors.certificationType} required />
                                            <InputField label="Validity (months, optional)" name="certificateValidityMonths" type="number" min="0" step="1" register={register} error={errors.certificateValidityMonths} />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Pay Rules */}
                            <Card>
                                <CardHeader>Pay Rules</CardHeader>
                                <CardContent>
                                    <PayRulesSection
                                        rules={fields}
                                        errors={ruleErrors}
                                        usedTypes={usedTypes}
                                        canAddRule={canAddRule}
                                        addRule={addRule}
                                        removeRule={removeRule}
                                        updateRule={updateRule}
                                        isActionPending={isActionPending}
                                    />
                                </CardContent>
                            </Card>

                        </div>
                    </div>
                </>
            )}

        </PageLayout>
    );
}
