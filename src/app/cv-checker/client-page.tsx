"use client";

import { useState, useRef } from "react";
import Icon from "@/components/icon";
import type { CvCheckerReport } from "@/lib/cv-checker";
import CvCheckerReportWorkspace from "@/components/cv-checker-report";
import { clearInterviewSessionContext } from "@/lib/interview-session-context";

export default function CvCheckerClient() {
  const [file, setFile] = useState<File | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [targetRole, setTargetRole] = useState("Full-Stack / Backend Engineer");
  const [targetJlpt, setTargetJlpt] = useState("N3");

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressStage, setProgressStage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [report, setReport] = useState<CvCheckerReport | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 4 * 1024 * 1024) {
        setErrorMessage("Uploaded file exceeds 4MB limit. Please select a smaller file.");
        return;
      }
      setFile(selected);
      setErrorMessage(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      if (dropped.size > 4 * 1024 * 1024) {
        setErrorMessage("Uploaded file exceeds 4MB limit. Please select a smaller file.");
        return;
      }
      setFile(dropped);
      setErrorMessage(null);
    }
  };

  const handleStartAnalysis = async () => {
    if (!file) {
      setErrorMessage("Please upload a CV file (PDF or DOCX) to continue.");
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);
    setProgressStage("Extracting CV content and structure...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (companyName) formData.append("companyName", companyName);
      if (companyUrl) formData.append("companyUrl", companyUrl);
      if (jobDescription) formData.append("jobDescription", jobDescription);
      if (targetRole) formData.append("targetRole", targetRole);
      if (targetJlpt) formData.append("targetJlpt", targetJlpt);

      const stageTimer1 = setTimeout(() => {
        setProgressStage("Reviewing formatting and essential information...");
      }, 2000);

      const stageTimer2 = setTimeout(() => {
        setProgressStage("Analyzing 自己PR and 志望動機 in detail...");
      }, 5000);

      const response = await fetch("/api/cv-checker", {
        method: "POST",
        body: formData,
      });

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to analyze CV. Please try again later.");
      }

      setReport(data.report);
    } catch (err: any) {
      setErrorMessage(err.message || "A network error occurred.");
    } finally {
      setIsAnalyzing(false);
      setProgressStage("");
    }
  };

  const handleReset = () => {
    setReport(null);
    setFile(null);
    setErrorMessage(null);
    clearInterviewSessionContext();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
        <span>Console</span>
        <Icon name="chevron_right" />
        <span>Workspace</span>
        <Icon name="chevron_right" />
        <span className="font-semibold text-primary">Check CV</span>
      </div>

      {!report ? (
        /* Upload & Form Container */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Target Company Context Card */}
          <div className="lg:col-span-5 bg-white border border-surface-container rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-surface-container">
              <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                <Icon name="business_center" className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-primary">Target Company</h2>
                <p className="text-xs text-on-surface-variant">
                  Helps AI evaluate alignment with the target company and position.
                </p>
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-primary block mb-1">
                  Target Japanese Company
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rakuten, LINE, GMO-Z.com, FPT Japan..."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-outline-variant/60 px-3.5 py-2.5 bg-surface-container-lowest focus:outline-none focus:border-secondary transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-primary block mb-1">
                    Target Position
                  </label>
                  <input
                    type="text"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="w-full text-xs rounded-xl border border-outline-variant/60 px-3.5 py-2.5 bg-surface-container-lowest focus:outline-none focus:border-secondary transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-primary block mb-1">
                    Target JLPT Level
                  </label>
                  <select
                    value={targetJlpt}
                    onChange={(e) => setTargetJlpt(e.target.value)}
                    className="w-full text-xs rounded-xl border border-outline-variant/60 px-3.5 py-2.5 bg-surface-container-lowest focus:outline-none focus:border-secondary transition-all"
                  >
                    <option value="N5">N5</option>
                    <option value="N4">N4</option>
                    <option value="N3">N3</option>
                    <option value="N2">N2</option>
                    <option value="N1">N1</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-primary block mb-1">
                  Company Website (URL) <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={companyUrl}
                  onChange={(e) => setCompanyUrl(e.target.value)}
                  className="w-full text-xs rounded-xl border border-outline-variant/60 px-3.5 py-2.5 bg-surface-container-lowest focus:outline-none focus:border-secondary transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-primary block mb-1">
                  Job Description (JD) <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Paste technical requirements and responsibilities in Japanese or English..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="w-full text-xs rounded-xl border border-outline-variant/60 p-3 bg-surface-container-lowest focus:outline-none focus:border-secondary transition-all leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Upload Dropzone Card */}
          <div className="lg:col-span-7 bg-white border border-surface-container rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-surface-container">
              <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                <Icon name="description" className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-primary">Upload CV (履歴書) for Evaluation</h2>
                <p className="text-xs text-on-surface-variant">
                  Supports PDF or DOCX files (Up to 4MB). Data is kept private to your session.
                </p>
              </div>
            </div>

            {/* Dropzone Box */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                file
                  ? "border-emerald-400 bg-emerald-50/20"
                  : "border-outline-variant/60 hover:border-secondary bg-surface-container-lowest/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mb-3 text-secondary">
                <Icon name={file ? "verified" : "cloud_upload"} className="w-6 h-6" />
              </div>

              {file ? (
                <div className="space-y-1">
                  <p className="text-sm font-bold text-primary">{file.name}</p>
                  <p className="text-xs text-on-surface-variant">
                    {(file.size / 1024 / 1024).toFixed(2)} MB • Click to replace file
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-primary">
                    Drag &amp; drop CV file here, or <span className="text-secondary underline">browse from computer</span>
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    Supported formats: PDF, DOCX (Size ≤ 4MB)
                  </p>
                </div>
              )}
            </div>

            {/* Privacy notice */}
            <p className="text-[11px] text-slate-500 text-center">
              Your CV will be analyzed and secured per session.
            </p>

            {/* Error Banner */}
            {errorMessage && (
              <div
                role="alert"
                className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2"
              >
                <Icon name="error" className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleStartAnalysis}
              disabled={!file || isAnalyzing}
              className="w-full py-3 px-4 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <Icon name="autorenew" className="w-4 h-4 animate-spin" />
                  <span>Analyzing CV...</span>
                </>
              ) : (
                <>
                  <Icon name="fact_check" className="w-4 h-4" />
                  <span>Start Japanese CV Evaluation</span>
                </>
              )}
            </button>

            {/* Live Progress Stage Indicator */}
            {isAnalyzing && (
              <div className="p-3 bg-surface-container-low border border-surface-container rounded-xl flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
                <span className="text-xs text-secondary font-medium">{progressStage}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Detailed Report Workspace */
        <CvCheckerReportWorkspace report={report} onReset={handleReset} />
      )}
    </div>
  );
}
