import { createHash } from "crypto";

export const generateChecksum = () => {
    return createHash("sha256").update(Date.now().toString()).digest("hex");
};
