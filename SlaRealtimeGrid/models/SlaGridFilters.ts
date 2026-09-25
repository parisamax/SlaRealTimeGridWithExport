import { DisplayState } from "./DisplayState";

export type SlaTimeFilter =
    | "all"
    | "hasSla"
    | "noSla"
    | "overdue"
    | "due24h"
    | "due72h"
    | "later";

export type SlaStatusFilter =
    | "all"
    | DisplayState;

export interface SlaGridFilters {
    caseSearch: string;

    firstStageTime:
        SlaTimeFilter;

    firstStageStatus:
        SlaStatusFilter;

    resolutionTime:
        SlaTimeFilter;

    resolutionStatus:
        SlaStatusFilter;
}

export function createEmptySlaGridFilters():
SlaGridFilters {
    return {
        caseSearch: "",
        firstStageTime: "all",
        firstStageStatus: "all",
        resolutionTime: "all",
        resolutionStatus: "all"
    };
}

export function hasActiveSlaFilters(
    filters: SlaGridFilters
): boolean {
    return (
        filters.firstStageTime !== "all" ||
        filters.firstStageStatus !== "all" ||
        filters.resolutionTime !== "all" ||
        filters.resolutionStatus !== "all"
    );
}

export function hasActiveFilters(
    filters: SlaGridFilters
): boolean {
    return (
        filters.caseSearch.trim() !== "" ||
        hasActiveSlaFilters(filters)
    );
}

export function getSlaGridFiltersKey(
    filters: SlaGridFilters
): string {
    return [
        filters.caseSearch
            .trim()
            .toLowerCase(),

        filters.firstStageTime,
        filters.firstStageStatus,
        filters.resolutionTime,
        filters.resolutionStatus
    ].join("|");
}
