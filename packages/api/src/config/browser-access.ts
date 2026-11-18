// Cookies and browser origins must describe the same deployment. Only the
// dedicated LAN launcher opts into host-only cookies over plain HTTP.
export function browserAccessPolicy(
  mode: string,
  clientUrl: string,
  lanHttp: boolean,
  lanOrigins?: string
) {
  const origins = new Set<string>();
  if (lanHttp) {
    for (const value of (lanOrigins ?? '').split(',')) {
      const origin = value.trim();
      if (!origin) continue;
      const url = new URL(origin);
      if (url.protocol !== 'http:' || url.origin !== origin) {
        throw new Error('ENTRIP_LAN_ORIGINS must contain exact HTTP origins.');
      }
      origins.add(origin);
    }
    if (!origins.size) throw new Error('ENTRIP_LAN_ORIGINS is required for LAN HTTP.');
  } else {
    origins.add(clientUrl);
    if (mode === 'development') {
      origins.add('http://localhost:3000');
      origins.add('http://127.0.0.1:3000');
    }
  }

  return {
    lanHttp,
    origins: [...origins],
    secureCookies: mode === 'production' && !lanHttp,
    permitsOrigin: (origin: string | undefined) => typeof origin === 'string' && origins.has(origin),
  };
}
