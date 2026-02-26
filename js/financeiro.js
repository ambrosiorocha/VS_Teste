let registrosFinanceiros = [];

document.addEventListener('DOMContentLoaded', function () {
    if (SCRIPT_URL === '') {
        exibirStatus({ status: 'error', mensagem: 'Por favor, cole a URL do Apps Script no código.' });
        return;
    }
    document.getElementById('financeiroForm').addEventListener('submit', salvarFinanceiro);
    document.getElementById('filtroTipo').addEventListener('change', carregarFinanceiro);

    carregarFinanceiro();
});

function exibirStatus(resposta) {
    var statusMessage = document.getElementById('statusMessage');
    statusMessage.textContent = resposta.mensagem;
    statusMessage.className = '';
    if (resposta.status) {
        statusMessage.classList.add(resposta.status);
    }
    statusMessage.style.display = 'block';
    setTimeout(function () {
        statusMessage.style.display = 'none';
    }, 5000);
}

async function salvarFinanceiro(event) {
    event.preventDefault();

    // Chaves alinhadas com os cabeçalhos da planilha Financeiro (minúsculas, sem acentos)
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
        const response = await fetch(SCRIPT_URL, {
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

async function carregarFinanceiro() {
    const listaFinanceiro = document.getElementById('listaFinanceiro');
    listaFinanceiro.innerHTML = '<tr><td colspan="8" class="table-cell p-4 text-center">Carregando dados financeiros...</td></tr>';

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'obterFinanceiro' })
        });
        const data = await response.json();

        if (data.status === 'sucesso' && data.dados.length > 0) {
            registrosFinanceiros = data.dados;
            const filtroTipo = document.getElementById('filtroTipo').value;
            const filtrados = filtroTipo
                ? registrosFinanceiros.filter(r => r.tipo === filtroTipo)
                : registrosFinanceiros;
            renderizarTabela(filtrados);
            atualizarResumo(filtrados);
        } else {
            listaFinanceiro.innerHTML = '<tr><td colspan="8" class="table-cell p-4 text-center">Nenhum registro encontrado.</td></tr>';
            atualizarResumo([]);
        }
    } catch (error) {
        exibirStatus({ status: 'error', mensagem: 'Erro ao carregar dados: ' + error.message });
        listaFinanceiro.innerHTML = '<tr><td colspan="8" class="table-cell p-4 text-center">Erro ao carregar dados.</td></tr>';
    }
}

function renderizarTabela(dados) {
    const listaFinanceiro = document.getElementById('listaFinanceiro');
    listaFinanceiro.innerHTML = '';

    const trClasses = "table-row";
    const tdClasses = "table-cell align-middle";

    dados.forEach(r => {
        const registroId = r.id || r.ID;
        const row = document.createElement('tr');
        row.className = trClasses;
        const statusClass = r.status === 'Pago' ? 'text-green-600 font-bold' : 'text-red-600 font-bold';
        const tipoClass = r.tipo === 'Receber' ? 'text-blue-600' : 'text-orange-600';

        row.innerHTML = `
            <td class="${tdClasses}">${registroId}</td>
            <td class="${tdClasses}">${r.descricao || ''}</td>
            <td class="${tdClasses} font-semibold">R$ ${parseFloat(r.valor || 0).toFixed(2).replace('.', ',')}</td>
            <td class="${tdClasses} ${tipoClass}">${r.tipo || ''}</td>
            <td class="${tdClasses}">${r.vencimento || ''}</td>
            <td class="${tdClasses} ${statusClass}">${r.status || ''}</td>
            <td class="${tdClasses}">${r.categoria || ''}</td>
            <td class="${tdClasses}">
                <div class="action-buttons">
                    <button class="edit-btn" onclick="editarFinanceiro(${registroId})">Editar</button>
                    <button class="delete-btn" onclick="excluirFinanceiro(${registroId})">Excluir</button>
                </div>
            </td>
        `;
        listaFinanceiro.appendChild(row);
    });
}

function atualizarResumo(dados) {
    const totalPagar = dados
        .filter(r => r.tipo === 'Pagar' && r.status !== 'Pago')
        .reduce((acc, r) => acc + parseFloat(r.valor || 0), 0);
    const totalReceber = dados
        .filter(r => r.tipo === 'Receber' && r.status !== 'Pago')
        .reduce((acc, r) => acc + parseFloat(r.valor || 0), 0);
    const saldo = totalReceber - totalPagar;

    document.getElementById('totalPagar').textContent = `R$ ${totalPagar.toFixed(2).replace('.', ',')}`;
    document.getElementById('totalReceber').textContent = `R$ ${totalReceber.toFixed(2).replace('.', ',')}`;
    document.getElementById('saldoPendencias').textContent = `R$ ${saldo.toFixed(2).replace('.', ',')}`;
}

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
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'excluirFinanceiro', data: { id: id } })
            });
            const data = await response.json();
            exibirStatus(data);
            if (data.status === 'sucesso') {
                await carregarFinanceiro();
            }
        } catch (error) {
            exibirStatus({ status: 'error', mensagem: 'Erro ao excluir: ' + error.message });
        }
    }
}
