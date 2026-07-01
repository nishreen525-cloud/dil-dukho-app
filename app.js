const STORAGE_KEYS = {
  currentUser: "dilDukho.currentUser",
  entries: "dilDukho.entries",
};

const profiles = {
  me: { label: "Me", pin: "1111" },
  mom: { label: "Mom", pin: "2222" },
  dad: { label: "Dad", pin: "3333" },
  brother: { label: "Brother", pin: "4444" },
};

const peopleLabels = {
  mom: "Mom",
  dad: "Dad",
  brother: "Brother",
};

const loginScreen = document.querySelector("#login-screen");
const appScreen = document.querySelector("#app-screen");
const loginForm = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");
const profileSelect = document.querySelector("#profile-select");
const pinInput = document.querySelector("#pin-input");
const dashboardTitle = document.querySelector("#dashboard-title");
const profileBadge = document.querySelector("#profile-badge");
const viewerNote = document.querySelector("#viewer-note");
const logoutButton = document.querySelector("#logout-button");
const entryForm = document.querySelector("#entry-form");
const entryPanel = document.querySelector("#entry-panel");
const personInput = document.querySelector("#person-input");
const dateInput = document.querySelector("#date-input");
const titleInput = document.querySelector("#title-input");
const feelingInput = document.querySelector("#feeling-input");
const intensityInput = document.querySelector("#intensity-input");
const intensityLabel = document.querySelector("#intensity-label");
const detailsInput = document.querySelector("#details-input");
const supportNeedInput = document.querySelector("#support-need-input");
const filterSelect = document.querySelector("#filter-select");
const heartOverview = document.querySelector("#heart-overview");
const entryList = document.querySelector("#entry-list");
const entryMessage = document.querySelector("#entry-message");
const timelineMessage = document.querySelector("#timeline-message");
const statTotal = document.querySelector("#stat-total");
const statOpenHearts = document.querySelector("#stat-open-hearts");
const statTopPerson = document.querySelector("#stat-top-person");

function readStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.error(`Dil Dukho could not read "${key}" from local storage.`, error);
    return null;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`Dil Dukho could not save "${key}" to local storage.`, error);
    return false;
  }
}

function removeStorage(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error(`Dil Dukho could not remove "${key}" from local storage.`, error);
  }
}

function showMessage(text) {
  loginMessage.textContent = text;
}

function showEntryMessage(text) {
  entryMessage.textContent = text;
}

function showTimelineMessage(text) {
  timelineMessage.textContent = text;
}

function createId(prefix) {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

function normalizeSupport(support) {
  return {
    id: typeof support?.id === "string" ? support.id : createId("support"),
    author: typeof support?.author === "string" && peopleLabels[support.author] ? support.author : "mom",
    emoji: typeof support?.emoji === "string" && support.emoji.trim() ? support.emoji.trim() : "💛",
    message: typeof support?.message === "string" ? support.message.trim() : "",
    createdAt: typeof support?.createdAt === "string" && support.createdAt ? support.createdAt : new Date().toISOString(),
    accepted: Boolean(support?.accepted),
  };
}

function normalizeEntry(entry) {
  const intensity = Math.min(5, Math.max(1, Number(entry?.intensity) || 1));
  return {
    id: typeof entry?.id === "string" ? entry.id : createId("entry"),
    person: typeof entry?.person === "string" && peopleLabels[entry.person] ? entry.person : "mom",
    date: typeof entry?.date === "string" && entry.date ? entry.date : new Date().toISOString().split("T")[0],
    title: typeof entry?.title === "string" ? entry.title.trim() : "",
    feeling: typeof entry?.feeling === "string" ? entry.feeling.trim() : "Sad",
    intensity,
    details: typeof entry?.details === "string" ? entry.details.trim() : "",
    supportNeed: typeof entry?.supportNeed === "string" ? entry.supportNeed.trim() : "",
    supportMessages: Array.isArray(entry?.supportMessages) ? entry.supportMessages.map(normalizeSupport) : [],
  };
}

function getEntries() {
  const raw = readStorage(STORAGE_KEYS.entries);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeEntry) : [];
  } catch (error) {
    console.error("Dil Dukho could not read saved entries from local storage.", error);
    removeStorage(STORAGE_KEYS.entries);
    return [];
  }
}

function saveEntries(entries) {
  return writeStorage(STORAGE_KEYS.entries, JSON.stringify(entries));
}

function getCurrentUser() {
  return readStorage(STORAGE_KEYS.currentUser);
}

function setCurrentUser(profileId) {
  return writeStorage(STORAGE_KEYS.currentUser, profileId);
}

function clearCurrentUser() {
  removeStorage(STORAGE_KEYS.currentUser);
}

