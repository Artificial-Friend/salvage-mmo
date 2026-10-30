// =====================================================================
//  SALVAGE CORE — deterministic simulation for the browser (WebAssembly)
//  and, later, the authoritative game server (same code, native build).
//
//  Freestanding C++: no libc, no heap. All state lives in static arrays
//  of floats so the renderer can read it with zero-copy typed views.
//
//  Units: metres, seconds, kilograms, kelvin, watts.
//  Body frame: +Z forward (nose), +Y up, -X right.
// =====================================================================

typedef unsigned int u32;

#define EXPORT extern "C" __attribute__((visibility("default")))

static inline float fsqrt(float x) { return __builtin_sqrtf(x > 0.f ? x : 0.f); }
static inline float fabsf_(float x) { return x < 0.f ? -x : x; }
static inline float fminf_(float a, float b) { return a < b ? a : b; }
static inline float fmaxf_(float a, float b) { return a > b ? a : b; }
static inline float clampf(float x, float a, float b) { return x < a ? a : (x > b ? b : x); }

// ---------------------------------------------------------------------
//  Vector / quaternion helpers
// ---------------------------------------------------------------------
struct V3 { float x, y, z; };
static inline V3 v3(float x, float y, float z) { V3 r = {x, y, z}; return r; }
static inline V3 add(V3 a, V3 b) { return v3(a.x + b.x, a.y + b.y, a.z + b.z); }
static inline V3 sub(V3 a, V3 b) { return v3(a.x - b.x, a.y - b.y, a.z - b.z); }
static inline V3 mul(V3 a, float s) { return v3(a.x * s, a.y * s, a.z * s); }
static inline float dot(V3 a, V3 b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
static inline V3 cross(V3 a, V3 b) { return v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x); }
static inline float len(V3 a) { return fsqrt(dot(a, a)); }
static inline V3 norm(V3 a) { float l = len(a); return l > 1e-6f ? mul(a, 1.f / l) : v3(0, 0, 0); }

struct Q { float x, y, z, w; };
static inline Q qmul(Q a, Q b) {
  Q r;
  r.w = a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z;
  r.x = a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y;
  r.y = a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x;
  r.z = a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w;
  return r;
}
static inline Q qnorm(Q q) {
  float l = fsqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
  if (l < 1e-8f) { Q i = {0, 0, 0, 1}; return i; }
  float s = 1.f / l; Q r = {q.x * s, q.y * s, q.z * s, q.w * s}; return r;
}
static inline V3 qrot(Q q, V3 v) {  // rotate v by q
  V3 u = v3(q.x, q.y, q.z);
  V3 t = mul(cross(u, v), 2.f);
  return add(add(v, mul(t, q.w)), cross(u, t));
}
static inline V3 qinvrot(Q q, V3 v) { Q c = {-q.x, -q.y, -q.z, q.w}; return qrot(c, v); }
// integrate orientation with body-frame angular velocity
static inline Q qintBody(Q q, V3 w, float dt) {
  Q o = {w.x, w.y, w.z, 0.f};
  Q d = qmul(q, o);
  Q r = {q.x + 0.5f * dt * d.x, q.y + 0.5f * dt * d.y, q.z + 0.5f * dt * d.z, q.w + 0.5f * dt * d.w};
  return qnorm(r);
}
// integrate orientation with world-frame angular velocity
static inline Q qintWorld(Q q, V3 w, float dt) {
  Q o = {w.x, w.y, w.z, 0.f};
  Q d = qmul(o, q);
  Q r = {q.x + 0.5f * dt * d.x, q.y + 0.5f * dt * d.y, q.z + 0.5f * dt * d.z, q.w + 0.5f * dt * d.w};
  return qnorm(r);
}

// ---------------------------------------------------------------------
//  RNG (xorshift32) — deterministic
// ---------------------------------------------------------------------
static u32 rngState = 0x9E3779B9u;
static inline u32 rnext() { u32 x = rngState; x ^= x << 13; x ^= x >> 17; x ^= x << 5; rngState = x; return x; }
static inline float rnd() { return (rnext() & 0xFFFFFF) / 16777216.f; }
static inline float rrange(float a, float b) { return a + (b - a) * rnd(); }
static V3 rdir() {
  for (int i = 0; i < 16; i++) {
    V3 v = v3(rrange(-1, 1), rrange(-1, 1), rrange(-1, 1));
    float l2 = dot(v, v);
    if (l2 > 0.01f && l2 <= 1.f) return mul(v, 1.f / fsqrt(l2));
  }
  return v3(0, 1, 0);
}
static Q rquat() {
  for (int i = 0; i < 16; i++) {
    Q q = {rrange(-1, 1), rrange(-1, 1), rrange(-1, 1), rrange(-1, 1)};
    float l2 = q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w;
    if (l2 > 0.01f && l2 <= 1.f) return qnorm(q);
  }
  Q i = {0, 0, 0, 1}; return i;
}

// ---------------------------------------------------------------------
//  Layouts (mirrored in JS — keep in sync)
// ---------------------------------------------------------------------
enum {
  S_POS = 0, S_VEL = 3, S_QUAT = 6, S_ANG = 10,
  S_DRY = 13, S_PROP = 14, S_CARGO = 15, S_HULL = 16, S_BUS_T = 17, S_LASER_T = 18,
  S_RAD_HEALTH = 19, S_RAD_DEPLOY = 20, S_COLD = 21, S_JF = 22, S_JCOST = 23, S_SPOOL = 24,
  S_SIG = 25, S_LASER_ON = 26, S_LASER_DIST = 27, S_LASER_TYPE = 28, S_LASER_IDX = 29,
  S_CUT = 30, S_HARP_STATE = 31, S_HARP_POS = 32, S_HARP_VEL = 35, S_TETH_TYPE = 38,
  S_TETH_IDX = 39, S_TETH_LOCAL = 40, S_TETH_REST = 43, S_TETH_TENSION = 44,
  S_THROTTLE = 45, S_RCS = 46, S_DOSE = 49, S_CREW = 50, S_SHADOW = 51, S_STATE = 52,
  S_LASER_LOCK = 53, S_CARGO_N = 54, S_HIT_T = 55, S_DEATH = 56, S_FLARE = 57, S_FLARE_T = 58,
  S_TIME = 59, S_RAD_TARGET = 60, S_PRAD = 61, S_PIN = 62, S_MASS = 63, S_TETH_LEN = 64,
  S_SPOOLING = 65, S_TRACKED = 66, S_DETECT_R = 67, S_TRACK_R = 68, S_ANG_TARGET = 69,
  S_AP_STATE = 72, S_AP_GOAL = 73, S_AP_VREL = 74, S_STIR = 75, S_STIR_IDX = 76, S_AP_BURN = 77,
  S_SCRAP = 78, S_PD_ON = 79, S_PDC_N = 80, S_COIL_N = 81, S_COIL_CD = 82, S_PD_TGT = 83, S_PD_FIRING = 84,
  S_HULL_MAX = 85, S_ARMOR = 86, S_INTERCEPTS = 87, S_COIL_FLASH = 88, S_CARGO_LIMIT = 89,
  S_N = 96
};
enum { P_TYPE = 0, P_STATE = 1, P_WRECK = 2, P_LOCAL = 3, P_POS = 6, P_VEL = 9, P_QUAT = 12,
       P_ANG = 16, P_MASS = 19, P_RAD = 20, P_CUT = 21, P_CUTTIME = 22, P_VALUE = 23,
       P_LQUAT = 24, P_HEAT = 28, P_N = 32 };
enum { W_POS = 0, W_VEL = 3, W_QUAT = 6, W_ANG = 10, W_MASS = 13, W_NS = 14, W_SEED = 15,
       W_SPH = 16, W_BR = 64, W_STYLE = 65, W_CLASS = 66, W_TORN = 67, W_N = 68 };
#define MAX_SPH 12
enum { R_POS = 0, R_VEL = 3, R_RAD = 6, R_MASS = 7, R_N = 8 };
enum { D_POS = 0, D_VEL = 3, D_STATE = 6, D_HP = 7, D_CD = 8, D_LAST = 9, D_LOST = 12,
       D_HOME_W = 13, D_HOME = 14, D_ALERT = 17, D_FLASH = 18, D_AIM = 19, D_WAKE = 22,
       D_SUSP = 28, D_AMMO = 29, D_QUAT = 24, D_N = 32 };
enum { G_POS = 0, G_VEL = 3, G_LIFE = 6, G_ACTIVE = 7, G_OWNER = 8, G_DMG = 9, G_KIND = 10, G_N = 12 };
enum { C_POS = 0, C_VEL = 3, C_QUAT = 6, C_TARGET = 10, C_TIMER = 11, C_WORK = 12, C_SIG = 13, C_N = 16 };
enum { I_THRUST = 0, I_SX = 1, I_SY = 2, I_PITCH = 3, I_YAW = 4, I_ROLL = 5, I_LASER = 6,
       I_HARPOON = 7, I_REEL = 8, I_KILLV = 9, I_RAD = 10, I_COLD = 11, I_JUMP = 12, I_EJECT = 13,
       I_ASSIST = 14, I_PAYOUT = 15, I_AP_MODE = 16, I_AP_TYPE = 17, I_AP_IDX = 18, I_AP_QUIET = 19,
       I_AP_SERIAL = 20, I_FIRE = 21, I_PD = 22, I_N = 24 };

// part states
enum { PS_ATTACHED = 0, PS_FREE = 1, PS_TETHERED = 2, PS_CARGO = 3, PS_GONE = 4 };
// part types
enum { PT_ARMOR = 0, PT_RADIATOR, PT_THRUSTER, PT_PDC, PT_MASSDRIVER, PT_REACTOR, PT_SENSOR,
       PT_JUMPCELL, PT_CAPACITOR, PT_TRUSS, PT_COUNT };
// drone states
enum { DS_DORMANT = 0, DS_WAKING, DS_HUNTING, DS_SEARCHING, DS_DEAD, DS_RETURNING };
// event types
enum { E_DETACH = 1, E_STOW, E_IMPACT, E_DRONE_WAKE, E_DRONE_LOST, E_SLUG_FIRED, E_SLUG_HIT,
       E_HARPOON_HIT, E_JUMPCELL, E_FLARE_WARN, E_FLARE_START, E_FLARE_END, E_OVERHEAT,
       E_DIED, E_EXTRACTED, E_DRONE_DEAD, E_TETHER_SNAP, E_SPOOL_ABORT, E_NO_FUEL, E_RAD_DAMAGE,
       E_EJECT, E_SPOOL_START, E_CARGO_FULL, E_HARPOON_MISS, E_COLD_ON, E_COLD_OFF, E_RAD_TOGGLE,
       E_SPARK, E_DRONE_REACQ, E_BUS_HOT, E_AP_ARRIVED, E_AP_CANCEL, E_DRONE_DRY, E_DRONE_STIR, E_UPSET, E_PD_FIRE, E_COIL_FIRE, E_INTERCEPT, E_DRONE_HIT, E_SCRAP, E_PD_TOGGLE };

#define MAX_PARTS 400
#define MAX_WRECKS 24
#define MAX_ROCKS 900
#define MAX_DRONES 12
#define MAX_SLUGS 192
#define MAX_SCAVS 4
#define MAX_EVENTS 128
#define EVT_N 6
#define MAX_CARGO 16

static float ship[S_N];
static float parts[MAX_PARTS * P_N];
static float wrecks[MAX_WRECKS * W_N];
static float rocks[MAX_ROCKS * R_N];
static float drones[MAX_DRONES * D_N];
static float slugs[MAX_SLUGS * G_N];
static float scavs[MAX_SCAVS * C_N];
static float input[I_N];
static float events[MAX_EVENTS * EVT_N];
static int cargo[MAX_CARGO];
static int nParts = 0, nWrecks = 0, nRocks = 0, nDrones = 0, nScavs = 0, nEvents = 0;
static float prevEdge[I_N];

// --- physical constants (game-tuned) --------------------------------
static const V3 SUN_DIR = {0.62f, 0.28f, -0.73f};    // normalized in init
static V3 sunDir;
static float SHIP_RADIUS = 6.0f;
static float NOSE_Z = 8.f;
static float JUMP_RATED = 52000.f;
static float SIG_MUL = 1.f;
static float INERTIA_K = 1.f;
static float LASER_MUL = 1.f;
static float COIL_RELOAD = 4.f;
static float F_MAIN = 420000.f;          // N
static float F_RCS = 70000.f;            // N per axis
static float RCS_ARM = 6.0f;             // m lever
static float ISP_MAIN = 1500.f;          // s
static const float ISP_RCS = 700.f;
static const float G0 = 9.81f;
static float BUS_C = 1.6e6f;             // J/K   heat capacity of ship structure (game-scaled)
static float LASER_C = 2.5e4f;           // J/K   laser head
static const float LASER_K = 2.2e3f;           // W/K   head→bus conduction
static const float LASER_P = 2.0e6f;           // W     waste heat in head while firing
static float KR_DEPLOYED = 1.6e-4f;      // eps*sigma*A  (W/K^4)
static float KR_RETRACTED = 1.6e-5f;
static const float T_ENV = 3.f;
static float P_REACTOR = 1.5e6f;
static const float P_REACTOR_COLD = 0.3e6f;
static const float P_DRIVE_WASTE = 4.0e6f;
static const float P_RCS_WASTE = 0.25e6f;
static const float P_SPOOL = 6.0e6f;
static const float P_SOLAR = 0.6e6f;
static const float LASER_RANGE = 70.f;
static const float LASER_ABLATION_N = 60.f;     // N     recoil on a loose part in the beam
static const float LASER_OVERHEAT = 1150.f;
static const float LASER_RESET = 720.f;
static const float HARPOON_SPEED = 90.f;
static const float HARPOON_RANGE = 160.f;
static const float TETHER_BREAK = 900000.f;    // N
static const float WINCH_MAX = 260000.f;       // N
static const float SCRAP_MAX = 12000.f;        // kg: heavier fragments are anchors, not cargo
static const float BUS_DAMAGE_T = 640.f;
static float CARGO_LIMIT = 60000.f;      // kg
static const float SPOOL_TIME = 9.f;
static const float WAKE_K = 3.0e3f;            // detection constants:  range = sqrt(K*sig)
static const float TRACK_K = 3.0e4f;
static const float SLUG_SPEED = 195.f;
static const float WAKE_TIME = 3.5f;           // seconds of sustained exposure before a dormant drone wakes
static const float ZONE_R = 2600.f;

