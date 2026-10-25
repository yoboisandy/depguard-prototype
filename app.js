// DepGuard high fidelity prototype
// Simulates VS Code after DepGuard has stopped a commit.
// Everything is driven by one state object; render() redraws the screen.

const initialState = {
  invoiceKit: "open",    // the package that does not exist: "open" | "removed"
  pdfMakee: "open",      // the lookalike package: "open" | "replaced" | "kept" | "removed"
  view: "terminal",      // "terminal" | "panel" | "committed"
  selected: null,        // "invoiceKit" | "pdfMakee" | null
  keepFormOpen: false,
};

let state = { ...initialState };

const el = (id) => document.getElementById(id);


// ---------- Helpers ----------

function openIssueCount() {
  let count = 0;
  if (state.invoiceKit === "open") count++;
  if (state.pdfMakee === "open") count++;
  return count;
}

// Picks the next package that still needs a decision
function selectNextOpenPackage() {
  if (state.invoiceKit === "open") {
    state.selected = "invoiceKit";
  } else if (state.pdfMakee === "open") {
    state.selected = "pdfMakee";
  } else {
    state.selected = null;
  }
  state.keepFormOpen = false;
}

function statusIcon(type) {
  const symbols = { blocked: "✕", review: "?", verified: "✓" };
  return `<span class="status-icon ${type}">${symbols[type]}</span>`;
}

// One line of the package.json view
function codeLine(number, content) {
  return `<div><span class="line-number">${number}</span>${content}</div>`;
}

function jsonEntry(key, value) {
  return `<span class="json-key">"${key}"</span>` +
         `<span class="json-punct">: </span>` +
         `<span class="json-string">"${value}"</span>`;
}


// ---------- package.json editor ----------

function renderPackageJson() {
  const lines = [];

  lines.push(codeLine(12, `  ${jsonEntry("version", "1.4.0")}<span class="json-punct">,</span>`));
  lines.push(codeLine(13, `  <span class="json-key">"private"</span><span class="json-punct">: true,</span>`));
  lines.push(codeLine(14, `  <span class="json-key">"dependencies"</span><span class="json-punct">: {</span>`));
  lines.push(codeLine(15, `    ${jsonEntry("dayjs", "^1.11.10")}<span class="json-punct">,</span>`));

  if (state.invoiceKit === "open") {
    lines.push(codeLine(16,
      `    <span class="squiggle-red">${jsonEntry("invoicekit-pdf-auto", "^2.1.0")}</span>` +
      `<span class="json-punct">,</span>` +
      `<span class="inline-note blocked">✕ DepGuard: not found on npm</span>`
    ));
  }

  if (state.pdfMakee === "replaced") {
    lines.push(codeLine(17, `    ${jsonEntry("pdfmake", "^0.2.10")}<span class="json-punct">,</span>`));
  } else if (state.pdfMakee === "kept") {
    lines.push(codeLine(17,
      `    ${jsonEntry("pdfmakee", "^0.2.4")}<span class="json-punct">,</span>` +
      `<span class="inline-note review">kept with reason</span>`
    ));
  } else if (state.pdfMakee === "open") {
    lines.push(codeLine(17,
      `    <span class="squiggle-amber">${jsonEntry("pdfmakee", "^0.2.4")}</span>` +
      `<span class="json-punct">,</span>` +
      `<span class="inline-note review">? DepGuard: review recommended</span>`
    ));
  }

  lines.push(codeLine(18, `    ${jsonEntry("express", "^4.19.2")}`));
  lines.push(codeLine(19, `  <span class="json-punct">}</span>`));

  return `<div class="code-view">${lines.join("")}</div>`;
}


// ---------- Sidebar ----------

function renderExplorer() {
  const files = [
    { name: "src", depth: 0 },
    { name: "invoice", depth: 1 },
    { name: "export.js", depth: 2 },
    { name: "package.json", depth: 0 },
    { name: "README.md", depth: 0 },
  ];

  const rows = files.map((file) =>
    `<div class="list-row" style="padding-left: ${22 + file.depth * 12}px">` +
    `<span class="name">${file.name}</span></div>`
  ).join("");

  return `<div class="sidebar-header">EXPLORER</div>
          <div class="group-title">▾ INVOICE-APP</div>
          ${rows}`;
}

