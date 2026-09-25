import { IInputs } from "../generated/ManifestTypes";
import { CaseRow } from "../models/CaseRow";
import { SlaKpi } from "../models/SlaKpi";
import {
    hasActiveSlaFilters,
    SlaGridFilters,
    SlaStatusFilter,
    SlaTimeFilter
} from "../models/SlaGridFilters";
import { normalizeGuid } from "../utilities/datasetReader";
import { getDisplayState } from "../utilities/slaStatus";

type WebApiEntity = Record<string, unknown>;

interface CaseSlaKpis {
    firstResponseKpi?: SlaKpi;
    resolveKpi?: SlaKpi;
}

export interface SlaExportCase {
    id: string;
    caseNumber: string;
    title: string;
    firstResponseKpi?: SlaKpi;
    resolveKpi?: SlaKpi;
}

interface SlaItemMetadata {
    name: string;
}

export interface SlaItemConfiguration {
    firstStageItemName: string;
    resolutionItemName: string;
}

function chunkArray<T>(
    values: T[],
    batchSize: number
): T[][] {
    const batches: T[][] = [];

    for (
        let index = 0;
        index < values.length;
        index += batchSize
    ) {
        batches.push(
            values.slice(
                index,
                index + batchSize
            )
        );
    }

    return batches;
}

function getStringValue(
    value: unknown
): string {
    return typeof value === "string"
        ? value
        : "";
}

function getNumberValue(
    value: unknown
): number {
    if (typeof value === "number") {
        return Number.isFinite(value)
            ? value
            : 0;
    }

    if (
        typeof value === "string" &&
        value.trim() !== ""
    ) {
        const parsed = Number(value);

        return Number.isFinite(parsed)
            ? parsed
            : 0;
    }

    return 0;
}

function getBooleanValue(
    value: unknown
): boolean {
    if (typeof value === "boolean") {
        return value;
    }

    if (typeof value === "number") {
        return value === 1;
    }

    if (typeof value === "string") {
        return (
            value === "1" ||
            value.toLowerCase() === "true"
        );
    }

    return false;
}

function getDateValue(
    value: unknown
): Date | null {
    if (
        typeof value !== "string" ||
        value === ""
    ) {
        return null;
    }

    const date = new Date(value);

    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;
}

function normalizeName(
    value: string
): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function buildGuidOrFilter(
    propertyName: string,
    ids: string[]
): string {
    return ids
        .map(
            id =>
                `${propertyName} eq ${id}`
        )
        .join(" or ");
}

function getNextPageOptions(
    nextLink: string
): string {
    const queryStart =
        nextLink.indexOf("?");

    return queryStart >= 0
        ? nextLink.substring(queryStart)
        : nextLink;
}

async function retrieveAllRecords(
    context: ComponentFramework.Context<IInputs>,
    entityLogicalName: string,
    initialOptions: string
): Promise<WebApiEntity[]> {
    const entities: WebApiEntity[] = [];

    let options: string | undefined =
        initialOptions;

    while (options) {
        const response =
            await context.webAPI
                .retrieveMultipleRecords(
                    entityLogicalName,
                    options,
                    5000
                );

        for (
            const responseEntity
            of response.entities
        ) {
            entities.push(
                responseEntity as unknown as
                    WebApiEntity
            );
        }

        const nextLink =
            response.nextLink;

        options =
            typeof nextLink === "string" &&
            nextLink.length > 0
                ? getNextPageOptions(nextLink)
                : undefined;
    }

    return entities;
}

/*
 * Ανακτά όλα τα Case IDs του public Dataverse view
 * που χρησιμοποιείται από το Dataset.
 */
