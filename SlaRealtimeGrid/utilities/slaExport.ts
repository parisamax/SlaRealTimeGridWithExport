import { Workbook } from "exceljs";

import type {
    DisplayState
} from "../models/DisplayState";

import type {
    SlaExportCase
} from "../services/SlaService";

import {
    formatCountdown
} from "./countdown";

import {
    getDisplayState
} from "./slaStatus";

function getStatusLabel(
    state: DisplayState
): string {
    switch (state) {
        case "onTrack":
            return "On Track";

        case "warning":
            return "Warning";

        case "breached":
            return "Breached";

        case "paused":
            return "Paused";

        case "succeeded":
            return "Succeeded";

        case "canceled":
            return "Canceled";

        case "noSla":
        default:
            return "No SLA";
    }
}

function formatDateForFileName(
    date: Date
): string {
    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    const hours =
        String(
            date.getHours()
        ).padStart(2, "0");

    const minutes =
        String(
            date.getMinutes()
        ).padStart(2, "0");

    return (
        `${year}-${month}-${day}_` +
        `${hours}-${minutes}`
    );
}

export async function downloadSlaExcel(
    cases: SlaExportCase[],
    firstStageLabel: string,
    enableNegativeTimer: boolean,
    now: Date
): Promise<void> {
    const workbook =
        new Workbook();

    workbook.creator =
        "SLA Real-Time Grid";

    workbook.created =
        now;

    const worksheet =
        workbook.addWorksheet(
            "SLA Cases",
            {
                views: [
                    {
                        state: "frozen",
                        ySplit: 1
                    }
                ]
            }
        );

    const rows = cases.map(
        caseRow => [
            caseRow.caseNumber,
            caseRow.title,

            formatCountdown(
                caseRow.firstResponseKpi,
                now,
                enableNegativeTimer
            ),

            getStatusLabel(
                getDisplayState(
                    caseRow.firstResponseKpi,
                    now
                )
            ),

            formatCountdown(
                caseRow.resolveKpi,
                now,
                enableNegativeTimer
            ),

            getStatusLabel(
                getDisplayState(
                    caseRow.resolveKpi,
                    now
                )
            )
        ]
    );

    worksheet.addTable({
        name:
            "SlaCases",

        ref: "A1",

        headerRow: true,

        totalsRow: false,

        style: {
            theme: "TableStyleMedium2",
            showRowStripes: true,
            showColumnStripes: false
        },

        columns: [
            {
                name: "Case Number",
                filterButton: true
            },
            {
                name: "Case Title",
                filterButton: true
            },
            {
                name:
                    firstStageLabel,
                filterButton: true
            },
            {
                name:
                    `${firstStageLabel} Status`,
                filterButton: true
            },
            {
                name: "Resolution",
                filterButton: true
            },
            {
                name: "Resolution Status",
                filterButton: true
            }
        ],

        rows
    });

    /*
     * Column widths
     */
    worksheet.getColumn(1).width = 24;
    worksheet.getColumn(2).width = 45;
    worksheet.getColumn(3).width = 22;
    worksheet.getColumn(4).width = 25;
    worksheet.getColumn(5).width = 22;
    worksheet.getColumn(6).width = 22;

    /*
     * Header formatting
     */
    const headerRow =
        worksheet.getRow(1);

    headerRow.height = 24;

    headerRow.alignment = {
        vertical: "middle",
        horizontal: "left"
    };

    /*
     * Body alignment
     */
    worksheet.eachRow(
        {
            includeEmpty: false
        },
        (row, rowNumber) => {
            if (rowNumber === 1) {
                return;
            }

            row.alignment = {
                vertical: "middle",
                horizontal: "left"
            };

            row.height = 21;
        }
    );

    const buffer =
        await workbook.xlsx.writeBuffer();

    const bytes =
        new Uint8Array(buffer);

    const blob =
        new Blob(
            [bytes],
            {
                type:
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const anchor =
        document.createElement("a");

    anchor.href = url;

    anchor.download =
        `SLA-Cases-${
            formatDateForFileName(now)
        }.xlsx`;

    anchor.style.display = "none";

    document.body.appendChild(anchor);

    anchor.click();

    anchor.remove();

    window.setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 0);
}
