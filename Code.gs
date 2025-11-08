// Função 'include' para carregar arquivos CSS/JS no HTML
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
      .getContent();
}

// --- Conteúdo do antigo 'Código.js' ---

function doPost(e) {
  try {
    var requestData = JSON.parse(e.postData.contents);
    var action = requestData.action;
    var data = requestData.data;
    var result;

    switch (action) {
      case 'lancarVenda':
        result = lancarVenda(data);
        break;
      case 'obterProdutos':
        result = { status: 'sucesso', dados: obterProdutos() };
        break;
      case 'salvarProduto':
        result = salvarProduto(data);
        break;
      case 'excluirProduto':
        result = excluirProduto(data.id);
        break;
      case 'obterProdutoPorId':
        result = { status: 'sucesso', dados: obterProdutoPorId(data.id) };
        break;
      case 'obterProdutosUnicos':
        result = { status: 'sucesso', dados: obterProdutosUnicos() };
        break;
      case 'obterVendas':
        result = { status: 'sucesso', dados: obterVendas() };
        break;
      default:
        result = { status: 'erro', mensagem: 'Ação não reconhecida: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'erro', mensagem: 'Erro no servidor: ' + err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function lancarVenda(dados) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetVendas = ss.getSheetByName("Vendas");
  if (!sheetVendas) {
    return { status: 'erro', mensagem: 'A planilha "Vendas" não foi encontrada.' };
  }
  var ultimaLinha = sheetVendas.getLastRow();
  var ultimoId = (ultimaLinha > 1) ? sheetVendas.getRange(ultimaLinha, 1).getValue() : 0;
  var novoId = ultimoId + 1;
  
  sheetVendas.appendRow([
    novoId,
    dados.data,
    dados.itens,
    dados.quantidadeVendida,
    dados.subtotal,
    dados.descontoPercentual,
    dados.descontoReal,
    dados.totalComDesconto,
    dados.usuario,
  ]);
  
  return { status: 'sucesso', mensagem: `✅ Venda de ${dados.itens} registrada com sucesso!` };
}

function obterProdutos() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Produtos");
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var dados = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  var produtos = dados.map(function(row) {
    var produto = {};
    headers.forEach(function(header, i) {
      produto[header] = row[i];
    });
    return produto;
  });
  return produtos;
}

function obterProdutosUnicos() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetProdutos = ss.getSheetByName("Produtos");
  if (!sheetProdutos || sheetProdutos.getLastRow() < 2) {
    return [];
  }
  var dadosProdutos = sheetProdutos.getRange(2, 2, sheetProdutos.getLastRow() - 1, 1).getValues();
  var produtosUnicos = Array.from(new Set(dadosProdutos.flat()));
  return produtosUnicos.sort();
}

function obterProdutoPorId(id) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Produtos");
  if (!sheet || sheet.getLastRow() < 2) {
    return null;
  }
  var dados = sheet.getDataRange().getValues();
  var headers = dados.shift();
  var produto = dados.find(function(row) {
    return row[0] == id;
  });
  if (produto) {
    var obj = {};
    headers.forEach(function(header, i) {
      obj[header] = produto[i];
    });
    return obj;
  }
  return null;
}

function obterVendas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetVendas = ss.getSheetByName("Vendas");
  if (!sheetVendas || sheetVendas.getLastRow() < 2) {
    return [];
  }
  var headers = sheetVendas.getRange(1, 1, 1, sheetVendas.getLastColumn()).getValues()[0];
  var dados = sheetVendas.getRange(2, 1, sheetVendas.getLastRow() - 1, sheetVendas.getLastColumn()).getValues();
  var vendas = dados.map(function(row) {
    var venda = {};
    headers.forEach(function(header, i) {
      venda[header] = row[i];
    });
    return venda;
  });
  return vendas;
}

function salvarProduto(dados) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Produtos");
  if (!sheet) {
    return { status: 'erro', mensagem: 'A planilha "Produtos" não foi encontrada.' };
  }
  var idProduto = dados.idProduto;
  var valoresProduto = [
    dados.nome,
    dados.unidadeVenda,
    parseFloat(dados.preco),
    parseFloat(dados.quantidade),
    dados.descricao
  ];
  if (idProduto) {
    var dadosSheet = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
    var linha = dadosSheet.findIndex(function(row) { return row[0] == idProduto; });
    if (linha > -1) {
      var rowNum = linha + 2;
      sheet.getRange(rowNum, 2, 1, valoresProduto.length).setValues([valoresProduto]);
      return { status: 'sucesso', mensagem: `Produto "${dados.nome}" atualizado com sucesso!` };
    } else {
      return { status: 'erro', mensagem: 'Produto não encontrado para atualização.' };
    }
  } else {
    var ultimaLinha = sheet.getLastRow();
    var novoId = (ultimaLinha > 1) ? sheet.getRange(ultimaLinha, 1).getValue() + 1 : 1;
    sheet.appendRow([
      novoId,
      ...valoresProduto
    ]);
    return { status: 'sucesso', mensagem: `Produto "${dados.nome}" cadastrado com sucesso!` };
  }
}

function excluirProduto(id) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Produtos");
  if (!sheet || sheet.getLastRow() < 2) {
    return { status: 'erro', mensagem: 'A planilha "Produtos" não foi encontrada ou está vazia.' };
  }
  var dados = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  var linha = dados.findIndex(function(row) { return row[0] == id; });
  if (linha > -1) {
    sheet.deleteRow(linha + 2);
    return { status: 'sucesso', mensagem: 'Produto excluído com sucesso!' };
  } else {
    return { status: 'erro', mensagem: 'Produto não encontrado para exclusão.' };
  }
}

function doGet(e) {
  // Carrega o ficheiro index.html como a página principal.
  var html = HtmlService.createHtmlOutputFromFile('index.html')
      .setTitle("Sistema de Vendas")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  return html;
}