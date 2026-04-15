const API_URL = "https://mcp.meeting.tencent.com/mcp/wemeet-open/v1";

interface JsonRpcResponse {
  jsonrpc: string;
  result?: {
    content: { type: string; text: string }[];
  };
  error?: { code: number; message: string };
  id: number;
}

export interface MeetingInfo {
  meeting_id: string;
  meeting_code: string;
  join_url: string;
}

async function callApi(
  token: string,
  method: string,
  args: Record<string, unknown>
): Promise<string> {
  const proxy =
    typeof process !== "undefined"
      ? process.env.https_proxy || process.env.HTTPS_PROXY || process.env.http_proxy || process.env.HTTP_PROXY
      : undefined;

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Tencent-Meeting-Token": token,
      "X-Skill-Version": "v1.0.6",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: method, arguments: args },
      id: 1,
    }),
    ...(proxy ? { proxy } : {}),
  } as any);

  const data = (await res.json()) as JsonRpcResponse;

  if (data.error) {
    throw new Error(`Tencent Meeting API error: ${data.error.message}`);
  }

  return data.result?.content?.[0]?.text || "";
}

// Response text is JSON like: { status_code, headers, body: "{...}" }
// body is a JSON string containing meeting_info_list
function parseResponseBody(text: string): any {
  try {
    const outer = JSON.parse(text);
    if (outer.body) {
      return JSON.parse(outer.body);
    }
    return outer;
  } catch {
    return {};
  }
}

export async function createMeeting(
  token: string,
  subject: string,
  startTime: string, // ISO 8601: 2026-04-15T09:00:00+08:00
  endTime: string
): Promise<MeetingInfo> {
  const text = await callApi(token, "schedule_meeting", {
    subject,
    start_time: startTime,
    end_time: endTime,
  });

  const body = parseResponseBody(text);
  const info = body.meeting_info_list?.[0] || {};

  return {
    meeting_id: info.meeting_id || "",
    meeting_code: info.meeting_code || "",
    join_url: info.join_url || "",
  };
}

export async function cancelMeeting(
  token: string,
  meetingId: string
): Promise<void> {
  await callApi(token, "cancel_meeting", { meeting_id: meetingId });
}

export async function getMeeting(
  token: string,
  meetingId: string
): Promise<string> {
  return callApi(token, "get_meeting", { meeting_id: meetingId });
}
