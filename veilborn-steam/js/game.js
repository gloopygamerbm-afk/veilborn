'use strict';
// ============================================================
//  VEILBORN - scenes
// ============================================================
function pad() {
  const gs = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const g of gs) if (g && g.connected) return g;
  return null;
}
function burst(scene, x, y, color, n) {
  n = n || 10;
  for (let i = 0; i < n; i++) {
    const s = scene.add.image(x, y, 'dot').setTint(color).setScale(Phaser.Math.FloatBetween(0.4, 1)).setDepth(40).setBlendMode(Phaser.BlendModes.ADD);
    const a = Math.random() * 6.283, d = Phaser.Math.Between(20, 90);
    scene.tweens.add({ targets: s, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, scale: 0, duration: Phaser.Math.Between(250, 520), onComplete: () => s.destroy() });
  }
}
function toast(scene, text) { scene.game.events.emit('toast', text); }

// ------------------------------------------------------------ Boot
class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    const E = window.EMBEDDED_ASSETS || {};
    Object.keys(E).forEach(k => this.load.image(k, E[k]));
    this.add.text(W / 2, H / 2, 'Summoning...', { fontFamily: FONT, fontSize: '28px', color: '#b78cff' }).setOrigin(0.5);
  }
  create() {
    buildTextures(this);
    const fr = (p, n) => Array.from({ length: n }, (_, i) => ({ key: p + i }));
    this.anims.create({ key: 'idle', frames: fr('player_idle_', 4), frameRate: 4, repeat: -1 });
    this.anims.create({ key: 'run', frames: fr('player_run_', 7), frameRate: 10, repeat: -1 });
    this.scene.start('Menu');
  }
}

// ------------------------------------------------------------ Menu
class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }
  create() {
    if (this.scene.isActive('UI')) this.scene.stop('UI');
    RT.hp = null; RT.boss = null;
    this.add.image(0, 0, 'bgfar_ruins').setOrigin(0);
    this.mid = this.add.tileSprite(0, 0, W, H, 'bgmid_ruins').setOrigin(0);
    this.fog = this.add.tileSprite(0, 0, W, H, 'bgfog_ruins').setOrigin(0).setAlpha(0.9);
    this.add.image(W - 220, H - 320, 'orb').setTint(0x9a5cff).setBlendMode(Phaser.BlendModes.ADD).setScale(6.5).setAlpha(0.22);
    const heroine = this.add.image(W - 220, H - 15, 'menu_heroine').setOrigin(0.5, 1).setScale(0.96);
    this.tweens.add({ targets: heroine, y: H - 22, duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.text(110, 120, 'VEILBORN', { fontFamily: FONT, fontSize: '116px', color: '#d9c2ff', stroke: '#2a1248', strokeThickness: 10, padding: { x: 30, y: 30 } }).setShadow(0, 0, '#9a5cff', 24, true, true);
    this.add.text(116, 250, 'you are not human.  neither are they.', { fontFamily: FONT, fontSize: '26px', fontStyle: 'italic', color: '#a99ac0' });
    this.opts = [];
    if (SAVE.started) this.opts.push({ label: 'CONTINUE', fn: () => this.go(false) });
    this.opts.push({ label: 'NEW GAME', fn: () => this.go(true) });
    this.opts.push({ label: 'FULLSCREEN', fn: () => this.scale.toggleFullscreen() });
    this.sel = 0; this.texts = [];
    this.opts.forEach((o, i) => {
      const t = this.add.text(120, 340 + i * 62, o.label, { fontFamily: FONT, fontSize: '38px', color: '#8e7aa8' }).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => { this.sel = i; this.refresh(); }); t.on('pointerdown', () => { AUDIO.init(); o.fn(); });
      this.texts.push(t);
    });
    this.add.text(120, H - 50, '↑ ↓ + Enter  •  F: inventory in game  •  Q: cycle spell  •  controller supported', { fontFamily: FONT, fontSize: '18px', color: '#6a5c80' });
    this.refresh();
    const kb = this.input.keyboard;
    kb.on('keydown-UP', () => { this.sel = (this.sel + this.opts.length - 1) % this.opts.length; this.refresh(); AUDIO.sfx('ui'); });
    kb.on('keydown-DOWN', () => { this.sel = (this.sel + 1) % this.opts.length; this.refresh(); AUDIO.sfx('ui'); });
    kb.on('keydown-ENTER', () => { AUDIO.init(); this.opts[this.sel].fn(); });
    this.cameras.main.fadeIn(600);
  }
  refresh() { this.texts.forEach((t, i) => { t.setColor(i === this.sel ? '#ffffff' : '#8e7aa8'); t.setText((i === this.sel ? '✦ ' : '   ') + this.opts[i].label); }); }
  go(fresh) {
    AUDIO.init(); AUDIO.music('calm');
    if (fresh) { SAVE = defaultSave(); SAVE.started = true; persist(); RT.cdUntil = {}; }
    RT.hp = null;
    this.scene.start('Game', { level: fresh ? 'ruins' : SAVE.level });
  }
  update() { this.mid.tilePositionX += 0.15; this.fog.tilePositionX += 0.4; }
}

