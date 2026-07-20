export interface AuthUser {
  name: string;
  role: "admin" | "user";
  status: string;
  token: string;
}

export interface CollegeRow {
  sr_no: number;
  college_code: string;
  college_name: string;
  district: string;
  branch: string;
  category: string;
  status: string;
  cutoff_percentile: number | null;
  cutoff_rank: number | null;
}

export interface PredictResult {
  student_name: string;
  exam: string;
  mode: string;
  value: number;
  category: string;
  branches: string[];
  districts: string[];
  show_category: boolean;
  count: number;
  results: CollegeRow[];
  prediction_id: number | null;
}

export interface ExamMeta {
  branches: string[];
  categories: string[];
  districts: string[];
  quotas: string[];
}

export interface Meta {
  exams: string[];
  by_exam: Record<string, ExamMeta>;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  mobile: string;
  city: string;
  state: string;
  status: string;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
  prediction_count: number;
  session_active: boolean;
}

export interface Stats {
  total_users: number;
  pending_users: number;
  approved_users: number;
  rejected_users: number;
  total_predictions: number;
  todays_predictions: number;
  total_downloads: number;
  by_exam_today: Record<string, number>;
  by_exam_total: Record<string, number>;
}
