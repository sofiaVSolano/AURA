import { useEffect, useRef, useState, type CSSProperties, type DragEvent } from 'react';
import { Link } from 'react-router';
import { Esfera3D, Icono, type EstadoEsfera } from '../../design-system/index.ts';
import { api, ErrorApi, type EvaluacionTesis, type UsoIa } from '../../lib/api.ts';
import { useMiAura } from '../mi-aura/estado/MiAuraContexto.tsx';
import { PREFERENCIAS_INICIALES, indiceExpresion, indiceForma, matizDe } from '../mi-aura/dominio/modelo.ts';
import { listaLaboratorios, rutaLaboratorio } from './datos/catalogoAcademico.ts';
import { INTENTOS_IA } from './dominio/modelo.ts';
import { useAcademica } from './estado/AcademicaContexto.tsx';
import estilos from './TesisPage.module.css';

const BYTES_MAXIMOS = 8 * 1024 * 1024;
const ACEPTADOS = '.pdf,.docx,.txt';
const LECTURAS = ['Leyendo tu resumen…', 'Revisando tus objetivos…', 'Siguiendo el hilo de tu metodología…', 'Comparando resultados y conclusiones…', 'Mirando tus referencias…'];
const ESTADO_SECCION = { bien: 'Bien', mejorable: 'Mejorable', falta: 'Falta' } as const;

const aBase64 = (f: File) =>
  new Promise<string>((ok, mal) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(',')[1] ?? '');
    r.onerror = () => mal(new Error('No se pudo leer el archivo'));
    r.readAsDataURL(f);
  });

