import { CRITERIA, type RubricResult } from "@/lib/interview-rubric";

export default function RubricDetails({ rubric }: { rubric: RubricResult }) {
  const steps = rubric.structure.method === "PREP" ? ["Point", "Reason", "Example", "Point"] : ["Situation", "Task", "Action", "Result / Learning"];
  return (
    <div className="space-y-3 text-sm">
      <p className="font-semibold">{rubric.provisional ? "Provisional Score" : "Checklist Score"}: {rubric.totalScore === null ? "Insufficient data" : `${rubric.totalScore}/100`} · Evaluated {rubric.assessedCount}/5 criteria</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <caption className="text-left mb-2">Rubric criteria version {rubric.version}</caption>
          <thead><tr><th className="p-2">Criterion</th><th className="p-2">Level /4</th><th className="p-2">Evidence and Reason</th></tr></thead>
          <tbody>{CRITERIA.map(def => {
            const c = rubric.criteria.find(item => item.id === def.id);
            if (!c) return null;
            return <tr key={c.id} className="border-t border-surface-container"><td className="p-2">{def.name} ({def.weight}%)</td><td className="p-2">{c.status === "scored" ? c.level : c.status === "not_applicable" ? "Not applicable" : "Insufficient data"}</td><td className="p-2">{c.evidence && <blockquote>“{c.evidence}”</blockquote>}<p>{c.reason}</p></td></tr>;
          })}</tbody>
        </table>
      </div>
      <p className="font-semibold">{rubric.structure.method}: {rubric.structure.status === "passed" ? "Meets structural standards" : rubric.structure.status === "failed" ? "Does not meet structural standards" : "Insufficient data"}</p>
      <ol className="list-decimal pl-5 space-y-1">{rubric.structure.steps.map((step, index) => <li key={index}>{steps[index]}: {step.present ? `Present — “${step.evidence}”` : "Not observed"}</li>)}</ol>
      <p>Correct order: {rubric.structure.ordered === null ? "Insufficient data" : rubric.structure.ordered ? "Yes" : "No"}.</p>
      <p className="text-on-surface-variant">Manner and preparation: evaluated separately and not factored into the content score. This evaluation is text-based only.</p>
    </div>
  );
}
