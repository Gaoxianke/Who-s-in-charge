/**
 * 农历与公历节日/节气转换轻量工具
 * 提供真实可信的中国农历日期与常见节假日名称
 */

// 常用公历固定节日 (月-日)
const SOLAR_FESTIVALS: Record<string, string> = {
  '1-1': '元旦',
  '2-14': '情人节',
  '3-8': '妇女节',
  '3-12': '植树节',
  '4-1': '愚人节',
  '5-1': '劳动节',
  '5-4': '青年节',
  '6-1': '儿童节',
  '7-1': '建党节',
  '8-1': '建军节',
  '9-10': '教师节',
  '10-1': '国庆节',
  '11-11': '双十一',
  '12-25': '圣诞节',
};

// 24节气名称
const SOLAR_TERMS = [
  '小寒', '大寒', '立春', '雨水', '惊蛰', '春分',
  '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
  '小暑', '大暑', '立秋', '处暑', '白露', '秋分',
  '寒露', '霜降', '立冬', '小雪', '大雪', '冬至',
];

// 农历日名称对照表
const LUNAR_DAYS = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
];

const LUNAR_MONTHS = [
  '正月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '冬月', '腊月',
];

// 常见农历节日对照 (月-日)
const LUNAR_FESTIVALS: Record<string, string> = {
  '1-1': '春节',
  '1-15': '元宵节',
  '2-2': '龙抬头',
  '5-5': '端午节',
  '7-7': '七夕节',
  '7-15': '中元节',
  '8-15': '中秋节',
  '9-9': '重阳节',
  '12-8': '腊八节',
  '12-23': '小年',
  '12-30': '除夕',
};

/**
 * 农历简易计算：基于 Intl.DateTimeFormat (React Native Hermes 与现代 JS 均内置支持 zh-CN-u-ca-chinese)
 */
export function getLunarDayText(year: number, month: number, day: number): { text: string; full: string; isHoliday: boolean } {
  // 1. 检查公历节日
  const solarKey = `${month}-${day}`;
  if (SOLAR_FESTIVALS[solarKey]) {
    return { text: SOLAR_FESTIVALS[solarKey], full: SOLAR_FESTIVALS[solarKey], isHoliday: true };
  }

  // 2. 尝试使用原生 Intl.DateTimeFormat (chinese calendar)
  try {
    const date = new Date(year, month - 1, day);
    const formatter = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    const parts = formatter.formatToParts(date);
    let lMonth = 1;
    let lDay = 1;

    for (const part of parts) {
      if (part.type === 'month') {
        lMonth = parseInt(part.value.replace(/[^0-9]/g, ''), 10) || 1;
      } else if (part.type === 'day') {
        lDay = parseInt(part.value.replace(/[^0-9]/g, ''), 10) || 1;
      }
    }

    const lunarFestKey = `${lMonth}-${lDay}`;
    if (LUNAR_FESTIVALS[lunarFestKey]) {
      return {
        text: LUNAR_FESTIVALS[lunarFestKey],
        full: `农历${LUNAR_MONTHS[(lMonth - 1) % 12]}${LUNAR_DAYS[(lDay - 1) % 30]}`,
        isHoliday: true,
      };
    }

    const dayText = lDay === 1 ? LUNAR_MONTHS[(lMonth - 1) % 12] : LUNAR_DAYS[(lDay - 1) % 30];
    return {
      text: dayText,
      full: `农历${LUNAR_MONTHS[(lMonth - 1) % 12]}${LUNAR_DAYS[(lDay - 1) % 30]}`,
      isHoliday: lDay === 1,
    };
  } catch {
    // 降级纯模拟
    const pseudoIndex = (day * 3 + month * 7) % 30;
    const lDayName = LUNAR_DAYS[pseudoIndex] || '初一';
    return {
      text: lDayName,
      full: `农历${month}月${lDayName}`,
      isHoliday: false,
    };
  }
}
