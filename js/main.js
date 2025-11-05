document.addEventListener('DOMContentLoaded', function() {
    const sidebar = `
        <aside id="desktop-sidebar" class="desktop-sidebar hidden md:flex flex-col">
            <div class="sidebar-header">
                Sistema de Vendas
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
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8H3a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2z"></path><path d="M3 10v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-14a2 2 0 0 0-2 2z"></path><rect x="1" y="4" width="22" height="6" rx="2" ry="2"></rect><rect x="1" y="14" width="22" height="6" rx="2" ry="2"></rect></svg>
                    <span>Produtos</span>
                </a>
                <a href="Relatorios.html" class="nav-link-menu">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h7v9H3z"></path><path d="M14 3h7v5h-7z"></path><path d="M14 12h7v9h-7z"></path><path d="M3 16h7v5h-7z"></path></svg>
                    <span>Relatórios</span>
                </a>
            </nav>
        </aside>
    `;
    document.body.insertAdjacentHTML('afterbegin', sidebar);

    const currentPath = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.nav-link-menu');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
});
