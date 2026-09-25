import * as React from "react";

import { CaseRow } from "../models/CaseRow";
import {
    calculateSlaSummary
} from "../utilities/slaSummary";

import { SlaCell } from "./SlaCell";
import { SummaryCards } from "./SummaryCards";

export interface AdminGridProps {
    cases: CaseRow[];
    now: Date;
    enableNegativeTimer: boolean;
    onOpenCase: (caseId: string) => void;
}

export function AdminGrid(
    props: AdminGridProps
): React.ReactElement {
    const {
        cases,
        now,
        enableNegativeTimer,
        onOpenCase
    } = props;

    const summary = calculateSlaSummary(
        cases,
        now
    );

    return (
        <div className="sla-admin-grid">
            <div className="sla-grid-header">
                <div>
                    <h2 className="sla-grid-title">
                        SLA REAL-TIME GRID
                    </h2>

                    <div className="sla-grid-subtitle">
                        Real-time SLA overview
                    </div>
                </div>
            </div>

            <SummaryCards summary={summary} />

            {cases.length === 0 ? (
                <div className="sla-grid-message">
                    No Cases found.
                </div>
            ) : (
                <div className="sla-table-container">
                    <table className="sla-table sla-admin-table">
                        <thead>
                            <tr>
                                <th scope="col">
                                    Case
                                </th>

                                <th scope="col">
                                    Priority
                                </th>

                                <th scope="col">
                                    First Response SLA
                                </th>

                                <th scope="col">
                                    Resolve SLA
                                </th>

                                <th scope="col">
                                    Owner
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {cases.map(caseRow => (
                                <tr key={caseRow.id}>
                                    <td>
                                        <button
                                            type="button"
                                            className="sla-case-link"
                                            title={caseRow.title}
                                            onClick={() => {
                                                onOpenCase(
                                                    caseRow.id
                                                );
                                            }}
                                        >
                                            {
                                                caseRow.caseNumber ||
                                                caseRow.title ||
                                                "Open Case"
                                            }
                                        </button>

                                        {caseRow.title && (
                                            <div className="sla-case-title">
                                                {caseRow.title}
                                            </div>
                                        )}
                                    </td>

                                    <td>
                                        <span
                                            className={
                                                getPriorityClassName(
                                                    caseRow.priority
                                                )
                                            }
                                        >
                                            {
                                                caseRow.priorityLabel ||
                                                "Not set"
                                            }
                                        </span>
                                    </td>

                                    <td>
                                        <SlaCell
                                            kpi={
                                                caseRow.firstResponseKpi
                                            }
                                            now={now}
                                            enableNegativeTimer={
                                                enableNegativeTimer
                                            }
                                        />
                                    </td>

                                    <td>
                                        <SlaCell
                                            kpi={
                                                caseRow.resolveKpi
                                            }
                                            now={now}
                                            enableNegativeTimer={
                                                enableNegativeTimer
                                            }
                                        />
                                    </td>

                                    <td>
                                        {
                                            caseRow.ownerName ||
                                            "Unassigned"
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function getPriorityClassName(
    priority: number | null
): string {
    switch (priority) {
        case 1:
            return "sla-priority sla-priority--high";

        case 2:
            return "sla-priority sla-priority--normal";

        case 3:
            return "sla-priority sla-priority--low";

        default:
            return "sla-priority";
    }
}
