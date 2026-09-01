/**
 * Identidade visual VB Solution CRM — tokens compartilhados.
 * Menu lateral, topbar, textos, chat, botões e tags.
 */

/** E-mails com acesso à UI de Identidade Visual independente do flag da empresa. */
export const VISUAL_IDENTITY_EMAIL_ALLOWLIST = [
  "contatopousadadogolfinho@gmail.com",
  "gestaovendas@gmail.com",
  "admin@local.dev",
];

/* ── Menu lateral ─────────────────────────────────────────────── */
/** Fundo: azul-marinho bem escuro */
export const SIDEBAR_BG = "#0B1B3B";
/** Ícones e textos inativos */
export const SIDEBAR_TEXT = "#FFFFFF";
export const SIDEBAR_ICON = "#FFFFFF";
/** Item selecionado: azul médio sobre fundo azul mais claro */
export const SIDEBAR_ACTIVE_BG = "rgba(59, 130, 246, 0.32)";
export const SIDEBAR_ACTIVE_ACCENT = "#3B82F6";
/** Texto e ícone do item ativo */
export const SIDEBAR_ACTIVE_TEXT = "#FFFFFF";
export const SIDEBAR_ACTIVE_ICON = "#FFFFFF";

/* ── Topbar ───────────────────────────────────────────────────── */
/** Fundo: igual ao menu lateral (azul-marinho) */
export const TOPBAR_BG_LIGHT = SIDEBAR_BG;
/** Fundo modo escuro: igual ao menu lateral escuro */
export const TOPBAR_BG_DARK = "#2D2D2D";
/** Barra de pesquisa em topbar escura */
export const TOPBAR_SEARCH_BG = "rgba(255, 255, 255, 0.12)";
export const TOPBAR_SEARCH_BORDER = "rgba(255, 255, 255, 0.1)";
/** Ícones em topbar escura */
export const TOPBAR_ICON = "#FFFFFF";
/** Status "Disponível" */
export const TOPBAR_STATUS_GREEN = "#22C55E";

/* ── Marca / links / destaques ────────────────────────────────── */
export const BRAND_BLUE = "#1D4ED8";
export const BRAND_BLUE_MEDIUM = "#2563EB";
export const BRAND_BLUE_DARK = "#1E3A8A";
export const LINK_COLOR = BRAND_BLUE_MEDIUM;

/* ── Textos ───────────────────────────────────────────────────── */
/** Títulos principais: cinza bem escuro / quase preto */
export const TEXT_PRIMARY = "#111827";
/** Textos secundários: cinza médio */
export const TEXT_SECONDARY = "#6B7280";

/* ── Chat ─────────────────────────────────────────────────────── */
/** Mensagem do cliente (bolha clara) */
export const CHAT_CLIENT_BUBBLE = "#FFFFFF";
export const CHAT_CLIENT_TEXT = "#374151";
/** Mensagem do atendente humano (bolha verde estilo WhatsApp) */
export const CHAT_HUMAN_BUBBLE = "#35cd96";
export const CHAT_HUMAN_TEXT = "#FFFFFF";
/** Mensagem do agente IA (bolha azul) */
export const CHAT_AGENT_BUBBLE = BRAND_BLUE_MEDIUM;
export const CHAT_AGENT_TEXT = "#FFFFFF";

/* ── Botões ───────────────────────────────────────────────────── */
/** Botão principal (Enviar) e FAB "+" */
export const BUTTON_PRIMARY = BRAND_BLUE_DARK;
export const BUTTON_PRIMARY_TEXT = "#FFFFFF";
/** Botões secundários / ícones: cinza ou azul suave */
export const BUTTON_SECONDARY = "#64748B";
export const BUTTON_SECONDARY_SOFT_BG = "#EFF6FF";
export const BUTTON_SECONDARY_SOFT_TEXT = BRAND_BLUE_MEDIUM;

/* ── Tags ─────────────────────────────────────────────────────── */
/** Tags ("Cliente", "Interesse - Planos"): azul claro + texto azul */
export const TAG_BG = "#DBEAFE";
export const TAG_TEXT = BRAND_BLUE_MEDIUM;
