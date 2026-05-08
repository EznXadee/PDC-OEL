const state = {
  q: "",
  page: 1,
  category: "",
  access_type: "",
  year: "",
  sort: "relevance",
  numFound: 0,
};

const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const suggestionsBox = document.getElementById("suggestions");
const resultsMeta = document.getElementById("resultsMeta");
const resultsList = document.getElementById("results");
const categoryFacets = document.getElementById("categoryFacets");
const accessSelect = document.getElementById("accessSelect");
const yearSelect = document.getElementById("yearSelect");
const sortSelect = document.getElementById("sortSelect");
const prevButton = document.getElementById("prevButton");
const nextButton = document.getElementById("nextButton");
const pageIndicator = document.getElementById("pageIndicator");

let suggestionTimer;

function buildSearchParams() {
  const params = new URLSearchParams();
  params.set("q", state.q || "*:*");
  params.set("page", String(state.page));
  params.set("sort", state.sort);
  if (state.category) params.set("category", state.category);
  if (state.access_type) params.set("access_type", state.access_type);
  if (state.year) params.set("year", state.year);
  return params;
}

function renderResults(payload) {
  resultsList.innerHTML = "";
  state.numFound = payload.numFound;
  pageIndicator.textContent = `Page ${state.page}`;
  resultsMeta.textContent = `${payload.numFound} results found in ${payload.qTime} ms`;

  if (!payload.docs.length) {
    resultsList.innerHTML = `<div class="empty-state">No records matched the current query and filters.</div>`;
    return;
  }

  payload.docs.forEach((doc) => {
    const card = document.createElement("article");
    card.className = "result-card";
    card.innerHTML = `
      <h3>${doc.title_highlight}</h3>
      <div class="result-meta">
        <span class="pill">${doc.category}</span>
        <span class="pill">${doc.year}</span>
        <span class="pill">${doc.document_type}</span>
        <span class="pill">${doc.access_type}</span>
        <span class="pill">Citations ${doc.citations}</span>
      </div>
      <p>${doc.abstract_highlight}</p>
      <a class="result-link" href="${doc.url}" target="_blank" rel="noreferrer">Open record</a>
    `;
    resultsList.appendChild(card);
  });
}

function fillSelect(select, buckets, currentValue, defaultLabel) {
  const previous = currentValue || "";
  select.innerHTML = `<option value="">${defaultLabel}</option>`;
  buckets.forEach((bucket) => {
    const option = document.createElement("option");
    option.value = bucket.val;
    option.textContent = `${bucket.val} (${bucket.count})`;
    if (String(bucket.val) === String(previous)) {
      option.selected = true;
    }
    select.appendChild(option);
  });
}

function renderFacets(payload) {
  const facets = payload.facets || {};
  const categoryBuckets = facets.category ? facets.category.buckets || [] : [];
  const accessBuckets = facets.access_type ? facets.access_type.buckets || [] : [];
  const yearBuckets = facets.year ? facets.year.buckets || [] : [];

  categoryFacets.innerHTML = "";
  categoryBuckets.forEach((bucket) => {
    const button = document.createElement("button");
    button.className = `facet-item${state.category === bucket.val ? " active" : ""}`;
    button.innerHTML = `<span>${bucket.val}</span><strong>${bucket.count}</strong>`;
    button.addEventListener("click", () => {
      state.category = state.category === bucket.val ? "" : bucket.val;
      state.page = 1;
      runSearch();
    });
    categoryFacets.appendChild(button);
  });

  fillSelect(accessSelect, accessBuckets, state.access_type, "All Access Types");
  fillSelect(yearSelect, yearBuckets, state.year, "All Years");
}

async function runSearch() {
  const response = await fetch(`/api/search?${buildSearchParams().toString()}`);
  const payload = await response.json();
  renderResults(payload);
  renderFacets(payload);
  prevButton.disabled = state.page === 1;
  nextButton.disabled = state.page * 6 >= state.numFound;
}

async function loadSuggestions(term) {
  if (!term.trim()) {
    suggestionsBox.innerHTML = "";
    return;
  }

  const response = await fetch(`/api/suggest?term=${encodeURIComponent(term)}`);
  const payload = await response.json();
  suggestionsBox.innerHTML = "";

  payload.suggestions.forEach((text) => {
    const item = document.createElement("div");
    item.className = "suggestion-item";
    item.textContent = text;
    item.addEventListener("click", () => {
      searchInput.value = text;
      state.q = text;
      state.page = 1;
      suggestionsBox.innerHTML = "";
      runSearch();
    });
    suggestionsBox.appendChild(item);
  });
}

searchButton.addEventListener("click", () => {
  state.q = searchInput.value.trim();
  state.page = 1;
  runSearch();
});

searchInput.addEventListener("input", () => {
  state.q = searchInput.value.trim();
  clearTimeout(suggestionTimer);
  suggestionTimer = setTimeout(() => loadSuggestions(searchInput.value), 220);
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    state.q = searchInput.value.trim();
    state.page = 1;
    suggestionsBox.innerHTML = "";
    runSearch();
  }
});

sortSelect.addEventListener("change", () => {
  state.sort = sortSelect.value;
  state.page = 1;
  runSearch();
});

accessSelect.addEventListener("change", () => {
  state.access_type = accessSelect.value;
  state.page = 1;
  runSearch();
});

yearSelect.addEventListener("change", () => {
  state.year = yearSelect.value;
  state.page = 1;
  runSearch();
});

prevButton.addEventListener("click", () => {
  if (state.page > 1) {
    state.page -= 1;
    runSearch();
  }
});

nextButton.addEventListener("click", () => {
  if (state.page * 6 < state.numFound) {
    state.page += 1;
    runSearch();
  }
});

document.addEventListener("click", (event) => {
  if (!suggestionsBox.contains(event.target) && event.target !== searchInput) {
    suggestionsBox.innerHTML = "";
  }
});

runSearch();
