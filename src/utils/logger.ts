type LogMeta = Record<string, unknown>;

function log(level: 'INFO' | 'WARN' | 'ERROR', message: string, meta?: LogMeta): void {
  const payload = {
    level,
    message,
    time: new Date().toISOString(),
    ...(meta ? { meta } : {})
  };
  console.log(JSON.stringify(payload));
}

export const logger = {
  info: (message: string, meta?: LogMeta) => log('INFO', message, meta),
  warn: (message: string, meta?: LogMeta) => log('WARN', message, meta),
  error: (message: string, meta?: LogMeta) => log('ERROR', message, meta)
};
