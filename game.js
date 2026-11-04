// El día del Platanus
// 1-player 16-bit runner: Canelita runs across Chile catching bananas, then eats one as fast as she can.
(() => { // scoped so the minifier can mangle top-level names
const { sin, cos, max, min, abs, random, sqrt, ceil, floor, PI, round } = Math;

const W = 800;
const H = 600;
const WHITE = '#fff';
const CAM_X = 250; // Canelita's screen x
const STORAGE_KEY = 'canelita-v2'; // v1 held point scores, not comparable to banana counts
const MAX_HIGH_SCORES = 5;
const WINNING_NAME_LENGTH = 3;
const COLORS = { accent: 0xffd83a, backdrop: 0x1a0e06 };
const AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
// Initials rejected by the angry Canelita (English + Chilean slang).
const BAD = 'ASS FUK FUC FCK FUQ SEX CUM DIK DIC COK FAG NIG NGR KKK TIT XXX NAZ CTM CSM PTM CHT QLO CUL PIC PIK PTA PUT PNE VRG MRD HDP PEO'.split(' ');

// DO NOT replace existing keys — they match the physical arcade cabinet wiring.
// To add local testing shortcuts, append extra keys to any array.
const CABINET_KEYS = {
  P1_U: ['w'],
  P1_D: ['s'],
  P1_L: ['a'],
  P1_R: ['d'],
  P1_1: ['u', ' '],
  P1_2: ['i'],
  P1_3: ['o'],
  P1_4: ['j'],
  P1_5: ['k'],
  P1_6: ['l'],
  P2_U: ['ArrowUp'],
  P2_D: ['ArrowDown'],
  P2_L: ['ArrowLeft'],
  P2_R: ['ArrowRight'],
  P2_1: ['r'],
  P2_2: ['t'],
  P2_3: ['y'],
  P2_4: ['f'],
  P2_5: ['g'],
  P2_6: ['h'],
  START1: ['Enter'],
  START2: ['2'],
};

const KEYBOARD_TO_ARCADE = {};
for (const [arcadeCode, keys] of Object.entries(CABINET_KEYS)) {
  for (const key of keys) {
    KEYBOARD_TO_ARCADE[normalizeIncomingKey(key)] = arcadeCode;
  }
}

// ---------- Levels ----------
// v: [start speed, end speed], len: level length in px, g/w: gap and platform width ranges, f: parallax factors.
const LEVELS = [
  { n: 'DORMITORIO', bg: ['b0a'], f: [0.25], v: [240, 280], len: 4500 },
  { n: 'CERRO SAN CRISTÓBAL', bg: ['b1a', 'b1b'], v: [290, 390], len: 15000, lm: ['sc1v', 'sc1c'], tile: 'tg', ob: 'ob1', g: [70, 190], w: [260, 620], mud: 1, cab: 1 },
  { n: 'COSTANERA CENTER', bg: ['b2a', 'b2b'], v: [290, 380], len: 16000, lm: ['cco0', 'cco1'], tile: 'tr', ob: 'ob2', g: [70, 170], w: [280, 600], quake: 1, oc: 0.3 },
  // sho reskins the mud chaser as a shoggoth.
  { n: 'SAN FRANCISCO', bg: ['sfA', 'sfB'], v: [340, 470], len: 17000, lm: ['sf0', 'sfL', 'sfZ'], tile: 'tr', ob: 'ob2', g: [100, 235], w: [190, 520], mud: 1, sho: 1 },
  { n: 'VILLARRICA', bg: ['vla', 'vlb'], v: [290, 380], len: 17500, lm: ['vlm0', 'vlm1', 'vlm2'], tile: 'vlt', ob: 'vlo', g: [70, 170], w: [280, 600], volc: 1 },
  { n: 'ANTÁRTICA', bg: ['an0a', 'an0b'], v: [380, 510], len: 18000, lm: ['anl1', 'anl2'], tile: 'tan', ob: 'oban', g: [105, 230], w: [180, 480] },
];

// ---------- Music (transcribed from the stems in music/, see music/song.mid) ----------
// One char per 16th note: MIDI note + 8 as a char ('0' = E2, 'X' = G#5), '-' holds the previous note (a letter after '-' makes it a run of holds: '-a' = 2, '-c' = 4), '.' is silence ('_' + letter is a run of silence, like '-'); drums: k kick, s snare, x hat.
const SONG = {
  // ref: 7.862s @110bpm
  bpm: 110,
  t: [
    ['square', 0.2, 'TTVXX.T-cTQQO-gV.XX.VT-bVVX-.T-T-bQQO-eJ-SQJJ.HH-HTVVXX.T-T-bQQO-eO-V.X-aVT-bVVXX.T-T-bQQO-eJ..QOO.HHH-a_cS-T-QQO-aT-TT-VV..V.TVVQQT-b..OO-SOLJJMMJJED_dV.TVVQST-b_bTQSTJJLLH_hV.TVVQST-b_bOOMITV.VO.L.MHOO..X..X-aVUUTTVXX.T-T-aTQQO-gV.X-aVT-bVVXX.T-T-bQQO-eJJSQJJ.HH-H..VX-.T-T-aTQQO-eO-V.X-.VTT-aVVX-.T-T-bQQO-dOJ..Q-O.HH-c_cT-T-bQQO-gV.XX-VT-gT-T-aTQQO-eJ-TQJJ.HH-H..VX-.T-T-aTQQO-gV.X-aVT-aT-dT-T-bQQO-eJ..QOO.HH-b_z_z_z_z_v'],
    ['triangle', 0.2, '_f<-e5-g7-a;-a<-h<-e>-g7-a;-a<-h<-e5-g7-a;-a<-h<-e>-g7-a;-a<-h<<-d5-g7-a;-a<-h<-e>-c>-b7-a;-a<-h<-e5-g7-a;-a<-h<-e>-g7-_m<-e5-g7-a;-a<-h<-e>-g7-a;-a<-h<-e5-g7-a;-a<-h<-e>-g7-a;-a<-f_q7-a;-a<-h<-e>-g7-a;-a<-h<-e5-g7-a;-a<-h_z_d<-d<5-c5-b7-a;-a<-b<-<-<<<-d<>-e>-7-7;-a<-d<-b<-d<5-g7-a;-a<-b<-<-<-<-d<>-e>>7-7;;;<-e'],
    ['noise', 0.2, '_fk_bs..s_bks..kkx.ss.k.xxxxs..x.xxxs.xsx.xks.kxkx.xs.s.xksxs..x.xxxs.xk..kxs..x.x.ss_ckxks.xk.xxks.xkx.kxs_bsx.ss.k.xxsxs_bs_ek_ck_bk..ss.k.x.x.s_bs.x.s.ksx.k.s_bs.xss.k.x.s.s.k.s.x.s.xsx.k.s.k.k.xss.k.x.k.s.k.k.x.s.xsx.k.s.x.k_nk_ek_ck.k.k..ks.k.xxxxs..x.xxxs.xk..kks.kxsx.ks.k..xsxs.x.sxxks.xsx.kxs.k.sx.sskk.xxkks.xksxxxsk.sx.kxs.kxsx.ss.k.xxsxs_bk_ek_gk_dk.xxxxs.xxsxxxs..sx.kxs.kk.x.ss.s.xxsxs.kx.xxxs.ksx.xxs..xkx.ss.k.xxxks_z_gk_bk..k_ck_eks.k..kxxs.xx.xxks.xkx.xxs.xxkx.ss.k.xksxs.xx.xxxs.xkx.xxs.xxkx.ss.k.xxxxs.xxkxxxs.xkx.xxs.xxkx.ss.k.xxsxs'],
  ],
};

// [wave, startHz, endHz, seconds, volume, delay]
const SFX = {
  jump: [['square', 300, 620, 0.12, 0.08]],
  jump2: [['square', 420, 900, 0.12, 0.08]],
  catch: [['square', 988, 1976, 0.08, 0.07]],
  hit: [['sawtooth', 320, 70, 0.35, 0.15]],
  bite: [['square', 160, 50, 0.07, 0.15]],
  quake: [['sawtooth', 60, 30, 0.9, 0.2]],
  fall: [['triangle', 600, 80, 0.6, 0.15]],
  clear: [['square', 523, 523, 0.1, 0.08], ['square', 659, 659, 0.1, 0.08, 0.1], ['square', 784, 784, 0.1, 0.08, 0.2], ['square', 1047, 1047, 0.3, 0.08, 0.3]],
  click: [['square', 1200, 600, 0.05, 0.06]],
  select: [['square', 700, 1400, 0.1, 0.08]],
};

// ---------- Pixel sprites (one char per pixel, see PAL) ----------
const PAL = { k: '#2a1608', b: '#8a5630', d: '#5a3418', c: '#ead2a8', w: WHITE, e: '#111', p: '#f2a0b4', y: '#ffd83a', o: '#9a6a00', g: '#8a8a90', l: '#c8c8d0', m: '#5a5a62', a: '#9fdcff', n: '#c98a58', z: '#f6e3c8', r: '#f08a24', s: '#c0581a', v: '#5cc23a', t: '#2e7a22' };
// Canelita, 26×17 grid at scale 3 (78×51 px). Parts are ellipse lobes [x, y, rx, ry, PAL colour]; texBunny paints
// all outlines first and fills after, so only the outer silhouette gets a dark line.
const BUNNY = [
  [11, 10, 6, 4, 'b'],  // round haunch (only the butt curves down)
  [14, 10, 6, 3, 'b'],  // body: back steps down 1px from the hips toward the head (slight arc)
  [21, 9, 3, 3, 'b'],  // small round head, poking just forward of the body
];
// Leg lobes per frame: stretched, gathered, push, jump.
const LEGS = [
  [[10, 15, 0, 1, 'b'], [9, 16, 0, 0, 'd'], [19, 15, 0, 1, 'b'], [20, 16, 0, 0, 'd']],
  [[12, 15, 0, 1, 'b'], [12, 16, 0, 0, 'd'], [16, 15, 0, 1, 'b'], [16, 16, 0, 0, 'd']],
  [[11, 15, 0, 1, 'b'], [10, 16, 0, 0, 'd'], [18, 15, 0, 1, 'b'], [19, 16, 0, 0, 'd']],
  [[9, 14, 0, 1, 'b'], [8, 15, 0, 0, 'd'], [19, 14, 0, 1, 'b'], [20, 15, 0, 0, 'd']],
];
// Short ears raised at an angle back from the head (pixel stamp at grid x=13, y=1):
// near ear with a pink inside, far ear darker and peeking behind it.
const BUN_EAR = ['..kk.....', '.kdpk.kk.', '..kdpkddk', '...kdpkdk', '....kddk.'];
const RUN_CYCLE = [0, 2, 1, 2];
const BANANA = '.......oo. .......oyo ......oyyo ......oyyo .....oyyyo ....oyyyyo ..ooyyyyo. .oyyyyyyo. oyyyyyoo.. .ooooo....';
const CARROT = '......v..v .....vtvvt ......vtt. ....kkkv.. ...krrrk.. ..krrsrk.. ..krrrrk.. .krsrrk... .krrrk.... krrsk..... krk....... kk........';
const OBSTACLES = {
  ob0: '.kkkkkkkk. kppppppppk kpwwppwwpk kppppppppk kppwppwppk kppppppppk .kkkkkkkk.',
  ob1: '...kkkkk... ..kllgggk.. .klggggggk. kgggggggmmk kggggggmmmk kgggggmmmmk .kkkkkkkkk.',
  ob2: 'kkkkkkkkkk kllllllllk klmmmmmmlk klmgggmllk klmgmgmllk klmgggmllk klmmmmmmlk kllllllllk kkkkkkkkkk',
  gl: '.aa. aawa aaaa .aaa .aa. ..a.',
};

const config = {
  type: Phaser.AUTO,
  width: W,
  height: H,
  parent: 'game-root',
  backgroundColor: '#1a0e06',
  pixelArt: true,
  // fixedStep off: a fixed 60Hz step stutters on 120Hz displays.
  physics: { default: 'arcade', arcade: { gravity: { y: 1500 }, fixedStep: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
  scene: { preload, create, update },
};

new Phaser.Game(config);

function preload() {}

function create() {
  const sc = this;
  makeTextures(sc);

  sc.state = {
    phase: 'start',
    bananas: 0,
    lv: 0,
    t: 0,
    hs: [],
    ne: { letters: [], i: 0, t: 0 },
  };

  // Far layer depth -10, landmarks -9, near filler layer -8.
  sc.bgs = [0, 1].map((i) => sc.add.tileSprite(0, 0, W, H, 'none').setOrigin(0).setScrollFactor(0).setDepth(-10 + i * 2));
  sc.lms = sc.add.group();
  // San Cristóbal movers on the near layer: teleférico cabins (k<6: even forward on the upper cable, odd back on the lower)
  // and bikes on the trail (k>=6, alternating direction). Each sits at tile x b + v*t, with 2 copies so it wraps without popping.
  sc.mov = [];
  for (let k = 0; k < 10; k++)
    for (let o = 0; o < 2; o++) {
      const cab = k < 6, d = k & 1;
      sc.mov.push({
        im: sc.add.image(0, 0, cab ? 'cab' + (k % 3) : 'bk0').setOrigin(0.5, cab ? 1 / 34 : 1).setScrollFactor(0).setDepth(cab ? -7.5 - d * 0.2 : -7.9).setFlipX(!cab && d).setVisible(false),
        b: cab ? (k * W) / 6 : ((k - 6) * W) / 4,
        v: (d ? -1 : 1) * (cab ? 0.015 : 0.04),
        o,
        f: cab ? (p) => CAB(p, d * 12) : TR,
        a: cab ? -1 : k & 2,
      });
    }

  const P = sc.physics.add;
  sc.plats = P.staticGroup();
  sc.bans = P.staticGroup();
  sc.obs = P.staticGroup();
  sc.debris = P.group();
  sc.junk = sc.add.group();

  // The physics sprite is invisible; `vis` draws Canelita so animation never touches the hitbox.
  sc.pl = P.sprite(120, 380, 'c0').setVisible(false);
  sc.pl.body.setSize(42, 30).setOffset(18, 21);
  sc.vis = sc.add.image(120, 380, 'c0').setDepth(3);
  P.collider(sc.pl, sc.plats, (_, p) => land(sc, p));
  P.overlap(sc.pl, sc.bans, (_, b) => grab(sc, b));
  P.overlap(sc.pl, sc.obs, () => hit(sc));
  P.overlap(sc.pl, sc.debris, (_, d) => {
    d.destroy();
    hit(sc);
  });

  // Texture x=560 is the mud front at ground height (y=470).
  sc.mud = sc.add.image(0, 0, 'mud0').setOrigin(560 / 600, 470 / H).setScrollFactor(0).setDepth(5).setVisible(false);

  createHud(sc);
  createSmash(sc);
  createEndGameUi(sc);
  createStartScreen(sc);
  createPause(sc);
  createControls(sc);
  showStart(sc);

  loadHighScores()
    .then((h) => {
      sc.state.hs = h;
      refreshLeaderboard(sc);
    })
    .catch(() => {});
}

function update(time, delta) {
  const sc = this;
  const st = sc.state;
  if (!st) return;
  st.t = time;
  const ph = st.phase;

  if (ph === 'start') {
    const L = sc.menu.L, cam = sc.cameras.main;
    // shortcut: wrapping at L.len makes the scenery pop once per ~50s loop.
    cam.scrollX = (cam.scrollX + delta * 0.3) % L.len;
    scrollScenery(sc, L, time);
    const d = consumeAnyPressedControl(sc, ['P1_R']) - consumeAnyPressedControl(sc, ['P1_L']);
    if (d) pick(sc, (st.only + d + LEVELS.length) % LEVELS.length);
    if (consumeAnyPressedControl(sc, ['START1', 'P1_1'])) {
      playSound(sc, 'select');
      startMusic(sc);
      newGame(sc);
    }
  } else if (ph === 'playing') {
    st.ms += delta;
    play(sc, time, delta);
    if (consumeAnyPressedControl(sc, ['START1'])) pause(sc, true);
  } else if (ph === 'paused') {
    if (consumeAnyPressedControl(sc, ['START1'])) pause(sc, false);
  } else if (ph === 'smash') {
    smash(sc, time);
  } else if (ph === 'clear') {
    if (time > st.wait && consumeAnyPressedControl(sc, ['START1', 'P1_1', 'P1_2'])) {
      sc.sm.c.setVisible(false);
      if (st.only) returnToStart(sc);
      else if (st.lv + 1 < LEVELS.length) startLevel(sc, st.lv + 1);
      else showNameEntry(sc, '¡FELIZ DÍA DEL\nPLATANUS!');
    }
  } else if (ph === 'gameover') {
    handleNameEntry(sc, time);
  } else if (ph === 'saved') {
    if (consumeAnyPressedControl(sc, ['START1', 'P1_1', 'P1_2'])) returnToStart(sc);
  }
}

function setPhase(sc, p) {
  sc.state.phase = p;
  sc.ctl.pressed = Object.create(null);
}

// ---------- Game flow ----------
function newGame(sc) {
  sc.state.ms = 0;
  sc.state.bananas = 0;
  sc.state.lives = 3;
  showLives(sc);
  sc.menu.c.setVisible(false);
  sc.hud.c.setVisible(true);
  startLevel(sc, sc.state.only);
}

function startLevel(sc, i) {
  const st = sc.state;
  const L = LEVELS[i];
  st.lv = i;
  st.L = L;
  [sc.plats, sc.bans, sc.obs, sc.debris, sc.junk].forEach((g) => g.clear(true, true));
  setScenery(sc, L);
  sc.pl.setPosition(120, 380);
  sc.pl.body.setVelocity(0, 0);
  sc.vis.setPosition(120, 380).setVisible(true).setAlpha(1).setAngle(0).setScale(1).clearTint();
  sc.cameras.main.scrollX = 0;
  Object.assign(st, { gx: 0, top: 470, end: 0, slow: 0, inv: 0, jumps: 0, coy: 0, px: 120, mud: 110, air: 0, quakeAt: st.t + 6000, quakeEnd: 0, qn: 0, dropAt: 0, speed: L.v[0] });
  st.b0 = st.bananas;
  // From level 1 on, one banana mid-level is replaced by a carrot (extra life).
  st.carX = i ? L.len * (0.3 + random() * 0.4) : 0;
  sc.mud.setVisible(false);
  if (i === 0) {
    buildBedroom(sc);
  } else {
    plat(sc, -200, 900, 470, L.tile);
    st.gx = 700;
  }
  sc.hud.name.setText(L.n);
  banner(sc, `NIVEL ${i}\n${L.n}`);
  sc.physics.resume();
  setPhase(sc, 'playing');
}

function setScenery(sc, L) {
  sc.bgs.forEach((b, j) => b.setTexture(L.bg[j] || 'none'));
  // Landmarks: bottom-aligned images spread evenly over the level, scrolling at parallax factor lf.
  sc.lms.clear(true, true);
  (L.lm || []).forEach((k, j) =>
    sc.lms.add(sc.add.image(700 + (j * L.len * 0.2) / L.lm.length, H, k).setOrigin(0.5, 1).setScrollFactor(0.2, 0).setDepth(-9)),
  );
  sc.mov.forEach((q) => q.im.setVisible(!!L.cab));
  if (L.volc) volcScenery(sc);
}

// Backdrop parallax and the San Cristóbal movers, driven by the camera's scrollX.
function scrollScenery(sc, L, t) {
  sc.bgs.forEach((bg, j) => (bg.tilePositionX = sc.cameras.main.scrollX * ((L.f || [0.06, 0.3])[j] || 0)));
  if (L.cab) {
    const m = (a) => ((a % W) + W) % W, tp = sc.bgs[1].tilePositionX;
    sc.mov.forEach((q) => {
      const p = m(q.b + q.v * t);
      q.im.setPosition(m(p - tp) - q.o * W, q.f(p));
      if (q.a >= 0) q.im.setTexture('bk' + (q.a + ((t / 120) & 1))); // pedaling: 2 frames
    });
  }
}

function play(sc, t, dl) {
  const st = sc.state;
  const L = st.L;
  const pl = sc.pl;
  const b = pl.body;
  const dt = dl / 1000;
  const cam = sc.cameras.main;

  const p = Phaser.Math.Clamp(pl.x / L.len, 0, 1);
  const tgt = (st.tgt = L.v[0] + (L.v[1] - L.v[0]) * p);
  const ground = b.blocked.down || b.touching.down;
  // R / B3 = run faster (only on the ground, so jump arcs stay predictable), L / B1 = run slower (held).
  const fast = ground && (isControlHeld(sc, 'P1_R') || isControlHeld(sc, 'P1_3'));
  const slow = isControlHeld(sc, 'P1_L') || isControlHeld(sc, 'P1_1');
  st.speed = tgt * (t < st.slow ? 0.55 : 1) * (fast && !slow ? 2.2 : slow && !fast ? 0.6 : 1);
  b.setVelocityX(st.speed);

  if (ground) {
    st.jumps = 0;
    st.coy = t + 90;
  }
  const J = ['P1_2', 'P1_U'];
  if (consumeAnyPressedControl(sc, J)) {
    if (t < st.coy) {
      b.setVelocityY(-620);
      st.jumps = 1;
      st.coy = 0;
      playSound(sc, 'jump');
      squash(sc, 0.8, 1.2);
    } else if (st.jumps < 2) {
      b.setVelocityY(-540);
      st.jumps = 2;
      playSound(sc, 'jump2');
      squash(sc, 0.8, 1.2);
    }
  }
  // Releasing the button early cuts the jump short.
  if (!J.some((k) => isControlHeld(sc, k)) && b.velocity.y < -260) b.setVelocityY(-260);
  if (isControlHeld(sc, 'P1_D') || isControlHeld(sc, 'P1_5')) b.velocity.y += 2400 * dt;

  // Legs step with distance travelled, so the feet don't skate when speed changes.
  const vis = sc.vis;
  if (ground) {
    if (st.air) squash(sc, 1.25, 0.8);
    st.air = 0;
    vis.setTexture('c' + RUN_CYCLE[(pl.x / 26) & 3]);
    vis.angle *= 0.6;
  } else {
    st.air = 1;
    vis.setTexture('c3');
    vis.setAngle(Phaser.Math.Clamp(b.velocity.y * 0.03, -18, 24));
  }
  vis.setPosition(pl.x, pl.y);
  vis.setAlpha(t < st.inv && (t / 70) % 2 | 0 ? 0.3 : 1);

  cam.scrollX = pl.x - CAM_X;
  scrollScenery(sc, L, t);

  // The chaser only shows up a third of the way in, sliding in from off-screen left with its warning.
  if (L.mud && !sc.mud.visible && pl.x > L.len / 3) {
    banner(sc, L.sho ? '¡CUIDADO!\n¡VIENE EL SHOGGOTH!' : '¡CUIDADO!\n¡VIENE EL ALUVIÓN!');
    st.mud = CAM_X + 80;
    sc.mud.setVisible(true);
  }
  if (L.mud && sc.mud.visible) {
    // The mud runs at 80% of the target speed: you outrun it unless you get slowed down or stuck.
    // st.mud = gap between the mud front (at ground height) and Canelita's back.
    // The cap eases down to 110 so the mud slides in on arrival.
    st.mud = min(max(110, st.mud - 300 * dt), st.mud + (pl.x - st.px) - tgt * 0.8 * dt);
    sc.mud.setTexture((L.sho ? 'sho' : 'mud') + ((t / 140) & 1));
    // Drawn 40px below the ground line so the wave does not tower over the whole screen.
    sc.mud.setPosition(CAM_X - 21 - st.mud + sin(t / 150) * 4, 510 + sin(t / 230) * 5);
    if (st.mud <= 0) return lose(sc, L.sho ? '¡TE ALCANZÓ\nEL SHOGGOTH!' : '¡TE ALCANZÓ\nEL ALUVIÓN!');
  }

  if (L.quake) {
    if (t > st.quakeAt) {
      st.quakeEnd = t + 3000;
      st.quakeAt = t + Phaser.Math.Between(7000, 11000);
      cam.shake(3000, 0.006);
      playSound(sc, 'quake');
      banner(sc, st.qn++ & 1 ? '¡RÉPLICA!' : '¡TERREMOTO!');
    }
    if (t < st.quakeEnd && t > st.dropAt) {
      st.dropAt = t + 650;
      sc.debris.create(cam.scrollX + Phaser.Math.Between(300, 900), -20, 'gl').body.setVelocityX(-40);
    }
  }

  if (L.volc) volcPlay(sc, t, p);

  if (pl.y > H + 40) return lose(sc, '¡TE CAÍSTE!');
  if (st.end && pl.x > st.goalX) return startSmash(sc);

  gen(sc);
  const cut = cam.scrollX - 150;
  [sc.plats, sc.bans, sc.obs, sc.junk].forEach((g) =>
    g.getChildren().slice().forEach((o) => o.x + o.displayWidth < cut && o.destroy()),
  );
  sc.debris.getChildren().slice().forEach((o) => o.y > H + 40 && o.destroy());

  refreshHud(sc, p);
  st.px = pl.x;
}

function gen(sc) {
  const st = sc.state;
  const L = st.L;
  const rnd = Phaser.Math.Between;
  while (!st.end && st.gx < sc.cameras.main.scrollX + W + 300) {
    if (st.gx >= L.len) {
      const x = st.gx + 140;
      plat(sc, x, 1400, 440, L.tile);
      goal(sc, x + 500, 440);
      st.end = 1;
      break;
    }
    // Gaps scale with the level pace, not the held speed, so slowing down never makes a gap unjumpable.
    // Villarrica: narrower gaps from the rumble (33%) through the eruption's shake and flash (~60%).
    const gap = rnd(L.g[0], L.g[1]) * (st.tgt / 300) * (L.volc && st.gx > L.len * 0.3 && st.gx < L.len * 0.6 ? 0.6 : 1);
    const w = rnd(L.w[0], L.w[1]);
    const top = Phaser.Math.Clamp(st.top + rnd(-90, 80), 330, 500);
    const x = st.gx + gap;
    for (let j = 1; j < 4; j++) ban(sc, st.gx + (gap * j) / 4, min(st.top, top) - 70 - sin((j / 4) * PI) * 50);
    plat(sc, x, w, top, L.tile, L.quake && w < 400 && random() < 0.4);
    if (w > 260 && random() < (L.oc || 0.5)) {
      const ox = x + w * (0.45 + random() * 0.35);
      ob(sc, ox, top, L.ob);
      ban(sc, ox, top - 110);
    } else {
      for (let j = 0; j < min(5, (w / 70) | 0); j++) ban(sc, x + 50 + j * 45, top - 40);
    }
    st.gx = x + w;
    st.top = top;
  }
}

function buildBedroom(sc) {
  plat(sc, -200, 5600, 500, 'tf');
  [
    [650, 300, 430, 'tb'],
    [1150, 90, 440, 'tc'],
    [1600, 140, 340, 'tc'],
    [2300, 320, 430, 'tb'],
    [3000, 150, 340, 'tc'],
    [3500, 320, 430, 'tb'],
  ].forEach(([x, w, t, k]) => {
    plat(sc, x, w, t, k);
    for (let i = 0; i < w / 60 - 1; i++) ban(sc, x + 40 + i * 50, t - 40);
  });
  [1000, 2000, 2750, 3950].forEach((x) => {
    ob(sc, x, 500, 'ob0');
    [-40, 0, 40].forEach((d) => ban(sc, x + d, d ? 410 : 390));
  });
  [
    [330, '¡SALTA!\nBOTÓN 2 / ARRIBA'],
    [1250, '¡DOBLE SALTO!\nSALTA DOS VECES'],
    [1900, 'MANTÉN EL BOTÓN\n= SALTO MÁS ALTO'],
    [2650, '¡ESQUIVA LOS COJINES!\nTE HACEN PERDER PLÁTANOS'],
    [3250, 'DERECHA / BOTÓN 3 = RÁPIDO\nIZQUIERDA / BOTÓN 1 = LENTO'],
    [3850, 'ABAJO / BOTÓN 5\n= CAER RÁPIDO'],
  ].forEach(([x, s]) => sc.junk.add(txt(sc, x, 200, s, 22)));
  goal(sc, 4500, 500);
  sc.state.end = 1;
}

function plat(sc, x, w, top, key, crack) {
  const p = sc.add.tileSprite(x, top, w, H - top + 60, key).setOrigin(0);
  sc.physics.add.existing(p, true);
  sc.plats.add(p);
  p.crack = crack;
  if (crack) p.setTint(0xd8b0a0);
  return p;
}

function ban(sc, x, y) {
  const car = sc.state.carX && x > sc.state.carX;
  const b = sc.bans.create(x, y, car ? 'car' : 'ban');
  if (car) (b.car = 1), (sc.state.carX = 0);
}

function ob(sc, x, top, key) {
  sc.obs.create(x, top, key).setOrigin(0.5, 1).refreshBody();
}

function goal(sc, x, top) {
  sc.state.goalX = x;
  // Finish arch (220 wide) with a banana bobbing above the banner, and the banana hoard just past it.
  sc.junk.add(sc.add.image(x, top, 'arch').setOrigin(0.5, 1));
  sc.junk.add(sc.add.image(x + 250, top, 'hoard').setOrigin(0.5, 1));
  sc.junk.add(txt(sc, x, top - 158, 'Chi Cheñol!', 24, '#2a1608').setStroke('#ffd83a', 4));
  const b = sc.add.image(x, top - 215, 'ban').setScale(2.5);
  sc.junk.add(b);
  const tw = sc.tweens.add({ targets: b, y: b.y - 12, angle: 10, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  b.once('destroy', () => tw.remove()); // infinite tween would outlive the banana when the level is cleared
}

function land(sc, p) {
  const st = sc.state;
  // Cracked roofs only give way during an earthquake.
  if (!p.crack || p.fall || st.t > st.quakeEnd) return;
  p.fall = 1;
  p.setTint(0xff6060);
  sc.time.delayedCall(450, () => {
    if (!p.active) return;
    p.body.enable = false;
    sc.tweens.add({ targets: p, y: p.y + 500, duration: 900, ease: 'Quad.easeIn' });
  });
}

function grab(sc, b) {
  const st = sc.state;
  b.disableBody(true, true);
  if (b.car) {
    st.lives++;
    showLives(sc);
    const c = sc.add.image(b.x, b.y, 'car').setScale(2);
    sc.tweens.add({ targets: c, y: c.y - 80, alpha: 0, duration: 900, onComplete: () => c.destroy() });
    banner(sc, '¡ZANAHORIA!\n+1 VIDA');
    return playSound(sc, 'clear');
  }
  st.bananas++;
  playSound(sc, 'catch');
  sc.hud.icon.setScale(1.5);
  sc.tweens.add({ targets: sc.hud.icon, scale: 1, duration: 150 });
}

function hit(sc) {
  const st = sc.state;
  if (st.phase !== 'playing' || st.t < st.inv) return;
  st.inv = st.t + 1500;
  st.slow = st.t + 1000;
  playSound(sc, 'hit');
  sc.cameras.main.shake(150, 0.01);
  st.lives--;
  showLives(sc);
  if (!st.lives) return die(sc, '¡SIN VIDAS!');
  const n = min(3, st.bananas);
  st.bananas -= n;
  for (let i = 0; i < n; i++) {
    const b = sc.add.image(sc.pl.x, sc.pl.y, 'ban');
    sc.tweens.add({
      targets: b,
      x: b.x - Phaser.Math.Between(60, 160),
      y: b.y - Phaser.Math.Between(60, 140),
      alpha: 0,
      angle: 360,
      duration: 700,
      onComplete: () => b.destroy(),
    });
  }
  sc.vis.setTint(0xff9090);
  sc.time.delayedCall(1000, () => sc.vis.clearTint());
}

// Stretch on jump, squash on landing.
function squash(sc, x, y) {
  sc.tweens.killTweensOf(sc.vis);
  sc.vis.setScale(x, y);
  sc.tweens.add({ targets: sc.vis, scaleX: 1, scaleY: 1, duration: 140, ease: 'Quad.easeOut' });
}

// Falling or getting caught by the aluvión/shoggoth costs a life and restarts the level.
function lose(sc, msg) {
  const st = sc.state;
  st.lives--;
  showLives(sc);
  if (!st.lives) return die(sc, msg);
  setPhase(sc, 'dead');
  sc.physics.pause();
  playSound(sc, 'fall');
  banner(sc, msg + '\n-1 VIDA');
  sc.time.delayedCall(1400, () => {
    st.bananas = st.b0; // no farming bananas by falling
    startLevel(sc, st.lv);
  });
}

function die(sc, msg) {
  if (sc.state.phase !== 'playing') return;
  setPhase(sc, 'dead');
  sc.physics.pause();
  playSound(sc, 'fall');
  banner(sc, msg);
  // A single explored level is practice: no leaderboard entry.
  sc.time.delayedCall(1900, () => (sc.state.only ? returnToStart(sc) : showNameEntry(sc, msg.replace('\n', ' '))));
}

function pause(sc, on) {
  sc.pauseScreen.setVisible(on);
  if (on) sc.physics.pause();
  else sc.physics.resume();
  setPhase(sc, on ? 'paused' : 'playing');
}

// ---------- Smash: eat the banana ----------
const BITES_PER_BANANA = 15;
const SMASH_BONUS = 10; // bananas earned per banana fully eaten in the smash round
const smashBonus = (st) => ((st.bites / BITES_PER_BANANA) | 0) * SMASH_BONUS;
// Screen y of the mouth, where the bitten top of the banana sits. 406 + 36 art rows below the mouth × 6 × 0.9 bite squash = 600,
// so the body stays flush with the screen bottom even mid-bite.
const MOUTH_Y = 406;
const fnS = 6; // portrait scale: 64px art at 6x

function createSmash(sc) {
  const c = sc.add.container(0, 0).setDepth(30).setScrollFactor(0).setVisible(false);
  // Background layers are swapped per level in startSmash; the dim keeps the portrait readable.
  const bg = [sc.add.image(0, 0, 'b0a').setOrigin(0), sc.add.image(0, 0, 'b0a').setOrigin(0)];
  // Pivot on the mouth (art 32,50) so bite squashes stay on the banana; the body runs off the bottom.
  const p = sc.add.image(400, MOUTH_Y, 'p0').setOrigin(32 / 64, 50 / 86).setScale(fnS);
  const b = sc.add.image(400, MOUTH_Y, 'bn').setOrigin(0.5, 0).setScale(fnS);
  // Canelita's own front paws hold the banana on both sides.
  const hb = sc.add.image(362, 0, 'paw').setScale(fnS);
  const hd = sc.add.image(438, 0, 'paw').setScale(fnS).setFlipX(true);
  const title = txt(sc, 400, 55, '', 28, '#ffd83a');
  const time = txt(sc, 720, 60, '5.0', 36);
  const info = txt(sc, 400, 560, '', 24);
  c.add([...bg, sc.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.3), p, b, hb, hd, title, time, info]);
  sc.sm = { c, bg, p, b, hb, hd, title, time, info };
}

function startSmash(sc) {
  const st = sc.state;
  const L = LEVELS[st.lv].bg; // the level that just ended
  setPhase(sc, 'smash');
  sc.physics.pause();
  st.bites = 0;
  st.smashEnd = st.t + 5000;
  sc.sm.bg.forEach((g, i) => {
    g.setVisible(i < L.length);
    if (i < L.length) g.setTexture(L[i]);
  });
  sc.sm.c.setVisible(true);
  sc.sm.p.setTexture('p0');
  sc.sm.title.setText('¡MACHACA LOS BOTONES!');
  sc.sm.info.setText('MORDISCOS: 0   +0 PLÁTANOS');
  setBanana(sc, 0);
  playSound(sc, 'clear');
}

function smash(sc, t) {
  const st = sc.state;
  const m = sc.sm;
  const left = max(0, st.smashEnd - t);
  m.time.setText((left / 1000).toFixed(1));
  if (left > 0) {
    if (consumeAnyPressedControl(sc, ['P1_1', 'P1_2', 'P1_3', 'P1_4', 'P1_5', 'P1_6'])) {
      st.bites++;
      if (st.bites % BITES_PER_BANANA === 0) st.bananas += SMASH_BONUS;
      fnBite(sc, st.bites);
      m.info.setText(`MORDISCOS: ${st.bites}   +${smashBonus(st)} PLÁTANOS`);
    }
    return;
  }
  st.wait = t + 1200;
  m.p.setTexture('p3'); // happy closed eyes on the win screen
  m.title.setText(st.lv + 1 < LEVELS.length ? '¡NIVEL COMPLETO!' : '¡LO LOGRASTE!');
  m.info.setText(`MORDISCOS: ${st.bites}  +${smashBonus(st)} PLÁTANOS\nPRESIONA BOTÓN 1`);
  playSound(sc, 'clear');
  setPhase(sc, 'clear');
}

function setBanana(sc, n) {
  // Bitten rows are cropped from the top: the tip stays at the mouth, the bottom end rises, and the paws follow
  // the peel line (but never climb above the chin).
  const k = (n % BITES_PER_BANANA) * 2;
  const y = max(MOUTH_Y + (16 - k) * fnS, MOUTH_Y + 30);
  sc.sm.b.setCrop(0, k, 16, 32 - k).setY(MOUTH_Y - k * fnS);
  sc.sm.hb.setY(y);
  sc.sm.hd.setY(y);
}

// ---------- UI ----------
function txt(sc, x, y, s, size, col = '#fff8e0') {
  return sc.add
    .text(x, y, s, {
      fontFamily: 'monospace',
      fontSize: size + 'px',
      color: col,
      fontStyle: 'bold',
      stroke: '#2a1608',
      strokeThickness: max(3, (size / 6) | 0),
      align: 'center',
    })
    .setOrigin(0.5);
}

function banner(sc, s) {
  const b = txt(sc, 400, 240, s, 36, '#ffd83a').setScrollFactor(0).setDepth(20).setScale(0);
  sc.tweens.add({ targets: b, scale: 1, duration: 250, ease: 'Back.easeOut', hold: 1200, yoyo: true, onComplete: () => b.destroy() });
}

function createHud(sc) {
  const c = sc.add.container(0, 0).setDepth(12).setScrollFactor(0).setVisible(false);
  const icon = sc.add.image(34, 30, 'ban');
  const ban = txt(sc, 60, 30, 'x 0', 22).setOrigin(0, 0.5);
  const name = txt(sc, 400, 20, '', 16);
  const clock = txt(sc, 780, 30, '0:00.0', 22).setOrigin(1, 0.5);
  const barBg = sc.add.rectangle(400, 44, 300, 8, 0x2a1608);
  const bar = sc.add.rectangle(250, 44, 300, 8, COLORS.accent).setOrigin(0, 0.5);
  c.add([icon, ban, name, clock, barBg, bar]);
  sc.hud = { c, icon, ban, name, clock, bar, lives: [] };
}

// One carrot per life stacked left to right; the first 3 slots stay as dimmed outlines once lost.
function showLives(sc) {
  const n = sc.state.lives, l = sc.hud.lives;
  while (l.length < max(3, n)) sc.hud.c.add(l[l.length] = sc.add.image(26 + l.length * 26, 66, 'car'));
  l.forEach((im, i) => im.setVisible(i < max(3, n)).setAlpha(i < n ? 1 : 0.25));
}

function refreshHud(sc, p) {
  sc.hud.ban.setText('x ' + sc.state.bananas);
  sc.hud.clock.setText(fmtTime(sc.state.ms));
  sc.hud.bar.setScale(p, 1);
}

// "2.3s", "1m 2.3s"
function fmtTime(ms) {
  const t = floor(ms / 100), m = floor(t / 600);
  return `${m ? m + 'm ' : ''}${floor(t / 10) % 60}.${t % 10}s`;
}

function createPause(sc) {
  const c = sc.add.container(0, 0).setDepth(40).setScrollFactor(0).setVisible(false);
  c.add([sc.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6), txt(sc, 400, 280, 'PAUSA', 52, '#ffd83a'), txt(sc, 400, 340, 'START PARA SEGUIR', 18)]);
  sc.pauseScreen = c;
}

function createStartScreen(sc) {
  const c = sc.add.container(0, 0).setDepth(25).setScrollFactor(0);
  c.add(sc.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.25));
  const title = txt(sc, 400, 105, 'EL DÍA DEL\nPLATANUS', 56, '#ffd83a');
  sc.tweens.add({ targets: title, scale: 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  const bun = sc.add.image(360, 290, 'c0').setScale(2);
  sc.tweens.add({ targets: bun, y: 260, duration: 300, yoyo: true, repeat: -1, ease: 'Quad.easeOut' });
  const press = txt(sc, 400, 370, 'PRESIONA START', 26);
  sc.tweens.add({ targets: press, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });
  const list = txt(sc, 400, 440, '', 16).setOrigin(0.5, 0).setAlign('left');
  const sel = txt(sc, 400, 397, '', 16, '#ffd83a');
  c.add([title, bun, sc.add.image(450, 300, 'ban').setScale(2), press, txt(sc, 400, 420, 'LEADERBOARD', 16, '#ffd83a'), list, txt(sc, 400, 580, 'SALTO: B2/ARRIBA  CAER: B5/ABAJO  RÁPIDO: B3/DER  LENTO: B1/IZQ', 13), sel]);
  sc.menu = { c, list, sel };
}

function showStart(sc) {
  setPhase(sc, 'start');
  refreshLeaderboard(sc);
  // Attract mode: a random level's scenery (backdrops, landmarks, teleféricos) scrolls behind the menu, with no level in it.
  [sc.plats, sc.bans, sc.obs, sc.debris, sc.junk].forEach((g) => g.clear(true, true));
  sc.vis.setVisible(false);
  sc.cameras.main.scrollX = 0;
  pick(sc, sc.state.only || 0);
  sc.menu.c.setVisible(true);
}

// Start-screen level picker: 0 = the full run, i > 0 = explore level i alone. The backdrop previews the choice.
function pick(sc, i) {
  sc.state.only = i;
  sc.menu.sel.setText(i ? `< NIVEL ${i}: ${LEVELS[i].n} >` : '< HISTORIA COMPLETA >');
  setScenery(sc, (sc.menu.L = i ? LEVELS[i] : Phaser.Utils.Array.GetRandom(LEVELS)));
}

function returnToStart(sc) {
  sc.eg.c.setVisible(false);
  sc.hud.c.setVisible(false);
  sc.mud.setVisible(false);
  sc.state.L = 0;
  showStart(sc);
}

function createEndGameUi(scene) {
  const c = scene.add.container(0, 0).setDepth(35).setScrollFactor(0).setVisible(false);
  const E = (scene.eg = { c });
  c.add(scene.add.rectangle(W / 2, H / 2, W, H, COLORS.backdrop, 0.97));
  E.title = txt(scene, 400, 70, '', 30, '#ffd83a');
  E.summary = txt(scene, 400, 130, '', 22);
  E.nameValue = txt(scene, 400, 200, '', 36, '#f2a0b4');
  E.lb = txt(scene, 400, 250, '', 14).setOrigin(0.5, 0).setAlign('left');
  E.note = txt(scene, 400, 580, '', 13, '#ffd83a');
  c.add([E.title, E.summary, txt(scene, 400, 168, 'TUS INICIALES', 13), E.nameValue, E.lb, E.note]);

  c.add(txt(scene, 400, 440, '▲▼ LETRA   ◀▶ MOVER   BOTÓN: OK', 14));
  c.add((E.mad = scene.add.image(400, 340, 'p4').setScale(3).setVisible(false)));
}

function rejectName(sc) {
  const m = sc.eg.mad, e = sc.state.ne;
  playSound(sc, 'hit');
  sc.cameras.main.shake(250, 0.01);
  sc.tweens.killTweensOf(m);
  m.setVisible(true).setAngle(0);
  sc.tweens.add({ targets: m, angle: { from: -6, to: 6 }, duration: 60, yoyo: true, repeat: 6, completeDelay: 900, onComplete: () => m.setVisible(false) });
  sc.eg.note.setText('¡ESE NOMBRE NO! ELIGE OTRO');
  Object.assign(e, { letters: ['A', 'A', 'A'], i: 0 });
  refreshNameEntry(sc);
}

function showNameEntry(sc, msg) {
  const st = sc.state;
  setPhase(sc, 'gameover');
  sc.eg.c.setVisible(true);
  sc.eg.title.setText(msg);
  sc.eg.summary.setText(`PLÁTANOS ${st.bananas}   TIEMPO ${fmtTime(st.ms)}\nNIVEL: ${LEVELS[st.lv].n}`);
  sc.eg.note.setText('');
  Object.assign(st.ne, { letters: ['A', 'A', 'A'], i: 0, t: 0 });
  refreshNameEntry(sc);
}

// ---------- Audio ----------
function startMusic(sc) {
  const ctx = sc.sound.context;
  if (sc.state.music || !ctx) return;
  sc.state.music = 1;
  try {
    const out = ctx.createGain();
    out.gain.value = 0.6;
    out.connect(ctx.destination);
    const noise = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
    noise.getChannelData(0).forEach((_, i, a) => (a[i] = random() * 2 - 1));
    const tracks = SONG.t.map(([w, v, n]) => ({ w, v, n: [...n.replace(/([-_])([a-z])/g, (_, d, c) => (d > '-' ? '.' : '-').repeat(c.charCodeAt() - 95))] }));
    const dur = 60 / SONG.bpm / 4;
    let step = 0;
    let t = ctx.currentTime + 0.1;
    const note = (k, tok, at, len) => {
      const g = ctx.createGain();
      let src;
      let v = k.v;
      if (tok === 'k') {
        src = ctx.createOscillator();
        src.frequency.setValueAtTime(150, at);
        src.frequency.exponentialRampToValueAtTime(40, at + len);
        v *= 5;
      } else if (k.w === 'noise') {
        src = ctx.createBufferSource();
        src.buffer = noise;
        if (tok === 's') v *= 3;
        else len *= 0.4;
      } else {
        src = ctx.createOscillator();
        src.type = k.w;
        src.frequency.value = freq(tok);
      }
      g.gain.setValueAtTime(v, at);
      g.gain.exponentialRampToValueAtTime(0.001, at + len * 0.95);
      src.connect(g).connect(out);
      src.start(at);
      src.stop(at + len);
    };
    // Look-ahead scheduler on the audio clock so the loop never drifts.
    setInterval(() => {
      if (t < ctx.currentTime) t = ctx.currentTime + 0.05;
      while (t < ctx.currentTime + 0.25) {
        for (const k of tracks) {
          const tok = k.n[step % k.n.length];
          if (tok === '.' || tok === '-') continue;
          let len = 1;
          while (k.n[(step + len) % k.n.length] === '-') len++;
          note(k, tok, t, len * dur);
        }        step++;
        t += dur;
      }
    }, 50);
  } catch (_) {}
}

const freq = (tok) => 440 * 2 ** ((tok.charCodeAt() - 77) / 12);

function playSound(scene, type) {
  try {
    const ctx = scene.sound.context;
    for (const [w, f1, f2, du, v, dl = 0] of SFX[type] || []) {
      const t = ctx.currentTime + dl;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = w;
      o.frequency.setValueAtTime(f1, t);
      o.frequency.exponentialRampToValueAtTime(f2, t + du);
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + du);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + du);
    }
  } catch (_) {}
}

// ---------- Textures (all procedural) ----------
let C; // the canvas cv is currently painting; F and el draw into it
const F = (col, x, y, w, h) => {
  C.fillStyle = col;
  C.fillRect(x | 0, y | 0, ceil(w), ceil(h));
};
const mix = (a, b, t) => 'rgb(' + [16, 8, 0].map((s) => ((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t | 0) + ')';
const rand = (a, b) => a + random() * (b - a);

function cv(sc, key, w, h, fn) {
  const t = sc.textures.createCanvas(key, w, h);
  const p = C;
  fn((C = t.context));
  C = p;
  t.refresh();
}

// Pixel ellipse without anti-aliasing, for the chunky 16-bit look.
function el(col, cx, cy, rx, ry) {
  for (let y = -ry; y <= ry; y++) {
    const h = rx * sqrt(1 - (y / ry) ** 2);
    F(col, cx - h, cy + y, h * 2, 1);
  }
}

function px(sc, key, rows, s = 3, P = PAL) {
  if (rows.split) rows = rows.split(' '); // sprites are written as space-separated rows
  cv(sc, key, rows[0].length * s, rows.length * s, (c) =>
    rows.forEach((r, y) => [...r].forEach((ch, x) => P[ch] && F(P[ch], x * s, y * s, s, s))),
  );
}

function sky(c, a, b) {
  for (let y = 0; y < H; y += 10) F(mix(a, b, y / H), 0, y, W, 10);
}

function mtn(c, col, snow, base, amp, n) {
  const p = [];
  for (let i = 0; i < n; i++) p.push(base - random() * amp);
  p.push(p[0]); // same height at both edges so the layer tiles seamlessly
  const line = base - amp * 0.55;
  for (let x = 0; x < W; x += 4) {
    const f = (x / W) * n;
    const i = f | 0;
    const y = p[i] + (p[i + 1] - p[i]) * (f - i);
    F(col, x, y, 4, H - y);
    if (snow && y < line) F(snow, x, y, 4, (line - y) * 0.6 + 4);
  }
}

// Finale portrait: half grid (16 cols, mirrored to 32), one cell = 2×2 art px; '.' is empty and every empty cell
// touching the silhouette becomes outline. Base frame has closed mouth and no pupils; texFinale stamps the rest.
// Rows split on spaces; a leading digit repeats that row.
const FACE = '........zzz..... 5.......nrRzb.... 5........nrRzb... ........nssbbnnn ........nssbbbnn .......nbbbbbbbb ......nzzzbbbbbb 4......nbbbbbbbbb .....nbRRRbbbbbb .....nbbbbbbbbnn .....nbbbbzzzppp .....nbbbzzzzzpm .....nbbzzzzmzzm .....nbzzzzzzmmm ......nbzzzzzzzz .......nbzzzzzzz ........sbzzzzzz ........ssssssss .......nbbbbbbbb ......nbbbbbbbbb .....nbsbbbbzzzz .....nbbsbbbzzzz .....nbbsbbzzzzz .....nbbbsbzzzzz 3....nbbbbsbzzzzz 5....nbbbbbbzzzzz'.split(' ').flatMap((r) => Array(+r[0] || 1).fill(r.replace(/^\d/, '')));
const FP = { k: '#2a1608', s: '#704424', b: '#8a5630', n: '#c98a58', z: '#ead2a8', r: '#e8a0a0', R: '#a85a4a', p: '#f2a0b4', e: '#111', w: WHITE, m: '#3a1608', t: '#fffaf0' };

// Draws a mirrored ('.' empty) or full cell grid at 2px per cell, outlining the silhouette.
function cells(sc, key, rows, mirror) {
  if (rows.split) rows = rows.split(' ');
  const g = rows.map((r) => (mirror ? [...r, ...[...r].reverse()] : [...r]));
  cv(sc, key, g[0].length * 2, g.length * 2, (c) =>
    g.forEach((r, y) => r.forEach((ch, x) => {
      const o = ch == '.' && mirror && [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => (g[y + dy] || [])[x + dx] > '.');
      if (FP[ch] || o) F(FP[o ? 'k' : ch], x * 2, y * 2, 2, 2);
    })),
  );
}

function makeTextures(sc) {
  px(sc, 'ban', BANANA);
  px(sc, 'car', CARROT, 2);
  for (const k in OBSTACLES) px(sc, k, OBSTACLES[k]);
  cv(sc, 'none', 2, 2, () => {});
  // Finish arch: banana-striped wooden posts and a checkered banner with a yellow plaque for the finish label.
  cv(sc, 'arch', 220, 230, (c) => {
    [0, 208].forEach((x) => {
      F('#2a1608', x, 0, 12, 230);
      for (let y = 2; y < 230; y += 8) F((y / 8) & 1 ? '#ffd83a' : '#8a5630', x + 2, y, 8, 8);
    });
    F('#2a1608', 0, 50, 220, 44);
    for (let i = 0; i < 21; i++) for (let j = 0; j < 4; j++) F((i + j) & 1 ? '#111' : WHITE, 5 + i * 10, 52 + j * 10, 10, 10);
    F('#2a1608', 28, 56, 164, 32);
    F('#ffd83a', 31, 59, 158, 26);
  });
  // Banana hoard: a pyramid of 36 bananas (the 'ban' sprite, alternately flipped) heaped on a wooden crate.
  const bi = sc.textures.get('ban').getSourceImage();
  cv(sc, 'hoard', 240, 220, (c) => {
    for (let i = 0; i < 8; i++)
      for (let j = 0, n = 8 - i, x0 = 120 - ((n - 1) * 24 + 30) / 2; j < n; j++) {
        c.save();
        c.translate(x0 + j * 24 + 15, 170 - i * 18 + 15);
        c.scale((i + j) & 1 ? -1 : 1, 1);
        c.drawImage(bi, -15, -15);
        c.restore();
      }
    F('#2a1608', 10, 180, 220, 40);
    F('#8a5630', 13, 183, 214, 34);
    F('#5a3418', 13, 199, 214, 3);
    for (let x = 46; x < 220; x += 36) F('#5a3418', x, 183, 3, 34);
  });
  // Aluvión: a slanted wedge of mud, tall at the back, its toe sliding along the ground.
  // Two frames with shifted waves animate the surface; the same tumbling rocks/branches sit in both.
  // The shoggoth (San Francisco) is the same wedge in sickly green with spots, eyes and tentacles; its pupils dart between frames.
  const top = (x, ph) => (x > 560 ? 470 + (x - 560) * 3.2 : max(60, 470 - (560 - x) * 2 + sin(x / 23 + ph * 2) * 8));
  const junk = [];
  for (let i = 0; i < 50; i++) {
    const x = rand(0, 540);
    junk.push([x, rand(top(x, 0) + 20, H), i % 3, rand(4, 12)]);
  }
  [['mud', '#6b4423', '#8a5a30', '#d8c0a0', '#4a2e16', '#7a7a70'], ['sho', '#7f9a68', '#9ab482', '#1e2618', '#4e6040', '#c8d8b0']].forEach(([k, a, b, d, j1, j2]) =>
    [0, 1].forEach((ph) =>
      cv(sc, k + ph, 600, H, () => {
        if (k > 'n')
          [380, 450, 520].forEach((bx, n) =>
            [d, a].forEach((col, o) => {
              for (let s = 0; s < 1; s += 0.02) el(col, bx + s * 50 + sin(s * 6 + ph * 2 + n) * 12, top(bx, ph) - s * 90, 16 * (1 - s) + 4 - o * 3, 16 * (1 - s) + 4 - o * 3);
            }),
          );
        for (let x = 0; x < 600; x += 2) {
          const y = top(x, ph);
          F(a, x, y, 2, H - y);
          F(b, x, y, 2, 12);
          F(d, x, y, 2, 3);
        }
        junk.forEach(([x, y, i, w]) => F(i ? j1 : j2, x, y, w, 4));
        // Eyes cluster in the front x 370-500, the only part on screen, so several always stare at Canelita.
        if (k > 'n') [[380, 250], [415, 330], [455, 390], [480, 455], [415, 430], [370, 360], [450, 490], [500, 520], [390, 500]].forEach(([x, y]) => (el(d, x, y, 16, 11), el(WHITE, x, y, 13, 8), el(d, x - 5 + ph * 10, y, 5, 5)));
      }),
    ),
  );

  // Dormitorio: two wall screens (window + bookshelf each), a different poster on each; 2W wide so the tileSprite alternates them.
  cv(sc, 'b0a', W * 2, H, (c) => {
    F('#f3d6c6', 0, 0, W * 2, H);
    for (let x = 0; x < W * 2; x += 40) F('#ecc6b4', x, 0, 16, H);
    [0, W].forEach((o) => {
      F(WHITE, o + 90, 120, 180, 150);
      F('#9fd8ff', o + 100, 130, 160, 130);
      F(WHITE, o + 176, 130, 8, 130);
      F(WHITE, o + 100, 192, 160, 6);
      F('#7a4a28', o + 620, 270, 150, 8);
      for (let i = 0; i < 7; i++) F(['#e86a8a', '#6aa8e8', '#7fcf8a', '#f2c14e'][i % 4], o + 630 + i * 18, 232 + (i % 3) * 4, 14, 38 - (i % 3) * 4);
    });
    F('#c9a07a', 0, 488, W * 2, 12);
    // Screen 1: Platanus logo poster, cream bananas on yellow. Bananas drawn in the logo's 512px space, centered on 264,246.
    const s = 0.18;
    F('#f9bd16', 480, 110, 100, 130);
    c.save();
    c.translate(530 - 264 * s, 175 - 246 * s);
    c.scale(s, s);
    c.strokeStyle = '#fffbe6';
    [[262, 100, 247, 230, 95, 240, 28], [292, 95, 307, 262, 170, 340, 38], [330, 95, 440, 250, 310, 415, 40]].forEach(([ax, ay, qx, qy, bx, by, w]) => {
      c.lineWidth = w;
      c.beginPath();
      c.moveTo(ax, ay);
      c.quadraticCurveTo(qx, qy, bx, by);
      c.stroke();
    });
    c.restore();
    // Screen 2: poster styled like the Platanus Hack 26 apply page: dark card, neon-yellow mono text, outlined option boxes.
    const Y = '#f2ff00', P = W + 450, box = (x, y, w, h) => (F(Y, x, y, w, 2), F(Y, x, y + h - 2, w, 2), F(Y, x, y, 2, h), F(Y, x + w - 2, y, 2, h));
    F('#1c1c1c', P, 100, 140, 150);
    c.fillStyle = Y;
    c.font = '8px monospace';
    c.fillText('PLATANUS HACK [26]', P + 10, 118);
    c.font = 'bold 17px monospace';
    c.fillText('TEAM.READY?', P + 9, 140);
    [P + 10, P + 77].forEach((x, i) => {
      box(x, 154, 53, 80);
      F(Y, x + 7, 162, i ? 36 : 40, 4);
      for (let j = 0; j < 3 - i; j++) F(Y, x + 7, 174 + j * 8, 38 - j * 7, 2);
    });
  });
  texBunny(sc);
  texTiles(sc);
  texSanCristobal(sc);
  texCostanera(sc);
  texSanFrancisco(sc);
  texVillarrica(sc);
  texAntartica(sc);
  texFinale(sc);
}

function texBunny(sc) {
  const bunPaint = (g, [x, y, rx, ry, col], grow) => {
    const r = rx > 2 ? 0.5 : 0; // round off big lobes so they don't get 1px nubs at their widest row
    const a = rx + grow + r, b = ry + grow + r;
    for (let j = -floor(b); j <= b; j++)
      for (let i = -floor(a); i <= a; i++)
        if (i * i * b * b + j * j * a * a <= a * a * b * b && g[y + j] && g[y + j][x + i] !== undefined)
          g[y + j][x + i] = grow ? 'k' : col;
  };
  LEGS.forEach((legs, i) => {
    const g = Array.from({ length: 17 }, () => Array(26).fill('.'));
    const parts = [...legs, ...BUNNY]; // legs first so the body covers their tops
    parts.forEach((p) => bunPaint(g, p, 1));
    parts.forEach((p) => bunPaint(g, p, 0));
    BUN_DETAIL.forEach((p) => bunPaint(g, p, 0));
    BUN_EAR.forEach((r, y) => [...r].forEach((ch, x) => ch !== '.' && (g[y + 1][13 + x] = ch)));
    px(sc, 'c' + i, g.map((r) => r.join('')));
  });
}

// ===== Platform tiles (128 wide, H tall, row 0 is the walkable top): tf floor, tb bed, tc closet, tg grass, tr rooftop =====
function texTiles(sc) {
  const T = 128;
  // Floor: wood planks with staggered joints, grain and a lit top edge.
  cv(sc, 'tf', T, H, (c) => {
    F('#a0703c', 0, 0, T, H);
    for (let y = 0, r = 0; y < H; y += 24, r++) {
      F('#7a4c24', 0, y, T, 2);
      F('#b88250', 0, y + 2, T, 1);
      for (let x = (r * 41) % 64; x < T - 2; x += 64) F('#7a4c24', x, y + 3, 2, 21);
    }
    for (let i = 0; i < 16; i++) F('#8e5c2e', rand(0, T - 18), rand(4, H), rand(6, 16), 1);
    F('#d4a468', 0, 0, T, 2);
    F('#c08a50', 0, 2, T, 2);
  });
  // Bed: patchwork quilt in folds, white sheet with a scalloped edge, wood frame below.
  cv(sc, 'tb', T, H, (c) => {
    const k = ['#e86a8a', '#6aa8e8', '#f2c14e', '#7fcf8a', '#b07ae8'];
    F('#7a4a28', 0, 0, T, H);
    for (let j = 0; j < 6; j++) for (let i = 0; i < 4; i++) {
      const x = i * 32 + 1, y = 12 + j * 21;
      F(k[(i * 3 + j) % 5], x, y, 30, 19);
      F('rgba(255,255,255,.3)', x, y, 30, 1);
      F('rgba(0,0,0,.2)', x, y + 18, 30, 1);
    }
    F('rgba(0,0,0,.16)', 40, 12, 3, 128);
    F('rgba(0,0,0,.16)', 104, 12, 3, 128);
    for (let x = 0; x < T; x += 16) el('#c4c4d4', x + 8, 8, 8, 4);
    for (let x = 0; x < T; x += 16) el('#f6f6fa', x + 8, 7, 8, 3);
    F('#f6f6fa', 0, 0, T, 7);
    F('#7a4a28', 0, 134, T, H - 134);
    F('#a06a40', 0, 134, T, 2);
    for (let y = 146; y < H; y += 14) F('#5e3a1c', 0, y, T, 1);
  });
  // Closet: wood cabinet with recessed door panels, knobs and a dark top lip.
  cv(sc, 'tc', T, H, (c) => {
    F('#8a5a30', 0, 0, T, H);
    for (let y = 14; y < H; y += 150) for (const x of [8, 72]) {
      F('#5a3418', x, y, 48, 136);
      F('#9c6a3c', x + 3, y + 3, 42, 130);
      F('#b07a48', x + 3, y + 3, 42, 2);
      F('#7a4c24', x + 3, y + 131, 42, 2);
      F('#ffd86a', x + 36, y + 66, 3, 6);
    }
    F('#c4905a', 0, 0, T, 6);
    F('#e0b07a', 0, 0, T, 2);
    F('#5a3418', 0, 6, T, 2);
  });
  // Cerro: sunny grass with tufts and flowers over earth with strata, stones and roots.
  cv(sc, 'tg', T, H, (c) => {
    F('#8a5a32', 0, 0, T, H);
    for (let y = 34; y < H; y += 30) F('#6e4626', 0, y, T, 2);
    for (let i = 0; i < 14; i++) el(random() < 0.5 ? '#9a9490' : '#7a726e', rand(6, 122), rand(40, H - 8), 3, 2);
    for (let i = 0; i < 8; i++) F('#5a3a1e', rand(0, T - 2) | 0, 12, 1, rand(8, 20) | 0);
    F('#4f9a34', 0, 0, T, 12);
    F('#3e7a2a', 0, 12, T, 1);
    F('#6cc04a', 0, 1, T, 3);
    F('#9ce46a', 0, 0, T, 1);
    for (let x = 0; x < T; x += 3) F('#9ce46a', x, random() * 3 | 0, 1, 2);
    for (let x = 0; x < T; x += 5) F('#3e8a2c', x + 2, 6 + (random() * 4 | 0), 1, 2);
    for (let i = 0; i < 6; i++) F([WHITE, '#ffd86a', '#ff7aa0'][i % 3], rand(4, 120) | 0, 2 + (random() * 2 | 0), 2, 2);
  });
  // Costanera: concrete parapet and ledge, dusk facade with pilasters and lit/dark windows.
  cv(sc, 'tr', T, H, (c) => {
    F('#3e3e52', 0, 0, T, H);
    for (let x = 28; x < T; x += 32) F('#4e4e64', x, 11, 8, H);
    for (let y = 44; y < H; y += 44) for (const x of [8, 40, 72, 104]) {
      const wy = y - 30, lit = random() < 0.45;
      F('#2a2a38', x - 1, wy - 1, 18, 20);
      F(lit ? '#ffd86a' : '#26263a', x, wy, 16, 18);
      if (lit) F('#fff2b8', x, wy, 16, 2);
      else F('#3a3a54', x, wy + 12, 16, 1);
      F('#8a8aa0', x - 2, wy + 18, 20, 2);
    }
    for (let y = 34; y < H; y += 44) {
      F('#5e5e72', 0, y, T, 2);
      F('#2e2e40', 0, y + 2, T, 2);
    }
    F('#e4e4ec', 0, 0, T, 2);
    F('#b4b4c2', 0, 2, T, 5);
    F('#7a7a8c', 0, 7, T, 2);
    F('#5a5a6c', 0, 9, T, 2);
  });
}

// ===== Cerro San Cristóbal: b1a far (tiles), b1b near filler (tiles), sc1* landmarks (each shown once) =====
// Tree at trunk base (x,y), size s. k: 1 araucaria, 2 cypress, 3 palma chilena.
function tree(c, x, y, s, k) {
  const g = ['#1c4a26', '#2f7a3a', '#4f9a48', '#8ccc5a'], d = (n, a, b) => { for (let i = 0; i < n; i++) F(g[3], x + rand(a, b) * s, y - rand(a + 1.6, b + 1.9) * s, 2, 2); };
  if (k === 1) {
    // Araucaria araucana (30-40 m): tall plated trunk, a few sparse whorls, then a dense dome of rope-like branches with upturned tips.
    s *= 2;
    const cb = y - s * 4, ch = s * 0.8, R = s * 0.9, tw = s * 0.07,
      br = (by, hw) => { for (const e of [-1, 1]) for (let t = 0; t <= 1; t += 1 / hw) { const yy = by + sin(PI * t) * s * 0.05 - t ** 4 * s * 0.16; F(g[0], x + e * t * hw - 1, yy, 3, 3); F(g[2], x + e * t * hw, yy, 1, 1); } };
    F('#5e5044', x - tw, cb - ch * 0.5, tw * 2, y - cb + ch * 0.5);
    for (let j = 0; j < y - cb; j += 4) F('#857462', x - tw + ((j / 4) % 2) * tw, y - j, tw, 2);
    F('#5e5044', x - tw * 1.6, y - 3, tw * 3.2, 3);
    br(cb + s * 0.55, s * 0.3);
    br(cb + s * 0.95, s * 0.2);
    for (let j = 0; j < ch; j++) { const w = R * 0.8 * sqrt(1 - (j / ch) ** 2); F(g[0], x - w, cb - j, w * 2, 1); }
    for (let i = 0; i < 7; i++) br(cb - (i * ch) / 7, R * sqrt(1 - (i / 7.3) ** 2));
    for (let i = 0; i < 14; i++) { const t = rand(-0.9, 0.9); F(g[1 + (i % 3)], x + t * R * 0.75, cb - ch * sqrt(1 - t * t) * rand(0.3, 0.95), 2, 1); }
  } else if (k === 2) {
    F('#4a3020', x - 2, y - 6, 4, 6);
    el(g[0], x, y - s * 1.6, s * 0.34, s * 1.55);
    el(g[1], x - s * 0.08, y - s * 1.7, s * 0.2, s * 1.3);
    d(4, -0.2, 0);
  } else {
    const top = y - s * 2.2;
    for (let j = 0; j < s * 2.2; j++) {
      const w = s * (0.22 + 0.05 * sin((j / s) * 1.4));
      F(j % 5 ? '#8a7a68' : '#5e5244', x - w, y - j, w * 2, 1);
      F('#6e6050', x + w * 0.3, y - j, w * 0.7, 1);
    }
    // Fronds: arcs out from the crown, drooping under their own weight.
    for (let a = 0; a < 9; a++) {
      const t = PI * (1.08 + a * 0.105);
      for (let j = 0; j < s * 1.2; j += 1.5) F(g[a % 3], x + cos(t) * j, top + sin(t) * j + (j * j) / (s * 1.6), 3, 2);
    }
    el('#5e5244', x, top + 2, s * 0.24, s * 0.14);
  }
}

// Teleférico cable height at tile x (period W/3, pylons at W/6 + k*W/3), o = offset of the lower cable.
const CAB = (x, o) => {
  const u = ((x + W / 6) % (W / 3)) / (W / 3);
  return 244 + o + 64 * u * (1 - u);
};
// Bike trail height at tile x (period W/4), just below the back hill's lowest crest.
const TR = (x) => 418 + 4 * sin((x * PI * 8) / W);

// 1px line from (a, b) to (x, y).
function ln(c, col, a, b, x, y) {
  for (let i = 0, n = max(abs(x - a), abs(y - b)); i <= n; i++) F(col, a + ((x - a) * i) / n, b + ((y - b) * i) / n, 1, 1);
}

function texSanCristobal(sc) {
  // Far layer: sky, Andes, smog (tiles).
  cv(sc, 'b1a', W, H, (c) => {
    sky(c, 0x6ab8f0, 0xe0f4ff);
    mtn(c, '#8a8fb0', WHITE, 300, 160, 7);
    mtn(c, '#6a7090', 0, 380, 90, 9);
    F('rgba(190,150,110,.25)', 0, 380, W, 140);
  });
  // Near filler: green hillside, back trees, a few front trees, teleférico cables (tiles, no unique landmarks).
  cv(sc, 'b1b', W, H, (c) => {
    // Trees stand below each hill's lowest crest (base) so none float in the sky.
    mtn(c, '#6aa048', 0, 400, 80, 8);
    // Dirt bike trail winding along the hillside.
    for (let x = 0; x < W; x++) {
      F('#c8a06a', x, TR(x) - 2, 1, 4);
      F('#8a6a40', x, TR(x) + 2, 1, 1);
    }
    for (let i = 0; i < 18; i++) tree(c, rand(50, W - 50), rand(402, 414), rand(9, 13), [1, 2][i % 2]);
    mtn(c, '#4f8a3a', 0, 456, 30, 12);
    for (let i = 0; i < 8; i++) tree(c, rand(50, W - 50), rand(458, 466), rand(13, 16), [3, 1][i % 2]);
    // Teleférico in front, tiling the whole stage: a lattice pylon every third of the tile and two shallow cables
    // (upper one goes forward, lower one back). The cabins are moving sprites, see cabs in play().
    for (const x of [W / 6, W / 2, W * 5 / 6]) {
      for (let y = 0; y < 230; y++) {
        const w = 3 + y * 0.07;
        F('#4a4a58', x - w, 244 + y, 2, 1);
        F('#4a4a58', x + w - 1, 244 + y, 2, 1);
      }
      for (const o of [0, 12]) {
        F('#4a4a58', x - 14, 242 + o, 28, 4);
        F('#c8c8d0', x - 12, 240 + o, 4, 2);
        F('#c8c8d0', x + 8, 240 + o, 4, 2);
      }
    }
    for (let x = 0; x < W; x++) for (const o of [0, 12]) F('#2a2a2a', x, CAB(x, o), 1, 2);
  });
  // Bikes: bk0/bk1 and bk2/bk3 are the 2 pedaling frames of a yellow and a blue rider, facing right, wheels on y=17.
  [['#f0c020', '#c02a2a'], ['#2a8ae8', '#202020']].forEach(([j, h], i) =>
    [0, 1].forEach((fr) =>
      cv(sc, 'bk' + (i * 2 + fr), 18, 18, (c) => {
        for (const x of [4, 13]) {
          el('#202020', x, 14, 3, 3);
          c.clearRect(x - 1, 13, 3, 3);
          F('#a0a0a0', x, 14, 1, 1);
        }
        ln(c, '#d03030', 4, 14, 8, 14);
        ln(c, '#d03030', 4, 14, 7, 10);
        ln(c, '#d03030', 7, 10, 8, 14);
        ln(c, '#d03030', 7, 10, 12, 10);
        ln(c, '#d03030', 8, 14, 12, 10);
        ln(c, '#d03030', 12, 10, 13, 14);
        ln(c, '#202020', 12, 9, 13, 8);
        ln(c, '#2a2a3a', 7, 9, fr ? 9 : 10, fr ? 11 : 10);
        ln(c, '#2a2a3a', fr ? 9 : 10, fr ? 11 : 10, fr ? 7 : 9, fr ? 14 : 15);
        for (let y = 0; y < 4; y++) F(j, 7 + y, 8 - y, 2, 1);
        ln(c, j, 10, 5, 13, 8);
        F('#e8b890', 11, 3, 2, 2);
        F(h, 10, 1, 4, 2);
      }),
    ),
  );
  // Cabins: blue/red/green, hung from (11, 1) so that point sits on the cable.
  [['#2a6ae8', '#1a3e98'], ['#e8462a', '#a02a1a'], ['#3aa84a', '#1f7030']].forEach(([b, s], i) =>
    cv(sc, 'cab' + i, 22, 34, (c) => {
      const x = 11, y = 1;
      F('#c8c8d0', x - 3, y - 1, 6, 3);
      F('#3a3a3a', x, y + 2, 1, 10);
      F('#3a3a3a', x - 6, y + 11, 13, 1);
      F(s, x - 9, y + 12, 18, 3);
      F(b, x - 10, y + 15, 20, 16);
      F('#d8ecff', x - 8, y + 17, 16, 7);
      F(WHITE, x - 8, y + 17, 3, 3);
      F(s, x - 1, y + 17, 2, 7);
      F(s, x + 6, y + 15, 4, 16);
      F(s, x - 10, y + 29, 20, 2);
    }),
  );
  // Landmarks (each shown once; bottom-aligned at y=600, visible above y≈330).
  // 1. Virgen de la Inmaculada Concepción (after photos): head tilted up, ring of 12 stars, right arm out with open palm,
  // left forearm raised, long mantle draping from both arms, standing on a dome over a round pedestal and the sanctuary.
  cv(sc, 'sc1v', 260, H, (c) => {
    const w0 = WHITE, w1 = '#dfe3ee', w2 = '#b0b8ca', gd = '#ffd83a';
    for (let y = 300; y < H; y++) F('#5f8f3a', 90 - (y - 300) * 0.6, y, 80 + (y - 300) * 1.2, 1);
    tree(c, 36, 470, 7, 1);
    tree(c, 76, 396, 16, 3);
    tree(c, 188, 396, 12, 2);
    // Sanctuary terrace with arches.
    F('#e8e4da', 70, 278, 120, 30);
    F('#c8c2b4', 70, 302, 120, 6);
    F('#f6f2e8', 66, 274, 128, 4);
    for (let x = 78; x < 184; x += 14) {
      F('#8a847a', x, 286, 7, 12);
      el('#8a847a', x + 3, 286, 3, 3);
    }
    // Stone pedestal, round drum with a lip, and the dome she stands on.
    F('#bcb4a4', 110, 240, 40, 34);
    F('#a49c8c', 140, 240, 10, 34);
    F('#d8d0c0', 106, 236, 48, 4);
    el(w0, 130, 222, 15, 8);
    F(w1, 136, 216, 8, 6);
    F(w1, 114, 222, 32, 14);
    F(w2, 138, 222, 8, 14);
    F(w0, 111, 220, 38, 3);
    // Mantle behind the body, wider and deeper-shaded on her left.
    for (let y = 126; y < 206; y++) {
      const l = 12 + (y - 126) * 0.08, r = 13 + (y - 126) * 0.14;
      F(w1, 130 - l, y, l + r, 1);
      F(w2, 130 + r - 5, y, 5, 1);
    }
    // Robe: high belt, long vertical folds, hem and feet on the dome.
    for (let y = 140; y < 214; y++) {
      const r = 9 + (y - 140) * 0.07;
      F(w0, 130 - r, y, r * 2, 1);
      F(w1, 130 + r * 0.35, y, r * 0.65, 1);
      for (const f of [-0.45, 0.05, 0.62]) F(f > 0.5 ? w2 : w1, 130 + r * f, y, 1, 1);
    }
    F(w2, 116, 212, 28, 2);
    el(w1, 127, 214, 4, 2);
    F(w0, 121, 126, 18, 15);
    F(w1, 132, 126, 7, 15);
    F(w2, 121, 140, 18, 2);
    // Her right arm reaching out and down, mantle hanging from it; open palm.
    for (let i = 0; i < 22; i++) {
      F(w1, 118 - i, 131 + i * 0.4, 2, 30 - i * 1.3);
      F(w0, 118 - i, 127 + i * 0.4, 4, 5);
    }
    F(w2, 98, 137, 2, 3);
    el(w0, 94, 137, 3, 2);
    F(w0, 89, 137, 4, 1);
    // Her left arm: upper arm down the side, forearm raised forward, long drape falling from the elbow.
    F(w1, 139, 127, 6, 18);
    for (let i = 0; i < 11; i++) F(i > 8 ? w2 : w1, 140 + i, 148 - i * 0.6, 1, 54 - i * 3);
    for (let i = 0; i < 12; i++) F(w0, 143 + i, 143 - i, 4, 4);
    el(w0, 158, 131, 3, 3);
    // Veil and head tilted up toward the sky.
    el(w1, 131, 117, 8, 10);
    F(w0, 127, 118, 6, 8);
    el(w0, 129, 111, 6, 7);
    F(w1, 131, 106, 3, 10);
    F(w2, 126, 108, 2, 1);
    // Ring of 12 stars around the head, slightly behind and to her left.
    for (let a = 0; a < 48; a++) F('#c9a640', 133 + cos(a / 7.64) * 15, 106 + sin(a / 7.64) * 15, 1, 1);
    for (let a = 0; a < 12; a++) {
      const sx = 133 + cos(a * 0.5236) * 15, sy = 106 + sin(a * 0.5236) * 15;
      F(gd, sx - 1, sy, 3, 1);
      F(gd, sx, sy - 1, 1, 3);
    }
  });
  // 2. Smog view: Santiago's low sprawl seen from the hill, choking under a thick brown smog layer that thickens toward the ground.
  cv(sc, 'sc1c', 480, H, (c) => {
    // Gran Torre Costanera rising behind the sprawl and out of the haze: shaft and crown.
    F('#6e7480', 300, 140, 26, 220);
    F('#6e7480', 304, 118, 18, 22);
    for (let i = 0; i < 26; i++) {
      const w = rand(22, 46), h = rand(30, 120), x = rand(0, 480 - w);
      F(['#8a8478', '#a09888', '#7a7468'][i % 3], x, 360 - h, w, h + H - 360);
      for (let wy = 366 - h; wy < 352; wy += 9) for (let wx = x + 4; wx < x + w - 5; wx += 8) F('#c8bca0', wx, wy, 3, 4);
    }
    for (let y = 200; y < 380; y += 4) F(`rgba(170,130,90,${((y - 200) / 180) * 0.4})`, 0, y, 480, 4);
  });
}

function texCostanera(sc) {
  // Dusk sky, sun and Andes on the far layer; generic Providencia on the near layer.
  cv(sc, 'b2a', W, H, (c) => {
    sky(c, 0x3a2a6a, 0xff9a5a);
    el('#ffd27a', 600, 330, 40, 40);
    mtn(c, '#4a3a6a', '#e8d8f0', 330, 170, 6);
    mtn(c, '#3a2c55', 0, 400, 70, 8);
  });
  cv(sc, 'b2b', W, H, (c) => cc2city(c, 22, 80, 220, '#2a2440', '#ffd86a'));
  // Landmarks, in level order.
  cv(sc, 'cco0', 224, H, cc2gran);
  cv(sc, 'cco1', 300, H, cc2mut);
}

// ===== San Francisco: sfA far (fog, Marin, bay), sfB near (city), sf0 Golden Gate, sfL Painted Ladies, sfZ Alcatraz =====
const FOG = 'rgba(240,244,248,.55)';
function texSanFrancisco(sc) {
  cv(sc, 'sfA', W, H, (c) => {
    sky(c, 0x6fa0cc, 0xe4ecf0);
    mtn(c, '#6a7a5a', 0, 330, 90, 5);
    for (let y = 300; y < H; y += 4) F(mix(0x3a6a90, 0x1a3a58, (y - 300) / 300), 0, y, W, 4);
    for (let i = 0; i < 90; i++) F('rgba(255,255,255,.6)', rand(0, W - 12), rand(306, H), 4, 1);
    // Karl the fog rolling in over the headlands.
    for (let i = 0; i < 14; i++) {
      const x = rand(0, W), y = rand(250, 320), r = rand(40, 90);
      [-W, 0, W].forEach((d) => el(FOG, x + d, y, r, r / 4));
    }
  });
  cv(sc, 'sfB', W, H, (c) => (cc2city(c, 14, 120, 240, '#c8bca8', '#7a8ea8'), cc2city(c, 18, 50, 130, '#e8d0b8', '#5a6a80')));
  // sf0: Golden Gate Bridge, two art-deco towers in International Orange, catenary cables and the fog under the deck.
  cv(sc, 'sf0', 640, H, (c) => {
    const O = '#c0362c', D = '#7a2018', cab = (x, d = abs(x - 320)) => (d > 150 ? 120 + ((d - 150) / 170) ** 0.8 * 280 : 385 - 265 * (d / 150) ** 2);
    F('#2a5a80', 0, 410, 640, H - 410);
    F(O, 0, 400, 640, 8);
    F(D, 0, 408, 640, 6);
    for (let x = 0; x < 640; x += 2) {
      const y = cab(x);
      F(O, x, y, 2, 3);
      if (x % 8 < 1) F(D, x, y, 1, 400 - y);
      if (x % 12 < 1) F(D, x, 400, 2, 14);
    }
    [170, 470].forEach((x) => {
      [x - 24, x + 12].forEach((l) => (F(O, l, 110, 12, H - 110), F(D, l + 10, 110, 2, H - 110)));
      [112, 170, 240, 320].forEach((y) => F(O, x - 24, y, 48, 12));
    });
    for (let i = 0; i < 9; i++) el(FOG, rand(0, 640), rand(420, 460), rand(50, 110), rand(8, 14));
  });
  // sfZ: Alcatraz, a rocky island in the bay topped by the long white cellhouse and the lighthouse.
  cv(sc, 'sfZ', 520, H, (c) => {
    // No water of its own: the island sits in the sfA bay behind it.
    // Shrunk about the waterline and hazed (source-atop tints only the island) so it sits far out in the bay.
    c.save();
    c.translate(260 * 0.65, 370 - 430 * 0.35);
    c.scale(0.35, 0.35);
    for (let x = 20; x < 500; x += 2) {
      const y = min(300 + max(0, abs(x - 260) - 130) ** 2 / 40, 430) + sin(x / 7) * 3;
      F('#6e6050', x, y, 2, 434 - y);
      F(x % 22 < 8 ? '#5a7a44' : '#8a7a64', x, y, 2, 4);
    }
    // Barracks stepping down the slope.
    F('#d8ccb0', 300, 318, 110, 34);
    // Cellhouse: long white block, rows of tall barred windows, darker roof.
    F('#e8e4d8', 130, 250, 200, 58);
    F('#8a8478', 128, 244, 204, 6);
    for (let x = 138; x < 324; x += 9) F('#3a3a42', x, 262, 4, 32);
    F('#3a3a42', 130, 284, 200, 2);
    // Lighthouse: tapering white tower with a dark lantern room.
    for (let y = 160, w; y < 300; y++) F('#f4f2ea', 380 - (w = (y - 130) / 12), y, w * 2, 1);
    F('#2a2a30', 371, 148, 18, 14);
    F('#ffd86a', 375, 151, 10, 8);
    F('#2a2a30', 368, 160, 24, 3);
    c.restore();
    c.globalCompositeOperation = 'source-atop';
    F('rgba(150,180,210,.55)', 0, 0, 520, 370);
    c.globalCompositeOperation = 'source-over';
    // Sign on the barracks, drawn after the haze so it stays legible.
    F('#e8e0c8', 271, 330, 46, 12);
    c.fillStyle = '#2a2a30';
    c.font = 'bold 8px monospace';
    c.fillText('ALCATRAZ', 275, 339);
    for (let i = 0; i < 6; i++) el(FOG, rand(0, 520), rand(350, 390), rand(40, 90), rand(6, 10));
  });
  // sfL: the Painted Ladies, pastel Victorians stepping down Steiner St behind the Alamo Square lawn.
  cv(sc, 'sfL', 520, H, (c) => {
    ['#e8a0b0', '#a8d0e0', '#f0e0a0', '#b8e0b0', '#d8b8e8', '#f0c098'].forEach((col, i) => {
      const x = 10 + i * 84, g = 430 + i * 8, t = g - 160;
      F(col, x, t, 80, H - t);
      for (let j = 0; j < 40; j++) F('#5a4a5a', x + 40 - j, t - 40 + j, j * 2, 1);
      F(WHITE, x, t, 80, 3);
      F(WHITE, x, t + 75, 80, 3);
      // Bay window on the left, two sash windows on the right, white door with stoop.
      F(WHITE, x + 4, t + 14, 36, 130);
      F(col, x + 6, t + 16, 32, 126);
      [t + 22, t + 90].forEach((y) => [x + 9, x + 26, x + 50, x + 64].forEach((wx, k) => (k < 2 || y < t + 80) && (F(WHITE, wx, y, 12, 36), F('#3a4a6a', wx + 2, y + 2, 8, 32))));
      F(WHITE, x + 50, t + 108, 20, 52);
      F('#6a4a3a', x + 53, t + 111, 14, 49);
      el(WHITE, x + 40, t - 18, 6, 6);
    });
    for (let x = 0; x < 520; x += 2) F(x & 2 ? '#5a9a3e' : '#4e8a36', x, 470 + x * 0.1, 2, H);
  });
}

// ===== Finale portrait: p0-p3 front-facing face+body, bn peeled banana, paw =====
function texFinale(sc) {
  // p0/p1: mouth closed/open; p2/p3: the same with happy closed eyes; p4: angry, brows slanting down to the centre and a frown.
  for (let i = 0; i < 5; i++) {
    const g = FACE.map((r) => [...r]);
    const st = (x, y, rows) => rows.forEach((r, j) => [...r].forEach((ch, k) => ch != ' ' && (g[y + j][x + k] = ch)));
    st(7, 15, i == 2 || i == 3 ? ['    ', ' kk ', 'k  k'] : ['zwez', 'zeez', 'zeez', ' ee ']);
    if (i == 4) st(6, 13, ['kk', ' kkk', '   kkk']), st(11, 22, ['zzzzm', 'zzmmm', 'zmzzz']);
    else if (i & 1) st(12, 23, ['mmtt', 'mmRR']); // open mouth with buck teeth; the banana tip enters below
    cells(sc, 'p' + i, g.map((r) => r.join('')), 1);
  }
  cells(sc, 'paw', '.kkkk. kbnnbk kbbbbk kbsbsk .kkkk.');
  cv(sc, 'bn', 16, 32, (c) => {
    // Thick cream fruit with soft ridges; bites crop it flat from the top.
    F('#d8c890', 4, 0, 8, 18);
    F('#f7efc8', 5, 0, 6, 18);
    F('#fffbe6', 6, 0, 2, 16);
    F('#e8dca8', 9, 0, 1, 16);
    // Three pale yellow peel flaps hang outward, browning at the tips.
    for (let y = 14; y < 31; y++) {
      const l = round(((y - 14) / 17) ** 1.5 * 2);
      const t = y > 27 ? '#a07a30' : '#f2dc6a';
      F('#c9a840', 2 - l, y, 4, 1);
      F(t, 3 - l, y, 2, 1);
      F('#c9a840', 10 + l, y, 4, 1);
      F(t, 11 + l, y, 2, 1);
      F('#e8c850', 6, y, 4, 1);
      F('#fff0a0', 7, y, 2, 1);
    }
    F('#6a4a10', 6, 30, 4, 2);
  });
}

// ===== Costanera Center: b2a far (tiles), b2b near filler (tiles), cco* landmarks (each shown once) =====
function cc2glass(c, x, y, w, h, base, hi) {
  F(base, x, y, w, h);
  for (let i = 0; i < w; i += 24) F(hi, x + i + 4, y, 5, h);
  for (let j = y + 10; j < y + h - 6; j += 10) F('#1a2238', x, j, w, 1);
  for (let i = 8; i < w; i += 8) F('#1a2238', x + i, y, 1, h);
  for (let j = y + 12; j < y + h - 6; j += 10) for (let i = 2; i < w - 4; i += 8) if (random() < 0.12) F('#ffd86a', x + i, j, 5, 5);
}

function cc2gran(c) {
  // Gran Torre Santiago: tapered glass obelisk split by a centre recess, open lattice crown, a side tower and mall podium.
  cc2glass(c, 0, 300, 62, 300, '#34507a', '#6f8fb4');
  c.translate(24, 0); // everything else sits 24px right, leaving a gap after the side tower
  for (let y = 40; y < 480; y++) {
    const hw = 30 + (y - 40) * 0.025, t = min(1, max(0, (y - 96) / 300)), l = 100 - hw;
    if (y < 96) {
      // Crown: glass skin runs past the roof as a steel grid, rising to points at the four corners.
      for (let d = 2; d <= hw; d++)
        if (y >= 70 - d * 0.6 && (d < 3 || d > hw - 1 || y % 6 < 1 || d % 5 < 1 || y < 71 - d * 0.6)) F('#b8cce0', 100 - d, y, 1, 1), F('#8aa0bc', 99 + d, y, 1, 1);
      continue;
    }
    F(mix(0xe8a898, 0x5a7ea8, t), l, y, hw - 2, 1);
    F(mix(0x9a6a8a, 0x2c4670, t), 102, y, hw - 2, 1);
    F('#141c30', 98, y, 4, 1);
    F('#dce8f4', l, y, 2, 1);
    F('#1e2a48', 98 + hw, y, 2, 1);
    F('rgba(255,240,220,.35)', l + hw * 0.4, y, 3, 1);
    for (let i = 7; i < hw - 2; i += 5) F('rgba(20,30,60,.3)', l + i, y, 1, 1), F('rgba(20,30,60,.3)', 100 + i, y, 1, 1);
    if (y % 6 < 1) F('rgba(20,30,60,.45)', l, y, hw * 2, 1);
  }
  for (let y = 98; y < 470; y += 6) if (random() < 0.4) F('#ffd86a', 100 + (random() < 0.5 ? -1 : 1) * rand(5, 27), y + 1, 3, 3);
  F('#dce8f4', 68, 96, 64, 2);
  F('#ff4a4a', 69, 50, 2, 2);
  F('#ff4a4a', 129, 50, 2, 2);
  // Costanera mall podium.
  F('#3a3450', 10, 470, 180, 130);
  F('#c8d8e8', 10, 470, 180, 2);
  for (let y = 480; y < H; y += 22) F('#7fa8c8', 14, y, 172, 8);
  for (let x = 14; x < 186; x += 12) F('#3a3450', x, 470, 2, 130);
}

// MUT: twin dark glass towers whose roofs slope up toward the gap, copper inner edges and green-glass floor bands,
// a lower glass block between them over open planted terraces, and the Mercado Urbano Tobalaba box at street level.
// The Buk sign on top marks where Platanus Hack 26 happens.
function cc2mut(c) {
  F('#2a2c34', 100, 200, 100, H - 200);
  for (let y = 206; y < 400; y += 8) F('#4a4e5a', 100, y, 100, 1);
  for (let y = 404; y < 480; y += 25) F('#141518', 100, y, 100, 16), F('#3e7a2c', 104, y + 12, 92, 4);
  F('#dfe4da', 116, 482, 68, H - 482);
  F('#7aa86a', 116, 490, 68, 6);
  [0, 1].forEach((m) => {
    const P = (col, x, y, w, h) => F(col, m ? 300 - x - w : x, y, w, h);
    // Columns from the outer edge (i = 0) to the gap; the roof rises toward the gap.
    for (let i = 0; i < 110; i++) {
      const top = 150 - i * 0.7, x = 10 + i;
      P(i > 84 ? '#14161a' : i % 4 ? '#1e2026' : '#0c0d10', x, top, 1, H - top);
      if (i < 84) P('rgba(240,150,80,.25)', x, top, 1, 200); // sunset reflected in the upper glass
      if (i > 82 && i < 86) P('#c87a3a', x, top, 1, 470 - top);
    }
    for (let y = 100; y < 470; y += 9) P('#5a7a74', 98, max(y, 150 - 88 * 0.7), 18, 4);
    P('#24262c', 6, 470, 114, 130);
    for (let y = 476; y < H; y += 18) P('#5a6a74', 10, y, 106, 8);
  });
  // Buk sign on the centre block roof.
  F('#3150b4', 122, 172, 56, 28);
  c.fillStyle = WHITE;
  c.font = 'bold 17px sans-serif';
  c.textAlign = 'center';
  c.fillText('·buk·', 150, 192);
}

function cc2city(c, n, hmin, hmax, col, win) {
  for (let i = 0; i < n; i++) {
    const w = rand(30, 70), h = rand(hmin, hmax), x = rand(0, W);
    const at = (f) => [-W, 0, W].forEach((d) => f(x + d));
    at((p) => F(col, p, H - h, w, h));
    for (let wy = H - h + 6; wy < H - 6; wy += 10)
      for (let wx = 5; wx < w - 6; wx += 10) if (random() < 0.5) at((p) => F(win, p + wx, wy, 4, 5));
  }
}

// ===== Volcán Villarrica (flag volc): vla/vlb far/near backdrops (+E erupting), vlv cone, vlm* landmarks, vlt tile, vlo rock, vle ember =====
Object.assign(SFX, {
  verupt: [['sawtooth', 70, 20, 2.2, 0.3], ['triangle', 55, 25, 2.6, 0.3], ['square', 140, 30, 1.2, 0.12, 0.2]],
  vrumble: [['sawtooth', 50, 28, 1.4, 0.16]],
});
// The cone texture is 800 wide with the crater at (400, VY); at VX the crater sits mid-screen when it erupts (~42% in).
const VX = 658, VY = 175;
// Seeded random, so the calm and erupting versions of a texture line up.
const vlR = (s) => () => (s = (s * 16807) % 2147483647) / 2147483647;
// Cone half-width at height y: concave flanks, steep under the crater and flaring at the foot.
const vlHw = (y) => 22 + 378 * max(0, (y - VY) / 295) ** 1.25;

function texVillarrica(sc) {
  [0, 1].forEach((e) => {
    const s = e ? 'E' : '';
    cv(sc, 'vla' + s, W, H, (c) => vlFar(c, e));
    cv(sc, 'vlb' + s, W, H, (c) => vlNear(c, e));
    cv(sc, 'vlv' + s, 800, H, (c) => vlCone(c, e));
  });
  px(sc, 'vlo', '..kkkk...... .krrsrk.kkk. krwrrwrkrrrk kkkkkkkkrwrk ..kck..kkkkk ..kck...kck. ..kck...kck. .kcck..kcck. kddddddddddk .kkkkkkkkkk.');
  // Lava bomb falling down-left, flame trailing up-right.
  px(sc, 'vle', '.....r.y ....ry.. ..rrr.r. .ryyrr.. ryyyyr.. ryywyr.. sryyrs.. .sss....');
  cv(sc, 'vlsm', 16, 16, (c) => (el('rgba(255,255,255,.4)', 8, 8, 7, 7), el('rgba(255,255,255,.6)', 8, 8, 5, 5), el(WHITE, 8, 8, 3, 3)));
  cv(sc, 'vlsq', 3, 3, (c) => F(WHITE, 0, 0, 3, 3));
  // Platform: basalt and scoria under a crust of grey ash, with a few tufts of coirón.
  cv(sc, 'vlt', 128, H, (c) => {
    F('#2c2832', 0, 0, 128, H);
    for (let y = 40; y < H; y += 36) F('#3c3644', 0, y, 128, 3), F('#1a1820', 0, y + 3, 128, 1);
    for (let i = 0; i < 40; i++) el(['#16141a', '#4a4252', '#5a2c24'][i % 3], rand(4, 124), rand(18, H - 4), rand(1, 4), rand(1, 2));
    F('#8a8490', 0, 0, 128, 9);
    F('#b8b2bc', 0, 0, 128, 2);
    F('#5a5460', 0, 9, 128, 2);
    for (let x = 0; x < 128; x += 4) F(random() < 0.5 ? '#6a6472' : '#a09aa6', x + rand(0, 2), rand(3, 7), 2, 2);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) F('#7a8a3a', rand(4, 120) + j * 2, 2 - (j & 1), 1, 4);
  });
  // Landmarks, in level order. 0: araucaria grove.
  cv(sc, 'vlm0', 260, H, (c) => [[60, 24], [140, 30], [212, 20]].forEach(([x, s]) => tree(c, x, 470, s, 1)));
  // 1: Gran Hotel Pucón, the long cream lakeside hotel with a red hipped roof and a taller centre wing.
  cv(sc, 'vlm1', 300, H, (c) => {
    const win = (x0, x1, y) => { for (let x = x0; x < x1; x += 16) F('#5a3a2a', x, y, 8, 12), F('#9fc8e8', x + 1, y + 1, 6, 6); };
    F('#e6dcc6', 10, 330, 280, 270);
    for (let j = 0; j < 24; j++) F(j % 4 ? '#a8402c' : '#7a2a1c', 4 + j * 1.3, 330 - j, 292 - j * 2.6, 1);
    F('#ece2cc', 110, 270, 80, 60);
    for (let j = 0; j < 30; j++) F(j % 4 ? '#a8402c' : '#7a2a1c', 104 + j * 1.5, 270 - j, 92 - j * 3, 1);
    win(118, 186, 284);
    win(118, 186, 308);
    for (const y of [342, 366, 390, 414]) win(18, 286, y);
    F(WHITE, 10, 330, 280, 2);
  });
  // 2: coihues, thick bare grey trunks under a broad crown of flat, layered clumps of small dark leaves.
  cv(sc, 'vlm2', 240, H, (c) => [[80, 170, 1], [175, 215, 0.8]].forEach(([x, top, s]) => {
    F('#6a6260', x - 7 * s, top, 14 * s, H - top);
    F('#8a827c', x - 7 * s, top, 4 * s, H - top);
    for (let i = 0; i < 11; i++) {
      const y = top - 50 * s + rand(0, 110) * s, o = rand(-55, 55) * s, w = rand(18, 32) * s;
      ln(c, '#5a5250', x, top + 30 * s, x + o, y + 4);
      el('#1f3a22', x + o, y, w, 7 * s);
      el('#2f5a32', x + o - 3, y - 3, w * 0.7, 4 * s);
      for (let k = 0; k < 5; k++) F('#5a8a48', x + o + rand(-w, w) * 0.6, y - rand(2, 6) * s, 2, 2);
    }
  }));
}

function vlRidge(c, col, snow, base, amp, k) {
  for (let x = 0; x < W; x += 4) {
    const u = (x / W) * PI * 2, y = base - amp * (0.55 + 0.25 * sin(u * 2 + k) + 0.2 * sin(u * 5 + k * 2));
    F(col, x, y, 4, H - y);
    if (snow && y < base - amp * 0.6) F(snow, x, y, 4, (base - amp * 0.6 - y) * 0.7 + 3);
  }
}

// Far layer: sky and the lower Andes behind the volcano; erupting: a night sky lit red under the ash cloud.
function vlFar(c, e) {
  sky(c, e ? 0x1e0a14 : 0x4a9ee6, e ? 0xd0502a : 0xdcefff);
  for (let i = 0; i < (e ? 14 : 4); i++) {
    const x = (i * 197) % W, y = e ? 30 + ((i * 37) % 170) : 50 + i * 30, w = e ? 90 : 40 + i * 12;
    [0, W, -W].forEach((o) => (e ? el('rgba(30,14,16,.5)', x + o, y, w, 22) : (el(WHITE, x + o, y, w, 8), el(WHITE, x + o + w * 0.3, y - 7, w * 0.45, 8))));
  }
  vlRidge(c, e ? '#4a3040' : '#7d8cae', e ? '#c88a80' : '#eef3fb', 395, 90, 1);
  vlRidge(c, e ? '#2e1e28' : '#55687e', 0, 432, 40, 4);
}

// Near layer: the far shore of Lago Villarrica (native forest, araucarias, Pucón's houses) and the lake itself.
function vlNear(c, e) {
  const r = vlR(3);
  for (let i = 0; i < 80; i++) {
    const x = r() * W, y = 432 + r() * 6, rx = 8 + r() * 10, ry = 5 + r() * 4;
    [0, -W, W].forEach((o) => el(['#1c3622', '#264a2c', '#30583a'][i % 3], x + o, y, rx, ry));
  }
  const hs = [];
  for (let i = 0; i < 12; i++) {
    const x = 60 + r() * 680, w = 10 + r() * 12;
    hs.push(x);
    F('#e8dcc8', x, 431, w, 10);
    F(i % 2 ? '#a83a2a' : '#5a4a44', x - 1, 428, w + 2, 3);
  }
  for (let i = 0; i < 6; i++) tree(c, 30 + r() * 740, 441, 6 + r() * 3, 1);
  if (e) {
    c.globalCompositeOperation = 'source-atop';
    F('rgba(50,8,16,.55)', 0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
  }
  hs.forEach((x) => F(e ? '#ffd86a' : '#4a5a6a', x + 3, 434, 3, 3));
  for (let y = 440; y < H; y += 4) F(mix(e ? 0x5a2028 : 0x4a80b8, e ? 0x1e0c14 : 0x1e4a78, (y - 440) / 160), 0, y, W, 4);
  for (let i = 0; i < 70; i++) {
    const x = r() * W, y = 446 + r() * 150, w = 6 + r() * 30;
    [0, -W].forEach((o) => F(e ? (i % 3 ? '#c84a2a' : '#ffb04a') : i % 3 ? '#7aaad8' : '#d8ecff', x + o, y, w, 1));
  }
  F(e ? '#ff9a4a' : '#e8f4ff', 0, 440, W, 1);
}

// Villarrica's cone: glacier cap and steaming crater. Erupting: lit red, lava down the flanks.
function vlCone(c, e) {
  const r = vlR(7);
  for (let y = VY; y < H; y += 2) {
    const hw = vlHw(y), t = min(1, (y - VY) / 300);
    F(mix(0x6c6680, 0x3a4038, t), 400 - hw, y, hw, 2);
    F(mix(0x4a4560, 0x283028, t), 400, y, hw, 2);
  }
  // Glacier: lower edge ragged, with tongues reaching down the gullies.
  for (let x = 0; x < 800; x += 2) {
    const d = abs(x - 400), y = VY + 295 * max(0, (d - 22) / 378) ** 0.8, sl = VY + 135 + 22 * sin(x * 0.045) + 14 * sin(x * 0.17 + 1) + r() * 6;
    if (d < 400 && sl > y) {
      F(x < 400 ? '#f4f6fb' : '#c6cede', x, y, 2, sl - y);
      F(x < 400 ? '#d0d8e6' : '#a2acc2', x, sl - 2, 2, 2);
    }
  }
  for (let i = 0; i < 12; i++) {
    const a = -0.9 + i * 0.16 + r() * 0.05, y1 = VY + 110 + r() * 60;
    for (let y = VY + 16 + r() * 50; y < y1; y++) F(a < 0 ? '#aeaabe' : '#8a849e', 400 + a * vlHw(y), y, 2, 1);
  }
  // Ash-stained summit and the crater mouth.
  for (let y = VY; y < VY + 10; y++) F('#6a6272', 400 - vlHw(y) + 2, y, (vlHw(y) - 2) * 2, 1);
  F('#2e2834', 384, VY - 1, 32, 3);
  F('#9a92a4', 378, VY - 2, 44, 1);
  for (let i = 0; i < 90; i++) {
    const x = r() * 800, y = 392 + r() * 50;
    if (abs(x - 400) < vlHw(y) - 4) el(['#1e3a24', '#284a2c', '#335a36'][i % 3], x, y, 5 + r() * 5, 3 + r() * 3);
  }
  if (!e) return;
  c.globalCompositeOperation = 'source-atop';
  F('rgba(70,10,24,.55)', 0, 0, 800, H);
  el('rgba(255,110,40,.35)', 400, VY + 20, 90, 60);
  c.globalCompositeOperation = 'source-over';
  [-0.32, 0.1, 0.46].forEach((a, k) => {
    for (let y = VY; y < VY + 100 + k * 45; y++) {
      const x = 400 + (a + 0.06 * sin(y / 11 + k)) * vlHw(y);
      F('rgba(255,80,20,.3)', x - 3, y, 7, 1);
      F('#ff6a1a', x - 1, y, 3, 1);
      F('#ffd04a', x, y, 1, 1);
    }
  });
  el('#ff6a1a', 400, VY, 26, 6);
  el('#ffd04a', 400, VY, 16, 3);
}

// Volcano, plume emitters, ash rain and haze; all live in sc.lms so setScenery clears them with the landmarks.
function volcScenery(sc) {
  const add = (o, d, f = 0.02) => (sc.lms.add(o), o.setScrollFactor(f, 0).setDepth(d));
  const pe = (x, y, k, d, f, cfg) => add(sc.add.particles(x, y, k, cfg), d, f);
  sc.state.vWarn = sc.state.vEr = 0;
  sc.vo = {
    v: add(sc.add.image(VX, H, 'vlv').setOrigin(0.5, 1), -9.5),
    glow: add(sc.add.image(VX, VY, 'vlsm').setScale(9, 5).setTint(0xff6a20).setBlendMode('ADD').setVisible(false), -9.45),
    sm: pe(VX, VY - 4, 'vlsm', -9.4, 0.02, { x: { min: -8, max: 8 }, speedY: { min: -26, max: -12 }, speedX: { min: 6, max: 16 }, scale: { start: 0.8, end: 3.5 }, alpha: { start: 0.5, end: 0 }, lifespan: 6000, frequency: 250, advance: 6000 }),
    col: pe(VX, VY - 6, 'vlsm', -9.4, 0.02, { x: { min: -14, max: 14 }, speedY: { min: -150, max: -80 }, speedX: { min: -10, max: 35 }, scale: { start: 1.5, end: 7 }, alpha: { start: 0.9, end: 0 }, tint: [0x2a2020, 0x3a3030, 0x4a3a36], lifespan: 4500, frequency: 45, emitting: false }),
    lav: pe(VX, VY - 4, 'vlsq', -9.3, 0.02, { speedY: { min: -260, max: -140 }, speedX: { min: -90, max: 90 }, gravityY: 240, scale: { start: 1.6, end: 0.5 }, tint: [0xffd04a, 0xff7a1a, 0xff3a10], blendMode: 'ADD', lifespan: 1600, frequency: 25, quantity: 2, emitting: false }),
    rain: pe(0, -10, 'vlsq', 6, 0, { x: { min: 0, max: W + 300 }, speedY: { min: 45, max: 100 }, speedX: { min: -60, max: -20 }, scale: { min: 0.4, max: 1 }, tint: [0x8a8288, 0x5a5458, 0xb0a8a8, 0xff8a3a], lifespan: 12000, frequency: 90, emitting: false }),
    haze: add(sc.add.rectangle(0, 0, W, H, 0x5a3028).setOrigin(0).setAlpha(0), 6, 0),
  };
}

// Smoke, then rumbling (~33%), then the eruption (~42%): after it, burning ember chunks rain down in waves.
function volcPlay(sc, t, p) {
  const st = sc.state, o = sc.vo, cam = sc.cameras.main, rnd = Phaser.Math.Between;
  if (!st.vWarn && p > 0.33) {
    st.vWarn = 1;
    banner(sc, 'EL VOLCÁN\nRETUMBA...');
    cam.shake(1500, 0.004);
    playSound(sc, 'vrumble');
    o.sm.setFrequency(70);
    o.sm.particleTint = 0x9a9098;
  }
  if (!st.vEr && p > 0.42) {
    Object.assign(st, { vEr: t, vDrop: t + 1200, vHeavy: t + 3500, vShow: t + 8000 });
    cam.shake(3000, 0.012);
    cam.flash(700, 255, 120, 40);
    playSound(sc, 'verupt');
    banner(sc, '¡ERUPCIÓN!');
    sc.bgs[0].setTexture('vlaE');
    sc.bgs[1].setTexture('vlbE');
    o.v.setTexture('vlvE');
    o.sm.stop();
    [o.col, o.lav, o.rain].forEach((m) => m.start());
    o.glow.setVisible(true);
    sc.lms.getChildren().forEach((m) => m.texture && m.texture.key.startsWith('vlm') && m.setTint(0xb07070));
    sc.tweens.add({ targets: o.haze, alpha: 0.2, duration: 2500 });
  }
  if (!st.vEr) return;
  o.glow.setAlpha(0.55 + 0.3 * sin(t / 90));
  if (t > st.vShow) {
    st.vShow = t + rnd(11000, 15000);
    st.vHeavy = t + 2000;
    cam.shake(2500, 0.005);
    playSound(sc, 'vrumble');
  }
  if (t > st.vDrop) {
    st.vDrop = t + (t < st.vHeavy ? 1800 : rnd(3500, 5000));
    // Spawned ahead and above: they drift left as Canelita runs under them, so they land around her.
    sc.debris.create(cam.scrollX + rnd(500, 1250), -20, 'vle').body.setVelocity(rnd(-90, -40), 60).setGravityY(-1050);
  }
}

// ===== Antártica: an0a far (tiles), an0b near filler (tiles), anl* landmarks, tan ice tile, oban ice block =====
function texAntartica(sc) {
  const at = (x, f) => [-W, 0, W].forEach((d) => f(x + d)); // draw 3 copies so a tile wraps seamlessly
  // Far layer: polar twilight with an aurora, stars, snowy ranges, a cold sea.
  cv(sc, 'an0a', W, H, (c) => {
    sky(c, 0x14204e, 0xf0d0e0);
    for (let i = 0; i < 70; i++) F(WHITE, rand(0, W), rand(0, 220), 1, 1);
    // Aurora: a wavy green curtain with rays fading upward (whole sine periods so it tiles).
    for (let x = 0; x < W; x += 2) {
      const y = 150 + sin((x / W) * PI * 4) * 28 + sin((x / W) * PI * 6 + 1) * 14;
      const r = 50 + 30 * sin((x / W) * PI * 10) ** 2;
      for (let j = 0; j < r; j += 2) F(`rgba(90,255,170,${(1 - j / r) * 0.3})`, x, y - j, 2, 2);
      F('rgba(200,255,225,.55)', x, y, 2, 2);
      F('rgba(255,90,200,.2)', x, y + 2, 2, 6);
    }
    mtn(c, '#a4b8d4', WHITE, 330, 170, 6);
    mtn(c, '#dce8f4', 0, 384, 60, 9);
    F('#2c5a84', 0, 400, W, 200);
    // Navy icebreaker on the far sea: red hull tapering to the waterline, white bridge, ochre funnel, mast.
    for (let j = 0; j < 8; j++) F('#c8281e', 520 + j, 408 + j, 64 - j * 2, 1);
    F(WHITE, 536, 398, 26, 10);
    F('#2a3a4a', 538, 400, 22, 2);
    F('#d8a020', 552, 388, 6, 10);
    F('#111', 552, 386, 6, 2);
    F('#555', 541, 384, 1, 14);
  });
  // Near filler: dark water with tabular icebergs, a few penguins standing on some of them.
  cv(sc, 'an0b', W, H, (c) => {
    F('#1f4a70', 0, 470, W, 130);
    for (let i = 0; i < 6; i++) {
      const x = rand(0, W), w = rand(70, 170), h = rand(26, 70), y = 476 + rand(-4, 10);
      at(x, (p) => {
        // Tabular berg: flat snow top, sunlit face, shaded side, banded blue strata.
        F(WHITE, p, y - h, w, h);
        F('#cfe2f2', p + w * 0.68, y - h, w * 0.32, h);
        for (let j = y - h + 10; j < y; j += 9) F('rgba(90,150,210,.35)', p, j, w, 2);
        if (i & 1) for (let k = 0; k < 3; k++) anPeng(c, p + 12 + k * 9 + rand(0, 20), y - h, 1, 0);
        F('#7fb4dc', p, y, w, 3); // submerged ice glow at the waterline
        F('rgba(220,240,255,.25)', p + 6, y + 5, w - 12, 3);
      });
    }
  });
  // Ice tile: snow crust with lumps, then banded glacier ice.
  cv(sc, 'tan', 128, H, (c) => {
    F('#6fa8d6', 0, 0, 128, H);
    for (let y = 30; y < H; y += 26) {
      F('#5a92c4', 0, y, 128, 2);
      F('#9cc8ec', 0, y + 2, 128, 1);
    }
    F('#a8c8e4', 0, 12, 128, 3);
    F('#eef6ff', 0, 0, 128, 13);
    for (let x = 0; x < 128; x += 16) el('#eef6ff', x + 8, 13, 7, 3); // snow lumps drooping over the edge
    F(WHITE, 0, 0, 128, 3);
  });
  // Ice block obstacle with a snow cap.
  px(sc, 'oban', '...kkkkkk... ..kwwwwwwkk. .kwwwwsswwsk kwsswwwssssk kabbaaabbabk kaabbaaaabdk kbaaabbaabdk kabaaaabbbdk kbbabbbbbddk .kkkkkkkkkk.', 3,
    { k: '#1e3a5a', w: WHITE, s: '#dcebf8', a: '#a8d4f2', b: '#6aa8dc', d: '#3a78b8' });
  // Landmarks, in level order.
  // 1. Base Presidente Eduardo Frei Montalva: red/orange modules, blue-roofed white blocks, a mast and the flag.
  cv(sc, 'anl1', 360, H, (c) => {
    for (let x = 0; x < 360; x++) F('#e8eef4', x, 380 - sin((x / 360) * PI) * 40, 1, H);
    for (let i = 0; i < 22; i++) F('#6a6460', rand(0, 360), rand(350, 420), rand(4, 14), 2);
    F('#c83020', 60, 120, 3, 240); // radio mast, red and white bands
    for (let y = 120; y < 360; y += 24) F(WHITE, 60, y, 3, 12);
    ln(c, '#8a8a8a', 61, 130, 30, 352);
    ln(c, '#8a8a8a', 62, 130, 92, 352);
    [[20, 344, 70, 22, '#e04a1e'], [100, 334, 90, 24, '#d8381a'], [120, 312, 50, 22, '#f07a20'], [200, 340, 60, 20, '#c83020'], [176, 356, 110, 18, '#e85a1e']].forEach(([x, y, w, h, col]) => {
      F(col, x, y, w, h);
      F('#7a1c10', x, y + h - 2, w, 2);
      for (let wx = x + 5; wx < x + w - 6; wx += 10) F('#2a3a4a', wx, y + 6, 5, 6);
    });
    anHouse(c, 268, 360, 50, 22, '#f4f4f0', '#2a5ab0');
    anFlag(c, 220, 250);
  });
  // 2. Villa Las Estrellas: colourful family houses and the distance signpost.
  cv(sc, 'anl2', 360, H, (c) => {
    for (let x = 0; x < 360; x++) F('#eef4fa', x, 372 + sin(x / 40) * 6, 1, H);
    [[10, '#e04a1e', '#5a2a1a'], [62, '#f0c020', '#2a5ab0'], [114, '#2a6ae8', '#f4f4f0'], [166, '#e85a1e', '#3a3a44']].forEach(([x, wall, roof]) => anHouse(c, x, 344, 44, 28, wall, roof));
    // Signpost with arrows to faraway cities.
    F('#5a3a22', 345, 300, 3, 72);
    [['#e04a1e', 302, 1], ['#2a6ae8', 312, -1], ['#f0c020', 322, 1], ['#3aa84a', 332, -1]].forEach(([col, y, d]) => {
      F(col, d > 0 ? 347 : 330, y, 16, 6);
      F(col, d > 0 ? 363 : 328, y + 1, 2, 4);
    });
  });
}

// Standing penguin with feet at (x, y), scale s; emp = emperor (yellow neck patch, longer bill).
function anPeng(c, x, y, s, emp) {
  el('#1c2028', x, y - 5 * s, 2.2 * s, 5 * s);
  el(WHITE, x + 0.6 * s, y - 4.4 * s, 1.4 * s, 4 * s);
  el('#1c2028', x, y - 10.5 * s, 1.6 * s, 1.6 * s);
  F(emp ? '#f0b020' : WHITE, x + 0.4 * s, y - 9.5 * s, s, s * (emp ? 2 : 1));
  F(emp ? '#f08a40' : '#f0581a', x + 1.5 * s, y - 10.5 * s, s * (emp ? 1.5 : 1), max(1, s * 0.6));
  F('#f08a3a', x - s, y - 1, 2 * s, max(1, s * 0.6));
}

// House at (x, y) top-left of the wall, with a pitched roof and two windows.
function anHouse(c, x, y, w, h, wall, roof) {
  F(wall, x, y, w, h);
  for (let j = 0, rh = w / 3; j < rh; j++) F(roof, x + w / 2 - ((j + 1) / rh) * (w / 2 + 3), y - rh + j, ((j + 1) / rh) * (w + 6), 1);
  F('#2a3a4a', x + w * 0.2, y + h * 0.3, 6, 7);
  F('#2a3a4a', x + w * 0.65, y + h * 0.3, 6, 7);
}

// Chilean flag on a pole (pole top at x, y).
function anFlag(c, x, y) {
  F('#c8c8d0', x, y, 2, 100);
  F(WHITE, x + 2, y + 2, 36, 12);
  F('#d52b1e', x + 2, y + 14, 36, 12);
  F('#0039a6', x + 2, y + 2, 12, 12);
  F(WHITE, x + 7, y + 5, 2, 6);
  F(WHITE, x + 5, y + 7, 6, 2);
}


function fnBite(sc, n) {
  const m = sc.sm;
  m.p.setTexture('p' + ((n % 2) + (random() < 0.35 ? 2 : 0))).setScale(fnS * 1.06, fnS * 0.9);
  sc.tweens.add({ targets: m.p, scaleX: fnS, scaleY: fnS, duration: 110, ease: 'Back.Out' });
  setBanana(sc, n);
  playSound(sc, 'bite');
  for (let i = 0; i < 4; i++) {
    const cr = sc.add.rectangle(400 + rand(-30, 30), MOUTH_Y + rand(4, 24), 6, 6, i % 2 ? 0xffd83a : 0xf7efc0);
    m.c.add(cr);
    sc.tweens.add({
      targets: cr,
      x: cr.x + rand(-90, 90),
      y: cr.y + rand(60, 160),
      angle: rand(-240, 240),
      alpha: 0,
      duration: 520,
      onComplete: () => cr.destroy(),
    });
  }
}


const BUN_DETAIL = [
  [17, 7, 1, 0, 'b'],  // fill leftover outline at the neck, under the ears
  [20, 6, 0, 0, 'n'],  // head highlight
  [23, 11, 1, 1, 'c'], // cream muzzle
  [24, 9, 0, 0, 'w'],  // white patch on top of the nose
  [22, 8, 0, 1, 'e'],  // eye
  [21, 7, 0, 0, 'w'],  // eye shine
  [24, 10, 0, 0, 'p'],  // nose
];

// ---------- Controls (from the starter) ----------
function createControls(scene) {
  scene.ctl = { held: Object.create(null), pressed: Object.create(null) };

  const onKeyDown = (event) => {
    const arcadeCode = KEYBOARD_TO_ARCADE[normalizeIncomingKey(event.key)];
    if (!arcadeCode) return;
    if (!scene.ctl.held[arcadeCode]) scene.ctl.pressed[arcadeCode] = true;
    scene.ctl.held[arcadeCode] = true;
  };
  const onKeyUp = (event) => {
    const arcadeCode = KEYBOARD_TO_ARCADE[normalizeIncomingKey(event.key)];
    if (arcadeCode) scene.ctl.held[arcadeCode] = false;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  scene.events.once('shutdown', () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  });
}

function normalizeIncomingKey(key) {
  return key === ' ' ? 'space' : String(key || '').toLowerCase();
}

function isControlHeld(scene, controlCode) {
  return scene.ctl.held[controlCode] === true;
}

function consumeAnyPressedControl(scene, controlCodes) {
  for (const controlCode of controlCodes) {
    if (scene.ctl.pressed[controlCode]) {
      scene.ctl.pressed[controlCode] = false;
      return true;
    }
  }
  return false;
}

// -1/0/1 from either joystick along one axis (a = negative direction, b = positive).
const menuAxis = (h, a, b) => (h['P1_' + b] || h['P2_' + b] ? 1 : 0) - (h['P1_' + a] || h['P2_' + a] ? 1 : 0);

// ---------- Initials entry: classic 3-slot slider ----------
function handleNameEntry(sc, time) {
  const e = sc.state.ne;
  const x = menuAxis(sc.ctl.held, 'L', 'R');
  const y = menuAxis(sc.ctl.held, 'U', 'D');
  if (!x && !y) e.t = 0; // release = next tap is instant; holding auto-repeats
  else if (time >= e.t) {
    e.t = time + 150;
    if (y) e.letters[e.i] = AZ[Phaser.Math.Wrap(AZ.indexOf(e.letters[e.i]) - y, 0, 26)];
    else e.i = Phaser.Math.Clamp(e.i + x, 0, WINNING_NAME_LENGTH - 1);
    playSound(sc, 'click');
    refreshNameEntry(sc);
  }
  if (consumeAnyPressedControl(sc, ['P1_1', 'P2_1', 'P1_2', 'P2_2', 'START1', 'START2'])) {
    playSound(sc, 'select');
    if (e.i < WINNING_NAME_LENGTH - 1) {
      e.i++;
      refreshNameEntry(sc);
    } else if (BAD.includes(e.letters.join(''))) rejectName(sc);
    else submitHighScore(sc);
  }
}

function refreshNameEntry(sc) {
  const e = sc.state.ne;
  sc.eg.nameValue.setText(e.letters.map((l, i) => (i === e.i ? `[${l}]` : ` ${l} `)).join(''));
}

function submitHighScore(scene) {
  const st = scene.state;
  if (st.phase !== 'gameover') return;
  const name = st.ne.letters.join('').slice(0, WINNING_NAME_LENGTH) || '???';
  const entry = { name, bananas: st.bananas, ms: round(st.ms), level: LEVELS[st.lv].n, savedAt: new Date().toISOString().slice(0, 10) };
  setPhase(scene, 'saved');
  scene.eg.note.setText(`¡GUARDADO, ${name}! PRESIONA START`);
  persistHighScore(entry)
    .then((h) => {
      st.hs = h;
      refreshLeaderboard(scene);
    })
    .catch(() => scene.eg.note.setText('NO SE PUDO GUARDAR. PRESIONA START'));
}

function refreshLeaderboard(scene) {
  const h = scene.state.hs;
  const s = h.length
    ? h.map((e, i) => `${i + 1}. ${e.name.padEnd(3, ' ')} ${String(e.bananas).padStart(4, ' ')} ${fmtTime(e.ms).padStart(7, ' ')}  ${e.level}`).join('\n')
    : 'SIN RÉCORDS AÚN';
  scene.eg.lb.setText(s);
  scene.menu.list.setText(s);
}

// ---------- Storage (from the starter) ----------
async function persistHighScore(entry) {
  const existing = await loadHighScores();
  const nextScores = existing
    .concat(entry)
    .sort((a, b) => (b.bananas - a.bananas || a.ms - b.ms || (a.savedAt < b.savedAt ? 1 : -1)))
    .slice(0, MAX_HIGH_SCORES);
  await getStorage().set(STORAGE_KEY, nextScores);
  return nextScores;
}

async function loadHighScores() {
  const result = await getStorage().get(STORAGE_KEY);
  if (!result.found || !Array.isArray(result.value)) return [];
  return result.value.filter(isHighScoreEntry).slice(0, MAX_HIGH_SCORES);
}

function isHighScoreEntry(v) {
  return v && typeof v === 'object' && typeof v.name === 'string' && typeof v.bananas === 'number' && typeof v.ms === 'number' && typeof v.level === 'string' && typeof v.savedAt === 'string';
}

function getStorage() {
  if (window.platanusArcadeStorage) return window.platanusArcadeStorage;
  return {
    async get(key) {
      try {
        const raw = window.localStorage.getItem(key);
        return raw === null ? { found: false, value: null } : { found: true, value: JSON.parse(raw) };
      } catch {
        return { found: false, value: null };
      }
    },
    async set(key, value) {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
  };
}
})();
