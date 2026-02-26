// ================================
// ESTADO GLOBAL DO CARRINHO
// ================================
let produtos = [];
let carrinho = []; // [{nome, preco, quantidade, subtotal}]
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
    document.getElementById('quantidade').addEventListener('input', atualizarPrecoUnitario);

    // Botões de forma de pagamento no modal
    document.querySelectorAll('.pgto-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.pgto-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            formaPagamentoSelecionada = this.dataset.pgto;
            atualizarModalTotais();
        });
    });

    // Desconto geral no modal recalcula total
    document.getElementById('descontoGeralModal').addEventListener('input', atualizarModalTotais);
});

// ================================
// STATUS
// ================================
function exibirStatus(resposta) {
    var statusMessage = document.getElementById('statusMessage');
    statusMessage.textContent = resposta.mensagem;
    statusMessage.className = '';
    if (resposta.status) statusMessage.classList.add(resposta.status);
    statusMessage.style.display = 'block';
    setTimeout(() => statusMessage.style.display = 'none', 6000);
}

// ================================
// CARREGAR PRODUTOS E CLIENTES
// ================================
async function carregarProdutos() {
    const produtoSelect = document.getElementById('produto');
    produtoSelect.innerHTML = '<option value="">Carregando...</option>';
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'obterProdutos' })
        });
        const data = await response.json();
        produtos = data.dados || [];
        produtoSelect.innerHTML = '<option value="">Selecione um produto</option>';
        if (produtos.length > 0) {
            produtos.forEach(p => {
                const estoque = parseFloat(p.Quantidade) || 0;
                const opt = document.createElement('option');
                opt.value = p.Nome;
                opt.textContent = `${p.Nome}  (Estoque: ${estoque})`;
                opt.dataset.preco = String(p['Preço'] || p.Preco || 0).replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
                opt.dataset.estoque = estoque;
                produtoSelect.appendChild(opt);
            });
        } else {
            produtoSelect.innerHTML = '<option value="">Nenhum produto cadastrado</option>';
        }
    } catch (e) {
        produtoSelect.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

async function carregarClientes() {
    const clienteSelect = document.getElementById('cliente');
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'obterClientes' })
        });
        const data = await response.json();
        clienteSelect.innerHTML = '<option value="Consumidor Interno">Consumidor Interno</option>';
        if (data.status === 'sucesso' && data.dados.length > 0) {
            data.dados.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.nome || c.Nome;
                opt.textContent = c.nome || c.Nome;
                clienteSelect.appendChild(opt);
            });
        }
    } catch (e) { /* mantém Consumidor Interno */ }
}

// ================================
// PREÇO UNITÁRIO EM TEMPO REAL
// ================================
function atualizarPrecoUnitario() {
    const produtoSelect = document.getElementById('produto');
    const selectedOpt = produtoSelect.options[produtoSelect.selectedIndex];
    const preco = selectedOpt ? parseFloat(selectedOpt.dataset.preco) || 0 : 0;
    document.getElementById('precoUnitario').value = preco.toFixed(2);
}

// ================================
// CARRINHO — ADICIONAR ITEM
// ================================
function adicionarItemCarrinho() {
    const produtoSelect = document.getElementById('produto');
    const selectedOpt = produtoSelect.options[produtoSelect.selectedIndex];
    const quantidadeInput = document.getElementById('quantidade');

    if (!produtoSelect.value) {
        exibirStatus({ status: 'error', mensagem: '⚠️ Selecione um produto.' });
        return;
    }
    const quantidade = parseFloat(quantidadeInput.value);
    if (!quantidade || quantidade <= 0) {
        exibirStatus({ status: 'error', mensagem: '⚠️ Informe uma quantidade válida.' });
        return;
    }
    const estoqueDisp = parseFloat(selectedOpt.dataset.estoque) || 0;
    // Verificar estoque contando itens já no carrinho
    const jaNoCarrinho = carrinho.filter(i => i.nome === produtoSelect.value).reduce((s, i) => s + i.quantidade, 0);
    if (quantidade + jaNoCarrinho > estoqueDisp) {
        exibirStatus({ status: 'error', mensagem: `❌ Estoque insuficiente! Disponível: ${estoqueDisp - jaNoCarrinho}` });
        return;
    }

    const preco = parseFloat(selectedOpt.dataset.preco) || 0;
    const subtotal = quantidade * preco;

    // Verificar se produto já está no carrinho → soma quantidade
    const itemExistente = carrinho.find(i => i.nome === produtoSelect.value);
    if (itemExistente) {
        itemExistente.quantidade += quantidade;
        itemExistente.subtotal = itemExistente.quantidade * itemExistente.preco;
    } else {
        carrinho.push({ nome: produtoSelect.value, preco, quantidade, subtotal });
    }

    // Limpa seleção
    produtoSelect.value = '';
    quantidadeInput.value = '';
    document.getElementById('precoUnitario').value = '';

    renderizarCarrinho();
}

