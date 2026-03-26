# Static i18n

Build the same page as standalone static sites in multiple languages. One JSON per language, one ZIP per language.

## Setup

### 1. Create your app directory

Create a folder (e.g. `translated/`) with your routes. Pages import translations via the virtual module:

```tsx
import t from "satus:static-translation";

export function meta() {
  return [{ title: t.home.meta.title }];
}

export default function Home() {
  return <h1>{t.home.title}</h1>;
}
```

`t` is fully typed from the valibot schema — autocomplete and compile-time errors.

### 2. Define your schema

Edit `lib/static-i18n/schema.ts` to match your content structure:

```ts
export const TranslationSchema = v.object({
  locale: v.object({
    lang: v.string(),
    dir: v.picklist(["ltr", "rtl"]),
  }),
  home: v.object({
    meta: v.object({ title: v.string(), description: v.string() }),
    title: v.string(),
  }),
  // ...
});
```

### 3. Add translation JSONs

Put your JSON files anywhere in the project:

```
translations/
  en.json
  de.json
  ja.json
  ar.json   ← RTL support via locale.dir
```

Every file must match the schema. The build validates all files before starting.

### 4. Register the Vite plugin

```ts
// vite.config.ts
import { staticI18n } from "./lib/static-i18n/vite-plugin.ts";

export default defineConfig({
  plugins: [..., staticI18n()],
});
```

### 5. Configure React Router

```ts
// react-router.config.ts
import { staticI18nConfig } from "./lib/static-i18n/config.ts";

export default staticI18nConfig({
  appDirectory: "translated",
  prerender: ["/", "/about", "/contact"],
}) ?? defaultConfig;
```

When `BUILD_LANG` is set, this activates SPA mode with pre-rendering. Otherwise falls back to your default config.

### 6. Build

```bash
bun lib/static-i18n/build.ts --translations ./translations
bun lib/static-i18n/build.ts --translations ./translations --concurrency 8
```

## Output

```
output/
  en.zip    # Complete standalone static site
  de.zip
  ja.zip
```

Each ZIP contains `index.html` + `assets/` — host anywhere.

## How it works

1. **Validates** all JSONs against the valibot schema (fails fast before any builds)
2. **Builds** each language in parallel via `BUILD_LANG=xx react-router build`
3. **Vite plugin** inlines the JSON at compile time via `satus:static-translation` virtual module
4. **Zips** each build output into `output/<lang>.zip`
5. **Cleans up** intermediate build files

## `locale.dir` and `locale.lang`

Each JSON includes locale metadata. Use it in your root layout for proper `<html>` attributes:

```tsx
import t from "satus:static-translation";

export function Layout({ children }) {
  return (
    <html lang={t.locale.lang} dir={t.locale.dir}>
      ...
    </html>
  );
}
```

## Files

```
lib/static-i18n/
  schema.ts           # Valibot schema (customize per project)
  config.ts           # React Router config helper
  vite-plugin.ts      # Vite plugin (inlines translation as virtual module)
  build.ts            # Build orchestrator (validate + parallel builds + zip)
  virtual.d.ts        # TypeScript types for the virtual module
  translations/       # Default translations folder (configurable via --translations)
  README.md
```
