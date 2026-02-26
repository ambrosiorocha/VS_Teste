// Função 'include' para carregar arquivos CSS/JS no HTML
function include(filename) {
  // Divide o nome do ficheiro pela barra "/"
  var parts = filename.split('/');

  // Pega apenas a última parte (o nome do ficheiro real)
  var flattenedName = parts[parts.length - 1];

  // Carrega o ficheiro com o nome aplainado
  return HtmlService.createHtmlOutputFromFile(flattenedName)
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
      case 'obterClientes':
        result = { status: 'sucesso', dados: obterDadosGeral("Clientes") };
        break;
      case 'salvarCliente':
        result = salvarDadosGeral("Clientes", data);
        break;
      case 'excluirCliente':
        result = excluirDadosGeral("Clientes", data.id);
        break;
      case 'obterFornecedores':
        result = { status: 'sucesso', dados: obterDadosGeral("Fornecedores") };
        break;
      case 'salvarFornecedor':
        result = salvarDadosGeral("Fornecedores", data);
        break;
      case 'excluirFornecedor':
        result = excluirDadosGeral("Fornecedores", data.id);
        break;
      case 'obterFinanceiro':
        result = { status: 'sucesso', dados: obterDadosGeral("Financeiro") };
        break;
      case 'salvarFinanceiro':
        result = salvarDadosGeral("Financeiro", data);
        break;
      case 'excluirFinanceiro':
        result = excluirDadosGeral("Financeiro", data.id);
        break;
      case 'baixarLancamento':
        result = baixarLancamento(data.id);
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
  var sheetProdutos = ss.getSheetByName("Produtos");
  var sheetFinanceiro = ss.getSheetByName("Financeiro");

  if (!sheetVendas) {
    return { status: 'erro', mensagem: 'A planilha "Vendas" não foi encontrada.' };
  }

  // --- BAIXA DE ESTOQUE PARA MÚLTIPLOS ITENS ---
  var itensList = dados.itensList; // array [{nome, quantidade}]
  if (sheetProdutos && sheetProdutos.getLastRow() > 1 && itensList && itensList.length > 0) {
    var dadosProdutos = sheetProdutos.getDataRange().getValues();
    var headersProdutos = dadosProdutos[0];
    var colNome = headersProdutos.indexOf('Nome');
    var colQtd = headersProdutos.indexOf('Quantidade');

    if (colNome === -1 || colQtd === -1) {
      return { status: 'erro', mensagem: 'Colunas "Nome" ou "Quantidade" não encontradas na aba Produtos.' };
    }

    // Primeiro valida estoque de todos os itens
    for (var k = 0; k < itensList.length; k++) {
      var itemNome = String(itensList[k].nome).trim();
      var itemQtd = parseFloat(itensList[k].quantidade) || 0;
      var linhaItem = -1;
      for (var i = 1; i < dadosProdutos.length; i++) {
        if (String(dadosProdutos[i][colNome]).trim() === itemNome) {
          linhaItem = i;
          break;
        }
      }
      if (linhaItem === -1) {
        return { status: 'erro', mensagem: 'Produto "' + itemNome + '" não encontrado no estoque.' };
      }
      var estoqueAtual = parseFloat(dadosProdutos[linhaItem][colQtd]) || 0;
      if (estoqueAtual < itemQtd) {
        return { status: 'erro', mensagem: '❌ Estoque insuficiente para "' + itemNome + '"! Disponível: ' + estoqueAtual + ' | Solicitado: ' + itemQtd };
      }
    }

    // Depois subtrai estoque de todos
    for (var k = 0; k < itensList.length; k++) {
      var itemNome = String(itensList[k].nome).trim();
      var itemQtd = parseFloat(itensList[k].quantidade) || 0;
      for (var i = 1; i < dadosProdutos.length; i++) {
        if (String(dadosProdutos[i][colNome]).trim() === itemNome) {
          var novoEstoque = parseFloat(dadosProdutos[i][colQtd]) - itemQtd;
          sheetProdutos.getRange(i + 1, colQtd + 1).setValue(novoEstoque);
          dadosProdutos[i][colQtd] = novoEstoque; // atualiza cache local
          break;
        }
      }
    }
  }
  // --- FIM BAIXA DE ESTOQUE ---

  var ultimaLinha = sheetVendas.getLastRow();
  var ultimoId = (ultimaLinha > 1) ? sheetVendas.getRange(ultimaLinha, 1).getValue() : 0;
  var novoId = ultimoId + 1;

  // Registrar na aba Vendas (coluna Forma de Pagamento adicionada)
  sheetVendas.appendRow([
    novoId,
    dados.data,
    dados.cliente || 'Consumidor Interno',
    dados.itens,
    dados.quantidadeVendida,
    dados.subtotal,
    dados.descontoPercentual,
    dados.descontoReal,
    dados.totalComDesconto,
    dados.formaPagamento || '',  // col 10: Forma de Pagamento
    dados.usuario                // col 11: Usuário
  ]);

  // Automação Financeira
  if (sheetFinanceiro) {
    var ultimIdFin = sheetFinanceiro.getLastRow() > 1 ? sheetFinanceiro.getRange(sheetFinanceiro.getLastRow(), 1).getValue() : 0;
    sheetFinanceiro.appendRow([
      ultimIdFin + 1,
      'Venda #' + novoId + ' - ' + (dados.cliente || 'Consumidor'),
      dados.totalComDesconto,
      'Receber',
      dados.data,
      'Pendente',
      'Venda',
      novoId
    ]);
  }

  return { status: 'sucesso', mensagem: '✅ Venda #' + novoId + ' registrada com sucesso!' };
}

