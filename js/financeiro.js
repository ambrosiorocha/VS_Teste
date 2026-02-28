let registrosFinanceiros = [];

document.addEventListener('DOMContentLoaded', function () {
    if (SCRIPT_URL === '') {
        exibirStatus({ status: 'error', mensagem: 'Configure a window.SCRIPT_URL no config.js.' });
        return;
    }
    document.getElementById('financeiroForm').addEventListener('submit', salvarFinanceiro);
    document.getElementById('filtroTipo').addEventListener('change', aplicarFiltros);
    carregarFinanceiro();
});

function exibirStatus(resposta) {
    var statusMessage = document.getElementById('statusMessage');
    statusMessage.textContent = resposta.mensagem;
    statusMessage.className = '';
    if (resposta.status) statusMessage.classList.add(resposta.status);
    statusMessage.style.display = 'block';
    setTimeout(() => statusMessage.style.display = 'none', 5000);
}

// ==================== FORMATAR DATA ====================
function formatarData(valor) {
    if (!valor) return '-';
    if (valor instanceof Date && !isNaN(valor)) return valor.toLocaleDateString('pt-BR');
    const str = String(valor).trim();
    // dd/mm/yyyy
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) return str.substring(0, 10);
    // ISO: 2026-02-26T...
    const d = new Date(str);
    if (!isNaN(d)) return d.toLocaleDateString('pt-BR');
    return str;
}

// ==================== SALVAR ====================
async function salvarFinanceiro(event) {
    event.preventDefault();
    const registro = {
        id: document.getElementById('idFinanceiro').value || null,
        descricao: document.getElementById('descricao').value,
        valor: parseFloat(document.getElementById('valor').value),
        tipo: document.getElementById('tipo').value,
        vencimento: document.getElementById('vencimento').value,
        status: document.getElementById('status').value,
        categoria: document.getElementById('categoria').value
    };
    try {
        const response = await fetch(window.SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'salvarFinanceiro', data: registro })
        });
        const data = await response.json();
        exibirStatus(data);
        if (data.status === 'sucesso') {
            document.getElementById('financeiroForm').reset();
            document.getElementById('idFinanceiro').value = '';
            await carregarFinanceiro();
        }
    } catch (error) {
        exibirStatus({ status: 'error', mensagem: 'Erro de comunicação: ' + error });
    }
}

// ==================== CARREGAR ====================
async function carregarFinanceiro() {
    const listaFinanceiro = document.getElementById('listaFinanceiro');
    listaFinanceiro.innerHTML = '<tr><td colspan="8" class="table-cell p-4 text-center">Carregando...</td></tr>';
    try {
        const response = await fetch(window.SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'obterFinanceiro' })
        });
        const data = await response.json();
        if (data.status === 'sucesso' && data.dados.length > 0) {
            registrosFinanceiros = data.dados;
            aplicarFiltros();
        } else {
            registrosFinanceiros = [];
            listaFinanceiro.innerHTML = '<tr><td colspan="8" class="table-cell p-4 text-center">Nenhum registro encontrado.</td></tr>';
            atualizarResumo([]);
        }
    } catch (error) {
        exibirStatus({ status: 'error', mensagem: 'Erro ao carregar dados: ' + error.message });
    }
}

// ==================== FILTROS ====================
function aplicarFiltros() {
    const filtroTipo = document.getElementById('filtroTipo').value;
    const dataInicio = document.getElementById('filtroDataInicio').value;
    const dataFim = document.getElementById('filtroDataFim').value;

    let filtrados = [...registrosFinanceiros];

    if (filtroTipo) {
        filtrados = filtrados.filter(r => r.tipo === filtroTipo);
    }
    if (dataInicio) {
        const inicio = new Date(dataInicio + 'T00:00:00');
        filtrados = filtrados.filter(r => {
            const d = parseDataVencimento(r.vencimento);
            return d && d >= inicio;
        });
    }
    if (dataFim) {
        const fim = new Date(dataFim + 'T23:59:59');
        filtrados = filtrados.filter(r => {
            const d = parseDataVencimento(r.vencimento);
            return d && d <= fim;
        });
    }

    renderizarTabela(filtrados);
    atualizarResumo(filtrados);
}

function limparFiltros() {
    document.getElementById('filtroDataInicio').value = '';
    document.getElementById('filtroDataFim').value = '';
    document.getElementById('filtroTipo').value = '';
    aplicarFiltros();
}

function parseDataVencimento(valor) {
    if (!valor) return null;
    if (valor instanceof Date) return valor;
    const str = String(valor).trim();
    // dd/mm/yyyy
    const matchBr = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (matchBr) return new Date(`${matchBr[3]}-${matchBr[2].padStart(2, '0')}-${matchBr[1].padStart(2, '0')}`);
    const d = new Date(str);
    return isNaN(d) ? null : d;
}

