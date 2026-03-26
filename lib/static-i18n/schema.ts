import * as v from "valibot";

/**
 * Define the shape of your translation JSON files here.
 * Every language JSON must match this schema exactly.
 */
export const TranslationSchema = v.object({
  locale: v.object({
    lang: v.string(),
    dir: v.picklist(["ltr", "rtl"]),
  }),
  home: v.object({
    meta: v.object({ title: v.string(), description: v.string() }),
    title: v.string(),
    subtitle: v.string(),
  }),
  about: v.object({
    meta: v.object({ title: v.string(), description: v.string() }),
    title: v.string(),
    text1: v.string(),
    text2: v.string(),
  }),
  contact: v.object({
    meta: v.object({ title: v.string(), description: v.string() }),
    title: v.string(),
    body: v.string(),
  }),
});

export type Translation = v.InferOutput<typeof TranslationSchema>;
