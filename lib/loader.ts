import { basename, dirname, relative } from "path";
import got from "got";
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
    Omit<ResolvedExtension, "source"> & {
        code: string;
    }
> => {
    const filename = basename(path);

    const [, idSuffix = null] = /^([\w-]{4,20})\.ts$/.exec(filename) || [];
    if (!idSuffix) {
        throw new Error(
            `Invalid filename: '${filename}' [${relative(process.cwd(), path)}]`
        );
    }

    const [, type = null] = /([^/\\]+)[\\\/]?$/.exec(dirname(path)) || [];
    if (!ExtensionTypes.includes(type as any)) {
        throw new Error(`Invalid type: '${type}'`);
    }

    const config: ExtensionConfig = require(path).config;
    await checkExtensionConfig(idSuffix, config);

    const id = `${config.author}.${idSuffix}`;
    let version = 1;

    const { body: content } = await got.get(config.source);

    return {
        name: config.name,
        id: id,
        version: version,
        type: type as ExtensionType,
        code: content,
    };
};
