#!/usr/bin/env node
// Kayy's Cauldron — complete site builder.
// Builds the public website from recipes.json and photos/.

const fs = require("fs");
const path = require("path");
const { categoriesOf } = require("./src/filter.js");
const { createPlaceholder } = require("./src/placeholder.js");

const root = __dirname;
const dist = path.join(root, "dist");

const SITE_NAME = "Kayy's Cauldron";
const SITE_URL = "https://kayyscauldron.xyz";
const CONCOCTIONS = "Kayy's Concoctions";
const KAYY_X = "https://x.com/kayinthemorgue";

const ACCENTS = [
  "#ff5a4a",
  "#ff8a3d",
  "#e7b15a",
  "#d9cbb8",
  "#f0d27a"
];

function escText(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escAttr(value) {
  return escText(value).replace(/"/g, "&quot;");
}

function safeUrl(value) {
  if (typeof value !== "string") return "";
  const url = value.trim();
  return /^https?:\/\//i.test(url) ? url : "";
}

function displayCreator(creator) {
  if (
    creator === "@kayinthemorgue" ||
    creator === "@kayy"
  ) {
    return "@kayy";
  }
  return creator;
}

function creatorHref(creator) {
  if (
    creator === "@kayinthemorgue" ||
    creator === "@kayy"
  ) {
    return KAYY_X;
  }
  return "";
}

function creatorName(creator) {
  const name = escText(displayCreator(creator));
  const href = creatorHref(creator);

  if (!href) {
    return '<span class="who">' + name + "</span>";
  }

  return '<a class="who" href="' +
    escAttr(href) +
    '" target="_blank" rel="noopener noreferrer">' +
    name + "</a>";
}

function originalByline(recipe) {
  if (recipe.original === true) {
    return creatorName(recipe.creator);
  }

  const who = creatorName(recipe.creator);

  if (recipe.platform) {
    return who +
      ' <span class="on">on ' +
      escText(recipe.platform) +
      "</span>";
  }

  return who;
}

function photoFile(recipe) {
  return path.join(root, "photos", recipe.id + ".jpg");
}

function hasPhoto(recipe) {
  return fs.existsSync(photoFile(recipe));
}

function imagePath(recipe) {
  return hasPhoto(recipe)
    ? "/photos/" + recipe.id + ".jpg"
    : "/placeholder.png";
}

function captionFor(recipe) {
  if (recipe.imageCaption) {
    return String(recipe.imageCaption);
  }
  if (!hasPhoto(recipe)) {
    return "Photo to come";
  }
  return "";
}

function describe(recipe) {
  const who = recipe.platform && !recipe.original
    ? displayCreator(recipe.creator) +
      " on " + recipe.platform
    : displayCreator(recipe.creator);

  return recipe.cat + " from " + who +
    ". Makes " + recipe.serves +
    ". " + recipe.time + ".";
}

function accentFor(cat, cats) {
  const i = Math.max(0, cats.indexOf(cat));
  return ACCENTS[i % ACCENTS.length];
}

function validate(recipes) {
  if (!Array.isArray(recipes) || !recipes.length) {
    throw new Error("recipes.json must contain recipes");
  }

  const ids = new Set();

  for (const recipe of recipes) {
    for (const field of [
      "id", "name", "cat", "creator", "serves", "time"
    ]) {
      if (
        typeof recipe[field] !== "string" ||
        !recipe[field].trim()
      ) {
        throw new Error(
          "Missing " + field + " in " + recipe.id
        );
      }
    }

    if (!/^[a-z0-9-]+$/.test(recipe.id)) {
      throw new Error("Invalid recipe ID: " + recipe.id);
    }

    if (ids.has(recipe.id)) {
      throw new Error("Duplicate recipe: " + recipe.id);
    }

    ids.add(recipe.id);

    if (
      !Array.isArray(recipe.ingredients) ||
      !recipe.ingredients.length
    ) {
      throw new Error(recipe.id + " needs ingredients");
    }

    if (
      !Array.isArray(recipe.steps) ||
      !recipe.steps.length
    ) {
      throw new Error(recipe.id + " needs steps");
    }
  }
}

function jsonForScript(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function page(opts) {
  const boot = opts.boot
    ? '<script>document.documentElement.classList.add("boot");</script>'
    : "";

  const jsonLd = opts.jsonLd
    ? '<script type="application/ld+json">' +
      jsonForScript(opts.jsonLd) +
      "</script>"
    : "";

  const data = opts.recipes
    ? '<script id="recipe-data" type="application/json">' +
      jsonForScript(opts.recipes) +
      '</script><script src="/filter.js"></script>'
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0b0a09">
<meta name="color-scheme" content="dark">
<title>${escText(opts.title)}</title>
<meta name="description" content="${escAttr(opts.description)}">
<link rel="canonical" href="${escAttr(opts.canonical)}">
<meta property="og:site_name" content="${escAttr(SITE_NAME)}">
<meta property="og:type" content="${escAttr(opts.ogType || "website")}">
<meta property="og:title" content="${escAttr(opts.title)}">
<meta property="og:description" content="${escAttr(opts.description)}">
<meta property="og:url" content="${escAttr(opts.canonical)}">
<meta property="og:image" content="${escAttr(opts.image)}">
<meta property="og:image:width" content="720">
<meta property="og:image:height" content="900">
<meta property="og:image:alt" content="${escAttr(opts.imageAlt || SITE_NAME)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escAttr(opts.title)}">
<meta name="twitter:description" content="${escAttr(opts.description)}">
<meta name="twitter:image" content="${escAttr(opts.image)}">
<meta name="twitter:image:alt" content="${escAttr(opts.imageAlt || SITE_NAME)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Orbitron:wght@700;800&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
${boot}
</head>
<body>
<a class="skip" href="#main">${opts.skip || "Skip to recipes"}</a>

<header class="top">
  <div class="top-inner">
    <a class="brand" href="/">
      <svg class="mark" width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M11 9.2c1.1-1.5 1.1-2.3 0-3.8M16 8.6c1.3-1.6 1.3-2.5 0-4.1M21 9.2c1.1-1.5 1.1-2.3 0-3.8" fill="none" stroke="#f3e2c8" stroke-width="1.3" stroke-linecap="round" opacity=".85"/>
        <ellipse cx="16" cy="13" rx="9.2" ry="2.15" fill="#f3e2c8"/>
        <ellipse cx="16" cy="13" rx="6.3" ry="1.2" fill="#1a1210"/>
        <path d="M7.6 13.4h16.8c-.35 6.4-2.7 10.4-8.4 10.4s-8.05-4-8.4-10.4z" fill="#241c18" stroke="#e23b2e" stroke-width=".8"/>
        <ellipse cx="16" cy="26.2" rx="3.4" ry="1.15" fill="#e23b2e"/>
        <ellipse cx="16" cy="25.7" rx="1.5" ry=".6" fill="#ff8a3d"/>
      </svg>
      <span class="brand-name">KAYY'S <b>CAULDRON</b></span>
    </a>
    <a class="handle" href="${KAYY_X}" target="_blank" rel="noopener noreferrer">@kayy</a>
  </div>
</header>

${opts.main}

<footer class="foot">
  <div class="foot-inner">
    <p class="mark-name">KAYY'S <b>CAULDRON</b></p>
    <p class="mark-by">Curated by <a href="${KAYY_X}" target="_blank" rel="noopener noreferrer">@kayy</a></p>
    <p class="mark-note">Cooking is an art. The camera roll is where recipes go to die.</p>
  </div>
</footer>

<div id="toast" role="status"></div>
${data}
<script src="/app.js"></script>
${jsonLd}
</body>
</html>`;
}

function card(recipe, cats) {
  const caption = captionFor(recipe);

  const badge = caption
    ? '<span class="badge" aria-hidden="true">' +
      escText(caption) + "</span>"
    : "";

  const href = creatorHref(recipe.creator);
  const name = escText(displayCreator(recipe.creator));
  const credit = name;

  const by = href
    ? '<a class="by" href="' + escAttr(href) +
      '" target="_blank" rel="noopener noreferrer">' +
      credit + "</a>"
    : '<span class="by">' + credit + "</span>";

  const akaLine = recipe.aka || recipe.subtitle;
  const aka = akaLine
    ? '<span class="aka">' +
      escText(akaLine) +
      "</span>"
    : "";

  return `<article class="card" data-id="${escAttr(recipe.id)}" style="--c:${accentFor(recipe.cat, cats)}">
  <a class="card-link" href="/r/${recipe.id}">
    <span class="shot">
      <img src="${imagePath(recipe)}" width="720" height="900" alt="" loading="lazy" decoding="async">
      ${badge}
    </span>
    <span class="card-body">
      <span class="cat">${escText(recipe.cat)}</span>
      <span class="name">${escText(recipe.name)}</span>
      ${aka}
    </span>
  </a>
  ${by}
</article>`;
}

function homeMain(recipes, cats) {
  const originalCount = recipes.filter(
    (recipe) => recipe.original === true
  ).length;

  const otherCategories = cats.filter(
    (cat) => cat !== CONCOCTIONS && cat !== "All"
  );

  const chips = [
    {
      name: CONCOCTIONS,
      count: originalCount
    },
    ...otherCategories.map((cat) => ({
      name: cat,
      count: recipes.filter(
        (recipe) => recipe.cat === cat
      ).length
    })),
    {
      name: "All",
      count: recipes.length
    }
  ].map((chip, i) => {
    const on = i === 0;

    return `<button type="button" class="chip${on ? " on" : ""}" data-chip="${escAttr(chip.name)}" aria-pressed="${on ? "true" : "false"}">${escText(chip.name)} <span class="n">${chip.count}</span></button>`;
  }).join("\n");

  const cards = recipes.map((recipe, i) => {
    const html = card(recipe, cats);
    return i === 0
      ? html.replace('loading="lazy"', 'fetchpriority="high"')
      : html;
  }).join("\n");

  return `<main id="main">
  <section class="hero">
    <h1>Don't lose <em>another one</em>.</h1>
    <p class="lede">Recipes saved before the screenshots buried them. Sorted by category, photo still attached, original post one tap away.</p>
  </section>

  <div class="tools">
    <div class="chips" role="toolbar" aria-label="Filter by category">
      ${chips}
    </div>

    <form class="search" role="search" action="/" method="get">
      <label class="sr" for="q">Search by dish, creator, or ingredient</label>
      <svg class="mag" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/>
        <path d="M16 16l5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <input id="q" name="q" type="search" placeholder="Dish, creator, or ingredient" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false">
      <button type="button" class="clear" data-clear hidden aria-label="Clear search">×</button>
    </form>
  </div>

  <noscript>
    <p class="noscript">Filtering and search need JavaScript. Every recipe is still listed below.</p>
    <style>html.boot .grid{visibility:visible}</style>
  </noscript>

  <p class="concoctions-tagline" data-concoctions-tagline hidden>Straight from my cauldron. No borrowed spells.</p>
  <p class="count" data-count aria-live="polite">${originalCount} recipes</p>
  <p class="empty" data-empty hidden>Nothing in the cauldron matches that.</p>

  <div class="grid" data-grid>
${cards}
  </div>
</main>

<script>
(function () {
  var tagline = document.querySelector("[data-concoctions-tagline]");
  if (!tagline) return;

  function updateTagline() {
    var active = document.querySelector("[data-chip].on");
    var selected = active &&
      active.getAttribute("data-chip") === ${JSON.stringify(CONCOCTIONS)};
    tagline.hidden = !selected;
  }

  var chips = document.querySelectorAll("[data-chip]");

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      setTimeout(updateTagline, 0);
    });
  });

  var observer = new MutationObserver(updateTagline);

  chips.forEach(function (chip) {
    observer.observe(chip, {
      attributes: true,
      attributeFilter: ["class"]
    });
  });

  updateTagline();
})();
</script>`;
}

function recipeMain(recipe, cats) {
  const caption = captionFor(recipe);

  const fig = caption
    ? "<figcaption>" + escText(caption) + "</figcaption>"
    : "";

  const note = recipe.note
    ? `<aside class="note${recipe.warning ? " warn" : ""}">
        <p class="note-k">${recipe.warning ? "Warning" : "Note"}</p>
        <p>${escText(recipe.note)}</p>
      </aside>`
    : "";

  const aka = recipe.aka
    ? '<p class="aka">Also shared as <span>' +
      escText(recipe.aka) + "</span></p>"
    : recipe.subtitle
      ? '<p class="aka">' +
        escText(recipe.subtitle) +
        "</p>"
      : "";

  const ingredients = recipe.ingredients.map(
    (item) => "<li>" + escText(item) + "</li>"
  ).join("");

  const steps = recipe.steps.map(
    (item) => "<li>" + escText(item) + "</li>"
  ).join("");

  const url = safeUrl(recipe.url);

  const source = url
    ? `<a class="btn" href="${escAttr(url)}" target="_blank" rel="noopener noreferrer">Original on ${escText(recipe.platform || "the post")}<span class="sr"> (opens in a new tab)</span><span aria-hidden="true"> ↗</span></a>`
    : "";

  return `<main id="main">
  <a class="back" href="/">← Back to the cauldron</a>

  <article class="recipe" style="--c:${accentFor(recipe.cat, cats)}">
    <div class="layout">
      <figure class="hero-shot">
        <img src="${imagePath(recipe)}" width="720" height="900" alt="" fetchpriority="high" decoding="async">
        ${fig}
      </figure>

      <div class="recipe-copy">
        <p class="cat">${escText(recipe.cat)}</p>
        <h1>${escText(recipe.name)}</h1>
        ${aka}
        <p class="by">${originalByline(recipe)}</p>

        ${recipe.warning ? note : ""}

        <dl class="facts">
          <div>
            <dt>Makes</dt>
            <dd>${escText(recipe.serves)}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>${escText(recipe.time)}</dd>
          </div>
        </dl>

        ${recipe.warning ? "" : note}

        <h2>Ingredients <span class="h-n">${recipe.ingredients.length}</span></h2>
        <ul class="ings">${ingredients}</ul>

        <h2>Steps <span class="h-n">${recipe.steps.length}</span></h2>
        <ol class="steps">${steps}</ol>

        <div class="actions">
          ${source}
          <button type="button" class="btn ghost" data-copy="/r/${recipe.id}">Copy link</button>
        </div>
      </div>
    </div>
  </article>
