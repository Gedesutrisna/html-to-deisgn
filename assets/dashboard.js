(() => {
  const root = document.querySelector(".mekard-dashboard") || document.body;
  const desktopBreakpoint = 920;
  const sidebarStates = ["normal", "compact", "hidden"];
  const q = (selector, scope = document) => scope.querySelector(selector);
  const qa = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  function showToast(title, message) {
    const region = q("[data-toast-region]");
    if (!region) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">check_circle</span><div><strong></strong><span></span></div>';
    q("strong", toast).textContent = title;
    q("div span", toast).textContent = message;
    region.appendChild(toast);
    window.setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(8px)";
      window.setTimeout(() => toast.remove(), 180);
    }, 3200);
  }

  const getStoredSidebar = () => {
    try {
      const stored = localStorage.getItem("mekardEmployerSidebar");
      return sidebarStates.includes(stored) ? stored : "normal";
    } catch { return "normal"; }
  };
  const setSidebarState = (state, announce = false) => {
    if (!sidebarStates.includes(state)) return;
    root.dataset.sidebar = state;
    try { localStorage.setItem("mekardEmployerSidebar", state); } catch {}
    const labelMap = { normal: "Sidebar normal", compact: "Sidebar diperkecil", hidden: "Sidebar ditutup" };
    qa("[data-sidebar-cycle]").forEach((button) => {
      button.setAttribute("aria-label", `${labelMap[state]}. Klik untuk mengganti tampilan.`);
      button.title = `${labelMap[state]} (Alt+S)`;
    });
    if (announce) showToast("Tampilan diperbarui", labelMap[state]);
  };
  const cycleSidebar = () => {
    if (window.innerWidth <= desktopBreakpoint) {
      root.classList.toggle("is-mobile-nav-open");
      return;
    }
    const current = root.dataset.sidebar || "normal";
    setSidebarState(sidebarStates[(sidebarStates.indexOf(current) + 1) % sidebarStates.length], true);
  };
  setSidebarState(getStoredSidebar());
  qa("[data-sidebar-cycle]").forEach((button) => button.addEventListener("click", cycleSidebar));
  qa("[data-sidebar-close]").forEach((button) => button.addEventListener("click", () => {
    if (window.innerWidth <= desktopBreakpoint) root.classList.remove("is-mobile-nav-open");
    else setSidebarState(root.dataset.sidebar === "compact" ? "normal" : "compact", true);
  }));
  qa("[data-mobile-overlay]").forEach((button) => button.addEventListener("click", () => root.classList.remove("is-mobile-nav-open")));
  window.addEventListener("resize", () => { if (window.innerWidth > desktopBreakpoint) root.classList.remove("is-mobile-nav-open"); });

  function activateTab(targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;
    const group = target.dataset.tabGroup;
    qa(`[data-tab-group="${group}"]`).forEach((panel) => panel.classList.toggle("is-active", panel.id === targetId));
    qa(`[data-tabs="${group}"] [data-tab-target]`).forEach((button) => {
      const active = button.dataset.tabTarget === targetId;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
  }
  qa("[data-tab-target]").forEach((button) => button.addEventListener("click", () => activateTab(button.dataset.tabTarget)));
  qa("[data-open-tab]").forEach((button) => button.addEventListener("click", () => activateTab(button.dataset.openTab)));

  qa("[data-char-count]").forEach((field) => {
    const target = q(field.dataset.charCount);
    const max = Number(field.getAttribute("maxlength")) || 0;
    const update = () => { if (target) target.textContent = `${field.value.length}${max ? `/${max}` : ""}`; };
    field.addEventListener("input", update); update();
  });

  const estimatorForm = q("[data-job-form]");
  if (estimatorForm) {
    const fields = {
      duration: q("[name='duration']", estimatorForm), workers: q("[name='workers']", estimatorForm),
      startTime: q("[name='start_time']", estimatorForm), shiftTime: q("[name='shift_time']", estimatorForm),
      additionalWage: q("[name='additional_wage']", estimatorForm),
    };
    const outputs = {
      recommended: q("[data-estimate-recommended]"), range: q("[data-estimate-range]"), duration: q("[data-estimate-duration]"),
      score: q("[data-estimate-score]"), adjustment: q("[data-estimate-adjustment]"), shift: q("[data-estimate-shift]"),
      additional: q("[data-estimate-additional]"), multiplication: q("[data-estimate-multiplication]"), total: q("[data-estimate-total]"),
      shiftLabel: q("[data-shift-label]"), shiftDescription: q("[data-shift-description]"), shiftStatus: q("[data-shift-status]"),
      recommendedHidden: q("[name='recommended_wage']", estimatorForm), finalHidden: q("[name='final_wage_per_worker']", estimatorForm), scoreHidden: q("[name='risk_score']", estimatorForm),
    };
    const idr = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
    const BASE_HOURLY_WAGE = 22000, SCORE_RATE = 0.06, PLATFORM_FLOOR = 60000, ROUNDING_UNIT = 5000;
    const roundWage = (value) => Math.round(value / ROUNDING_UNIT) * ROUNDING_UNIT;
    const getRadioScore = (name) => Math.max(0, Number(q(`[name='${name}']:checked`, estimatorForm)?.value) || 0);
    const getShift = (startTime, durationHours) => {
      const [hours, minutes] = String(startTime || "08:00").split(":").map((part) => Number(part) || 0);
      const startMinutes = hours * 60 + minutes, endMinutes = startMinutes + durationHours * 60;
      const normal = startMinutes >= 360 && endMinutes <= 1080;
      return { value: normal ? "normal" : "night", score: normal ? 0 : 2, label: normal ? "Jam normal" : "Shift malam", description: normal ? "Seluruh durasi berada di antara 06.00–18.00." : "Waktu kerja berada atau melintasi pukul 18.00–06.00." };
    };
    const calculate = () => {
      const duration = Math.max(1, Number(fields.duration?.value) || 1), workers = Math.max(1, Number(fields.workers?.value) || 1), additionalWage = Math.max(0, Number(fields.additionalWage?.value) || 0), shift = getShift(fields.startTime?.value, duration);
      const indicatorScore = getRadioScore("effort_level") + getRadioScore("weight_load") + getRadioScore("vertical_hazard") + getRadioScore("material_hazard") + getRadioScore("environment_space");
      const objectiveScore = indicatorScore + shift.score, adjustmentRate = objectiveScore * SCORE_RATE;
      const recommended = Math.max(PLATFORM_FLOOR, roundWage(duration * BASE_HOURLY_WAGE * (1 + adjustmentRate)));
      const finalPerWorker = recommended + additionalWage, total = finalPerWorker * workers, low = roundWage(recommended * .9), high = roundWage(recommended * 1.12);
      if (fields.shiftTime) fields.shiftTime.value = shift.value;
      if (outputs.recommended) outputs.recommended.textContent = idr.format(finalPerWorker);
      if (outputs.range) outputs.range.textContent = `Rentang rekomendasi sistem ${idr.format(low)} – ${idr.format(high)}`;
      if (outputs.duration) outputs.duration.textContent = `${duration} jam × ${idr.format(BASE_HOURLY_WAGE)}`;
      if (outputs.score) outputs.score.textContent = `${objectiveScore} poin`;
      if (outputs.adjustment) outputs.adjustment.textContent = `+${Math.round(adjustmentRate * 100)}%`;
      if (outputs.shift) outputs.shift.textContent = `${shift.label} (+${shift.score} poin)`;
      if (outputs.additional) outputs.additional.textContent = idr.format(additionalWage);
      if (outputs.multiplication) outputs.multiplication.textContent = `${workers} orang × ${idr.format(finalPerWorker)}`;
      if (outputs.total) outputs.total.textContent = idr.format(total);
      if (outputs.shiftLabel) outputs.shiftLabel.textContent = shift.label;
      if (outputs.shiftDescription) outputs.shiftDescription.textContent = shift.description;
      if (outputs.shiftStatus) {
        outputs.shiftStatus.classList.toggle("is-night", shift.value === "night");
        const i = q(".material-symbols-rounded", outputs.shiftStatus); if (i) i.textContent = shift.value === "night" ? "dark_mode" : "light_mode";
      }
      if (outputs.recommendedHidden) outputs.recommendedHidden.value = String(recommended);
      if (outputs.finalHidden) outputs.finalHidden.value = String(finalPerWorker);
      if (outputs.scoreHidden) outputs.scoreHidden.value = String(objectiveScore);
    };
    estimatorForm.addEventListener("input", calculate); estimatorForm.addEventListener("change", calculate); calculate();
    estimatorForm.addEventListener("submit", (event) => { event.preventDefault(); showToast("Lowongan siap dipublikasikan", "Upah per pekerja dan total anggaran sudah dihitung."); });
    qa("[data-save-draft]", estimatorForm).forEach((button) => button.addEventListener("click", () => showToast("Draft tersimpan", "Perubahan disimpan secara lokal pada prototipe.")));
  }

  // Dashboard table search.
  const dashboardSearches = qa("[data-dashboard-search]");
  const dashboardRows = qa("[data-dashboard-job-row]");
  const filterDashboard = (source) => {
    const query = (source?.value || dashboardSearches[0]?.value || "").trim().toLowerCase();
    dashboardSearches.forEach((field) => { if (field !== source) field.value = source?.value || ""; });
    let visible = 0;
    dashboardRows.forEach((row) => { const show = !query || (row.dataset.dashboardSearchValue || row.textContent || "").toLowerCase().includes(query); row.hidden = !show; if (show) visible++; });
    const empty = q("[data-dashboard-empty]"); if (empty) empty.hidden = visible !== 0;
  };
  dashboardSearches.forEach((field) => field.addEventListener("input", () => filterDashboard(field)));

  // Job list search/status.
  const jobRows = qa("[data-job-row]"), jobSearches = qa("[data-job-search]"), jobStatus = q("[data-job-status]"), jobResult = q("[data-job-result]"), jobEmpty = q("[data-job-empty]");
  const filterJobs = (source) => {
    if (!jobRows.length) return;
    const query = (source?.value || jobSearches[0]?.value || "").trim().toLowerCase(), status = jobStatus?.value || "all";
    jobSearches.forEach((field) => { if (field !== source) field.value = source?.value || ""; });
    let visible = 0;
    jobRows.forEach((row) => { const show = (!query || (row.dataset.jobSearchValue || row.textContent || "").toLowerCase().includes(query)) && (status === "all" || row.dataset.jobStatusValue === status); row.hidden = !show; if (show) visible++; });
    if (jobResult) jobResult.textContent = `${visible} lowongan ditampilkan`; if (jobEmpty) jobEmpty.hidden = visible !== 0;
  };
  jobSearches.forEach((field) => field.addEventListener("input", () => filterJobs(field))); jobStatus?.addEventListener("change", () => filterJobs());
  q("[data-job-reset]")?.addEventListener("click", () => { jobSearches.forEach((field) => field.value = ""); if (jobStatus) jobStatus.value = "all"; filterJobs(); }); filterJobs();

  // Detail page shared search, applicant filters, assignments, and immutable notes.
  const detailSearches = qa("[data-detail-search]"), applicantStatus = q("[data-applicant-status]"), applicantDistance = q("[data-applicant-distance]");
  let detailQuery = "", selectedApplicantCard = null, selectedCompletionCard = null, printedAssignment = null, printedKind = "agreement";
  const formatIDR = (value) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
  const formatDistance = (value) => `${Number(value || 0).toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
  const assignmentCards = () => qa("[data-work-assignment]");
  const applicantCards = () => qa("[data-applicant-card]");
  const createDocumentId = (prefix, initials) => `MKD-${prefix}-2026-${initials}${Math.random().toString(36).slice(2,7).toUpperCase()}`;

  function syncDetailSearch(source) {
    detailQuery = source?.value ?? detailQuery;
    detailSearches.forEach((field) => { if (field !== source) field.value = detailQuery; });
    filterApplicants(); filterAssignments();
  }
  function filterApplicants() {
    if (!applicantCards().length) return;
    const query = detailQuery.trim().toLowerCase(), status = applicantStatus?.value || "all", distance = Number(applicantDistance?.value) || Infinity;
    let visible = 0;
    applicantCards().forEach((card) => {
      const text = `${card.dataset.name || ""} ${card.dataset.specialties || ""}`.toLowerCase();
      const show = (!query || text.includes(query)) && (status === "all" || card.dataset.status === status) && Number(card.dataset.distance || 0) <= distance;
      card.hidden = !show; if (show) visible++;
    });
    const result = q("[data-applicant-result]"); if (result) result.textContent = `${visible} pelamar ditampilkan`;
  }
  function filterAssignments() {
    const query = detailQuery.trim().toLowerCase(); let visible = 0;
    assignmentCards().forEach((card) => { const show = !query || (card.dataset.assignmentSearchValue || card.dataset.workerName || "").toLowerCase().includes(query); card.hidden = !show; if (show) visible++; });
    const empty = q("[data-assignment-empty]"); if (empty) empty.hidden = visible !== 0;
  }
  detailSearches.forEach((field) => field.addEventListener("input", () => syncDetailSearch(field)));
  applicantStatus?.addEventListener("change", filterApplicants); applicantDistance?.addEventListener("change", filterApplicants);
  qa("[data-reset-filter]").forEach((button) => button.addEventListener("click", () => { detailQuery = ""; detailSearches.forEach((field) => field.value = ""); if (applicantStatus) applicantStatus.value = "all"; if (applicantDistance) applicantDistance.value = "999"; filterApplicants(); filterAssignments(); }));

  function updateDetailSummary() {
    const cards = assignmentCards(), quota = cards.length, total = 8, waiting = cards.filter((c) => c.dataset.workStatus === "worker_completed").length, completed = cards.filter((c) => c.dataset.workStatus === "completed").length, active = cards.filter((c) => c.dataset.workStatus === "confirmed").length, newApplicants = applicantCards().filter((c) => c.dataset.status === "new").length;
    qa("[data-quota-value]").forEach((node) => { node.dataset.current = String(quota); node.dataset.total = String(total); node.textContent = `${quota}/${total}`; });
    qa("[data-new-applicant-count]").forEach((node) => node.textContent = String(newApplicants));
    qa("[data-selected-count]").forEach((node) => node.textContent = `${quota} pekerja`);
    qa("[data-remaining-count]").forEach((node) => node.textContent = `${Math.max(0,total-quota)} pekerja`);
    qa("[data-waiting-count]").forEach((node) => node.textContent = node.closest('.summary-row') ? `${waiting} pekerja` : String(waiting));
    qa("[data-completed-count]").forEach((node) => node.textContent = node.closest('.summary-row') ? `${completed} pekerja` : String(completed));
    qa("[data-active-work-count]").forEach((node) => node.textContent = String(active));
    qa("[data-waiting-badge]").forEach((node) => { node.textContent = String(waiting); node.hidden = waiting === 0; });
    qa("[data-selected-budget]").forEach((node) => node.textContent = formatIDR(quota * 170000));
    const ring = q("[data-quota-ring]"); if (ring) { const p = Math.min(100, quota / total * 100); ring.style.background = `conic-gradient(var(--orange) 0 ${p}%, #edf0ee ${p}% 100%)`; }
  }

  function closeAllModals() { qa(".modal-backdrop").forEach((modal) => modal.hidden = true); selectedApplicantCard = null; selectedCompletionCard = null; }
  qa("[data-modal-close]").forEach((button) => button.addEventListener("click", closeAllModals));
  qa(".modal-backdrop").forEach((backdrop) => backdrop.addEventListener("mousedown", (event) => { if (event.target === backdrop) closeAllModals(); }));

  function openHire(card) {
    if (!card) return;
    if (assignmentCards().length >= 8) { showToast("Kebutuhan sudah terpenuhi", "Tidak dapat memilih pekerja tambahan sebelum kuota diubah."); return; }
    selectedApplicantCard = card;
    q("[data-hire-name]").textContent = card.dataset.name || "Pelamar";
    q("[data-hire-distance]").textContent = formatDistance(card.dataset.distance);
    const modal = q("[data-hire-modal]"); if (modal) modal.hidden = false;
  }

  function addActivity(iconName, title, detail, time = "Baru saja") {
    const list = q("[data-activity-list]"); if (!list) return;
    const item = document.createElement("div"); item.className = "timeline-item";
    item.innerHTML = '<span class="timeline-item__icon"><span aria-hidden="true" class="material-symbols-rounded"></span></span><div class="timeline-item__copy"><strong></strong><span></span></div><time></time>';
    q(".material-symbols-rounded", item).textContent = iconName; q("strong", item).textContent = title; q(".timeline-item__copy span", item).textContent = detail; q("time", item).textContent = time; list.prepend(item);
  }

  function assignmentData(card) {
    return { id: card.dataset.assignmentId, workerName: card.dataset.workerName, initials: card.dataset.initials, distance: Number(card.dataset.distance), status: card.dataset.workStatus, agreementId: card.dataset.agreementId, selectedAt: card.dataset.selectedAt, workerCompletedAt: card.dataset.workerCompletedAt || "", completionId: card.dataset.completionId || "", completedAt: card.dataset.completedAt || "" };
  }
  const statusMeta = { confirmed: ["Berjalan","status--info","Menunggu pekerja menyelesaikan pekerjaan"], worker_completed: ["Menunggu konfirmasi","status--pending","Periksa hasil lalu konfirmasi selesai"], completed: ["Selesai","status--active","Nota akhir telah tersimpan"] };
  function createAssignmentCard(data) {
    const [label, cls, next] = statusMeta[data.status];
    const article = document.createElement("article"); article.className = "work-assignment-card"; article.dataset.workAssignment = "";
    Object.assign(article.dataset, { assignmentId: data.id, workerName: data.workerName, initials: data.initials, distance: String(data.distance), workStatus: data.status, agreementId: data.agreementId, selectedAt: data.selectedAt, workerCompletedAt: data.workerCompletedAt || "", completionId: data.completionId || "", completedAt: data.completedAt || "", assignmentSearchValue: data.workerName });
    article.innerHTML = `<div class="work-assignment-person"><span class="avatar"></span><div><strong></strong><span>${formatDistance(data.distance)} dari lokasi kerja</span></div></div><div class="work-assignment-status"><span class="status ${cls}" data-work-status-label>${label}</span><small data-work-next-step>${next}</small></div><div class="work-assignment-meta work-assignment-meta--agreement"><span>Nota awal</span><strong data-work-agreement-label></strong><small>Dibuat ${escapeHtml(data.selectedAt)}</small></div><div class="work-assignment-meta work-assignment-meta--wage"><span>Upah tercatat</span><strong>Rp 170.000</strong><small>5 jam kerja</small></div><div class="work-assignment-menu"><button aria-expanded="false" aria-haspopup="menu" class="icon-button work-assignment-menu-trigger" data-work-menu-trigger type="button"><span aria-hidden="true" class="material-symbols-rounded">more_vert</span></button><div class="work-assignment-menu-popover" data-work-menu hidden role="menu"><button class="work-assignment-menu-item" data-open-agreement role="menuitem" type="button"><span aria-hidden="true" class="material-symbols-rounded">description</span><span><strong>Nota Awal</strong><small>Lihat kesepakatan kerja</small></span></button></div></div>`;
    q(".avatar", article).textContent = data.initials; q(".work-assignment-person strong", article).textContent = data.workerName; q("[data-work-agreement-label]", article).textContent = data.agreementId;
    refreshAssignmentActions(article); return article;
  }
  function refreshAssignmentActions(card) {
    const menu = q("[data-work-menu]", card); if (!menu) return;
    qa("[data-confirm-completion],[data-open-completion]", menu).forEach((node) => node.remove());
    if (card.dataset.workStatus === "worker_completed") menu.insertAdjacentHTML("beforeend", '<button class="work-assignment-menu-item work-assignment-menu-item--primary" data-confirm-completion role="menuitem" type="button"><span aria-hidden="true" class="material-symbols-rounded">verified</span><span><strong>Konfirmasi Selesai</strong><small>Simpan penyelesaian pekerjaan</small></span></button>');
    if (card.dataset.workStatus === "completed") menu.insertAdjacentHTML("beforeend", '<button class="work-assignment-menu-item work-assignment-menu-item--dark" data-open-completion role="menuitem" type="button"><span aria-hidden="true" class="material-symbols-rounded">task_alt</span><span><strong>Nota Akhir</strong><small>Lihat bukti penyelesaian</small></span></button>');
  }

  function openNote(card, kind) {
    const data = assignmentData(card), completion = kind === "completion";
    printedAssignment = data; printedKind = kind;
    q("[data-note-title]").textContent = completion ? "Nota Akhir Penyelesaian Kerja" : "Nota Awal Kesepakatan Kerja";
    q("[data-note-id]").textContent = completion ? (data.completionId || "Belum tersedia") : data.agreementId;
    const status = q("[data-note-status]"); status.textContent = completion ? "Selesai" : "Terkonfirmasi"; status.className = `status ${completion ? "status--active" : "status--info"}`;
    q("[data-note-worker]").textContent = data.workerName; q("[data-note-distance]").textContent = formatDistance(data.distance); q("[data-note-agreement]").textContent = data.agreementId; q("[data-note-selected]").textContent = data.selectedAt;
    q("[data-note-confirmation-heading]").textContent = completion ? "Konfirmasi penyelesaian" : "Konfirmasi awal";
    const completionOnly = q("[data-note-completion-only]"); if (completionOnly) completionOnly.hidden = !completion;
    const agreementCopy = q("[data-note-agreement-copy]"); if (agreementCopy) agreementCopy.hidden = completion;
    q("[data-note-worker-completed]").textContent = data.workerCompletedAt || "—"; q("[data-note-completed]").textContent = data.completedAt || "—";
    q("[data-note-modal]").hidden = false;
  }

  function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function printRow(label, value) { return `<div class="row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`; }
  function printNote() {
    if (!printedAssignment) return;
    const a = printedAssignment, completion = printedKind === "completion", docId = completion ? (a.completionId || "Belum tersedia") : a.agreementId, title = completion ? "Nota Akhir Penyelesaian Kerja" : "Nota Awal Kesepakatan Kerja";
    const win = window.open("", "_blank", "width=760,height=900"); if (!win) return;
    win.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${escapeHtml(title)} - ${escapeHtml(docId)}</title><style>body{margin:0;padding:40px;color:#081d17;font-family:Arial,sans-serif;font-size:13px;line-height:1.55}h1{margin:0 0 6px;font-size:24px}h2{margin:28px 0 10px;font-size:14px;text-transform:uppercase}.muted{color:#63716b}.notice{margin:20px 0;padding:14px;background:#fbfaf6;border:1px solid rgba(8,29,23,.14);border-radius:8px}.row{display:flex;justify-content:space-between;gap:28px;padding:7px 0;border-bottom:1px solid rgba(8,29,23,.1)}.row span{color:#63716b}.row strong{text-align:right}@media print{body{padding:20px}}</style></head><body><h1>${escapeHtml(title)}</h1><div class="muted">${escapeHtml(docId)}</div><div class="notice"><strong>Dokumen permanen.</strong> Catatan ini dibuat otomatis dari konfirmasi sistem dan tidak dapat dihapus atau diubah sepihak.</div><h2>Pihak yang terikat</h2>${printRow("Pemberi kerja","Nusa Build")}${printRow("Pekerja",a.workerName)}<h2>Pekerjaan</h2>${printRow("Kode lowongan","MK-1048")}${printRow("Nama pekerjaan","Angkut Material Bangunan")}${printRow("Durasi","5 jam")}${printRow("Lokasi","Jl. Mahendradata No. 18, Denpasar Barat, Bali")}${printRow("Jadwal mulai","22 Juli 2026, 08:00 WITA")}<h2>Upah</h2>${printRow("Upah per pekerja","Rp 170.000")}${printRow("Jarak pekerja",formatDistance(a.distance))}<h2>Konfirmasi</h2>${printRow("Nota awal",a.agreementId)}${printRow("Pekerja dipilih",a.selectedAt)}${completion ? printRow("Pekerja menandai selesai",a.workerCompletedAt || "—") + printRow("Pemberi kerja mengonfirmasi",a.completedAt || "—") : ""}<script>window.onload=()=>window.print()<\/script></body></html>`); win.document.close();
  }
  q("[data-note-print]")?.addEventListener("click", printNote);

  document.addEventListener("click", (event) => {
    const target = event.target.closest("button, a"); if (!target) return;
    if (target.matches("[data-demo-action]")) { if (target.tagName === "BUTTON") event.preventDefault(); showToast(target.dataset.demoTitle || "Aksi berhasil", target.dataset.demoMessage || "Interaksi prototipe berhasil dijalankan."); }
    if (target.matches("[data-hire-applicant]")) openHire(target.closest("[data-applicant-card]"));
    if (target.matches("[data-work-menu-trigger]")) {
      const card = target.closest("[data-work-assignment]"), menu = q("[data-work-menu]", card), open = menu.hidden;
      assignmentCards().forEach((c) => { c.classList.remove("is-menu-open"); const m=q("[data-work-menu]",c), b=q("[data-work-menu-trigger]",c); if(m)m.hidden=true; if(b)b.setAttribute("aria-expanded","false"); });
      menu.hidden = !open; card.classList.toggle("is-menu-open", open); target.setAttribute("aria-expanded", String(open));
    }
    if (target.matches("[data-open-agreement]")) { const card=target.closest("[data-work-assignment]"); q("[data-work-menu]",card).hidden=true; card.classList.remove("is-menu-open"); openNote(card,"agreement"); }
    if (target.matches("[data-open-completion]")) { const card=target.closest("[data-work-assignment]"); q("[data-work-menu]",card).hidden=true; card.classList.remove("is-menu-open"); openNote(card,"completion"); }
    if (target.matches("[data-confirm-completion]")) {
      selectedCompletionCard=target.closest("[data-work-assignment]"); q("[data-completion-worker]").textContent=selectedCompletionCard.dataset.workerName; q("[data-completion-agreement]").textContent=selectedCompletionCard.dataset.agreementId; q("[data-completion-worker-time]").textContent=selectedCompletionCard.dataset.workerCompletedAt || "—"; q("[data-completion-modal]").hidden=false;
    }
  });
  document.addEventListener("pointerdown", (event) => { if (!event.target.closest(".work-assignment-menu")) assignmentCards().forEach((c) => { c.classList.remove("is-menu-open"); const m=q("[data-work-menu]",c),b=q("[data-work-menu-trigger]",c); if(m)m.hidden=true;if(b)b.setAttribute("aria-expanded","false"); }); });

  q("[data-confirm-hire]")?.addEventListener("click", () => {
    if (!selectedApplicantCard || assignmentCards().length >= 8) return;
    const name=selectedApplicantCard.dataset.name, initials=selectedApplicantCard.dataset.initials, agreementId=createDocumentId("KSP",initials);
    const data={id:`assignment-${selectedApplicantCard.dataset.applicantId}-${Date.now()}`,workerName:name,initials,distance:Number(selectedApplicantCard.dataset.distance),status:"confirmed",agreementId,selectedAt:"21 Jul 2026, 20:18",workerCompletedAt:"",completionId:"",completedAt:""};
    selectedApplicantCard.dataset.status="hired"; q("[data-applicant-status-label]",selectedApplicantCard).textContent="Terpilih";
    const button=q("[data-hire-applicant]",selectedApplicantCard); button.removeAttribute("data-hire-applicant"); button.dataset.openTab="work-panel"; button.classList.remove("button--primary"); button.classList.add("button--outline"); button.textContent="Lihat Pekerjaan"; button.addEventListener("click",()=>activateTab("work-panel"));
    const card=createAssignmentCard(data); q("[data-work-assignment-list]").appendChild(card);
    addActivity("contract",`${name} dipilih sebagai pekerja`,`Nota awal ${agreementId} dibuat otomatis dan tidak dapat dihapus.`);
    closeAllModals(); updateDetailSummary(); filterApplicants(); filterAssignments(); openNote(card,"agreement"); showToast("Pekerja dipilih",`Nota awal kesepakatan ${agreementId} telah dibuat dan disimpan permanen.`);
  });
  q("[data-confirm-work-completion]")?.addEventListener("click", () => {
    if (!selectedCompletionCard || selectedCompletionCard.dataset.workStatus !== "worker_completed") return;
    const completionId=createDocumentId("PNY",selectedCompletionCard.dataset.initials); selectedCompletionCard.dataset.workStatus="completed"; selectedCompletionCard.dataset.completionId=completionId; selectedCompletionCard.dataset.completedAt="21 Jul 2026, 20:18";
    const [label,cls,next]=statusMeta.completed, statusNode=q("[data-work-status-label]",selectedCompletionCard); statusNode.className=`status ${cls}`; statusNode.textContent=label; q("[data-work-next-step]",selectedCompletionCard).textContent=next; refreshAssignmentActions(selectedCompletionCard);
    addActivity("verified",`Pekerjaan ${selectedCompletionCard.dataset.workerName} dikonfirmasi selesai`,`Nota akhir ${completionId} dibuat dan disimpan permanen sebagai bukti penyelesaian.`);
    const completedCard=selectedCompletionCard; closeAllModals(); updateDetailSummary(); openNote(completedCard,"completion"); showToast("Pekerjaan selesai",`Nota akhir penyelesaian ${completionId} telah dibuat dan tidak dapat dihapus.`);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { root.classList.remove("is-mobile-nav-open"); closeAllModals(); assignmentCards().forEach((c)=>{c.classList.remove("is-menu-open");const m=q("[data-work-menu]",c);if(m)m.hidden=true;}); }
    if (event.altKey && event.key.toLowerCase() === "s") { event.preventDefault(); cycleSidebar(); }
  });

  filterApplicants(); filterAssignments(); updateDetailSummary();
})();
