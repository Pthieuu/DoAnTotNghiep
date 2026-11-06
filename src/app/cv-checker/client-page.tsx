"use client";

import { useState, useRef } from "react";
import Icon from "@/components/icon";
import type { CvCheckerReport } from "@/lib/cv-checker";
import CvCheckerReportWorkspace from "@/components/cv-checker-report";

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
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Đã xảy ra lỗi kết nối.");
    } finally {
      setIsAnalyzing(false);
      setProgressStage("");
    }
  };

  const handleReset = () => {
    setReport(null);
    setFile(null);
    setErrorMessage(null);
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

      {/* Page Header */}
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Check CV Chuẩn Doanh Nghiệp Nhật</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Hệ thống phân tích hồ sơ và đưa ra gợi ý hoàn thiện từng phần như một chuyên gia review CV doanh nghiệp Nhật.
        </p>
      </header>

      {/* Top Banner Alert regarding CV Bank formats */}
      {!report && <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950 flex items-start gap-3 shadow-sm">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 mt-0.5">
          <Icon name="warning" className="w-4 h-4" />
        </span>
        <div className="text-xs space-y-1">
          <p className="font-bold text-amber-900 text-sm">
            Lưu ý về định dạng file từ các trang tạo CV:
          </p>
          <p className="text-amber-800 leading-relaxed">
            File CV xuất từ một số nền tảng trực tuyến thường có bố cục bảng ẩn (hidden tables) hoặc 2 cột phức tạp,
            dễ gây lệch dòng khi chuyển đổi văn bản. Bạn nên dùng mẫu Word chuẩn và lưu trực tiếp sang PDF trước khi tải lên.
          </p>
        </div>
      </section>}

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
                  Giúp AI đối chiếu mức độ ăn khớp với mô tả công việc (JD).
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
                    <option value="N3">N3</option>
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
                    Hỗ trợ tệp PDF hoặc DOCX (Tối đa 10MB).
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

            {/* Neutral Privacy Notice (replaces criteria badges) */}
            <div className="p-3 rounded-xl bg-surface-container-low/60 border border-surface-container text-center text-xs text-on-surface-variant flex items-center justify-center gap-1.5">
              <Icon name="lock" className="w-4 h-4 text-secondary" />
              <span>CV của bạn sẽ được phân tích và xóa ngay sau khi hoàn tất.</span>
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
                  <span>Đang xử lý phân tích CV...</span>
                </>
              ) : (
                <>
                  <Icon name="fact_check" className="w-4 h-4" />
                  <span>Bắt đầu phân tích & nhận góp ý CV</span>
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
        <CvCheckerReportWorkspace report={report} onReset={handleReset} />
      )}
    </div>
  );
}