static float flareClock = 0.f;
static void resetShipDefaults();
static int spawnSlug(V3 from, V3 vel, float life, int owner, int kind, float dmg);
static float flareStart = 1e9f;  // run time when a solar particle front arrives (1e9 = none this run)
static int apSerial = -1;

static void emit(float type, V3 p, float a, float b) {
  if (nEvents >= MAX_EVENTS) return;
  float* e = &events[nEvents * EVT_N];
  e[0] = type; e[1] = p.x; e[2] = p.y; e[3] = p.z; e[4] = a; e[5] = b;
  nEvents++;
}

static inline V3 gv(const float* a, int o) { return v3(a[o], a[o + 1], a[o + 2]); }
static inline void sv(float* a, int o, V3 v) { a[o] = v.x; a[o + 1] = v.y; a[o + 2] = v.z; }
static inline Q gq(const float* a, int o) { Q q = {a[o], a[o + 1], a[o + 2], a[o + 3]}; return q; }
static inline void sq(float* a, int o, Q q) { a[o] = q.x; a[o + 1] = q.y; a[o + 2] = q.z; a[o + 3] = q.w; }

static float partMass(int t) {
  switch (t) {
    case PT_ARMOR: return 6000.f; case PT_RADIATOR: return 3500.f; case PT_THRUSTER: return 7500.f;
    case PT_PDC: return 4500.f; case PT_MASSDRIVER: return 13000.f; case PT_REACTOR: return 17000.f;
    case PT_SENSOR: return 1800.f; case PT_JUMPCELL: return 400.f; case PT_CAPACITOR: return 2800.f;
    default: return 2600.f;
  }
}
static float partRadius(int t) {
  switch (t) {
    case PT_ARMOR: return 3.2f; case PT_RADIATOR: return 3.6f; case PT_THRUSTER: return 2.8f;
    case PT_PDC: return 2.2f; case PT_MASSDRIVER: return 5.5f; case PT_REACTOR: return 3.2f;
    case PT_SENSOR: return 2.4f; case PT_JUMPCELL: return 1.2f; case PT_CAPACITOR: return 1.9f;
    default: return 3.0f;
  }
}
static float partValue(int t) {
  switch (t) {
    case PT_ARMOR: return 120; case PT_RADIATOR: return 210; case PT_THRUSTER: return 280;
    case PT_PDC: return 460; case PT_MASSDRIVER: return 980; case PT_REACTOR: return 1150;
    case PT_SENSOR: return 320; case PT_JUMPCELL: return 0; case PT_CAPACITOR: return 190;
    default: return 45;
  }
}

static float jumpCost(float mass) {
  // Rocket-equation-flavoured: cost grows faster than mass.
  float r = mass / JUMP_RATED;
  // r^1.35 via exp/log-free approximation: r * r^0.35 ; r^0.35 ~ sqrt(sqrt(r)) * r^-0.15 ... use
  // a smooth polynomial fit valid for r in [0.6, 3]: r^0.35 ≈ 0.6519 + 0.4013 r - 0.0533 r^2
  float p = 0.6519f + 0.4013f * r - 0.0533f * r * r;
  return 0.85f * r * p;
}

// ---------------------------------------------------------------------
//  World generation — an old battlefield ("graveyard") for newcomers
// ---------------------------------------------------------------------
static V3 wreckSphereWorld(int w, int s, float* radius) {
  float* W = &wrecks[w * W_N];
  V3 lp = v3(W[W_SPH + s * 4], W[W_SPH + s * 4 + 1], W[W_SPH + s * 4 + 2]);
  *radius = W[W_SPH + s * 4 + 3];
  return add(gv(W, W_POS), qrot(gq(W, W_QUAT), lp));
}

// entry distance into a sphere (0 if starting inside), or -1 on a miss
static float raySphereEnter(V3 o, V3 d, V3 c, float r) {
  V3 oc = sub(o, c);
  float b = dot(oc, d), cc = dot(oc, oc) - r * r;
  if (cc <= 0.f) return 0.f;
  float h = b * b - cc;
  if (h < 0.f || b > 0.f) return -1.f;
  return -b - fsqrt(h);
}

// ---------------------------------------------------------------------
//  Hull sections: the true shape of a hulk, shared with the client's renderer.
//  Each section is a prism along the wreck's local Z with a rounded-box cross-section
//  (superellipse, exponent 4): |x/a|^4 + |y/b|^4 = 1, a = r·SEC_A[style], b = r·SEC_B[style],
//  half-length r·SEC_L[class]. Parts sit on this surface; the laser, line of sight and
//  collisions all hit it. Mirrored in client/shipkit.js (HULL_SECTION).
// ---------------------------------------------------------------------
static const float SEC_A[3] = {0.92f, 0.74f, 0.84f};   // TCN wide and low, ARD tall, BFC boxy
static const float SEC_B[3] = {0.62f, 0.86f, 0.78f};
static const float SEC_L[2] = {0.85f, 0.65f};          // ordinary hull, capital section
static inline float norm4(float x, float y) { float x2 = x * x, y2 = y * y; return fsqrt(fsqrt(x2 * x2 + y2 * y2)); }
struct Sec { V3 c; float a, b, h; };
static Sec wreckSection(const float* W, int s) {
  float r = W[W_SPH + s * 4 + 3];
  int st = (int)W[W_STYLE]; if (st < 0 || st > 2) st = 0;
  int cl = W[W_CLASS] > 0.5f ? 1 : 0;
  Sec S = { v3(W[W_SPH + s * 4], W[W_SPH + s * 4 + 1], W[W_SPH + s * 4 + 2]), r * SEC_A[st], r * SEC_B[st], r * SEC_L[cl] };
  return S;
}
// point on the section's surface along a direction in the cross-section plane, and its outward normal
static V3 sectionSurface(const Sec& S, float dx, float dy, V3* n) {
  float k = norm4(dx / S.a, dy / S.b);
  float x = dx / k, y = dy / k;
  V3 g = v3(x * x * x / (S.a * S.a * S.a * S.a), y * y * y / (S.b * S.b * S.b * S.b), 0.f);
  *n = norm(g);
  return v3(S.c.x + x, S.c.y + y, 0.f);
}
// approximate signed distance from a point in wreck-local space to a section (negative inside)
static float sectionDist(const Sec& S, V3 lp, V3* n) {
  V3 q = sub(lp, S.c);
  float rho = fsqrt(q.x * q.x + q.y * q.y);
  float k = norm4(q.x / S.a, q.y / S.b);
  float dr; V3 nr;
  if (rho < 1e-4f) { dr = -fminf_(S.a, S.b); nr = v3(0, 1, 0); }
  else {
    dr = rho * (1.f - 1.f / k);
    V3 g = v3(q.x * q.x * q.x / (S.a * S.a * S.a * S.a), q.y * q.y * q.y / (S.b * S.b * S.b * S.b), 0.f);
    nr = norm(g);
  }
  float dz = fabsf_(q.z) - S.h;
  V3 nz = v3(0, 0, q.z < 0.f ? -1.f : 1.f);
  if (dr > 0.f && dz > 0.f) { *n = norm(add(mul(nr, dr), mul(nz, dz))); return fsqrt(dr * dr + dz * dz); }
  if (dr > dz) { *n = nr; return dr; }
  *n = nz; return dz;
}
// distance in wreck-local space to the union of all sections
static float localHullDist(const float* W, V3 lp) {
  float best = 1e9f; int ns = (int)W[W_NS];
  for (int s = 0; s < ns; s++) { Sec S = wreckSection(W, s); V3 n; float d = sectionDist(S, lp, &n); if (d < best) best = d; }
  return best;
}
// world-space distance to a wreck's hull (all sections); n is the world-space outward normal
static float wreckDist(int w, V3 p, V3* n, int* sec) {
  const float* W = &wrecks[w * W_N];
  Q q = gq(W, W_QUAT);
  V3 lp = qinvrot(q, sub(p, gv(W, W_POS)));
  float best = 1e9f; V3 bn = v3(0, 1, 0); int bs = 0;
  int ns = (int)W[W_NS];
  for (int s = 0; s < ns; s++) {
    Sec S = wreckSection(W, s);
    V3 nn; float d = sectionDist(S, lp, &nn);
    if (d < best) { best = d; bn = nn; bs = s; }
  }
  *n = qrot(q, bn); if (sec) *sec = bs;
  return best;
}
// ray against a wreck's hull by sphere tracing; returns t or -1
static float rayWreck(int w, V3 o, V3 d, float maxT, int* sec) {
  const float* W = &wrecks[w * W_N];
  float t0 = raySphereEnter(o, d, gv(W, W_POS), W[W_BR]);
  if (t0 < 0.f || t0 > maxT) return -1.f;
  float t = t0;
  for (int i = 0; i < 48 && t < maxT; i++) {
    V3 n; float dist = wreckDist(w, add(o, mul(d, t)), &n, sec);
    if (dist < 0.03f) return t;
    t += fmaxf_(dist * 0.85f, 0.02f);
  }
  return -1.f;
}

static int addPart(int type, int wreck, V3 local, Q lq) {
  if (nParts >= MAX_PARTS) return -1;
  float* P = &parts[nParts * P_N];
  for (int i = 0; i < P_N; i++) P[i] = 0;
  P[P_TYPE] = (float)type; P[P_STATE] = PS_ATTACHED; P[P_WRECK] = (float)wreck;
  sv(P, P_LOCAL, local); sq(P, P_LQUAT, lq);
  P[P_MASS] = partMass(type) * rrange(0.85f, 1.15f);
  P[P_RAD] = partRadius(type);
  P[P_CUTTIME] = 2.2f + P[P_MASS] * 0.00032f;
  P[P_VALUE] = partValue(type) * rrange(0.7f, 1.3f);
  return nParts++;
}

static Q quatFromTo(V3 a, V3 b) {  // rotation taking a → b (unit vectors)
  float d = dot(a, b);
  if (d < -0.9999f) { Q q = {1, 0, 0, 0}; return q; }
  V3 c = cross(a, b);
  Q q = {c.x, c.y, c.z, 1.f + d};
  return qnorm(q);
}

static int pickPartType(int cls) {
  float u = rnd();
  if (cls == 1) {
    // a capital ship's small fittings: point defense everywhere, nothing too big to move
    if (u < 0.26f) return PT_PDC;
    if (u < 0.46f) return PT_ARMOR;
    if (u < 0.58f) return PT_RADIATOR;
    if (u < 0.66f) return PT_SENSOR;
    if (u < 0.76f) return PT_CAPACITOR;
    if (u < 0.84f) return PT_THRUSTER;
    if (u < 0.94f) return PT_JUMPCELL;
    return PT_TRUSS;
  }
  if (u < 0.22f) return PT_ARMOR;
  if (u < 0.34f) return PT_RADIATOR;
  if (u < 0.44f) return PT_THRUSTER;
  if (u < 0.52f) return PT_PDC;
  if (u < 0.56f) return PT_MASSDRIVER;
  if (u < 0.60f) return PT_REACTOR;
  if (u < 0.68f) return PT_SENSOR;
  if (u < 0.81f) return PT_JUMPCELL;
  if (u < 0.88f) return PT_CAPACITOR;
  return PT_TRUSS;
}

// cls 0: ordinary hull, 1: capital-ship section. torn: bit 1 bow end, bit 2 stern end
static void genWreckEx(int w, V3 pos, Q q, float scale, int style, int weaponBias, int ns, int np, int cls, int torn, float drift) {
  float* W = &wrecks[w * W_N];
  for (int i = 0; i < W_N; i++) W[i] = 0;
  sv(W, W_POS, pos);
  sv(W, W_VEL, mul(rdir(), rrange(0.05f, drift)));
  sq(W, W_QUAT, q);
  sv(W, W_ANG, mul(rdir(), cls == 1 ? rrange(0.0005f, 0.0015f) : rrange(0.002f, 0.012f)));
  W[W_SEED] = (float)(rnext() % 100000);
  W[W_STYLE] = (float)style;
  W[W_CLASS] = (float)cls;
  W[W_TORN] = (float)torn;
  if (ns > MAX_SPH) ns = MAX_SPH;
  W[W_NS] = (float)ns;
  float z = -scale * 1.2f;
  float br = 0.f, massSum = 0.f;
  for (int s = 0; s < ns; s++) {
    float r = cls == 1 ? scale * rrange(0.72f, 0.95f) : scale * rrange(0.45f, 0.8f);
    if (cls == 0 && (s == 0 || s == ns - 1)) r *= 0.8f;
    float jit = cls == 1 ? 0.04f : 0.12f;
    V3 c = v3(rrange(-jit, jit) * scale, rrange(-jit, jit) * scale, z);
    W[W_SPH + s * 4 + 0] = c.x; W[W_SPH + s * 4 + 1] = c.y; W[W_SPH + s * 4 + 2] = c.z;
    W[W_SPH + s * 4 + 3] = r;
    float d = len(c) + r;
    if (d > br) br = d;
    massSum += r * r * r * 60.f;
    z += r * (cls == 1 ? rrange(1.15f, 1.35f) : rrange(1.3f, 1.7f));
  }
  W[W_BR] = br + 4.f;
  W[W_MASS] = massSum;
  for (int k = 0; k < np; k++) {
    int s = (int)(rnd() * ns); if (s >= ns) s = ns - 1;
    int type = pickPartType(cls);
    if (k == 0 && weaponBias == 1) type = PT_PDC;
    if (k == 0 && weaponBias == 2) type = PT_MASSDRIVER;
    if (k == 1) type = PT_JUMPCELL;
    // bolted flush to the hull surface, facing out along its normal — on a spot no
    // neighbouring section covers (sections overlap where they join)
    V3 n = v3(0, 1, 0), local = v3(0, 0, 0); bool ok = false;
    for (int tries = 0; tries < 12 && !ok; tries++) {
      int s2 = tries == 0 ? s : (int)(rnd() * ns); if (s2 >= ns) s2 = ns - 1;
      Sec S = wreckSection(W, s2);
      V3 rd = rdir(); if (fabsf_(rd.x) + fabsf_(rd.y) < 0.05f) rd = v3(0, 1, 0);
      local = sectionSurface(S, rd.x, rd.y, &n);
      local.z = S.c.z + rrange(-0.7f, 0.7f) * (S.h - partRadius(type) * 0.6f);
      ok = localHullDist(W, local) > -0.02f;
      // and clear of the fittings already bolted to this hull
      for (int j = 0; j < nParts && ok; j++) {
        const float* Q2 = &parts[j * P_N];
        if ((int)Q2[P_WRECK] != w) continue;
        if (len(sub(gv(Q2, P_LOCAL), local)) < (Q2[P_RAD] + partRadius(type)) * 0.8f) ok = false;
      }
    }
    if (!ok) continue;
    addPart(type, w, local, quatFromTo(v3(0, 1, 0), n));
  }
}

