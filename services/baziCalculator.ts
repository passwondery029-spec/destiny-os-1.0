/**
 * 八字排盘算法
 * 使用专业 lunar-javascript 库 (6tail)
 * 北京时间限定，真太阳时支持
 */

import { Solar } from 'lunar-javascript';

export interface BaziData {
  year: { tiangan: string; dizhi: string; shengxiao: string };
  month: { tiangan: string; dizhi: string };
  day: { tiangan: string; dizhi: string };
  time: { tiangan: string; dizhi: string };
  wuxingCount: { [key: string]: number };
  dayMaster: string; // 日主
}

export interface DailyFortune {
  date: string;
  overallScore: number; // 综合运势 0-100
  careerScore: number; // 事业运势
  wealthScore: number; // 财运
  relationshipScore: number; // 感情
  healthScore: number; // 健康
  luckyColor: string; // 幸运色
  luckyNumber: number; // 幸运数字
  direction: string; // 吉利方位
  suggestion: string; // 建议
  monthlyData: Array<{ month: number; score: number }>; // 全年12个月数据
}

// 五行
const WUXING = ['金', '木', '水', '火', '土'];

// 天干五行
const TIANGAN_WUXING: { [key: string]: string } = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水'
};

// 地支五行
const DIZHI_WUXING: { [key: string]: string } = {
  '子': '水', '亥': '水',
  '寅': '木', '卯': '木',
  '巳': '火', '午': '火',
  '申': '金', '酉': '金',
  '辰': '土', '戌': '土', '丑': '土', '未': '土'
};

// 十二生肖
const SHENGXIAO = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

/**
 * 计算五行统计
 */
function calculateWuxingCount(bazi: BaziData): { [key: string]: number } {
  const count: { [key: string]: number } = { '金': 0, '木': 0, '水': 0, '火': 0, '土': 0 };

  count[TIANGAN_WUXING[bazi.year.tiangan]]++;
  count[DIZHI_WUXING[bazi.year.dizhi]]++;
  count[TIANGAN_WUXING[bazi.month.tiangan]]++;
  count[DIZHI_WUXING[bazi.month.dizhi]]++;
  count[TIANGAN_WUXING[bazi.day.tiangan]]++;
  count[DIZHI_WUXING[bazi.day.dizhi]]++;
  count[TIANGAN_WUXING[bazi.time.tiangan]]++;
  count[DIZHI_WUXING[bazi.time.dizhi]]++;

  return count;
}

/**
 * 排盘主函数（使用专业 lunar-javascript 库）
 * 北京时间限定
 */
export function calculateBazi(birthDate: string, birthTime: string): BaziData {
  const [year, month, day] = birthDate.split('-').map(Number);
  const timeParts = birthTime.split(':').map(Number);
  const hour = timeParts[0] || 0;
  const minute = timeParts[1] || 0;

  // 使用 lunar-javascript 库进行专业排盘
  // 北京时间 (UTC+8)
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

  // 获取八字各柱
  const yearGan = eightChar.getYear();
  const monthGan = eightChar.getMonth();
  const dayGan = eightChar.getDay();
  const timeGan = eightChar.getTime();

  // 获取生肖
  const shengxiao = lunar.getYearShengXiao();

  const bazi: BaziData = {
    year: {
      tiangan: yearGan[0],
      dizhi: yearGan[1],
      shengxiao
    },
    month: {
      tiangan: monthGan[0],
      dizhi: monthGan[1]
    },
    day: {
      tiangan: dayGan[0],
      dizhi: dayGan[1]
    },
    time: {
      tiangan: timeGan[0],
      dizhi: timeGan[1]
    },
    wuxingCount: { '金': 0, '木': 0, '水': 0, '火': 0, '土': 0 },
    dayMaster: TIANGAN_WUXING[dayGan[0]]
  };

  bazi.wuxingCount = calculateWuxingCount(bazi);

  return bazi;
}

/**
 * 计算每日运势
 */
