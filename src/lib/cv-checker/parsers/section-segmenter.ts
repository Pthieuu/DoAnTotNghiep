import { CvParsedSections } from "../types";

interface SectionHeadingDef {
  key: keyof Omit<
    CvParsedSections,
    "rawText" | "fileName" | "fileType" | "detectedHeadings" | "missingHeadings" | "otherText"
  >;
  canonicalTitleJa: string;
  patterns: RegExp[];
}

const SECTION_DEFINITIONS: SectionHeadingDef[] = [
  {
    key: "personalInfoText",
    canonicalTitleJa: "基本情報（氏名・住所・連絡先）",
    patterns: [/基本情報/i, /個人情報/i, /氏名/i, /プロフィール/i],
  },
  {
    key: "educationWorkText",
    canonicalTitleJa: "学歴・職歴",
    patterns: [/学歴\s*・\s*職歴/i, /学歴/i, /職歴/i, /学歴および職歴/i],
  },
  {
    key: "certificatesText",
    canonicalTitleJa: "免許・資格",
    patterns: [/免許\s*・\s*資格/i, /資格\s*・\s*免許/i, /免許・資格・賞罰/i, /保有資格/i],
  },
  {
    key: "skillsHobbiesText",
    canonicalTitleJa: "趣味・得意科目",
    patterns: [/趣味\s*・\s*得意科目/i, /得意科目/i, /趣味\s*・\s*特技/i, /スキル/i, /技術スタック/i],
  },
  {
    key: "jikoPrText",
    canonicalTitleJa: "自己PR",
    patterns: [/自己\s*PR/i, /自己アピール/i, /私の強み/i],
  },
  {
    key: "shibouDoukiText",
    canonicalTitleJa: "志望動機",
    patterns: [/志望動機/i, /志望理由/i, /志望の動機/i],
  },
];

export function segmentCvSections(
  rawText: string,
  fileName: string = "uploaded_cv.pdf",
  fileType: "pdf" | "docx" = "pdf"
): CvParsedSections {
  const detectedHeadings: string[] = [];
  const missingHeadings: string[] = [];

  // Match locations of section headers in the text
  interface HeaderLocation {
    index: number;
    headingText: string;
    def: SectionHeadingDef;
  }

  const matches: HeaderLocation[] = [];

  for (const def of SECTION_DEFINITIONS) {
    let found = false;
    for (const pattern of def.patterns) {
      const match = pattern.exec(rawText);
      if (match) {
        matches.push({
          index: match.index,
          headingText: match[0],
          def,
        });
        detectedHeadings.push(def.canonicalTitleJa);
        found = true;
        break;
      }
    }
    if (!found) {
      // Personal info might not have a formal heading in traditional rirekisho
      if (def.key !== "personalInfoText") {
        missingHeadings.push(def.canonicalTitleJa);
      }
    }
  }

  // Sort matches by their appearance in the text
  matches.sort((a, b) => a.index - b.index);

  const sectionsContent: Record<string, string> = {
    personalInfoText: "",
    educationWorkText: "",
    certificatesText: "",
    skillsHobbiesText: "",
    jikoPrText: "",
    shibouDoukiText: "",
    otherText: "",
  };

  // If there's text before the first formal header, it's typically personal info
  if (matches.length > 0) {
    const firstHeader = matches[0];
    if (firstHeader.index > 0) {
      sectionsContent.personalInfoText = rawText.slice(0, firstHeader.index).trim();
    }

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const nextIndex = i + 1 < matches.length ? matches[i + 1].index : rawText.length;
      const content = rawText.slice(current.index, nextIndex).trim();

      const existing = sectionsContent[current.def.key] || "";
      sectionsContent[current.def.key] = existing ? `${existing}\n\n${content}` : content;
    }
  } else {
    // If no headings were matched at all, treat top as personal info and rest as other
    sectionsContent.personalInfoText = rawText.slice(0, 500);
    sectionsContent.otherText = rawText;
  }

  return {
    rawText,
    fileName,
    fileType,
    personalInfoText: sectionsContent.personalInfoText,
    educationWorkText: sectionsContent.educationWorkText,
    certificatesText: sectionsContent.certificatesText,
    skillsHobbiesText: sectionsContent.skillsHobbiesText,
    jikoPrText: sectionsContent.jikoPrText,
    shibouDoukiText: sectionsContent.shibouDoukiText,
    otherText: sectionsContent.otherText,
    detectedHeadings,
    missingHeadings,
  };
}