async function retrieveCaseRecordsForView(
    context: ComponentFramework.Context<IInputs>,
    viewId: string
): Promise<WebApiEntity[]> {
    const normalizedViewId =
        normalizeGuid(viewId);

    if (!normalizedViewId) {
        return [];
    }

    const savedQueryResponse =
        await context.webAPI.retrieveRecord(
            "savedquery",
            normalizedViewId,
            "?$select=fetchxml"
        );

    const savedQuery =
        savedQueryResponse as unknown as
            WebApiEntity;

    const fetchXml =
        getStringValue(
            savedQuery.fetchxml
        );

    if (!fetchXml) {
        return [];
    }

    return retrieveAllRecords(
        context,
        "incident",
        `?fetchXml=${
            encodeURIComponent(fetchXml)
        }`
    );
}

async function retrieveCaseIdsForView(
    context: ComponentFramework.Context<IInputs>,
    viewId: string
): Promise<string[]> {
    const records =
        await retrieveCaseRecordsForView(
            context,
            viewId
        );

    return [
        ...new Set(
            records
                .map(record =>
                    normalizeGuid(
                        getStringValue(
                            record.incidentid
                        )
                    )
                )
                .filter(
                    caseId =>
                        caseId.length > 0
                )
        )
    ];
}

function mapSlaKpiEntity(
    entity: WebApiEntity
): SlaKpi | null {
    const rawId =
        getStringValue(
            entity.slakpiinstanceid
        );

    if (!rawId) {
        return null;
    }

    return {
        id: normalizeGuid(rawId),

        name:
            getStringValue(
                entity.name
            ),

        status:
            getNumberValue(
                entity.status
            ),

        warningTime:
            getDateValue(
                entity.warningtime
            ),

        failureTime:
            getDateValue(
                entity.failuretime
            ),

        applicableFrom:
            getDateValue(
                entity.applicablefromvalue
            ),

        pausedOn:
            getDateValue(
                entity.pausedon
            ),

        succeededOn:
            getDateValue(
                entity.succeededon
            ),

        terminalStateReached:
            getBooleanValue(
                entity.terminalstatereached
            ),

        modifiedOn:
            getDateValue(
                entity.modifiedon
            )
    };
}

/*
 * Αν υπάρχουν περισσότερα από ένα instances
 * του ίδιου SLA Item, επιλέγεται το ενεργό.
 *
 * Αν έχουν ίδια terminal κατάσταση,
 * επιλέγεται το πιο πρόσφατο.
 */
function shouldReplaceKpi(
    current: SlaKpi | undefined,
    candidate: SlaKpi
): boolean {
    if (!current) {
        return true;
    }

    if (
        current.terminalStateReached !==
        candidate.terminalStateReached
    ) {
        return (
            candidate.terminalStateReached ===
            false
        );
    }

    const currentApplicable =
        current.applicableFrom?.getTime() ??
        0;

    const candidateApplicable =
        candidate.applicableFrom?.getTime() ??
        0;

    if (
        candidateApplicable !==
        currentApplicable
    ) {
        return (
            candidateApplicable >
            currentApplicable
        );
    }

    const currentModified =
        current.modifiedOn?.getTime() ??
        0;

    const candidateModified =
        candidate.modifiedOn?.getTime() ??
        0;

    return (
        candidateModified >
        currentModified
    );
}

/*
 * Ανακτά όλα τα SLA KPI Instances
 * για τα Cases της τρέχουσας σελίδας.
 */
