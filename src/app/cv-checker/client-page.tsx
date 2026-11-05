"use client";

import { useState, useRef } from "react";
import Icon from "@/components/icon";
import type { CvCheckerReport, IssueSeverity, SectionKey } from "@/lib/cv-checker";

const SEVERITY_CONFIG: Record<
  IssueSeverity,
  { label: string; bg: string; text: string; border: string; badge: string }
> = {
  critical: {
    label: "Lỗi nghiêm trọng (Critical)",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    badge: "bg-red-100 text-red-800 border-red-200",
  },
  major: {
    label: "Lỗi quan trọng (Major)",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
  },
  minor: {
    label: "Cần cải thiện (Minor)",
    bg: "bg-sky-50",
    text: "text-sky-800",
    border: "border-sky-200",
    badge: "bg-sky-100 text-sky-800 border-sky-200",
  },
  manual_check: {
    label: "Kiểm tra thủ công",
    bg: "bg-purple-50",
    text: "text-purple-800",
    border: "border-purple-200",
    badge: "bg-purple-100 text-purple-800 border-purple-200",
  },
};

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

  const [activeTab, setActiveTab] = useState<"issues" | "diff" | "checklist" | "scores">("issues");
  const [severityFilter, setSeverityFilter] = useState<"all" | IssueSeverity>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      const ext = dropped.name.toLowerCase().split(".").pop();
      if (ext !== "pdf" && ext !== "docx") {
        setErrorMessage("Chỉ hỗ trợ file .pdf hoặc .docx.");
        return;
      }
      if (dropped.size > 10 * 1024 * 1024) {
        setErrorMessage("File tải lên vượt quá 10MB.");
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
    setProgressStage("Đang trích xuất cấu trúc văn bản và nhận diện đề mục...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (companyName) formData.append("companyName", companyName);
      if (companyUrl) formData.append("companyUrl", companyUrl);
      if (jobDescription) formData.append("jobDescription", jobDescription);
      if (targetRole) formData.append("targetRole", targetRole);
      if (targetJlpt) formData.append("targetJlpt", targetJlpt);

      const stageTimer1 = setTimeout(() => {
        setProgressStage("Đang chạy bộ quy tắc kiểm tra định dạng & cẩm nang NiX (Deterministic)...");
      }, 2000);

      const stageTimer2 = setTimeout(() => {
        setProgressStage("Đang phân tích chiều sâu STAR (自己PR) & Phễu 4 tầng (志望動機)...");
      }, 5000);

      const response = await fetch("/api/cv-checker", {
        method: "POST",
        body: formData,
      });

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Không thể thẩm định CV. Vui lòng thử lại sau.");
      }

      setReport(data.report);
      setActiveTab("issues");
    } catch (err: any) {
      setErrorMessage(err.message || "Đã xảy ra lỗi kết nối.");
    } finally {
      setIsAnalyzing(false);
      setProgressStage("");
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleReset = () => {
    setReport(null);
    setFile(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const allIssues = report
    ? Object.values(report.sections).flatMap((sec) => sec.issues)
    : [];

  const filteredIssues =
    severityFilter === "all"
      ? allIssues
      : allIssues.filter((i) => i.severity === severityFilter);

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

      {/* Page Header */}
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Check CV Chuẩn Doanh Nghiệp Nhật</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Thẩm định toàn diện 7 hạng mục (Thông tin cá nhân, Học vấn, Chứng chỉ, Kỹ năng, 自己PR, 志望動機, Format) theo cẩm nang NiX Education.
        </p>
      </header>

      {/* Top Banner Alert regarding CV Bank formats */}
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950 flex items-start gap-3 shadow-sm">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 mt-0.5">
          <Icon name="warning" className="w-4 h-4" />
        </span>
        <div className="text-xs space-y-1">
          <p className="font-bold text-amber-900 text-sm">
            Lưu ý kỹ thuật về định dạng file từ các trang tạo CV (CV Bank / Canva):
          </p>
          <p className="text-amber-800 leading-relaxed">
            File CV xuất từ một số nền tảng thường có bố cục bảng ẩn (hidden tables) hoặc 2 cột phức tạp,
            dễ gây lệch dòng hoặc trích xuất thiếu khi chuyển đổi văn bản. Nếu phát hiện thiếu đề mục,
            bạn nên dùng mẫu Word chuẩn theo hướng dẫn của NiX và lưu trực tiếp sang PDF.
          </p>
        </div>
      </section>

      {/* Main Container */}
      {!report ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Target Company Information */}
          <div className="lg:col-span-5 bg-white border border-surface-container rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-surface-container pb-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-primary">
                <Icon name="work_outline" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-primary sm:text-base">
                  Thông tin doanh nghiệp ứng tuyển
                </h2>
                <p className="mt-0.5 text-xs text-on-surface-variant">
                  Giúp AI thẩm định độ ăn khớp với JD và phễu 4 tầng 志望動機.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                  Tên công ty Nhật ứng tuyển
                </label>
                <input
                  type="text"
                  placeholder="VD: Rakuten, Line, GMO-Z.com, FPT Japan..."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant/70 bg-white px-3 py-2.5 text-sm text-on-surface outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/15 placeholder:text-outline"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                    Vị trí ứng tuyển
                  </label>
                  <input
                    type="text"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="w-full rounded-lg border border-outline-variant/70 bg-white px-3 py-2.5 text-sm text-on-surface outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/15"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                    Trình độ JLPT mục tiêu
                  </label>
                  <select
                    value={targetJlpt}
                    onChange={(e) => setTargetJlpt(e.target.value)}
                    className="w-full rounded-lg border border-outline-variant/70 bg-white px-3 py-2.5 text-sm text-on-surface outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/15"
                  >
                    <option value="N4">N4</option>
                    <option value="N3">N3 (Chuẩn NiX)</option>
                    <option value="N2">N2</option>
                    <option value="N1">N1</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                  Trang web công ty (URL)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={companyUrl}
                  onChange={(e) => setCompanyUrl(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant/70 bg-white px-3 py-2.5 text-sm text-on-surface outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/15 placeholder:text-outline"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                  Mô tả công việc / Job Description (JD)
                </label>
                <textarea
                  rows={4}
                  placeholder="Dán yêu cầu kỹ thuật, trách nhiệm công việc bằng tiếng Nhật hoặc tiếng Việt..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant/70 bg-white px-3 py-2.5 text-sm text-on-surface outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/15 placeholder:text-outline resize-y leading-6"
                />
              </div>
            </div>
          </div>

          {/* Right: CV File Upload & Start Button */}
          <div className="lg:col-span-7 bg-white border border-surface-container rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center gap-3 border-b border-surface-container pb-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-primary">
                  <Icon name="fact_check" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-primary sm:text-base">
                    Tải lên CV (履歴書) cần thẩm định
                  </h2>
                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    Hỗ trợ tệp PDF hoặc DOCX (Tối đa 10MB). Dữ liệu được bảo mật và xóa ngay sau khi phân tích.
                  </p>
                </div>
              </div>
            </div>

            {/* Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                file
                  ? "border-secondary bg-surface-container-low/60"
                  : "border-outline-variant/70 bg-surface-container-low/30 hover:border-secondary hover:bg-surface-container-low/60"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                className="hidden"
              />

              {file ? (
                <div className="space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-secondary-container/40 text-secondary flex items-center justify-center">
                    <Icon name="description" className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-primary text-sm">{file.name}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • Sẵn sàng phân tích
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="text-xs text-error font-medium hover:underline inline-flex items-center gap-1"
                  >
                    <Icon name="close" className="w-3.5 h-3.5" /> Chọn file khác
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-surface-container-high text-primary flex items-center justify-center">
                    <Icon name="cloud_upload" className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary">
                      Kéo & thả file CV vào đây, hoặc <span className="text-secondary underline">chọn từ máy tính</span>
                    </p>
                    <p className="text-xs text-on-surface-variant mt-1">Định dạng hỗ trợ: PDF, DOCX (Dung lượng ≤ 10MB)</p>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <Icon name="error" className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Rubric highlights pill */}
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-3 rounded-xl bg-surface-container-low/70 border border-surface-container">
                <span className="text-primary font-bold block text-sm">7 Hạng mục</span>
                <span className="text-on-surface-variant">Chuẩn hóa NiX</span>
              </div>
              <div className="p-3 rounded-xl bg-surface-container-low/70 border border-surface-container">
                <span className="text-secondary font-bold block text-sm">12 Tiêu chí</span>
                <span className="text-on-surface-variant">Checklist đỗ CV</span>
              </div>
              <div className="p-3 rounded-xl bg-surface-container-low/70 border border-surface-container">
                <span className="text-error font-bold block text-sm">Cấm Credly</span>
                <span className="text-on-surface-variant">Cập nhật 07/2026</span>
              </div>
            </div>

            {/* Action button */}
            <button
              onClick={handleStartAnalysis}
              disabled={!file || isAnalyzing}
              className={`w-full py-3 px-5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors ${
                !file || isAnalyzing
                  ? "bg-surface-container-highest text-outline cursor-not-allowed"
                  : "bg-primary text-white hover:bg-primary/90"
              }`}
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang xử lý thẩm định CV...</span>
                </>
              ) : (
                <>
                  <Icon name="fact_check" className="w-4 h-4" />
                  <span>Bắt đầu thẩm định CV chuẩn Nhật</span>
                </>
              )}
            </button>

            {/* Progress indicator during analysis */}
            {isAnalyzing && (
              <div className="p-3 bg-surface-container-low rounded-xl border border-surface-container text-center">
                <p className="text-xs text-primary font-medium">{progressStage}</p>
                <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-secondary h-full rounded-full animate-[shimmer_2s_infinite]" style={{ width: "70%" }} />
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Report View */
        <div className="space-y-6">
          {/* Header Score Overview */}
          <div className="bg-white border border-surface-container rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                {/* Score Circle */}
                <div className="relative w-24 h-24 shrink-0 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col items-center justify-center shadow-inner">
                  <span
                    className={`text-3xl font-extrabold ${
                      report.overallScore >= 85
                        ? "text-emerald-600"
                        : report.overallScore >= 70
                        ? "text-secondary"
                        : report.overallScore >= 50
                        ? "text-amber-600"
                        : "text-red-600"
                    }`}
                  >
                    {report.overallScore}
                  </span>
                  <span className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">
                    Thang 100
                  </span>
                </div>

                {/* Score Summary */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        report.ratingVi === "Xuất sắc"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : report.ratingVi === "Đạt yêu cầu"
                          ? "bg-sky-50 text-sky-800 border-sky-200"
                          : report.ratingVi === "Cần cải thiện"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-red-50 text-red-800 border-red-200"
                      }`}
                    >
                      {report.ratingVi}
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      Tệp: <strong className="text-primary">{report.metadata.fileName}</strong>
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-primary">Báo cáo Thẩm định CV Chuẩn NiX</h2>
                  <p className="text-xs text-on-surface-variant max-w-2xl leading-relaxed">{report.summaryVi}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-xs font-semibold bg-surface-container-low hover:bg-surface-container text-primary rounded-lg border border-outline-variant/60 transition-colors flex items-center gap-1.5"
                >
                  <Icon name="arrow_back" className="w-4 h-4" /> Kiểm tra CV khác
                </button>
              </div>
            </div>

            {/* Top 3 Priorities Callout */}
            <div className="mt-6 pt-5 border-t border-surface-container">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Icon name="bolt" className="w-4 h-4 text-amber-600" />
                3 việc cần ưu tiên chỉnh sửa ngay trước khi nộp:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {report.topPrioritiesVi.map((priority, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-surface-container-low/60 border border-surface-container rounded-xl text-xs text-on-surface leading-relaxed"
                  >
                    <span className="text-amber-700 font-bold block mb-1">Ưu tiên #{idx + 1}</span>
                    {priority}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-surface-container gap-2">
            <button
              onClick={() => setActiveTab("issues")}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === "issues"
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-primary"
              }`}
            >
              <Icon name="error" className="w-4 h-4" />
              <span>Danh sách lỗi & Khắc phục ({allIssues.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("diff")}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === "diff"
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-primary"
              }`}
            >
              <Icon name="translate" className="w-4 h-4" />
              <span>Mẫu viết lại tiếng Nhật (Rewrite)</span>
            </button>

            <button
              onClick={() => setActiveTab("checklist")}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === "checklist"
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-primary"
              }`}
            >
              <Icon name="check_circle" className="w-4 h-4" />
              <span>12 Tiêu chí Checklist</span>
            </button>

            <button
              onClick={() => setActiveTab("scores")}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === "scores"
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-primary"
              }`}
            >
              <Icon name="assessment" className="w-4 h-4" />
              <span>Chi tiết 7 Hạng mục</span>
            </button>
          </div>

          {/* Tab 1: Issues View */}
          {activeTab === "issues" && (
            <div className="space-y-4">
              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-on-surface-variant mr-2">Lọc mức độ:</span>
                {(["all", "critical", "major", "minor", "manual_check"] as const).map((sev) => {
                  const count =
                    sev === "all"
                      ? allIssues.length
                      : allIssues.filter((i) => i.severity === sev).length;

                  return (
                    <button
                      key={sev}
                      onClick={() => setSeverityFilter(sev)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        severityFilter === sev
                          ? "bg-primary text-white shadow-sm"
                          : "bg-white text-on-surface-variant hover:text-primary border border-surface-container"
                      }`}
                    >
                      {sev === "all" ? "Tất cả" : SEVERITY_CONFIG[sev].label} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Issue Cards */}
              {filteredIssues.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-surface-container shadow-sm">
                  <Icon name="check_circle" className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-primary">Không có lỗi nào ở phân loại này!</p>
                  <p className="text-xs text-on-surface-variant mt-1">CV của bạn tuân thủ rất tốt các quy chuẩn kiểm tra.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredIssues.map((issue) => {
                    const cfg = SEVERITY_CONFIG[issue.severity];
                    return (
                      <div
                        key={issue.id}
                        className={`p-5 rounded-2xl border ${cfg.border} bg-white shadow-sm space-y-3.5`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${cfg.badge}`}
                            >
                              {issue.severity}
                            </span>
                            <span className="text-xs text-outline font-mono">[{issue.ruleCode}]</span>
                            <h4 className="text-sm font-bold text-primary">{issue.title}</h4>
                          </div>
                        </div>

                        {/* Problem & Why Wrong */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="p-3 rounded-xl bg-surface-container-low/70 border border-surface-container space-y-1">
                            <span className="font-semibold text-primary block">Hiện trạng phát hiện:</span>
                            <p className="text-on-surface-variant leading-relaxed">{issue.problemVi}</p>
                          </div>
                          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1">
                            <span className="font-semibold text-amber-900 block">Vì sao sai theo chuẩn Nhật:</span>
                            <p className="text-amber-800 leading-relaxed">{issue.whyWrongVi}</p>
                          </div>
                        </div>

                        {/* Solution */}
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                          <span className="font-semibold text-emerald-800 block">Cách khắc phục:</span>
                          <p className="text-emerald-900 leading-relaxed">{issue.solutionVi}</p>
                        </div>

                        {/* Rewrite or Quote if available */}
                        {issue.rewriteSampleJa && (
                          <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container text-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">
                                Câu mẫu tiếng Nhật gợi ý (Rewrite):
                              </span>
                              <button
                                onClick={() => handleCopyText(issue.id, issue.rewriteSampleJa!)}
                                className="text-[11px] text-secondary font-semibold hover:underline flex items-center gap-1"
                              >
                                {copiedId === issue.id ? "✓ Đã copy" : "Sao chép tiếng Nhật"}
                              </button>
                            </div>
                            <pre className="font-sans text-xs text-primary whitespace-pre-wrap leading-relaxed bg-white p-3 rounded-lg border border-outline-variant/60 shadow-inner">
                              {issue.rewriteSampleJa}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Japanese Rewrite Diff View */}
          {activeTab === "diff" && (
            <div className="space-y-6">
              <div className="bg-white border border-surface-container rounded-2xl p-5 shadow-sm space-y-1.5">
                <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                  <Icon name="translate" className="w-4 h-4 text-secondary" />
                  Bản viết lại mẫu chuẩn STAR & Phễu 4 tầng (AI Rewrite Sample)
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Dưới đây là các câu viết lại mẫu tiếng Nhật chuẩn hóa từ chuyên gia. Bạn có thể sao chép và tinh chỉnh vào bản CV chính thức.
                </p>
              </div>

              {filteredIssues.filter((i) => i.rewriteSampleJa).length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-surface-container shadow-sm">
                  <p className="text-sm text-on-surface-variant">Không có đoạn văn tiếng Nhật nào cần viết lại.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredIssues
                    .filter((i) => i.rewriteSampleJa)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="bg-white border border-surface-container rounded-2xl p-5 shadow-sm space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-primary">
                            Mục: {item.title} ({item.section})
                          </h4>
                          <button
                            onClick={() => handleCopyText(`diff-${item.id}`, item.rewriteSampleJa!)}
                            className="px-3 py-1 bg-secondary text-white rounded-lg text-xs font-semibold hover:bg-secondary/90 shadow-sm transition-colors"
                          >
                            {copiedId === `diff-${item.id}` ? "✓ Đã sao chép" : "Sao chép tiếng Nhật"}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Original */}
                          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-2">
                            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                              Trích xuất nguyên văn CV hiện tại:
                            </span>
                            <p className="text-xs text-amber-950 whitespace-pre-wrap leading-relaxed font-sans">
                              {item.sourceQuoteJa || "(Không có trích đoạn ngắn hoặc thiếu nội dung)"}
                            </p>
                          </div>

                          {/* Rewrite Sample */}
                          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                              Mẫu đề xuất viết lại (Chuẩn Nhật):
                            </span>
                            <p className="text-xs text-emerald-950 whitespace-pre-wrap leading-relaxed font-sans font-medium">
                              {item.rewriteSampleJa}
                            </p>
                          </div>
                        </div>

                        <p className="text-xs text-on-surface-variant bg-surface-container-low p-3 rounded-lg border border-surface-container">
                          💡 <strong className="text-primary">Lời khuyên:</strong> {item.solutionVi}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: 12-Item Checklist View */}
          {activeTab === "checklist" && (
            <div className="space-y-4">
              <div className="p-4 bg-white border border-surface-container rounded-2xl shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-primary">
                    Bảng 12 Tiêu chí Kiểm tra CV trước khi nộp (Section ⑦ NiX)
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Đối chiếu với danh mục 12 điểm cốt lõi đảm bảo CV không bị loại ở vòng lọc hồ sơ.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                    Đạt: {report.checklist.filter((c) => c.status === "pass").length}/12
                  </span>
                </div>
              </div>

              <div className="divide-y divide-surface-container bg-white border border-surface-container rounded-2xl shadow-sm overflow-hidden">
                {report.checklist.map((item) => (
                  <div key={item.id} className="p-4 flex items-start gap-4 hover:bg-surface-container-low/40 transition-colors">
                    {/* Status Badge */}
                    <div className="mt-0.5 shrink-0">
                      {item.status === "pass" && (
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <Icon name="check" className="w-3.5 h-3.5" />
                        </div>
                      )}
                      {item.status === "fail" && (
                        <div className="w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center">
                          <Icon name="close" className="w-3.5 h-3.5" />
                        </div>
                      )}
                      {item.status === "warning" && (
                        <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                          <Icon name="warning" className="w-3.5 h-3.5" />
                        </div>
                      )}
                      {item.status === "manual_check" && (
                        <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
                          <Icon name="info" className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <h4 className="text-sm font-bold text-primary">
                          #{item.id}. {item.labelVi}
                        </h4>
                        <span className="text-[11px] text-on-surface-variant font-sans hidden sm:inline">
                          {item.labelJa}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed">{item.detailVi}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: 7 Categories Breakdown */}
          {activeTab === "scores" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.keys(report.sections) as SectionKey[]).map((key) => {
                const sec = report.sections[key];
                return (
                  <div
                    key={key}
                    className="p-5 rounded-2xl bg-white border border-surface-container shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-primary">{sec.titleVi}</h4>
                        <span className="text-[11px] text-on-surface-variant">{sec.titleJa}</span>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-lg font-extrabold ${
                            sec.score >= 85
                              ? "text-emerald-600"
                              : sec.score >= 70
                              ? "text-secondary"
                              : sec.score >= 50
                              ? "text-amber-600"
                              : "text-red-600"
                          }`}
                        >
                          {sec.score}
                        </span>
                        <span className="text-xs text-on-surface-variant">/100</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-surface-container-low h-2 rounded-full overflow-hidden border border-surface-container">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          sec.score >= 85
                            ? "bg-emerald-500"
                            : sec.score >= 70
                            ? "bg-secondary"
                            : sec.score >= 50
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${sec.score}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-on-surface-variant pt-1">
                      <span>{sec.evaluationVi}</span>
                      <span className="text-outline">Trọng số: {(sec.weight * 100).toFixed(0)}%</span>
                    </div>

                    {sec.issues.length > 0 && (
                      <div className="text-[11px] text-on-surface-variant space-y-1 pt-2 border-t border-surface-container">
                        {sec.issues.slice(0, 2).map((i) => (
                          <div key={i.id} className="truncate">
                            • <strong className="text-primary">{i.title}</strong>: {i.problemVi}
                          </div>
                        ))}
                        {sec.issues.length > 2 && (
                          <div className="text-outline italic">
                            ... và {sec.issues.length - 2} vấn đề khác (xem ở tab Danh sách lỗi)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