static void genWreck(int w, V3 pos, float scale, int style, int weaponBias) {
  int ns = 3 + (int)(rnd() * 2.99f); if (ns > 5) ns = 5;
  genWreckEx(w, pos, rquat(), scale, style, weaponBias, ns, 6 + (int)(rnd() * 5.f), 0, 0, 0.35f);
}

static void placeParts() {
  for (int i = 0; i < nParts; i++) {
    float* P = &parts[i * P_N];
    if ((int)P[P_STATE] != PS_ATTACHED) continue;
    int w = (int)P[P_WRECK];
    float* W = &wrecks[w * W_N];
    Q wq = gq(W, W_QUAT);
    V3 lp = gv(P, P_LOCAL);
    V3 wp = add(gv(W, W_POS), qrot(wq, lp));
    sv(P, P_POS, wp);
    // velocity of a point on a rotating body: v + w × r
    V3 r = qrot(wq, lp);
    sv(P, P_VEL, add(gv(W, W_VEL), cross(gv(W, W_ANG), r)));
    sq(P, P_QUAT, qmul(wq, gq(P, P_LQUAT)));
  }
}

static V3 fieldC = {0, 0, 1100};
static float fieldR = 2600.f;
static int zoneId = 0;

static void placeDrone(int d, int wreck, float rmin, float rmax) {
  float* D = &drones[d * D_N];
  for (int i = 0; i < D_N; i++) D[i] = 0;
  float* W = &wrecks[wreck * W_N];
  V3 p = add(gv(W, W_POS), mul(rdir(), W[W_BR] * (W[W_CLASS] > 0.5f ? 0.5f : 1.f) + rrange(rmin, rmax)));
  sv(D, D_POS, p); sv(D, D_HOME, p); sv(D, D_LAST, p);
  D[D_STATE] = DS_DORMANT; D[D_HP] = 45.f; D[D_HOME_W] = (float)wreck;
  D[D_AMMO] = (float)(16 + (int)(rnd() * 9.f));
  sq(D, D_QUAT, rquat());
}
static void makeRock(int i, V3 p, float rmax) {
  float* R = &rocks[i * R_N];
  sv(R, R_POS, p);
  sv(R, R_VEL, mul(rdir(), rrange(0.1f, 1.6f)));
  float r = rnd(); r = 0.35f + r * r * r * rmax;
  R[R_RAD] = r;
  R[R_MASS] = 1800.f * 4.18879f * r * r * r;   // dense slag / hull fragments
}

static void genThule() {
  // seven hulks laid out as the remains of a battle line
  V3 wp[7] = { {0, 0, 420}, {260, -60, 760}, {-320, 90, 980}, {120, 140, 1350}, {-180, -150, 1700}, {420, 40, 1900}, {-460, -20, 1450} };
  float wsc[7] = {22, 30, 18, 38, 26, 20, 34};
  int bias[7] = {1, 0, 1, 2, 0, 1, 0};
  nWrecks = 7;
  for (int w = 0; w < nWrecks; w++) genWreck(w, wp[w], wsc[w], w % 3, bias[w]);
  nRocks = 320;
  for (int i = 0; i < nRocks; i++) {
    int w = (int)(rnd() * nWrecks); if (w >= nWrecks) w = nWrecks - 1;
    V3 c = gv(&wrecks[w * W_N], W_POS);
    float spread = rnd() < 0.7f ? rrange(30, 220) : rrange(200, 700);
    V3 p = add(c, mul(rdir(), spread));
    if (rnd() < 0.25f) p = v3(rrange(-700, 700), rrange(-300, 300), rrange(-100, 2200));
    makeRock(i, p, 2.6f);
  }
  int dw[5] = {2, 3, 4, 5, 6};
  nDrones = 5;
  for (int d = 0; d < nDrones; d++) placeDrone(d, dw[d], 20, 60);
  nScavs = 2;
  fieldC = v3(0, 0, 1100); fieldR = 2600.f;
  ship[S_POS + 0] = 0; ship[S_POS + 1] = 10; ship[S_POS + 2] = 80;
}

static void genHalvard() {
  // ARD battlecruiser Halvard, broken in two, and the escorts and attackers that died around it
  V3 axis = norm(v3(1.f, 0.06f, 0.22f));
  Q qa = quatFromTo(v3(0, 0, 1), axis);
  V3 p0 = v3(-330, 20, 2550);
  float sc = 58.f;
  genWreckEx(0, p0, qa, sc, 1, 1, 6, 60, 1, 2, 0.05f);                       // bow half, torn at its stern end
  Q twist = quatFromTo(v3(0, 0, 1), norm(v3(0.06f, -0.08f, 1.f)));
  V3 p1 = add(p0, mul(axis, 470.f));
  p1.y -= 35.f;
  genWreckEx(1, p1, qmul(qa, twist), sc * 1.05f, 1, 1, 6, 60, 1, 1, 0.05f); // stern half, torn at its bow end
  nWrecks = 2;
  // two small unguarded escorts near the entry point, so the first minutes are spent working
  genWreck(2, v3(170, -25, 1080), 20.f, 1, 1);
  genWreck(3, v3(-280, 55, 1290), 26.f, 0, 0);
  nWrecks = 4;
  // escorts (ARD) and attackers (TCN, a few BFC privateers)
  int tries = 0;
  while (nWrecks < 22 && tries < 400) {
    tries++;
    V3 p = v3(rrange(-2100, 2100), rrange(-520, 520), rrange(1500, 4300));
    // keep clear of the capital wreck
    V3 rel = sub(p, p0); float t = clampf(dot(rel, axis), -120.f, 900.f);
    if (len(sub(rel, mul(axis, t))) < 260.f) continue;
    bool tooClose = false;
    for (int w = 2; w < nWrecks; w++) if (len(sub(p, gv(&wrecks[w * W_N], W_POS))) < 230.f) { tooClose = true; break; }
    if (tooClose) continue;
    float u = rnd();
    int style = u < 0.5f ? 1 : (u < 0.88f ? 0 : 2);
    float scale = rrange(14.f, 34.f);
    int bias = rnd() < 0.3f ? 1 : (rnd() < 0.12f ? 2 : 0);
    genWreck(nWrecks, p, scale, style, bias);
    nWrecks++;
  }
  // debris: a dense trail along the broken capital ship, clouds around escorts, a thin haze over the field
  nRocks = MAX_ROCKS;
  for (int i = 0; i < nRocks; i++) {
    float u = rnd();
    V3 p;
    if (u < 0.42f) p = add(add(p0, mul(axis, rrange(-200.f, 1000.f))), mul(rdir(), rrange(40.f, 260.f)));
    else if (u < 0.8f) { int w = 2 + (int)(rnd() * (nWrecks - 2)); if (w >= nWrecks) w = nWrecks - 1; p = add(gv(&wrecks[w * W_N], W_POS), mul(rdir(), rrange(30.f, 260.f))); }
    else p = v3(rrange(-2300, 2300), rrange(-600, 600), rrange(600, 4600));
    makeRock(i, p, u < 0.42f ? 3.4f : 2.6f);
  }
  // drones: most sleep around the capital ship; the nearest escorts are clear
  nDrones = 0;
  for (int k = 0; k < 6; k++) placeDrone(nDrones++, k % 2, 30, 140);
  int far[20]; int nf = 0;
  for (int w = 2; w < nWrecks; w++) if (gv(&wrecks[w * W_N], W_POS).z > 1500.f) far[nf++] = w;
  for (int k = 0; k < 5 && nf > 0; k++) placeDrone(nDrones++, far[(int)(rnd() * nf) % nf], 20, 60);
  nScavs = 3;
  fieldC = v3(0, 0, 2600); fieldR = 3600.f;
  ship[S_POS + 0] = 0; ship[S_POS + 1] = 20; ship[S_POS + 2] = 760;
}

EXPORT void initZone(u32 seed, int zone) {
  rngState = seed ? seed : 0x1234567u;
  sunDir = norm(SUN_DIR);
  nParts = nWrecks = nRocks = nDrones = nScavs = nEvents = 0;
  for (int i = 0; i < S_N; i++) ship[i] = 0;
  for (int i = 0; i < I_N; i++) { input[i] = 0; prevEdge[i] = 0; }
  apSerial = -1;
  for (int i = 0; i < MAX_SLUGS * G_N; i++) slugs[i] = 0;
  flareClock = 0.f;
  zoneId = zone;
  resetShipDefaults();
  if (zone == 1) genHalvard(); else genThule();
  placeParts();
  for (int c = 0; c < nScavs; c++) {
    float* C = &scavs[c * C_N];
    for (int i = 0; i < C_N; i++) C[i] = 0;
    sv(C, C_POS, add(fieldC, v3(rrange(-600, 600), rrange(-200, 200), rrange(-200, 900))));
    Q q = {0, 0, 0, 1}; sq(C, C_QUAT, q);
    C[C_TARGET] = (float)((2 + c * 3) % nWrecks);
    C[C_SIG] = 4.f;
  }
  // player: starter cutter
  ship[S_QUAT + 3] = 1.f;
  ship[S_DRY] = 38000.f;
  ship[S_PROP] = 14000.f;
  ship[S_HULL] = 100.f;
  ship[S_CREW] = 100.f;
  ship[S_BUS_T] = 300.f;
  ship[S_LASER_T] = 300.f;
  ship[S_RAD_HEALTH] = 1.f;
  ship[S_RAD_DEPLOY] = 1.f;
  ship[S_RAD_TARGET] = 1.f;
  ship[S_JF] = 1.10f;
  ship[S_TETH_IDX] = -1;
  ship[S_LASER_IDX] = -1;
  ship[S_HULL_MAX] = 100.f; ship[S_CARGO_LIMIT] = CARGO_LIMIT; ship[S_PD_TGT] = -1;
  input[I_ASSIST] = 1.f;
  flareStart = rnd() < 0.4f ? rrange(300.f, 720.f) : 1e9f;
}
EXPORT void init(u32 seed) { initZone(seed, 0); }

// Ship configuration, written by the client from the hull class and installed parts
enum { K_DRY = 0, K_PROP, K_THRUST, K_RCS, K_RCS_ARM, K_ISP, K_KR_DEP, K_KR_RET, K_REACTOR, K_HULL, K_ARMOR, K_CARGO,
       K_JF, K_JUMP_RATED, K_RADIUS, K_NOSE, K_INERTIA, K_SIG, K_PDC, K_COIL, K_LASER_MUL, K_LASER_CAP, K_COIL_RELOAD,
       K_BUS_C, K_N = 32 };
static float cfg[K_N];
EXPORT float* configPtr() { return cfg; }
EXPORT void applyConfig() {
  if (cfg[K_DRY] < 1000.f) return;   // not set: keep the starter cutter defaults
  ship[S_DRY] = cfg[K_DRY]; ship[S_PROP] = cfg[K_PROP];
  F_MAIN = cfg[K_THRUST]; F_RCS = cfg[K_RCS]; RCS_ARM = cfg[K_RCS_ARM]; ISP_MAIN = cfg[K_ISP];
  KR_DEPLOYED = cfg[K_KR_DEP]; KR_RETRACTED = cfg[K_KR_RET]; P_REACTOR = cfg[K_REACTOR];
  ship[S_HULL] = cfg[K_HULL]; ship[S_HULL_MAX] = cfg[K_HULL]; ship[S_ARMOR] = cfg[K_ARMOR];
  CARGO_LIMIT = cfg[K_CARGO]; ship[S_CARGO_LIMIT] = cfg[K_CARGO];
  ship[S_JF] = cfg[K_JF]; JUMP_RATED = cfg[K_JUMP_RATED];
  SHIP_RADIUS = cfg[K_RADIUS]; NOSE_Z = cfg[K_NOSE]; INERTIA_K = cfg[K_INERTIA]; SIG_MUL = cfg[K_SIG];
  ship[S_PDC_N] = cfg[K_PDC]; ship[S_COIL_N] = cfg[K_COIL];
  LASER_MUL = cfg[K_LASER_MUL]; LASER_C = 2.5e4f * cfg[K_LASER_CAP]; COIL_RELOAD = cfg[K_COIL_RELOAD];
  BUS_C = cfg[K_BUS_C];
  ship[S_PD_ON] = cfg[K_PDC] > 0.5f ? 1.f : 0.f;
}
static void resetShipDefaults() {
  SHIP_RADIUS = 6.f; NOSE_Z = 8.f; JUMP_RATED = 52000.f; SIG_MUL = 1.f; INERTIA_K = 1.f; LASER_MUL = 1.f; COIL_RELOAD = 4.f;
  F_MAIN = 420000.f; F_RCS = 70000.f; RCS_ARM = 6.f; ISP_MAIN = 1500.f; BUS_C = 1.6e6f; LASER_C = 2.5e4f;
  KR_DEPLOYED = 1.6e-4f; KR_RETRACTED = 1.6e-5f; P_REACTOR = 1.5e6f; CARGO_LIMIT = 60000.f;
  for (int i = 0; i < K_N; i++) cfg[i] = 0.f;
}
EXPORT float fieldX() { return fieldC.x; }
EXPORT float fieldY() { return fieldC.y; }
EXPORT float fieldZ() { return fieldC.z; }
EXPORT float fieldRadius() { return fieldR; }

