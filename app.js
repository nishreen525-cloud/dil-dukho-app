const STORAGE_KEYS = {
  currentUser: "dilDukho.currentUser",
  entries: "dilDukho.entries",
};

const DEFAULT_CONFIG = {
  supabaseUrl: "",
  supabaseAnonKey: "",
  ownerEmail: "",
  ownerDisplayName: "Nisreen",
};

const APP_CONFIG = Object.freeze({
  ...DEFAULT_CONFIG,
  ...(window.DIL_DUKHO_CONFIG || {}),
});

const DEMO_PROFILES = {
  me: { label: "Me", pin: "1111" },
  mom: { label: "Mom", pin: "2222" },
  dad: { label: "Dad", pin: "3333" },
  brother: { label: "Brother", pin: "4444" },
};

const DEMO_FAMILY_MEMBERS = [
  { id: "mom", name: "Mom", relationship: "Mother", email: "mom@demo.local" },
  { id: "dad", name: "Dad", relationship: "Father", email: "dad@demo.local" },
  { id: "brother", name: "Brother", relationship: "Brother", email: "brother@demo.local" },
];

const FEELINGS = ["Sad", "Dismissed", "Angry", "Lonely", "Overwhelmed"];
const SHARED_MODE = Boolean(
  APP_CONFIG.supabaseUrl && APP_CONFIG.supabaseAnonKey && APP_CONFIG.ownerEmail
);

const state = {
  mode: SHARED_MODE ? "shared" : "demo",
  service: null,
  currentProfile: null,
  familyMembers: [],
  entries: [],
};

const loginScreen = document.querySelector("#login-screen");
const appScreen = document.querySelector("#app-screen");
const loginModeBadge = document.querySelector("#login-mode-badge");
const appModeBadge = document.querySelector("#app-mode-badge");
const setupNote = document.querySelector("#setup-note");
const sharedAuthCard = document.querySelector("#shared-auth-card");
const demoLoginCard = document.querySelector("#demo-login-card");
const demoAccountsCard = document.querySelector("#demo-accounts-card");
const sharedAuthForm = document.querySelector("#shared-auth-form");
const authEmailInput = document.querySelector("#auth-email");
const authPasswordInput = document.querySelector("#auth-password");
const authMessage = document.querySelector("#auth-message");
const demoLoginForm = document.querySelector("#demo-login-form");
const loginMessage = document.querySelector("#login-message");
const profileSelect = document.querySelector("#profile-select");
const pinInput = document.querySelector("#pin-input");
const dashboardTitle = document.querySelector("#dashboard-title");
const profileBadge = document.querySelector("#profile-badge");
const viewerNote = document.querySelector("#viewer-note");
const logoutButton = document.querySelector("#logout-button");
const familyPanel = document.querySelector("#family-panel");
const familyForm = document.querySelector("#family-form");
const familyNameInput = document.querySelector("#family-name-input");
const familyRelationshipInput = document.querySelector("#family-relationship-input");
const familyEmailInput = document.querySelector("#family-email-input");
const familyList = document.querySelector("#family-list");
const familyMessage = document.querySelector("#family-message");
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

function showDemoMessage(text) {
  loginMessage.textContent = text;
}

function showAuthMessage(text) {
  authMessage.textContent = text;
}

function showEntryMessage(text) {
  entryMessage.textContent = text;
}

function showTimelineMessage(text) {
  timelineMessage.textContent = text;
}

function showFamilyMessage(text) {
  familyMessage.textContent = text;
}

