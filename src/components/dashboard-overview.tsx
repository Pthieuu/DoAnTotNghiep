import Link from "next/link";
import Icon, { type IconName } from "@/components/icon";
import type { AuthUser } from "@/lib/auth-types";
import type { DashboardData } from "@/lib/dashboard-data";

const card = "rounded-xl border border-surface-container bg-surface-container-lowest p-5 shadow-sm";
const cvStatuses: Record<string, string> = { confirmed: "Đã xác nhận", parsed: "Chờ xác nhận", processing: "Đang xử lý", error: "Xử lý thất bại" };

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function Metric({ title, value, detail, icon }: { title: string; value: string; detail: string; icon: IconName }) {
  return <article className={card}>
    <div className="flex items-start justify-between gap-3"><h2 className="text-sm font-medium text-on-surface-variant">{title}</h2><span className="rounded-lg bg-secondary-fixed/50 p-2 text-secondary"><Icon name={icon} /></span></div>
    <p className="mt-3 text-2xl font-bold text-primary">{value}</p>
    <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{detail}</p>
  </article>;
}

function AnalyticsEmptyState({ icon, title, description, sessionId }: {
  icon: IconName; title: string; description: string; sessionId?: string;
}) {
  return <div className="mt-5 flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-secondary/25 bg-surface-container-low/60 px-5 py-7 text-center">
    <span aria-hidden="true" className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-secondary-fixed/60 text-secondary"><Icon name={icon} className="text-2xl" /></span>
    <span className="mb-2 text-xs font-semibold text-secondary">Chưa đánh giá</span>
    <h3 className="text-base font-bold text-primary">{title}</h3>
    <p className="mt-2 max-w-sm text-sm leading-relaxed text-on-surface-variant">{description}</p>
    <Link href="/interview-setup" className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"><Icon name="rocket_launch" />Start New Interview</Link>
    {sessionId && <Link href={`/summary?sessionId=${sessionId}`} className="mt-3 text-sm font-medium text-secondary underline underline-offset-4">Xem kết quả phiên gần nhất</Link>}
  </div>;
}

export function DashboardHero({ user, data }: { user: AuthUser; data: DashboardData }) {
  const target = text(data.profile?.target);
  const level = text(data.profile?.jlpt_level);
  const industries = Array.isArray(data.profile?.industries) ? data.profile.industries.filter((value): value is string => typeof value === "string" && !!value.trim()) : [];
  return <header className="rounded-xl bg-gradient-to-br from-primary via-primary-container to-secondary p-6 text-on-primary shadow-md">
    <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
      <div className="min-w-0 space-y-3">
        <p className="text-xs text-primary-fixed-dim">{user.email}</p>
        <h1 className="break-words text-2xl font-bold">Welcome, {text(data.profile?.full_name) || user.name}</h1>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-tertiary-fixed px-3 py-1.5 font-semibold text-on-tertiary-fixed">{level ? `Mức luyện tập: JLPT ${level}` : "Chưa chọn mức luyện tập JLPT"}</span>
          <span className="rounded-full bg-white/15 px-3 py-1.5">{target || "Chưa cập nhật vị trí mục tiêu"}</span>
        </div>
        {industries.length > 0 && <p className="text-sm text-primary-fixed-dim">{industries.join(" · ")}</p>}
        {!target && <Link href="/profile" className="inline-block text-sm font-semibold underline underline-offset-4">Cập nhật mục tiêu nghề nghiệp</Link>}
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/interview-setup" className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-bold text-primary"><Icon name="rocket_launch" />Start New Interview</Link>
        <Link href="/dashboard#practice" className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-4 py-3 text-sm font-semibold"><Icon name="bolt" />Practice Weaknesses</Link>
      </div>
    </div>
  </header>;
}

