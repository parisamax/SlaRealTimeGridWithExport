import * as React from "react";

export interface PagingControlsProps {
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    loadedRecordCount: number;
    totalRecordCount: number;
    loading: boolean;
    onPreviousPage: () => void;
    onNextPage: () => void;
}

export function PagingControls(
    props: PagingControlsProps
): React.ReactElement {
    const {
        hasPreviousPage,
        hasNextPage,
        loadedRecordCount,
        totalRecordCount,
        loading,
        onPreviousPage,
        onNextPage
    } = props;

    const totalText =
        totalRecordCount >= 0
            ? totalRecordCount.toString()
            : "5,000+";

    return (
        <div
            className="sla-paging"
            aria-label="Grid paging"
        >
            <div className="sla-paging__information">
                Showing {loadedRecordCount} of {totalText} Cases
            </div>

            <div className="sla-paging__buttons">
                <button
                    type="button"
                    className="sla-paging__button"
                    disabled={
                        loading ||
                        !hasPreviousPage
                    }
                    onClick={onPreviousPage}
                    aria-label="Previous page"
                >
                    Previous
                </button>

                <button
                    type="button"
                    className="sla-paging__button"
                    disabled={
                        loading ||
                        !hasNextPage
                    }
                    onClick={onNextPage}
                    aria-label="Next page"
                >
                    Next
                </button>
            </div>
        </div>
    );
}