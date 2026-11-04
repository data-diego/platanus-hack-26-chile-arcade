// El día del Platanus
// 1-player 16-bit runner: Canelita runs across Chile catching bananas, then eats one as fast as she can.

const W = 800;
const H = 600;
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
  { n: 'CERRO SAN CRISTÓBAL', bg: ['b1a', 'b1b'], f: [0.06, 0.3], v: [290, 390], len: 15000, lm: ['sc1v', 'sc1s', 'sc1c'], lf: 0.2, tile: 'tg', ob: 'ob1', g: [70, 190], w: [260, 620], mud: 1, cab: 1 },
  { n: 'COSTANERA CENTER', bg: ['b2a', 'b2b'], f: [0.06, 0.3], v: [320, 440], len: 16000, lm: ['cco0', 'cco1', 'cco2', 'cco3', 'cco4', 'cco5'], lf: 0.2, tile: 'tr', ob: 'ob2', g: [90, 220], w: [200, 560], quake: 1 },
];

// ---------- Music (transcribed from the stems in music/, see music/song.mid) ----------
// One token per 16th note: note name (C5, D#4), '-' holds the previous note, '.' is silence; drums: k kick, s snare, x hat.
const SONG = {
  // ref: 7.862s @110bpm
  bpm: 110,
  t: [
    ['square', 0.2, 'E5 E5 F#5 G#5 G#5 . E5 - - - - E5 C#5 C#5 B4 - - - - - - - - F#5 . G#5 G#5 . F#5 E5 - - - F#5 F#5 G#5 - . E5 - E5 - - - C#5 C#5 B4 - - - - - - F#4 - D#5 C#5 F#4 F#4 . E4 E4 - E4 E5 F#5 F#5 G#5 G#5 . E5 - E5 - - - C#5 C#5 B4 - - - - - - B4 - F#5 . G#5 - - F#5 E5 - - - F#5 F#5 G#5 G#5 . E5 - E5 - - - C#5 C#5 B4 - - - - - - F#4 . . C#5 B4 B4 . E4 E4 E4 - - . . . . D#5 - E5 - C#5 C#5 B4 - - E5 - E5 E5 - F#5 F#5 . . F#5 . E5 F#5 F#5 C#5 C#5 E5 - - - . . B4 B4 - D#5 B4 G#4 F#4 F#4 A4 A4 F#4 F#4 C#4 C4 . . . . . F#5 . E5 F#5 F#5 C#5 D#5 E5 - - - . . . E5 C#5 D#5 E5 F#4 F#4 G#4 G#4 E4 . . . . . . . . . F#5 . E5 F#5 F#5 C#5 D#5 E5 - - - . . . B4 B4 A4 F4 E5 F#5 . F#5 B4 . G#4 . A4 E4 B4 B4 . . G#5 . . G#5 - - F#5 F5 F5 E5 E5 F#5 G#5 G#5 . E5 - E5 - - E5 C#5 C#5 B4 - - - - - - - - F#5 . G#5 - - F#5 E5 - - - F#5 F#5 G#5 G#5 . E5 - E5 - - - C#5 C#5 B4 - - - - - - F#4 F#4 D#5 C#5 F#4 F#4 . E4 E4 - E4 . . F#5 G#5 - . E5 - E5 - - E5 C#5 C#5 B4 - - - - - - B4 - F#5 . G#5 - . F#5 E5 E5 - - F#5 F#5 G#5 - . E5 - E5 - - - C#5 C#5 B4 - - - - - B4 F#4 . . C#5 - B4 . E4 E4 - - - - . . . . E5 - E5 - - - C#5 C#5 B4 - - - - - - - - F#5 . G#5 G#5 - F#5 E5 - - - - - - - - E5 - E5 - - E5 C#5 C#5 B4 - - - - - - F#4 - E5 C#5 F#4 F#4 . E4 E4 - E4 . . F#5 G#5 - . E5 - E5 - - E5 C#5 C#5 B4 - - - - - - - - F#5 . G#5 - - F#5 E5 - - E5 - - - - - E5 - E5 - - - C#5 C#5 B4 - - - - - - F#4 . . C#5 B4 B4 . E4 E4 - - - . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .'],
    ['triangle', 0.2, '. . . . . . . E3 - - - - - - A2 - - - - - - - - B2 - - D#3 - - E3 - - - - - - - - - E3 - - - - - - F#3 - - - - - - - - B2 - - D#3 - - E3 - - - - - - - - - E3 - - - - - - A2 - - - - - - - - B2 - - D#3 - - E3 - - - - - - - - - E3 - - - - - - F#3 - - - - - - - - B2 - - D#3 - - E3 - - - - - - - - - E3 E3 - - - - - A2 - - - - - - - - B2 - - D#3 - - E3 - - - - - - - - - E3 - - - - - - F#3 - - - - F#3 - - - B2 - - D#3 - - E3 - - - - - - - - - E3 - - - - - - A2 - - - - - - - - B2 - - D#3 - - E3 - - - - - - - - - E3 - - - - - - F#3 - - - - - - - - B2 - . . . . . . . . . . . . . . E3 - - - - - - A2 - - - - - - - - B2 - - D#3 - - E3 - - - - - - - - - E3 - - - - - - F#3 - - - - - - - - B2 - - D#3 - - E3 - - - - - - - - - E3 - - - - - - A2 - - - - - - - - B2 - - D#3 - - E3 - - - - - - - - - E3 - - - - - - F#3 - - - - - - - - B2 - - D#3 - - E3 - - - - - - - . . . . . . . . . . . . . . . . . . B2 - - D#3 - - E3 - - - - - - - - - E3 - - - - - - F#3 - - - - - - - - B2 - - D#3 - - E3 - - - - - - - - - E3 - - - - - - A2 - - - - - - - - B2 - - D#3 - - E3 - - - - - - - - - . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . E3 - - - - - E3 A2 - - - - A2 - - - B2 - - D#3 - - E3 - - - E3 - E3 - E3 E3 E3 - - - - - E3 F#3 - - - - - - F#3 - B2 - B2 D#3 - - E3 - - - - - E3 - - - E3 - - - - - E3 A2 - - - - - - - - B2 - - D#3 - - E3 - - - E3 - E3 - E3 - E3 - - - - - E3 F#3 - - - - - - F#3 F#3 B2 - B2 D#3 D#3 D#3 E3 - - - - - -'],
    ['noise', 0.2, '. . . . . . . k . . . s . . s . . . k s . . k k x . s s . k . x x x x s . . x . x x x s . x s x . x k s . k x k x . x s . s . x k s x s . . x . x x x s . x k . . k x s . . x . x . s s . . . . k x k s . x k . x x k s . x k x . k x s . . . s x . s s . k . x x s x s . . . s . . . . . . k . . . . k . . . k . . s s . k . x . x . s . . . s . x . s . k s x . k . s . . . s . x s s . k . x . s . s . k . s . x . s . x s x . k . s . k . k . x s s . k . x . k . s . k . k . x . s . x s x . k . s . x . k . . . . . . . . . . . . . . . k . . . . . . k . . . . k . k . k . . k s . k . x x x x s . . x . x x x s . x k . . k k s . k x s x . k s . k . . x s x s . x . s x x k s . x s x . k x s . k . s x . s s k k . x x k k s . x k s x x x s k . s x . k x s . k x s x . s s . k . x x s x s . . . k . . . . . . k . . . . . . . . k . . . . . k . x x x x s . x x s x x x s . . s x . k x s . k k . x . s s . s . x x s x s . k x . x x x s . k s x . x x s . . x k x . s s . k . x x x k s . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . k . . . k . . k . . . . k . . . . . . k s . k . . k x x s . x x . x x k s . x k x . x x s . x x k x . s s . k . x k s x s . x x . x x x s . x k x . x x s . x x k x . s s . k . x x x x s . x x k x x x s . x k x . x x s . x x k x . s s . k . x x s x s'],
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
const PAL = { k: '#2a1608', b: '#8a5630', d: '#5a3418', c: '#ead2a8', w: '#ffffff', e: '#111111', p: '#f2a0b4', y: '#ffd83a', o: '#9a6a00', g: '#8a8a90', l: '#c8c8d0', m: '#5a5a62', a: '#9fdcff', n: '#c98a58', z: '#f6e3c8', r: '#f08a24', s: '#c0581a', v: '#5cc23a', t: '#2e7a22' };
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
const BANANA = ['.......oo.', '.......oyo', '......oyyo', '......oyyo', '.....oyyyo', '....oyyyyo', '..ooyyyyo.', '.oyyyyyyo.', 'oyyyyyoo..', '.ooooo....'];
const CARROT = ['......v..v', '.....vtvvt', '......vtt.', '....kkkv..', '...krrrk..', '..krrsrk..', '..krrrrk..', '.krsrrk...', '.krrrk....', 'krrsk.....', 'krk.......', 'kk........'];
const OBSTACLES = {
  ob0: ['.kkkkkkkk.', 'kppppppppk', 'kpwwppwwpk', 'kppppppppk', 'kppwppwppk', 'kppppppppk', '.kkkkkkkk.'],
  ob1: ['...kkkkk...', '..kllgggk..', '.klggggggk.', 'kgggggggmmk', 'kggggggmmmk', 'kgggggmmmmk', '.kkkkkkkkk.'],
  ob2: ['kkkkkkkkkk', 'kllllllllk', 'klmmmmmmlk', 'klmgggmllk', 'klmgmgmllk', 'klmgggmllk', 'klmmmmmmlk', 'kllllllllk', 'kkkkkkkkkk'],
  gl: ['.aa.', 'aawa', 'aaaa', '.aaa', '.aa.', '..a.'],
};

const config = {
  type: Phaser.AUTO,
  width: W,
  height: H,
  parent: 'game-root',
  backgroundColor: '#1a0e06',
  pixelArt: true,
  // fixedStep off: a fixed 60Hz step stutters on 120Hz displays.
  physics: { default: 'arcade', arcade: { gravity: { y: 1500 }, debug: false, fixedStep: false } },
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
    highScores: [],
    nameEntry: { letters: [], i: 0, t: 0 },
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
  sc.mud = sc.add.image(0, 0, 'mud0').setOrigin(560 / 600, 0).setScrollFactor(0).setDepth(5).setVisible(false);

  createHud(sc);
  createSmash(sc);
  createEndGameUi(sc);
  createStartScreen(sc);
  createPause(sc);
  createControls(sc);
  showStart(sc);

  loadHighScores()
    .then((h) => {
      sc.state.highScores = h;
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
    const L = sc.startScreen.L, cam = sc.cameras.main;
    // shortcut: wrapping at L.len makes the scenery pop once per ~50s loop.
    cam.scrollX = (cam.scrollX + delta * 0.3) % L.len;
    scrollScenery(sc, L, time);
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
      if (st.lv + 1 < LEVELS.length) startLevel(sc, st.lv + 1);
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
  sc.controls.pressed = Object.create(null);
}

// ---------- Game flow ----------
function newGame(sc) {
  sc.state.ms = 0;
  sc.state.bananas = 0;
  sc.state.lives = 3;
  sc.hud.lives.forEach((l) => l.setAlpha(1));
  sc.startScreen.c.setVisible(false);
  sc.hud.c.setVisible(true);
  startLevel(sc, 0);
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
  Object.assign(st, { gx: 0, top: 470, end: 0, slow: 0, inv: 0, jumps: 0, coy: 0, px: 120, mud: 110, air: 0, quakeAt: st.t + 6000, quakeEnd: 0, dropAt: 0, speed: L.v[0] });
  // From level 1 on, one banana mid-level is a disguised carrot (extra life).
  st.carX = i ? L.len * (0.3 + Math.random() * 0.4) : 0;
  sc.mud.setVisible(false);
  if (i === 0) {
    buildBedroom(sc);
  } else {
    plat(sc, -200, 900, 470, L.tile);
    st.gx = 700;
  }
  sc.hud.name.setText(L.n);
  banner(sc, `NIVEL ${i}\n${L.n}`);
  // The aluvión only shows up (sliding in from off-screen left) with its warning.
  if (L.mud)
    sc.time.delayedCall(1900, () => {
      if (st.L !== L) return;
      banner(sc, '¡CUIDADO!\n¡VIENE EL ALUVIÓN!');
      st.mud = CAM_X + 80;
      sc.mud.setVisible(true);
    });
  sc.physics.resume();
  setPhase(sc, 'playing');
}

function setScenery(sc, L) {
  sc.bgs.forEach((b, j) => b.setTexture(L.bg[j] || 'none'));
  // Landmarks: bottom-aligned images spread evenly over the level, scrolling at parallax factor lf.
  sc.lms.clear(true, true);
  (L.lm || []).forEach((k, j) =>
    sc.lms.add(sc.add.image(700 + (j * L.len * L.lf) / L.lm.length, H, k).setOrigin(0.5, 1).setScrollFactor(L.lf, 0).setDepth(-9)),
  );
  sc.mov.forEach((q) => q.im.setVisible(!!L.cab));
}

// Backdrop parallax and the San Cristóbal movers, driven by the camera's scrollX.
function scrollScenery(sc, L, t) {
  sc.bgs.forEach((bg, j) => (bg.tilePositionX = sc.cameras.main.scrollX * (L.f[j] || 0)));
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

  if (L.mud && sc.mud.visible) {
    // The mud runs at 80% of the target speed: you outrun it unless you get slowed down or stuck.
    // st.mud = gap between the mud front (at ground height) and Canelita's back.
    // The cap eases down to 110 so the mud slides in on arrival.
    st.mud = Math.min(Math.max(110, st.mud - 300 * dt), st.mud + (pl.x - st.px) - tgt * 0.8 * dt);
    sc.mud.setTexture((t / 140) & 1 ? 'mud1' : 'mud0');
    sc.mud.setPosition(CAM_X - 21 - st.mud + Math.sin(t / 150) * 4, Math.sin(t / 230) * 5);
    if (st.mud <= 0) return die(sc, '¡TE ALCANZÓ\nEL ALUVIÓN!');
  }

  if (L.quake) {
    if (t > st.quakeAt) {
      st.quakeEnd = t + 3000;
      st.quakeAt = t + Phaser.Math.Between(7000, 11000);
      cam.shake(3000, 0.006);
      playSound(sc, 'quake');
      banner(sc, '¡TERREMOTO!');
    }
    if (t < st.quakeEnd && t > st.dropAt) {
      st.dropAt = t + 300;
      sc.debris.create(cam.scrollX + Phaser.Math.Between(300, 900), -20, 'gl').body.setVelocityX(-40);
    }
  }

  if (pl.y > H + 40) return die(sc, '¡TE CAÍSTE!');
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
    const gap = rnd(L.g[0], L.g[1]) * (st.tgt / 300);
    const w = rnd(L.w[0], L.w[1]);
    const top = Phaser.Math.Clamp(st.top + rnd(-90, 80), 330, 500);
    const x = st.gx + gap;
    for (let j = 1; j < 4; j++) ban(sc, st.gx + (gap * j) / 4, Math.min(st.top, top) - 70 - Math.sin((j / 4) * Math.PI) * 50);
    plat(sc, x, w, top, L.tile, L.quake && w < 400 && Math.random() < 0.4);
    if (w > 260 && Math.random() < 0.5) {
      const ox = x + w * (0.45 + Math.random() * 0.35);
      ob(sc, ox, top, L.ob);
      ban(sc, ox, top - 110);
    } else {
      for (let j = 0; j < Math.min(5, (w / 70) | 0); j++) ban(sc, x + 50 + j * 45, top - 40);
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
  const b = sc.bans.create(x, y, 'ban');
  if (sc.state.carX && x > sc.state.carX) (b.car = 1), (sc.state.carX = 0);
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
  if (b.car && st.lives < 3) {
    // Reveal the carrot and restore a life.
    sc.hud.lives[st.lives++].setAlpha(1);
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
  sc.hud.lives[--st.lives].setAlpha(0.25);
  if (!st.lives) return die(sc, '¡SIN VIDAS!');
  const n = Math.min(3, st.bananas);
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

function die(sc, msg) {
  if (sc.state.phase !== 'playing') return;
  setPhase(sc, 'dead');
  sc.physics.pause();
  playSound(sc, 'fall');
  banner(sc, msg);
  sc.time.delayedCall(1900, () => showNameEntry(sc, msg.replace('\n', ' ')));
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
  const left = Math.max(0, st.smashEnd - t);
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
  const y = Math.max(MOUTH_Y + (16 - k) * fnS, MOUTH_Y + 30);
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
      strokeThickness: Math.max(3, (size / 6) | 0),
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
  const lives = [0, 1, 2].map((i) => sc.add.image(26 + i * 26, 66, 'car'));
  c.add([icon, ban, name, clock, barBg, bar, ...lives]);
  sc.hud = { c, icon, ban, name, clock, bar, lives };
}

function refreshHud(sc, p) {
  sc.hud.ban.setText('x ' + sc.state.bananas);
  sc.hud.clock.setText(fmtTime(sc.state.ms));
  sc.hud.bar.setScale(p, 1);
}

// "2.3s", "1m 2.3s"
function fmtTime(ms) {
  const t = Math.floor(ms / 100), m = Math.floor(t / 600);
  return `${m ? m + 'm ' : ''}${Math.floor(t / 10) % 60}.${t % 10}s`;
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
  c.add([title, bun, sc.add.image(450, 300, 'ban').setScale(2), press, txt(sc, 400, 420, 'LEADERBOARD', 16, '#ffd83a'), list, txt(sc, 400, 580, 'SALTO: B2/ARRIBA  CAER: B5/ABAJO  RÁPIDO: B3/DER  LENTO: B1/IZQ', 13)]);
  sc.startScreen = { c, list };
}

function showStart(sc) {
  setPhase(sc, 'start');
  refreshLeaderboard(sc);
  // Attract mode: a random level's scenery (backdrops, landmarks, teleféricos) scrolls behind the menu, with no level in it.
  [sc.plats, sc.bans, sc.obs, sc.debris, sc.junk].forEach((g) => g.clear(true, true));
  sc.vis.setVisible(false);
  sc.cameras.main.scrollX = 0;
  setScenery(sc, (sc.startScreen.L = Phaser.Utils.Array.GetRandom(LEVELS)));
  sc.startScreen.c.setVisible(true);
}

function returnToStart(sc) {
  sc.endGame.container.setVisible(false);
  sc.hud.c.setVisible(false);
  sc.mud.setVisible(false);
  showStart(sc);
}

function createEndGameUi(scene) {
  const c = scene.add.container(0, 0).setDepth(35).setScrollFactor(0).setVisible(false);
  scene.endGame = { container: c };
  c.add(scene.add.rectangle(W / 2, H / 2, W, H, COLORS.backdrop, 0.97));
  scene.endGame.title = txt(scene, 400, 70, '', 30, '#ffd83a');
  scene.endGame.summary = txt(scene, 400, 130, '', 22);
  scene.endGame.nameValue = txt(scene, 400, 200, '', 36, '#f2a0b4');
  scene.endGame.leaderboard = txt(scene, 400, 250, '', 14).setOrigin(0.5, 0).setAlign('left');
  scene.endGame.saveStatus = txt(scene, 400, 580, '', 13, '#ffd83a');
  c.add([scene.endGame.title, scene.endGame.summary, txt(scene, 400, 168, 'TUS INICIALES', 13), scene.endGame.nameValue, scene.endGame.leaderboard, scene.endGame.saveStatus]);

  c.add(txt(scene, 400, 440, '▲▼ LETRA   ◀▶ MOVER   BOTÓN: OK', 14));
  c.add((scene.endGame.mad = scene.add.image(400, 340, 'p4').setScale(3).setVisible(false)));
}

function rejectName(sc) {
  const m = sc.endGame.mad, e = sc.state.nameEntry;
  playSound(sc, 'hit');
  sc.cameras.main.shake(250, 0.01);
  sc.tweens.killTweensOf(m);
  m.setVisible(true).setAngle(0);
  sc.tweens.add({ targets: m, angle: { from: -6, to: 6 }, duration: 60, yoyo: true, repeat: 6, completeDelay: 900, onComplete: () => m.setVisible(false) });
  sc.endGame.saveStatus.setText('¡ESE NOMBRE NO! ELIGE OTRO');
  Object.assign(e, { letters: ['A', 'A', 'A'], i: 0 });
  refreshNameEntry(sc);
}

function showNameEntry(sc, msg) {
  const st = sc.state;
  setPhase(sc, 'gameover');
  sc.endGame.container.setVisible(true);
  sc.endGame.title.setText(msg);
  sc.endGame.summary.setText(`PLÁTANOS ${st.bananas}   TIEMPO ${fmtTime(st.ms)}\nNIVEL: ${LEVELS[st.lv].n}`);
  sc.endGame.saveStatus.setText('');
  Object.assign(st.nameEntry, { letters: ['A', 'A', 'A'], i: 0, t: 0 });
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
    noise.getChannelData(0).forEach((_, i, a) => (a[i] = Math.random() * 2 - 1));
    const tracks = SONG.t.map(([w, v, n]) => ({ w, v, n: n.split(' ') }));
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

function freq(tok) {
  const m = /([A-G])(#?)(\d)/.exec(tok);
  if (!m) return 440;
  const midi = 12 * (+m[3] + 1) + 'CCDDEFFGGAAB'.indexOf(m[1]) + (m[2] ? 1 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
}

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
const F = (c, col, x, y, w, h) => {
  c.fillStyle = col;
  c.fillRect(x | 0, y | 0, Math.ceil(w), Math.ceil(h));
};
const mix = (a, b, t) => 'rgb(' + [16, 8, 0].map((s) => ((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t | 0) + ')';
const rand = (a, b) => a + Math.random() * (b - a);

function cv(sc, key, w, h, fn) {
  const t = sc.textures.createCanvas(key, w, h);
  fn(t.context);
  t.refresh();
}

// Pixel ellipse without anti-aliasing, for the chunky 16-bit look.
function el(c, col, cx, cy, rx, ry) {
  for (let y = -ry; y <= ry; y++) {
    const h = rx * Math.sqrt(1 - (y / ry) ** 2);
    F(c, col, cx - h, cy + y, h * 2, 1);
  }
}

function px(sc, key, rows, s = 3) {
  cv(sc, key, rows[0].length * s, rows.length * s, (c) =>
    rows.forEach((r, y) => [...r].forEach((ch, x) => PAL[ch] && F(c, PAL[ch], x * s, y * s, s, s))),
  );
}

function sky(c, a, b) {
  for (let y = 0; y < H; y += 10) F(c, mix(a, b, y / H), 0, y, W, 10);
}

function mtn(c, col, snow, base, amp, n) {
  const p = [];
  for (let i = 0; i < n; i++) p.push(base - Math.random() * amp);
  p.push(p[0]); // same height at both edges so the layer tiles seamlessly
  const line = base - amp * 0.55;
  for (let x = 0; x < W; x += 4) {
    const f = (x / W) * n;
    const i = f | 0;
    const y = p[i] + (p[i + 1] - p[i]) * (f - i);
    F(c, col, x, y, 4, H - y);
    if (snow && y < line) F(c, snow, x, y, 4, (line - y) * 0.6 + 4);
  }
}

function city(c, n, hmin, hmax, col, win) {
  for (let i = 0; i < n; i++) {
    const w = rand(30, 80);
    const h = rand(hmin, hmax);
    const x = rand(0, W - w);
    F(c, col, x, H - h, w, h);
    for (let wy = H - h + 6; wy < H - 6; wy += 10) for (let wx = x + 5; wx < x + w - 6; wx += 10) if (Math.random() < 0.5) F(c, win, wx, wy, 4, 5);
  }
}

// Finale portrait: half grid (16 cols, mirrored to 32), one cell = 2×2 art px; '.' is empty and every empty cell
// touching the silhouette becomes outline. Base frame has closed mouth and no pupils; texFinale stamps the rest.
const FACE = ['........zzz.....', '.......nrRzb....', '.......nrRzb....', '.......nrRzb....', '.......nrRzb....', '.......nrRzb....', '........nrRzb...', '........nrRzb...', '........nrRzb...', '........nrRzb...', '........nrRzb...', '........nssbbnnn', '........nssbbbnn', '.......nbbbbbbbb', '......nzzzbbbbbb', '......nbbbbbbbbb', '......nbbbbbbbbb', '......nbbbbbbbbb', '......nbbbbbbbbb', '.....nbRRRbbbbbb', '.....nbbbbbbbbnn', '.....nbbbbzzzppp', '.....nbbbzzzzzpm', '.....nbbzzzzmzzm', '.....nbzzzzzzmmm', '......nbzzzzzzzz', '.......nbzzzzzzz', '........sbzzzzzz', '........ssssssss', '.......nbbbbbbbb', '......nbbbbbbbbb', '.....nbsbbbbzzzz', '.....nbbsbbbzzzz', '.....nbbsbbzzzzz', '.....nbbbsbzzzzz', '....nbbbbsbzzzzz', '....nbbbbsbzzzzz', '....nbbbbsbzzzzz', '....nbbbbbbzzzzz', '....nbbbbbbzzzzz', '....nbbbbbbzzzzz', '....nbbbbbbzzzzz', '....nbbbbbbzzzzz'];
const FP = { k: '#2a1608', s: '#704424', b: '#8a5630', n: '#c98a58', z: '#ead2a8', r: '#e8a0a0', R: '#a85a4a', p: '#f2a0b4', e: '#111111', w: '#ffffff', m: '#3a1608', t: '#fffaf0' };

// Draws a mirrored ('.' empty) or full cell grid at 2px per cell, outlining the silhouette.
function cells(sc, key, rows, mirror) {
  const g = rows.map((r) => (mirror ? [...r, ...[...r].reverse()] : [...r]));
  cv(sc, key, g[0].length * 2, g.length * 2, (c) =>
    g.forEach((r, y) => r.forEach((ch, x) => {
      const o = ch == '.' && mirror && [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => (g[y + dy] || [])[x + dx] > '.');
      if (FP[ch] || o) F(c, FP[o ? 'k' : ch], x * 2, y * 2, 2, 2);
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
      F(c, '#2a1608', x, 0, 12, 230);
      for (let y = 2; y < 230; y += 8) F(c, (y / 8) & 1 ? '#ffd83a' : '#8a5630', x + 2, y, 8, 8);
    });
    F(c, '#2a1608', 0, 50, 220, 44);
    for (let i = 0; i < 21; i++) for (let j = 0; j < 4; j++) F(c, (i + j) & 1 ? '#111111' : '#ffffff', 5 + i * 10, 52 + j * 10, 10, 10);
    F(c, '#2a1608', 28, 56, 164, 32);
    F(c, '#ffd83a', 31, 59, 158, 26);
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
    F(c, '#2a1608', 10, 180, 220, 40);
    F(c, '#8a5630', 13, 183, 214, 34);
    F(c, '#5a3418', 13, 199, 214, 3);
    for (let x = 46; x < 220; x += 36) F(c, '#5a3418', x, 183, 3, 34);
  });
  // Aluvión: a slanted wedge of mud, tall at the back, its toe sliding along the ground.
  // Two frames with shifted waves animate the surface; the same tumbling rocks/branches sit in both.
  const top = (x, ph) => (x > 560 ? 470 + (x - 560) * 3.2 : Math.max(60, 470 - (560 - x) * 2 + Math.sin(x / 23 + ph * 2) * 8));
  const junk = [];
  for (let i = 0; i < 50; i++) {
    const x = rand(0, 540);
    junk.push([x, rand(top(x, 0) + 20, H), i % 3 ? '#4a2e16' : '#7a7a70', rand(4, 12)]);
  }
  [0, 1].forEach((ph) =>
    cv(sc, 'mud' + ph, 600, H, (c) => {
      for (let x = 0; x < 600; x += 2) {
        const y = top(x, ph);
        F(c, '#6b4423', x, y, 2, H - y);
        F(c, '#8a5a30', x, y, 2, 12);
        F(c, '#d8c0a0', x, y, 2, 3);
      }
      junk.forEach(([x, y, col, w]) => F(c, col, x, y, w, 4));
    }),
  );

  // Dormitorio: two wall screens (window + bookshelf each), a different poster on each; 2W wide so the tileSprite alternates them.
  cv(sc, 'b0a', W * 2, H, (c) => {
    F(c, '#f3d6c6', 0, 0, W * 2, H);
    for (let x = 0; x < W * 2; x += 40) F(c, '#ecc6b4', x, 0, 16, H);
    [0, W].forEach((o) => {
      F(c, '#ffffff', o + 90, 120, 180, 150);
      F(c, '#9fd8ff', o + 100, 130, 160, 130);
      F(c, '#ffffff', o + 176, 130, 8, 130);
      F(c, '#ffffff', o + 100, 192, 160, 6);
      F(c, '#7a4a28', o + 620, 270, 150, 8);
      for (let i = 0; i < 7; i++) F(c, ['#e86a8a', '#6aa8e8', '#7fcf8a', '#f2c14e'][i % 4], o + 630 + i * 18, 232 + (i % 3) * 4, 14, 38 - (i % 3) * 4);
    });
    F(c, '#c9a07a', 0, 488, W * 2, 12);
    // Screen 1: Platanus logo poster, cream bananas on yellow. Bananas drawn in the logo's 512px space, centered on 264,246.
    const s = 0.18;
    F(c, '#f9bd16', 480, 110, 100, 130);
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
    const Y = '#f2ff00', P = W + 450, box = (x, y, w, h) => (F(c, Y, x, y, w, 2), F(c, Y, x, y + h - 2, w, 2), F(c, Y, x, y, 2, h), F(c, Y, x + w - 2, y, 2, h));
    F(c, '#1c1c1c', P, 100, 140, 150);
    c.fillStyle = Y;
    c.font = '8px monospace';
    c.fillText('PLATANUS HACK [26]', P + 10, 118);
    c.font = 'bold 17px monospace';
    c.fillText('TEAM.READY?', P + 9, 140);
    [P + 10, P + 77].forEach((x, i) => {
      box(x, 154, 53, 80);
      F(c, Y, x + 7, 162, i ? 36 : 40, 4);
      for (let j = 0; j < 3 - i; j++) F(c, Y, x + 7, 174 + j * 8, 38 - j * 7, 2);
    });
  });
  texBunny(sc);
  texTiles(sc);
  texSanCristobal(sc);
  texCostanera(sc);
  texFinale(sc);
}

function texBunny(sc) {
  const bunPaint = (g, [x, y, rx, ry, col], grow) => {
    const r = rx > 2 ? 0.5 : 0; // round off big lobes so they don't get 1px nubs at their widest row
    const a = rx + grow + r, b = ry + grow + r;
    for (let j = -Math.floor(b); j <= b; j++)
      for (let i = -Math.floor(a); i <= a; i++)
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
    F(c, '#a0703c', 0, 0, T, H);
    for (let y = 0, r = 0; y < H; y += 24, r++) {
      F(c, '#7a4c24', 0, y, T, 2);
      F(c, '#b88250', 0, y + 2, T, 1);
      for (let x = (r * 41) % 64; x < T - 2; x += 64) F(c, '#7a4c24', x, y + 3, 2, 21);
    }
    for (let i = 0; i < 16; i++) F(c, '#8e5c2e', rand(0, T - 18), rand(4, H), rand(6, 16), 1);
    F(c, '#d4a468', 0, 0, T, 2);
    F(c, '#c08a50', 0, 2, T, 2);
  });
  // Bed: patchwork quilt in folds, white sheet with a scalloped edge, wood frame below.
  cv(sc, 'tb', T, H, (c) => {
    const k = ['#e86a8a', '#6aa8e8', '#f2c14e', '#7fcf8a', '#b07ae8'];
    F(c, '#7a4a28', 0, 0, T, H);
    for (let j = 0; j < 6; j++) for (let i = 0; i < 4; i++) {
      const x = i * 32 + 1, y = 12 + j * 21;
      F(c, k[(i * 3 + j) % 5], x, y, 30, 19);
      F(c, 'rgba(255,255,255,.3)', x, y, 30, 1);
      F(c, 'rgba(0,0,0,.2)', x, y + 18, 30, 1);
    }
    F(c, 'rgba(0,0,0,.16)', 40, 12, 3, 128);
    F(c, 'rgba(0,0,0,.16)', 104, 12, 3, 128);
    for (let x = 0; x < T; x += 16) el(c, '#c4c4d4', x + 8, 8, 8, 4);
    for (let x = 0; x < T; x += 16) el(c, '#f6f6fa', x + 8, 7, 8, 3);
    F(c, '#f6f6fa', 0, 0, T, 7);
    F(c, '#7a4a28', 0, 134, T, H - 134);
    F(c, '#a06a40', 0, 134, T, 2);
    for (let y = 146; y < H; y += 14) F(c, '#5e3a1c', 0, y, T, 1);
  });
  // Closet: wood cabinet with recessed door panels, knobs and a dark top lip.
  cv(sc, 'tc', T, H, (c) => {
    F(c, '#8a5a30', 0, 0, T, H);
    for (let y = 14; y < H; y += 150) for (const x of [8, 72]) {
      F(c, '#5a3418', x, y, 48, 136);
      F(c, '#9c6a3c', x + 3, y + 3, 42, 130);
      F(c, '#b07a48', x + 3, y + 3, 42, 2);
      F(c, '#7a4c24', x + 3, y + 131, 42, 2);
      F(c, '#ffd86a', x + 36, y + 66, 3, 6);
    }
    F(c, '#c4905a', 0, 0, T, 6);
    F(c, '#e0b07a', 0, 0, T, 2);
    F(c, '#5a3418', 0, 6, T, 2);
  });
  // Cerro: sunny grass with tufts and flowers over earth with strata, stones and roots.
  cv(sc, 'tg', T, H, (c) => {
    F(c, '#8a5a32', 0, 0, T, H);
    for (let y = 34; y < H; y += 30) F(c, '#6e4626', 0, y, T, 2);
    for (let i = 0; i < 14; i++) el(c, Math.random() < 0.5 ? '#9a9490' : '#7a726e', rand(6, 122), rand(40, H - 8), 3, 2);
    for (let i = 0; i < 8; i++) F(c, '#5a3a1e', rand(0, T - 2) | 0, 12, 1, rand(8, 20) | 0);
    F(c, '#4f9a34', 0, 0, T, 12);
    F(c, '#3e7a2a', 0, 12, T, 1);
    F(c, '#6cc04a', 0, 1, T, 3);
    F(c, '#9ce46a', 0, 0, T, 1);
    for (let x = 0; x < T; x += 3) F(c, '#9ce46a', x, Math.random() * 3 | 0, 1, 2);
    for (let x = 0; x < T; x += 5) F(c, '#3e8a2c', x + 2, 6 + (Math.random() * 4 | 0), 1, 2);
    for (let i = 0; i < 6; i++) F(c, ['#ffffff', '#ffd86a', '#ff7aa0'][i % 3], rand(4, 120) | 0, 2 + (Math.random() * 2 | 0), 2, 2);
  });
  // Costanera: concrete parapet and ledge, dusk facade with pilasters and lit/dark windows.
  cv(sc, 'tr', T, H, (c) => {
    F(c, '#3e3e52', 0, 0, T, H);
    for (let x = 28; x < T; x += 32) F(c, '#4e4e64', x, 11, 8, H);
    for (let y = 44; y < H; y += 44) for (const x of [8, 40, 72, 104]) {
      const wy = y - 30, lit = Math.random() < 0.45;
      F(c, '#2a2a38', x - 1, wy - 1, 18, 20);
      F(c, lit ? '#ffd86a' : '#26263a', x, wy, 16, 18);
      if (lit) F(c, '#fff2b8', x, wy, 16, 2);
      else F(c, '#3a3a54', x, wy + 12, 16, 1);
      F(c, '#8a8aa0', x - 2, wy + 18, 20, 2);
    }
    for (let y = 34; y < H; y += 44) {
      F(c, '#5e5e72', 0, y, T, 2);
      F(c, '#2e2e40', 0, y + 2, T, 2);
    }
    F(c, '#e4e4ec', 0, 0, T, 2);
    F(c, '#b4b4c2', 0, 2, T, 5);
    F(c, '#7a7a8c', 0, 7, T, 2);
    F(c, '#5a5a6c', 0, 9, T, 2);
  });
}

// ===== Cerro San Cristóbal: b1a far (tiles), b1b near filler (tiles), sc1* landmarks (each shown once) =====
// Tree at trunk base (x,y), size s. k: 0 round broadleaf (peumo/quillay), 1 araucaria, 2 cypress, 3 palma chilena.
function tree(c, x, y, s, k) {
  const g = ['#1c4a26', '#2f7a3a', '#4f9a48', '#8ccc5a'], d = (n, a, b) => { for (let i = 0; i < n; i++) F(c, g[3], x + rand(a, b) * s, y - rand(a + 1.6, b + 1.9) * s, 2, 2); };
  if (k === 1) {
    // Araucaria araucana (30-40 m): tall plated trunk, a few sparse whorls, then a dense dome of rope-like branches with upturned tips.
    s *= 2;
    const cb = y - s * 4, ch = s * 0.8, R = s * 0.9, tw = s * 0.07,
      br = (by, hw) => { for (const e of [-1, 1]) for (let t = 0; t <= 1; t += 1 / hw) { const yy = by + Math.sin(Math.PI * t) * s * 0.05 - t ** 4 * s * 0.16; F(c, g[0], x + e * t * hw - 1, yy, 3, 3); F(c, g[2], x + e * t * hw, yy, 1, 1); } };
    F(c, '#5e5044', x - tw, cb - ch * 0.5, tw * 2, y - cb + ch * 0.5);
    for (let j = 0; j < y - cb; j += 4) F(c, '#857462', x - tw + ((j / 4) % 2) * tw, y - j, tw, 2);
    F(c, '#5e5044', x - tw * 1.6, y - 3, tw * 3.2, 3);
    br(cb + s * 0.55, s * 0.3);
    br(cb + s * 0.95, s * 0.2);
    for (let j = 0; j < ch; j++) { const w = R * 0.8 * Math.sqrt(1 - (j / ch) ** 2); F(c, g[0], x - w, cb - j, w * 2, 1); }
    for (let i = 0; i < 7; i++) br(cb - (i * ch) / 7, R * Math.sqrt(1 - (i / 7.3) ** 2));
    for (let i = 0; i < 14; i++) { const t = rand(-0.9, 0.9); F(c, g[1 + (i % 3)], x + t * R * 0.75, cb - ch * Math.sqrt(1 - t * t) * rand(0.3, 0.95), 2, 1); }
  } else if (k === 2) {
    F(c, '#4a3020', x - 2, y - 6, 4, 6);
    el(c, g[0], x, y - s * 1.6, s * 0.34, s * 1.55);
    el(c, g[1], x - s * 0.08, y - s * 1.7, s * 0.2, s * 1.3);
    d(4, -0.2, 0);
  } else if (k === 3) {
    const top = y - s * 2.2;
    for (let j = 0; j < s * 2.2; j++) {
      const w = s * (0.22 + 0.05 * Math.sin(j / s * 1.4));
      F(c, j % 5 ? '#8a7a68' : '#5e5244', x - w, y - j, w * 2, 1);
      F(c, '#6e6050', x + w * 0.3, y - j, w * 0.7, 1);
    }
    // Fronds: arcs out from the crown, drooping under their own weight.
    for (let a = 0; a < 9; a++) {
      const t = Math.PI * (1.08 + a * 0.105);
      for (let j = 0; j < s * 1.2; j += 1.5) F(c, g[a % 3], x + Math.cos(t) * j, top + Math.sin(t) * j + j * j / (s * 1.6), 3, 2);
    }
    el(c, '#5e5244', x, top + 2, s * 0.24, s * 0.14);
  } else {
    F(c, '#5a3a22', x - s * 0.12, y - s * 1.2, s * 0.24, s * 1.2);
    F(c, '#3e2814', x + s * 0.04, y - s * 1.2, s * 0.08, s * 1.2);
    el(c, g[0], x, y - s * 1.5, s * 0.9, s * 0.7);
    el(c, g[0], x - s * 0.6, y - s * 1.2, s * 0.5, s * 0.4);
    el(c, g[0], x + s * 0.6, y - s * 1.2, s * 0.5, s * 0.4);
    el(c, g[1], x - s * 0.15, y - s * 1.62, s * 0.66, s * 0.5);
    el(c, g[2], x - s * 0.32, y - s * 1.8, s * 0.36, s * 0.26);
    d(6, -0.6, 0.2);
  }
}

// Teleférico cable height at tile x (period W/3, pylons at W/6 + k*W/3), o = offset of the lower cable.
const CAB = (x, o) => {
  const u = ((x + W / 6) % (W / 3)) / (W / 3);
  return 244 + o + 64 * u * (1 - u);
};
// Bike trail height at tile x (period W/4), just below the back hill's lowest crest.
const TR = (x) => 418 + 4 * Math.sin((x * Math.PI * 8) / W);

// 1px line from (a, b) to (x, y).
function ln(c, col, a, b, x, y) {
  for (let i = 0, n = Math.max(Math.abs(x - a), Math.abs(y - b)); i <= n; i++) F(c, col, a + ((x - a) * i) / n, b + ((y - b) * i) / n, 1, 1);
}

function texSanCristobal(sc) {
  // Far layer: sky, Andes, smog (tiles).
  cv(sc, 'b1a', W, H, (c) => {
    sky(c, 0x6ab8f0, 0xe0f4ff);
    mtn(c, '#8a8fb0', '#ffffff', 300, 160, 7);
    mtn(c, '#6a7090', 0, 380, 90, 9);
    F(c, 'rgba(190,150,110,.25)', 0, 380, W, 140);
  });
  // Near filler: green hillside, back trees, a few front trees, teleférico cables (tiles, no unique landmarks).
  cv(sc, 'b1b', W, H, (c) => {
    // Trees stand below each hill's lowest crest (base) so none float in the sky.
    mtn(c, '#6aa048', 0, 400, 80, 8);
    // Dirt bike trail winding along the hillside.
    for (let x = 0; x < W; x++) {
      F(c, '#c8a06a', x, TR(x) - 2, 1, 4);
      F(c, '#8a6a40', x, TR(x) + 2, 1, 1);
    }
    for (let i = 0; i < 18; i++) tree(c, rand(50, W - 50), rand(402, 414), rand(9, 13), [0, 0, 1, 2][i % 4]);
    mtn(c, '#4f8a3a', 0, 456, 30, 12);
    for (let i = 0; i < 8; i++) tree(c, rand(50, W - 50), rand(458, 466), rand(13, 16), [0, 3, 1, 0][i % 4]);
    // Teleférico in front, tiling the whole stage: a lattice pylon every third of the tile and two shallow cables
    // (upper one goes forward, lower one back). The cabins are moving sprites, see cabs in play().
    for (const x of [W / 6, W / 2, W * 5 / 6]) {
      for (let y = 0; y < 230; y++) {
        const w = 3 + y * 0.07, p = (y % 16) / 16;
        F(c, '#4a4a58', x - w, 244 + y, 2, 1);
        F(c, '#4a4a58', x + w - 1, 244 + y, 2, 1);
        F(c, '#8a8a98', x - w + 2 * w * p, 244 + y, 1, 1);
        F(c, '#8a8a98', x + w - 2 * w * p, 244 + y, 1, 1);
      }
      for (const o of [0, 12]) {
        F(c, '#4a4a58', x - 14, 242 + o, 28, 4);
        F(c, '#c8c8d0', x - 12, 240 + o, 4, 2);
        F(c, '#c8c8d0', x + 8, 240 + o, 4, 2);
      }
    }
    for (let x = 0; x < W; x++) for (const o of [0, 12]) F(c, '#2a2a2a', x, CAB(x, o), 1, 2);
  });
  // Bikes: bk0/bk1 and bk2/bk3 are the 2 pedaling frames of a yellow and a blue rider, facing right, wheels on y=17.
  [['#f0c020', '#c02a2a'], ['#2a8ae8', '#202020']].forEach(([j, h], i) =>
    [0, 1].forEach((fr) =>
      cv(sc, 'bk' + (i * 2 + fr), 18, 18, (c) => {
        for (const x of [4, 13]) {
          el(c, '#202020', x, 14, 3, 3);
          c.clearRect(x - 1, 13, 3, 3);
          F(c, '#a0a0a0', x, 14, 1, 1);
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
        for (let y = 0; y < 4; y++) F(c, j, 7 + y, 8 - y, 2, 1);
        ln(c, j, 10, 5, 13, 8);
        F(c, '#e8b890', 11, 3, 2, 2);
        F(c, h, 10, 1, 4, 2);
      }),
    ),
  );
  // Cabins: blue/red/green, hung from (11, 1) so that point sits on the cable.
  [['#2a6ae8', '#1a3e98'], ['#e8462a', '#a02a1a'], ['#3aa84a', '#1f7030']].forEach(([b, s], i) =>
    cv(sc, 'cab' + i, 22, 34, (c) => {
      const x = 11, y = 1;
      F(c, '#c8c8d0', x - 3, y - 1, 6, 3);
      F(c, '#3a3a3a', x, y + 2, 1, 10);
      F(c, '#3a3a3a', x - 6, y + 11, 13, 1);
      F(c, s, x - 9, y + 12, 18, 3);
      F(c, b, x - 10, y + 15, 20, 16);
      F(c, '#d8ecff', x - 8, y + 17, 16, 7);
      F(c, '#ffffff', x - 8, y + 17, 3, 3);
      F(c, s, x - 1, y + 17, 2, 7);
      F(c, s, x + 6, y + 15, 4, 16);
      F(c, s, x - 10, y + 29, 20, 2);
    }),
  );
  // Landmarks (each shown once; bottom-aligned at y=600, visible above y≈330).
  // 1. Virgen de la Inmaculada Concepción (after photos): head tilted up, ring of 12 stars, right arm out with open palm,
  // left forearm raised, long mantle draping from both arms, standing on a dome over a round pedestal and the sanctuary.
  cv(sc, 'sc1v', 260, H, (c) => {
    const w0 = '#ffffff', w1 = '#dfe3ee', w2 = '#b0b8ca', gd = '#ffd83a';
    for (let y = 300; y < H; y++) F(c, '#5f8f3a', 90 - (y - 300) * 0.6, y, 80 + (y - 300) * 1.2, 1);
    tree(c, 36, 470, 7, 1);
    tree(c, 76, 396, 16, 3);
    tree(c, 188, 396, 12, 2);
    tree(c, 226, 446, 16, 0);
    // Sanctuary terrace with arches.
    F(c, '#e8e4da', 70, 278, 120, 30);
    F(c, '#c8c2b4', 70, 302, 120, 6);
    F(c, '#f6f2e8', 66, 274, 128, 4);
    for (let x = 78; x < 184; x += 14) {
      F(c, '#8a847a', x, 286, 7, 12);
      el(c, '#8a847a', x + 3, 286, 3, 3);
    }
    // Stone pedestal, round drum with a lip, and the dome she stands on.
    F(c, '#bcb4a4', 110, 240, 40, 34);
    F(c, '#a49c8c', 140, 240, 10, 34);
    F(c, '#d8d0c0', 106, 236, 48, 4);
    el(c, w0, 130, 222, 15, 8);
    F(c, w1, 136, 216, 8, 6);
    F(c, w1, 114, 222, 32, 14);
    F(c, w2, 138, 222, 8, 14);
    F(c, w0, 111, 220, 38, 3);
    // Mantle behind the body, wider and deeper-shaded on her left.
    for (let y = 126; y < 206; y++) {
      const l = 12 + (y - 126) * 0.08, r = 13 + (y - 126) * 0.14;
      F(c, w1, 130 - l, y, l + r, 1);
      F(c, w2, 130 + r - 5, y, 5, 1);
    }
    // Robe: high belt, long vertical folds, hem and feet on the dome.
    for (let y = 140; y < 214; y++) {
      const r = 9 + (y - 140) * 0.07;
      F(c, w0, 130 - r, y, r * 2, 1);
      F(c, w1, 130 + r * 0.35, y, r * 0.65, 1);
      for (const f of [-0.45, 0.05, 0.62]) F(c, f > 0.5 ? w2 : w1, 130 + r * f, y, 1, 1);
    }
    F(c, w2, 116, 212, 28, 2);
    el(c, w1, 127, 214, 4, 2);
    F(c, w0, 121, 126, 18, 15);
    F(c, w1, 132, 126, 7, 15);
    F(c, w2, 121, 140, 18, 2);
    // Her right arm reaching out and down, mantle hanging from it; open palm.
    for (let i = 0; i < 22; i++) {
      F(c, w1, 118 - i, 131 + i * 0.4, 2, 30 - i * 1.3);
      F(c, w0, 118 - i, 127 + i * 0.4, 4, 5);
    }
    F(c, w2, 98, 137, 2, 3);
    el(c, w0, 94, 137, 3, 2);
    F(c, w0, 89, 137, 4, 1);
    // Her left arm: upper arm down the side, forearm raised forward, long drape falling from the elbow.
    F(c, w1, 139, 127, 6, 18);
    for (let i = 0; i < 11; i++) F(c, i > 8 ? w2 : w1, 140 + i, 148 - i * 0.6, 1, 54 - i * 3);
    for (let i = 0; i < 12; i++) F(c, w0, 143 + i, 143 - i, 4, 4);
    el(c, w0, 158, 131, 3, 3);
    // Veil and head tilted up toward the sky.
    el(c, w1, 131, 117, 8, 10);
    F(c, w0, 127, 118, 6, 8);
    el(c, w0, 129, 111, 6, 7);
    F(c, w1, 131, 106, 3, 10);
    F(c, w2, 126, 108, 2, 1);
    // Ring of 12 stars around the head, slightly behind and to her left.
    for (let a = 0; a < 48; a++) F(c, '#c9a640', 133 + Math.cos(a / 7.64) * 15, 106 + Math.sin(a / 7.64) * 15, 1, 1);
    for (let a = 0; a < 12; a++) {
      const sx = 133 + Math.cos(a * 0.5236) * 15, sy = 106 + Math.sin(a * 0.5236) * 15;
      F(c, gd, sx - 1, sy, 3, 1);
      F(c, gd, sx, sy - 1, 1, 3);
    }
  });
  // 3. Santiago skyline with Torre Entel and smog haze.
  cv(sc, 'sc1s', 400, H, (c) => {
    for (let i = 0; i < 9; i++) {
      const h = 90 + ((i * 53) % 110), x = i * 46 - 4;
      F(c, ['#9aa8b8', '#b8c4d0', '#8a98aa'][i % 3], x, 330 - h, 42, h + H - 330);
      for (let wy = 330 - h + 8; wy < 322; wy += 12) {
        F(c, '#dfe9f5', x + 6, wy, 8, 5);
        F(c, '#dfe9f5', x + 24, wy, 8, 5);
      }
    }
    F(c, '#eef2f6', 186, 120, 28, H - 120);
    el(c, '#eef2f6', 200, 120, 16, 8);
    F(c, '#444444', 199, 60, 2, 60);
    F(c, '#dfe6ee', 178, 290, 44, H - 290);
    for (let wy = 136; wy < 290; wy += 14) F(c, '#7fa8d0', 188, wy, 24, 2);
    F(c, 'rgba(230,210,180,.45)', 0, 190, 400, 140);
  });
  // 4. Low sprawl near the end, choking under a thick brown smog layer that thickens toward the ground.
  cv(sc, 'sc1c', 480, H, (c) => {
    for (let i = 0; i < 26; i++) {
      const w = rand(22, 46), h = rand(30, 120), x = rand(0, 480 - w);
      F(c, ['#8a8478', '#a09888', '#7a7468'][i % 3], x, 360 - h, w, h + H - 360);
      for (let wy = 366 - h; wy < 352; wy += 9) for (let wx = x + 4; wx < x + w - 5; wx += 8) F(c, '#c8bca0', wx, wy, 3, 4);
    }
    for (let y = 200; y < 380; y += 4) F(c, `rgba(170,130,90,${((y - 200) / 180) * 0.6})`, 0, y, 480, 4);
  });
}

function texCostanera(sc) {
  // Dusk sky, sun and Andes on the far layer; generic Providencia on the near layer.
  cv(sc, 'b2a', W, H, (c) => {
    sky(c, 0x3a2a6a, 0xff9a5a);
    el(c, '#ffd27a', 600, 330, 40, 40);
    mtn(c, '#4a3a6a', '#e8d8f0', 330, 170, 6);
    mtn(c, '#3a2c55', 0, 400, 70, 8);
  });
  cv(sc, 'b2b', W, H, (c) => cc2city(c, 22, 80, 220, '#2a2440', '#ffd86a'));
  // Landmarks, in level order.
  cv(sc, 'cco0', 200, H, cc2gran);
  cv(sc, 'cco1', 180, H, cc2tit);
  cv(sc, 'cco2', 260, H, cc2mut);
  cv(sc, 'cco3', 150, H, cc2tel);
  cv(sc, 'cco4', 200, H, cc2cons);
  cv(sc, 'cco5', 220, H, cc2wtc);
}

// ===== Finale portrait: p0-p3 front-facing face+body, bn peeled banana, paw =====
function texFinale(sc) {
  // p0/p1: mouth closed/open; p2/p3: the same with happy closed eyes.
  for (let i = 0; i < 4; i++) {
    const g = FACE.map((r) => [...r]);
    const st = (x, y, rows) => rows.forEach((r, j) => [...r].forEach((ch, k) => ch != ' ' && (g[y + j][x + k] = ch)));
    st(7, 15, i > 1 ? ['    ', ' kk ', 'k  k'] : ['zwez', 'zeez', 'zeez', ' ee ']);
    if (i & 1) st(12, 23, ['mmtt', 'mmRR']); // open mouth with buck teeth; the banana tip enters below
    cells(sc, 'p' + i, g.map((r) => r.join('')), 1);
  }
  // p4: angry front face, brows slanting down to the centre and a frown.
  const g = FACE.map((r) => [...r]);
  const st = (x, y, rows) => rows.forEach((r, j) => [...r].forEach((ch, k) => ch != ' ' && (g[y + j][x + k] = ch)));
  st(7, 15, ['zwez', 'zeez', 'zeez', ' ee ']);
  st(6, 13, ['kk', ' kkk', '   kkk']);
  st(11, 22, ['zzzzm', 'zzmmm', 'zmzzz']);
  cells(sc, 'p4', g.map((r) => r.join('')), 1);
  cells(sc, 'paw', ['.kkkk.', 'kbnnbk', 'kbbbbk', 'kbsbsk', '.kkkk.']);
  cv(sc, 'bn', 16, 32, (c) => {
    // Thick cream fruit with soft ridges; bites crop it flat from the top.
    F(c, '#d8c890', 4, 0, 8, 18);
    F(c, '#f7efc8', 5, 0, 6, 18);
    F(c, '#fffbe6', 6, 0, 2, 16);
    F(c, '#e8dca8', 9, 0, 1, 16);
    // Three pale yellow peel flaps hang outward, browning at the tips.
    for (let y = 14; y < 31; y++) {
      const l = Math.round(((y - 14) / 17) ** 1.5 * 2);
      const t = y > 27 ? '#a07a30' : '#f2dc6a';
      F(c, '#c9a840', 2 - l, y, 4, 1);
      F(c, t, 3 - l, y, 2, 1);
      F(c, '#c9a840', 10 + l, y, 4, 1);
      F(c, t, 11 + l, y, 2, 1);
      F(c, '#e8c850', 6, y, 4, 1);
      F(c, '#fff0a0', 7, y, 2, 1);
    }
    F(c, '#6a4a10', 6, 30, 4, 2);
  });
}

// ===== Costanera Center: b2a far (tiles), b2b near filler (tiles), cco* landmarks (each shown once) =====
function cc2glass(c, x, y, w, h, base, hi) {
  F(c, base, x, y, w, h);
  for (let i = 0; i < w; i += 24) F(c, hi, x + i + 4, y, 5, h);
  for (let j = y + 10; j < y + h - 6; j += 10) F(c, '#1a2238', x, j, w, 1);
  for (let i = 8; i < w; i += 8) F(c, '#1a2238', x + i, y, 1, h);
  for (let j = y + 12; j < y + h - 6; j += 10) for (let i = 2; i < w - 4; i += 8) if (Math.random() < 0.12) F(c, '#ffd86a', x + i, j, 5, 5);
}

function cc2gran(c) {
  // Gran Torre Santiago: tapered glass obelisk split by a centre recess, open lattice crown, Torre 2 and mall podium.
  cc2glass(c, 0, 300, 62, 300, '#34507a', '#6f8fb4');
  cc2glass(c, 138, 380, 62, 220, '#34507a', '#6f8fb4');
  for (let y = 40; y < 480; y++) {
    const hw = 22 + (y - 40) * 0.025, t = Math.min(1, Math.max(0, (y - 96) / 300)), l = 100 - hw;
    if (y < 96) {
      // Crown: glass skin runs past the roof as a steel grid, rising to points at the four corners.
      for (let d = 2; d <= hw; d++)
        if (y >= 70 - d * 0.6 && (d < 3 || d > hw - 1 || y % 6 < 1 || d % 5 < 1 || y < 71 - d * 0.6)) F(c, '#b8cce0', 100 - d, y, 1, 1), F(c, '#8aa0bc', 99 + d, y, 1, 1);
      continue;
    }
    F(c, mix(0xe8a898, 0x5a7ea8, t), l, y, hw - 2, 1);
    F(c, mix(0x9a6a8a, 0x2c4670, t), 102, y, hw - 2, 1);
    F(c, '#141c30', 98, y, 4, 1);
    F(c, '#dce8f4', l, y, 2, 1);
    F(c, '#1e2a48', 98 + hw, y, 2, 1);
    F(c, 'rgba(255,240,220,.35)', l + hw * 0.4, y, 3, 1);
    for (let i = 7; i < hw - 2; i += 5) F(c, 'rgba(20,30,60,.3)', l + i, y, 1, 1), F(c, 'rgba(20,30,60,.3)', 100 + i, y, 1, 1);
    if (y % 6 < 1) F(c, 'rgba(20,30,60,.45)', l, y, hw * 2, 1);
  }
  for (let y = 98; y < 470; y += 6) if (Math.random() < 0.4) F(c, '#ffd86a', 100 + (Math.random() < 0.5 ? -1 : 1) * rand(5, 20), y + 1, 3, 3);
  F(c, '#dce8f4', 76, 96, 48, 2);
  F(c, '#ff4a4a', 77, 55, 2, 2);
  F(c, '#ff4a4a', 121, 55, 2, 2);
  // Costanera mall podium.
  F(c, '#3a3450', 10, 470, 180, 130);
  F(c, '#c8d8e8', 10, 470, 180, 2);
  for (let y = 480; y < H; y += 22) F(c, '#7fa8c8', 14, y, 172, 8);
  for (let x = 14; x < 186; x += 12) F(c, '#3a3450', x, 470, 2, 130);
}

function cc2tit(c) {
  for (let x = 10; x < 170; x++) {
    const t = 130 + (x - 10) * 0.35;
    F(c, x % 16 < 2 ? '#8ad8cc' : '#2f8a80', x, t, 1, H - t);
  }
  for (let y = 130; y < H; y += 12) {
    const e = Math.min(170, 10 + (y - 130) / 0.35);
    if (e > 10) F(c, '#1d4f50', 10, y, e - 10, 2);
  }
}

function cc2mut(c) {
  // MUT: glass office tower over a stepped podium of timber-clad market floors with planted terraces and a wooden skybridge.
  F(c, '#3e5a74', 85, 70, 90, H - 70);
  for (let x = 85; x < 175; x += 7) F(c, '#9cc0d8', x, 70, 2, H - 70);
  for (let y = 79; y < H; y += 9) F(c, '#25384e', 85, y, 90, 1);
  for (let y = 82; y < 300; y += 9) for (let x = 88; x < 170; x += 7) if (Math.random() < 0.1) F(c, '#ffd86a', x, y, 5, 5);
  F(c, '#c8d8e8', 83, 66, 94, 4);
  for (let i = 0; i < 5; i++) {
    const t = 300 + i * 40, l = 60 - i * 12, w = 260 - 2 * l;
    F(c, '#a8743e', l, t, w, H - t);
    for (let x = l; x < l + w; x += 4) F(c, '#7a4e24', x, t, 1, H - t);
    F(c, '#ffd8a0', l + 4, t + 16, w - 8, 14);
    for (let x = l + 4; x < l + w - 4; x += 16) F(c, '#5a3a1c', x, t + 16, 2, 14);
    F(c, '#3e7a2c', l, t - 3, w, 5);
    for (let x = l; x < l + w; x += 3) F(c, Math.random() < 0.5 ? '#4f9a34' : '#6cc04a', x, t - 5, 3, 3 + rand(0, Math.random() < 0.3 ? 12 : 4));
    [l + 6, l + w - 6].forEach((x) => (F(c, '#5a3a1c', x - 1, t - 12, 2, 8), el(c, '#4f9a34', x, t - 15, 6, 6), el(c, '#6cc04a', x - 2, t - 17, 3, 3)));
  }
  // Timber skybridge with railing posts, plugged into the second terrace.
  F(c, '#8a5a2c', 0, 368, 48, 5);
  F(c, '#c8945a', 0, 360, 48, 2);
  for (let x = 2; x < 48; x += 6) F(c, '#c8945a', x, 360, 1, 8);
}

function cc2tel(c) {
  F(c, '#cfd5e0', 57, 260, 36, H - 260);
  F(c, '#aab2c0', 50, 150, 50, 28);
  F(c, '#2f5fa0', 34, 180, 82, 80);
  for (let k = 0; k < 6; k++) F(c, '#1a3a6a', 34 + k * 16, 180, 1, 80);
  for (let k = 0; k < 6; k++) F(c, '#1a3a6a', 34, 180 + k * 16, 82, 1);
  F(c, '#8fb4e0', 40, 184, 6, 72);
  F(c, '#9aa2b0', 73, 60, 4, 90);
  el(c, '#ff3a3a', 75, 56, 3, 3);
  for (let y = 280; y < H; y += 20) if (Math.random() < 0.5) F(c, '#ffd86a', 63, y, 6, 8);
}

function cc2cons(c) {
  el(c, '#6a8a5a', 100, 230, 80, 40);
  F(c, '#6a8a5a', 20, 230, 160, H - 230);
  for (let y = 200; y < H; y += 10) for (let x = 20; x < 180; x += 10) if (Math.random() < 0.6) el(c, ['#3f8a3a', '#5fae4a', '#2e6e2e'][(x + y) % 3], x + 5, y, 6, 5);
  for (let y = 250; y < H; y += 40) F(c, '#2e5e2a', 20, y, 160, 2);
  for (let y = 240; y < H; y += 40) for (let x = 30; x < 170; x += 40) F(c, '#9fd8e8', x, y, 14, 12);
}

function cc2wtc(c) {
  cc2glass(c, 10, 190, 90, H - 190, '#4a6a8e', '#a8c8e8');
  cc2glass(c, 120, 160, 90, H - 160, '#4a6a8e', '#a8c8e8');
  F(c, '#5a7a9e', 100, 330, 20, 10);
}

function cc2city(c, n, hmin, hmax, col, win) {
  for (let i = 0; i < n; i++) {
    const w = rand(30, 70), h = rand(hmin, hmax), x = rand(0, W);
    const at = (f) => [-W, 0, W].forEach((d) => f(x + d));
    at((p) => F(c, col, p, H - h, w, h));
    for (let wy = H - h + 6; wy < H - 6; wy += 10)
      for (let wx = 5; wx < w - 6; wx += 10) if (Math.random() < 0.5) at((p) => F(c, win, p + wx, wy, 4, 5));
  }
}

function fnBite(sc, n) {
  const m = sc.sm;
  m.p.setTexture('p' + ((n % 2) + (Math.random() < 0.35 ? 2 : 0))).setScale(fnS * 1.06, fnS * 0.9);
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

const fnN = (i) => ((Math.sin(i * 127.1 + 311.7) * 43758.5453) % 1) * 0.5 + 0.5;

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
  scene.controls = { held: Object.create(null), pressed: Object.create(null) };

  const onKeyDown = (event) => {
    const arcadeCode = KEYBOARD_TO_ARCADE[normalizeIncomingKey(event.key)];
    if (!arcadeCode) return;
    if (!scene.controls.held[arcadeCode]) scene.controls.pressed[arcadeCode] = true;
    scene.controls.held[arcadeCode] = true;
  };
  const onKeyUp = (event) => {
    const arcadeCode = KEYBOARD_TO_ARCADE[normalizeIncomingKey(event.key)];
    if (arcadeCode) scene.controls.held[arcadeCode] = false;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  scene.events.once('shutdown', () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  });
}

function normalizeIncomingKey(key) {
  if (typeof key !== 'string' || key.length === 0) return '';
  if (key === ' ') return 'space';
  return key.toLowerCase();
}

function isControlHeld(scene, controlCode) {
  return scene.controls.held[controlCode] === true;
}

function consumeAnyPressedControl(scene, controlCodes) {
  for (const controlCode of controlCodes) {
    if (scene.controls.pressed[controlCode]) {
      scene.controls.pressed[controlCode] = false;
      return true;
    }
  }
  return false;
}

function getHorizontalMenuAxis(controls) {
  let axis = 0;
  if (controls.held.P1_L || controls.held.P2_L) axis -= 1;
  if (controls.held.P1_R || controls.held.P2_R) axis += 1;
  return axis;
}

function getVerticalMenuAxis(controls) {
  let axis = 0;
  if (controls.held.P1_U || controls.held.P2_U) axis -= 1;
  if (controls.held.P1_D || controls.held.P2_D) axis += 1;
  return axis;
}

// ---------- Initials entry: classic 3-slot slider ----------
function handleNameEntry(sc, time) {
  const e = sc.state.nameEntry;
  const x = getHorizontalMenuAxis(sc.controls);
  const y = getVerticalMenuAxis(sc.controls);
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
  const e = sc.state.nameEntry;
  sc.endGame.nameValue.setText(e.letters.map((l, i) => (i === e.i ? `[${l}]` : ` ${l} `)).join(''));
}

function submitHighScore(scene) {
  const st = scene.state;
  if (st.phase !== 'gameover') return;
  const name = st.nameEntry.letters.join('').slice(0, WINNING_NAME_LENGTH) || '???';
  const entry = { name, bananas: st.bananas, ms: Math.round(st.ms), level: LEVELS[st.lv].n, savedAt: new Date().toISOString().slice(0, 10) };
  setPhase(scene, 'saved');
  scene.endGame.saveStatus.setText(`¡GUARDADO, ${name}! PRESIONA START`);
  persistHighScore(entry)
    .then((h) => {
      st.highScores = h;
      refreshLeaderboard(scene);
    })
    .catch(() => scene.endGame.saveStatus.setText('NO SE PUDO GUARDAR. PRESIONA START'));
}

function refreshLeaderboard(scene) {
  const h = scene.state.highScores;
  const s = h.length
    ? h.map((e, i) => `${i + 1}. ${e.name.padEnd(3, ' ')} ${String(e.bananas).padStart(4, ' ')} ${fmtTime(e.ms).padStart(7, ' ')}  ${e.level}`).join('\n')
    : 'SIN RÉCORDS AÚN';
  scene.endGame.leaderboard.setText(s);
  scene.startScreen.list.setText(s);
}

// ---------- Storage (from the starter) ----------
async function persistHighScore(entry) {
  const existing = await loadHighScores();
  const nextScores = existing
    .concat(entry)
    .sort((a, b) => (b.bananas - a.bananas || a.ms - b.ms || (a.savedAt < b.savedAt ? 1 : -1)))
    .slice(0, MAX_HIGH_SCORES);
  await storageSet(STORAGE_KEY, nextScores);
  return nextScores;
}

async function loadHighScores() {
  const result = await storageGet(STORAGE_KEY);
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

async function storageGet(key) {
  return getStorage().get(key);
}

async function storageSet(key, value) {
  return getStorage().set(key, value);
}
