/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Ticket from "../models/Ticket";
import { parseDateTimeFromText } from "./parseDateTimeFromText";
import { stripAgentFlowScriptTrainingMarkers } from "./stripAgentFlowScriptTrainingMarkers";

export const ATTENDANCE_FLOW_MEMORY_SCHEMA = 1;

export type AttendanceFlowPhase = "active" | "completed";

/** Ação de roteiro adiada até a resposta do cliente (ex.: agendamento após pergunta). */
export type DeferredScriptAction = {
  slug: string;
  actionId: number;
  /** Ex.: "agendamento" — independe do slug configurado na ação (/marcarHorario etc.) */
  kind?: string;
};

/**
 * Memória do roteiro visual por ticket (persistida em ticket.dataWebhook.attendanceFlow).
 * Campos legados: lastPresentedStep, lastHandledUserWid, promptId.
 */
export type AttendanceFlowMemory = {
  schemaVersion?: number;
  promptId: number;
  lastPresentedStep: number;
  lastHandledUserWid?: string;
  flowPhase?: AttendanceFlowPhase;
  awaitingUserReply?: boolean;
  completedSteps?: number[];
  /** stepNumber (string) -> última resposta do cliente naquela etapa */
  answersByStep?: Record<string, string>;
  /** stepNumber -> comandos já disparados na apresentação da etapa (ex. /transferirchamado) */
  executedScriptCommands?: Record<string, string[]>;
  /** Ações /comando que só podem rodar após resposta do cliente (ex. /agendamento sem data fixa na ação) */
  deferredScriptActions?: Record<string, DeferredScriptAction[]>;
  /**
   * Hooks já disparados pelo `HookTriggerBus` (PR 2 — fluxo agente IA senior revamp).
   * Chave: stepNumber (string). Valor: lista de `hookKey` no formato `${moment}:${slug|smartActionId}[:from:to]`.
   * Usado exclusivamente para dedup dos novos momentos (on_enter/on_exit/on_transition/on_correction/on_flow_complete).
   * **NÃO** afeta o dedup de `/comando` inline existente (que continua via `executedScriptCommands`).
   */
  firedHookKeys?: Record<string, string[]>;
  lastStepPresentedAt?: string;
  lastUserInboundAt?: string;
  lastPresentedTextPreview?: string;
};

const AGENDAR_SLUGS = new Set(["agendamento", "agendar", "marcarhorario", "marcar_horario"]);

export function findDeferredAgendamentoIndex(list: DeferredScriptAction[]): number {
  return list.findIndex((d) => {
    if (d.kind === "agendamento") return true;
    const sl = String(d.slug || "").toLowerCase();
    return AGENDAR_SLUGS.has(sl);
  });
}

/** Transferência adiada no roteiro (ex.: /transferirchamado após bloco EXEMPLO/RESPOSTA). */
export function findDeferredTransferIndex(list: DeferredScriptAction[]): number {
  return list.findIndex((d) => {
    const k = String(d.kind || "").toLowerCase();
    if (k === "transferir" || k === "transfer") return true;
    const sl = String(d.slug || "").toLowerCase();
    return (
      sl.includes("transferir") ||
      sl.includes("transfer") ||
      sl === "transferirchamado" ||
      sl === "transferiratendimento"
    );
  });
}

