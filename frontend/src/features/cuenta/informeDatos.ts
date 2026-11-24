// «Tus datos en AURA»: la exportación en un documento que cualquier persona puede
// leer, imprimir o guardar como PDF (en lugar de un JSON técnico). Puro: recibe los
// datos exportados y cómo nombrar cada contenido; no conoce React ni el catálogo.

export interface Nombres {
  /** Título legible de un video (`emocional.<categoria>.<subtema>` o `academico.<etapa>.<tema>`). */
  video: (id: string) => string | undefined;
  /** Título de un tema de la ruta académica. */
  tema: (id: string) => string | undefined;
  /** Título de una actividad de laboratorio (`<laboratorio>/<actividad>`). */
  actividad: (clave: string) => string | undefined;
  /** Nombre de una etapa de evolución de Mi AURA. */
  etapa?: string | undefined;
  /** Texto legible de opciones guardadas por id (color, forma, expresión, momento…). */
  opcion: (grupo: 'color' | 'forma' | 'expresion' | 'momento' | 'experiencia', id: string) => string | undefined;
}

type Registro = Record<string, unknown>;
const esRegistro = (v: unknown): v is Registro => typeof v === 'object' && v !== null && !Array.isArray(v);
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const texto = (v: unknown): string => (typeof v === 'string' ? v : '');

const escapar = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const fmtFecha = (iso: unknown, conHora = false): string => {
  const d = new Date(texto(iso));
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric', ...(conHora ? { hour: '2-digit', minute: '2-digit' } : {}) });
};

const vacio = (msg: string) => `<p class="vacio">${escapar(msg)}</p>`;

function filas(pares: Array<[string, string]>): string {
  return `<dl>${pares.map(([k, v]) => `<div><dt>${escapar(k)}</dt><dd>${escapar(v)}</dd></div>`).join('')}</dl>`;
}

