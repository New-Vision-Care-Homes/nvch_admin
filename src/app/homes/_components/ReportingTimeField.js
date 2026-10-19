"use client";

import { useEffect } from "react";
import * as yup from "yup";
import { InputField } from "@components/UI/Form/Card";

// Home types with reporting time on by default (the server's REPORT_BUFFER_HOME_TYPES).
const REPORTING_ON_BY_DEFAULT = ["SOH", "TSA", "TEA"];
const DEFAULT_REPORTING_MINUTES = 15;
const MIN_REPORTING_MINUTES = 1;
const MAX_REPORTING_MINUTES = 15;

const MINUTES_MESSAGE = `Enter whole minutes from ${MIN_REPORTING_MINUTES} to ${MAX_REPORTING_MINUTES}.`;

const isReportingOnByDefault = (homeType) => REPORTING_ON_BY_DEFAULT.includes(homeType);

// Spread into each home form's yup schema. Minutes are only checked while
// reporting is on.
export const reportingTimeSchema = {
	reportingRequired: yup.boolean(),
	reportingMinutes: yup.number()
		.transform((_v, o) => (o === "" || o == null ? null : +o))
		.nullable()
		.when("reportingRequired", {
			is: true,
			then: (s) => s
				.typeError(MINUTES_MESSAGE)
				.required(MINUTES_MESSAGE)
				.integer(MINUTES_MESSAGE)
				.min(MIN_REPORTING_MINUTES, MINUTES_MESSAGE)
				.max(MAX_REPORTING_MINUTES, MINUTES_MESSAGE),
		}),
};

// Default form values before a home type is picked.
export const REPORTING_TIME_DEFAULTS = {
	reportingRequired: false,
	reportingMinutes: DEFAULT_REPORTING_MINUTES,
};

// A home's setting as shown in the portal. The server sends the effective
// values; the fallback only matters against a server that predates the setting.
export const effectiveReporting = (home) => ({
	reportingRequired: home?.reportingRequired ?? isReportingOnByDefault(home?.homeType),
	reportingMinutes: home?.reportingMinutes ?? DEFAULT_REPORTING_MINUTES,
});

// Request fields. Minutes only apply while reporting is on, so they're sent only then.
export const reportingPayload = (data) => ({
	reportingRequired: !!data.reportingRequired,
	...(data.reportingRequired && { reportingMinutes: data.reportingMinutes }),
});

/*
|--------------------------------------------------------------------------
| ReportingTimeField
|--------------------------------------------------------------------------
| "Require reporting time" checkbox + minutes, for the add and edit home
| forms. Picking a home type applies its default (on for SOH/TSA/TEA, off
| otherwise), and entering 0 minutes unticks the checkbox.
*/
export default function ReportingTimeField({ register, watch, setValue, errors }) {
	const reportingRequired = watch("reportingRequired");

	useEffect(() => {
		// `type` is "change" only for the admin's own input, so loading a home
		// into the form (reset) never overwrites its saved setting.
		const subscription = watch((values, { name, type }) => {
			if (type !== "change") return;
			if (name === "homeType" && values.homeType) {
				setValue("reportingRequired", isReportingOnByDefault(values.homeType), { shouldDirty: true });
			}
			if (name === "reportingMinutes" && values.reportingMinutes !== "" && Number(values.reportingMinutes) === 0) {
				setValue("reportingRequired", false, { shouldDirty: true });
				setValue("reportingMinutes", DEFAULT_REPORTING_MINUTES, { shouldDirty: true });
			}
		});
		return () => subscription.unsubscribe();
	}, [watch, setValue]);

	return (
		<>
			<label className="checkboxLabel">
				<input type="checkbox" {...register("reportingRequired")} />
				Require reporting time
			</label>
			<p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
				Caregivers must clock in before the shift starts. On by default for SOH, TSA and TEA homes.
			</p>

			{reportingRequired && (
				<>
					<InputField
						label="Minutes Before Shift Start"
						name="reportingMinutes"
						type="number"
						min="0"
						max={MAX_REPORTING_MINUTES}
						step="1"
						register={register}
						error={errors.reportingMinutes}
						required
						style={{ maxWidth: 180 }}
					/>
					<p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
						{MIN_REPORTING_MINUTES}–{MAX_REPORTING_MINUTES} minutes. Enter 0 to turn reporting time off.
					</p>
				</>
			)}
		</>
	);
}