export function normalizeAttendanceFlowMemory(
  raw: unknown,
  promptId: number
): AttendanceFlowMemory {
  const o =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const pid = o.promptId != null ? Number(o.promptId) : promptId;
  return {
    schemaVersion: ATTENDANCE_FLOW_MEMORY_SCHEMA,
    promptId: Number.isFinite(pid) ? pid : promptId,
    lastPresentedStep: Number(o.lastPresentedStep) || 0,
    lastHandledUserWid: o.lastHandledUserWid != null ? String(o.lastHandledUserWid) : "",
    flowPhase: o.flowPhase === "completed" ? "completed" : "active",
    awaitingUserReply: o.awaitingUserReply === true,
    completedSteps: Array.isArray(o.completedSteps)
      ? [...new Set(o.completedSteps.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0))]
      : [],
    answersByStep:
      o.answersByStep && typeof o.answersByStep === "object" && !Array.isArray(o.answersByStep)
        ? { ...(o.answersByStep as Record<string, string>) }
        : {},
    executedScriptCommands:
      o.executedScriptCommands &&
      typeof o.executedScriptCommands === "object" &&
      !Array.isArray(o.executedScriptCommands)
        ? { ...(o.executedScriptCommands as Record<string, string[]>) }
        : {},
    deferredScriptActions:
      o.deferredScriptActions &&
      typeof o.deferredScriptActions === "object" &&
      !Array.isArray(o.deferredScriptActions)
        ? Object.fromEntries(
            Object.entries(o.deferredScriptActions as Record<string, unknown>).map(([k, v]) => {
              const arr = Array.isArray(v) ? v : [];
              const norm = arr
                .map((item) => {
                  if (item && typeof item === "object" && !Array.isArray(item)) {
                    const r = item as Record<string, unknown>;
                    const slug = String(r.slug || "").trim();
                    const actionId = Number(r.actionId);
                    if (!slug || !Number.isFinite(actionId)) return null;
                    const kindRaw = r.kind != null ? String(r.kind).trim() : "";
                    const out: DeferredScriptAction = { slug, actionId };
                    if (kindRaw) out.kind = kindRaw;
                    return out;
                  }
                  return null;
                })
                .filter(Boolean) as DeferredScriptAction[];
              return [k, norm];
            })
          )
        : {},
    firedHookKeys:
      o.firedHookKeys && typeof o.firedHookKeys === "object" && !Array.isArray(o.firedHookKeys)
        ? Object.fromEntries(
            Object.entries(o.firedHookKeys as Record<string, unknown>).map(([k, v]) => {
              const arr = Array.isArray(v) ? v : [];
              const norm = arr
                .map((item) => (typeof item === "string" ? item.trim() : ""))
                .filter((s) => s.length > 0);
              return [k, [...new Set(norm)]];
            })
          )
        : {},
    lastStepPresentedAt: o.lastStepPresentedAt != null ? String(o.lastStepPresentedAt) : undefined,
    lastUserInboundAt: o.lastUserInboundAt != null ? String(o.lastUserInboundAt) : undefined,
    lastPresentedTextPreview:
      o.lastPresentedTextPreview != null ? String(o.lastPresentedTextPreview).slice(0, 400) : undefined
  };
}

/**
 * Menu 1️⃣/2️⃣ ou lista numerada — o cliente deve escolher; para o motor de etapas equivale a “pergunta”
 * (roteiro v2 costuma vir com responseOptions vazio; sem isso a etapa não avança e a LLM improvisa a transferência).
 */
export function visibleStepContainsNumberedChoiceMenu(visible: string): boolean {
  const v = String(visible || "");
  if (!v.trim()) return false;
  /** Keycap emoji: dígito + U+FE0F opcional + U+20E3 */
  if (/[1-9]\uFE0F?\u20E3/.test(v)) return true;
  if (/[1-9]️⃣/.test(v)) return true;
  if (/\n\s*[1-9][\.\)]\s/.test(`\n${v}`)) return true;
  const low = v.toLowerCase();
  if (/\b(op(ç|c)(ã|a)o|opcao)\s*[1-9]\b/i.test(low)) return true;
  return false;
}

/**
 * Avanço automático linear (sem opções no passo) só deve ocorrer quando a etapa “pede” continuação:
 * texto **visível ao cliente** termina com pergunta ou com linha de /comando.
 * Importante: /comando após bloco RESPOSTA: no arquivo não deve “vencer” sobre uma Mensagem que termina em ? —
 * senão qualquer resposta avançaria ignorando a pergunta (ex.: etapa 1 com data + /agendamento diferido).
 */
export function customerVisibleStepEndsWithQuestionOrCommand(stepAgentPromptRaw: string): boolean {
  const raw = String(stepAgentPromptRaw || "").trim();
  const v = stripAgentFlowScriptTrainingMarkers(raw).trim();
  if (v && visibleStepContainsNumberedChoiceMenu(v)) return true;
  if (v) {
    const lines = v
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((line) => line.length > 0);
    if (lines.length) {
      const last = lines[lines.length - 1];
      if (/\?\s*$/.test(last)) return true;
      if (/\/[a-zA-Z][a-zA-Z0-9_-]*\s*$/.test(last)) return true;
    }
  }
  if (
    /^\s*\/[a-zA-Z][a-zA-Z0-9_-]+\s*$/m.test(raw) ||
    /\n\s*\/[a-zA-Z][a-zA-Z0-9_-]+\s*$/.test(raw)
  ) {
    return true;
  }
  return !v;
}

/** Resposta livre mínima para avançar passo sem opções configuradas. */
export function shouldAdvanceOnFreeReply(body: string): boolean {
  const t = String(body || "")
    .replace(/\u200e/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!t) return false;
  if (/^[\s.!?]+$/.test(t)) return false;
  return /[0-9a-zà-ÿ]/.test(t);
}

