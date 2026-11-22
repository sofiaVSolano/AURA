// Utilidades E2E sin dependencias: navegador Chromium (Chrome/Edge) controlado por
// DevTools Protocol con el WebSocket nativo de Node ≥ 22, y servidor Vite local.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = fileURLToPath(new URL('../../', import.meta.url)); // frontend/
export const SALIDA = join(RAIZ, 'tests/e2e/.salida');
export const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const CANDIDATOS = {
  win32: [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
  ],
  darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'],
  linux: ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'],
};

export function rutaNavegador() {
  if (process.env.AURA_NAVEGADOR) return process.env.AURA_NAVEGADOR;
  const ruta = (CANDIDATOS[process.platform] ?? []).find((c) => existsSync(c));
  if (!ruta) throw new Error('No se encontró Chrome/Edge. Define AURA_NAVEGADOR con la ruta del ejecutable.');
  return ruta;
}

/** Levanta Vite (dev o preview) con el binario local; nada se descarga. */
export async function iniciarServidor(modo, puerto, env = {}) {
  const args = modo === 'dev' ? ['--port', String(puerto), '--strictPort'] : ['preview', '--port', String(puerto), '--strictPort'];
  const proceso = spawn(process.execPath, [join(RAIZ, 'node_modules/vite/bin/vite.js'), ...args], { cwd: RAIZ, stdio: 'ignore', env: { ...process.env, ...env } });
  const url = `http://localhost:${puerto}`;
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(url)).ok) return { url, cerrar: () => proceso.kill() };
    } catch {}
    await dormir(250);
  }
  proceso.kill();
  throw new Error(`El servidor ${modo} no respondió en ${url}`);
}

async function esperar(url, proceso, nombre) {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await dormir(250);
  }
  proceso.kill();
  throw new Error(`${nombre} no respondió en ${url}`);
}

/**
 * Pila de PRODUCCIÓN completa: backend (base de datos temporal) + servidor del frontend
 * (dist/, cabeceras, proxy /api). Requiere haber compilado (npm run build).
 */
export async function iniciarPila({ puertoWeb = 4146, puertoApi = 4154 } = {}) {
  if (!existsSync(join(RAIZ, 'dist/index.html'))) throw new Error('Falta compilar: npm run build');
  const rutaBd = join(SALIDA, `pila-${Date.now()}.db`);
  mkdirSync(SALIDA, { recursive: true });
  const web = `http://localhost:${puertoWeb}`;
  const api = spawn(process.execPath, [join(RAIZ, '../backend/src/servidor.ts')], {
    cwd: join(RAIZ, '../backend'),
    stdio: 'ignore',
    env: { ...process.env, PUERTO: String(puertoApi), HOST: '127.0.0.1', RUTA_BD: rutaBd, ORIGENES_PERMITIDOS: web, COOKIE_SEGURA: 'true', CONFIAR_PROXY: 'true', NODE_ENV: 'production', LIMITE_REGISTRO: '50' },
  });
  await esperar(`http://127.0.0.1:${puertoApi}/api/salud`, api, 'El backend');
  const front = spawn(process.execPath, [join(RAIZ, 'servidor/servidor.mjs')], {
    cwd: RAIZ,
    stdio: 'ignore',
    env: { ...process.env, PUERTO: String(puertoWeb), HOST: '127.0.0.1', API_URL: `http://127.0.0.1:${puertoApi}` },
  });
  await esperar(web, front, 'El servidor del frontend');
  return {
    url: web,
    /** Espera a que ambos procesos terminen (en Windows liberan la base de datos al salir). */
    cerrar: async () => {
      const fin = (p) => new Promise((ok) => (p.exitCode !== null ? ok() : p.once('exit', ok)));
      front.kill();
      api.kill();
      await Promise.all([fin(front), fin(api)]);
      for (const f of [rutaBd, `${rutaBd}-wal`, `${rutaBd}-shm`]) rmSync(f, { force: true, maxRetries: 10, retryDelay: 200 });
    },
  };
}

