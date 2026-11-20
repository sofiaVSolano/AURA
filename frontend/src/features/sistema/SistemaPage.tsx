// Catálogo vivo del sistema de diseño (solo desarrollo: /sistema).
// Muestra cada componente con sus estados en los cuatro ámbitos.
import { useState, type FormEvent, type ReactNode } from 'react';
import {
  AreaTexto,
  BarraProgreso,
  Boton,
  BotonEnlace,
  CampoTexto,
  EncabezadoPagina,
  EstadoVista,
  Etiqueta,
  GrupoOpciones,
  Modal,
  PasosProgreso,
} from '../../design-system/index.ts';
import { ReproductorVideo } from '../../design-system/components/ReproductorVideo/ReproductorVideo.tsx';
import { Actividad } from '../academica/componentes/Actividades.tsx';
import { laboratorioPorId } from '../academica/datos/catalogoAcademico.ts';
import { Personaje } from '../mi-aura/avatar/Personaje.tsx';
import { PREFERENCIAS_INICIALES } from '../mi-aura/dominio/modelo.ts';
import { FilaSubtema } from '../emocional/componentes/FilaSubtema.tsx';
import { subtemasDe } from '../emocional/datos/catalogoEmocional.ts';
import type { Ambito } from '../../app/rutas.ts';
import estilos from './SistemaPage.module.css';

const AMBITOS: Ambito[] = ['inicio', 'academico', 'emocional', 'mi-aura'];

function Muestra({ titulo, children }: { titulo: string; children: (ambito: Ambito) => ReactNode }) {
  return (
    <section className={estilos.muestra} aria-labelledby={`m-${titulo}`}>
      <h2 id={`m-${titulo}`}>{titulo}</h2>
      <div className={estilos.ambitos}>
        {AMBITOS.map((a) => (
          <div key={a} data-ambito={a} className={estilos.ambito}>
            <span className={estilos.nombreAmbito}>{a}</span>
            {children(a)}
          </div>
        ))}
      </div>
    </section>
  );
}

function FormularioDemo() {
  const [texto, setTexto] = useState('');
  const [opcion, setOpcion] = useState<string | null>(null);
  const [errores, setErrores] = useState<{ texto?: string; opcion?: string }>({});
  const [estado, setEstado] = useState<'inactivo' | 'enviando' | 'listo'>('inactivo');

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const nuevos = {
      ...(texto.trim().length < 3 && { texto: 'Escribe al menos 3 caracteres para continuar.' }),
      ...(!opcion && { opcion: 'Elige una opción para continuar.' }),
    };
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;
    setEstado('enviando');
    window.setTimeout(() => setEstado('listo'), 900);
  };

  if (estado === 'listo') {
    return (
      <EstadoVista
        tipo="exito"
        titulo="Listo"
        descripcion="Demostración: no se guardó nada."
        accion={<Boton variante="secundario" onClick={() => setEstado('inactivo')}>Volver</Boton>}
      />
    );
  }

  return (
    <form className={estilos.formulario} onSubmit={enviar} noValidate>
      <AreaTexto
        etiqueta="Reflexión (demostración)"
        ayuda="Voluntaria y privada. Puedes borrarla cuando quieras."
        value={texto}
        maxLength={280}
        onChange={(e) => setTexto(e.target.value)}
        error={errores.texto}
      />
      <CampoTexto etiqueta="Palabra clave" opcional placeholder="Por ejemplo: calma" />
      <GrupoOpciones
        leyenda="¿Cómo llegas hoy?"
        nombre="llegada"
        valor={opcion}
        onCambio={setOpcion}
        error={errores.opcion}
        opciones={[
          { valor: 'tranquilo', etiqueta: 'Con calma' },
          { valor: 'inquieto', etiqueta: 'Con inquietud', descripcion: 'También es válido.' },
        ]}
      />
      <Boton type="submit" cargando={estado === 'enviando'}>
        Guardar
      </Boton>
    </form>
  );
}

