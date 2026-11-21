import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Esfera3D, type EstadoEsfera } from '../../../design-system/index.ts';
import { useMiAura } from '../estado/MiAuraContexto.tsx';
import { ETAPAS, FRASES_ETAPA, PREFERENCIAS_INICIALES, indiceExpresion, indiceForma, matizDe } from '../dominio/modelo.ts';
import estilos from './Acompanante.module.css';

/** Rutas donde tu AURA ya está en grande (o es la protagonista): ahí no flota. */
const SIN_ACOMPANANTE = ['/', '/mi-aura', '/comenzar', '/cuenta', '/academica', '/sistema/personaje'];
const CLAVE_OCULTO = 'aura:acompanante-oculto';

/** Lo que dice según dónde estás. Corto, cálido y sin presión. */
function fraseDeLugar(ruta: string): string | null {
  const partes = ruta.split('/').filter(Boolean);
  if (partes[0] === 'emocional') {
    if (partes.length === 3) return 'Si ves el video hasta el final, cuenta como experiencia para los dos.';
    if (partes.length === 2) return 'Elige la situación que más se parezca a la tuya. Aquí no hay prisa.';
    return 'No hay respuestas correctas. Elige lo que más se parezca a lo que sientes.';
  }
  if (partes[0] === 'academica') {
    if (partes[1] === 'laboratorios') return 'Aquí practicar no tiene nota: equivocarse también enseña.';
    if (partes.length === 3) return 'Cuando registres un avance en este tema, yo también crezco.';
    return 'Cada tema que exploras me ayuda a crecer.';
  }
  if (partes[0] === 'recursos') return 'Pedir ayuda también es avanzar. Estoy aquí contigo.';
  return null;
}

/**
 * Tu AURA te acompaña en 3D por toda la aplicación: flota en una esquina, te mira,
 * comenta dónde estás y celebra cuando crece.
 * Se puede esconder; la preferencia dura la sesión.
 */
