/**
 * ALPINA VIAGENS — JAVASCRIPT ENGINE
 * Experiência suíça de alto padrão:
 * - Painel Solari Split-Flap com áudio mecânico sintetizado (Web Audio API)
 * - 3D Tilt interativo nos cartões de pacotes
 * - Seleção inteligente de roteiro com auto-preenchimento
 * - Máscara automática de WhatsApp
 * - Modal de confirmação exclusivo Alpina Viagens
 * - Scrollspy na navegação
 * - Sistema de Tradução Completa (Português, Inglês, Alemão)
 * Telefone oficial configurado: +55 (11) 93905-6979
 */

(function () {
  "use strict";

  /* ==========================================================================
     1. CONFIGURAÇÕES CENTRAIS
     ========================================================================== */
  const WHATSAPP_NUMBER = "5511939056979"; // Número oficial da Alpina Viagens
  const PHONE_DISPLAY = "+55 (11) 93905-6979";

  const PRICES = {
    "jan-mar": {
      essencial: { valor: "R$ 12.900", num: 12900 },
      premium: { valor: "R$ 17.400", num: 17400 },
      exclusivo: { valor: "R$ 23.900", num: 23900 }
    },
    "abr-jun": {
      essencial: { valor: "R$ 13.900", num: 13900 },
      premium: { valor: "R$ 18.600", num: 18600 },
      exclusivo: { valor: "R$ 25.400", num: 25400 }
    }
  };

  const INSTALLMENTS = {
    "jan-mar": {
      essencial: {
        pt: "12x de R$ 1.075 sem juros",
        en: "12x from R$ 1,075 interest-free",
        de: "12x ab R$ 1.075 zinsfrei"
      },
      premium: {
        pt: "12x de R$ 1.450 sem juros",
        en: "12x from R$ 1,450 interest-free",
        de: "12x ab R$ 1.450 zinsfrei"
      },
      exclusivo: {
        pt: "12x de R$ 1.991 sem juros",
        en: "12x from R$ 1,991 interest-free",
        de: "12x ab R$ 1.991 zinsfrei"
      }
    },
    "abr-jun": {
      essencial: {
        pt: "12x de R$ 1.158 sem juros",
        en: "12x from R$ 1,158 interest-free",
        de: "12x ab R$ 1.158 zinsfrei"
      },
      premium: {
        pt: "12x de R$ 1.550 sem juros",
        en: "12x from R$ 1,550 interest-free",
        de: "12x ab R$ 1.550 zinsfrei"
      },
      exclusivo: {
        pt: "12x de R$ 2.116 sem juros",
        en: "12x from R$ 2,116 interest-free",
        de: "12x ab R$ 2.116 zinsfrei"
      }
    }
  };

  const WINDOW_LABELS = {
    "jan-mar": {
      pt: "01 JAN — 31 MAR",
      en: "01 JAN — 31 MAR",
      de: "01. JAN — 31. MÄR"
    },
    "abr-jun": {
      pt: "01 ABR — 30 JUN",
      en: "01 APR — 30 JUN",
      de: "01. APR — 30. JUN"
    }
  };

  let currentWindow = "jan-mar";
  let currentLang = "pt";
  let soundEnabled = true;

  /* ==========================================================================
     2. ÁUDIO SINTETIZADO (Web Audio API — Cliques de Painel Solari)
     Zero dependências externas, garantindo que o som sempre funcione.
     ========================================================================== */
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  }

  // Som mecânico característico de flip em estações ferroviárias suíças (SBB CFF FFS)
  function playFlapSound() {
    if (!soundEnabled) return;
    initAudio();
    if (!audioCtx) return;

    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(120 + Math.random() * 80, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.05);
    } catch (e) {
      // Audio fallback silencioso
    }
  }

  /* ==========================================================================
     3. WHATSAPP LINK BUILDER
     ========================================================================== */
  function buildWhatsAppUrl(message) {
    const base = `https://wa.me/${WHATSAPP_NUMBER}`;
    return message ? `${base}?text=${encodeURIComponent(message)}` : base;
  }

  function setupStaticWhatsAppLinks() {
    const defaultMsg = "Olá! Gostaria de falar com um consultor da Alpina Viagens sobre os roteiros para a Suíça.";
    const links = document.querySelectorAll("[data-wpp-link]");
    links.forEach((link) => {
      link.setAttribute("href", buildWhatsAppUrl(defaultMsg));
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    });
  }

  /* ==========================================================================
     4. QUADRO DE HORÁRIOS & SELEÇÃO DE JANELA (SOLARI SPLIT-FLAP)
     ========================================================================== */
  function triggerFlap(element, newText) {
    if (!element) return;
    element.classList.remove("is-flipping");
    void element.offsetWidth; // Force reflow
    element.textContent = newText;
    element.classList.add("is-flipping");
    playFlapSound();
  }

  function setDepartureWindow(windowKey) {
    currentWindow = windowKey;

    // Atualiza os botões de janela
    document.querySelectorAll(".window-btn").forEach((btn) => {
      const isActive = btn.getAttribute("data-window") === windowKey;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    // Atualiza valores no quadro de horários
    document.querySelectorAll("[data-flap-price]").forEach((el) => {
      const pkg = el.getAttribute("data-flap-price");
      if (PRICES[windowKey] && PRICES[windowKey][pkg]) {
        triggerFlap(el, PRICES[windowKey][pkg].valor);
      }
    });

    document.querySelectorAll("[data-flap-window]").forEach((el) => {
      const label = (WINDOW_LABELS[windowKey] && WINDOW_LABELS[windowKey][currentLang]) 
        ? WINDOW_LABELS[windowKey][currentLang] 
        : WINDOW_LABELS[windowKey].pt;
      triggerFlap(el, label);
    });

    // Atualiza os preços nos cartões de pacotes
    document.querySelectorAll("[data-card-price]").forEach((el) => {
      const pkg = el.getAttribute("data-card-price");
      if (PRICES[windowKey] && PRICES[windowKey][pkg]) {
        el.textContent = PRICES[windowKey][pkg].valor;
      }
    });

    document.querySelectorAll("[data-card-installments]").forEach((el) => {
      const pkg = el.getAttribute("data-card-installments");
      if (INSTALLMENTS[windowKey] && INSTALLMENTS[windowKey][pkg]) {
        el.textContent = INSTALLMENTS[windowKey][pkg][currentLang] || INSTALLMENTS[windowKey][pkg].pt;
      }
    });

    // Sincroniza com o formulário de reserva
    const janelaSelect = document.getElementById("janelaInput");
    if (janelaSelect) {
      janelaSelect.selectedIndex = windowKey === "jan-mar" ? 0 : 1;
      updateLiveSummary();
    }
  }

  function initDepartureBoard() {
    const windowButtons = document.querySelectorAll(".window-btn");
    windowButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        setDepartureWindow(btn.getAttribute("data-window"));
      });
    });

    // Botões "Escolher" e "Reservar" nas linhas do quadro e cartões
    document.querySelectorAll("[data-choose-line]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const lineName = btn.getAttribute("data-choose-line");
        const pkgKey = btn.getAttribute("data-pkg-key") || "premium";
        const lineIdx = pkgKey === "essencial" ? 0 : (pkgKey === "exclusivo" ? 2 : 1);
        const price = (PRICES[currentWindow] && PRICES[currentWindow][pkgKey]) 
          ? PRICES[currentWindow][pkgKey].valor 
          : "sob consulta";

        // 1. Atualiza campos do formulário
        const linhaSelect = document.getElementById("linhaInput");
        if (linhaSelect) {
          linhaSelect.selectedIndex = lineIdx;
        }

        const janelaSelect = document.getElementById("janelaInput");
        if (janelaSelect) {
          janelaSelect.selectedIndex = currentWindow === "jan-mar" ? 0 : 1;
        }
        updateLiveSummary();

        // 2. Feedback elegante via Toast
        const t = TRANSLATIONS[currentLang] || TRANSLATIONS.pt;
        const lineDisplayName = t.select_linhas ? t.select_linhas[lineIdx] : (linhaSelect ? linhaSelect.options[lineIdx].text : lineName);
        const msgTemplate = t.toast_line_selected || "✦ Linha {line} selecionada ({price}/pessoa). Finalize seus dados abaixo para receber sua proposta.";
        const feedbackMsg = msgTemplate.replace("{line}", lineDisplayName).replace("{price}", price);
        showAlpinaToast(feedbackMsg);

        // 3. Scroll suave para o formulário de reserva com destaque visual
        const contatoSec = document.getElementById("contato");
        if (contatoSec) {
          contatoSec.scrollIntoView({ behavior: "smooth" });
          const formCard = document.querySelector(".contact-form-card");
          if (formCard) {
            formCard.classList.remove("pulse-highlight");
            void formCard.offsetWidth;
            formCard.classList.add("pulse-highlight");
          }
          const nomeInput = document.getElementById("nomeInput");
          if (nomeInput) {
            setTimeout(() => nomeInput.focus(), 500);
          }
        }
      });
    });

    // Botão de alternar som
    const soundToggle = document.getElementById("soundToggleBtn");
    if (soundToggle) {
      soundToggle.addEventListener("click", () => {
        soundEnabled = !soundEnabled;
        const t = TRANSLATIONS[currentLang] || TRANSLATIONS.pt;
        soundToggle.textContent = soundEnabled ? (t.sound_on || "🔊 Som Ativado") : (t.sound_off || "🔇 Som Mudo");
        if (soundEnabled) playFlapSound();
      });
    }
  }

  /* ==========================================================================
     5. INTERACTIVE 3D TILT EFFECT
     Perspective tilt nos cards com cálculo de vetor do mouse
     ========================================================================== */
  function init3DTilt() {
    const tiltCards = document.querySelectorAll(".package-card, .experience-quote-card");

    tiltCards.forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -9; // Max 9 deg
        const rotateY = ((x - centerX) / centerX) * 9;

        card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-6px)`;
      });

      card.addEventListener("mouseleave", () => {
        card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)`;
      });
    });
  }

  /* ==========================================================================
     6. FILTRAGEM DO ROTEIRO DIA A DIA
     ========================================================================== */
  function initItineraryFilter() {
    const filterBtns = document.querySelectorAll(".itinerary-filter-btn");
    const timelineItems = document.querySelectorAll(".timeline-card");

    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        filterBtns.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");

        const target = btn.getAttribute("data-filter");
        timelineItems.forEach((item) => {
          const itemLines = item.getAttribute("data-lines") || "";
          if (target === "all" || itemLines.includes(target)) {
            item.style.display = "flex";
            item.style.animation = "fadeInCard 0.4s ease forwards";
          } else {
            item.style.display = "none";
          }
        });
      });
    });
  }

  /* ==========================================================================
     7. FORMULÁRIO DE RESERVA & RESUMO AO VIVO
     ========================================================================== */
  function updateLiveSummary() {
    const summaryEl = document.getElementById("liveSummaryText");
    if (!summaryEl) return;

    const viajantesSelect = document.getElementById("viajantesInput");
    const linhaSelect = document.getElementById("linhaInput");
    const janelaSelect = document.getElementById("janelaInput");

    const vVal = viajantesSelect ? parseInt(viajantesSelect.value) || 2 : 2;
    const lIdx = linhaSelect ? linhaSelect.selectedIndex : 1;
    const jIdx = janelaSelect ? janelaSelect.selectedIndex : 0;

    const key = jIdx === 0 ? "jan-mar" : "abr-jun";
    let pkgKey = "premium";
    if (lIdx === 0) pkgKey = "essencial";
    if (lIdx === 2) pkgKey = "exclusivo";

    const unitPrice = PRICES[key][pkgKey].num;
    const total = unitPrice * vVal;
    const formattedTotal = total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const t = TRANSLATIONS[currentLang] || TRANSLATIONS.pt;
    const lineLabel = t.select_linhas ? t.select_linhas[lIdx] : (linhaSelect ? linhaSelect.options[lIdx].text : "Linha Premium");
    const windowLabel = t.select_janelas ? t.select_janelas[jIdx] : (janelaSelect ? janelaSelect.options[jIdx].text : "Janeiro a Março");

    let prefix = "";
    if (currentLang === "de") {
      prefix = `${vVal} Reisende(r) · ${lineLabel} (${windowLabel}):`;
    } else if (currentLang === "en") {
      prefix = `${vVal} traveler(s) · ${lineLabel} (${windowLabel}):`;
    } else {
      prefix = `${vVal} viajante(s) · ${lineLabel} (${windowLabel}):`;
    }

    summaryEl.innerHTML = `<span>${prefix}</span> <strong>${formattedTotal}</strong>`;
  }

  function initBookingForm() {
    const form = document.getElementById("travelBookingForm");
    if (!form) return;

    ["viajantesInput", "linhaInput", "janelaInput"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("change", updateLiveSummary);
    });
    updateLiveSummary();

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const nome = document.getElementById("nomeInput").value.trim();
      const whatsapp = document.getElementById("whatsInput").value.trim();
      const viajantesSelect = document.getElementById("viajantesInput");
      const linhaSelect = document.getElementById("linhaInput");
      const janelaSelect = document.getElementById("janelaInput");
      const mensagem = document.getElementById("mensagemInput").value.trim();

      const vVal = viajantesSelect ? viajantesSelect.value : "2";
      const lIdx = linhaSelect ? linhaSelect.selectedIndex : 1;
      const jIdx = janelaSelect ? janelaSelect.selectedIndex : 0;

      const key = jIdx === 0 ? "jan-mar" : "abr-jun";
      let pkgKey = "premium";
      if (lIdx === 0) pkgKey = "essencial";
      if (lIdx === 2) pkgKey = "exclusivo";

      const totalEstimado = (PRICES[key][pkgKey].num * (parseInt(vVal) || 1)).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
      });

      const t = TRANSLATIONS[currentLang] || TRANSLATIONS.pt;
      const lineName = t.select_linhas ? t.select_linhas[lIdx] : (linhaSelect ? linhaSelect.options[lIdx].text : "Linha Premium");
      const windowName = t.select_janelas ? t.select_janelas[jIdx] : (janelaSelect ? janelaSelect.options[jIdx].text : "Janeiro a Março");

      let wppText = "";
      if (currentLang === "de") {
        wppText =
`🇨🇭 *Alpina Reiseplanung — Schweiz 2027*

• *Name:* ${nome}
• *WhatsApp / Telefon:* ${whatsapp}
• *Reisende:* ${vVal}
• *Reiseroute:* ${lineName}
• *Abfahrtsfenster:* ${windowName}
• *Anmerkungen:* ${mensagem || "Keine besonderen Wünsche angegeben."}

Hallo! Ich möchte ein detailliertes Angebot erhalten und die Verfügbarkeit für meine Reise prüfen.`;
      } else if (currentLang === "en") {
        wppText =
`🇨🇭 *Alpina Travel Planning — Switzerland 2027*

• *Name:* ${nome}
• *WhatsApp / Phone:* ${whatsapp}
• *Travelers:* ${vVal}
• *Itinerary:* ${lineName}
• *Departure Window:* ${windowName}
• *Notes:* ${mensagem || "No special preferences specified."}

Hello! I would like to receive the detailed proposal and check availability for my itinerary.`;
      } else {
        wppText =
`🇨🇭 *Planejamento Alpina Viagens — Suíça 2027*

• *Nome:* ${nome}
• *WhatsApp:* ${whatsapp}
• *Viajantes:* ${vVal}
• *Linha de Interesse:* ${lineName}
• *Janela de Embarque:* ${windowName}
• *Observações:* ${mensagem || "Nenhuma observação informada."}

Olá! Gostaria de receber a cotação detalhada e verificar disponibilidade para o meu roteiro.`;
      }

      const labels = t.modal_labels || { pax: "Viajante", wpp: "WhatsApp", route: "Roteiro", window: "Janela 2027", passengers: "Passageiros", price: "Investimento Estimado" };

      const summaryHtml = `
        <div class="modal-summary-grid">
          <div class="summary-item"><span>${labels.pax}</span><strong>${nome}</strong></div>
          <div class="summary-item"><span>${labels.wpp}</span><strong>${whatsapp}</strong></div>
          <div class="summary-item"><span>${labels.route}</span><strong>${lineName}</strong></div>
          <div class="summary-item"><span>${labels.window}</span><strong>${windowName}</strong></div>
          <div class="summary-item"><span>${labels.passengers}</span><strong>${vVal}</strong></div>
          <div class="summary-item"><span>${labels.price}</span><strong>${totalEstimado}</strong></div>
        </div>
        ${mensagem ? `<p class="summary-note"><em>"${mensagem}"</em></p>` : ""}
      `;

      let modalTitle = t.modal_title || "Solicitação Registrada com Sucesso!";
      let modalLead = "";
      if (currentLang === "de") {
        modalLead = `Sehr geehrte(r) <strong>${nome}</strong>, Ihre Reiseplanung für die Schweiz wurde mit höchster Schweizer Sorgfalt zusammengestellt.`;
      } else if (currentLang === "en") {
        modalLead = `Dear <strong>${nome}</strong>, your Swiss travel itinerary has been curated with distinction and precision.`;
      } else {
        modalLead = `Prezado(a) <strong>${nome}</strong>, seu planejamento para a Suíça foi estruturado com excelência.`;
      }

      openAlpinaModal({
        title: modalTitle,
        lead: modalLead,
        summaryHtml: summaryHtml,
        wppUrl: buildWhatsAppUrl(wppText)
      });

      window.open(buildWhatsAppUrl(wppText), "_blank");
      showAlpinaToast(t.toast_submitted || "✦ Solicitação enviada! Abrindo atendimento no WhatsApp...");
    });
  }

  /* ==========================================================================
     8. FORMULÁRIO DE PARCEIROS (Página Trabalhe Conosco)
     ========================================================================== */
  function initPartnerForm() {
    const partnerForm = document.getElementById("partnerAgencyForm");
    if (!partnerForm) return;

    partnerForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const agencia = document.getElementById("agencyName").value.trim();
      const cidade = document.getElementById("agencyCity").value.trim();
      const resp = document.getElementById("agencyContact").value.trim();
      const wpp = document.getElementById("agencyWhatsapp").value.trim();
      const msg = document.getElementById("agencyMsg").value.trim();

      const t = TRANSLATIONS[currentLang] || TRANSLATIONS.pt;
      let wppText = "";
      if (currentLang === "de") {
        wppText =
`🤝 *Registrierung als Partneragentur — Alpina Reisen*

• *Agentur:* ${agencia}
• *Stadt / Land:* ${cidade}
• *Ansprechpartner:* ${resp}
• *Gewerbliches WhatsApp:* ${wpp}
• *Nachricht:* ${msg || "Ich möchte die Verkaufsunterlagen von Alpina erhalten."}`;
      } else if (currentLang === "en") {
        wppText =
`🤝 *Partner Agency Registration — Alpina Travel*

• *Agency:* ${agencia}
• *City / Country:* ${cidade}
• *Contact:* ${resp}
• *Commercial WhatsApp:* ${wpp}
• *Message:* ${msg || "I would like to receive the Alpina commercial presentation."}`;
      } else {
        wppText =
`🤝 *Cadastro de Agência Parceira — Alpina Viagens*

• *Agência:* ${agencia}
• *Cidade / UF:* ${cidade}
• *Responsável:* ${resp}
• *WhatsApp Comercial:* ${wpp}
• *Mensagem:* ${msg || "Gostaria de receber a apresentação comercial da Alpina."}`;
      }

      const labels = t.b2b_modal_labels || { agency: "Agência", city: "Cidade / UF", contact: "Responsável", wpp: "WhatsApp Comercial" };

      const summaryHtml = `
        <div class="modal-summary-grid">
          <div class="summary-item"><span>${labels.agency}</span><strong>${agencia}</strong></div>
          <div class="summary-item"><span>${labels.city}</span><strong>${cidade}</strong></div>
          <div class="summary-item"><span>${labels.contact}</span><strong>${resp}</strong></div>
          <div class="summary-item"><span>${labels.wpp}</span><strong>${wpp}</strong></div>
        </div>
        ${msg ? `<p class="summary-note"><em>"${msg}"</em></p>` : ""}
      `;

      let modalTitle = t.b2b_modal_title || "Credenciamento Solicitado!";
      let modalLead = "";
      if (currentLang === "de") {
        modalLead = `Vielen Dank, <strong>${resp}</strong>! Die Registrierung der Agentur <strong>${agencia}</strong> wurde erfolgreich erfasst.`;
      } else if (currentLang === "en") {
        modalLead = `Thank you, <strong>${resp}</strong>! The registration for agency <strong>${agencia}</strong> has been logged.`;
      } else {
        modalLead = `Obrigado, <strong>${resp}</strong>! A solicitação da agência <strong>${agencia}</strong> foi registrada.`;
      }

      openAlpinaModal({
        title: modalTitle,
        lead: modalLead,
        summaryHtml: summaryHtml,
        wppUrl: buildWhatsAppUrl(wppText)
      });

      window.open(buildWhatsAppUrl(wppText), "_blank");
      showAlpinaToast(t.toast_b2b_submitted || "✦ Cadastro enviado! Abrindo canal de parceiros no WhatsApp...");
    });
  }

  /* ==========================================================================
     9. MODAL EXCLUSIVO ALPINA VIAGENS & SISTEMA DE TOAST
     ========================================================================== */
  function openAlpinaModal(data) {
    const modal = document.getElementById("alpinaBookingModal");
    if (!modal) return;

    const titleEl = document.getElementById("alpinaModalTitle");
    const leadEl = document.getElementById("alpinaModalLead");
    const summaryEl = document.getElementById("alpinaModalSummary");
    const wppBtn = document.getElementById("alpinaModalWppAction");

    if (titleEl && data.title) titleEl.textContent = data.title;
    if (leadEl && data.lead) leadEl.innerHTML = data.lead;
    if (summaryEl && data.summaryHtml) summaryEl.innerHTML = data.summaryHtml;
    if (wppBtn && data.wppUrl) wppBtn.setAttribute("href", data.wppUrl);

    modal.classList.add("is-active");
    document.body.style.overflow = "hidden";
  }

  function closeAlpinaModal() {
    const modal = document.getElementById("alpinaBookingModal");
    if (modal) {
      modal.classList.remove("is-active");
      document.body.style.overflow = "";
    }
  }

  function initAlpinaModal() {
    const modal = document.getElementById("alpinaBookingModal");
    if (!modal) return;

    const closeBtn = document.getElementById("closeAlpinaModalBtn");
    const closeAction = document.getElementById("alpinaModalCloseAction");

    if (closeBtn) closeBtn.addEventListener("click", closeAlpinaModal);
    if (closeAction) closeAction.addEventListener("click", closeAlpinaModal);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeAlpinaModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("is-active")) {
        closeAlpinaModal();
      }
    });
  }

  // Toast leve e elegante para notificações na tela
  let toastTimeout = null;
  function showAlpinaToast(message, duration = 4000) {
    const toast = document.getElementById("alpinaToast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("is-visible");

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove("is-visible");
    }, duration);
  }

  /* ==========================================================================
     10. MÁSCARA AUTOMÁTICA DE TELEFONE (WHATSAPP BRASIL)
     ========================================================================== */
  function formatPhone(value) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : "";
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  function initPhoneMasks() {
    const inputs = [
      document.getElementById("whatsInput"),
      document.getElementById("agencyWhatsapp")
    ];

    inputs.forEach((input) => {
      if (!input) return;
      input.addEventListener("input", (e) => {
        const cursor = e.target.selectionStart;
        const prevLength = e.target.value.length;
        e.target.value = formatPhone(e.target.value);
        const newLength = e.target.value.length;
        if (cursor && prevLength !== newLength) {
          e.target.setSelectionRange(cursor + (newLength - prevLength), cursor + (newLength - prevLength));
        }
      });
    });
  }

  /* ==========================================================================
     11. NAVEGAÇÃO, SCROLLSPY & MOBILE MENU
     ========================================================================== */
  function initNavigation() {
    const topbar = document.querySelector(".topbar");
    const toggle = document.getElementById("mobileNavToggle");
    const navLinks = document.querySelector(".nav-links");
    const navAnchors = document.querySelectorAll(".nav-links a[href^='#']");
    const sections = [];

    navAnchors.forEach((a) => {
      const id = a.getAttribute("href").replace("#", "");
      const sec = document.getElementById(id);
      if (sec) sections.push({ anchor: a, section: sec });
    });

    window.addEventListener("scroll", () => {
      const scrollPos = window.scrollY;

      // Topbar blur / shadow no scroll
      if (topbar) {
        topbar.classList.toggle("scrolled", scrollPos > 30);
      }

      // Scrollspy indicador de seção ativa
      if (sections.length > 0) {
        const offset = 120;
        let currentActive = null;

        sections.forEach(({ anchor, section }) => {
          const top = section.offsetTop - offset;
          const height = section.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            currentActive = anchor;
          }
        });

        navAnchors.forEach((a) => a.classList.remove("is-active"));
        if (currentActive) {
          currentActive.classList.add("is-active");
        }
      }
    });

    if (toggle && navLinks) {
      toggle.addEventListener("click", () => {
        const isOpen = navLinks.classList.toggle("mobile-open");
        toggle.classList.toggle("is-active", isOpen);
      });

      navLinks.querySelectorAll("a").forEach((a) => {
        a.addEventListener("click", () => {
          navLinks.classList.remove("mobile-open");
          toggle.classList.remove("is-active");
        });
      });
    }
  }

  /* ==========================================================================
     12. SELETOR DE IDIOMAS & DICIONÁRIO DE TRADUÇÃO COMPLETO (PT, EN, DE)
     ========================================================================== */
  const FLAG_SVGS = {
    pt: `
      <svg class="lang-flag-svg" viewBox="0 0 640 480" width="20" height="15" aria-hidden="true">
        <rect width="640" height="480" fill="#009c3b" rx="40"/>
        <polygon points="320,40 590,240 320,440 50,240" fill="#ffdf00"/>
        <circle cx="320" cy="240" r="120" fill="#002776"/>
        <path d="M 200,240 A 120,120 0 0,0 440,240 A 130,130 0 0,1 200,240" fill="#ffffff"/>
      </svg>
    `,
    en: `
      <svg class="lang-flag-svg" viewBox="0 0 640 480" width="20" height="15" aria-hidden="true">
        <clipPath id="uk-flag-clip-cur"><rect width="640" height="480" rx="40"/></clipPath>
        <g clip-path="url(#uk-flag-clip-cur)">
          <rect width="640" height="480" fill="#012169"/>
          <path d="M0,0 L640,480 M640,0 L0,480" stroke="#ffffff" stroke-width="64"/>
          <path d="M0,0 L640,480 M640,0 L0,480" stroke="#c8102e" stroke-width="24"/>
          <path d="M320,0 V480 M0,240 H640" stroke="#ffffff" stroke-width="106"/>
          <path d="M320,0 V480 M0,240 H640" stroke="#c8102e" stroke-width="64"/>
        </g>
      </svg>
    `,
    de: `
      <svg class="lang-flag-svg" viewBox="0 0 640 480" width="20" height="15" aria-hidden="true">
        <clipPath id="de-flag-clip-cur"><rect width="640" height="480" rx="40"/></clipPath>
        <g clip-path="url(#de-flag-clip-cur)">
          <rect width="640" height="160" y="0" fill="#000000"/>
          <rect width="640" height="160" y="160" fill="#dd0000"/>
          <rect width="640" height="160" y="320" fill="#ffce00"/>
        </g>
      </svg>
    `
  };

  const TRANSLATIONS = {
    pt: {
      code: "PT",
      toast: "✦ Idioma alterado para Português (Brasil)",
      page_title: "Alpina Viagens | Roteiros Exclusivos pela Suíça 2027",
      page_description: "Viagens exclusivas para a Suíça com a precisão dos trens alpinos. Roteiros Essencial, Premium e Exclusivo em duas janelas de embarque. Atendimento via WhatsApp.",
      sound_on: "🔊 Som Ativado",
      sound_off: "🔇 Som Mudo",
      toast_submitted: "✦ Solicitação enviada! Abrindo atendimento no WhatsApp...",
      toast_b2b_submitted: "✦ Cadastro enviado! Abrindo canal de parceiros no WhatsApp...",
      toast_line_selected: "✦ Linha {line} selecionada ({price}/pessoa). Finalize seus dados abaixo para receber sua proposta.",
      modal_labels: { pax: "Viajante", wpp: "WhatsApp", route: "Roteiro", window: "Janela 2027", passengers: "Passageiros", price: "Investimento Estimado" },
      b2b_modal_labels: { agency: "Agência", city: "Cidade / UF", contact: "Responsável", wpp: "WhatsApp Comercial" },

      // Navegação
      nav_home: "Início",
      nav_itineraries: "Roteiros",
      nav_dates: "Datas & Preços",
      nav_timeline: "Itinerário",
      nav_experiences: "Experiências",
      nav_how: "Como Funciona",
      nav_contact: "Contato",
      nav_partner: "Trabalhe Conosco",
      nav_back: "← Voltar ao Início",
      nav_advantages: "Vantagens",
      nav_material: "Material em PDF",
      nav_register: "Cadastrar Agência",
      nav_cta: "Planejar Viagem",
      nav_cta_partner: "Seja Parceiro",

      // Kinetic Ticker
      ticker_brand: "ALPINA VIAGENS",
      ticker_sbb: "SBB CFF FFS PRECISÃO SUÍÇA",
      ticker_trains: "TRENS PANORÂMICOS & GLACIER EXPRESS",
      ticker_zermatt: "ZERMATT & MATTERHORN",
      ticker_jungfrau: "JUNGFRAUJOCH TOPO DA EUROPA",
      ticker_windows: "DUAS JANELAS DE EMBARQUE 2027",
      ticker_whatsapp: "WHATSAPP: +55 (11) 93905-6979",
      ticker_b2b_prog: "PROGRAMA DE PARCEIROS B2B",
      ticker_b2b_comm: "COMISSÕES POR VENDA FECHADA",
      ticker_b2b_mat: "MATERIAL GRÁFICO E DIGITAL COMPLETO",
      ticker_b2b_train: "TREINAMENTO EXCLUSIVO DE PRODUTO",
      ticker_b2b_wpp: "WHATSAPP PARCEIROS: +55 (11) 93905-6979",

      // Hero
      hero_tagline: "Duas Janelas de Embarque · Temporada 2027",
      hero_h1: 'A Suíça tem horário certo<br>para <span class="accent-red">acontecer</span> com você.',
      hero_lede: "Roteiros desenhados por trens panorâmicos de primeira classe, lagos turquesa de cartão-postal, vilarejos alpinos e cidades como Zurique, Lucerna, Interlaken e Zermatt. Escolha sua janela e deixe a precisão suíça transformar sua viagem em arte.",
      hero_cta1: "Ver Janelas & Preços →",
      hero_cta2: "<span>💬</span> Falar com Especialista",
      hero_stat1: "dias totais de roteiros desenhados",
      hero_stat2: "janelas exclusivas de embarque ao ano",
      hero_stat3: "vilarejos e picos alpinos no itinerário",

      // Diferenciais Rápidos
      hl1_title: "Trens Panorâmicos Inclusos",
      hl1_desc: "Swiss Travel Pass 1ª Classe & Vistas Alpinas",
      hl2_title: "Hospedagens Selecionadas",
      hl2_desc: "Hotéis boutique 4 e 5 estrelas no centro",
      hl3_title: "Parcelamento em até 12x",
      hl3_desc: "Sem surpresas cambiais no fechamento",
      hl4_title: "Consultor Pessoal 24/7",
      hl4_desc: "Suporte do planejamento ao retorno",

      // Pacotes / Roteiros
      pkg_eyebrow: "Roteiros sob Medida",
      pkg_section_title: "Três formas de viver a Suíça",
      pkg_section_lede: "Cada roteiro segue um mesmo eixo consagrado — Zurique, Lucerna e Interlaken — e se aprofunda conforme sua disponibilidade. Escolha a extensão ideal e veja a mágica acontecer.",
      price_from: "A partir de",
      price_suffix: "/pessoa",
      badge_popular: "★ Mais Escolhido",

      pkg1_kicker: "Linha Essencial",
      pkg1_title: "8 dias · 7 noites",
      pkg1_route: "Zurique → Lucerna → Interlaken → Zurique",
      pkg1_feat1: "City tour clássico em Zurique e cruzeiro panorâmico no Rio Limmat",
      pkg1_feat2: "Trem panorâmico cênico até Lucerna com visita à Ponte da Capela (Kapellbrücke)",
      pkg1_feat3: "Subida de teleférico ao Monte Rigi ou Pilatus com vista 360° dos Alpes",
      pkg1_feat4: "Funicular histórico até o mirante Harder Kulm sobre os lagos de Interlaken",
      pkg1_feat5: "Café da manhã continental incluso em todos os dias",
      pkg1_btn: "Escolher Roteiro Essencial",

      pkg2_kicker: "Linha Premium",
      pkg2_title: "10 dias · 9 noites",
      pkg2_route: "Zurique → Lucerna → Interlaken → Lauterbrunnen → Grindelwald → Zurique",
      pkg2_feat1: "<strong>Tudo da Linha Essencial incluso</strong>",
      pkg2_feat2: "Passeio de dia inteiro ao Vale de Lauterbrunnen e suas 72 cachoeiras glaciais",
      pkg2_feat3: "Expedição ao <strong>Jungfraujoch (Topo da Europa)</strong> a 3.454m com neve o ano todo",
      pkg2_feat4: "Vilarejo alpino de Grindelwald aos pés da imponente montanha Eiger",
      pkg2_feat5: "Parada fotográfica no Lago Blausee e fim de tarde relaxante no Lago de Brienz",
      pkg2_btn: "Escolher Roteiro Premium",

      pkg3_kicker: "Linha Exclusiva",
      pkg3_title: "12 dias · 11 noites",
      pkg3_route: "Zurique → Lucerna → Interlaken → Zermatt (Matterhorn) → Genebra → St. Moritz",
      pkg3_feat1: "<strong>Tudo da Linha Premium incluso</strong>",
      pkg3_feat2: "Duas noites exclusivas em Zermatt, vila livre de carros aos pés do Matterhorn",
      pkg3_feat3: "Trem de cremalheira até o Gornergrat com vista panorâmica para o Cervino",
      pkg3_feat4: "Trecho panorâmico a bordo do lendário trem <strong>Glacier Express</strong>",
      pkg3_feat5: "Duas noites em St. Moritz e jantar de encerramento em restaurante com estrela Michelin",
      pkg3_btn: "Escolher Roteiro Exclusivo",

      // Painel de Partidas SBB
      board_eyebrow: "Painel de Partidas SBB",
      board_title: "Escolha sua janela de embarque",
      board_lede: "As partidas acontecem em blocos fechados para garantir reservas exclusivas de trens e hotéis. Alterne entre as janelas no seletor abaixo e veja o painel mecânico atualizar os valores em tempo real.",
      tab_jan_mar_label: "Janeiro → Março",
      tab_jan_mar_sub: "Temporada de Neve & Esqui",
      tab_abr_jun_label: "Abril → Junho",
      tab_abr_jun_sub: "Primavera & Lagos Alpinos",
      board_top_left: '<span class="swiss-cross" style="width:14px;height:14px;"></span> SISTEMA SBB CFF FFS · PAINEL OFICIAL ALPINA 2027',
      board_top_status: "STATUS: VAGAS DISPONÍVEIS",
      board_th_line: "Linha / Roteiro",
      board_th_duration: "Duração",
      board_th_window: "Janela de Partida",
      board_th_price: "Preço por Pessoa",
      board_th_action: "Ação",
      board_badge_base: "Base",
      board_badge_popular: "Popular",
      board_badge_vip: "VIP",
      board_flap_essencial: "Essencial",
      board_flap_premium: "Premium",
      board_flap_exclusivo: "Exclusiva",
      board_dur_essencial: "8d / 7n",
      board_dur_premium: "10d / 9n",
      board_dur_exclusivo: "12d / 11n",
      board_btn_book: "Reservar ➔",
      board_note: "<span>ℹ</span> Valores em ocupação dupla por pessoa, com taxas de embarque, traslados de trem e passeios especificados.",

      // Itinerário
      itin_eyebrow: "Itinerário Detalhado",
      itin_title: "A jornada suíça, dia após dia",
      itin_lede: "Conheça os pontos altos do roteiro com fotos reais dos destinos visitados pela Alpina. Use os filtros abaixo para ver os destaques de cada linha.",
      itin_filter_all: "Todos os Dias",
      itin_filter_essencial: "Linha Essencial (Dias 1-3, 7)",
      itin_filter_premium: "Linha Premium (Dias 1-6, 7)",
      itin_filter_exclusivo: "Linha Exclusiva (Extensão Zermatt)",
      itin_d1_pill: "Dia 01 · Chegada",
      itin_d1_title: "Zurique e o Centro Histórico (Altstadt)",
      itin_d1_desc: "Chegada à Suíça e recepção privativa. Caminhada elegante pela famosa Bahnhofstrasse, visita às ruelas medievais do centro histórico e relaxante passeio às margens do Lago de Zurique.",
      itin_d1_t1: "Lago de Zurique",
      itin_d1_t2: "Bahnhofstrasse",
      itin_d1_t3: "Welcome Drink",
      itin_d2_pill: "Dia 02 · História & Montanhas",
      itin_d2_title: "Lucerna e a Ponte da Capela",
      itin_d2_desc: "Viagem panorâmica de trem até a charmosa cidade de Lucerna. Visita à icônica ponte de madeira coberta Kapellbrücke e subida de teleférico ao Monte Pilatus ou Monte Rigi com vistas panorâmicas de tirar o fôlego.",
      itin_d2_t1: "Kapellbrücke",
      itin_d2_t2: "Monte Pilatus",
      itin_d2_t3: "Barco a Vapor",
      itin_d3_pill: "Dia 03 · Entre Lagos",
      itin_d3_title: "Interlaken e o Mirante Harder Kulm",
      itin_d3_desc: "Deslocamento pelos vales alpinos até Interlaken, situada entre os lagos cristalinos de Thun e Brienz. Subida pelo funicular com mais de 100 anos até a plataforma suspensa de Harder Kulm.",
      itin_d3_t1: "Funicular Centenário",
      itin_d3_t2: "Lago de Brienz",
      itin_d3_t3: "Mirante Suspenso",
      itin_d4_pill: "Dia 04 · Cachoeiras Alpinas",
      itin_d4_title: "Vale de Lauterbrunnen e Grindelwald",
      itin_d4_desc: "Exploração do deslumbrante vale glacial de Lauterbrunnen, que inspirou Valfenda de Tolkien com suas 72 cachoeiras e penhascos verticais. Em seguida, subida ao vilarejo alpino de Grindelwald.",
      itin_d4_t1: "Cachoeiras de Staubbach",
      itin_d4_t2: "Grindelwald",
      itin_d4_t3: "Paredão do Eiger",
      itin_d5_pill: "Dia 05 · Topo da Europa",
      itin_d5_title: "Jungfraujoch e Geleira de Aletsch",
      itin_d5_desc: "O ápice da jornada: subida pelo trem de alta montanha até a estação ferroviária mais alta da Europa (3.454 metros). Visita ao Palácio de Gelo e contemplação da colossal Geleira de Aletsch.",
      itin_d5_t1: "3.454 metros",
      itin_d5_t2: "Palácio de Gelo",
      itin_d5_t3: "Neve o Ano Todo",
      itin_d6_pill: "Dia 06 · Natureza Cristalina",
      itin_d6_title: "Lago Blausee e Brienz",
      itin_d6_desc: "Visita ao cinematográfico Parque Natural de Blausee, com suas águas transparentes de cor azul-turquesa cercadas por densa floresta alpina. Final de tarde com pôr do sol nas margens do lago.",
      itin_d6_t1: "Parque Natural Blausee",
      itin_d6_t2: "Barco com Fundo de Vidro",
      itin_d6_t3: "Trilhas Leves",
      itin_d7_pill: "Dias 07-09 · Destaque Exclusivo",
      itin_d7_title: "Zermatt e o Imponente Matterhorn",
      itin_d7_desc: "Dedicado exclusivamente aos viajantes da Linha Exclusiva: chegada a Zermatt, vila pacífica e livre de combustão fóssil. Trem panorâmico ao mirante de Gornergrat com a vista definitiva do pico Matterhorn.",
      itin_d7_t1: "Gornergrat 3.089m",
      itin_d7_t2: "Matterhorn",
      itin_d7_t3: "Vila Car-Free",

      // Experiência
      exp_eyebrow: "A Experiência Alpina",
      exp_title: 'Você escolhe o destino.<br>A Alpina cuida do caminho.',
      exp_lede: "Nosso papel é traduzir o sonho de viajar em um roteiro pontual, elegante e sem preocupações logísticas, com o rigor e a hospitalidade que a Suíça tem de melhor.",
      exp_feat1_title: "Destinos Selecionados",
      exp_feat1_desc: "Cidades e vilarejos autênticos",
      exp_feat2_title: "Roteiros Personalizados",
      exp_feat2_desc: "Ajustados ao seu perfil e ritmo",
      exp_feat3_title: "Trens 1ª Classe",
      exp_feat3_desc: "Swiss Travel Pass de alto padrão",
      exp_feat4_title: "Assistência 24 Horas",
      exp_feat4_desc: "Suporte direto em português",
      exp_quote_body: "Organizamos a viagem pelo relógio suíço: cada trecho tem hora certa para sair, para conectar e para maravilhar.",
      exp_quote_author: "Equipe Alpina Viagens",
      exp_quote_role: "Especialistas em Turismo Suíço",

      // Como Funciona
      how_eyebrow: "Simplicidade & Cuidado",
      how_title: "Como funciona sua reserva",
      how_lede: "Planejar sua ida aos Alpes é simples, transparente e sem atritos burocráticos.",
      how_step1_title: "Escolha a Linha e a Janela",
      how_step1_desc: "Selecione a quantidade de dias (Essencial, Premium ou Exclusivo) e a época do ano que mais combina com seus planos.",
      how_step2_title: "Converse no WhatsApp",
      how_step2_desc: "Fale diretamente com um consultor dedicado, que ajustará datas de voos, hotéis e passeios adicionais sob medida.",
      how_step3_title: "Confirmação & Parcelamento",
      how_step3_desc: "Garanta suas vagas com um sinal e parcele em até 12x, com documentação e vouchers organizados para você.",
      how_step4_title: "Embarque Tranquilo",
      how_step4_desc: "Viaje com roteiro no celular, passagens impressas e assistência remota em português durante todos os dias na Suíça.",

      // Contato e Formulário
      contact_eyebrow: "Atendimento Direto",
      contact_title: "Seu próximo destino começa com uma conversa.",
      contact_lede: "Preencha os campos ao lado para receber um orçamento detalhado no WhatsApp. Nossa equipe especializada retornará com a melhor proposta para seu embarque em 2027.",
      contact_card1_title: "Central WhatsApp",
      contact_card2_title: "Horário de Atendimento",
      contact_card2_desc: "Segunda a Sexta · 08h às 20h (Brasília)",
      contact_card3_title: "Consultoria Especializada",
      contact_card3_desc: "Planejamento exclusivo para a Suíça",
      form_title: "Planejar Minha Viagem",
      form_desc: "Preencha os dados e receba sua cotação personalizada.",
      form_name_label: "Seu Nome Completo",
      form_name_ph: "Como podemos chamar você?",
      form_wpp_label: "Seu WhatsApp",
      form_wpp_ph: "(11) 99999-9999",
      form_pax_label: "Número de Viajantes",
      form_line_label: "Linha de Interesse",
      form_window_label: "Janela de Embarque (2027)",
      form_msg_label: "Mensagem ou Preferências Especiais (Opcional)",
      form_msg_ph: "Ex.: Gostaria de incluir um jantar em Zermatt ou viagem em grupo familiar...",
      form_submit_btn: "<span>🚀</span> Enviar Roteiro & Falar no WhatsApp →",
      select_viajantes: ["1 viajante", "2 viajantes", "3 viajantes", "4 viajantes", "5 ou mais viajantes"],
      select_linhas: ["Linha Essencial (8 dias)", "Linha Premium (10 dias)", "Linha Exclusiva (12 dias)"],
      select_janelas: ["Janeiro a Março (Neve & Esqui)", "Abril a Junho (Primavera nos Alpes)"],

      // B2B Strip & Rodapé
      b2b_strip_title: "Sua agência de viagens pode vender roteiros Alpina",
      b2b_strip_desc: "Condições especiais com repasse de comissão por venda, material impresso e suporte comercial dedicado.",
      b2b_strip_btn: "Conhecer Parceria B2B →",
      footer_bio: "Operadora brasileira especializada exclusivamente em turismo de alto padrão pela Suíça. Viagens estruturadas pelo ritmo dos trens e pela grandiosidade dos Alpes.",
      footer_col1_title: "Navegação",
      footer_col2_title: "Roteiros 2027",
      footer_route_essencial: "Linha Essencial (8 dias)",
      footer_route_premium: "Linha Premium (10 dias)",
      footer_route_exclusivo: "Linha Exclusiva (12 dias)",
      footer_route_b2b: "Área do Parceiro B2B",
      footer_col3_title: "Central de Atendimento",
      footer_col3_sub: "Atendimento comercial e consultoria:",
      footer_col3_note: "Disponível em todo o território nacional.",
      footer_copy: "© 2026 Alpina Viagens. Todos os direitos reservados. CNPJ e operação registrados.",
      footer_credit: "Desenvolvido com excelência técnica e inspiração alpina.",

      // Modal
      modal_badge: "Alpina Viagens · Suíça 2027",
      modal_title: "Solicitação Registrada com Sucesso!",
      modal_lead: "Seu plano de viagem para a Suíça foi processado com a pontualidade e rigor dos trens alpinos.",
      modal_wpp_btn: "<span>💬</span> Conectar no WhatsApp (+55 11 93905-6979)",
      modal_close_btn: "Fechar",
      modal_note: "Abrindo automaticamente o atendimento oficial da Alpina Viagens no WhatsApp.",

      // B2B Trabalhe Conosco
      b2b_page_title: "Trabalhe Conosco | Alpina Viagens — Parcerias para Agências",
      b2b_page_desc: "Sua agência de viagens pode vender roteiros exclusivos da Alpina para a Suíça. Comissões atrativas, material promocional pronto e suporte de ponta a ponta.",
      b2b_hero_badge: "Para Agências de Viagens & Lojas Físicas",
      b2b_hero_h1: 'Leve a Suíça para<br>dentro da sua <span class="accent-red">loja</span>.',
      b2b_hero_lede: "Sua agência de viagens pode revender os roteiros da Alpina para a Suíça com excelente comissão, material de divulgação pronto com espaço para o carimbo da sua loja e um consultor dedicado para esclarecer dúvidas junto ao seu cliente.",
      b2b_hero_btn_pdf: "<span>📥</span> Baixar Folder em PDF (A4)",
      b2b_hero_btn_reg: "Cadastrar Minha Agência ➔",
      b2b_hl1_title: "Comissão Atrativa",
      b2b_hl1_desc: "Repasse garantido em cada pacote vendido",
      b2b_hl2_title: "Material de Divulgação",
      b2b_hl2_desc: "Folder impresso e artes prontas para redes",
      b2b_hl3_title: "Treinamento de Roteiro",
      b2b_hl3_desc: "Capacitação sobre trens e atrações suíças",
      b2b_hl4_title: "Consultor Dedicado",
      b2b_hl4_desc: "Suporte conjunto no fechamento de vendas",
      b2b_adv_eyebrow: "Por que ser parceiro",
      b2b_adv_title: "Vantagens comerciais para sua empresa",
      b2b_adv_lede: "A Alpina cuida da operação dos trens, hotéis e da logística na Suíça. Sua agência cuida do que faz de melhor: atender e encantar o cliente.",
      b2b_card1_kicker: "Financeiro",
      b2b_card1_title: "Comissão por Venda",
      b2b_card1_desc: "Repasse transparente e alinhado ao cronograma do pacote",
      b2b_card1_li1: "Percentual sobre o valor total de cada passageiro fechado",
      b2b_card1_li2: "Condições e bonificações especiais para grupos familiares ou corporativos",
      b2b_card1_li3: "Recebimento sincronizado ao parcelamento do cliente",
      b2b_card1_li4: "Sem metas inalcançáveis ou exigências de exclusividade",
      b2b_card2_badge: "Pronto para Usar",
      b2b_card2_kicker: "Marketing",
      b2b_card2_title: "Material Promocional",
      b2b_card2_desc: "Folder em PDF para impressão e artes para Instagram/WhatsApp",
      b2b_card2_li1: "Folder de 2 páginas diagramado para impressão A4 com espaço para carimbo",
      b2b_card2_li2: "Tabela de datas e preços sempre atualizada com as saídas 2027",
      b2b_card2_li3: "Artes em alta resolução para vitrine física e redes sociais",
      b2b_card2_li4: "Guia digital com respostas para dúvidas frequentes de passageiros",
      b2b_card3_kicker: "Atendimento",
      b2b_card3_title: "Suporte do Consultor",
      b2b_card3_desc: "Especialista Alpina disponível para apoiar seu time de vendas",
      b2b_card3_li1: "Linha direta exclusiva por WhatsApp com especialista em Suíça",
      b2b_card3_li2: "Participação do consultor em reuniões com o passageiro, se desejado",
      b2b_card3_li3: "Montagem ágil de propostas customizadas ou upgrades de 1ª classe",
      b2b_card3_li4: "Acompanhamento do embarque até o retorno dos clientes",
      b2b_pdf_eyebrow: "Material Gráfico",
      b2b_pdf_title: "Um folder pronto para o seu balcão",
      b2b_pdf_lede: "Desenvolvemos um material completo com os 3 roteiros, mapa dos trens, valores das duas janelas de embarque e campo reservado para dados e carimbo da sua agência. Basta baixar e imprimir.",
      b2b_pdf_box_title: "Folder Alpina Viagens — Formato PDF A4",
      b2b_pdf_box_desc: "Material institucional de 2 páginas com roteiros, janela de embarque e condições comerciais para 2027.",
      b2b_pdf_btn: "<span>📥</span> Baixar PDF Agora",
      b2b_step_eyebrow: "Passo a Passo",
      b2b_step_title: "Do cadastro à primeira venda",
      b2b_step_lede: "O processo de credenciamento é rápido, sem taxas de adesão ou burocracia.",
      b2b_step1_title: "Cadastre sua Agência",
      b2b_step1_desc: "Preencha o formulário abaixo ou envie uma mensagem direta no WhatsApp com os dados da empresa.",
      b2b_step2_title: "Alinhamento Comercial",
      b2b_step2_desc: "Nosso consultor apresenta a tabela de comissões, condições de repasse e materiais disponíveis.",
      b2b_step3_title: "Receba o Kit Promocional",
      b2b_step3_desc: "Tenha em mãos o folder para impressão e peças digitais prontas para suas redes sociais.",
      b2b_step4_title: "Comece a Vender",
      b2b_step4_desc: "Ofereça a Suíça aos seus clientes e conte com nosso apoio em cada reserva fechada.",
      b2b_form_eyebrow: "Credenciamento de Agências",
      b2b_form_title: "Cadastre sua agência e comece a vender",
      b2b_form_lede: "Junte-se à nossa rede de parceiros em todo o Brasil. Preencha os dados da sua empresa para que nosso coordenador de parcerias entre em contato imediato via WhatsApp.",
      b2b_form_card1_title: "Atendimento a Parceiros",
      b2b_form_card2_title: "Sem Taxa de Adesão",
      b2b_form_card2_desc: "Credenciamento 100% gratuito",
      b2b_form_head_title: "Formulário de Credenciamento",
      b2b_form_head_desc: "Dados para cadastro no sistema de parceiros Alpina.",
      b2b_form_label_name: "Razão Social ou Nome Fantasia da Agência",
      b2b_form_ph_name: "Ex.: Alpine Turismo e Viagens",
      b2b_form_label_city: "Cidade / Estado (UF)",
      b2b_form_ph_city: "Ex.: São Paulo / SP",
      b2b_form_label_contact: "Nome do Responsável / Agente",
      b2b_form_ph_contact: "Seu nome completo",
      b2b_form_label_wpp: "WhatsApp Comercial da Agência",
      b2b_form_ph_wpp: "(11) 99999-9999",
      b2b_form_label_msg: "Perfil da sua clientela ou dúvidas adicionais",
      b2b_form_ph_msg: "Conte-nos brevemente se sua loja física atende casais, famílias ou grupos...",
      b2b_form_submit: "<span>🚀</span> Enviar Cadastro da Agência →",
      b2b_footer_bio: "Operadora brasileira especializada exclusivamente em roteiros de alta categoria para a Suíça. Parcerias sólidas com operadoras e agências de turismo.",
      b2b_footer_col2_title: "Canal B2B",
      b2b_footer_col3_title: "Central de Parceiros",
      b2b_footer_col3_sub: "Atendimento comercial para agências:",
      b2b_modal_badge: "Alpina Viagens · Parcerias B2B",
      b2b_modal_title: "Cadastro Enviado com Sucesso!",
      b2b_modal_lead: "Os dados da sua agência foram recebidos. Nosso coordenador comercial entrará em contato para liberar os materiais e tabela de repasse.",
      b2b_modal_wpp_btn: "<span>💬</span> Falar com Coordenador no WhatsApp",
      b2b_modal_note: "Conectando com nossa gerência de parcerias da Alpina Viagens."
    },

    en: {
      code: "EN",
      toast: "✦ Language switched to English",
      page_title: "Alpina Travel | Exclusive Switzerland Itineraries 2027",
      page_description: "Exclusive curated journeys through Switzerland aboard panoramic trains. Essential, Premium and Exclusive lines across two departure windows. WhatsApp concierge.",
      sound_on: "🔊 Sound On",
      sound_off: "🔇 Sound Muted",
      toast_submitted: "✦ Request sent! Opening WhatsApp concierge...",
      toast_b2b_submitted: "✦ Registration sent! Opening partner channel on WhatsApp...",
      toast_line_selected: "✦ {line} selected ({price}/person). Enter your details below to receive your customized proposal.",
      modal_labels: { pax: "Traveler", wpp: "WhatsApp", route: "Itinerary", window: "2027 Window", passengers: "Passengers", price: "Estimated Total" },
      b2b_modal_labels: { agency: "Agency", city: "City / Country", contact: "Lead Agent", wpp: "Commercial WhatsApp" },

      // Navigation
      nav_home: "Home",
      nav_itineraries: "Itineraries",
      nav_dates: "Dates & Prices",
      nav_timeline: "Timeline",
      nav_experiences: "Experiences",
      nav_how: "How It Works",
      nav_contact: "Contact",
      nav_partner: "Partner With Us",
      nav_back: "← Back to Home",
      nav_advantages: "Advantages",
      nav_material: "PDF Material",
      nav_register: "Agency Sign-up",
      nav_cta: "Plan Your Trip",
      nav_cta_partner: "Become a Partner",

      // Kinetic Ticker
      ticker_brand: "ALPINA TRAVEL",
      ticker_sbb: "SBB CFF FFS SWISS PRECISION",
      ticker_trains: "PANORAMIC TRAINS & GLACIER EXPRESS",
      ticker_zermatt: "ZERMATT & MATTERHORN",
      ticker_jungfrau: "JUNGFRAUJOCH TOP OF EUROPE",
      ticker_windows: "TWO DEPARTURE WINDOWS 2027",
      ticker_whatsapp: "WHATSAPP: +55 (11) 93905-6979",
      ticker_b2b_prog: "B2B PARTNER PROGRAM",
      ticker_b2b_comm: "COMMISSIONS PER BOOKING",
      ticker_b2b_mat: "COMPLETE PRINT & DIGITAL KIT",
      ticker_b2b_train: "EXCLUSIVE PRODUCT TRAINING",
      ticker_b2b_wpp: "TRADE WHATSAPP: +55 (11) 93905-6979",

      // Hero
      hero_tagline: "Two Departure Windows · Season 2027",
      hero_h1: 'Switzerland has the exact time<br>to <span class="accent-red">happen</span> for you.',
      hero_lede: "Curated itineraries aboard first-class panoramic trains, postcard turquoise lakes, alpine villages and destinations like Zurich, Lucerne, Interlaken and Zermatt. Choose your departure window and let Swiss precision turn your journey into art.",
      hero_cta1: "View Dates & Prices →",
      hero_cta2: "<span>💬</span> Talk to a Specialist",
      hero_stat1: "total days of designed itineraries",
      hero_stat2: "exclusive departure windows per year",
      hero_stat3: "alpine peaks and villages on the route",

      // Fast Highlights
      hl1_title: "Panoramic Trains Included",
      hl1_desc: "1st Class Swiss Travel Pass & Scenic Views",
      hl2_title: "Handpicked Accommodations",
      hl2_desc: "Boutique 4 & 5-star central hotels",
      hl3_title: "Flexible Payment Options",
      hl3_desc: "Locked rates with no currency surprises",
      hl4_title: "Personal Concierge 24/7",
      hl4_desc: "Full guidance from planning to return",

      // Packages
      pkg_eyebrow: "Tailor-made Journeys",
      pkg_section_title: "Three ways to experience Switzerland",
      pkg_section_lede: "Each itinerary follows an iconic alpine axis — Zurich, Lucerne and Interlaken — extending according to your time. Choose the ideal format and watch the magic unfold.",
      price_from: "From",
      price_suffix: "/person",
      badge_popular: "★ Most Popular",

      pkg1_kicker: "Essential Line",
      pkg1_title: "8 days · 7 nights",
      pkg1_route: "Zurich → Lucerne → Interlaken → Zurich",
      pkg1_feat1: "Classic Zurich city tour and scenic Limmat River cruise",
      pkg1_feat2: "Panoramic rail journey to Lucerne and Chapel Bridge (Kapellbrücke) tour",
      pkg1_feat3: "Cable car ascent to Mount Rigi or Pilatus with 360° Alpine vistas",
      pkg1_feat4: "Centennial funicular up to Harder Kulm viewpoint over Interlaken lakes",
      pkg1_feat5: "Continental breakfast included every morning",
      pkg1_btn: "Select Essential Line",

      pkg2_kicker: "Premium Line",
      pkg2_title: "10 days · 9 nights",
      pkg2_route: "Zurich → Lucerne → Interlaken → Lauterbrunnen → Grindelwald → Zurich",
      pkg2_feat1: "<strong>Everything in the Essential Line included</strong>",
      pkg2_feat2: "Full-day exploration of Lauterbrunnen Valley and its 72 glacial waterfalls",
      pkg2_feat3: "Expedition to <strong>Jungfraujoch (Top of Europe)</strong> at 3,454m with year-round snow",
      pkg2_feat4: "Alpine village of Grindelwald nestled beneath the legendary Eiger North Face",
      pkg2_feat5: "Photo stop at Lake Blausee and relaxing sunset by Lake Brienz",
      pkg2_btn: "Select Premium Line",

      pkg3_kicker: "Exclusive Line",
      pkg3_title: "12 days · 11 nights",
      pkg3_route: "Zurich → Lucerne → Interlaken → Zermatt (Matterhorn) → Geneva → St. Moritz",
      pkg3_feat1: "<strong>Everything in the Premium Line included</strong>",
      pkg3_feat2: "Two exclusive nights in car-free Zermatt at the foot of the Matterhorn",
      pkg3_feat3: "Cogwheel train to Gornergrat with panoramic views of the iconic peak",
      pkg3_feat4: "Scenic stretch aboard the world-famous <strong>Glacier Express</strong>",
      pkg3_feat5: "Two nights in St. Moritz and celebratory farewell dinner at a Michelin-starred restaurant",
      pkg3_btn: "Select Exclusive Line",

      // SBB Solari Board
      board_eyebrow: "SBB Departure Board",
      board_title: "Choose your departure window",
      board_lede: "Departures operate in dedicated groups to secure exclusive panoramic train carriages and boutique hotels. Switch between windows below to see the split-flap board update in real time.",
      tab_jan_mar_label: "January → March",
      tab_jan_mar_sub: "Snow & Winter Ski Season",
      tab_abr_jun_label: "April → June",
      tab_abr_jun_sub: "Spring & Alpine Lakes",
      board_top_left: '<span class="swiss-cross" style="width:14px;height:14px;"></span> SBB CFF FFS SYSTEM · OFFICIAL ALPINA BOARD 2027',
      board_top_status: "STATUS: SEATS AVAILABLE",
      board_th_line: "Line / Itinerary",
      board_th_duration: "Duration",
      board_th_window: "Departure Window",
      board_th_price: "Price per Person",
      board_th_action: "Action",
      board_badge_base: "Base",
      board_badge_popular: "Popular",
      board_badge_vip: "VIP",
      board_flap_essencial: "Essential",
      board_flap_premium: "Premium",
      board_flap_exclusivo: "Exclusive",
      board_dur_essencial: "8d / 7n",
      board_dur_premium: "10d / 9n",
      board_dur_exclusivo: "12d / 11n",
      board_btn_book: "Book Now ➔",
      board_note: "<span>ℹ</span> Rates based on double occupancy per person, including departure taxes, scenic rail transfers and specified tours.",

      // Timeline
      itin_eyebrow: "Detailed Itinerary",
      itin_title: "The Swiss journey, day by day",
      itin_lede: "Discover itinerary highlights accompanied by authentic photography of destinations visited by Alpina. Use the filters below to browse highlights for each line.",
      itin_filter_all: "All Days",
      itin_filter_essencial: "Essential Line (Days 1-3, 7)",
      itin_filter_premium: "Premium Line (Days 1-6, 7)",
      itin_filter_exclusivo: "Exclusive Line (Zermatt Extension)",
      itin_d1_pill: "Day 01 · Arrival",
      itin_d1_title: "Zurich & Historical Old Town (Altstadt)",
      itin_d1_desc: "Arrival in Switzerland and private welcome. Elegant stroll along famous Bahnhofstrasse, discovery of medieval old town lanes and a relaxing walk along Lake Zurich shores.",
      itin_d1_t1: "Lake Zurich",
      itin_d1_t2: "Bahnhofstrasse",
      itin_d1_t3: "Welcome Drink",
      itin_d2_pill: "Day 02 · History & Mountains",
      itin_d2_title: "Lucerne & the Chapel Bridge",
      itin_d2_desc: "Scenic train journey to charming Lucerne. Visit the iconic covered wooden Chapel Bridge (Kapellbrücke) and ascend Mount Pilatus or Mount Rigi for breathtaking 360° Alpine views.",
      itin_d2_t1: "Kapellbrücke",
      itin_d2_t2: "Mount Pilatus",
      itin_d2_t3: "Steamboat Cruise",
      itin_d3_pill: "Day 03 · Between Lakes",
      itin_d3_title: "Interlaken & Harder Kulm Viewpoint",
      itin_d3_desc: "Transit through picturesque alpine valleys to Interlaken, set between Lakes Thun and Brienz. Ride the 100-year-old funicular up to the glass-floor Harder Kulm bridge.",
      itin_d3_t1: "Centennial Funicular",
      itin_d3_t2: "Lake Brienz",
      itin_d3_t3: "Suspended Viewpoint",
      itin_d4_pill: "Day 04 · Alpine Waterfalls",
      itin_d4_title: "Lauterbrunnen Valley & Grindelwald",
      itin_d4_desc: "Explore breathtaking Lauterbrunnen glacial valley, Tolkien's real-life inspiration for Rivendell with 72 waterfalls and vertical cliffs, followed by scenic ascent to Grindelwald.",
      itin_d4_t1: "Staubbach Falls",
      itin_d4_t2: "Grindelwald",
      itin_d4_t3: "Eiger North Face",
      itin_d5_pill: "Day 05 · Top of Europe",
      itin_d5_title: "Jungfraujoch & Great Aletsch Glacier",
      itin_d5_desc: "The crowning experience: cogwheel train to Europe's highest railway station at 3,454m. Explore the Ice Palace and take in the majestic panorama over Great Aletsch Glacier.",
      itin_d5_t1: "3,454 meters",
      itin_d5_t2: "Ice Palace",
      itin_d5_t3: "Year-round Snow",
      itin_d6_pill: "Day 06 · Pristine Nature",
      itin_d6_title: "Lake Blausee & Brienz",
      itin_d6_desc: "Visit cinematic Blausee Nature Park, celebrated for its crystal-clear turquoise waters encircled by dense evergreen forests. Conclude with a relaxed lakeside sunset.",
      itin_d6_t1: "Blausee Nature Park",
      itin_d6_t2: "Glass-bottom Boat",
      itin_d6_t3: "Scenic Walking Trails",
      itin_d7_pill: "Days 07-09 · Exclusive Highlight",
      itin_d7_title: "Zermatt & Majestic Matterhorn",
      itin_d7_desc: "Exclusive to guests of the Exclusive Line: arrive in tranquil, combustion-free Zermatt. Board the Gornergrat cogwheel train for unforgettable views of the Matterhorn.",
      itin_d7_t1: "Gornergrat 3,089m",
      itin_d7_t2: "Matterhorn",
      itin_d7_t3: "Car-Free Village",

      // Experience
      exp_eyebrow: "The Alpina Experience",
      exp_title: 'You choose the destination.<br>Alpina cares for the journey.',
      exp_lede: "Our role is to translate your travel vision into a punctual, elegant and hassle-free itinerary, backed by the finest Swiss precision and hospitality.",
      exp_feat1_title: "Curated Destinations",
      exp_feat1_desc: "Authentic alpine cities & villages",
      exp_feat2_title: "Tailored Itineraries",
      exp_feat2_desc: "Aligned with your pace and style",
      exp_feat3_title: "1st Class Rail",
      exp_feat3_desc: "Premium Swiss Travel Pass",
      exp_feat4_title: "24/7 Dedicated Support",
      exp_feat4_desc: "Direct concierge assistance",
      exp_quote_body: "We orchestrate every journey by the Swiss watch: each connection has its exact time to depart, connect and inspire awe.",
      exp_quote_author: "Alpina Travel Team",
      exp_quote_role: "Swiss Luxury Travel Specialists",

      // How It Works
      how_eyebrow: "Simplicity & Care",
      how_title: "How your reservation works",
      how_lede: "Planning your journey to the Alps is effortless, transparent and completely stress-free.",
      how_step1_title: "Choose Line & Window",
      how_step1_desc: "Select your itinerary length (Essential, Premium or Exclusive) and the season that best fits your calendar.",
      how_step2_title: "Connect on WhatsApp",
      how_step2_desc: "Speak directly with a dedicated travel specialist to tailor flights, boutique hotels and custom excursions.",
      how_step3_title: "Confirmation & Terms",
      how_step3_desc: "Secure your places with flexible terms, with all documentation, passes and hotel vouchers prepared for you.",
      how_step4_title: "Seamless Journey",
      how_step4_desc: "Travel with digital itineraries, first-class rail tickets and remote concierge support every single day in Switzerland.",

      // Contact & Form
      contact_eyebrow: "Direct Concierge",
      contact_title: "Your next destination begins with a conversation.",
      contact_lede: "Complete the fields below to receive a comprehensive proposal on WhatsApp. Our specialist team will prepare the finest offer for your 2027 journey.",
      contact_card1_title: "WhatsApp Concierge",
      contact_card2_title: "Hours of Service",
      contact_card2_desc: "Monday to Friday · 08h to 20h (BRT)",
      contact_card3_title: "Specialized Advisory",
      contact_card3_desc: "Exclusive curated Swiss journeys",
      form_title: "Plan My Journey",
      form_desc: "Fill out your details to receive your personalized proposal.",
      form_name_label: "Full Name",
      form_name_ph: "How should we address you?",
      form_wpp_label: "WhatsApp / Phone",
      form_wpp_ph: "+1 (555) 000-0000",
      form_pax_label: "Number of Travelers",
      form_line_label: "Selected Itinerary",
      form_window_label: "Departure Window (2027)",
      form_msg_label: "Special Preferences or Notes (Optional)",
      form_msg_ph: "E.g., Special dinner in Zermatt, family group trip, specific dates...",
      form_submit_btn: "<span>🚀</span> Submit Request & Chat on WhatsApp →",
      select_viajantes: ["1 traveler", "2 travelers", "3 travelers", "4 travelers", "5 or more travelers"],
      select_linhas: ["Essential Line (8 days)", "Premium Line (10 days)", "Exclusive Line (12 days)"],
      select_janelas: ["January to March (Snow & Ski)", "April to June (Alpine Spring)"],

      // B2B Strip & Footer
      b2b_strip_title: "Your travel agency can sell Alpina Swiss itineraries",
      b2b_strip_desc: "Attractive commissions per booking, ready-to-print marketing kits and dedicated B2B trade support.",
      b2b_strip_btn: "Explore B2B Partnership →",
      footer_bio: "Boutique tour operator specializing exclusively in high-end Swiss travel. Journeys shaped by panoramic railway rhythms and alpine grandeur.",
      footer_col1_title: "Navigation",
      footer_col2_title: "Itineraries 2027",
      footer_route_essencial: "Essential Line (8 days)",
      footer_route_premium: "Premium Line (10 days)",
      footer_route_exclusivo: "Exclusive Line (12 days)",
      footer_route_b2b: "B2B Partner Area",
      footer_col3_title: "Customer Care",
      footer_col3_sub: "Commercial advisory and bookings:",
      footer_col3_note: "Available internationally and nationwide.",
      footer_copy: "© 2026 Alpina Viagens. All rights reserved. Registered tour operator.",
      footer_credit: "Crafted with technical excellence and alpine inspiration.",

      // Modal
      modal_badge: "Alpina Travel · Switzerland 2027",
      modal_title: "Request Successfully Submitted!",
      modal_lead: "Your Swiss travel request has been processed with the precision and punctuality of alpine trains.",
      modal_wpp_btn: "<span>💬</span> Connect on WhatsApp (+55 11 93905-6979)",
      modal_close_btn: "Close",
      modal_note: "Automatically opening official Alpina Travel WhatsApp concierge.",

      // B2B Page
      b2b_page_title: "Partner With Us | Alpina Travel — Agency Partnerships",
      b2b_page_desc: "Your travel agency can sell Alpina's exclusive Swiss itineraries. Rewarding commissions, print-ready promo kits, and end-to-end sales support.",
      b2b_hero_badge: "For Travel Agencies & Retailers",
      b2b_hero_h1: 'Bring Switzerland<br>inside your <span class="accent-red">agency</span>.',
      b2b_hero_lede: "Your travel agency can resell Alpina's Switzerland itineraries with rewarding commission, branded marketing materials ready for your stamp, and a dedicated specialist to support your sales.",
      b2b_hero_btn_pdf: "<span>📥</span> Download PDF Flyer (A4)",
      b2b_hero_btn_reg: "Register My Agency ➔",
      b2b_hl1_title: "Attractive Commission",
      b2b_hl1_desc: "Guaranteed payout on every sold package",
      b2b_hl2_title: "Marketing Materials",
      b2b_hl2_desc: "Printed brochures and social media creatives",
      b2b_hl3_title: "Product Training",
      b2b_hl3_desc: "Masterclasses on Swiss rail and attractions",
      b2b_hl4_title: "Dedicated Specialist",
      b2b_hl4_desc: "Co-selling support to close high-value sales",
      b2b_adv_eyebrow: "Why Partner With Us",
      b2b_adv_title: "Commercial benefits for your business",
      b2b_adv_lede: "Alpina manages Swiss train operations, boutique hotels and alpine logistics. Your agency does what it does best: delighting clients.",
      b2b_card1_kicker: "Financial",
      b2b_card1_title: "Commission per Sale",
      b2b_card1_desc: "Transparent payouts aligned with client payment schedules",
      b2b_card1_li1: "Commission percentage on total passenger spend",
      b2b_card1_li2: "Special bonuses for family and corporate group bookings",
      b2b_card1_li3: "Payouts synchronized with customer installment milestones",
      b2b_card1_li4: "No unattainable sales quotas or exclusivity demands",
      b2b_card2_badge: "Ready to Use",
      b2b_card2_kicker: "Marketing",
      b2b_card2_title: "Promotional Kit",
      b2b_card2_desc: "Printable PDF brochure and assets for Instagram & WhatsApp",
      b2b_card2_li1: "2-page A4 brochure formatted with dedicated stamp space",
      b2b_card2_li2: "Always up-to-date departure schedule and pricing for 2027",
      b2b_card2_li3: "High-resolution creatives for storefronts and social media",
      b2b_card2_li4: "Digital FAQ guide answering frequent passenger questions",
      b2b_card3_kicker: "Trade Support",
      b2b_card3_title: "Specialist Support",
      b2b_card3_desc: "Alpina Switzerland specialist ready to assist your sales team",
      b2b_card3_li1: "Direct WhatsApp hotline with dedicated Swiss destination expert",
      b2b_card3_li2: "Specialist attendance in customer presentations upon request",
      b2b_card3_li3: "Fast turnaround on customized itineraries and 1st-class upgrades",
      b2b_card3_li4: "Continuous concierge tracking from departure to return",
      b2b_pdf_eyebrow: "Printed Collateral",
      b2b_pdf_title: "A brochure ready for your reception desk",
      b2b_pdf_lede: "We created a comprehensive presentation including all 3 itineraries, panoramic rail maps, departure calendar and space for your agency stamp.",
      b2b_pdf_box_title: "Alpina Travel Brochure — A4 PDF Format",
      b2b_pdf_box_desc: "Two-page institutional brochure with itineraries, departure windows and commercial conditions for 2027.",
      b2b_pdf_btn: "<span>📥</span> Download PDF Now",
      b2b_step_eyebrow: "Step by Step",
      b2b_step_title: "From sign-up to your first booking",
      b2b_step_lede: "Accreditation is fast, straightforward, and 100% free of membership fees.",
      b2b_step1_title: "Register Your Agency",
      b2b_step1_desc: "Fill out the registration form below or send a direct message on WhatsApp with company details.",
      b2b_step2_title: "Commercial Onboarding",
      b2b_step2_desc: "Our partner coordinator introduces the commission structure, terms and marketing kit.",
      b2b_step3_title: "Receive Promotional Kit",
      b2b_step3_desc: "Access printable brochures and ready-to-post digital social media graphics.",
      b2b_step4_title: "Start Selling",
      b2b_step4_desc: "Present Switzerland to your esteemed clients with our end-to-end booking support.",
      b2b_form_eyebrow: "Agency Accreditation",
      b2b_form_title: "Register your agency and start selling",
      b2b_form_lede: "Join our esteemed network of partners. Enter your company details so our trade coordinator can connect immediately via WhatsApp.",
      b2b_form_card1_title: "Partner Support",
      b2b_form_card2_title: "No Membership Fee",
      b2b_form_card2_desc: "100% free partner accreditation",
      b2b_form_head_title: "Accreditation Form",
      b2b_form_head_desc: "Details for registration in the Alpina partner system.",
      b2b_form_label_name: "Corporate or Trade Name of Agency",
      b2b_form_ph_name: "E.g.: Alpine Travel & Tours",
      b2b_form_label_city: "City / State / Country",
      b2b_form_ph_city: "E.g.: New York / NY",
      b2b_form_label_contact: "Manager / Lead Agent Name",
      b2b_form_ph_contact: "Your full name",
      b2b_form_label_wpp: "Agency Commercial WhatsApp / Phone",
      b2b_form_ph_wpp: "+1 (555) 000-0000",
      b2b_form_label_msg: "Agency Client Profile or Inquiries",
      b2b_form_ph_msg: "Tell us briefly if your store serves couples, families or corporate groups...",
      b2b_form_submit: "<span>🚀</span> Submit Agency Registration →",
      b2b_footer_bio: "Boutique tour operator specializing exclusively in high-end Swiss travel. Strong partnerships with premier agencies.",
      b2b_footer_col2_title: "B2B Trade Channel",
      b2b_footer_col3_title: "Partner Desk",
      b2b_footer_col3_sub: "Commercial support for partner agencies:",
      b2b_modal_badge: "Alpina Travel · B2B Partnerships",
      b2b_modal_title: "Registration Submitted Successfully!",
      b2b_modal_lead: "Your agency credentials have been received. Our trade coordinator will connect shortly with full materials and commission sheets.",
      b2b_modal_wpp_btn: "<span>💬</span> Chat with Trade Coordinator on WhatsApp",
      b2b_modal_note: "Connecting with Alpina Travel partner relations desk."
    },

    de: {
      code: "DE",
      toast: "✦ Sprache auf Deutsch geändert",
      page_title: "Alpina Reisen | Exklusive Reiserouten durch die Schweiz 2027",
      page_description: "Exklusive Schweizer Erlebnisreisen mit erstklassigen Panoramazügen. Routen Essentiell, Premium und Exklusiv in zwei Abfahrtsfenstern. WhatsApp-Service.",
      sound_on: "🔊 Ton An",
      sound_off: "🔇 Ton Aus",
      toast_submitted: "✦ Anfrage gesendet! Öffne WhatsApp-Service...",
      toast_b2b_submitted: "✦ Anmeldung versendet! Öffne Partnerkanal auf WhatsApp...",
      toast_line_selected: "✦ {line} ausgewählt ({price}/Person). Geben Sie unten Ihre Daten ein, um Ihr Angebot zu erhalten.",
      modal_labels: { pax: "Reisender", wpp: "WhatsApp", route: "Reiseroute", window: "Zeitfenster 2027", passengers: "Passagiere", price: "Geschätzte Summe" },
      b2b_modal_labels: { agency: "Agentur", city: "Stadt / Land", contact: "Ansprechpartner", wpp: "Gewerbliches Telefon" },

      // Navigation
      nav_home: "Startseite",
      nav_itineraries: "Reiserouten",
      nav_dates: "Daten & Preise",
      nav_timeline: "Reiseplan",
      nav_experiences: "Erlebnisse",
      nav_how: "So Funktioniert's",
      nav_contact: "Kontakt",
      nav_partner: "B2B Partner",
      nav_back: "← Zurück zur Startseite",
      nav_advantages: "Vorteile",
      nav_material: "PDF-Unterlagen",
      nav_register: "Agentur Anmelden",
      nav_cta: "Reise Planen",
      nav_cta_partner: "Partner Werden",

      // Kinetic Ticker
      ticker_brand: "ALPINA REISEN",
      ticker_sbb: "SBB CFF FFS SCHWEIZER PRÄZISION",
      ticker_trains: "PANORAMAZÜGE & GLACIER EXPRESS",
      ticker_zermatt: "ZERMATT & MATTERHORN",
      ticker_jungfrau: "JUNGFRAUJOCH TOP OF EUROPE",
      ticker_windows: "ZWEI ABFAHRTSFENSTER 2027",
      ticker_whatsapp: "WHATSAPP: +55 (11) 93905-6979",
      ticker_b2b_prog: "B2B PARTNERPROGRAMM",
      ticker_b2b_comm: "PROVISIONEN PRO BUCHUNG",
      ticker_b2b_mat: "VOLLSTÄNDIGES WERBEMATERIAL",
      ticker_b2b_train: "EXKLUSIVE PRODUKTSCHULUNG",
      ticker_b2b_wpp: "B2B-WHATSAPP: +55 (11) 93905-6979",

      // Hero
      hero_tagline: "Zwei Abfahrtsfenster · Saison 2027",
      hero_h1: 'Die Schweiz hat den richtigen Moment,<br>um für Sie zu <span class="accent-red">geschehen</span>.',
      hero_lede: "Exklusive Reiserouten mit erstklassigen Panoramazügen, postkartenreifen türkisfarbenen Seen, Bergdörfern und Reisezielen wie Zürich, Luzern, Interlaken und Zermatt. Wählen Sie Ihr Zeitfenster und erleben Sie Schweizer Präzision.",
      hero_cta1: "Termine & Preise anzeigen →",
      hero_cta2: "<span>💬</span> Mit Spezialisten sprechen",
      hero_stat1: "Reisetage meisterhaft gestaltet",
      hero_stat2: "exklusive Abfahrtsfenster pro Jahr",
      hero_stat3: "Alpengipfel und Bergdörfer im Reiseplan",

      // Diferenciais Rápidos
      hl1_title: "Panoramazüge Inklusive",
      hl1_desc: "1. Klasse Swiss Travel Pass & Alpenblick",
      hl2_title: "Erlesene Unterkünfte",
      hl2_desc: "Zentrale 4- und 5-Sterne-Boutique-Hotels",
      hl3_title: "Attraktive Ratenzahlung",
      hl3_desc: "Feste Preise ohne Währungsrisiko",
      hl4_title: "Persönlicher Berater 24/7",
      hl4_desc: "Umfassende Betreuung von Anfang an",

      // Pacotes
      pkg_eyebrow: "Maßgeschneiderte Routen",
      pkg_section_title: "Drei Wege, die Schweiz zu erleben",
      pkg_section_lede: "Jede Route folgt einer bewährten Achse — Zürich, Luzern und Interlaken — und vertieft sich nach Ihrer Zeit. Wählen Sie die ideale Dauer und lassen Sie den Zauber beginnen.",
      price_from: "Ab",
      price_suffix: "/Person",
      badge_popular: "★ Am beliebtesten",

      pkg1_kicker: "Essentiell-Linie",
      pkg1_title: "8 Tage · 7 Nächte",
      pkg1_route: "Zürich → Luzern → Interlaken → Zürich",
      pkg1_feat1: "Klassische Stadtführung in Zürich und Schifffahrt auf der Limmat",
      pkg1_feat2: "Malerische Zugfahrt nach Luzern und Besichtigung der Kapellbrücke",
      pkg1_feat3: "Seilbahnfahrt auf die Rigi oder den Pilatus mit 360°-Alpenpanorama",
      pkg1_feat4: "Historische Standseilbahn zum Aussichtspunkt Harder Kulm über den Seen",
      pkg1_feat5: "Tägliches reichhaltiges Frühstück inklusive",
      pkg1_btn: "Essentiell-Linie Wählen",

      pkg2_kicker: "Premium-Linie",
      pkg2_title: "10 Tage · 9 Nächte",
      pkg2_route: "Zürich → Luzern → Interlaken → Lauterbrunnen → Grindelwald → Zürich",
      pkg2_feat1: "<strong>Alles aus der Essentiell-Linie inklusive</strong>",
      pkg2_feat2: "Tagesausflug ins Lauterbrunnental mit seinen 72 Gletscher-Wasserfällen",
      pkg2_feat3: "Expedition zum <strong>Jungfraujoch (Top of Europe)</strong> auf 3.454m mit ganzjährigem Schnee",
      pkg2_feat4: "Malerisches Bergdorf Grindelwald am Fuße der Eiger-Nordwand",
      pkg2_feat5: "Fotostopp am Blausee und entspannter Nachmittag am Brienzersee",
      pkg2_btn: "Premium-Linie Wählen",

      pkg3_kicker: "Exklusiv-Linie",
      pkg3_title: "12 Tage · 11 Nächte",
      pkg3_route: "Zürich → Luzern → Interlaken → Zermatt (Matterhorn) → Genf → St. Moritz",
      pkg3_feat1: "<strong>Alles aus der Premium-Linie inklusive</strong>",
      pkg3_feat2: "Zwei exklusive Nächte im autofreien Zermatt am Fuße des Matterhorns",
      pkg3_feat3: "Fahrt mit der Gornergrat-Zahnradbahn mit Panoramablick auf das Matterhorn",
      pkg3_feat4: "Panoramastrecke an Bord des legendären <strong>Glacier Express</strong>",
      pkg3_feat5: "Zwei Nächte in St. Moritz und festliches Abschiedsessen in einem Michelin-Restaurant",
      pkg3_btn: "Exklusiv-Linie Wählen",

      // SBB Solari Board
      board_eyebrow: "SBB Abfahrtstafel",
      board_title: "Wählen Sie Ihr Abfahrtsfenster",
      board_lede: "Die Abfahrten erfolgen in geschlossenen Kontingenten, um exklusive Plätze in Panoramazügen und Hotels zu garantieren. Wechseln Sie unten das Zeitfenster für Live-Preise.",
      tab_jan_mar_label: "Januar → März",
      tab_jan_mar_sub: "Schnee- & Skisaison",
      tab_abr_jun_label: "April → Juni",
      tab_abr_jun_sub: "Frühling & Alpenseen",
      board_top_left: '<span class="swiss-cross" style="width:14px;height:14px;"></span> SBB CFF FFS SYSTEM · OFFIZIELLE ALPINA TAFEL 2027',
      board_top_status: "STATUS: PLÄTZE VERFÜGBAR",
      board_th_line: "Linie / Route",
      board_th_duration: "Dauer",
      board_th_window: "Abfahrtsfenster",
      board_th_price: "Preis pro Person",
      board_th_action: "Aktion",
      board_badge_base: "Basis",
      board_badge_popular: "Beliebt",
      board_badge_vip: "VIP",
      board_flap_essencial: "Essentiell",
      board_flap_premium: "Premium",
      board_flap_exclusivo: "Exklusiv",
      board_dur_essencial: "8d / 7n",
      board_dur_premium: "10d / 9n",
      board_dur_exclusivo: "12d / 11n",
      board_btn_book: "Buchen ➔",
      board_note: "<span>ℹ</span> Preise pro Person bei Doppelbelegung, inklusive Abgaben, Zugtransfers und der angegebenen Ausflüge.",

      // Reiseplan
      itin_eyebrow: "Detaillierter Reiseplan",
      itin_title: "Die Schweizer Reise, Tag für Tag",
      itin_lede: "Entdecken Sie die Höhepunkte der Reiseroute mit echten Fotos der von Alpina besuchten Ziele. Nutzen Sie die Filter unten für jede Linie.",
      itin_filter_all: "Alle Tage",
      itin_filter_essencial: "Essentiell-Linie (Tage 1-3, 7)",
      itin_filter_premium: "Premium-Linie (Tage 1-6, 7)",
      itin_filter_exclusivo: "Exklusiv-Linie (Zermatt-Erweiterung)",
      itin_d1_pill: "Tag 01 · Ankunft",
      itin_d1_title: "Zürich und die historische Altstadt",
      itin_d1_desc: "Ankunft in der Schweiz und persönlicher Empfang. Eleganter Spaziergang entlang der berühmten Bahnhofstrasse, Erkundung der mittelalterlichen Gassen der Altstadt und Entspannung am Zürichsee.",
      itin_d1_t1: "Zürichsee",
      itin_d1_t2: "Bahnhofstrasse",
      itin_d1_t3: "Willkommensdrink",
      itin_d2_pill: "Tag 02 · Geschichte & Berge",
      itin_d2_title: "Luzern und die Kapellbrücke",
      itin_d2_desc: "Malerische Zugfahrt in das bezaubernde Luzern. Besuch der ikonischen überdachten Kapellbrücke und Seilbahnfahrt auf den Pilatus oder die Rigi mit atemberaubendem 360°-Panoramablick.",
      itin_d2_t1: "Kapellbrücke",
      itin_d2_t2: "Pilatus",
      itin_d2_t3: "Dampfschiff",
      itin_d3_pill: "Tag 03 · Zwischen den Seen",
      itin_d3_title: "Interlaken und Aussichtspunkt Harder Kulm",
      itin_d3_desc: "Fahrt durch malerische Alpentäler nach Interlaken zwischen Thuner- und Brienzersee. Fahrt mit der über 100 Jahre alten Standseilbahn zur Aussichtsplattform Harder Kulm.",
      itin_d3_t1: "Historische Standseilbahn",
      itin_d3_t2: "Brienzersee",
      itin_d3_t3: "Aussichtssteg",
      itin_d4_pill: "Tag 04 · Alpine Wasserfälle",
      itin_d4_title: "Lauterbrunnental und Grindelwald",
      itin_d4_desc: "Erkundung des atemberaubenden Lauterbrunnentals mit 72 Wasserfällen und Steilwänden (Tolkiens Vorbild für Bruchtal), gefolgt vom Besuch des traditionsreichen Bergdorfs Grindelwald.",
      itin_d4_t1: "Staubbachfall",
      itin_d4_t2: "Grindelwald",
      itin_d4_t3: "Eiger-Nordwand",
      itin_d5_pill: "Tag 05 · Top of Europe",
      itin_d5_title: "Jungfraujoch und Aletschgletscher",
      itin_d5_desc: "Höhepunkt der Reise: Fahrt mit der Zahnradbahn zum höchstgelegenen Bahnhof Europas (3.454 m). Besuch des Eispalasts und Blick auf den gewaltigen Aletschgletscher.",
      itin_d5_t1: "3.454 Meter",
      itin_d5_t2: "Eispalast",
      itin_d5_t3: "Ganzjähriger Schnee",
      itin_d6_pill: "Tag 06 · Kristallklare Natur",
      itin_d6_title: "Blausee und Brienz",
      itin_d6_desc: "Besuch des märchenhaften Naturparks Blausee mit kristallklarem, tiefblauem Wasser inmitten unberührter Bergwälder, abgerundet durch den Sonnenuntergang am See.",
      itin_d6_t1: "Naturpark Blausee",
      itin_d6_t2: "Glasbodenboot",
      itin_d6_t3: "Malerische Wanderwege",
      itin_d7_pill: "Tage 07-09 · Exklusiver Höhepunkt",
      itin_d7_title: "Zermatt und das Matterhorn",
      itin_d7_desc: "Exklusiv für Gäste der Exklusiv-Linie: Ankunft im autofreien Zermatt am Fuße des Matterhorns. Fahrt mit der Gornergrat-Bahn mit unvergleichlicher Aussicht auf den weltberühmten Gipfel.",
      itin_d7_t1: "Gornergrat 3.089m",
      itin_d7_t2: "Matterhorn",
      itin_d7_t3: "Autofreies Dorf",

      // Erlebnisse
      exp_eyebrow: "Das Alpina-Erlebnis",
      exp_title: 'Sie wählen das Reiseziel.<br>Alpina gestaltet den Weg.',
      exp_lede: "Unsere Mission ist es, Ihren Reisetraum in eine pünktliche, elegante und sorgenfreie Route mit erstklassiger Schweizer Gastfreundschaft zu verwandeln.",
      exp_feat1_title: "Erlesene Reiseziele",
      exp_feat1_desc: "Authentische Städte und Bergdörfer",
      exp_feat2_title: "Maßgeschneiderte Routen",
      exp_feat2_desc: "Ihrem persönlichen Rhythmus angepasst",
      exp_feat3_title: "1. Klasse Panoramazüge",
      exp_feat3_desc: "Erstklassiger Swiss Travel Pass",
      exp_feat4_title: "24/7 Betreuung",
      exp_feat4_desc: "Persönlicher Concierge-Service",
      exp_quote_body: "Wir takten jede Reise wie ein Schweizer Uhrwerk: Jede Etappe hat ihre genaue Zeit zum Abfahren, Umsteigen und Staunen.",
      exp_quote_author: "Team Alpina Reisen",
      exp_quote_role: "Spezialisten für Schweizer Luxusreisen",

      // So Funktioniert's
      how_eyebrow: "Einfachheit & Sorgfalt",
      how_title: "So funktioniert Ihre Buchung",
      how_lede: "Die Planung Ihrer Alpenreise ist einfach, transparent und vollkommen unkompliziert.",
      how_step1_title: "Linie & Zeitfenster wählen",
      how_step1_desc: "Wählen Sie Reisedauer (Essentiell, Premium oder Exklusiv) und Ihre bevorzugte Reisezeit.",
      how_step2_title: "Persönliches Gespräch",
      how_step2_desc: "Sprechen Sie direkt mit Ihrem Reiseberater für individuelle Flug-, Hotel- und Tourenabstimmungen.",
      how_step3_title: "Buchung & Bestätigung",
      how_step3_desc: "Sichern Sie sich Ihre Plätze mit flexiblen Zahlungsoptionen und vollständigen Reiseunterlagen.",
      how_step4_title: "Sorglose Reise",
      how_step4_desc: "Reisen Sie mit digitalem Reiseplan, Fahrkarten und persönlicher Fernbetreuung in der Schweiz.",

      // Kontakt & Formular
      contact_eyebrow: "Direkter Kontakt",
      contact_title: "Ihr nächstes Reiseziel beginnt mit einem Gespräch.",
      contact_lede: "Füllen Sie das Formular aus, um Ihr persönliches Angebot zu erhalten. Unser Team stellt Ihnen umgehend das perfekte Reiseprogramm zusammen.",
      contact_card1_title: "WhatsApp-Zentrale",
      contact_card2_title: "Servicezeiten",
      contact_card2_desc: "Montag bis Freitag · 08:00 bis 20:00 Uhr",
      contact_card3_title: "Fachberatung",
      contact_card3_desc: "Exklusive Reiseplanung für die Schweiz",
      form_title: "Meine Reise Planen",
      form_desc: "Geben Sie Ihre Daten ein und erhalten Sie Ihr individuelles Angebot.",
      form_name_label: "Vollständiger Name",
      form_name_ph: "Wie dürfen wir Sie ansprechen?",
      form_wpp_label: "WhatsApp / Telefon",
      form_wpp_ph: "+49 170 0000000",
      form_pax_label: "Anzahl Reisende",
      form_line_label: "Bevorzugte Linie",
      form_window_label: "Abfahrtsfenster (2027)",
      form_msg_label: "Besondere Wünsche oder Anmerkungen (Optional)",
      form_msg_ph: "Z.B. Besonderes Dinner in Zermatt, Familienreise, Wunschtermine...",
      form_submit_btn: "<span>🚀</span> Anfrage Senden & auf WhatsApp Sprechen →",
      select_viajantes: ["1 Reisender", "2 Reisende", "3 Reisende", "4 Reisende", "5 oder mehr Reisende"],
      select_linhas: ["Essentiell-Linie (8 Tage)", "Premium-Linie (10 Tage)", "Exklusiv-Linie (12 Tage)"],
      select_janelas: ["Januar bis März (Schnee & Ski)", "April bis Juni (Alpenfrühling)"],

      // B2B Strip & Fußzeile
      b2b_strip_title: "Ihre Reiseagentur kann Alpina-Routen für die Schweiz anbieten",
      b2b_strip_desc: "Attraktive Provisionen pro Buchung, druckfertiges Werbematerial und engagierter B2B-Support.",
      b2b_strip_btn: "B2B-Partnerschaft Entdecken →",
      footer_bio: "Spezialisierter Reiseveranstalter für exklusive Reisen durch die Schweiz. Geprägt von Panoramazügen und alpiner Pracht.",
      footer_col1_title: "Navigation",
      footer_col2_title: "Routen 2027",
      footer_route_essencial: "Essentiell-Linie (8 Tage)",
      footer_route_premium: "Premium-Linie (10 Tage)",
      footer_route_exclusivo: "Exklusiv-Linie (12 Tage)",
      footer_route_b2b: "B2B Partnerbereich",
      footer_col3_title: "Kundenservice",
      footer_col3_sub: "Kundenberatung und Buchung:",
      footer_col3_note: "Bundesweit und international erreichbar.",
      footer_copy: "© 2026 Alpina Viagens. Alle Rechte vorbehalten. Registrierter Reiseveranstalter.",
      footer_credit: "Mit Schweizer Präzision und alpiner Inspiration gestaltet.",

      // Modal
      modal_badge: "Alpina Reisen · Schweiz 2027",
      modal_title: "Anfrage Erfolgreich Übermittelt!",
      modal_lead: "Ihre Reiseanfrage wurde mit der Pünktlichkeit und Sorgfalt der Schweizer Bahnen erfasst.",
      modal_wpp_btn: "<span>💬</span> Auf WhatsApp Kontaktieren (+55 11 93905-6979)",
      modal_close_btn: "Schließen",
      modal_note: "Öffnet automatisch den offiziellen WhatsApp-Service von Alpina Reisen.",

      // B2B Seite
      b2b_page_title: "B2B Partner | Alpina Reisen — Partnerschaften für Reisebüros",
      b2b_page_desc: "Ihr Reisebüro kann exklusive Alpina-Schweizreisen anbieten. Attraktive Provisionen, fertiges Werbematerial und umfassender B2B-Support.",
      b2b_hero_badge: "Für Reisebüros & Agenturen",
      b2b_hero_h1: 'Bringen Sie die Schweiz<br>in Ihr <span class="accent-red">Reisebüro</span>.',
      b2b_hero_lede: "Ihr Reisebüro kann die exklusiven Schweiz-Routen von Alpina mit erstklassiger Provision, druckfertigem Werbematerial mit Stempelfeld und persönlicher Beratung anbieten.",
      b2b_hero_btn_pdf: "<span>📥</span> PDF-Flyer Herunterladen (A4)",
      b2b_hero_btn_reg: "Meine Agentur Anmelden ➔",
      b2b_hl1_title: "Attraktive Provision",
      b2b_hl1_desc: "Garantierte Vergütung pro verkauftem Paket",
      b2b_hl2_title: "Werbematerial",
      b2b_hl2_desc: "Gedruckte Flyer und Vorlagen für soziale Medien",
      b2b_hl3_title: "Routenschulung",
      b2b_hl3_desc: "Fachschulungen zu Schweizer Zügen und Highlights",
      b2b_hl4_title: "Persönlicher Berater",
      b2b_hl4_desc: "Gemeinsamer Vertriebssupport beim Abschluss",
      b2b_adv_eyebrow: "Warum Partner Werden",
      b2b_adv_title: "Geschäftsvorteile für Ihr Unternehmen",
      b2b_adv_lede: "Alpina kümmert sich um Zugreservierungen, Hotels und Schweizer Logistik. Ihre Agentur konzentriert sich auf beste Kundenbetreuung.",
      b2b_card1_kicker: "Finanzen",
      b2b_card1_title: "Provision pro Buchung",
      b2b_card1_desc: "Transparente Vergütung abgestimmt auf Zahlungspläne",
      b2b_card1_li1: "Fester Prozentsatz auf das Gesamtvolumen jedes Reisenden",
      b2b_card1_li2: "Attraktive Boni für Familien- und Firmengruppen",
      b2b_card1_li3: "Auszahlung synchronisiert mit Kundenraten",
      b2b_card1_li4: "Keine unerreichbaren Mindestquoten oder Exklusivitätszwänge",
      b2b_card2_badge: "Einsatzbereit",
      b2b_card2_kicker: "Marketing",
      b2b_card2_title: "Werbematerial",
      b2b_card2_desc: "Druckfertiger PDF-Flyer und Grafiken für Social Media",
      b2b_card2_li1: "2-seitiger A4-Flyer mit speziellem Feld für Ihren Stempel",
      b2b_card2_li2: "Stets aktuelle Termin- und Preistabelle für 2027",
      b2b_card2_li3: "Hochauflösende Werbemittel für Schaufenster und Kanäle",
      b2b_card2_li4: "Digitaler Leitfaden für häufig gestellte Kundenfragen",
      b2b_card3_kicker: "Betreuung",
      b2b_card3_title: "Berater-Support",
      b2b_card3_desc: "Alpina-Spezialist steht Ihrem Vertriebsteam zur Seite",
      b2b_card3_li1: "Exklusive WhatsApp-Direktlinie mit Schweizer Reiseexperten",
      b2b_card3_li2: "Teilnahme an Beratungsgesprächen auf Wunsch",
      b2b_card3_li3: "Schnelle Erstellung individueller Angebote und Upgrades",
      b2b_card3_li4: "Umfassende Reisebegleitung von der Abreise bis zur Rückkehr",
      b2b_pdf_eyebrow: "Druckunterlagen",
      b2b_pdf_title: "Ein fertiger Flyer für Ihren Schalter",
      b2b_pdf_lede: "Vollständige Präsentation aller 3 Routen, Bahnkarte, Reisetermine und Platz für Ihren Firmenstempel. Einfach herunterladen und drucken.",
      b2b_pdf_box_title: "Alpina Reisen Flyer — A4 PDF-Format",
      b2b_pdf_box_desc: "Zweiseitiges Informationsmaterial mit Routen, Abfahrtsfenstern und Konditionen für 2027.",
      b2b_pdf_btn: "<span>📥</span> Jetzt PDF Herunterladen",
      b2b_step_eyebrow: "Schritt für Schritt",
      b2b_step_title: "Von der Anmeldung zum ersten Verkauf",
      b2b_step_lede: "Die Akkreditierung ist schnell, unkompliziert und vollkommen gebührenfrei.",
      b2b_step1_title: "Agentur Anmelden",
      b2b_step1_desc: "Füllen Sie das untenstehende Formular aus oder kontaktieren Sie uns direkt auf WhatsApp.",
      b2b_step2_title: "Vertriebs-Onboarding",
      b2b_step2_desc: "Unser Koordinator stellt Ihnen Provisionsstaffeln und Unterlagen vor.",
      b2b_step3_title: "Werbekit Erhalten",
      b2b_step3_desc: "Erhalten Sie druckfertige Flyer und digitale Social-Media-Grafiken.",
      b2b_step4_title: "Verkauf Starten",
      b2b_step4_desc: "Bieten Sie Ihren Kunden die Schweiz mit unserer vollen Unterstützung an.",
      b2b_form_eyebrow: "Agentur-Akkreditierung",
      b2b_form_title: "Melden Sie Ihre Agentur an und starten Sie",
      b2b_form_lede: "Werden Sie Teil unseres vertrauensvollen Partnernetzwerks. Geben Sie Ihre Daten ein, damit sich unser Team umgehend mit Ihnen in Verbindung setzt.",
      b2b_form_card1_title: "Partnerbetreuung",
      b2b_form_card2_title: "Keine Aufnahmegebühr",
      b2b_form_card2_desc: "100% kostenlose Akkreditierung",
      b2b_form_head_title: "Akkreditierungsformular",
      b2b_form_head_desc: "Angaben zur Aufnahme in das Alpina-Partnersystem.",
      b2b_form_label_name: "Firmenname oder Name der Reiseagentur",
      b2b_form_ph_name: "Z.B.: Alpine Reisen & Touristik",
      b2b_form_label_city: "Stadt / Bundesland",
      b2b_form_ph_city: "Z.B.: Frankfurt am Main / HE",
      b2b_form_label_contact: "Name des Ansprechpartners / Agenten",
      b2b_form_ph_contact: "Ihr vollständiger Name",
      b2b_form_label_wpp: "Gewerbliches WhatsApp / Telefon",
      b2b_form_ph_wpp: "+49 170 0000000",
      b2b_form_label_msg: "Kundenprofil oder zusätzliche Fragen",
      b2b_form_ph_msg: "Beschreiben Sie kurz, ob Sie Paare, Familien oder Reisegruppen betreuen...",
      b2b_form_submit: "<span>🚀</span> Agenturanmeldung Absenden →",
      b2b_footer_bio: "Spezialisierter Schweizer Reiseveranstalter für höchste Ansprüche. Verlässliche Partner für renommierte Reiseagenturen.",
      b2b_footer_col2_title: "B2B-Partnerkanal",
      b2b_footer_col3_title: "Partnerzentrale",
      b2b_footer_col3_sub: "Vertriebsbetreuung für Partneragenturen:",
      b2b_modal_badge: "Alpina Reisen · B2B-Partnerschaften",
      b2b_modal_title: "Anmeldung Erfolgreich Versendet!",
      b2b_modal_lead: "Die Daten Ihrer Agentur wurden erfasst. Unser Vertriebskoordinator meldet sich umgehend mit Unterlagen und Provisionsplänen.",
      b2b_modal_wpp_btn: "<span>💬</span> Mit Koordinator auf WhatsApp Sprechen",
      b2b_modal_note: "Verbindung zur Alpina Reisen Partnerbetreuung."
    }
  };

  function applyLanguage(lang, showToast = true) {
    const t = TRANSLATIONS[lang] || TRANSLATIONS.pt;
    currentLang = lang;

    // Atualiza atributo lang da página
    document.documentElement.lang = lang === "pt" ? "pt-BR" : lang;

    // Atualiza title e meta description caso existam
    const isB2B = window.location.pathname.includes("trabalhe-conosco") || window.location.pathname.includes("Trabalhe");
    if (isB2B && t.b2b_page_title) {
      document.title = t.b2b_page_title;
    } else if (t.page_title) {
      document.title = t.page_title;
    }

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      if (isB2B && t.b2b_page_desc) {
        metaDesc.setAttribute("content", t.b2b_page_desc);
      } else if (t.page_description) {
        metaDesc.setAttribute("content", t.page_description);
      }
    }

    // Atualiza ícone e código do seletor
    const currentFlagEl = document.getElementById("currentLangFlag");
    const currentCodeEl = document.getElementById("currentLangCode");
    if (currentFlagEl && FLAG_SVGS[lang]) currentFlagEl.innerHTML = FLAG_SVGS[lang];
    if (currentCodeEl) currentCodeEl.textContent = t.code;

    // Atualiza classes ativas no dropdown
    document.querySelectorAll(".lang-option").forEach((opt) => {
      const isActive = opt.getAttribute("data-lang") === lang;
      opt.classList.toggle("is-active", isActive);
      opt.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    // 1. Atualiza elementos com [data-i18n]
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (t[key] !== undefined) {
        el.textContent = t[key];
      }
    });

    // 2. Atualiza elementos com [data-i18n-html]
    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const key = el.getAttribute("data-i18n-html");
      if (t[key] !== undefined) {
        el.innerHTML = t[key];
      }
    });

    // 3. Atualiza placeholders com [data-i18n-placeholder]
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (t[key] !== undefined) {
        el.placeholder = t[key];
      }
    });

    // 4. Atualiza selects do formulário
    const vSelect = document.getElementById("viajantesInput");
    if (vSelect && t.select_viajantes) {
      Array.from(vSelect.options).forEach((opt, idx) => {
        if (t.select_viajantes[idx]) opt.textContent = t.select_viajantes[idx];
      });
    }

    const lSelect = document.getElementById("linhaInput");
    if (lSelect && t.select_linhas) {
      Array.from(lSelect.options).forEach((opt, idx) => {
        if (t.select_linhas[idx]) opt.textContent = t.select_linhas[idx];
      });
    }

    const jSelect = document.getElementById("janelaInput");
    if (jSelect && t.select_janelas) {
      Array.from(jSelect.options).forEach((opt, idx) => {
        if (t.select_janelas[idx]) opt.textContent = t.select_janelas[idx];
      });
    }

    // 5. Atualiza botão de som
    const soundToggle = document.getElementById("soundToggleBtn");
    if (soundToggle) {
      soundToggle.textContent = soundEnabled ? (t.sound_on || "🔊 Som Ativado") : (t.sound_off || "🔇 Som Mudo");
    }

    // 6. Atualiza quadro mecânico e cartões com valores localizados
    setDepartureWindow(currentWindow);

    // 7. Atualiza resumo ao vivo
    updateLiveSummary();

    // Persiste escolha no navegador
    try {
      localStorage.setItem("alpina_lang", lang);
    } catch (e) {
      // localStorage fallback silencioso
    }

    if (showToast) {
      showAlpinaToast(t.toast, 3000);
    }
  }

  function initLanguageSelector() {
    const dropdown = document.getElementById("langSelector");
    const langBtn = document.getElementById("langBtn");
    if (!dropdown || !langBtn) return;

    langBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.toggle("is-open");
      langBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove("is-open");
        langBtn.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && dropdown.classList.contains("is-open")) {
        dropdown.classList.remove("is-open");
        langBtn.setAttribute("aria-expanded", "false");
      }
    });

    dropdown.querySelectorAll(".lang-option").forEach((opt) => {
      opt.addEventListener("click", () => {
        const chosenLang = opt.getAttribute("data-lang");
        applyLanguage(chosenLang, true);
        dropdown.classList.remove("is-open");
        langBtn.setAttribute("aria-expanded", "false");
      });
    });

    let savedLang = "pt";
    try {
      savedLang = localStorage.getItem("alpina_lang") || "pt";
    } catch (e) {
      savedLang = "pt";
    }

    if (savedLang && savedLang !== "pt") {
      applyLanguage(savedLang, false);
    }
  }

  /* ==========================================================================
     13. INICIALIZAÇÃO GERAL
     ========================================================================== */
  document.addEventListener("DOMContentLoaded", () => {
    setupStaticWhatsAppLinks();
    initDepartureBoard();
    init3DTilt();
    initItineraryFilter();
    initBookingForm();
    initPartnerForm();
    initAlpinaModal();
    initPhoneMasks();
    initNavigation();
    initLanguageSelector();
    setDepartureWindow("jan-mar");
  });

})();
