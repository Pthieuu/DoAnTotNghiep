// Local SVGs keep interface icons available without downloading an icon font.
const paths = {
  home: "M3 10l9-8 9 8 M5 9v13h14V9 M9 22v-8h6v8",
  business_center: "M3 7h18v14H3Z M8 7V3h8v4 M3 12q9 6 18 0 M10 13h4v3h-4Z",
  videocam: "M3 5h12v14H3Z m12 5 7-4v12l-7-4",
  video_chat: "M3 5h12v14H3Z m12 5 7-4v12l-7-4 M6 10h6 M9 7v6",
  track_changes: "M22 12a10 10 0 1 1-10-10 M18 12a6 6 0 1 1-6-6 M12 12 22 2 M17 2h5v5",
  history: "M3 11a9 9 0 1 1 2 7 M3 3v8h8 M12 7v6l4 2",
  logout: "M10 3H3v18h7 M8 12h14 m-5-5 5 5-5 5",
  menu: "M3 5h18 M3 12h18 M3 19h18",
  notifications: "M5 17h14l-2-4V8a5 5 0 0 0-10 0v5Z M10 21h4 M12 1v2",
  event_upcoming: "M3 5h18v17H3Z M7 2v6 M17 2v6 M3 10h18 M9 16h6 m-3-3 3 3-3 3",
  grade: "m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z",
  record_voice_over: "M12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M1 22v-3a7 7 0 0 1 14 0v3 M16 5q5 4 0 8 M19 2q8 7 0 14",
  rocket_launch: "M9 15C9 7 15 2 22 2c0 7-5 13-13 13Z M9 8H5l-3 6h7 M16 15v4l-6 3v-7 M5 18l-3 4 M18 7h.01",
  settings_suggest: "M10 4l2-2 2 2 3 1v3l2 2-2 2v3l-3 1-2 2-2-2-3-1v-3l-2-2 2-2V5Z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M20 17v6 M17 20h6",
  shopping_cart: "M2 3h3l3 13h11l3-10H6 M10 21h.01 M18 21h.01",
  apartment: "M4 22V3h12v19 M16 10h5v12 M8 7h4 M8 11h4 M8 15h4 M9 22v-3h3v3",
  badge: "M3 5h18v17H3Z M9 2h6v6H9Z M11 13a2 2 0 1 1-4 0 2 2 0 0 1 4 0 M5 20v-1a4 4 0 0 1 8 0v1 M15 12h3 M15 16h3",
  edit_document: "M13 2H4v20h8 M13 2v6h6V8Z m0 16 2-6 6-6 4 4-6 6Z",
  open_in_new: "M14 3h7v7 M21 3 10 14 M10 3H3v18h18v-7",
  autorenew: "M3 10a9 9 0 0 1 16-5l2 3 M21 2v6h-6 M21 14a9 9 0 0 1-16 5l-2-3 M3 22v-6h6",
  smart_toy: "M4 7h16v14H4Z M12 7V3 M9 3h6 M1 11v6 M23 11v6 M8 12h.01 M16 12h.01 M8 17h8",
  ssid_chart: "M3 3v18h18 M5 17l5-7 5 3 6-9",
  stacked_bar_chart: "M3 21h19 M5 17V9h3v8Z M11 17V3h3v14Z M17 17v-6h3v6Z",
  analytics: "M3 3h18v18H3Z M7 17v-5 M12 17V7 M17 17v-8",
  contact_support: "M3 3h18v14H9l-6 5Z M9 8a3 3 0 0 1 6 0c0 2-3 1-3 4 M12 14h.01",
  lightbulb: "M9 18h6 M9 22h6 M8 15a7 7 0 1 1 8 0v3H8Z",
  priority_high: "M12 3v12 M12 20h.01",
  terminal: "M2 4h20v16H2Z m4 5 4 3-4 3 M13 16h5",
  trending_up: "m2 18 7-7 4 4 9-11 M16 4h6v6",
  tune: "M3 6h7 M14 6h7 M3 18h11 M18 18h3 M10 3v6 M14 15v6",
  photo_camera: "M3 7h4l2-3h6l2 3h4v13H3Z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  work_outline: "M3 7h18v14H3Z M8 7V4h8v3 M3 12q9 5 18 0 M10 13h4v3h-4Z",
  location_on: "M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  save: "M4 3h14l3 3v15H3V3Z M7 3v6h10V3 M7 21v-8h10v8",
  calendar_today: "M3 5h18v17H3Z M7 2v6 M17 2v6 M3 10h18",
  add: "M12 5v14 M5 12h14",
  edit: "m3 17 12-12 4 4L7 21H3Z M14 6l4 4",
  target: "M22 12a10 10 0 1 1-10-10 M18 12a6 6 0 1 1-6-6 M12 12 22 2 M17 2h5v5",
  shopping_bag: "M4 8h16l-1 13H5Z M9 8V6a3 3 0 0 1 6 0v2",
  payments: "M2 6h20v14H2Z M2 10h20 M12 13a2 2 0 1 0 0 4 2 2 0 0 0 0-4 M6 14h.01 M18 16h.01 M5 3h16",
  cloud: "M7 18a5 5 0 1 1 1-10 6 6 0 0 1 11 2 4 4 0 0 1 0 8Z",
  deployed_code: "m12 2 9 5-9 5-9-5Z M3 12l9 5 9-5 M3 17l9 5 9-5 M12 12v5",
  history_edu: "M4 3h16v18H4Z M8 7h8 M8 11h8 M8 15h4 M3 3l2 2 M12 21l-2-5 4-4 4 4-4 4Z",
  domain: "M4 22V3h12v19 M16 10h5v12 M8 7h4 M8 11h4 M8 15h4 M9 22v-3h3v3",

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
