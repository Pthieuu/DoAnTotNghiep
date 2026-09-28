// Local SVGs keep interface icons available without downloading an icon font.
const paths = {
  mic: "M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5 M5 10v2a7 7 0 0 0 14 0v-2 M12 19v3 M8 22h8",
  translate: "M3 5h12 M9 2v3 M5 5c0 5 3 8 8 10 M12 5c0 5-3 8-8 10 M14 21l4-10 4 10 M16 17h4",
  person: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2",
  verified: "m12 2 3 2 4 .5.5 4L22 12l-2.5 3.5-.5 4-4 .5-3 2-3-2-4-.5-.5-4L2 12l2.5-3.5.5-4L9 4Z m-5 10 3 3 6-6",
  verified_user: "m12 2 8 3v6c0 5-4 9-8 11-4-2-8-6-8-11V5Z m-4 10 3 3 5-6",
  school: "m2 9 10-5 10 5-10 5Z M6 11v6q6 5 12 0v-6 M22 9v8",
  arrow_forward: "M4 12h16 m-6-6 6 6-6 6",
  chevron_right: "m9 5 7 7-7 7",
  play_arrow: "m8 4 12 8-12 8Z",
  play_circle: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M10 8l6 4-6 4Z",
  psychology: "M8 22v-5H5v-4H2l3-5a8 8 0 1 1 14 7v7 M10 8h6 M10 11h6 M12 6v7 M15 6v7",
  bolt: "m13 2-9 12h7l-1 8 10-13h-7Z",
  insights: "M3 3v18h18 M6 15l4-5 4 3 6-8 M16 5h4v4",
  check_circle: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 m-15 0 3 3 7-7",
  volume_up: "M3 9h4l5-5v16l-5-5H3Z M16 8a6 6 0 0 1 0 8 M19 4a11 11 0 0 1 0 16",
  description: "M14 2H5v20h14V7Z M14 2v5h5 M8 11h8 M8 15h8 M8 18h5",
  close: "m6 6 12 12 M6 18 18 6",
  check: "m4 12 5 5L20 6",
  manage_accounts: "M13 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M2 21v-2a7 7 0 0 1 11-6 M20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M17 11v2 M17 19v2 M12 16h2 M20 16h2 m-9-4 2 2 m4 4 2 2 m0-8-2 2 m-4 4-2 2",
  account_tree: "M3 3h7v5H3Z M14 3h7v5h-7Z M14 16h7v5h-7Z M10 5.5h4 M10 5.5h2v13h2",
  spellcheck: "m3 16 5-13 5 13 M5 11h6 m2 8 3 3 6-7",
  graphic_eq: "M3 10v4 M7 6v12 M12 2v20 M17 6v12 M21 10v4",
  troubleshoot: "M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0 m-2 6 6 6 M5 11l3-4 3 6 3-4",
  help: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5 M12 17h.01",
  groups: "M10 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M20 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M1 21v-2a6 6 0 0 1 12 0v2 M13 13a6 6 0 0 1 10 6v2",
  fact_check: "M4 3h16v18H4Z M7 8h3 M7 13h3 M7 17h7 m-1-8 2 2 3-4",
  mail: "M3 5h18v14H3Z m0 0 9 7 9-7",
  lock: "M5 10h14v12H5Z M8 10V6a4 4 0 0 1 8 0v4 M12 15v3",
  visibility: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  visibility_off: "m3 3 18 18 M10 5q8-1 12 7l-3 4 M6 6q-3 2-4 6s3 7 10 7q3 0 5-2 M10 10a3 3 0 0 0 4 4",
} as const;

export type IconName = keyof typeof paths;

export default function Icon({ name }: { name: IconName }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      <path d={paths[name]} />
    </svg>
  );
}
