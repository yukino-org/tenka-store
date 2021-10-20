import { basename, dirname, join, relative } from "path";
import { emptyDir, ensureDir, readFile, writeFile } from "fs-extra";
import ora from "ora";
import got from "got";
import readdirp from "readdirp";
import yaml from "yaml";
import { IStore, Store } from "./models/Store";
import { resolveImage } from "./functions/image";
import { paths, urls } from "./constants";
import { isSuccessStatusCode } from "./utils";
import { partiallyResolveExtension } from "./functions/extensions";
import { getURLContent } from "./functions/getURLContent";
import { ExtensionVersion } from "./models/Version";
import { ExtensionConfig } from "./models/ExtensionConfig";
import {
    IResolvedExtension,
    ResolvedExtension,
} from "./models/ResolvedExtension";

const start = async () => {
    await emptyDir(paths.dist);

    const store = Store.create({
        extensions: [],
        meta: {},
        lastModified: Date.now(),
    });

    const placeholder = await resolveImage(paths.placeholder, 96);

    const oldRes = await got
        .get(`${urls.dist}/extensions.json`)
        .catch(() => null);

    const oldStore: IStore | undefined =
        oldRes && isSuccessStatusCode(oldRes?.statusCode)
            ? Store.create(JSON.parse(oldRes.body))
            : undefined;

    for await (const file of readdirp(paths.config)) {
        const log = ora(
            `Processing: ${relative(process.cwd(), file.fullPath)}`
        );

        try {
            const type = /([^/\\]+)[\\\/]?$/.exec(dirname(file.fullPath))![1]!;
            const config = ExtensionConfig.create(
                yaml.parse((await readFile(file.fullPath)).toString())
            );
            const partial = await partiallyResolveExtension(config);
            const previous = oldStore?.extensions.find(
                (x) => x.id == partial.id
            );

            const version = previous
                ? ExtensionVersion.parse(previous.version)
                : ExtensionVersion.create();

            if (
                previous &&
                oldStore!.meta[partial.id]!.sha != config.repo.sha
            ) {
                version.inc();
            }

            store.meta[partial.id] = {
                sha: config.repo.sha,
            };

            const source = join(paths.distExtensions, `${partial.id}.ht`);
            const image = join(paths.distExtensions, `${partial.id}.png`);

            await ensureDir(dirname(source));
            await writeFile(
                source,
                await getURLContent(partial.source, (res) => {
                    if (!isSuccessStatusCode(res.statusCode)) {
                        throw new Error(
                            `Failed to fetch ${res.url} (Invalid status code: ${res.statusCode})`
                        );
                    }

                    if (
                        !res.headers["content-type"] ||
                        !/^text\/plain;/.test(res.headers["content-type"])
                    ) {
                        throw new Error(
                            `Failed to fetch ${res.url} (Invalid content type: ${res.headers["content-type"]})`
                        );
                    }
                })
            );
            await writeFile(
                image,
                partial.image
                    ? await resolveImage(partial.image, 95)
                    : placeholder
            );

            store.extensions.push(
                ResolvedExtension.create({
                    ...partial,
                    type: type as IResolvedExtension["type"],
                    version: version.toString(),
                    source: `${urls.dist}/extensions/${basename(source)}`,
                    image: `${urls.dist}/extensions/${basename(image)}`,
                })
            );

            log.succeed(
                `Processed: ${partial.id} [${relative(
                    process.cwd(),
                    file.fullPath
                )}]`
            );
        } catch (err) {
            console.error(err);
            log.fail(
                `Failed to process: ${relative(process.cwd(), file.fullPath)}`
            );
            process.exit(1);
        }
    }

    await ensureDir(paths.dist);
    await writeFile(join(paths.dist, "extensions.json"), JSON.stringify(store));
};

start();
