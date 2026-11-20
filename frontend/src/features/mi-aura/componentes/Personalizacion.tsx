import { useState, type FormEvent } from 'react';
import { Boton, CampoTexto } from '../../../design-system/index.ts';
import { Personaje } from '../avatar/Personaje.tsx';
import type { Evolucion } from '../dominio/evolucion.ts';
import { comoSeDesbloquea, DECORACIONES, EXPRESIONES, FORMAS, LARGO_MAXIMO_NOMBRE } from '../dominio/modelo.ts';
import { validarNombre } from '../dominio/validar.ts';
import { useMiAura } from '../estado/MiAuraContexto.tsx';
import { SelectorColor, SelectorMultiple, SelectorVisual } from './Selectores.tsx';
import estilos from '../MiAuraPage.module.css';

/** Cambios inmediatos: la vista principal se transforma en vivo y se guarda sola. */
export function Personalizacion({ evolucion }: { evolucion: Evolucion }) {
  const { carga, actualizarPreferencias } = useMiAura();
  const p = carga.estado === 'listo' ? carga.datos.preferencias : null;
  const [nombre, setNombre] = useState(p?.nombre ?? '');
  const [error, setError] = useState<string>();
  const [guardado, setGuardado] = useState(false);
  if (!p) return null;

  const guardarNombre = (e: FormEvent) => {
    e.preventDefault();
    const err = validarNombre(nombre);
    setError(err ?? undefined);
    if (err) return;
    actualizarPreferencias({ nombre: nombre.trim() });
    setGuardado(true);
  };

  // Las miniaturas se ven al menos en Transformación para que la elección sea clara.
  const etapaVista = Math.max(evolucion.indice, 3);

  return (
    <section className={estilos.seccion} aria-labelledby="personaliza">
      <h2 id="personaliza">Personaliza a {p.nombre}</h2>
      <p className={estilos.nota}>Los cambios se guardan al instante y {p.nombre} conserva todo lo vivido.</p>

      <form className={estilos.formNombre} onSubmit={guardarNombre} noValidate>
        <CampoTexto
          etiqueta="Nombre"
          value={nombre}
          maxLength={LARGO_MAXIMO_NOMBRE + 8}
          autoComplete="off"
          onChange={(e) => {
            setNombre(e.target.value);
            setGuardado(false);
          }}
          error={error}
        />
        <Boton type="submit" variante="secundario">
          Guardar nombre
        </Boton>
        <span role="status" className={estilos.nota}>
          {guardado ? 'Nombre guardado.' : ''}
        </span>
      </form>

      <SelectorColor leyenda="Color principal" nombre="m-principal" valor={p.colorPrincipal} onCambio={(id) => actualizarPreferencias({ colorPrincipal: id })} />
      <SelectorColor leyenda="Color complementario" nombre="m-complementario" valor={p.colorComplementario} onCambio={(id) => actualizarPreferencias({ colorComplementario: id })} />

      <SelectorVisual
        leyenda="Forma"
        nombre="m-forma"
        valor={p.forma}
        onCambio={(id) => actualizarPreferencias({ forma: id })}
        nota={evolucion.indice < 1 ? 'La forma aparecerá en Descubrimiento; tu elección se conserva.' : undefined}
        opciones={FORMAS.map((f) => ({ id: f.id, nombre: f.nombre, vista: <Personaje preferencias={{ ...p, forma: f.id }} etapa={etapaVista} tamano={64} quieto /> }))}
      />
      <SelectorVisual
        leyenda="Expresión"
        nombre="m-expresion"
        valor={p.expresion}
        onCambio={(id) => actualizarPreferencias({ expresion: id })}
        nota={evolucion.indice < 2 ? 'Los rasgos aparecerán en Reconocimiento; tu elección se conserva.' : undefined}
        opciones={EXPRESIONES.map((x) => ({ id: x.id, nombre: x.nombre, vista: <Personaje preferencias={{ ...p, expresion: x.id }} etapa={etapaVista} tamano={64} quieto /> }))}
      />
      <SelectorMultiple
        leyenda="Elementos decorativos"
        nota="Se desbloquean con experiencias concretas. Elige cuáles mostrar."
        valores={p.decoraciones}
        onCambio={(v) => actualizarPreferencias({ decoraciones: v })}
        opciones={DECORACIONES.map((d) => ({
          id: d.id,
          nombre: d.nombre,
          vista: <Personaje preferencias={p} etapa={etapaVista} decoraciones={[d.id]} tamano={64} quieto />,
          ...(!evolucion.desbloqueadas.includes(d.id) && { bloqueo: comoSeDesbloquea(d.condicion) }),
        }))}
      />
    </section>
  );
}
