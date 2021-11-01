const {
    languages,
    countries,
}: {
    languages: Record<string, string>;
    countries: Record<string, string>;
} = require("../../assets/languages.json");

export class Language {
    constructor(public code: string, public country?: string) {}

    toString() {
        return [this.code, this.country].filter((x) => x).join("_");
    }

    static parse(language: string): Language {
        const [code = "", country] = language.split("_");

        if (!languages[code]) {
            throw new Error("Invalid language code");
        }

        if (country && !countries[country]) {
            throw new Error("Invalid language code");
        }

        return new Language(code, country);
    }
}
