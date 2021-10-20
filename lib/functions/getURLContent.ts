import got, { Response } from "got";

export const getURLContent = async (
    url: string,
    filter: (response: Response<string>) => void
) => {
    const res = await got.get(url);
    filter(res);
    return res.body;
};
