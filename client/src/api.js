const req = async (method, path, body) => {
  const res = await fetch('/api' + path, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data;
};

export const api = {
  get: (p) => req('GET', p),
  post: (p, b) => req('POST', p, b || {}),
  patch: (p, b) => req('PATCH', p, b),
  put: (p, b) => req('PUT', p, b),
  del: (p, b) => req('DELETE', p, b),
  resetDemo: async () => {
    const res = await fetch('/api/dev/reset', { method: 'POST', headers: { 'x-demo-reset': 'true' } });
    if (!res.ok) throw new Error('Reset failed');
  },
};
