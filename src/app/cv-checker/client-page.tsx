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
      if (selected.size > 10 * 1024 * 1024) {
        setErrorMessage("File tải lên vượt quá giới hạn 10MB. Vui lòng chọn file nhẹ hơn.");
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
      if (dropped.size > 10 * 1024 * 1024) {
        setErrorMessage("File tải lên vượt quá giới hạn 10MB. Vui lòng chọn file nhẹ hơn.");
        return;
      }
      setFile(dropped);
      setErrorMessage(null);
    }
  };

  const handleStartAnalysis = async () => {
    if (!file) {
      setErrorMessage("Vui lòng tải lên file CV (PDF hoặc DOCX) để tiếp tục.");
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);
    setProgressStage("Đang trích xuất nội dung và cấu trúc CV...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (companyName) formData.append("companyName", companyName);
      if (companyUrl) formData.append("companyUrl", companyUrl);
      if (jobDescription) formData.append("jobDescription", jobDescription);
      if (targetRole) formData.append("targetRole", targetRole);
      if (targetJlpt) formData.append("targetJlpt", targetJlpt);

      const stageTimer1 = setTimeout(() => {
        setProgressStage("Đang rà soát cách trình bày và thông tin cần thiết...");
      }, 2000);

      const stageTimer2 = setTimeout(() => {
        setProgressStage("Đang phân tích chi tiết nội dung 自己PR và 志望動機...");
      }, 5000);

      const response = await fetch("/api/cv-checker", {
        method: "POST",
        body: formData,
      });

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Không thể phân tích CV. Vui lòng thử lại sau.");
      }

      setReport(data.report);
    } catch (err: any) {
      setErrorMessage(err.message || "Đã xảy ra lỗi kết nối.");
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
                <h2 className="text-base font-bold text-primary">Doanh nghiệp ứng tuyển</h2>
                <p className="text-xs text-on-surface-variant">
                  Giúp AI phân tích độ khớp với công ty và vị trí ứng tuyển.
                </p>
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-primary block mb-1">
                  Tên công ty Nhật ứng tuyển
                </label>
                <input
                  type="text"
                  placeholder="VD: Rakuten, LINE, GMO-Z.com, FPT Japan..."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-outline-variant/60 px-3.5 py-2.5 bg-surface-container-lowest focus:outline-none focus:border-secondary transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-primary block mb-1">
                    Vị trí ứng tuyển
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
                    Trình độ JLPT mục tiêu
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
                  Trang web công ty (URL) <span className="text-slate-400 font-normal">(không bắt buộc)</span>
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
                  Mô tả công việc / Job Description (JD) <span className="text-slate-400 font-normal">(không bắt buộc)</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Dán yêu cầu kỹ thuật, trách nhiệm công việc bằng tiếng Nhật hoặc tiếng Việt..."
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
                <h2 className="text-base font-bold text-primary">Tải lên CV (履歴書) cần thẩm định</h2>
                <p className="text-xs text-on-surface-variant">
                  Hỗ trợ tệp PDF hoặc DOCX (Tối đa 10MB). Dữ liệu được bảo mật theo phiên.
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
                    {(file.size / 1024 / 1024).toFixed(2)} MB • Nhấp để đổi tệp khác
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-primary">
                    Kéo & thả file CV vào đây, hoặc <span className="text-secondary underline">chọn từ máy tính</span>
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    Định dạng hỗ trợ: PDF, DOCX (Dung lượng ≤ 10MB)
                  </p>
                </div>
              )}
            </div>

            {/* Privacy notice */}
            <p className="text-[11px] text-slate-500 text-center">
              CV của bạn sẽ được phân tích và bảo mật theo phiên làm việc.
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
                  <span>Đang phân tích CV...</span>
                </>
              ) : (
                <>
                  <Icon name="fact_check" className="w-4 h-4" />
                  <span>Bắt đầu thẩm định CV chuẩn Nhật</span>
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