// ==================== RENDERIZAR ====================
function renderizarTabela(dados) {
    const listaFinanceiro = document.getElementById('listaFinanceiro');
    listaFinanceiro.innerHTML = '';

    if (dados.length === 0) {
        listaFinanceiro.innerHTML = '<tr><td colspan="8" class="table-cell p-4 text-center">Nenhum registro encontrado.</td></tr>';
        return;
    }

    const trClasses = "table-row";
    const tdClasses = "table-cell align-middle";

    dados.forEach(r => {
        const registroId = r.id || r.ID;
        const row = document.createElement('tr');
        row.className = trClasses;
        const isPago = r.status === 'Pago';
        const statusClass = isPago ? 'text-green-600 font-bold' : 'text-red-600 font-bold';
        const tipoClass = r.tipo === 'Receber' ? 'text-blue-600' : 'text-orange-600';
        const btnBaixar = isPago
            ? `<span style="color:#16a34a; font-size:0.78rem;">✅ Quitado</span>`
            : `<button class="edit-btn" style="background:#16a34a; color:white; font-size:0.75rem;" onclick="baixarLancamento(${registroId}, '${r.tipo}')">${r.tipo === 'Receber' ? '✅ Receber' : '✅ Pagar'}</button>`;

        row.innerHTML = `
            <td class="${tdClasses}">${registroId}</td>
            <td class="${tdClasses}">${r.descricao || ''}</td>
            <td class="${tdClasses} font-semibold">R$ ${parseFloat(r.valor || 0).toFixed(2).replace('.', ',')}</td>
            <td class="${tdClasses} ${tipoClass}">${r.tipo || ''}</td>
            <td class="${tdClasses}">${formatarData(r.vencimento)}</td>
            <td class="${tdClasses} ${statusClass}">${r.status || ''}</td>
            <td class="${tdClasses}">${r.categoria || ''}</td>
            <td class="${tdClasses}">
                <div class="action-buttons" style="display:flex; gap:0.35rem; flex-wrap:wrap;">
                    ${btnBaixar}
                    <button class="edit-btn" onclick="editarFinanceiro(${registroId})">Editar</button>
                    <button class="delete-btn" onclick="excluirFinanceiro(${registroId})">Excluir</button>
                </div>
            </td>
        `;
        listaFinanceiro.appendChild(row);
    });
}

// ==================== RESUMO KPIs ====================
function atualizarResumo(dados) {
    const totalPagar = dados.filter(r => r.tipo === 'Pagar' && r.status !== 'Pago').reduce((acc, r) => acc + parseFloat(r.valor || 0), 0);
    const totalReceber = dados.filter(r => r.tipo === 'Receber' && r.status !== 'Pago').reduce((acc, r) => acc + parseFloat(r.valor || 0), 0);
    const saldo = totalReceber - totalPagar;
    document.getElementById('totalPagar').textContent = `R$ ${totalPagar.toFixed(2).replace('.', ',')}`;
    document.getElementById('totalReceber').textContent = `R$ ${totalReceber.toFixed(2).replace('.', ',')}`;
    document.getElementById('saldoPendencias').textContent = `R$ ${saldo.toFixed(2).replace('.', ',')}`;
}

// ==================== BAIXAR LANÇAMENTO ====================
async function baixarLancamento(id, tipo) {
    const acao = tipo === 'Receber' ? 'recebido' : 'pago';
    if (!confirm(`Confirmar que o lançamento #${id} foi ${acao}?`)) return;
    try {
        const response = await fetch(window.SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'baixarLancamento', data: { id: id } })
        });
        const data = await response.json();
        exibirStatus(data);
        if (data.status === 'sucesso') await carregarFinanceiro();
    } catch (error) {
        exibirStatus({ status: 'error', mensagem: 'Erro: ' + error.message });
    }
}

// ==================== EDITAR / EXCLUIR ====================
function editarFinanceiro(id) {
    const r = registrosFinanceiros.find(item => (item.id || item.ID) == id);
    if (r) {
        document.getElementById('idFinanceiro').value = r.id || r.ID;
        document.getElementById('descricao').value = r.descricao || '';
        document.getElementById('valor').value = r.valor || '';
        document.getElementById('tipo').value = r.tipo || '';
        document.getElementById('vencimento').value = r.vencimento || '';
        document.getElementById('status').value = r.status || '';
        document.getElementById('categoria').value = r.categoria || '';
        exibirStatus({ status: 'success', mensagem: 'Registro carregado para edição.' });
    }
}

async function excluirFinanceiro(id) {
    if (confirm(`Excluir registro ID ${id}?`)) {
        try {
            const response = await fetch(window.SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'excluirFinanceiro', data: { id: id } })
            });
            const data = await response.json();
            exibirStatus(data);
            if (data.status === 'sucesso') await carregarFinanceiro();
        } catch (error) {
            exibirStatus({ status: 'error', mensagem: 'Erro ao excluir: ' + error.message });
        }
    }
}
