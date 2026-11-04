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
  "plantain-balls",
  "pastel",
  "lasagna",
  "wedges",
  "potato-salad",
  "guts-rolls",
  "ghostface",
  "sausage-ghosts",
  "magic-mouthwash",
  "hot-cocoa-bark",
  "nightmare-bark",
  "immunity-booster",
  "citrus-ginger-tea",
  "turmeric-echinacea-ginger-tea",
  "stuffed-ham-cheese-baguettes",
  "crispy-stuffed-pasta-shells",
  "vanilla-chai"
];
assert(recipes.map((r) => r.id).join(",") === ids.join(","), "recipe order");
assert(categoriesOf(recipes).join("|") === "Kayy's Concoctions|Mains|Sides & snacks|Salad|Halloween|Remedies|Christmas|Bread|Drinks", "categories come from data, in first-seen order");

const extra = categoriesOf(recipes.concat([{ id: "x", cat: "Midnight snack", name: "n", creator: "c", ingredients: ["a"] }]));
assert(extra[extra.length - 1] === "Midnight snack", "a new category is picked up from the data");

function idsMatching(cat, q) {
  return recipes.filter((r) => matchRecipe(r, cat, q)).map((r) => r.id);
}
const n = recipes.length;
const byCat = (c) => recipes.filter((r) => r.cat === c).map((r) => r.id).join(",");
assert(idsMatching("All", "").length === n, "all recipes");
assert(idsMatching("Halloween", "plantain").length === 0, "category and search combine");
assert(idsMatching("All", "HALLOWEEN").join(",") === byCat("Halloween"), "category word is searchable, case-insensitive");
assert(idsMatching("All", "benadryl").join(",") === "magic-mouthwash", "ingredient search is case-insensitive");
assert(idsMatching("All", "  letkadocook ").join(",") === "lasagna", "creator search trims");
assert(idsMatching("All", "ginger").length >= 3, "ginger finds the teas");
assert(idsMatching("All", "cheese").length >= 1, "cheese matches");
assert(idsMatching("All", "cellophane").join(",") === "hot-cocoa-bark", "notes are searched");
assert(idsMatching("All", "stitched grins").join(",") === "nightmare-bark", "steps are searched, multiple words AND");
assert(idsMatching("All", "grins benadryl").length === 0, "AND, not OR");
assert(idsMatching("All", "zzqxnotaword").length === 0, "no matches");
assert(idsMatching("Mains", "").join(",") === byCat("Mains"), "mains");
assert(idsMatching("Christmas", "").join(",") === "hot-cocoa-bark,nightmare-bark", "christmas");
assert(idsMatching("All", "kayinthemorgue").join(",") === recipes.filter((r) => r.creator === "@kayinthemorgue").map((r) => r.id).join(","), "her handle");
assert(idsMatching("Christmas", "jack").join(",") === "nightmare-bark", "jack faces ingredient");
assert(idsMatching("Remedies", "").join(",") === byCat("Remedies"), "remedies");

for (const id of ids) {
  const file = path.join(root, "photos", id + ".jpg");
  assert(fs.existsSync(file), "photo " + id);
  const buf = fs.readFileSync(file);
  assert(buf.readUInt16BE(0) === 0xffd8, id + " is jpeg");
}
const png = fs.readFileSync(path.join(root, "dist", "placeholder.png"));
assert(png.readUInt32BE(16) === 720 && png.readUInt32BE(20) === 900, "placeholder is 720x900");