export function SistemaPage() {
  const [modal, setModal] = useState(false);

  return (
    <div className={estilos.pagina}>
      <EncabezadoPagina titulo="Sistema de diseño">
        <p>Catálogo vivo (solo desarrollo). Cada muestra se renderiza en los cuatro ámbitos.</p>
      </EncabezadoPagina>

      <Muestra titulo="Botones">
        {() => (
          <div className={estilos.fila}>
            <Boton>Primario</Boton>
            <Boton variante="secundario">Secundario</Boton>
            <Boton variante="sutil" iconoFin="flecha">
              Sutil
            </Boton>
            <Boton cargando>Cargando</Boton>
            <Boton disabled>Deshabilitado</Boton>
          </div>
        )}
      </Muestra>

      <Muestra titulo="Etiquetas">
        {() => (
          <div className={estilos.fila}>
            {(['neutro', 'emocional', 'academico', 'aura', 'pendiente', 'exito'] as const).map((t) => (
              <Etiqueta key={t} tono={t}>
                {t}
              </Etiqueta>
            ))}
          </div>
        )}
      </Muestra>

      <Muestra titulo="Progreso">
        {() => (
          <>
            <BarraProgreso etiqueta="Guía leída" valor={40} />
            <PasosProgreso
              etiqueta="Etapas de ejemplo"
              pasos={[
                { id: 'a', titulo: 'Explorar', estado: 'explorado' },
                { id: 'b', titulo: 'Delimitar', estado: 'en-curso' },
                { id: 'c', titulo: 'Escribir', estado: 'sin-empezar' },
              ]}
            />
          </>
        )}
      </Muestra>

      <Muestra titulo="Estados">
        {() => (
          <div className={estilos.columna}>
            <EstadoVista tipo="cargando" compacto titulo="Cargando…" />
            <EstadoVista tipo="vacio" compacto titulo="Aún no hay nada aquí" descripcion="Y está bien." />
            <EstadoVista tipo="error" compacto titulo="No pudimos cargar" descripcion="Vuelve a intentarlo." />
            <EstadoVista tipo="exito" compacto titulo="Guardado" />
          </div>
        )}
      </Muestra>

      <section className={estilos.muestra}>
        <h2>Mi AURA: las cinco etapas</h2>
        <div data-ambito="mi-aura" className={`${estilos.ambito} ${estilos.fila}`}>
          {[0, 1, 2, 3, 4].map((e) => (
            <Personaje key={e} tamano={120} etapa={e} preferencias={{ ...PREFERENCIAS_INICIALES, expresion: 'alegre' }} decoraciones={e === 4 ? ['aurora', 'anillo', 'luciernagas'] : []} />
          ))}
        </div>
      </section>

      <section className={estilos.muestra}>
        <h2>Componentes de dominio</h2>
        <div className={estilos.ambitos}>
          <div data-ambito="emocional" className={estilos.ambito}>
            <ol className={estilos.sinLista}>
              {subtemasDe('tengo-miedo')
                .slice(0, 2)
                .map((s, i) => (
                  <FilaSubtema key={s.id} subtema={s} indice={i} guardado={i === 0} avance={undefined} />
                ))}
            </ol>
          </div>
          <div data-ambito="academico" className={estilos.ambito}>
            {/* Actividad real de laboratorio (sin registrar progreso) */}
            <Actividad actividad={laboratorioPorId('objetivos')!.actividades[0]!} onRevisada={() => {}} onPractica={() => {}} />
          </div>
        </div>
      </section>

      <Muestra titulo="Formulario y validación">{() => <FormularioDemo />}</Muestra>

      <section className={estilos.muestra}>
        <h2>Modal y reproductor</h2>
        <div className={estilos.fila}>
          <Boton variante="secundario" onClick={() => setModal(true)}>
            Abrir modal
          </Boton>
          <BotonEnlace to="/mi-aura" variante="sutil" iconoFin="flecha">
            Transición compartida a Mi AURA
          </BotonEnlace>
        </div>
        <Modal
          abierto={modal}
          onCerrar={() => setModal(false)}
          titulo="¿Borrar esta reflexión?"
          descripcion="Se eliminará de este dispositivo. No se puede deshacer."
          acciones={
            <>
              <Boton variante="secundario" onClick={() => setModal(false)}>
                Conservar
              </Boton>
              <Boton onClick={() => setModal(false)}>Borrar</Boton>
            </>
          }
        />
        {/* Fixture de prueba (tests/fixtures, generado con `npm run fixture:video`): NO es contenido de AURA. */}
        <ReproductorVideo
          titulo="Video de prueba del reproductor"
          fuentes={{
            video: '/__fixtures__/prueba.mp4',
            subtitulos: [{ idioma: 'es', etiqueta: 'Español', src: '/__fixtures__/prueba.es.vtt' }],
            transcripcion: '/__fixtures__/prueba.txt',
          }}
          duracion={8}
          siguiente={{ titulo: 'Tengo miedo · Hablar en público', a: '/emocional/tengo-miedo/hablar-en-publico' }}
        />
      </section>
    </div>
  );
}
