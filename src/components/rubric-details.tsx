import { CRITERIA, type RubricResult } from "@/lib/interview-rubric";

export default function RubricDetails({ rubric }: { rubric: RubricResult }) {
  const steps = rubric.structure.method === "PREP" ? ["Ý chính", "Lý do", "Ví dụ", "Chốt ý"] : ["Bối cảnh", "Nhiệm vụ", "Hành động", "Kết quả / bài học"];
  return (
    <div className="space-y-3 text-sm">
      <p className="font-semibold">{rubric.provisional ? "Điểm tạm tính" : "Điểm checklist"}: {rubric.totalScore === null ? "Chưa đủ dữ liệu" : `${rubric.totalScore}/100`} · Đã chấm {rubric.assessedCount}/5 tiêu chí</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <caption className="text-left mb-2">Bộ tiêu chí phiên bản {rubric.version}</caption>
          <thead><tr><th className="p-2">Tiêu chí</th><th className="p-2">Mức /4</th><th className="p-2">Bằng chứng và lý do</th></tr></thead>
          <tbody>{CRITERIA.map(def => {
            const c = rubric.criteria.find(item => item.id === def.id);
            if (!c) return null;
            return <tr key={c.id} className="border-t border-surface-container"><td className="p-2">{def.name} ({def.weight}%)</td><td className="p-2">{c.status === "scored" ? c.level : c.status === "not_applicable" ? "Không áp dụng" : "Chưa đủ dữ liệu"}</td><td className="p-2">{c.evidence && <blockquote>“{c.evidence}”</blockquote>}<p>{c.reason}</p></td></tr>;
          })}</tbody>
        </table>
      </div>
      <p className="font-semibold">{rubric.structure.method}: {rubric.structure.status === "passed" ? "Đạt chuẩn cấu trúc" : rubric.structure.status === "failed" ? "Chưa đạt chuẩn cấu trúc" : "Chưa đủ dữ liệu"}</p>
      <ol className="list-decimal pl-5 space-y-1">{rubric.structure.steps.map((step, index) => <li key={index}>{steps[index]}: {step.present ? `Có — “${step.evidence}”` : "Chưa ghi nhận"}</li>)}</ol>
      <p>Đúng thứ tự: {rubric.structure.ordered === null ? "Chưa đủ dữ liệu" : rubric.structure.ordered ? "Có" : "Không"}.</p>
      <p className="text-on-surface-variant">Tác phong và chuẩn bị: tự đánh giá riêng, không cộng vào điểm nội dung. Bản chấm này chỉ sử dụng văn bản.</p>
    </div>
  );
}
