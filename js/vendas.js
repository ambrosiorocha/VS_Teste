// ================================
// ESTADO GLOBAL DO CARRINHO
// ================================
let produtos = [];
let carrinho = []; // [{nome, preco, quantidade, desconto, subtotal}]
let formaPagamentoSelecionada = '';

// ================================
// INICIALIZAÇÃO
// ================================
document.addEventListener('DOMContentLoaded', function () {
    if (SCRIPT_URL === '') {
        exibirStatus({ status: 'error', mensagem: 'Configure a SCRIPT_URL no config.js.' });
        return;
    }
    carregarProdutos();
    carregarClientes();
    carregarHistoricoVendas();

    document.getElementById('produto').addEventListener('change', atualizarPrecoUnitario);
    document.getElementById('quantidade').addEventListener('input', atualizarSubtotalItem);
    document.getElementById('descontoItem').addEventListener('input', atualizarSubtotalItem);

    // Botões de forma de pagamento no modal
    document.querySelectorAll('.pgto-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.pgto-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            formaPagamentoSelecionada = this.dataset.pgto;
            atualizarModalTotais();
        });
    });
    document.getElementById('descontoGeralModal').addEventListener('input', atualizarModalTotais);
});

// ================================
// STATUS
// ================================
function exibirStatus(resposta) {
    var el = document.getElementById('statusMessage');
    el.textContent = resposta.mensagem;
    el.className = '';
    if (resposta.status) el.classList.add(resposta.status);
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 6000);
}

// ================================
// CARREGAR PRODUTOS E CLIENTES
// ================================
async function carregarProdutos() {
    const sel = document.getElementById('produto');
    sel.innerHTML = '<option value="">Carregando...</option>';
    try {
        const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'obterProdutos' }) });
        const data = await res.json();
        produtos = data.dados || [];
        sel.innerHTML = '<option value="">Selecione um produto</option>';
        produtos.forEach(p => {
            const estoque = parseFloat(p.Quantidade) || 0;
            const precoRaw = String(p['Preço'] || p.Preco || 0).replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
            const opt = document.createElement('option');
            opt.value = p.Nome;
            opt.textContent = `${p.Nome}  (Estoque: ${estoque})`;
            opt.dataset.preco = parseFloat(precoRaw) || 0;
            opt.dataset.estoque = estoque;
            sel.appendChild(opt);
        });
    } catch (e) { sel.innerHTML = '<option value="">Erro ao carregar</option>'; }
}

async function carregarClientes() {
    const sel = document.getElementById('cliente');
    try {
        const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'obterClientes' }) });
        const data = await res.json();
        sel.innerHTML = '<option value="Consumidor Interno">Consumidor Interno</option>';
        if (data.status === 'sucesso' && data.dados.length > 0) {
            data.dados.forEach(c => {
                const opt = document.createElement('option');
                const nome = c.nome || c.Nome || '';
                opt.value = nome;
                opt.textContent = nome;
                sel.appendChild(opt);
            });
        }
    } catch (e) { /* mantém Consumidor Interno */ }
}

// ================================
// PREÇO E SUBTOTAL DO ITEM EM TEMPO REAL
// ================================
function atualizarPrecoUnitario() {
    const sel = document.getElementById('produto');
    const opt = sel.options[sel.selectedIndex];
    const preco = opt ? parseFloat(opt.dataset.preco) || 0 : 0;
    document.getElementById('precoUnitario').value = preco.toFixed(2);
    atualizarSubtotalItem();
}

function atualizarSubtotalItem() {
    const sel = document.getElementById('produto');
    const opt = sel.options[sel.selectedIndex];
    const preco = opt ? parseFloat(opt.dataset.preco) || 0 : 0;
    const qtd = parseFloat(document.getElementById('quantidade').value) || 0;
    const desc = parseFloat(document.getElementById('descontoItem').value) || 0;
    const subtotal = Math.max(0, qtd * preco * (1 - desc / 100));
    document.getElementById('subtotalItem').value = subtotal.toFixed(2);
}

