import * as React from "react";

import { SlaSummary } from "../models/SlaSummary";

export interface SummaryCardsProps {
    summary: SlaSummary;
}

export function SummaryCards(
    props: SummaryCardsProps
): React.ReactElement {
    const { summary } = props;

    return (
        <div
            className="sla-summary"
            aria-label="SLA summary"
        >
            <div className="sla-summary-card sla-summary-card--breached">
                <span
                    className="sla-summary-card__symbol"
                    aria-hidden="true"
                >
                    ●
                </span>

                <span className="sla-summary-card__label">
                    Breached
                </span>

                <strong className="sla-summary-card__value">
                    {summary.breached}
                </strong>
            </div>

            <div className="sla-summary-card sla-summary-card--warning">
                <span
                    className="sla-summary-card__symbol"
                    aria-hidden="true"
                >
                    ●
                </span>

                <span className="sla-summary-card__label">
                    Warning
                </span>

                <strong className="sla-summary-card__value">
                    {summary.warning}
                </strong>
            </div>

            <div className="sla-summary-card sla-summary-card--ok">
                <span
                    className="sla-summary-card__symbol"
                    aria-hidden="true"
                >
                    ●
                </span>

                <span className="sla-summary-card__label">
                    OK
                </span>

                <strong className="sla-summary-card__value">
                    {summary.ok}
                </strong>
            </div>

            <div className="sla-summary-card sla-summary-card--paused">
                <span
                    className="sla-summary-card__symbol"
                    aria-hidden="true"
                >
                    Ⅱ
                </span>

                <span className="sla-summary-card__label">
                    Paused
                </span>

                <strong className="sla-summary-card__value">
                    {summary.paused}
                </strong>
            </div>

            <div className="sla-summary-card sla-summary-card--no-sla">
                <span
                    className="sla-summary-card__symbol"
                    aria-hidden="true"
                >
                    —
                </span>

                <span className="sla-summary-card__label">
                    No SLA
                </span>

                <strong className="sla-summary-card__value">
                    {summary.noSla}
                </strong>
            </div>
        </div>
    );
}