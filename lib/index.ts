import { basename, dirname, join, relative, resolve } from "path";
import { emptyDir, ensureDir, writeFile } from "fs-extra";
import ora from "ora";
import got from "got";
import readdirp from "readdirp";
import { resolveConfig, resolveImage } from "./loader";
import { ExtensionVersion, StringifiedResolvedExtension } from "./model";

const src = resolve(__dirname, "../extensions");
const placeholder = resolve(__dirname, "../assets/placeholder.png");
const dist = resolve(__dirname, "../dist");
const distURL =
    "https://raw.githubusercontent.com/yukino-app/extensions-store/dist";

const start = async () => {
    await emptyDir(dist);
    const extensions: StringifiedResolvedExtension[] = [];

    const placeholderBuffer = await resolveImage(placeholder);

    const prevRes = await got
        .get(`${distURL}/extensions.json`)
        .catch(() => null);

    const previousPlugins: {
        extensions: StringifiedResolvedExtension[];
    } = prevRes
        ? JSON.parse(prevRes.body)
        : {
              extensions: [],
          };

    for await (const file of readdirp(src)) {
        const log = ora(
            `Processing: ${relative(process.cwd(), file.fullPath)}`
        );

        const resolved = await resolveConfig(file.fullPath);
        const prevResolved = previousPlugins.extensions.find(
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

        if (prevResolved) {
            const res = await got.get(prevResolved.source, {
                responseType: "text",
            });

            if (res.body != resolved.code) {
                version.inc();
            }
        }

        // @ts-ignore
        delete resolved.code;
        extensions.push({
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
    await writeFile(
        join(dist, "extensions.json"),
        JSON.stringify({
            extensions: extensions,
            lastModified: Date.now(),
        })
    );
};

start();