/**
 * Etapa de abertura/saudação (ex.: "Fala, tudo bem?") — resposta recíproca do cliente deve avançar o roteiro.
 */
export function isGreetingStyleStep(visibleCustomerText: string): boolean {
  const vis = stripAgentFlowScriptTrainingMarkers(String(visibleCustomerText || ""))
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (!vis.trim()) return false;
  if (/\b(data|viaj|agend|valor|pre[cç]o|quant|quando|per[ií]odo|reserv)\b/.test(vis)) {
    return false;
  }
  return (
    /\b(tudo bem|td bem|como vai|como est[aá]|bom dia|boa tarde|boa noite|e ai|e aí|tudo certo|ola|olá|oi|fala)\b/.test(
      vis
    )
  );
}

/**
 * Cliente devolve saudação curta à pergunta de abertura ("tudo bem", "oi tudo bem", "beleza").
 * Deve contar como resposta válida em etapas de greeting — não como ruído a ignorar.
 */
export function isReciprocalGreetingReply(body: string): boolean {
  const t = String(body || "")
    .replace(/\u200e/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!t) return false;
  return (
    /^(tudo bem|td bem|blz|beleza)\??$/.test(t) ||
    /^(oi|olá|ola)\b[\s,!?.]*(tudo\s*bem|td\s*bem|beleza|blz|como\s*vai)\b/.test(t) ||
    /^(bom dia|boa tarde|boa noite)\b/.test(t) ||
    /^(tudo certo|tudo joia|tudo ok)\??$/.test(t) ||
    /^(oi|olá|ola|opa|hey|salve|fala|e ai|e aí)([\s!?.🙂😊👋🙏])*$/.test(t) ||
    /^tudo[\s!?.]*$/.test(t)
  );
}

/**
 * Resposta curta aceitável em etapa de saudação ("Fala, tudo bem?" → "Oi", "Tudo", "beleza", etc.).
 */
export function isGreetingStepAcceptableReply(body: string): boolean {
  if (isReciprocalGreetingReply(body)) return true;
  if (isTrivialFlowInboundNoise(body)) return true;
  const t = String(body || "")
    .replace(/\u200e/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!t || t.length > 32) return false;
  return /^(simm*|ok|certo|claro|pode|isso|bele|show|top|legal)([\s!?.🙂😊👋🙏])*$/i.test(t);
}

/** Cumprimento curto ou ruído — não conta como resposta à pergunta do fluxo. */
export function isTrivialFlowInboundNoise(body: string): boolean {
  const t = String(body || "")
    .replace(/\u200e/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!t) return true;
  if (/^[\s.!?🙂😊👋🙏]+$/.test(t)) return true;
  if (
    /^(oi|olá|ola|opa|hey|e aí|e ai|salve|hello|hi)([\s!?.])*$/.test(t) &&
    t.length <= 28
  ) {
    return true;
  }
  if (/^(oi|olá|ola)\b[\s,!?.]*(tudo\s*bem|td\s*bem|beleza|blz|como\s*vai)\b/.test(t) && t.length <= 36) {
    return true;
  }
  if (/^(bom dia|boa tarde|boa noite)\b/.test(t) && t.length <= 32) return true;
  if (/^(tudo bem|td bem|blz|beleza)\??$/.test(t)) return true;
  if (/^(obrigad|valeu)\w*[\s!.]*$/.test(t) && t.length <= 24) return true;
  return false;
}

/** Cliente pede preço/orçamento — não deve avançar etapa que só coleta data/período. */
export function looksLikePricingOrOffTopicVersusDateQuestion(body: string): boolean {
  return /\b(valor|valores|preço|preco|custa|custam|orçamento|orcamento|quanto[s]?\s|cobr|diária|diaria|tabela|pacote|promo(ção|cao)?|desconto)\b/i.test(
    String(body || "")
  );
}

/** Remove cumprimento inicial para analisar o restante ("tudo bem, quanto custa?" → "quanto custa?"). */
export function stripLeadingGreeting(body: string): string {
  let t = String(body || "")
    .replace(/\u200e/g, "")
    .trim();
  if (!t) return t;
  const greetingPrefix =
    /^(oi|olá|ola|opa|hey|salve|fala|e\s*a[ií]|bom\s*dia|boa\s*tarde|boa\s*noite)[\s,!?.🙂😊👋🙏]*(tudo\s*bem|td\s*bem|beleza|blz|como\s*vai)?[\s,!?.🙂😊👋🙏]*/i;
  const stripped = t.replace(greetingPrefix, "").trim();
  if (stripped) return stripped;
  const tudoPrefix = /^(tudo\s*bem|td\s*bem|beleza|blz)[\s,!?.🙂😊👋🙏]+/i;
  const stripped2 = t.replace(tudoPrefix, "").trim();
  return stripped2 || t;
}

