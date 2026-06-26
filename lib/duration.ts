// 解析 YouTube contentDetails.duration 的 ISO 8601 時長（如 PT1H2M3S）

const ISO_DURATION_RE = /^P(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;

/** 將 ISO 8601 時長字串轉成秒數；無法解析時回傳 0 */
export function parseIsoDuration(iso: string): number {
  if (!iso) return 0;
  const m = ISO_DURATION_RE.exec(iso);
  if (!m) return 0;
  const hours = Number(m[1] ?? 0);
  const minutes = Number(m[2] ?? 0);
  const seconds = Number(m[3] ?? 0);
  return hours * 3600 + minutes * 60 + seconds;
}
