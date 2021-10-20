import { fields, FieldType } from "solid-schema";
import { ResolvedExtension } from "./ResolvedExtension";

export const Store = fields.object({
    extensions: fields.array(ResolvedExtension),
    meta: fields.record(
        fields.string(),
        fields.object({
            sha: fields.string(),
        })
    ),
    lastModified: fields.number(),
});

export type IStore = FieldType<typeof Store>;
