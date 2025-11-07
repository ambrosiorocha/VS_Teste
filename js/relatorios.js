document.addEventListener('DOMContentLoaded', function() {
    if(SCRIPT_URL === '') {
        exibirStatus({ status: 'error', mensagem: 'Por favor, cole a URL do Apps Script no código.' });
        document.getElementById('loading').classList.add('hidden');
        return;
    }
    carregarRelatorios();
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

async function carregarRelatorios() {
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'obterVendas' })
        });
        const data = await response.json();

        document.getElementById('loading').classList.add('hidden');
        document.getElementById('report-content').classList.remove('hidden');

        if (data.status === 'sucesso' && data.dados.length > 0) {
            const vendas = data.dados;
            renderizarKPIs(vendas);
            renderizarGraficoVendasPorMes(vendas);
            renderizarGraficoVendasPorProduto(vendas);
        } else {
            exibirStatus({ status: 'error', mensagem: 'Nenhuma venda encontrada para gerar relatórios.' });
        }
    } catch (error) {
        document.getElementById('loading').classList.add('hidden');
        exibirStatus({ status: 'error', mensagem: 'Erro ao carregar dados dos relatórios: ' + error.message });
    }
}

function renderizarKPIs(vendas) {
    const totalVendas = vendas.reduce((acc, venda) => acc + (parseFloat(venda['Total com Desconto']) || 0), 0);
    const totalTransacoes = vendas.length;
    const ticketMedio = totalTransacoes > 0 ? totalVendas / totalTransacoes : 0;

    document.getElementById('totalVendas').textContent = `R$ ${totalVendas.toFixed(2).replace('.', ',')}`;
    document.getElementById('totalTransacoes').textContent = totalTransacoes;
    document.getElementById('ticketMedio').textContent = `R$ ${ticketMedio.toFixed(2).replace('.', ',')}`;
}

function renderizarGraficoVendasPorMes(vendas) {
    const vendasPorMes = vendas.reduce((acc, venda) => {
        const dataSplit = venda.Data.split('/');
        const mesAno = `${dataSplit[1]}/${dataSplit[2]}`;
        acc[mesAno] = (acc[mesAno] || 0) + (parseFloat(venda['Total com Desconto']) || 0);
        return acc;
    }, {});

    const labels = Object.keys(vendasPorMes).sort();
    const dados = labels.map(mes => vendasPorMes[mes]);

    const ctx = document.getElementById('vendasPorMesChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Vendas Totais (R$)',
                data: dados,
                backgroundColor: 'rgba(52, 152, 219, 0.6)',
                borderColor: 'rgba(52, 152, 219, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function renderizarGraficoVendasPorProduto(vendas) {
    const vendasPorProduto = vendas.reduce((acc, venda) => {
        const produto = venda.Itens;
        acc[produto] = (acc[produto] || 0) + (parseFloat(venda['Total com Desconto']) || 0);
        return acc;
    }, {});

    const labels = Object.keys(vendasPorProduto);
    const dados = labels.map(produto => vendasPorProduto[produto]);

    const ctx = document.getElementById('vendasPorProdutoChart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                label: 'Vendas por Produto (R$)',
                data: dados,
                backgroundColor: [
                    '#3498db', '#9b59b6', '#e74c3c', '#2ecc71', '#f1c40f', '#1abc9c', '#95a5a6'
                ],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
        }
    });
}