// ================================
// CARRINHO — RENDERIZAR
// ================================
function renderizarCarrinho() {
    const tbody = document.getElementById('carrinhoItens');
    tbody.innerHTML = '';

    if (carrinho.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="carrinho-vazio">Nenhum item adicionado ainda.</td></tr>';
        document.getElementById('totalCarrinho').textContent = 'R$ 0,00';
        document.getElementById('qtdItensLabel').textContent = '0 item(ns)';
        document.getElementById('btnFinalizar').disabled = true;
        return;
    }

    let totalGeral = 0;
    carrinho.forEach((item, idx) => {
        totalGeral += item.subtotal;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.nome}</td>
            <td>${item.quantidade}</td>
            <td>R$ ${item.preco.toFixed(2).replace('.', ',')}</td>
            <td><strong>R$ ${item.subtotal.toFixed(2).replace('.', ',')}</strong></td>
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
    if (!formaPagamentoSelecionada) {
        alert('Selecione a forma de pagamento.');
        return;
    }
    if (carrinho.length === 0) {
        fecharModal();
        return;
    }

    const btn = document.getElementById('btnConfirmarVenda');
    btn.disabled = true;
    btn.textContent = 'Registrando...';

    const subtotal = carrinho.reduce((s, i) => s + i.subtotal, 0);
    const desconto = parseFloat(document.getElementById('descontoGeralModal').value) || 0;
    const total = Math.max(0, subtotal - desconto);

    // Monta string de itens para a planilha
    const itensStr = carrinho.map(i => `${i.nome} (${i.quantidade})`).join(', ');
    const qtdTotal = carrinho.reduce((s, i) => s + i.quantidade, 0);

    const venda = {
        data: new Date().toLocaleDateString('pt-BR'),
        cliente: document.getElementById('cliente').value || 'Consumidor Interno',
        itens: itensStr,
        itensList: carrinho, // array completo para baixa de estoque individual
        quantidadeVendida: qtdTotal,
        subtotal: subtotal,
        descontoPercentual: subtotal > 0 ? ((desconto / subtotal) * 100).toFixed(2) : 0,
        descontoReal: desconto,
        totalComDesconto: total,
        formaPagamento: formaPagamentoSelecionada,
        usuario: document.getElementById('usuario').value || 'Usuário Padrão'
    };

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'lancarVenda', data: venda })
        });
        const data = await response.json();
        fecharModal();
        exibirStatus(data);

        if (data.status === 'sucesso') {
            carrinho = [];
            renderizarCarrinho();
            await carregarProdutos(); // atualiza estoque
            await carregarHistoricoVendas();
        }
    } catch (error) {
        exibirStatus({ status: 'error', mensagem: 'Erro de comunicação: ' + error });
    } finally {
        btn.disabled = false;
        btn.textContent = '✅ Confirmar Venda';
    }
}

// ================================
// HISTÓRICO DE VENDAS
// ================================
async function carregarHistoricoVendas() {
    const tbody = document.getElementById('listaHistorico');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1rem;color:#94a3b8;">Carregando...</td></tr>';
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'obterVendas' })
        });
        const data = await response.json();
        if (data.status === 'sucesso' && data.dados.length > 0) {
            const vendas = data.dados.slice().reverse().slice(0, 20); // últimas 20
            tbody.innerHTML = '';
            vendas.forEach(v => {
                const tr = document.createElement('tr');
                const total = parseFloat(v['Total com Desconto'] || v['totalComDesconto'] || 0);
                tr.innerHTML = `
                    <td>${v['ID da Venda'] || v.id || ''}</td>
                    <td>${formatarData(v.Data || v.data)}</td>
                    <td>${v.Cliente || v.cliente || ''}</td>
                    <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${v.Itens || v.itens || ''}">${v.Itens || v.itens || ''}</td>
                    <td>${v['Forma de Pagamento'] || v.formaPagamento || '-'}</td>
                    <td><strong>R$ ${total.toFixed(2).replace('.', ',')}</strong></td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1rem;color:#94a3b8;">Nenhuma venda registrada.</td></tr>';
        }
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1rem;color:#ef4444;">Erro ao carregar histórico.</td></tr>';
    }
}

function formatarData(valor) {
    if (!valor) return '-';
    if (valor instanceof Date) return valor.toLocaleDateString('pt-BR');
    const str = String(valor);
    // Já está no formato dd/mm/yyyy
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) return str.substring(0, 10);
    // ISO ou timestamp
    const d = new Date(str);
    if (!isNaN(d)) return d.toLocaleDateString('pt-BR');
    return str;
}