function tabla(cabeceras: string[], datos: string[][]): string {
  return `<table><thead><tr>${cabeceras.map((c) => `<th scope="col">${escapar(c)}</th>`).join('')}</tr></thead><tbody>${datos
    .map((f) => `<tr>${f.map((c) => `<td>${escapar(c)}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;
}

/** Nombre legible de lo que se registró en una experiencia (`video:…`, `lab:…`, `guia:…`). */
function contenidoDe(ref: string, n: Nombres): string {
  const [prefijo, ...resto] = ref.split(':');
  const id = resto.join(':');
  if (prefijo === 'video') return n.video(id) ?? 'Un video';
  if (prefijo === 'lab') return n.actividad(id) ?? 'Una actividad de laboratorio';
  if (prefijo === 'guia' || prefijo === 'tema') return n.tema(id) ?? 'Una guía';
  return '—';
}

export function informeHtml(exportado: unknown, n: Nombres): string {
  const raiz = esRegistro(exportado) ? exportado : {};
  const cuenta = esRegistro(raiz.cuenta) ? raiz.cuenta : {};
  const datos = esRegistro(raiz.datos) ? raiz.datos : {};
  const aura = esRegistro(datos['mi-aura']) ? datos['mi-aura'] : {};
  const emo = esRegistro(datos.emocional) ? datos.emocional : {};
  const aca = esRegistro(datos.academica) ? datos.academica : {};

  // — Tu cuenta —
  const secCuenta = filas([
    ['Correo', texto(cuenta.correo) || '—'],
    ['Cuenta creada', fmtFecha(cuenta.creado)],
    ['Aceptaste el tratamiento de datos', `${fmtFecha(cuenta.consentimiento_fecha)} (versión ${texto(cuenta.consentimiento_version) || '—'})`],
  ]);

  // — Tu AURA —
  const pref = esRegistro(aura.preferencias) ? aura.preferencias : {};
  const onb = esRegistro(aura.onboarding) ? aura.onboarding : {};
  const experiencias = lista(aura.experiencias).filter(esRegistro);
  const secAura = onb.completado
    ? filas([
        ['Nombre', texto(pref.nombre) || '—'],
        ['Colores', [n.opcion('color', texto(pref.colorPrincipal)), n.opcion('color', texto(pref.colorComplementario))].filter(Boolean).join(' y ') || '—'],
        ['Forma', n.opcion('forma', texto(pref.forma)) ?? '—'],
        ['Expresión', n.opcion('expresion', texto(pref.expresion)) ?? '—'],
        ['Nació el', fmtFecha(onb.fechaInicio)],
        ['Momento de tu proyecto', onb.momentoProyecto ? (n.opcion('momento', texto(onb.momentoProyecto)) ?? texto(onb.momentoProyecto)) : 'No lo indicaste'],
        ...(n.etapa ? ([['Etapa actual', n.etapa]] as Array<[string, string]>) : []),
      ])
    : vacio('Todavía no le has dado vida a tu AURA.');
  const secExperiencias = experiencias.length
    ? tabla(
        ['Fecha', 'Qué viviste', 'Contenido'],
        [...experiencias]
          .sort((a, b) => texto(a.fecha).localeCompare(texto(b.fecha)))
          .map((e) => [fmtFecha(e.fecha), n.opcion('experiencia', texto(e.tipo)) ?? texto(e.tipo), contenidoDe(texto(e.refId), n)]),
      )
    : vacio('Aún no hay experiencias registradas.');

  // — AURA emocional —
  const guardados = lista(emo.guardados).map(texto).filter(Boolean);
  const vistos = esRegistro(emo.vistos) ? Object.entries(emo.vistos).filter(([, v]) => esRegistro(v)) : [];
  const aprendizajes = lista(emo.aprendizajes).filter(esRegistro);
  const secGuardados = guardados.length
    ? `<ul>${guardados.map((g) => `<li>${escapar(n.video(g) ?? 'Un video que ya no está disponible')}</li>`).join('')}</ul>`
    : vacio('No has guardado videos.');
  const secVistos = vistos.length
    ? tabla(
        ['Video', 'Avance'],
        vistos.map(([id, v]) => {
          const a = v as Registro;
          const pct = Math.round(Math.min(1, Math.max(0, Number(a.fraccion) || 0)) * 100);
          return [n.video(id) ?? 'Un video que ya no está disponible', a.completado ? 'Completo' : `${pct} % visto`];
        }),
      )
    : vacio('Aún no has visto videos.');
  const secAprendizajes = aprendizajes.length
    ? aprendizajes
        .map(
          (a) =>
            `<article class="nota"><header>${escapar(fmtFecha(a.fecha))} · ${escapar(n.video(texto(a.videoId)) ?? 'Video')}</header><p>${escapar(texto(a.texto))}</p></article>`,
        )
        .join('')
    : vacio('No has escrito aprendizajes.');

  // — AURA académica —
  const temas = esRegistro(aca.temas) ? Object.entries(aca.temas) : [];
  const avances = lista(aca.avances).filter(esRegistro);
  const actividades = esRegistro(aca.actividades) ? Object.entries(aca.actividades) : [];
  const ESTADO: Record<string, string> = { 'en-curso': 'Lo estoy trabajando', explorado: 'Ya lo exploré' };
  const secTemas = temas.length
    ? tabla(['Tema', 'Cómo vas'], temas.map(([id, e]) => [n.tema(id) ?? id, ESTADO[texto(e)] ?? texto(e)]))
    : vacio('No has marcado temas de la ruta.');
  const secAvances = avances.length
    ? avances
        .map(
          (a) =>
            `<article class="nota"><header>${escapar(fmtFecha(a.fecha))} · ${escapar(n.tema(texto(a.temaId)) ?? 'Tema')}</header><p>${escapar(texto(a.texto))}</p></article>`,
        )
        .join('')
    : vacio('No has registrado avances.');
  const secActividades = actividades.length
    ? tabla(['Actividad', 'Completada el'], actividades.map(([clave, f]) => [n.actividad(clave) ?? clave, fmtFecha(f)]))
    : vacio('No has completado actividades de laboratorio.');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Tus datos en AURA</title>
<style>
  :root { color-scheme: light; --tinta: #1f1838; --suave: #5b5373; --borde: #e3def0; --acento: #6b4fd8; --fondo: #faf8ff; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--fondo); color: var(--tinta); font: 16px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 48px 24px 72px; }
  h1 { font: 600 2.2rem/1.15 Georgia, "Times New Roman", serif; margin: 0 0 8px; }
  h2 { font: 600 1.45rem/1.2 Georgia, "Times New Roman", serif; margin: 40px 0 12px; padding-top: 24px; border-top: 1px solid var(--borde); }
  h3 { font-size: 1.05rem; margin: 24px 0 8px; }
  .lead { color: var(--suave); margin: 0 0 20px; }
  .acciones { display: flex; gap: 12px; flex-wrap: wrap; margin: 20px 0 8px; }
  button { font: inherit; font-weight: 600; padding: 10px 18px; border-radius: 999px; border: 0; background: var(--acento); color: #fff; cursor: pointer; }
  dl { display: grid; gap: 0; margin: 0; border: 1px solid var(--borde); border-radius: 12px; background: #fff; overflow: hidden; }
  dl div { display: grid; grid-template-columns: minmax(10rem, 1fr) 2fr; gap: 12px; padding: 10px 16px; border-top: 1px solid var(--borde); }
  dl div:first-child { border-top: 0; }
  dt { color: var(--suave); }
  dd { margin: 0; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid var(--borde); border-radius: 12px; overflow: hidden; }
  th, td { text-align: left; padding: 10px 14px; border-top: 1px solid var(--borde); vertical-align: top; }
  th { background: #f1edfb; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--suave); border-top: 0; }
  ul { margin: 0; padding-left: 1.2rem; }
  .nota { background: #fff; border: 1px solid var(--borde); border-radius: 12px; padding: 12px 16px; margin: 0 0 10px; }
  .nota header { font-size: 0.85rem; color: var(--suave); margin-bottom: 4px; }
  .nota p { margin: 0; white-space: pre-wrap; }
  .vacio { color: var(--suave); font-style: italic; margin: 0; }
  footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid var(--borde); color: var(--suave); font-size: 0.9rem; }
  @media (max-width: 560px) { dl div { grid-template-columns: 1fr; gap: 2px; } }
  @media print { body { background: #fff; } .acciones { display: none; } main { padding: 0; } h2 { break-after: avoid; } .nota, tr { break-inside: avoid; } }
</style>
</head>
<body>
<main>
  <h1>Tus datos en AURA</h1>
  <p class="lead">Este documento reúne todo lo que AURA guarda de tu cuenta. Generado el ${escapar(fmtFecha(raiz.exportado, true))}. Es privado: guárdalo en un lugar seguro.</p>
  <div class="acciones"><button type="button" onclick="window.print()">Imprimir o guardar como PDF</button></div>

  <h2>Tu cuenta</h2>
  ${secCuenta}

  <h2>Tu AURA</h2>
  ${secAura}
  <h3>Experiencias que la hicieron crecer</h3>
  ${secExperiencias}

  <h2>AURA emocional</h2>
  <h3>Videos guardados</h3>
  ${secGuardados}
  <h3>Videos vistos</h3>
  ${secVistos}
  <h3>Tus aprendizajes</h3>
  ${secAprendizajes}

  <h2>AURA académica</h2>
  <h3>Temas de tu ruta</h3>
  ${secTemas}
  <h3>Tus avances</h3>
  ${secAvances}
  <h3>Actividades de laboratorio</h3>
  ${secActividades}

  <footer>AURA no guarda cómo te sientes: solo lo que decides guardar. Puedes borrar tu cuenta y todos estos datos desde «Mi cuenta» en AURA.</footer>
</main>
</body>
</html>
`;
}
