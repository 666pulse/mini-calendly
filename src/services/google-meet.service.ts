const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export interface GoogleMeetInfo {
  event_id: string;
  meeting_url: string;
}

function getProxy(): string | undefined {
  if (typeof process === "undefined") return undefined;
  return (
    process.env.https_proxy ||
    process.env.HTTPS_PROXY ||
    process.env.http_proxy ||
    process.env.HTTP_PROXY ||
    undefined
  );
}

async function getAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> {
  const proxy = getProxy();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    ...(proxy ? { proxy } : {}),
  } as any);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google OAuth token refresh failed: ${text}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function createMeeting(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  subject: string,
  startTime: string, // ISO 8601: 2026-04-15T09:00:00+08:00
  endTime: string,
  timeZone = "Asia/Singapore"
): Promise<GoogleMeetInfo> {
  const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);
  const proxy = getProxy();

  const payload = {
    summary: subject,
    start: { dateTime: startTime, timeZone },
    end: { dateTime: endTime, timeZone },
    conferenceData: {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  const res = await fetch(
    `${CALENDAR_API}/calendars/primary/events?conferenceDataVersion=1`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      ...(proxy ? { proxy } : {}),
    } as any
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Google Calendar API ${res.status}: ${text}\nRequest: ${JSON.stringify(payload)}`
    );
  }

  const event = (await res.json()) as {
    id: string;
    conferenceData?: {
      entryPoints?: { entryPointType: string; uri: string }[];
    };
  };

  const videoEntry = event.conferenceData?.entryPoints?.find(
    (ep) => ep.entryPointType === "video"
  );

  return {
    event_id: event.id,
    meeting_url: videoEntry?.uri || "",
  };
}

export async function cancelMeeting(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  eventId: string
): Promise<void> {
  const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);
  const proxy = getProxy();

  const res = await fetch(
    `${CALENDAR_API}/calendars/primary/events/${eventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
      ...(proxy ? { proxy } : {}),
    } as any
  );

  // 404/410 means already deleted — not an error
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const text = await res.text();
    throw new Error(`Google Calendar delete failed: ${text}`);
  }
}