function formatDate(dateValue) {
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateValue) {
  return new Date(dateValue).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sortEntries(entries) {
  return [...entries].sort((left, right) => {
    const dateDiff = new Date(right.date) - new Date(left.date);
    if (dateDiff !== 0) {
      return dateDiff;
    }

    return right.id.localeCompare(left.id);
  });
}

function getHeartState(entry) {
  const healed = Math.min(
    entry.intensity,
    entry.supportMessages.filter((supportMessage) => supportMessage.accepted).length
  );
  const broken = Math.max(entry.intensity - healed, 0);
  const calm = Math.max(5 - entry.intensity, 0);

  let label = "Tender";
  let tone = "tender";

  if (broken === 0) {
    label = "Fully mended";
    tone = "mended";
  } else if (healed > 0) {
    label = "Healing";
    tone = "healing";
  } else if (broken >= 4) {
    label = "Deep hurt";
  } else if (broken >= 2) {
    label = "Cracked";
  }

  return { healed, broken, calm, label, tone };
}

function renderHeartMeter(entry) {
  const heartState = getHeartState(entry);
  const brokenHearts = Array.from({ length: heartState.broken }, () => '<span class="heart broken" aria-hidden="true">💔</span>');
  const mendedHearts = Array.from({ length: heartState.healed }, () => '<span class="heart mended" aria-hidden="true">❤️</span>');
  const calmHearts = Array.from({ length: heartState.calm }, () => '<span class="heart" aria-hidden="true">🤍</span>');
  return `${brokenHearts.join("")}${mendedHearts.join("")}${calmHearts.join("")}`;
}

function getVisibleEntries(currentUser) {
  const entries = sortEntries(getEntries());
  if (currentUser === "me") {
    return filterSelect.value === "all"
      ? entries
      : entries.filter((entry) => entry.person === filterSelect.value);
  }

  filterSelect.value = currentUser;
  filterSelect.disabled = true;
  return entries.filter((entry) => entry.person === currentUser);
}

function getTopPerson(entries) {
  if (!entries.length) {
    return "None yet";
  }

  const counts = entries.reduce((accumulator, entry) => {
    accumulator[entry.person] = (accumulator[entry.person] || 0) + 1;
    return accumulator;
  }, {});

  const topKey = Object.keys(counts).sort((left, right) => counts[right] - counts[left])[0];
  return peopleLabels[topKey] || "None yet";
}

function renderStats(entries) {
  statTotal.textContent = String(entries.length);
  statOpenHearts.textContent = String(entries.reduce((sum, entry) => sum + getHeartState(entry).broken, 0));
  statTopPerson.textContent = getTopPerson(entries);
}

function renderViewerNote(currentUser) {
  if (currentUser === "me") {
    filterSelect.value = "all";
    viewerNote.innerHTML = `
      <h2>Your private tracker</h2>
      <p>Log what happened, how much it hurt, and what kind of support might help. When family members respond with kind words or emojis, you can accept them to mend the heart.</p>
    `;
    entryPanel.classList.remove("hidden");
    filterSelect.disabled = false;
    return;
  }

  viewerNote.innerHTML = `
    <h2>${profiles[currentUser].label} support view</h2>
    <p>You can read entries that mention ${profiles[currentUser].label.toLowerCase()} and send a supportive note or emoji. Only the Me profile can log new entries or accept healing.</p>
  `;
  entryPanel.classList.add("hidden");
}

function renderHeartOverview(currentUser) {
  const entries = getEntries();
  const people = currentUser === "me" ? Object.keys(peopleLabels) : [currentUser];

  heartOverview.innerHTML = people
    .map((personId) => {
      const personEntries = entries.filter((entry) => entry.person === personId);
      const openHearts = personEntries.reduce((sum, entry) => sum + getHeartState(entry).broken, 0);
      const healedHearts = personEntries.reduce((sum, entry) => sum + getHeartState(entry).healed, 0);
      const lastEntry = sortEntries(personEntries)[0];
      const summaryEntry = {
        intensity: Math.min(5, openHearts + healedHearts),
        supportMessages: Array.from({ length: Math.min(5, healedHearts) }, () => ({ accepted: true })),
      };

      return `
        <article class="heart-card">
          <div class="entry-header-line">
            <div>
              <h3>${peopleLabels[personId]}</h3>
              <p>${personEntries.length ? `${personEntries.length} logged moment${personEntries.length === 1 ? "" : "s"}` : "No entries yet"}</p>
            </div>
            <span class="status-chip ${openHearts === 0 && personEntries.length ? "mended" : openHearts < healedHearts && openHearts > 0 ? "healing" : ""}">
              ${openHearts === 0 && personEntries.length ? "Calmer now" : `${openHearts} heart${openHearts === 1 ? "" : "s"} still hurting`}
            </span>
          </div>
          <div class="heart-meter">${renderHeartMeter(summaryEntry)}</div>
          <p>${lastEntry ? `Latest: ${escapeHtml(lastEntry.title)} on ${formatDate(lastEntry.date)}` : "Add an entry to start the heart tracker."}</p>
        </article>
      `;
    })
    .join("");
}

function renderSupportSection(entry, currentUser) {
  const supports = entry.supportMessages;
  const heartState = getHeartState(entry);

  const supportItems = supports.length
    ? supports
        .map(
          (support) => `
            <article class="support-item">
              <div class="support-head">
                <strong>${support.emoji} ${profiles[support.author].label}</strong>
                <span>${formatDateTime(support.createdAt)}</span>
              </div>
              <p class="support-line">${support.message ? escapeHtml(support.message) : "Sent a quiet supportive emoji."}</p>
              <footer>
                ${support.accepted ? '<span class="accepted-badge">Accepted for healing</span>' : ""}
                ${
                  currentUser === "me" && !support.accepted && heartState.broken > 0
                    ? `<button class="inline-button" type="button" data-action="accept-support" data-entry-id="${entry.id}" data-support-id="${support.id}">Accept and heal 1 heart</button>`
                    : ""
                }
              </footer>
            </article>
          `
        )
        .join("")
    : '<p class="support-empty">No supportive replies yet.</p>';

  const composer =
    currentUser !== "me" && currentUser === entry.person
      ? `
        <form class="support-composer" data-entry-id="${entry.id}">
          <div>
            <strong>Send support</strong>
            <p class="support-help">Share a gentle message or emoji that might help.</p>
          </div>
          <div class="support-composer-grid">
            <label class="field">
              <span>Emoji</span>
              <select name="emoji">
                <option value="💛">💛</option>
                <option value="🤍">🤍</option>
                <option value="🌷">🌷</option>
                <option value="🫶">🫶</option>
                <option value="🙏">🙏</option>
                <option value="✨">✨</option>
              </select>
            </label>
            <label class="field">
              <span>Message</span>
              <input name="message" type="text" maxlength="140" placeholder="I'm here, I hear you, or sending love." />
            </label>
          </div>
          <div class="support-actions">
            <button class="primary-button" type="submit">Send support</button>
          </div>
        </form>
      `
      : "";

  return `
    <section class="support-thread">
      <div>
        <strong>Support messages</strong>
        <p class="support-help">Accepted messages mend one broken heart at a time.</p>
      </div>
      ${supportItems}
      ${composer}
    </section>
  `;
}

function renderEntries(currentUser) {
  const entries = getVisibleEntries(currentUser);
  renderStats(entries);
  renderHeartOverview(currentUser);

  if (!entries.length) {
    entryList.innerHTML = `
      <div class="empty-state">
        No entries yet for this view.
      </div>
    `;
    return;
  }

  entryList.innerHTML = entries
    .map((entry) => {
      const heartState = getHeartState(entry);

      return `
        <article class="entry-card">
          <div class="entry-header-line">
            <div>
              <h3>${escapeHtml(entry.title)}</h3>
              <div class="entry-meta">
                <span>${formatDate(entry.date)}</span>
                <span>${escapeHtml(entry.feeling)}</span>
                <span>${peopleLabels[entry.person]}</span>
              </div>
            </div>
            <div>
              <span class="tag">Intensity ${entry.intensity}/5</span>
              <span class="status-chip ${heartState.tone === "mended" ? "mended" : heartState.tone === "healing" ? "healing" : ""}">
                ${heartState.label}
              </span>
            </div>
          </div>
          <div class="heart-meter" aria-label="${heartState.broken} broken hearts and ${heartState.healed} healed hearts">
            ${renderHeartMeter(entry)}
          </div>
          <p class="entry-detail"><strong>Why it hurt:</strong> ${escapeHtml(entry.details)}</p>
          ${
            entry.supportNeed
              ? `<p class="support-need"><strong>What would help:</strong> ${escapeHtml(entry.supportNeed)}</p>`
              : ""
          }
          ${renderSupportSection(entry, currentUser)}
        </article>
      `;
    })
    .join("");
}

function showDashboard(currentUser) {
  const profile = profiles[currentUser];
  dashboardTitle.textContent =
    currentUser === "me" ? "Welcome back to your heart journal." : `Welcome, ${profile.label}.`;
  profileBadge.textContent = profile.label;
  showEntryMessage("");
  showTimelineMessage("");
  renderViewerNote(currentUser);
  renderEntries(currentUser);
  loginScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");
}

function showLogin() {
  appScreen.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  pinInput.value = "";
  showMessage("");
  showEntryMessage("");
  showTimelineMessage("");
}

function handleLogin(event) {
  event.preventDefault();
  const selectedProfile = profileSelect.value;
  const profile = profiles[selectedProfile];

  if (pinInput.value !== profile.pin) {
    showMessage("That PIN does not match the selected profile.");
    return;
  }

  if (!setCurrentUser(selectedProfile)) {
    showMessage("Your browser is blocking local storage, so this prototype cannot keep you logged in.");
    return;
  }

  showDashboard(selectedProfile);
}

function handleLogout() {
  clearCurrentUser();
  showLogin();
}

function handleIntensityChange() {
  intensityLabel.textContent = `${intensityInput.value} / 5`;
}

function handleNewEntry(event) {
  event.preventDefault();

  const nextEntry = normalizeEntry({
    id: createId("entry"),
    person: personInput.value,
    date: dateInput.value,
    title: titleInput.value.trim(),
    feeling: feelingInput.value,
    intensity: Number(intensityInput.value),
    details: detailsInput.value.trim(),
    supportNeed: supportNeedInput.value.trim(),
    supportMessages: [],
  });

  if (!nextEntry.title || !nextEntry.details) {
    showEntryMessage("Please add both a title and the reason it hurt.");
    return;
  }

  const entries = getEntries();
  entries.push(nextEntry);
  if (!saveEntries(entries)) {
    showEntryMessage("Your browser blocked saving entries. Try a normal browser window instead of private mode.");
    return;
  }

  entryForm.reset();
  dateInput.value = new Date().toISOString().split("T")[0];
  intensityInput.value = "3";
  handleIntensityChange();
  renderEntries("me");
  showEntryMessage("Entry saved.");
}

function updateEntry(entryId, updater) {
  const entries = getEntries();
  const nextEntries = entries.map((entry) => (entry.id === entryId ? updater(entry) : entry));
  return saveEntries(nextEntries);
}

function handleSupportSubmit(event) {
  const supportForm = event.target.closest(".support-composer");
  if (!supportForm) {
    return;
  }

  event.preventDefault();
  const currentUser = getCurrentUser();
  const entryId = supportForm.dataset.entryId;
  const emoji = supportForm.elements.emoji.value;
  const message = supportForm.elements.message.value.trim();

  if (!currentUser || currentUser === "me") {
    showTimelineMessage("Only family profiles can send support from this view.");
    return;
  }

  if (!message && !emoji) {
    showTimelineMessage("Add a small message or choose an emoji.");
    return;
  }

  const saved = updateEntry(entryId, (entry) => {
    if (entry.person !== currentUser) {
      return entry;
    }

    return normalizeEntry({
      ...entry,
      supportMessages: [
        ...entry.supportMessages,
        {
          id: createId("support"),
          author: currentUser,
          emoji,
          message,
          createdAt: new Date().toISOString(),
          accepted: false,
        },
      ],
    });
  });

  if (!saved) {
    showTimelineMessage("Support could not be saved in this browser.");
    return;
  }

  renderEntries(currentUser);
  showTimelineMessage("Support sent.");
}

function handleSupportAccept(button) {
  const currentUser = getCurrentUser();
  if (currentUser !== "me") {
    showTimelineMessage("Only the Me profile can accept healing.");
    return;
  }

  const entryId = button.dataset.entryId;
  const supportId = button.dataset.supportId;
  const saved = updateEntry(entryId, (entry) => {
    let alreadyAccepted = false;
    const heartState = getHeartState(entry);
    if (heartState.broken === 0) {
      return entry;
    }

    return normalizeEntry({
      ...entry,
      supportMessages: entry.supportMessages.map((supportMessage) => {
        if (supportMessage.id !== supportId || supportMessage.accepted || alreadyAccepted) {
          return supportMessage;
        }

        alreadyAccepted = true;
        return { ...supportMessage, accepted: true };
      }),
    });
  });

  if (!saved) {
    showTimelineMessage("That healing update could not be saved.");
    return;
  }

  renderEntries("me");
  showTimelineMessage("Support accepted and one heart was mended.");
}

function handleEntryListClick(event) {
  const button = event.target.closest('[data-action="accept-support"]');
  if (!button) {
    return;
  }

  handleSupportAccept(button);
}

function initDefaults() {
  dateInput.value = new Date().toISOString().split("T")[0];
  handleIntensityChange();
}

loginForm.addEventListener("submit", handleLogin);
logoutButton.addEventListener("click", handleLogout);
entryForm.addEventListener("submit", handleNewEntry);
intensityInput.addEventListener("input", handleIntensityChange);
filterSelect.addEventListener("change", () => renderEntries(getCurrentUser()));
entryList.addEventListener("submit", handleSupportSubmit);
entryList.addEventListener("click", handleEntryListClick);

initDefaults();

const currentUser = getCurrentUser();
if (currentUser && profiles[currentUser]) {
  showDashboard(currentUser);
} else {
  showLogin();
}