/** Detecta pergunta/FAQ do cliente (com ou sem `?`). */
export function looksLikeCustomerQuestion(body: string): boolean {
  const raw = String(body || "")
    .replace(/\u200e/g, "")
    .trim();
  if (!raw) return false;
  const core = stripLeadingGreeting(raw);
  if (/\?\s*$/.test(core)) return true;
  const t = core
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (
    /^(quanto|qual|quais|quando|onde|como|por\s*que|porque|pode\s*me|me\s*(fala|diz|explica)|tem\s|voces|vocês|vcs)\b/.test(
      t
    )
  ) {
    return true;
  }
  if (
    /\b(quanto\s*custa|quanto\s*fica|quanto\s*é|qual\s*(o\s*)?(valor|preco|preço|horario|horário)|voces\s+atendem|vocês\s+atendem|trabalham\s+(no|aos|a)|funciona\s+(no|aos|a)|aceita|parcela|formas?\s+de\s+pagamento)\b/.test(
      t
    )
  ) {
    return true;
  }
  return looksLikePricingOrOffTopicVersusDateQuestion(core);
}

/** Pergunta ou preço fora do contexto da etapa visível — interrupção humana. */
export function looksLikeCustomerInterruption(body: string): boolean {
  if (!String(body || "").trim()) return false;
  if (looksLikeCustomerQuestion(body)) return true;
  return looksLikePricingOrOffTopicVersusDateQuestion(body);
}

export type ScriptInboundTurnKind =
  | "greeting_reply"
  | "date_reply"
  | "quantity_reply"
  | "menu_choice"
  | "free_reply"
  | "interruption"
  | "mixed_interruption"
  | "noise"
  | "empty";

export type ScriptInboundTurnDecision = {
  shouldCannedAdvance: boolean;
  deferToLlm: boolean;
  kind: ScriptInboundTurnKind;
  reason: string;
};

/**
 * Classifica se a mensagem inbound deve avançar etapa canned ou ser delegada à LLM.
 */
