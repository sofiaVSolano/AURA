import { Fragment, useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { Link } from 'react-router';
import {
  BotonEnlace,
  Esfera3D,
  Icono,
  PalabraAjustada,
  TransicionTinta,
  movimientoReducido,
  suave,
  tramo,
  useMedidas,
  useProgresoScroll,
  type EstadoEsfera,
} from '../../design-system/index.ts';
import { cx } from '../../lib/cx.ts';
import { apiHabilitada, sesion } from '../../lib/api.ts';
import { ruta, rutaTema } from '../academica/datos/catalogoAcademico.ts';
import { catalogoEmocional } from '../emocional/datos/catalogoEmocional.ts';
import { Orbe } from '../emocional/componentes/Orbe.tsx';
import { ETAPAS, PREFERENCIAS_INICIALES, indiceExpresion, indiceForma, matizDe, type PreferenciasAvatar } from '../mi-aura/dominio/modelo.ts';
import { useMiAura } from '../mi-aura/estado/MiAuraContexto.tsx';
import estilos from './InicioPage.module.css';

const limitar = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
/**
 * Escalón suave: el valor se detiene en cada entero y cambia rápido en la mitad.
 * Así cada etapa (o página) se queda quieta un rato mientras se lee, y el paso
 * a la siguiente es un movimiento corto y decidido, no un deslizamiento eterno.
 */
const escalon = (v: number) => {
  const base = Math.floor(v);
  const t = limitar((v - base - 0.3) / 0.4);
  return base + t * t * (3 - 2 * t);
};

/**
 * Geometría de la escena 3D según la ventana. La cámara ve ±1.355 unidades en
 * vertical; en horizontal, eso por la proporción. Así la esfera se coloca a la
 * derecha SIN invadir la columna de texto en cualquier ancho de escritorio.
 */
function geometria() {
  const movil = innerWidth < 768;
  const mitadAncho = 1.355 * (innerWidth / Math.max(1, innerHeight));
  return { movil, mitadAncho };
}

/**
 * Huecos libres en el teléfono (px desde arriba de la pantalla): la esfera se acomoda
 * entre lo que tiene encima (cabecera o título) y lo que tiene debajo (el texto).
 */
interface Huecos {
  portada: [number, number] | null;
  camino: [number, number] | null;
  /** Alto real del lienzo 3D (en el teléfono, con la barra del navegador, no siempre es innerHeight). */
  lienzo: number;
}

/** Alto visible del mundo 3D (la cámara ve ±1.355) y alto del personaje según su escala. */
const ALTO_MUNDO = 2.71;
const ALTO_ESFERA = 2.2;
const ALTO_PERSONAJE = 2.6; // con la antena de la última etapa

/** Escala y altura para que la figura quepa centrada en el hueco [arriba, abajo] (px). */
function encajar([arriba, abajo]: [number, number], altoRelativo: number, maximo: number, altoLienzo: number) {
  const alto = Math.max(1, altoLienzo);
  const disponible = (Math.max(0, abajo - arriba) / alto) * ALTO_MUNDO;
  const escala = Math.max(0.2, Math.min(maximo, disponible / altoRelativo));
  const centro = (arriba + abajo) / 2;
  return { escala, y: ALTO_MUNDO / 2 - (centro / alto) * ALTO_MUNDO };
}

/** Coloca a tu AURA: `salida` 0 = portada, 1 = camino de etapas. */
function colocarEsfera(e: EstadoEsfera, salida: number, huecos?: Huecos | null) {
  const { movil, mitadAncho: m } = geometria();
  if (movil) {
    e.x = 0;
    const hueco = salida < 0.5 ? huecos?.portada : huecos?.camino;
    if (!huecos || !hueco) {
      // Antes de medir: posición aproximada en la franja superior
      e.y = 0.62 - salida * 0.2;
      e.escala = 0.42;
      return;
    }
    // Medido: nunca pegada a la cabecera ni al título, ni encima del texto
    const f =
      salida < 0.5
        ? encajar(hueco, ALTO_ESFERA, Math.min(0.46, m * 0.7), huecos.lienzo)
        : encajar(hueco, ALTO_PERSONAJE, Math.min(0.5, m * 0.78), huecos.lienzo);
    e.escala = f.escala;
    e.y = f.y;
    return;
  }
  const escalaPortada = Math.min(0.98, m * 0.4);
  const escalaCamino = Math.min(0.8, m * 0.36);
  const xPortada = m - escalaPortada * 1.3;
  const xCamino = m - escalaCamino * 1.45;
  e.escala = escalaPortada + (escalaCamino - escalaPortada) * salida;
  e.x = xPortada + (xCamino - xPortada) * salida;
  e.y = -0.04 + salida * 0.2;
}

/** Ajusta el tamaño de letra para que la palabra más ancha quepa en su contenedor. */
function useAjustarAlAncho(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ajustar = () => {
      el.style.removeProperty('font-size');
      const base = parseFloat(getComputedStyle(el).fontSize);
      const disponible = el.clientWidth;
      const mayor = Math.max(...[...el.children].map((c) => (c as HTMLElement).scrollWidth));
      if (mayor > disponible && disponible > 0) el.style.fontSize = `${Math.floor((base * disponible) / mayor) - 1}px`;
    };
    ajustar();
    let vivo = true;
    document.fonts?.ready.then(() => vivo && ajustar());
    addEventListener('resize', ajustar);
    return () => {
      vivo = false;
      removeEventListener('resize', ajustar);
    };
  }, [ref]);
}

