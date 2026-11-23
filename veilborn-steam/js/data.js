'use strict';
// ============================================================
//  VEILBORN - data: constants, save system, items, levels
// ============================================================
const W = 1280, H = 720, FLOOR = 620;
const FONT = 'Georgia, "Times New Roman", serif';

const SPELLS = {
  purple:   { name: 'Violet Hex',    color: 0xb06cff, dmg: 14, desc: 'Your default hex. Reliable and clean.' },
  ice:      { name: 'Frostbite',     color: 0x8fe3ff, dmg: 12, desc: 'Chills enemies and slows them down.' },
  fire:     { name: 'Cinder',        color: 0xff7a2e, dmg: 11, desc: 'Sets enemies alight. Burns over time.' },
  darkness: { name: 'Umbral',        color: 0x7a3ac0, dmg: 19, desc: 'Heavy damage. Drinks a little life.' },
  light:    { name: 'Halo',          color: 0xfff2a8, dmg: 13, desc: 'Pierces straight through enemies.' },
  angel:    { name: 'Seraph',        color: 0xffffff, dmg: 12, desc: 'Each hit mends your wounds.' },
  rainbow:  { name: 'Prism',         color: 0xff66cc, dmg: 17, desc: 'Unstable. Random side effects.' }
};

const POWERS = {
  slow_time: { name: "Witch's Hourglass", cost: 30, cd: 12000, desc: 'Time crawls for everything but you (6s).' },
  shroud:    { name: 'Veil of Nobody',    cost: 25, cd: 14000, desc: 'Become invisible. Things forget you (6s).' },
  step:      { name: 'Shadow Step',       cost: 15, cd: 3000,  desc: 'Slip forward through danger.' },
  blades:    { name: 'Hex Blades',        cost: 25, cd: 7000,  desc: 'Five homing blades hunt the nearest thing.' },
  bone:      { name: 'Bone Ward',         cost: 30, cd: 16000, desc: 'A rib-cage shield. Absorbs 3 hits.' },
  moon:      { name: 'Moonburst',         cost: 45, cd: 20000, desc: 'Blinding light. Stuns and hurts all nearby.' }
};

const GEAR = {
  witch_hat:    { name: "Witch's Hat",     slot: 'head',  stats: { hp: 20 },               desc: 'Pointed, patched, perfect. +20 HP' },
  veil:         { name: 'Mourning Veil',   slot: 'head',  stats: { mp: 30 },               desc: 'Thin black lace. +30 Mana' },
  bone_corset:  { name: 'Bone Corset',     slot: 'chest', stats: { hp: 35 },               desc: 'Someone else\'s ribs. +35 HP' },
  rune_cloak:   { name: 'Rune Cloak',      slot: 'chest', stats: { mp: 25, spd: 20 },      desc: 'Stitched with glowing thread. +25 Mana, +20 Speed' },
  moon_boots:   { name: 'Moon Boots',      slot: 'feet',  stats: { jump: 90, spd: 25 },    desc: 'Light as a bad dream. +Jump, +Speed' },
  hex_ring:     { name: 'Hex Ring',        slot: 'charm', stats: { dmg: 0.2 },             desc: 'Hums when you aim. +20% spell damage' },
  locket:       { name: "Nobody's Locket", slot: 'charm', stats: { hp: 25, mp: 15 },       desc: 'The photo inside keeps changing. +25 HP, +15 Mana' }
};

const BOSSES = {
  warden: { name: 'THE WARDEN',       hp: 650,  tex: 'warden', tint: 0xffffff, w: 240, h: 300, bw: 120, bh: 250, dmg: 22,
            drops: [{ t: 'gear', id: 'bone_corset' }, { t: 'power', id: 'shroud' }, { t: 'spell', id: 'darkness' }] },
  nurse:  { name: 'THE NURSE',        hp: 950,  tex: 'warden', tint: 0xe8b8c8, w: 240, h: 300, bw: 120, bh: 250, dmg: 24,
            drops: [{ t: 'spell', id: 'rainbow' }, { t: 'gear', id: 'moon_boots' }, { t: 'power', id: 'moon' }] },
  mother: { name: 'MOTHER OF SMILES', hp: 1500, tex: 'mother', tint: 0xffffff, w: 300, h: 330, bw: 130, bh: 290, dmg: 24,
            drops: [] }
};

const ENEMY = {
  hollow:  { tex: 'hollow',  w: 90,  h: 170, bw: 34,  bh: 150, hp: 60, spd: 85,  dmg: 12 },
  smiler:  { tex: 'smiler',  w: 110, h: 110, bw: 70,  bh: 70,  hp: 40, spd: 75,  dmg: 10, fly: true },
  crawler: { tex: 'crawler', w: 140, h: 80,  bw: 110, bh: 50,  hp: 50, spd: 110, dmg: 14 }
};