// Marca lançamento financeiro como Pago/Recebido
function baixarLancamento(id) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Financeiro');
  if (!sheet || sheet.getLastRow() < 2) {
    return { status: 'erro', mensagem: 'Planilha Financeiro não encontrada ou vazia.' };
  }
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var colId = headers.indexOf('id');
  var colStatus = headers.indexOf('status');
  if (colId === -1 || colStatus === -1) {
    return { status: 'erro', mensagem: 'Colunas id/status não encontradas na aba Financeiro.' };
  }
  var dados = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  for (var i = 0; i < dados.length; i++) {
    if (String(dados[i][colId]) === String(id)) {
      sheet.getRange(i + 2, colStatus + 1).setValue('Pago');
      return { status: 'sucesso', mensagem: 'Lançamento #' + id + ' baixado com sucesso!' };
    }
  }
  return { status: 'erro', mensagem: 'Lançamento #' + id + ' não encontrado.' };
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
      var val = row[i];
      // Converte objetos Date para string dd/mm/yyyy para evitar erro de serialização JSON
      if (val instanceof Date) {
        var d = val.getDate().toString().padStart(2,'0');
        var m = (val.getMonth()+1).toString().padStart(2,'0');
        var a = val.getFullYear();
        venda[header] = d + '/' + m + '/' + a;
      } else {
        venda[header] = val;
      }
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

function obterDadosGeral(nomePlanilha) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(nomePlanilha);
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var dados = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  return dados.map(function(row) {
    var obj = {};
    headers.forEach(function(header, i) {
      obj[header] = row[i];
    });
    return obj;
  });
}

function salvarDadosGeral(nomePlanilha, dados) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(nomePlanilha);
  if (!sheet) {
    return { status: 'erro', mensagem: `A planilha "${nomePlanilha}" não foi encontrada.` };
  }
  
  var id = dados.id;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rowValues = headers.map(header => {
    var val = dados[header];
    return val !== undefined ? val : "";
  });

  if (id) {
    var dataIds = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
    var rowIndex = dataIds.findIndex(function(row) { return row[0] == id; });
    if (rowIndex > -1) {
      sheet.getRange(rowIndex + 2, 1, 1, headers.length).setValues([rowValues]);
      return { status: 'sucesso', mensagem: `Registro atualizado com sucesso!` };
    }
    return { status: 'erro', mensagem: 'Registro não encontrado para atualização.' };
  } else {
    var lastRow = sheet.getLastRow();
    var nextId = lastRow > 1 ? sheet.getRange(lastRow, 1).getValue() + 1 : 1;
    rowValues[0] = nextId; // Assume primeira coluna é ID
    sheet.appendRow(rowValues);
    return { status: 'sucesso', mensagem: `Registro cadastrado com sucesso!` };
  }
}

function excluirDadosGeral(nomePlanilha, id) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(nomePlanilha);
  if (!sheet || sheet.getLastRow() < 2) {
    return { status: 'erro', mensagem: `A planilha "${nomePlanilha}" não foi encontrada ou está vazia.` };
  }
  var dadosIds = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  var linha = dadosIds.findIndex(function(row) { return row[0] == id; });
  if (linha > -1) {
    sheet.deleteRow(linha + 2);
    return { status: 'sucesso', mensagem: 'Registro excluído com sucesso!' };
  } else {
    return { status: 'erro', mensagem: 'Registro não encontrado para exclusão.' };
  }
}

function doGet(e) {
  var template = HtmlService.createTemplateFromFile('index.html');
  var html = template.evaluate()
      .setTitle("Sistema de Vendas")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  return html;
}
