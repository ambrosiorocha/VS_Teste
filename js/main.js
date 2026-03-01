// main.js — Sidebar responsiva + Auth
document.addEventListener('DOMContentLoaded', function () {

    // ── Injetar CSS do menu mobile ─────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
        #hamburgerBtn {
            display: none;
            position: fixed; top: 0.75rem; left: 0.75rem; z-index: 1100;
            background: #16a34a; color: white; border: none; border-radius: 0.5rem;
            padding: 0.55rem 0.75rem; font-size: 1.2rem; cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        }
        #sidebarOverlay {
            display: none; position: fixed; inset: 0;
            background: rgba(0,0,0,0.45); z-index: 1050;
        }
        #sidebarOverlay.open { display: block; }
        @media (max-width: 767px) {
            #hamburgerBtn { display: flex; align-items: center; justify-content: center; }
            #desktop-sidebar {
                position: fixed !important; left: -280px; top: 0; height: 100vh;
                width: 260px !important; z-index: 1060; transition: left 0.25s ease;
                box-shadow: 4px 0 24px rgba(0,0,0,0.35);
            }
            #desktop-sidebar.sidebar-open { left: 0 !important; }
            .desktop-sidebar { display: flex !important; }
            .hidden.md\\:flex { display: flex !important; }
            .main-content { padding-top: 3.5rem !important; }
        }
        .user-badge-block {
            padding: 0.6rem 1rem; border-top: 1px solid rgba(255,255,255,0.12);
            margin-top: auto; font-size: 0.78rem; color: rgba(255,255,255,0.85);
            display: flex; flex-direction: column; gap: 0.35rem;
        }
        .logout-btn {
            background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
            color: white; border-radius: 0.375rem; padding: 0.35rem 0.6rem;
            font-size: 0.72rem; cursor: pointer; text-align: left; width: 100%;
            transition: background 0.15s;
        }
        .logout-btn:hover { background: rgba(239,68,68,0.4); }
    `;
    document.head.appendChild(style);

    // ── Hamburger e overlay mobile ─────────────────────────────
    const hamBtn = document.createElement('button');
    hamBtn.id = 'hamburgerBtn';
    hamBtn.innerHTML = '☰';
    hamBtn.setAttribute('aria-label', 'Menu');
    document.body.appendChild(hamBtn);

    const overlay = document.createElement('div');
    overlay.id = 'sidebarOverlay';
    document.body.appendChild(overlay);

    function openSidebar() { document.getElementById('desktop-sidebar')?.classList.add('sidebar-open'); overlay.classList.add('open'); }
    function closeSidebar() { document.getElementById('desktop-sidebar')?.classList.remove('sidebar-open'); overlay.classList.remove('open'); }
    hamBtn.addEventListener('click', openSidebar);
    overlay.addEventListener('click', closeSidebar);

    // ── Sidebar HTML ───────────────────────────────────────────
    const sidebar = `
        <aside id="desktop-sidebar" class="desktop-sidebar hidden md:flex flex-col">
            <div class="sidebar-header" style="display:flex;justify-content:center;align-items:center;gap:8px;">
                <img src="assets/logo.png" alt="Logo" style="height:32px; background-color:white; padding:3px; border-radius:6px; object-fit:contain;"> 
                <span>Gestão&Controle</span>
            </div>
            <nav id="desktop-nav" class="sidebar-nav flex-1">
                <a href="index.html" class="nav-link-menu">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                    <span>Início</span>
                </a>
                <a href="Vendas.html" class="nav-link-menu">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                    <span>Vendas</span>
                </a>
                <a href="Produtos.html" class="nav-link-menu">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="6" rx="2" ry="2"></rect><rect x="1" y="14" width="22" height="6" rx="2" ry="2"></rect></svg>
                    <span>Produtos</span>
                </a>
                <a href="Clientes.html" class="nav-link-menu">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    <span>Clientes</span>
                </a>
                <a href="Fornecedores.html" class="nav-link-menu">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                    <span>Fornecedores</span>
                </a>
                <a href="Financeiro.html" class="nav-link-menu" data-admin-only>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                    <span>Financeiro</span>
                </a>
                <a href="Relatorios.html" class="nav-link-menu" data-admin-only>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h7v9H3z"></path><path d="M14 3h7v5h-7z"></path><path d="M14 12h7v9h-7z"></path><path d="M3 16h7v5h-7z"></path></svg>
                    <span>Relatórios</span>
                </a>
            </nav>
            <!-- Badge do usuário logado -->
            <div class="user-badge-block">
                <div id="userBadge" style="line-height:1.4;">—</div>
                <button class="logout-btn" onclick="Auth.logout()">⎋ Sair do sistema</button>
            </div>
        </aside>
    `;
    document.body.insertAdjacentHTML('afterbegin', sidebar);

    // ── Link ativo ─────────────────────────────────────────────
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link-menu').forEach(link => {
        if (link.getAttribute('href') === currentPath) link.classList.add('active');
    });

    // ── Inicializar autenticação ───────────────────────────────
    if (typeof Auth !== 'undefined') {
        Auth.init(() => {
            // Preenche operador na tela de vendas se disponível
            const opSel = document.getElementById('usuario');
            if (opSel && Auth.getUser()) {
                // Garante que a opção do usuário logado existe
                let found = Array.from(opSel.options).some(o => o.value === Auth.getUser());
                if (!found) {
                    const opt = new Option(Auth.getUser(), Auth.getUser());
                    opSel.insertBefore(opt, opSel.firstChild);
                }
                opSel.value = Auth.getUser();
                if (!Auth.isAdmin()) opSel.disabled = true; // Operador não pode trocar
            }

            // Atualiza saudação no index se existir
            const greetEl = document.getElementById('greetingMsg');
            if (greetEl && Auth.getUser()) {
                greetEl.textContent = `Bem-vindo(a) ao Gestão&Controle, ${Auth.getUser()}!`;
            }
        });
    }
});
