// ============================================================
// AUTH.JS — Autenticação e Controle de Acesso
// Depende de: config.js (window.SCRIPT_URL)
// ============================================================
window.Auth = (function () {
    const K = { user: 'sv_user', nivel: 'sv_nivel', ts: 'sv_ts' };
    const SESSION_MS = 8 * 3600 * 1000; // 8 horas
    let _cb = null;

    function getUser() { return localStorage.getItem(K.user) || ''; }
    function getNivel() { return localStorage.getItem(K.nivel) || 'Operador'; }
    function isAdmin() { return getNivel() === 'Admin'; }

    function isLoggedIn() {
        if (!getUser()) return false;
        const ts = parseInt(localStorage.getItem(K.ts) || '0');
        return (Date.now() - ts) < SESSION_MS;
    }

    function saveSession(nome, nivel) {
        localStorage.setItem(K.user, nome);
        localStorage.setItem(K.nivel, nivel);
        localStorage.setItem(K.ts, Date.now().toString());
    }

    function logout() {
        [K.user, K.nivel, K.ts].forEach(k => localStorage.removeItem(k));
        window.location.href = 'index.html';
    }

    // Chame nas páginas restritas (Financeiro, Relatórios)
    function requireAdmin() {
        if (!isLoggedIn() || !isAdmin()) {
            window.location.href = 'index.html';
        }
    }

    // Aplica restrições de UI baseadas no nível
    function applyUI() {
        if (!isAdmin()) {
            document.querySelectorAll('[data-admin-only]').forEach(el => { el.style.display = 'none'; });
            document.querySelectorAll('[data-admin-btn]').forEach(el => { el.style.display = 'none'; el.disabled = true; });
        }
    }

    function updateBadge() {
        const el = document.getElementById('userBadge');
        if (el) {
            const nivel = getNivel();
            el.innerHTML = `<span style="font-weight:600">${getUser()}</span><br><span style="font-size:0.68rem;opacity:0.7;">${nivel}</span>`;
        }
    }

    // ── Carrega operadores no select do modal ─────────────────
    function _loadOperators() {
        const sel = document.getElementById('loginNome');
        if (!sel || !window.SCRIPT_URL) {
            if (sel) sel.innerHTML = '<option value="Administrador">Administrador</option>';
            return;
        }
        fetch(window.SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'obterOperadores' })
        })
            .then(async r => {
                const txt = await r.text();
                try {
                    return JSON.parse(txt);
                } catch (e) {
                    console.error("Erro Parse JSON em obterOperadores:", txt);
                    throw new Error("Resposta inválida do servidor");
                }
            })
            .then(data => {
                sel.innerHTML = '<option value="">— Selecione —</option>';
                const ops = (data.status === 'sucesso' && Array.isArray(data.dados)) ? data.dados : [{ nome: 'Administrador', nivel: 'Admin' }];
                ops.forEach(op => {
                    const nome = typeof op === 'string' ? op : (op.nome || op);
                    sel.add(new Option(nome, nome));
                });
            })
            .catch(err => {
                console.error("Fetch Error em obterOperadores:", err);
                if (sel) sel.innerHTML = '<option value="Administrador">Administrador</option>';
            });
    }

    // ── Confirmação do login ──────────────────────────────────
    function _doLogin() {
        const sel = document.getElementById('loginNome');
        const pwd = document.getElementById('loginSenha');
        const errEl = document.getElementById('loginError');
        const btn = document.getElementById('loginBtn');
        const nome = sel ? sel.value.trim() : '';
        const senha = pwd ? pwd.value : '';

        if (!nome) { errEl.textContent = 'Selecione um operador.'; errEl.style.display = 'block'; return; }
        btn.disabled = true; btn.textContent = 'Verificando...';
        errEl.style.display = 'none';

        fetch(window.SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'autenticarOperador', data: { nome, senha } })
        })
            .then(async r => {
                const txt = await r.text();
                try {
                    return JSON.parse(txt);
                } catch (e) {
                    console.error("Erro de Parse JSON:", txt);
                    throw new Error("A resposta não foi um JSON válido.");
                }
            })
            .then(data => {
                if (data.status === 'sucesso') {
                    saveSession(data.nome, data.nivel);
                    const ov = document.getElementById('loginOverlay');
                    if (ov) ov.remove();
                    if (_cb) _cb();
                    updateBadge();
                } else {
                    errEl.textContent = data.mensagem || 'Senha incorreta.';
                    errEl.style.display = 'block';
                    btn.disabled = false; btn.textContent = '🔑 Entrar';
                }
            })
            .catch(err => {
                console.error("Fetch Error:", err);
                errEl.textContent = 'Falha na requisição. Verifique o console.';
                errEl.style.display = 'block';
                btn.disabled = false; btn.textContent = '🔑 Entrar';
            });
    }

    // ── Exibe o modal de login ─────────────────────────────────
    function showModal(callback) {
        _cb = callback;
        const ov = document.createElement('div');
        ov.id = 'loginOverlay';
        ov.style.cssText = [
            'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;',
            'background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);'
        ].join('');
        ov.innerHTML = `
        <div style="background:white;border-radius:1.25rem;padding:2rem 1.75rem;width:100%;max-width:360px;box-shadow:0 25px 60px rgba(0,0,0,0.5);">
            <div style="text-align:center;margin-bottom:1.5rem;">
                <div style="font-size:2.8rem;line-height:1;">🏪</div>
                <h2 style="font-size:1.15rem;font-weight:700;color:#1e293b;margin:0.5rem 0 0.2rem;">Sistema de Vendas</h2>
                <p style="font-size:0.78rem;color:#64748b;">Identifique-se para continuar</p>
            </div>
            <div id="loginError" style="display:none;background:#fee2e2;color:#991b1b;border-radius:0.5rem;padding:0.6rem 0.75rem;font-size:0.82rem;margin-bottom:0.9rem;"></div>
            <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:0.3rem;color:#374151;">Operador</label>
            <select id="loginNome"
                style="width:100%;padding:0.7rem 0.75rem;border:1.5px solid #d1d5db;border-radius:0.5rem;font-size:0.9rem;margin-bottom:0.9rem;box-sizing:border-box;background:white;">
                <option value="">⏳ Carregando...</option>
            </select>
            <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:0.3rem;color:#374151;">Senha</label>
            <input type="password" id="loginSenha" placeholder="••••••••" autocomplete="current-password"
                style="width:100%;padding:0.7rem 0.75rem;border:1.5px solid #d1d5db;border-radius:0.5rem;font-size:0.9rem;margin-bottom:1.25rem;box-sizing:border-box;">
            <button id="loginBtn" onclick="Auth._doLogin()"
                style="width:100%;padding:0.85rem;background:linear-gradient(135deg,#16a34a,#15803d);color:white;border:none;border-radius:0.625rem;font-weight:700;font-size:0.95rem;cursor:pointer;">
                🔑 Entrar
            </button>
        </div>`;
        document.body.appendChild(ov);
        document.getElementById('loginSenha').addEventListener('keydown', e => { if (e.key === 'Enter') Auth._doLogin(); });
        _loadOperators();
    }

    // ── Ponto de entrada (chamado pelo main.js) ───────────────
    function init(callback) {
        if (isLoggedIn()) {
            applyUI();
            updateBadge();
            if (callback) callback();
        } else {
            showModal(() => {
                applyUI();
                if (callback) callback();
            });
        }
    }

    return { getUser, getNivel, isAdmin, isLoggedIn, logout, requireAdmin, applyUI, updateBadge, init, _doLogin };
})();
