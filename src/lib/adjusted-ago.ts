/*
  いつ直したか。秒、分、時間、日、週、月、年。行に人は紐づけない。
*/
export function adjustedAgo(at: number, now: number): string {
  if (!Number.isFinite(at) || at <= 0 || !Number.isFinite(now)) return "";
  const sec = Math.max(0, Math.floor((now - at) / 1000));
  if (sec < 60) return `${sec}秒前に調整`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}分前に調整`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}時間前に調整`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}日前に調整`;
  if (day < 30) return `${Math.floor(day / 7)}週前に調整`;
  if (day < 365) return `${Math.floor(day / 30)}か月前に調整`;
  return `${Math.floor(day / 365)}年前に調整`;
}