function createId(prefix) {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
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

function sortEntries(entries) {
  return [...entries].sort((left, right) => {
    const dateDiff = new Date(right.date) - new Date(left.date);
    if (dateDiff !== 0) {
      return dateDiff;
    }

    return String(right.createdAt || right.id).localeCompare(String(left.createdAt || left.id));
  });
}

function normalizeSupport(support) {
  return {
    id: typeof support?.id === "string" ? support.id : createId("support"),
    authorKey: typeof support?.authorKey === "string" ? support.authorKey : "",
    authorMemberId:
      typeof support?.authorMemberId === "string"
        ? support.authorMemberId
        : typeof support?.author_member_id === "string"
          ? support.author_member_id
          : "",
    authorLabel: typeof support?.authorLabel === "string" ? support.authorLabel.trim() : "",
    emoji: typeof support?.emoji === "string" && support.emoji.trim() ? support.emoji.trim() : "💛",
    message: typeof support?.message === "string" ? support.message.trim() : "",
    createdAt:
      typeof support?.createdAt === "string"
        ? support.createdAt
        : typeof support?.created_at === "string"
          ? support.created_at
          : new Date().toISOString(),
    accepted: Boolean(support?.accepted),
  };
}

function normalizeEntry(entry) {
  const intensity = Math.min(5, Math.max(1, Number(entry?.intensity) || 1));
  return {
    id: typeof entry?.id === "string" ? entry.id : createId("entry"),
    personId:
      typeof entry?.personId === "string"
        ? entry.personId
        : typeof entry?.person_id === "string"
          ? entry.person_id
          : typeof entry?.person === "string"
            ? entry.person
            : "",
    date:
      typeof entry?.date === "string"
        ? entry.date
        : typeof entry?.happened_on === "string"
          ? entry.happened_on
          : new Date().toISOString().split("T")[0],
    title: typeof entry?.title === "string" ? entry.title.trim() : "",
    feeling:
      typeof entry?.feeling === "string" && FEELINGS.includes(entry.feeling.trim())
        ? entry.feeling.trim()
        : "Sad",
    intensity,
    details: typeof entry?.details === "string" ? entry.details.trim() : "",
    supportNeed:
      typeof entry?.supportNeed === "string"
        ? entry.supportNeed.trim()
        : typeof entry?.support_need === "string"
          ? entry.support_need.trim()
          : "",
    supportMessages: Array.isArray(entry?.supportMessages)
      ? entry.supportMessages.map(normalizeSupport)
      : [],
    createdAt:
      typeof entry?.createdAt === "string"
        ? entry.createdAt
        : typeof entry?.created_at === "string"
          ? entry.created_at
          : new Date().toISOString(),
  };
}

function getDemoEntries() {
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

function saveDemoEntries(entries) {
  return writeStorage(STORAGE_KEYS.entries, JSON.stringify(entries));
}

function isOwner() {
  return state.currentProfile?.role === "owner";
}

function getOwnerEmail() {
  return normalizeEmail(APP_CONFIG.ownerEmail);
}

function getCurrentViewerPersonId() {
  return isOwner() ? "" : state.currentProfile?.familyMemberId || "";
}

function getPersonLabel(personId) {
  const familyMember = state.familyMembers.find((member) => member.id === personId);
  if (familyMember) {
    return familyMember.name;
  }

  return DEMO_PROFILES[personId]?.label || "Family member";
}

function getTopPerson(entries) {
  if (!entries.length) {
    return "None yet";
  }

  const counts = entries.reduce((accumulator, entry) => {
    accumulator[entry.personId] = (accumulator[entry.personId] || 0) + 1;
    return accumulator;
  }, {});

  const topKey = Object.keys(counts).sort((left, right) => counts[right] - counts[left])[0];
  return getPersonLabel(topKey);
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
  const brokenHearts = Array.from(
    { length: heartState.broken },
    () => '<span class="heart broken" aria-hidden="true">💔</span>'
  );
  const mendedHearts = Array.from(
    { length: heartState.healed },
    () => '<span class="heart mended" aria-hidden="true">❤️</span>'
  );
  const calmHearts = Array.from(
    { length: heartState.calm },
    () => '<span class="heart" aria-hidden="true">🤍</span>'
  );
  return `${brokenHearts.join("")}${mendedHearts.join("")}${calmHearts.join("")}`;
}

function getVisibleEntries() {
  const entries = sortEntries(state.entries);
  if (isOwner()) {
    return filterSelect.value === "all"
      ? entries
      : entries.filter((entry) => entry.personId === filterSelect.value);
  }

  const personId = getCurrentViewerPersonId();
  filterSelect.value = personId;
  filterSelect.disabled = true;
  return entries.filter((entry) => entry.personId === personId);
}

function syncMemberOptions() {
  const ownerView = isOwner();
  const previousPerson = personInput.value;
  const previousFilter = filterSelect.value;
  const familyOptions = state.familyMembers
    .map(
      (member) =>
        `<option value="${escapeHtml(member.id)}">${escapeHtml(member.name)}</option>`
    )
    .join("");

  personInput.innerHTML = familyOptions;
  filterSelect.innerHTML = `<option value="all">All family</option>${familyOptions}`;

  if (!ownerView) {
    const viewerPersonId = getCurrentViewerPersonId();
    filterSelect.value = viewerPersonId;
    filterSelect.disabled = true;
  } else {
    filterSelect.value = state.familyMembers.some((member) => member.id === previousFilter)
      ? previousFilter
      : "all";
    filterSelect.disabled = false;
  }

  if (state.familyMembers.length) {
    personInput.value = state.familyMembers.some((member) => member.id === previousPerson)
      ? previousPerson
      : state.familyMembers[0].id;
  } else {
    personInput.innerHTML = "";
  }

  personInput.disabled = !ownerView || !state.familyMembers.length;
  const submitButton = entryForm.querySelector('button[type="submit"]');
  submitButton.disabled = ownerView && !state.familyMembers.length;
}

function renderStats(entries) {
  statTotal.textContent = String(entries.length);
  statOpenHearts.textContent = String(
    entries.reduce((sum, entry) => sum + getHeartState(entry).broken, 0)
  );
  statTopPerson.textContent = getTopPerson(entries);
}

function renderViewerNote() {
  if (isOwner()) {
    viewerNote.innerHTML = `
      <h2>Your private tracker</h2>
      <p>Log what happened, how much it hurt, and what kind of support might help. When family members reply with kind words or emojis, you can accept them to mend the heart.</p>
    `;
    entryPanel.classList.remove("hidden");
    familyPanel.classList.toggle("hidden", state.mode !== "shared");
    return;
  }

  viewerNote.innerHTML = `
    <h2>${escapeHtml(state.currentProfile.displayName)} support view</h2>
    <p>You can read entries that mention you and send a supportive note or emoji. Only the owner account can log new entries or accept healing.</p>
  `;
  entryPanel.classList.add("hidden");
  familyPanel.classList.add("hidden");
}

function renderHeartOverview() {
  const visibleMembers = isOwner()
    ? state.familyMembers
    : state.familyMembers.filter((member) => member.id === getCurrentViewerPersonId());

  if (!visibleMembers.length) {
    heartOverview.innerHTML = `
      <div class="empty-state">
        ${
          state.mode === "shared"
            ? "Add a family member first so entries and shared support can start."
            : "No family members are available in this view."
        }
      </div>
    `;
    return;
  }

  heartOverview.innerHTML = visibleMembers
    .map((person) => {
      const personEntries = state.entries.filter((entry) => entry.personId === person.id);
      const openHearts = personEntries.reduce((sum, entry) => sum + getHeartState(entry).broken, 0);
      const healedHearts = personEntries.reduce((sum, entry) => sum + getHeartState(entry).healed, 0);
      const latestEntry = sortEntries(personEntries)[0];
      const summaryEntry = normalizeEntry({
        intensity: Math.min(5, openHearts + healedHearts || 1),
        supportMessages: Array.from({ length: Math.min(5, healedHearts) }, () => ({
          accepted: true,
        })),
      });

      return `
        <article class="heart-card">
          <div class="entry-header-line">
            <div>
              <h3>${escapeHtml(person.name)}</h3>
              <p>${escapeHtml(person.relationship || "Family member")}</p>
            </div>
            <span class="status-chip ${
              openHearts === 0 && personEntries.length
                ? "mended"
                : openHearts < healedHearts && openHearts > 0
                  ? "healing"
                  : ""
            }">
              ${
                !personEntries.length
                  ? "No entries yet"
                  : openHearts === 0
                    ? "Calmer now"
                    : `${openHearts} heart${openHearts === 1 ? "" : "s"} still hurting`
              }
            </span>
          </div>
          <div class="heart-meter">${renderHeartMeter(summaryEntry)}</div>
          <p>${
            latestEntry
              ? `Latest: ${escapeHtml(latestEntry.title)} on ${formatDate(latestEntry.date)}`
              : "No timeline entries yet."
          }</p>
        </article>
      `;
    })
    .join("");
}

function renderFamilyList() {
  if (state.mode !== "shared" || !isOwner()) {
    familyList.innerHTML = "";
    return;
  }

  if (!state.familyMembers.length) {
    familyList.innerHTML = `
      <div class="empty-state">
        Add the family members who should be able to sign in and send support.
      </div>
    `;
    return;
  }

  familyList.innerHTML = state.familyMembers
    .map(
      (member) => `
        <article class="member-card">
          <strong>${escapeHtml(member.name)}</strong>
          <div class="member-meta">
            <span>${escapeHtml(member.relationship || "Family member")}</span>
            <span>${escapeHtml(member.email || "No email saved")}</span>
          </div>
        </article>
      `
    )
    .join("");
}

function getSupportAuthorLabel(support) {
  if (support.authorLabel) {
    return support.authorLabel;
  }

  if (support.authorMemberId) {
    return getPersonLabel(support.authorMemberId);
  }

  if (support.authorKey) {
    return DEMO_PROFILES[support.authorKey]?.label || "Family member";
  }

  return "Family member";
}

function renderSupportSection(entry) {
  const heartState = getHeartState(entry);

  const supportItems = entry.supportMessages.length
    ? entry.supportMessages
        .map(
          (support) => `
            <article class="support-item">
              <div class="support-head">
                <strong>${escapeHtml(support.emoji)} ${escapeHtml(getSupportAuthorLabel(support))}</strong>
                <span>${formatDateTime(support.createdAt)}</span>
              </div>
              <p class="support-line">${
                support.message ? escapeHtml(support.message) : "Sent a quiet supportive emoji."
              }</p>
              <footer>
                ${support.accepted ? '<span class="accepted-badge">Accepted for healing</span>' : ""}
                ${
                  isOwner() && !support.accepted && heartState.broken > 0
                    ? `<button class="inline-button" type="button" data-action="accept-support" data-entry-id="${escapeHtml(
                        entry.id
                      )}" data-support-id="${escapeHtml(support.id)}">Accept and heal 1 heart</button>`
                    : ""
                }
              </footer>
            </article>
          `
        )
        .join("")
    : '<p class="support-empty">No supportive replies yet.</p>';

  const canComposeSupport = !isOwner() && entry.personId === getCurrentViewerPersonId();
  const composer = canComposeSupport
    ? `
      <form class="support-composer" data-entry-id="${escapeHtml(entry.id)}">
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

function renderEntries() {
  const entries = getVisibleEntries();
  renderStats(entries);
  renderHeartOverview();
  renderFamilyList();

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
                <span>${escapeHtml(getPersonLabel(entry.personId))}</span>
              </div>
            </div>
            <div class="status-group">
              <span class="tag">Intensity ${entry.intensity}/5</span>
              <span class="status-chip ${
                heartState.tone === "mended"
                  ? "mended"
                  : heartState.tone === "healing"
                    ? "healing"
                    : ""
              }">
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
          ${renderSupportSection(entry)}
        </article>
      `;
    })
    .join("");
}

function renderAppChrome() {
  const modeLabel = state.mode === "shared" ? "Shared mode" : "Demo mode";
  loginModeBadge.textContent = modeLabel;
  appModeBadge.textContent = modeLabel;

  if (state.mode === "shared") {
    sharedAuthCard.classList.remove("hidden");
    demoLoginCard.classList.add("hidden");
    demoAccountsCard.classList.add("hidden");
    setupNote.innerHTML =
      "Shared mode is active. Family members can sign in with email and password from Firefox, Chrome, or Safari.";
  } else {
    sharedAuthCard.classList.add("hidden");
    demoLoginCard.classList.remove("hidden");
    demoAccountsCard.classList.remove("hidden");
    setupNote.innerHTML =
      'Demo mode is active right now. Add your Supabase details in <code>config.js</code> to turn on the shared app.';
  }
}

function showDashboard() {
  const ownerView = isOwner();
  dashboardTitle.textContent = ownerView
    ? "Welcome back to your heart journal."
    : `Welcome, ${state.currentProfile.displayName}.`;
  profileBadge.textContent = state.currentProfile.displayName;
  showEntryMessage("");
  showTimelineMessage("");
  showFamilyMessage("");
  renderAppChrome();
  syncMemberOptions();
  renderViewerNote();
  renderEntries();
  loginScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");
}

function showLogin() {
  appScreen.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  authPasswordInput.value = "";
  pinInput.value = "";
  showDemoMessage("");
  showAuthMessage("");
  showEntryMessage("");
  showTimelineMessage("");
  showFamilyMessage("");
  renderAppChrome();
}

async function refreshData() {
  state.familyMembers = await state.service.listFamilyMembers(state.currentProfile);
  state.entries = await state.service.listEntries(state.currentProfile);
}

const demoService = {
  async restoreSession() {
    const currentUser = readStorage(STORAGE_KEYS.currentUser);
    if (!currentUser || !DEMO_PROFILES[currentUser]) {
      return null;
    }

    return currentUser === "me"
      ? {
          userId: "me",
          displayName: "Me",
          role: "owner",
          ownerUserId: "me",
          familyMemberId: "",
          email: "",
        }
      : {
          userId: currentUser,
          displayName: DEMO_PROFILES[currentUser].label,
          role: "member",
          ownerUserId: "me",
          familyMemberId: currentUser,
          email: `${currentUser}@demo.local`,
        };
  },

  async signInDemo(profileId, pin) {
    const profile = DEMO_PROFILES[profileId];
    if (!profile || pin !== profile.pin) {
      throw new Error("That PIN does not match the selected profile.");
    }

    if (!writeStorage(STORAGE_KEYS.currentUser, profileId)) {
      throw new Error(
        "Your browser is blocking local storage, so this prototype cannot keep you logged in."
      );
    }

    return this.restoreSession();
  },

  async signOut() {
    removeStorage(STORAGE_KEYS.currentUser);
  },

  async listFamilyMembers() {
    return DEMO_FAMILY_MEMBERS;
  },

  async listEntries() {
    return sortEntries(getDemoEntries());
  },

  async addFamilyMember() {
    throw new Error("Demo mode uses the built-in family members only.");
  },

  async createEntry(profile, payload) {
    if (profile.role !== "owner") {
      throw new Error("Only the owner profile can create entries.");
    }

    const entries = getDemoEntries();
    entries.push(
      normalizeEntry({
        ...payload,
        id: createId("entry"),
        createdAt: new Date().toISOString(),
      })
    );

    if (!saveDemoEntries(entries)) {
      throw new Error("Your browser blocked saving entries. Try a normal browser window.");
    }
  },

  async sendSupport(profile, entryId, payload) {
    const entries = getDemoEntries();
    const nextEntries = entries.map((entry) => {
      if (entry.id !== entryId) {
        return entry;
      }

      if (profile.familyMemberId !== entry.personId) {
        return entry;
      }

      return normalizeEntry({
        ...entry,
        supportMessages: [
          ...entry.supportMessages,
          {
            id: createId("support"),
            authorKey: profile.familyMemberId,
            authorLabel: profile.displayName,
            emoji: payload.emoji,
            message: payload.message,
            createdAt: new Date().toISOString(),
            accepted: false,
          },
        ],
      });
    });

    if (!saveDemoEntries(nextEntries)) {
      throw new Error("Support could not be saved in this browser.");
    }
  },

  async acceptSupport(profile, entryId, supportId) {
    if (profile.role !== "owner") {
      throw new Error("Only the owner profile can accept healing.");
    }

    const entries = getDemoEntries();
    const nextEntries = entries.map((entry) => {
      if (entry.id !== entryId) {
        return entry;
      }

      let updated = false;
      return normalizeEntry({
        ...entry,
        supportMessages: entry.supportMessages.map((supportMessage) => {
          if (
            supportMessage.id !== supportId ||
            supportMessage.accepted ||
            updated ||
            getHeartState(entry).broken === 0
          ) {
            return supportMessage;
          }

          updated = true;
          return { ...supportMessage, accepted: true };
        }),
      });
    });

    if (!saveDemoEntries(nextEntries)) {
      throw new Error("That healing update could not be saved.");
    }
  },
};

const sharedService = {
  client: null,

  init() {
    if (this.client) {
      return;
    }

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      throw new Error("Supabase client library could not be loaded.");
    }

    this.client = window.supabase.createClient(
      APP_CONFIG.supabaseUrl,
      APP_CONFIG.supabaseAnonKey
    );
  },

  async restoreSession() {
    this.init();
    const { data, error } = await this.client.auth.getSession();
    if (error) {
      throw error;
    }

    if (!data.session?.user) {
      return null;
    }

    return this.ensureProfile(data.session.user);
  },

  async signInWithPassword(email, password) {
    this.init();
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }

    return this.ensureProfile(data.user);
  },

  async signUpWithPassword(email, password) {
    this.init();
    const { data, error } = await this.client.auth.signUp({ email, password });
    if (error) {
      throw error;
    }

    if (!data.session || !data.user) {
      return { pendingConfirmation: true };
    }

    return this.ensureProfile(data.user);
  },

  async signOut() {
    this.init();
    const { error } = await this.client.auth.signOut();
    if (error) {
      throw error;
    }
  },

  async ensureProfile(user) {
    const email = normalizeEmail(user.email);
    if (!email) {
      throw new Error("This account is missing an email address.");
    }

    const isOwnerEmail = email === getOwnerEmail();
    let familyMember = null;
    let ownerUserId = user.id;
    let displayName = APP_CONFIG.ownerDisplayName || "Owner";

    if (!isOwnerEmail) {
      const { data, error } = await this.client
        .from("family_members")
        .select("id, owner_user_id, name, relationship, invite_email")
        .eq("invite_email", email)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        await this.signOut();
        throw new Error(
          "This email has not been added as a family member yet. Ask the owner to add it first."
        );
      }

      familyMember = data;
      ownerUserId = data.owner_user_id;
      displayName = data.name;
    }

    const profileRecord = {
      user_id: user.id,
      email,
      display_name: displayName,
      role: isOwnerEmail ? "owner" : "member",
      owner_user_id: ownerUserId,
      family_member_id: familyMember?.id || null,
    };

    const { error: upsertError } = await this.client.from("profiles").upsert(profileRecord);
    if (upsertError) {
      throw upsertError;
    }

    return {
      userId: user.id,
      email,
      displayName,
      role: profileRecord.role,
      ownerUserId,
      familyMemberId: familyMember?.id || "",
    };
  },

  async listFamilyMembers(profile) {
    this.init();
    let query = this.client
      .from("family_members")
      .select("id, name, relationship, invite_email, owner_user_id")
      .order("name", { ascending: true });

    if (profile.role === "owner") {
      query = query.eq("owner_user_id", profile.ownerUserId);
    } else {
      query = query.eq("id", profile.familyMemberId);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return (data || []).map((member) => ({
      id: member.id,
      name: member.name,
      relationship: member.relationship,
      email: member.invite_email,
      ownerUserId: member.owner_user_id,
    }));
  },

  async listEntries(profile) {
    this.init();
    let query = this.client
      .from("hurt_entries")
      .select(
        "id, owner_user_id, person_id, happened_on, title, feeling, intensity, details, support_need, created_at"
      )
      .eq("owner_user_id", profile.ownerUserId)
      .order("happened_on", { ascending: false })
      .order("created_at", { ascending: false });

    if (profile.role !== "owner") {
      query = query.eq("person_id", profile.familyMemberId);
    }

    const { data: entries, error } = await query;
    if (error) {
      throw error;
    }

    const entryIds = (entries || []).map((entry) => entry.id);
    let supports = [];

    if (entryIds.length) {
      const { data, error: supportError } = await this.client
        .from("support_messages")
        .select("id, entry_id, author_member_id, emoji, message, accepted, created_at")
        .in("entry_id", entryIds)
        .order("created_at", { ascending: true });

      if (supportError) {
        throw supportError;
      }

      supports = data || [];
    }

    const supportsByEntry = supports.reduce((accumulator, support) => {
      accumulator[support.entry_id] = accumulator[support.entry_id] || [];
      accumulator[support.entry_id].push(
        normalizeSupport({
          id: support.id,
          authorMemberId: support.author_member_id,
          emoji: support.emoji,
          message: support.message,
          accepted: support.accepted,
          createdAt: support.created_at,
        })
      );
      return accumulator;
    }, {});

    return (entries || []).map((entry) =>
      normalizeEntry({
        ...entry,
        supportMessages: supportsByEntry[entry.id] || [],
      })
    );
  },

  async addFamilyMember(profile, payload) {
    if (profile.role !== "owner") {
      throw new Error("Only the owner can add family members.");
    }

    this.init();
    const record = {
      owner_user_id: profile.ownerUserId,
      name: payload.name,
      relationship: payload.relationship,
      invite_email: normalizeEmail(payload.email),
    };

    const { error } = await this.client.from("family_members").insert(record);
    if (error) {
      throw error;
    }
  },

  async createEntry(profile, payload) {
    if (profile.role !== "owner") {
      throw new Error("Only the owner can create entries.");
    }

    this.init();
    const record = {
      owner_user_id: profile.ownerUserId,
      person_id: payload.personId,
      happened_on: payload.date,
      title: payload.title,
      feeling: payload.feeling,
      intensity: payload.intensity,
      details: payload.details,
      support_need: payload.supportNeed,
      created_by: profile.userId,
    };

    const { error } = await this.client.from("hurt_entries").insert(record);
    if (error) {
      throw error;
    }
  },

  async sendSupport(profile, entryId, payload) {
    if (profile.role !== "member") {
      throw new Error("Only family member accounts can send support.");
    }

    this.init();
    const record = {
      entry_id: entryId,
      author_user_id: profile.userId,
      author_member_id: profile.familyMemberId,
      emoji: payload.emoji,
      message: payload.message,
      accepted: false,
    };

    const { error } = await this.client.from("support_messages").insert(record);
    if (error) {
      throw error;
    }
  },

  async acceptSupport(profile, entryId, supportId) {
    if (profile.role !== "owner") {
      throw new Error("Only the owner can accept healing.");
    }

    this.init();
    const entry = state.entries.find((item) => item.id === entryId);
    if (!entry || getHeartState(entry).broken === 0) {
      return;
    }

    const { error } = await this.client
      .from("support_messages")
      .update({ accepted: true })
      .eq("id", supportId)
      .eq("accepted", false);

    if (error) {
      throw error;
    }
  },
};

async function handleDemoLogin(event) {
  event.preventDefault();

  try {
    state.currentProfile = await demoService.signInDemo(profileSelect.value, pinInput.value);
    await refreshData();
    showDashboard();
  } catch (error) {
    showDemoMessage(error.message || "Demo login failed.");
  }
}

async function handleSharedAuth(event) {
  event.preventDefault();
  const action = event.submitter?.dataset.authAction;
  const email = normalizeEmail(authEmailInput.value);
  const password = authPasswordInput.value;

  if (!email || !password) {
    showAuthMessage("Please enter both email and password.");
    return;
  }

  try {
    let result;
    if (action === "signup") {
      result = await sharedService.signUpWithPassword(email, password);
      if (result?.pendingConfirmation) {
        showAuthMessage(
          "Account created. If your Supabase project requires email confirmation, confirm the email and then sign in."
        );
        return;
      }
    } else {
      result = await sharedService.signInWithPassword(email, password);
    }

    state.currentProfile = result;
    await refreshData();
    showDashboard();
  } catch (error) {
    showAuthMessage(error.message || "Shared sign-in failed.");
  }
}

async function handleLogout() {
  try {
    await state.service.signOut();
    state.currentProfile = null;
    state.entries = [];
    state.familyMembers = [];
    showLogin();
  } catch (error) {
    showTimelineMessage(error.message || "Logout failed.");
  }
}

function handleIntensityChange() {
  intensityLabel.textContent = `${intensityInput.value} / 5`;
}

async function handleNewEntry(event) {
  event.preventDefault();

  const payload = normalizeEntry({
    personId: personInput.value,
    date: dateInput.value,
    title: titleInput.value.trim(),
    feeling: feelingInput.value,
    intensity: Number(intensityInput.value),
    details: detailsInput.value.trim(),
    supportNeed: supportNeedInput.value.trim(),
  });

  if (!payload.personId) {
    showEntryMessage("Add a family member first.");
    return;
  }

  if (!payload.title || !payload.details) {
    showEntryMessage("Please add both a title and the reason it hurt.");
    return;
  }

  try {
    await state.service.createEntry(state.currentProfile, payload);
    await refreshData();
    entryForm.reset();
    dateInput.value = new Date().toISOString().split("T")[0];
    intensityInput.value = "3";
    handleIntensityChange();
    syncMemberOptions();
    renderEntries();
    showEntryMessage("Entry saved.");
  } catch (error) {
    showEntryMessage(error.message || "Entry could not be saved.");
  }
}

async function handleFamilySubmit(event) {
  event.preventDefault();

  const payload = {
    name: familyNameInput.value.trim(),
    relationship: familyRelationshipInput.value.trim(),
    email: familyEmailInput.value.trim(),
  };

  if (!payload.name || !payload.relationship || !payload.email) {
    showFamilyMessage("Please add a name, relationship, and email.");
    return;
  }

  try {
    await state.service.addFamilyMember(state.currentProfile, payload);
    await refreshData();
    familyForm.reset();
    syncMemberOptions();
    renderEntries();
    showFamilyMessage("Family member added.");
  } catch (error) {
    showFamilyMessage(error.message || "Family member could not be added.");
  }
}

async function handleSupportSubmit(event) {
  const supportForm = event.target.closest(".support-composer");
  if (!supportForm) {
    return;
  }

  event.preventDefault();
  const payload = {
    emoji: supportForm.elements.emoji.value,
    message: supportForm.elements.message.value.trim(),
  };

  if (!payload.emoji && !payload.message) {
    showTimelineMessage("Add a small message or choose an emoji.");
    return;
  }

  try {
    await state.service.sendSupport(
      state.currentProfile,
      supportForm.dataset.entryId,
      payload
    );
    await refreshData();
    renderEntries();
    showTimelineMessage("Support sent.");
  } catch (error) {
    showTimelineMessage(error.message || "Support could not be sent.");
  }
}

async function handleSupportAccept(button) {
  try {
    await state.service.acceptSupport(
      state.currentProfile,
      button.dataset.entryId,
      button.dataset.supportId
    );
    await refreshData();
    renderEntries();
    showTimelineMessage("Support accepted and one heart was mended.");
  } catch (error) {
    showTimelineMessage(error.message || "That healing update could not be saved.");
  }
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
  FEELINGS.forEach((feeling) => {
    if (![...feelingInput.options].some((option) => option.value === feeling)) {
      const option = document.createElement("option");
      option.value = feeling;
      option.textContent = feeling;
      feelingInput.append(option);
    }
  });
  handleIntensityChange();
}

async function initApp() {
  try {
    state.service = state.mode === "shared" ? sharedService : demoService;
    renderAppChrome();
    initDefaults();
    state.currentProfile = await state.service.restoreSession();

    if (state.currentProfile) {
      await refreshData();
      showDashboard();
      return;
    }

    showLogin();
  } catch (error) {
    console.error("Dil Dukho could not initialize.", error);
    state.mode = "demo";
    state.service = demoService;
    renderAppChrome();
    showLogin();
    showDemoMessage(
      "Shared mode could not start, so the app stayed in demo mode. Check config.js and Supabase."
    );
  }
}

demoLoginForm.addEventListener("submit", handleDemoLogin);
sharedAuthForm.addEventListener("submit", handleSharedAuth);
logoutButton.addEventListener("click", handleLogout);
familyForm.addEventListener("submit", handleFamilySubmit);
entryForm.addEventListener("submit", handleNewEntry);
intensityInput.addEventListener("input", handleIntensityChange);
filterSelect.addEventListener("change", () => renderEntries());
entryList.addEventListener("submit", handleSupportSubmit);
entryList.addEventListener("click", handleEntryListClick);

initApp();