// ================================
// CARRINHO — ADICIONAR ITEM
// ================================
function adicionarItemCarrinho() {
    const sel = document.getElementById('produto');
    const opt = sel.options[sel.selectedIndex];

    if (!sel.value) { exibirStatus({ status: 'error', mensagem: '⚠️ Selecione um produto.' }); return; }

    const quantidade = parseFloat(document.getElementById('quantidade').value);
    if (!quantidade || quantidade <= 0) { exibirStatus({ status: 'error', mensagem: '⚠️ Informe uma quantidade válida.' }); return; }

    const desconto = parseFloat(document.getElementById('descontoItem').value) || 0;
    const estoqueDisp = parseFloat(opt.dataset.estoque) || 0;
    const jaNoCarrinho = carrinho.filter(i => i.nome === sel.value).reduce((s, i) => s + i.quantidade, 0);

    if (quantidade + jaNoCarrinho > estoqueDisp) {
        exibirStatus({ status: 'error', mensagem: `❌ Estoque insuficiente! Disponível: ${estoqueDisp - jaNoCarrinho}` });
        return;
    }

    const preco = parseFloat(opt.dataset.preco) || 0;
    const subtotal = Math.max(0, quantidade * preco * (1 - desconto / 100));

    // Agrupa se mesmo produto e mesmo desconto
    const existente = carrinho.find(i => i.nome === sel.value && i.desconto === desconto);
    if (existente) {
        existente.quantidade += quantidade;
        existente.subtotal = Math.max(0, existente.quantidade * existente.preco * (1 - existente.desconto / 100));
    } else {
        carrinho.push({ nome: sel.value, preco, quantidade, desconto, subtotal });
    }

    // Limpa campos
    sel.value = '';
    document.getElementById('quantidade').value = '';
    document.getElementById('descontoItem').value = '0';
    document.getElementById('precoUnitario').value = '';
    document.getElementById('subtotalItem').value = '';

    renderizarCarrinho();
}

