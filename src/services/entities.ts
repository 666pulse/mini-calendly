export interface EventType {
  id: number;
  slug: string;
  name: string;
  host_name: string;
  duration_minutes: number;
  description: string;
  color: string;
  custom_fields: string; // JSON: CustomField[]
  meeting_provider: string; // 'none' | 'static' | 'tencent' | 'google'
  meeting_url: string;     // static URL or auto-generated
  published: number;       // 1 = published, 0 = draft
  start_date: string | null; // YYYY-MM-DD
  end_date: string | null;   // YYYY-MM-DD
  created_at: string;
}

export interface CustomField {
  key: string;
  label: string;
  required: boolean;
}

export type BookingStatus = "confirmed" | "cancelled";

export interface Booking {
  id: number;
  event_type_id: number;
  invitee_name: string;
  invitee_email: string;
  start_time: string;
  end_time: string;
  timezone: string;
  notes: string;
  status: BookingStatus;
  cancel_reason: string;
  cancel_token: string;
  meeting_id: string;
  meeting_code: string;
  meeting_url: string;
  custom_data: string; // JSON: Record<string, string>
  created_at: string;
}

export interface BookingWithEvent extends Booking {
  event_name: string;
}

export interface Availability {
  id: number;
  event_type_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
}
