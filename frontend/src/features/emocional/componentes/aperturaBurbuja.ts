import { useNavigate } from 'react-router';
import type { MouseEvent } from 'react';

/**
 * Transición «la burbuja se abre»: al tocar una burbuja, un círculo de su color
 * crece desde ella hasta cubrir la pantalla (con el nombre de lo que se abre),
 * se navega y, ya en la página nueva, el velo se disuelve hacia arriba.
 * Sin dependencias ni View Transitions: funciona igual en cualquier navegador.
 * Con movimiento reducido (o clic con modificadores) se navega sin más.
 */
export function useAperturaBurbuja() {
  const navegar = useNavigate();

  return (e: MouseEvent<HTMLAnchorElement>, destino: string, { matiz, texto, origen }: { matiz: number; texto: string; origen?: Element | null }) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    // Con movimiento reducido no hay círculo que crece: un fundido difuminado en su color
    const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
    e.preventDefault();

    const r = (origen ?? e.currentTarget).getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radio = Math.max(r.width, r.height) / 2;
    const lejos = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 40;

    const velo = document.createElement('div');
    velo.setAttribute('aria-hidden', 'true');
    Object.assign(velo.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '60',
      display: 'grid',
      placeItems: 'center',
      pointerEvents: 'none',
      background: `radial-gradient(60% 80% at 20% 0%, hsl(${matiz} 95% 85% / 0.55), transparent 60%),
        radial-gradient(60% 70% at 90% 100%, hsl(${matiz + 24} 70% 50% / 0.8), transparent 70%),
        linear-gradient(150deg, hsl(${matiz} 70% 62%), hsl(${matiz - 16} 58% 38%))`,
      clipPath: `circle(${radio}px at ${x}px ${y}px)`,
    });
    const rotulo = document.createElement('span');
    rotulo.textContent = texto;
    Object.assign(rotulo.style, {
      maxWidth: '14ch',
      padding: '0 1rem',
      fontFamily: 'var(--fuente-display)',
      fontSize: 'clamp(2.6rem, 1.4rem + 6vw, 7rem)',
      fontWeight: '500',
      lineHeight: '0.95',
      letterSpacing: '-0.03em',
      textAlign: 'center',
      color: '#fff',
      opacity: '0',
    });
    velo.append(rotulo);
    document.body.append(velo);

    const curva = 'cubic-bezier(0.7, 0, 0.2, 1)';
    if (reducido) {
      velo.style.clipPath = 'none';
      velo.style.backdropFilter = 'blur(18px)';
      void velo
        .animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease-out', fill: 'forwards' })
        .finished.then(async () => {
          rotulo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: 'forwards' });
          await new Promise((ok) => setTimeout(ok, 450));
          await esperarPagina(() => navegar(destino));
          scrollTo({ top: 0 });
          await velo.animate([{ opacity: 1, filter: 'blur(0)' }, { opacity: 0, filter: 'blur(12px)' }], { duration: 650, easing: 'ease-in-out', fill: 'forwards' }).finished;
          velo.remove();
        });
      return;
    }
    const abrir = velo.animate(
      [{ clipPath: `circle(${radio}px at ${x}px ${y}px)` }, { clipPath: `circle(${lejos}px at ${x}px ${y}px)` }],
      { duration: 720, easing: curva, fill: 'forwards' },
    );
    rotulo.animate(
      [
        { opacity: 0, transform: 'translateY(40px) scale(0.92)', filter: 'blur(10px)' },
        { opacity: 1, transform: 'none', filter: 'blur(0)' },
      ],
      { duration: 600, delay: 320, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'forwards' },
    );

    void abrir.finished.then(async () => {
      // Un instante para leer el nombre; después se navega (arriba de todo) y el velo se retira
      await new Promise((ok) => setTimeout(ok, 380));
      await esperarPagina(() => navegar(destino));
      scrollTo({ top: 0 });
      const cerrar = velo.animate(
        [
          { clipPath: 'inset(0 0 0 0 round 0)', opacity: 1 },
          { clipPath: 'inset(0 0 100% 0 round 0 0 50% 50%)', opacity: 1 },
        ],
        { duration: 820, easing: curva, fill: 'forwards' },
      );
      rotulo.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-80px)', opacity: 0 }], {
        duration: 500,
        easing: 'ease-in',
        fill: 'forwards',
      });
      void cerrar.finished.finally(() => velo.remove());
    });
  };
}

/** Navega y espera a que el contenido principal cambie (las rutas se cargan bajo demanda). */
function esperarPagina(navegar: () => void) {
  return new Promise<void>((ok) => {
    const main = document.getElementById('contenido');
    let hecho = false;
    const terminar = () => {
      if (hecho) return;
      hecho = true;
      observador?.disconnect();
      clearTimeout(limite);
      requestAnimationFrame(() => requestAnimationFrame(() => ok()));
    };
    const observador = main ? new MutationObserver(terminar) : null;
    observador?.observe(main!, { childList: true, subtree: true });
    const limite = window.setTimeout(terminar, 2500);
    navegar();
  });
}
