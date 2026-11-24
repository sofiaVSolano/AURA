import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Boton, BotonEnlace, CampoTexto, EstadoVista, GrupoOpciones, Icono } from '../../../design-system/index.ts';
import { ruta } from '../../academica/datos/catalogoAcademico.ts';
import { Personaje } from '../avatar/Personaje.tsx';
import { SelectorColor, SelectorVisual } from '../componentes/Selectores.tsx';
import { EXPRESIONES, FORMAS, LARGO_MAXIMO_NOMBRE, MOMENTOS_GENERALES, type PreferenciasAvatar } from '../dominio/modelo.ts';
import { validarNombre } from '../dominio/validar.ts';
import { useMiAura } from '../estado/MiAuraContexto.tsx';
import estilos from './OnboardingPage.module.css';

// Cómo llegas hoy: NO se guarda. Solo orienta la respuesta inmediata.
const SENTIRES = [
  { valor: 'calma', etiqueta: 'Con calma', respuesta: 'Qué bueno. Aprovechemos esa calma para avanzar a tu ritmo.' },
  { valor: 'entusiasmo', etiqueta: 'Con entusiasmo', respuesta: 'Esa energía es valiosa. AURA académica puede ayudarte a darle dirección.' },
  { valor: 'inquietud', etiqueta: 'Con inquietud', respuesta: 'Es muy común sentirse así en este proceso. En AURA emocional encontrarás acompañamiento cuando lo necesites.' },
  { valor: 'cansancio', etiqueta: 'Con cansancio', respuesta: 'Gracias por decirlo. Descansar también es parte del camino: tu AURA no pierde nada si haces una pausa.' },
  { valor: 'no-decir', etiqueta: 'Prefiero no decirlo', respuesta: 'Está bien. Puedes contarlo cuando quieras, o nunca.' },
];

const PASOS = ['Bienvenida', 'Nombre', 'Colores', 'Forma', 'Tu momento', 'Cómo llegas', 'Nacimiento'] as const;
// Etapa que muestra la vista previa en cada paso: la esfera, luego "así podrá llegar a verse", y renace.
const VISTA_POR_PASO = [0, 0, 3, 3, 3, 3, 0];