export function classifyScriptInboundTurn(
  visibleCustomerText: string,
  body: string
): ScriptInboundTurnDecision {
  const visible = stripAgentFlowScriptTrainingMarkers(String(visibleCustomerText || ""));
  const raw = String(body || "")
    .replace(/\u200e/g, "")
    .trim();
  if (!raw) {
    return {
      shouldCannedAdvance: false,
      deferToLlm: false,
      kind: "empty",
      reason: "mensagem vazia"
    };
  }

  const stripped = stripLeadingGreeting(raw);
  const mixedGreetingAndQuestion =
    stripped !== raw && stripped.length >= 3 && looksLikeCustomerQuestion(stripped);
  if (mixedGreetingAndQuestion) {
    return {
      shouldCannedAdvance: false,
      deferToLlm: true,
      kind: "mixed_interruption",
      reason: "cumprimento + pergunta na mesma mensagem"
    };
  }

  if (isTrivialFlowInboundNoise(raw) && !isGreetingStyleStep(visible)) {
    return {
      shouldCannedAdvance: false,
      deferToLlm: false,
      kind: "noise",
      reason: "ruído trivial"
    };
  }

  if (looksLikeCustomerInterruption(raw)) {
    const visLow = visible.toLowerCase();
    const asksPrice =
      /\b(valor|preço|preco|quanto|custa)\b/i.test(visLow);
    if (!asksPrice || looksLikePricingOrOffTopicVersusDateQuestion(raw)) {
      return {
        shouldCannedAdvance: false,
        deferToLlm: true,
        kind: "interruption",
        reason: "pergunta ou assunto fora da etapa atual"
      };
    }
  }

  if (isGreetingStyleStep(visible)) {
    if (looksLikeCustomerQuestion(raw)) {
      return {
        shouldCannedAdvance: false,
        deferToLlm: true,
        kind: "interruption",
        reason: "pergunta na etapa de saudação"
      };
    }
    if (isGreetingStepAcceptableReply(raw)) {
      return {
        shouldCannedAdvance: true,
        deferToLlm: false,
        kind: "greeting_reply",
        reason: "resposta recíproca à saudação"
      };
    }
    return {
      shouldCannedAdvance: false,
      deferToLlm: false,
      kind: "noise",
      reason: "saudação sem resposta aceitável"
    };
  }

  const visLow = visible.toLowerCase();
  const asksDateOrPeriod =
    /\b(data|viaj|período|periodo|quando|feriad|reserv|hosped|hósped|qual dia|em qual|pretende viajar)\b/i.test(
      visLow
    ) || (/\?\s*$/.test(visLow) && /\b(data|viajar|quando|per[ií]odo)\b/i.test(visLow));
  if (asksDateOrPeriod) {
    if (looksLikePricingOrOffTopicVersusDateQuestion(raw) || looksLikeCustomerQuestion(raw)) {
      return {
        shouldCannedAdvance: false,
        deferToLlm: true,
        kind: "interruption",
        reason: "pergunta de preço/FAQ em etapa de data"
      };
    }
    if (bodyLooksLikeDateOrPeriodReply(raw)) {
      return {
        shouldCannedAdvance: true,
        deferToLlm: false,
        kind: "date_reply",
        reason: "data ou período informado"
      };
    }
    return {
      shouldCannedAdvance: false,
      deferToLlm: looksLikeCustomerQuestion(raw),
      kind: looksLikeCustomerQuestion(raw) ? "interruption" : "noise",
      reason: looksLikeCustomerQuestion(raw)
        ? "pergunta em vez de data"
        : "resposta não parece data/período"
    };
  }

  const asksQuantity =
    /\b(quantas|quantos|quant|pessoas|hóspede|hospede|acompanh|acomoda|viajam)\b/i.test(visLow);
  if (asksQuantity) {
    if (looksLikeCustomerQuestion(raw) && !/\d/.test(raw)) {
      return {
        shouldCannedAdvance: false,
        deferToLlm: true,
        kind: "interruption",
        reason: "pergunta sem quantidade em etapa de hóspedes"
      };
    }
    if (plausibleFreeReplyAdvancesStep(visible, raw)) {
      return {
        shouldCannedAdvance: true,
        deferToLlm: false,
        kind: "quantity_reply",
        reason: "quantidade informada"
      };
    }
    return {
      shouldCannedAdvance: false,
      deferToLlm: looksLikeCustomerQuestion(raw),
      kind: looksLikeCustomerQuestion(raw) ? "interruption" : "noise",
      reason: "resposta não parece quantidade"
    };
  }

  const looksLikeMenuChoice =
    visibleStepContainsNumberedChoiceMenu(visible) ||
    /\b(op(ç|c)(ã|a)o|opcao)\s*[1-9]\b/i.test(visLow);
  if (looksLikeMenuChoice) {
    const b = raw.toLowerCase().trim();
    if (/^[1-9]\s*[\).]?$/.test(b) || /^(op(ç|c)(ã|a)o|opcao)\s*[1-9]\b/i.test(b)) {
      return {
        shouldCannedAdvance: true,
        deferToLlm: false,
        kind: "menu_choice",
        reason: "opção numérica do menu"
      };
    }
    if (looksLikeCustomerQuestion(raw)) {
      return {
        shouldCannedAdvance: false,
        deferToLlm: true,
        kind: "interruption",
        reason: "pergunta sobre opções do menu"
      };
    }
    if (plausibleFreeReplyAdvancesStep(visible, raw)) {
      return {
        shouldCannedAdvance: true,
        deferToLlm: false,
        kind: "menu_choice",
        reason: "escolha textual do menu"
      };
    }
    return {
      shouldCannedAdvance: false,
      deferToLlm: false,
      kind: "noise",
      reason: "menu sem escolha reconhecida"
    };
  }

  if (looksLikeCustomerQuestion(raw)) {
    return {
      shouldCannedAdvance: false,
      deferToLlm: true,
      kind: "interruption",
      reason: "pergunta do cliente"
    };
  }

  const canAdvance = plausibleFreeReplyAdvancesStep(visible, raw);
  return {
    shouldCannedAdvance: canAdvance,
    deferToLlm: false,
    kind: canAdvance ? "free_reply" : "noise",
    reason: canAdvance ? "resposta livre plausível" : "resposta não plausível para a etapa"
  };
}

/** Atalho para `classifyScriptInboundTurn(...).shouldCannedAdvance`. */
export function shouldCannedAdvanceOnFreeReply(visibleCustomerText: string, body: string): boolean {
  return classifyScriptInboundTurn(visibleCustomerText, body).shouldCannedAdvance;
}

/**
 * Mensagem parece tentar informar data/período (para ramo de agendamento), não cumprimento genérico.
 */