// ---------------------------------------------------------------------
//  Ray casting
// ---------------------------------------------------------------------
static float raySphere(V3 o, V3 d, V3 c, float r) {  // returns t or -1
  V3 oc = sub(o, c);
  float b = dot(oc, d);
  float cc = dot(oc, oc) - r * r;
  float h = b * b - cc;
  if (h < 0.f) return -1.f;
  h = fsqrt(h);
  float t = -b - h;
  if (t < 0.f) t = -b + h;
  return t >= 0.f ? t : -1.f;
}

struct Hit { int type; int idx; int sub; float t; };  // type: 0 none 1 part 2 wreck 3 rock 4 drone 5 scav

static Hit raycast(V3 o, V3 d, float maxT, bool partsOnlyFree) {
  Hit h = {0, -1, 0, maxT};
  for (int i = 0; i < nParts; i++) {
    float* P = &parts[i * P_N];
    int st = (int)P[P_STATE];
    if (st == PS_CARGO || st == PS_GONE) continue;
    if (partsOnlyFree && st == PS_ATTACHED) continue;
    float t = raySphere(o, d, gv(P, P_POS), P[P_RAD] * 0.85f);
    if (t >= 0 && t < h.t) { h.type = 1; h.idx = i; h.t = t; }
  }
  for (int w = 0; w < nWrecks; w++) {
    float* W = &wrecks[w * W_N];
    if (len(sub(gv(W, W_POS), o)) - W[W_BR] > h.t) continue;
    int sec = 0;
    float t = rayWreck(w, o, d, h.t, &sec);
    if (t >= 0 && t < h.t) { h.type = 2; h.idx = w; h.sub = sec; h.t = t; }
  }
  for (int i = 0; i < nRocks; i++) {
    float* R = &rocks[i * R_N];
    if (R[R_RAD] <= 0.f) continue;
    float t = raySphere(o, d, gv(R, R_POS), R[R_RAD]);
    if (t >= 0 && t < h.t) { h.type = 3; h.idx = i; h.t = t; }
  }
  for (int i = 0; i < nDrones; i++) {
    float* D = &drones[i * D_N];
    if ((int)D[D_STATE] == DS_DEAD) continue;
    float t = raySphere(o, d, gv(D, D_POS), 2.6f);
    if (t >= 0 && t < h.t) { h.type = 4; h.idx = i; h.t = t; }
  }
  return h;
}

// Line-of-sight blocked by a wreck?
static bool blockedByWreck(V3 a, V3 b) {
  V3 d = sub(b, a); float L = len(d); if (L < 1e-3f) return false;
  d = mul(d, 1.f / L);
  for (int w = 0; w < nWrecks; w++) {
    float t = rayWreck(w, a, d, L, 0);
    if (t > 0 && t < L) return true;
  }
  return false;
}

// ---------------------------------------------------------------------
//  Ship helpers
// ---------------------------------------------------------------------
static float shipMass() { return ship[S_DRY] + ship[S_PROP] + ship[S_CARGO]; }
static V3 shipInertia() {
  // box-like distribution; cargo is carried amidships (adds mostly to pitch/yaw)
  float m = shipMass();
  float base = m * 22.f * INERTIA_K;
  return v3(base + ship[S_CARGO] * 18.f, base + ship[S_CARGO] * 18.f, m * 10.f + ship[S_CARGO] * 4.f);
}
static V3 shipNose() { return add(gv(ship, S_POS), qrot(gq(ship, S_QUAT), v3(0, 0, NOSE_Z))); }

static void damageShip(float dmg, V3 at, bool radiatorRisk) {
  if ((int)ship[S_STATE] != 0) return;
  dmg *= 1.f - ship[S_ARMOR];
  ship[S_HULL] -= dmg;
  ship[S_HIT_T] = 0.35f;
  emit(E_IMPACT, at, dmg, 0);
  if (radiatorRisk && ship[S_RAD_DEPLOY] > 0.5f && rnd() < 0.45f) {
    ship[S_RAD_HEALTH] = fmaxf_(0.f, ship[S_RAD_HEALTH] - rrange(0.08f, 0.2f));
    emit(E_RAD_DAMAGE, at, ship[S_RAD_HEALTH], 0);
  }
  if (ship[S_SPOOLING] > 0.5f && dmg > 4.f) {
    ship[S_SPOOLING] = 0; ship[S_SPOOL] = 0;
    emit(E_SPOOL_ABORT, at, 0, 0);
  }
}

static void releaseTether(bool snapped) {
  int tt = (int)ship[S_TETH_TYPE];
  int ti = (int)ship[S_TETH_IDX];
  if (tt == 1 && ti >= 0) {
    float* P = &parts[ti * P_N];
    if ((int)P[P_STATE] == PS_TETHERED) P[P_STATE] = PS_FREE;
  }
  if (snapped) emit(E_TETHER_SNAP, gv(ship, S_HARP_POS), 0, 0);
  ship[S_HARP_STATE] = 0; ship[S_TETH_TYPE] = 0; ship[S_TETH_IDX] = -1; ship[S_TETH_TENSION] = 0;
}

// anchor point of the tether in world space and velocity at that point
static bool tetherAnchor(V3* p, V3* v, float* m) {
  int tt = (int)ship[S_TETH_TYPE];
  int ti = (int)ship[S_TETH_IDX];
  if (tt == 1) {
    float* P = &parts[ti * P_N];
    int st = (int)P[P_STATE];
    if (st == PS_CARGO || st == PS_GONE) return false;
    // still bolted on: it moves with the hulk and has the hulk's inertia
    float pm = st == PS_ATTACHED ? wrecks[(int)P[P_WRECK] * W_N + W_MASS] * 1000.f : P[P_MASS];
    *p = gv(P, P_POS); *v = gv(P, P_VEL); *m = pm; return true;
  } else if (tt == 2) {
    float* W = &wrecks[ti * W_N];
    V3 r = qrot(gq(W, W_QUAT), gv(ship, S_TETH_LOCAL));
    *p = add(gv(W, W_POS), r); *v = add(gv(W, W_VEL), cross(gv(W, W_ANG), r)); *m = W[W_MASS] * 1000.f; return true;
  } else if (tt == 3) {
    float* D = &drones[ti * D_N];
    *p = gv(D, D_POS); *v = gv(D, D_VEL); *m = 9000.f; return true;
  } else if (tt == 4) {
    float* R = &rocks[ti * R_N];
    if (R[R_RAD] <= 0.f) return false;
    *p = gv(R, R_POS); *v = gv(R, R_VEL); *m = R[R_MASS]; return true;
  }
  return false;
}

static void stowPart(int i) {
  float* P = &parts[i * P_N];
  if ((int)P[P_TYPE] == PT_JUMPCELL) {
    P[P_STATE] = PS_GONE;
    ship[S_JF] += 0.38f;
    emit(E_JUMPCELL, gv(P, P_POS), ship[S_JF], (float)i);
    return;
  }
  if ((int)ship[S_CARGO_N] >= MAX_CARGO || ship[S_CARGO] + P[P_MASS] > CARGO_LIMIT) {
    emit(E_CARGO_FULL, gv(P, P_POS), 0, (float)i);
    return;
  }
  P[P_STATE] = PS_CARGO;
  cargo[(int)ship[S_CARGO_N]] = i;
  ship[S_CARGO_N] += 1.f;
  ship[S_CARGO] += P[P_MASS];
  emit(E_STOW, gv(P, P_POS), P[P_MASS], (float)i);
}

// damage a drone; waking it if it slept, and leaving its turret as salvage if it dies
static void hurtDrone(int i, float dmg) {
  float* D = &drones[i * D_N];
  int st = (int)D[D_STATE];
  if (st == DS_DEAD || dmg <= 0.f) return;
  D[D_HP] -= dmg;
  if (st == DS_DORMANT || st == DS_RETURNING) { D[D_STATE] = DS_WAKING; D[D_WAKE] = 1.5f; D[D_SUSP] = 0; emit(E_DRONE_WAKE, gv(D, D_POS), (float)i, 0); }
  if (D[D_HP] <= 0.f && dmg > 0.f) {
    D[D_STATE] = DS_DEAD;
    emit(E_DRONE_DEAD, gv(D, D_POS), (float)i, 0);
    int np = addPart(PT_PDC, 0, v3(0, 0, 0), rquat());
    if (np >= 0) {
      float* P = &parts[np * P_N];
      P[P_STATE] = PS_FREE; P[P_WRECK] = -1;
      sv(P, P_POS, gv(D, D_POS)); sv(P, P_VEL, gv(D, D_VEL)); sq(P, P_QUAT, rquat());
      sv(P, P_ANG, mul(rdir(), 0.3f));
    }
  }
}

static bool edge(int k) { bool e = input[k] > 0.5f && prevEdge[k] <= 0.5f; return e; }

// ---------------------------------------------------------------------
//  Autopilot — the crew flies orders given in the tactical view
// ---------------------------------------------------------------------
// body-frame rate command that turns the nose toward a world direction; returns cos(error)
static float pointNose(Q q, V3 dirWorld, V3* rate, float gain) {
  V3 ft = qinvrot(q, dirWorld);
  V3 axis = v3(-ft.y, ft.x, 0.f);              // (0,0,1) x ft
  float al = len(axis);
  float as = al + al * al * al / 6.f;           // ~asin(al)
  float ang = ft.z >= 0.f ? as : 3.14159f - as;
  if (al > 1e-4f) axis = mul(axis, 1.f / al); else axis = v3(1, 0, 0);
  *rate = mul(axis, clampf(ang * gain, 0.f, 0.9f));
  return ft.z;
}

static bool apTarget(int type, int idx, V3 pos, V3* tp, V3* tv, float* stand) {
  if (type == 1) {
    if (idx < 0 || idx >= nParts) return false;
    float* P = &parts[idx * P_N]; int st = (int)P[P_STATE];
    if (st == PS_CARGO || st == PS_GONE) return false;
    *tp = gv(P, P_POS); *tv = gv(P, P_VEL); *stand = 22.f + P[P_RAD]; return true;
  } else if (type == 2) {
    if (idx < 0 || idx >= nWrecks) return false;
    float* W = &wrecks[idx * W_N];
    // aim for the hull section nearest to us, so we park alongside it
    int ns = (int)W[W_NS]; float best = 1e9f;
    for (int s = 0; s < ns; s++) {
      float r; V3 c = wreckSphereWorld(idx, s, &r);
      float dd = len(sub(c, pos)) - r;
      if (dd < best) { best = dd; *tp = c; *stand = r * 0.9f + 28.f; }
    }
    V3 rc = sub(*tp, gv(W, W_POS));
    *tv = add(gv(W, W_VEL), cross(gv(W, W_ANG), rc));
    return true;
  } else if (type == 3) {
    if (idx < 0 || idx >= nDrones) return false;
    float* D = &drones[idx * D_N];
    *tp = gv(D, D_POS); *tv = gv(D, D_VEL); *stand = 60.f; return true;
  } else if (type == 4) {
    if (idx < 0 || idx >= nScavs) return false;
    float* C = &scavs[idx * C_N];
    *tp = gv(C, C_POS); *tv = gv(C, C_VEL); *stand = 90.f; return true;
  }
  return false;
}