export function OnboardingPage() {
  const { carga, completarOnboarding } = useMiAura();
  const [paso, setPaso] = useState(0);
  const [direccion, setDireccion] = useState<1 | -1>(1);
  const [borrador, setBorrador] = useState<PreferenciasAvatar | null>(null);
  const [nombre, setNombre] = useState('');
  const [errorNombre, setErrorNombre] = useState<string>();
  const [momento, setMomento] = useState<string | null>(null);
  const [sentir, setSentir] = useState<string | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const primerRender = useRef(true);

  // Parte de las preferencias existentes (rehacer el onboarding no borra nada).
  useEffect(() => {
    if (carga.estado === 'listo' && !borrador) {
      setBorrador(carga.datos.preferencias);
      setNombre(carga.datos.onboarding.completado ? carga.datos.preferencias.nombre : '');
      setMomento(carga.datos.onboarding.momentoProyecto);
    }
  }, [carga, borrador]);

  // Al cambiar de paso, el foco va al título (lectores de pantalla y teclado).
  useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false;
      return;
    }
    titulo.current?.focus();
  }, [paso]);

  if (carga.estado === 'cargando' || !borrador) return <EstadoVista tipo="cargando" titulo="Preparando tu AURA…" />;
  if (carga.estado === 'error') {
    return <EstadoVista tipo="error" titulo="No pudimos leer tus datos" descripcion={carga.mensaje} accion={<BotonEnlace to="/mi-aura">Ver opciones</BotonEnlace>} />;
  }

  const p = borrador;
  const cambiar = (c: Partial<PreferenciasAvatar>) => setBorrador({ ...p, ...c });
  const ir = (destino: number) => {
    setDireccion(destino > paso ? 1 : -1);
    setPaso(destino);
  };

  const siguiente = (e: Pick<FormEvent, 'preventDefault'>) => {
    e.preventDefault();
    if (paso === 1) {
      const elegido = nombre.trim() || 'Aura';
      const error = validarNombre(elegido);
      setErrorNombre(error ?? undefined);
      if (error) return;
      cambiar({ nombre: elegido });
    }
    if (paso === 5) completarOnboarding({ ...p, nombre: nombre.trim() || p.nombre }, momento);
    ir(paso + 1);
  };

  // Los momentos salen de la ruta académica configurada (institución/modalidad).
  const momentos = ruta.etapas.length ? ruta.etapas.map((e) => ({ valor: e.id, etiqueta: `${e.titulo}: ${e.descripcion}` })) : MOMENTOS_GENERALES;
  const respuesta = SENTIRES.find((s) => s.valor === sentir)?.respuesta;
  const nombreVisible = (paso >= 2 ? p.nombre : nombre.trim()) || 'tu AURA';

  const contenido: Record<number, { titulo: string; cuerpo: ReactNode; opcional?: boolean }> = {
    0: {
      titulo: 'Vamos a darle vida a tu AURA',
      cuerpo: (
        <p className={estilos.texto}>
          Tu AURA te acompañará durante tu proyecto de grado y crecerá con lo que vivas. Son unos pocos pasos y no te
          pediremos datos personales.
        </p>
      ),
    },
    1: {
      titulo: '¿Cómo se llamará?',
      cuerpo: (
        <CampoTexto
          etiqueta="Nombre de tu AURA"
          ayuda={`Opcional. Si lo dejas vacío, se llamará «Aura». Máximo ${LARGO_MAXIMO_NOMBRE} caracteres.`}
          opcional
          value={nombre}
          maxLength={LARGO_MAXIMO_NOMBRE + 8}
          autoComplete="off"
          onChange={(e) => setNombre(e.target.value)}
          error={errorNombre}
          placeholder="Aura"
        />
      ),
    },
    2: {
      titulo: 'Elige sus colores',
      cuerpo: (
        <>
          <SelectorColor leyenda="Color principal" nombre="principal" valor={p.colorPrincipal} onCambio={(id) => cambiar({ colorPrincipal: id })} />
          <SelectorColor leyenda="Color complementario" nombre="complementario" valor={p.colorComplementario} onCambio={(id) => cambiar({ colorComplementario: id })} />
        </>
      ),
    },
    3: {
      titulo: 'Su forma y su carácter',
      cuerpo: (
        <>
          <SelectorVisual
            leyenda="Forma"
            nombre="forma"
            valor={p.forma}
            onCambio={(id) => cambiar({ forma: id })}
            opciones={FORMAS.map((f) => ({ id: f.id, nombre: f.nombre, vista: <Personaje preferencias={{ ...p, forma: f.id }} etapa={3} tamano={64} quieto /> }))}
          />
          <SelectorVisual
            leyenda="Expresión"
            nombre="expresion"
            valor={p.expresion}
            onCambio={(id) => cambiar({ expresion: id })}
            opciones={EXPRESIONES.map((x) => ({ id: x.id, nombre: x.nombre, vista: <Personaje preferencias={{ ...p, expresion: x.id }} etapa={3} tamano={64} quieto /> }))}
          />
        </>
      ),
    },
    4: {
      titulo: '¿En qué momento de tu proyecto estás?',
      opcional: true,
      cuerpo: (
        <GrupoOpciones leyenda="Elige la opción más cercana (opcional)" nombre="momento" opciones={momentos} valor={momento} onCambio={setMomento} />
      ),
    },
    5: {
      titulo: '¿Cómo llegas hoy?',
      opcional: true,
      cuerpo: (
        <>
          <GrupoOpciones leyenda="Opcional. Esta respuesta no se guarda." nombre="sentir" opciones={SENTIRES} valor={sentir} onCambio={setSentir} />
          {respuesta && (
            <p className={estilos.respuesta} role="status">
              {respuesta}
            </p>
          )}
        </>
      ),
    },
    6: {
      titulo: `${p.nombre} acaba de nacer`,
      cuerpo: (
        <>
          <p className={estilos.texto}>
            Empieza como una esfera difuminada. Con cada experiencia significativa —explorar un contenido, completar un
            ejercicio, escribir una reflexión— ganará forma, rasgos y personalidad. Nunca perderá luz por una pausa ni
            por una emoción difícil.
          </p>
          <div className={estilos.acciones}>
            <BotonEnlace to="/mi-aura" tamano="lg" iconoFin="flecha">
              Conocer a {p.nombre}
            </BotonEnlace>
            <BotonEnlace to="/" variante="sutil">
              Ir al inicio
            </BotonEnlace>
          </div>
        </>
      ),
    },
  };
  const actual = contenido[paso]!;
  const ultimo = paso === PASOS.length - 1;

  return (
    <div className={estilos.onboarding}>
      <div className={estilos.vista}>
        <Personaje preferencias={{ ...p, nombre: nombreVisible }} etapa={VISTA_POR_PASO[paso]!} tamano={260} interactivo celebrando={ultimo} />
        <p className={estilos.leyendaVista} aria-live="polite">
          {paso >= 2 && paso <= 5 ? 'Así podrá llegar a verse con el tiempo' : paso === 6 ? `Hoy, ${p.nombre} es una esfera de luz` : ' '}
        </p>
      </div>

      <div className={estilos.panel}>
        <ol className={estilos.progreso} aria-label={`Paso ${paso + 1} de ${PASOS.length}`}>
          {PASOS.map((nombrePaso, k) => (
            <li key={nombrePaso} className={estilos.punto} data-estado={k < paso ? 'hecho' : k === paso ? 'actual' : undefined} aria-current={k === paso ? 'step' : undefined}>
              <span className="visualmente-oculto">{nombrePaso}</span>
            </li>
          ))}
        </ol>

        <form key={paso} className={estilos.paso} style={{ '--dir': direccion } as React.CSSProperties} onSubmit={siguiente} noValidate>
          <h1 ref={titulo} tabIndex={-1} className={estilos.titulo}>
            {actual.titulo}
          </h1>
          {actual.cuerpo}

          {!ultimo && (
            <div className={estilos.navegacion}>
              {paso > 0 ? (
                <Boton variante="sutil" iconoInicio="flecha" className={estilos.atras} onClick={() => ir(paso - 1)}>
                  Atrás
                </Boton>
              ) : (
                <Link to="/" viewTransition className={estilos.ahoraNo}>
                  Ahora no
                </Link>
              )}
              <div className={estilos.adelante}>
                {actual.opcional && (
                  <Boton
                    variante="secundario"
                    onClick={(e) => {
                      if (paso === 4) setMomento(null);
                      if (paso === 5) setSentir(null);
                      siguiente(e);
                    }}
                  >
                    Omitir
                  </Boton>
                )}
                <Boton type="submit" iconoFin="flecha">
                  {paso === 0 ? 'Empezar' : paso === 5 ? `Dar vida a ${p.nombre}` : 'Continuar'}
                </Boton>
              </div>
            </div>
          )}
        </form>
        {paso === 0 && (
          <p className={estilos.privacidad}>
            <Icono nombre="info" tamano={16} /> Todo se guarda solo en este navegador. Puedes cambiarlo o borrarlo cuando quieras.
          </p>
        )}
      </div>
    </div>
  );
}
