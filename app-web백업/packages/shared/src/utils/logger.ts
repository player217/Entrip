/* eslint-disable no-console */
// 가벼운 console 래퍼 – production에서는 debug는 무시
const logs: Array<{ level: string; message: unknown[]; timestamp: Date }> = [];

export const logger = {
  debug: (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[debug]', ...args);
      logs.push({ level: 'debug', message: args, timestamp: new Date() });
    }
  },
  info: (...args: unknown[]) => {
    console.info('[info]', ...args);
    logs.push({ level: 'info', message: args, timestamp: new Date() });
  },
  warn: (...args: unknown[]) => {
    console.warn('[warn]', ...args);
    logs.push({ level: 'warn', message: args, timestamp: new Date() });
  },
  error: (...args: unknown[]) => {
    console.error('[error]', ...args);
    logs.push({ level: 'error', message: args, timestamp: new Date() });
  },
  getRecentLogs: (count = 100) => logs.slice(-count),
  clearLogs: () => logs.length = 0,
  downloadLogs: () => {
    const content = logs.map(log => 
      `[${log.timestamp.toISOString()}] ${log.level.toUpperCase()}: ${JSON.stringify(log.message)}`
    ).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `entrip-logs-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
} as const;

export default logger;