export function DashboardAnalytics({ data }: { data: DashboardData }) {
  const japanese = data.skills.find(skill => skill.id === "C05");
  const structure = data.skills.find(skill => skill.id === "C03");
  const percent = (value: number | null | undefined) => value === null || value === undefined ? "Chưa đánh giá" : `${value}%`;
  const hasSkillData = data.skills.some(skill => skill.percent !== null);
  return <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric title="Completed Interviews" value={data.completedCount === null ? "Chưa tải được" : String(data.completedCount)} detail="Số phiên đã hoàn thành trong tài khoản, bao gồm phiên kết thúc sớm." icon="video_chat" />
      <Metric title="Average Score" value={data.averageScore === null ? "Chưa đánh giá" : `${data.averageScore}/100`} detail={`${data.scoredCount} phiên có điểm chính thức cùng phạm vi trong tối đa 20 phiên hoàn thành gần nhất.`} icon="grade" />
      <Metric title="Tiếng Nhật truyền đạt ý · C05" value={percent(japanese?.percent)} detail={japanese?.assessedAnswers ? `Dựa trên ${japanese.assessedAnswers} câu được chấm ở phiên hoàn thành gần nhất.` : "Chưa có câu trả lời tiếng Nhật được chấm hợp lệ."} icon="record_voice_over" />
      <Metric title="Cấu trúc PREP/STAR · C03" value={percent(structure?.percent)} detail={structure?.assessedAnswers ? `Dựa trên ${structure.assessedAnswers} câu được chấm ở phiên hoàn thành gần nhất.` : "Chưa có dữ liệu chấm cấu trúc hợp lệ."} icon="analytics" />
    </div>
    <section id="analytics" aria-label="Phân tích phỏng vấn" className="grid scroll-mt-24 gap-5 lg:grid-cols-12">
      <section aria-labelledby="score-progression-heading" className={`${card} lg:col-span-7`}>
        <h2 id="score-progression-heading" className="text-lg font-bold text-primary">Interview Scores &amp; Progress</h2>
        <p className="mt-1 text-sm text-on-surface-variant">Tối đa 5 phiên có điểm chính thức, cùng phạm vi đánh giá với phiên được chấm gần nhất.</p>
        {data.scores.length ? <div aria-label="Điểm các phiên phỏng vấn" className="mt-5 flex h-56 items-end justify-center gap-3 sm:gap-6">
          {data.scores.map(session => <Link key={session.id} href={`/summary?sessionId=${session.id}`} aria-label={`${session.title}: ${session.score}/100`} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
            <span className="text-sm font-semibold text-primary">{session.score}</span>
            <div className="flex h-40 w-full max-w-12 items-end rounded-t-lg bg-surface-container-low"><div className="w-full rounded-t-lg bg-secondary" style={{ height: `${session.score}%`, minHeight: session.score === 0 ? 2 : undefined }} /></div>
            <span className="max-w-full truncate text-xs text-on-surface-variant">{session.completed_at ? new Date(session.completed_at).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "Chưa rõ ngày"}</span>
          </Link>)}
        </div> : <AnalyticsEmptyState icon="ssid_chart" title="Bắt đầu hành trình theo dõi tiến bộ"
          description={data.skillSession ? "Chưa có điểm tổng kết chính thức phù hợp để vẽ biểu đồ. Xem kết quả phiên gần nhất hoặc hoàn thành một buổi phỏng vấn mới để tiếp tục theo dõi." : "Hoàn thành buổi phỏng vấn đầu tiên và xem kết quả. Điểm số thực tế sẽ xuất hiện tại đây để bạn theo dõi qua từng lần luyện tập."}
          sessionId={data.skillSession?.id} />}
        {data.scores.length > 0 && <p className="mt-4 rounded-lg bg-surface-container-low p-3 text-sm text-on-surface-variant">{data.trend === null ? "Chưa đủ hai phiên cùng phạm vi để tính thay đổi điểm." : `Thay đổi giữa phiên đầu và cuối trên biểu đồ: ${data.trend > 0 ? "+" : ""}${data.trend} điểm.`} Điểm luyện tập không dự đoán khả năng đậu phỏng vấn.</p>}
      </section>
      <section aria-labelledby="skill-breakdown-heading" className={`${card} lg:col-span-5`}>
        <h2 id="skill-breakdown-heading" className="text-lg font-bold text-primary">Skill Breakdown</h2>
        <p className="mt-1 text-sm text-on-surface-variant">{data.skillSession ? `Rubric của phiên hoàn thành gần nhất: ${data.skillSession.title}` : "Chưa có phiên phỏng vấn hoàn thành."}</p>
        {hasSkillData ? <><ul className="mt-5 space-y-5">{data.skills.map(skill => <li key={skill.id} className="space-y-2">
          <div className="flex justify-between gap-3 text-sm"><span className="font-medium text-primary">{skill.name}</span><span className="shrink-0 font-semibold text-secondary">{percent(skill.percent)}</span></div>
          {skill.percent !== null && <div role="progressbar" aria-label={skill.name} aria-valuenow={skill.percent} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-surface-container"><div className="h-full rounded-full bg-secondary" style={{ width: `${skill.percent}%` }} /></div>}
          <p className="text-xs text-on-surface-variant">{skill.assessedAnswers ? `${skill.assessedAnswers} câu được chấm · mức 0–4 quy đổi sang %` : "Chưa có dữ liệu chấm hợp lệ; không tính là 0 điểm."}</p>
        </li>)}</ul>
        <Link href="/dashboard#practice" className="mt-5 inline-block text-sm font-semibold text-secondary underline underline-offset-4">Practice Focus Areas</Link>
        {data.skills.some(skill => skill.percent === null) && <div className="mt-4 rounded-lg bg-surface-container-low p-3 text-sm text-on-surface-variant">
          <p>Một số tiêu chí chưa được đánh giá. Luyện thêm một phiên mới để bổ sung dữ liệu.</p>
          <Link href="/interview-setup" className="mt-2 inline-block font-semibold text-secondary underline underline-offset-4">Start New Interview</Link>
        </div>}</> : <AnalyticsEmptyState icon="stacked_bar_chart" title="Khám phá điểm mạnh và mục tiêu cải thiện"
          description={data.skillSession ? "Phiên gần nhất chưa có dữ liệu chấm kỹ năng hợp lệ. Bắt đầu một phiên mới và gửi câu trả lời để nhận đánh giá theo từng tiêu chí." : "Bắt đầu phỏng vấn và gửi câu trả lời của bạn. Khi được chấm, từng kỹ năng sẽ hiển thị ở đây để giúp bạn chọn mục tiêu luyện tập tiếp theo."}
          sessionId={data.skillSession?.id} />}
      </section>
    </section>
  </>;
}

export function DashboardContext({ data }: { data: DashboardData }) {
  const skills = Array.isArray(data.profile?.technical_skills) ? data.profile.technical_skills.flatMap(item => typeof item?.name === "string" && item.name.trim() ? [item.name] : []) : [];
  const cvSkills = data.confirmedCv?.skills ?? [];
  const technology = [...new Set([...skills, ...cvSkills])];
  const target = text(data.profile?.target);
  return <section id="profile" aria-label="Mục tiêu công việc và CV" className="grid scroll-mt-24 gap-5 lg:grid-cols-2">
    <div className={`${card} space-y-4`}>
      <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-primary">Target Job &amp; CV</h2><Link href="/cv" className="text-sm font-semibold text-secondary underline underline-offset-4">Quản lý CV</Link></div>
      <div><h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Vị trí mục tiêu · My Profile</h3><p className="mt-1 text-sm text-primary">{target || "Chưa cập nhật vị trí mục tiêu."}</p></div>
      {data.cv ? <div className="rounded-xl border border-surface-container p-4 space-y-2">
        <p className="break-words text-sm font-semibold text-primary">{data.cv.file_name}</p>
        <span className="inline-block rounded-full bg-secondary-fixed px-2.5 py-1 text-xs font-semibold text-primary">{cvStatuses[data.cv.status] || "Chưa rõ trạng thái"}</span>
        {data.confirmedCv?.summary && <p className="whitespace-pre-wrap break-words text-sm text-on-surface-variant">{data.confirmedCv.summary}</p>}
        {data.confirmedCv?.expectations && <p className="whitespace-pre-wrap text-sm text-on-surface-variant"><strong>Định hướng từ CV:</strong> {data.confirmedCv.expectations}</p>}
        {!data.confirmedCv && <p className="text-sm text-on-surface-variant">CV chưa có dữ liệu đã xác nhận để hiển thị.</p>}
      </div> : <p className="rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant">Chưa có CV được lưu. Tải CV lên hoặc nhập hồ sơ tại My CV.</p>}
      <div><h3 className="mb-2 text-xs font-semibold text-on-surface-variant">Kỹ năng khai báo từ Profile / CV đã xác nhận</h3>{technology.length ? <ul className="flex flex-wrap gap-2">{technology.map(name => <li key={name} className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-medium text-primary">{name}</li>)}</ul> : <p className="text-sm text-on-surface-variant">Chưa khai báo kỹ năng công nghệ.</p>}</div>
    </div>
    <div className={`${card} space-y-4`}>
      <h2 className="text-lg font-bold text-primary">Ngữ cảnh phỏng vấn gần nhất</h2>
      {data.latest ? <>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-on-surface-variant">Vị trí</dt><dd className="break-words font-semibold text-primary">{data.latest.target_role || data.latest.title}</dd>
          <dt className="text-on-surface-variant">Công ty</dt><dd>{data.latest.company || "Chưa cung cấp"}</dd>
          <dt className="text-on-surface-variant">JLPT</dt><dd>{data.latest.level || "Chưa chọn"}</dd>
          <dt className="text-on-surface-variant">Số câu dự kiến</dt><dd>{data.latest.question_count}</dd>
          <dt className="text-on-surface-variant">Ngôn ngữ</dt><dd>{data.latest.interview_language === "ja" ? "Tiếng Nhật" : data.latest.interview_language === "vi" ? "Tiếng Việt" : "Chưa chọn"}</dd>
        </dl>
        <div><h3 className="mb-2 text-xs font-semibold text-on-surface-variant">JD đã dùng trong phiên này</h3><p className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant">{data.latest.job_description || "Phiên gần nhất chưa có mô tả công việc (JD)."}</p></div>
        <Link href={data.latest.status === "completed" ? `/summary?sessionId=${data.latest.id}` : data.latest.status === "in_progress" ? `/interview-room?sessionId=${data.latest.id}` : "/interview-setup"} className="inline-block text-sm font-semibold text-secondary underline underline-offset-4">{data.latest.status === "completed" ? "Xem kết quả phiên gần nhất" : data.latest.status === "in_progress" ? "Tiếp tục phiên đang luyện" : "Thiết lập phiên mới"}</Link>
      </> : <p className="text-sm text-on-surface-variant">Chưa có phiên phỏng vấn để hiển thị ngữ cảnh CV/JD.</p>}
      <Link href="/interview-setup" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white"><Icon name="videocam" />Thiết lập phỏng vấn</Link>
    </div>
  </section>;
}
