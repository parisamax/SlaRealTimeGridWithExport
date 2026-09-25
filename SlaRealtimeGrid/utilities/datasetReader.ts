type EntityRecord =
    ComponentFramework.PropertyHelper.DataSetApi.EntityRecord;

/**
 * Διαβάζει την raw τιμή μιας στήλης και την επιστρέφει ως string.
 */
export function getString(
    record: EntityRecord,
    columnName: string
): string {
    try {
        const value = record.getValue(columnName);

        if (value === null || value === undefined) {
            return "";
        }

        if (typeof value === "string") {
            return value;
        }

        if (typeof value === "number") {
            return Number.isFinite(value)
                ? value.toString()
                : "";
        }

        if (typeof value === "boolean") {
            return value ? "true" : "false";
        }

        /*
         * Για Lookup, Choice, Date και άλλους σύνθετους τύπους,
         * χρησιμοποιούμε το formatted value ώστε να μη δημιουργηθεί
         * το αποτέλεσμα "[object Object]".
         */
        return record.getFormattedValue(columnName) ?? "";
    } catch {
        return "";
    }
}
/**
 * Επιστρέφει τη formatted τιμή μιας στήλης.
 *
 * Είναι χρήσιμο για Choice, Lookup, DateTime και άλλα πεδία
 * στα οποία θέλουμε να εμφανίσουμε το label και όχι την raw τιμή.
 */
export function getFormattedValue(
    record: EntityRecord,
    columnName: string
): string {
    try {
        return record.getFormattedValue(columnName) ?? "";
    } catch {
        return "";
    }
}

/**
 * Διαβάζει μία numeric τιμή.
 *
 * Χρησιμοποιείται, για παράδειγμα, για το prioritycode.
 */
export function getNumber(
    record: EntityRecord,
    columnName: string
): number | null {
    try {
        const value = record.getValue(columnName);

        if (value === null || value === undefined || value === "") {
            return null;
        }

        if (typeof value === "number") {
            return value;
        }

        const parsedValue = Number(value);

        return Number.isFinite(parsedValue)
            ? parsedValue
            : null;
    } catch {
        return null;
    }
}

/**
 * Διαβάζει το GUID ενός Dataverse lookup.
 *
 * Τα lookup values μέσα σε dataset records επιστρέφονται συνήθως
 * ως array από EntityReference objects.
 */
interface LookupValueShape {
    id?: string;
    name?: string;
    entityType?: string;
}



/**
 * Επιστρέφει το GUID ενός Dataverse lookup.
 */
interface LookupValueShape {
    id?: string;
    name?: string;
    entityType?: string;
}

function isLookupValue(
    value: unknown
): value is LookupValueShape {
    return (
        typeof value === "object" &&
        value !== null
    );
}

/**
 * Επιστρέφει το GUID ενός Dataverse lookup.
 *
 * Υποστηρίζει:
 * - LookupValue
 * - EntityReference
 * - LookupValue[]
 * - EntityReference[]
 */
export function getLookupId(
    record: EntityRecord,
    columnName: string
): string | null {
    try {
        const value = record.getValue(columnName);

        if (
            value === null ||
            value === undefined
        ) {
            return null;
        }

        /*
         * Περίπτωση όπου το Dataset API
         * επιστρέφει array lookup values.
         */
        if (Array.isArray(value)) {
            if (value.length === 0) {
                return null;
            }

            const firstValue: unknown =
                value[0];

            if (!isLookupValue(firstValue)) {
                return null;
            }

            if (
                typeof firstValue.id !== "string"
            ) {
                return null;
            }

            return normalizeGuid(
                firstValue.id
            );
        }

        /*
         * Περίπτωση όπου το Dataset API
         * επιστρέφει απευθείας LookupValue
         * ή EntityReference.
         */
        if (isLookupValue(value)) {
            if (
                typeof value.id !== "string"
            ) {
                return null;
            }

            return normalizeGuid(
                value.id
            );
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * Επιστρέφει το εμφανιζόμενο όνομα ενός Dataverse lookup.
 */
/**
 * Επιστρέφει το display name ενός Dataverse lookup.
 */
export function getLookupName(
    record: EntityRecord,
    columnName: string
): string {
    try {
        /*
         * Προτιμάμε το formatted value.
         */
        const formattedValue =
            record.getFormattedValue(columnName);

        if (formattedValue) {
            return formattedValue;
        }

        const value =
            record.getValue(columnName);

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        /*
         * Array lookup.
         */
        if (Array.isArray(value)) {
            if (value.length === 0) {
                return "";
            }

            const firstValue: unknown =
                value[0];

            if (
                isLookupValue(firstValue) &&
                typeof firstValue.name === "string"
            ) {
                return firstValue.name;
            }

            return "";
        }

        /*
         * Direct lookup object.
         */
        if (
            isLookupValue(value) &&
            typeof value.name === "string"
        ) {
            return value.name;
        }

        return "";
    } catch {
        return "";
    }
}
/**
 * Αφαιρεί τα άγκιστρα από ένα GUID και το μετατρέπει
 * σε lowercase μορφή.
 */
export function normalizeGuid(value: string): string {
    return value
        .replace(/[{}]/g, "")
        .trim()
        .toLowerCase();
}