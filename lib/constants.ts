import { join } from "path";

export const paths = {
    config: join(__dirname, "../extensions"),
    dist: join(__dirname, "../dist"),
    distExtensions: join(__dirname, "../dist/extensions"),
    placeholder: join(__dirname, "../assets/placeholder.png"),
};

export const urls = {
    dist: "https://raw.githubusercontent.com/yukino-app/extensions-store/dist",
};