/** Distancia desde arriba de la página (con offsetTop: ignora las animaciones de entrada). */
function arribaEnPagina(el: HTMLElement) {
  let y = 0;
  for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) y += n.offsetTop;
  return y;
}

/** Margen entre la figura y el texto que la rodea. */
const AIRE = 20;
/** Alto de la cabecera flotante del inicio. */
const CABECERA = 60;

function medirHuecos(
  portada: HTMLElement | null,
  texto: HTMLElement | null,
  titulo: HTMLElement | null,
  nombres: HTMLElement | null,
  lienzo: HTMLElement | null,
): Huecos | null {
  if (!(portada && texto) && !(titulo && nombres)) return null;
  // Portada: entre la cabecera y el comienzo del texto
  const enPortada: [number, number] | null =
    portada && texto ? [CABECERA + 32, arribaEnPagina(texto) - arribaEnPagina(portada) - AIRE] : null;
  // Camino (fijo arriba de la pantalla): entre el título y el nombre de la etapa
  let enCamino: [number, number] | null = null;
  if (titulo && nombres) {
    const fijo = titulo.offsetParent as HTMLElement | null;
    const base = fijo ? arribaEnPagina(fijo) : 0;
    enCamino = [arribaEnPagina(titulo) - base + titulo.offsetHeight + AIRE, arribaEnPagina(nombres) - base - AIRE];
  }
  return { portada: enPortada, camino: enCamino, lienzo: lienzo?.clientHeight || innerHeight };
}

/** Etapa con la descripción más larga (reserva el alto del texto). */
const ETAPA_TEXTO_MAS_LARGO = ETAPAS.reduce(
  (mayor, e, k) => (e.descripcion.length > mayor.largo ? { k, largo: e.descripcion.length } : mayor),
  { k: 0, largo: -1 },
).k;

const TITULAR = 'Acompañamiento para tu proyecto de grado.'.split(' ');

/* ————————————————————————————————————————————————————————————————
   1 · Cosmos: tu AURA en 3D (en tus colores). Se usa dos veces: en la portada
   (la esfera junto al mensaje) y, más abajo, en el camino de sus cinco etapas.
   ———————————————————————————————————————————————————————————————— */
type ParteCosmos = 'portada' | 'camino';

