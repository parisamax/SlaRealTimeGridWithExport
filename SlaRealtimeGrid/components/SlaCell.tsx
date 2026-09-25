import * as React from "react";

import { DisplayState } from "../models/DisplayState";
import { SlaKpi } from "../models/SlaKpi";
import { formatCountdown } from "../utilities/countdown";
import { getDisplayState } from "../utilities/slaStatus";

export interface SlaCellProps {
    kpi: SlaKpi | undefined;
    now: Date;
    enableNegativeTimer: boolean;
    showStatusLabel?: boolean;
}

interface StatusPresentation {
    label: string;
    symbol: string;
    className: string;
}

const statusPresentation:
Record<DisplayState, StatusPresentation> = {
    onTrack: {
        label: "On Track",
        symbol: "●",
        className: "sla-state--on-track"
    },

    warning: {
        label: "Warning",
        symbol: "●",
        className: "sla-state--warning"
    },

    breached: {
        label: "Breached",
        symbol: "●",
        className: "sla-state--breached"
    },

    paused: {
        label: "Paused",
        symbol: "Ⅱ",
        className: "sla-state--paused"
    },

    succeeded: {
        label: "Succeeded",
        symbol: "✓",
        className: "sla-state--succeeded"
    },

    canceled: {
        label: "Canceled",
        symbol: "—",
        className: "sla-state--canceled"
    },

    noSla: {
        label: "No SLA",
        symbol: "—",
        className: "sla-state--no-sla"
    }
};

export function SlaCell(
    props: SlaCellProps
): React.ReactElement {
    const {
        kpi,
        now,
        enableNegativeTimer,
        showStatusLabel = false
    } = props;

    /*
     * Υπολογίζουμε την κατάσταση του συγκεκριμένου
     * SLA KPI Instance.
     */
    const state =
        getDisplayState(
            kpi,
            now
        );

    const presentation =
        statusPresentation[state];

    /*
     * Υπολογίζουμε το countdown.
     *
     * Για terminal states, όπως Paused ή Canceled,
     * η formatCountdown επιστρέφει περιγραφικό κείμενο.
     */
    const countdown =
        formatCountdown(
            kpi,
            now,
            enableNegativeTimer
        );

    /*
     * Failure Time για το tooltip.
     */
    const failureTimeText =
        kpi?.failureTime
            ? kpi.failureTime.toLocaleString()
            : "Not set";

    /*
     * Tooltip με το όνομα, το status και τη Failure Time
     * του συγκεκριμένου SLA KPI.
     */
    const tooltip =
        kpi
            ? [
                kpi.name || "SLA KPI",
                `Status: ${presentation.label}`,
                `Failure time: ${failureTimeText}`
            ].join("\n")
            : "No applicable SLA";

    /*
     * Κείμενο για screen readers.
     */
    const accessibleText =
        `${presentation.label}: ${countdown}`;

    /*
     * Εμφανίζουμε το status σε δεύτερη γραμμή μόνο
     * όταν διαφέρει από το κύριο κείμενο.
     *
     * Παραδείγματα:
     *
     * ● 8d 06h 17m
     *   On Track
     *
     * ● -17:07:49
     *   Breached
     *
     * Για Paused, Canceled και No SLA δεν εμφανίζουμε
     * δύο φορές το ίδιο κείμενο.
     */
    const shouldShowStatusLabel =
        showStatusLabel &&
        countdown !== presentation.label;

    return (
        <div
            className={
                `sla-cell ${presentation.className}`
            }
            title={tooltip}
            aria-label={accessibleText}
        >
            {/*
             * Η πρώτη γραμμή περιέχει το σύμβολο
             * και το countdown.
             */}
            <span className="sla-cell__main">
                <span
                    className="sla-cell__symbol"
                    aria-hidden="true"
                >
                    {presentation.symbol}
                </span>

                <span className="sla-cell__countdown">
                    {countdown}
                </span>
            </span>

            {/*
             * Η δεύτερη γραμμή εμφανίζει το status
             * του συγκεκριμένου SLA.
             */}
            {shouldShowStatusLabel && (
                <span className="sla-cell__label">
                    {presentation.label}
                </span>
            )}
        </div>
    );
}