async function retrieveKpiInstancesForCases(
    context: ComponentFramework.Context<IInputs>,
    caseIds: string[]
): Promise<WebApiEntity[]> {
    const normalizedIds = [
        ...new Set(
            caseIds
                .map(id => normalizeGuid(id))
                .filter(
                    id => id.length > 0
                )
        )
    ];

    if (normalizedIds.length === 0) {
        return [];
    }

    const batches =
        chunkArray(
            normalizedIds,
            40
        );

    const entities: WebApiEntity[] = [];

    const select = [
        "slakpiinstanceid",
        "name",
        "status",
        "warningtime",
        "failuretime",
        "computedwarningtime",
        "computedfailuretime",
        "applicablefromvalue",
        "pausedon",
        "succeededon",
        "terminalstatereached",
        "modifiedon",
        "_msdyn_slaitemid_value",
        "_regarding_value"
    ].join(",");

    for (const batch of batches) {
        const filter =
            buildGuidOrFilter(
                "_regarding_value",
                batch
            );

        const options =
            `?$select=${select}` +
            `&$filter=${filter}`;

        const response =
            await context.webAPI
                .retrieveMultipleRecords(
                    "slakpiinstance",
                    options,
                    5000
                );

        for (
            const responseEntity
            of response.entities
        ) {
            entities.push(
                responseEntity as unknown as
                    WebApiEntity
            );
        }
    }

    return entities;
}

/*
 * Ανακτά τα ονόματα των SLA Items.
 *
 * Αποτέλεσμα:
 *
 * SLA Item ID -> SLA Item name
 */
async function retrieveSlaItemMetadata(
    context: ComponentFramework.Context<IInputs>,
    slaItemIds: string[]
): Promise<Map<string, SlaItemMetadata>> {
    const result =
        new Map<
            string,
            SlaItemMetadata
        >();

    const normalizedIds = [
        ...new Set(
            slaItemIds
                .map(id => normalizeGuid(id))
                .filter(
                    id => id.length > 0
                )
        )
    ];

    if (normalizedIds.length === 0) {
        return result;
    }

    const batches =
        chunkArray(
            normalizedIds,
            40
        );

    for (const batch of batches) {
        const filter =
            buildGuidOrFilter(
                "slaitemid",
                batch
            );

        const options =
            "?$select=slaitemid,name" +
            `&$filter=${filter}`;

        const response =
            await context.webAPI
                .retrieveMultipleRecords(
                    "slaitem",
                    options,
                    5000
                );

        for (
            const responseEntity
            of response.entities
        ) {
            const entity =
                responseEntity as unknown as
                    WebApiEntity;

            const slaItemId =
                getStringValue(
                    entity.slaitemid
                );

            const slaItemName =
                getStringValue(
                    entity.name
                );

            if (
                !slaItemId ||
                !slaItemName
            ) {
                continue;
            }

            result.set(
                normalizeGuid(slaItemId),
                {
                    name:
                        normalizeName(
                            slaItemName
                        )
                }
            );
        }
    }

    return result;
}

/*
 * Retrieves SLA KPI Instances and keeps only the SLA Items
 * selected through the control configuration.
 */
