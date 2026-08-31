import {
  isAgentFluxoEnabled,
  hasMeaningfulAgentRoteiroContent,
  isAgentRoteiroRuntimeActive,
  AGENT_CONSULTIVE_MODE_DIRECTIVE_PT
} from "../helpers/agentRoteiroRuntime";

describe("agentRoteiroRuntime", () => {
  it("isAgentFluxoEnabled defaults true", () => {
    expect(isAgentFluxoEnabled({})).toBe(true);
    expect(isAgentFluxoEnabled({ cargo: { sectionFlags: {} } })).toBe(true);
  });

  it("isAgentFluxoEnabled false when fluxoEnabled=false", () => {
    expect(
      isAgentFluxoEnabled({ cargo: { sectionFlags: { fluxoEnabled: false } } })
    ).toBe(false);
  });

  it("hasMeaningfulAgentRoteiroContent rejects empty script", () => {
    expect(hasMeaningfulAgentRoteiroContent({ attendanceScript: "" })).toBe(false);
    expect(hasMeaningfulAgentRoteiroContent({ attendanceScript: "oi" })).toBe(false);
  });

  it("hasMeaningfulAgentRoteiroContent accepts substantive script", () => {
    expect(
      hasMeaningfulAgentRoteiroContent({
        attendanceScript: "Fala, tudo bem? Aqui é o atendimento da empresa."
      })
    ).toBe(true);
  });

  it("isAgentRoteiroRuntimeActive requires fluxo + conteúdo", () => {
    expect(
      isAgentRoteiroRuntimeActive({
        cargo: { sectionFlags: { fluxoEnabled: false } },
        attendanceScript: "Roteiro longo com conteúdo suficiente para passar no filtro."
      })
    ).toBe(false);
    expect(
      isAgentRoteiroRuntimeActive({
        attendanceScript: "Roteiro longo com conteúdo suficiente para passar no filtro."
      })
    ).toBe(true);
  });

  it("exports consultive directive", () => {
    expect(AGENT_CONSULTIVE_MODE_DIRECTIVE_PT).toContain("Modo consultivo");
    expect(AGENT_CONSULTIVE_MODE_DIRECTIVE_PT).toContain("FAQ");
  });
});
