import { join } from "path";
import { Octokit } from "@octokit/rest";
import { paths, repository } from "../constants";
import { StoreBuilder } from "../";

const run = async () => {
    if (!process.argv[2]) {
        throw new Error("Missing PR number argument");
    }

    const octokit = new Octokit();
    const res = await octokit.request(
        "GET /repos/{owner}/{repo}/pulls/{pull_number}/files",
        {
            ...repository,
            pull_number: parseInt(process.argv[2]),
        }
    );

    const files = res.data
        .map((x) => join(paths.root, x.filename))
        .filter((x) => x.startsWith(paths.config));

    if (!files.length) {
        throw new Error(`No changes were found in ${paths.config}`);
    }

    await StoreBuilder.start("scenario/pr", files);
};

run();
