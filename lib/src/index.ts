import { basename, dirname, join, relative } from "path";
import { emptyDir, ensureDir, readFile, writeFile } from "fs-extra";
import chalk from "chalk";
import consola from "consola";
import got from "got";
import readdirp from "readdirp";
import yaml from "yaml";
import { IStore, Store } from "./models/Store";
import { resolveImage } from "./functions/image";
import { paths, urls } from "./constants";
import { isSuccessStatusCode } from "./utils";
import { partiallyResolveExtension } from "./functions/extensions";
import { getURLContent } from "./functions/getURLContent";
import { Locale } from "./models/Language";
import { ExtensionVersion } from "./models/Version";
import { ExtensionConfig } from "./models/ExtensionConfig";
import {
    IResolvedExtension,
    ResolvedExtension,
} from "./models/ResolvedExtension";

export type StartMode = "build" | "scenario/pr";

export class StoreBuilder {
    ready = false;

    store?: IStore;
    oldStore?: IStore;

    constructor(public readonly mode: StartMode) {}

    async initialize() {
        const started = Date.now();

        this.store = Store.create({
            extensions: [],
            meta: {},
            lastModified: Date.now(),
        });

        const oldRes = await got
            .get(`${urls.dist}/extensions.json`)
            .catch(() => null);

        this.oldStore =
            oldRes && isSuccessStatusCode(oldRes?.statusCode)
                ? Store.create(JSON.parse(oldRes.body))
                : undefined;

        this.ready = true;
        consola.info(
            `Initialized in ${chalk.cyanBright(`${Date.now() - started}ms`)}`
        );
    }

    async build(files?: string[]) {
        this.checkReady();

        const started = Date.now();
        consola.info(`Building in ${chalk.cyanBright(this.mode)} mode`);

        if (this.mode === "build") {
            await emptyDir(paths.dist);
            consola.info(
                `Removed: ${chalk.cyanBright(relative(paths.root, paths.dist))}`
            );
        }

        if (files) {
            for (const file of files) {
                await this.resolveFile(file);
            }
        } else {
            for await (const { fullPath: file } of readdirp(paths.config)) {
                await this.resolveFile(file);
            }
        }

        if (this.mode === "build") {
            const path = join(paths.dist, "extensions.json");
            await ensureDir(dirname(path));
            await writeFile(path, JSON.stringify(this.store));
            consola.success(
                `Created: ${chalk.cyanBright(relative(paths.root, path))}`
            );
        }

        consola.info(
            `Built in ${chalk.cyanBright(`${Date.now() - started}ms`)}`
        );
    }

    async resolveFile(path: string) {
        this.checkReady();

        const relativePath = relative(paths.root, path);
        try {
            const type = /([^/\\]+)[\\\/]?$/.exec(dirname(path))![1]!;
            const config = ExtensionConfig.create(
                yaml.parse((await readFile(path)).toString())
            );
            const partial = await partiallyResolveExtension(config);
            const previous = this.oldStore?.extensions.find(
                (x) => x.id == partial.id
            );

            const version = previous
                ? ExtensionVersion.parse(previous.version)
                : ExtensionVersion.create();

            if (
                previous &&
                this.oldStore!.meta[partial.id]!.sha != config.repo.sha
            ) {
                version.inc();
            }

            Locale.parse(partial.defaultLocale);

            this.store!.meta[partial.id] = {
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
            await writeFile(image, await resolveImage(partial.image, 95));

            this.store!.extensions.push(
                ResolvedExtension.create({
                    ...partial,
                    type: type as IResolvedExtension["type"],
                    version: version.toString(),
                    source: `${urls.dist}/extensions/${basename(source)}`,
                    image: `${urls.dist}/extensions/${basename(image)}`,
                })
            );

            consola.success(
                `Processed: ${chalk.cyanBright(partial.id)} ${chalk.gray(
                    `[${relativePath}]`
                )}`
            );
        } catch (err) {
            consola.error(err);
            consola.error(
                `Failed to process: ${chalk.redBright(relativePath)}`
            );
            process.exit(1);
        }
    }

    checkReady() {
        if (!this.ready) {
            throw new Error("Builder is not ready");
        }
    }

    static async start(mode: StartMode, files?: string[] | undefined) {
        const builder = new StoreBuilder(mode);
        await builder.initialize();
        await builder.build(files);
    }
}