</main>`;
}

function recipeJsonLd(recipe, siteUrl) {
  const url = safeUrl(recipe.url);

  const data = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.name,
    image: [siteUrl + imagePath(recipe)],
    author: Object.assign(
      {
        "@type": "Person",
        name: displayCreator(recipe.creator)
      },
      creatorHref(recipe.creator)
        ? { url: creatorHref(recipe.creator) }
        : {}
    ),
    recipeYield: recipe.serves,
    recipeCategory: recipe.cat,
    recipeIngredient: recipe.ingredients,
    recipeInstructions: recipe.steps.map(
      (step) => ({
        "@type": "HowToStep",
        text: step
      })
    ),
    description: describe(recipe),
    url: siteUrl + "/r/" + recipe.id
  };

  if (url) {
    data.isBasedOn = url;
  }

  return data;
}

function build() {
  const recipes = JSON.parse(
    fs.readFileSync(
      path.join(root, "recipes.json"),
      "utf8"
    )
  );

  validate(recipes);

  const cats = categoriesOf(recipes);
  const siteUrl = SITE_URL;

  fs.rmSync(dist, {
    recursive: true,
    force: true
  });

  fs.mkdirSync(
    path.join(dist, "photos"),
    { recursive: true }
  );

  fs.mkdirSync(
    path.join(dist, "r"),
    { recursive: true }
  );

  for (const file of fs.readdirSync(
    path.join(root, "photos")
  )) {
    if (file.endsWith(".jpg")) {
      fs.copyFileSync(
        path.join(root, "photos", file),
        path.join(dist, "photos", file)
      );
    }
  }

  fs.writeFileSync(
    path.join(dist, "placeholder.png"),
    createPlaceholder()
  );

  fs.copyFileSync(
    path.join(root, "src", "styles.css"),
    path.join(dist, "styles.css")
  );

  // Set Concoctions as the default category.
  // No changes to src/app.js are necessary.
  let appJs = fs.readFileSync(
    path.join(root, "src", "app.js"),
    "utf8"
  );

  const oldDefault =
    'var cat = params.get("cat") || "All";';

  const newDefault =
    "var cat = params.get('cat') || \"Kayy's Concoctions\";";

  if (!appJs.includes(oldDefault)) {
    throw new Error(
      "Cannot locate the category default in src/app.js"
    );
  }

  appJs = appJs.replace(oldDefault, newDefault);

  fs.writeFileSync(
    path.join(dist, "app.js"),
    appJs
  );

  fs.copyFileSync(
    path.join(root, "src", "filter.js"),
    path.join(dist, "filter.js")
  );

  fs.copyFileSync(
    path.join(root, "src", "favicon.svg"),
    path.join(dist, "favicon.svg")
  );

  fs.copyFileSync(
    path.join(root, "recipes.json"),
    path.join(dist, "recipes.json")
  );

  const homeDescription =
    "Kayy's Cauldron. Original concoctions, recipes, remedies, and delicious discoveries.";

  const homeImage =
    siteUrl + "/photos/guts-rolls.jpg";

  fs.writeFileSync(
    path.join(dist, "index.html"),
    page({
      title: SITE_NAME,
      description: homeDescription,
      canonical: siteUrl + "/",
      image: homeImage,
      imageAlt: "Red velvet guts cinnamon rolls",
      boot: true,
      recipes: recipes,
      main: homeMain(recipes, cats)
    })
  );

  for (const recipe of recipes) {
    const title = recipe.name + " — " + SITE_NAME;
    const description = describe(recipe);

    fs.writeFileSync(
      path.join(dist, "r", recipe.id + ".html"),
      page({
        title: title,
        description: description,
        canonical: siteUrl + "/r/" + recipe.id,
        image: siteUrl + imagePath(recipe),
        imageAlt: captionFor(recipe)
          ? recipe.name + ". " +
            captionFor(recipe) + "."
          : recipe.name,
        ogType: "article",
        skip: "Skip to recipe",
        jsonLd: recipeJsonLd(recipe, siteUrl),
        main: recipeMain(recipe, cats)
      })
    );
  }

  fs.writeFileSync(
    path.join(dist, "404.html"),
    page({
      title: "Not in the cauldron — " + SITE_NAME,
      description:
        "That link isn't a recipe in Kayy's Cauldron.",
      canonical: siteUrl + "/",
      image: homeImage,
      imageAlt: SITE_NAME,
      main: `<main id="main" class="missing">
  <p class="eyebrow">404</p>
  <h1>Not in the cauldron.</h1>
  <p class="lede">That link isn't a recipe here. It may have been renamed, or it never made the cut.</p>
  <a class="btn" href="/">Back to the cauldron</a>
</main>`
    })
  );

  console.log(
    "Built " + recipes.length +
    " recipes for " + SITE_URL
  );
}

if (require.main === module) {
  build();
}

module.exports = {
  build,
  validate,
  safeUrl,
  escText
};
