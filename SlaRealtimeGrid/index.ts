import * as React from "react";

import { AdminGrid } from "./components/AdminGrid";
import { AgentGrid } from "./components/AgentGrid";
import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { CaseRow } from "./models/CaseRow";
import {
    createEmptySlaGridFilters,
    hasActiveFilters,
    hasActiveSlaFilters,
    SlaGridFilters
} from "./models/SlaGridFilters";
import {
    retrieveCasesForSlaExport,
    retrieveMatchingCaseIdsForSlaFilters,
    retrieveSlaKpisForCases,
    SlaItemConfiguration
} from "./services/SlaService";
import {
    downloadSlaExcel
} from "./utilities/slaExport";
import {
    getFormattedValue,
    getLookupId,
    getLookupName,
    getNumber,
    getString,
    normalizeGuid
} from "./utilities/datasetReader";

import DataSetInterfaces =
    ComponentFramework.PropertyHelper.DataSetApi;

interface GridConfiguration {
    slaItems: SlaItemConfiguration;
    title: string;
    subtitle: string;
    firstStageLabel: string;
}

export class SlaGridControl
implements ComponentFramework.ReactControl<
    IInputs,
    IOutputs
> {
    private cases: CaseRow[] = [];

    private timerHandle: number | null = null;
    private serverRefreshHandle: number | null = null;
    private filterDebounceHandle: number | null = null;

    private destroyed = false;
    private loadInProgress = false;
    private filterInProgress = false;
    private exportInProgress = false;
    private pagingInitialized = false;

    private lastRecordKey: string | null = null;
    private requestVersion = 0;
    private filterRequestVersion = 0;

    private filters: SlaGridFilters =
        createEmptySlaGridFilters();

    /*
     * Cache για να μη γίνεται νέα μαζική SLA ανάκτηση
     * όταν αλλάζει μόνο το Case search text.
     */
    private cachedSlaFilterKey = "";
    private cachedMatchingCaseIds:
        string[] | undefined;

    public init(
        context: ComponentFramework.Context<IInputs>,
        _notifyOutputChanged: () => void,
        _state: ComponentFramework.Dictionary
    ): void {
        this.destroyed = false;

        context.mode.trackContainerResize(true);

        this.timerHandle =
            window.setInterval(() => {
                if (!this.destroyed) {
                    context.factory.requestRender();
                }
            }, 1000);

        this.serverRefreshHandle =
            window.setInterval(() => {
                if (this.destroyed) {
                    return;
                }

                if (hasActiveSlaFilters(this.filters)) {
                    void this.applyDataSetFilters(
                        context,
                        this.filters,
                        true
                    );

                    return;
                }

                this.lastRecordKey = null;

                context.parameters
                    .Cases
                    .refresh();
            }, 60000);
    }

    public updateView(
        context: ComponentFramework.Context<IInputs>
    ): React.ReactElement {
        const dataSet =
            context.parameters.Cases;

        if (!this.pagingInitialized) {
            this.pagingInitialized = true;
            dataSet.paging.setPageSize(50);
        }

        if (dataSet.loading) {
            if (this.cases.length > 0) {
                return this.renderGrid(context);
            }

            return React.createElement(
                "div",
                {
                    className:
                        "sla-grid-message sla-grid-loading"
                },
                this.filterInProgress
                    ? "Applying filters..."
                    : "Loading Cases..."
            );
        }

        if (dataSet.error) {
            const errorMessage =
                typeof dataSet.errorMessage === "string"
                    ? dataSet.errorMessage
                    : "Unable to retrieve Cases.";

            return React.createElement(
                "div",
                {
                    className:
                        "sla-grid-message " +
                        "sla-grid-message--error"
                },
                errorMessage
            );
        }

        const currentRecordKey =
            dataSet.sortedRecordIds.join("|");

        if (
            currentRecordKey !==
            this.lastRecordKey
        ) {
            this.lastRecordKey =
                currentRecordKey;

            const extractedCases =
                this.extractCases(dataSet);

            this.cases = extractedCases;

            void this.loadCasesAndSlaKpis(
                context,
                extractedCases
            );
        }

        return this.renderGrid(context);
    }

    private getGridConfiguration(
        context: ComponentFramework.Context<IInputs>
    ): GridConfiguration {
        const getText = (
            value: string | null,
            fallback: string
        ): string => {
            const trimmed = value?.trim();

            return trimmed
                ? trimmed
                : fallback;
        };

        return {
            slaItems: {
                firstStageItemName: getText(
                    context.parameters
                        .FirstStageSlaItemName.raw,
                    "First Response"
                ),
                resolutionItemName: getText(
                    context.parameters
                        .ResolutionSlaItemName.raw,
                    "Resolution"
                )
            },
            title: getText(
                context.parameters.GridTitle.raw,
                "SLA REAL-TIME GRID"
            ),
            subtitle: getText(
                context.parameters.GridSubtitle.raw,
                "Real-time view of Case SLA performance"
            ),
            firstStageLabel: getText(
                context.parameters.FirstStageLabel.raw,
                "First Response"
            )
        };
    }

    private renderGrid(
        context: ComponentFramework.Context<IInputs>
    ): React.ReactElement {
        const dataSet =
            context.parameters.Cases;

        const enableNegativeTimer =
            context.parameters
                .EnableNegativeTimer.raw ??
            true;

        const rawLayoutMode =
            context.parameters.LayoutMode.raw;

        const layoutMode =
            typeof rawLayoutMode === "string"
                ? rawLayoutMode
                    .trim()
                    .toLowerCase()
                : "agent";

        const commonProps = {
            cases: this.cases,
            now: new Date(),
            enableNegativeTimer,

            onOpenCase: (caseId: string): void => {
                this.openCase(
                    context,
                    caseId
                );
            }
        };

        if (layoutMode === "admin") {
            return React.createElement(
                AdminGrid,
                commonProps
            );
        }

        const configuration =
            this.getGridConfiguration(context);

        const totalResultCount =
            dataSet.paging.totalResultCount >= 0
                ? dataSet.paging.totalResultCount
                : this.cases.length;

        return React.createElement(
            AgentGrid,
            {
                ...commonProps,
                title: configuration.title,
                subtitle: configuration.subtitle,
                firstStageLabel:
                    configuration.firstStageLabel,
                filters: this.filters,
                filterInProgress:
                    this.filterInProgress,
                exportInProgress:
                    this.exportInProgress,
                totalResultCount,

                onFiltersChanged:
                    (
                        filters: SlaGridFilters
                    ): void => {
                        this.handleFiltersChanged(
                            context,
                            filters
                        );
                    },

                onExport: (): void => {
                    void this.exportSlaData(
                        context
                    );
                }
            }
        );
    }

    private async exportSlaData(
        context: ComponentFramework.Context<IInputs>
    ): Promise<void> {
        if (
            this.exportInProgress ||
            this.filterInProgress
        ) {
            return;
        }

        this.exportInProgress = true;
        context.factory.requestRender();

        try {
            const dataSet =
                context.parameters.Cases;

            const configuration =
                this.getGridConfiguration(context);

            const cases =
                await retrieveCasesForSlaExport(
                    context,
                    dataSet.getViewId(),
                    configuration.slaItems,
                    this.filters
                );

            const enableNegativeTimer =
                context.parameters
                    .EnableNegativeTimer.raw ??
                true;

            await downloadSlaExcel(
                cases,
                configuration.firstStageLabel,
                enableNegativeTimer,
                new Date()
            );
        } catch (error: unknown) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Unable to export SLA data.";

            await context.navigation
    .openAlertDialog({
        text:
            `SLA export failed.\n\n${message}`
    });
        } finally {
            this.exportInProgress = false;

            if (!this.destroyed) {
                context.factory.requestRender();
            }
        }
    }

    private handleFiltersChanged(
        context: ComponentFramework.Context<IInputs>,
        filters: SlaGridFilters
    ): void {
        this.filters = {
            ...filters
        };

        this.filterInProgress = true;
        context.factory.requestRender();

        if (this.filterDebounceHandle !== null) {
            window.clearTimeout(
                this.filterDebounceHandle
            );
        }

        this.filterDebounceHandle =
            window.setTimeout(() => {
                this.filterDebounceHandle = null;

                void this.applyDataSetFilters(
                    context,
                    this.filters,
                    false
                );
            }, 350);
    }

    private getSlaFilterCacheKey(
        viewId: string,
        slaItems: SlaItemConfiguration,
        filters: SlaGridFilters
    ): string {
        return [
            normalizeGuid(viewId),
            slaItems.firstStageItemName
                .trim()
                .toLowerCase(),
            slaItems.resolutionItemName
                .trim()
                .toLowerCase(),
            filters.firstStageTime,
            filters.firstStageStatus,
            filters.resolutionTime,
            filters.resolutionStatus
        ].join("|");
    }

    private async applyDataSetFilters(
        context: ComponentFramework.Context<IInputs>,
        filters: SlaGridFilters,
        forceSlaRefresh: boolean
    ): Promise<void> {
        const currentRequestVersion =
            ++this.filterRequestVersion;

        this.filterInProgress = true;
        context.factory.requestRender();

        try {
            const dataSet =
                context.parameters.Cases;

            let matchingCaseIds:
                string[] | undefined;

            if (hasActiveSlaFilters(filters)) {
                const viewId =
                    dataSet.getViewId();

                const configuration =
                    this.getGridConfiguration(context);

                const cacheKey =
                    this.getSlaFilterCacheKey(
                        viewId,
                        configuration.slaItems,
                        filters
                    );

                if (
                    !forceSlaRefresh &&
                    cacheKey ===
                        this.cachedSlaFilterKey &&
                    this.cachedMatchingCaseIds !==
                        undefined
                ) {
                    matchingCaseIds =
                        this.cachedMatchingCaseIds;
                } else {
                    matchingCaseIds =
                        await retrieveMatchingCaseIdsForSlaFilters(
                            context,
                            viewId,
                            configuration.slaItems,
                            filters
                        );

                    if (
                        this.destroyed ||
                        currentRequestVersion !==
                            this.filterRequestVersion
                    ) {
                        return;
                    }

                    this.cachedSlaFilterKey =
                        cacheKey;

                    this.cachedMatchingCaseIds =
                        matchingCaseIds;
                }
            } else {
                this.cachedSlaFilterKey = "";
                this.cachedMatchingCaseIds =
                    undefined;
            }

            if (
                this.destroyed ||
                currentRequestVersion !==
                    this.filterRequestVersion
            ) {
                return;
            }

            const filterExpression =
                this.buildDataSetFilter(
                    filters,
                    matchingCaseIds
                );

            if (filterExpression) {
                dataSet.filtering.setFilter(
                    filterExpression
                );
            } else {
                dataSet.filtering.clearFilter();
            }

            /*
             * Η refresh() επαναφέρει το Dataset
             * στην πρώτη σελίδα.
             */
            this.lastRecordKey = null;
            dataSet.refresh();
        } finally {
            if (
                currentRequestVersion ===
                    this.filterRequestVersion
            ) {
                this.filterInProgress = false;

                if (!this.destroyed) {
                    context.factory.requestRender();
                }
            }
        }
    }

    private buildDataSetFilter(
        filters: SlaGridFilters,
        matchingCaseIds: string[] | undefined
    ): DataSetInterfaces.FilterExpression | null {
        if (!hasActiveFilters(filters)) {
            return null;
        }

        const rootConditions:
            DataSetInterfaces.ConditionExpression[] =
            [];

        const childFilters:
            DataSetInterfaces.FilterExpression[] =
            [];

        const caseSearch =
            filters.caseSearch.trim();

        if (caseSearch !== "") {
            childFilters.push({
                filterOperator: 1,

                conditions: [
                    {
                        attributeName:
                            "ticketnumber",
                        conditionOperator: 49,
                        value: caseSearch
                    },
                    {
                        attributeName: "title",
                        conditionOperator: 49,
                        value: caseSearch
                    }
                ],

                filters: []
            });
        }

        if (matchingCaseIds !== undefined) {
            if (matchingCaseIds.length > 0) {
                rootConditions.push({
                    attributeName: "incidentid",
                    conditionOperator: 8,
                    value: matchingCaseIds
                });
            } else {
                rootConditions.push({
                    attributeName: "incidentid",
                    conditionOperator: 0,
                    value:
                        "00000000-0000-0000-0000-000000000000"
                });
            }
        }

        return {
            filterOperator: 0,
            conditions: rootConditions,
            filters: childFilters
        };
    }

    private openCase(
        context: ComponentFramework.Context<IInputs>,
        caseId: string
    ): void {
        void context.navigation.openForm({
            entityName: "incident",
            entityId: caseId
        });
    }

    private extractCases(
        dataSet:
            ComponentFramework.PropertyTypes.DataSet
    ): CaseRow[] {
        return dataSet.sortedRecordIds.map(
            recordId => {
                const record =
                    dataSet.records[recordId];

                return {
                    id: normalizeGuid(recordId),

                    caseNumber: getString(
                        record,
                        "ticketnumber"
                    ),

                    title: getString(
                        record,
                        "title"
                    ),

                    priority: getNumber(
                        record,
                        "prioritycode"
                    ),

                    priorityLabel:
                        getFormattedValue(
                            record,
                            "prioritycode"
                        ),

                    ownerId: getLookupId(
                        record,
                        "ownerid"
                    ),

                    ownerName: getLookupName(
                        record,
                        "ownerid"
                    )
                };
            }
        );
    }

    private async loadCasesAndSlaKpis(
        context: ComponentFramework.Context<IInputs>,
        extractedCases: CaseRow[]
    ): Promise<void> {
        const currentRequestVersion =
            ++this.requestVersion;

        this.loadInProgress = true;

        try {
            const configuration =
                this.getGridConfiguration(context);

            const slaByCase =
                await retrieveSlaKpisForCases(
                    context,
                    extractedCases,
                    configuration.slaItems
                );

            if (
                this.destroyed ||
                currentRequestVersion !==
                    this.requestVersion
            ) {
                return;
            }

            this.cases =
                extractedCases.map(
                    caseRow => {
                        const sla =
                            slaByCase.get(
                                caseRow.id
                            );

                        return {
                            ...caseRow,

                            firstResponseKpi:
                                sla?.firstResponseKpi,

                            resolveKpi:
                                sla?.resolveKpi
                        };
                    }
                );
        } catch {
            if (
                this.destroyed ||
                currentRequestVersion !==
                    this.requestVersion
            ) {
                return;
            }

            this.cases = extractedCases;
        } finally {
            if (
                currentRequestVersion ===
                    this.requestVersion
            ) {
                this.loadInProgress = false;

                if (!this.destroyed) {
                    context.factory.requestRender();
                }
            }
        }
    }

    public getOutputs(): IOutputs {
        return {};
    }

    public destroy(): void {
        this.destroyed = true;

        this.requestVersion += 1;
        this.filterRequestVersion += 1;

        if (this.timerHandle !== null) {
            window.clearInterval(
                this.timerHandle
            );

            this.timerHandle = null;
        }

        if (this.serverRefreshHandle !== null) {
            window.clearInterval(
                this.serverRefreshHandle
            );

            this.serverRefreshHandle = null;
        }

        if (this.filterDebounceHandle !== null) {
            window.clearTimeout(
                this.filterDebounceHandle
            );

            this.filterDebounceHandle = null;
        }
    }
}
