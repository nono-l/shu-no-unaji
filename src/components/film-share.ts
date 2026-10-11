/*
  共有は再生位置。行のずれではない。
  0.1秒。負は0。今のURLの ?t= を置き換える。
*/

export const SHARE_TITLE = "朱のうなじ";
export const SHARE_FLASH = 1200;

export function shareHref(href: string, seconds: number): string {
  const time = Math.round(seconds * 10) / 10;
  const url = new URL(href);
  url.searchParams.set("t", String(Math.max(0, time)));
  return url.toString();
}