// ================================
// CARRINHO — RENDERIZAR
// ================================
function renderizarCarrinho() {
    const tbody = document.getElementById('carrinhoItens');
    tbody.innerHTML = '';

    if (carrinho.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="carrinho-vazio">Nenhum item adicionado ainda.</td></tr>';
        document.getElementById('totalCarrinho').textContent = 'R$ 0,00';
        document.getElementById('qtdItensLabel').textContent = '0 item(ns)';
        document.getElementById('btnFinalizar').disabled = true;
        return;
    }

    let totalGeral = 0;
    carrinho.forEach((item, idx) => {
        totalGeral += item.subtotal;
        const tr = document.createElement('tr');
        const descTxt = item.desconto > 0 ? `<span style="color:#ef4444; font-size:11px;"> (-${item.desconto}%)</span>` : '';
        tr.innerHTML = `
            <td>${item.nome}</td>
            <td style="text-align:center;">${item.quantidade}</td>
            <td>R$ ${item.preco.toFixed(2).replace('.', ',')}</td>
            <td>${item.desconto > 0 ? item.desconto + '%' : '-'}</td>
            <td><strong>R$ ${item.subtotal.toFixed(2).replace('.', ',')}</strong>${descTxt}</td>
            <td><button class="remove-item" onclick="removerItem(${idx})" title="Remover">✕</button></td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('totalCarrinho').textContent = `R$ ${totalGeral.toFixed(2).replace('.', ',')}`;
    document.getElementById('qtdItensLabel').textContent = `${carrinho.length} item(ns)`;
    document.getElementById('btnFinalizar').disabled = false;
}

function removerItem(idx) {
    carrinho.splice(idx, 1);
    renderizarCarrinho();
}

// ================================
// MODAL FINALIZAR VENDA
// ================================
function abrirModal() {
    formaPagamentoSelecionada = '';
    document.querySelectorAll('.pgto-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('descontoGeralModal').value = '0';
    atualizarModalTotais();
    document.getElementById('modalFinalizar').style.display = 'flex';
}

function fecharModal() {
    document.getElementById('modalFinalizar').style.display = 'none';
}

function atualizarModalTotais() {
    const subtotal = carrinho.reduce((s, i) => s + i.subtotal, 0);
    const desconto = parseFloat(document.getElementById('descontoGeralModal').value) || 0;
    const total = Math.max(0, subtotal - desconto);
    document.getElementById('modalSubtotal').textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    document.getElementById('modalDesconto').textContent = `- R$ ${desconto.toFixed(2).replace('.', ',')}`;
    document.getElementById('modalTotal').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

// ================================
// CONFIRMAR E ENVIAR VENDA
// ================================
async function confirmarVenda() {
    if (!formaPagamentoSelecionada) { alert('Selecione a forma de pagamento.'); return; }
    if (carrinho.length === 0) { fecharModal(); return; }

    const btn = document.getElementById('btnConfirmarVenda');
    btn.disabled = true;
    btn.textContent = 'Registrando...';

    const subtotalItens = carrinho.reduce((s, i) => s + i.subtotal, 0);
    const descontoGeral = parseFloat(document.getElementById('descontoGeralModal').value) || 0;
    const total = Math.max(0, subtotalItens - descontoGeral);
    const subtotalBruto = carrinho.reduce((s, i) => s + (i.quantidade * i.preco), 0);
    const descontoTotal = subtotalBruto - total;
    const qtdTotal = carrinho.reduce((s, i) => s + i.quantidade, 0);
    const itensStr = carrinho.map(i => {
        const d = i.desconto > 0 ? ` (-${i.desconto}%)` : '';
        return `${i.nome} (${i.quantidade}${d})`;
    }).join(', ');

    const cliente = document.getElementById('cliente').value || 'Consumidor Interno';

    const venda = {
        data: new Date().toLocaleDateString('pt-BR'),
        cliente: cliente,
        itens: itensStr,
        itensList: carrinho,
        quantidadeVendida: qtdTotal,
        subtotal: subtotalBruto,
        descontoPercentual: subtotalBruto > 0 ? ((descontoTotal / subtotalBruto) * 100).toFixed(2) : 0,
        descontoReal: descontoTotal,
        totalComDesconto: total,
        formaPagamento: formaPagamentoSelecionada,
        usuario: document.getElementById('usuario').value || 'Usuário Padrão'
    };

    try {
        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'lancarVenda', data: venda })
        });
        const data = await res.json();
        fecharModal();
        exibirStatus(data);
        if (data.status === 'sucesso') {
            carrinho = [];
            renderizarCarrinho();
            await carregarProdutos();
            await carregarHistoricoVendas();
        }
    } catch (e) {
        exibirStatus({ status: 'error', mensagem: 'Erro de comunicação: ' + e });
    } finally {
        btn.disabled = false;
        btn.textContent = '✅ Confirmar Venda';
    }
}

// ================================
// HISTÓRICO DE VENDAS — COM EXPANSÃO DE ITENS
// ================================
async function carregarHistoricoVendas() {
    const tbody = document.getElementById('listaHistorico');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1rem;color:#94a3b8;">Carregando...</td></tr>';
    try {
        const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'obterVendas' }) });
        const data = await res.json();

        if (data.status === 'sucesso' && data.dados.length > 0) {
            const vendas = data.dados.slice().reverse().slice(0, 30);
            tbody.innerHTML = '';

            vendas.forEach(v => {
                const id = v['ID da Venda'] || v.id || '';
                const data_v = formatarData(v.Data || v.data || '');
                // Cliente: tenta várias chaves possíveis
                const cliente = v.Cliente || v.cliente || v['Cliente'] || '-';
                const itens = v.Itens || v.itens || '';
                const pgto = v['Forma de Pagamento'] || v.formaPagamento || '-';
                const total = parseFloat(v['Total com Desconto'] || v.totalComDesconto || 0);

                // Detecta multi-item
                const isMulti = itens.includes(',');
                const itensDisplay = isMulti
                    ? itens.substring(0, 30) + '...'
                    : itens;
                const expandBtn = isMulti
                    ? `<button class="expand-btn" onclick="toggleItens(this)">▶ ver itens</button>
                       <div class="items-detail">${itens.split(', ').join('<br>')}</div>`
                    : '';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${id}</td>
                    <td>${data_v}</td>
                    <td>${cliente}</td>
                    <td>
                        <span>${itensDisplay}</span>
                        ${expandBtn}
                    </td>
                    <td>${pgto}</td>
                    <td><strong>R$ ${total.toFixed(2).replace('.', ',')}</strong></td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1rem;color:#94a3b8;">Nenhuma venda registrada.</td></tr>';
        }
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#ef4444;padding:1rem;">Erro ao carregar histórico.</td></tr>';
    }
}

function toggleItens(btn) {
    const detail = btn.nextElementSibling;
    const isOpen = detail.classList.toggle('open');
    btn.textContent = isOpen ? '▼ ocultar itens' : '▶ ver itens';
}

function formatarData(valor) {
    if (!valor) return '-';
    if (valor instanceof Date) return valor.toLocaleDateString('pt-BR');
    const str = String(valor);
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) return str.substring(0, 10);
    const d = new Date(str);
    return isNaN(d) ? str : d.toLocaleDateString('pt-BR');
}
