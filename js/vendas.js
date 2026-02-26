let produtos = [];

document.addEventListener('DOMContentLoaded', function () {
    if (SCRIPT_URL === '') {
        exibirStatus({ status: 'error', mensagem: 'Por favor, cole a URL do Apps Script no código.' });
        return;
    }

    carregarProdutos();
    carregarClientes();
    document.getElementById('vendaForm').addEventListener('submit', lancarVenda);

    // CMD 5: Event listeners para cálculos em tempo real
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
    setTimeout(function () {
        statusMessage.style.display = 'none';
    }, 5000);
}

async function lancarVenda(event) {
    event.preventDefault();

    // Desabilita botão para evitar duplo clique
    const btnSubmit = event.target.querySelector('button[type="submit"]');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Registrando...';
    }

    const venda = {
        data: new Date().toLocaleDateString('pt-BR'),
        cliente: document.getElementById('cliente').value,
        itens: document.getElementById('produto').value,
        quantidadeVendida: parseFloat(document.getElementById('quantidade').value),
        subtotal: parseFloat(document.getElementById('subtotal').value),
        descontoPercentual: parseFloat(document.getElementById('descontoPercentual').value) || 0,
        descontoReal: parseFloat(document.getElementById('descontoReal').value) || 0,
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
            atualizarCampos(); // Limpa os campos calculados
            await carregarProdutos(); // Recarrega para refletir novo estoque
        }
    } catch (error) {
        exibirStatus({ status: 'error', mensagem: 'Erro de comunicação: ' + error });
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Registrar Venda';
        }
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

        produtos = data.dados || [];
        produtoSelect.innerHTML = '<option value="">Selecione um produto</option>';
        if (data.status === 'sucesso' && produtos.length > 0) {
            produtos.forEach(produto => {
                const option = document.createElement('option');
                option.value = produto.Nome;
                option.textContent = `${produto.Nome} (Estoque: ${produto.Quantidade || 0})`;
                option.dataset.preco = produto['Preço'] || produto.Preco || 0;
                option.dataset.estoque = produto.Quantidade || 0;
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

/**
 * CMD 5: Atualiza subtotal, desconto e total em tempo real
 * conforme o usuário altera quantidade, produto ou desconto.
 */
function atualizarCampos(origem) {
    const produtoSelect = document.getElementById('produto');
    const quantidadeInput = document.getElementById('quantidade');
    const precoUnitarioInput = document.getElementById('precoUnitario');
    const subtotalInput = document.getElementById('subtotal');
    const descontoPercentualInput = document.getElementById('descontoPercentual');
    const descontoRealInput = document.getElementById('descontoReal');
    const totalComDescontoInput = document.getElementById('totalComDesconto');

    // Busca preço na lista de produtos
    const produtoSelecionado = produtos.find(p => p.Nome === produtoSelect.value);
    const quantidade = parseFloat(quantidadeInput.value) || 0;

    // Converte preço (pode vir como "R$ 9,50" ou número)
    let precoUnitario = 0;
    if (produtoSelecionado) {
        const precoRaw = String(produtoSelecionado['Preço'] || produtoSelecionado.Preco || 0);
        const precoLimpo = precoRaw.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
        precoUnitario = parseFloat(precoLimpo) || 0;
    }

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
            descontoPercentualInput.value = '0.00';
        }
    }

    const totalComDesconto = subtotal - descontoReal;
    totalComDescontoInput.value = totalComDesconto.toFixed(2);
}

async function carregarClientes() {
    const clienteSelect = document.getElementById('cliente');
    clienteSelect.innerHTML = '<option value="">Carregando...</option>';
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'obterClientes' })
        });
        const data = await response.json();
        if (data.status === 'sucesso' && data.dados.length > 0) {
            clienteSelect.innerHTML = '<option value="">Selecione um cliente</option>';
            clienteSelect.innerHTML += '<option value="Consumidor Interno">Consumidor Interno</option>';
            data.dados.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.nome || c.Nome;
                opt.textContent = c.nome || c.Nome;
                clienteSelect.appendChild(opt);
            });
        } else {
            clienteSelect.innerHTML = '<option value="Consumidor Interno">Consumidor Interno</option>';
        }
    } catch (e) {
        clienteSelect.innerHTML = '<option value="Consumidor Interno">Consumidor Interno</option>';
    }
}