export function Acompanante() {
  const { carga, evolucion } = useMiAura();
  const { pathname } = useLocation();
  const [oculto, setOculto] = useState(() => sessionStorage.getItem(CLAVE_OCULTO) === 'si');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [festejo, setFestejo] = useState(0);
  const temporizador = useRef(0);

  const datos = carga.estado === 'listo' ? carga.datos : null;
  const nacida = Boolean(datos?.onboarding.completado && evolucion);
  const p = nacida && datos ? datos.preferencias : PREFERENCIAS_INICIALES;
  const indice = nacida && evolucion ? evolucion.indice : 0;
  const total = evolucion?.significativas.length ?? 0;

  const estado = useRef<EstadoEsfera>({
    x: 0,
    y: -0.04,
    escala: 0.8,
    etapa: indice,
    matizA: matizDe(p.colorPrincipal),
    matizB: matizDe(p.colorComplementario),
    energia: 0.15,
    forma: indiceForma(p.forma),
    expresion: indiceExpresion(p.expresion),
  });
  Object.assign(estado.current, {
    etapa: indice,
    matizA: matizDe(p.colorPrincipal),
    matizB: matizDe(p.colorComplementario),
    forma: indiceForma(p.forma),
    expresion: indiceExpresion(p.expresion),
  });

  const decir = (texto: string, ms = 9000) => {
    setMensaje(texto);
    setAbierto(true);
    clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => setAbierto(false), ms);
  };

  // Al llegar a una sección por primera vez en la sesión, comenta algo de ella. En
  // pantallas pequeñas no abre el globo solo (taparía el contenido): salta y deja un aviso.
  const [aviso, setAviso] = useState(false);
  useEffect(() => {
    const frase = fraseDeLugar(pathname);
    setAviso(false);
    if (!frase) return;
    const clave = `aura:acompanante-dijo:${pathname.split('/').slice(0, 3).join('/')}`;
    if (sessionStorage.getItem(clave)) return;
    const t = window.setTimeout(() => {
      sessionStorage.setItem(clave, 'si');
      setMensaje(frase);
      setFestejo((n) => n + 1);
      if (matchMedia('(min-width: 48rem)').matches) decir(frase, 6500);
      else setAviso(true);
    }, 1400);
    return () => clearTimeout(t);
  }, [pathname]);

  // Celebra cada experiencia nueva y, sobre todo, cada etapa
  const previo = useRef<{ total: number; indice: number } | null>(null);
  useEffect(() => {
    if (!nacida) return;
    const antes = previo.current;
    previo.current = { total, indice };
    if (!antes) return;
    if (indice > antes.indice) {
      decir(`¡Crecí a ${ETAPAS[indice]?.nombre ?? ''}! ${FRASES_ETAPA[indice] ?? ''}`, 12000);
      setFestejo((n) => n + 1);
      estado.current.energia = 1;
    } else if (total > antes.total) {
      decir(`¡Eso cuenta! Ya llevamos ${total} ${total === 1 ? 'experiencia' : 'experiencias'} juntos.`);
      setFestejo((n) => n + 1);
      estado.current.energia = 0.7;
    }
    const t = window.setTimeout(() => (estado.current.energia = 0.15), 1600);
    return () => clearTimeout(t);
  }, [nacida, total, indice]);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  // Un saltito de alegría (Web Animations: no vuelve a montar el lienzo 3D)
  const salto = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!festejo || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    salto.current?.animate(
      [
        { transform: 'translateY(0) scale(1, 1)' },
        { transform: 'translateY(4px) scale(1.08, 0.92)', offset: 0.18 },
        { transform: 'translateY(-26px) scale(0.95, 1.06)', offset: 0.5 },
        { transform: 'translateY(2px) scale(1.06, 0.94)', offset: 0.82 },
        { transform: 'translateY(0) scale(1, 1)' },
      ],
      { duration: 720, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)' },
    );
  }, [festejo]);

  if (carga.estado !== 'listo' || SIN_ACOMPANANTE.includes(pathname)) return null;

  const alternarOculto = (v: boolean) => {
    setOculto(v);
    setAbierto(false);
    sessionStorage.setItem(CLAVE_OCULTO, v ? 'si' : 'no');
  };

  if (oculto) {
    return (
      <button type="button" className={estilos.pestana} onClick={() => alternarOculto(false)}>
        <span className={estilos.pestanaPunto} aria-hidden="true" />
        Mostrar a {nacida ? p.nombre : 'tu AURA'}
      </button>
    );
  }

  const progreso = evolucion?.progreso;
  const siguienteEtapa = ETAPAS[indice + 1]?.nombre;
  const faltan = progreso ? Math.max(0, progreso.requerido - progreso.total) : 0;

  return (
    <aside className={estilos.acompanante} aria-label={nacida ? `${p.nombre}, tu AURA` : 'Tu AURA'}>
      <div className={estilos.globo} data-abierto={abierto || undefined} role="status">
        {abierto && (
          <>
            <p className={estilos.texto}>{nacida ? mensaje : 'Todavía no he nacido. ¿Me das vida? Tardas un minuto.'}</p>
            {nacida && progreso && siguienteEtapa && (
              <p className={estilos.meta}>
                {faltan > 0
                  ? `${faltan} ${faltan === 1 ? 'experiencia' : 'experiencias'} más y llego a ${siguienteEtapa}.`
                  : `Explora otra área y llego a ${siguienteEtapa}.`}
              </p>
            )}
            <div className={estilos.acciones}>
              <Link to={nacida ? '/mi-aura' : '/comenzar'} viewTransition className={estilos.enlace}>
                {nacida ? `Ver a ${p.nombre}` : 'Dar vida a mi AURA'}
              </Link>
              <button type="button" className={estilos.esconder} onClick={() => alternarOculto(true)}>
                Esconder
              </button>
            </div>
          </>
        )}
      </div>
      <button
        type="button"
        className={estilos.personaje}
        aria-expanded={abierto}
        aria-label={abierto ? 'Cerrar el mensaje' : `Hablar con ${nacida ? p.nombre : 'tu AURA'}`}
        onClick={() => {
          setAviso(false);
          if (abierto) return setAbierto(false);
          decir(mensaje ?? fraseDeLugar(pathname) ?? FRASES_ETAPA[indice] ?? '');
          estado.current.energia = 0.6;
          setFestejo((n) => n + 1);
          window.setTimeout(() => (estado.current.energia = 0.15), 900);
        }}
      >
        <span ref={salto} className={estilos.salto}>
          <Esfera3D estado={estado} resolucion={1} className={estilos.lienzo} />
        </span>
        <span className={estilos.sombra} aria-hidden="true" />
        {aviso && !abierto && <span className={estilos.aviso} aria-hidden="true" />}
      </button>
    </aside>
  );
}
