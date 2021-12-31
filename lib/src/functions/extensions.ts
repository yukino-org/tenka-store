import { basename, extname } from "path";
import { IExtensionConfig } from "../models/ExtensionConfig";
import {
    PartiallyResolvedExtension,
    IPartiallyResolvedExtension,
} from "../models/ResolvedExtension";
import { isMinimalValidFilename, isValidSHA } from "../utils";

export const partiallyResolveExtension = async (
    config: IExtensionConfig
): Promise<IPartiallyResolvedExtension> => {
    if (config.name.length < 4) {
        throw new Error("'config.name' must be longer than 3 characters");
    }

    if (!isValidSHA(config.repo.sha)) {
        throw new Error("'config.repo.sha' is invalid SHA1");
    }

    const filename = basename(config.path.source, extname(config.path.source));

    if (extname(config.path.source) !== ".ht") {
        throw new Error("'config.path.source' has invalid extension");
    }

    if (!isMinimalValidFilename(filename)) {
        throw new Error("'config.path.source' has invalid filename");
    }

    if (![".jpeg", ".jpg", ".png"].includes(extname(config.path.image))) {
        throw new Error("'config.path.image' has invalid extension");
    }

    if (basename(config.path.image, extname(config.path.image)) !== filename) {
        throw new Error("'config.path.image' has different filename");
    }

    const endpoint = `https://raw.githubusercontent.com/${config.repo.username}/${config.repo.repo}/${config.repo.sha}`;

    return PartiallyResolvedExtension.create({
        name: config.name,
        id: `${config.author}.${filename}`,
        author: config.author,
        source: `${endpoint}/${config.path.source}`,
        image: `${endpoint}/${config.path.image}`,
        nsfw: config.nsfw,
        defaultLocale: config.defaultLocale,
        enabled: config.enabled,
    });
};
