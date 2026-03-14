import { FiveElementsData, EnergyPoint } from '../types';

function mulberry32(a: number) {
    return function () {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export function getDailyBazi(date: Date): string {
    // 2024-01-01 is 甲子 (0, 0)
    const baseDate = new Date('2024-01-01T00:00:00Z');
    const diffTime = date.getTime() - baseDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const stemIdx = ((diffDays % 10) + 10) % 10;
    const branchIdx = ((diffDays % 12) + 12) % 12;

    return `${STEMS[stemIdx]}${BRANCHES[branchIdx]}`;
}

function getElement(char: string): string {
    if (['甲', '乙', '寅', '卯'].includes(char)) return '木';
    if (['丙', '丁', '巳', '午'].includes(char)) return '火';
    if (['戊', '己', '辰', '戌', '丑', '未'].includes(char)) return '土';
    if (['庚', '辛', '申', '酉'].includes(char)) return '金';
    if (['壬', '癸', '亥', '子'].includes(char)) return '水';
    return '土'; // default fallback
}

function calculateBaziElements(bazi: string) {
    const counts: Record<string, number> = { '金': 0, '木': 0, '水': 0, '火': 0, '土': 0 };
    for (const char of bazi) {
        if (char !== ' ') {
            const el = getElement(char);
            if (counts[el] !== undefined) {
                counts[el]++;
            }
        }
    }
    return counts;
}

export interface DailyFortune {
    score: number;
    auspiciousness: string;
    brief: string;
    advice: string;
    luckyElement: string;
    outfitOptionA: {
        colors: { hat: string, top: string, bottom: string, shoes: string };
        label: string;
        styleDesc: string;
    };
    outfitOptionB: {
        colors: { hat: string, top: string, bottom: string, shoes: string };
        label: string;
        styleDesc: string;
    };
    elementsData: FiveElementsData[];
    energyCurve: EnergyPoint[];
    notifText: string;
    luckyColorName: string;
    luckyAction: string;
    liuRi: string;
}

const ELEMENTS = ['金', '木', '水', '火', '土'];
const COLORS = {
    '金': { primary: '#B8860B', secondary: '#F7F7F5', name: '流金', secName: '素白' },
    '木': { primary: '#5F9EA0', secondary: '#2E8B57', name: '松石', secName: '竹青' },
    '水': { primary: '#1F1F1F', secondary: '#4682B4', name: '墨黑', secName: '海蓝' },
    '火': { primary: '#8B0000', secondary: '#FF4500', name: '丹砂', secName: '朱红' },
    '土': { primary: '#F5DEB3', secondary: '#D2B48C', name: '麦黄', secName: '赭石' },
};

const BRIEFS = [
    "水木相生，灵感如泉涌。",
    "金火相战，宜静不宜动。",
    "土木交加，稳中求胜。",
    "水火既济，万事亨通。",
    "金水相生，财源广进。",
    "木火通明，才华横溢。",
    "火土相生，厚积薄发。",
    "土金相生，坚如磐石。",
    "金木交战，需防口舌。",
    "水土交战，诸事阻滞。"
];

const ADVICES = [
    "今日宜静思创作，忌冲动投资。",
    "今日宜广结善缘，忌独断专行。",
    "今日宜稳扎稳打，忌投机取巧。",
    "今日宜顺势而为，忌逆流而上。",
    "今日宜开源节流，忌铺张浪费。",
    "今日宜展现自我，忌妄自菲薄。",
    "今日宜蓄势待发，忌急于求成。",
    "今日宜坚守本心，忌随波逐流。",
    "今日宜谨言慎行，忌口无遮拦。",
    "今日宜修心养性，忌心浮气躁。"
];

const NOTIFS = [
    "今日灵感颇佳，但需留意午时（11:00-13:00）的情绪波动，宜静心勿躁。",
    "今日财星高照，适合处理财务规划，但申时（15:00-17:00）不宜做重大决策。",
    "今日贵人运旺，多与长辈或上级沟通会有意想不到的收获。",
    "今日桃花微现，适合参加社交活动，展现个人魅力。",
    "今日宜静不宜动，适合居家整理或深度阅读，避免前往人多嘈杂之处。"
];

const ACTIONS = ["阅读，复盘", "沟通，谈判", "整理，断舍离", "运动，出汗", "冥想，独处", "创作，记录"];

export function generateDailyFortune(userId: string, userBazi?: string, gender: string = 'MALE'): DailyFortune {
    const todayDate = new Date();
    const todayStr = todayDate.toISOString().split('T')[0];
    const liuRi = getDailyBazi(todayDate);

    const baziToUse = userBazi || "甲子 乙丑 丙寅 丁卯"; // fallback if no bazi provided
    const userElements = calculateBaziElements(baziToUse);
    const liuRiElements = [getElement(liuRi[0]), getElement(liuRi[1])];

    const seedString = `${userId}-${todayStr}-${baziToUse}`;
    const seed = hashString(seedString);
    const random = mulberry32(seed);

    // Base score 65-85
    let score = Math.floor(random() * 20) + 65;

    // Adjust score based on Liu Ri interaction with User's Bazi
    let weakestElement = '金';
    let minCount = 99;
    let strongestElement = '金';
    let maxCount = -1;

    for (const [el, count] of Object.entries(userElements)) {
        if (count < minCount) {
            minCount = count;
            weakestElement = el;
        }
        if (count > maxCount) {
            maxCount = count;
            strongestElement = el;
        }
    }

    // Boost score if Liu Ri provides the weakest element (喜用神)
    if (liuRiElements.includes(weakestElement)) {
        score += 12;
    }
    // Reduce score if Liu Ri exacerbates the strongest element (忌神)
    if (liuRiElements.includes(strongestElement)) {
        score -= 8;
    }

    // Ensure score is within 60-99
    score = Math.max(60, Math.min(99, score));

    // Determine auspiciousness based on score
    let auspiciousness = '平';
    if (score >= 95) auspiciousness = '大吉';
    else if (score >= 90) auspiciousness = '上上签';
    else if (score >= 80) auspiciousness = '中吉';
    else if (score >= 70) auspiciousness = '小吉';
    else if (score < 65) auspiciousness = '小凶';

    const randomBrief = BRIEFS[Math.floor(random() * BRIEFS.length)];
    const brief = `流日【${liuRi}】，${randomBrief}`;
    const advice = ADVICES[Math.floor(random() * ADVICES.length)];
    const notifText = NOTIFS[Math.floor(random() * NOTIFS.length)];
    const luckyAction = ACTIONS[Math.floor(random() * ACTIONS.length)];

    // Lucky element is preferably the weakest element (Yong Shen)
    const luckyElement1 = weakestElement;
    let luckyElement2 = ELEMENTS[Math.floor(random() * ELEMENTS.length)];
    while (luckyElement2 === luckyElement1) {
        luckyElement2 = ELEMENTS[Math.floor(random() * ELEMENTS.length)];
    }

    const c1 = COLORS[luckyElement1 as keyof typeof COLORS];
    const c2 = COLORS[luckyElement2 as keyof typeof COLORS];

    const hatName = gender === 'FEMALE' ? '发饰' : '冠';
    const topName = gender === 'FEMALE' ? '衫' : '衣';
    const bottomName = gender === 'FEMALE' ? '裙' : '裳';

    const outfitOptionA = {
        colors: { hat: c1.primary, top: c2.primary, bottom: c1.secondary, shoes: c2.secondary },
        label: `方案一：${luckyElement1}${luckyElement2}相济`,
        styleDesc: `${c1.name}${hatName} · ${c2.name}${topName} · ${c1.secName}${bottomName}`
    };

    const outfitOptionB = {
        colors: { hat: c2.secondary, top: c1.secondary, bottom: c2.primary, shoes: c1.primary },
        label: `方案二：${luckyElement2}${luckyElement1}交辉`,
        styleDesc: `${c2.secName}${hatName} · ${c1.secName}${topName} · ${c2.name}${bottomName}`
    };

    const elementsData: FiveElementsData[] = [
        { subject: '金 (专注)', A: Math.floor(random() * 60) + 40, fullMark: 100 },
        { subject: '木 (成长)', A: Math.floor(random() * 60) + 40, fullMark: 100 },
        { subject: '水 (智慧)', A: Math.floor(random() * 60) + 40, fullMark: 100 },
        { subject: '火 (活力)', A: Math.floor(random() * 60) + 40, fullMark: 100 },
        { subject: '土 (稳重)', A: Math.floor(random() * 60) + 40, fullMark: 100 },
    ];

    const energyCurve: EnergyPoint[] = [
        { time: '卯时', energy: Math.floor(random() * 70) + 30 },
        { time: '辰时', energy: Math.floor(random() * 70) + 30 },
        { time: '午时', energy: Math.floor(random() * 70) + 30 },
        { time: '申时', energy: Math.floor(random() * 70) + 30 },
        { time: '酉时', energy: Math.floor(random() * 70) + 30 },
        { time: '亥时', energy: Math.floor(random() * 70) + 30 },
        { time: '子时', energy: Math.floor(random() * 70) + 30 },
    ];

    return {
        score,
        auspiciousness,
        brief,
        advice,
        luckyElement: luckyElement1,
        outfitOptionA,
        outfitOptionB,
        elementsData,
        energyCurve,
        notifText,
        luckyColorName: c1.name,
        luckyAction,
        liuRi
    };
}
