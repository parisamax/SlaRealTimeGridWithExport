import * as React from "react";

import { CaseRow } from "../models/CaseRow";
import { DisplayState } from "../models/DisplayState";
import {
    createEmptySlaGridFilters,
    hasActiveFilters,
    SlaGridFilters,
    SlaStatusFilter,
    SlaTimeFilter
} from "../models/SlaGridFilters";
import { getDisplayState } from "../utilities/slaStatus";

import { SlaCell } from "./SlaCell";

export interface AgentGridProps {
    cases: CaseRow[];
    now: Date;
    enableNegativeTimer: boolean;
    title?: string;
    subtitle?: string;
    firstStageLabel?: string;

    filters?: SlaGridFilters;
    filterInProgress?: boolean;
    exportInProgress?: boolean;
    totalResultCount?: number;

    onFiltersChanged?: (
        filters: SlaGridFilters
    ) => void;

    onExport?: () => void;

    onOpenCase: (caseId: string) => void;
}

export function AgentGrid(
    props: AgentGridProps
): React.ReactElement {
    const {
        cases,
        now,
        enableNegativeTimer,
        title = "SLA REAL-TIME GRID",
        subtitle = "Real-time view of Case SLA performance",
        firstStageLabel = "First Response",
        filters,
        filterInProgress = false,
        exportInProgress = false,
        totalResultCount,
        onFiltersChanged,
        onExport,
        onOpenCase
    } = props;

    const activeFilters =
        filters ??
        createEmptySlaGridFilters();

    /*
     * Το Case search παραμένει uncontrolled ώστε η
     * πληκτρολόγηση να μην προκαλεί React render
     * ολόκληρου του SLA table σε κάθε χαρακτήρα.
     */
    const caseSearchInputRef =
        React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        const input =
            caseSearchInputRef.current;

        if (
            input &&
            document.activeElement !== input &&
            input.value !== activeFilters.caseSearch
        ) {
            input.value =
                activeFilters.caseSearch;
        }
    }, [activeFilters.caseSearch]);

    const filtersAreActive =
        hasActiveFilters(
            activeFilters
        );

    const serverResultCount =
        typeof totalResultCount === "number" &&
        totalResultCount >= 0
            ? totalResultCount
            : cases.length;

    function updateFilters(
        changes: Partial<SlaGridFilters>
    ): void {
        onFiltersChanged?.({
            ...activeFilters,
            ...changes
        });
    }

    function clearFilters(): void {
        if (caseSearchInputRef.current) {
            caseSearchInputRef.current.value = "";
        }

        onFiltersChanged?.(
            createEmptySlaGridFilters()
        );
    }

    /*
     * Εμφανίζουμε το πλήρες empty state μόνο
     * όταν δεν υπάρχουν Cases και δεν υπάρχει
     * ενεργό φίλτρο.
     *
     * Αν υπάρχουν ενεργά φίλτρα, κρατάμε το grid
     * ορατό ώστε ο χρήστης να μπορεί να τα καθαρίσει.
     */
    if (
        cases.length === 0 &&
        !filtersAreActive &&
        !filterInProgress
    ) {
        return (
            <div className="sla-grid-root">
                <div className="sla-empty-state">
                    <div className="sla-empty-state__icon">
                        ✓
                    </div>

                    <div className="sla-empty-state__title">
                        No active Cases
                    </div>

                    <div className="sla-empty-state__description">
                        There are currently no active Cases
                        in this view.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="sla-grid-root">

            {/* HEADER */}

            <div className="sla-agent-header">
                <div>
                    <div className="sla-agent-header__title">
                        {title}
                    </div>

                    <div className="sla-agent-header__subtitle">
                        {subtitle}
                    </div>
                </div>

                <div className="sla-agent-header__actions">
                    <button
                        type="button"
                        className="sla-export-button"
                        onClick={() => {
                            onExport?.();
                        }}
                        disabled={
                            exportInProgress ||
                            filterInProgress
                        }
                    >
                        {exportInProgress
                            ? "Exporting..."
                            : "Export SLA"}
                    </button>

                    <button
                        type="button"
                        className="sla-clear-filters"
                        onClick={clearFilters}
                        disabled={
                            !filtersAreActive ||
                            filterInProgress
                        }
                    >
                        Clear filters
                    </button>

                    <div className="sla-agent-header__live">
                        <span
                            className="sla-live-dot"
                            aria-hidden="true"
                        />

                        <span>
                            LIVE
                        </span>
                    </div>
                </div>
            </div>

            {/* RESULT COUNT */}

            <div className="sla-filter-summary">
                {filterInProgress
                    ? "Applying filters..."
                    : (
                        <>
                            Showing {cases.length} of{" "}
                            {serverResultCount} Cases
                        </>
                    )}
            </div>

            {/* TABLE */}

            <div className="sla-table-wrapper">
                <table className="sla-table">
                    <thead>
                        <tr>
                            <th
                                className="sla-column-case"
                                scope="col"
                            >
                                Case
                            </th>

                            <th
                                className={
                                    "sla-column-first-response"
                                }
                                scope="col"
                            >
                                {
                                    firstStageLabel
                                }
                            </th>

                            <th
                                className={
                                    "sla-column-first-response-status"
                                }
                                scope="col"
                            >
                                {
                                    `${firstStageLabel} Status`
                                }
                            </th>

                            <th
                                className={
                                    "sla-column-resolution"
                                }
                                scope="col"
                            >
                                Resolution
                            </th>

                            <th
                                className={
                                    "sla-column-resolution-status"
                                }
                                scope="col"
                            >
                                Resolution Status
                            </th>
                        </tr>

                        {/* SERVER FILTER ROW */}

                        <tr className="sla-filter-row">
                            <th>
                                <input
                                    ref={caseSearchInputRef}
                                    type="search"
                                    className="sla-filter-input"
                                    defaultValue={
                                        activeFilters.caseSearch
                                    }
                                    onChange={event => {
                                        updateFilters({
                                            caseSearch:
                                                event.currentTarget.value
                                        });
                                    }}
                                    placeholder="Search Case..."
                                    aria-label={
                                        "Filter by Case number or title"
                                    }
                                    aria-busy={
                                        filterInProgress
                                    }
                                />
                            </th>

                            <th>
                                <TimeFilterSelect
                                    value={
                                        activeFilters
                                            .firstStageTime
                                    }
                                    label={
                                        `Filter ${firstStageLabel}`
                                    }
                                    disabled={
                                        filterInProgress
                                    }
                                    onChange={value => {
                                        updateFilters({
                                            firstStageTime:
                                                value
                                        });
                                    }}
                                />
                            </th>

                            <th>
                                <StatusFilterSelect
                                    value={
                                        activeFilters
                                            .firstStageStatus
                                    }
                                    label={
                                        `Filter ${firstStageLabel} status`
                                    }
                                    disabled={
                                        filterInProgress
                                    }
                                    onChange={value => {
                                        updateFilters({
                                            firstStageStatus:
                                                value
                                        });
                                    }}
                                />
                            </th>

                            <th>
                                <TimeFilterSelect
                                    value={
                                        activeFilters
                                            .resolutionTime
                                    }
                                    label={
                                        "Filter Resolution"
                                    }
                                    disabled={
                                        filterInProgress
                                    }
                                    onChange={value => {
                                        updateFilters({
                                            resolutionTime:
                                                value
                                        });
                                    }}
                                />
                            </th>

                            <th>
                                <StatusFilterSelect
                                    value={
                                        activeFilters
                                            .resolutionStatus
                                    }
                                    label={
                                        "Filter Resolution status"
                                    }
                                    disabled={
                                        filterInProgress
                                    }
                                    onChange={value => {
                                        updateFilters({
                                            resolutionStatus:
                                                value
                                        });
                                    }}
                                />
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {cases.length === 0 ? (
                            <tr>
                                <td
                                    className={
                                        "sla-no-filter-results"
                                    }
                                    colSpan={5}
                                >
                                    {filterInProgress
                                        ? "Filtering Cases..."
                                        : "No Cases match the selected filters."}
                                </td>
                            </tr>
                        ) : (
                            cases.map(
                                caseRow => {
                                    const firstStageState =
                                        getDisplayState(
                                            caseRow
                                                .firstResponseKpi,
                                            now
                                        );

                                    const resolutionState =
                                        getDisplayState(
                                            caseRow.resolveKpi,
                                            now
                                        );

                                    return (
                                        <tr
                                            key={caseRow.id}
                                            className={
                                                "sla-table-row"
                                            }
                                        >
                                            <td>
                                                <button
                                                    type="button"
                                                    className={
                                                        "sla-case-button"
                                                    }
                                                    onClick={() => {
                                                        onOpenCase(
                                                            caseRow.id
                                                        );
                                                    }}
                                                    title={
                                                        caseRow.title
                                                    }
                                                >
                                                    <span
                                                        className={
                                                            "sla-case-number"
                                                        }
                                                    >
                                                        {
                                                            caseRow
                                                                .caseNumber ||
                                                            "Case"
                                                        }
                                                    </span>

                                                    {caseRow.title && (
                                                        <span
                                                            className={
                                                                "sla-case-title"
                                                            }
                                                        >
                                                            {
                                                                caseRow
                                                                    .title
                                                            }
                                                        </span>
                                                    )}
                                                </button>
                                            </td>

                                            <td>
                                                <SlaCell
                                                    kpi={
                                                        caseRow
                                                            .firstResponseKpi
                                                    }
                                                    now={now}
                                                    enableNegativeTimer={
                                                        enableNegativeTimer
                                                    }
                                                />
                                            </td>

                                            <td>
                                                <StatusBadge
                                                    state={
                                                        firstStageState
                                                    }
                                                />
                                            </td>

                                            <td>
                                                <SlaCell
                                                    kpi={
                                                        caseRow
                                                            .resolveKpi
                                                    }
                                                    now={now}
                                                    enableNegativeTimer={
                                                        enableNegativeTimer
                                                    }
                                                />
                                            </td>

                                            <td>
                                                <StatusBadge
                                                    state={
                                                        resolutionState
                                                    }
                                                />
                                            </td>
                                        </tr>
                                    );
                                }
                            )
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* =========================================================
   FILTER COMPONENTS
   ========================================================= */

interface TimeFilterSelectProps {
    value: SlaTimeFilter;
    label: string;
    disabled: boolean;
    onChange: (value: SlaTimeFilter) => void;
}

function TimeFilterSelect(
    props: TimeFilterSelectProps
): React.ReactElement {
    const {
        value,
        label,
        disabled,
        onChange
    } = props;

    return (
        <select
            className="sla-filter-select"
            value={value}
            aria-label={label}
            disabled={disabled}
            onChange={event => {
                onChange(
                    event.target.value as
                        SlaTimeFilter
                );
            }}
        >
            <option value="all">
                All
            </option>

            <option value="hasSla">
                Has SLA
            </option>

            <option value="noSla">
                No SLA
            </option>

            <option value="overdue">
                Overdue
            </option>

            <option value="due24h">
                Due within 24 hours
            </option>

            <option value="due72h">
                Due within 3 days
            </option>

            <option value="later">
                Due later
            </option>
        </select>
    );
}

interface StatusFilterSelectProps {
    value: SlaStatusFilter;
    label: string;
    disabled: boolean;

    onChange: (
        value: SlaStatusFilter
    ) => void;
}

function StatusFilterSelect(
    props: StatusFilterSelectProps
): React.ReactElement {
    const {
        value,
        label,
        disabled,
        onChange
    } = props;

    return (
        <select
            className="sla-filter-select"
            value={value}
            aria-label={label}
            disabled={disabled}
            onChange={event => {
                onChange(
                    event.target.value as
                        SlaStatusFilter
                );
            }}
        >
            <option value="all">
                All statuses
            </option>

            <option value="onTrack">
                On Track
            </option>

            <option value="warning">
                Warning
            </option>

            <option value="breached">
                Breached
            </option>

            <option value="paused">
                Paused
            </option>

            <option value="succeeded">
                Succeeded
            </option>

            <option value="canceled">
                Canceled
            </option>

            <option value="noSla">
                No SLA
            </option>
        </select>
    );
}

/* =========================================================
   STATUS BADGE
   ========================================================= */

interface StatusBadgeProps {
    state: DisplayState;
}

function StatusBadge(
    props: StatusBadgeProps
): React.ReactElement {
    const {
        state
    } = props;

    let label = "No SLA";
    let className =
        "sla-status-badge";

    switch (state) {
        case "onTrack":
            label = "On Track";

            className +=
                " sla-status-badge--on-track";

            break;

        case "warning":
            label = "Warning";

            className +=
                " sla-status-badge--warning";

            break;

        case "breached":
            label = "Breached";

            className +=
                " sla-status-badge--breached";

            break;

        case "paused":
            label = "Paused";

            className +=
                " sla-status-badge--paused";

            break;

        case "succeeded":
            label = "Succeeded";

            className +=
                " sla-status-badge--succeeded";

            break;

        case "canceled":
            label = "Canceled";

            className +=
                " sla-status-badge--canceled";

            break;

        case "noSla":
        default:
            label = "No SLA";

            className +=
                " sla-status-badge--no-sla";

            break;
    }

    return (
        <span className={className}>
            <span
                className="sla-status-badge__dot"
                aria-hidden="true"
            />

            {label}
        </span>
    );
}
