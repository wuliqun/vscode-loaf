import * as fs from "fs";
import * as iconv from "iconv-lite";

function readFile(filePath: string) {
  const buffer = fs.readFileSync(filePath);

  let content = iconv.decode(buffer, "utf8");
  if (content.indexOf("�") !== -1) {
    content = iconv.decode(buffer, "gbk");
  }

  if (content.indexOf("�") !== -1) {
    content = iconv.decode(buffer, "gb2312");
  }

  return content;
}

const novelFileStr = `/**
* 获取月天数
* @param year 年份
* @param month 月份
* @returns 天数
*/
function getMonthEndDay(year: number, month: number): number {
 return 32 - new Date(year, month - 1, 32).getDate();
}

/**
* 日期格式化
* @param d 时间 Date实例 或 时间戳(秒/毫秒)
* @param formatStr 格式化样式
*/
function formatDate(
 d: Date | number,
 formatStr = "YYYY-MM-DD hh:mm:ss"
): string {
 if (typeof d === "number") {
   if (d < 100000000000) d *= 1000;
   d = new Date(d);
 }
 const S = {
   Y: d.getFullYear(),
   M: d.getMonth() + 1,
   D: d.getDate(),
   h: d.getHours(),
   m: d.getMinutes(),
   s: d.getSeconds(),
 };
 return formatStr.replace(/[Y|M|D|h|m|s]+/g, function (s) {
   // 是否需要补0 'Y-M-D h:m:s' 这样的格式不补0
   let padStart = s.length > 1;
   switch (s[0]) {
     case "Y":
       return S["Y"];
     default:
       return padStart ? ("0" + S[s[0]]).slice(-2) : S[s[0]];
   }
 });
}

/**
* 返回正常年-月-日 时:分:秒格式
* @returns
*/
function toISOString(d?: Date | number): string {
 if (typeof d === "undefined") {
   d = new Date();
 }
 return formatDate(d);
}

/**
*	时长转字符串
*  @param s -> seconds 秒数
*	@returns "01:25:00"  "00:37"
*/
function durationToStr(s: number): string {
 const h = Math.floor(s / (60 * 60));
 s %= 60 * 60;
 const m = Math.floor(s / 60);
 s %= 60;
 return "";
}


/*****

*****/


/**
* 等待毫秒值, 通常与await配合使用
* @param ms
*/
function sleep(ms: number) {
 return new Promise((resolve) => {
   setTimeout(() => {
     resolve(1);
   }, ms);
 });
}

export { getMonthEndDay, formatDate, toISOString, durationToStr, sleep };

`;

function writeNovelFile(filePath: string) {
  fs.writeFileSync(filePath, novelFileStr, "utf8");
}

export { readFile, writeNovelFile };
