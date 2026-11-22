// Auditoría sobre la PILA DE PRODUCCIÓN (servidor real del frontend + backend):
// accesibilidad (axe-core, WCAG 2.2 A/AA), teclado, movimiento reducido, CSP,
// desbordamiento en móvil/tableta/escritorio y métricas de rendimiento.
// Uso: npm run test:auditoria  (compila antes). Resultado: tests/e2e/.salida/auditoria.json
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { abrirNavegador, dormir, informe, iniciarPila, RAIZ, SALIDA, SIN_CORTES } from './navegador.mjs';

const AXE = readFileSync(join(RAIZ, 'node_modules/axe-core/axe.min.js'), 'utf8');
const servidor = await iniciarPila();
const nav = await abrirNavegador({ base: servidor.url, puerto: 9334, perfil: 'perfil-auditoria' });
const { cdp, ev, ir, viewport, tecla, errores, foto } = nav;
const resultados = [];
const verificar = (nombre, cond, detalle = '') => resultados.push(`${cond ? 'OK   ' : 'FALLA'} ${nombre}${!cond && detalle ? ` → ${detalle}` : ''}`);
const informeJson = { accesibilidad: {}, rendimiento: {}, cabeceras: {} };

const RUTAS = [
  '/',
  '/comenzar',
  '/mi-aura',
  '/emocional',
  '/emocional/tengo-miedo',
  '/emocional/tengo-miedo/hablar-en-publico',
  '/academica',
  '/academica/documento/resumen',
  '/academica/planteamiento/idea',
  '/academica/laboratorios/resumen',
  '/academica/laboratorios/sustentacion',
  '/recursos',
  '/cuenta',
  '/no-existe',
];
const DISPOSITIVOS = [
  ['móvil', 390, 844, true],
  ['tableta', 768, 1024, true],
  ['escritorio', 1440, 900, false],
];

async function axe(etiqueta) {
  await ev(`window.axe ? true : (eval(${JSON.stringify(AXE)}), true)`).catch(async () => {
    // Con CSP estricta no hay eval: se inyecta como script del protocolo (fuera de la CSP de la página).
    await cdp('Runtime.evaluate', { expression: AXE });
  });
  const r = await ev(`axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] }, resultTypes: ['violations'] })
    .then(r => r.violations.map(v => ({ id: v.id, impacto: v.impact, ayuda: v.help, nodos: v.nodes.length, ejemplo: v.nodes[0]?.target.join(' ') })))`);
  informeJson.accesibilidad[etiqueta] = r;
  return r;
}
const resumir = (v) => v.map((x) => `${x.id} (${x.impacto}, ${x.nodos}× ej. ${x.ejemplo})`).join('; ');

// — 0. Cabeceras de seguridad servidas —
const cab = await fetch(servidor.url + '/');
for (const h of ['content-security-policy', 'x-content-type-options', 'referrer-policy', 'permissions-policy', 'x-frame-options']) {
  informeJson.cabeceras[h] = cab.headers.get(h);
  verificar(`Cabecera ${h}`, Boolean(cab.headers.get(h)));
}
const api = await fetch(servidor.url + '/api/auth/yo');
verificar('API por el proxy: sin sesión responde usuario null y no se cachea', api.status === 200 && (await api.json()).usuario === null && api.headers.get('cache-control') === 'no-store');
const html = await (await fetch(servidor.url + '/')).text();
const recurso = html.match(/\/assets\/index-[\w-]+\.js/)?.[0];
verificar('Recursos con hash: caché inmutable', Boolean(recurso) && /immutable/.test((await fetch(servidor.url + recurso)).headers.get('cache-control') ?? ''));
verificar('index.html se revalida siempre', cab.headers.get('cache-control') === 'no-cache');
verificar('Compresión gzip en recursos de texto', (await fetch(servidor.url + '/', { headers: { 'Accept-Encoding': 'gzip' } })).headers.get('content-encoding') === 'gzip');
const traversal = await fetch(servidor.url + '/%2e%2e/package.json');
verificar('El servidor no expone archivos fuera de dist/', traversal.status === 404 || !(await traversal.text()).includes('"devDependencies"'));

