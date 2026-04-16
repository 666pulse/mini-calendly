// Google Meet logo (simplified colored SVG)
function GoogleMeetIcon({ size = 4 }: { size?: number }) {
  const cls = `w-${size} h-${size}`;
  return (
    <svg class={cls} viewBox="0 0 24 24" fill="none">
      <path d="M14.5 10.5L18.8 7.2C19.3 6.8 20 7.2 20 7.8V16.2C20 16.8 19.3 17.2 18.8 16.8L14.5 13.5V10.5Z" fill="#00832d" />
      <rect x="3" y="6" width="12" height="12" rx="2" fill="#00ac47" />
      <path d="M9 10L7 12L9 14" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M11 10L13 12L11 14" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

// Tencent Meeting logo (simplified blue icon)
function TencentMeetingIcon({ size = 4 }: { size?: number }) {
  const cls = `w-${size} h-${size}`;
  return (
    <svg class={cls} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="4" width="20" height="16" rx="3" fill="#006eff" />
      <path d="M15 10l3-1.5v7L15 14" fill="#4d9aff" />
      <rect x="5" y="8" width="9" height="8" rx="1.5" fill="white" />
    </svg>
  );
}

// Generic video icon
function VideoIcon({ size = 4 }: { size?: number }) {
  const cls = `w-${size} h-${size} text-slate-500`;
  return (
    <svg class={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function MeetingIcon({ provider, size }: { provider?: string; size?: number }) {
  if (provider === "google") return <GoogleMeetIcon size={size} />;
  if (provider === "tencent") return <TencentMeetingIcon size={size} />;
  return <VideoIcon size={size} />;
}

const brandConfig: Record<string, { label: string; btnClass: string }> = {
  google: {
    label: "Google Meet",
    btnClass: "bg-[#00ac47] text-white hover:bg-[#009a3e]",
  },
  tencent: {
    label: "腾讯会议",
    btnClass: "bg-[#006eff] text-white hover:bg-[#005ce6]",
  },
};

const defaultBrand = {
  label: "加入会议",
  btnClass: "bg-indigo-600 text-white hover:bg-indigo-700",
};

export function MeetingButton({ provider, url }: { provider?: string; url: string }) {
  const brand = brandConfig[provider || ""] || defaultBrand;
  return (
    <a
      href={url}
      target="_blank"
      class={`inline-flex items-center gap-2 mt-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow ${brand.btnClass}`}
    >
      <MeetingIcon provider={provider} size={4} />
      {brand.label}
    </a>
  );
}
