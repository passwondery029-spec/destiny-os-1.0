
import { UserProfile, DestinyReport } from '../types';

export const MOCK_PROFILES: UserProfile[] = [
  {
    id: 'self',
    name: '求道者 (本人)',
    gender: 'MALE',
    phone: '138-0000-8888',
    email: 'seeker@destiny.os',
    relation: 'SELF',
    birthDate: '1995-11-02',
    birthTime: '08:30',
    bazi: '乙亥 丙戌 壬午 甲辰',
    avatarColor: '#1F1F1F'
  },
  {
    id: 'client_1',
    name: '李总 (大客户)',
    gender: 'MALE',
    phone: '139-9999-6666',
    email: 'ceo.li@business.corp',
    relation: 'CLIENT',
    birthDate: '1982-06-15',
    birthTime: '14:00',
    bazi: '壬戌 丙午 庚申 癸未',
    avatarColor: '#8B0000'
  },
  {
    id: 'family_1',
    name: '母亲',
    gender: 'FEMALE',
    phone: '136-1234-5678',
    relation: 'FAMILY',
    birthDate: '1968-03-22',
    birthTime: '06:15',
    bazi: '戊申 乙卯 癸酉 丁巳',
    avatarColor: '#B8860B'
  }
];

export const MOCK_REPORTS: DestinyReport[] = [
  {
    id: 'r1',
    profileId: 'self',
    title: '2025 乙巳年·流年运势总纲',
    type: 'YEARLY',
    summary: '今年天干乙木透出，地支巳火暗藏。对您而言，伤官生财，利于开创副业，但需注意口舌是非。',
    date: '2025-02-04',
    tags: ['流年', '事业', '重点关注']
  },
  {
    id: 'r2',
    profileId: 'self',
    title: '职场十年·人生K线推演',
    type: 'K_LINE',
    summary: '基于大运流年生成的能量走势图。显示2026-2027年为您的人生波峰，宜激流勇进。',
    date: '2025-01-15',
    tags: ['长期规划', '数据可视化']
  },
  {
    id: 'r3',
    profileId: 'self',
    title: '第一季度财运专项详批',
    type: 'WEALTH',
    summary: '正财稳健，偏财波动较大。农历二月有意外之财，建议落袋为安，不宜追加投资。',
    date: '2025-02-10',
    tags: ['理财', '月度']
  }
];

export const USER_STATS = {
  consultations: 42,
  daysActive: 18,
  memoriesArchived: 128,
  reportsGenerated: 5
};
