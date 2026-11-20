import { EncabezadoPagina, EstadoVista, Tarjeta } from '../../design-system/index.ts';
import { perfilActivo } from '../../content/perfiles/perfil.ts';
import { hrefContacto } from '../../content/perfiles/validar.ts';
import estilos from '../pagina.module.css';

/**
 * Recursos de acompañamiento configurables por institución (content/perfiles/<id>.json).
 * AURA no inventa contactos: si el perfil no los define, se dice con claridad.
 */
export function RecursosPage() {
  const { recursos, institucion } = perfilActivo;
  return (
    <>
      <EncabezadoPagina titulo="Recursos de acompañamiento">
        {recursos.introduccion ? (
          <p>{recursos.introduccion}</p>
        ) : (
          <p>Personas y servicios que pueden acompañarte además de AURA.</p>
        )}
      </EncabezadoPagina>

      <div className={estilos.aviso}>
        <EstadoVista
          tipo="vacio"
          compacto
          titulo="AURA acompaña, pero no es un servicio clínico"
          descripcion="No ofrece diagnósticos ni tratamientos. Si tu vida o la de otra persona está en riesgo, comunícate de inmediato con los servicios de emergencia de tu localidad."
        />
      </div>

      <section className={estilos.seccion} aria-labelledby="titulo-contactos">
        <h2 id="titulo-contactos">{institucion ? `Contactos de ${institucion}` : 'Contactos de tu institución'}</h2>
        {recursos.contactos.length === 0 ? (
          <EstadoVista
            tipo="vacio"
            titulo="Tu institución aún no ha configurado sus contactos"
            descripcion="Cuando estén disponibles, aquí verás los canales oficiales de bienestar y acompañamiento."
          />
        ) : (
          <ul className={estilos.rejilla}>
            {recursos.contactos.map((c) => {
              const href = hrefContacto(c.tipo, c.valor);
              return (
                <Tarjeta como="li" key={`${c.nombre}-${c.valor}`}>
                  <h3>{c.nombre}</h3>
                  <p>{c.descripcion}</p>
                  {href ? (
                    <a href={href} {...(c.tipo === 'web' && { target: '_blank', rel: 'noopener noreferrer' })}>
                      {c.valor}
                    </a>
                  ) : (
                    <p>{c.valor}</p>
                  )}
                  {c.horario && <p>{c.horario}</p>}
                </Tarjeta>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
