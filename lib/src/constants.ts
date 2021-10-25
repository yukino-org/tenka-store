import { resolve } from "path";

export const paths = {
    root: resolve(__dirname, "../.."),
    config: resolve(__dirname, "../../extensions"),
    dist: resolve(__dirname, "../../dist"),
    distExtensions: resolve(__dirname, "../../dist/extensions"),
    placeholder: resolve(__dirname, "../assets/placeholder.png"),
};

export const repository = {
    owner: "yukino-app",
    repo: "yukino",
};

export const urls = {
    dist: "https://raw.githubusercontent.com/yukino-app/extensions-store/dist",
};
