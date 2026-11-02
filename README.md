# Kayy's Cauldron

Recipes for [@kayinthemorgue](https://x.com/kayinthemorgue), saved from Instagram, X, TikTok, and Pinterest. Sorted by category, each with a photo, and one shareable link per recipe.

Static site. No backend, no dependencies, no secrets.

## Preview locally

Requires Node.js.

```bash
node build.js
node serve.js
```

Open http://localhost:4173

`node test.js` rebuilds the site and checks recipes, photos, search, and category chips.

`serve.js` maps `/r/<id>` to the recipe page, the same way Render does. Opening the HTML files directly will not load the styles or photos, because those paths start at the site root.

## Add a recipe

Adding a recipe is one entry in `recipes.json` and, if you have one, one photo. Push to the branch Render is watching and it rebuilds.

1. Append an object to the array in `recipes.json`.
2. Save a photo as `photos/<id>.jpg`. The current photos are 720×900. Other sizes work; portrait frames fit the cards. The file name has to be the recipe `id` plus `.jpg`.
3. If you don't have a photo yet, skip it. The card uses a placeholder and says "Photo to come" until `photos/<id>.jpg` exists.

Categories are not listed anywhere in the code. Filter chips are whatever shows up in the `cat` field, in the order each value first appears. A new category gets its own chip, with a count, on the next build.

### Fields

| Field | Required | What to put |
| --- | --- | --- |
| `id` | yes | URL slug. Lowercase letters, numbers, and dashes. This is also the photo file name. |
| `name` | yes | The dish name, as you want it shown. |
| `cat` | yes | Category label. Reuse one (`Mains`, `Sides & snacks`, `Halloween`, `Remedies`, `Christmas`) or type a new one. |
| `creator` | yes | Who it's from. `@kayinthemorgue` links to [her X profile](https://x.com/kayinthemorgue). |
| `platform` | no | `Instagram`, `X`, `TikTok`, `Pinterest`, and so on. Leave it off if there isn't one. |
| `url` | no | Link to the original post. Leave it off, or use an empty string, and the "Original on …" button is hidden. |
| `serves` | yes | How much it makes. |
| `time` | yes | How long it takes, in plain language. |
| `note` | no | Estimates, warnings, or anything she should see before cooking. |
| `warning` | no | Set to `true` and the note renders as a warning callout above the recipe. |
| `aka` | no | Alternate name. Shown under the title, and included in search. |
| `imageCaption` | no | Small label on the photo, such as `Concept image`. |
| `ingredients` | yes | Array of strings. Don't rewrite them; the page prints each string as-is. |
| `steps` | yes | Array of strings, in order. Same rule. |

Example, with no post to link and no photo yet:

```json
{
  "id": "hot-cocoa-bark",
  "name": "Hot cocoa bark",
  "cat": "Christmas",
  "creator": "@kayinthemorgue",
  "serves": "~24 pieces (9x13 pan)",
  "time": "15 min + 30 min chill",
  "note": "Optional note.",
  "ingredients": ["16 oz milk chocolate, chopped"],
  "steps": ["Line a 9x13 pan with parchment paper."]
}
```

## Deploy on Render

The repo includes a [Blueprint](https://render.com/docs/blueprint-spec) at `render.yaml`: a static web service, build command `node build.js`, publish directory `dist`.

1. Push this repo to GitHub.
2. In the Render dashboard, choose **New → Blueprint** and select this repo. Render reads `render.yaml` and creates the site.
3. When the deploy finishes, open the service URL.

Each recipe lives at `/r/<id>` (for example `/r/guts-rolls`). The blueprint rewrites `/r/*` to `/r/*.html`, so those links resolve without a server. Render serves real files first, then applies the rewrite.

`SITE_URL` in `render.yaml` is `https://kayys-cauldron.onrender.com`. Open Graph and Twitter card images are absolute URLs built from that origin. If the public URL is different (another service name, or a custom domain), change `SITE_URL` to that origin with no trailing slash and redeploy. Link previews need the absolute image address.

### Manual setup

If you create the static site by hand instead of with the Blueprint:

- Build command: `node build.js`
- Publish directory: `dist`
- Rewrite rule: source `/r/*`, destination `/r/*.html`, action **Rewrite**
- Environment variable: `SITE_URL` set to the public origin

There is nothing to keep secret and nothing to run after the static files are published.

## Layout

- `recipes.json` — the recipes
- `photos/` — one `<id>.jpg` per recipe that has a picture
- `src/` — styles, filtering, and the drawn placeholder
- `build.js` — writes the site into `dist/`
- `serve.js` — local preview
- `render.yaml` — Render Blueprint
