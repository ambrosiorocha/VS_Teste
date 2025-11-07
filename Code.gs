function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
      .getContent();
}

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxk0fSauvjEwhlq_DDRb21wHtH5qcFAs6j3XfJrHQlbW_d8qshOiEuX8lJfKQpHhZet/exec';
const planilhaprincipal = "1oT6-3k7-2Q1g-0A5B-CdEfGhIjKlMnOpQrStUvWxYz"; // Cole o ID da sua planilha aqui
const abaProdutos = "Produtos";
const abaVendas = "Vendas";

const sheetProdutos = SpreadsheetApp.openById(planilhaprincipal).getSheetByName(abaProdutos);
const sheetVendas = SpreadsheetApp.openById(planilhaprincipal).getSheetByName(abaVendas);

// Função principal para lidar com requisições POST
function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    let response;

    switch (requestData.action) {
      case 'salvarProduto':
        response = salvarProduto(requestData.data);
        break;
      case 'obterProdutos':
        response = obterProdutos();
        break;
      case 'obterProdutoPorId':
        response = obterProdutoPorId(requestData.data.id);
        break;
      case 'excluirProduto':
        response = excluirProduto(requestData.data.id);
        break;
      case 'lancarVenda':
        response = lancarVenda(requestData.data);
        break;
      case 'obterVendas':
        response = obterVendas();
        break;
      default:
        response = { status: 'error', mensagem: 'Ação não reconhecida.' };
    }

    return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', mensagem: 'Erro no servidor: ' + error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Funções CRUD para Produtos
function salvarProduto(produto) {
  const headers = sheetProdutos.getRange(1, 1, 1, sheetProdutos.getLastColumn()).getValues()[0];

  if (produto.idProduto) { // Editar produto existente
    const idColumnIndex = headers.indexOf("ID do Produto") + 1;
    const data = sheetProdutos.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][idColumnIndex - 1] == produto.idProduto) {
        const row = headers.map(header => produto[header] !== undefined ? produto[header] : data[i][headers.indexOf(header)]);
        sheetProdutos.getRange(i + 1, 1, 1, headers.length).setValues([row]);
        return { status: 'sucesso', mensagem: 'Produto atualizado com sucesso!' };
      }
    }
    return { status: 'error', mensagem: 'Produto não encontrado para atualização.' };
  } else { // Novo produto
    produto.idProduto = sheetProdutos.getLastRow();
    const newRow = headers.map(header => produto[header.toLowerCase().replace(/\s+/g, '')] || produto[header] || '');
    sheetProdutos.appendRow(newRow);
    return { status: 'sucesso', mensagem: 'Produto cadastrado com sucesso!' };
  }
}

function obterProdutos() {
  const data = sheetProdutos.getDataRange().getValues();
  const headers = data.shift();
  const produtos = data.map(row => {
    let produto = {};
    headers.forEach((header, index) => {
      produto[header] = row[index];
    });
    return produto;
  });
  return { status: 'sucesso', dados: produtos };
}

function obterProdutoPorId(id) {
    const data = sheetProdutos.getDataRange().getValues();
    const headers = data.shift();
    const idColumnIndex = headers.indexOf("ID do Produto");
    const produtoRow = data.find(row => row[idColumnIndex] == id);

    if (produtoRow) {
        let produto = {};
        headers.forEach((header, index) => {
            produto[header] = produtoRow[index];
        });
        return { status: 'sucesso', dados: produto };
    }
    return { status: 'error', mensagem: 'Produto não encontrado.' };
}

function excluirProduto(id) {
    const data = sheetProdutos.getDataRange().getValues();
    const idColumnIndex = data[0].indexOf("ID do Produto");
    for (let i = 1; i < data.length; i++) {
        if (data[i][idColumnIndex] == id) {
            sheetProdutos.deleteRow(i + 1);
            return { status: 'sucesso', mensagem: 'Produto excluído com sucesso!' };
        }
    }
    return { status: 'error', mensagem: 'Produto não encontrado para exclusão.' };
}

// Funções para Vendas
function lancarVenda(venda) {
  const headers = sheetVendas.getRange(1, 1, 1, sheetVendas.getLastColumn()).getValues()[0];
  const newRow = headers.map(header => venda[header.toLowerCase().replace(/\s+/g, '')] || venda[header] || '');
  sheetVendas.appendRow(newRow);
  return { status: 'sucesso', mensagem: 'Venda lançada com sucesso!' };
}

function obterVendas() {
  const data = sheetVendas.getDataRange().getValues();
  const headers = data.shift();
  const vendas = data.map(row => {
    let venda = {};
    headers.forEach((header, index) => {
      venda[header] = row[index];
    });
    return venda;
  });
  return { status: 'sucesso', dados: vendas };
}
