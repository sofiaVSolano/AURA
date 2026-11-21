import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Boton, CampoTexto, Esfera3D, EstadoVista, Icono, Modal, type EstadoEsfera } from '../../design-system/index.ts';
import { useMiAura } from '../mi-aura/estado/MiAuraContexto.tsx';
import { PREFERENCIAS_INICIALES, indiceExpresion, indiceForma, matizDe } from '../mi-aura/dominio/modelo.ts';
import { api, apiHabilitada, ErrorApi, sesion } from '../../lib/api.ts';
import { NO_SE_GUARDA, QUE_SE_GUARDA } from '../../lib/consentimiento.ts';
import { llevarDatosLocalesALaCuenta } from './migracion.ts';
import estilos from './CuentaPage.module.css';

/** Recarga la app: cada módulo vuelve a cargar sus datos del lugar correcto (cuenta o navegador). */
const recargarEn = (ruta: string) => window.location.assign(`${import.meta.env.BASE_URL}${ruta}`);

/** A dónde volver tras entrar (solo rutas internas de AURA). */
function leerVolver(): string | null {
  const v = new URLSearchParams(window.location.search).get('volver');
  return v && v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/cuenta') ? v : null;
}

const nombreSeccion = (ruta: string) =>
  ruta.startsWith('/emocional') ? 'AURA emocional' : ruta.startsWith('/academica') ? 'AURA académica' : ruta.startsWith('/mi-aura') || ruta.startsWith('/comenzar') ? 'Mi AURA' : 'AURA';

/**
 * Tras entrar o crear la cuenta: si tu AURA aún no ha nacido, se va a crearla
 * (registro de tu AURA); si ya existe, a la página que querías abrir o a Mi AURA.
 */
async function destinoTrasEntrar(): Promise<string> {
  const volver = leerVolver();
  try {
    const datos = (await api.datos()) as { 'mi-aura'?: { onboarding?: { completado?: boolean } } | null };
    if (!datos['mi-aura']?.onboarding?.completado) return 'comenzar';
  } catch {
    /* si no se pudo leer, se sigue al destino pedido */
  }
  return (volver ?? '/mi-aura').slice(1);
}
const mensajeDe = (e: unknown) => (e instanceof ErrorApi ? e.message : 'Algo salió mal. Inténtalo de nuevo.');

/** Lo que hace el formulario y a lo que reacciona tu AURA. */
type Reaccion =
  | { tipo: 'reposo' }
  | { tipo: 'correo'; texto: string; tecla?: boolean }
  | { tipo: 'clave'; visible: boolean; tecla?: boolean }
  | { tipo: 'error' }
  | { tipo: 'enviando' };
type Reaccionar = (r: Reaccion) => void;

