let produtos = [];

document.addEventListener('DOMContentLoaded', function() {
    if(SCRIPT_URL === '') {
        exibirStatus({ status: 'error', mensagem: 'Por favor, cole a URL do Apps Script no código.' });
        return;
    }

    carregarProdutos();
    document.getElementById('vendaForm').addEventListener('submit', lancarVenda);
    document.getElementById('produto').addEventListener('change', atualizarCampos);
    document.getElementById('quantidade').addEventListener('input', atualizarCampos);
    document.getElementById('descontoPercentual').addEventListener('input', () => atualizarCampos('percentual'));
    document.getElementById('descontoReal').addEventListener('input', () => atualizarCampos('real'));
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

async function lancarVenda(event) {
    event.preventDefault();

    const venda = {
        data: new Date().toLocaleDateString(),
        itens: document.getElementById('produto').value,
        quantidadeVendida: parseFloat(document.getElementById('quantidade').value),
        subtotal: parseFloat(document.getElementById('subtotal').value),
        descontoPercentual: parseFloat(document.getElementById('descontoPercentual').value),
        descontoReal: parseFloat(document.getElementById('descontoReal').value),
        totalComDesconto: parseFloat(document.getElementById('totalComDesconto').value),
        usuario: document.getElementById('usuario').value
    };

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'lancarVenda', data: venda })
        });

        const data = await response.json();
        exibirStatus(data);
        if (data.status === 'sucesso') {
            document.getElementById('vendaForm').reset();
            atualizarCampos();
        }
    } catch (error) {
        exibirStatus({ status: 'error', mensagem: 'Erro de comunicação: ' + error });
    }
}

async function carregarProdutos() {
    const produtoSelect = document.getElementById('produto');
    produtoSelect.innerHTML = '<option value="">Carregando produtos...</option>';

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'obterProdutos' })
        });
        const data = await response.json();

        produtos = data.dados;
        produtoSelect.innerHTML = '<option value="">Selecione um produto</option>';
        if (data.status === 'sucesso' && produtos.length > 0) {
            produtos.forEach(produto => {
                const option = document.createElement('option');
                option.value = produto.Nome;
                option.textContent = produto.Nome;
                option.dataset.preco = produto.Preço;
                produtoSelect.appendChild(option);
            });
        } else {
            produtoSelect.innerHTML = '<option value="">Nenhum produto encontrado</option>';
            exibirStatus({ status: 'error', mensagem: 'Nenhum produto encontrado. Cadastre um produto primeiro.' });
        }
    } catch (error) {
        exibirStatus({ status: 'error', mensagem: 'Erro ao carregar produtos: ' + error.message });
        produtoSelect.innerHTML = '<option value="">Erro ao carregar produtos</option>';
    }
}

function atualizarCampos(origem) {
    const produtoSelect = document.getElementById('produto');
    const quantidadeInput = document.getElementById('quantidade');
    const precoUnitarioInput = document.getElementById('precoUnitario');
    const subtotalInput = document.getElementById('subtotal');
    const descontoPercentualInput = document.getElementById('descontoPercentual');
    const descontoRealInput = document.getElementById('descontoReal');
    const totalComDescontoInput = document.getElementById('totalComDesconto');

    const produtoSelecionado = produtos.find(p => p.Nome === produtoSelect.value);
    const quantidade = parseFloat(quantidadeInput.value) || 0;
    const precoUnitario = produtoSelecionado ? produtoSelecionado.Preço : 0;

    precoUnitarioInput.value = precoUnitario.toFixed(2);

    const subtotal = quantidade * precoUnitario;
    subtotalInput.value = subtotal.toFixed(2);

    let descontoPercentual = parseFloat(descontoPercentualInput.value) || 0;
    let descontoReal = parseFloat(descontoRealInput.value) || 0;

    if (origem === 'percentual') {
        descontoReal = subtotal * (descontoPercentual / 100);
        descontoRealInput.value = descontoReal.toFixed(2);
    } else if (origem === 'real') {
        if (subtotal > 0) {
            descontoPercentual = (descontoReal / subtotal) * 100;
            descontoPercentualInput.value = descontoPercentual.toFixed(2);
        } else {
            descontoPercentualInput.value = 0;
        }
    }

    const totalComDesconto = subtotal - descontoReal;
    totalComDescontoInput.value = totalComDesconto.toFixed(2);
}
