// Prueba funcional de extremo a extremo (servidor de desarrollo).
// Uso: npm run test:e2e   ·   Requiere Chrome/Edge y el video de prueba (npm run fixture:video).
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { abrirNavegador, dormir, informe, iniciarServidor, RAIZ, SIN_CORTES } from './navegador.mjs';

if (!existsSync(join(RAIZ, 'tests/fixtures/prueba.mp4'))) {
  console.error('Falta el video de prueba: ejecuta primero `npm run fixture:video`.');
  process.exit(1);
}

// Modo local (sin backend): verifica que AURA funciona completa sin cuenta.
const servidor = await iniciarServidor('dev', 4318, { VITE_API_HABILITADA: 'false' });
const nav = await abrirNavegador({ base: servidor.url, puerto: 9333, perfil: 'perfil-funcional' });
const { cdp, ev, foto, ir, viewport, clicTexto, errores } = nav;
// Calentamiento: en frío, Vite optimiza dependencias y recarga la página una vez.
await nav.ir('/', 500);
await nav.esperarApp();
await dormir(1500);
await nav.esperarApp();

const resultados = [];
const verificar = (nombre, cond) => resultados.push(`${cond ? 'OK   ' : 'FALLA'} ${nombre}`);

// 1) Inicio sin AURA
await viewport(1440, 900);
await ir('/', 2600);
await foto('01-inicio');
verificar('Inicio muestra la frase', await ev(`document.querySelector('h1')?.textContent.includes('No tienes que recorrer este camino a ciegas')`));
verificar('Inicio invita a dar vida al AURA', await ev(`!!document.querySelector('a[href="/comenzar"]')`));
verificar('Portada: el titular no se cruza con la esfera (columna izquierda)', await ev(`document.querySelector('h1').getBoundingClientRect().right < innerWidth * 0.56`));
// Lleva el camino a la mitad de su recorrido: debe verse la etapa 3 (Reconocimiento), entera
await ev(`(() => { const c = document.getElementById('titulo-camino').closest('section'); scrollTo(0, c.offsetTop + (c.offsetHeight - innerHeight) * (2.2 / 4.4)); })()`);
await dormir(2200);
await foto('02-camino-etapa3');
verificar('El camino muestra la etapa que corresponde al scroll', await ev(`[...document.querySelectorAll('[data-k]')].find(n => Number(n.style.opacity) > 0.9)?.textContent === 'Reconocimiento'`));
verificar('Ningún nombre de etapa se corta (cabe en su columna)', await ev(`(() => { const c = document.querySelector('[data-k]').parentElement; return [...c.children].every(n => n.scrollWidth <= c.clientWidth + 1); })()`));
verificar('Las palabras gigantes (Académica, AURA) caben enteras', await ev(`[...document.querySelectorAll('main svg text')].every(t => { const s = t.ownerSVGElement.getBoundingClientRect(); return s.width > 0 && s.width <= innerWidth; })`));