const index = fs.readFileSync(path.join(root, "dist", "index.html"), "utf8");
for (const recipe of recipes) {
  assert(index.includes('data-id="' + recipe.id + '"'), "card " + recipe.id);
  assert(index.includes(recipe.name), "name on home " + recipe.id);
}
assert(index.includes("Christmas"), "christmas chip");
assert(index.includes('data-chip="Made it"') && index.includes('data-chip="Not yet"'), "made it chips");
assert(index.includes('id="q"') && index.includes("data-clear") && index.includes("data-empty"), "search box, clear, empty");
for (const id of ids) assert(index.includes('data-made="' + id + '"'), "made toggle on card " + id);
assert(index.includes(">All <span class=\"n\">" + n + "</span>"), "all count");
assert(index.includes(">Remedies <span class=\"n\">" + byCat("Remedies").split(",").length + "</span>"), "remedies count");
assert(index.includes("Sides &amp; snacks"), "ampersand escaped");
assert(index.includes("/photos/hot-cocoa-bark.jpg"), "hot cocoa photo on the grid");
assert(index.includes("/photos/nightmare-bark.jpg"), "nightmare photo on the grid");
assert(!index.includes("Concept image"), "concept caption stays off the barks");
assert(index.includes('href="https://x.com/kayinthemorgue"'), "handle links to X");
assert(!/kaysmorgue\.art|art\.art/i.test(index), "home does not reference the art sites");
assert(!/TikTok|Pinterest/.test(index), "homepage has no platform list");

const cocoa = fs.readFileSync(path.join(root, "dist", "r", "hot-cocoa-bark.html"), "utf8");
assert(cocoa.includes("Girl Scouts"), "hot cocoa note");
assert(cocoa.includes("9x13 pan"), "hot cocoa serves");
assert(cocoa.includes("(estimate) Chill"), "estimate step kept");
assert(cocoa.includes("/photos/hot-cocoa-bark.jpg"), "hot cocoa uses its photo");
assert(!cocoa.includes("Photo to come") && !cocoa.includes("/placeholder.png"), "placeholder caption is gone");
assert(cocoa.includes('class="who" href="https://x.com/kayinthemorgue"'), "hot cocoa creator links to X");
assert(!cocoa.includes("Original on"), "no source button without a url");
assert(cocoa.includes('data-copy="/r/hot-cocoa-bark"'), "copy link");
assert(cocoa.includes('data-made="hot-cocoa-bark"') && cocoa.includes("Made it?"), "made toggle on recipe page");

const nightmare = fs.readFileSync(path.join(root, "dist", "r", "nightmare-bark.html"), "utf8");
assert(nightmare.includes("/photos/nightmare-bark.jpg"), "nightmare photo");
assert(!nightmare.includes("Concept image"), "concept caption removed");
assert(nightmare.includes('class="who" href="https://x.com/kayinthemorgue"'), "nightmare creator links to X");
assert(nightmare.includes("stitched grins"), "nightmare step");
assert(nightmare.includes("Original recipe, amounts are estimates."), "nightmare note verbatim");
assert(!nightmare.includes("Original on"), "nightmare has no source button");
assert(nightmare.includes("og:image"), "og present");
assert(nightmare.includes("https://kayyscauldron.xyz/photos/nightmare-bark.jpg"), "absolute og image");

const booster = fs.readFileSync(path.join(root, "dist", "r", "immunity-booster.html"), "utf8");
assert(booster.includes("/photos/immunity-booster.jpg"), "her photo");
assert(booster.includes('class="note warn"'), "fridge warning callout");
assert(booster.includes("Not for babies under 1 (raw honey)"), "honey warning kept");
assert(booster.includes("kayinthemorgue"), "creator is her handle");
assert(booster.includes("quarter-sized piece of ginger (like the coin)"), "ginger line verbatim");
assert(booster.includes("Add 1/2 cup of the boiled water (may be less depending on how much room is left in the jar)."), "last step verbatim");
assert(!booster.includes("Original on"), "no source link");

const tea = fs.readFileSync(path.join(root, "dist", "r", "citrus-ginger-tea.html"), "utf8");
assert(tea.includes("/photos/citrus-ginger-tea.jpg"), "tea photo");
assert(tea.includes("Respiratory / throat relief tea"), "tea name");
assert(tea.includes("Grapefruit, lemon &amp; ginger"), "tea subtitle");
assert(tea.includes('class="note warn"'), "medication warning callout");
assert(tea.includes("Very bitter, so add honey"), "tea note kept");
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
