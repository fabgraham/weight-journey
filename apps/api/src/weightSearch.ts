// Keep the search model in one place. Never choose a different model automatically.
export const WEIGHT_SEARCH_MODEL = "claude-sonnet-5-5";

export class WeightSearchError extends Error {
  constructor(message: string, public status: 400 | 502 | 503 = 502) {
    super(message);
  }
}

export async function requestClaude(
  payload: Record<string, unknown>,
  apiKey: string,
  fetcher: typeof fetch,
  workspaceId: string | undefined,
  signal = AbortSignal.timeout(15000),
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01",
  };
  if (workspaceId) headers["anthropic-workspace-id"] = workspaceId;
  let response: Response;
  try {
    response = await fetcher("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
      signal,
      body: JSON.stringify(payload),
    });
  } catch {
    throw new WeightSearchError("Claude search is unavailable. Try again or use a simple weight search.", 503);
  }
  if (!response.ok) {
    const detail = await response.json().catch(() => null) as { error?: { type?: string; message?: string } } | null;
    if (response.status === 401) throw new WeightSearchError("Claude rejected the API key. Check the key configured on the backend.", 503);
    if (typeof detail?.error?.message === "string" && /credit balance|billing|payment/i.test(detail.error.message)) {
      throw new WeightSearchError("Claude API credits are unavailable. Check your Claude Console billing and claimed Max credits.", 503);
    }
    if (typeof detail?.error?.message === "string" && /workspace/i.test(detail.error.message)) {
      if (!workspaceId) throw new WeightSearchError("Add ANTHROPIC_WORKSPACE_ID to the backend for this Claude API key.", 503);
      throw new WeightSearchError("Claude cannot access the selected workspace. Check ANTHROPIC_WORKSPACE_ID on the backend.", 503);
    }
    if (response.status === 404) throw new WeightSearchError("Claude Sonnet 5.5 is not available through this API account.", 503);
    if (response.status === 429) throw new WeightSearchError("Claude has reached its usage limit. Please try again later.", 503);
    if (response.status === 403) throw new WeightSearchError("This Claude API key does not have permission to use search.", 503);
    if (response.status === 400) {
      // Return the provider's validation reason, with credentials removed.
      const message = detail?.error?.message;
      const reason = typeof message === "string"
        ? ` ${message.split(apiKey).join("[redacted]").replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]").replace(/[\r\n]/g, " ").slice(0, 300)}` : "";
      throw new WeightSearchError(`Claude rejected the search configuration.${reason}`, 503);
    }
    throw new WeightSearchError("Claude search is unavailable. Try again or use a simple weight search.", 503);
  }
  return response;
}
