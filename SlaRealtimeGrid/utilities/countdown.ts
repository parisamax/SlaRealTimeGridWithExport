import { SlaKpi } from "../models/SlaKpi";
import { SLA_STATUS } from "./slaStatus";

/**
 * Προσθέτει αρχικό μηδενικό σε μονοψήφιους αριθμούς.
 *
 * Παράδειγμα:
 * 5 -> "05"
 * 12 -> "12"
 */
function pad(value: number): string {
    return value.toString().padStart(2, "0");
}

/**
 * Επιστρέφει το countdown ενός SLA KPI.
 *
 * Παραδείγματα:
 * 02:15:30
 * 1d 04h 20m
 * -00:12:45
 * Paused
 * Succeeded
 * Canceled
 * No SLA
 */
export function formatCountdown(
    kpi: SlaKpi | undefined,
    now: Date,
    enableNegativeTimer: boolean
): string {
    if (!kpi) {
        return "No SLA";
    }

    /*
     * Οι ειδικές OOTB καταστάσεις εμφανίζονται
     * ως σταθερό κείμενο.
     */
    switch (kpi.status) {
        case SLA_STATUS.PAUSED:
            return "Paused";

        case SLA_STATUS.SUCCEEDED:
            return "Succeeded";

        case SLA_STATUS.CANCELED:
            return "Canceled";

        default:
            break;
    }

    /*
     * Αν το KPI δεν έχει Failure Time,
     * δεν μπορεί να υπολογιστεί countdown.
     */
    if (!kpi.failureTime) {
        return "Not set";
    }

    const differenceMilliseconds =
        kpi.failureTime.getTime() - now.getTime();

    const isNegative = differenceMilliseconds < 0;

    /*
     * Αν έχει λήξει το SLA αλλά το negative timer
     * είναι απενεργοποιημένο, εμφανίζουμε μόνο Breached.
     */
    if (isNegative && !enableNegativeTimer) {
        return "Breached";
    }

    const absoluteMilliseconds = Math.abs(
        differenceMilliseconds
    );

    const totalSeconds = Math.floor(
        absoluteMilliseconds / 1000
    );

    const days = Math.floor(
        totalSeconds / 86400
    );

    const hours = Math.floor(
        (totalSeconds % 86400) / 3600
    );

    const minutes = Math.floor(
        (totalSeconds % 3600) / 60
    );

    const seconds = totalSeconds % 60;

    const prefix = isNegative ? "-" : "";

    /*
     * Για διάρκεια μεγαλύτερη από 24 ώρες,
     * εμφανίζουμε ημέρες, ώρες και λεπτά.
     */
    if (days > 0) {
        return (
            `${prefix}${days}d ` +
            `${pad(hours)}h ` +
            `${pad(minutes)}m`
        );
    }

    /*
     * Για διάρκεια μικρότερη από 24 ώρες,
     * εμφανίζουμε HH:MM:SS.
     */
    return (
        `${prefix}${pad(hours)}:` +
        `${pad(minutes)}:` +
        `${pad(seconds)}`
    );
}