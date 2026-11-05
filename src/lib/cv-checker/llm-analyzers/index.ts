import "server-only";
import { CvIssue, CvParsedSections, TargetCompanyContext } from "../types";
import { getAiConfig } from "../../ai-config";
import { JIKO_PR_ANALYZER_PROMPT } from "./prompts/jiko-pr.prompt";
import { SHIBOU_DOUKI_ANALYZER_PROMPT } from "./prompts/shibou-douki.prompt";
import { WORK_EXPERIENCE_ANALYZER_PROMPT } from "./prompts/work-experience.prompt";

export interface LlmAnalysisResult {
  jikoPrResult?: {
    score: number;
    issues: CvIssue[];
    suggestedRewriteJa?: string;
  };
  shibouDoukiResult?: {
    score: number;
    issues: CvIssue[];
    suggestedRewriteJa?: string;
  };
  workExpResult?: {
    score: number;
    issues: CvIssue[];
    suggestedRewriteJa?: string;
  };
}

async function callAiJson<T>(systemPrompt: string, userPrompt: string): Promise<T | null> {
  const config = getAiConfig();
  const provider = config.provider;

  try {
    if (provider === "groq" && config.groqApiKey) {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        signal: AbortSignal.timeout(35000),
        headers: {
          Authorization: `Bearer ${config.groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.groqModel || "qwen/qwen3.8-27b",
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: `${systemPrompt}\n\nRespond with VALID JSON ONLY matching the requested structure.` },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!res.ok) {
        console.error("Groq error in CV Checker:", await res.text());
        return null;
      }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      return JSON.parse(content) as T;
    }

    if (provider === "gemini" && config.geminiApiKey) {
      const model = config.geminiModel || "gemini-2.5-flash";
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.geminiApiKey}`,
        {
          method: "POST",
          signal: AbortSignal.timeout(35000),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${systemPrompt}\n\n${userPrompt}\n\nReturn JSON only.` }],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!res.ok) {
        console.error("Gemini error in CV Checker:", await res.text());
        return null;
      }
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return JSON.parse(text) as T;
    }

    if (provider === "ollama") {
      const baseUrl = (config.ollamaBaseUrl || "http://127.0.0.1:11434").replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        signal: AbortSignal.timeout(45000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.ollamaModel || "qwen3:4b",
          stream: false,
          format: "json",
          options: { temperature: 0.1 },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      return JSON.parse(data.message?.content || "{}") as T;
    }
  } catch (err) {
    console.error("AI call failed in CV Checker:", err);
  }

  return null;
}

export async function runLlmAnalyzers(
  parsed: CvParsedSections,
  context: TargetCompanyContext = {}
): Promise<LlmAnalysisResult> {
  const result: LlmAnalysisResult = {};

  // 1. Analyze 自己PR
  if (parsed.jikoPrText && parsed.jikoPrText.length > 30) {
    const prompt = JIKO_PR_ANALYZER_PROMPT.replace("{{JIKO_PR_TEXT}}", parsed.jikoPrText);
    const jikoRes = await callAiJson<{
      score: number;
      issues?: Array<{
        severity: "critical" | "major" | "minor";
        ruleCode: string;
        title: string;
        problemVi: string;
        whyWrongVi: string;
        solutionVi: string;
        sourceQuoteJa?: string;
        rewriteSampleJa?: string;
      }>;
      suggestedRewriteJa?: string;
    }>(
      "You are a professional Japanese CV Reviewer for Vietnamese IT graduates entering Japanese companies. Output valid JSON.",
      prompt
    );

    if (jikoRes) {
      result.jikoPrResult = {
        score: jikoRes.score ?? 75,
        issues: (jikoRes.issues || []).map((issue, idx) => ({
          id: `LLM-PR-${idx + 1}`,
          section: "jiko_pr",
          severity: issue.severity || "minor",
          ruleCode: issue.ruleCode || "LLM_JIKO_PR_ISSUE",
          title: issue.title || "Vấn đề trong mục 自己PR",
          problemVi: issue.problemVi,
          whyWrongVi: issue.whyWrongVi,
          solutionVi: issue.solutionVi,
          sourceQuoteJa: issue.sourceQuoteJa,
          rewriteSampleJa: issue.rewriteSampleJa,
        })),
        suggestedRewriteJa: jikoRes.suggestedRewriteJa,
      };
    }
  }

  // 2. Analyze 志望動機
  if (parsed.shibouDoukiText && parsed.shibouDoukiText.length > 30) {
    const prompt = SHIBOU_DOUKI_ANALYZER_PROMPT
      .replace("{{SHIBOU_DOUKI_TEXT}}", parsed.shibouDoukiText)
      .replace("{{COMPANY_NAME}}", context.companyName || "Chưa cung cấp thông tin công ty")
      .replace("{{JOB_DESCRIPTION}}", context.jobDescription || "Chưa cung cấp JD");

    const shibouRes = await callAiJson<{
      score: number;
      issues?: Array<{
        severity: "critical" | "major" | "minor";
        ruleCode: string;
        title: string;
        problemVi: string;
        whyWrongVi: string;
        solutionVi: string;
        sourceQuoteJa?: string;
        rewriteSampleJa?: string;
      }>;
      suggestedRewriteJa?: string;
    }>(
      "You are a professional Japanese CV Reviewer evaluating 志望動機 (Reason for Application). Output valid JSON.",
      prompt
    );

    if (shibouRes) {
      result.shibouDoukiResult = {
        score: shibouRes.score ?? 75,
        issues: (shibouRes.issues || []).map((issue, idx) => ({
          id: `LLM-SD-${idx + 1}`,
          section: "shibou_douki",
          severity: issue.severity || "minor",
          ruleCode: issue.ruleCode || "LLM_SHIBOU_DOUKI_ISSUE",
          title: issue.title || "Vấn đề trong mục 志望動機",
          problemVi: issue.problemVi,
          whyWrongVi: issue.whyWrongVi,
          solutionVi: issue.solutionVi,
          sourceQuoteJa: issue.sourceQuoteJa,
          rewriteSampleJa: issue.rewriteSampleJa,
        })),
        suggestedRewriteJa: shibouRes.suggestedRewriteJa,
      };
    }
  }

  // 3. Analyze Work Experience
  if (parsed.educationWorkText && /インターン|実務|業務内容|プロジェクト/i.test(parsed.educationWorkText)) {
    const prompt = WORK_EXPERIENCE_ANALYZER_PROMPT.replace(
      "{{WORK_EXPERIENCE_TEXT}}",
      parsed.educationWorkText
    );

    const workRes = await callAiJson<{
      score: number;
      issues?: Array<{
        severity: "critical" | "major" | "minor";
        ruleCode: string;
        title: string;
        problemVi: string;
        whyWrongVi: string;
        solutionVi: string;
        sourceQuoteJa?: string;
        rewriteSampleJa?: string;
      }>;
      suggestedRewriteJa?: string;
    }>(
      "You are a professional Japanese CV Reviewer evaluating Work Experience and Internships. Output valid JSON.",
      prompt
    );

    if (workRes) {
      result.workExpResult = {
        score: workRes.score ?? 80,
        issues: (workRes.issues || []).map((issue, idx) => ({
          id: `LLM-EXP-${idx + 1}`,
          section: "education_work",
          severity: issue.severity || "minor",
          ruleCode: issue.ruleCode || "LLM_WORK_EXP_ISSUE",
          title: issue.title || "Vấn đề trong phần Kinh nghiệm / Dự án",
          problemVi: issue.problemVi,
          whyWrongVi: issue.whyWrongVi,
          solutionVi: issue.solutionVi,
          sourceQuoteJa: issue.sourceQuoteJa,
          rewriteSampleJa: issue.rewriteSampleJa,
        })),
        suggestedRewriteJa: workRes.suggestedRewriteJa,
      };
    }
  }

  return result;
}