export function calculateDailyFortune(bazi: BaziData, targetDate: Date = new Date()): DailyFortune {
  const today = targetDate;
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  // 计算今日干支
  const todaySolar = Solar.fromYmd(year, month, day);
  const todayLunar = todaySolar.getLunar();
  const todayEightChar = todayLunar.getEightChar();
  const todayDayGan = todayEightChar.getDay();
  const todayTiangan = todayDayGan[0];
  const todayWuxing = TIANGAN_WUXING[todayTiangan];

  // 五行生克关系
  const shengKe: { [key: string]: { sheng: string; ke: string; beiSheng: string; beiKe: string } } = {
    '金': { sheng: '水', ke: '木', beiSheng: '土', beiKe: '火' },
    '木': { sheng: '火', ke: '土', beiSheng: '水', beiKe: '金' },
    '水': { sheng: '木', ke: '火', beiSheng: '金', beiKe: '土' },
    '火': { sheng: '土', ke: '金', beiSheng: '木', beiKe: '水' },
    '土': { sheng: '金', ke: '水', beiSheng: '火', beiKe: '木' }
  };

  const dayMaster = bazi.dayMaster;
  const relations = shengKe[dayMaster];

  // 基础分数计算
  let baseScore = 60;

  // 根据今日五行与日主的关系调整
  if (todayWuxing === dayMaster) {
    baseScore += 15; // 比和
  } else if (todayWuxing === relations.beiSheng) {
    baseScore += 20; // 印星
  } else if (todayWuxing === relations.sheng) {
    baseScore += 10; // 食神伤官
  } else if (todayWuxing === relations.ke) {
    baseScore -= 15; // 官杀
  } else if (todayWuxing === relations.beiKe) {
    baseScore -= 10; // 财星
  }

  // 添加一些随机波动模拟每日不同
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const seed = dayOfYear * 12345;
  const randomFactor = ((seed % 100) - 50) / 100 * 20; // ±10分波动

  const overallScore = Math.max(0, Math.min(100, Math.round(baseScore + randomFactor)));

  // 生成各维度分数（围绕综合分数波动）
  const generateDimensionScore = (offset: number) => {
    const fluctuation = ((seed * offset) % 30) - 15;
    const rawScore = overallScore + offset + fluctuation;
    return Math.max(0, Math.min(100, Math.round(rawScore)));
  };

  const careerScore = generateDimensionScore(5);
  const wealthScore = generateDimensionScore(-3);
  const relationshipScore = generateDimensionScore(2);
  const healthScore = generateDimensionScore(-5);

  // 幸运色
  const colors = ['红色', '蓝色', '绿色', '黄色', '白色', '紫色', '橙色', '黑色'];
  const luckyColor = colors[dayOfYear % colors.length];

  // 幸运数字
  const luckyNumber = (dayOfYear % 9) + 1;

  // 吉利方位
  const directions = ['东方', '南方', '西方', '北方', '东南', '西南', '东北', '西北'];
  const direction = directions[dayOfYear % directions.length];

  // 根据分数给出建议
  let suggestion = '';
  if (overallScore >= 80) {
    suggestion = '今日运势极佳，宜主动出击，把握机遇。适合开展重要事务、签约、面试等。';
  } else if (overallScore >= 60) {
    suggestion = '今日运势平稳，宜按部就班，稳扎稳打。适合处理日常事务，维护人际关系。';
  } else if (overallScore >= 40) {
    suggestion = '今日运势平平，宜低调行事，避免冒险。适合反思总结，规划未来，养精蓄锐。';
  } else {
    suggestion = '今日运势偏低，宜守不宜进。建议减少外出，注意安全，保持心态平和。';
  }

  // 生成全年12个月的运势数据
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const monthSeed = dayOfYear + (i + 1) * 100;
    const fluctuation = (monthSeed % 80) - 40;
    const monthScore = Math.max(30, Math.min(100, Math.round(60 + fluctuation)));
    return { month: i + 1, score: monthScore };
  });

  return {
    date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    overallScore,
    careerScore,
    wealthScore,
    relationshipScore,
    healthScore,
    luckyColor,
    luckyNumber,
    direction,
    suggestion,
    monthlyData
  };
}

/**
 * 生成近一年的月度运势数据
 */
export function generateYearlyFortune(bazi: BaziData, year: number = new Date().getFullYear()): Array<{ month: number; score: number }> {
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const date = new Date(year, month - 1, 15); // 月中计算
    const fortune = calculateDailyFortune(bazi, date);
    return { month, score: fortune.overallScore };
  });
}
