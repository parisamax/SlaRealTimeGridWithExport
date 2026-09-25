import { DisplayState } from "../models/DisplayState";
import { SlaKpi } from "../models/SlaKpi";
import { getDisplayState } from "./slaStatus";

/**
 * Μικρότερο βάρος σημαίνει μεγαλύτερη προτεραιότητα.
 *
 * Η σειρά είναι:
 * 1. Breached
 * 2. Warning
 * 3. On Track
 * 4. Paused
 * 5. Succeeded
 * 6. Canceled
 * 7. No SLA
 */
const stateWeight: Record<DisplayState, number> = {
    breached: 0,
    warning: 1,
    onTrack: 2,
    paused: 3,
    succeeded: 4,
    canceled: 5,
    noSla: 6
};

/**
 * Επιλέγει το πιο επείγον SLA KPI για το Agent Grid.
 *
 * Συγκρίνει:
 * - First Response KPI
 * - Resolve KPI
 *
 * Πρώτα χρησιμοποιεί την κατάσταση SLA.
 * Αν έχουν την ίδια κατάσταση, επιλέγει εκείνο
 * με το κοντινότερο Failure Time.
 */
export function selectMostUrgentKpi(
    firstResponseKpi: SlaKpi | undefined,
    resolveKpi: SlaKpi | undefined,
    now: Date
): SlaKpi | undefined {
    const availableKpis = [
        firstResponseKpi,
        resolveKpi
    ].filter(
        (kpi): kpi is SlaKpi => kpi !== undefined
    );

    if (availableKpis.length === 0) {
        return undefined;
    }

    const sortedKpis = [...availableKpis].sort(
        (leftKpi, rightKpi) => {
            const leftState = getDisplayState(
                leftKpi,
                now
            );

            const rightState = getDisplayState(
                rightKpi,
                now
            );

            const stateDifference =
                stateWeight[leftState] -
                stateWeight[rightState];

            if (stateDifference !== 0) {
                return stateDifference;
            }

            const leftFailureTime =
                leftKpi.failureTime?.getTime() ??
                Number.MAX_SAFE_INTEGER;

            const rightFailureTime =
                rightKpi.failureTime?.getTime() ??
                Number.MAX_SAFE_INTEGER;

            return leftFailureTime - rightFailureTime;
        }
    );

    return sortedKpis[0];
}