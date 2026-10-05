/**
 * api.js — Camada de comunicação com a API (Google Apps Script)
 * Substitui o google.script.run, por isso o index.html quase não muda.
 *
 * 1) Cole abaixo o URL da implementação (termina em /exec)
 * 2) Inclua no index.html ANTES do <script> principal:
 *      <script src="api.js"></script>
 */
(function () {
  'use strict';

  const API_URL   = 'https://script.google.com/macros/s/AKfycbyb6a7nDusqXy5JRxpRheA_pb3yYYCpqTqeZzmGo3Fmqga-YBPW7h2-S1rwGtVX99FQYw/exec';
  const TOKEN_KEY = '_tst';
  const USER_KEY  = '_tss';

  async function chamar(action, args) {
    const resp = await fetch(API_URL, {
      method: 'POST',
      // text/plain evita o pré-pedido CORS (preflight), que o Apps Script não suporta
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, args, token: sessionStorage.getItem(TOKEN_KEY) || '' }),
    });
    if (!resp.ok) throw new Error('Falha de rede (' + resp.status + ').');
    const r = await resp.json();

    if (!r.ok) {
      if (r.code === 'AUTH') sessaoExpirada();
      throw new Error(r.error || 'Erro desconhecido.');
    }
    // Guarda o token devolvido no login e não o expõe ao resto da app
    if (action === 'loginUser' && r.data && r.data.token) {
      sessionStorage.setItem(TOKEN_KEY, r.data.token);
      delete r.data.token;
    }
    if (action === 'logout') sessionStorage.removeItem(TOKEN_KEY);
    return r.data;
  }

  function sessaoExpirada() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    setTimeout(function () {
      if (typeof goTo === 'function') goTo('pgSplash');
    }, 1500);
  }

  /** Imita google.script.run.withSuccessHandler(...).withFailureHandler(...).funcao(...) */
  function criarRunner(ok, falha) {
    return new Proxy({}, {
      get(_, nome) {
        if (nome === 'withSuccessHandler') return (f) => criarRunner(f, falha);
        if (nome === 'withFailureHandler') return (f) => criarRunner(ok, f);
        return (...args) => {
          chamar(String(nome), args)
            .then((d) => { if (ok) ok(d); })
            .catch((e) => { if (falha) falha(e); else console.error(e); });
        };
      },
    });
  }

  window.google = { script: { run: criarRunner() } };
})();