async function retrieveSlaKpisForCaseIds(
    context: ComponentFramework.Context<IInputs>,
    caseIds: string[],
    slaItems: SlaItemConfiguration
): Promise<Map<string, CaseSlaKpis>> {
    const result =
        new Map<string, CaseSlaKpis>();

    if (caseIds.length === 0) {
        return result;
    }

    const firstStageItemName =
        normalizeName(
            slaItems.firstStageItemName
        );

    const resolutionItemName =
        normalizeName(
            slaItems.resolutionItemName
        );

    /*
     * Step 1:
     * Case -> SLA KPI Instances
     */
    const kpiEntities =
        await retrieveKpiInstancesForCases(
            context,
            caseIds
        );

    if (kpiEntities.length === 0) {
        return result;
    }

    /*
     * Step 2:
     * Συλλογή SLA Item IDs.
     */
    const slaItemIds =
        kpiEntities
            .map(entity =>
                getStringValue(
                    entity._msdyn_slaitemid_value
                )
            )
            .filter(
                id => id.length > 0
            );

    /*
     * Step 3:
     * SLA Item ID -> SLA Item name.
     */
    const slaItemMetadata =
        await retrieveSlaItemMetadata(
            context,
            slaItemIds
        );

    /*
     * Step 4:
     * Δημιουργία του τελικού Case -> SLA mapping.
     */
    for (const entity of kpiEntities) {
        const rawCaseId =
            getStringValue(
                entity._regarding_value
            );

        const rawSlaItemId =
            getStringValue(
                entity._msdyn_slaitemid_value
            );

        if (
            !rawCaseId ||
            !rawSlaItemId
        ) {
            continue;
        }

        const itemMetadata =
            slaItemMetadata.get(
                normalizeGuid(
                    rawSlaItemId
                )
            );

        if (!itemMetadata) {
            continue;
        }

        const isFirstStage =
            itemMetadata.name ===
            firstStageItemName;

        const isResolution =
            itemMetadata.name ===
            resolutionItemName;

        /* Ignore SLA Items that are not part of this configuration. */
        if (
            !isFirstStage &&
            !isResolution
        ) {
            continue;
        }

        const slaKpi =
            mapSlaKpiEntity(
                entity
            );

        if (!slaKpi) {
            continue;
        }

        const caseId =
            normalizeGuid(
                rawCaseId
            );

        let caseKpis =
            result.get(caseId);

        if (!caseKpis) {
            caseKpis = {};

            result.set(
                caseId,
                caseKpis
            );
        }

        if (isFirstStage) {
            if (
                shouldReplaceKpi(
                    caseKpis.firstResponseKpi,
                    slaKpi
                )
            ) {
                caseKpis.firstResponseKpi =
                    slaKpi;
            }
        }

        if (isResolution) {
            if (
                shouldReplaceKpi(
                    caseKpis.resolveKpi,
                    slaKpi
                )
            ) {
                caseKpis.resolveKpi =
                    slaKpi;
            }
        }
    }

    return result;
}

/*
 * Χρησιμοποιείται για τα Cases της τρέχουσας
 * σελίδας του Dataset.
 */
export async function retrieveSlaKpisForCases(
    context: ComponentFramework.Context<IInputs>,
    cases: CaseRow[],
    slaItems: SlaItemConfiguration
): Promise<Map<string, CaseSlaKpis>> {
    const caseIds =
        cases.map(
            caseRow => caseRow.id
        );

    return retrieveSlaKpisForCaseIds(
        context,
        caseIds,
        slaItems
    );
}

function matchesSlaStatusFilter(
    kpi: SlaKpi | undefined,
    filter: SlaStatusFilter,
    now: Date
): boolean {
    if (filter === "all") {
        return true;
    }

    return (
        getDisplayState(kpi, now) ===
        filter
    );
}

function matchesSlaTimeFilter(
    kpi: SlaKpi | undefined,
    filter: SlaTimeFilter,
    now: Date
): boolean {
    if (filter === "all") {
        return true;
    }

    if (filter === "hasSla") {
        return kpi !== undefined;
    }

    if (filter === "noSla") {
        return kpi === undefined;
    }

    if (!kpi?.failureTime) {
        return false;
    }

    const state =
        getDisplayState(kpi, now);

    if (
        state === "paused" ||
        state === "succeeded" ||
        state === "canceled" ||
        state === "noSla"
    ) {
        return false;
    }

    const remainingMilliseconds =
        kpi.failureTime.getTime() -
        now.getTime();

    const oneDayMilliseconds =
        24 * 60 * 60 * 1000;

    const threeDaysMilliseconds =
        3 * oneDayMilliseconds;

    switch (filter) {
        case "overdue":
            return (
                state === "breached" ||
                remainingMilliseconds < 0
            );

        case "due24h":
            return (
                remainingMilliseconds >= 0 &&
                remainingMilliseconds <=
                    oneDayMilliseconds
            );

        case "due72h":
            return (
                remainingMilliseconds >
                    oneDayMilliseconds &&
                remainingMilliseconds <=
                    threeDaysMilliseconds
            );

        case "later":
            return (
                remainingMilliseconds >
                threeDaysMilliseconds
            );

        default:
            return true;
    }
}