// ------------------------------------------------------------ Game
class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }
  init(d) { this.lvKey = d.level || 'ruins'; this.entrySx = d.sx; }

  create() {
    const L = LEVELS[this.lvKey]; this.L = L; const th = L.theme;
    SAVE.level = this.lvKey; persist(); recalcStats();
    if (RT.hp == null) { RT.hp = RT.maxHp; RT.mp = RT.maxMp; }
    if (RT.clock === undefined) RT.clock = 0;
    RT.cdUntil = RT.cdUntil || {};
    RT.boss = null; RT.hint = ''; RT.prompt = ''; RT.boneHits = 0; RT.invulnUntil = 0; RT.dashUntil = 0;
    this.dead = false; this.transitioning = false; this.bossObj = null; this.bossActive = false; this.pe = {}; this.facing = 1;
    this.nextShot = 0; this.hurtUntil = 0; this.coyote = 0; this.jumps = 0; this.animState = ''; this.safeList = []; this.safeT = 0;
    AUDIO.music('calm');

    this.physics.world.setBounds(0, 0, L.w, H + 700);
    this.physics.world.checkCollision.down = false;
    this.cameras.main.setBounds(0, 0, L.w, H);

    // backgrounds
    this.bgFar = this.add.tileSprite(0, 0, W, H, 'bgfar_' + th).setOrigin(0).setScrollFactor(0).setDepth(-40);
    this.bgMid = this.add.tileSprite(0, 0, W, H, 'bgmid_' + th).setOrigin(0).setScrollFactor(0).setDepth(-30);
    this.bgFog = this.add.tileSprite(0, 0, W, H, 'bgfog_' + th).setOrigin(0).setScrollFactor(0).setDepth(22).setAlpha(0.85);
    try {
      this.add.particles(0, 0, 'dot', { x: { min: 0, max: W }, y: { min: 180, max: 640 }, lifespan: 4500, speedX: { min: -10, max: 10 }, speedY: { min: -14, max: -3 },
        scale: { start: 0.55, end: 0 }, alpha: { start: 0.7, end: 0 }, frequency: 160, tint: th === 'ruins' ? 0xd8ffb0 : th === 'crypt' ? 0xff9ac0 : 0xa8d0ff, blendMode: 'ADD' }).setScrollFactor(0).setDepth(21);
    } catch (e) {}
    if (L.dungeon) this.add.rectangle(0, 0, W, H, 0x05020a, 0.42).setOrigin(0).setScrollFactor(0).setDepth(23);

    // terrain
    this.groundSolid = this.physics.add.staticGroup(); this.floatSolid = this.physics.add.staticGroup();
    L.ground.forEach(([x0, x1]) => {
      for (let x = x0; x < x1; x += 512) {
        const w = Math.round(Math.min(512, x1 - x));
        this.groundSolid.create(x, FLOOR, getPlat(this, w, 160, th, 'ground')).setOrigin(0, 0).refreshBody();
      }
    });
    L.plats.forEach(p => {
      const s = this.floatSolid.create(p.x, p.y, getPlat(this, p.w, 60, th, 'float')).setOrigin(0, 0).refreshBody();
      s.body.checkCollision.down = false; s.body.checkCollision.left = false; s.body.checkCollision.right = false;
    });
    (L.signs || []).forEach(s => { s.img = this.add.image(s.x, FLOOR + 2, 'sign').setOrigin(0.5, 1).setDepth(-5); });
    this.spikes = this.physics.add.staticGroup();
    (L.spikes || []).forEach(s => {
      this.add.image(s.x, FLOOR + 2, 'spikes_' + s.w).setOrigin(0.5, 1).setDepth(-4);
      const z = this.add.zone(s.x, FLOOR - 12, s.w - 14, 22); this.physics.add.existing(z, true); this.spikes.add(z);
    });
    this.doors = (L.doors || []).map(d => { d.img = this.add.image(d.x, FLOOR + 2, 'door_' + d.art).setOrigin(0.5, 1).setDepth(-4); return d; });

    // groups
    this.enemies = this.physics.add.group(); this.proj = this.physics.add.group({ allowGravity: false });
    this.eproj = this.physics.add.group({ allowGravity: false }); this.drops = this.physics.add.group(); this.pickups = this.physics.add.staticGroup();
    this.glows = [];

    // pickups
    (L.pickups || []).forEach((def, i) => { def.key = this.lvKey + ':' + i; if (!SAVE.flags[def.key]) this.makePickup(def); });
    if (L.boss) {
      const B = BOSSES[L.boss.id];
      if (SAVE.flags['boss_' + L.boss.id]) B.drops.forEach((d, i) => { const k = 'drop:' + L.boss.id + ':' + d.id; if (!SAVE.flags[k]) this.makePickup({ t: d.t, id: d.id, x: L.boss.x - 120 + i * 120, y: FLOOR, key: k }); });
    }
    // enemies
    (L.enemies || []).forEach(d => this.spawnEnemy(d));

    // player
    const sx = this.entrySx !== undefined ? this.entrySx : L.spawn;
    this.p = this.physics.add.sprite(sx, FLOOR - 90, 'player_idle_0').setOrigin(0.5, 1).setScale(0.62).setDepth(10);
    this.p.body.setSize(44, 185).setOffset(68, 25); this.p.setCollideWorldBounds(true); this.p.play('idle');
    this.boneRing = this.add.image(0, 0, 'ring').setVisible(false).setDepth(11).setAlpha(0.9);
    this.glow = this.add.image(0, 0, 'orb').setTint(0xb48cff).setBlendMode(Phaser.BlendModes.ADD).setAlpha(L.dungeon ? 0.5 : 0.18).setScale(L.dungeon ? 10 : 6).setDepth(9);
    this.reticle = this.add.image(0, 0, 'orb').setScale(0.35).setTint(0xd9c2ff).setBlendMode(Phaser.BlendModes.ADD).setDepth(99).setAlpha(0.75);

    // physics wiring
    this.physics.add.collider(this.p, this.groundSolid); this.physics.add.collider(this.p, this.floatSolid);
    this.physics.add.collider(this.enemies, this.groundSolid); this.physics.add.collider(this.enemies, this.floatSolid);
    this.physics.add.collider(this.drops, this.groundSolid); this.physics.add.collider(this.drops, this.floatSolid);
    this.physics.add.overlap(this.proj, this.enemies, (pr, e) => this.onProjHit(pr, e));
    this.physics.add.overlap(this.proj, this.groundSolid, pr => { if (pr.active && !pr.homing) pr.destroy(); });
    this.physics.add.overlap(this.p, this.enemies, (p, e) => { if (e.active && RT.clock >= e.stunUntil) this.hurt(e.dmgv, e.x); });
    this.physics.add.overlap(this.p, this.eproj, (p, s) => { if (s.active) { this.hurt(s.dmgv, s.x); if (!s.keep) s.destroy(); } });
    this.physics.add.overlap(this.p, this.spikes, () => this.hurt(16, this.p.x + (Math.random() < 0.5 ? -20 : 20), true));
    this.physics.add.overlap(this.p, this.drops, (p, d) => { if (d.kind === 'heal') RT.hp = Math.min(RT.maxHp, RT.hp + 18); else RT.mp = Math.min(RT.maxMp, RT.mp + 25); burst(this, d.x, d.y, d.kind === 'heal' ? 0xff5a7a : 0x6ab0ff, 6); AUDIO.sfx('ui'); d.destroy(); });
    this.physics.add.overlap(this.p, this.pickups, (p, s) => this.collect(s));

    // input
    const KC = Phaser.Input.Keyboard.KeyCodes;
    this.keys = this.input.keyboard.addKeys({ a: KC.A, d: KC.D, w: KC.W, s: KC.S, space: KC.SPACE, z: KC.Z, x: KC.X, e: KC.E, q: KC.Q, one: KC.ONE, two: KC.TWO, three: KC.THREE });
    this.cur = this.input.keyboard.createCursorKeys();

    this.cameras.main.startFollow(this.p, true, 0.1, 0.1); this.cameras.main.setDeadzone(120, 80);
    this.cameras.main.fadeIn(500);
    if (!this.scene.isActive('UI')) this.scene.launch('UI');
    this.scene.bringToTop('UI');
    this.time.delayedCall(500, () => toast(this, L.name));
  }

  // ---------- spawning ----------
  makePickup(def) {
    const key = def.t === 'spell' ? 'book_' + def.id : def.t === 'power' ? 'pow_' + def.id : def.t === 'gear' ? 'gear_' + def.id : 'chest';
    const s = this.pickups.create(def.x, def.y, key).setOrigin(0.5, 1).setDepth(5); if (def.t !== 'chest') s.setScale(0.9); s.refreshBody(); s.def = def;
    if (def.t !== 'chest') {
      const g = this.add.image(def.x, def.y - 28, 'orb').setTint(0xcaa8ff).setBlendMode(Phaser.BlendModes.ADD).setScale(2.2).setDepth(4);
      this.tweens.add({ targets: g, alpha: 0.3, scale: 1.7, yoyo: true, repeat: -1, duration: 900 }); s.glowImg = g;
    }
  }
  spawnEnemy(d) {
    const c = ENEMY[d.t];
    const e = this.enemies.create(d.x, d.y !== undefined ? d.y : FLOOR - 6, c.tex).setOrigin(0.5, 1).setDepth(8);
    e.body.setSize(c.bw, c.bh).setOffset((c.w - c.bw) / 2, c.h - c.bh); e.setCollideWorldBounds(true);
    e.cfg = c; e.type = d.t; e.hp = e.maxHp = d.hp || c.hp; e.dmgv = c.dmg; e.dir = Math.random() < 0.5 ? -1 : 1;
    e.min = d.min !== undefined ? d.min : d.x - 200; e.max = d.max !== undefined ? d.max : d.x + 200;
    e.baseY = d.y !== undefined ? d.y : FLOOR - 200; e.ph = Math.random() * 6; e.stunUntil = 0; e.slowUntil = 0; e.burnUntil = 0; e.nextBurn = 0;
    e.st = 'prowl'; e.until = 0;
    if (c.fly) e.body.allowGravity = false;
    return e;
  }
  spawnBoss(def) {
    const B = BOSSES[def.id], mother = B.tex === 'mother';
    const e = this.enemies.create(def.x, mother ? 300 : FLOOR - 6, B.tex).setOrigin(0.5, 1).setDepth(8);
    e.body.setSize(B.bw, B.bh).setOffset((B.w - B.bw) / 2, B.h - B.bh); e.setCollideWorldBounds(true);
    e.isBoss = true; e.bdef = B; e.bossId = def.id; e.cfg = { fly: mother }; e.hp = e.maxHp = B.hp; e.dmgv = B.dmg; e.phase = 1; e.state = 'walk';
    e.nextAtk = RT.clock + 2500; e.nextFan = RT.clock + 2500; e.nextSummon = RT.clock + 5000; e.nextLunge = RT.clock + 6000; e.lungeUntil = 0;
    e.stunUntil = 0; e.slowUntil = 0; e.burnUntil = 0; e.nextBurn = 0; e.dir = -1;
    e.resetTint = () => { if (B.tint === 0xffffff) e.clearTint(); else e.setTint(B.tint); }; e.resetTint();
    if (mother) e.body.allowGravity = false;
    return e;
  }
  startBoss() {
    const def = this.L.boss; this.bossActive = true; this.bossObj = this.spawnBoss(def); const B = BOSSES[def.id];
    RT.boss = { name: B.name, hp: B.hp, max: B.hp, phase: 1 };
    const wx = def.trigger - 60; const wall = this.add.zone(wx, H / 2, 24, H * 2); this.physics.add.existing(wall, true);
    this.physics.add.collider(this.p, wall); this.wall = wall;
    AUDIO.sfx('boss'); AUDIO.music('boss'); this.cameras.main.shake(500, 0.012); toast(this, B.name);
  }

  // ---------- combat ----------
  hurt(dmg, srcX, noKnock) {
    const now = RT.clock; if (this.dead || now < RT.invulnUntil) return;
    if (RT.boneHits > 0) { RT.boneHits--; RT.invulnUntil = now + 600; burst(this, this.p.x, this.p.y - 50, 0xf0e8d8, 12); AUDIO.sfx('hit'); return; }
    RT.hp -= dmg; RT.invulnUntil = now + 1000; this.hurtUntil = now + 220; AUDIO.sfx('hurt');
    this.p.setVelocity(noKnock ? 0 : Math.sign(this.p.x - srcX || 1) * 340, -380); this.p.setTintFill(0xff6a8a);
    this.time.delayedCall(110, () => this.p.active && this.p.clearTint()); this.cameras.main.shake(140, 0.007);
    if (RT.hp <= 0) this.die();
  }
  die() {
    if (this.dead) return; this.dead = true; AUDIO.sfx('die'); this.p.setTint(0x440022); this.p.body.setVelocity(0, 0);
    toast(this, 'You were so close to being human.'); this.cameras.main.fadeOut(1100);
    this.cameras.main.once('camerafadeoutcomplete', () => { RT.hp = null; this.scene.restart({ level: this.lvKey, sx: this.entrySx }); });
  }
  heal(a) { RT.hp = Math.min(RT.maxHp, RT.hp + a); }
  castSpell() {
    const id = SAVE.spell, S = SPELLS[id];
    const ptr = this.input.activePointer;
    const spawnX = this.p.x, spawnY = this.p.y - 56;
    let angle;
    if (ptr && (ptr.isDown || ptr.x > 0 || ptr.y > 0)) {
      const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
      angle = Phaser.Math.Angle.Between(spawnX, spawnY, wp.x, wp.y);
      this.facing = wp.x < spawnX ? -1 : 1;
      this.p.setFlipX(this.facing < 0);
    } else {
      angle = this.facing > 0 ? 0 : Math.PI;
    }
    const spd = 820;
    const vx = Math.cos(angle) * spd, vy = Math.sin(angle) * spd;
    const pr = this.proj.create(spawnX + Math.cos(angle) * 36, spawnY + Math.sin(angle) * 36, 'orb')
      .setTint(S.color).setBlendMode(Phaser.BlendModes.ADD).setScale(0.95).setDepth(12);
    pr.body.setCircle(12, 10, 10);
    pr.setVelocity(vx, vy);
    pr.dmg = S.dmg * RT.dmg;
    pr.spell = id;
    pr.pierce = id === 'light';
    pr.hit = new Set();
    this.time.delayedCall(1100, () => pr.active && pr.destroy());
    AUDIO.sfx('cast');
    this.p.x -= Math.cos(angle) * 2;
  }
  onProjHit(pr, e) {
    if (!pr.active || !e.active || pr.hit.has(e)) return; pr.hit.add(e);
    this.damageEnemy(e, pr.dmg, pr.spell); burst(this, pr.x, pr.y, SPELLS[pr.spell] ? SPELLS[pr.spell].color : 0xe8d8ff, 6);
    if (!pr.pierce) pr.destroy();
  }
  damageEnemy(e, dmg, spellId) {
    if (!e.active) return; const now = RT.clock; dmg = Math.round(dmg); e.hp -= dmg; AUDIO.sfx('hit');
    const t = this.add.text(e.x + Phaser.Math.Between(-14, 14), e.y - e.displayHeight * 0.8, String(dmg), { fontFamily: FONT, fontSize: '22px', color: '#fff2d0', stroke: '#2a1030', strokeThickness: 4 }).setOrigin(0.5).setDepth(60);
    this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, duration: 700, onComplete: () => t.destroy() });
    e.setTintFill(0xffffff); this.time.delayedCall(70, () => { if (!e.active) return; if (e.isBoss) e.resetTint(); else e.clearTint(); });
    let sp = spellId; if (sp === 'rainbow') sp = ['ice', 'fire', 'darkness', 'angel', 'light'][Phaser.Math.Between(0, 4)];
    if (sp === 'ice') e.slowUntil = now + 2500; else if (sp === 'fire') { e.burnUntil = now + 3000; e.nextBurn = now + 500; }
    else if (sp === 'darkness') this.heal(2); else if (sp === 'angel') this.heal(3);
    if (e.isBoss) {
      RT.boss.hp = Math.max(0, e.hp);
      if (e.phase === 1 && e.hp < e.maxHp * 0.5) { e.phase = 2; RT.boss.phase = 2; this.cameras.main.shake(500, 0.014); AUDIO.sfx('boss'); toast(this, 'It stops smiling. Then it smiles wider.'); }
    }
    if (e.hp <= 0) this.killEnemy(e);
  }
  killEnemy(e) {
    burst(this, e.x, e.y - e.displayHeight * 0.5, 0xd8c8ff, 18); const r = Math.random();
    if (!e.isBoss && r < 0.5) { const d = this.drops.create(e.x, e.y - 30, r < 0.3 ? 'orb_heal' : 'orb_mana').setDepth(6); d.kind = r < 0.3 ? 'heal' : 'mana'; d.setBounce(0.4); d.setVelocity(Phaser.Math.Between(-60, 60), -260); }
    if (e.isBoss) this.bossDefeated(e);
    e.destroy();
  }
  bossDefeated(e) {
    const B = e.bdef, def = this.L.boss; SAVE.flags['boss_' + e.bossId] = true; persist(); RT.boss = null; this.bossObj = null; this.bossActive = false;
    if (this.wall) { this.wall.destroy(); this.wall = null; }
    this.eproj.clear(true, true); this.cameras.main.flash(700, 255, 255, 255); this.cameras.main.shake(700, 0.02); AUDIO.music('calm'); AUDIO.sfx('power');
    B.drops.forEach((d, i) => this.makePickup({ t: d.t, id: d.id, x: e.x - 120 + i * 120, y: FLOOR, key: 'drop:' + e.bossId + ':' + d.id }));
    toast(this, B.name + ' has fallen.');
    if (e.bossId === 'mother') this.time.delayedCall(3500, () => { this.scene.stop('UI'); this.scene.start('Victory'); });
  }
  collect(s) {
    if (!s.active || s.opening) return; const def = s.def; let item = def;
    if (def.t === 'chest') {
      s.opening = true; s.setTexture('chest_open'); item = def.item;
      if (this.p && this.p.active) {
        this.p.body.setVelocity(0, 0);
        this.p.anims.stop();
        this.p.setTexture('heroine_back').setScale(0.22);
        this.time.delayedCall(700, () => {
          if (this.p && this.p.active && !this.dead) {
            this.p.setScale(0.62).setTexture('player_idle_0');
            this.p.play('idle');
          }
        });
      }
    }
    SAVE.flags[def.key] = true;
    if (item.t === 'spell') { if (!SAVE.spells.includes(item.id)) SAVE.spells.push(item.id); SAVE.spell = item.id; toast(this, 'Spellbook: ' + SPELLS[item.id].name + ' — ' + SPELLS[item.id].desc + '  (Q to cycle)'); }
    else if (item.t === 'power') {
      if (!SAVE.powers.includes(item.id)) SAVE.powers.push(item.id); const free = SAVE.slots.indexOf(null);
      if (free >= 0 && !SAVE.slots.includes(item.id)) { SAVE.slots[free] = item.id; toast(this, 'Power: ' + POWERS[item.id].name + ' — slot ' + (free + 1) + '. ' + POWERS[item.id].desc); }
      else toast(this, 'Power: ' + POWERS[item.id].name + ' — slots are full. Open inventory (F) to swap.');
    } else if (item.t === 'gear') {
      if (!SAVE.gear.includes(item.id)) SAVE.gear.push(item.id); const g = GEAR[item.id];
      if (!SAVE.equip[g.slot]) { SAVE.equip[g.slot] = item.id; toast(this, 'Equipped: ' + g.name + ' — ' + g.desc); } else toast(this, 'Found: ' + g.name + ' — equip it in the inventory (F).');
      recalcStats();
    }
    persist(); AUDIO.sfx('pick'); burst(this, s.x, s.y - 30, 0xe8d0ff, 16);
    if (def.t === 'chest') { s.body.enable = false; } else { if (s.glowImg) s.glowImg.destroy(); s.destroy(); }
  }
  usePower(i) {
    const now = RT.clock, id = SAVE.slots[i];
    if (!id) { toast(this, 'Empty slot — press F to equip a power.'); return; }
    const P = POWERS[id]; if (now < (RT.cdUntil[id] || 0)) return;
    if (RT.mp < P.cost) { toast(this, 'Not enough mana.'); return; }
    RT.mp -= P.cost; RT.cdUntil[id] = now + P.cd; AUDIO.sfx('power'); const p = this.p;
    if (id === 'slow_time') { RT.slowUntil = now + 6000; this.cameras.main.flash(300, 150, 90, 255); toast(this, 'Time crawls.'); }
    else if (id === 'shroud') { RT.invisUntil = now + 6000; toast(this, 'Nobody is here.'); }
    else if (id === 'step') { RT.dashUntil = now + 170; RT.invulnUntil = Math.max(RT.invulnUntil, now + 360); p.setVelocityX(this.facing * 1500); this.dashId = now; burst(this, p.x, p.y - 50, 0x8a5ac0, 14); }
    else if (id === 'blades') {
      for (let k = -2; k <= 2; k++) { const a = (this.facing > 0 ? 0 : Math.PI) + k * 0.28; const b = this.proj.create(p.x, p.y - 64, 'blade').setTint(0xe8d8ff).setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
        b.body.setSize(36, 12); b.setVelocity(Math.cos(a) * 520, Math.sin(a) * 520); b.rotation = a; b.dmg = 22 * RT.dmg; b.spell = 'purple'; b.hit = new Set(); b.homing = true; b.until = now + 2600; }
    }
    else if (id === 'bone') { RT.boneHits = 3; RT.boneUntil = now + 14000; toast(this, 'Bone Ward: absorbs 3 hits.'); }
    else if (id === 'moon') {
      this.cameras.main.flash(500, 255, 255, 255); const r = this.add.image(p.x, p.y - 50, 'ring').setScale(0.4).setDepth(30).setTint(0xfff6c0);
      this.tweens.add({ targets: r, scale: 9, alpha: 0, duration: 700, onComplete: () => r.destroy() });
      this.enemies.getChildren().slice().forEach(e => { if (!e.active || Phaser.Math.Distance.Between(e.x, e.y, p.x, p.y) > 700) return; if (!e.isBoss) e.stunUntil = now + 2500; this.damageEnemy(e, e.isBoss ? 40 : 30, 'light'); });
    }
  }
  enemyShot(x, y, ang, speed, tex, dmg, tint, life, scale) {
    const s = this.eproj.create(x, y, tex).setDepth(12); if (tint) s.setTint(tint); if (scale) s.setScale(scale);
    s.setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed); s.rotation = ang; s.dmgv = dmg; s.die = RT.clock + (life || 3000); return s;
  }

  // ---------- AI ----------
  updateEnemies(now) {
    const p = this.p, vis = now > RT.invisUntil, slowF = now < RT.slowUntil ? 0.25 : 1;
    this.enemies.getChildren().forEach(e => {
      if (!e.active) return;
      if (now < e.burnUntil && now > e.nextBurn) { e.nextBurn = now + 500; this.damageEnemy(e, 5, null); if (!e.active) return; }
      if (now < e.stunUntil) { e.setVelocityX(0); e.setAngle(Math.sin(now * 0.05) * 3); return; }
      const f = slowF * (now < e.slowUntil ? 0.5 : 1);
      if (e.isBoss) { this.bossAI(e, now, f); return; }
      const dx = p.x - e.x, dist = Math.abs(dx), dy = Math.abs(p.y - e.y);
      if (e.type === 'hollow') {
        const chase = vis && dist < 440 && dy < 190;
        if (chase) { e.dir = Math.sign(dx) || 1; e.setVelocityX(e.dir * e.cfg.spd * 1.6 * f); }
        else { if (e.x < e.min) e.dir = 1; if (e.x > e.max) e.dir = -1; e.setVelocityX(e.dir * e.cfg.spd * 0.6 * f); }
        if (Math.random() < 0.025) e.setAngle(Phaser.Math.Between(-5, 5)); else e.angle *= 0.9; e.setFlipX(e.dir < 0);
      } else if (e.type === 'smiler') {
        const ty = e.baseY + Math.sin(now / 520 + e.ph) * 26; e.setVelocityY((ty - e.y) * 2.6);
        if (vis && dist < 560) { e.setVelocityX(Math.sign(dx) * e.cfg.spd * f); e.baseY += (Math.min(p.y - 60, FLOOR - 70) - e.baseY) * 0.01; }
        else e.setVelocityX(Math.sin(now / 900 + e.ph) * 40 * f);
        e.setFlipX(dx < 0); e.setAngle(Math.sin(now / 300 + e.ph) * 6);
      } else if (e.type === 'crawler') {
        const grounded = e.body.blocked.down;
        if (e.st === 'prowl') {
          if (e.x < e.min) e.dir = 1; if (e.x > e.max) e.dir = -1; e.setVelocityX(e.dir * e.cfg.spd * 0.5 * f);
          if (vis && dist < 360 && dy < 150 && grounded) { e.st = 'twitch'; e.until = now + 500 / Math.max(f, 0.25); e.dir = Math.sign(dx) || 1; }
        } else if (e.st === 'twitch') { e.setVelocityX(0); e.x += Math.sin(now * 0.12) * 1.5; if (now > e.until) { e.st = 'lunge'; e.setVelocity(e.dir * 520 * f, -380); e.until = now + 450; } }
        else if (e.st === 'lunge') { if (now > e.until && grounded) { e.st = 'rest'; e.until = now + 900; e.setVelocityX(0); } }
        else if (e.st === 'rest') { e.setVelocityX(0); if (now > e.until) e.st = 'prowl'; }
        e.setFlipX(e.dir < 0);
      }
    });
  }
  bossAI(e, now, f) {
    const p = this.p, B = e.bdef, dx = p.x - e.x, dir = Math.sign(dx) || 1; e.setFlipX(dir < 0);
    if (B.tex === 'warden') {
      const g = e.body.blocked.down;
      if (e.state === 'walk') { e.setVelocityX(dir * (e.phase === 1 ? 100 : 160) * f); if (now > e.nextAtk) { e.state = 'windup'; e.until = now + 550 / Math.max(f, 0.3); e.setVelocityX(0); e.setTint(0xff8080); } }
      else if (e.state === 'windup') { e.setVelocityX(0); if (now > e.until) { e.resetTint(); e.setVelocityY(-820); e.state = 'air'; e.until = now + 300; } }
      else if (e.state === 'air') {
        e.setVelocityX(dir * 120 * f);
        if (g && now > e.until) {
          this.cameras.main.shake(300, 0.012); AUDIO.sfx('boss');
          [-1, 1].forEach(s => { const w = this.enemyShot(e.x + s * 80, FLOOR - 22, 0, 0, 'shock', 18, 0xffb0ff, 1700); w.setVelocity(s * 430 * f, 0); w.rotation = 0; w.body.setSize(50, 36); });
          if (e.phase === 2) for (let k = -1; k <= 1; k++) this.enemyShot(e.x, e.y - 160, Math.atan2(p.y - 60 - (e.y - 160), p.x - e.x) + k * 0.25, 360 * f, 'blade', 16, 0xe8e0d8, 3000);
          e.state = 'walk'; e.nextAtk = now + (e.phase === 1 ? 3400 : 2200);
        }
      }
    } else { // mother
      const ty = 290 + Math.sin(now / 700) * 40; e.setVelocityY((ty - e.y) * 2.2);
      if (now < e.lungeUntil) { /* keep lunge velocity */ }
      else { const ad = Math.abs(dx); e.setVelocityX(ad > 400 ? dir * 120 * f : ad < 250 ? -dir * 100 * f : 0); }
      if (now > e.nextFan) {
        e.nextFan = now + (e.phase === 1 ? 2500 : 1500); const n = e.phase === 1 ? 5 : 7, a0 = Math.atan2(p.y - 60 - (e.y - 150), p.x - e.x);
        for (let k = -(n - 1) / 2; k <= (n - 1) / 2; k++) this.enemyShot(e.x, e.y - 150, a0 + k * 0.2, 330 * f, 'tear', 14, null, 3200);
        AUDIO.sfx('cast');
      }
      if (now > e.nextSummon) { e.nextSummon = now + 7500; const alive = this.enemies.getChildren().filter(x => x.active && x.type === 'smiler').length;
        if (alive < 3) [-1, 1].forEach(s => { const m = this.spawnEnemy({ t: 'smiler', x: Phaser.Math.Clamp(e.x + s * 180, 100, this.L.w - 100), y: 300, hp: 30 }); m.baseY = 300; }); }
      if (e.phase === 2 && now > e.nextLunge) { e.nextLunge = now + 5200; e.lungeUntil = now + 600; const a = Math.atan2(p.y - 70 - e.y, p.x - e.x); e.setVelocity(Math.cos(a) * 560 * f, Math.sin(a) * 420 * f); e.setTint(0xffa0c0); this.time.delayedCall(600, () => e.active && e.resetTint()); }
    }
  }

  // ---------- main loop ----------
  readInput() {
    const k = this.keys, c = this.cur, pd = pad(), b = i => !!(pd && pd.buttons[i] && pd.buttons[i].pressed);
    const ax = pd ? pd.axes[0] : 0, ay = pd ? pd.axes[1] : 0, pe = this.pe, J = Phaser.Input.Keyboard.JustDown;
    const edge = (n, v) => { const r = v && !pe[n]; pe[n] = v; return r; };
    const eA = edge('a', b(0)), eB = edge('b', b(1)), eRB = edge('rb', b(5)), eRT = edge('rt', b(7)), eLB = edge('lb', b(4)), eUp = edge('up', ay < -0.7 || b(12));
    const ti = window.TOUCH_INPUT || {};
    const tJump = ti.jumpEdge; if (ti.jumpEdge) ti.jumpEdge = false;
    const tUse = ti.interactEdge; if (ti.interactEdge) ti.interactEdge = false;
    const tCyc = ti.cycleEdge; if (ti.cycleEdge) ti.cycleEdge = false;
    return {
      left: k.a.isDown || c.left.isDown || ax < -0.35 || b(14) || !!ti.left,
      right: k.d.isDown || c.right.isDown || ax > 0.35 || b(15) || !!ti.right,
      jumpHeld: k.w.isDown || k.space.isDown || c.up.isDown || b(0) || !!ti.jump,
      jump: J(k.w) || J(k.space) || J(c.up) || eA || tJump,
      attack: k.z.isDown || k.x.isDown || (this.input.activePointer.isDown && !ti.onBtn) || b(2) || !!ti.attack,
      p1: J(k.one) || eB, p2: J(k.two) || eRB, p3: J(k.three) || eRT,
      cycle: J(k.q) || eLB || tCyc,
      interact: J(k.e) || eUp || tUse
    };
  }
  update(time, delta) {
    if (this.dead) return;
    const dt = Math.min(delta, 50); RT.clock += dt; const now = RT.clock, p = this.p, inp = this.readInput(), L = this.L;
    RT.hint = ''; RT.prompt = '';
    // parallax
    const sx = this.cameras.main.scrollX; this.bgFar.tilePositionX = sx * 0.06; this.bgMid.tilePositionX = sx * 0.3; this.bgFog.tilePositionX = sx * 1.25 + now * 0.02;

    const onGround = p.body.blocked.down || p.body.touching.down;
    if (onGround) { this.coyote = now + 110; this.jumps = 0; if (now > this.safeT) { this.safeT = now + 180; this.safeList.push({ x: p.x, y: p.y - 6 }); if (this.safeList.length > 5) this.safeList.shift(); } }
    // movement
    const locked = now < this.hurtUntil || now < RT.dashUntil;
    if (!locked) {
      const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0); if (dir) this.facing = dir;
      p.setVelocityX(p.body.velocity.x + (dir * RT.spd - p.body.velocity.x) * (onGround ? 0.3 : 0.17));
      if (inp.jump) {
        if (onGround || now < this.coyote) { p.setVelocityY(-RT.jump); this.jumps = 1; this.coyote = 0; AUDIO.sfx('jump'); }
        else { if (this.jumps < 1) this.jumps = 1; if (this.jumps < 2) { p.setVelocityY(-RT.jump * 0.92); this.jumps = 2; burst(this, p.x, p.y - 4, 0xb48cff, 8); AUDIO.sfx('jump'); } }
      }
      if (!inp.jumpHeld && p.body.velocity.y < -250) p.setVelocityY(-250);
      if (inp.attack && now > this.nextShot) { this.nextShot = now + 300; this.castSpell(); }
    }
    p.setFlipX(this.facing < 0);
    // animation
    const air = !(p.body.blocked.down || p.body.touching.down); let st;
    if (air) st = p.body.velocity.y < 0 ? 'up' : 'down'; else st = Math.abs(p.body.velocity.x) > 30 ? 'run' : 'idle';
    if (st !== this.animState) { this.animState = st; if (st === 'up') { p.anims.stop(); p.setTexture('player_jump_up'); } else if (st === 'down') { p.anims.stop(); p.setTexture('player_jump_down'); } else p.play(st, true); }
    // status visuals
    p.setAlpha(now < RT.invisUntil ? 0.3 : now < RT.invulnUntil && Math.floor(now / 90) % 2 ? 0.55 : 1);
    this.glow.setPosition(p.x, p.y - 60);
    if (this.reticle) {
      const wp = this.cameras.main.getWorldPoint(this.input.activePointer.x, this.input.activePointer.y);
      this.reticle.setPosition(wp.x, wp.y);
      const curColor = SPELLS[SAVE.spell] ? SPELLS[SAVE.spell].color : 0xb48cff;
      this.reticle.setTint(curColor);
    }
    if (RT.boneHits > 0 && now < (RT.boneUntil || 0)) this.boneRing.setVisible(true).setPosition(p.x, p.y - 56); else { this.boneRing.setVisible(false); if (now >= (RT.boneUntil || 0)) RT.boneHits = 0; }
    RT.mp = Math.min(RT.maxMp, RT.mp + dt * 0.007);
    // spells / powers
    if (inp.cycle) { const i = SAVE.spells.indexOf(SAVE.spell); SAVE.spell = SAVE.spells[(i + 1) % SAVE.spells.length]; persist(); AUDIO.sfx('ui'); }
    if (inp.p1) this.usePower(0); if (inp.p2) this.usePower(1); if (inp.p3) this.usePower(2);
    // dash damage
    if (now < RT.dashUntil) this.enemies.getChildren().forEach(e => { if (e.active && e.dashed !== this.dashId && Math.abs(e.x - p.x) < 80 && Math.abs(e.y - p.y) < 130) { e.dashed = this.dashId; this.damageEnemy(e, 30, null); } });
    // fall into pit
    if (p.y > H + 90) {
      const sp = this.safeList.length ? this.safeList[0] : { x: L.spawn, y: FLOOR - 40 }; RT.hp -= 14; AUDIO.sfx('hurt'); p.setPosition(sp.x, sp.y); p.setVelocity(0, 0); RT.invulnUntil = now + 900;
      toast(this, 'The ruins remember.'); if (RT.hp <= 0) { this.die(); return; }
    }
    // enemies / projectiles
    this.updateEnemies(now);
    this.proj.getChildren().slice().forEach(b => { if (!b.active || !b.homing) return; if (now > b.until) { b.destroy(); return; }
      let best = null, bd = 900; this.enemies.getChildren().forEach(e => { if (!e.active) return; const d = Phaser.Math.Distance.Between(b.x, b.y, e.x, e.y - 60); if (d < bd) { bd = d; best = e; } });
      if (best) { const a = Math.atan2(best.y - 60 - b.y, best.x - b.x), cur = Math.atan2(b.body.velocity.y, b.body.velocity.x); let diff = Phaser.Math.Angle.Wrap(a - cur); const na = cur + Phaser.Math.Clamp(diff, -0.14, 0.14); b.setVelocity(Math.cos(na) * 560, Math.sin(na) * 560); b.rotation = na; } });
    this.eproj.getChildren().slice().forEach(s => { if (s.active && now > s.die) s.destroy(); });
    // boss trigger
    if (L.boss && !this.bossActive && !SAVE.flags['boss_' + L.boss.id] && p.x > L.boss.trigger) this.startBoss();
    // signs
    (L.signs || []).forEach(s => { if (Math.abs(p.x - s.x) < 190 && Math.abs(p.y - FLOOR) < 260) RT.hint = s.text; });
    // doors
    this.doors.forEach(d => {
      if (Math.abs(p.x - d.x) < 70 && Math.abs(p.y - FLOOR) < 120) {
        const locked2 = d.req && !SAVE.flags[d.req]; RT.prompt = locked2 ? 'Sealed — something still guards this way.' : '[E]  ' + d.label;
        if (inp.interact && !this.transitioning) { if (locked2) toast(this, 'The door will not open. The guardian still lives.'); else this.useDoor(d); }
      }
    });
  }
  useDoor(d) {
    this.transitioning = true; AUDIO.sfx('pick');
    if (this.p && this.p.active) {
      this.p.body.setVelocity(0, 0);
      this.p.anims.stop();
      this.p.setTexture('heroine_back').setScale(0.22);
      this.tweens.add({ targets: this.p, y: this.p.y - 12, alpha: 0.15, duration: 480 });
    }
    this.cameras.main.fadeOut(500);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (d.to === 'victory') { this.scene.stop('UI'); this.scene.start('Victory'); } else this.scene.restart({ level: d.to, sx: d.sx });
    });
  }
}