// returns true when the autopilot is in control this step
static bool autopilot(Q q, V3 pos, V3 vel, float mass, bool cold, float* mainT, V3* rcs, V3* rate) {
  int mode = (int)input[I_AP_MODE];
  int serial = (int)input[I_AP_SERIAL];
  if (serial != apSerial) { apSerial = serial; ship[S_AP_STATE] = mode ? 1.f : 0.f; ship[S_AP_BURN] = 0; }
  if (mode == 0) { ship[S_AP_STATE] = 0; return false; }
  bool quiet = input[I_AP_QUIET] > 0.5f || cold;
  V3 tp = pos, tv = v3(0, 0, 0); float stand = 0.f;
  if (mode == 1 || mode == 2) {
    if (!apTarget((int)input[I_AP_TYPE], (int)input[I_AP_IDX], pos, &tp, &tv, &stand)) {
      input[I_AP_MODE] = 0; ship[S_AP_STATE] = 0; emit(E_AP_CANCEL, pos, 1, 0); return false;
    }
  }
  V3 rel = sub(tp, pos); float d = len(rel);
  V3 n = d > 1e-3f ? mul(rel, 1.f / d) : qrot(q, v3(0, 0, 1));
  V3 vrel = sub(vel, tv);
  float aRcs = F_RCS / mass, aMain = F_MAIN / mass;
  float goal = d - stand;
  V3 vdes = v3(0, 0, 0);
  if (mode == 1 && ship[S_AP_STATE] < 1.5f) {
    // fly a braking profile: never faster than we can stop in the remaining distance
    // a fast approach must also budget the seconds it takes to flip end-over-end before braking
    float a = quiet ? aRcs * 0.6f : aMain * 0.5f;
    float tf = quiet ? 0.5f : 5.0f;
    float vmax = quiet ? 10.f : 45.f;
    float vstop = goal > 0.f ? a * (-tf + fsqrt(tf * tf + 2.f * goal / a)) : 0.f;
    float sp = goal > 0.f ? fminf_(vmax, vstop) : fmaxf_(-3.f, goal * 0.25f);
    vdes = mul(n, sp);
    if (fabsf_(goal) < 6.f && len(vrel) < 0.7f) { ship[S_AP_STATE] = 2.f; emit(E_AP_ARRIVED, pos, (float)input[I_AP_TYPE], (float)input[I_AP_IDX]); }
  } else if (mode == 1) {
    vdes = mul(n, clampf(goal * 0.15f, -1.5f, 1.5f));   // hold station at the stand-off
  }
  if (mode == 3 && len(vrel) < 0.3f && ship[S_AP_STATE] < 1.5f) { ship[S_AP_STATE] = 2.f; emit(E_AP_ARRIVED, pos, 0, -1); }
  V3 dv = sub(vdes, vrel);
  float dvl = len(dv);
  V3 dvb = qinvrot(q, dv);
  *mainT = 0.f; *rcs = v3(0, 0, 0);
  bool burning = ship[S_AP_BURN] > 0.5f;
  if (!quiet && (dvl > 4.f || (burning && dvl > 1.0f))) {
    ship[S_AP_BURN] = 1.f;
    float c = pointNose(q, mul(dv, 1.f / dvl), rate, 1.6f);
    if (c > 0.985f) *mainT = clampf(dvl / 6.f, 0.08f, 1.f);
    else *rcs = v3(clampf(dvb.x / (aRcs * 0.5f), -1, 1), clampf(dvb.y / (aRcs * 0.5f), -1, 1), 0.f);
  } else {
    ship[S_AP_BURN] = 0.f;
    float k = aRcs * 0.45f;
    *rcs = v3(clampf(dvb.x / k, -1, 1), clampf(dvb.y / k, -1, 1), clampf(dvb.z / k, -1, 1));
    if (mode == 1 || mode == 2) pointNose(q, n, rate, 1.2f);   // face the target, ready to cut
    else *rate = v3(0, 0, 0);
  }
  ship[S_AP_GOAL] = mode == 1 ? goal : 0.f;
  ship[S_AP_VREL] = len(vrel);
  return true;
}


// ---------------------------------------------------------------------
//  Weapons: point defense (automatic) and coilgun (fired along the nose)
// ---------------------------------------------------------------------
static float pdAcc = 0.f;
static void updateWeapons(float dt, bool alive, bool cold) {
  Q q = gq(ship, S_QUAT);
  V3 pos = gv(ship, S_POS), vel = gv(ship, S_VEL);
  float mass = ship[S_DRY] + ship[S_PROP] + ship[S_CARGO];
  if (ship[S_COIL_FLASH] > 0.f) ship[S_COIL_FLASH] -= dt;
  if (ship[S_COIL_CD] > 0.f) ship[S_COIL_CD] -= dt;
  if (alive && edge(I_PD) && ship[S_PDC_N] > 0.5f) { ship[S_PD_ON] = ship[S_PD_ON] > 0.5f ? 0.f : 1.f; emit(E_PD_TOGGLE, pos, ship[S_PD_ON], 0); }
  // coilgun
  int coilN = (int)ship[S_COIL_N];
  if (alive && edge(I_FIRE)) {
    if (coilN <= 0) emit(E_COIL_FIRE, pos, -3, 0);
    else if (cold) emit(E_COIL_FIRE, pos, -1, 0);
    else if (ship[S_COIL_CD] > 0.f) emit(E_COIL_FIRE, pos, -2, ship[S_COIL_CD]);
    else {
      V3 dir = qrot(q, v3(0, 0, 1)), side = qrot(q, v3(1, 0, 0));
      V3 nose = shipNose();
      for (int k = 0; k < coilN; k++) {
        V3 from = add(nose, mul(side, (k - (coilN - 1) * 0.5f) * 2.5f));
        spawnSlug(from, add(vel, mul(dir, 2500.f)), 2.5f, 1, 2, 60.f);
      }
      // 20 kg slugs at 2.5 km/s: real recoil, and a pulse of waste heat
      vel = sub(vel, mul(dir, 20.f * 2500.f * coilN / mass));
      sv(ship, S_VEL, vel);
      ship[S_BUS_T] += 4.0e6f * coilN / BUS_C;
      ship[S_COIL_CD] = COIL_RELOAD; ship[S_COIL_FLASH] = 1.5f;
      emit(E_COIL_FIRE, nose, (float)coilN, 0);
    }
  }
  // point defense
  ship[S_PD_FIRING] = 0.f; ship[S_PD_TGT] = -1.f;
  int pdcN = (int)ship[S_PDC_N];
  if (!alive || pdcN <= 0 || ship[S_PD_ON] < 0.5f || cold) { pdAcc = 0.f; return; }
  bool engaged = false;
  // 1. incoming slugs inside 320 m are shot down first
  for (int i = 0; i < MAX_SLUGS; i++) {
    float* G = &slugs[i * G_N];
    if (G[G_ACTIVE] < 0.5f || G[G_OWNER] > 0.5f) continue;
    V3 rel = sub(gv(G, G_POS), pos); float d = len(rel);
    if (d > 280.f || d < 1.f) continue;
    float closing = -dot(sub(gv(G, G_VEL), vel), mul(rel, 1.f / d));
    if (closing < 40.f) continue;
    engaged = true;
    if (rnd() < 1.f - 1.f / (1.f + pdcN * 0.55f * dt)) {
      G[G_ACTIVE] = 0.f;
      ship[S_INTERCEPTS] += 1.f;
      emit(E_INTERCEPT, gv(G, G_POS), 0, 0);
      V3 dn = mul(rel, 1.f / d);
      spawnSlug(add(pos, mul(dn, SHIP_RADIUS)), add(vel, mul(dn, 900.f)), d / 900.f, 1, 1, 0.f);
    }
  }
  // 2. otherwise engage the nearest awake drone we can see
  int tgt = -1; float best = 700.f;
  if (!engaged) {
    for (int d = 0; d < nDrones; d++) {
      float* D = &drones[d * D_N];
      int st = (int)D[D_STATE];
      if (st != DS_HUNTING && st != DS_SEARCHING && st != DS_WAKING) continue;
      float dist = len(sub(gv(D, D_POS), pos));
      if (dist < best && !blockedByWreck(pos, gv(D, D_POS))) { best = dist; tgt = d; }
    }
  }
  if (tgt >= 0) {
    float* D = &drones[tgt * D_N];
    V3 toT = sub(gv(D, D_POS), pos), relV = sub(gv(D, D_VEL), vel);
    float sp = 900.f, a = dot(relV, relV) - sp * sp, b = 2.f * dot(toT, relV), c = dot(toT, toT);
    float t = len(toT) / sp, disc = b * b - 4.f * a * c;
    if (disc > 0.f && fabsf_(a) > 1e-3f) { float sq2 = fsqrt(disc); float t1 = (-b - sq2) / (2.f * a), t2 = (-b + sq2) / (2.f * a); t = t1 > 0 ? t1 : t2; if (t < 0) t = len(toT) / sp; }
    V3 aim = norm(add(toT, mul(relV, t)));
    pdAcc += dt * 5.f * pdcN;
    while (pdAcc >= 1.f) {
      pdAcc -= 1.f;
      V3 dir = norm(add(aim, mul(rdir(), 0.009f)));
      spawnSlug(add(pos, mul(dir, SHIP_RADIUS + 1.f)), add(vel, mul(dir, sp)), 1.6f, 1, 1, 1.6f);
    }
    engaged = true;
    ship[S_PD_TGT] = (float)tgt;
  } else pdAcc = 0.f;
  if (engaged) { ship[S_PD_FIRING] = 1.f; emit(E_PD_FIRE, pos, (float)tgt, 0); }
}

