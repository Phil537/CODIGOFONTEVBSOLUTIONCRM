import {
  classifyScriptInboundTurn,
  shouldCannedAdvanceOnFreeReply
} from "../helpers/agentAttendanceFlowMemory";
import { applyHeuristic } from "../services/PromptServices/AttendanceFlowClassifierService";
import { decideAttendanceFlowTurn } from "../services/PromptServices/AttendanceFlowDecisionEngine";
import type { CompiledStepIR } from "../helpers/compileAttendanceFlowIR";

const DATE_VISIBLE = "Me conta: para qual data você está pensando em viajar?";
const GREETING_VISIBLE = "Fala, tudo bem?";
const MENU_VISIBLE = "Qual opção combina mais?\n1️⃣ Beira-mar\n2️⃣ Piscina\n3️⃣ Privacidade";
const QTY_VISIBLE = "E quantas pessoas seriam na hospedagem?";

const FAQ_QUESTIONS = [
  "quanto custa?",
  "qual o valor da diária",
  "vocês atendem no domingo",
  "qual horário de funcionamento",
  "tem desconto para casal",
  "aceita cartão",
  "onde fica a pousada",
  "tem estacionamento",
  "vocês trabalham no feriado",
  "quero saber valores primeiro",
  "me fala o preço",
  "quanto fica o pacote",
  "tem café da manhã incluso"
];

describe("scriptInboundInterruptions — FAQ nunca avança canned", () => {
  it.each(FAQ_QUESTIONS)("data step + %s → deferToLlm", (q) => {
    const d = classifyScriptInboundTurn(DATE_VISIBLE, q);
    expect(d.shouldCannedAdvance).toBe(false);
    expect(d.deferToLlm).toBe(true);
    expect(shouldCannedAdvanceOnFreeReply(DATE_VISIBLE, q)).toBe(false);
  });
});

describe("scriptInboundInterruptions — respostas válidas avançam", () => {
  it("saudação recíproca avança", () => {
    const d = classifyScriptInboundTurn(GREETING_VISIBLE, "tudo bem");
    expect(d.shouldCannedAdvance).toBe(true);
    expect(d.deferToLlm).toBe(false);
  });

  it("data válida avança", () => {
    const d = classifyScriptInboundTurn(DATE_VISIBLE, "21/05");
    expect(d.shouldCannedAdvance).toBe(true);
  });

  it("menu dígito avança", () => {
    const d = classifyScriptInboundTurn(MENU_VISIBLE, "2");
    expect(d.shouldCannedAdvance).toBe(true);
  });

  it("quantidade avança", () => {
    const d = classifyScriptInboundTurn(QTY_VISIBLE, "4 pessoas");
    expect(d.shouldCannedAdvance).toBe(true);
  });

  it("mensagem mista cumprimento+preço deferToLlm", () => {
    const d = classifyScriptInboundTurn(GREETING_VISIBLE, "tudo bem, quanto custa?");
    expect(d.deferToLlm).toBe(true);
    expect(d.shouldCannedAdvance).toBe(false);
  });
});

function makeDateStep(): CompiledStepIR {
  return {
    stepId: "s2",
    stepNumber: 2,
    title: "Data",
    objective: "Coletar data",
    expectedReply: "date",
    slotName: "preferredDate",
    slotSchema: null,
    agentPrompt: DATE_VISIBLE,
    customerVisibleText: DATE_VISIBLE,
    trainingMarkers: { examples: [], objections: [] },
    branchesIR: [{ matcher: "always", value: "any", nextStepId: "s3", label: "linear" }],
    commandsIR: [],
    responseOptions: [],
    conditions: [],
    attachments: []
  } as CompiledStepIR;
}

describe("scriptInboundInterruptions — classifier + decision engine", () => {
  it("off_topic na etapa de data → defer_to_llm", () => {
    const step = makeDateStep();
    const classifier = applyHeuristic({
      userText: "quanto custa o plano?",
      currentStep: step,
      understanding: null,
      answersByStep: {},
      conversationHistory: []
    });
    expect(classifier.intent).toBe("off_topic");
    const decision = decideAttendanceFlowTurn({
      memory: {
        promptId: 1,
        lastPresentedStep: 2,
        awaitingUserReply: true,
        flowPhase: "active"
      },
      classifier,
      steps: [step],
      definition: { entryStepId: "s2", transitionHooks: [] } as any,
      currentStepNumber: 2,
      userText: "quanto custa o plano?"
    });
    expect(decision.action).toBe("defer_to_llm");
    expect(decision.consumedReply).toBe(false);
  });
});
