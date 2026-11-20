import { useId, useState, type FormEvent } from 'react';
import { Boton, CampoTexto, EncabezadoPagina, EstadoVista, Icono, Modal } from '../../design-system/index.ts';
import { api, apiHabilitada, ErrorApi, sesion } from '../../lib/api.ts';
import { NO_SE_GUARDA, QUE_SE_GUARDA } from '../../lib/consentimiento.ts';
import { llevarDatosLocalesALaCuenta } from './migracion.ts';
import estilos from './CuentaPage.module.css';

/** Recarga la app: cada módulo vuelve a cargar sus datos del lugar correcto (cuenta o navegador). */
const recargarEn = (ruta: string) => window.location.assign(`${import.meta.env.BASE_URL}${ruta}`);
const mensajeDe = (e: unknown) => (e instanceof ErrorApi ? e.message : 'Algo salió mal. Inténtalo de nuevo.');

function Acceso() {
  const [modo, setModo] = useState<'ingreso' | 'registro'>('ingreso');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
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
    if (Object.keys(nuevos).length) return;
    setEnviando(true);
    try {
      if (registro) await api.registro(correo.trim(), clave);
      else await api.ingreso(correo.trim(), clave);
      if (llevar) await llevarDatosLocalesALaCuenta();
      recargarEn('mi-aura');
    } catch (err) {
      setErrores({ general: mensajeDe(err) });
      setEnviando(false);
    }
  };

  return (
    <div className={estilos.acceso}>
      <div className={estilos.pestanas} role="group" aria-label="¿Ya tienes cuenta?">
        <button type="button" aria-pressed={!registro} onClick={() => (setModo('ingreso'), setErrores({}))}>
          Entrar
        </button>
        <button type="button" aria-pressed={registro} onClick={() => (setModo('registro'), setErrores({}))}>
          Crear cuenta
        </button>
      </div>

      <form className={estilos.formulario} onSubmit={enviar} noValidate key={modo}>
        <CampoTexto etiqueta="Correo" type="email" autoComplete="email" value={correo} onChange={(e) => setCorreo(e.target.value)} error={errores.correo} maxLength={254} />
        <CampoTexto
          etiqueta="Contraseña"
          type="password"
          autoComplete={registro ? 'new-password' : 'current-password'}
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          error={errores.clave}
          maxLength={128}
          {...(registro && { ayuda: 'Al menos 10 caracteres. Una frase que recuerdes es una buena opción.' })}
        />

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

export function CuentaPage() {
  return (
    <div className={estilos.pagina}>
      <EncabezadoPagina titulo={sesion.activa ? 'Tu cuenta' : 'Entra a tu cuenta'}>
        <p>Con una cuenta, tu AURA y tu recorrido te acompañan en cualquier dispositivo. Sin cuenta, todo sigue funcionando en este navegador.</p>
      </EncabezadoPagina>
      {!apiHabilitada || !sesion.servidorDisponible ? (
        <EstadoVista
          tipo="error"
          titulo="El servidor de cuentas no está disponible ahora"
          descripcion="Puedes seguir usando AURA: lo que hagas se guarda en este navegador. Vuelve a intentarlo más tarde."
        />
      ) : sesion.activa ? (
        <MiCuenta />
      ) : (
        <Acceso />
      )}
    </div>
  );
}
