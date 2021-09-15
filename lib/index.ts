import { basename, dirname, join, relative, resolve } from "path";
import { emptyDir, ensureDir, writeFile } from "fs-extra";
import got from "got";
import readdirp from "readdirp";
import { resolveConfig, resolveImage } from "./loader";
import { ResolvedExtension } from "./model";

const src = resolve(__dirname, "../extensions");
const placeholder = resolve(__dirname, "../assets/placeholder.png");
const dist = resolve(__dirname, "../dist");
const distURL =
    "https://raw.githubusercontent.com/yukino-app/extensions-store/dist";

const start = async () => {
    await emptyDir(dist);
    const extensions: ResolvedExtension[] = [];

    const placeholderBuffer = await resolveImage(placeholder);

    const prevRes = await got
        .get(`${distURL}/extensions.json`)
        .catch(() => null);
    const previousPlugins: ResolvedExtension[] = prevRes
        ? JSON.parse(prevRes.body).extensions
        : [];

    for await (const file of readdirp(src)) {
        const resolved = await resolveConfig(file.fullPath);
        const prevResolved = previousPlugins.find((x) => x.id == resolved.id);

        const filename = file.basename.slice(0, -3);
        const source = join(dist, "extensions", `${filename}.ht`);
        const image = join(dist, "extensions", `${filename}.png`);

        await ensureDir(dirname(source));
        await writeFile(source, resolved.code);
        await writeFile(
            image,
            resolved.image
                ? await resolveImage(resolved.image)
                : placeholderBuffer
        );

        // @ts-ignore
        delete resolved.code;
        extensions.push({
            ...resolved,
            version: (prevResolved?.version || 0) + 1,
            source: `${distURL}/extensions/${basename(source)}`,
            image: `${distURL}/extensions/${basename(image)}`,
        });

        console.log(
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
