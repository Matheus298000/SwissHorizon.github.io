/**
 * SWISS HORIZON — SISTEMA DE PORTAL & GESTÃO B2B
 * Autenticação, Painel do Parceiro (Folder A4 & Comissões) e
 * Painel Administrativo do RH (Aprovação e Cadastro de Parceiros).
 */

(function () {
  "use strict";

  const STORAGE_KEY = "swiss_horizon_portal_v1";
  const WHATSAPP_SUPPORT = "5511939056979";

  /* ==========================================================================
     1. INICIALIZAÇÃO DO BANCO DE DADOS (LOCALSTORAGE)
     ========================================================================== */
  function getInitialDB() {
    return {
      currentUser: null,
      users: [
        {
          id: "usr-admin-1",
          email: "admin@swisshorizon.com",
          password: "admin123",
          name: "Michel (CHRO)",
          role: "admin",
          department: "Gente & Gestão (RH)",
          createdAt: "2026-10-01"
        },
        {
          id: "usr-admin-2",
          email: "matheus@swisshorizon.com",
          password: "admin123",
          name: "Matheus (CIO)",
          role: "admin",
          department: "Tecnologia & Inovação",
          createdAt: "2026-10-01"
        },
        {
          id: "usr-part-1",
          email: "contato@alpineturismo.com.br",
          password: "parceiro123",
          name: "Alpine Turismo e Viagens",
          contact: "Carlos Eduardo",
          city: "São Paulo / SP",
          whatsapp: "(11) 98765-4321",
          role: "partner",
          commission: 12,
          status: "active",
          folderDownloads: 14,
          createdAt: "2026-10-15"
        },
        {
          id: "usr-part-2",
          email: "atendimento@montanhaviagens.com.br",
          password: "parceiro123",
          name: "Montanha Dourada Turismo",
          contact: "Beatriz Nogueira",
          city: "Belo Horizonte / MG",
          whatsapp: "(31) 99876-5432",
          role: "partner",
          commission: 15,
          status: "active",
          folderDownloads: 8,
          createdAt: "2026-10-22"
        }
      ],
      pendingLeads: [
        {
          id: "lead-1",
          agency: "Horizonte Brasil Viagens",
          city: "Campinas / SP",
          contact: "Juliana Mendes",
          whatsapp: "(19) 99123-4567",
          email: "juliana@horizontebrasil.com.br",
          msg: "Atendemos casais de alta renda e famílias para a Europa. Pedido de material feito via WhatsApp.",
          source: "WhatsApp / Indicação RH",
          submittedAt: "2026-11-08 14:30",
          status: "pending"
        },
        {
          id: "lead-2",
          agency: "Viaje Bem Alpinos",
          city: "Curitiba / PR",
          contact: "Roberto Silveira",
          whatsapp: "(41) 98877-6655",
          email: "roberto@viajebemalpinos.com.br",
          msg: "Gostaria de colocar o folder no balcão da loja e treinar 3 agentes de vendas.",
          source: "Formulário Trabalhe Conosco",
          submittedAt: "2026-11-08 18:45",
          status: "pending"
        }
      ],
      activityLogs: [
        { text: "Agência Alpine Turismo fez download do Folder A4 oficial", time: "Hoje, 10:24" },
        { text: "Novo pedido de credenciamento recebido de Horizonte Brasil Viagens", time: "Hoje, 14:30" },
        { text: "Comissão de R$ 2.088 liberada para Montanha Dourada Turismo", time: "Ontem, 16:15" }
      ]
    };
  }

  function getDB() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn("Erro ao ler localStorage do portal:", e);
    }
    const initial = getInitialDB();
    saveDB(initial);
    return initial;
  }

  function saveDB(db) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      console.error("Erro ao salvar localStorage do portal:", e);
    }
  }

  /* ==========================================================================
     2. AUTENTICAÇÃO E SESSÃO
     ========================================================================== */
  function getCurrentUser() {
    const db = getDB();
    return db.currentUser;
  }

  function login(email, password) {
    const db = getDB();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    const user = db.users.find(
      (u) => u.email.toLowerCase() === cleanEmail && u.password === cleanPass
    );

    if (!user) {
      return { success: false, message: "E-mail ou senha incorretos. Verifique suas credenciais." };
    }

    if (user.status === "suspended") {
      return { success: false, message: "Acesso temporariamente suspenso. Entre em contato com a gestão Swiss Horizon." };
    }

    db.currentUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      agency: user.name,
      contact: user.contact || user.name,
      commission: user.commission || 12,
      department: user.department || "Parceiro Credenciado"
    };

    saveDB(db);
    return { success: true, user: db.currentUser };
  }

  function logout() {
    const db = getDB();
    db.currentUser = null;
    saveDB(db);
    window.location.href = "portal-login.html";
  }

  function requireAuth(allowedRole) {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = "portal-login.html";
      return null;
    }

    if (allowedRole && user.role !== allowedRole) {
      if (user.role === "admin") {
        window.location.href = "portal-admin.html";
      } else {
        window.location.href = "portal-parceiro.html";
      }
      return null;
    }

    return user;
  }

  /* ==========================================================================
     3. FEEDBACK TOAST DO PORTAL
     ========================================================================== */
  function showPortalToast(message) {
    let toast = document.getElementById("portalToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "portalToast";
      toast.className = "portal-toast";
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span>🇨🇭</span> <span>${message}</span>`;
    toast.classList.add("is-active");

    setTimeout(() => {
      toast.classList.remove("is-active");
    }, 4500);
  }

  /* ==========================================================================
     4. MÓDULO PÚBLICO: ADICIONAR LEAD DE CREDENCIAMENTO
     ========================================================================== */
  window.portalAddPendingLead = function (leadData) {
    const db = getDB();
    const newLead = {
      id: "lead-" + Date.now(),
      agency: leadData.agency || "Agência Não Informada",
      city: leadData.city || "Brasil",
      contact: leadData.contact || "Responsável",
      whatsapp: leadData.whatsapp || "",
      email: leadData.email || `${leadData.contact ? leadData.contact.toLowerCase().replace(/\s+/g, '') : 'contato'}@agencia.com.br`,
      msg: leadData.msg || "Interesse em revender roteiros da Swiss Horizon.",
      source: "Formulário Trabalhe Conosco / WhatsApp",
      submittedAt: new Date().toLocaleString("pt-BR"),
      status: "pending"
    };

    db.pendingLeads.unshift(newLead);
    db.activityLogs.unshift({
      text: `Nova solicitação de credenciamento: ${newLead.agency} (${newLead.city})`,
      time: "Agora"
    });

    saveDB(db);
    return newLead;
  };

  /* ==========================================================================
     5. TELA DE LOGIN (portal-login.html)
     ========================================================================== */
  function initLoginPage() {
    const loginForm = document.getElementById("portalLoginForm");
    if (!loginForm) return;

    // Se já estiver logado, redireciona
    const current = getCurrentUser();
    if (current) {
      if (current.role === "admin") {
        window.location.href = "portal-admin.html";
        return;
      } else {
        window.location.href = "portal-parceiro.html";
        return;
      }
    }

    // Alternador de abas: Login vs Solicitar Credenciamento
    const tabBtns = document.querySelectorAll(".login-tab-btn");
    const loginPanel = document.getElementById("loginTabPanel");
    const registerPanel = document.getElementById("registerTabPanel");

    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        tabBtns.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");

        const target = btn.getAttribute("data-tab");
        if (target === "register") {
          if (loginPanel) loginPanel.style.display = "none";
          if (registerPanel) registerPanel.style.display = "block";
        } else {
          if (loginPanel) loginPanel.style.display = "block";
          if (registerPanel) registerPanel.style.display = "none";
        }
      });
    });

    // Envio do formulário de login
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const emailInput = document.getElementById("loginEmail");
      const passInput = document.getElementById("loginPassword");
      const errorBox = document.getElementById("loginErrorMsg");

      const result = login(emailInput.value, passInput.value);
      if (result.success) {
        showPortalToast(`Bem-vindo, ${result.user.name}! Acessando o portal...`);
        setTimeout(() => {
          if (result.user.role === "admin") {
            window.location.href = "portal-admin.html";
          } else {
            window.location.href = "portal-parceiro.html";
          }
        }, 600);
      } else {
        if (errorBox) {
          errorBox.textContent = result.message;
          errorBox.style.display = "block";
        } else {
          alert(result.message);
        }
      }
    });

    // Botões de Demonstração Rápida
    const btnDemoAdmin = document.getElementById("demoBtnAdmin");
    if (btnDemoAdmin) {
      btnDemoAdmin.addEventListener("click", () => {
        document.getElementById("loginEmail").value = "admin@swisshorizon.com";
        document.getElementById("loginPassword").value = "admin123";
        loginForm.dispatchEvent(new Event("submit"));
      });
    }

    const btnDemoPartner = document.getElementById("demoBtnPartner");
    if (btnDemoPartner) {
      btnDemoPartner.addEventListener("click", () => {
        document.getElementById("loginEmail").value = "contato@alpineturismo.com.br";
        document.getElementById("loginPassword").value = "parceiro123";
        loginForm.dispatchEvent(new Event("submit"));
      });
    }

    // Formulário de Credenciamento Rápido na Aba 2
    const quickRegisterForm = document.getElementById("quickRegisterForm");
    if (quickRegisterForm) {
      quickRegisterForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const agency = document.getElementById("regAgencyName").value.trim();
        const city = document.getElementById("regAgencyCity").value.trim();
        const contact = document.getElementById("regAgencyContact").value.trim();
        const wpp = document.getElementById("regAgencyWpp").value.trim();
        const email = document.getElementById("regAgencyEmail").value.trim();
        const msg = document.getElementById("regAgencyMsg").value.trim();

        window.portalAddPendingLead({ agency, city, contact, whatsapp: wpp, email, msg });

        showPortalToast("Solicitação enviada ao RH da Swiss Horizon com sucesso!");
        quickRegisterForm.reset();

        const successNotice = document.getElementById("registerSuccessNotice");
        if (successNotice) {
          successNotice.style.display = "block";
        }
      });
    }
  }

  /* ==========================================================================
     6. PORTAL DO PARCEIRO (portal-parceiro.html)
     ========================================================================== */
  function initPartnerPage() {
    const user = requireAuth("partner");
    if (!user) return;

    // Preenche dados do parceiro no header e banner
    const agencyNameEls = document.querySelectorAll("[data-partner-agency]");
    agencyNameEls.forEach((el) => (el.textContent = user.name));

    const contactNameEls = document.querySelectorAll("[data-partner-contact]");
    contactNameEls.forEach((el) => (el.textContent = user.contact || "Parceiro"));

    const commissionEls = document.querySelectorAll("[data-partner-commission]");
    commissionEls.forEach((el) => (el.textContent = `${user.commission || 12}%`));

    // Contador de download do Folder Oficial
    const btnDownloadFolder = document.getElementById("btnDownloadOfficialFolder");
    if (btnDownloadFolder) {
      btnDownloadFolder.addEventListener("click", () => {
        const db = getDB();
        const pUser = db.users.find((u) => u.id === user.id);
        if (pUser) {
          pUser.folderDownloads = (pUser.folderDownloads || 0) + 1;
        }
        db.activityLogs.unshift({
          text: `${user.name} baixou o Folder A4 Oficial`,
          time: "Agora"
        });
        saveDB(db);

        const countEl = document.getElementById("partnerDownloadCount");
        if (countEl && pUser) {
          countEl.textContent = pUser.folderDownloads;
        }
        showPortalToast("Download do Folder Oficial A4 iniciado!");
      });
    }

    // Inicialização do Simulador de Ganhos B2B
    initCommissionSimulator(user.commission || 12);

    // Inicialização do Gerador Rápido de Propostas para Clientes
    initProposalGenerator(user);

    // Botão de Logout
    const logoutBtn = document.getElementById("portalLogoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", logout);
    }
  }

  function initCommissionSimulator(defaultRate) {
    const selectRoute = document.getElementById("simRouteSelect");
    const inputPax = document.getElementById("simPaxInput");
    const outputTotal = document.getElementById("simTotalOutput");
    const outputCom = document.getElementById("simCommissionOutput");
    const outputRate = document.getElementById("simRateLabel");

    if (!selectRoute || !inputPax || !outputTotal || !outputCom) return;

    function calculate() {
      const price = parseFloat(selectRoute.value) || 17400;
      const pax = parseInt(inputPax.value) || 2;
      const rate = defaultRate / 100;

      const totalVenda = price * pax;
      const ganhoComissao = totalVenda * rate;

      outputTotal.textContent = totalVenda.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      outputCom.textContent = ganhoComissao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      if (outputRate) outputRate.textContent = `${defaultRate}%`;
    }

    selectRoute.addEventListener("change", calculate);
    inputPax.addEventListener("input", calculate);
    calculate();
  }

  function initProposalGenerator(partnerUser) {
    const propForm = document.getElementById("quickProposalForm");
    const propOutputBox = document.getElementById("proposalResultBox");
    if (!propForm || !propOutputBox) return;

    propForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const clientName = document.getElementById("propClientName").value.trim() || "Cliente Especial";
      const routeSelect = document.getElementById("propRoute");
      const routeText = routeSelect.options[routeSelect.selectedIndex].text;
      const windowSelect = document.getElementById("propWindow").value;
      const pax = document.getElementById("propPax").value || 2;

      const proposalText =
`🇨🇭 *PROPOSTA EXCLUSIVA SUÍÇA 2027 — SWISS HORIZON*
--------------------------------------------------
Agência Parceira Credenciada: ${partnerUser.name}
Consultor Responsável: ${partnerUser.contact}
Cliente: ${clientName}
--------------------------------------------------
• Roteiro: ${routeText}
• Janela de Embarque: ${windowSelect}
• Número de Passageiros: ${pax} pessoa(s)
• Inclusões Principais: Trens Panorâmicos 1ª Classe (Swiss Travel Pass), Hotéis Boutique 4/5 estrelas e Guias Alpinos.
• Condições: Em até 12x sem juros no cartão ou condições especiais à vista.
--------------------------------------------------
Embarque com a precisão suíça. Fale com a ${partnerUser.name} para confirmar sua reserva!`;

      document.getElementById("proposalTextOutput").value = proposalText;
      propOutputBox.style.display = "block";
      propOutputBox.scrollIntoView({ behavior: "smooth" });
      showPortalToast("Proposta personalizada gerada com sucesso!");
    });

    const btnCopyProp = document.getElementById("btnCopyProposal");
    if (btnCopyProp) {
      btnCopyProp.addEventListener("click", () => {
        const text = document.getElementById("proposalTextOutput").value;
        navigator.clipboard.writeText(text).then(() => {
          showPortalToast("Proposta copiada para a área de transferência!");
        });
      });
    }
  }

  /* ==========================================================================
     7. PAINEL ADMINISTRATIVO & RH (portal-admin.html)
     ========================================================================== */
  function initAdminPage() {
    const user = requireAuth("admin");
    if (!user) return;

    const adminNameEl = document.getElementById("adminLoggedName");
    if (adminNameEl) adminNameEl.textContent = user.name;

    renderAdminDashboard();

    // Abas de navegação interna do Admin
    const adminTabs = document.querySelectorAll(".admin-tab-btn");
    const adminPanels = document.querySelectorAll(".admin-tab-panel");

    adminTabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        adminTabs.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");

        const target = btn.getAttribute("data-admin-tab");
        adminPanels.forEach((p) => {
          p.style.display = p.id === target ? "block" : "none";
        });
      });
    });

    // Formulário de Cadastro Manual de Parceiro (pós WhatsApp ou aprovação RH)
    const manualForm = document.getElementById("adminManualPartnerForm");
    if (manualForm) {
      manualForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const agency = document.getElementById("manAgencyName").value.trim();
        const contact = document.getElementById("manContactName").value.trim();
        const city = document.getElementById("manCity").value.trim();
        const wpp = document.getElementById("manWpp").value.trim();
        const email = document.getElementById("manEmail").value.trim();
        const password = document.getElementById("manPassword").value.trim() || "swiss2027";
        const commission = parseInt(document.getElementById("manCommission").value) || 12;

        const db = getDB();
        const newPartner = {
          id: "usr-part-" + Date.now(),
          email: email.toLowerCase(),
          password: password,
          name: agency,
          contact: contact,
          city: city,
          whatsapp: wpp,
          role: "partner",
          commission: commission,
          status: "active",
          folderDownloads: 0,
          createdAt: new Date().toLocaleDateString("pt-BR")
        };

        db.users.push(newPartner);
        db.activityLogs.unshift({
          text: `Agência ${agency} cadastrada diretamente pela administração (RH)`,
          time: "Agora"
        });
        saveDB(db);

        manualForm.reset();
        showPortalToast(`Agência ${agency} cadastrada com sucesso! Login: ${email}`);
        renderAdminDashboard();

        // Oferece envio no WhatsApp
        const wppMsg = encodeURIComponent(
          `Olá ${contact}! Sua agência *${agency}* foi credenciada com sucesso pela Swiss Horizon! 🇨🇭\n\nSeu acesso ao Portal do Parceiro:\n• Link: https://swisshorizon.io/portal-login.html\n• E-mail: ${email}\n• Senha: ${password}\n• Comissão: ${commission}%\n\nAcesse para baixar o Folder Oficial em PDF A4 e a tabela de comissões!`
        );
        const wppLink = `https://wa.me/${wpp.replace(/\D/g, "")}?text=${wppMsg}`;
        window.open(wppLink, "_blank");
      });
    }

    // Botão de Logout
    const logoutBtn = document.getElementById("portalLogoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", logout);
    }
  }

  function renderAdminDashboard() {
    const db = getDB();

    const activePartners = db.users.filter((u) => u.role === "partner" && u.status === "active");
    const pendingLeads = db.pendingLeads.filter((l) => l.status === "pending");
    const totalDownloads = activePartners.reduce((acc, p) => acc + (p.folderDownloads || 0), 0);

    // Métricas do topo
    const mActive = document.getElementById("metricActivePartners");
    if (mActive) mActive.textContent = activePartners.length;

    const mPending = document.getElementById("metricPendingRH");
    if (mPending) mPending.textContent = pendingLeads.length;

    const mDownloads = document.getElementById("metricFolderDownloads");
    if (mDownloads) mDownloads.textContent = totalDownloads;

    const tabCount = document.getElementById("pendingTabCount");
    if (tabCount) tabCount.textContent = pendingLeads.length;

    // 1. Renderiza Fila de Aprovação do RH
    const queueContainer = document.getElementById("rhApprovalQueueList");
    if (queueContainer) {
      if (pendingLeads.length === 0) {
        queueContainer.innerHTML = `
          <div style="text-align:center; padding: 40px; color: rgba(255,255,255,0.6);">
            <div style="font-size:2.5rem; margin-bottom:12px;">✅</div>
            <strong>Nenhuma solicitação pendente no momento.</strong>
            <p style="font-size:0.85rem; margin-top:6px;">Todos os pedidos de credenciamento via WhatsApp e site já foram processados pelo RH.</p>
          </div>
        `;
      } else {
        queueContainer.innerHTML = pendingLeads
          .map(
            (lead) => `
          <article class="approval-queue-card" id="card-${lead.id}">
            <div class="approval-card-top">
              <div>
                <h4 class="approval-agency-name">${lead.agency}</h4>
                <div class="approval-meta-line">
                  <span>📍 ${lead.city}</span>
                  <span>👤 Responsável: <strong>${lead.contact}</strong></span>
                  <span>💬 WhatsApp: <strong>${lead.whatsapp}</strong></span>
                  <span>📅 Solicitado em: ${lead.submittedAt}</span>
                  <span>🏷️ Origem: <em>${lead.source || "WhatsApp"}</em></span>
                </div>
              </div>
              <span class="approval-status-badge">Aguardando Parecer RH</span>
            </div>

            ${lead.msg ? `<div class="approval-message-box">"${lead.msg}"</div>` : ""}

            <div class="approval-actions-bar">
              <div style="display:flex; align-items:center; gap:10px;">
                <label style="font-size:0.82rem; color:rgba(255,255,255,0.8);">Comissão:</label>
                <select id="comm-${lead.id}" style="padding:6px 10px; background:#071321; border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:6px; font-size:0.84rem;">
                  <option value="12" selected>12% Padrão</option>
                  <option value="14">14% Diferenciada</option>
                  <option value="15">15% Grupo VIP</option>
                  <option value="10">10% Inicial</option>
                </select>
              </div>

              <div class="approval-btn-group">
                <button type="button" class="btn btn-primary" onclick="window.portalApproveLead('${lead.id}')" style="padding:8px 18px; font-size:0.86rem;">
                  <span>✅</span> Aprovar Parceria (RH)
                </button>
                <button type="button" class="btn btn-outline-light" onclick="window.portalContactLeadWpp('${lead.id}')" style="padding:8px 16px; font-size:0.86rem;">
                  <span>💬</span> Chamar no WhatsApp
                </button>
                <button type="button" class="btn btn-outline-dark" onclick="window.portalRejectLead('${lead.id}')" style="padding:8px 14px; font-size:0.86rem; color:#ff6b61; border-color:rgba(218,41,28,0.4);">
                  Recusar
                </button>
              </div>
            </div>
          </article>
        `
          )
          .join("");
      }
    }

    // 2. Renderiza Lista de Agências Ativas
    const partnersTableBody = document.getElementById("activePartnersTableBody");
    if (partnersTableBody) {
      if (activePartners.length === 0) {
        partnersTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px;">Nenhuma agência parceira ativa.</td></tr>`;
      } else {
        partnersTableBody.innerHTML = activePartners
          .map(
            (p) => `
          <tr>
            <td><strong>${p.name}</strong></td>
            <td>${p.contact || "—"}</td>
            <td>${p.city || "—"}</td>
            <td>${p.email}</td>
            <td><span style="color:#2ecc71; font-weight:700; font-family:var(--font-mono);">${p.commission}%</span></td>
            <td><span style="font-family:var(--font-mono); font-size:0.85rem;">${p.folderDownloads || 0} downloads</span></td>
            <td>
              <button type="button" class="btn btn-outline-light" style="padding:4px 10px; font-size:0.75rem;" onclick="window.portalContactLeadWpp('${p.id}', '${p.whatsapp}', '${p.contact}', '${p.name}')">
                WhatsApp
              </button>
            </td>
          </tr>
        `
          )
          .join("");
      }
    }
  }

  // Ações globais do Admin
  window.portalApproveLead = function (leadId) {
    const db = getDB();
    const lead = db.pendingLeads.find((l) => l.id === leadId);
    if (!lead) return;

    const selectComm = document.getElementById(`comm-${leadId}`);
    const commission = selectComm ? parseInt(selectComm.value) : 12;
    const defaultPassword = "swiss" + Math.floor(1000 + Math.random() * 9000);

    // Cria a conta de parceiro
    const newPartner = {
      id: "usr-part-" + Date.now(),
      email: lead.email || `parceiro_${Date.now()}@agencia.com.br`,
      password: defaultPassword,
      name: lead.agency,
      contact: lead.contact,
      city: lead.city,
      whatsapp: lead.whatsapp,
      role: "partner",
      commission: commission,
      status: "active",
      folderDownloads: 0,
      createdAt: new Date().toLocaleDateString("pt-BR")
    };

    db.users.push(newPartner);
    lead.status = "approved";

    db.activityLogs.unshift({
      text: `RH aprovou credenciamento de ${lead.agency} com comissão de ${commission}%`,
      time: "Agora"
    });

    saveDB(db);
    showPortalToast(`Agência ${lead.agency} aprovada com sucesso pelo RH!`);
    renderAdminDashboard();

    // Abre WhatsApp para notificar a agência
    const wppMsg = encodeURIComponent(
      `Olá ${lead.contact}! Tudo bem? 🇨🇭\n\nTemos o prazer de informar que o credenciamento da agência *${lead.agency}* foi APROVADO pela equipe de RH e Operações da Swiss Horizon!\n\nSeus dados de acesso à Área do Parceiro:\n• Acesso: https://swisshorizon.io/portal-login.html\n• E-mail: ${newPartner.email}\n• Senha temporária: ${newPartner.password}\n• Tabela de Comissão Liberada: ${commission}%\n\nAcesse agora para baixar o Folder em PDF diagramado em A4 e a tabela confidencial de saídas!`
    );
    const cleanWpp = lead.whatsapp.replace(/\D/g, "");
    if (cleanWpp) {
      window.open(`https://wa.me/${cleanWpp}?text=${wppMsg}`, "_blank");
    }
  };

  window.portalRejectLead = function (leadId) {
    if (!confirm("Tem certeza que deseja recusar este credenciamento?")) return;
    const db = getDB();
    const lead = db.pendingLeads.find((l) => l.id === leadId);
    if (lead) {
      lead.status = "rejected";
      saveDB(db);
      showPortalToast("Solicitação arquivada.");
      renderAdminDashboard();
    }
  };

  window.portalContactLeadWpp = function (id, wppDirect, contactName, agencyName) {
    let wpp = wppDirect;
    let contact = contactName;
    let agency = agencyName;

    if (!wpp) {
      const db = getDB();
      const lead = db.pendingLeads.find((l) => l.id === id);
      if (lead) {
        wpp = lead.whatsapp;
        contact = lead.contact;
        agency = lead.agency;
      }
    }

    if (!wpp) {
      alert("Número de WhatsApp não informado.");
      return;
    }

    const cleanWpp = wpp.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Olá ${contact || "amigo(a)"}! Aqui é da equipe Swiss Horizon sobre a parceria com a agência *${agency || "sua agência"}*. Como posso ajudar?`
    );
    window.open(`https://wa.me/${cleanWpp}?text=${msg}`, "_blank");
  };

  /* ==========================================================================
     8. INICIALIZAÇÃO AUTOMÁTICA POR PÁGINA
     ========================================================================== */
  document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;

    if (path.includes("portal-login") || document.getElementById("portalLoginForm")) {
      initLoginPage();
    } else if (path.includes("portal-parceiro") || document.getElementById("partnerDashboardSection")) {
      initPartnerPage();
    } else if (path.includes("portal-admin") || document.getElementById("adminDashboardSection")) {
      initAdminPage();
    }
  });

})();
