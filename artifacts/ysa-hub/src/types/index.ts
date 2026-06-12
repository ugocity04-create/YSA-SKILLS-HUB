export type UserRole = "student" | "instructor" | "admin";
export type MemberStatus = "member" | "friend";
export type TransferStatus = "pending" | "approved" | "rejected";
export type NotificationType = "info" | "success" | "warning";
export type ReminderRecipientType = "all" | "activity" | "specific";

export interface Profile {
  id: string;           // = auth.uid() — the Supabase auth user UUID
  name: string;
  email: string;
  phone?: string;
  ward?: string;
  stake?: string;
  role: UserRole;
  member_status: MemberStatus;
  activity_id?: string;
  instructing_activity_id?: string;
  referral_source?: string;
  avatar_url?: string;
  notify_email?: boolean;
  notify_whatsapp?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  name: string;
  description?: string;
  instructor_id?: string;
  max_members?: number;
  current_members?: number;
  schedule?: string;
  location?: string;
  created_at: string;
}

export interface Attendance {
  id: string;
  member_id: string;
  activity_id: string;
  check_in_time: string;
  session_date: string;
  checked_in_by?: string;
  created_at: string;
  profiles?: Profile;
  activities?: Activity;
}

export interface TransferRequest {
  id: string;
  member_id: string;
  from_activity_id: string;
  to_activity_id: string;
  reason?: string;
  status: TransferStatus;
  reviewed_by?: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  from_activity?: Activity;
  to_activity?: Activity;
}

export interface Reminder {
  id: string;
  title: string;
  message: string;
  channel: "email" | "whatsapp" | "both";
  scheduled_for: string;
  recipient_type: ReminderRecipientType;
  activity_id?: string;
  recipient_ids?: string[];
  sent: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  created_at: string;
}

export const WARDS = [
  "Akute Ward",
  "Ibafo Ward",
  "Iju Ward",
  "Mowe Ward",
  "Ogba Ward",
  "Ojodu Ward",
  "Omole Ward",
] as const;

export const ACTIVITIES = [
  { id: "product-management", name: "Product Management", icon: "💼", capacity: 30 },
  { id: "cinematography", name: "Cinematography", icon: "🎬", capacity: 20 },
  { id: "it", name: "IT", icon: "💻", capacity: 35 },
  { id: "fashion-designer", name: "Fashion Designer", icon: "👗", capacity: 25 },
  { id: "barbing", name: "Barbing", icon: "✂️", capacity: 20 },
  { id: "hair-dressers", name: "Hair Dressers", icon: "💇", capacity: 20 },
  { id: "wig-making", name: "Wig Making", icon: "👱", capacity: 20 },
  { id: "catering", name: "Catering", icon: "🍽️", capacity: 25 },
] as const;

export const STAKE_NAME = "Ojodu Stake";

export function getDefaultRedirect(role: UserRole): string {
  if (role === "admin") return "/admin";
  if (role === "instructor") return "/instructor-dashboard";
  return "/dashboard";
}
