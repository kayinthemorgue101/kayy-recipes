// Shared by the browser and by node tests. Classic scripts (no type=module)
// so these function declarations are visible to app.js.

function recipeHaystack(recipe) {
  return [recipe.name, recipe.aka, recipe.subtitle, recipe.cat, recipe.creator, recipe.note]
    .concat(recipe.ingredients || [], recipe.steps || [])
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

function matchRecipe(recipe, cat, q) {
  var needle = String(q || "").trim().toLowerCase();
  var catOk = !cat || cat === "All" ||
  (cat === "Kayy's Concoctions" ? recipe.original === true : recipe.cat === cat);
  if (!catOk) return false;
  if (!needle) return true;
  var hay = recipeHaystack(recipe);
  // Every word must appear somewhere (AND).
  return needle.split(/\s+/).every(function (word) {
    return hay.indexOf(word) !== -1;
  });
}

function categoriesOf(recipes) {
  var cats = [];
if (recipes.some(function(recipe) {
  return recipe.original === true;
})) {
  cats.push("Kayy's Concoctions");
}
  for (var i = 0; i < recipes.length; i++) {
    if (cats.indexOf(recipes[i].cat) === -1) cats.push(recipes[i].cat);
  }
  return cats;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    recipeHaystack: recipeHaystack,
    matchRecipe: matchRecipe,
    categoriesOf: categoriesOf
  };
}
