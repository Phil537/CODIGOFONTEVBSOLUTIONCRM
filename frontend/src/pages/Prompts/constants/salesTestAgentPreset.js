/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { AGENT_SCRIPT_PERFECT_TEMPLATE_BODY } from "../agentScriptPerfectTemplate";
import { applySalesCampaignPreset } from "./salesCampaignPreset";

/**
 * Agente de Vendas básico para testes em tickets.
 * Todas as abas do editor (Integração, Regras, Roteiro, Ações, FAQ, Conhecimento).
 */
export const SALES_TEST_AGENT_NAME = "Agente Vendas — Teste";

export function buildSalesTestAgentV2() {
  return {
    schemaVersion: 2,
    integration: {
      model: "gpt-5.5",
      responderGrupo: false,
      queueId: null,
      maxMessages: 10,
      maxTokens: 2200,
      temperature: 0.8,
      voice: "texto",
      voiceKey: "",
      voiceRegion: ""
    },
    agent: {
      name: SALES_TEST_AGENT_NAME,
      description:
        "Assistente comercial básico para qualificar leads, responder dúvidas e conduzir para demonstração.",
      role: "Consultor de vendas",
      objective: "Qualificar interesse, tirar dúvidas comerciais e convidar para uma demo.",
      language: "pt-BR",
      emojisEnabled: true,
      responseDelay: 0,
      formality: "profissional e amigável",
      writingStyle: "claro, consultivo, mensagens curtas",
      businessHours: "Seg–Sex 9h–18h",
      agentColor: "#2563EB",
      messages: {
        initial:
          "Olá! Sou o assistente comercial. Como posso ajudar hoje — quer conhecer o CRM, tirar dúvidas ou agendar uma demonstração?",
        fallback:
          "Desculpe, não entendi bem. Pode reformular ou me dizer se quer saber sobre funcionalidades, preços ou agendar uma demo?",
        afterHours:
          "Estamos fora do horário comercial. Deixe sua mensagem que retornamos em breve.",
        transferHuman:
          "Vou transferir você para um consultor humano que continuará o atendimento."
      }
    },
    generalRules: `Você é consultor de vendas do CRM.

COMPORTAMENTO
- Mensagens curtas (2 a 4 frases).
- Tom profissional, empático e sem pressão agressiva.
- Use emojis com moderação.

LIMITES
- Não invente preços ou descontos.
- Não prometa funcionalidades fora da base de conhecimento.
- Antes de falar em valores, entenda volume de atendimentos, canais usados e principal dor.
- Se o cliente pedir humano, acione transferência.

PRIORIDADE COMERCIAL
1. Entender necessidade
2. Apresentar valor alinhado
3. Convidar para demo ou material
4. Agendar reunião`,
    attendance: {
      script: AGENT_SCRIPT_PERFECT_TEMPLATE_BODY,
      settings: {
        objective: "Conduzir lead até agendamento de demonstração",
        serviceType: "consultivo",
        mandatoryFlow: false,
        allowInterrupt: true,
        maxResponseTimeSec: 120,
        maxAttempts: 5,
        smartFallback: true,
        canImprovise: true,
        canTransferHuman: true
      }
    },
    faq: [
      {
        question: "Quanto custa?",
        answer:
          "O investimento varia conforme volume de atendentes e módulos. Posso entender melhor seu cenário e encaminhar uma proposta, ou agendar uma demo para ver o sistema na prática.",
        category: "Comercial",
        priority: 10
      },
      {
        question: "Tem teste grátis ou demonstração?",
        answer:
          "Sim, oferecemos demonstração guiada. Posso agendar uma call de 15 minutos para mostrar o CRM e o agente IA em ação.",
        category: "Comercial",
        priority: 8
      },
      {
        question: "Integra com WhatsApp?",
        answer:
          "Sim. O CRM integra atendimento WhatsApp, tickets, filas, agente IA e automações em um só lugar.",
        category: "Produto",
        priority: 9
      }
    ],
    faqEnabled: true,
    knowledge: {
      enabled: true,
      manualText: `VB Solution CRM — visão geral comercial

- CRM com atendimento omnichannel (WhatsApp, tickets, filas)
- Agente IA configurável com regras, roteiro, FAQ e base de conhecimento
- Automações: agendamento, transferência, criação de lead
- Público: PMEs e equipes comerciais que precisam centralizar atendimento e vendas

Não divulgar valores fixos sem proposta formal.`,
      fileListId: null,
      websites: [],
      sources: [
        {
          sourceType: "document",
          title: "Pitch comercial resumido",
          content:
            "VB Solution unifica CRM, atendimento e IA. Diferenciais: roteiro de vendas com agente, automações inteligentes e histórico centralizado.",
          metadata: { kind: "sales_brief" }
        }
      ]
    },
    knowledgeEnabled: true,
    smartActions: [
      {
        name: "Agendamento",
        slug: "agendamento",
        type: "agendamento",
        description: "Agenda reunião ou demonstração com o lead.",
        enabled: true,
        autoExecute: false,
        confirm: false,
        responseMessage:
          "Perfeito! Registrei seu interesse no agendamento. Em instantes confirmo data e horário.",
        variables: {},
        agentTriggerPatterns: [
          "gostaria de agendar",
          "marcar uma demonstração",
          "qual o melhor horário",
          "vou registrar seu horário"
        ],
        userTriggerPatterns: [
          "quero agendar",
          "pode ser quinta",
          "amanhã à tarde",
          "marcar horário"
        ],
        intentSlotSchema: [
          { name: "date", type: "datetime", required: true, label: "Data e horário" }
        ]
      },
      {
        name: "Transferir chamado",
        slug: "transferirchamado",
        type: "transferir",
        description: "Transfere para atendente humano.",
        enabled: true,
        autoExecute: true,
        responseMessage:
          "Você foi transferido para um atendente humano. Em instantes alguém da equipe continuará o atendimento.",
        variables: {
          queueId: null,
          userId: null
        },
        agentTriggerPatterns: ["vou te transferir", "passar para um atendente"],
        userTriggerPatterns: [
          "quero falar com humano",
          "atendente",
          "pessoa real",
          "falar com alguém"
        ]
      },
      {
        name: "Criar lead",
        slug: "criarlead",
        type: "criar_lead",
        description: "Registra lead no CRM com dados do cliente.",
        enabled: true,
        autoExecute: false,
        responseMessage: "Cadastro registrado! Nossa equipe dará continuidade em breve.",
        variables: {},
        agentTriggerPatterns: [
          "me passe seu nome",
          "vou registrar seu cadastro",
          "qual seu melhor e-mail"
        ],
        userTriggerPatterns: [
          "tenho interesse",
          "quero conhecer",
          "meu nome",
          "meu telefone",
          "gmail.com"
        ],
        intentSlotSchema: [
          { name: "name", type: "string", required: true, label: "Nome" },
          { name: "phone", type: "string", required: true, label: "Telefone" },
          { name: "email", type: "string", required: false, label: "E-mail" }
        ]
      }
    ],
    mediaLibrary: [],
    proactive: applySalesCampaignPreset({}),
    transferChamado: {
      queueId: null,
      userId: null,
      queueIntegrationId: null
    }
  };
}

/** Formato aceito por mergeImportedAgentJson (exportação / importação). */
export function buildSalesTestAgentExport() {
  return {
    schemaVersion: 2,
    v2: buildSalesTestAgentV2()
  };
}
