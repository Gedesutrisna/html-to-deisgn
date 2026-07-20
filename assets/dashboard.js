(() => {
  const body = document.body;
  const desktopBreakpoint = 920;
  const sidebarStates = ["normal", "compact", "hidden"];

  const getStoredSidebar = () => {
    try {
      const stored = localStorage.getItem("mekardEmployerSidebar");
      return sidebarStates.includes(stored) ? stored : "normal";
    } catch {
      return "normal";
    }
  };

  const setSidebarState = (state, announce = false) => {
    if (!sidebarStates.includes(state)) return;
    body.dataset.sidebar = state;
    try {
      localStorage.setItem("mekardEmployerSidebar", state);
    } catch {
      // Storage can be unavailable in strict/private browser contexts.
    }

    document.querySelectorAll("[data-sidebar-state]").forEach((button) => {
      const isActive = button.dataset.sidebarState === state;
      button.setAttribute("aria-pressed", String(isActive));
    });

    const labelMap = {
      normal: "Sidebar normal",
      compact: "Sidebar diperkecil",
      hidden: "Sidebar ditutup",
    };

    document.querySelectorAll("[data-sidebar-cycle]").forEach((button) => {
      button.setAttribute("aria-label", `${labelMap[state]}. Klik untuk mengganti tampilan.`);
      button.title = labelMap[state];
    });

    if (announce) showToast("Tampilan diperbarui", labelMap[state]);
  };

  const cycleSidebar = () => {
    if (window.innerWidth <= desktopBreakpoint) {
      body.classList.toggle("is-mobile-nav-open");
      return;
    }

    const current = body.dataset.sidebar || "normal";
    const next = sidebarStates[(sidebarStates.indexOf(current) + 1) % sidebarStates.length];
    setSidebarState(next, true);
  };

  setSidebarState(getStoredSidebar());

  document.querySelectorAll("[data-sidebar-cycle]").forEach((button) => {
    button.addEventListener("click", cycleSidebar);
  });

  document.querySelectorAll("[data-sidebar-state]").forEach((button) => {
    button.addEventListener("click", () => {
      setSidebarState(button.dataset.sidebarState, true);
      body.classList.remove("is-mobile-nav-open");
    });
  });

  document.querySelectorAll("[data-sidebar-close]").forEach((button) => {
    button.addEventListener("click", () => {
      if (window.innerWidth <= desktopBreakpoint) {
        body.classList.remove("is-mobile-nav-open");
      } else {
        setSidebarState(body.dataset.sidebar === "compact" ? "normal" : "compact", true);
      }
    });
  });

  document.querySelectorAll("[data-mobile-overlay]").forEach((overlay) => {
    overlay.addEventListener("click", () => body.classList.remove("is-mobile-nav-open"));
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > desktopBreakpoint) body.classList.remove("is-mobile-nav-open");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      body.classList.remove("is-mobile-nav-open");
      closeModal();
    }

    if (event.altKey && event.key.toLowerCase() === "s") {
      event.preventDefault();
      cycleSidebar();
    }
  });

  // Tabs
  document.querySelectorAll("[data-tabs]").forEach((tabs) => {
    const buttons = tabs.querySelectorAll("[data-tab-target]");
    const panels = document.querySelectorAll(`[data-tab-group="${tabs.dataset.tabs}"]`);

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        buttons.forEach((item) => {
          item.classList.remove("is-active");
          item.setAttribute("aria-selected", "false");
        });
        panels.forEach((panel) => panel.classList.remove("is-active"));

        button.classList.add("is-active");
        button.setAttribute("aria-selected", "true");
        document.getElementById(button.dataset.tabTarget)?.classList.add("is-active");
      });
    });
  });

  // Character count
  document.querySelectorAll("[data-char-count]").forEach((field) => {
    const target = document.querySelector(field.dataset.charCount);
    const max = Number(field.getAttribute("maxlength")) || 0;
    const update = () => {
      if (target) target.textContent = `${field.value.length}${max ? `/${max}` : ""}`;
    };
    field.addEventListener("input", update);
    update();
  });

  // ML wage estimation prototype
  const estimatorForm = document.querySelector("[data-job-form]");
  if (estimatorForm) {
    const fields = {
      duration: estimatorForm.querySelector("[name='duration']"),
      workers: estimatorForm.querySelector("[name='workers']"),
      distance: estimatorForm.querySelector("[name='distance']"),
      skill: estimatorForm.querySelector("[name='skill_level']"),
      risk: estimatorForm.querySelector("[name='risk_level']"),
      schedule: estimatorForm.querySelector("[name='schedule_type']"),
      customWage: estimatorForm.querySelector("[name='custom_wage']"),
    };

    const outputs = {
      recommended: document.querySelector("[data-estimate-recommended]"),
      range: document.querySelector("[data-estimate-range]"),
      duration: document.querySelector("[data-estimate-duration]"),
      risk: document.querySelector("[data-estimate-risk]"),
      distance: document.querySelector("[data-estimate-distance]"),
      skill: document.querySelector("[data-estimate-skill]"),
      total: document.querySelector("[data-estimate-total]"),
      hidden: estimatorForm.querySelector("[name='recommended_wage']"),
    };

    const idr = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    });

    const riskLabels = { low: "Rendah", medium: "Sedang", high: "Tinggi" };
    const skillLabels = { basic: "Dasar", skilled: "Terampil", expert: "Ahli" };

    const calculate = () => {
      const duration = Math.max(1, Number(fields.duration?.value) || 1);
      const workers = Math.max(1, Number(fields.workers?.value) || 1);
      const distance = Math.max(0, Number(fields.distance?.value) || 0);
      const skill = fields.skill?.value || "basic";
      const risk = fields.risk?.value || "low";
      const schedule = fields.schedule?.value || "normal";

      const hourlyBase = 22000;
      const skillMultiplier = { basic: 1, skilled: 1.24, expert: 1.55 }[skill];
      const riskMultiplier = { low: 1, medium: 1.16, high: 1.34 }[risk];
      const scheduleMultiplier = { normal: 1, urgent: 1.18, night: 1.25 }[schedule];
      const travelAllowance = Math.min(distance, 35) * 1800;
      const platformFloor = 60000;

      let perWorker = duration * hourlyBase * skillMultiplier * riskMultiplier * scheduleMultiplier + travelAllowance;
      perWorker = Math.max(platformFloor, Math.round(perWorker / 5000) * 5000);

      const custom = Number(fields.customWage?.value) || 0;
      const applied = custom > 0 ? custom : perWorker;
      const total = applied * workers;
      const low = Math.round((perWorker * 0.9) / 5000) * 5000;
      const high = Math.round((perWorker * 1.12) / 5000) * 5000;

      if (outputs.recommended) outputs.recommended.textContent = idr.format(perWorker);
      if (outputs.range) outputs.range.textContent = `Rentang wajar ${idr.format(low)} – ${idr.format(high)}`;
      if (outputs.duration) outputs.duration.textContent = `${duration} jam × ${idr.format(hourlyBase)}`;
      if (outputs.risk) outputs.risk.textContent = `${riskLabels[risk]} (${Math.round((riskMultiplier - 1) * 100)}%)`;
      if (outputs.distance) outputs.distance.textContent = `${distance.toLocaleString("id-ID")} km · ${idr.format(travelAllowance)}`;
      if (outputs.skill) outputs.skill.textContent = skillLabels[skill];
      if (outputs.total) outputs.total.textContent = idr.format(total);
      if (outputs.hidden) outputs.hidden.value = perWorker;
    };

    estimatorForm.addEventListener("input", calculate);
    estimatorForm.addEventListener("change", calculate);
    calculate();

    estimatorForm.addEventListener("submit", (event) => {
      event.preventDefault();
      showToast("Lowongan siap dipublikasikan", "Data valid dan rekomendasi upah sudah dihitung.");
    });

    estimatorForm.querySelectorAll("[data-save-draft]").forEach((button) => {
      button.addEventListener("click", () => showToast("Draft tersimpan", "Perubahan disimpan secara lokal pada prototipe."));
    });
  }

  // Applicant search and filters
  const applicantSearches = [...document.querySelectorAll("[data-applicant-search]")];
  const statusFilter = document.querySelector("[data-applicant-status]");
  const distanceFilter = document.querySelector("[data-applicant-distance]");
  const applicantCards = [...document.querySelectorAll("[data-applicant-card]")];
  let applicantQuery = "";

  const filterApplicants = () => {
    const query = applicantQuery.trim().toLowerCase();
    const status = statusFilter?.value || "all";
    const distance = Number(distanceFilter?.value) || Infinity;

    let visible = 0;
    applicantCards.forEach((card) => {
      const name = card.dataset.name?.toLowerCase() || "";
      const cardStatus = card.dataset.status || "new";
      const cardDistance = Number(card.dataset.distance) || 0;
      const show = (!query || name.includes(query)) && (status === "all" || status === cardStatus) && cardDistance <= distance;
      card.hidden = !show;
      if (show) visible += 1;
    });

    const result = document.querySelector("[data-applicant-result]");
    if (result) result.textContent = `${visible} pelamar ditampilkan`;
  };

  applicantSearches.forEach((field) => {
    field.addEventListener("input", () => {
      applicantQuery = field.value;
      applicantSearches.forEach((other) => {
        if (other !== field) other.value = applicantQuery;
      });
      filterApplicants();
    });
  });
  [statusFilter, distanceFilter].forEach((field) => field?.addEventListener("change", filterApplicants));
  if (applicantCards.length) filterApplicants();

  document.querySelectorAll("[data-reset-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      applicantQuery = "";
      applicantSearches.forEach((field) => (field.value = ""));
      if (statusFilter) statusFilter.value = "all";
      if (distanceFilter) distanceFilter.value = "999";
      filterApplicants();
    });
  });

  // Modal hiring flow
  const modalBackdrop = document.querySelector("[data-modal-backdrop]");
  let selectedApplicantCard = null;

  function openModal(card) {
    if (!modalBackdrop || !card) return;
    selectedApplicantCard = card;
    const name = card.dataset.name || "Pelamar";
    const wage = card.dataset.wage || "-";
    const distance = card.dataset.distance || "-";

    modalBackdrop.querySelector("[data-modal-name]").textContent = name;
    modalBackdrop.querySelector("[data-modal-wage]").textContent = wage;
    modalBackdrop.querySelector("[data-modal-distance]").textContent = `${distance} km`;
    modalBackdrop.hidden = false;
    modalBackdrop.querySelector("button")?.focus();
  }

  function closeModal() {
    if (!modalBackdrop) return;
    modalBackdrop.hidden = true;
    selectedApplicantCard = null;
  }

  window.closeModal = closeModal;

  document.querySelectorAll("[data-hire-applicant]").forEach((button) => {
    button.addEventListener("click", () => openModal(button.closest("[data-applicant-card]")));
  });

  document.querySelectorAll("[data-modal-close]").forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  modalBackdrop?.addEventListener("click", (event) => {
    if (event.target === modalBackdrop) closeModal();
  });

  document.querySelector("[data-confirm-hire]")?.addEventListener("click", () => {
    if (!selectedApplicantCard) return;
    const name = selectedApplicantCard.dataset.name || "Pelamar";
    selectedApplicantCard.dataset.status = "hired";
    selectedApplicantCard.querySelector("[data-applicant-status-label]")?.replaceChildren("Terpilih");
    selectedApplicantCard.querySelector("[data-hire-applicant]")?.setAttribute("disabled", "disabled");
    selectedApplicantCard.querySelector("[data-hire-applicant]")?.replaceChildren("Terpilih");

    const quotaValues = [...document.querySelectorAll("[data-quota-value]")];
    const quotaRing = document.querySelector("[data-quota-ring]");
    if (quotaValues.length) {
      const current = Number(quotaValues[0].dataset.current || 5) + 1;
      const total = Number(quotaValues[0].dataset.total || 8);
      quotaValues.forEach((quotaValue) => {
        quotaValue.dataset.current = String(Math.min(current, total));
        quotaValue.textContent = `${Math.min(current, total)}/${total}`;
      });
      if (quotaRing) {
        const percentage = Math.min(100, (current / total) * 100);
        quotaRing.style.background = `conic-gradient(var(--orange) 0 ${percentage}%, #edf0ee ${percentage}% 100%)`;
      }
    }

    closeModal();
    filterApplicants();
    showToast("Pekerja dipilih", `${name} ditambahkan ke daftar pekerja terpilih.`);
  });

  // Generic prototype actions
  document.querySelectorAll("[data-demo-action]").forEach((button) => {
    button.addEventListener("click", () => {
      showToast(button.dataset.demoTitle || "Aksi berhasil", button.dataset.demoMessage || "Interaksi prototipe berhasil dijalankan.");
    });
  });

  function showToast(title, message) {
    const region = document.querySelector("[data-toast-region]");
    if (!region) return;

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.innerHTML = `
      <span class="material-symbols-rounded" aria-hidden="true">check_circle</span>
      <div><strong></strong><span></span></div>
    `;
    toast.querySelector("strong").textContent = title;
    toast.querySelector("span:last-child").textContent = message;
    region.appendChild(toast);

    window.setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(8px)";
      window.setTimeout(() => toast.remove(), 180);
    }, 3200);
  }
})();
