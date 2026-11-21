import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Esfera3D, Icono, movimientoReducido, useProgresoScroll, type EstadoEsfera } from '../../design-system/index.ts';
import { cx } from '../../lib/cx.ts';
import { perfilActivo } from '../../content/perfiles/perfil.ts';
import { useMiAura } from '../mi-aura/estado/MiAuraContexto.tsx';
import { PREFERENCIAS_INICIALES, indiceExpresion, indiceForma, matizDe } from '../mi-aura/dominio/modelo.ts';
import { listaLaboratorios, ruta, rutaLaboratorio, rutaTema, temaPorId } from './datos/catalogoAcademico.ts';
import { useAcademica } from './estado/AcademicaContexto.tsx';
import estilos from './AcademicaPage.module.css';

/*
 * Geometría del camino (en vw): tu AURA camina fija a INICIO vw del borde y el
 * mundo se desplaza. Cada parada está a PASO vw de la anterior; la meta, al final.
 */
const INICIO = 22;
const PASO = 80;
/** Tramo de salida: la portada ocupa el comienzo del camino. */
const SALIDA = 62;
const N = ruta.etapas.length;
const parada = (i: number) => INICIO + SALIDA + (i + 0.5) * PASO;
const META = parada(N);
const ANCHO = META + 100 - INICIO;
const RECORRIDO = META - INICIO;
/** Altura del camino (fracción de la pantalla) en la posición x (vw). */
const ONDA = (2 * Math.PI) / (PASO * 2);
const alturaCamino = (x: number) => 0.78 + 0.05 * Math.sin(ONDA * x - 0.5);
/** Pendiente del camino (dy/dx en fracción de pantalla por vw). */
const pendiente = (x: number) => 0.05 * ONDA * Math.cos(ONDA * x - 0.5);
/** Diámetro de las ruedas del carrito en px (para que giren al ritmo del avance). */
const RUEDA = 30;

const trazo = (() => {
  const puntos: string[] = [];
  for (let x = 0; x <= META + 2; x += 2) puntos.push(`${x === 0 ? 'M' : 'L'}${x} ${(alturaCamino(x) * 100).toFixed(2)}`);
  return puntos.join(' ');
})();

/** Cuenta hacia arriba al aparecer (sin animación con movimiento reducido). */
function useConteo(objetivo: number) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (movimientoReducido() || objetivo === 0) return setN(objetivo);
    let cuadro = 0;
    const inicio = performance.now();
    const paso = (t: number) => {
      const k = Math.min(1, (t - inicio) / 1400);
      setN(Math.round(objetivo * (1 - (1 - k) ** 3)));
      if (k < 1) cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [objetivo]);
  return n;
}

