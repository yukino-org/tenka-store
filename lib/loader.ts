import { basename, dirname, relative } from "path";
import got from "got";
import jimp from "jimp";
import {
    ExtensionConfig,
    ResolvedExtension,
    ExtensionType,
    ExtensionTypes,
} from "./model";

export interface CheckExtensionConfigResult {
    author: string;
    repo: string;
    sha: string;
    code: string;
}

export const checkExtensionConfig = async (
    idSuffix: string,
    config: ExtensionConfig
): Promise<CheckExtensionConfigResult | never> => {
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
        ) ?? [];
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
    if (![200, 304].includes(srcRes.statusCode)) {
        throw new Error("'config.source' is an invalid status code");
    }

    if (!srcRes.headers["content-type"]?.startsWith("text/plain;")) {
        throw new Error("'config.source' returned invalid 'Content-Type'");
    }

    if (config.image) {
        const [
            ,
            imgUsername = null,
            imgRepo = null,
            imgRef = null,
            imgFilename = null,
        ] =
            /^https:\/\/raw\.githubusercontent\.com\/([^\/]+)\/([^\/]+)\/([^\/]+)\/.*\/(.*)\.(png|jpg|jpeg|webp)$/.exec(
                config.image
            ) ?? [];
        if (!imgUsername || !imgRepo || !imgRef || !imgFilename) {
            throw new Error("'config.image' has invalid format");
        }

        if (imgUsername != urlUsername) {
            throw new Error("'config.image' has different author");
        }

        if (imgRepo != urlRepo) {
            throw new Error("'config.image' has different repo");
        }

        if (imgRef != urlRef) {
            throw new Error("'config.image' has different SHA1");
        }

        if (imgFilename != urlFilename) {
            throw new Error("'config.image' has different filename");
        }

        const imgRes = await got.get(config.image);
        if (![200, 304].includes(imgRes.statusCode)) {
            throw new Error("'config.image' is an invalid status code");
        }

        if (!imgRes.headers["content-type"]?.startsWith("image/")) {
            throw new Error("'config.image' returned invalid 'Content-Type'");
        }
    }

    return {
        author: urlUsername,
        repo: urlRepo,
        sha: urlRef,
        code: srcRes.body,
    };
};

export interface ResolveConfigResult {
    config: ExtensionConfig;
    checkConfigResult: CheckExtensionConfigResult;
    resolved: Omit<ResolvedExtension, "source" | "version"> & {
        code: string;
    };
}

export const resolveConfig = async (
    path: string
): Promise<ResolveConfigResult> => {
    const filename = basename(path);

    const [, idSuffix = null] = /^([\w-]{4,20})\.ts$/.exec(filename) ?? [];
    if (!idSuffix) {
        throw new Error(
            `Invalid filename: '${filename}' [${relative(process.cwd(), path)}]`
        );
    }

    const [, type = null] = /([^/\\]+)[\\\/]?$/.exec(dirname(path)) ?? [];
    if (!ExtensionTypes.includes(type as any)) {
        throw new Error(`Invalid type: '${type}'`);
    }

    const config: ExtensionConfig = require(path).config;
    const checkConfigResult = await checkExtensionConfig(idSuffix, config);

    const id = `${config.author}.${idSuffix}`;

    return {
        config: config,
        checkConfigResult: checkConfigResult,
        resolved: {
            name: config.name,
            id: id,
            type: type as ExtensionType,
            code: checkConfigResult.code,
            image: config.image,
            nsfw: config.nsfw,
        },
    };
};

export const resolveImage = async (url: string): Promise<Buffer> => {
    const size = 96;
    const img = await jimp.read(url);
    img.quality(100);
    img.resize(size, size);
    return await img.getBufferAsync(jimp.MIME_PNG);
};
