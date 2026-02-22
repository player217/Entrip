import crypto from 'crypto';

export const makeETag = (parts: (string | number | null | undefined)[]) => {
  const base = parts.filter((p) => p !== undefined && p !== null).join('|');
  return `W/"${crypto.createHash('sha1').update(base).digest('hex')}"`;
};

export const parseIfMatchVersion = (ifMatch?: string): number | undefined => {
  if (!ifMatch) return undefined;
  // Accept raw version (e.g., "5") as well as weak ETag format W/"hash" (we only use version when provided raw)
  const trimmed = ifMatch.trim();
  const num = Number(trimmed.replace(/(^W\/\"|\"$)/g, ''));
  return Number.isFinite(num) ? num : undefined;
};

