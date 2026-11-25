/**
 * Motor WebGL de AURA (sin dependencias).
 *
 * Un único shader de fragmentos dibuja, por raymarching, a tu AURA. Con la etapa
 * (0…4, continua) el personaje SE VA FORMANDO desde una esfera de luz:
 *   0 Origen          esfera orgánica y difuminada
 *   1 Descubrimiento  aparece la silueta: cabeza y cuerpo
 *   2 Reconocimiento  bracitos y ojos: te mira y te reconoce
 *   3 Transformación  su forma propia (gota, nube, brote, canto rodado), patitas,
 *                     boca, mejillas y la expresión elegida
 *   4 Mi AURA         completo, con un anillo de luz
 * Y, como el recorrido es también académico, se va vistiendo de graduación:
 *   Descubrimiento → un lápiz tras la oreja
 *   Reconocimiento → la toga con su estola
 *   Transformación → el diploma enrollado en la mano (el lápiz se guarda)
 *   Mi AURA        → el birrete, que cae del cielo, con su borla
 * La cara se pinta sobre la cabeza (como un juguete de vinilo), con parpadeo y
 * mirada que sigue al puntero. Brillo iridiscente (fresnel), halo y grano.
 *
 * El motor no conoce React: recibe un estado objetivo y lo interpola cada cuadro.
 */

export interface EstadoEsfera {
  /** Posición del centro en unidades de la escena (-2…2 aprox.). */
  x: number;
  y: number;
  /** Escala (1 = tamaño base). */
  escala: number;
  /** Etapa de evolución continua: 0 Origen … 4 Mi AURA. */
  etapa: number;
  /** Matices (grados HSL) del color principal y complementario. */
  matizA: number;
  matizB: number;
  /** Energía de la superficie (0 = calma, 1 = agitada). */
  energia: number;
  /** Forma del personaje: 0 gota · 1 nube · 2 brote · 3 canto rodado (no se interpola). */
  forma: number;
  /** Expresión: 0 serena · 1 curiosa · 2 alegre · 3 pensativa · 4 tierna · 5 decidida (no se interpola). */
  expresion: number;
  /** Vestuario de graduación (0 = sin ninguna prenda, 1 = la de su etapa). Por defecto 0 (desactivado). */
  vestuario?: number;
  /** Mostrar el birrete en Mi AURA (0/1). Por defecto 1. */
  birrete?: number;
  /** Mostrar el anillo de luz en Mi AURA (0/1). Por defecto 1. */
  aro?: number;
  /** Una florecita en la mano (0/1). Por defecto 0. */
  flor?: number;
  /** Se tapa los ojos con las manos (0…1). Por defecto 0. */
  tapar?: number;
}

const OPCIONALES = { vestuario: 0, birrete: 1, aro: 1, flor: 0, tapar: 0 } as const;

/** Campos que cambian de golpe (no tiene sentido interpolar entre formas). */
const DISCRETOS = new Set<keyof EstadoEsfera>(['forma', 'expresion']);

export const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uT;
uniform vec2 uPuntero;
uniform vec3 uCentro;   // x, y, escala
uniform float uEtapa;
uniform float uEnergia;
uniform vec3 uColA;
uniform vec3 uColB;
uniform float uForma;
uniform float uExpresion;
uniform float uVestuario;
uniform float uBirrete;
uniform float uAro;
uniform float uFlor;
uniform float uTapar;

const vec3 CABEZA = vec3(0.0, 0.40, 0.0);
const float RCABEZA = 0.62;