function packageRow(id, type, name, detail) {
  const selectedClass = state.selected === id ? "selected" : "";
  return `<div class="list-row ${selectedClass}" data-select="${id}">
            ${statusIcon(type)}
            <span class="name">${name}</span>
            <span class="detail">${detail}</span>
          </div>`;
}

function renderDepGuardPanel() {
  const count = openIssueCount();
  let html = `<div class="sidebar-header">DEPGUARD
                <span class="count">${count ? count + " to resolve" : "all clear"}</span>
              </div>`;

  if (state.invoiceKit === "open") {
    html += `<div class="group-title blocked">${statusIcon("blocked")} Blocked (1)</div>`;
    html += packageRow("invoiceKit", "blocked", "invoicekit-pdf-auto", "not on npm");
  }

  if (state.pdfMakee === "open") {
    html += `<div class="group-title review">${statusIcon("review")} Review recommended (1)</div>`;
    html += packageRow("pdfMakee", "review", "pdfmakee", "lookalike, new");
  }

  const verified = [{ name: "dayjs", note: "verified" }];
  if (state.pdfMakee === "replaced") verified.push({ name: "pdfmake", note: "replaced pdfmakee" });
  if (state.pdfMakee === "kept") verified.push({ name: "pdfmakee", note: "kept with reason" });

  html += `<div class="group-title verified">${statusIcon("verified")} Verified (${verified.length})</div>`;
  html += verified.map((pkg) => packageRow("verified-" + pkg.name, "verified", pkg.name, pkg.note)).join("");

  if (state.invoiceKit === "removed") {
    html += `<div class="group-title removed">Removed (1)</div>
             <div class="list-row"><span class="name struck">invoicekit-pdf-auto</span></div>`;
  }

  html += `<div class="sidebar-footer"><button class="btn">Check again</button></div>`;
  return html;
}


// ---------- Detail pages ----------

function renderKeepForm() {
  return `
    <div class="detail-page">
      <div class="page-header">
        <h1>Keep pdfmakee</h1>
        <span class="pill review">? Review recommended</span>
      </div>
      <div class="lead">Tell your team why this package is safe to keep.</div>

      <div class="form-box">
        <div class="form-label">Reason (required)</div>
        <textarea>Checked the source with the maintainer; fork of pdfmake with a fix we need.</textarea>

        <div class="save-location">
          💾 Saved to <b>.depguard/decisions.json</b> and shown to reviewers in the pull request.
        </div>
        <div class="record-preview">{
  "package": "pdfmakee@0.2.4",
  "decision": "kept",
  "reason": "Checked the source with the maintainer; ...",
  "by": "mia.thompson", "date": "2026-10-21"
}</div>

        <div class="button-row">
          <button class="btn primary" data-action="save-keep">Save and keep</button>
          <button class="btn" data-action="cancel-keep">Cancel</button>
        </div>
      </div>
    </div>`;
}

function renderReviewPage() {
  return `
    <div class="detail-page">
      <div class="page-header">
        <h1>pdfmakee</h1>
        <span class="pill review">? Review recommended</span>
      </div>
      <div class="lead">DepGuard found warning signs for this package. It is <b>not confirmed malicious</b>.</div>
      <div class="note">Risk level: Medium, based on 4 signals. You decide what to do.</div>

      <div class="card-grid">
        <div class="card">
          <h3>Why it was flagged</h3>
          <div class="evidence"><span class="marker">!</span><span>Name is one letter different from <b>pdfmake</b>, a widely used package</span></div>
          <div class="evidence"><span class="marker">!</span><span>First published 14 days ago</span></div>
          <div class="evidence"><span class="marker">!</span><span>38 downloads last week</span></div>
          <div class="evidence"><span class="marker">!</span><span>One maintainer, no linked source repository</span></div>
        </div>

        <div class="card">
          <h3>Suggested alternative</h3>
          <div class="alternative-name">${statusIcon("verified")} pdfmake</div>
          <div class="stat"><span>Weekly downloads</span><span>1.2M</span></div>
          <div class="stat"><span>First published</span><span>2014</span></div>
          <div class="stat"><span>Maintainers</span><span>5</span></div>
          <div class="stat"><span>Source repository</span><span>Linked</span></div>
        </div>
      </div>

      <div class="button-row">
        <button class="btn primary" data-action="replace-pdfmakee">Replace with pdfmake</button>
        <button class="btn" data-action="open-keep-form">Keep and give reason…</button>
        <button class="btn" data-action="remove-pdfmakee">Remove</button>
      </div>
      <div class="links">
        <a href="#">View on npm</a>
        <a href="#">How DepGuard decides</a>
      </div>
    </div>`;
}

