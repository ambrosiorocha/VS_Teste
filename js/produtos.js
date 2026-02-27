let produtos = []; // Array global para armazenar os produtos

document.addEventListener('DOMContentLoaded', function () {
    if (SCRIPT_URL === '') {
        exibirStatus({ status: 'error', mensagem: 'Por favor, cole a URL do Apps Script no código.' });
        return;
    }
    document.getElementById('produtoForm').addEventListener('submit', salvarProduto);

    // Adicionar listener para o campo de pesquisa
    document.getElementById('pesquisa').addEventListener('input', filtrarProdutos);

    carregarProdutos();
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

async function salvarProduto(event) {
    event.preventDefault();

    const produto = {
        idProduto: document.getElementById('idProduto').value || null,
        nome: document.getElementById('nome').value,
        unidadeVenda: document.getElementById('unidadeVenda').value,
        preco: parseFloat(document.getElementById('preco').value),
        quantidade: parseFloat(document.getElementById('quantidade').value),
        descricao: document.getElementById('descricao').value
    };

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'salvarProduto', data: produto })
        });

        const data = await response.json();
        exibirStatus(data);

        if (data.status === 'sucesso') {
            document.getElementById('produtoForm').reset();
            document.getElementById('idProduto').value = '';
            await carregarProdutos();
        }

    } catch (error) {
        exibirStatus({ status: 'error', mensagem: 'Erro de comunicação: ' + error });
    }
}

async function carregarProdutos() {
    const listaProdutos = document.getElementById('listaProdutos');
    // Adicionamos as classes de alinhamento e padding do Tailwind aqui
    listaProdutos.innerHTML = '<tr><td colspan="7" class="table-cell p-4 text-center">Carregando produtos...</td></tr>';

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'obterProdutos' })
        });
        const data = await response.json();

        if (data.status === 'sucesso' && data.dados.length > 0) {
            produtos = data.dados; // Armazena a lista completa
            renderizarTabela(produtos); // Renderiza a tabela
        } else {
            listaProdutos.innerHTML = '<tr><td colspan="7" class="table-cell p-4 text-center">Nenhum produto cadastrado.</td></tr>';
        }
    } catch (error) {
        // CORREÇÃO: Mostra o erro do toFixed (se for ele)
        exibirStatus({ status: 'error', mensagem: 'Erro ao carregar lista de produtos: ' + error.message });
        listaProdutos.innerHTML = '<tr><td colspan="7" class="table-cell p-4 text-center">Erro ao carregar produtos.</td></tr>';
    }
}


function renderizarTabela(produtosParaRenderizar) {
    const listaProdutos = document.getElementById('listaProdutos');
    listaProdutos.innerHTML = ''; // Limpa a tabela

    if (produtosParaRenderizar.length === 0) {
        listaProdutos.innerHTML = '<tr><td colspan="7" class="table-cell p-4 text-center">Nenhum produto encontrado.</td></tr>';
        return;
    }

    // CORREÇÃO 1: Classes de layout do Tailwind para "PARCERIA"
    const trClasses = "table-row"; // Define a linha como uma linha de tabela
    const tdClasses = "table-cell align-middle"; // Define a célula como uma célula de tabela

    produtosParaRenderizar.forEach(produto => {

        // CORREÇÃO 2: O erro 'toFixed'
        // Garante que 'produto.Preço' seja um número antes de formatar.
        const precoString = String(produto.Preço || 0);
        const precoLimpo = precoString.replace("R$", "").replace(/\./g, "").replace(",", ".").trim();
        const precoNum = parseFloat(precoLimpo);

        // Se 'precoNum' não for um número válido, define como 0
        const precoFinal = isNaN(precoNum) ? 0 : precoNum;
        // --- Fim da correção do toFixed ---


        const row = document.createElement('tr');

        // Adiciona a classe de linha do Tailwind
        row.className = trClasses;

        // O seu CSS (style.css) vai cuidar das bordas e padding
        // Este JS cuida do layout (table-cell)
        row.innerHTML = `
            <td class="${tdClasses}">${produto['ID do Produto']}</td>
            <td class="${tdClasses}">${produto.Nome}</td>
            <td class="${tdClasses}">${produto['Unidade de Venda']}</td>
            <td class="${tdClasses}">R$ ${precoFinal.toFixed(2).replace('.', ',')}</td>
            <td class="${tdClasses}">${produto.Quantidade}</td>
            <td class="${tdClasses}">${produto.Descrição || ''}</td>
            <td class="${tdClasses}">
                <div class="action-buttons">
                    <button class="edit-btn" onclick="editarProduto(${produto['ID do Produto']})">Editar</button>
                    <button class="delete-btn" data-admin-btn onclick="excluirProduto(${produto['ID do Produto']})">Excluir</button>
                </div>
            </td>
        `;
        listaProdutos.appendChild(row);
    });
    if (typeof Auth !== 'undefined') Auth.applyUI();
}

function filtrarProdutos() {
    const termoPesquisa = document.getElementById('pesquisa').value.toLowerCase();
    const produtosFiltrados = produtos.filter(produto => {
        return produto.Nome.toLowerCase().includes(termoPesquisa) ||
            produto['ID do Produto'].toString().includes(termoPesquisa);
    });
    renderizarTabela(produtosFiltrados);
}

async function editarProduto(id) {
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'obterProdutoPorId', data: { id: id } })
        });
        const data = await response.json();

        if (data.status === 'sucesso' && data.dados) {
            const produto = data.dados;
            document.getElementById('idProduto').value = produto['ID do Produto'];
            document.getElementById('nome').value = produto.Nome;
            document.getElementById('unidadeVenda').value = produto['Unidade de Venda'];

            // CORREÇÃO 2 (toFixed) também aplicada aqui
            const precoString = String(produto.Preço || 0);
            const precoLimpo = precoString.replace("R$", "").replace(/\./g, "").replace(",", ".").trim();
            const precoNum = parseFloat(precoLimpo);

            document.getElementById('preco').value = isNaN(precoNum) ? 0 : precoNum;
            document.getElementById('quantidade').value = produto.Quantidade;
            document.getElementById('descricao').value = produto.Descrição || '';
            exibirStatus({ status: 'success', mensagem: 'Campos preenchidos. Agora você pode editar.' });
        } else {
            exibirStatus({ status: 'error', mensagem: 'Produto não encontrado para edição.' });
        }
    } catch (error) {
        exibirStatus({ status: 'error', mensagem: 'Erro ao obter dados do produto: ' + error.message });
    }
}

async function excluirProduto(id) {
    if (confirm(`Tem certeza que deseja excluir o produto com ID ${id}?`)) {
        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'excluirProduto', data: { id: id } })
            });
            const data = await response.json();
            exibirStatus(data);
            if (data.status === 'sucesso') {
                await carregarProdutos(); // Recarrega a lista
            }
        } catch (error) {
            exibirStatus({ status: 'error', mensagem: 'Erro ao excluir o produto: ' + error.message });
        }
    }
}