// Cuánto se ha formado cada parte (0…1), según la etapa
float silueta() { return smoothstep(0.3, 1.35, uEtapa); }   // Descubrimiento
float brazos()  { return smoothstep(1.3, 2.1, uEtapa); }    // Reconocimiento
float ojos()    { return smoothstep(1.55, 2.25, uEtapa); }  // Reconocimiento
float rasgos()  { return smoothstep(2.35, 3.2, uEtapa); }   // Transformación
float anillo()  { return smoothstep(3.4, 3.9, uEtapa) * uAro; }    // Mi AURA
// Vestuario de graduación
float lapizV()  { return smoothstep(0.45, 0.95, uEtapa) * (1.0 - smoothstep(2.35, 2.75, uEtapa)) * uVestuario; }
float togaV()   { return smoothstep(1.4, 1.95, uEtapa) * uVestuario; }
float diplomaV(){ return smoothstep(2.45, 2.95, uEtapa) * uVestuario; }
float birreteV(){ return smoothstep(3.4, 3.95, uEtapa) * uVestuario * uBirrete; }

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float ruido(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
float elipsoide(vec3 p, vec3 r) {
  float k0 = length(p / r);
  float k1 = length(p / (r * r));
  return k0 * (k0 - 1.0) / k1;
}
float capsula(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

// ——— Partes del personaje ———
float cabeza(vec3 p) { return length(p - CABEZA) - RCABEZA; }

// Cuerpo propio de cada forma
float cuerpoForma(vec3 p) {
  float f = uForma;
  if (f < 0.5) return elipsoide(p - vec3(0.0, -0.5, 0.0), vec3(0.6, 0.58, 0.54));           // gota: pera
  if (f < 1.5) {                                                                             // nube: bolitas
    float d = length(p - vec3(0.0, -0.46, 0.0)) - 0.45;
    d = smin(d, length(p - vec3(-0.5, -0.6, 0.04)) - 0.33, 0.1);
    d = smin(d, length(p - vec3(0.5, -0.6, 0.04)) - 0.33, 0.1);
    d = smin(d, length(p - vec3(-0.24, -0.84, 0.14)) - 0.3, 0.1);
    return smin(d, length(p - vec3(0.24, -0.84, 0.14)) - 0.3, 0.1);
  }
  if (f < 2.5) return elipsoide(p - vec3(0.0, -0.54, 0.0), vec3(0.5, 0.56, 0.5));             // brote: semilla
  return elipsoide(p - vec3(0.02, -0.56, 0.0), vec3(0.76, 0.46, 0.6));                       // canto rodado: ancho y bajo
}
// Detalle sobre la cabeza (rizo, copos, tallo o piedrita)
float detalle(vec3 p) {
  float f = uForma;
  // gota: la cabeza termina en punta, como una gota que cae
  if (f < 0.5) return smin(smin(length(p - vec3(0.0, 0.9, 0.0)) - 0.26, length(p - vec3(0.05, 1.1, 0.0)) - 0.14, 0.14), length(p - vec3(0.13, 1.24, 0.0)) - 0.055, 0.1);
  // nube: tres copos sobre la cabeza
  if (f < 1.5) return min(min(length(p - vec3(-0.34, 0.88, 0.06)) - 0.2, length(p - vec3(0.0, 1.0, 0.0)) - 0.23), length(p - vec3(0.34, 0.88, 0.06)) - 0.19);
  if (f < 2.5) return capsula(p, vec3(0.0, 0.96, 0.0), vec3(0.0, 1.16, 0.0), 0.05);
  return elipsoide(p - vec3(0.3, 0.96, 0.04), vec3(0.18, 0.11, 0.14));
}
float hojas(vec3 p) {
  if (uForma < 1.5 || uForma > 2.5 || uEtapa > 3.7) return 9.0;
  // Brotan: crecen desde el tallo
  float r = max(rasgos(), 0.01);
  // Brotan desde la punta del tallo: se abren hacia los lados al crecer
  vec3 a = p - vec3(-0.23 * r, 1.16 + 0.06 * r, 0.0);
  a.xy *= rot(0.55);
  vec3 b = p - vec3(0.23 * r, 1.16 + 0.06 * r, 0.0);
  b.xy *= rot(-0.55);
  return min(elipsoide(a, vec3(0.28, 0.065, 0.15) * r), elipsoide(b, vec3(0.28, 0.065, 0.15) * r));
}

// ——— Vestuario de graduación ———
float caja(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
float cilindro(vec3 p, float r, float h) {
  vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}
const vec3 LAPIZ_A = vec3(0.30, 0.98, -0.2);
const vec3 LAPIZ_B = vec3(0.86, 0.5, 0.0);
float lapiz(vec3 p) {
  float k = lapizV();
  if (k < 0.001) return 9.0;
  return capsula(p, LAPIZ_A, LAPIZ_B, 0.05 * k) + (1.0 - k) * 0.3;
}
// Cuello de la toga (un rodete de tela bajo la cabeza)
float cuello(vec3 p) {
  float k = togaV();
  if (k < 0.001) return 9.0;
  vec3 r = p - vec3(0.0, -0.13, 0.03);
  r.yz *= rot(0.12);
  return length(vec2(length(r.xz) - 0.47, r.y)) - 0.065 * k + (1.0 - k) * 0.3;
}
const vec3 DIPLOMA_A = vec3(0.50, -0.56, 0.36);
const vec3 DIPLOMA_B = vec3(0.92, -0.12, 0.3);
float diploma(vec3 p) {
  float k = diplomaV();
  if (k < 0.001) return 9.0;
  // Aparece desplegándose desde la mano
  vec3 b = mix(vec3(0.66, -0.32, 0.3), DIPLOMA_B, k);
  vec3 a = mix(vec3(0.62, -0.36, 0.3), DIPLOMA_A, k);
  return capsula(p, a, b, 0.1 * k);
}
// Birrete: copa, tablero inclinado, botón y borla (cae desde arriba)
float caida() { float k = birreteV(); return (1.0 - k) * (1.0 - k) * 1.6; }
vec3 enBirrete(vec3 p) {
  p.y -= caida();
  p -= vec3(0.0, 0.0, -0.02);
  p.xy *= rot(-0.1);
  p.yz *= rot(0.08);
  return p;
}
float birrete(vec3 p) {
  float k = birreteV();
  if (k < 0.001) return 9.0;
  vec3 q = enBirrete(p);
  float d = cilindro(q - vec3(0.0, 0.95, 0.0), 0.45, 0.09) - 0.02;
  vec3 t = q - vec3(0.0, 1.07, 0.0);
  t.xz *= rot(0.785398);
  d = min(d, caja(t, vec3(0.6, 0.018, 0.6)) - 0.012);
  return d;
}
float borla(vec3 p) {
  float k = birreteV();
  if (k < 0.001) return 9.0;
  vec3 q = enBirrete(p);
  float vaiven = sin(uT * 1.3) * 0.04;
  vec3 esquina = vec3(0.8, 1.07, 0.0);
  vec3 punta = vec3(0.84 + vaiven, 0.78, 0.06);
  float d = length(q - vec3(0.0, 1.105, 0.0)) - 0.045;
  d = min(d, capsula(q, vec3(0.0, 1.1, 0.0), esquina + vec3(0.0, 0.025, 0.0), 0.014));
  d = min(d, capsula(q, esquina, punta, 0.016));
  d = min(d, elipsoide(q - punta - vec3(0.0, -0.06, 0.0), vec3(0.045, 0.1, 0.045)));
  return d;
}
float vestuario(vec3 p) {
  return min(min(lapiz(p), cuello(p)), min(diploma(p), min(birrete(p), borla(p))));
}

// Mano (lado -1 izquierda, 1 derecha): en reposo junto al cuerpo; al taparse, sobre los ojos
vec3 mano(float lado) {
  float bx = mix(0.38, 0.62, brazos());
  vec3 reposo = vec3(lado * bx, -0.32, 0.08);
  vec3 ojo = vec3(lado * 0.21, 0.46, 0.8);
  // Al subir, la mano hace un pequeño arco hacia delante
  vec3 m = mix(reposo, ojo, uTapar);
  m.z += sin(uTapar * 3.14159) * 0.25;
  return m;
}
// Brazo: del hombro a la muñeca (se funde con el cuerpo)
float brazo(vec3 p, float lado, float br) {
  vec3 hombro = mix(vec3(lado * 0.36, -0.2, 0.12), vec3(lado * 0.5, -0.12, 0.3), uTapar);
  return capsula(p, hombro, mano(lado) - vec3(0.0, 0.08, 0.0) * uTapar, mix(0.11, 0.075, uTapar) * br);
}
// Mano: en reposo, una bolita; al taparse, una manita con palma, cuatro deditos y pulgar.
// De vez en cuando abre los deditos para espiar (y los vuelve a cerrar).
float manoForma(vec3 p, float lado, float br) {
  vec3 q = p - mano(lado);
  // La mano se inclina un poco hacia el centro de la cara
  q.xy *= rot(lado * 0.18 * uTapar);
  float reposo = length(q) - 0.15;
  if (uTapar < 0.02) return reposo + (1.0 - br) * 0.3;
  float palma = elipsoide(q - vec3(0.0, -0.02, 0.0), vec3(0.165, 0.14, 0.085));
  // Espiar: los deditos se separan un instante cada pocos segundos
  float espia = smoothstep(0.75, 0.85, sin(uT * 0.9 + lado * 0.4)) * 0.03;
  float dedos = 9.0;
  for (int i = 0; i < 4; i++) {
    float k = float(i) - 1.5;
    float sep = 0.068 + espia;
    float largo = 0.17 - abs(k) * 0.03;
    vec3 base = vec3(k * sep * 0.82, 0.08, 0.0);
    vec3 punta = vec3(k * sep * 1.15, 0.08 + largo, 0.015);
    dedos = min(dedos, capsula(q, base, punta, 0.036));
  }
  // Pulgar hacia el centro de la cara
  float pulgar = capsula(q, vec3(-lado * 0.1, -0.04, 0.02), vec3(-lado * 0.2, 0.05, 0.03), 0.04);
  float manita = smin(palma, min(dedos, pulgar), 0.03);
  return mix(reposo, manita, smoothstep(0.0, 0.35, uTapar)) + (1.0 - br) * 0.3;
}
// Florecita en la mano derecha: tallo, cinco pétalos y centro
vec3 centroFlor() { return mano(1.0) + vec3(0.08, 0.48, 0.08); }
float flor(vec3 p) {
  if (uFlor < 0.001) return 9.0;
  vec3 c = centroFlor();
  float d = capsula(p, mano(1.0) + vec3(0.0, 0.06, 0.06), c, 0.022 * uFlor);
  vec3 q = p - c;
  q.xy *= rot(sin(uT * 1.1) * 0.25);
  float pet = 9.0;
  for (int i = 0; i < 5; i++) {
    float a = float(i) * 1.2566;
    pet = min(pet, elipsoide(q - vec3(cos(a), sin(a), 0.0) * 0.1 * uFlor, vec3(0.075, 0.075, 0.035) * uFlor));
  }
  d = min(d, pet);
  d = min(d, length(q - vec3(0.0, 0.0, 0.03)) - 0.05 * uFlor);
  return d + (1.0 - uFlor) * 0.2;
}

// El personaje en su punto de formación actual
float figura(vec3 p) {
  float r = rasgos();
  float br = brazos();
  // Cuerpo: primero redondo y genérico; en Transformación toma la forma elegida
  float cuerpo = mix(length(p - vec3(0.0, -0.5, 0.0)) - 0.55, cuerpoForma(p), r);
  float d = smin(cabeza(p), cuerpo, 0.18);
  // Bracitos: crecen desde dentro del cuerpo
  d = smin(d, brazo(p, -1.0, br), mix(0.13, 0.08, uTapar));
  d = smin(d, brazo(p, 1.0, br), mix(0.13, 0.08, uTapar));
  // Las manos se funden con el brazo en reposo, pero se ven separadas al taparse los ojos
  float manos = min(manoForma(p, -1.0, br), manoForma(p, 1.0, br));
  d = mix(smin(d, manos, 0.13), min(d, manos), smoothstep(0.2, 0.7, uTapar));
  d = min(d, flor(p));
  // Patitas (la nube flota) y el detalle de la cabeza, en Transformación
  if (uForma < 0.5 || uForma > 1.5) {
    d = smin(d, elipsoide(p - vec3(-0.25, -1.02, 0.1), vec3(0.19, 0.12, 0.21)) + (1.0 - r) * 0.4, 0.1);
    d = smin(d, elipsoide(p - vec3(0.25, -1.02, 0.1), vec3(0.19, 0.12, 0.21)) + (1.0 - r) * 0.4, 0.1);
  }
  // Con el birrete puesto, el detalle de la cabeza se guarda debajo
  float tapa = birreteV() * 0.5;
  d = smin(d, detalle(p) + (1.0 - r) * 0.4 + tapa, 0.09);
  d = min(d, hojas(p) + tapa);
  return min(d, vestuario(p));
}

// Punto en coordenadas del objeto: la esfera gira lenta; el personaje se balancea y mira
vec3 local(vec3 p) {
  float def = silueta();
  float giro = mix(uT * 0.12 + uPuntero.x * 0.7, sin(uT * 0.6) * 0.16 + uPuntero.x * 0.5, def);
  p.xz *= rot(giro);
  p.yz *= rot(-uPuntero.y * mix(0.45, 0.22, def));
  // Curiosa ladea la cabeza; tierna la inclina un poco al otro lado
  float ladeo = (abs(uExpresion - 1.0) < 0.5 ? 0.13 : (abs(uExpresion - 4.0) < 0.5 ? -0.07 : 0.0)) * rasgos();
  p.xy *= rot(ladeo);
  // Respira: un leve estiramiento vertical
  p.y /= 1.0 + 0.025 * def * sin(uT * 1.7);
  return p;
}

float mapa(vec3 p) {
  p = local(p);
  float s = silueta();
  // Superficie orgánica: muy viva en Origen, se calma a medida que se define
  float amp = (0.06 + 0.08 * uEnergia) * (1.0 - 0.85 * smoothstep(0.8, 3.0, uEtapa));
  float n = ruido(p * 1.9 + vec3(0.0, uT * 0.35, uT * 0.1)) * 2.0 - 1.0;
  float d = length(p) - 1.0;
  if (s > 0.001) d = mix(d, figura(p), s);
  d -= amp * n;

  // Mi AURA: un anillo de luz a la altura de la cintura, poco inclinado
  float k = anillo();
  if (k > 0.001) {
    vec3 r = p - vec3(0.0, -0.4, 0.0);
    r.xy *= rot(0.18);
    r.yz *= rot(0.26);
    d = min(d, length(vec2(length(r.xz) - 1.02, r.y)) - 0.045 * k + (1.0 - k) * 0.4);
  }
  return d;
}

vec3 normal(vec3 p) {
  vec2 h = vec2(0.0015, -0.0015);
  return normalize(
    h.xyy * mapa(p + h.xyy) + h.yyx * mapa(p + h.yyx) +
    h.yxy * mapa(p + h.yxy) + h.xxx * mapa(p + h.xxx));
}

float azar(vec2 c) { return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }

// ——— Cara pintada: formas 2D sobre la cabeza ———
float elipse2(vec2 p, vec2 r) { return (length(p / r) - 1.0) * min(r.x, r.y); }
// Arco de radio ra y grosor rb, centrado en el origen y abierto hacia abajo
float arco(vec2 p, vec2 sc, float ra, float rb) {
  p.x = abs(p.x);
  return ((sc.y * p.x > sc.x * p.y) ? length(p - sc * ra) : abs(length(p) - ra)) - rb;
}
float segmento(vec2 p, vec2 a, vec2 b, float r) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}
float lleno(float d) { return 1.0 - smoothstep(-0.006, 0.006, d); }

// Ceja: un trazo corto, con el extremo interior y el exterior a distinta altura
float ceja(vec2 uv, float lado, float yIn, float yOut) {
  vec2 a = vec2(lado * 0.24, yIn);
  vec2 b = vec2(lado * 0.43, yOut);
  vec2 m = (a + b) * 0.5 + vec2(0.0, 0.018);
  return min(segmento(uv, a, m, 0.022), segmento(uv, m, b, 0.022));
}

vec3 cara(vec2 uv, vec3 col, vec3 tinta) {
  float vo = ojos();
  float vr = rasgos();
  // Antes de Transformación los ojos son neutros (abiertos); luego, la expresión elegida
  int e = vr > 0.5 ? int(uExpresion + 0.5) : 1;
  float t = fract(uT / 4.3);
  float parpado = smoothstep(0.0, 0.025, t) * (1.0 - smoothstep(0.025, 0.06, t));
  // Al aparecer, los ojos se abren poco a poco
  parpado = max(parpado, 1.0 - vo);
  vec2 mirada = clamp(uPuntero * vec2(0.085, -0.07), -0.085, 0.085);
  if (e == 3) mirada += vec2(-0.04, 0.045); // pensativa: mira hacia arriba, a un lado
  if (e == 4) mirada += vec2(0.02, -0.04);  // tierna: mira un poco hacia abajo

  // Mejillas: más grandes en alegre y tierna
  float tamMej = e == 4 ? 0.2 : (e == 2 ? 0.17 : 0.14);
  float mej = min(length((uv - vec2(-0.5, -0.15)) * vec2(1.0, 1.4)), length((uv - vec2(0.5, -0.15)) * vec2(1.0, 1.4)));
  col = mix(col, mix(col, vec3(1.0, 0.55, 0.62), e == 4 ? 0.8 : 0.6), (1.0 - smoothstep(tamMej - 0.1, tamMej, mej)) * 0.85 * vr);
  if (e == 4) {
    // Tierna: rayitas de rubor
    for (int k = 0; k < 3; k++) {
      float x = float(k) * 0.055 - 0.055;
      float dl = min(segmento(uv, vec2(-0.5 + x - 0.012, -0.12), vec2(-0.5 + x + 0.012, -0.18), 0.008),
                     segmento(uv, vec2(0.5 + x - 0.012, -0.12), vec2(0.5 + x + 0.012, -0.18), 0.008));
      col = mix(col, vec3(0.92, 0.36, 0.48), lleno(dl) * vr);
    }
  }

  // Ojos
  vec2 r = e == 1 ? vec2(0.15, 0.19) : (e == 4 ? vec2(0.135, 0.17) : (e == 3 ? vec2(0.105, 0.135) : vec2(0.125, 0.16)));
  r.y *= 1.0 - 0.92 * parpado;
  for (int i = 0; i < 2; i++) {
    float lado = i == 0 ? -1.0 : 1.0;
    vec2 c = vec2(lado * 0.33, 0.06);
    if (e == 0) {
      // Serena: ojos cerrados, en arco hacia abajo, con una pestañita
      vec2 q = vec2(uv.x - c.x, -(uv.y - c.y) + 0.02);
      float d = min(arco(q, vec2(0.8, 0.6), 0.1, 0.024), segmento(uv, c + vec2(lado * 0.1, -0.06), c + vec2(lado * 0.14, -0.09), 0.014));
      col = mix(col, tinta, lleno(d) * vo);
    } else if (e == 2) {
      // Alegre: ojos felices (^ ^)
      col = mix(col, tinta, lleno(arco(vec2(uv.x - c.x, uv.y - c.y + 0.05), vec2(0.82, 0.57), 0.1, 0.028)) * vo);
    } else {
      vec2 o = uv - c - mirada;
      float d = elipse2(o, r);
      // Párpado: pensativa lo baja recto; decidida, inclinado hacia el centro
      if (e == 3) d = max(d, (uv.y - c.y) - r.y * 0.45);
      if (e == 5) d = max(d, (uv.y - c.y) - r.y * 0.55 + lado * (uv.x - c.x) * 0.55);
      col = mix(col, tinta, lleno(d) * vo);
      float brillo = (e == 1 || e == 4) ? 1.3 : 1.0;
      col = mix(col, vec3(1.0), lleno(max(length(o - vec2(-0.035, 0.05) * (r.y / 0.14)) - 0.038 * brillo, d)) * (1.0 - parpado));
      col = mix(col, vec3(1.0), lleno(max(length(o - vec2(0.035, -0.045)) - 0.016 * brillo, d)) * (1.0 - parpado));
      if (e == 4) col = mix(col, vec3(1.0), lleno(max(length(o - vec2(0.05, 0.03)) - 0.012, d)) * (1.0 - parpado));
    }
  }

  // Cejas (Transformación): cada expresión las pone a su manera
  for (int i = 0; i < 2; i++) {
    float lado = i == 0 ? -1.0 : 1.0;
    vec2 y = vec2(0.2, 0.29);                                       // decidida: el centro abajo
    if (e == 0) y = vec2(0.25, 0.24);                               // serena: relajadas
    if (e == 1) y = vec2(0.36, 0.33);                               // curiosa: muy arriba
    if (e == 2) y = vec2(0.29, 0.28);                               // alegre: arriba
    if (e == 3) y = lado < 0.0 ? vec2(0.29, 0.34) : vec2(0.21, 0.22); // pensativa: una arriba
    if (e == 4) y = vec2(0.3, 0.24);                                // tierna: el centro arriba
    col = mix(col, tinta, lleno(ceja(uv, lado, y.x, y.y)) * vr);
  }

  // Boca (Transformación)
  vec2 b = uv - vec2(0.0, -0.27);
  float boca = 9.0;
  if (e == 0) {
    boca = arco(vec2(b.x, -b.y + 0.03), vec2(0.8, 0.6), 0.09, 0.02);
  } else if (e == 1) {
    boca = elipse2(b + vec2(0.0, 0.01), vec2(0.05, 0.065));
  } else if (e == 2) {
    // Alegre: sonrisa grande y abierta, con lengüita
    float bo = max(elipse2(b - vec2(0.0, 0.035), vec2(0.18, 0.15)), b.y - 0.035);
    col = mix(col, tinta, lleno(bo) * vr);
    float lengua = max(bo + 0.015, elipse2(b + vec2(0.0, 0.085), vec2(0.085, 0.055)));
    col = mix(col, vec3(1.0, 0.45, 0.55), lleno(lengua) * vr);
  } else if (e == 3) {
    // Pensativa: la boca se va a un lado
    boca = segmento(b, vec2(0.0, -0.01), vec2(0.11, 0.025), 0.018);
  } else if (e == 4) {
    // Tierna: boquita en «w»
    boca = min(arco(vec2(b.x + 0.045, -b.y + 0.02), vec2(0.85, 0.53), 0.045, 0.016),
               arco(vec2(b.x - 0.045, -b.y + 0.02), vec2(0.85, 0.53), 0.045, 0.016));
  } else {
    // Decidida: media sonrisa segura
    vec2 q = b - vec2(0.02, 0.0);
    q *= rot(0.3);
    boca = arco(vec2(q.x, -q.y + 0.03), vec2(0.8, 0.6), 0.1, 0.02);
  }
  col = mix(col, tinta, lleno(boca) * vr);
  return col;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec3 ro = vec3(0.0, 0.0, 4.2);
  vec3 rd = normalize(vec3(uv, -1.55));
  // Centro y escala: se traslada el origen del rayo en lugar de la geometría
  vec3 o = (ro - vec3(uCentro.xy, 0.0)) / uCentro.z;

  float t = 0.0;
  float halo = 0.0;
  bool golpe = false;
  float lejos = 4.2 / uCentro.z + 4.0;
  vec3 p;
  for (int i = 0; i < 110; i++) {
    p = o + rd * t;
    float d = mapa(p) * 0.7;
    halo += exp(-max(d, 0.0) * 5.0) * 0.018;
    if (d < 0.0015) { golpe = true; break; }
    t += d;
    if (t > lejos) break;
  }

  // Qué tan definido está: la esfera es luz iridiscente; el personaje, vinilo brillante
  float def = smoothstep(0.6, 2.6, uEtapa);
  vec3 col = vec3(0.0);
  float alfa = 0.0;
  if (golpe) {
    vec3 n = normal(p);
    vec3 luz = normalize(vec3(-0.5, 0.75, 0.6));
    float dif = max(dot(n, luz), 0.0);
    float envuelta = dot(n, luz) * 0.5 + 0.5;
    float fres = pow(1.0 - max(dot(n, -rd), 0.0), 2.6);
    float esp = pow(max(dot(reflect(rd, n), luz), 0.0), mix(40.0, 60.0, def));
    vec3 q = local(p);
    float s0 = silueta();
    // Color: la esfera mezcla los dos tonos; al formarse, cabeza en el principal y
    // cuerpo fundiéndose hacia el complementario
    vec3 esfera = mix(uColA, uColB, smoothstep(-0.8, 0.9, n.y + 0.35 * n.x));
    vec3 fig = mix(mix(uColA, vec3(1.0), 0.12), uColB, smoothstep(0.15, -0.95, q.y));
    vec3 base = mix(esfera, fig, def);
    if (hojas(q) < 0.01) base = mix(uColB, vec3(0.45, 0.85, 0.5), 0.55);
    // Canto rodado: motitas, como una piedra de río
    if (uForma > 2.5 && s0 > 0.5) {
      // Solo en el cuerpo: la cara queda limpia
      float mota = smoothstep(0.76, 0.8, ruido(q * 11.0 + 3.0)) * smoothstep(-0.12, -0.3, q.y);
      base = mix(base, mix(base, vec3(1.0), 0.3), mota * rasgos() * 0.7);
    }
    // Vestuario
    vec3 tela = mix(vec3(0.07, 0.06, 0.14), uColA * 0.3, 0.4);
    vec3 oro = mix(vec3(1.0, 0.78, 0.32), uColB, 0.25);
    float tg = togaV();
    if (tg > 0.001 && s0 > 0.5) {
      // Toga: cubre el cuerpo y las mangas; asoman las manos y las patitas
      float cuerpoT = smoothstep(-0.04, -0.16, q.y) * (1.0 - smoothstep(-0.86, -0.95, q.y)) * (1.0 - smoothstep(0.66, 0.72, abs(q.x)));
      base = mix(base, tela, cuerpoT * tg);
      // Estola en V, en el color complementario
      float centro = 0.12 + (-0.12 - q.y) * 0.32;
      float estola = (1.0 - smoothstep(0.055, 0.075, abs(abs(q.x) - centro))) * step(0.12, q.z) * cuerpoT;
      base = mix(base, oro, estola * tg);
      if (cuello(q) < 0.012) base = oro;
    }
    if (lapiz(q) < 0.012) {
      float h = clamp(dot(q - LAPIZ_A, LAPIZ_B - LAPIZ_A) / dot(LAPIZ_B - LAPIZ_A, LAPIZ_B - LAPIZ_A), 0.0, 1.0);
      base = h < 0.12 ? vec3(1.0, 0.55, 0.62) : (h < 0.17 ? vec3(0.78, 0.8, 0.84) : (h < 0.86 ? vec3(1.0, 0.8, 0.22) : (h < 0.95 ? vec3(0.95, 0.82, 0.62) : vec3(0.15, 0.13, 0.18))));
    }
    if (diploma(q) < 0.012) {
      vec3 a = DIPLOMA_A, b = DIPLOMA_B;
      float h = clamp(dot(q - a, b - a) / dot(b - a, b - a), 0.0, 1.0);
      // Papel con cinta roja y los bordes del rollo un poco más oscuros
      base = abs(h - 0.5) < 0.08 ? vec3(0.86, 0.2, 0.3) : mix(vec3(0.99, 0.95, 0.85), vec3(0.85, 0.78, 0.62), smoothstep(0.38, 0.5, abs(h - 0.5)));
    }
    if (birrete(q) < 0.012) base = tela * 0.9;
    if (borla(q) < 0.012) base = oro;
    // Manitas en el color complementario cuando se tapa los ojos (se distinguen de la cara)
    if (uTapar > 0.05) {
      float dm = min(manoForma(q, -1.0, 1.0), manoForma(q, 1.0, 1.0));
      base = mix(base, mix(uColA, vec3(1.0), 0.55), (1.0 - smoothstep(0.0, 0.03, dm)) * uTapar);
    }
    if (flor(q) < 0.012) {
      float rc = length(q - centroFlor());
      base = rc < 0.06 ? vec3(1.0, 0.82, 0.3) : (rc < 0.2 ? mix(vec3(1.0, 0.6, 0.75), uColB, 0.25) : vec3(0.4, 0.78, 0.45));
    }
    vec3 iris = 0.5 + 0.5 * cos(6.2831 * (fres * 0.9 + n.x * 0.25 + uT * 0.04 + vec3(0.0, 0.33, 0.67)));
    // luz que atraviesa la materia (subsuperficie suave)
    float sss = pow(max(dot(rd, luz) * -1.0 + 1.0, 0.0), 2.0) * 0.12;
    float luzDifusa = mix(0.28 + 0.72 * dif, 0.35 + 0.65 * envuelta, def);
    col = base * luzDifusa + iris * fres * mix(0.75, 0.3, def) + base * sss;
    col = mix(col, uColB * 1.4, fres * mix(0.35, 0.25, def));
    // Cara: en el frente de la cabeza, desde Reconocimiento
    if (uEtapa > 1.5) {
      vec3 hc = (q - CABEZA) / RCABEZA;
      float enCara = smoothstep(0.02, 0.22, hc.z) * (1.0 - smoothstep(0.03, 0.08, abs(cabeza(q))));
      if (enCara > 0.0) {
        vec3 tinta = mix(vec3(0.1, 0.07, 0.2), uColA * 0.25, 0.35);
        col = mix(col, cara(hc.xy, col, tinta), enCara);
      }
    }
    // Brillo especular al final: también sobre ojos y boca (aspecto de vinilo)
    col += vec3(esp) * mix(0.7, 0.55, def);
    alfa = 1.0;
  }
  // Halo: en Origen la luz es más difusa
  vec3 brillo = mix(uColA, uColB, 0.5) * 1.15;
  float h = clamp(halo * mix(1.35, 0.9, def), 0.0, 1.0);
  col = col * alfa + brillo * h * (1.0 - alfa) * 0.9;
  alfa = max(alfa, h * 0.75);

  // Grano de impresión
  float g = (azar(gl_FragCoord.xy + fract(uT) * 91.0) - 0.5) * 0.07;
  col += g * alfa;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0) * alfa, alfa);
}
`;

/** HSL (grados, 0–1, 0–1) → RGB lineal aproximado 0–1. */
export function hslRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

function compilar(gl: WebGLRenderingContext, tipo: number, fuente: string) {
  const s = gl.createShader(tipo);
  if (!s) throw new Error('No se pudo crear el shader');
  gl.shaderSource(s, fuente);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'Error de shader');
  return s;
}

export interface Motor {
  /** Dibuja un cuadro avanzando el tiempo `dt` segundos (0 = congelado). */
  cuadro(objetivo: EstadoEsfera, dt: number, puntero: [number, number], suavizar: boolean): void;
  redimensionar(): void;
  /** Factor de resolución dinámica (0.5…1): baja en equipos que no alcanzan la fluidez. */
  fijarCalidad(calidad: number): void;
  destruir(): void;
}

/** Crea el motor; devuelve null si el navegador no ofrece WebGL. */
export function crearMotor(canvas: HTMLCanvasElement, resolucion: number): Motor | null {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  let programa: WebGLProgram;
  try {
    const p = gl.createProgram();
    if (!p) return null;
    gl.attachShader(p, compilar(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, compilar(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
    programa = p;
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[AURA] Esfera3D sin WebGL:', e);
    return null;
  }
  gl.useProgram(programa);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(programa, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u = (n: string) => gl.getUniformLocation(programa, n);
  const U = {
    res: u('uRes'), t: u('uT'), puntero: u('uPuntero'), centro: u('uCentro'),
    etapa: u('uEtapa'), energia: u('uEnergia'), colA: u('uColA'), colB: u('uColB'),
    forma: u('uForma'), expresion: u('uExpresion'),
    vestuario: u('uVestuario'), birrete: u('uBirrete'), aro: u('uAro'), flor: u('uFlor'), tapar: u('uTapar'),
  };

  let tiempo = Math.random() * 40;
  let calidad = 1;
  let actual: Required<EstadoEsfera> | null = null;
  const pt: [number, number] = [0, 0];

  const redimensionar = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5) * resolucion * calidad;
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
  };
  redimensionar();

  return {
    redimensionar,
    fijarCalidad(c) {
      calidad = Math.min(1, Math.max(0.5, c));
      redimensionar();
    },
    cuadro(obj, dt, puntero, suavizar) {
      tiempo += dt;
      const destino: Required<EstadoEsfera> = { ...OPCIONALES, ...obj };
      if (!actual || !suavizar) actual = { ...destino };
      else {
        // Interpolación exponencial independiente de la tasa de cuadros (el tapar, más rápido)
        const k = 1 - Math.exp(-dt * 4.5);
        const kRapido = 1 - Math.exp(-dt * 9);
        for (const c of Object.keys(destino) as Array<keyof EstadoEsfera>) {
          actual[c] = DISCRETOS.has(c) ? destino[c] : actual[c] + (destino[c] - actual[c]) * (c === 'tapar' ? kRapido : k);
        }
      }
      const kp = suavizar ? 1 - Math.exp(-dt * 3) : 1;
      pt[0] += (puntero[0] - pt[0]) * kp;
      pt[1] += (puntero[1] - pt[1]) * kp;
      const a = hslRgb(actual.matizA, 0.78, 0.6);
      const b = hslRgb(actual.matizB, 0.85, 0.68);
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform1f(U.t, tiempo);
      gl.uniform2f(U.puntero, pt[0], pt[1]);
      gl.uniform3f(U.centro, actual.x, actual.y, actual.escala);
      gl.uniform1f(U.etapa, actual.etapa);
      gl.uniform1f(U.energia, actual.energia);
      gl.uniform3f(U.colA, a[0], a[1], a[2]);
      gl.uniform3f(U.colB, b[0], b[1], b[2]);
      gl.uniform1f(U.forma, actual.forma);
      gl.uniform1f(U.expresion, actual.expresion);
      gl.uniform1f(U.vestuario, actual.vestuario);
      gl.uniform1f(U.birrete, actual.birrete);
      gl.uniform1f(U.aro, actual.aro);
      gl.uniform1f(U.flor, actual.flor);
      gl.uniform1f(U.tapar, actual.tapar);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    destruir() {
      gl.deleteBuffer(buf);
      gl.deleteProgram(programa);
      // No se fuerza la pérdida del contexto: el mismo <canvas> puede volver a montarse
      // (StrictMode, HMR) y getContext() devolvería el contexto perdido.
    },
  };
}
