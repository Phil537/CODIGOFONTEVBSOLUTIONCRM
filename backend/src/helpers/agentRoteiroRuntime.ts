/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { stripAgentFlowScriptTrainingMarkers } from "./stripAgentFlowScriptTrainingMarkers";

const MIN_USEFUL_ROTEIRO_CHARS = 20;

function parsePromptCargo(prompt: unknown): Record<string, unknown> {
  const p = prompt as Record<string, unknown> | null | undefined;
  if (!p) return {};
  let cargo = p.cargo;
  if (typeof cargo === "string") {
    try {
      cargo = JSON.parse(cargo);
    } catch {
      return {};
    }
  }
  return cargo && typeof cargo === "object" && !Array.isArray(cargo)
    ? (cargo as Record<string, unknown>)
    : {};
}

function usefulCharCount(text: string): number {
  return String(text || "")
    .replace(/\s+/g, "")
    .replace(/[#\-_/\\|]/g, "")
    .length;
}

function scriptHasUsefulContent(text: string): boolean {
  const raw = String(text || "").trim();
  if (!raw) return false;
  const visible = stripAgentFlowScriptTrainingMarkers(raw).trim();
  const candidate = visible || raw;
  return usefulCharCount(candidate) >= MIN_USEFUL_ROTEIRO_CHARS;
}

/** `cargo.sectionFlags.fluxoEnabled !== false` */
export function isAgentFluxoEnabled(prompt: unknown): boolean {
  const cargo = parsePromptCargo(prompt);
  const sectionFlags =
    cargo.sectionFlags && typeof cargo.sectionFlags === "object" && !Array.isArray(cargo.sectionFlags)
      ? (cargo.sectionFlags as Record<string, unknown>)
      : {};
  return sectionFlags.fluxoEnabled !== false;
}

/** Script/etapas/documento com conteúdo real (≥20 chars úteis). */
export function hasMeaningfulAgentRoteiroContent(prompt: unknown): boolean {
  const p = prompt as Record<string, unknown> | null | undefined;
  if (!p) return false;

  const steps = Array.isArray(p.attendanceFlowSteps) ? p.attendanceFlowSteps : [];
  for (const step of steps) {
    if (!step || typeof step !== "object") continue;
    const rawPrompt = String((step as Record<string, unknown>).agentPrompt || "");
    if (scriptHasUsefulContent(rawPrompt)) return true;
  }

  if (scriptHasUsefulContent(String(p.attendanceScript || ""))) return true;

  const blob = `${String(p.attendanceScript || "")}\n${String(p.prompt || "")}`;
  const hasStepMarkers =
    /(?:^|\r?\n)\s*#?\s*(?:ETAPA|PASSO)\s*\d+|#\s*ETAPA\b|#\s*PASSO\b|(^|\r?\n)\s*---\s*(\r?\n|$)/im.test(
      blob
    );
  if (hasStepMarkers && scriptHasUsefulContent(blob)) return true;

  return false;
}

/** Roteiro visual ativo: fluxo habilitado e conteúdo significativo. */
export function isAgentRoteiroRuntimeActive(prompt: unknown): boolean {
  return isAgentFluxoEnabled(prompt) && hasMeaningfulAgentRoteiroContent(prompt);
}

/** System prompt para modo consultivo (sem roteiro visual ativo). */
export const AGENT_CONSULTIVE_MODE_DIRECTIVE_PT = `
--- Modo consultivo (sem roteiro visual ativo) ---
Este agente opera SEM sequência fixa de etapas canned. Conduza a conversa de forma natural e consultiva.

Prioridade de resposta (nesta ordem):
1) Regras gerais do agente (tom, limites, prioridades comerciais)
2) FAQ cadastrado
3) Base de conhecimento / documentação (use file_search quando a resposta depender de material interno)
4) Ações inteligentes disponíveis (/slug) — só quando o contexto justificar
5) Histórico e memória consolidada do ticket

Regras:
- Não force sequência de etapas nem reinicie saudação de onboarding se o histórico já avançou.
- Responda diretamente o que o cliente perguntou ou pediu.
- Não invente "Estado do roteiro" nem simule avanço de passo visual.
- Se faltar informação em FAQ/base, seja honesto e ofereça encaminhar ao time humano quando fizer sentido.
- Uma mensagem = uma resposta útil; no máximo uma pergunta principal por turno.
--- Fim modo consultivo ---
`.trim();