export function bodyLooksLikeDateOrPeriodReply(body: string): boolean {
  if (!shouldAdvanceOnFreeReply(body)) return false;
  if (isTrivialFlowInboundNoise(body)) return false;
  if (looksLikePricingOrOffTopicVersusDateQuestion(body)) return false;
  if (parseDateTimeFromText(body).matched) return true;
  if (looksLikePeriodWithoutExactDate(body) != null) return true;
  const b = String(body || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (/\b\d{1,2}\s*[aà]\s*\d{1,2}\s+de\b/.test(b)) return true;
  if (/\b(final|início|inicio|começo|comeco|meio|metade)\s+de\s+\w+/i.test(body)) return true;
  if (/\b(próximo|proximo|nesse|neste)\s+feriad/i.test(body)) return true;
  if (
    /janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro/i.test(
      body
    )
  ) {
    return true;
  }
  if (/\b\d{1,2}\/\d{1,2}\b/.test(b)) return true;
  if (/\b(semana|feriad|fds|final de semana)\b/i.test(b)) return true;
  return false;
}

export type PeriodHint =
  | "next_week"
  | "next_month"
  | "weekend"
  | "any_day"
  | "morning"
  | "afternoon"
  | "evening"
  | "after_lunch"
  | "holiday";

/**
 * Detecta expressões frequentes de período que NÃO casam com `parseDateTimeFromText`
 * mas indicam intenção de agendar (ex.: "semana que vem", "qualquer dia").
 * Usado pelo PR 11 para não devolver fallback genérico e manter o `deferredScriptActions`.
 */
export function looksLikePeriodWithoutExactDate(body: string): PeriodHint | null {
  const b = String(body || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
  if (!b) return null;
  if (/\b(semana\s+que\s+vem|proxima\s+semana|na\s+proxima\s+semana)\b/.test(b)) return "next_week";
  if (/\b(mes\s+que\s+vem|proximo\s+mes|no\s+proximo\s+mes)\b/.test(b)) return "next_month";
  if (/\b(final\s+de\s+semana|fds|sabado|domingo|fim\s+de\s+semana)\b/.test(b)) return "weekend";
  if (/\b(qualquer\s+dia|qq\s+dia|tanto\s+faz|qualquer\s+hora|qq\s+hora)\b/.test(b)) return "any_day";
  if (/\b(de\s+manha|pela\s+manha|manhazinha|cedinho|cedo)\b/.test(b)) return "morning";
  if (/\b(a\s+tarde|de\s+tarde|tardezinha)\b/.test(b)) return "afternoon";
  if (/\b(a\s+noite|de\s+noite|noitinha|fim\s+da\s+tarde|fim\s+do\s+dia)\b/.test(b)) return "evening";
  if (/\b(depois\s+do\s+almoco|apos\s+o\s+almoco)\b/.test(b)) return "after_lunch";
  if (/\b(feriad[oa]?|proximo\s+feriado|emendar\s+feriado)\b/.test(b)) return "holiday";
  return null;
}

/**
 * Só avança etapa por resposta livre se o texto do cliente for plausível para a pergunta visível do passo.
 */
export function plausibleFreeReplyAdvancesStep(visibleCustomerText: string, body: string): boolean {
  if (!shouldAdvanceOnFreeReply(body)) return false;
  if (isTrivialFlowInboundNoise(body)) return false;
  if (looksLikeCustomerQuestion(body)) return false;

  const vis = String(visibleCustomerText || "").toLowerCase();
  const b = String(body || "").toLowerCase();

  const asksDateOrPeriod =
    /\b(data|viaj|período|periodo|quando|feriad|reserv|hosped|hósped|hosped|ficar|datas|qual dia|em qual|pensando em viajar|período desejado|pretende viajar)\b/i.test(
      vis
    ) || (/\?\s*$/.test(vis) && /\b(data|viajar|quando|viajem|per[ií]odo)\b/i.test(vis));

  if (asksDateOrPeriod) {
    if (looksLikePricingOrOffTopicVersusDateQuestion(body)) return false;
    return bodyLooksLikeDateOrPeriodReply(body);
  }

  const asksQuantity =
    /\b(quantas|quantos|quant|pessoas|hóspede|hospede|acompanh|acomoda|viajam)\b/i.test(vis);
  if (asksQuantity) {
    if (/\d/.test(body)) return true;
    if (
      /\b(casal|adulto|adultos|criança|criancas|bebê|bebe|pessoa|pessoas|gente|eu e |nós|nos|família|familia|só eu|so eu|duas|dois|três|tres|quatro|cinco|seis|sete|oito)\b/i.test(
        b
      )
    ) {
      return true;
    }
    return false;
  }

  const looksLikeMenuChoice =
    /[1-9]\uFE0F?\u20E3/.test(visibleCustomerText) ||
    /[1-9]️⃣/.test(visibleCustomerText) ||
    /\n\s*[1-9][\.\)]\s/.test(`\n${visibleCustomerText}`) ||
    /\b(op(ç|c)(ã|a)o|opcao)\s*[1-9]\b/i.test(vis);
  if (looksLikeMenuChoice) {
    if (/^[1-9]\s*[\).]?$/.test(b.trim())) return true;
    if (/^(op(ç|c)(ã|a)o|opcao)\s*[1-9]\b/i.test(b)) return true;
    if (
      /\b(beira|mar|piscina|privacidade|tranquil|social|reservad|descans|independ|1|2|3)\b/i.test(b) &&
      b.length <= 120
    ) {
      return true;
    }
    return false;
  }

  if (
    !/\b(valor|preço|preco|quanto|custa)\b/i.test(vis) &&
    looksLikePricingOrOffTopicVersusDateQuestion(body)
  ) {
    return false;
  }

  return true;
}

