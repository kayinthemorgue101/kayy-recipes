#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { build } = require("./build.js");
const { matchRecipe, categoriesOf } = require("./src/filter.js");

build();

const root = __dirname;
const recipes = JSON.parse(fs.readFileSync(path.join(root, "recipes.json"), "utf8"));
let fails = 0;
function assert(cond, msg) {
  if (!cond) {
    fails++;
    console.error("FAIL " + msg);
  }
}

const ids = [
  "plantain-balls", "pastel", "lasagna", "wedges", "potato-salad",
  "guts-rolls", "ghostface", "sausage-ghosts", "magic-mouthwash",
  "hot-cocoa-bark", "nightmare-bark", "cilantro-garlic-oil", "immunity-booster", "citrus-ginger-tea"
];
assert(recipes.map((r) => r.id).join(",") === ids.join(","), "recipe order");
assert(categoriesOf(recipes).join("|") === "Mains|Sides & snacks|Halloween|Remedies|Christmas", "categories come from data, in first-seen order");

const extra = categoriesOf(recipes.concat([{ id: "x", cat: "Midnight snack", name: "n", creator: "c", ingredients: ["a"] }]));
assert(extra[extra.length - 1] === "Midnight snack", "a new category is picked up from the data");

function idsMatching(cat, q) {
  return recipes.filter((r) => matchRecipe(r, cat, q)).map((r) => r.id);
}
assert(idsMatching("All", "").length === 14, "all recipes");
assert(idsMatching("All", "plantain").join(",") === "plantain-balls,lasagna", "plantain is name/ingredient only");
assert(idsMatching("Halloween", "plantain").length === 0, "category and search combine");
assert(idsMatching("All", "straw").length === 0, "steps are not searched");
assert(idsMatching("All", "benzocaine").length === 0, "notes are not searched");
assert(idsMatching("All", "cellophane").length === 0, "hot cocoa note is not searched");
assert(idsMatching("All", "benadryl").join(",") === "magic-mouthwash", "ingredient search is case-insensitive");
assert(idsMatching("All", "  letkadocook ").join(",") === "lasagna", "creator search trims");
assert(idsMatching("Mains", "").length === 3, "mains count");
assert(idsMatching("Christmas", "").join(",") === "hot-cocoa-bark,nightmare-bark", "christmas");
assert(idsMatching("All", "marshmallow").join(",") === "hot-cocoa-bark,nightmare-bark", "marshmallow");
assert(idsMatching("All", "Restaurant").length === 0, "restaurant credit stays in the note, not search");
assert(idsMatching("All", "kayinthemorgue").join(",") === "hot-cocoa-bark,nightmare-bark", "both barks credit her handle");
assert(idsMatching("Christmas", "jack").join(",") === "nightmare-bark", "jack faces ingredient");
assert(idsMatching("Remedies", "").join(",") === "magic-mouthwash,cilantro-garlic-oil,immunity-booster,citrus-ginger-tea", "remedies");
assert(idsMatching("All", "detox").join(",") === "cilantro-garlic-oil", "alt name is searchable");
assert(idsMatching("All", "botulism").length === 0, "warning note is not searched");

const withPhotos = ids.filter((id) => id !== "cilantro-garlic-oil");
for (const id of withPhotos) {
  const file = path.join(root, "photos", id + ".jpg");
  assert(fs.existsSync(file), "photo " + id);
  const buf = fs.readFileSync(file);
  assert(buf.readUInt16BE(0) === 0xffd8, id + " is jpeg");
}
assert(!fs.existsSync(path.join(root, "photos", "cilantro-garlic-oil.jpg")), "oil has no photo yet");
const png = fs.readFileSync(path.join(root, "dist", "placeholder.png"));
assert(png.readUInt32BE(16) === 720 && png.readUInt32BE(20) === 900, "placeholder is 720x900");

const index = fs.readFileSync(path.join(root, "dist", "index.html"), "utf8");
for (const recipe of recipes) {
  assert(index.includes('data-id="' + recipe.id + '"'), "card " + recipe.id);
  assert(index.includes(recipe.name), "name on home " + recipe.id);
}
assert(index.includes("Christmas"), "christmas chip");
assert(index.includes(">All <span class=\"n\">14</span>"), "all count");
assert(index.includes(">Remedies <span class=\"n\">4</span>"), "remedies count");
assert(index.includes("Sides &amp; snacks"), "ampersand escaped");
assert(index.includes("/photos/hot-cocoa-bark.jpg"), "hot cocoa photo on the grid");
assert(index.includes("/photos/nightmare-bark.jpg"), "nightmare photo on the grid");
assert(!index.includes("Concept image"), "concept caption stays off the barks");
assert(index.includes("Photo to come"), "oil uses the placeholder caption");
assert(index.includes("Heavy metal detox oil"), "alt name on the card");
assert(index.includes('href="https://x.com/kayinthemorgue"'), "handle links to X");
assert(!/kaysmorgue\.art|art\.art/i.test(index), "home does not reference the art sites");