function renderBlockedPage() {
  return `
    <div class="detail-page">
      <div class="page-header">
        <h1>invoicekit-pdf-auto</h1>
        <span class="pill blocked">✕ Blocked</span>
      </div>
      <div class="lead">This package does not exist on the npm registry.</div>
      <div class="note">AI assistants sometimes suggest package names that do not exist. Attackers can register these names later.</div>

      <div class="card narrow">
        <h3>Where it is used</h3>
        <div class="evidence"><span class="marker red">›</span><span>package.json, line 16</span></div>
        <div class="evidence"><span class="marker red">›</span><span>src/invoice/export.js, line 3 (import)</span></div>
      </div>

      <div class="button-row">
        <button class="btn primary" data-action="remove-invoicekit">Remove from package.json</button>
        <button class="btn">Search npm for similar packages</button>
      </div>
    </div>`;
}

function renderSummaryPage() {
  const outcomes = [];

  if (state.invoiceKit === "removed") {
    outcomes.push({ name: "invoicekit-pdf-auto", result: "removed" });
  }

  const pdfResults = {
    replaced: "replaced with pdfmake",
    kept: "kept with reason (saved)",
    removed: "removed",
  };
  outcomes.push({ name: "pdfmakee", result: pdfResults[state.pdfMakee] });
  outcomes.push({ name: "dayjs", result: "verified" });

  const items = outcomes.map((item) =>
    `<li>${statusIcon("verified")}<b>${item.name}</b><span class="outcome">${item.result}</span></li>`
  ).join("");

  return `
    <div class="detail-page">
      <div class="page-header">
        <h1>All dependencies resolved</h1>
        <span class="pill verified">✓ Ready to commit</span>
      </div>
      <ul class="resolved-list">${items}</ul>
      <div class="note">Decisions saved to .depguard/decisions.json so reviewers can see them.</div>

      <div class="button-row">
        <button class="btn primary" data-action="commit">Commit again</button>
        <button class="btn" data-action="undo">Undo last change</button>
      </div>
    </div>`;
}

function renderDetailPage() {
  if (state.selected === "pdfMakee" && state.keepFormOpen) return renderKeepForm();
  if (state.selected === "pdfMakee") return renderReviewPage();
  if (state.selected === "invoiceKit") return renderBlockedPage();
  if (openIssueCount() === 0) return renderSummaryPage();
  return `<div class="detail-page empty">Select a package in the DepGuard panel to see details.</div>`;
}


// ---------- Terminal ----------

function renderTerminal() {
  if (state.view === "committed") {
    const checkedPackage = state.pdfMakee === "replaced" ? "pdfmake" : "pdfmakee (kept with reason)";
    return [
      `<span class="muted">$</span> git commit -m "Add PDF invoice export"`,
      `DepGuard: checking 2 new dependencies in staged changes...`,
      `  <span class="green">✓ VERIFIED</span>       dayjs`,
      `  <span class="green">✓ VERIFIED</span>       ${checkedPackage}`,
      `<span class="green">All clear.</span> [feature/invoice-pdf 8c41e2a] Add PDF invoice export`,
      ` 3 files changed, 64 insertions(+)`,
    ].join("\n");
  }

  return [
    `<span class="muted">$</span> git commit -m "Add PDF invoice export"`,
    `DepGuard: checking 3 new dependencies in staged changes...`,
    ``,
    `  <span class="red">✕ BLOCKED</span>              invoicekit-pdf-auto   not found on npm registry`,
    `  <span class="amber">? REVIEW RECOMMENDED</span>   pdfmakee              looks like "pdfmake", published 14 days ago`,
    `  <span class="green">✓ VERIFIED</span>             dayjs`,
    ``,
    `<span class="red">Commit stopped: 2 packages need your decision.</span>`,
    `<span class="next-label"> NEXT </span> Click "Open DepGuard" in the notification, or run: <span class="bold">depguard review</span>`,
  ].join("\n");
}


// ---------- Status bar and notification ----------

function renderStatusBar() {
  const count = openIssueCount();
  let summary = "all clear";

  if (count > 0) {
    const parts = [];
    if (state.invoiceKit === "open") parts.push("1 blocked");
    if (state.pdfMakee === "open") parts.push("1 to review");
    summary = parts.join(", ");
  }

  el("status-bar").className = "status-bar" + (count === 0 ? " all-clear" : "");
  el("status-bar").innerHTML = `
    <span>⎇ feature/invoice-pdf</span>
    <span class="depguard-status" data-action="open-panel">🛡 DepGuard: ${summary}</span>
    <span class="push-right">Ln 17, Col 5</span>
    <span>JSON</span>`;
}

