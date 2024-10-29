import iconv from "iconv-lite";

export function toEucKr(str: string) {
  return iconv.encode(str, "euc-kr");
}