// ---------------------------------------------------------------------
//  Ship update
// ---------------------------------------------------------------------
static void updateShip(float dt) {
  int state = (int)ship[S_STATE];
  Q q = gq(ship, S_QUAT);
  V3 pos = gv(ship, S_POS), vel = gv(ship, S_VEL), w = gv(ship, S_ANG);
  float mass = shipMass();
  V3 I = shipInertia();
  bool alive = state == 0;
  bool cold = ship[S_COLD] > 0.5f;

  // ----- toggles
  if (alive) {
    if (edge(I_RAD)) { ship[S_RAD_TARGET] = ship[S_RAD_TARGET] > 0.5f ? 0.f : 1.f; emit(E_RAD_TOGGLE, pos, ship[S_RAD_TARGET], 0); }
    if (edge(I_COLD)) {
      ship[S_COLD] = cold ? 0.f : 1.f; cold = !cold;
      emit(cold ? E_COLD_ON : E_COLD_OFF, pos, 0, 0);
      if (cold && ship[S_SPOOLING] > 0.5f) { ship[S_SPOOLING] = 0; ship[S_SPOOL] = 0; emit(E_SPOOL_ABORT, pos, 0, 0); }
    }
    if (edge(I_EJECT) && ship[S_CARGO_N] > 0.5f) {
      int n = (int)ship[S_CARGO_N] - 1;
      int pi = cargo[n];
      float* P = &parts[pi * P_N];
      P[P_STATE] = PS_FREE;
      V3 out = qrot(q, v3(0, -1, 0));
      sv(P, P_POS, add(pos, mul(out, 9.f)));
      sv(P, P_VEL, add(vel, mul(out, 1.5f)));
      sv(P, P_ANG, mul(rdir(), 0.2f));
      ship[S_CARGO] -= P[P_MASS]; if (ship[S_CARGO] < 0) ship[S_CARGO] = 0;
      ship[S_CARGO_N] = (float)n;
      emit(E_EJECT, pos, P[P_MASS], (float)pi);
    }
  }
  ship[S_RAD_DEPLOY] += clampf(ship[S_RAD_TARGET] - ship[S_RAD_DEPLOY], -dt * 0.5f, dt * 0.5f);

  // ----- translation command (body frame)
  float thr = alive ? clampf(input[I_THRUST], -1.f, 1.f) : 0.f;
  float sx = alive ? clampf(input[I_SX], -1.f, 1.f) : 0.f;
  float sy = alive ? clampf(input[I_SY], -1.f, 1.f) : 0.f;
  V3 fBody = v3(0, 0, 0);
  float mainThrottle = 0.f;
  V3 rcsCmd = v3(0, 0, 0);
  bool hasProp = ship[S_PROP] > 1.f;

  bool flipBurn = false;
  V3 flipRate = v3(0, 0, 0);
  bool apOn = false;
  if (alive && hasProp) apOn = autopilot(q, pos, vel, mass, cold, &mainThrottle, &rcsCmd, &flipRate);
  if (apOn) {
    flipBurn = true;   // rate controller on, manual stick ignored
  } else if (alive && input[I_KILLV] > 0.5f && hasProp) {
    // "flip and burn": point the main drive retrograde, burn, trim residual with RCS
    float spd = len(vel);
    V3 vb = qinvrot(q, vel);
    float maxRcsA = F_RCS / mass;
    if (spd > 3.f && !cold) {
      flipBurn = true;
      V3 ft = qinvrot(q, mul(vel, -1.f / spd));       // desired nose direction, body frame
      V3 axis = v3(-ft.y, ft.x, 0.f);                  // (0,0,1) x ft
      float al = len(axis);
      float ang = ft.z > 0.999f ? 0.f : (ft.z < -0.999f ? 3.14159f : 0.f);
      if (al > 1e-4f) { ang = al; if (ft.z < 0.f) ang = 3.14159f - al; axis = mul(axis, 1.f / al); }
      else axis = v3(1, 0, 0);
      float rate = clampf(ang * 1.6f, 0.f, 0.9f);
      flipRate = mul(axis, rate);
      if (ft.z > 0.985f) mainThrottle = clampf(spd / 7.f, 0.05f, 1.f);
      // trim lateral drift
      rcsCmd = v3(clampf(-vb.x / 0.3f / maxRcsA, -1, 1), clampf(-vb.y / 0.3f / maxRcsA, -1, 1), 0.f);
      if (ft.z > 0.985f) rcsCmd = v3(0, 0, 0);
    } else {
      V3 want = mul(vb, -1.f / 0.3f);
      rcsCmd = v3(clampf(want.x / maxRcsA, -1, 1), clampf(want.y / maxRcsA, -1, 1), clampf(want.z / maxRcsA, -1, 1));
    }
  } else {
    if (thr > 0.f && !cold) mainThrottle = thr;
    else if (thr < 0.f) rcsCmd.z = thr;
    else if (thr > 0.f && cold) rcsCmd.z = thr * 0.6f;  // cold: RCS only, gentle
    rcsCmd.x = -sx; rcsCmd.y = sy;
  }
  if (!hasProp) { mainThrottle = 0; rcsCmd = v3(0, 0, 0); }
  if (cold) mainThrottle = 0.f;
  fBody = add(fBody, v3(rcsCmd.x * F_RCS, rcsCmd.y * F_RCS, rcsCmd.z * F_RCS + mainThrottle * F_MAIN));

  // ----- rotation (flight assist = rate controller; off = raw torque)
  float maxRate = 0.9f;
  V3 cmdRate = v3(-input[I_PITCH] * maxRate, -input[I_YAW] * maxRate, input[I_ROLL] * maxRate * 1.2f);
  if (flipBurn) cmdRate = flipRate;
  if (!alive) cmdRate = v3(0, 0, 0);
  V3 tq = v3(0, 0, 0);
  float maxT = F_RCS * RCS_ARM;
  if (alive && hasProp) {
    if (input[I_ASSIST] > 0.5f || flipBurn) {
      V3 err = sub(cmdRate, w);
      tq = v3(clampf(err.x * I.x * 6.f, -maxT, maxT), clampf(err.y * I.y * 6.f, -maxT, maxT), clampf(err.z * I.z * 6.f, -maxT, maxT));
    } else {
      tq = v3(clampf(cmdRate.x / maxRate, -1, 1) * maxT, clampf(cmdRate.y / maxRate, -1, 1) * maxT, clampf(cmdRate.z / maxRate, -1, 1) * maxT);
    }
  }
  float rcsUse = (fabsf_(rcsCmd.x) + fabsf_(rcsCmd.y) + fabsf_(rcsCmd.z)) + (fabsf_(tq.x) + fabsf_(tq.y) + fabsf_(tq.z)) / maxT * 0.5f;

  // propellant flow
  float mdot = mainThrottle * F_MAIN / (ISP_MAIN * G0) + rcsUse * F_RCS / (ISP_RCS * G0);
  ship[S_PROP] = fmaxf_(0.f, ship[S_PROP] - mdot * dt);
  ship[S_THROTTLE] = mainThrottle;
  sv(ship, S_RCS, rcsCmd);

  V3 force = qrot(q, fBody);

  // ----- harpoon & tether
  if (alive && edge(I_HARPOON)) {
    if ((int)ship[S_HARP_STATE] == 0) {
      ship[S_HARP_STATE] = 1;
      V3 dir = qrot(q, v3(0, 0, 1));
      sv(ship, S_HARP_POS, shipNose());
      sv(ship, S_HARP_VEL, add(vel, mul(dir, HARPOON_SPEED)));
      // recoil
      vel = sub(vel, mul(dir, 120.f * HARPOON_SPEED / mass));
    } else {
      releaseTether(false);
    }
  }
  int hs = (int)ship[S_HARP_STATE];
  if (hs == 1) {
    V3 hp = gv(ship, S_HARP_POS), hv = gv(ship, S_HARP_VEL);
    V3 step = mul(hv, dt);
    float sl = len(step);
    Hit h = raycast(hp, mul(step, 1.f / fmaxf_(sl, 1e-5f)), sl, false);
    if (h.type == 1 || h.type == 2 || h.type == 3 || h.type == 4) {
      V3 at = add(hp, mul(norm(step), h.t));
      ship[S_HARP_STATE] = 2;
      if (h.type == 1) {
        float* P = &parts[h.idx * P_N];
        if ((int)P[P_STATE] == PS_ATTACHED) {
          // hooked into a part that is still bolted on: the line stays on the part,
          // so when the laser cuts it free it is already on the winch
          ship[S_TETH_TYPE] = 1; ship[S_TETH_IDX] = (float)h.idx;
        } else {
          ship[S_TETH_TYPE] = 1; ship[S_TETH_IDX] = (float)h.idx; P[P_STATE] = PS_TETHERED;
        }
      } else if (h.type == 2) {
        float* W = &wrecks[h.idx * W_N];
        ship[S_TETH_TYPE] = 2; ship[S_TETH_IDX] = (float)h.idx;
        sv(ship, S_TETH_LOCAL, qinvrot(gq(W, W_QUAT), sub(at, gv(W, W_POS))));
      } else if (h.type == 3) {
        ship[S_TETH_TYPE] = 4; ship[S_TETH_IDX] = (float)h.idx;   // a loose hull fragment: scrap
      } else {
        ship[S_TETH_TYPE] = 3; ship[S_TETH_IDX] = (float)h.idx;
      }
      // slack length is measured to the point the line is actually tied to
      { V3 ap0, av0; float am0; ship[S_TETH_REST] = tetherAnchor(&ap0, &av0, &am0) ? len(sub(ap0, shipNose())) : len(sub(at, shipNose())); }
      emit(E_HARPOON_HIT, at, (float)h.type, (float)h.idx);
    } else {
      sv(ship, S_HARP_POS, add(hp, step));
      if (len(sub(add(hp, step), pos)) > HARPOON_RANGE) { emit(E_HARPOON_MISS, hp, 0, 0); ship[S_HARP_STATE] = 0; }
    }
  } else if (hs == 2) {
    V3 ap, av; float am;
    if (!tetherAnchor(&ap, &av, &am)) releaseTether(false);
    else {
      int tt = (int)ship[S_TETH_TYPE];
      if (tt == 3 && (int)drones[(int)ship[S_TETH_IDX] * D_N + D_STATE] == DS_DEAD) { releaseTether(false); }
      else {
        sv(ship, S_HARP_POS, ap);
        V3 nose = shipNose();
        V3 d = sub(ap, nose);
        float L = len(d);
        ship[S_TETH_LEN] = L;
        V3 n = L > 1e-3f ? mul(d, 1.f / L) : qrot(q, v3(0, 0, 1));
        V3 vShipNose = add(vel, qrot(q, cross(w, v3(0, 0, NOSE_Z))));
        float relv = dot(sub(av, vShipNose), n);          // > 0: separating
        float mu = (mass * am) / (mass + am);
        bool partOnLine = tt == 1 && (int)parts[(int)ship[S_TETH_IDX] * P_N + P_STATE] != PS_ATTACHED;
        bool scrapOnLine = tt == 4 && am <= SCRAP_MAX;
        float tension = 0.f;
        bool reel = input[I_REEL] > 0.5f && alive;
        if (reel) {
          // powered winch: regulate the closing speed, slowing as the load comes in
          float want = -fminf_(6.f, 0.8f + L * 0.3f);
          tension = mu * (relv - want) * 3.f;
          // the cargo arm can brake a load that comes in too fast, but only close aboard
          float lo = ((partOnLine || scrapOnLine) && L < 25.f + SHIP_RADIUS) ? -WINCH_MAX * 0.4f : 0.f;
          tension = clampf(tension, lo, WINCH_MAX);
          ship[S_TETH_REST] = L;
        } else {
          if (input[I_PAYOUT] > 0.5f && alive) ship[S_TETH_REST] = fminf_(HARPOON_RANGE, ship[S_TETH_REST] + 10.f * dt);
          float ext = L - ship[S_TETH_REST];
          if (ext > 0.f) {
            // braked line: stiffness and critical damping scale with the reduced mass, so it holds without bouncing
            float k = mu * 1.5f, c = 2.f * fsqrt(k * mu);
            tension = k * ext + c * relv;
            if (tension < 0.f) tension = 0.f;
            float tMax = fminf_(mu * 20.f, TETHER_BREAK * 1.2f);
            if (tension > tMax) tension = tMax;
          }
        }
        if (tension != 0.f && L > 1e-3f) {
          V3 F = mul(n, tension);
          force = add(force, F);
          tq = add(tq, cross(v3(0, 0, NOSE_Z), qinvrot(q, F)));
          // reaction on the anchor (a bolted part moves with its hulk)
          if (partOnLine) {
            float* P = &parts[(int)ship[S_TETH_IDX] * P_N];
            sv(P, P_VEL, sub(gv(P, P_VEL), mul(F, dt / P[P_MASS])));
          } else if (tt == 3) {
            float* D = &drones[(int)ship[S_TETH_IDX] * D_N];
            sv(D, D_VEL, sub(gv(D, D_VEL), mul(F, dt / 9000.f)));
          } else if (tt == 4) {
            float* Rk = &rocks[(int)ship[S_TETH_IDX] * R_N];
            sv(Rk, R_VEL, sub(gv(Rk, R_VEL), mul(F, dt / Rk[R_MASS])));
          }
          if (tension > TETHER_BREAK) releaseTether(true);
        }
        ship[S_TETH_TENSION] = tension > 0.f ? tension : 0.f;
        // a scrap fragment reeled aboard goes into the hold as raw tonnage
        if (scrapOnLine && (int)ship[S_HARP_STATE] == 2) {
          int ri = (int)ship[S_TETH_IDX];
          float* Rk = &rocks[ri * R_N];
          if (L < 3.f + SHIP_RADIUS + Rk[R_RAD] && len(sub(gv(Rk, R_VEL), vel)) < 12.f) {
            ship[S_HARP_STATE] = 0; ship[S_TETH_TYPE] = 0; ship[S_TETH_IDX] = -1;
            if (ship[S_CARGO] + Rk[R_MASS] > CARGO_LIMIT) emit(E_CARGO_FULL, gv(Rk, R_POS), 0, -1);
            else {
              ship[S_SCRAP] += Rk[R_MASS]; ship[S_CARGO] += Rk[R_MASS];
              emit(E_SCRAP, gv(Rk, R_POS), Rk[R_MASS], ship[S_SCRAP]);
              Rk[R_RAD] = 0.f; sv(Rk, R_POS, v3(1e7f, 1e7f, 1e7f)); sv(Rk, R_VEL, v3(0, 0, 0));
            }
          }
        }
        // cargo clamps take a loose part once it is close aboard
        if (partOnLine && (int)ship[S_HARP_STATE] == 2) {
          int pi = (int)ship[S_TETH_IDX];
          float* P = &parts[pi * P_N];
          if (L < 3.f + SHIP_RADIUS + P[P_RAD] && len(sub(gv(P, P_VEL), vel)) < 12.f) {
            ship[S_HARP_STATE] = 0; ship[S_TETH_TYPE] = 0; ship[S_TETH_IDX] = -1;
            P[P_STATE] = PS_FREE;
            stowPart(pi);
          }
        }
      }
    }
  }

  // ----- cutting laser
  ship[S_LASER_ON] = 0; ship[S_LASER_TYPE] = 0; ship[S_LASER_IDX] = -1; ship[S_CUT] = 0;
  bool laserOverheated = ship[S_LASER_LOCK] > 0.5f;
  if (ship[S_LASER_T] > LASER_OVERHEAT && !laserOverheated) { ship[S_LASER_LOCK] = 1; laserOverheated = true; emit(E_OVERHEAT, shipNose(), 0, 0); }
  if (laserOverheated && ship[S_LASER_T] < LASER_RESET) ship[S_LASER_LOCK] = 0;
  float laserHeat = 0.f;
  if (alive && input[I_LASER] > 0.5f && !cold && !laserOverheated) {
    ship[S_LASER_ON] = 1;
    laserHeat = LASER_P;
    V3 o = shipNose(), d = qrot(q, v3(0, 0, 1));
    Hit h = raycast(o, d, LASER_RANGE, false);
    ship[S_LASER_DIST] = h.type ? h.t : LASER_RANGE;
    ship[S_LASER_TYPE] = (float)h.type;
    ship[S_LASER_IDX] = (float)h.idx;
    V3 at = add(o, mul(d, h.t));
    // power falls off with distance (beam divergence)
    float eff = clampf(1.15f - h.t / LASER_RANGE, 0.2f, 1.f);
    if (h.type == 1) {
      float* P = &parts[h.idx * P_N];
      P[P_HEAT] = fminf_(1.f, P[P_HEAT] + dt * 1.2f);
      if ((int)P[P_STATE] == PS_ATTACHED) {
        P[P_CUT] += dt * eff * LASER_MUL / P[P_CUTTIME];
        ship[S_CUT] = P[P_CUT];
        if (P[P_CUT] >= 1.f) {
          bool onLine = (int)ship[S_HARP_STATE] == 2 && (int)ship[S_TETH_TYPE] == 1 && (int)ship[S_TETH_IDX] == h.idx;
          P[P_STATE] = onLine ? PS_TETHERED : PS_FREE; P[P_CUT] = 1.f;
          int wi = (int)P[P_WRECK];
          V3 outw = qrot(gq(&wrecks[wi * W_N], W_QUAT), qrot(gq(P, P_LQUAT), v3(0, 1, 0)));
          sv(P, P_VEL, add(gv(P, P_VEL), mul(outw, rrange(0.4f, 1.2f))));
          sv(P, P_ANG, mul(rdir(), rrange(0.05f, 0.3f)));
          emit(E_DETACH, gv(P, P_POS), (float)P[P_TYPE], (float)h.idx);
        }
      } else {
        // ablation recoil: a few MW of beam lifts vapour off the surface, ~3·10⁻⁵ N per W
        sv(P, P_VEL, add(gv(P, P_VEL), mul(d, LASER_ABLATION_N * eff * LASER_MUL * dt / P[P_MASS])));
      }
    } else if (h.type == 4) {
      hurtDrone(h.idx, 22.f * eff * dt);
    }
    if (h.type) emit(E_SPARK, at, (float)h.type, eff);
  }

  // ----- jump drive
  float spoolHeat = 0.f;
  ship[S_MASS] = shipMass();
  ship[S_JCOST] = jumpCost(ship[S_MASS]);
  if (alive && edge(I_JUMP)) {
    if (ship[S_SPOOLING] > 0.5f) { ship[S_SPOOLING] = 0; ship[S_SPOOL] = 0; emit(E_SPOOL_ABORT, pos, 0, 0); }
    else if (cold) { emit(E_SPOOL_ABORT, pos, 1, 0); }
    else if (ship[S_JF] < ship[S_JCOST]) emit(E_NO_FUEL, pos, ship[S_JF], ship[S_JCOST]);
    else { ship[S_SPOOLING] = 1; ship[S_SPOOL] = 0; emit(E_SPOOL_START, pos, 0, 0); }
  }
  if (alive && ship[S_SPOOLING] > 0.5f) {
    if (ship[S_JF] < ship[S_JCOST]) { ship[S_SPOOLING] = 0; ship[S_SPOOL] = 0; emit(E_NO_FUEL, pos, ship[S_JF], ship[S_JCOST]); }
    else {
      spoolHeat = P_SPOOL;
      ship[S_SPOOL] += dt / SPOOL_TIME;
      if (ship[S_SPOOL] >= 1.f) {
        ship[S_SPOOL] = 1.f; ship[S_SPOOLING] = 0;
        ship[S_JF] -= ship[S_JCOST];
        ship[S_STATE] = 2;  // extracted
        if ((int)ship[S_HARP_STATE] != 0) releaseTether(false);
        emit(E_EXTRACTED, pos, 0, 0);
      }
    }
  }

  // ----- thermal model:  C dT/dt = P_in - Kr (T^4 - Tenv^4)
  ship[S_SHADOW] = blockedByWreck(pos, add(pos, mul(sunDir, 3000.f))) ? 1.f : 0.f;
  float pReactor = cold ? P_REACTOR_COLD : P_REACTOR;
  float pWeapons = ship[S_PD_FIRING] > 0.5f ? 0.6e6f * ship[S_PDC_N] : 0.f;
  float pIn = pReactor + pWeapons + mainThrottle * P_DRIVE_WASTE + rcsUse * P_RCS_WASTE + spoolHeat
              + (ship[S_SHADOW] > 0.5f ? 0.f : P_SOLAR);
  float Tl = ship[S_LASER_T], Tb = ship[S_BUS_T];
  float qCond = LASER_K * (Tl - Tb);
  Tl += (laserHeat - qCond) / LASER_C * dt;
  float kr = KR_RETRACTED + (KR_DEPLOYED - KR_RETRACTED) * ship[S_RAD_DEPLOY] * ship[S_RAD_HEALTH];
  float T4 = Tb * Tb * Tb * Tb - T_ENV * T_ENV * T_ENV * T_ENV;
  float pRad = kr * T4;
  Tb += (pIn + qCond - pRad) / BUS_C * dt;
  ship[S_LASER_T] = fmaxf_(T_ENV, Tl);
  ship[S_BUS_T] = fmaxf_(T_ENV, Tb);
  ship[S_PRAD] = pRad;
  ship[S_PIN] = pIn;
  if (alive && ship[S_BUS_T] > BUS_DAMAGE_T) {
    ship[S_HULL] -= (ship[S_BUS_T] - BUS_DAMAGE_T) * 0.02f * dt;
    ship[S_CREW] -= (ship[S_BUS_T] - BUS_DAMAGE_T) * 0.03f * dt;
  }

  // ----- infrared signature (MW-equivalent):
  // radiated waste heat + drive plume (dominant) + laser glare + jump spool
  float sig = (pRad / 1.0e6f) * SIG_MUL + mainThrottle * 30.f * fsqrt(F_MAIN / 420000.f) + (ship[S_LASER_ON] > 0.5f ? 1.f : 0.f) + (ship[S_SPOOLING] > 0.5f ? 18.f : 0.f)
              + (ship[S_PD_FIRING] > 0.5f ? 2.5f : 0.f) + (ship[S_COIL_FLASH] > 0.f ? 12.f : 0.f);
  ship[S_SIG] = sig;
  ship[S_DETECT_R] = fsqrt(WAKE_K * sig);
  ship[S_TRACK_R] = fsqrt(TRACK_K * sig);

  // ----- integrate
  V3 acc = mul(force, 1.f / mass);
  vel = add(vel, mul(acc, dt));
  pos = add(pos, mul(vel, dt));
  V3 alpha = v3(tq.x / I.x, tq.y / I.y, tq.z / I.z);
  w = add(w, mul(alpha, dt));
  q = qintBody(q, w, dt);
  sv(ship, S_POS, pos); sv(ship, S_VEL, vel); sv(ship, S_ANG, w); sq(ship, S_QUAT, q);
  sv(ship, S_ANG_TARGET, cmdRate);

  // ----- collisions with wrecks
  for (int wi = 0; wi < nWrecks; wi++) {
    float* W = &wrecks[wi * W_N];
    if (len(sub(gv(W, W_POS), pos)) > W[W_BR] + SHIP_RADIUS + 5.f) continue;
    {
      // the ship is a sphere of SHIP_RADIUS·0.8 against the true hull shape
      V3 n; float dist = wreckDist(wi, pos, &n, 0);
      float pen = SHIP_RADIUS * 0.8f - dist;
      if (pen > 0.f) {
        V3 rc = sub(pos, gv(W, W_POS));
        V3 vw = add(gv(W, W_VEL), cross(gv(W, W_ANG), rc));
        V3 rv = sub(gv(ship, S_VEL), vw);
        float vn = dot(rv, n);
        pos = add(pos, mul(n, pen));
        if (vn < 0.f) {
          V3 nv = sub(rv, mul(n, 1.25f * vn));
          nv = add(mul(sub(nv, mul(n, dot(nv, n))), 0.7f), mul(n, dot(nv, n)));
          sv(ship, S_VEL, add(vw, nv));
          float imp = -vn;
          if (imp > 2.5f) damageShip((imp - 2.5f) * 4.f, sub(pos, mul(n, SHIP_RADIUS)), true);
          // tumble from the impact
          V3 wb = gv(ship, S_ANG);
          sv(ship, S_ANG, add(wb, mul(rdir(), imp * 0.02f)));
        }
        sv(ship, S_POS, pos);
      }
    }
  }
  // ----- collisions with debris
  pos = gv(ship, S_POS);
  for (int i = 0; i < nRocks; i++) {
    float* R = &rocks[i * R_N];
    V3 rp = gv(R, R_POS);
    V3 d = sub(pos, rp);
    float rr = R[R_RAD] + SHIP_RADIUS * 0.8f;
    float dl2 = dot(d, d);
    if (dl2 > rr * rr) continue;
    float dl = fsqrt(dl2); if (dl < 1e-4f) continue;
    V3 n = mul(d, 1.f / dl);
    V3 rv = sub(gv(ship, S_VEL), gv(R, R_VEL));
    float vn = dot(rv, n);
    float m1 = shipMass(), m2 = R[R_MASS];
    pos = add(pos, mul(n, (rr - dl) * m2 / (m1 + m2)));
    sv(R, R_POS, sub(rp, mul(n, (rr - dl) * m1 / (m1 + m2))));
    if (vn < 0.f) {
      float e = 0.3f;
      float j = -(1.f + e) * vn / (1.f / m1 + 1.f / m2);
      sv(ship, S_VEL, add(gv(ship, S_VEL), mul(n, j / m1)));
      sv(R, R_VEL, sub(gv(R, R_VEL), mul(n, j / m2)));
      float ke = 0.5f * (m1 * m2 / (m1 + m2)) * vn * vn;
      float dmg = ke / 45000.f;
      if (dmg > 0.4f) damageShip(dmg, sub(pos, mul(n, SHIP_RADIUS * 0.8f)), true);
      sv(ship, S_ANG, add(gv(ship, S_ANG), mul(rdir(), fminf_(0.4f, fsqrt(ke) * 0.00006f))));
    }
  }
  sv(ship, S_POS, pos);

  // ----- crew & hull death checks
  if (alive) {
    if (ship[S_HULL] <= 0.f) { ship[S_HULL] = 0; ship[S_STATE] = 1; ship[S_DEATH] = 1; emit(E_DIED, pos, 1, 0); releaseTether(false); }
    else if (ship[S_CREW] <= 0.f) { ship[S_CREW] = 0; ship[S_STATE] = 1; ship[S_DEATH] = 2; emit(E_DIED, pos, 2, 0); releaseTether(false); }

  }
  if (ship[S_HIT_T] > 0.f) ship[S_HIT_T] -= dt;
  updateWeapons(dt, (int)ship[S_STATE] == 0, ship[S_COLD] > 0.5f);
}

