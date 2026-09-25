import { CaseRow } from "../models/CaseRow";
import { DisplayState } from "../models/DisplayState";
import { SlaSummary } from "../models/SlaSummary";
import { getDisplayState } from "./slaStatus";

/**
 * Υπολογίζει τη συνολική SLA κατάσταση ενός Case
 * χρησιμοποιώντας τα First Response και Resolve KPIs.
 *
 * Η χειρότερη κατάσταση έχει προτεραιότητα:
 *
 * Breached > Warning > On Track > Paused >
 * Succeeded > Canceled > No SLA
 */
export function getCaseSlaState(
    caseRow: CaseRow,
    now: Date
): DisplayState {
    const availableKpis = [
        caseRow.firstResponseKpi,
        caseRow.resolveKpi
    ].filter(
        kpi => kpi !== undefined
    );

    if (availableKpis.length === 0) {
        return "noSla";
    }

    const states = availableKpis.map(
        kpi => getDisplayState(kpi, now)
    );

    if (states.includes("breached")) {
        return "breached";
    }

    if (states.includes("warning")) {
        return "warning";
    }

    if (states.includes("onTrack")) {
        return "onTrack";
    }

    if (states.includes("paused")) {
        return "paused";
    }

    if (states.includes("succeeded")) {
        return "succeeded";
    }

    if (states.includes("canceled")) {
        return "canceled";
    }

    return "noSla";
}

/**
 * Calculates summary counters for the admin layout.
 *
 * Κάθε Case μετριέται μία φορά, ακόμη και αν έχει
 * δύο SLA KPI Instances.
 */
export function calculateSlaSummary(
    cases: CaseRow[],
    now: Date
): SlaSummary {
    const summary: SlaSummary = {
        breached: 0,
        warning: 0,
        ok: 0,
        paused: 0,
        noSla: 0
    };

    for (const caseRow of cases) {
        const state = getCaseSlaState(
            caseRow,
            now
        );

        switch (state) {
            case "breached":
                summary.breached += 1;
                break;

            case "warning":
                summary.warning += 1;
                break;

            case "onTrack":
            case "succeeded":
                summary.ok += 1;
                break;

            case "paused":
                summary.paused += 1;
                break;

            case "canceled":
            case "noSla":
                summary.noSla += 1;
                break;
        }
    }

    return summary;
}
