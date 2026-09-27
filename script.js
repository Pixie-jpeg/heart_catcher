const MESSAGES = [
  "Tu fais battre mon cœur plus vite ♥",
  "Encore un et je fonds…",
  "T'es trop fort, comme toujours",
  "Presque…"
];
const OBJECTIF = 50;   // points pour gagner
const VIES_MAX = 3;

const $ = id => document.getElementById(id);
const canvas = $('jeu');
const ctx = canvas.getContext('2d');

/* --- État du jeu --- */
const bocal = { x: 0, cible: 0, w: 80, h: 70, y: 0 };
let W, H;
let objets = [], textes = [], touches = {};
let score = 0, vies = VIES_MAX, enJeu = false;
let dernier = 0, chrono = 0, prochainMsg = 10, secousse = 0;

/* --- Taille de l'écran --- */
function redim() {
  const dpr = window.devicePixelRatio || 1;
  W = innerWidth; H = innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  bocal.y = H - bocal.h - 30;
  if (!enJeu) dessiner();
}
addEventListener('resize', redim);

/* --- Commandes --- */
addEventListener('keydown', e => touches[e.key] = true);
addEventListener('keyup', e => touches[e.key] = false);
addEventListener('pointermove', e => bocal.cible = e.clientX);
addEventListener('pointerdown', e => bocal.cible = e.clientX);

/* --- Dessins --- */
function coeur(x, y, s, couleur) {
  ctx.fillStyle = couleur;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y, x - s / 2, y, x - s / 2, y + s * 0.3);
  ctx.bezierCurveTo(x - s / 2, y + s * 0.6, x, y + s * 0.75, x, y + s);
  ctx.bezierCurveTo(x, y + s * 0.75, x + s / 2, y + s * 0.6, x + s / 2, y + s * 0.3);
  ctx.bezierCurveTo(x + s / 2, y, x, y, x, y + s * 0.3);
  ctx.fill();
}

function coeurBrise(x, y, s) {
  coeur(x, y, s, '#6B5A60');
  ctx.strokeStyle = '#FFD9DF';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.lineTo(x - s * 0.12, y + s * 0.5);
  ctx.lineTo(x + s * 0.1, y + s * 0.65);
  ctx.lineTo(x, y + s * 0.95);
  ctx.stroke();
}

function dessinerBocal() {
  const sx = (Math.random() - 0.5) * secousse;
  const x = bocal.x - bocal.w / 2 + sx, y = bocal.y, w = bocal.w, h = bocal.h;
  const forme = () => { ctx.beginPath(); ctx.roundRect(x, y, w, h, [8, 8, 18, 18]); };

  // verre
  forme();
  ctx.fillStyle = 'rgba(255,255,255,.4)';
  ctx.fill();

  // niveau de remplissage
  const niveau = Math.min(score / OBJECTIF, 1) * (h - 8);
  ctx.save();
  forme(); ctx.clip();
  ctx.fillStyle = '#FF8FA3';
  ctx.fillRect(x, y + h - niveau, w, niveau);
  ctx.restore();

  // contour + reflet + col
  forme();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(201,36,63,.6)';
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.beginPath(); ctx.roundRect(x + 8, y + 12, 6, h - 30, 3); ctx.fill();
  ctx.fillStyle = '#F0475E';
  ctx.beginPath(); ctx.roundRect(x - 4, y - 6, w + 8, 10, 5); ctx.fill();

  coeur(x + w / 2, y + h / 2 - 8, 20, '#FFF9F6');
}

