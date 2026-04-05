/**
 * Typed API client for CareerNode backend.
 * All requests use relative paths → Next.js rewrites() proxies them to FastAPI.
 */
import { JobsPage, MatchOutput } from "@/lib/types";

const BASE = "";

async function request<T>(
  path: string,
  options?: RequestInit & { token?: string }
): Promise<T> {
  const { token, ...init } = options ?? {};
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // non-JSON error body
    }
    throw new Error(detail);
  }
  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  /** GET /api/jobs — paginated job feed (public) */
  getJobs(page = 1, pageSize = 20, level?: string): Promise<JobsPage> {
    let url = `/api/jobs?page=${page}&page_size=${pageSize}`;
    if (level) {
      url += `&level=${encodeURIComponent(level)}`;
    }
    return request<JobsPage>(url);
  },

  /** POST /api/match — AI analysis for a job (auth required) */
  match(jobId: string, token: string): Promise<MatchOutput> {
    return request<MatchOutput>("/api/match", {
      method: "POST",
      token,
      body: JSON.stringify({ job_id: jobId }),
    });
  },

  /** GET /api/user-context (auth required) */
  getUserContext(token: string) {
    return request<{
      id: string;
      user_id: string;
      master_resume_text: string | null;
      education_background: string | null;
      first_name: string | null;
      last_name: string | null;
      phone_number: string | null;
      job_level_preference: string | null;
    }>("/api/user-context", { token });
  },

  /** PUT /api/user-context (auth required) */
  saveUserContext(
    token: string,
    data: { 
        master_resume_text?: string; 
        education_background?: string;
        first_name?: string;
        last_name?: string;
        phone_number?: string;
        job_level_preference?: string;
    }
  ) {
    return request<{ id: string }>("/api/user-context", {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    });
  },

  /** POST /api/user-context/upload */
  uploadResume(token: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    
    // Using raw fetch here since FormData automatically sets multipart boundary headers
    // and omits application/json Content-Type
    return fetch(`${BASE}/api/user-context/upload`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      },
      body: formData
    }).then(async res => {
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Upload failed");
      }
      return res.json();
    });
  },
};
