import { fields, FieldType } from "solid-schema";

export const PartiallyResolvedExtension = fields.object({
    name: fields.string(),
    id: fields.string(),
    author: fields.string(),
    source: fields.string(),
    image: fields.string(),
    nsfw: fields.boolean(),
    defaultLocale: fields.string(),
});

export type IPartiallyResolvedExtension = FieldType<
    typeof PartiallyResolvedExtension
>;

export const ResolvedExtension = fields.object({
    ...PartiallyResolvedExtension.model,
    type: fields.tuple(["anime", "manga"] as const),
    version: fields.string(),
});

export type IResolvedExtension = FieldType<typeof ResolvedExtension>;
