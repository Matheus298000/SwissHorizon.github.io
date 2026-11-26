/**
 * SWISS HORIZON — SISTEMA DE PORTAL & GESTÃO B2B
 * Autenticação, Área do Parceiro (Folder A4 & Comissões),
 * Painel Administrativo do RH (Aprovações e Cadastro pós-WhatsApp),
 * Seletor de Idiomas (Português, Inglês e Espanhol) e
 * Ponte para Banco de Dados em Nuvem (Firebase / GitHub Pages).
 */

(function () {
  "use strict";

  const STORAGE_KEY = "swiss_horizon_portal_v1";
  const LANG_KEY = "swiss_portal_lang";
  const WHATSAPP_SUPPORT = "5511939056979";

  /* ==========================================================================
     0. CONFIGURAÇÃO DO BANCO DE DADOS EM NUVEM (PARA GITHUB PAGES)
     O GitHub Pages é uma hospedagem estática. Para sincronizar logins, novos
     parceiros e aprovações em tempo real entre diferentes celulares e computadores,
     conecte o Google Firebase Firestore preenchendo as chaves abaixo:
     (Veja o arquivo COMO-SALVAR-LOGINS-GITHUB-PAGES.md para o passo a passo de 3 minutos)
     ========================================================================== */
  const CLOUD_DB_CONFIG = {
    enabled: false, // Mude para true após colar suas chaves do Firebase
    firebaseConfig: {
      apiKey: "SUA_API_KEY_AQUI",
      authDomain: "seu-projeto.firebaseapp.com",
      projectId: "seu-projeto",
      storageBucket: "seu-projeto.appspot.com",
      messagingSenderId: "000000000000",
      appId: "1:000000000000:web:000000000000"
    }
  };

  let firestoreDB = null;

  function initCloudDatabaseIfAvailable() {
    if (!CLOUD_DB_CONFIG.enabled || !CLOUD_DB_CONFIG.firebaseConfig.apiKey || CLOUD_DB_CONFIG.firebaseConfig.apiKey === "SUA_API_KEY_AQUI") {
      return;
    }

    try {
      if (typeof firebase !== "undefined" && !firebase.apps.length) {
        firebase.initializeApp(CLOUD_DB_CONFIG.firebaseConfig);
        firestoreDB = firebase.firestore();
        console.log("🇨🇭 Swiss Horizon: Conectado ao Firebase Firestore em nuvem.");

        // Sincronização em tempo real de Usuários/Parceiros com o dispositivo
        firestoreDB.collection("swiss_users").onSnapshot((snapshot) => {
          const db = getDB();
          let changed = false;
          snapshot.forEach((doc) => {
            const cloudUser = doc.data();
            const idx = db.users.findIndex((u) => u.email.toLowerCase() === (cloudUser.email || "").toLowerCase());
            if (idx >= 0) {
              db.users[idx] = { ...db.users[idx], ...cloudUser };
              changed = true;
            } else {
              db.users.push(cloudUser);
              changed = true;
            }
          });
          if (changed) saveDB(db);
        }, (err) => console.warn("Erro no listener swiss_users:", err));

        // Sincronização em tempo real de Solicitações/Leads com o painel do RH
        firestoreDB.collection("swiss_pending_leads").onSnapshot((snapshot) => {
          const db = getDB();
          let changed = false;
          snapshot.forEach((doc) => {
            const cloudLead = { ...doc.data(), id: doc.id };
            const idx = db.pendingLeads.findIndex((l) => l.id === cloudLead.id);
            if (idx >= 0) {
              db.pendingLeads[idx] = { ...db.pendingLeads[idx], ...cloudLead };
              changed = true;
            } else {
              db.pendingLeads.push(cloudLead);
              changed = true;
            }
          });
          if (changed) {
            saveDB(db);
            if (typeof renderAdminDashboard === "function" && document.getElementById("adminDashboardSection")) {
              renderAdminDashboard();
            }
          }
        }, (err) => console.warn("Erro no listener swiss_pending_leads:", err));
      }
    } catch (e) {
      console.warn("Swiss Horizon: Falha ao inicializar Firebase:", e);
    }
  }

  /* ==========================================================================
     1. DICIONÁRIO DE TRADUÇÕES DO PORTAL (PT, EN, ES)
     ========================================================================== */
  const PORTAL_TRANSLATIONS = {
    pt: {
      code: "PT",
      flagSvg: `<svg class="lang-flag-svg" viewBox="0 0 640 480" width="20" height="15" aria-hidden="true"><rect width="640" height="480" fill="#009c3b" rx="40"/><polygon points="320,40 590,240 320,440 50,240" fill="#ffdf00"/><circle cx="320" cy="240" r="120" fill="#002776"/><path d="M 200,240 A 120,120 0 0,0 440,240 A 130,130 0 0,1 200,240" fill="#ffffff"/></svg>`,
      // Header comum
      nav_back_work: "← Voltar para Trabalhe Conosco",
      nav_logout: "Sair",
      role_pill_b2b: "Área Exclusiva B2B",
      role_pill_admin: "Gestão RH & Operações B2B",
      role_pill_login: "Portal B2B & Gestão",

      // Tela de Login
      login_title: "Área do Parceiro",
      login_subtitle: "Acesso exclusivo para agências credenciadas e painel de administração & RH da Swiss Horizon.",
      tab_login: "Entrar no Portal",
      tab_register: "Solicitar Credencial",
      lbl_email: "E-mail Corporativo ou Usuário",
      ph_email: "ex.: contato@agencia.com.br",
      lbl_pass: "Senha de Acesso",
      ph_pass: "Digite sua senha",
      lbl_remember: "Lembrar meu acesso",
      link_forgot: "Esqueceu a senha?",
      btn_login: "Acessar Portal",
      kicker_demo: "✦ Contas de Teste Rápido (1 Clique):",
      btn_demo_admin: "👔 Administrador / RH",
      btn_demo_partner: "🏢 Agência Parceira",
      back_home: "← Voltar para a Página Inicial da Swiss Horizon",

      // Solicitação de Credencial (Aba 2)
      reg_success: "✅ Solicitação enviada! Nossa equipe de RH analisará seu cadastro e liberará o acesso via WhatsApp.",
      lbl_reg_agency: "Nome da Agência / Razão Social",
      ph_reg_agency: "Ex.: Alpine Turismo e Viagens",
      lbl_reg_city: "Cidade / Estado (UF)",
      ph_reg_city: "Ex.: São Paulo / SP",
      lbl_reg_contact: "Nome do Responsável Comercial",
      ph_reg_contact: "Seu nome completo",
      lbl_reg_wpp: "WhatsApp Comercial",
      ph_reg_wpp: "(11) 99999-9999",
      lbl_reg_email: "E-mail para Acesso ao Portal",
      ph_reg_email: "contato@suaagencia.com.br",
      lbl_reg_msg: "Perfil da agência ou observação para o RH",
      ph_reg_msg: "Conte brevemente sobre o perfil dos seus passageiros...",
      btn_reg_submit: "🚀 Enviar Pedido para o RH",

      // Portal do Parceiro
      partner_welcome_badge: "Credenciamento Ativo",
      partner_welcome_title: "Bem-vindo(a), <span data-partner-agency>Sua Agência</span>!",
      partner_welcome_lede: "Aqui está seu canal reservado para download do folder diagramado em A4, tabelas confidenciais de comissionamento, materiais de treinamento e ferramentas exclusivas de vendas para a Suíça.",
      stat_net_comm: "Comissão Líquida",
      stat_downloads: "Downloads do Folder",
      stat_hr_status: "Status no RH",
      stat_active: "Ativo",

      // Folder Hero Box
      folder_badge: "Material Confidencial para Balcão",
      folder_title: "Folder Oficial Swiss Horizon (Formato PDF A4)",
      folder_desc: "Diagramado em padrão gráfico suíço com resolução máxima de impressão (300 DPI), o folder apresenta os 3 roteiros completos (Essencial, Premium e Exclusivo), mapa das ferrovias panorâmicas SBB e tabela de datas para 2027.<br><br><strong>Espaço para Carimbo:</strong> No rodapé da segunda página, há uma área em branco reservada especificamente para o carimbo físico ou inserção da logomarca e WhatsApp da sua agência.",
      btn_download_pdf: "Baixar Folder Oficial A4 (PDF)",
      btn_preview_pdf: "Visualizar no Navegador ↗",
      folder_specs_title: "Especificações Técnicas",
      folder_specs_sub: "Arquivo pronto para gráfica rápida ou impressora de balcão.",
      spec_format: "Formato:",
      spec_format_val: "PDF A4 (2 Páginas)",
      spec_res: "Resolução:",
      spec_res_val: "Alta Definição (Gráfica)",
      spec_stamp: "Espaço Carimbo:",
      spec_stamp_val: "6 x 4 cm reservado",
      spec_windows: "Janelas Inclusas:",
      spec_windows_val: "Jan-Mar & Abr-Jun 2027",
      spec_version: "Versão Atual:",
      spec_version_val: "v2.4 Oficial Swiss Horizon",

      // Tabela de Comissões
      comm_panel_title: "Tabela de Comissionamento & Repasses Comerciais",
      comm_panel_sub: "Valores por passageiro e condições de liquidação para a temporada 2027.",
      comm_badge: "Valores Oficiais B2B",
      th_route: "Roteiro & Duração",
      th_window1: "Janela 1 (Jan-Mar)",
      th_window2: "Janela 2 (Abr-Jun)",
      th_rate: "Comissão Contratada",
      th_rep_pax: "Repasse por Passageiro",
      th_rep_couple: "Repasse para Casal (2 pax)",
      th_group_bonus: "Bonificação para Grupos",
      route_essencial: "Linha Essencial",
      route_essencial_desc: "8 dias / 7 noites (Zurique, Lucerna, Interlaken)",
      route_premium: "Linha Premium",
      route_premium_desc: "10 dias / 9 noites (+ Zermatt & Matterhorn)",
      badge_best_seller: "Mais Vendida",
      route_exclusivo: "Linha Exclusiva",
      route_exclusivo_desc: "12 dias / 11 noites (+ Glacier Express & St. Moritz)",
      bonus_essencial: "+2% acima de 6 pax",
      bonus_premium: "+3% acima de 6 pax",
      bonus_exclusivo: "+3% acima de 4 pax",
      comm_rule_note: "✦ <strong>Regra de Pagamento:</strong> O repasse comissionado é creditado na conta da agência em até 5 dias úteis após a confirmação da reserva do passageiro, ou pago mensalmente de forma proporcional ao parcelamento em 12x, conforme opção da agência.",

      // Simulador
      sim_title: "Simulador de Ganhos por Venda",
      sim_sub: "Calcule em tempo real o retorno líquido para a sua agência.",
      sim_lbl_route: "Escolha o Pacote:",
      sim_lbl_pax: "Número de Passageiros:",
      sim_disclaimer: "* Cálculo baseado na sua taxa contratada de",
      sim_lbl_net: "Comissão Líquida da Agência",
      sim_lbl_total: "Valor Total Fechado com Passageiro:",

      // Gerador de Propostas
      prop_title: "Gerador Rápido de Propostas para Clientes",
      prop_sub: "Crie textos formatados para enviar ao cliente no WhatsApp com o nome da sua agência.",
      prop_lbl_client: "Nome do Cliente:",
      prop_ph_client: "Ex.: Dr. Renato e Família",
      prop_lbl_route: "Roteiro Escolhido:",
      prop_lbl_window: "Janela de Embarque:",
      prop_lbl_pax: "Viajantes:",
      btn_gen_prop: "Gerar Proposta Formatada",
      prop_lbl_output: "Texto Pronto para Enviar no WhatsApp do Passageiro:",
      btn_copy_prop: "Copiar Texto da Proposta",

      // Suporte B2B
      sup_title: "Precisa de suporte em uma cotação especial?",
      sup_desc: "Nosso consultor de atendimento a parceiros pode montar propostas customizadas para grupos ou participar com você de reuniões com clientes.",
      btn_sup_wpp: "WhatsApp B2B (+55 11 93905-6979)",

      // Admin Dashboard
      adm_metric_active: "Agências Ativas",
      adm_metric_pending: "Aguardando Parecer RH",
      adm_metric_downloads: "Downloads do Folder A4",
      adm_metric_comm: "Comissões em Andamento",
      tab_adm_queue: "Fila de Aprovação do RH",
      tab_adm_manual: "Cadastrar Parceiro (Pós-WhatsApp)",
      tab_adm_partners: "Agências Credenciadas",
      tab_adm_logs: "Histórico & Logs",
      adm_queue_title: "Pedidos de Credenciamento Aguardando RH",
      adm_queue_sub: "Solicitações recebidas através do WhatsApp e formulário de Trabalhe Conosco. Avalie e aprove para liberar o acesso ao Folder e às comissões.",
      adm_manual_title: "Cadastro Direto de Nova Agência Parceira",
      adm_manual_sub: "Use este formulário quando o alinhamento comercial for concluído pelo WhatsApp ou telefone para criar o acesso imediato da agência.",
      btn_manual_submit: "Cadastrar Agência & Notificar Acesso no WhatsApp →",
      adm_partners_title: "Agências Parceiras Ativas na Base",
      adm_partners_sub: "Parceiros com login liberado, acesso ao Folder A4 e comissão habilitada.",
      th_adm_agency: "Agência",
      th_adm_contact: "Responsável",
      th_adm_city: "Cidade / UF",
      th_adm_email: "Login (E-mail)",
      th_adm_comm: "Comissão",
      th_adm_use: "Uso do Folder",
      th_adm_actions: "Ações",
      adm_logs_title: "Registro de Atividades & Auditoria B2B",
      adm_logs_sub: "Histórico de aprovações do RH, downloads de materiais e acessos recentes.",
      lbl_adm_agency: "Razão Social ou Nome Fantasia da Agência",
      ph_adm_agency: "Ex.: Viaje Bem Turismo Ltda",
      lbl_adm_contact: "Nome do Responsável / Agente",
      ph_adm_contact: "Ex.: Fernanda Costa",
      lbl_adm_city: "Cidade / UF",
      ph_adm_city: "Ex.: Rio de Janeiro / RJ",
      lbl_adm_wpp: "WhatsApp Comercial da Agência",
      ph_adm_wpp: "(21) 98888-7777",
      lbl_adm_email: "E-mail de Login do Parceiro",
      ph_adm_email: "contato@viajebem.com.br",
      lbl_adm_pass: "Senha Inicial de Acesso",
      lbl_adm_comm: "Nível de Comissão Contratada",
      badge_hr_direct: "Aprovação Direta RH",
      admin_master_detail: "Acesso Master · Administração Swiss Horizon"
    },

    en: {
      code: "EN",
      flagSvg: `<svg class="lang-flag-svg" viewBox="0 0 640 480" width="20" height="15" aria-hidden="true"><clipPath id="uk-flag-clip-portal"><rect width="640" height="480" rx="40"/></clipPath><g clip-path="url(#uk-flag-clip-portal)"><rect width="640" height="480" fill="#012169"/><path d="M0,0 L640,480 M640,0 L0,480" stroke="#ffffff" stroke-width="64"/><path d="M0,0 L640,480 M640,0 L0,480" stroke="#c8102e" stroke-width="24"/><path d="M320,0 V480 M0,240 H640" stroke="#ffffff" stroke-width="106"/><path d="M320,0 V480 M0,240 H640" stroke="#c8102e" stroke-width="64"/></g></svg>`,
      nav_back_work: "← Back to Work With Us",
      nav_logout: "Sign Out",
      role_pill_b2b: "Exclusive B2B Hub",
      role_pill_admin: "HR Management & Operations",
      role_pill_login: "B2B Portal & Access",

      login_title: "Partner Portal",
      login_subtitle: "Exclusive portal for accredited agencies and Swiss Horizon HR management panel.",
      tab_login: "Sign In",
      tab_register: "Request Access",
      lbl_email: "Corporate Email or Username",
      ph_email: "e.g.: partner@agency.com",
      lbl_pass: "Password",
      ph_pass: "Enter your password",
      lbl_remember: "Remember me",
      link_forgot: "Forgot password?",
      btn_login: "Sign In to Portal",
      kicker_demo: "✦ Quick Test Accounts (1 Click):",
      btn_demo_admin: "👔 Administrator / HR",
      btn_demo_partner: "🏢 Partner Agency",
      back_home: "← Back to Swiss Horizon Home",

      reg_success: "✅ Request submitted! Our HR team will review your agency and send credentials via WhatsApp.",
      lbl_reg_agency: "Agency Name / Registered Entity",
      ph_reg_agency: "e.g.: Alpine Travel Agency",
      lbl_reg_city: "City / Country",
      ph_reg_city: "e.g.: London / UK or New York / USA",
      lbl_reg_contact: "Lead Agent / Manager Name",
      ph_reg_contact: "Your full name",
      lbl_reg_wpp: "Commercial WhatsApp / Phone",
      ph_reg_wpp: "+1 (555) 000-0000",
      lbl_reg_email: "Corporate Access Email",
      ph_reg_email: "contact@youragency.com",
      lbl_reg_msg: "Agency client profile or note for HR",
      ph_reg_msg: "Tell us briefly about your traveler demographics...",
      btn_reg_submit: "🚀 Submit Application to HR",

      partner_welcome_badge: "Accredited Status",
      partner_welcome_title: "Welcome, <span data-partner-agency>Your Agency</span>!",
      partner_welcome_lede: "Here is your dedicated counter hub to download the official A4 brochure, view confidential commission tiers, access sales guides and booking tools for Switzerland.",
      stat_net_comm: "Net Commission",
      stat_downloads: "Brochure Downloads",
      stat_hr_status: "HR Status",
      stat_active: "Active",

      folder_badge: "Confidential Counter Asset",
      folder_title: "Official Swiss Horizon Brochure (PDF A4 Format)",
      folder_desc: "Designed to Swiss printing standards in ultra-high resolution (300 DPI), featuring all 3 complete itineraries (Essential, Premium, and Exclusive), panoramic SBB rail maps, and 2027 departure windows.<br><br><strong>Counter Stamp Space:</strong> On the bottom of page two, a dedicated blank area is reserved for your agency physical or digital stamp and contact info.",
      btn_download_pdf: "Download Official A4 Brochure (PDF)",
      btn_preview_pdf: "Preview in Browser ↗",
      folder_specs_title: "Technical Specifications",
      folder_specs_sub: "Production-ready file for quick print shops or counter printers.",
      spec_format: "Format:",
      spec_format_val: "PDF A4 (2 Pages)",
      spec_res: "Resolution:",
      spec_res_val: "High Definition (Print-Ready)",
      spec_stamp: "Stamp Area:",
      spec_stamp_val: "6 x 4 cm reserved",
      spec_windows: "Included Windows:",
      spec_windows_val: "Jan-Mar & Apr-Jun 2027",
      spec_version: "Current Version:",
      spec_version_val: "v2.4 Official Swiss Horizon",

      comm_panel_title: "Commissioning & Commercial Payout Table",
      comm_panel_sub: "Per-passenger amounts and settlement terms for the 2027 season.",
      comm_badge: "Official B2B Rates",
      th_route: "Itinerary & Duration",
      th_window1: "Window 1 (Jan-Mar)",
      th_window2: "Window 2 (Apr-Jun)",
      th_rate: "Agreed Rate",
      th_rep_pax: "Payout per Passenger",
      th_rep_couple: "Payout per Couple (2 pax)",
      th_group_bonus: "Group Bonus Tier",
      route_essencial: "Essential Line",
      route_essencial_desc: "8 days / 7 nights (Zurich, Lucerne, Interlaken)",
      route_premium: "Premium Line",
      route_premium_desc: "10 days / 9 nights (+ Zermatt & Matterhorn)",
      badge_best_seller: "Top Seller",
      route_exclusivo: "Exclusive Line",
      route_exclusivo_desc: "12 days / 11 nights (+ Glacier Express & St. Moritz)",
      bonus_essencial: "+2% over 6 pax",
      bonus_premium: "+3% over 6 pax",
      bonus_exclusivo: "+3% over 4 pax",
      comm_rule_note: "✦ <strong>Settlement Terms:</strong> Commission payouts are credited to the agency account within 5 business days following booking confirmation, or distributed monthly aligned with customer 12x installment plans.",

      sim_title: "Sales Earnings Simulator",
      sim_sub: "Calculate real-time net commission earnings for your agency.",
      sim_lbl_route: "Select Itinerary:",
      sim_lbl_pax: "Number of Passengers:",
      sim_disclaimer: "* Calculation based on your agreed tier of",
      sim_lbl_net: "Agency Net Commission",
      sim_lbl_total: "Total Gross Value with Client:",

      prop_title: "Quick Client Proposal Generator",
      prop_sub: "Generate formatted WhatsApp messages with your agency co-branding.",
      prop_lbl_client: "Client Name:",
      prop_ph_client: "e.g.: Mr. & Mrs. Anderson",
      prop_lbl_route: "Chosen Itinerary:",
      prop_lbl_window: "Departure Window:",
      prop_lbl_pax: "Passengers:",
      btn_gen_prop: "Generate Formatted Proposal",
      prop_lbl_output: "Ready-to-Send Text for Client WhatsApp:",
      btn_copy_prop: "Copy Proposal Text",

      sup_title: "Need support with a custom group quote?",
      sup_desc: "Our partner success managers can assemble tailor-made packages for groups or join client planning calls alongside your team.",
      btn_sup_wpp: "WhatsApp B2B Support (+55 11 93905-6979)",

      adm_metric_active: "Active Agencies",
      adm_metric_pending: "Awaiting HR Review",
      adm_metric_downloads: "Brochure Downloads",
      adm_metric_comm: "Pending Commissions",
      tab_adm_queue: "HR Approval Queue",
      tab_adm_manual: "Register Partner (Post-WhatsApp)",
      tab_adm_partners: "Accredited Agencies",
      tab_adm_logs: "Activity Logs",
      adm_queue_title: "Partnership Requests Awaiting HR",
      adm_queue_sub: "Incoming requests via WhatsApp and the Careers/B2B portal. Review and approve to release brochure and commission tiers.",
      adm_manual_title: "Direct New Partner Agency Registration",
      adm_manual_sub: "Use this form once commercial alignment has been closed over WhatsApp or call to grant immediate partner access.",
      btn_manual_submit: "Register Agency & Send WhatsApp Access →",
      adm_partners_title: "Active Partner Agencies in Database",
      adm_partners_sub: "Accredited agencies with active login credentials and brochure access.",
      th_adm_agency: "Agency",
      th_adm_contact: "Lead Contact",
      th_adm_city: "City / State",
      th_adm_email: "Login (Email)",
      th_adm_comm: "Commission",
      th_adm_use: "Brochure Usage",
      th_adm_actions: "Actions",
      adm_logs_title: "Activity & Audit Logs",
      adm_logs_sub: "History of HR approvals, asset downloads, and portal sessions.",
      lbl_adm_agency: "Agency Legal or Trade Name",
      ph_adm_agency: "e.g.: Horizon Travel Group LLC",
      lbl_adm_contact: "Lead Agent / Manager Name",
      ph_adm_contact: "e.g.: Sarah Jenkins",
      lbl_adm_city: "City / State or Country",
      ph_adm_city: "e.g.: Miami / FL or London / UK",
      lbl_adm_wpp: "Commercial WhatsApp / Phone",
      ph_adm_wpp: "+1 (555) 789-0123",
      lbl_adm_email: "Partner Login Email",
      ph_adm_email: "contact@horizontravel.com",
      lbl_adm_pass: "Initial Temporary Password",
      lbl_adm_comm: "Contracted Commission Tier",
      badge_hr_direct: "Direct HR Approval",
      admin_master_detail: "Master Access · Swiss Horizon Administration"
    },

    es: {
      code: "ES",
      flagSvg: `<svg class="lang-flag-svg" viewBox="0 0 640 480" width="20" height="15" aria-hidden="true"><clipPath id="es-flag-clip-portal"><rect width="640" height="480" rx="40"/></clipPath><g clip-path="url(#es-flag-clip-portal)"><rect width="640" height="480" fill="#aa151b"/><rect width="640" height="240" y="120" fill="#f1bf00"/><circle cx="180" cy="240" r="32" fill="#aa151b"/><circle cx="180" cy="240" r="22" fill="#f1bf00"/></g></svg>`,
      nav_back_work: "← Volver a Trabaja con Nosotros",
      nav_logout: "Cerrar Sesión",
      role_pill_b2b: "Área Exclusiva B2B",
      role_pill_admin: "Gestión RRHH y Operaciones B2B",
      role_pill_login: "Portal B2B y Gestión",

      login_title: "Área del Socio",
      login_subtitle: "Acceso exclusivo para agencias acreditadas y panel de administración y RRHH de Swiss Horizon.",
      tab_login: "Iniciar Sesión",
      tab_register: "Solicitar Credenciales",
      lbl_email: "Correo Corporativo o Usuario",
      ph_email: "ej.: contacto@agencia.com",
      lbl_pass: "Contraseña",
      ph_pass: "Ingrese su contraseña",
      lbl_remember: "Recordar mi acceso",
      link_forgot: "¿Olvidó su contraseña?",
      btn_login: "Acceder al Portal",
      kicker_demo: "✦ Cuentas de Prueba Rápida (1 Clic):",
      btn_demo_admin: "👔 Administrador / RRHH",
      btn_demo_partner: "🏢 Agencia Socia",
      back_home: "← Volver a la Página Principal de Swiss Horizon",

      reg_success: "✅ ¡Solicitud enviada! Nuestro equipo de RRHH revisará su registro y enviará las credenciales por WhatsApp.",
      lbl_reg_agency: "Nombre de la Agencia / Razón Social",
      ph_reg_agency: "Ej.: Alpine Turismo y Viajes",
      lbl_reg_city: "Ciudad / País",
      ph_reg_city: "Ej.: Madrid / España o Buenos Aires",
      lbl_reg_contact: "Nombre del Responsable Comercial",
      ph_reg_contact: "Su nombre completo",
      lbl_reg_wpp: "WhatsApp Comercial",
      ph_reg_wpp: "+34 600 000 000",
      lbl_reg_email: "Correo de Acceso al Portal",
      ph_reg_email: "contacto@suagencia.com",
      lbl_reg_msg: "Perfil de la agencia o nota para RRHH",
      ph_reg_msg: "Describa brevemente el perfil de sus pasajeros...",
      btn_reg_submit: "🚀 Enviar Solicitud a RRHH",

      partner_welcome_badge: "Acreditación Activa",
      partner_welcome_title: "¡Bienvenido(a), <span data-partner-agency>Su Agencia</span>!",
      partner_welcome_lede: "Aquí tiene su canal reservado para descargar el folleto en A4, tablas confidenciales de comisiones, material de capacitación y herramientas exclusivas para Suiza.",
      stat_net_comm: "Comisión Neta",
      stat_downloads: "Descargas del Folleto",
      stat_hr_status: "Estado en RRHH",
      stat_active: "Activo",

      folder_badge: "Material Confidencial de Mostrador",
      folder_title: "Folleto Oficial Swiss Horizon (Formato PDF A4)",
      folder_desc: "Diseñado con estándares suizos en máxima resolución de impresión (300 DPI), presenta los 3 itinerarios completos (Esencial, Premium y Exclusivo), mapa de trenes panorámicos SBB y fechas para 2027.<br><br><strong>Espacio para Sello:</strong> En el pie de la segunda página, dispone de un espacio reservado para el sello físico o logotipo y WhatsApp de su agencia.",
      btn_download_pdf: "Descargar Folleto Oficial A4 (PDF)",
      btn_preview_pdf: "Ver en el Navegador ↗",
      folder_specs_title: "Especificaciones Técnicas",
      folder_specs_sub: "Archivo listo para imprenta rápida o impresora de mostrador.",
      spec_format: "Formato:",
      spec_format_val: "PDF A4 (2 Páginas)",
      spec_res: "Resolución:",
      spec_res_val: "Alta Definición (Gráfica)",
      spec_stamp: "Espacio Sello:",
      spec_stamp_val: "6 x 4 cm reservado",
      spec_windows: "Ventanas Incluidas:",
      spec_windows_val: "Ene-Mar & Abr-Jun 2027",
      spec_version: "Versión Actual:",
      spec_version_val: "v2.4 Oficial Swiss Horizon",

      comm_panel_title: "Tabla de Comisiones y Liquidaciones Comerciales",
      comm_panel_sub: "Valores por pasajero y condiciones de liquidación para la temporada 2027.",
      comm_badge: "Tarifas Oficiales B2B",
      th_route: "Itinerario y Duración",
      th_window1: "Ventana 1 (Ene-Mar)",
      th_window2: "Ventana 2 (Abr-Jun)",
      th_rate: "Comisión Acordada",
      th_rep_pax: "Liquidación por Pasajero",
      th_rep_couple: "Liquidación por Pareja (2 pax)",
      th_group_bonus: "Bonificación para Grupos",
      route_essencial: "Línea Esencial",
      route_essencial_desc: "8 días / 7 noches (Zúrich, Lucerna, Interlaken)",
      route_premium: "Línea Premium",
      route_premium_desc: "10 días / 9 noches (+ Zermatt y Matterhorn)",
      badge_best_seller: "Más Vendida",
      route_exclusivo: "Línea Exclusiva",
      route_exclusivo_desc: "12 días / 11 noches (+ Glacier Express y St. Moritz)",
      bonus_essencial: "+2% más de 6 pax",
      bonus_premium: "+3% más de 6 pax",
      bonus_exclusivo: "+3% más de 4 pax",
      comm_rule_note: "✦ <strong>Regla de Pago:</strong> Las comisiones se transfieren a la cuenta de la agencia en un plazo de 5 días hábiles tras la confirmación de la reserva del pasajero, o de forma proporcional a los pagos fraccionados.",

      sim_title: "Simulador de Ganancias por Venta",
      sim_sub: "Calcule en tiempo real el rendimiento neto para su agencia.",
      sim_lbl_route: "Seleccione el Paquete:",
      sim_lbl_pax: "Número de Pasajeros:",
      sim_disclaimer: "* Cálculo basado en su porcentaje contratado de",
      sim_lbl_net: "Comisión Neta de la Agencia",
      sim_lbl_total: "Valor Total Cerrado con el Pasajero:",

      prop_title: "Generador Rápido de Propuestas para Clientes",
      prop_sub: "Cree textos formateados para enviar al cliente por WhatsApp con el nombre de su agencia.",
      prop_lbl_client: "Nombre del Cliente:",
      prop_ph_client: "Ej.: Familia Rodríguez",
      prop_lbl_route: "Itinerario Elegido:",
      prop_lbl_window: "Ventana de Salida:",
      prop_lbl_pax: "Pasajeros:",
      btn_gen_prop: "Generar Propuesta Formateada",
      prop_lbl_output: "Texto Listo para Enviar por WhatsApp al Pasajero:",
      btn_copy_prop: "Copiar Texto de la Propuesta",

      sup_title: "¿Necesita ayuda con una cotización grupal?",
      sup_desc: "Nuestro consultor de atención a socios puede diseñar propuestas personalizadas para grupos o acompañarle en reuniones con clientes.",
      btn_sup_wpp: "WhatsApp B2B (+55 11 93905-6979)",

      adm_metric_active: "Agencias Activas",
      adm_metric_pending: "Pendientes en RRHH",
      adm_metric_downloads: "Descargas Folleto A4",
      adm_metric_comm: "Comisiones en Trámite",
      tab_adm_queue: "Fila de Aprobación RRHH",
      tab_adm_manual: "Registrar Socio (Post-WhatsApp)",
      tab_adm_partners: "Agencias Acreditadas",
      tab_adm_logs: "Historial y Registros",
      adm_queue_title: "Solicitudes de Acreditación Esperando RRHH",
      adm_queue_sub: "Peticiones recibidas vía WhatsApp y formulario. Evalúe y apruebe para habilitar folleto y comisiones.",
      adm_manual_title: "Registro Directo de Nueva Agencia Socia",
      adm_manual_sub: "Use este formulario tras cerrar el acuerdo por WhatsApp o llamada para conceder acceso inmediato.",
      btn_manual_submit: "Registrar Agencia y Enviar Acceso por WhatsApp →",
      adm_partners_title: "Agencias Socias Activas en el Sistema",
      adm_partners_sub: "Agencias acreditadas con credenciales activas y folleto habilitado.",
      th_adm_agency: "Agencia",
      th_adm_contact: "Responsable",
      th_adm_city: "Ciudad / Estado",
      th_adm_email: "Login (Email)",
      th_adm_comm: "Comisión",
      th_adm_use: "Descargas Folleto",
      th_adm_actions: "Acciones",
      adm_logs_title: "Registro de Actividades y Auditoria B2B",
      adm_logs_sub: "Historial de aprobaciones de RRHH, descargas de folletos y accesos recientes.",
      lbl_adm_agency: "Razón Social o Nombre Comercial",
      ph_adm_agency: "Ej.: Viajes Horizonte SL",
      lbl_adm_contact: "Nombre del Responsable / Agente",
      ph_adm_contact: "Ej.: Fernando Morales",
      lbl_adm_city: "Ciudad / Provincia o País",
      ph_adm_city: "Ej.: Madrid / España o Buenos Aires",
      lbl_adm_wpp: "WhatsApp Comercial de la Agencia",
      ph_adm_wpp: "+34 612 345 678",
      lbl_adm_email: "Correo de Acceso del Socio",
      ph_adm_email: "contacto@viajeshorizonte.com",
      lbl_adm_pass: "Contraseña Inicial de Acceso",
      lbl_adm_comm: "Nivel de Comisión Contratada",
      badge_hr_direct: "Aprobación Directa RRHH",
      admin_master_detail: "Acceso Maestro · Administración Swiss Horizon"
    }
  };

  let currentPortalLang = "pt";

  function getSavedPortalLang() {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved && PORTAL_TRANSLATIONS[saved]) {
        return saved;
      }
    } catch (e) {}
    return "pt";
  }

  function applyPortalLanguage(lang) {
    if (!PORTAL_TRANSLATIONS[lang]) lang = "pt";
    currentPortalLang = lang;
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch (e) {}

    const t = PORTAL_TRANSLATIONS[lang];

    // Atualiza html lang
    document.documentElement.lang = lang === "pt" ? "pt-BR" : lang;

    // Atualiza botão do seletor
    const flagEl = document.getElementById("currentLangFlag");
    const codeEl = document.getElementById("currentLangCode");
    if (flagEl && t.flagSvg) flagEl.innerHTML = t.flagSvg;
    if (codeEl) codeEl.textContent = t.code;

    // Atualiza classe ativa no menu
    document.querySelectorAll(".lang-option").forEach((opt) => {
      const isActive = opt.getAttribute("data-lang") === lang;
      opt.classList.toggle("is-active", isActive);
      opt.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    // Atualiza elementos com [data-i18n]
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (t[key] !== undefined) {
        el.textContent = t[key];
      }
    });

    // Atualiza elementos com [data-i18n-html]
    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const key = el.getAttribute("data-i18n-html");
      if (t[key] !== undefined) {
        el.innerHTML = t[key];
      }
    });

    // Atualiza placeholders com [data-i18n-placeholder]
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (t[key] !== undefined) {
        el.placeholder = t[key];
      }
    });

    // Re-injeta dados dinâmicos do parceiro se logado
    try {
      const cur = getCurrentUser();
      if (cur) {
        document.querySelectorAll("[data-partner-agency]").forEach((el) => {
          el.textContent = cur.name;
        });
        document.querySelectorAll("[data-partner-commission]").forEach((el) => {
          el.textContent = `${cur.commissionRate || 12}%`;
        });
      }
    } catch (e) {}
  }

  function initPortalLanguageSelector() {
    const dropdown = document.getElementById("langSelector");
    const btn = document.getElementById("langBtn");
    if (!dropdown || !btn) return;

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.contains("is-open");
      dropdown.classList.toggle("is-open", !isOpen);
      btn.setAttribute("aria-expanded", !isOpen ? "true" : "false");
    });

    document.querySelectorAll(".lang-option").forEach((opt) => {
      opt.addEventListener("click", (e) => {
        e.stopPropagation();
        const selectedLang = opt.getAttribute("data-lang");
        applyPortalLanguage(selectedLang);
        dropdown.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
        showPortalToast(
          selectedLang === "en" ? "✦ Language switched to English" : (selectedLang === "es" ? "✦ Idioma cambiado a Español" : "✦ Idioma alterado para Português")
        );
      });
    });

    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
      }
    });

    // Aplica idioma salvo ou padrão
    const saved = getSavedPortalLang();
    applyPortalLanguage(saved);
  }

  /* ==========================================================================
     2. INICIALIZAÇÃO DO BANCO DE DADOS (LOCALSTORAGE & CLOUD)
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
     3. AUTENTICAÇÃO E SESSÃO
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
      const msg = currentPortalLang === "en" 
        ? "Incorrect email or password. Please check your credentials."
        : (currentPortalLang === "es" ? "Correo o contraseña incorrectos. Verifique sus credenciales." : "E-mail ou senha incorretos. Verifique suas credenciais.");
      return { success: false, message: msg };
    }

    if (user.status === "suspended") {
      const msg = currentPortalLang === "en"
        ? "Account temporarily suspended. Please contact Swiss Horizon support."
        : (currentPortalLang === "es" ? "Cuenta suspendida temporalmente. Póngase en contacto con Swiss Horizon." : "Acesso temporariamente suspenso. Entre em contato com a gestão Swiss Horizon.");
      return { success: false, message: msg };
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
     4. FEEDBACK TOAST DO PORTAL
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
     5. MÓDULO PÚBLICO: ADICIONAR LEAD DE CREDENCIAMENTO
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

    // Se Firestore estiver conectado em nuvem, envia para a coleção
    if (firestoreDB) {
      firestoreDB.collection("swiss_pending_leads").add(newLead).catch((err) => console.warn("Erro ao salvar lead na nuvem:", err));
    }

    return newLead;
  };

  /* ==========================================================================
     6. TELA DE LOGIN (portal-login.html)
     ========================================================================== */
  function initLoginPage() {
    const loginForm = document.getElementById("portalLoginForm");
    if (!loginForm) return;

    // Seletor de Idiomas
    initPortalLanguageSelector();

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
        showPortalToast(`Bem-vindo, ${result.user.name}!`);
        setTimeout(() => {
          if (result.user.role === "admin") {
            window.location.href = "portal-admin.html";
          } else {
            window.location.href = "portal-parceiro.html";
          }
        }, 500);
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

        const noticeText = currentPortalLang === "en" 
          ? "Request submitted to Swiss Horizon HR successfully!"
          : (currentPortalLang === "es" ? "¡Solicitud enviada a RRHH de Swiss Horizon con éxito!" : "Solicitação enviada ao RH da Swiss Horizon com sucesso!");
        showPortalToast(noticeText);
        quickRegisterForm.reset();

        const successNotice = document.getElementById("registerSuccessNotice");
        if (successNotice) {
          successNotice.style.display = "block";
        }
      });
    }
  }

  /* ==========================================================================
     7. PORTAL DO PARCEIRO (portal-parceiro.html)
     ========================================================================== */
  function initPartnerPage() {
    const user = requireAuth("partner");
    if (!user) return;

    // Seletor de Idiomas
    initPortalLanguageSelector();

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
        showPortalToast(
          currentPortalLang === "en" ? "Official A4 Brochure download started!" : (currentPortalLang === "es" ? "¡Descarga del folleto oficial A4 iniciada!" : "Download do Folder Oficial A4 iniciado!")
        );
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

      let proposalText = "";
      if (currentPortalLang === "en") {
        proposalText =
`🇨🇭 *EXCLUSIVE SWITZERLAND 2027 PROPOSAL — SWISS HORIZON*
--------------------------------------------------
Accredited Partner Agency: ${partnerUser.name}
Consultant: ${partnerUser.contact}
Client: ${clientName}
--------------------------------------------------
• Itinerary: ${routeText}
• Departure Window: ${windowSelect}
• Travelers: ${pax} passenger(s)
• Main Inclusions: 1st Class Panoramic Trains (Swiss Travel Pass), 4/5-Star Boutique Hotels, and Alpine Tour Leaders.
• Payment: Up to 12 interest-free installments or special lump-sum conditions.
--------------------------------------------------
Experience Swiss precision. Contact ${partnerUser.name} to confirm your booking!`;
      } else if (currentPortalLang === "es") {
        proposalText =
`🇨🇭 *PROPUESTA EXCLUSIVA SUIZA 2027 — SWISS HORIZON*
--------------------------------------------------
Agencia Socia Acreditada: ${partnerUser.name}
Consultor Responsable: ${partnerUser.contact}
Cliente: ${clientName}
--------------------------------------------------
• Itinerario: ${routeText}
• Ventana de Salida: ${windowSelect}
• Viajeros: ${pax} pasajero(s)
• Inclusiones: Trenes Panorámicos 1ª Clase (Swiss Travel Pass), Hoteles Boutique 4/5 estrellas y Guías Alpinos.
• Condiciones: Hasta 12 cuotas sin interés o condiciones especiales al contado.
--------------------------------------------------
Viaje con precisión suiza. ¡Contacte a ${partnerUser.name} para confirmar su reserva!`;
      } else {
        proposalText =
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
      }

      document.getElementById("proposalTextOutput").value = proposalText;
      propOutputBox.style.display = "block";
      propOutputBox.scrollIntoView({ behavior: "smooth" });
      showPortalToast(
        currentPortalLang === "en" ? "Proposal generated successfully!" : (currentPortalLang === "es" ? "¡Propuesta generada con éxito!" : "Proposta personalizada gerada com sucesso!")
      );
    });

    const btnCopyProp = document.getElementById("btnCopyProposal");
    if (btnCopyProp) {
      btnCopyProp.addEventListener("click", () => {
        const text = document.getElementById("proposalTextOutput").value;
        navigator.clipboard.writeText(text).then(() => {
          showPortalToast(
            currentPortalLang === "en" ? "Proposal copied to clipboard!" : (currentPortalLang === "es" ? "¡Propuesta copiada al portapapeles!" : "Proposta copiada para a área de transferência!")
          );
        });
      });
    }
  }

  /* ==========================================================================
     8. PAINEL ADMINISTRATIVO & RH (portal-admin.html)
     ========================================================================== */
  function initAdminPage() {
    const user = requireAuth("admin");
    if (!user) return;

    // Seletor de Idiomas
    initPortalLanguageSelector();

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

        // Se Firestore estiver habilitado, sincroniza
        if (firestoreDB) {
          firestoreDB.collection("swiss_users").doc(newPartner.id).set(newPartner).catch((err) => console.warn(err));
        }

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

  window.portalApproveLead = function (leadId) {
    const db = getDB();
    const lead = db.pendingLeads.find((l) => l.id === leadId);
    if (!lead) return;

    const selectComm = document.getElementById(`comm-${leadId}`);
    const commission = selectComm ? parseInt(selectComm.value) : 12;
    const defaultPassword = "swiss" + Math.floor(1000 + Math.random() * 9000);

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

    if (firestoreDB) {
      firestoreDB.collection("swiss_users").doc(newPartner.id).set(newPartner).catch((err) => console.warn(err));
      firestoreDB.collection("swiss_pending_leads").doc(leadId).update({ status: "approved" }).catch((err) => console.warn(err));
    }

    showPortalToast(`Agência ${lead.agency} aprovada com sucesso pelo RH!`);
    renderAdminDashboard();

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
      if (firestoreDB) {
        firestoreDB.collection("swiss_pending_leads").doc(leadId).update({ status: "rejected" }).catch((err) => console.warn(err));
      }
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
     9. INICIALIZAÇÃO AUTOMÁTICA POR PÁGINA
     ========================================================================== */
  document.addEventListener("DOMContentLoaded", () => {
    initCloudDatabaseIfAvailable();

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