// ---------------- Save ----------------
const SAVE_KEY = 'veilborn_save_v2';
function defaultSave() {
  return { started: false, level: 'ruins', spells: ['purple'], spell: 'purple', powers: [], slots: [null, null, null],
           gear: [], equip: { head: null, chest: null, feet: null, charm: null }, flags: {} };
}
function loadSave() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s) return Object.assign(defaultSave(), s); } catch (e) {}
  return defaultSave();
}
let SAVE = loadSave();
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) {} }

// Runtime (not saved)
const RT = { hp: null, mp: 0, maxHp: 100, maxMp: 100, boss: null, hint: '', prompt: '',
             slowUntil: 0, invisUntil: 0, boneHits: 0, cdUntil: {}, spd: 300, jump: 780, dmg: 1 };

function calcStats() {
  const s = { hp: 100, mp: 100, spd: 300, jump: 780, dmg: 1 };
  Object.values(SAVE.equip).forEach(id => {
    if (!id || !GEAR[id]) return;
    const st = GEAR[id].stats;
    for (const k in st) s[k] += st[k];
  });
  return s;
}
function recalcStats() {
  const s = calcStats();
  RT.maxHp = s.hp; RT.maxMp = s.mp; RT.spd = s.spd; RT.jump = s.jump; RT.dmg = s.dmg;
  if (RT.hp != null) RT.hp = Math.min(RT.hp, RT.maxHp);
  RT.mp = Math.min(RT.mp, RT.maxMp);
}

// ---------------- Levels ----------------
// P(x, topY, width): floating one-way stone platform
const P = (x, y, w) => ({ x, y, w });

