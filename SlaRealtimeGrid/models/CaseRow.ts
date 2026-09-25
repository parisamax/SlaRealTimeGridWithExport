import { SlaKpi } from "./SlaKpi";

export interface CaseRow {
    id: string;

    caseNumber: string;
    title: string;

    priority: number | null;
    priorityLabel: string;

    ownerId: string | null;
    ownerName: string;

    firstResponseKpi?: SlaKpi;
    resolveKpi?: SlaKpi;
}