function dessiner() {
  ctx.clearRect(0, 0, W, H);
  for (const o of objets) {
    if (o.type === 'brise') coeurBrise(o.x, o.y, o.s);
    else coeur(o.x, o.y, o.s, o.type === 'or' ? '#F5B82E' : '#F0475E');
  }
  dessinerBocal();
  ctx.font = '700 22px Quicksand, sans-serif';
  ctx.textAlign = 'center';
  for (const t of textes) {
    ctx.globalAlpha = Math.max(t.a, 0);
    ctx.fillStyle = t.c;
    ctx.fillText(t.txt, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

/* --- Logique --- */
function creer() {
  const r = Math.random();
  const pBrise = Math.min(0.18 + score * 0.004, 0.4);   // + de cœurs brisés avec le temps
  const type = r < pBrise ? 'brise' : r < pBrise + 0.08 ? 'or' : 'normal';
  const s = type === 'or' ? 30 : 26 + Math.random() * 10;
  objets.push({
    x: 20 + Math.random() * (W - 40),
    y: -s, s, type,
    v: 2 + Math.random() * 1.5 + score * 0.05             // + rapide avec le score
  });
}

function attraper(o) {
  if (o.type === 'brise') {
    vies--;
    secousse = 12;
    textes.push({ x: o.x, y: bocal.y, txt: '-1 ♥', a: 1, c: '#6B5A60' });
    if (vies <= 0) return fin(false);
  } else {
    const pts = o.type === 'or' ? 3 : 1;
    score += pts;
    textes.push({ x: o.x, y: bocal.y, txt: '+' + pts, a: 1, c: o.type === 'or' ? '#D99A00' : '#C9243F' });
    if (score >= OBJECTIF) return fin(true);
    if (score >= prochainMsg) {
      toast(MESSAGES[(prochainMsg / 10 - 1) % MESSAGES.length]);
      prochainMsg += 10;
    }
  }
  majHud();
}

function boucle(t) {
  if (!enJeu) return;
  const dt = Math.min((t - dernier) / 16.67, 3);
  dernier = t;

  // bocal
  if (touches.ArrowLeft) bocal.cible -= 9 * dt;
  if (touches.ArrowRight) bocal.cible += 9 * dt;
  bocal.cible = Math.max(bocal.w / 2, Math.min(W - bocal.w / 2, bocal.cible));
  bocal.x += (bocal.cible - bocal.x) * 0.25 * dt;
  secousse *= 0.85;

  // nouveaux cœurs
  chrono -= 16.67 * dt;
  if (chrono <= 0) {
    creer();
    chrono = Math.max(900 - score * 10, 380);
  }

  // chute + collisions
  for (const o of objets) {
    o.y += o.v * dt;
    const dedans = o.y + o.s > bocal.y && o.y < bocal.y + 25 && Math.abs(o.x - bocal.x) < bocal.w / 2;
    if (dedans) { o.fini = true; attraper(o); }
    else if (o.y > H) o.fini = true;
  }
  objets = objets.filter(o => !o.fini);

  // textes "+1" qui s'envolent
  for (const tx of textes) { tx.y -= dt; tx.a -= 0.02 * dt; }
  textes = textes.filter(tx => tx.a > 0);

  dessiner();
  if (enJeu) requestAnimationFrame(boucle);
}

/* --- Interface --- */
function majHud() {
  $('score').textContent = score;
  $('vies').textContent = '♥'.repeat(Math.max(vies, 0)) + '♡'.repeat(VIES_MAX - Math.max(vies, 0));
}

let toastTimer;
function toast(txt) {
  const t = $('toast');
  t.textContent = txt;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

function demarrer() {
  objets = []; textes = [];
  score = 0; vies = VIES_MAX; prochainMsg = 10; chrono = 0; secousse = 0;
  bocal.x = bocal.cible = W / 2;
  majHud();
  $('debut').classList.add('cache');
  $('fin').classList.add('cache');
  enJeu = true;
  dernier = performance.now();
  requestAnimationFrame(boucle);
}

function fin(gagne) {
  enJeu = false;
  majHud();
  let record = score;
  try {
    record = Math.max(score, Number(localStorage.getItem('record-coeurs')) || 0);
    localStorage.setItem('record-coeurs', record);
  } catch (e) {}
  $('finTitre').textContent = gagne ? 'Bocal rempli !' : 'Bravo ! Ton prix : un câlin illimité, valable à vie ♥';
  $('finTexte').textContent = gagne
    ? "Tu as attrapé tous mes cœurs. De toute façon, ils étaient déjà à toi ♥"
    : "Les cœurs brisés t'ont eu… mais le mien, tu l'auras toujours ♥";
  $('record').textContent = `Score : ${score}   Record : ${record}`;
  $('fin').classList.remove('cache');
}

$('jouer').addEventListener('click', demarrer);
$('rejouer').addEventListener('click', demarrer);

/* --- Lancement --- */
$('objectif').textContent = OBJECTIF;
redim();
bocal.x = bocal.cible = W / 2;
dessiner();
