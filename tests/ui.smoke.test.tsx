// @vitest-environment jsdom
/**
 * Test di fumo dell'interfaccia reale (App completa) collegata al backend PHP + MySQL.
 * Opzionale: richiede  npm i --no-save vitest jsdom @testing-library/react @testing-library/user-event
 * e server PHP + DB di prova già avviati e seedati.
 * Uso: GD_TEST_URL=http://127.0.0.1:8099/index.php npx vitest run tests/ui.smoke.test.tsx
 */
import { describe, it, expect, afterAll } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { configureApi, __stopSync } from '../lib/db';
import App from '../App';

const URL_BASE = process.env.GD_TEST_URL || 'http://127.0.0.1:8099/index.php';

let cookie = '';
const cookieFetch: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    if (cookie) headers.set('Cookie', cookie);
    const res = await fetch(input, { ...init, headers });
    for (const c of res.headers.getSetCookie?.() ?? []) {
        const kv = c.split(';')[0];
        cookie = kv.endsWith('=') ? '' : kv;
    }
    return res;
};
configureApi({ endpoint: URL_BASE, fetchImpl: cookieFetch, pollMs: 300 });

// Pezzi di browser che jsdom non ha
(globalThis as any).ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };
(window as any).matchMedia ??= () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
window.scrollTo = (() => {}) as any;
window.alert = (() => {}) as any;

afterAll(() => { cleanup(); __stopSync(); });

const type = (el: Element, value: string) => fireEvent.change(el, { target: { value } });

describe('App collegata al server', () => {
    it('mostra il login, rifiuta password errata, accetta quella giusta e carica la schermata casse', async () => {
        const { container } = render(<App />);

        // 1. Schermata di login (nessuna sessione)
        const user = await screen.findByPlaceholderText(/Nome Utente/i);
        const pass = container.querySelector('input[type="password"]')!;
        expect(screen.getByText(/Vigili del Fuoco/i)).toBeTruthy();

        // 2. Password errata
        type(user, 'mario'); type(pass, 'sbagliata');
        fireEvent.click(screen.getByRole('button', { name: /Accedi/i }));
        await screen.findByText(/Credenziali non valide/i);

        // 3. Password corretta -> schermata delle casse
        type(pass, 'mariopw');
        fireEvent.click(screen.getByRole('button', { name: /Accedi/i }));
        await waitFor(() => expect(screen.queryByPlaceholderText(/Nome Utente/i)).toBeNull(), { timeout: 5000 });
        await screen.findAllByText(/Montepulciano/i, {}, { timeout: 8000 });
        expect(container.textContent).not.toMatch(/mariopw/);
    }, 30000);

    it('il Super Admin apre il pannello Admin e la gestione personale non mostra password', async () => {
        cleanup();
        cookie = '';
        const { container } = render(<App />);
        const user = await screen.findByPlaceholderText(/Nome Utente/i);
        type(user, 'admin'); type(container.querySelector('input[type="password"]')!, 'superpw');
        fireEvent.click(screen.getByRole('button', { name: /Accedi/i }));

        // Il Super Admin vede il pulsante Admin
        const adminBtn = await screen.findByText(/^Admin$/i, {}, { timeout: 8000 });
        fireEvent.click(adminBtn);
        const findStaffTab = () => Array.from(container.querySelectorAll('button')).find(b => /^\s*staff\s*$/i.test((b.textContent || '').replace(/[^A-Za-z]/g, ' ')));
        await waitFor(() => expect(findStaffTab()).toBeTruthy(), { timeout: 8000 });
        fireEvent.click(findStaffTab()!);
        await waitFor(() => expect(container.textContent).toMatch(/Mario Rossi/), { timeout: 8000 });
        await waitFor(() => expect(container.textContent).toMatch(/Libero Accesso/), { timeout: 8000 });

        // Nessuna password (in chiaro o hash) in nessun punto della pagina
        const html = container.innerHTML;
        for (const secret of ['mariopw', 'superpw', 'annapw', 'mgrpw', '$2y$']) {
            expect(html.includes(secret), `la pagina contiene "${secret}"`).toBe(false);
        }
    }, 40000);
});
