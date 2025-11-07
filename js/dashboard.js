document.addEventListener('DOMContentLoaded', function() {
    if(SCRIPT_URL === '') {
        exibirStatus({ status: 'error', mensagem: 'Por favor, cole a URL do Apps Script no código.' });
        document.getElementById('loading').classList.add('hidden');
        return;
    }
    carregarDadosDashboard();
});

function exibirStatus(resposta) {
    var statusMessage = document.getElementById('statusMessage');
    statusMessage.textContent = resposta.mensagem;
    statusMessage.className = '';
    if (resposta.status) {
        statusMessage.classList.add(resposta.status);
    }
    statusMessage.style.display = 'block';
    setTimeout(function() {
        statusMessage.style.display = 'none';
    }, 5000);
}

async function carregarDadosDashboard() {
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'obterVendas' })
        });
        const data = await response.json();

        document.getElementById('loading').classList.add('hidden');
        document.getElementById('dashboard-content').classList.remove('hidden');

        if (data.status === 'sucesso' && data.dados.length > 0) {
            const vendas = data.dados;

            const totalVendas = vendas.reduce((acc, venda) => acc + (parseFloat(venda['Total com Desconto']) || 0), 0);
            const totalTransacoes = vendas.length;
            const ticketMedio = totalTransacoes > 0 ? totalVendas / totalTransacoes : 0;

            document.getElementById('totalVendas').textContent = `R$ ${totalVendas.toFixed(2).replace('.', ',')}`;
            document.getElementById('totalTransacoes').textContent = totalTransacoes;
            document.getElementById('ticketMedio').textContent = `R$ ${ticketMedio.toFixed(2).replace('.', ',')}`;
        } else {
            exibirStatus({ status: 'error', mensagem: 'Nenhuma venda encontrada.' });
        }
    } catch (error) {
        document.getElementById('loading').classList.add('hidden');
        exibirStatus({ status: 'error', mensagem: 'Erro ao carregar dados do dashboard: ' + error.message });
    }
}
