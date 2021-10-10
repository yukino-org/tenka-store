import { basename, dirname, relative } from "path";
import got from "got";
import jimp from "jimp";
import {
    ExtensionConfig,
    ResolvedExtension,
    ExtensionType,
    ExtensionTypes,
    checkExtensionConfig,
} from "./model";

export const resolveConfig = async (
    path: string
): Promise<
    Omit<ResolvedExtension, "source" | "version"> & {
        code: string;
    }
> => {
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
    await checkExtensionConfig(idSuffix, config);

    const id = `${config.author}.${idSuffix}`;
    const { body: content } = await got.get(config.source);

    return {
        name: config.name,
        id: id,
        type: type as ExtensionType,
        code: content,
        image: config.image,
    };
};

export const resolveImage = async (url: string): Promise<Buffer> => {
    const size = 96;
    const img = await jimp.read(url);
    img.quality(100);
    img.resize(size, size);
    return await img.getBufferAsync(jimp.MIME_PNG);
};