// ------------------------------------------------------------ UI / HUD / Inventory
class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }
  create() {
    mkTex(this, 'vig', W, H, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.95); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(2,0,6,0.7)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
    this.add.image(0, 0, 'vig').setOrigin(0).setDepth(0);
    this.slowRect = this.add.rectangle(0, 0, W, H, 0x8a4cff, 0.14).setOrigin(0).setDepth(1).setVisible(false);
    this.g = this.add.graphics().setDepth(10);
    const f = (s, c, st) => ({ fontFamily: FONT, fontSize: s + 'px', color: c || '#f2eaff', stroke: '#10061c', strokeThickness: st === undefined ? 3 : st });
    this.hpT = this.add.text(32, 22, '', f(15)).setDepth(11); this.mpT = this.add.text(32, 51, '', f(13)).setDepth(11);
    this.spellIcon = this.add.image(W - 70, 56, 'book_purple').setDepth(11).setScale(0.95).setInteractive({ useHandCursor: true });
    this.spellIcon.on('pointerdown', () => { const i = SAVE.spells.indexOf(SAVE.spell); SAVE.spell = SAVE.spells[(i + 1) % SAVE.spells.length]; persist(); AUDIO.sfx('ui'); });
    this.spellT = this.add.text(W - 70, 100, '', f(16)).setOrigin(0.5, 0).setDepth(11);
    this.add.text(W - 70, 124, 'Q', f(13, '#a894c8')).setOrigin(0.5, 0).setDepth(11);
    // Bag / Inventory touch button
    const bagBtn = this.add.rectangle(W - 146, 56, 58, 58, 0x241838, 0.88).setStrokeStyle(2, 0x9a6cff).setInteractive({ useHandCursor: true }).setDepth(11);
    this.add.text(W - 146, 56, 'BAG\n[F]', f(11, '#e0d0ff')).setOrigin(0.5).setDepth(12);
    bagBtn.on('pointerdown', () => this.toggleInv());
    // Mobile Touch Virtual Controls
    const TI = window.TOUCH_INPUT = window.TOUCH_INPUT || {};
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth < 1000);
    if (isTouch) {
      const mkBtn = (x, y, r, lbl, onDn, onUp) => {
        const c = this.add.circle(x, y, r, 0x221236, 0.58).setStrokeStyle(2, 0xa578ff, 0.85).setInteractive().setDepth(30);
        this.add.text(x, y, lbl, { fontFamily: FONT, fontSize: (r > 38 ? 18 : 15) + 'px', color: '#f4e8ff', stroke: '#100518', strokeThickness: 3 }).setOrigin(0.5).setDepth(31);
        c.on('pointerdown', () => { TI.onBtn = true; c.setFillStyle(0x7844cc, 0.82); onDn(); });
        const up = () => { TI.onBtn = false; c.setFillStyle(0x221236, 0.58); onUp(); };
        c.on('pointerup', up); c.on('pointerout', up);
      };
      // D-Pad Left / Right
      mkBtn(80, H - 75, 42, '◀', () => { TI.left = true; }, () => { TI.left = false; });
      mkBtn(180, H - 75, 42, '▶', () => { TI.right = true; }, () => { TI.right = false; });
      // Action Buttons
      mkBtn(W - 85, H - 85, 48, 'JUMP', () => { TI.jump = true; TI.jumpEdge = true; }, () => { TI.jump = false; });
      mkBtn(W - 195, H - 85, 44, 'ATK', () => { TI.attack = true; }, () => { TI.attack = false; });
      mkBtn(W - 140, H - 190, 36, '[E]', () => { TI.interactEdge = true; }, () => {});
    }
    this.slotIcons = [0, 1, 2].map(i => this.add.image(24 + i * 80 + 34, H - 64, 'dot').setVisible(false).setDepth(11));
    [0, 1, 2].forEach(i => this.add.text(30 + i * 80, H - 100, String(i + 1), f(14, '#cdb8ff')).setDepth(12));
    this.bossT = this.add.text(740, 22, '', { fontFamily: FONT, fontSize: '24px', color: '#ffe0e8', stroke: '#2a0010', strokeThickness: 5 }).setOrigin(0.5, 0).setDepth(12).setVisible(false);
    this.hintT = this.add.text(W / 2, H - 126, '', { fontFamily: FONT, fontSize: '24px', color: '#f4ecff', align: 'center', wordWrap: { width: 860 }, stroke: '#10061c', strokeThickness: 4 }).setOrigin(0.5, 1).setDepth(12);
    this.promptT = this.add.text(W / 2, H - 76, '', { fontFamily: FONT, fontSize: '26px', color: '#ffe9a8', stroke: '#2a1a00', strokeThickness: 5 }).setOrigin(0.5).setDepth(12);
    this.toastT = this.add.text(W / 2, 140, '', { fontFamily: FONT, fontSize: '26px', color: '#f0e0ff', align: 'center', wordWrap: { width: 900 }, stroke: '#10061c', strokeThickness: 5 }).setOrigin(0.5).setDepth(12).setAlpha(0);
    this.bossShown = 0; this.curSpell = '';
    const onToast = (t) => { this.toastT.setText(t).setAlpha(1); this.tweens.killTweensOf(this.toastT); this.tweens.add({ targets: this.toastT, alpha: 0, delay: 3600, duration: 800 }); };
    this.game.events.on('toast', onToast); this.events.once('shutdown', () => this.game.events.off('toast', onToast));
    this.inv = false; this.pauseOpen = false; this.pe = {};
    const kb = this.input.keyboard;
    kb.on('keydown-F', () => this.toggleInv()); kb.on('keydown-ESC', () => { if (this.inv) this.toggleInv(); else this.togglePause(); });
    kb.on('keydown-TAB', (e) => e.preventDefault());
  }
  toggleInv() {
    if (this.pauseOpen) return;
    if (!this.inv) { if (!this.scene.isActive('Game')) return; this.scene.pause('Game'); this.inv = true; this.selSlot = null; this.buildInv(); AUDIO.sfx('ui'); }
    else { this.inv = false; if (this.invC) { this.invC.destroy(true); this.invC = null; } this.scene.resume('Game'); AUDIO.sfx('ui'); }
  }
  togglePause() {
    if (!this.pauseOpen) {
      if (!this.scene.isActive('Game')) return; this.scene.pause('Game'); this.pauseOpen = true;
      const c = this.add.container(0, 0).setDepth(200); this.pauseC = c;
      c.add(this.add.rectangle(0, 0, W, H, 0x05020a, 0.75).setOrigin(0));
      c.add(this.add.text(W / 2, 250, 'PAUSED', { fontFamily: FONT, fontSize: '80px', color: '#d9c2ff' }).setOrigin(0.5));
      const mk = (y, label, fn) => { const t = this.add.text(W / 2, y, label, { fontFamily: FONT, fontSize: '36px', color: '#9a86b8' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        t.on('pointerover', () => t.setColor('#fff')); t.on('pointerout', () => t.setColor('#9a86b8')); t.on('pointerdown', fn); c.add(t); };
      mk(360, 'Resume  (Esc)', () => this.togglePause());
      mk(430, 'Main Menu', () => { this.togglePause(); this.scene.stop('Game'); this.scene.stop('UI'); this.scene.start('Menu'); });
    } else { this.pauseOpen = false; this.pauseC.destroy(true); this.scene.resume('Game'); }
  }
  buildInv() {
    if (this.invC) this.invC.destroy(true);
    const c = this.add.container(0, 0).setDepth(100); this.invC = c;
    const T = (x, y, s, size, col, o) => { const t = this.add.text(x, y, s, Object.assign({ fontFamily: FONT, fontSize: size + 'px', color: col || '#e8dcff' }, o || {})); c.add(t); return t; };
    const dim = this.add.rectangle(0, 0, W, H, 0x05030a, 0.9).setOrigin(0).setInteractive(); c.add(dim);
    const pan = this.add.rectangle(80, 40, 1120, 640, 0x16101e, 0.97).setOrigin(0).setStrokeStyle(3, 0x6a4a8a); c.add(pan);
    T(640, 58, 'INVENTORY   —   time is stopped', 30, '#d9c2ff').setOrigin(0.5);
    T(1180, 650, 'F / Esc — close', 16, '#7a6a96').setOrigin(1, 0.5);
    const tip = T(100, 636, 'Hover an item to read about it.', 20, '#b9a8d8', { wordWrap: { width: 1060 } }); this.tip = tip;
    const hover = (o, text) => { o.on('pointerover', () => tip.setText(text)); };
    // ----- equipment
    c.add(this.add.image(280, 330, 'player_idle_0').setScale(1.15));
    const eqPos = { head: [280, 110], chest: [150, 320], charm: [410, 320], feet: [280, 520] }, names = { head: 'HEAD', chest: 'CHEST', charm: 'CHARM', feet: 'BOOTS' };
    Object.keys(eqPos).forEach(slot => {
      const [x, y] = eqPos[slot], id = SAVE.equip[slot];
      const b = this.add.rectangle(x, y, 90, 90, 0x241a30, 0.95).setStrokeStyle(2, id ? 0xb48cff : 0x4a3a60).setInteractive({ useHandCursor: !!id }); c.add(b);
      T(x, y + 52, names[slot], 14, '#8a7aa8').setOrigin(0.5);
      if (id) { c.add(this.add.image(x, y, 'gear_' + id).setScale(1.1)); b.on('pointerdown', () => { SAVE.equip[slot] = null; recalcStats(); persist(); this.buildInv(); }); hover(b, GEAR[id].name + ' — ' + GEAR[id].desc + '   (click to unequip)'); }
      else hover(b, 'Empty ' + names[slot].toLowerCase() + ' slot.');
    });
    const s = calcStats();
    T(100, 598, `HP ${s.hp}   MP ${s.mp}   SPEED ${s.spd}   JUMP ${s.jump}   SPELL DMG +${Math.round((s.dmg - 1) * 100)}%`, 17, '#a898c8');
    // ----- spellbooks
    T(520, 100, 'SPELLBOOKS   (your normal attack — Q cycles)', 20, '#cdb8ff');
    Object.keys(SPELLS).forEach((id, i) => {
      const x = 552 + i * 76, y = 168, own = SAVE.spells.includes(id);
      const b = this.add.rectangle(x, y, 68, 68, 0x241a30, 0.95).setStrokeStyle(own && SAVE.spell === id ? 4 : 2, own && SAVE.spell === id ? 0xfff0a0 : 0x4a3a60).setInteractive({ useHandCursor: own }); c.add(b);
      const im = this.add.image(x, y, 'book_' + id).setScale(1); if (!own) im.setTint(0x2a2236).setAlpha(0.7); c.add(im);
      if (own) b.on('pointerdown', () => { SAVE.spell = id; persist(); this.buildInv(); });
      hover(b, own ? SPELLS[id].name + ' — ' + SPELLS[id].desc : 'Undiscovered spellbook. Explore the ruins and dungeons.');
    });
    // ----- powers
    T(520, 232, 'POWERS   (only 3 slots — click a slot, then click a power)', 20, '#cdb8ff');
    for (let i = 0; i < 3; i++) {
      const x = 566 + i * 118, y = 318, id = SAVE.slots[i];
      const b = this.add.rectangle(x, y, 92, 92, 0x241a30, 0.95).setStrokeStyle(this.selSlot === i ? 4 : 2, this.selSlot === i ? 0xfff0a0 : 0x6a4a8a).setInteractive({ useHandCursor: true }); c.add(b);
      T(x - 40, y - 42, String(i + 1), 17, '#cdb8ff');
      if (id) { c.add(this.add.image(x, y, 'pow_' + id).setScale(1.2)); }
      b.on('pointerdown', () => { if (this.selSlot === i && SAVE.slots[i]) { SAVE.slots[i] = null; } else this.selSlot = i; persist(); this.buildInv(); });
      hover(b, id ? 'Slot ' + (i + 1) + ': ' + POWERS[id].name + ' — ' + POWERS[id].desc + ' (' + POWERS[id].cost + ' mana)   click again to clear' : 'Slot ' + (i + 1) + ' is empty. Click it, then pick a power below.');
    }
    T(520, 384, 'OWNED POWERS', 16, '#8a7aa8');
    SAVE.powers.forEach((id, i) => {
      const x = 552 + i * 76, y = 440, inSlot = SAVE.slots.indexOf(id) >= 0;
      const b = this.add.rectangle(x, y, 68, 68, 0x241a30, 0.95).setStrokeStyle(inSlot ? 3 : 2, inSlot ? 0xb48cff : 0x4a3a60).setInteractive({ useHandCursor: true }); c.add(b);
      c.add(this.add.image(x, y, 'pow_' + id).setScale(0.95));
      b.on('pointerdown', () => {
        let target = this.selSlot; if (target === null || target === undefined) { target = SAVE.slots.indexOf(null); if (target < 0) target = 0; }
        const old = SAVE.slots[target], other = SAVE.slots.indexOf(id); if (other >= 0) SAVE.slots[other] = (other === target) ? null : old; SAVE.slots[target] = id;
        if (other === target) SAVE.slots[target] = id; persist(); this.buildInv();
      });
      hover(b, POWERS[id].name + ' — ' + POWERS[id].desc + ' (' + POWERS[id].cost + ' mana)');
    });
    if (!SAVE.powers.length) T(552, 424, 'None yet — find a power in the ruins.', 17, '#6a5a86');
    // ----- gear
    T(520, 504, 'GEAR   (click to equip / unequip)', 20, '#cdb8ff');
    SAVE.gear.forEach((id, i) => {
      const x = 552 + i * 76, y = 568, eq = SAVE.equip[GEAR[id].slot] === id;
      const b = this.add.rectangle(x, y, 68, 68, 0x241a30, 0.95).setStrokeStyle(eq ? 4 : 2, eq ? 0xfff0a0 : 0x4a3a60).setInteractive({ useHandCursor: true }); c.add(b);
      c.add(this.add.image(x, y, 'gear_' + id).setScale(0.95)); if (eq) T(x + 22, y - 32, 'E', 15, '#fff0a0');
      b.on('pointerdown', () => { const sl = GEAR[id].slot; SAVE.equip[sl] = eq ? null : id; recalcStats(); persist(); this.buildInv(); });
      hover(b, GEAR[id].name + ' — ' + GEAR[id].desc);
    });
    if (!SAVE.gear.length) T(552, 556, 'No gear yet — chests and dungeons hide the good stuff.', 17, '#6a5a86');
  }
  update() {
    const g = this.g; g.clear();
    // controller: Y opens inventory
    const pd = pad(); const y = !!(pd && pd.buttons[3] && pd.buttons[3].pressed); if (y && !this.pe.y) this.toggleInv(); this.pe.y = y;
    const clock = RT.clock || 0;
    // hp / mp
    g.fillStyle(0x0d0614, 0.85).fillRoundedRect(24, 18, 330, 26, 8); g.fillStyle(0xd02a58, 1).fillRoundedRect(27, 21, Math.max(0, 324 * RT.hp / RT.maxHp), 20, 6); g.fillStyle(0xffffff, 0.2).fillRoundedRect(27, 21, Math.max(0, 324 * RT.hp / RT.maxHp), 7, 4);
    g.lineStyle(2, 0x8a6aba, 1).strokeRoundedRect(24, 18, 330, 26, 8);
    g.fillStyle(0x0d0614, 0.85).fillRoundedRect(24, 48, 270, 20, 7); g.fillStyle(0x4a86ff, 1).fillRoundedRect(26, 50, Math.max(0, 266 * RT.mp / RT.maxMp), 16, 5); g.lineStyle(2, 0x6a8aca, 1).strokeRoundedRect(24, 48, 270, 20, 7);
    this.hpT.setText(`${Math.ceil(RT.hp)} / ${RT.maxHp}`); this.mpT.setText(`${Math.floor(RT.mp)} / ${RT.maxMp}`);
    // spell
    if (this.curSpell !== SAVE.spell) { this.curSpell = SAVE.spell; this.spellIcon.setTexture('book_' + SAVE.spell); this.spellT.setText(SPELLS[SAVE.spell].name); }
    g.lineStyle(3, SPELLS[SAVE.spell].color, 0.9).strokeCircle(W - 70, 56, 36);
    // power slots
    for (let i = 0; i < 3; i++) {
      const x = 24 + i * 80, y0 = H - 100, id = SAVE.slots[i], ic = this.slotIcons[i];
      g.fillStyle(0x0d0614, 0.85).fillRoundedRect(x, y0, 68, 68, 10);
      if (id) {
        if (ic.texture.key !== 'pow_' + id) ic.setTexture('pow_' + id); ic.setVisible(true).setScale(0.95);
        const P = POWERS[id], rem = Math.max(0, ((RT.cdUntil && RT.cdUntil[id]) || 0) - clock) / P.cd;
        if (rem > 0) { g.fillStyle(0x05020a, 0.7).fillRoundedRect(x, y0, 68, 68 * rem, 10); }
        else if (RT.mp < P.cost) { g.fillStyle(0x05020a, 0.5).fillRoundedRect(x, y0, 68, 68, 10); }
      } else ic.setVisible(false);
      g.lineStyle(2, id ? 0xb48cff : 0x4a3a60, 1).strokeRoundedRect(x, y0, 68, 68, 10);
    }
    // boss bar (top)
    const bs = RT.boss;
    if (bs) {
      this.bossShown += (bs.hp - this.bossShown) * 0.1; if (Math.abs(bs.hp - this.bossShown) < 1) this.bossShown = bs.hp;
      const x = 390, y = 56, w = 700, h = 30, fr = Math.max(0, this.bossShown / bs.max);
      g.fillStyle(0x0d0306, 0.92).fillRoundedRect(x - 6, y - 6, w + 12, h + 12, 10);
      g.fillStyle(0x6a1020, 1).fillRoundedRect(x, y, w, h, 6);
      g.fillStyle(bs.phase === 2 ? 0xff3a5a : 0xd92848, 1).fillRoundedRect(x, y, w * Math.max(0, bs.hp / bs.max), h, 6);
      g.fillStyle(0xffd0d8, 0.35).fillRoundedRect(x, y, w * fr, 8, 4);
      g.lineStyle(3, 0xe8a0b0, 1).strokeRoundedRect(x - 6, y - 6, w + 12, h + 12, 10);
      g.fillStyle(0xffe0e8, 1); for (let i = 0; i < 2; i++) { const px = x + w - 30 - i * 26; if (i < (bs.phase === 2 ? 1 : 2)) g.fillCircle(px, y + h + 16, 7); else { g.lineStyle(2, 0xe8a0b0, 1).strokeCircle(px, y + h + 16, 7); } }
      this.bossT.setVisible(true).setText(bs.name);
    } else { this.bossT.setVisible(false); this.bossShown = 0; }
    // hint panels
    this.hintT.setText(RT.hint || '').setVisible(!!RT.hint);
    if (RT.hint) { const b = this.hintT.getBounds(); g.fillStyle(0x0d0614, 0.82).fillRoundedRect(b.x - 18, b.y - 12, b.width + 36, b.height + 24, 12); g.lineStyle(2, 0x8a6aba, 0.9).strokeRoundedRect(b.x - 18, b.y - 12, b.width + 36, b.height + 24, 12); }
    this.promptT.setText(RT.prompt || '');
    this.slowRect.setVisible(clock < (RT.slowUntil || 0));
  }
}

// ------------------------------------------------------------ Victory
class VictoryScene extends Phaser.Scene {
  constructor() { super('Victory'); }
  create() {
    this.cameras.main.setBackgroundColor('#05030a'); this.cameras.main.fadeIn(1500);
    this.add.text(W / 2, 210, 'THE VEIL IS THIN AGAIN', { fontFamily: FONT, fontSize: '64px', color: '#d9c2ff' }).setOrigin(0.5);
    this.add.text(W / 2, 330, 'She walks out of the chapel. The water is very still.\nIn it, her reflection is smiling.\nShe is not.', { fontFamily: FONT, fontSize: '30px', fontStyle: 'italic', color: '#a99ac0', align: 'center', lineSpacing: 12 }).setOrigin(0.5);
    this.add.text(W / 2, 520, 'thanks for playing  —  press any key', { fontFamily: FONT, fontSize: '22px', color: '#6a5c80' }).setOrigin(0.5);
    this.input.keyboard.once('keydown', () => this.scene.start('Menu')); this.input.once('pointerdown', () => this.scene.start('Menu'));
  }
}

window.addEventListener('load', () => {
  new Phaser.Game({
    type: Phaser.AUTO, width: W, height: H, parent: 'game', backgroundColor: '#05030a',
    render: { antialias: true, pixelArt: false, roundPixels: false },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { y: 1800 }, debug: false } },
    scene: [BootScene, MenuScene, GameScene, UIScene, VictoryScene]
  });
});
