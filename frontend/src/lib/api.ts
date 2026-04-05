/**
 * Typed API client for CareerNode backend.
 * Base URL comes from NEXT_PUBLIC_API_URL env var.
 */
import { JobsPage, MatchOutput } from "@/lib/types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
  getJobs(page = 1, pageSize = 20): Promise<JobsPage> {
    return request<JobsPage>(`/api/jobs?page=${page}&page_size=${pageSize}`);
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
      education_background: string;
    }>("/api/user-context", { token });
  },

  /** PUT /api/user-context (auth required) */
  saveUserContext(
    token: string,
    data: { master_resume_text: string; education_background?: string }
  ) {
    return request<{ id: string }>("/api/user-context", {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    });
  },
};
