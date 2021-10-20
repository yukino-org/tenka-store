import { read, MIME_PNG } from "jimp";

export const resolveImage = async (
    url: string,
    size: number
): Promise<Buffer> => {
    const img = await read(url);
    img.quality(100);
    img.resize(size, size);
    return await img.getBufferAsync(MIME_PNG);
};
