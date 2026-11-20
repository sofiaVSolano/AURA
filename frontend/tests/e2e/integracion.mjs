// Integración frontend + backend sobre la pila de producción (servidor real + API + SQLite temporal).
// Uso: npm run test:integracion (compila antes).
import { abrirNavegador, dormir, informe, iniciarPila } from './navegador.mjs';

const pila = await iniciarPila({ puertoWeb: 4147, puertoApi: 4155 });
const resultados = [];
const verificar = (nombre, cond) => resultados.push(`${cond ? 'OK   ' : 'FALLA'} ${nombre}`);
const todosLosErrores = [];
const CORREO = 'estudiante@aura.test';
const CLAVE = 'una frase segura de prueba';

const escribir = (sel, valor) =>
  `(() => { const i = document.querySelector(${JSON.stringify(sel)}); const p = i instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(p, 'value').set.call(i, ${JSON.stringify(valor)}); i.dispatchEvent(new Event('input', { bubbles: true })); })()`;

// — Navegador A: crea la cuenta y trabaja —
const a = await abrirNavegador({ base: pila.url, puerto: 9335, perfil: 'perfil-integracion-a' });
await a.viewport(1280, 900);
await a.ir('/', 1800);
verificar('Sin sesión, la cabecera ofrece «Entrar»', await a.ev(`!!document.querySelector('header a[href="/cuenta"]') && document.querySelector('header a[href="/cuenta"]').textContent === 'Entrar'`));
// Algo hecho ANTES de tener cuenta (para comprobar que se lleva a la cuenta)
await a.ir('/academica/laboratorios/resumen', 1600);
await a.clicTexto('Revisar', 'button');
await dormir(400);

await a.ir('/cuenta', 1500);
await a.clicTexto('Crear cuenta', 'button');
await dormir(300);
await a.ev(escribir('input[type=email]', CORREO));
await a.ev(escribir('input[type=password]', CLAVE));
await a.clicTexto('Crear mi cuenta', 'button');
await dormir(500);
verificar('Registro sin consentimiento: se explica por qué no continúa', await a.ev(`document.body.textContent.includes('Necesitamos tu consentimiento')`));
await a.ev(`[...document.querySelectorAll('label')].find(l => l.textContent.includes('Acepto que AURA')).click()`);
await a.clicTexto('Crear mi cuenta', 'button');
await dormir(3000);
verificar('Tras registrarse llega a Mi AURA con sesión', await a.ev(`location.pathname === '/mi-aura' && document.querySelector('header a[href="/cuenta"]')?.textContent === 'Mi cuenta'`));
verificar('Lo hecho antes de la cuenta se llevó a ella (ejercicio validado por el servidor)', await a.ev(`fetch('/api/datos').then(r => r.json()).then(d => d['mi-aura']?.experiencias.some(e => e.refId === 'lab:resumen/ordenar-fragmentos'))`));

// Onboarding con cuenta
await a.ir('/comenzar', 1500);
await a.clicTexto('Empezar');
await dormir(400);
await a.ev(escribir('input:not([type]), input[type=text]', 'Nube'));
await a.clicTexto('Continuar');
await dormir(400);
await a.ev(`document.querySelector('input[name=principal][value=menta]').click()`);
for (const paso of ['Continuar', 'Continuar', 'Omitir']) {
  await a.clicTexto(paso);
  await dormir(400);
}
await a.clicTexto('Dar vida a Nube');
await dormir(1500);
// Avance académico
await a.ir('/academica/diseno/objetivos', 1600);
await a.ev(escribir('textarea', 'Reformulé mis objetivos con verbos verificables.'));
await a.clicTexto('Guardar avance');
await dormir(1500);
const servidor = await a.ev(`fetch('/api/datos').then(r => r.json())`);
verificar('El servidor guarda las preferencias de Mi AURA', servidor['mi-aura']?.preferencias.nombre === 'Nube' && servidor['mi-aura']?.preferencias.colorPrincipal === 'menta');
verificar('El servidor guarda el avance académico', servidor.academica?.avances.some((x) => x.texto.includes('verbos verificables')));
verificar('El servidor registra la experiencia del avance', servidor['mi-aura']?.experiencias.some((e) => e.refId === 'avance:objetivos'));
const exportado = await a.ev(`fetch('/api/cuenta/exportar').then(r => r.json())`);
verificar('Exportar devuelve todos los datos de la cuenta (sin contraseña)', exportado.cuenta?.correo === CORREO && !JSON.stringify(exportado).includes('scrypt'));
verificar('Sin la cabecera CSRF el servidor rechaza cambios', (await a.ev(`fetch('/api/datos/emocional', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: { version: 1, guardados: [], vistos: {}, aprendizajes: [] } }) }).then(r => r.status)`)) === 403);
todosLosErrores.push(...a.errores.filter((e) => !e.includes('403')));
a.cerrar();