/*
 * Επιστρέφει τα Case IDs ολόκληρου του view
 * που ικανοποιούν τα επιλεγμένα SLA φίλτρα.
 */
export async function retrieveMatchingCaseIdsForSlaFilters(
    context: ComponentFramework.Context<IInputs>,
    viewId: string,
    slaItems: SlaItemConfiguration,
    filters: SlaGridFilters
): Promise<string[]> {
    const caseIds =
        await retrieveCaseIdsForView(
            context,
            viewId
        );

    if (
        caseIds.length === 0 ||
        !hasActiveSlaFilters(filters)
    ) {
        return caseIds;
    }

    const slaByCase =
        await retrieveSlaKpisForCaseIds(
        context,
        caseIds,
        slaItems
        );

    const now = new Date();

    return caseIds.filter(caseId => {
        const caseSla =
            slaByCase.get(caseId);

        return (
            matchesSlaTimeFilter(
                caseSla?.firstResponseKpi,
                filters.firstStageTime,
                now
            ) &&
            matchesSlaStatusFilter(
                caseSla?.firstResponseKpi,
                filters.firstStageStatus,
                now
            ) &&
            matchesSlaTimeFilter(
                caseSla?.resolveKpi,
                filters.resolutionTime,
                now
            ) &&
            matchesSlaStatusFilter(
                caseSla?.resolveKpi,
                filters.resolutionStatus,
                now
            )
        );
    });
}

/*
 * Ανακτά όλα τα Cases του view, εφαρμόζει τα φίλτρα
 * του PCF σε ολόκληρο το result set και επιστρέφει
 * τα δεδομένα που χρειάζονται για το CSV export.
 */
export async function retrieveCasesForSlaExport(
    context: ComponentFramework.Context<IInputs>,
    viewId: string,
    slaItems: SlaItemConfiguration,
    filters: SlaGridFilters
): Promise<SlaExportCase[]> {
    const records =
        await retrieveCaseRecordsForView(
            context,
            viewId
        );

    const casesById =
        new Map<string, SlaExportCase>();

    for (const record of records) {
        const id = normalizeGuid(
            getStringValue(record.incidentid)
        );

        if (!id) {
            continue;
        }

        casesById.set(id, {
            id,
            caseNumber:
                getStringValue(record.ticketnumber),
            title:
                getStringValue(record.title)
        });
    }

    const caseSearch =
        filters.caseSearch
            .trim()
            .toLocaleLowerCase();

    const matchingCases = [
        ...casesById.values()
    ].filter(caseRow => {
        if (!caseSearch) {
            return true;
        }

        return (
            caseRow.caseNumber
                .toLocaleLowerCase()
                .includes(caseSearch) ||
            caseRow.title
                .toLocaleLowerCase()
                .includes(caseSearch)
        );
    });

    if (matchingCases.length === 0) {
        return [];
    }

    const slaByCase =
        await retrieveSlaKpisForCaseIds(
            context,
            matchingCases.map(
                caseRow => caseRow.id
            ),
            slaItems
        );

    const now = new Date();

    return matchingCases
        .map(caseRow => {
            const sla =
                slaByCase.get(caseRow.id);

            return {
                ...caseRow,
                firstResponseKpi:
                    sla?.firstResponseKpi,
                resolveKpi:
                    sla?.resolveKpi
            };
        })
        .filter(caseRow =>
            matchesSlaTimeFilter(
                caseRow.firstResponseKpi,
                filters.firstStageTime,
                now
            ) &&
            matchesSlaStatusFilter(
                caseRow.firstResponseKpi,
                filters.firstStageStatus,
                now
            ) &&
            matchesSlaTimeFilter(
                caseRow.resolveKpi,
                filters.resolutionTime,
                now
            ) &&
            matchesSlaStatusFilter(
                caseRow.resolveKpi,
                filters.resolutionStatus,
                now
            )
        );
}
