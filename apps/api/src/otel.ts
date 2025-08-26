// OpenTelemetry stub implementation
// Real implementation temporarily disabled for build

export const addTraceContext = (message: string) => message;

export const sdk = {
  start: () => console.log('[OTEL] Stub implementation - tracing disabled'),
  shutdown: () => Promise.resolve()
};