// — Navegador B (otro dispositivo): inicia sesión y recupera todo —
const b = await abrirNavegador({ base: pila.url, puerto: 9336, perfil: 'perfil-integracion-b' });
await b.viewport(390, 844, true);
await b.ir('/cuenta', 1500);
await b.ev(escribir('input[type=email]', CORREO));
await b.ev(escribir('input[type=password]', 'contraseña equivocada'));
await b.ev(`[...document.querySelectorAll('label')].find(l => l.textContent.includes('Llevar a mi cuenta')).click()`);
await b.clicTexto('Entrar', 'form button');
await dormir(1200);
verificar('Contraseña incorrecta: mensaje genérico', await b.ev(`document.body.textContent.includes('El correo o la contraseña no coinciden')`));
b.errores.splice(0, b.errores.length, ...b.errores.filter((e) => !e.includes('auth/ingreso')));
await b.ev(escribir('input[type=password]', CLAVE));
await b.clicTexto('Entrar', 'form button');
await dormir(3000);
verificar('Otro dispositivo: misma AURA (nombre)', await b.ev(`document.querySelector('#nombre-aura')?.textContent === 'Nube'`));
await b.foto('integracion-otro-dispositivo');
await b.ir('/academica/diseno/objetivos', 1800);
verificar('Otro dispositivo: el avance aparece en su tema', await b.ev(`document.body.textContent.includes('verbos verificables')`));
await b.ir('/cuenta', 1500);
await b.clicTexto('Cerrar sesión', 'button');
await dormir(1800);
verificar('Cerrar sesión vuelve al modo sin cuenta', await b.ev(`document.querySelector('header a[href="/cuenta"]')?.textContent === 'Entrar'`));

// Eliminar la cuenta (con contraseña) borra todo
await b.ir('/cuenta', 1200);
await b.ev(escribir('input[type=email]', CORREO));
await b.ev(escribir('input[type=password]', CLAVE));
await b.clicTexto('Entrar', 'form button');
await dormir(2500);
await b.ir('/cuenta', 1500);
await b.clicTexto('Eliminar mi cuenta', 'button');
await dormir(400);
await b.ev(escribir('dialog input[type=password]', CLAVE));
await b.clicTexto('Eliminar definitivamente', 'dialog button');
await dormir(2000);
verificar('Eliminar la cuenta cierra la sesión', await b.ev(`fetch('/api/auth/yo').then(r => r.json()).then(d => d.usuario === null)`));
const reingreso = await b.ev(`fetch('/api/auth/ingreso', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ correo: '${CORREO}', contrasena: '${CLAVE}' }) }).then(r => r.status)`);
verificar('La cuenta eliminada ya no permite entrar', reingreso === 401);
todosLosErrores.push(...b.errores.filter((e) => !e.includes('auth/ingreso')));
b.cerrar();
await pila.cerrar();

const ok = informe('Integración frontend + backend (pila de producción)', resultados, todosLosErrores);
process.exit(ok ? 0 : 1);
