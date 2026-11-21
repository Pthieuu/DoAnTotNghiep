/** Opening is separate from planned/scored questions. Resumed legacy sessions keep their progress. */
export function needsIntroduction(status: string, answeredCount: number, introduction: string | null | undefined): boolean {
  return status === "in_progress" && answeredCount === 0 && !introduction;
}

export function interviewOpening(language: string | null | undefined) {
  const translation = "Cảm ơn bạn đã tham gia buổi luyện phỏng vấn hôm nay. Tôi là Hiro, AI phụ trách phỏng vấn. Rất mong được trao đổi với bạn. Trước tiên, bạn hãy giới thiệu ngắn gọn về bản thân nhé.";
  return {
    text: language === "ja"
      ? "本日は面接の練習にご参加いただき、ありがとうございます。面接官を担当するAIのヒロです。よろしくお願いいたします。それでは、まず簡単に自己紹介をお願いいたします。"
      : translation,
    translation: language === "ja" ? translation : "",
    focus: "introduction",
  };
}

export function introductionThanks(language: string | null | undefined): string {
  return language === "ja" ? "自己紹介ありがとうございます。それでは、最初の質問です。" : "Cảm ơn bạn đã giới thiệu. Chúng ta bắt đầu câu hỏi đầu tiên nhé.";
}