/** Revisión de tu tesis con IA: se desbloquea al completar todos los laboratorios. */
export function TesisPage() {
  const { carga } = useAcademica();
  const estado = carga.estado === 'listo' ? carga.datos : null;
  const labs = listaLaboratorios();
  const pendientes = labs
    .map((l) => ({ l, faltan: l.actividades.filter((a) => !estado?.actividades[`${l.id}/${a.id}`]).length }))
    .filter((x) => x.faltan > 0);
  const totalLocal = labs.reduce((n, l) => n + l.actividades.length, 0);
  const hechasLocal = totalLocal - pendientes.reduce((n, x) => n + x.faltan, 0);

  const [uso, setUso] = useState<UsoIa | null>(null);
  const [disponible, setDisponible] = useState<boolean | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [leyendo, setLeyendo] = useState(false);
  const [lectura, setLectura] = useState(0);
  const [error, setError] = useState('');
  const [evaluacion, setEvaluacion] = useState<EvaluacionTesis | null>(() => {
    try {
      return JSON.parse(localStorage.getItem('aura:evaluacion-tesis') ?? 'null') as EvaluacionTesis | null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    let vivo = true;
    Promise.all([api.iaEstado(), api.iaUso()])
      .then(([e, u]) => vivo && (setDisponible(e.disponible), setUso(u)))
      .catch(() => vivo && setDisponible(false));
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (!leyendo) return;
    const t = window.setInterval(() => setLectura((n) => (n + 1) % LECTURAS.length), 2600);
    return () => clearInterval(t);
  }, [leyendo]);

  // Tu AURA, que lee la tesis contigo
  const { carga: cargaAura, evolucion } = useMiAura();
  const datos = cargaAura.estado === 'listo' ? cargaAura.datos : null;
  const p = datos?.onboarding.completado ? datos.preferencias : { ...PREFERENCIAS_INICIALES, expresion: 'alegre' as const };
  const esfera = useRef<EstadoEsfera>({
    x: 0,
    y: 0,
    escala: 0.82,
    etapa: evolucion ? Math.max(2, evolucion.indice) : 3,
    matizA: matizDe(p.colorPrincipal),
    matizB: matizDe(p.colorComplementario),
    energia: 0.15,
    forma: indiceForma(p.forma),
    expresion: indiceExpresion(p.expresion),
    aro: 0,
  });
  const mirada = useRef<[number, number] | null>(null);
  useEffect(() => {
    Object.assign(esfera.current, { expresion: leyendo ? 3 : evaluacion ? 2 : indiceExpresion(p.expresion), energia: leyendo ? 0.5 : 0.15 });
    mirada.current = leyendo ? [0.1, 0.55] : null;
  }, [leyendo, evaluacion, p.expresion]);

  const completadas = uso?.tesis.completadas ?? hechasLocal;
  const total = uso?.tesis.total ?? totalLocal;
  const desbloqueada = uso ? uso.tesis.desbloqueada : false;
  const usados = uso?.tesis.usados ?? 0;
  const quedan = Math.max(0, INTENTOS_IA - usados);

  const elegir = (f: File | undefined) => {
    setError('');
    if (!f) return;
    if (!/\.(pdf|docx|txt)$/i.test(f.name)) return setError('Sube tu tesis en PDF, Word (.docx) o texto (.txt).');
    if (f.size > BYTES_MAXIMOS) return setError('El archivo supera 8 MB. Prueba exportarlo en PDF sin imágenes pesadas.');
    setArchivo(f);
  };

  const soltar = (e: DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
    elegir(e.dataTransfer.files[0]);
  };

  const evaluar = async () => {
    if (!archivo) return;
    setLeyendo(true);
    setError('');
    try {
      const r = await api.iaTesis(archivo.name, archivo.type, await aBase64(archivo));
      setEvaluacion(r.evaluacion);
      localStorage.setItem('aura:evaluacion-tesis', JSON.stringify(r.evaluacion));
      setUso((u) => (u ? { ...u, tesis: { ...u.tesis, usados: r.usados } } : u));
      setArchivo(null);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo evaluar ahora. Tu intento no se descontó.');
    }
    setLeyendo(false);
  };

  return (
    <div className={estilos.pagina}>
      <header className={estilos.portada}>
        <nav aria-label="Ruta de navegación" className={estilos.migas}>
          <Link to="/academica" viewTransition>
            AURA académica
          </Link>
          <span aria-hidden="true">/</span>
          <span>Revisión de tu tesis</span>
        </nav>
        <p className={estilos.kicker}>La meta · con IA</p>
        <h1 className={estilos.titulo}>
          Tu tesis, <em>de principio a fin.</em>
        </h1>
        <p className={estilos.bajada}>
          Cuando completes todos los laboratorios, tu AURA podrá leer tu documento completo y decirte qué está sólido, qué falla y
          qué hacer primero. Tienes {INTENTOS_IA} revisiones.
        </p>
      </header>

      {!desbloqueada ? (
        <section className={estilos.bloqueo} aria-labelledby="bloqueo-titulo">
          {/* Candado rodeado de puntos: uno por actividad de laboratorio */}
          <div className={estilos.candado} style={{ '--n': total } as CSSProperties} aria-hidden="true">
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={estilos.punto} data-hecho={i < completadas || undefined} style={{ '--i': i } as CSSProperties} />
            ))}
            <span className={estilos.icono}>
              <svg viewBox="0 0 48 48" width="56" height="56">
                <path d="M15 22v-6a9 9 0 0 1 18 0v6" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                <rect x="9" y="22" width="30" height="20" rx="6" fill="currentColor" />
              </svg>
            </span>
          </div>
          <div className={estilos.bloqueoTexto}>
            <h2 id="bloqueo-titulo">
              {completadas} de {total} actividades completadas
            </h2>
            <p>Completa los laboratorios de cada tema para desbloquear la revisión. Así llegas con cada pieza trabajada.</p>
            {pendientes.length > 0 && (
              <ul className={estilos.pendientes}>
                {pendientes.slice(0, 8).map(({ l, faltan }) => (
                  <li key={l.id}>
                    <Link to={rutaLaboratorio(l.id)} viewTransition>
                      {l.titulo}
                      <span>{faltan === 1 ? 'falta 1' : `faltan ${faltan}`}</span>
                      <Icono nombre="flecha" tamano={16} />
                    </Link>
                  </li>
                ))}
                {pendientes.length > 8 && <li className={estilos.mas}>y {pendientes.length - 8} laboratorios más</li>}
              </ul>
            )}
          </div>
        </section>
      ) : (
        <section className={estilos.subir} aria-labelledby="subir-titulo">
          <div className={estilos.aura} aria-hidden="true">
            <Esfera3D estado={esfera} mirada={mirada} resolucion={1} />
          </div>
          <div className={estilos.subirPanel}>
            <h2 id="subir-titulo">{leyendo ? LECTURAS[lectura] : evaluacion ? '¿Hiciste cambios? Súbela de nuevo.' : 'Sube tu tesis'}</h2>
            {disponible === false ? (
              <p className={estilos.aviso}>La revisión con IA no está disponible ahora. Vuelve a intentarlo más tarde.</p>
            ) : quedan === 0 ? (
              <p className={estilos.aviso}>Ya usaste tus {INTENTOS_IA} revisiones de tesis. Tu última evaluación sigue aquí abajo.</p>
            ) : (
              <>
                <label
                  className={estilos.zona}
                  data-arrastrando={arrastrando || undefined}
                  data-lista={archivo ? 'si' : undefined}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setArrastrando(true);
                  }}
                  onDragLeave={() => setArrastrando(false)}
                  onDrop={soltar}
                >
                  <input type="file" accept={ACEPTADOS} onChange={(e) => elegir(e.target.files?.[0])} disabled={leyendo} />
                  <span className={estilos.zonaIcono} aria-hidden="true">
                    {archivo ? '📄' : '⬆'}
                  </span>
                  <span className={estilos.zonaTexto}>
                    {archivo ? (
                      <>
                        <strong>{archivo.name}</strong> · {(archivo.size / 1024 / 1024).toFixed(1)} MB
                      </>
                    ) : (
                      <>
                        <strong>Arrastra tu archivo aquí</strong> o haz clic para elegirlo
                      </>
                    )}
                  </span>
                  <span className={estilos.zonaNota}>PDF, Word (.docx) o texto · máximo 8 MB</span>
                </label>
                <div className={estilos.acciones}>
                  <span className={estilos.fichas} aria-hidden="true">
                    {Array.from({ length: INTENTOS_IA }, (_, i) => (
                      <span key={i} data-usada={i < usados || undefined} />
                    ))}
                  </span>
                  <span>
                    {quedan === 1 ? 'Te queda 1 revisión' : `Te quedan ${quedan} revisiones`} de {INTENTOS_IA}
                  </span>
                  <button type="button" className={estilos.boton} disabled={!archivo || leyendo} onClick={() => void evaluar()}>
                    {leyendo ? 'Leyendo…' : quedan === 1 ? 'Usar mi última revisión' : 'Revisar mi tesis'}
                  </button>
                </div>
              </>
            )}
            {error && (
              <p className={estilos.error} role="alert">
                {error}
              </p>
            )}
            <p className={estilos.privacidad}>
              Tu documento se envía a un servicio de IA (OpenAI) solo para revisarlo; AURA no lo guarda. Quita datos personales
              sensibles si los tiene. La IA puede equivocarse: contrasta su lectura con tu director o directora.
            </p>
          </div>
        </section>
      )}

      {evaluacion && <ResultadoTesis e={evaluacion} />}
    </div>
  );
}

