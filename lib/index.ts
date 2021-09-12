import { join, relative, resolve } from "path";
import { ensureDir, writeFile } from "fs-extra";
import readdirp from "readdirp";
import { resolveConfig } from "./loader";
import { ResolvedExtension } from "./model";

const src = resolve(__dirname, "../extensions");
const dist = resolve(__dirname, "../dist");

const start = async () => {
    const extensions: ResolvedExtension[] = [];

    for await (const file of readdirp(src)) {
        const resolved = await resolveConfig(file.fullPath);
        extensions.push(resolved);
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
