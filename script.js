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

const NOT_AVAILABLE = "Not available";
const SUMMARY_LENGTH = 200;

function stripHtml(html) {
  if (!html) {
    return "";
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent.trim();
}

function shortenText(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength).trimEnd() + "...";
}

function formatPremiered(dateString) {
  if (!dateString) {
    return NOT_AVAILABLE;
  }

  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    return NOT_AVAILABLE;
  }

  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function formatUpdated(timestamp) {
  if (!timestamp) {
    return NOT_AVAILABLE;
  }

  return new Date(timestamp * 1000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function createPoster(show, showName) {
  const imageUrl = show.image?.medium || show.image?.original;

  if (!imageUrl) {
    const placeholder = document.createElement("div");
    placeholder.className = "card-poster placeholder";
    placeholder.textContent = "No poster available";
    return placeholder;
  }

  const poster = document.createElement("img");
  poster.className = "card-poster";
  poster.src = imageUrl;
  poster.alt = `Poster for ${showName}`;
  poster.loading = "lazy";
  return poster;
}

function addDetail(list, label, value) {
  const term = document.createElement("dt");
  term.textContent = label;

  const description = document.createElement("dd");
  description.textContent = value;

  list.append(term, description);
  return description;
}

function createCard(show) {
  const showName = show.name || "Untitled show";

  const card = document.createElement("article");
  card.className = "card";

  const body = document.createElement("div");
  body.className = "card-body";

  const title = document.createElement("h2");
  title.className = "card-title";
  title.textContent = showName;

  const summaryText = stripHtml(show.summary);
  const summary = document.createElement("p");
  summary.className = "card-summary";
  summary.textContent = summaryText ? shortenText(summaryText, SUMMARY_LENGTH) : `Summary: ${NOT_AVAILABLE}`;

  const genres = show.genres?.length ? show.genres.join(", ") : NOT_AVAILABLE;
  const rating = show.rating?.average != null ? `${show.rating.average} / 10` : NOT_AVAILABLE;

  const details = document.createElement("dl");
  details.className = "card-details";
  addDetail(details, "Premiered", formatPremiered(show.premiered));
  addDetail(details, "Last updated", formatUpdated(show.updated));
  addDetail(details, "Genres", genres);
  addDetail(details, "Average rating", rating);

  const link = document.createElement("a");
  link.className = "card-link";
  link.href = show.url || `https://www.tvmaze.com/shows/${show.id}`;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = "View on TVmaze";

  body.append(title, summary, details, link);
  card.append(createPoster(show, showName), body);
  return card;
}

function renderGallery(shows) {
  gallery.replaceChildren(...shows.map(createCard));
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
