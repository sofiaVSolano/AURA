// SOLO DESARROLLO: permite probar la evolución antes de que existan los
// contenidos de F3/F4. No se incluye en el build de producción.
import { Boton } from '../../../design-system/index.ts';
import { LISTA_TIPOS, TIPOS_EXPERIENCIA } from '../dominio/modelo.ts';
import { useMiAura } from '../estado/MiAuraContexto.tsx';
import estilos from '../MiAuraPage.module.css';

export function SimuladorDev() {
  const { registrarExperiencia } = useMiAura();
  return (
    <section className={`${estilos.seccion} ${estilos.simulador}`} aria-labelledby="simulador">
      <h2 id="simulador">Simulador de experiencias (solo desarrollo)</h2>
      <div className={estilos.botones}>
        {LISTA_TIPOS.map((t) => (
          <Boton
            key={t}
            tamano="sm"
            variante="secundario"
            onClick={() =>
              registrarExperiencia(t, `demo:${t}:${Date.now().toString(36)}`, Math.random() < 0.5 ? 'emocional' : 'academica')
            }
          >
            + {TIPOS_EXPERIENCIA[t].nombre}
          </Boton>
        ))}
        <Boton tamano="sm" variante="sutil" onClick={() => registrarExperiencia('contenido-explorado', 'demo:repetido', 'emocional')}>
          + Repetir el mismo contenido (no suma)
        </Boton>
      </div>
    </section>
  );
}
