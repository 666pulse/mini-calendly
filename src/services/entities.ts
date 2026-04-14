export interface EventType {
  id: number;
  slug: string;
  name: string;
  host_name: string;
  duration_minutes: number;
  description: string;
  color: string;
  custom_fields: string; // JSON: CustomField[]
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