// — 1. Accesibilidad (axe) y desbordamiento: cada ruta en 3 dispositivos —
for (const [nombre, w, h, movil] of DISPOSITIVOS) {
  await viewport(w, h, movil);
  for (const ruta of RUTAS) {
    await ir(ruta, 1600);
    const v = await axe(`${nombre} ${ruta}`);
    verificar(`axe ${nombre} ${ruta}`, v.length === 0, resumir(v));
    verificar(`sin desbordamiento ${nombre} ${ruta}`, await ev(SIN_CORTES));
    verificar(`un solo h1 y título ${nombre} ${ruta}`, await ev(`document.querySelectorAll('h1').length === 1 && document.title.length > 0`));
  }
}

// — 2. Estados interactivos: AURA en etapa 5 (con celebración abierta), laboratorio con comentarios —
await viewport(1440, 900);
const exp = (tipo, dimension, i) => ({ id: `exp-auditoria-${String(i).padStart(4, '0')}`, tipo, dimension, refId: `auditoria:${tipo}:${i}`, fecha: new Date(Date.UTC(2026, 10, 1 + i)).toISOString() });
const tipos = [['reflexion-registrada', 'emocional'], ['ejercicio-completado', 'academica'], ['avance-academico', 'academica'], ['sustentacion-practicada', 'academica'], ['experiencia-compartida', 'emocional']];
const ESTADO = {
  version: 1,
  preferencias: { nombre: 'Lumi', colorPrincipal: 'rosa', colorComplementario: 'menta', forma: 'nube', expresion: 'alegre', decoraciones: ['estrellas', 'aurora'] },
  onboarding: { completado: true, momentoProyecto: 'documento', fechaInicio: '2026-11-01T10:00:00.000Z' },
  experiencias: Array.from({ length: 15 }, (_, i) => exp(...tipos[i % tipos.length], i)),
  ultimaEtapaVista: 'origen',
};
await ir('/', 800);
await ev(`new Promise((ok, mal) => { const r = indexedDB.open('aura', 3);
  r.onupgradeneeded = () => { for (const n of ['mi-aura', 'emocional', 'academica']) if (!r.result.objectStoreNames.contains(n)) r.result.createObjectStore(n); };
  r.onsuccess = () => { const tx = r.result.transaction('mi-aura', 'readwrite'); tx.objectStore('mi-aura').put(${JSON.stringify(ESTADO)}, 'estado'); tx.oncomplete = () => { r.result.close(); ok(true); }; tx.onerror = () => mal(tx.error); };
  r.onerror = () => mal(r.error); })`);