function ResultadoTesis({ e }: { e: EvaluacionTesis }) {
  return (
    <section className={estilos.resultado} aria-labelledby="resultado-titulo">
      <h2 id="resultado-titulo" className={estilos.resultadoTitulo}>
        Lo que tu AURA encontró
      </h2>
      <p className={estilos.valoracion}>{e.valoracion}</p>

      {e.secciones.length > 0 && (
        <ul className={estilos.secciones}>
          {e.secciones.map((s, i) => (
            <li key={i} data-estado={s.estado} style={{ '--i': i } as CSSProperties}>
              <span className={estilos.seccionEstado}>{ESTADO_SECCION[s.estado]}</span>
              <strong>{s.nombre}</strong>
              <p>{s.comentario}</p>
            </li>
          ))}
        </ul>
      )}

      {e.falencias.length > 0 && (
        <div className={estilos.bloqueResultado}>
          <h3>Falencias, en orden de importancia</h3>
          <ol className={estilos.falencias}>
            {e.falencias.map((f, i) => (
              <li key={i} style={{ '--i': i } as CSSProperties}>
                {f.seccion && <span className={estilos.etiquetaSeccion}>{f.seccion}</span>}
                <strong>{f.problema}</strong>
                {f.comoMejorar && (
                  <p>
                    <span>Cómo mejorarlo:</span> {f.comoMejorar}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className={estilos.columnas}>
        {e.fortalezas.length > 0 && (
          <div className={estilos.bloqueResultado}>
            <h3>Lo más sólido</h3>
            <ul className={estilos.fortalezas}>
              {e.fortalezas.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        )}
        {e.extension && (
          <div className={estilos.bloqueResultado}>
            <h3>Extensión</h3>
            <p>{e.extension}</p>
          </div>
        )}
      </div>

      {e.siguientesPasos.length > 0 && (
        <div className={estilos.bloqueResultado}>
          <h3>Qué hacer primero</h3>
          <ol className={estilos.pasos}>
            {e.siguientesPasos.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
