import { basename, dirname, join, relative, resolve } from "path";
import { emptyDir, ensureDir, writeFile } from "fs-extra";
import ora from "ora";
import got from "got";
import readdirp from "readdirp";
import { resolveConfig, resolveImage } from "./loader";
import { DisturbutedExtensionsJson, ExtensionVersion } from "./model";

const src = resolve(__dirname, "../extensions");
const placeholder = resolve(__dirname, "../assets/placeholder.png");
const dist = resolve(__dirname, "../dist");
const distURL =
    "https://raw.githubusercontent.com/yukino-app/extensions-store/dist";

const start = async () => {
    await emptyDir(dist);
    const store: DisturbutedExtensionsJson = {
        extensions: [],
        meta: {},
        lastModified: Date.now(),
    };

    const placeholderBuffer = await resolveImage(placeholder);

    const prevRes = await got
        .get(`${distURL}/extensions.json`)
        .catch(() => null);

    const prevStore: DisturbutedExtensionsJson | undefined = prevRes
        ? JSON.parse(prevRes.body)
        : undefined;

    for await (const file of readdirp(src)) {
        const log = ora(
            `Processing: ${relative(process.cwd(), file.fullPath)}`
        );

        const { checkConfigResult, resolved } = await resolveConfig(
            file.fullPath
        );
        const prevResolved = prevStore?.extensions.find(
            (x) => x.id == resolved.id
        );

        const source = join(dist, "extensions", `${resolved.id}.ht`);
        const image = join(dist, "extensions", `${resolved.id}.png`);

        await ensureDir(dirname(source));
        await writeFile(source, resolved.code);
        await writeFile(
            image,
            resolved.image
                ? await resolveImage(resolved.image)
                : placeholderBuffer
        );

        const version = prevResolved
            ? ExtensionVersion.parse(prevResolved.version)
            : ExtensionVersion.create();

        if (
            prevResolved &&
            prevStore!.meta[resolved.id]!.sha != checkConfigResult.sha
        ) {
            const res = await got.get(prevResolved.source, {
                responseType: "text",
            });

            if (res.body != resolved.code) {
                version.inc();
            }
        }

        // @ts-ignore
        delete resolved.code;

        store.meta[resolved.id] = {
            sha: checkConfigResult.sha,
        };

        store.extensions.push({
            ...resolved,
            version: version.toString(),
            source: `${distURL}/extensions/${basename(source)}`,
            image: `${distURL}/extensions/${basename(image)}`,
        });

        log.succeed(
            `Processed: ${resolved.id} [${relative(
                process.cwd(),
                file.fullPath
            )}]`
        );
    }

    await ensureDir(dist);
    await writeFile(join(dist, "extensions.json"), JSON.stringify(store));
};

start();
