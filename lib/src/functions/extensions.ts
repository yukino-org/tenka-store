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

    if (
        config.path.image &&
        ![".jpeg", ".jpg", ".png"].includes(extname(config.path.image))
    ) {
        throw new Error("'config.path.image' has invalid extension");
    }

    if (
        config.path.image &&
        basename(config.path.image, extname(config.path.image)) !== filename
    ) {
        throw new Error("'config.path.image' has different filename");
    }

    // const src = await got.get(

    // );

    // if (![200, 304].includes(src.statusCode)) {
    //     throw new Error("'config.path.source' returned invalid status code");
    // }

    // if (

    // ) {
    //     throw new Error(
    //         "'config.path.source' returned invalid 'Content-Type' header"
    //     );
    // }

    // const image = await got.get(
    //     `https://raw.githubusercontent.com/${config.repo.username}/${config.repo.repo}/${config.repo.sha}/${config.path.image}`
    // );

    // if (![200, 304].includes(image.statusCode)) {
    //     throw new Error("'config.path.image' returned invalid status code");
    // }

    // if (
    //     !image.headers["content-type"] ||
    //     !/^image\/(jpg|jpeg|png);/.test(image.headers["content-type"])
    // ) {
    //     throw new Error(
    //         "'config.path.image' returned invalid 'Content-Type' header"
    //     );
    // }

    const endpoint = `https://raw.githubusercontent.com/${config.repo.username}/${config.repo.repo}/${config.repo.sha}`;

    return PartiallyResolvedExtension.create({
        name: config.name,
        id: `${config.author}.${filename}`,
        author: config.author,
        source: `${endpoint}/${config.path.source}`,
        image: config.path.image
            ? `${endpoint}/${config.path.image}`
            : undefined,
        nsfw: config.nsfw,
    });
};
