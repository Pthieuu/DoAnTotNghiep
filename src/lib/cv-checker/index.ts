import "server-only";
import { CvCheckerReport, TargetCompanyContext } from "./types";
import { parseCvFile } from "./parsers/cv-file-parser";
import { runRuleEngine } from "./rule-engine";
import { runLlmAnalyzers } from "./llm-analyzers";
import { buildCvReport } from "./report/score-calculator";

export * from "./types";

export async function analyzeCv(
  fileBuffer: Buffer,
  fileName: string,
  context: TargetCompanyContext = {}
): Promise<CvCheckerReport> {
  // 1. Ingest & extract text into standard sections
  const parsed = await parseCvFile(fileBuffer, fileName);

  // 2. Run deterministic rule engine
  const ruleIssues = runRuleEngine(parsed, context);

  // 3. Run LLM content analyzers for deep qualitative feedback
  const llmResults = await runLlmAnalyzers(parsed, context);

  // 4. Synthesize final report with rubric scoring and checklist
  const report = buildCvReport(parsed, ruleIssues, llmResults, context);
  report.metadata.fileSizeBytes = fileBuffer.byteLength;

  return report;
}