/** Inclina la tarjeta hacia el puntero (solo ratón). */
function inclinar(e: PointerEvent<HTMLElement>) {
  if (e.pointerType !== 'mouse') return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width - 0.5) * 8).toFixed(2)}deg`);
  el.style.setProperty('--rx', `${((0.5 - (e.clientY - r.top) / r.height) * 6).toFixed(2)}deg`);
}
function enderezar(e: PointerEvent<HTMLElement>) {
  e.currentTarget.style.setProperty('--ry', '0deg');
  e.currentTarget.style.setProperty('--rx', '0deg');
}

/** El viaje: un camino dibujado sobre papel, con cinco paradas y la meta. */
function Camino({ portada }: { portada: ReactNode }) {
  const { carga: cargaAura, evolucion } = useMiAura();
  const { carga } = useAcademica();
  const estadoAcad = carga.estado === 'listo' ? carga.datos : null;
  const datos = cargaAura.estado === 'listo' ? cargaAura.datos : null;
  const nacida = Boolean(datos?.onboarding.completado && evolucion);
  const p = nacida && datos ? datos.preferencias : { ...PREFERENCIAS_INICIALES, expresion: 'alegre' as const };

  const esfera = useRef<EstadoEsfera>({
    x: 0,
    y: 0,
    escala: 0.86,
    etapa: nacida && evolucion ? evolucion.indice : 3,
    matizA: matizDe(p.colorPrincipal),
    matizB: matizDe(p.colorComplementario),
    energia: 0.15,
    forma: indiceForma(p.forma),
    expresion: indiceExpresion(p.expresion),
    aro: 0,
  });
  Object.assign(esfera.current, {
    etapa: nacida && evolucion ? evolucion.indice : 3,
    matizA: matizDe(p.colorPrincipal),
    matizB: matizDe(p.colorComplementario),
    forma: indiceForma(p.forma),
  });

  const seccion = useRef<HTMLElement>(null);
  const viajero = useRef<HTMLDivElement>(null);
  const [activa, setActiva] = useState(-1);
  const activaRef = useRef(-1);

  useProgresoScroll(
    seccion,
    (prog, { velocidad }) => {
      const x = INICIO + prog * RECORRIDO;
      const el = seccion.current;
      el?.style.setProperty('--avance', prog.toFixed(4));
      // Tu AURA camina sobre el camino: sube y baja con él y da pasitos al avanzar
      // El carrito sigue el camino: sube, baja, se inclina con la pendiente y las ruedas giran
      const v = viajero.current;
      if (v) {
        const vw = innerWidth / 100;
        const angulo = Math.atan2(pendiente(x) * innerHeight, vw) * (180 / Math.PI);
        const traqueteo = Math.abs(Math.sin(x * 3.1)) * Math.min(velocidad, 5) * 0.5;
        v.style.setProperty('--y', `${(alturaCamino(x) * 100).toFixed(2)}`);
        v.style.setProperty('--inclina', `${angulo.toFixed(2)}deg`);
        v.style.setProperty('--traqueteo', `${(-traqueteo).toFixed(1)}px`);
        v.style.setProperty('--ruedas', `${(((x * vw) / (Math.PI * RUEDA)) * 360).toFixed(1)}deg`);
        v.dataset.andando = velocidad > 0.4 ? 'si' : 'no';
      }
      esfera.current.energia = Math.min(0.8, 0.15 + velocidad / 30);
      // Parada activa: la más cercana a tu AURA
      let a = -1;
      for (let i = 0; i <= N; i++) if (Math.abs(x - parada(i)) < PASO * 0.55) a = i;
      el?.style.setProperty('--salida', Math.min(1, (x - INICIO) / (SALIDA * 0.7)).toFixed(3));
      if (a !== activaRef.current) {
        activaRef.current = a;
        setActiva(a);
        if (a >= 0) esfera.current.expresion = a === N ? 2 : indiceExpresion(p.expresion);
      }
    },
    { rapidez: 7 },
  );

  return (
    <section
      ref={seccion}
      id="camino"
      className={estilos.viaje}
      aria-labelledby="titulo-camino"
      style={{ '--ancho': ANCHO, '--recorrido': RECORRIDO, '--inicio': INICIO } as CSSProperties}
    >
      <div className={estilos.escenario}>
        <div className={estilos.marcador} aria-hidden="true">
          <span>{activa >= 0 && activa < N ? `Parada ${activa + 1} de ${N} · ${ruta.etapas[activa]?.titulo}` : activa === N ? '¡Meta!' : 'En la salida'}</span>
          <span className={estilos.marcadorBarra} />
        </div>
        <h2 id="titulo-camino" className="visualmente-oculto">
          {ruta.nombre}: el camino hasta tu sustentación
        </h2>

        <div className={estilos.mundo}>
          {/* El camino */}
          <svg className={estilos.ruta} viewBox={`0 0 ${ANCHO} 100`} preserveAspectRatio="none" aria-hidden="true">
            <path d={trazo} className={estilos.rutaBorde} />
            <path d={trazo} className={estilos.rutaSuelo} />
            <path d={trazo} className={estilos.rutaGuia} />
          </svg>
          {/* Lo recorrido: el mismo camino, recortado hasta donde va tu AURA */}
          <div className={estilos.hechoCaja} aria-hidden="true">
            <svg className={estilos.rutaLarga} style={{ width: `${ANCHO}vw` }} viewBox={`0 0 ${ANCHO} 100`} preserveAspectRatio="none">
              <path d={trazo} className={estilos.rutaHecha} />
            </svg>
          </div>

          {/* La portada vive al comienzo del camino: se queda atrás al arrancar */}
          <div className={estilos.portada}>{portada}</div>

          <span className={estilos.salida} style={{ '--x': INICIO, '--y': alturaCamino(INICIO) * 100 } as CSSProperties} aria-hidden="true">
            Salida
          </span>

          <ol className={estilos.paradas} aria-label={ruta.nombre}>
            {ruta.etapas.map((etapa, i) => {
              const exploradas = etapa.temas.filter((t) => estadoAcad?.temas[t.id] === 'explorado').length;
              return (
                <li
                  key={etapa.id}
                  id={`etapa-${etapa.id}`}
                  className={estilos.parada}
                  data-activa={activa === i || undefined}
                  data-pasada={activa > i || undefined}
                  style={{ '--x': parada(i), '--y': alturaCamino(parada(i)) * 100, '--i': i } as CSSProperties}
                >
                  <span className={estilos.pin} aria-hidden="true">
                    <span>{i + 1}</span>
                  </span>
                  <article className={estilos.tarjeta} onPointerMove={inclinar} onPointerLeave={enderezar}>
                    <span className={estilos.cinta} aria-hidden="true" />
                    <header className={estilos.tarjetaCabeza}>
                      <span className={estilos.numeral} aria-hidden="true">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <h3 className={estilos.tarjetaTitulo}>{etapa.titulo}</h3>
                        <p className={estilos.tarjetaProgreso}>
                          {exploradas === 0 ? 'Por explorar' : `${exploradas} de ${etapa.temas.length} explorados`}
                        </p>
                      </div>
                    </header>
                    <p className={estilos.tarjetaDescripcion}>{etapa.descripcion}</p>
                    <ul className={estilos.temas}>
                      {etapa.temas.map((t, j) => {
                        const r = temaPorId(t.id);
                        const marca = estadoAcad?.temas[t.id];
                        return (
                          <li key={t.id} style={{ '--j': j } as CSSProperties}>
                            <Link
                              to={rutaTema({ etapa, tema: t })}
                              viewTransition
                              className={cx(estilos.tema, marca && estilos[marca], !r?.tieneGuia && estilos.pendiente)}
                              title={t.resumen}
                            >
                              <span className={estilos.temaNumero} aria-hidden="true">
                                {marca === 'explorado' ? <Icono nombre="check" tamano={14} /> : `${i + 1}.${j + 1}`}
                              </span>
                              <span className={estilos.temaTitulo}>{t.titulo}</span>
                              {marca === 'en-curso' && <span className={estilos.punto} aria-hidden="true" />}
                              <span className="visualmente-oculto">
                                {marca === 'explorado' ? ' (explorado)' : marca === 'en-curso' ? ' (lo estás trabajando)' : ''}
                                {!r?.tieneGuia ? ' (guía en preparación)' : ''}
                              </span>
                              <Icono nombre="flecha" tamano={16} className={estilos.temaFlecha} />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </article>
                </li>
              );
            })}
          </ol>

          {/* La meta */}
          <div className={estilos.meta} data-activa={activa === N || undefined} style={{ '--x': META, '--y': alturaCamino(META) * 100 } as CSSProperties}>
            <span className={estilos.bandera} aria-hidden="true" />
            <p className={estilos.metaTexto}>
              <span className={estilos.metaPalabra}>Meta</span>
              Tu {perfilActivo.proyecto.nombreTrabajo ?? 'proyecto de grado'}, listo para sustentar.
            </p>
            <a href="#laboratorios-seccion" className={estilos.metaBoton}>
              Practicar en los laboratorios
              <Icono nombre="flecha" tamano={18} />
            </a>
          </div>
        </div>

        {/* Tu AURA, en su carrito */}
        <div ref={viajero} className={estilos.viajero} data-andando="no" aria-hidden="true">
          <div className={estilos.vehiculo}>
            <span className={estilos.humo}>
              <span />
              <span />
              <span />
            </span>
            <div className={estilos.conductor}>
              <Esfera3D estado={esfera} resolucion={0.9} />
            </div>
            <svg className={estilos.carrito} viewBox="0 0 220 110">
              {/* Carrocería */}
              <path className={estilos.carroceria} d="M18 52 Q20 36 40 34 L74 34 Q84 34 88 44 L150 44 Q160 30 176 30 L188 30 Q206 32 206 52 L206 72 Q206 80 198 80 L26 80 Q16 80 16 70 Z" />
              <path className={estilos.franja} d="M22 62 L202 62 L202 68 L22 68 Z" />
              {/* Parabrisas */}
              <path className={estilos.parabrisas} d="M150 44 L168 14 L176 14 L160 44 Z" />
              {/* Faro y parachoques */}
              <circle className={estilos.faro} cx="200" cy="54" r="6" />
              <rect className={estilos.parachoques} x="10" y="72" width="200" height="8" rx="4" />
              {/* Ruedas */}
              {[56, 168].map((cx) => (
                <g key={cx} className={estilos.rueda} style={{ transformOrigin: `${cx}px 84px` }}>
                  <circle cx={cx} cy="84" r="20" className={estilos.llanta} />
                  <circle cx={cx} cy="84" r="9" className={estilos.tapacubo} />
                  <path d={`M${cx - 17} 84 H${cx + 17} M${cx} 67 V101`} className={estilos.rayos} />
                </g>
              ))}
            </svg>
          </div>
          <span className={estilos.sombra} />
        </div>
      </div>
    </section>
  );
}

/** AURA académica: la portada, el camino hasta la meta y los laboratorios. */
export function AcademicaPage() {
  const { carga } = useAcademica();
  const estado = carga.estado === 'listo' ? carga.datos : null;
  const trabajo = perfilActivo.proyecto.nombreTrabajo ?? 'proyecto de grado';
  const avances = estado ? [...estado.avances].reverse().slice(0, 3) : [];
  const totalTemas = ruta.etapas.reduce((n, e) => n + e.temas.length, 0);
  const explorados = ruta.etapas.reduce((n, e) => n + e.temas.filter((t) => estado?.temas[t.id] === 'explorado').length, 0);
  const conteo = useConteo(explorados);
  const labs = listaLaboratorios();

  const portada = (
    <>
      <p className={estilos.kicker}>AURA académica</p>
      <h1 className={estilos.titulo}>
        <span className={estilos.linea}>Tu {trabajo},</span>
        <span className={cx(estilos.linea, estilos.acento)}>paso a paso hasta la meta.</span>
      </h1>
      <p className={estilos.bajada}>Cinco paradas con sus guías, en el orden que necesites. Súbete: tu AURA conduce.</p>
      <dl className={estilos.cifras}>
        <div>
          <dt>temas explorados</dt>
          <dd>
            {String(conteo).padStart(2, '0')}
            <span>/{totalTemas}</span>
          </dd>
        </div>
        <div>
          <dt>paradas</dt>
          <dd>{String(ruta.etapas.length).padStart(2, '0')}</dd>
        </div>
        <div>
          <dt>laboratorios</dt>
          <dd>{String(labs.length).padStart(2, '0')}</dd>
        </div>
      </dl>
      <p className={estilos.arrancar} aria-hidden="true">
        Desliza para arrancar <span>→</span>
      </p>
      <details className={estilos.nota}>
        <summary>
          <Icono nombre="info" tamano={16} /> Esta ruta es orientativa
        </summary>
        <p>{ruta.nota}</p>
      </details>
    </>
  );

  return (
    <div className={estilos.pagina}>
      <Camino portada={portada} />

      <section id="laboratorios-seccion" className={estilos.seccion} aria-labelledby="laboratorios">
        <div className={estilos.seccionCabeza}>
          <p className={estilos.kicker}>Practica</p>
          <h2 id="laboratorios" className={estilos.seccionTitulo}>
            Laboratorios
          </h2>
          <p className={estilos.subtexto}>Practica con ejemplos antes de escribir lo tuyo. Los comentarios te dicen cómo mejorar, no te ponen nota.</p>
        </div>
        <ul className={estilos.labs}>
          {labs.map((l, i) => {
            const hechas = l.actividades.filter((a) => estado?.actividades[`${l.id}/${a.id}`]).length;
            const simulador = l.actividades.some((a) => a.tipo === 'simulador');
            return (
              <li key={l.id} className={cx(estilos.lab, simulador && estilos.labDestacado)} style={{ '--i': i } as CSSProperties}>
                <Link to={rutaLaboratorio(l.id)} viewTransition className={estilos.labEnlace} onPointerMove={inclinar} onPointerLeave={enderezar}>
                  <span className={estilos.labNumero} aria-hidden="true">
                    Lab {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className={estilos.labTitulo}>{l.titulo}</span>
                  <span className={estilos.labDescripcion}>{l.descripcion}</span>
                  <span className={estilos.labMeta}>
                    {l.actividades.length} {l.actividades.length === 1 ? 'actividad' : 'actividades'}
                    {hechas > 0 && ` · ${hechas} hecha${hechas === 1 ? '' : 's'}`}
                    <span className={estilos.labIr}>
                      <Icono nombre="flecha" tamano={18} />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {avances.length > 0 && (
        <section className={estilos.seccion} aria-labelledby="avances">
          <div className={estilos.seccionCabeza}>
            <p className={estilos.kicker}>Tu bitácora</p>
            <h2 id="avances" className={estilos.seccionTitulo}>
              Tus avances recientes
            </h2>
          </div>
          <ul className={estilos.avances}>
            {avances.map((a) => {
              const t = temaPorId(a.temaId);
              return (
                <li key={a.id}>
                  {t ? (
                    <Link to={rutaTema(t)} viewTransition>
                      {t.tema.titulo}
                    </Link>
                  ) : (
                    a.temaId
                  )}
                  <p>{a.texto}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
