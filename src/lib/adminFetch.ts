const SESSION_KEY = "jw_admin_sid";

export const adminFetch = (url: string, opts: RequestInit = {}): Promise<Response> => {
  const sid = sessionStorage.getItem(SESSION_KEY);
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string>),
  };
  if (sid) headers["X-Session-Id"] = sid;
  return fetch(url, { ...opts, headers });
};
