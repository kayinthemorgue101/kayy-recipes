// Shared by the browser and by node tests. Classic scripts (no type=module)
// so these function declarations are visible to app.js.

function recipeHaystack(recipe) {
  return [recipe.name, recipe.creator]
    .concat(recipe.ingredients || [])
    .join("\n")
    .toLowerCase();
}

function matchRecipe(recipe, cat, q) {
  var needle = String(q || "").trim().toLowerCase();
  var catOk = !cat || cat === "All" || recipe.cat === cat;
  if (!catOk) return false;
  if (!needle) return true;
  return recipeHaystack(recipe).indexOf(needle) !== -1;
}

function categoriesOf(recipes) {
  var cats = [];
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