function Cosmos({
  parte,
  preferencias,
  nombre,
  nacida,
  sesionActiva,
}: {
  parte: ParteCosmos;
  preferencias: PreferenciasAvatar;
  nombre: string;
  nacida: boolean;
  sesionActiva: boolean;
}) {
  const enPortada = parte === 'portada';
  const matizA = matizDe(preferencias.colorPrincipal);
  const matizB = matizDe(preferencias.colorComplementario);
  const cosmos = useRef<HTMLDivElement>(null);
  const portada = useRef<HTMLElement>(null);
  const portadaTexto = useRef<HTMLDivElement>(null);
  const lienzo = useRef<HTMLDivElement>(null);
  const camino = useRef<HTMLElement>(null);
  const caminoTitulo = useRef<HTMLHeadingElement>(null);
  const nombres = useRef<HTMLDivElement>(null);
  const medidor = useRef<HTMLOListElement>(null);
  const [activo, setActivo] = useState(0);
  const activoRef = useRef(0);

  const esfera = useRef<EstadoEsfera>(null as unknown as EstadoEsfera);
  if (!esfera.current) {
    esfera.current = { x: 0, y: 0, escala: 1, etapa: 0, matizA, matizB, energia: 0.15, forma: 0, expresion: 0, birrete: 0, aro: 0 };
    if (typeof window !== 'undefined') colocarEsfera(esfera.current, enPortada ? 0 : 1);
  }
  esfera.current.matizA = matizA;
  esfera.current.matizB = matizB;
  esfera.current.forma = indiceForma(preferencias.forma);
  esfera.current.expresion = indiceExpresion(preferencias.expresion);

  useAjustarAlAncho(nombres);
  const medidas = useMedidas(cosmos, () => ({
    portadaArriba: portada.current?.offsetTop ?? 0,
    portadaAlto: portada.current?.offsetHeight ?? 1,
    caminoArriba: camino.current?.offsetTop ?? 0,
    caminoAlto: camino.current?.offsetHeight ?? 1,
    huecos: medirHuecos(portada.current, portadaTexto.current, caminoTitulo.current, nombres.current, lienzo.current),
  }));

  useProgresoScroll(cosmos, (_p, { arriba, velocidad }) => {
    const m = medidas();
    if (!m) return;
    // Posiciones derivadas de la lectura suavizada del contenedor (sin saltos de rueda)
    const arribaPortada = arriba + m.portadaArriba;
    const arribaCamino = arriba + m.caminoArriba;
    // Portada: la esfera se queda junto al mensaje; camino: en su lugar entre título y texto
    void arribaPortada;
    const salida = enPortada ? 0 : 1;
    const recorrido = Math.max(1, m.caminoAlto - innerHeight);
    const etapa = limitar((-arribaCamino / recorrido) * 4.4 - 0.2, 0, 4);
    const e = esfera.current;
    colocarEsfera(e, salida, m.huecos);
    e.etapa = etapa;
    // La superficie se agita con la velocidad del scroll y vuelve sola a la calma
    e.energia = Math.min(1, 0.15 + velocidad / 40);

    // Nombres de etapa: se deslizan de forma continua con el scroll
    // (la que sale se va antes de que llegue la nueva: nunca se pisan)
    const visual = escalon(etapa);
    const reducido = movimientoReducido();
    nombres.current?.querySelectorAll<HTMLElement>('[data-k]').forEach((n) => {
      const d = Number(n.dataset.k) - visual;
      n.style.opacity = limitar(1 - Math.abs(d) * 2.2).toFixed(3);
      n.style.transform = reducido ? '' : `translate3d(0, ${(d * 45).toFixed(2)}%, 0)`;
      n.style.visibility = Math.abs(d) < 0.5 ? 'visible' : 'hidden';
    });
    medidor.current?.querySelectorAll<HTMLElement>('li').forEach((li, k) => {
      li.style.setProperty('--lleno', limitar(visual - k + 1).toFixed(3));
    });
    const k = Math.round(etapa);
    if (k !== activoRef.current) {
      activoRef.current = k;
      setActivo(k);
    }
  });

  return (
    <div ref={cosmos} data-ambito="mi-aura" className={cx(estilos.cosmos, 'sangrado')}>
      <div ref={lienzo} className={estilos.lienzo}>
        <Esfera3D estado={esfera} />
      </div>

      {enPortada && (
      <section ref={portada} className={estilos.portada} aria-labelledby="titulo-inicio">
        <div ref={portadaTexto} className={estilos.portadaTexto}>
          {nacida && <p className={estilos.saludo}>Hola de nuevo. {nombre} te estaba esperando.</p>}
          <h1 id="titulo-inicio" className={estilos.titular}>
            {TITULAR.map((palabra, i) => (
              <Fragment key={i}>
                <span className={estilos.palabra}>
                  <span style={{ '--i': i } as CSSProperties}>{palabra}</span>
                </span>{' '}
              </Fragment>
            ))}
          </h1>
          <p className={estilos.bajada}>Guías paso a paso para escribirlo y videos breves para los días difíciles.</p>
          <div className={estilos.acciones}>
            <AccionPrincipal nacida={nacida} nombre={nombre} sesionActiva={sesionActiva} />
          </div>
        </div>
        <a href="#que-encuentras" className={estilos.bajar}>
          Qué encuentras en AURA
          <span aria-hidden="true" />
        </a>
      </section>
      )}

      {!enPortada && (
      <section ref={camino} className={cx(estilos.camino, estilos.caminoSolo)} aria-labelledby="titulo-camino">
        <div className={estilos.caminoFijo}>
          <h2 ref={caminoTitulo} id="titulo-camino" className={estilos.caminoTitulo}>
            Mi AURA crece con lo que haces
          </h2>
          <div ref={nombres} className={estilos.nombres} aria-hidden="true">
            {ETAPAS.map((e, k) => (
              <span key={e.id} data-k={k}>
                {e.nombre}
              </span>
            ))}
          </div>
          <div className={estilos.detalle} aria-hidden="true">
            {/* Una copia invisible del texto más largo fija el alto del bloque: así el
                nombre de la etapa no salta y tu AURA cabe igual en todas las etapas */}
            <div className={estilos.detalleCaja}>
              {[{ k: activo, medida: false }, { k: ETAPA_TEXTO_MAS_LARGO, medida: true }].map(({ k, medida }) => (
                <p key={medida ? 'medida' : k} className={cx(estilos.detalleTexto, medida && estilos.detalleMedida)}>
                  {ETAPAS[k]?.descripcion}
                </p>
              ))}
            </div>
            <ol ref={medidor} className={estilos.medidor}>
              {ETAPAS.map((e) => (
                <li key={e.id} />
              ))}
            </ol>
          </div>
        </div>
        {/* Contenido real para lectores de pantalla y para el ritmo del scroll */}
        <ol className={estilos.pasos}>
          {ETAPAS.map((e) => (
            <li key={e.id}>
              <span className="visualmente-oculto">
                {e.nombre}. {e.descripcion}
              </span>
            </li>
          ))}
        </ol>
      </section>
      )}
    </div>
  );
}

