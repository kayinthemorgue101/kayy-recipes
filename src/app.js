
(function () {
  var toastEl = document.getElementById("toast");
  var toastTimer;

  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("on");
    }, 1600);
  }

  function fallbackCopy(url, ok, fail) {
    var ta = document.createElement("textarea");
    ta.value = url;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy") ? ok() : fail();
    } catch (e) {
      fail();
    }
    ta.remove();
  }

  var copyBtn = document.querySelector("[data-copy]");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var url = location.origin + copyBtn.getAttribute("data-copy");
      var ok = function () { toast("Link copied"); };
      var fail = function () { toast("Couldn't copy"); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(ok, function () {
          fallbackCopy(url, ok, fail);
        });
      } else {
        fallbackCopy(url, ok, fail);
      }
    });
  }

  // "Made it" tracker: stored per device in localStorage, no login.
  var MADE_KEY = "kc-made";
  function loadMade() {
    try {
      var v = JSON.parse(localStorage.getItem(MADE_KEY) || "{}");
      return v && typeof v === "object" ? v : {};
    } catch (e) { return {}; }
  }
  var made = loadMade();
  function saveMade() {
    try { localStorage.setItem(MADE_KEY, JSON.stringify(made)); } catch (e) {}
  }
  function paintMade() {
    document.querySelectorAll("[data-made]").forEach(function (b) {
      var on = !!made[b.getAttribute("data-made")];
      b.textContent = on ? "✅ Made it" : "Made it?";
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.classList.toggle("on", on);
    });
  }
  var onMadeChange = function () {};
  document.querySelectorAll("[data-made]").forEach(function (b) {
    b.addEventListener("click", function (e) {
      e.preventDefault();
      var id = b.getAttribute("data-made");
      if (made[id]) delete made[id]; else made[id] = Date.now();
      saveMade();
      paintMade();
      toast(made[id] ? "Marked as made" : "Unmarked");
      onMadeChange();
    });
  });
  window.addEventListener("storage", function (e) {
    if (e.key !== MADE_KEY) return;
    made = loadMade();
    paintMade();
    onMadeChange();
  });
  window.addEventListener("pageshow", function () {
    made = loadMade();
    paintMade();
    onMadeChange();
  });
  paintMade();

  var grid = document.querySelector("[data-grid]");
  if (!grid || typeof matchRecipe !== "function") {
    document.documentElement.classList.remove("boot");
    return;
  }

  var cards = Array.prototype.slice.call(grid.querySelectorAll(".card"));
  var chips = Array.prototype.slice.call(document.querySelectorAll("[data-chip]"));
  var input = document.getElementById("q");
  var clearBtn = document.querySelector("[data-clear]");
  var countEl = document.querySelector("[data-count]");
  var emptyEl = document.querySelector("[data-empty]");
  var dataEl = document.getElementById("recipe-data");
  var recipes = [];

  try {
    recipes = JSON.parse(dataEl.textContent);
  } catch (e) {
    document.documentElement.classList.remove("boot");
    return;
  }

  var byId = {};
  recipes.forEach(function (recipe) {
    byId[recipe.id] = recipe;
  });

  var params = new URLSearchParams(location.search);
  var cat = params.get("cat") || "All";
  var q = params.get("q") || "";
  var known = {};

  chips.forEach(function (chip) {
    known[chip.getAttribute("data-chip")] = true;
  });

  if (!known[cat]) cat = "All";
  if (input) input.value = q;

  function syncUrl() {
    var url = new URL(location.href);

    if (cat && cat !== "All") {
      url.searchParams.set("cat", cat);
    } else {
      url.searchParams.delete("cat");
    }

    if (q.trim()) {
      url.searchParams.set("q", q.trim());
    } else {
      url.searchParams.delete("q");
    }

    var next = url.pathname + url.search;
    if (next !== location.pathname + location.search) {
      history.replaceState({}, "", next);
    }
  }

  function inCat(recipe, c) {
    if (c === "Made it") return !!made[recipe.id];
    if (c === "Not yet") return !made[recipe.id];
    return matchRecipe(recipe, c, "");
  }

  function apply() {
    var counts = { All: 0, "Made it": 0, "Not yet": 0 };

    recipes.forEach(function (recipe) {
      if (!matchRecipe(recipe, "All", q)) return;

      counts.All++;

      counts[recipe.cat] = (counts[recipe.cat] || 0) + 1;
      if (made[recipe.id]) counts["Made it"]++; else counts["Not yet"]++;

      // Original recipes also belong to Kayy's Concoctions.
      if (recipe.original === true) {
        counts["Kayy's Concoctions"] =
          (counts["Kayy's Concoctions"] || 0) + 1;
      }
    });

    chips.forEach(function (chip) {
      var name = chip.getAttribute("data-chip");
      var n = counts[name] || 0;
      var num = chip.querySelector(".n");

      if (num) num.textContent = String(n);

      var on = name === cat;
      chip.classList.toggle("on", on);
      chip.setAttribute("aria-pressed", on ? "true" : "false");
      chip.disabled = n === 0 && !on && name !== "Made it";
    });

    var shown = 0;

    cards.forEach(function (card) {
      var recipe = byId[card.getAttribute("data-id")];
      var visible = !!(recipe && matchRecipe(recipe, "All", q) && inCat(recipe, cat));

      card.hidden = !visible;
      if (visible) shown++;
    });

    if (countEl) {
      countEl.textContent =
        shown + (shown === 1 ? " recipe" : " recipes");
    }

    if (emptyEl) {
      emptyEl.hidden = shown !== 0;

      if (shown === 0) {
        emptyEl.textContent = cat === "Made it" && !q.trim()
          ? "Nothing marked as made yet. Tap “Made it?” on a recipe."
          : cat && cat !== "All"
          ? "Nothing in " + cat + " matches that."
          : "Nothing in the cauldron matches that.";
      }
    }

    if (clearBtn) clearBtn.hidden = !q.trim();

    document.documentElement.classList.remove("boot");
    syncUrl();
  }

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      if (chip.disabled) return;

      cat = chip.getAttribute("data-chip");
      apply();
    });
  });

  var form = document.querySelector(".search");

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
    });
  }

  if (input) {
    input.addEventListener("input", function () {
      q = input.value;
      apply();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      q = "";

      if (input) {
        input.value = "";
        input.focus();
      }

      apply();
    });
  }

  onMadeChange = apply;
  apply();
})();
