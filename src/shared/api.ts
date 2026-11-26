// One JSON POST helper for every section. All Gemini calls go through our own
// server, so the API key never reaches the browser.

export const SESSION_EXPIRED = 'انتهت الجلسة. حدّث الصفحة وسجّل الدخول من جديد.';

export class ApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

export async function postJson(url: string, body: unknown, fallbackError = 'حصلت مشكلة'): Promise<any> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError('مفيش اتصال بالسيرفر. اتأكد من النت وجرّب تاني.');
  }
  // The body may not be JSON (e.g. a proxy error page), so don't let parsing throw.
  const data = await response.json().catch(() => null);
  if (response.status === 401) throw new ApiError(SESSION_EXPIRED);
  if (response.status === 413) throw new ApiError('الصور كبيرة جدًا. جرّب صورة أصغر.');
  if (!response.ok) throw new ApiError(data?.error || `${fallbackError} (${response.status}). جرّب تاني.`, data?.code);
  return data || {};
}