// 2) Onboarding
await ir('/comenzar');
await clicTexto('Empezar');
await dormir(500);
await ev(`(() => { const i = document.querySelector('input[type=text], input:not([type])'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, 'Lumi'); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
await clicTexto('Continuar');
await dormir(500);
await ev(`document.querySelector('input[name=principal][value=rosa]').click(); document.querySelector('input[name=complementario][value=menta]').click();`);
await dormir(900);
await foto('03-onboarding-colores');
await clicTexto('Continuar');
await dormir(500);
await ev(`document.querySelector('input[name=forma][value=nube]').click(); document.querySelector('input[name=expresion][value=alegre]').click();`);
await dormir(700);
await foto('04-onboarding-forma');
await clicTexto('Continuar');
await dormir(500);
await clicTexto('Omitir');
await dormir(500);
await ev(`document.querySelector('input[name=sentir][value=inquietud]').click()`);
await dormir(500);
verificar('Respuesta de acompañamiento al elegir cómo llegas', await ev(`!!document.querySelector('[role=status]')?.textContent.includes('acompañamiento')`));
await clicTexto('Dar vida a Lumi');
await dormir(1500);
await foto('05-onboarding-nacimiento');
verificar('Nacimiento anunciado', await ev(`document.querySelector('h1')?.textContent.includes('Lumi acaba de nacer')`));

// 3) Mi AURA + persistencia tras recargar
await ir('/mi-aura', 2200);
verificar('Persistencia: nombre tras recargar', await ev(`document.querySelector('#nombre-aura')?.textContent === 'Lumi'`));
verificar('Persistencia: colores elegidos', await ev(`document.querySelector('input[name=m-principal][value=rosa]')?.checked === true`));
await foto('06-mi-aura-origen');

// 4) Evolución: repetir no suma; experiencias variadas sí
for (let i = 0; i < 5; i++) await clicTexto('Repetir el mismo contenido');
await dormir(300);
verificar('Repetir el mismo contenido no suma', await ev(`document.querySelector('svg[data-etapa]').dataset.etapa === '0'`));
await clicTexto('+ Explorar un contenido');
await dormir(50);
await clicTexto('+ Practicar tu sustentación');
await dormir(1400);
verificar('Etapa Descubrimiento y celebración', await ev(`!!document.querySelector('dialog[open]')?.textContent.includes('se transformó')`));
await foto('07-celebracion');
await clicTexto('Seguir juntos');
await dormir(400);
const tipos = ['+ Escribir una reflexión', '+ Completar un ejercicio', '+ Registrar un avance', '+ Compartir una experiencia'];
for (let r = 0; r < 4; r++) for (const t of tipos) {
  await clicTexto(t);
  await dormir(30);
}
await dormir(600);
if (await ev(`!!document.querySelector('dialog[open]')`)) await clicTexto('Seguir juntos');
await dormir(400);
verificar('Llega a Mi AURA (etapa 5)', await ev(`document.querySelector('[data-etapa]').dataset.etapa === '4'`));
await ev(`document.querySelector('input[type=checkbox]:not(:disabled)')?.click(); document.querySelectorAll('input[type=checkbox]:not(:disabled)')[1]?.click();`);
await ev(`window.scrollTo(0,0)`);
await dormir(1400);
await foto('08-mi-aura-final');
await foto('09-mi-aura-completa', true);
verificar('Galería con hitos de etapa', (await ev(`document.querySelectorAll('#galeria ~ ol > li').length`)) >= 5);

// 4b) AURA emocional
await ir('/emocional', 2200);
await foto('20-emocional-entrada');
verificar('Emocional: pregunta de entrada', await ev(`document.querySelector('h1')?.textContent === '¿Cómo te sientes hoy?'`));
verificar('Emocional: 7 categorías', (await ev(`document.querySelectorAll('a[href^="/emocional/"]').length`)) === 7);
await clicTexto('Tengo miedo', 'a');
await dormir(1500);
await foto('21-categoria');
verificar('Categoría: 4 subtemas', (await ev(`document.querySelectorAll('ol li a[href^="/emocional/tengo-miedo/"]').length`)) === 4);
verificar('Ningún video aparece como disponible', await ev(`!document.body.textContent.includes('Disponible') && document.body.textContent.includes('En preparación')`));
await clicTexto('Hablar en público', 'a');
await dormir(1500);
verificar('Video pendiente: no hay <video>, se muestra en preparación', await ev(`!document.querySelector('video') && document.body.textContent.includes('Este video está en preparación')`));
await clicTexto('Guardar para después');
await dormir(200);
verificar('Guardar contenido', await ev(`document.querySelector('button[aria-pressed="true"]')?.textContent.includes('Guardado')`));
await ev(`(() => { const t = document.querySelector('textarea'); const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; set.call(t, 'Los nervios no significan que no esté preparada.'); t.dispatchEvent(new Event('input', { bubbles: true })); })()`);
await clicTexto('Guardar aprendizaje');
await dormir(400);
verificar('Aprendizaje guardado con mensaje del AURA', await ev(`document.body.textContent.includes('guardó tu aprendizaje')`));
await foto('22-video-pendiente', true);
await ir('/emocional/tengo-miedo/hablar-en-publico', 2000);
verificar('Persistencia: guardado y aprendizaje tras recargar', await ev(`document.querySelector('button[aria-pressed="true"]') !== null && document.body.textContent.includes('Los nervios no significan')`));
await ir('/emocional', 1800);
verificar('Entrada muestra «Tus guardados»', await ev(`document.body.textContent.includes('Tus guardados')`));
await ir('/mi-aura', 1800);
verificar('El aprendizaje suma a Mi AURA como reflexión', await ev(`[...document.querySelectorAll('ul li span')].some(s => s.textContent === 'Escribir una reflexión')`));
await ir('/emocional/no-existe', 1500);
verificar('Categoría inexistente: página no encontrada', await ev(`document.body.textContent.includes('Esta página no existe')`));

// 4c) Reproductor (fixture de prueba) y middleware de medios
await ir('/sistema', 2500);
await ev(`document.querySelector('video')?.scrollIntoView({block:'center'})`);
verificar('Reproductor: no descarga el video antes de pulsar (preload=none)', await ev(`!performance.getEntriesByType('resource').some(r => r.name.includes('prueba.mp4'))`));
// Clic real del puntero (gesto de usuario) vía CDP, como haría una persona
const centro = await ev(`(() => { const r = document.querySelector('button[aria-label^="Reproducir «Video"]').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
for (const type of ['mousePressed', 'mouseReleased']) await cdp('Input.dispatchMouseEvent', { type, x: centro[0], y: centro[1], button: 'left', clickCount: 1 });
// El arranque depende de la carga de la máquina: se espera hasta 6 s a que avance
for (let i = 0; i < 30 && (await ev(`document.querySelector('video').currentTime`)) <= 1.2; i++) await dormir(200);
verificar('Reproductor: reproduce al pulsar (sin autoplay)', (await ev(`document.querySelector('video').currentTime`)) > 0.5);
verificar('Reproductor: subtítulos activos por defecto', await ev(`document.querySelector('button[aria-label="Subtítulos"]').getAttribute('aria-pressed') === 'true' && document.querySelector('figure p[aria-hidden]')?.textContent.includes('Subtítulo de prueba')`));
await ev(`document.querySelector('button[aria-label="Subtítulos"]').click()`);
await dormir(150);
verificar('Reproductor: alternar subtítulos', await ev(`!document.querySelector('figure p[aria-hidden]')`));
await ev(`document.querySelector('button[aria-label="Subtítulos"]').click()`);
await ev(`document.querySelector('figure').dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true }))`);
await dormir(300);
verificar('Reproductor: atajo K pausa', await ev(`document.querySelector('video').paused`));
await ev(`(() => { const r = document.querySelector('input[aria-label="Progreso del video"]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(r, '6'); r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); })()`);
await dormir(400);
verificar('Reproductor: buscar con la barra', Math.abs((await ev(`document.querySelector('video').currentTime`)) - 6) < 0.6);
await ev(`document.querySelector('button[aria-label="Silenciar"]').click()`);
verificar('Reproductor: silenciar', await ev(`document.querySelector('video').muted`));
await foto('23-reproductor');
await ev(`document.querySelector('video').play()`);
await dormir(2600);
verificar('Reproductor: al terminar ofrece el siguiente', await ev(`document.body.textContent.includes('Siguiente') && !!document.querySelector('figure a[href="/emocional/tengo-miedo/hablar-en-publico"]')`));
verificar('Medios: peticiones por rangos (206)', await ev(`fetch('/__fixtures__/prueba.mp4', { headers: { Range: 'bytes=0-99' } }).then(r => r.status === 206 && r.headers.get('content-length') === '100')`));

// 4d) AURA académica
await ir('/academica', 2200);
await foto('30-academica-ruta', true);
verificar('Académica: 5 etapas en la ruta', (await ev(`document.querySelectorAll('ol[aria-label] > li').length`)) === 5);
verificar('Académica: 26 temas enlazados', (await ev(`new Set([...document.querySelectorAll('a[href^="/academica/"]')].map(a=>a.getAttribute('href')).filter(h=>!h.includes('laboratorios') && !h.includes('tesis'))).size`)) === 26);
verificar('Académica: un laboratorio por tema (26)', (await ev(`document.querySelectorAll('a[href^="/academica/laboratorios/"]').length`)) === 26);
await ev(`document.querySelector('a[href="/academica/documento/resumen"]').click()`);
await dormir(1600);
verificar('Guía: título y plantilla completa (9 secciones)', await ev(`document.querySelector('h1')?.textContent === 'Resumen' && document.querySelectorAll('nav[aria-label="En esta guía"] a').length === 9`));
await ev(`document.querySelector('details summary').click()`);
await ev(`document.querySelectorAll('#ejemplo [role=button]')[2].focus()`);
await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
await dormir(300);
verificar('Ejemplo desglosado: explica el fragmento elegido (con teclado)', await ev(`document.querySelector('#ejemplo [aria-live]')?.textContent.includes('Metodología')`));
verificar('Errores frecuentes: la alternativa empieza oculta (visualmente)', await ev(`getComputedStyle(document.querySelector('#alternativa-0')).display === 'none'`));
await ev(`document.querySelector('#errores button[aria-expanded]').click()`);
await dormir(300);
verificar('Errores frecuentes: revela la alternativa (visible de verdad)', await ev(`getComputedStyle(document.querySelector('#alternativa-0')).display !== 'none' && document.querySelector('#alternativa-0').getBoundingClientRect().height > 0`));
await ev(`[...document.querySelectorAll('label')].find(l => l.textContent.includes('Ya lo exploré')).click()`);
await ev(`(() => { const t = document.querySelector('textarea'); const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; set.call(t, 'Reescribí mi resumen con resultados concretos.'); t.dispatchEvent(new Event('input', { bubbles: true })); })()`);
await clicTexto('Guardar avance');
await dormir(400);
verificar('Avance guardado', await ev(`document.body.textContent.includes('Avance guardado')`));
await ev(`document.querySelector('#ejemplo').scrollIntoView()`);
await dormir(600);
await foto('31-guia-resumen');
await ir('/academica', 1600);
verificar('Ruta refleja el tema explorado', await ev(`document.querySelector('a[href="/academica/documento/resumen"]').textContent.includes('(explorado)')`));
await ir('/academica/planteamiento/idea', 1500);
verificar('Guía en preparación se indica', await ev(`document.body.textContent.includes('Esta guía está en preparación')`));
await ir('/academica/laboratorios/resumen', 1800);
const antes = await ev(`[...document.querySelectorAll('ol li p:first-child')].map(p => p.textContent.slice(0, 20)).join('|')`);
await ev(`document.querySelector('button[aria-label="Bajar el fragmento 1"]').click()`);
await dormir(450);
verificar('Ordenar: mover cambia el orden', antes !== (await ev(`[...document.querySelectorAll('ol li p:first-child')].map(p => p.textContent.slice(0, 20)).join('|')`)));
await clicTexto('Revisar', 'button');
await dormir(400);
verificar('Ordenar: comentarios formativos con pistas', await ev(`document.body.textContent.includes('aspectos bien encaminados') && document.querySelectorAll('[data-estado="revisar"]').length > 0`));
await foto('32-lab-ordenar');
await ir('/academica/laboratorios/objetivos', 1800);
// Las opciones salen en orden aleatorio: se eligen por su texto completo.
await ev(`const buenas = ['Describir los hábitos de lectura de los usuarios de la biblioteca municipal', 'Diseñar un prototipo de riego', 'Identificar las barreras']; [...document.querySelectorAll('input[type=radio]')].filter(i => buenas.some(b => i.closest('label').textContent.startsWith(b))).forEach(i => i.click())`);
await dormir(400);
await clicTexto('Revisar', 'button');
await dormir(600);
verificar('Elegir: verbos verificables bien encaminados', await ev(`document.querySelector('[role=region]')?.textContent.includes('3 de 3')`));
await clicTexto('Revisa la coherencia', 'button');
await dormir(400);
verificar('Navegación libre entre actividades', await ev(`document.querySelector('h2')?.textContent === 'Revisa la coherencia'`));
await ir('/academica/laboratorios/sustentacion', 1800);
await ev(`(() => { const t = document.querySelector('textarea'); const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; set.call(t, 'Elegí un enfoque mixto porque mi pregunta necesitaba medir la entrega de tareas y comprender las razones de los estudiantes. Consideré solo una encuesta, pero la descarté porque no explicaba el porqué de los resultados.'); t.dispatchEvent(new Event('input', { bubbles: true })); })()`);
await clicTexto('Revisar mi respuesta');
await dormir(400);
verificar('Simulador: estima el tiempo y sugiere mejoras', await ev(`document.querySelector('[role=region]')?.textContent.includes('tomaría unos')`));
await foto('33-simulador');
await ir('/mi-aura', 1800);
verificar('Mi AURA registra ejercicio, sustentación y avance', await ev(`(() => { const t = [...document.querySelectorAll('ul li span')].map(s => s.textContent); return ['Completar un ejercicio', 'Practicar tu sustentación', 'Registrar un avance'].every(x => t.includes(x)); })()`));
await ir('/academica/nada/nada', 2200);
verificar('Tema inexistente: no encontrado', await ev(`document.body.textContent.includes('Esta página no existe')`));

// 5) Móvil real (390)
await viewport(390, 844, true);
await ir('/', 2600);
await foto('10-movil-inicio');
await ir('/mi-aura', 2000);
await foto('11-movil-mi-aura');
await ir('/emocional', 2200);
await foto('12-movil-emocional-cabecera');
verificar('Móvil: entrada emocional sin desbordamiento', await ev(SIN_CORTES));
await ir('/emocional/estoy-agotado', 1800);
await foto('13-movil-categoria');
await ir('/emocional/estoy-agotado/necesito-descansar', 1800);
await foto('14-movil-video', true);
verificar('Móvil: página de video sin desbordamiento', await ev(SIN_CORTES));
await ir('/academica', 2000);
await foto('15-movil-academica');
verificar('Móvil: ruta académica sin desbordamiento', await ev(SIN_CORTES));
await ir('/academica/planteamiento/problema', 2000);
await foto('16-movil-guia', true);
verificar('Móvil: guía sin desbordamiento', await ev(SIN_CORTES));
await ir('/academica/laboratorios/planteamiento', 2000);
await foto('17-movil-lab', true);
verificar('Móvil: laboratorio sin desbordamiento', await ev(SIN_CORTES));
verificar('Avatar discreto en la cabecera', await ev(`!!document.querySelector('header a[href="/mi-aura"] svg')`));
verificar('Sin desbordamiento horizontal en móvil', await ev(SIN_CORTES));

// 6) Borrar datos
await viewport(1440, 900);
await ir('/mi-aura', 1500);
await clicTexto('Borrar todos mis datos');
await dormir(400);
await clicTexto('Borrar todo', 'dialog button');
await dormir(800);
verificar('Borrar todo vuelve al estado inicial', await ev(`document.body.textContent.includes('Tu AURA aún no ha nacido')`));
await ir('/emocional', 1800);
verificar('Borrar todo también elimina guardados y aprendizajes', await ev(`!document.body.textContent.includes('Tus guardados')`));
await ir('/academica', 1800);
verificar('Borrar todo también elimina temas marcados y avances académicos', await ev(`!document.body.textContent.includes('(explorado)') && !document.body.textContent.includes('Tus avances recientes')`));

// 7) Datos corruptos en el navegador: error recuperable, nunca una pantalla rota
await ev(`new Promise((ok, mal) => { const r = indexedDB.open('aura', 3); r.onsuccess = () => { const tx = r.result.transaction(['mi-aura', 'emocional'], 'readwrite'); tx.objectStore('mi-aura').put({ version: 99, basura: true }, 'estado'); tx.objectStore('emocional').put({ version: 1, guardados: ['<script>', 42], vistos: 'x', aprendizajes: [{}] }, 'estado'); tx.oncomplete = () => { r.result.close(); ok(true); }; tx.onerror = () => mal(tx.error); }; r.onerror = () => mal(r.error); })`);
await ir('/mi-aura', 1800);
verificar('Datos corruptos de Mi AURA: aviso con opción de empezar de nuevo', await ev(`document.body.textContent.includes('No pudimos leer los datos de tu AURA') && [...document.querySelectorAll('button')].some(b => b.textContent.includes('Empezar de nuevo'))`));
await ir('/emocional', 1800);
verificar('Datos emocionales manipulados: se normalizan sin romper la página', await ev(`document.querySelector('h1')?.textContent === '¿Cómo te sientes hoy?' && !document.body.textContent.includes('Tus guardados')`));
await ir('/mi-aura', 1500);
await clicTexto('Empezar de nuevo');
await dormir(800);
verificar('«Empezar de nuevo» recupera la app', await ev(`document.body.textContent.includes('Tu AURA aún no ha nacido')`));


const ok = informe('Prueba funcional E2E', resultados, errores);
nav.cerrar();
servidor.cerrar();
process.exit(ok ? 0 : 1);
