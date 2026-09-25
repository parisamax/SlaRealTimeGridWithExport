import { DisplayState } from "../models/DisplayState";
import { SlaKpi } from "../models/SlaKpi";

/**
 * Επίσημες OOTB τιμές του πεδίου status
 * του SLA KPI Instance.
 */
export const SLA_STATUS = {
    IN_PROGRESS: 0,
    NONCOMPLIANT: 1,
    NEARING_NONCOMPLIANCE: 2,
    PAUSED: 3,
    SUCCEEDED: 4,
    CANCELED: 5
} as const;

/**
 * Μετατρέπει το OOTB SLA KPI status σε κατάσταση
 * που μπορεί να χρησιμοποιήσει το UI.
 *
 * Για ενεργά KPIs ελέγχει επίσης τα warning και failure times,
 * ώστε το UI να αλλάζει χρώμα χωρίς να χρειάζεται refresh
 * του Dataverse κάθε δευτερόλεπτο.
 */
export function getDisplayState(
    kpi: SlaKpi | undefined,
    now: Date
): DisplayState {
    if (!kpi) {
        return "noSla";
    }

    /*
     * Οι terminal και paused καταστάσεις του Dataverse
     * έχουν πάντα προτεραιότητα.
     */
    switch (kpi.status) {
        case SLA_STATUS.NONCOMPLIANT:
            return "breached";

        case SLA_STATUS.PAUSED:
            return "paused";

        case SLA_STATUS.SUCCEEDED:
            return "succeeded";

        case SLA_STATUS.CANCELED:
            return "canceled";

        default:
            break;
    }

    /*
     * Αν έχει περάσει το failure time,
     * εμφανίζουμε άμεσα Breached.
     */
    if (
        kpi.failureTime &&
        now.getTime() >= kpi.failureTime.getTime()
    ) {
        return "breached";
    }

    /*
     * Αν έχει περάσει το warning time αλλά όχι το failure time,
     * εμφανίζουμε Warning.
     */
    if (
        kpi.warningTime &&
        now.getTime() >= kpi.warningTime.getTime()
    ) {
        return "warning";
    }

    /*
     * Αν το Dataverse έχει ήδη ενημερώσει την κατάσταση
     * σε Nearing Noncompliance, εμφανίζουμε Warning.
     */
    if (
        kpi.status ===
        SLA_STATUS.NEARING_NONCOMPLIANCE
    ) {
        return "warning";
    }

    /*
     * Οποιαδήποτε άλλη ενεργή κατάσταση
     * θεωρείται On Track.
     */
    return "onTrack";
}