/**
 * Bloco injetado no system prompt quando há roteiro ativo ou recentemente concluído no mesmo agente.
 */
export function buildAttendanceFlowLlmAnchor(ticket: Ticket, promptId: number): string {
  try {
    const dw = ticket.getDataValue("dataWebhook") as unknown;
    const raw =
      dw && typeof dw === "object" && !Array.isArray(dw)
        ? (dw as Record<string, unknown>).attendanceFlow
        : null;
    const af = normalizeAttendanceFlowMemory(raw, promptId);
    if (Number(af.promptId) !== Number(promptId)) {
      return "";
    }
    const step = af.lastPresentedStep || 0;
    const done = (af.completedSteps || []).length
      ? af.completedSteps!.sort((a, b) => a - b).join(", ")
      : "(nenhuma ainda)";
    const preview = (af.lastPresentedTextPreview || "").trim() || "(sem prévia)";
    const phase =
      af.flowPhase === "completed"
        ? "O roteiro visual deste agente foi concluído neste ticket. Continue em modo consultivo sem repetir saudação inicial nem etapas já cobertas."
        : "Roteiro visual em andamento neste ticket.";
    const answers = af.answersByStep || {};
    const ansBrief = Object.keys(answers).length
      ? Object.entries(answers)
          .map(([k, v]) => `etapa ${k}: "${String(v).slice(0, 120)}"`)
          .join("; ")
      : "(ainda sem respostas registradas no fluxo)";

    const waiting =
      af.awaitingUserReply === true
        ? "SIM — o roteiro nesta etapa já apresentou ao cliente uma pergunta ou pedido de informação; a próxima mensagem **dele** deve ser interpretada como resposta a isso (quando fizer sentido no histórico)."
        : "NÃO — o fluxo não está, neste momento, com uma pergunta “pendente” registrada pelo sistema; ainda assim use o histórico: se **você** (agente) fez uma pergunta na última mensagem e o cliente ainda não respondeu de fato, não avance o roteiro nem assuma resposta.";

    const qaBlock =
      af.awaitingUserReply === true
        ? `
Sequência pergunta → resposta (obrigatória quando "Aguardando resposta" = SIM):
1) No histórico, identifique a **última pergunta ou pedido objetivo** feito pelo atendente (pode estar no preview acima ou nas mensagens anteriores).
2) A **mensagem atual do cliente** é a resposta a essa pergunta? Se sim (incluindo respostas curtas como datas, números, "sim/não", "pode ser"): reconheça isso, responda **só com o que o roteiro prevê imediatamente depois dessa resposta** — **um passo lógico** (ex.: confirmação breve + **uma** pergunta ou **um** bloco), sem antecipar o texto de etapas posteriores na mesma mensagem.
3) Se a mensagem atual **não** responde à pergunta em aberto (outro assunto, cumprimento genérico repetido, evasão): não invente que o cliente respondeu; reconduza com **uma** pergunta ou lembrete curto alinhado ao roteiro.
4) Nunca diga que vai "verificar", "anotar" ou "seguir" como se o cliente já tivesse informado algo que ele **ainda não informou** nesta conversa.`
        : `
Se a última mensagem **sua** no histórico termina com pergunta (?) e o cliente **ainda não** enviou conteúdo que a responda, sua próxima resposta deve insistir de forma natural **nessa** pergunta (ou reformulá-la), sem pular para o próximo bloco do roteiro.`;

    return `
--- Estado do roteiro (obrigatório) ---
${phase}
Etapa atual salva: ${step}.
Etapas já concluídas no fluxo: ${done}.
Aguardando resposta do cliente (marcação do fluxo): ${waiting}
Trecho da última mensagem enviada pelo roteiro: ${preview}
Respostas do cliente já vinculadas a etapas: ${ansBrief}
${qaBlock.trim()}

Interpretação inteligente (use o roteiro completo no system prompt + este estado):
${step >= 1 ? "- **Anti-repetição:** A etapa 1 (saudação inicial) já foi entregue neste ticket se o histórico mostra mensagens do agente após a abertura. **Não** reinicie o onboarding nem repita o mesmo bloco de boas-vindas; continue a partir da etapa atual e das respostas já registradas.\n" : ""}- Situe-se: a "Etapa atual salva" e as etapas concluídas indicam até onde o fluxo automático já avançou; o histórico da conversa mostra a última pergunta ou afirmação relevante do atendente.
- Etapas pelo significado: deduza em qual parte do roteiro você está comparando (1) o que já foi dito no histórico, (2) o que o cliente já respondeu, (3) o texto das seções do roteiro (saudação, qualificação, valores, transferência, etc.) — não use formatação do arquivo (espaços, parágrafos) como gatilho de etapa; use o sentido da conversa.
- Uma jogada por mensagem: cada resposta sua deve cobrir só a etapa lógica atual (o próximo passo útil). Não empilhe na mesma mensagem trechos que no roteiro seriam “depois” (ex.: após dizer que vai transferir, não envie café da manhã, localização ou preços na mesma resposta).
- Próxima mensagem a enviar: deduza o que falta dizer ou perguntar conforme o roteiro e o que o cliente acabou de enviar — uma resposta curta costuma responder à última pergunta em aberto; não reinicie etapas já concluídas nem repita o que já está em "Respostas do cliente já vinculadas".
- Rótulos e exemplos no roteiro (EXEMPLO DE RESPOSTA, RESPOSTA:, # ETAPA, aspas de exemplo) são guia interno — nunca os envie ao cliente nem atribua ao cliente o texto de exemplo. "EXEMPLO DE RESPOSTA" mostra formato possível, não exige que o cliente replique a frase; datas e respostas equivalentes contam.
- Condições e ramificações: se o cliente demonstrar intenção alinhada a um trecho posterior do roteiro, avance de forma natural sem pular passos essenciais definidos nas regras gerais.
- Ordens e listas numeradas (1. 2. 3. ou "primeiro / depois / em seguida"): tratá-las como sequência lógica — na mensagem atual, execute só o próximo passo que a conversa ainda não cumpriu; não empilhe passos futuros na mesma resposta.
- Condições em linguagem natural ("se o cliente disser…", "quando mencionar…", "caso prefira X"): interprete como gatilhos sem sintaxe IF/ELSE; escolha o ramo cujo significado melhor casa com o texto do cliente (sinônimos, abreviações e respostas curtas equivalentes contam).
- Gatilhos por palavra-chave ou frase entre aspas no roteiro: servem para reconhecer intenção — não exija que o cliente repita a frase literal.
- Ramos negativos ou objeção ("se não tiver interesse", "se recusar"): quando o encaixe for claro, siga o bloco de tratamento correspondente em vez de insistir no caminho positivo.
- Marcação textual de etapas no script (--- ou # ETAPA / # PASSO / # próxima etapa / # 1. Título, etc.) não aparece para o cliente. Condições no texto podem ser exemplos de fala do lead, sim/não ou cenários — interprete o significado, sem exigir IF/ELSE formal. Linhas em branco não mudam etapa no sistema.

Prioridade: (1) dados já registrados nas respostas por etapa; (2) continuidade a partir da etapa atual e do preview acima; (3) alinhamento com regras gerais se houver conflito com um trecho literal do roteiro. Responda como atendente, sem aspas envolvendo a mensagem inteira.

INTERRUPÇÃO (pergunta do cliente no meio do roteiro):
- Se a mensagem atual for PERGUNTA, FAQ, preço, horário ou assunto lateral: RESPONDA PRIMEIRO com Regras gerais + FAQ + Base de conhecimento (file_search se necessário). Depois retome a etapa pendente com UMA pergunta curta — não avance etapa canned sem responder o que ele perguntou.
- Não ignore interrupções para empurrar o próximo bloco do roteiro.
--- Fim estado do roteiro ---
`.trim();
  } catch {
    return "";
  }
}
