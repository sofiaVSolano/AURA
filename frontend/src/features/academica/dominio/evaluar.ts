// Evaluación formativa de actividades. Explica cómo mejorar; nunca emite un
// veredicto definitivo ni una "nota". Pura y probada (tests/academica.test.ts).
import type { Actividad, Retroalimentacion } from './modelo.ts';

type De<T extends Actividad['tipo']> = Extract<Actividad, { tipo: T }>;

const resumen = (items: Retroalimentacion['items'], siTodo: string, siNo: string): Retroalimentacion => {
  const logrados = items.filter((i) => i.estado === 'bien').length;
  return { logrados, total: items.length, items, sugerencia: logrados === items.length ? siTodo : siNo };
};

export function evaluarOrdenar(a: De<'ordenar'>, orden: readonly string[]): Retroalimentacion {
  const items = orden.map((id, i) => {
    const item = a.items.find((x) => x.id === id);
    const bien = a.ordenEsperado[i] === id;
    return { id, estado: bien ? ('bien' as const) : ('revisar' as const), mensaje: bien ? 'Esta posición sigue un orden lógico habitual.' : (item?.pista ?? '') };
  });
  return resumen(
    items,
    'Tu orden sigue una lógica clara. Recuerda que algunas instituciones piden variaciones: revisa su guía.',
    'Revisa las pistas de los fragmentos señalados: piensa qué necesita saber el lector antes de cada uno.',
  );
}

export function evaluarClasificar(a: De<'clasificar'>, respuestas: Readonly<Record<string, string | null>>): Retroalimentacion {
  const items = a.items.map((it) => {
    const bien = respuestas[it.id] === it.categoria;
    const elegida = a.categorias.find((c) => c.id === respuestas[it.id])?.nombre;
    return {
      id: it.id,
      estado: bien ? ('bien' as const) : ('revisar' as const),
      mensaje: bien ? it.explicacion : `${elegida ? `Lo ubicaste en «${elegida}». ` : 'Aún no lo ubicas. '}${it.explicacion}`,
    };
  });
  return resumen(items, 'Distingues bien cada parte. Úsalas como guía al escribir la tuya.', 'Lee las explicaciones de los fragmentos señalados y vuelve a intentarlo.');
}

export function evaluarElegir(a: De<'elegir'>, respuestas: Readonly<Record<string, string | null>>): Retroalimentacion {
  const items = a.preguntas.map((p) => {
    const op = p.opciones.find((o) => o.id === respuestas[p.id]);
    const mejor = p.opciones.find((o) => o.adecuada);
    if (!op) return { id: p.id, estado: 'revisar' as const, mensaje: 'Elige una opción para recibir comentarios.' };
    return {
      id: p.id,
      estado: op.adecuada ? ('bien' as const) : ('revisar' as const),
      mensaje: op.adecuada ? op.explicacion : `${op.explicacion}${mejor ? ` Compara con: «${mejor.texto}».` : ''}`,
    };
  });
  return resumen(items, 'Buen criterio. Aplica las mismas preguntas a tu propio texto.', 'Revisa los comentarios: cada uno explica qué hace más clara una opción.');
}

export function evaluarMarcar(a: De<'marcar'>, marcados: ReadonlySet<string>): Retroalimentacion {
  const items = a.items
    .filter((it) => it.marcar || marcados.has(it.id))
    .map((it) => {
      const bien = it.marcar === marcados.has(it.id);
      return { id: it.id, estado: bien ? ('bien' as const) : ('revisar' as const), mensaje: it.explicacion };
    });
  return resumen(items, 'Identificaste los puntos clave. Revisa tu propio texto con esta misma lista.', 'Mira los puntos señalados: la explicación indica qué observar.');
}

// — Simulador de sustentación —

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Palabras por segundo al hablar con calma (≈ 130 por minuto). */
export const PALABRAS_POR_SEGUNDO = 2.2;

export function contarPalabras(texto: string): number {
  return texto.trim() ? texto.trim().split(/\s+/).length : 0;
}

export function evaluarRespuestaSimulador(
  pregunta: De<'simulador'>['preguntas'][number],
  respuesta: string,
  tiempoSugeridoSegundos: number,
): Retroalimentacion {
  const t = normalizar(respuesta);
  const items: Retroalimentacion['items'] = pregunta.claves.map((k, i) => {
    const presente = k.palabras.some((p) => t.includes(normalizar(p)));
    return {
      id: `clave-${i}`,
      estado: presente ? 'bien' : 'revisar',
      mensaje: presente ? `Incluyes ${k.descripcion}.` : k.sugerencia,
    };
  });
  const palabras = contarPalabras(respuesta);
  const segundos = Math.round(palabras / PALABRAS_POR_SEGUNDO);
  let ritmo: string;
  if (palabras < 25) ritmo = 'Tu respuesta es muy breve: desarrolla un poco más la idea central con un dato o ejemplo.';
  else if (segundos < tiempoSugeridoSegundos * 0.4) ritmo = `Dicha en voz alta tomaría unos ${segundos} s de los ${tiempoSugeridoSegundos} s sugeridos: tienes espacio para desarrollarla con un dato o un ejemplo.`;
  else if (segundos > tiempoSugeridoSegundos * 1.3) ritmo = `Dicha en voz alta tomaría unos ${segundos} s; intenta sintetizar hacia ${tiempoSugeridoSegundos} s.`;
  else ritmo = `Dicha en voz alta tomaría unos ${segundos} s: un buen tiempo para esta pregunta.`;
  const r = resumen(items, '', '');
  return {
    ...r,
    sugerencia: `${ritmo} ${r.logrados === r.total ? 'Ensáyala en voz alta para ganar fluidez.' : 'Revisa los aspectos señalados y vuelve a intentarlo.'}`,
  };
}
