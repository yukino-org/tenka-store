import { dirname, join, relative, resolve } from "path";
import { emptyDir, ensureDir, writeFile } from "fs-extra";
import readdirp from "readdirp";
import { resolveConfig } from "./loader";
import { ResolvedExtension } from "./model";

const src = resolve(__dirname, "../extensions");
const dist = resolve(__dirname, "../dist");
const distURL =
    "https://raw.githubusercontent.com/yukino-app/extensions-store/dist";

const start = async () => {
    await emptyDir(dist);
    const extensions: ResolvedExtension[] = [];

    for await (const file of readdirp(src)) {
        const resolved = await resolveConfig(file.fullPath);

        const filename = `${file.basename.slice(0, -3)}.ht`;
        const path = join(dist, "extensions", filename);
        await ensureDir(dirname(path));
        await writeFile(path, resolved.code);

        // @ts-ignore
        delete resolved.code;
        extensions.push({
            ...resolved,
            source: `${distURL}/extensions/${filename}`,
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
