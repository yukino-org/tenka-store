import { fields, FieldType } from "solid-schema";

export const ExtensionConfig = fields.object({
    name: fields.string(),
    author: fields.string(),
    repo: fields.object({
        username: fields.string(),
        repo: fields.string(),
        sha: fields.string(),
    }),
    path: fields.object({
        source: fields.string(),
        image: fields.string(),
    }),
    nsfw: fields.boolean(),
    defaultLocale: fields.string(),
    enabled: fields.optional(fields.boolean()),
});

export type IExtensionConfig = FieldType<typeof ExtensionConfig>;