export async function abrirNavegador({ base, puerto = 9333, perfil = 'perfil' }) {
  mkdirSync(SALIDA, { recursive: true });
  const dirPerfil = join(SALIDA, perfil);
  rmSync(dirPerfil, { recursive: true, force: true });
  const proceso = spawn(rutaNavegador(), [
      '--headless=new',
      '--disable-gpu',
      `--remote-debugging-port=${puerto}`,
      `--user-data-dir=${dirPerfil}`,
      '--hide-scrollbars',
      // Perfil aislado: sin primera ejecución, sin sincronizar ni importar datos del navegador personal.
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-sync',
      '--disable-features=msImportBrowserData,EdgeFirstRunExperience,AutofillServerCommunication',
      '--password-store=basic',
      'about:blank',
    ], { stdio: 'ignore' });

  let destino;
  for (let i = 0; i < 60 && !destino; i++) {
    try {
      destino = (await (await fetch(`http://127.0.0.1:${puerto}/json`)).json()).find((t) => t.type === 'page');
    } catch {}
    if (!destino) await dormir(250);
  }
  if (!destino) throw new Error('No se pudo conectar con el navegador.');
  const ws = new WebSocket(destino.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));

  let id = 0;
  const pendientes = new Map();
  const errores = [];
  ws.addEventListener('message', (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pendientes.has(d.id)) {
      pendientes.get(d.id)(d);
      pendientes.delete(d.id);
    }
    if (d.method === 'Runtime.exceptionThrown') errores.push(d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text);
    if (d.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(d.params.type)) {
      errores.push(`[${d.params.type}] ` + d.params.args.map((a) => a.value ?? a.description).join(' '));
    }
    // Avisos del navegador (incluye violaciones de CSP y recursos que fallan)
    if (d.method === 'Log.entryAdded' && ['error', 'warning'].includes(d.params.entry.level)) {
      errores.push(`[${d.params.entry.source}] ${d.params.entry.text}${d.params.entry.url ? ` (${d.params.entry.url})` : ''}`);
    }
  });
  const cdp = (method, params = {}) =>
    new Promise((r) => {
      const n = ++id;
      pendientes.set(n, r);
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  const ev = async (expr) => {
    const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error(`${expr.slice(0, 200)}\n→ ${r.result.exceptionDetails.exception?.description}`);
    return r.result?.result?.value;
  };
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Log.enable');

  return {
    cdp,
    ev,
    errores,
    foto: async (nombre, completa = false) => {
      const r = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: completa });
      writeFileSync(join(SALIDA, `${nombre}.png`), Buffer.from(r.result.data, 'base64'));
    },
    ir: async (ruta, espera = 1800) => {
      await cdp('Page.navigate', { url: base + ruta });
      await dormir(espera);
    },
    /** Espera a que la app esté montada (útil en arranque en frío del servidor de desarrollo). */
    esperarApp: async (limiteMs = 30_000) => {
      const fin = Date.now() + limiteMs;
      while (Date.now() < fin) {
        if (await ev(`(document.querySelector('#root')?.children.length ?? 0) > 0`).catch(() => false)) return;
        await dormir(300);
      }
      throw new Error('La app no se montó a tiempo.');
    },
    viewport: (w, h, movil = false) => cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: movil }),
    clicTexto: (texto, sel = 'button, a, label') =>
      ev(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(sel)})].find(e => e.textContent.trim().includes(${JSON.stringify(texto)})); if (!el) throw new Error('No encontrado: ' + ${JSON.stringify(texto)}); el.click(); return true; })()`),
    tecla: async (key, code = key, keyCode = 0) => {
      for (const type of ['keyDown', 'keyUp']) await cdp('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode: keyCode });
    },
    cerrar: () => {
      ws.close();
      proceso.kill();
      // El perfil temporal se elimina al terminar (no debe quedar ningún dato del navegador).
      proceso.once('exit', () => rmSync(dirPerfil, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }));
    },
  };
}

/** Ningún elemento visible se sale del ancho de la pantalla (salvo carruseles con scroll o recortes intencionales). */
export const SIN_CORTES = `(() => {
  const recortado = (e) => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return true; } return false; };
  const malos = [...document.querySelectorAll('main *, header *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1 && !recortado(e); });
  return malos.length === 0 || malos.slice(0, 3).map((e) => e.tagName + '.' + e.className).join(' ');
})() === true`;

export function informe(titulo, resultados, errores) {
  const fallas = resultados.filter((r) => r.startsWith('FALLA'));
  console.log(`\n${titulo}\n${resultados.join('\n')}`);
  console.log(`\nErrores/avisos de consola (${errores.length})${errores.length ? ':\n' + errores.slice(0, 20).join('\n') : ''}`);
  console.log(`\n${resultados.length - fallas.length}/${resultados.length} comprobaciones correctas.`);
  return fallas.length === 0 && errores.length === 0;
}
