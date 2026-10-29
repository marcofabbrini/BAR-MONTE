import { useLayoutEffect } from 'react';

/** Porta la pagina in alto; lo scorrimento è sul documento/body (vedi index.css). */
export const scrollPageToTop = () => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
};

/** Riporta la pagina in alto ogni volta che cambia uno dei valori (es. la scheda attiva). */
export const useScrollTop = (...deps: unknown[]) => {
    useLayoutEffect(() => { scrollPageToTop(); }, deps); // eslint-disable-line react-hooks/exhaustive-deps
};
