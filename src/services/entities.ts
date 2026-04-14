export interface EventType {
  id: number;
  slug: string;
  name: string;
  host_name: string;
  duration_minutes: number;
  description: string;
  color: string;
  created_at: string;
}

export interface Booking {
  id: number;
  event_type_id: number;
  invitee_name: string;
  invitee_email: string;
  start_time: string;
  end_time: string;
  timezone: string;
  notes: string;
  status: string;
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