function Acceso({ reaccionar }: { reaccionar: Reaccionar }) {
  // ?modo=registro abre directo en «Crear cuenta» (p. ej. desde el final del Inicio)
  const [modo, setModo] = useState<'ingreso' | 'registro'>(() => (new URLSearchParams(window.location.search).get('modo') === 'registro' ? 'registro' : 'ingreso'));
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [consentimiento, setConsentimiento] = useState(false);
  const [llevar, setLlevar] = useState(true);
  const [errores, setErrores] = useState<{ correo?: string; clave?: string; consentimiento?: string; general?: string }>({});
  const [enviando, setEnviando] = useState(false);
  const id = useId();
  const registro = modo === 'registro';

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const nuevos: typeof errores = {
      ...(!/^\S+@\S+\.\S{2,}$/.test(correo.trim()) && { correo: 'Escribe un correo válido.' }),
      ...(clave.length < (registro ? 10 : 1) && { clave: registro ? 'Usa al menos 10 caracteres.' : 'Escribe tu contraseña.' }),
      ...(registro && !consentimiento && { consentimiento: 'Necesitamos tu consentimiento para guardar tus datos en una cuenta.' }),
    };
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return reaccionar({ tipo: 'error' });
    setEnviando(true);
    reaccionar({ tipo: 'enviando' });
    try {
      if (registro) await api.registro(correo.trim(), clave);
      else await api.ingreso(correo.trim(), clave);
      if (llevar) await llevarDatosLocalesALaCuenta();
      recargarEn(await destinoTrasEntrar());
    } catch (err) {
      setErrores({ general: mensajeDe(err) });
      setEnviando(false);
      reaccionar({ tipo: 'error' });
    }
  };

  return (
    <div className={estilos.acceso}>
      <div className={estilos.pestanas} role="group" aria-label="¿Ya tienes cuenta?" data-modo={modo}>
        <span className={estilos.indicador} aria-hidden="true" />
        <button type="button" aria-pressed={!registro} onClick={() => (setModo('ingreso'), setErrores({}))}>
          Entrar
        </button>
        <button type="button" aria-pressed={registro} onClick={() => (setModo('registro'), setErrores({}))}>
          Crear cuenta
        </button>
      </div>

      <form className={estilos.formulario} onSubmit={enviar} noValidate key={modo}>
        <CampoTexto
          etiqueta="Correo"
          type="email"
          autoComplete="email"
          value={correo}
          onChange={(e) => {
            setCorreo(e.target.value);
            reaccionar({ tipo: 'correo', texto: e.target.value, tecla: true });
          }}
          onFocus={(e) => reaccionar({ tipo: 'correo', texto: e.target.value })}
          onBlur={() => reaccionar({ tipo: 'reposo' })}
          error={errores.correo}
          maxLength={254}
        />
        <div className={estilos.claveCaja}>
          <CampoTexto
            etiqueta="Contraseña"
            type={verClave ? 'text' : 'password'}
            autoComplete={registro ? 'new-password' : 'current-password'}
            value={clave}
            onChange={(e) => {
              setClave(e.target.value);
              reaccionar({ tipo: 'clave', visible: verClave, tecla: true });
            }}
            onFocus={() => reaccionar({ tipo: 'clave', visible: verClave })}
            onBlur={() => !verClave && reaccionar({ tipo: 'reposo' })}
            error={errores.clave}
            maxLength={128}
            {...(registro && { ayuda: 'Al menos 10 caracteres. Una frase que recuerdes es una buena opción.' })}
          />
          <button
            type="button"
            className={estilos.verClave}
            aria-pressed={verClave}
            onClick={() => {
              const v = !verClave;
              setVerClave(v);
              reaccionar(v ? { tipo: 'clave', visible: true } : { tipo: 'reposo' });
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
              {verClave && <path d="M4 4l16 16" />}
            </svg>
            {verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          </button>
        </div>

        {registro && (
          <fieldset className={estilos.consentimiento} aria-describedby={errores.consentimiento ? `${id}-error` : undefined}>
            <legend>Tu consentimiento</legend>
            <p>Si creas una cuenta, guardaremos en el servidor de AURA:</p>
            <ul>
              {QUE_SE_GUARDA.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p>No guardamos:</p>
            <ul>
              {NO_SE_GUARDA.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p>
              Solo se usan para acompañarte en AURA. Puedes descargarlos o eliminar tu cuenta con todo su contenido cuando
              quieras. AURA no es un servicio clínico.
            </p>
            <label className={estilos.casilla}>
              <input type="checkbox" checked={consentimiento} onChange={(e) => setConsentimiento(e.target.checked)} />
              Acepto que AURA guarde estos datos en mi cuenta.
            </label>
            {errores.consentimiento && (
              <p id={`${id}-error`} className={estilos.error}>
                {errores.consentimiento}
              </p>
            )}
          </fieldset>
        )}

        <label className={estilos.casilla}>
          <input type="checkbox" checked={llevar} onChange={(e) => setLlevar(e.target.checked)} />
          Llevar a mi cuenta lo que hice en este navegador
        </label>

        {errores.general && <EstadoVista tipo="error" compacto titulo={errores.general} />}
        <Boton type="submit" tamano="lg" cargando={enviando}>
          {registro ? 'Crear mi cuenta' : 'Entrar'}
        </Boton>
      </form>
    </div>
  );
}

function MiCuenta() {
  const [confirmar, setConfirmar] = useState(false);
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string>();
  const [ocupado, setOcupado] = useState<'salir' | 'exportar' | 'borrar' | null>(null);

  const exportar = async () => {
    setOcupado('exportar');
    try {
      const datos = await api.exportar();
      const url = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: 'mis-datos-aura.json' });
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(mensajeDe(e));
    }
    setOcupado(null);
  };

  return (
    <div className={estilos.cuenta}>
      <p className={estilos.correo}>
        <Icono nombre="check" tamano={18} /> Sesión iniciada como <strong>{sesion.correo}</strong>
      </p>
      <p className={estilos.nota}>Tu AURA, tus guardados, tus aprendizajes y tus avances se guardan en tu cuenta y te siguen en cualquier dispositivo.</p>
      {error && <EstadoVista tipo="error" compacto titulo={error} />}
      <div className={estilos.acciones}>
        <Boton variante="secundario" cargando={ocupado === 'exportar'} onClick={() => void exportar()}>
          Descargar mis datos
        </Boton>
        <Boton
          variante="secundario"
          cargando={ocupado === 'salir'}
          onClick={async () => {
            setOcupado('salir');
            try {
              await api.salida();
              recargarEn('');
            } catch (e) {
              setError(mensajeDe(e));
              setOcupado(null);
            }
          }}
        >
          Cerrar sesión
        </Boton>
        <Boton variante="sutil" onClick={() => setConfirmar(true)}>
          Eliminar mi cuenta
        </Boton>
      </div>
      <Modal
        abierto={confirmar}
        onCerrar={() => setConfirmar(false)}
        titulo="¿Eliminar tu cuenta?"
        descripcion="Se borrarán tu cuenta y todos sus datos del servidor. No se puede deshacer."
        acciones={
          <>
            <Boton variante="secundario" onClick={() => setConfirmar(false)}>
              Conservar
            </Boton>
            <Boton
              cargando={ocupado === 'borrar'}
              onClick={async () => {
                setOcupado('borrar');
                try {
                  await api.borrarCuenta(clave);
                  recargarEn('');
                } catch (e) {
                  setError(mensajeDe(e));
                  setOcupado(null);
                }
              }}
            >
              Eliminar definitivamente
            </Boton>
          </>
        }
      >
        <CampoTexto etiqueta="Confirma con tu contraseña" type="password" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} error={error} />
      </Modal>
    </div>
  );
}

const correoCompleto = (t: string) => /^\S+@\S+\.\S{2,}$/.test(t.trim());

/** Entrar, crear cuenta o gestionarla, con tu AURA reaccionando a lo que haces. */
export function CuentaPage() {
  const { carga, evolucion } = useMiAura();
  const datos = carga.estado === 'listo' ? carga.datos : null;
  const nacida = Boolean(datos?.onboarding.completado && evolucion);
  const p = nacida && datos ? datos.preferencias : { ...PREFERENCIAS_INICIALES, expresion: 'alegre' as const };
  // Sin AURA propia se muestra un personaje completo de ejemplo.
  const etapa = nacida && evolucion ? evolucion.indice : 4;
  const expresionPropia = indiceExpresion(p.expresion);
  const matizA = matizDe(p.colorPrincipal);
  const matizB = matizDe(p.colorComplementario);
  const forma = indiceForma(p.forma);

  // Aquí tu AURA no lleva vestuario: te recibe con una florecita en la mano.
  const estado = useRef<EstadoEsfera>({
    x: 0, y: 0.02, escala: 0.8, etapa, matizA, matizB, energia: 0.15, forma, expresion: expresionPropia,
    vestuario: 0, birrete: 0, aro: 0, flor: 1, tapar: 0,
  });
  const mirada = useRef<[number, number] | null>(null);
  const [susurro, setSusurro] = useState('Te estaba esperando.');
  const vuelta = useRef(0);
  const cuerpo = useRef<HTMLDivElement>(null);
  const correoAntes = useRef('');

  /** Pequeño rebote (Web Animations): un saltito o un asentir con cada tecla. */
  const rebotar = (fuerte: boolean) => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    cuerpo.current?.animate(
      fuerte
        ? [
            { transform: 'translateY(0) scale(1, 1)' },
            { transform: 'translateY(6px) scale(1.06, 0.94)', offset: 0.15 },
            { transform: 'translateY(-38px) scale(0.96, 1.05)', offset: 0.45 },
            { transform: 'translateY(3px) scale(1.04, 0.96)', offset: 0.8 },
            { transform: 'translateY(0) scale(1, 1)' },
          ]
        : [{ transform: 'translateY(0) rotate(0deg)' }, { transform: 'translateY(4px) rotate(-1.5deg)' }, { transform: 'translateY(0) rotate(0deg)' }],
      { duration: fuerte ? 820 : 220, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)' },
    );
  };

  useEffect(() => {
    Object.assign(estado.current, { etapa, matizA, matizB, forma, expresion: expresionPropia });
  }, [etapa, matizA, matizB, forma, expresionPropia]);
  useEffect(() => () => clearTimeout(vuelta.current), []);

  const reaccionar: Reaccionar = (r) => {
    const e = estado.current;
    const movil = innerWidth < 768;
    clearTimeout(vuelta.current);
    e.energia = 0.15;
    e.expresion = expresionPropia;
    e.tapar = 0;
    if (r.tipo === 'correo') {
      // Sigue con la mirada lo que escribes (el formulario está a la derecha, o debajo en móvil)
      const avance = Math.min(r.texto.length / 32, 1);
      // (giro moderado: los ojos quedan de frente, redondos y bien abiertos)
      mirada.current = movil ? [-0.3 + avance * 0.6, 0.45] : [0.15 + avance * 0.35, 0.12];
      const antes = correoAntes.current;
      correoAntes.current = r.texto;
      if (correoCompleto(r.texto) && !correoCompleto(antes)) {
        // ¡Correo completo! Salta de alegría
        e.expresion = 2;
        e.energia = 0.9;
        setSusurro('¡Listo! Ya sé dónde encontrarte.');
        rebotar(true);
      } else if (r.texto.includes('@') && !antes.includes('@')) {
        e.expresion = 1;
        e.energia = 0.5;
        setSusurro('¡Una arroba! Vamos por buen camino.');
        rebotar(true);
      } else if (correoCompleto(r.texto)) {
        e.expresion = 2;
        setSusurro('¡Listo! Ya sé dónde encontrarte.');
      } else {
        // Curiosa: los ojos más grandes y redondos
        e.expresion = 1;
        setSusurro(r.texto ? 'Mmm… te sigo, letra por letra.' : '¿A dónde te escribo?');
        if (r.tecla) rebotar(false);
      }
    } else if (r.tipo === 'clave') {
      if (r.visible) {
        // Contraseña a la vista: se tapa los ojos con las manos
        e.tapar = 1;
        e.expresion = 2;
        mirada.current = [0, 0];
        setSusurro('¡No miro, no miro! Me tapo los ojos.');
      } else {
        // Oculta: cierra los ojos y aparta la cara
        e.expresion = 0;
        mirada.current = movil ? [0.8, -0.5] : [-0.75, -0.35];
        setSusurro('Tranquilidad: no estoy mirando.');
      }
      if (r.tecla) rebotar(false);
    } else if (r.tipo === 'error') {
      setSusurro('Algo no cuadra. Revisemos juntos.');
      rebotar(false);
      e.expresion = 3;
      e.energia = 0.9;
      mirada.current = null;
      vuelta.current = window.setTimeout(() => {
        estado.current.energia = 0.15;
        estado.current.expresion = expresionPropia;
      }, 2200);
    } else if (r.tipo === 'enviando') {
      e.expresion = 2;
      e.energia = 1;
      mirada.current = [0, -0.4];
      setSusurro('¡Allá vamos!');
      rebotar(true);
    } else {
      // En reposo: sus ojos siguen tu cursor
      mirada.current = null;
      setSusurro('Te estaba esperando.');
    }
  };

  const activa = sesion.activa;
  return (
    <div className={estilos.pagina}>
      <div className={estilos.escena}>
        <span className={estilos.aurora} aria-hidden="true" />
        <span className={estilos.marcaAgua} aria-hidden="true">
          AURA
        </span>
        <div className={estilos.lienzo} aria-hidden="true">
          <div ref={cuerpo} className={estilos.cuerpo}>
            <Esfera3D estado={estado} mirada={mirada} resolucion={1} />
          </div>
        </div>
        <p className={estilos.susurro} key={susurro} aria-hidden="true">
          {activa ? `Hola de nuevo. Aquí sigo, contigo.` : susurro}
        </p>
      </div>

      <div className={estilos.panel}>
        <p className={estilos.kicker}>{activa ? 'Tu cuenta' : nacida ? `${p.nombre} te espera` : 'Así puede verse tu AURA'}</p>
        <h1 className={estilos.titulo}>
          <span className={estilos.linea}>{activa ? 'Todo tu recorrido,' : 'Tu AURA te sigue'}</span>
          <span className={estilos.linea}>{activa ? 'en cualquier lugar.' : 'a donde vayas.'}</span>
        </h1>
        {!activa && leerVolver() && (
          <p className={estilos.aviso} role="status">
            Para entrar a {nombreSeccion(leerVolver()!)} inicia sesión o crea tu cuenta. Es gratis y tardas un minuto.
          </p>
        )}
        <p className={estilos.bajada}>
          Con tu cuenta, tu AURA y tu recorrido te acompañan en cualquier dispositivo y quedan guardados de forma segura.
        </p>
        {!apiHabilitada || !sesion.servidorDisponible ? (
          <EstadoVista
            tipo="error"
            titulo="El servidor de cuentas no está disponible ahora"
            descripcion="Puedes seguir usando AURA: lo que hagas se guarda en este navegador. Vuelve a intentarlo más tarde."
          />
        ) : activa ? (
          <MiCuenta />
        ) : (
          <Acceso reaccionar={reaccionar} />
        )}
      </div>
    </div>
  );
}
