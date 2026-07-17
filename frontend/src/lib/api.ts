const BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function token(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = true
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (auth) {
    const t = token();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function download(path: string, filename: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const api = {
  base: BASE,
  request,
  download,
  // auth
  register: (body: unknown) =>
    request("/api/auth/register", { method: "POST", body: JSON.stringify(body) }, false),
  login: (body: unknown) =>
    request<{ access_token: string; role: string; name: string; status: string }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify(body) },
      false
    ),
  // prediction
  predict: (body: unknown) =>
    request("/api/prediction/predict", { method: "POST", body: JSON.stringify(body) }),
  // history
  history: () => request("/api/history"),
  deleteHistory: (id: number) =>
    request(`/api/history/${id}`, { method: "DELETE" }),
  // admin
  stats: () => request("/api/admin/stats"),
  adminUsers: (status?: string, q?: string) => {
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    if (q) p.set("q", q);
    return request(`/api/admin/users?${p.toString()}`);
  },
  userAction: (id: number, action: string) =>
    request(`/api/admin/users/${id}/${action}`, { method: "POST" }),
  deleteUser: (id: number) =>
    request(`/api/admin/users/${id}`, { method: "DELETE" }),
  getWindow: () => request("/api/admin/window"),
  setWindow: (body: unknown) =>
    request("/api/admin/window", { method: "PUT", body: JSON.stringify(body) }),
  adminPredictions: (q?: string) =>
    request(`/api/admin/predictions${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  meta: () => request("/api/dataset/meta"),
  datasetStats: () => request("/api/dataset/stats"),
};