const cocoa = fs.readFileSync(path.join(root, "dist", "r", "hot-cocoa-bark.html"), "utf8");
assert(cocoa.includes("Adapted from Restaurant Clicks."), "restaurant credit kept in the note");
assert(cocoa.includes("Girl Scouts"), "hot cocoa note");
assert(cocoa.includes("9x13 pan"), "hot cocoa serves");
assert(cocoa.includes("(estimate) Chill"), "estimate step kept");
assert(cocoa.includes("/photos/hot-cocoa-bark.jpg"), "hot cocoa uses its photo");
assert(!cocoa.includes("Photo to come") && !cocoa.includes("/placeholder.png"), "placeholder caption is gone");
assert(cocoa.includes('class="who" href="https://x.com/kayinthemorgue"'), "hot cocoa creator links to X");
assert(!cocoa.includes("Original on"), "no source button without a url");
assert(cocoa.includes('data-copy="/r/hot-cocoa-bark"'), "copy link");

const nightmare = fs.readFileSync(path.join(root, "dist", "r", "nightmare-bark.html"), "utf8");
assert(nightmare.includes("/photos/nightmare-bark.jpg"), "nightmare photo");
assert(!nightmare.includes("Concept image"), "concept caption removed");
assert(nightmare.includes('class="who" href="https://x.com/kayinthemorgue"'), "nightmare creator links to X");
assert(nightmare.includes("stitched grins"), "nightmare step");
assert(nightmare.includes("Original recipe, amounts are estimates."), "nightmare note verbatim");
assert(!nightmare.includes("Original on"), "nightmare has no source button");
assert(nightmare.includes("og:image"), "og present");
assert(nightmare.includes("https://kayys-cauldron.onrender.com/photos/nightmare-bark.jpg"), "absolute og image");

const oil = fs.readFileSync(path.join(root, "dist", "r", "cilantro-garlic-oil.html"), "utf8");
assert(oil.includes('class="note warn"'), "warning callout");
assert(oil.includes("Fresh garlic and herbs in oil can grow botulism:"), "warning text");
assert(oil.includes("Also shared as <span>Heavy metal detox oil</span>"), "alt name on the recipe");
assert(oil.includes("Unknown source"), "unknown creator");
assert(oil.includes("/placeholder.png") && oil.includes("Photo to come"), "placeholder photo");
assert(!oil.includes("Original on"), "no source link");
assert(oil.includes("refrigerate immediately"), "strain step");

const booster = fs.readFileSync(path.join(root, "dist", "r", "immunity-booster.html"), "utf8");
assert(booster.includes("/photos/immunity-booster.jpg"), "her photo");
assert(booster.includes('class="note warn"'), "fridge warning callout");
assert(booster.includes("Not for babies under 1 (raw honey)."), "honey warning kept");
assert(booster.includes("Kayy's notes"), "creator is her notes");
assert(booster.includes("quarter-sized piece of ginger (like the coin)"), "ginger line verbatim");
assert(booster.includes("Add 1/2 cup of the boiled water (may be less depending on how much room is left in the jar)."), "last step verbatim");
assert(!booster.includes("Original on"), "no source link");

const tea = fs.readFileSync(path.join(root, "dist", "r", "citrus-ginger-tea.html"), "utf8");
assert(tea.includes("/photos/citrus-ginger-tea.jpg"), "tea photo");
assert(tea.includes("Respiratory / throat relief tea"), "tea name");
assert(tea.includes("Grapefruit, lemon &amp; ginger"), "tea subtitle");
assert(tea.includes('class="note warn"'), "medication warning callout");
assert(tea.includes("check with a pharmacist if you take any."), "grapefruit warning kept");
assert(tea.includes("Don't lift the lid while it boils."), "lid step verbatim");
assert(tea.includes("Drink a shot glass 3-6 times a day as needed."), "serving step verbatim");
assert(!/ivermectin|zinc|supplement/i.test(tea), "no supplement dosing");
assert(!tea.includes("Original on"), "tea has no source link");
assert(index.includes("<title>Kayy's Cauldron</title>"), "home title");
assert(index.includes('og:site_name" content="Kayy\'s Cauldron"'), "og site name");
assert(index.includes("KAYY'S <b>CAULDRON</b>"), "wordmark");
assert(!index.includes("Kayy's Box") && !index.includes(">BOX<"), "old name is gone");
assert(nightmare.includes('"@type":"Recipe"') || nightmare.includes('"@type": "Recipe"'), "recipe schema");

const guts = fs.readFileSync(path.join(root, "dist", "r", "guts-rolls.html"), "utf8");
assert(guts.includes("Red velvet"), "guts title");
assert(guts.includes("Original on Instagram"), "source button when url exists");
assert(!guts.includes("Photo to come"), "real photo has no placeholder caption");

const wedges = fs.readFileSync(path.join(root, "dist", "r", "wedges.html"), "utf8");
assert(!wedges.includes('class="note"'), "optional note omitted");

const plantain = fs.readFileSync(path.join(root, "dist", "r", "plantain-balls.html"), "utf8");
assert(plantain.includes("165°F"), "degree sign preserved");
assert(plantain.includes("https://photos.app.goo.gl/nqTZRwCNGq5ZGv6J9"), "source url preserved");

const css = fs.readFileSync(path.join(root, "src", "styles.css"), "utf8");
assert(!/#a78bfa|purple/i.test(css), "palette is not the naka-names purple");
assert(/Orbitron/.test(index) && /JetBrains\+Mono/.test(index), "display and mono fonts");

const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
assert(/recipes\.json/.test(readme) && /photos\//.test(readme), "readme explains adding a recipe");
assert(/render\.yaml|Blueprint/i.test(readme), "readme explains render");
assert(!/kaysmorgue\.art|art\.art/i.test(readme), "readme does not reference the art sites");

if (fails) {
  console.error(fails + " failed");
  process.exit(1);
}
console.log("ok " + recipes.length + " recipes");
