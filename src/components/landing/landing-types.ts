export interface LandingPageProps {
  onEnter: () => void;
  isDark: boolean;
  onThemeToggle: () => void;
}

export type LandingStep = 0 | 1 | 2 | 3 | 4;

export const SEARCH_DEMO = 'kyoto rain and design';

export const HERO_MEMORY_FRAGMENTS = [
  // ═══ Core Orbit (8 images) ═══ (Ring 0)
  { id: 'img-core-1', ring: 0, angle: 0.0, image: '/cosmos-assets/01_concrete_corridor.webp', width: 74, opacity: 0.5, tilt: 2.6 },
  { id: 'img-core-2', ring: 0, angle: 45.0, image: '/cosmos-assets/02_translucent_leaves.webp', width: 74, opacity: 0.5, tilt: -0.6 },
  { id: 'img-core-3', ring: 0, angle: 90.0, image: '/cosmos-assets/03_underwater_light.webp', width: 74, opacity: 0.5, tilt: -1.7 },
  { id: 'img-core-4', ring: 0, angle: 135.0, image: '/cosmos-assets/04_amber_glass.webp', width: 74, opacity: 0.5, tilt: 2.8 },
  { id: 'img-core-5', ring: 0, angle: 180.0, image: '/cosmos-assets/05_monochrome_collage.webp', width: 74, opacity: 0.5, tilt: 4.8 },
  { id: 'img-core-6', ring: 0, angle: 225.0, image: '/cosmos-assets/06_metal_glass.webp', width: 74, opacity: 0.5, tilt: 3.7 },
  { id: 'img-core-7', ring: 0, angle: 270.0, image: '/cosmos-assets/07_soft_petals.webp', width: 74, opacity: 0.5, tilt: -4.8 },
  { id: 'img-core-8', ring: 0, angle: 315.0, image: '/cosmos-assets/08_rainy_street.webp', width: 74, opacity: 0.5, tilt: 1.1 },

  // ═══ Inner Orbit (12 images) ═══ (Ring 1)
  { id: 'img-1', ring: 1, angle: 0.0, image: '/cosmos-assets/01_雨夜城市窗外景.webp', width: 89, opacity: 0.71, tilt: -4.7 },
  { id: 'img-2', ring: 1, angle: 30.0, image: '/cosmos-assets/02_星座与神话星图.webp', width: 89, opacity: 0.72, tilt: 4.9 },
  { id: 'img-3', ring: 1, angle: 60.0, image: '/cosmos-assets/03_红漆宝盒与金饰.webp', width: 89, opacity: 0.66, tilt: -3.7 },
  { id: 'img-4', ring: 1, angle: 90.0, image: '/cosmos-assets/04_海滩潮汐与水沙纹理.webp', width: 89, opacity: 0.69, tilt: -2.4 },
  { id: 'img-5', ring: 1, angle: 120.0, image: '/cosmos-assets/05_彩色光影映照的古老墙面.webp', width: 89, opacity: 0.73, tilt: -6.0 },
  { id: 'img-6', ring: 1, angle: 150.0, image: '/cosmos-assets/06_复古列车窗外的宁静景致.webp', width: 89, opacity: 0.79, tilt: 3.6 },
  { id: 'img-7', ring: 1, angle: 180.0, image: '/cosmos-assets/07_复古书信与物品静物.webp', width: 89, opacity: 0.70, tilt: 5.3 },
  { id: 'img-8', ring: 1, angle: 210.0, image: '/cosmos-assets/08_彩蝶翅膀细节纹理.webp', width: 89, opacity: 0.66, tilt: 4.0 },
  { id: 'img-9', ring: 1, angle: 240.0, image: '/cosmos-assets/09_孤独身影与风中披风.webp', width: 89, opacity: 0.68, tilt: -5.3 },
  { id: 'img-10', ring: 1, angle: 270.0, image: '/cosmos-assets/10_手工纸拼贴的自然之美.webp', width: 89, opacity: 0.75, tilt: -0.5 },
  { id: 'img-11', ring: 1, angle: 300.0, image: '/cosmos-assets/11_怀旧暗房中的胶片与光盒.webp', width: 89, opacity: 0.76, tilt: 1.8 },
  { id: 'img-12', ring: 1, angle: 330.0, image: '/cosmos-assets/12_静谧的雕塑肖像.webp', width: 89, opacity: 0.68, tilt: 4.7 },

  // ═══ Middle Orbit (17 images) ═══ (Ring 2)
  { id: 'img-13', ring: 2, angle: 10.0, image: '/cosmos-assets/13_清晨雾霭中的森林小径.webp', width: 109, opacity: 0.96, tilt: -1.7 },
  { id: 'img-14', ring: 2, angle: 31.2, image: '/cosmos-assets/14_复古打字机的温暖角落.webp', width: 109, opacity: 0.95, tilt: -4.9 },
  { id: 'img-15', ring: 2, angle: 52.4, image: '/cosmos-assets/15_植物标本压花拼贴.webp', width: 109, opacity: 0.94, tilt: 5.4 },
  { id: 'img-16', ring: 2, angle: 73.5, image: '/cosmos-assets/16_精致的飞蛾标本展示.webp', width: 109, opacity: 0.95, tilt: 2.5 },
  { id: 'img-17', ring: 2, angle: 94.7, image: '/cosmos-assets/17_温暖清晨的床铺静物.webp', width: 109, opacity: 0.94, tilt: -4.2 },
  { id: 'img-18', ring: 2, angle: 115.9, image: '/cosmos-assets/18_灰色混凝土与金光交织.webp', width: 109, opacity: 0.96, tilt: -5.4 },
  { id: 'img-19', ring: 2, angle: 137.1, image: '/cosmos-assets/19_自然收藏的珍奇物品.webp', width: 109, opacity: 0.98, tilt: -3.3 },
  { id: 'img-20', ring: 2, angle: 158.2, image: '/cosmos-assets/20_沙漠黄昏的宁静景致.webp', width: 109, opacity: 0.93, tilt: -2.1 },
  { id: 'img-21', ring: 2, angle: 179.4, image: '/cosmos-assets/21_夜晚的天文书桌.webp', width: 109, opacity: 0.98, tilt: 2.5 },
  { id: 'img-22', ring: 2, angle: 200.6, image: '/cosmos-assets/22_雾中寂静的火车站.webp', width: 109, opacity: 0.94, tilt: 4.7 },
  { id: 'img-23', ring: 2, angle: 221.8, image: '/cosmos-assets/23_温暖的桌面静物写作场景.webp', width: 109, opacity: 0.92, tilt: 2.8 },
  { id: 'img-24', ring: 2, angle: 242.9, image: '/cosmos-assets/24_蓝色织物的静谧光影.webp', width: 109, opacity: 0.91, tilt: 5.7 },
  { id: 'img-25', ring: 2, angle: 264.1, image: '/cosmos-assets/25_温暖光线中的雕塑感走廊.webp', width: 109, opacity: 0.96, tilt: -5.9 },
  { id: 'img-26', ring: 2, angle: 285.3, image: '/cosmos-assets/26_怀旧音乐静物.webp', width: 109, opacity: 0.98, tilt: 4.7 },
  { id: 'img-27', ring: 2, angle: 306.5, image: '/cosmos-assets/27_自然植物的蓝印工艺.webp', width: 109, opacity: 0.96, tilt: -3.5 },
  { id: 'img-28', ring: 2, angle: 327.6, image: '/cosmos-assets/28_老影院的空荡座位.webp', width: 109, opacity: 0.93, tilt: 1.6 },
  { id: 'img-29', ring: 2, angle: 348.8, image: '/cosmos-assets/29_古董漆盒与珍珠饰品.webp', width: 109, opacity: 0.94, tilt: -3.7 },

  // ═══ Outer Orbit (21 images) ═══ (Ring 3)
  { id: 'img-30', ring: 3, angle: 5.0, image: '/cosmos-assets/30_柔和海岸晨曦景色.webp', width: 129, opacity: 1.0, tilt: 4.5 },
  { id: 'img-31', ring: 3, angle: 22.1, image: '/cosmos-assets/31_雨中温室的玻璃窗景.webp', width: 129, opacity: 1.0, tilt: -1.2 },
  { id: 'img-32', ring: 3, angle: 39.3, image: '/cosmos-assets/32_平静的室内游泳池大厅.webp', width: 129, opacity: 1.0, tilt: 1.9 },
  { id: 'img-33', ring: 3, angle: 56.4, image: '/cosmos-assets/33_优雅的钢琴与温暖光影.webp', width: 129, opacity: 1.0, tilt: 0.7 },
  { id: 'img-34', ring: 3, angle: 73.6, image: '/cosmos-assets/34_黎明雾中的宁静港口.webp', width: 129, opacity: 1.0, tilt: -4.4 },
  { id: 'img-35', ring: 3, angle: 90.7, image: '/cosmos-assets/35_温暖奢华的香水瓶静物.webp', width: 129, opacity: 1.0, tilt: -0.2 },
  { id: 'img-36', ring: 3, angle: 107.9, image: '/cosmos-assets/36_墨韵之作.webp', width: 129, opacity: 1.0, tilt: -3.7 },
  { id: 'img-37', ring: 3, angle: 125.0, image: '/cosmos-assets/37_温暖风化的灰泥墙.webp', width: 129, opacity: 1.0, tilt: -3.9 },
  { id: 'img-38', ring: 3, angle: 142.1, image: '/cosmos-assets/38_冰霜窗花与冬日光辉.webp', width: 129, opacity: 1.0, tilt: 5.1 },
  { id: 'img-39', ring: 3, angle: 159.3, image: '/cosmos-assets/39_自然历史标本收藏排列.webp', width: 129, opacity: 1.0, tilt: -3.2 },
  { id: 'img-40', ring: 3, angle: 176.4, image: '/cosmos-assets/40_月光下的宁静湖岸.webp', width: 129, opacity: 1.0, tilt: 1.9 },
  { id: 'img-41', ring: 3, angle: 193.6, image: '/cosmos-assets/41_复古图书馆的温馨氛围.webp', width: 129, opacity: 1.0, tilt: 5.6 },
  { id: 'img-42', ring: 3, angle: 210.7, image: '/cosmos-assets/42_复古探险地图与文献.webp', width: 129, opacity: 1.0, tilt: 1.6 },
  { id: 'img-43', ring: 3, angle: 227.9, image: '/cosmos-assets/43_温馨的日式禅意室内.webp', width: 129, opacity: 1.0, tilt: 2.4 },
  { id: 'img-44', ring: 3, angle: 245.0, image: '/cosmos-assets/44_海底的海藻森林.webp', width: 129, opacity: 1.0, tilt: 5.5 },
  { id: 'img-45', ring: 3, angle: 262.1, image: '/cosmos-assets/45_无人机视角的盐湖景观.webp', width: 129, opacity: 1.0, tilt: 0.6 },
  { id: 'img-46', ring: 3, angle: 279.3, image: '/cosmos-assets/46_古老教堂的宁静光影.webp', width: 129, opacity: 1.0, tilt: -0.4 },
  { id: 'img-47', ring: 3, angle: 296.4, image: '/cosmos-assets/47_老式怀旧物品静物摄影.webp', width: 129, opacity: 1.0, tilt: 1.6 },
  { id: 'img-48', ring: 3, angle: 313.6, image: '/cosmos-assets/48_宁静雨夜古街景.webp', width: 129, opacity: 1.0, tilt: -1.9 },
  { id: 'img-49', ring: 3, angle: 330.7, image: '/cosmos-assets/49_温暖茶具静物.webp', width: 129, opacity: 1.0, tilt: 1.7 },
  { id: 'img-50', ring: 3, angle: 347.9, image: '/cosmos-assets/50_阳光下的柑橘与陶罐.webp', width: 129, opacity: 1.0, tilt: -1.6 },
];

