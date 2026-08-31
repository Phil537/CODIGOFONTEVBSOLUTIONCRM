/**
 * Smoke test: interrupções no roteiro não devem avançar etapa canned.
 * Uso: node scripts/verify-script-interruptions.mjs
 */
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

require("ts-node/register/transpile-only");

const {
  classifyScriptInboundTurn,
  shouldCannedAdvanceOnFreeReply
} = require(path.join(__dirname, "../src/helpers/agentAttendanceFlowMemory.ts"));
const { decideAttendanceFlowTurn } = require(
  path.join(__dirname, "../src/services/PromptServices/AttendanceFlowDecisionEngine.ts")
);
const { applyHeuristic } = require(
  path.join(__dirname, "../src/services/PromptServices/AttendanceFlowClassifierService.ts")
);

const DATE_VISIBLE = "Para qual data você quer agendar?";
const faqSamples = [
  "quanto custa?",
  "vocês atendem no domingo",
  "quero saber valores",
  "tudo bem, quanto custa?"
];

let failed = 0;

for (const q of faqSamples) {
  const d = classifyScriptInboundTurn(DATE_VISIBLE, q);
  if (d.shouldCannedAdvance || !d.deferToLlm) {
    console.error(`FAIL classify: "${q}" → advance=${d.shouldCannedAdvance} defer=${d.deferToLlm}`);
    failed += 1;
  }
  if (shouldCannedAdvanceOnFreeReply(DATE_VISIBLE, q)) {
    console.error(`FAIL shouldCannedAdvanceOnFreeReply: "${q}"`);
    failed += 1;
  }
}

const step = {
  stepId: "s2",
  stepNumber: 2,
  title: "Data",
  objective: "Coletar data",
  expectedReply: "date",
  slotName: "preferredDate",
  agentPrompt: DATE_VISIBLE,
  customerVisibleText: DATE_VISIBLE,
  branchesIR: [{ matcher: "always", value: "any", nextStepId: "s3", label: "linear" }],
  commandsIR: [],
  responseOptions: [],
  conditions: [],
  attachments: [],
  trainingMarkers: { examples: [], objections: [] },
  slotSchema: null
};

const classifier = applyHeuristic({
  userText: "quanto custa?",
  currentStep: step,
  understanding: null,
  answersByStep: {},
  conversationHistory: []
});

if (classifier.intent !== "off_topic") {
  console.error(`FAIL classifier intent: ${classifier.intent}`);
  failed += 1;
}

const decision = decideAttendanceFlowTurn({
  memory: { promptId: 1, lastPresentedStep: 2, awaitingUserReply: true, flowPhase: "active" },
  classifier,
  steps: [step],
  definition: { entryStepId: "s2", transitionHooks: [] },
  currentStepNumber: 2,
  userText: "quanto custa?"
});

if (decision.action !== "defer_to_llm" || decision.consumedReply !== false) {
  console.error(`FAIL decision: action=${decision.action} consumed=${decision.consumedReply}`);
  failed += 1;
}

if (classifyScriptInboundTurn(DATE_VISIBLE, "21/05").shouldCannedAdvance !== true) {
  console.error("FAIL valid date should advance");
  failed += 1;
}

if (failed > 0) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}

console.log("verify-script-interruptions: OK");