await ir('/mi-aura', 2200);
verificar('Estado inyectado: celebración abierta en etapa 5', await ev(`!!document.querySelector('dialog[open]') && document.querySelector('svg[data-etapa]')?.dataset.etapa === '4'`));
let v = await axe('Mi AURA con celebración abierta');
verificar('axe Mi AURA con modal abierto', v.length === 0, resumir(v));
await ev(`document.querySelector('dialog[open] button')?.click()`);
await dormir(400);
v = await axe('Mi AURA completa (etapa 5)');
verificar('axe Mi AURA en etapa 5 con galería', v.length === 0, resumir(v));
await ir('/', 1800);
v = await axe('Inicio con AURA nacida');
verificar('axe Inicio con AURA nacida', v.length === 0, resumir(v));
await ir('/academica/laboratorios/resumen', 1600);
await ev(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Revisar').click()`);
await dormir(500);
v = await axe('Laboratorio con comentarios');
verificar('axe laboratorio con comentarios visibles', v.length === 0, resumir(v));

// — 3. Teclado: salto al contenido y foco visible —
await ir('/', 1600);
await tecla('Tab', 'Tab', 9);
verificar('Primer Tab: «Saltar al contenido»', await ev(`document.activeElement?.textContent.trim() === 'Saltar al contenido'`));
await tecla('Enter', 'Enter', 13);
await dormir(300);
verificar('Enter lleva el foco al contenido principal', await ev(`document.activeElement?.id === 'contenido' || location.hash === '#contenido'`));
await ir('/academica/documento/resumen', 1600);
const sinFoco = [];
for (let i = 0; i < 25; i++) {
  await tecla('Tab', 'Tab', 9);
  const r = await ev(`(() => { const e = document.activeElement; if (!e || e === document.body) return 'ok'; const s = getComputedStyle(e); const visible = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0 || s.boxShadow !== 'none'; const padre = e.closest('label, [class*="tarjeta"], [class*="opcion"]'); const padreVisible = padre && getComputedStyle(padre).outlineStyle !== 'none'; return visible || padreVisible ? 'ok' : (e.tagName + ' ' + (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 30)); })()`);
  if (r !== 'ok') sinFoco.push(r);
}
verificar('Foco visible en los primeros 25 elementos tabulables', sinFoco.length === 0, sinFoco.join(' | '));

// — 4. Movimiento reducido: sin animaciones en bucle —
await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
for (const ruta of ['/', '/mi-aura', '/emocional']) {
  await ir(ruta, 1800);
  const bucles = await ev(`document.getAnimations().filter(a => a.playState === 'running' && a.effect?.getComputedTiming().iterations === Infinity).length`);
  verificar(`Movimiento reducido sin bucles en ${ruta}`, bucles === 0, `${bucles} animaciones infinitas`);
}
await cdp('Emulation.setEmulatedMedia', { features: [] });

// — 5. Rendimiento (carga en frío, móvil con red 4G lenta y CPU ×4, como Lighthouse) —
await cdp('Network.enable');
await cdp('Network.setCacheDisabled', { cacheDisabled: true });
await viewport(390, 844, true);
await cdp('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
await cdp('Emulation.setCPUThrottlingRate', { rate: 4 });
const METRICAS = `new Promise((ok) => {
  const lcp = [], cls = [], largas = [];
  new PerformanceObserver(l => lcp.push(...l.getEntries())).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver(l => cls.push(...l.getEntries())).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver(l => largas.push(...l.getEntries())).observe({ type: 'longtask', buffered: true });
  setTimeout(() => {
    const recursos = performance.getEntriesByType('resource');
    const kb = (f) => Math.round(recursos.filter(f).reduce((s, r) => s + r.transferSize, 0) / 1024);
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0;
    ok({
      fcpMs: Math.round(fcp),
      lcpMs: Math.round(lcp.at(-1)?.startTime ?? 0),
      cls: Number(cls.filter(e => !e.hadRecentInput).reduce((s, e) => s + e.value, 0).toFixed(3)),
      tbtMs: Math.round(largas.filter(t => t.startTime > fcp).reduce((s, t) => s + Math.max(0, t.duration - 50), 0)),
      jsKB: kb(r => r.initiatorType === 'script' || r.name.endsWith('.js')),
      cssKB: kb(r => r.name.endsWith('.css')),
      fuentesKB: kb(r => r.name.endsWith('.woff2')),
      fuentes: recursos.filter(r => r.name.endsWith('.woff2')).map(r => r.name.split('/').pop().replace(/-[\\w]{8}\\.woff2$/, '')),
      videos: recursos.filter(r => /\\.(mp4|webm)/.test(r.name)).length,
      totalKB: kb(() => true) + Math.round((performance.getEntriesByType('navigation')[0]?.transferSize ?? 0) / 1024),
    });
  }, 7000);
})`;
for (const ruta of ['/', '/emocional', '/academica', '/academica/documento/resumen', '/mi-aura']) {
  await cdp('Network.clearBrowserCache');
  await ir(ruta, 300);
  const m = await ev(METRICAS);
  informeJson.rendimiento[ruta] = m;
  verificar(`Rendimiento ${ruta}: LCP ${m.lcpMs} ms · CLS ${m.cls} · TBT ${m.tbtMs} ms · JS ${m.jsKB} KB · total ${m.totalKB} KB · videos ${m.videos}`, m.lcpMs < 2500 && m.cls < 0.1 && m.videos === 0 && m.tbtMs < 300);
}
await cdp('Emulation.setCPUThrottlingRate', { rate: 1 });
await cdp('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
await foto('auditoria-final');

writeFileSync(join(SALIDA, 'auditoria.json'), JSON.stringify(informeJson, null, 2));
const ok = informe('Auditoría (build de producción)', resultados, errores);
nav.cerrar();
await servidor.cerrar();
process.exit(ok ? 0 : 1);