function renderNotification() {
  if (state.view !== "terminal") {
    el("notification-area").innerHTML = "";
    return;
  }

  el("notification-area").innerHTML = `
    <div class="notification">
      <div class="notification-message">
        ${statusIcon("blocked")}
        <span><b>DepGuard stopped your commit.</b> 2 new packages need a decision before you can commit.</span>
      </div>
      <div class="notification-source">Source: DepGuard</div>
      <div class="button-row">
        <button class="btn primary" data-action="open-panel">Open DepGuard</button>
        <button class="btn">Later</button>
      </div>
    </div>`;
}


// ---------- Tabs ----------

function currentTabName() {
  if (state.selected === "pdfMakee") return state.keepFormOpen ? "Keep pdfmakee" : "DepGuard: pdfmakee";
  if (state.selected === "invoiceKit") return "DepGuard: invoicekit-pdf-auto";
  if (openIssueCount() === 0) return "DepGuard: summary";
  return "";
}

function renderTabs(showDetail) {
  const tabName = showDetail ? currentTabName() : "";
  let html = `<div class="tab ${tabName ? "" : "active"}">{ } package.json</div>`;
  if (tabName) {
    html += `<div class="tab active">🛡 ${tabName}</div>`;
  }
  el("tab-bar").innerHTML = html;
}


// ---------- Main render ----------

function render() {
  const inPanel = state.view === "panel";
  const showDetail = inPanel && (state.selected || openIssueCount() === 0);

  el("sidebar").innerHTML = inPanel ? renderDepGuardPanel() : renderExplorer();
  renderTabs(showDetail);
  el("editor-content").innerHTML = showDetail ? renderDetailPage() : renderPackageJson();
  el("editor-area").classList.toggle("no-terminal", inPanel);
  el("terminal").innerHTML = renderTerminal();

  // Highlight the right activity bar icon
  document.querySelectorAll(".activity-icon").forEach((icon) => icon.classList.remove("active"));
  const activeIcon = inPanel ? el("depguard-icon") : document.querySelector(".activity-icon");
  activeIcon.classList.add("active");

  // Red badge with the number of open issues
  const count = openIssueCount();
  el("issue-badge").style.display = count ? "block" : "none";
  el("issue-badge").textContent = count;

  renderStatusBar();
  renderNotification();
}


// ---------- User actions ----------

const actions = {
  "open-panel": () => {
    state.view = "panel";
    if (!state.selected) selectNextOpenPackage();
  },
  "show-explorer": () => {
    state.view = "terminal";
  },
  "remove-invoicekit": () => {
    state.invoiceKit = "removed";
    selectNextOpenPackage();
  },
  "replace-pdfmakee": () => {
    state.pdfMakee = "replaced";
    selectNextOpenPackage();
  },
  "remove-pdfmakee": () => {
    state.pdfMakee = "removed";
    selectNextOpenPackage();
  },
  "open-keep-form": () => {
    state.keepFormOpen = true;
  },
  "cancel-keep": () => {
    state.keepFormOpen = false;
  },
  "save-keep": () => {
    state.pdfMakee = "kept";
    selectNextOpenPackage();
  },
  "undo": () => {
    state.pdfMakee = "open";
    state.selected = "pdfMakee";
  },
  "commit": () => {
    state.view = "committed";
  },
};

document.addEventListener("click", (event) => {
  // Clicking a package in the DepGuard panel
  const row = event.target.closest("[data-select]");
  if (row) {
    const id = row.dataset.select;
    if (id === "invoiceKit" || id === "pdfMakee") {
      state.selected = id;
      state.keepFormOpen = false;
      state.view = "panel";
      render();
    }
    return;
  }

  // Clicking a button or icon with an action
  const target = event.target.closest("[data-action]");
  if (target && actions[target.dataset.action]) {
    actions[target.dataset.action]();
    render();
  }
});

// Press R to restart the demo
document.addEventListener("keydown", (event) => {
  if (event.target.tagName === "TEXTAREA") return;
  if (event.key === "r" || event.key === "R") {
    state = { ...initialState };
    render();
  }
});

render();
