const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const API_SECRET = process.env.EXPO_PUBLIC_API_SECRET;

if (!BASE_URL || !API_SECRET) {
  console.error("Missing EXPO_PUBLIC_API_BASE_URL or EXPO_PUBLIC_API_SECRET");
}

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export async function apiRequest<T>(
  path: string,
  method: HttpMethod = "GET",
  body?: unknown
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_SECRET as string,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
