import got from "got";

export const ExtensionTypes = ["anime", "manga"] as const;
export type ExtensionType = typeof ExtensionTypes[number];

export interface BaseExtension {
    name: string;
}

export interface ExtensionConfig extends BaseExtension {
    author: string;
    source: string;
}

export interface ResolvedExtension extends BaseExtension {
    id: string;
    version: number;
    type: ExtensionType;
    code: string;
}

export const checkExtensionConfig = async (
    idSuffix: string,
    config: ExtensionConfig
): Promise<true | never> => {
    if (Object.keys(config).length != 3) {
        throw new Error("'config' has missing/excess properties");
    }

    if (typeof config.name != "string") {
        throw new Error("'config.name' must be 'string'");
    }

    if (config.name.length < 4) {
        throw new Error("'config.name' must be longer than 3 characters");
    }

    if (typeof config.author != "string") {
        throw new Error("'config.author' must be 'string'");
    }

    const authorRes = await got.get(
        `https://api.github.com/users/${config.author}`,
        {
            responseType: "json",
        }
    );
    if (
        authorRes.statusCode != 200 ||
        (authorRes.body as any).login != config.author
    ) {
        throw new Error("'config.author' has invalid username");
    }

    if (typeof config.source != "string") {
        throw new Error("'config.source' must be 'string'");
    }

    const [
        ,
        urlUsername = null,
        urlRepo = null,
        urlRef = null,
        urlFilename = null,
    ] =
        /^https:\/\/raw\.githubusercontent\.com\/([^\/]+)\/([^\/]+)\/([^\/]+)\/.*\/(.*)\.ht$/.exec(
            config.source
        ) || [];
    if (!urlUsername || !urlRepo || !urlRef || !urlFilename) {
        throw new Error("'config.source' has invalid format");
    }

    if (![config.author, "yukino-app"].includes(urlUsername)) {
        throw new Error("'config.source' has different author");
    }

    if (!/^\b[0-9a-f]{5,40}\b$/.test(urlRef)) {
        throw new Error("'config.source' has invalid SHA1");
    }

    const refSrc = await got.get(
        `https://api.github.com/repos/${urlUsername}/${urlRepo}/commits/${urlRef}`,
        {
            responseType: "json",
        }
    );
    if ((refSrc.body as any).sha != urlRef) {
        throw new Error(
            "'config.source' must point to a commit rather than a branch"
        );
    }

    if (urlFilename != idSuffix) {
        throw new Error("'config.source' has unmatched filename");
    }

    const srcRes = await got.get(config.source);
    if (srcRes.statusCode != 200) {
        throw new Error("'config.source' is an invalid url");
    }

    if (!srcRes.headers["content-type"]?.startsWith("text/plain;")) {
        throw new Error("'config.source' returned invalid 'Content-Type'");
    }

    return true;
};
