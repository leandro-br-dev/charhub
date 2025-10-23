export function isQueuesEnabled(): boolean {
  const flag = process.env.QUEUES_ENABLED;
  if (!flag) return false; // default disabled for local dev without Redis
  return flag === '1' || flag?.toLowerCase() === 'true';
}

