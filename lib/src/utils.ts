export const isValidSHA = (sha: string) => /^\b[0-9a-f]{5,40}\b$/.test(sha);

export const isMinimalValidFilename = (filename: string) =>
    /[\w- ]{4,20}/.test(filename);

export const isSuccessStatusCode = (code: number) => [200, 304].includes(code);