// ---------------------------------------------------------------------
//  World update
// ---------------------------------------------------------------------
static void updateWrecks(float dt) {
  for (int i = 0; i < nWrecks; i++) {
    float* W = &wrecks[i * W_N];
    sv(W, W_POS, add(gv(W, W_POS), mul(gv(W, W_VEL), dt)));
    sq(W, W_QUAT, qintWorld(gq(W, W_QUAT), gv(W, W_ANG), dt));
  }
  placeParts();
}

static void updateParts(float dt) {
  for (int i = 0; i < nParts; i++) {
    float* P = &parts[i * P_N];
    int st = (int)P[P_STATE];
    if (P[P_HEAT] > 0.f) P[P_HEAT] = fmaxf_(0.f, P[P_HEAT] - dt * 0.35f);
    if (st != PS_FREE && st != PS_TETHERED) continue;
    V3 p = add(gv(P, P_POS), mul(gv(P, P_VEL), dt));
    sq(P, P_QUAT, qintWorld(gq(P, P_QUAT), gv(P, P_ANG), dt));
    // bump off wrecks
    for (int w = 0; w < nWrecks; w++) {
      float* W = &wrecks[w * W_N];
      if (len(sub(gv(W, W_POS), p)) > W[W_BR] + P[P_RAD]) continue;
      {
        V3 n; float dist = wreckDist(w, p, &n, 0);
        float pen = P[P_RAD] * 0.45f - dist;
        if (pen > 0) {
          p = add(p, mul(n, pen));
          V3 v = sub(gv(P, P_VEL), gv(W, W_VEL));
          float vn = dot(v, n);
          if (vn < 0) sv(P, P_VEL, add(gv(W, W_VEL), sub(v, mul(n, 1.3f * vn))));
        }
      }
    }
    sv(P, P_POS, p);
  }
}

static void updateRocks(float dt) {
  for (int i = 0; i < nRocks; i++) {
    float* R = &rocks[i * R_N];
    V3 p = add(gv(R, R_POS), mul(gv(R, R_VEL), dt));
    sv(R, R_POS, p);
  }
}

static int spawnSlug(V3 from, V3 vel, float life, int owner, int kind, float dmg) {
  for (int i = 0; i < MAX_SLUGS; i++) {
    float* G = &slugs[i * G_N];
    if (G[G_ACTIVE] > 0.5f) continue;
    sv(G, G_POS, from); sv(G, G_VEL, vel);
    G[G_LIFE] = life; G[G_ACTIVE] = 1.f; G[G_OWNER] = (float)owner; G[G_KIND] = (float)kind; G[G_DMG] = dmg;
    return i;
  }
  return -1;
}
static void fireSlug(V3 from, V3 dir, V3 baseVel) {
  int i = spawnSlug(from, add(baseVel, mul(dir, SLUG_SPEED)), 7.f, 0, 0, 0.f);
  if (i >= 0) emit(E_SLUG_FIRED, from, 0, (float)i);
}

