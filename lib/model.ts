export const ExtensionTypes = ["anime", "manga"] as const;
export type ExtensionType = typeof ExtensionTypes[number];

export interface BaseExtension {
    name: string;
    source: string;
    image?: string;
    nsfw: boolean;
}

export interface ExtensionConfig extends BaseExtension {
    author: string;
}

export interface ResolvedExtension extends BaseExtension {
    id: string;
    version: ExtensionVersion;
    type: ExtensionType;
}

export interface StringifiedResolvedExtension
    extends Omit<ResolvedExtension, "version"> {
    version: string;
}

export interface DisturbutedExtensionsJson {
    extensions: StringifiedResolvedExtension[];
    meta: Record<
        string,
        {
            sha: string;
        }
    >;
    lastModified: number;
}

export class ExtensionVersion {
    constructor(
        public year: number,
        public month: number,
        public revision: number
    ) {}

    gt(version: ExtensionVersion) {
        return (
            this.year > version.year ||
            (this.year == version.year && this.month > version.month) ||
            (this.year == version.year &&
                this.month == version.month &&
                this.revision > version.revision)
        );
    }

    lt(version: ExtensionVersion) {
        return (
            this.year < version.year ||
            (this.year == version.year && this.month < version.month) ||
            (this.year == version.year &&
                this.month == version.month &&
                this.revision < version.revision)
        );
    }

    eq(version: ExtensionVersion) {
        return (
            this.year == version.year &&
            this.month == version.month &&
            this.revision == version.revision
        );
    }

    inc() {
        const date = new Date();
        const year = date.getFullYear();
        const month = date.getMonth() + 1;

        if (this.year != year || this.month != month) {
            this.year = year;
            this.month = month;
            this.revision = 0;
            return;
        }

        this.revision += 1;
    }

    toString() {
        return `${this.year}.${this.month}-r${this.revision}`;
    }

    static parse(version: string): ExtensionVersion {
        const match = version.match(/(\d{4})\.(\d{2})-r(\d+)/);
        if (!match) {
            throw Error("Invalid version");
        }

        const year = +match[1]!;
        const month = +match[2]!;
        const revision = +match[3]!;
        if (month < 1 || month > 12) {
            throw new Error("Invalid month");
        }

        return new ExtensionVersion(year, month, revision);
    }

    static create(): ExtensionVersion {
        const date = new Date();
        return new ExtensionVersion(date.getFullYear(), date.getMonth() + 1, 0);
    }
}
