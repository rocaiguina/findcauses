// Browser-side calls to the Django API through this site's /api rewrite. Requests that change data carry
// Django's CSRF token from its cookie (set by GET /api/me).

function csrfToken(): string {
  return document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)?.[1] ?? "";
}

export async function apiPost<T = Record<string, unknown>>(
  path: string,
  body: FormData | Record<string, unknown>,
): Promise<{ ok: boolean; status: number; data: T }> {
  if (!csrfToken()) await fetch("/api/me", { credentials: "same-origin" });
  const isForm = body instanceof FormData;
  const res = await fetch(`/api/${path}`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "X-CSRFToken": decodeURIComponent(csrfToken()), ...(isForm ? {} : { "Content-Type": "application/json" }) },
    body: isForm ? body : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}