/**
 * El único llamado principal de la portada, según quién visita:
 * sin cuenta, crearla (AURA pide sesión para guardar tu avance); con cuenta y sin AURA,
 * darle vida; con AURA, visitarla.
 */
function AccionPrincipal({ nacida, nombre, sesionActiva }: { nacida: boolean; nombre: string; sesionActiva: boolean }) {
  if (nacida)
    return (
      <BotonEnlace to="/mi-aura" tamano="lg" iconoFin="flecha">
        Visitar a {nombre}
      </BotonEnlace>
    );
  if (apiHabilitada && !sesionActiva)
    return (
      <BotonEnlace to="/cuenta?modo=registro" tamano="lg" iconoFin="flecha">
        Crear mi cuenta
      </BotonEnlace>
    );
  return (
    <BotonEnlace to="/comenzar" tamano="lg" iconoFin="flecha">
      Empezar
    </BotonEnlace>
  );
}

/* ————————————————————————————————————————————————————————————————
   Qué encuentras: el propósito de AURA en tres líneas, justo después
   de la portada (antes, este mapa aparecía recién al final).
   ———————————————————————————————————————————————————————————————— */
const SECCIONES = [
  { to: '/academica', titulo: 'AURA académica', texto: 'Guías, ejemplos y ejercicios para cada parte de tu proyecto, de la idea a la sustentación.' },
  { to: '/emocional', titulo: 'AURA emocional', texto: 'Videos breves para cuando sientes miedo, cansancio o frustración con tu proyecto.' },
  { to: '/mi-aura', titulo: 'Mi AURA', texto: 'Un personaje que crece con cada guía, video o práctica que completas.' },
] as const;