const LEVELS = {
  // ===================== 1. TUTORIAL: THE MOSSED RUINS =====================
  ruins: {
    name: 'The Mossed Ruins', theme: 'ruins', w: 4900, spawn: 140, music: 'calm',
    ground: [[0, 1450], [1660, 2800], [3020, 4900]],
    plats: [
      P(380, 520, 200), P(700, 450, 220), P(1020, 510, 180), P(1250, 430, 170),
      P(1500, 570, 110),
      P(1800, 500, 200), P(2100, 420, 220), P(2400, 500, 180),
      P(2860, 570, 110),
      P(3150, 500, 200), P(3430, 420, 200), P(3710, 500, 200), P(3960, 430, 220)
    ],
    signs: [
      { x: 150,  text: 'MOVE  —  A / D  or  ← / →   (controller: left stick)' },
      { x: 560,  text: 'JUMP  —  Space, W or ↑.   Press again in mid-air to DOUBLE JUMP.' },
      { x: 900,  text: 'ATTACK  —  Z, X or Left Click.   Your default hex is Violet.' },
      { x: 1400, text: 'Spellbooks change your attack.  Press  Q  to cycle spells.\nPress  F  to open your INVENTORY — time stops while it is open.' },
      { x: 2020, text: 'POWERS use mana. You can only equip THREE at once.\nEquip them in the inventory (F), then use them with  1  2  3.' },
      { x: 2700, text: 'Mind the gaps. The ruins remember everyone who falls.' },
      { x: 3330, text: 'Something wrong lives in these ruins.  It wears a face.  Keep your distance.' },
      { x: 4150, text: 'Crypts hide better gear and stranger powers.\nStand at a door and press  E.' }
    ],
    pickups: [
      { t: 'spell', id: 'ice', x: 810, y: 450 },
      { t: 'power', id: 'slow_time', x: 2210, y: 420 },
      { t: 'chest', x: 4070, y: 430, item: { t: 'gear', id: 'witch_hat' } }
    ],
    enemies: [
      { t: 'hollow', x: 1150, min: 800, max: 1420 },
      { t: 'crawler', x: 2000, min: 1700, max: 2780 },
      { t: 'hollow', x: 2500, min: 2300, max: 2780 },
      { t: 'smiler', x: 3400, y: 380 },
      { t: 'hollow', x: 3800, min: 3500, max: 4000 },
      { t: 'hollow', x: 4300, min: 4100, max: 4500 }
    ],
    doors: [
      { x: 4430, art: 'crypt', to: 'crypt1', sx: 150, label: 'The Weeping Cellar (side dungeon)' },
      { x: 4780, art: 'arch',  to: 'chapel', sx: 150, label: 'The Drowned Chapel' }
    ]
  },

  // ===================== SIDE DUNGEON 1: THE WEEPING CELLAR =====================
  crypt1: {
    name: 'The Weeping Cellar', theme: 'crypt', w: 4300, spawn: 150, music: 'calm', dungeon: true,
    ground: [[0, 4300]],
    plats: [
      P(520, 500, 200), P(820, 430, 170), P(1100, 500, 200), P(1400, 420, 200), P(1700, 500, 170),
      P(2000, 430, 200), P(2350, 500, 200), P(2650, 430, 180)
    ],
    spikes: [{ x: 1250, w: 130 }, { x: 2200, w: 160 }, { x: 2900, w: 130 }],
    signs: [{ x: 300, text: 'The air is wet. Something below is crying — and then laughing.' }],
    pickups: [{ t: 'chest', x: 1480, y: 420, item: { t: 'gear', id: 'hex_ring' } }],
    enemies: [
      { t: 'crawler', x: 800, min: 600, max: 1200 }, { t: 'hollow', x: 1050, min: 900, max: 1300 },
      { t: 'smiler', x: 1600, y: 400 }, { t: 'crawler', x: 2000, min: 1700, max: 2600 },
      { t: 'hollow', x: 2450, min: 2300, max: 2800 }, { t: 'smiler', x: 2800, y: 360 }
    ],
    boss: { id: 'warden', x: 3800, trigger: 3350 },
    doors: [{ x: 4180, art: 'crypt', to: 'ruins', sx: 4430, label: 'Back to the Ruins', req: 'boss_warden' }]
  },

  // ===================== 2. THE DROWNED CHAPEL =====================
  chapel: {
    name: 'The Drowned Chapel', theme: 'chapel', w: 5800, spawn: 150, music: 'calm',
    ground: [[0, 1250], [1450, 2550], [2760, 3900], [4100, 5800]],
    plats: [
      P(450, 520, 200), P(760, 440, 180), P(1030, 520, 160), P(1330, 560, 100),
      P(1600, 500, 200), P(1880, 420, 200), P(2150, 340, 200), P(2380, 440, 150),
      P(2620, 570, 100),
      P(2950, 500, 200), P(3230, 420, 200), P(3500, 340, 200), P(3750, 460, 150),
      P(4000, 570, 90), P(4300, 500, 200), P(4580, 420, 200)
    ],
    signs: [{ x: 230, text: 'The chapel flooded long ago. The congregation never left.' },
            { x: 2250, text: 'A side door. The cold behind it knows your name.' },
            { x: 4600, text: 'MOTHER is waiting. She is so glad you came.' }],
    pickups: [
      { t: 'power', id: 'step', x: 800, y: 440 },
      { t: 'spell', id: 'fire', x: 1950, y: 420 },
      { t: 'chest', x: 2230, y: 340, item: { t: 'power', id: 'blades' } },
      { t: 'spell', id: 'light', x: 3560, y: 340 },
      { t: 'chest', x: 4650, y: 420, item: { t: 'gear', id: 'rune_cloak' } }
    ],
    enemies: [
      { t: 'hollow', x: 700, min: 500, max: 1200 }, { t: 'smiler', x: 1100, y: 380 },
      { t: 'crawler', x: 1700, min: 1500, max: 2500 }, { t: 'hollow', x: 2100, min: 1900, max: 2500 },
      { t: 'smiler', x: 2400, y: 330 }, { t: 'hollow', x: 3000, min: 2800, max: 3850 },
      { t: 'crawler', x: 3400, min: 2800, max: 3850 }, { t: 'smiler', x: 3600, y: 300 },
      { t: 'hollow', x: 4300, min: 4150, max: 4700 }
    ],
    boss: { id: 'mother', x: 5350, trigger: 4900 },
    doors: [
      { x: 2310, art: 'crypt', to: 'crypt2', sx: 150, label: 'The Hollow Nursery (side dungeon)' },
      { x: 5700, art: 'arch', to: 'victory', sx: 0, label: 'Beyond the veil', req: 'boss_mother' }
    ]
  },

  // ===================== SIDE DUNGEON 2: THE HOLLOW NURSERY =====================
  crypt2: {
    name: 'The Hollow Nursery', theme: 'crypt', w: 4500, spawn: 150, music: 'calm', dungeon: true,
    ground: [[0, 1500], [1700, 4500]],
    plats: [
      P(500, 500, 200), P(800, 420, 180), P(1100, 500, 180), P(1350, 560, 110),
      P(1900, 500, 200), P(2200, 420, 200), P(2500, 340, 200), P(2800, 440, 200), P(3100, 500, 200)
    ],
    spikes: [{ x: 1000, w: 130 }, { x: 2100, w: 140 }, { x: 2650, w: 140 }, { x: 3300, w: 130 }],
    signs: [{ x: 300, text: 'Small beds. Small shoes. Everything is smiling at you.' }],
    pickups: [
      { t: 'chest', x: 2560, y: 340, item: { t: 'power', id: 'bone' } },
      { t: 'chest', x: 3150, y: 500, item: { t: 'spell', id: 'angel' } }
    ],
    enemies: [
      { t: 'smiler', x: 700, y: 380 }, { t: 'hollow', x: 1000, min: 800, max: 1400 },
      { t: 'crawler', x: 2000, min: 1750, max: 2900 }, { t: 'smiler', x: 2300, y: 340 },
      { t: 'hollow', x: 2700, min: 2500, max: 3300 }, { t: 'crawler', x: 3000, min: 1750, max: 3300 },
      { t: 'smiler', x: 3200, y: 380 }
    ],
    boss: { id: 'nurse', x: 4050, trigger: 3600 },
    doors: [{ x: 4400, art: 'crypt', to: 'chapel', sx: 2310, label: 'Back to the Chapel', req: 'boss_nurse' }]
  }
};
