const API_BASE = "https://api.tvmaze.com";
const DEFAULT_QUERY = "star trek";
const MAX_RESULTS = 10;

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const statusMessage = document.getElementById("status");
const gallery = document.getElementById("gallery");

class RequestError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "RequestError";
    this.status = status;
  }
}

async function fetchJson(url) {
  let response;

  try {
    response = await fetch(url);
  } catch (error) {
    throw new RequestError("Could not reach TVmaze. Check your internet connection and try again.", 0);
  }

  if (response.status === 429) {
    throw new RequestError("TVmaze is receiving too many requests right now. Please wait a few seconds and try again.", 429);
  }

  if (!response.ok) {
    throw new RequestError(`TVmaze returned an error (HTTP ${response.status}). Please try again later.`, response.status);
  }

  return response.json();
}

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
}

function renderGallery(shows) {
  gallery.replaceChildren();

  for (const show of shows) {
    const card = document.createElement("article");
    card.className = "card";

    const title = document.createElement("h2");
    title.className = "card-title";
    title.textContent = show.name;

    card.append(title);
    gallery.append(card);
  }
}

async function searchShows(query) {
  const trimmedQuery = query.trim();

  if (trimmedQuery === "") {
    gallery.replaceChildren();
    setStatus("Please enter a show title or keyword.", true);
    return;
  }

  gallery.replaceChildren();
  setStatus(`Searching for "${trimmedQuery}"...`);
  searchButton.disabled = true;

  try {
    const url = `${API_BASE}/search/shows?q=${encodeURIComponent(trimmedQuery)}`;
    const results = await fetchJson(url);
    const shows = results.slice(0, MAX_RESULTS).map((result) => result.show);

    if (shows.length === 0) {
      setStatus(`No shows found for "${trimmedQuery}". Try a different title or keyword.`);
      return;
    }

    const label = shows.length === 1 ? "result" : "results";
    setStatus(`Showing ${shows.length} ${label} for "${trimmedQuery}".`);
    renderGallery(shows);
  } catch (error) {
    if (error instanceof RequestError) {
      setStatus(error.message, true);
    } else {
      setStatus("Something went wrong while loading shows. Please try again.", true);
    }
  } finally {
    searchButton.disabled = false;
  }
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  searchShows(searchInput.value);
});

searchInput.value = DEFAULT_QUERY;
searchShows(DEFAULT_QUERY);
