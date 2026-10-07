"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/icon";

type SummaryResult = {
  totalScore: number;
  grade: string;
  strengths: string[];
  weaknesses: string[];
  improvementTips: string[];
};

export default function SummaryClient({ 
  sessionId, 
  title, 
  initialSummary, 
  status 
}: { 
  sessionId: string; 
  title: string; 
  initialSummary: SummaryResult | null;
  status: string;
}) {
  const [summary, setSummary] = useState<SummaryResult | null>(initialSummary);
  const [loading, setLoading] = useState(!initialSummary && status === "completed");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!summary && status === "completed") {
      // Generate summary if it doesn't exist
      const generateSummary = async () => {
        try {
          const res = await fetch(`/api/interviews/${sessionId}/summary`, {
            method: "POST"
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Có lỗi xảy ra khi tổng kết.");
          setSummary(data.summary);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
        } finally {
          setLoading(false);
        }
      };
      generateSummary();
    }
  }, [sessionId, summary, status]);

  if (status !== "completed") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-surface-container max-w-md">
          <Icon name="info" className="text-4xl text-secondary mb-4 block mx-auto" />
          <h2 className="text-xl font-bold text-primary mb-2">Chưa hoàn thành</h2>
          <p className="text-on-surface-variant mb-6">Buổi phỏng vấn này chưa kết thúc nên chưa có bảng tổng kết.</p>
          <Link href={`/interview-room?sessionId=${sessionId}`} className="px-6 py-2.5 bg-primary text-white hover:bg-secondary rounded-lg font-semibold transition-colors inline-block">
            Tiếp tục phỏng vấn
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Icon name="autorenew" className="text-4xl text-primary animate-spin mb-4 mx-auto block" />
          <h2 className="text-xl font-bold text-primary mb-2">Đang phân tích kết quả</h2>
          <p className="text-on-surface-variant">AI đang tổng hợp điểm số và đưa ra lời khuyên cho bạn...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="bg-error-container text-on-error-container p-6 rounded-2xl">
          <h2 className="font-bold text-lg mb-2">Không thể tạo bảng tổng kết</h2>
          <p>{error}</p>
          <Link href="/dashboard" className="mt-4 inline-block px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold">
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const scoreColor = summary.totalScore >= 80 ? "text-emerald-600" : summary.totalScore >= 65 ? "text-blue-600" : summary.totalScore >= 50 ? "text-amber-600" : "text-error";

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary mb-2">Kết quả phỏng vấn</h1>
        <p className="text-on-surface-variant text-lg">{title}</p>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-surface-container shadow-sm flex flex-col md:flex-row items-center gap-8 md:gap-16 justify-center">
        <div className="text-center">
          <div className="relative size-40 md:size-48 flex items-center justify-center mx-auto">
            <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-surface-container-high" />
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray={`${(summary.totalScore / 100) * 283} 283`} className={`${scoreColor} transition-all duration-1000 ease-out`} />
            </svg>
            <div className="relative flex flex-col items-center">
              <span className={`text-5xl md:text-6xl font-black ${scoreColor}`}>{summary.totalScore}</span>
              <span className="text-sm font-semibold text-on-surface-variant">/ 100</span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 space-y-4">
          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container">
            <div className="flex items-center gap-3 mb-2">
              <div className={`size-10 rounded-full flex items-center justify-center font-bold text-lg ${scoreColor} bg-opacity-10 bg-current`}>
                {summary.grade}
              </div>
              <div>
                <h3 className="font-bold text-primary text-lg">Xếp loại: {summary.grade}</h3>
                <p className="text-sm text-on-surface-variant">
                  {summary.grade === 'A' ? 'Tuyệt vời! Bạn hoàn toàn sẵn sàng cho vị trí này.' :
                   summary.grade === 'B' ? 'Khá tốt. Bạn có nền tảng vững nhưng cần cải thiện một số điểm.' :
                   summary.grade === 'C' ? 'Cần cố gắng hơn. Hãy xem kỹ phần gợi ý cải thiện bên dưới.' :
                   'Kết quả chưa tốt. Đừng nản lòng, hãy luyện tập thêm nhé!'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 h-full">
          <h3 className="text-lg font-bold text-emerald-900 mb-4 flex items-center gap-2">
            <Icon name="thumb_up" /> Điểm mạnh
          </h3>
          <ul className="space-y-3">
            {summary.strengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-emerald-800">
                <Icon name="check_circle" className="shrink-0 mt-0.5 text-emerald-600" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="bg-rose-50 rounded-2xl p-6 border border-rose-100 h-full">
          <h3 className="text-lg font-bold text-rose-900 mb-4 flex items-center gap-2">
            <Icon name="trending_down" /> Điểm cần cải thiện
          </h3>
          <ul className="space-y-3">
            {summary.weaknesses.map((w, i) => (
              <li key={i} className="flex gap-2 text-rose-800">
                <Icon name="error" className="shrink-0 mt-0.5 text-rose-600" />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
        <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
          <Icon name="psychology" /> Lời khuyên từ AI Interviewer
        </h3>
        <ul className="space-y-4">
          {summary.improvementTips.map((tip, i) => (
            <li key={i} className="flex gap-3">
              <div className="size-6 shrink-0 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center font-bold text-xs mt-0.5">{i + 1}</div>
              <span className="text-indigo-900 font-medium leading-relaxed">{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-center gap-4 pt-4">
        <Link href="/dashboard" className="px-6 py-3 bg-white border border-surface-container text-primary hover:bg-surface-container rounded-xl font-semibold transition-colors flex items-center gap-2">
          Về trang chủ
        </Link>
        <Link href={`/interview-room/history/${sessionId}`} className="px-6 py-3 bg-primary text-white hover:bg-secondary rounded-xl font-semibold transition-colors flex items-center gap-2 shadow-md">
          <Icon name="list_alt" /> Xem chi tiết từng câu
        </Link>
      </div>
    </div>
  );
}