function QueEncuentras() {
  return (
    <section id="que-encuentras" data-ambito="mi-aura" className={cx(estilos.encuentras, 'sangrado')} aria-labelledby="titulo-encuentras">
      <h2 id="titulo-encuentras" className={estilos.encuentrasTitulo}>
        Qué encuentras en AURA
      </h2>
      <nav aria-labelledby="titulo-encuentras" className={estilos.mapa}>
        {SECCIONES.map((d) => (
          <Link key={d.to} to={d.to} viewTransition className={estilos.destino}>
            <span className={estilos.destinoTitulo}>
              {d.titulo} <Icono nombre="flecha" tamano={18} />
            </span>
            <span className={estilos.destinoTexto}>{d.texto}</span>
          </Link>
        ))}
      </nav>
    </section>
  );
}

/* ————————————————————————————————————————————————————————————————
   2 · Mundo académico: la tinta abre el papel; las etapas de la ruta
   pasan en horizontal como páginas de un cuaderno.
   ———————————————————————————————————————————————————————————————— */
const dosCifras = (n: number) => String(n).padStart(2, '0');

function MundoAcademico() {
  const portada = useRef<HTMLDivElement>(null);
  const pista = useRef<HTMLElement>(null);
  const tira = useRef<HTMLDivElement>(null);
  const riel = useRef<HTMLOListElement>(null);
  const totalTemas = ruta.etapas.reduce((n, e) => n + e.temas.length, 0);

  const medidas = useMedidas(tira, (t) => ({
    ancho: t.scrollWidth,
    centros: ([...t.children] as HTMLElement[]).map((pg) => pg.offsetLeft + pg.offsetWidth / 2),
  }));

  useProgresoScroll(pista, (p) => {
    const t = tira.current;
    const m = medidas();
    if (!t || !m) return;
    const paginas = [...t.children] as HTMLElement[];
    if (geometria().movil) {
      t.style.removeProperty('transform');
      paginas.forEach((pg) => pg.style.removeProperty('--foco'));
      return;
    }
    const sobra = Math.max(0, m.ancho - innerWidth);
    // Cada página se detiene centrada un momento antes de dar paso a la siguiente
    const n = ruta.etapas.length - 1;
    const pv = movimientoReducido() ? p : escalon(p * n) / n;
    const x = -pv * sobra;
    t.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
    // La página más cercana al centro queda en foco; las demás se retiran un poco
    paginas.forEach((pg, k) => {
      const centro = (m.centros[k] ?? 0) + x - innerWidth / 2;
      pg.style.setProperty('--foco', limitar(1 - Math.abs(centro) / (innerWidth * 0.75)).toFixed(3));
    });
    const posicion = pv * n;
    riel.current?.querySelectorAll<HTMLElement>('li').forEach((li, k) => {
      li.dataset.estado = k < Math.round(posicion) ? 'hecho' : k === Math.round(posicion) ? 'actual' : 'pendiente';
    });
    riel.current?.style.setProperty('--avance', pv.toFixed(4));
  });

  return (
    <>
      <TransicionTinta
        desde="mi-aura"
        hacia="academico"
        etiqueta="AURA académica"
        alProgreso={(p) => portada.current?.style.setProperty('--r', suave(tramo(p, 0, 0.32)).toFixed(4))}
      >
        <div ref={portada} className={estilos.academicaPortada}>
          <div className={estilos.academicaMarca}>
            <PalabraAjustada texto="Académica" />
          </div>
          <div className={estilos.academicaTexto}>
            <h2 className={estilos.academicaTitulo}>Tu proyecto de grado, etapa por etapa.</h2>
            <div className={estilos.academicaCuerpo}>
              <p>
                {ruta.etapas.length} etapas y {totalTemas} temas, cada uno con su guía y ejemplos.
              </p>
              <Link to="/academica" viewTransition className={estilos.enlaceFuerte}>
                Entrar a AURA académica <Icono nombre="flecha" tamano={20} />
              </Link>
            </div>
          </div>
        </div>
      </TransicionTinta>

      <section
        ref={pista}
        data-ambito="academico"
        className={cx(estilos.pista, 'sangrado', 'textura-grano')}
        style={{ '--paginas': ruta.etapas.length } as CSSProperties}
        aria-labelledby="titulo-ruta"
      >
        <div className={estilos.pistaFija}>
          <header className={estilos.pistaCabecera}>
            <h2 id="titulo-ruta" className={estilos.pistaTitulo}>
              La ruta
            </h2>
            <ol ref={riel} className={estilos.riel} aria-hidden="true">
              {ruta.etapas.map((etapa, k) => (
                <li key={etapa.id} data-estado={k === 0 ? 'actual' : 'pendiente'}>
                  <span>{dosCifras(k + 1)}</span> {etapa.titulo}
                </li>
              ))}
            </ol>
          </header>
          <div className={estilos.ventana}>
            <div ref={tira} className={estilos.tira}>
              {ruta.etapas.map((etapa, k) => (
                <article key={etapa.id} className={estilos.pagina} data-tono={k % 3}>
                  <div className={estilos.paginaCabeza}>
                    <span className={estilos.paginaNumero} aria-hidden="true">
                      {dosCifras(k + 1)}
                    </span>
                    <span className={estilos.paginaConteo}>
                      Etapa {k + 1} de {ruta.etapas.length} · {etapa.temas.length} temas
                    </span>
                  </div>
                  <h3 className={estilos.paginaTitulo}>{etapa.titulo}</h3>
                  <p className={estilos.paginaTexto}>{etapa.descripcion}</p>
                  {etapa.temas[0] && (
                    <Link to={rutaTema({ etapa, tema: etapa.temas[0] })} viewTransition className={estilos.paginaEnlace}>
                      Empezar por «{etapa.temas[0].titulo}» <Icono nombre="flecha" tamano={18} />
                    </Link>
                  )}
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ————————————————————————————————————————————————————————————————
   3 · Mundo emocional: vuelve la noche. Las emociones giran en un
   carrusel 3D que avanza con el scroll; la del frente se presenta.
   ———————————————————————————————————————————————————————————————— */
function MundoEmocional() {
  const categorias = catalogoEmocional.categorias;
  const anillo = useRef<HTMLDivElement>(null);
  const portada = useRef<HTMLDivElement>(null);
  const [frente, setFrente] = useState(0);
  const frenteRef = useRef(0);
  const paso = 360 / categorias.length;

  const alProgreso = (p: number) => {
    portada.current?.style.setProperty('--p', p.toFixed(4));
    const giro = -tramo(p, 0.3, 1) * 360 * ((categorias.length - 1) / categorias.length);
    anillo.current?.style.setProperty('--giro', `${giro}deg`);
    const k = (Math.round(-giro / paso) + categorias.length) % categorias.length;
    if (k !== frenteRef.current) {
      frenteRef.current = k;
      setFrente(k);
    }
  };

  const actual = categorias[frente];
  return (
    <TransicionTinta desde="academico" hacia="emocional" alto={420} cubreEn={0.22} etiqueta="AURA emocional" alProgreso={alProgreso}>
      <div ref={portada} className={estilos.emocional}>
        <h2 className={estilos.emocionalTitulo}>{catalogoEmocional.pregunta}</h2>
        <div className={estilos.escenario}>
          <div ref={anillo} className={estilos.anillo} style={{ '--n': categorias.length } as CSSProperties}>
            {categorias.map((c, i) => (
              <Link
                key={c.id}
                to={`/emocional/${c.id}`}
                viewTransition
                className={estilos.emocion}
                data-frente={i === frente || undefined}
                style={{ '--angulo': `${i * paso}deg` } as CSSProperties}
              >
                <Orbe matiz={c.matiz} tamano={150} className={estilos.emocionOrbe} />
                <span className={estilos.emocionNombre}>{c.nombre}</span>
              </Link>
            ))}
          </div>
        </div>
        {actual && (
          <p key={actual.id} className={estilos.emocionDescripcion} aria-live="polite">
            {actual.descripcion}
          </p>
        )}
        <p className={estilos.privacidad}>Tu elección no se guarda. AURA acompaña; no reemplaza la atención profesional.</p>
      </div>
    </TransicionTinta>
  );
}

/* ————————————————————————————————————————————————————————————————
   4 · Cierre: tu AURA vuelve, en la etapa en la que está, y la página
   termina con un mapa claro y el nombre a todo lo ancho (sin cortes).
   ———————————————————————————————————————————————————————————————— */
function Cierre({ nacida, preferencias, etapa }: { nacida: boolean; preferencias: PreferenciasAvatar; etapa: number }) {
  const nombre = preferencias.nombre;
  const matizA = matizDe(preferencias.colorPrincipal);
  const matizB = matizDe(preferencias.colorComplementario);

  const seccion = useRef<HTMLElement>(null);
  const esfera = useRef<EstadoEsfera>({ x: 0, y: 0, escala: 0.5, etapa: 0, matizA, matizB, energia: 0.15, forma: 0, expresion: 0, birrete: 0, aro: 0 });
  Object.assign(esfera.current, {
    matizA,
    matizB,
    forma: indiceForma(preferencias.forma),
    expresion: indiceExpresion(preferencias.expresion),
  });

  useProgresoScroll(seccion, (_p, { arriba, velocidad }) => {
    // 0 cuando el cierre asoma por abajo; 1 cuando llega arriba
    const entrada = suave(tramo(1 - arriba / innerHeight, 0.1, 1));
    const e = esfera.current;
    e.escala = 0.55 + entrada * 0.2;
    // Tu AURA se forma al llegar, hasta la etapa en la que está
    e.etapa = entrada * etapa;
    e.energia = Math.min(1, 0.15 + velocidad / 40);
    seccion.current?.style.setProperty('--entrada', entrada.toFixed(4));
  });

  return (
    <section ref={seccion} data-ambito="mi-aura" className={cx(estilos.cierre, 'sangrado', 'textura-grano')} aria-labelledby="titulo-cierre">
      <div className={estilos.cierreEscena}>
        <div className={estilos.cierreTexto}>
          <h2 id="titulo-cierre" className={estilos.cierreFrase}>
            {nacida ? `${nombre} sigue aquí.` : 'No tienes que hacerlo a ciegas.'}
          </h2>
          <p className={estilos.cierreBajada}>
            {nacida ? 'Cada paso que das la hace crecer. Las pausas nunca restan.' : 'Empieza cuando quieras y avanza a tu ritmo.'}
          </p>
          <AccionPrincipal nacida={nacida} nombre={nombre} sesionActiva={sesion.activa} />
        </div>
        <div className={estilos.cierreEsfera}>
          <Esfera3D estado={esfera} />
        </div>
      </div>

      <div className={estilos.marca}>
        <PalabraAjustada texto="AURA" />
      </div>
      <p className={estilos.autora}>
        Autora: <strong>Sofia Valencia Solano</strong>
      </p>
      <p className={estilos.legal}>
        AURA acompaña; no reemplaza la atención profesional. Tus datos son tuyos: puedes verlos y borrarlos en Mi AURA.
      </p>
    </section>
  );
}

export function InicioPage() {
  const { carga, evolucion } = useMiAura();
  const datos = carga.estado === 'listo' ? carga.datos : null;
  const nacida = Boolean(datos?.onboarding.completado && evolucion);
  // Sin AURA propia se muestra un personaje de ejemplo, con los ojos abiertos
  const p = nacida && datos ? datos.preferencias : { ...PREFERENCIAS_INICIALES, expresion: 'alegre' as const };
  return (
    <div className={estilos.inicio}>
      {/* 1 · Qué es AURA  2 · Qué encuentras  3-4 · Académica y emocional  5 · Tu AURA  6 · Cierre */}
      <Cosmos parte="portada" preferencias={p} nombre={p.nombre} nacida={nacida} sesionActiva={sesion.activa} />
      <QueEncuentras />
      <MundoAcademico />
      <MundoEmocional />
      <Cosmos parte="camino" preferencias={p} nombre={p.nombre} nacida={nacida} sesionActiva={sesion.activa} />
      {/* Fuera del cosmos: la esfera y los nombres dejan la pantalla juntos, sin pisarse */}
      <div data-ambito="mi-aura" className={cx(estilos.notaFondo, 'sangrado')}>
        <p className={estilos.nota}>
          Las pausas y los días difíciles <strong>nunca restan</strong>.
        </p>
      </div>
      <Cierre nacida={nacida} preferencias={p} etapa={nacida ? (evolucion?.indice ?? 0) : 0} />
    </div>
  );
}
