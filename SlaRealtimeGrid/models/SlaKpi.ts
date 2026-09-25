export interface SlaKpi {
    id: string;
    name: string;
    status: number;
    warningTime: Date | null;
    failureTime: Date | null;
    applicableFrom: Date | null;
    pausedOn: Date | null;
    succeededOn: Date | null;
    terminalStateReached: boolean;
    modifiedOn: Date | null;
}