static void updateDrones(float dt) {
  V3 sp = gv(ship, S_POS), svv = gv(ship, S_VEL);
  float sig = ship[S_SIG];
  bool shipAlive = (int)ship[S_STATE] == 0;
  int tracked = 0;
  float stir = 0.f; int stirIdx = -1;
  for (int i = 0; i < nDrones; i++) {
    float* D = &drones[i * D_N];
    int st = (int)D[D_STATE];
    V3 p = gv(D, D_POS), v = gv(D, D_VEL);
    if (st == DS_DEAD) {
      sv(D, D_POS, add(p, mul(v, dt)));
      sq(D, D_QUAT, qintWorld(gq(D, D_QUAT), v3(0.3f, 0.5f, 0.1f), dt));
      continue;
    }
    V3 toShip = sub(sp, p);
    float dist = len(toShip);
    bool los = shipAlive && !blockedByWreck(p, sp);
    // passive IR detection: received flux ~ sig / d^2
    float flux = shipAlive ? sig / fmaxf_(dist * dist, 1.f) : 0.f;
    bool canWake = los && flux * WAKE_K > 1.f;
    bool canTrack = los && flux * TRACK_K > 1.f;
    D[D_ALERT] += ((st == DS_HUNTING ? 1.f : (canWake ? 0.6f : 0.f)) - D[D_ALERT]) * fminf_(1.f, dt * 2.f);
    if (D[D_FLASH] > 0) D[D_FLASH] -= dt;
    V3 desiredV = v3(0, 0, 0);
    float maxA = 7.f;
    if (st == DS_DORMANT) {
      // suspicion builds while the ship's heat stays above the wake threshold; it fades when you go quiet
      float prevS = D[D_SUSP];
      if (canWake) D[D_SUSP] += dt / WAKE_TIME * fminf_(2.5f, flux * WAKE_K);
      else D[D_SUSP] = fmaxf_(0.f, D[D_SUSP] - dt / 7.f);
      if (prevS < 0.25f && D[D_SUSP] >= 0.25f) emit(E_DRONE_STIR, p, (float)i, dist);
      if (D[D_SUSP] > stir) { stir = D[D_SUSP]; stirIdx = i; }
      if (D[D_SUSP] >= 1.f && D[D_AMMO] > 0.5f) { D[D_SUSP] = 0; D[D_STATE] = DS_WAKING; D[D_WAKE] = 2.5f; emit(E_DRONE_WAKE, p, (float)i, 0); }
      else if (D[D_SUSP] >= 1.f) D[D_SUSP] = 1.f;
      desiredV = gv(&wrecks[(int)D[D_HOME_W] * W_N], W_VEL);
      maxA = 0.5f;
    } else if (st == DS_WAKING) {
      D[D_WAKE] -= dt;
      if (D[D_WAKE] <= 0) { D[D_STATE] = DS_HUNTING; D[D_LOST] = 0; sv(D, D_LAST, sp); }
      desiredV = v;
      maxA = 1.f;
    } else if (st == DS_HUNTING) {
      if (canTrack) { sv(D, D_LAST, sp); D[D_LOST] = 0; tracked = 1; }
      else { D[D_LOST] += dt; if (D[D_LOST] > 6.f) { D[D_STATE] = DS_SEARCHING; D[D_LOST] = 0; emit(E_DRONE_LOST, p, (float)i, 0); } }
      V3 tgt = gv(D, D_LAST);
      V3 rel = sub(tgt, p); float rl = len(rel);
      V3 n = mul(rel, 1.f / fmaxf_(rl, 1e-3f));
      // stand-off at ~220 m, approach velocity proportional to distance error
      float want = clampf((rl - 220.f) * 0.18f, -25.f, 60.f);
      desiredV = add(canTrack ? svv : v3(0, 0, 0), mul(n, want));
      // fire with lead when tracking
      D[D_CD] -= dt;
      if (canTrack && dist < 800.f && D[D_CD] <= 0.f && D[D_AMMO] > 0.5f) {
        V3 relV = sub(svv, v);
        // solve |relP + relV t| = v t   (constant-velocity lead: hard acceleration dodges it)
        float a = dot(relV, relV) - SLUG_SPEED * SLUG_SPEED;
        float b = 2.f * dot(toShip, relV);
        float c = dot(toShip, toShip);
        float disc = b * b - 4.f * a * c;
        float t = dist / SLUG_SPEED;
        if (disc > 0.f && fabsf_(a) > 1e-3f) {
          float s = fsqrt(disc);
          float t1 = (-b - s) / (2.f * a), t2 = (-b + s) / (2.f * a);
          t = t1 > 0 ? t1 : t2; if (t < 0) t = dist / SLUG_SPEED;
        }
        V3 aim = norm(add(toShip, mul(relV, t)));
        aim = norm(add(aim, mul(rdir(), 0.010f + dist * 0.000025f)));
        sv(D, D_AIM, aim);
        fireSlug(add(p, mul(aim, 3.f)), aim, v);
        D[D_CD] = 1.5f + rnd() * 0.8f;
        D[D_FLASH] = 0.12f;
        D[D_AMMO] -= 1.f;
        if (D[D_AMMO] < 0.5f) { emit(E_DRONE_DRY, p, (float)i, 0); D[D_STATE] = DS_RETURNING; }
      }
    } else if (st == DS_SEARCHING) {
      // a searching drone listens with its less sensitive wake sensors
      if (canWake) { D[D_STATE] = DS_HUNTING; D[D_LOST] = 0; emit(E_DRONE_REACQ, p, (float)i, 0); }
      D[D_LOST] += dt;
      V3 rel = sub(gv(D, D_LAST), p); float rl = len(rel);
      desiredV = mul(norm(rel), clampf(rl * 0.1f, 0.f, 20.f));
      if (D[D_LOST] > 15.f) { D[D_STATE] = DS_RETURNING; D[D_LOST] = 0; }
    } else if (st == DS_RETURNING) {
      if (canWake && D[D_AMMO] > 0.5f) { D[D_STATE] = DS_HUNTING; D[D_LOST] = 0; emit(E_DRONE_REACQ, p, (float)i, 0); }
      V3 rel = sub(gv(D, D_HOME), p); float rl = len(rel);
      desiredV = mul(norm(rel), clampf(rl * 0.08f, 0.f, 25.f));
      if (rl < 15.f) D[D_STATE] = DS_DORMANT;
    }
    V3 dv = sub(desiredV, v);
    float dvl = len(dv);
    V3 a = dvl > 1e-4f ? mul(dv, fminf_(maxA, dvl / dt) / dvl) : v3(0, 0, 0);
    v = add(v, mul(a, dt));
    p = add(p, mul(v, dt));
    // avoid wrecks
    for (int w = 0; w < nWrecks; w++) {
      float* W = &wrecks[w * W_N];
      if (len(sub(gv(W, W_POS), p)) > W[W_BR] + 4.f) continue;
      {
        V3 n; float dist = wreckDist(w, p, &n, 0);
        float pen = 4.f - dist;
        if (pen > 0) { p = add(p, mul(n, pen)); float vn = dot(v, n); if (vn < 0) v = sub(v, mul(n, vn)); }
      }
    }
    sv(D, D_POS, p); sv(D, D_VEL, v);
    // orient toward target when hunting
    V3 look = (st == DS_HUNTING || st == DS_SEARCHING) ? norm(sub(gv(D, D_LAST), p)) : norm(v);
    if (len(look) > 0.5f) {
      Q tq = quatFromTo(v3(0, 0, 1), look);
      Q cq = gq(D, D_QUAT);
      float k = fminf_(1.f, dt * 2.f);
      float dd = cq.x * tq.x + cq.y * tq.y + cq.z * tq.z + cq.w * tq.w;
      if (dd < 0) { tq.x = -tq.x; tq.y = -tq.y; tq.z = -tq.z; tq.w = -tq.w; }
      Q nq = {cq.x + (tq.x - cq.x) * k, cq.y + (tq.y - cq.y) * k, cq.z + (tq.z - cq.z) * k, cq.w + (tq.w - cq.w) * k};
      sq(D, D_QUAT, qnorm(nq));
    }
  }
  ship[S_TRACKED] = (float)tracked;
  ship[S_STIR] = stir; ship[S_STIR_IDX] = (float)stirIdx;
}

static void updateSlugs(float dt) {
  V3 sp = gv(ship, S_POS);
  for (int i = 0; i < MAX_SLUGS; i++) {
    float* G = &slugs[i * G_N];
    if (G[G_ACTIVE] < 0.5f) continue;
    V3 p = gv(G, G_POS), v = gv(G, G_VEL);
    V3 np = add(p, mul(v, dt));
    G[G_LIFE] -= dt;
    // segment vs ship sphere
    V3 seg = sub(np, p); float sl = len(seg);
    bool hit = false;
    if (G[G_OWNER] > 0.5f) {
      // our rounds: drones only
      V3 dn = mul(seg, 1.f / fmaxf_(sl, 1e-5f));
      for (int d = 0; d < nDrones && !hit; d++) {
        float* D = &drones[d * D_N];
        if ((int)D[D_STATE] == DS_DEAD) continue;
        float t = raySphere(p, dn, gv(D, D_POS), 2.8f);
        if (t >= 0 && t <= sl) { hit = true; hurtDrone(d, G[G_DMG]); emit(E_DRONE_HIT, add(p, mul(dn, t)), (float)d, G[G_KIND]); }
      }
    } else if ((int)ship[S_STATE] == 0) {
      float t = raySphere(p, mul(seg, 1.f / fmaxf_(sl, 1e-5f)), sp, SHIP_RADIUS);
      if (t >= 0 && t <= sl) {
        hit = true;
        V3 at = add(p, mul(norm(seg), t));
        damageShip(rrange(7.f, 11.f), at, true);
        // momentum transfer: 4 kg slug
        sv(ship, S_VEL, add(gv(ship, S_VEL), mul(v, 4.f / shipMass())));
        sv(ship, S_ANG, add(gv(ship, S_ANG), mul(rdir(), 0.05f)));
        emit(E_SLUG_HIT, at, 0, 0);
      }
    }
    if (!hit && blockedByWreck(p, np)) { hit = true; emit(E_SPARK, np, 2, 1); }
    if (hit || G[G_LIFE] <= 0) { G[G_ACTIVE] = 0; continue; }
    sv(G, G_POS, np);
  }
}

static void updateScavs(float dt) {
  for (int c = 0; c < nScavs; c++) {
    float* C = &scavs[c * C_N];
    V3 p = gv(C, C_POS), v = gv(C, C_VEL);
    int t = (int)C[C_TARGET];
    float* W = &wrecks[t * W_N];
    V3 goal = add(gv(W, W_POS), v3(0, W[W_BR] + 25.f, 0));
    V3 rel = sub(goal, p); float rl = len(rel);
    V3 want = add(gv(W, W_VEL), mul(norm(rel), clampf(rl * 0.05f, 0.f, 28.f)));
    V3 dv = sub(want, v); float dvl = len(dv);
    V3 a = dvl > 1e-4f ? mul(dv, fminf_(2.5f, dvl / dt) / dvl) : v3(0, 0, 0);
    v = add(v, mul(a, dt)); p = add(p, mul(v, dt));
    C[C_SIG] = 2.f + len(a) * 3.5f;
    if (rl < 30.f) {
      C[C_WORK] = 1.f; C[C_TIMER] += dt; C[C_SIG] += 3.f;
      if (C[C_TIMER] > 45.f) { C[C_TIMER] = 0; C[C_WORK] = 0; C[C_TARGET] = (float)((t + 2 + c) % nWrecks); }
    } else C[C_WORK] = 0.f;
    sv(C, C_POS, p); sv(C, C_VEL, v);
    V3 look = C[C_WORK] > 0.5f ? norm(sub(gv(W, W_POS), p)) : norm(v);
    if (len(look) > 0.5f) {
      Q tq = quatFromTo(v3(0, 0, 1), look); Q cq = gq(C, C_QUAT);
      float k = fminf_(1.f, dt * 0.8f);
      float dd = cq.x * tq.x + cq.y * tq.y + cq.z * tq.z + cq.w * tq.w;
      if (dd < 0) { tq.x = -tq.x; tq.y = -tq.y; tq.z = -tq.z; tq.w = -tq.w; }
      Q nq = {cq.x + (tq.x - cq.x) * k, cq.y + (tq.y - cq.y) * k, cq.z + (tq.z - cq.z) * k, cq.w + (tq.w - cq.w) * k};
      sq(C, C_QUAT, qnorm(nq));
    }
  }
}

static void updateFlare(float dt) {
  // Solar particle events are rare and forecast well ahead: at most one per run.
  // Unshielded, one event is a serious dose (~150 mSv) but not lethal; the real costs are
  // electronics upsets during the event and the crew's lifetime dose.
  const float WARN = 90.f, FLARE = 60.f;
  flareClock += dt;
  float t = flareClock;
  int prev = (int)ship[S_FLARE];
  int now = t < flareStart - WARN ? 0 : (t < flareStart ? 1 : (t < flareStart + FLARE ? 2 : 0));
  ship[S_FLARE] = (float)now;
  ship[S_FLARE_T] = now == 1 ? flareStart - t : (now == 2 ? flareStart + FLARE - t : 0.f);
  if (now != prev) emit(now == 1 ? E_FLARE_WARN : (now == 2 ? E_FLARE_START : E_FLARE_END), gv(ship, S_POS), 0, 0);
  if (now == 2 && (int)ship[S_STATE] == 0 && ship[S_SHADOW] < 0.5f) {
    ship[S_DOSE] += 2.5f * dt;
    // single-event upsets in unshielded electronics
    if (rnd() < 0.05f * dt) {
      int kind = rnd() < 0.5f ? 1 : 2;   // 1 sensor dropout, 2 laser controller trip
      if (kind == 2) { ship[S_LASER_LOCK] = 1.f; ship[S_LASER_T] = fmaxf_(ship[S_LASER_T], LASER_RESET + 150.f); }
      emit(E_UPSET, gv(ship, S_POS), (float)kind, 0);
    }
  }
  // only very high accumulated dose harms the crew directly
  if (ship[S_DOSE] > 500.f && (int)ship[S_STATE] == 0) ship[S_CREW] -= (ship[S_DOSE] - 500.f) * 0.002f * dt;
}

// ---------------------------------------------------------------------
//  Exports
// ---------------------------------------------------------------------
EXPORT void step(float dt) {
  ship[S_TIME] += dt;
  updateShip(dt);
  for (int i = 0; i < I_N; i++) prevEdge[i] = input[i];
  updateWrecks(dt);
  updateParts(dt);
  updateRocks(dt);
  updateDrones(dt);
  updateSlugs(dt);
  updateScavs(dt);
  updateFlare(dt);
}

EXPORT float* shipPtr() { return ship; }
EXPORT float* partsPtr() { return parts; }
EXPORT float* wrecksPtr() { return wrecks; }
EXPORT float* rocksPtr() { return rocks; }
EXPORT float* dronesPtr() { return drones; }
EXPORT float* slugsPtr() { return slugs; }
EXPORT float* scavsPtr() { return scavs; }
EXPORT float* inputPtr() { return input; }
EXPORT float* eventsPtr() { return events; }
EXPORT int* cargoPtr() { return cargo; }
EXPORT int partCount() { return nParts; }
EXPORT int wreckCount() { return nWrecks; }
EXPORT int rockCount() { return nRocks; }
EXPORT int droneCount() { return nDrones; }
EXPORT int scavCount() { return nScavs; }
EXPORT int slugCap() { return MAX_SLUGS; }
EXPORT int eventCount() { return nEvents; }
EXPORT void clearEvents() { nEvents = 0; }
EXPORT float jumpCostFor(float m) { return jumpCost(m); }
EXPORT float sunX() { return sunDir.x; }
EXPORT float sunY() { return sunDir.y; }
EXPORT float sunZ() { return sunDir.z; }
// layout sizes, so JS can assert it matches
EXPORT int layoutS() { return S_N; }
EXPORT int layoutP() { return P_N; }
EXPORT int layoutW() { return W_N; }
EXPORT int layoutD() { return D_N; }

// minimal libc shims the compiler may call for struct/array copies
extern "C" void* memset(void* d, int c, unsigned long n) { unsigned char* p = (unsigned char*)d; while (n--) *p++ = (unsigned char)c; return d; }
extern "C" void* memcpy(void* d, const void* s, unsigned long n) { unsigned char* a = (unsigned char*)d; const unsigned char* b = (const unsigned char*)s; while (n--) *a++ = *b++; return d; }
extern "C" void* memmove(void* d, const void* s, unsigned long n) { unsigned char* a = (unsigned char*)d; const unsigned char* b = (const unsigned char*)s; if (a < b) { while (n--) *a++ = *b++; } else { a += n; b += n; while (n--) *--a = *--b; } return d; }
