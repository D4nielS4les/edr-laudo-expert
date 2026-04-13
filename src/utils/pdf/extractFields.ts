/**
 * Extração de campos por varredura linha a linha de palavras-chave.
 * Suporta formatos: Ticket Log (Sou Log), Facchini, genérico.
 */
import { extractFirst, scanForKeyword, cleanField } from './helpers';

// --------------- OS ---------------
export function extractOrdemServico(text: string): string {
  const specific = extractFirst([
    /(?:Ordem\s*de\s*Serviço|O\.?S\.?|Nº\s*OS|N[°º]\s*OS|Numero\s*OS|Nr\.?\s*OS)[:\s]+(\d+)/i,
    /(?:Número\s*da\s*Ordem\s*de\s*Serviço)[:\s*]+(\d+)/i,
    /(?:OS)[:\s#]+(\d{4,})/i,
    /\bOS\s*[:# ]+(\d{4,})\b/i,
    /\bO\.S\.?\s*[:# ]+(\d+)/i,
    /(?:Orçamento|Orcamento)\s*(?:N[°º]?\s*)?[:\s#]+(\d+)/i,
    /(?:NÚMERO)[:\s]+(\d{5,})/i,
  ], text);
  if (specific) return specific;
  return scanForKeyword(text, ['Ordem de Serviço', 'O.S.', 'Nº OS', 'Numero OS', 'Orçamento', 'Orcamento']);
}

// --------------- DADOS OS ---------------
export function extractDadosOS(text: string) {
  const statusOS = scanForKeyword(text, ['Status', 'Situação', 'Situacao', 'Status OS']);
  const tipoManutencao = scanForKeyword(text, [
    'Tipo de Manutenção', 'Tipo Manutenção', 'Tipo Manutencao',
    'Tipo de Serviço', 'Tipo Serviço', 'Manutenção', 'Manutencao',
  ]);
  const dataEmissao = extractData(text, ['Data Emissão', 'Data Emissao', 'Data de Emissão', 'Emissão', 'Emitido em', 'Data de Cadastro', '1º Envio do Orçamento']);
  const dataPrevInicio = extractData(text, ['Previsão de Início', 'Previsão Início', 'Prev. Início', 'Previsao Inicio']);
  const dataPrevConclusao = extractData(text, ['Previsão de Conclusão', 'Previsão Conclusão', 'Prev. Conclusão', 'Previsao Conclusao', 'Validade do Orçamento']);
  const dataConclusao = extractData(text, ['Data Conclusão', 'Conclusão Serviço', 'Concluído em', 'Data Conclusao', 'Conclusão do Serviço']);

  return { statusOS, tipoManutencao, dataEmissao, dataPrevInicio, dataPrevConclusao, dataConclusao };
}

function extractData(text: string, keywords: string[]): string {
  const raw = scanForKeyword(text, keywords);
  if (!raw) return '';
  const m = raw.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const m2 = raw.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
  return raw;
}

// --------------- CLIENTE ---------------
export function extractCliente(text: string) {
  const solicitante = scanForKeyword(text, [
    'Solicitante', 'Usuário', 'Usuario', 'Solicitado por',
    'Requisitante', 'Contratante', 'Contato',
  ]);
  
  // Ticket Log uses "Cliente - XXXXXX:" format
  let empresa = '';
  const clienteTicket = text.match(/Cliente\s*[-–]\s*\d+:\s*(.+?)(?:\n|$)/i);
  if (clienteTicket) {
    empresa = cleanField(clienteTicket[1]);
  }
  if (!empresa) {
    empresa = scanForKeyword(text, [
      'Empresa', 'Razão Social', 'Razao Social',
      'Seguradora', 'Cia Seguradora', 'Cia. Seguradora',
    ]);
  }
  
  // Facchini uses "CLIENTE" column in header table
  if (!empresa) {
    const facchiniCliente = text.match(/CLIENTE[:\s]+(?:\d+\s*[-–]\s*)?(.+?)(?:\n|$)/i);
    if (facchiniCliente) empresa = cleanField(facchiniCliente[1]);
  }

  const clienteFinal = scanForKeyword(text, [
    'Cliente Final', 'Segurado', 'Proprietário', 'Proprietario',
    'Nome do Cliente', 'Titular', 'Beneficiário', 'Beneficiario',
  ]);
  const cpfCnpj = extractFirst([
    /(?:CPF\s*\/?\s*CNPJ|CPF|CNPJ)[:\s]*(\d{2,3}[\.\d\/-]+\d{2})/i,
    /(\d{3}\.\d{3}\.\d{3}-\d{2})/,
    /(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/,
  ], text);
  const agendamento = extractFirst([
    /(?:Número\s*do\s*Agendamento|Nº\s*Agendamento|Nr\s*Agendamento|Agendamento)[:\s]*(\d+)/i,
  ], text) || scanForKeyword(text, ['Agendamento', 'Nº Agendamento', 'Nr Agendamento']);
  const endereco = scanForKeyword(text, ['Endereço', 'Endereco', 'Logradouro', 'ENDEREÇO']);
  const bairro = scanForKeyword(text, ['Bairro', 'BAIRRO']);
  const cidade = extractCidadeUf(text);
  const cep = extractFirst([/(?:CEP)[:\s]*(\d{5}-?\d{3})/i, /\b(\d{5}-\d{3})\b/], text);
  const telefone = scanForKeyword(text, ['Telefone', 'Fone', 'Tel', 'Celular', 'FONE']);
  const email = extractFirst([
    /(?:E-?mail|Email|E-MAIL)[:\s]*([^\s,;]+@[^\s,;]+)/i,
    /\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,})\b/i,
  ], text);

  return { solicitante, empresa, clienteFinal, cpfCnpj: cpfCnpj || '', agendamento, endereco, bairro, cidade, cep, telefone, email };
}

// --------------- VEÍCULO ---------------
export function extractVeiculo(text: string) {
  const placa = extractFirst([
    /(?:Placa)[:\s]*([A-Z]{3}[\s-]?\d[A-Z0-9]\d{2})/i,
    /(?:PLACA)[:\s]*([A-Z]{3}\s*\d[A-Z0-9]\d{2})/i,
    /\b([A-Z]{3}[\s-]?\d[A-Z0-9]\d{2})\b/i,
  ], text);

  const chassi = extractFirst([
    /(?:Chassi|VIN|Chassis|Nº Chassi)[:\s]*([A-HJ-NPR-Z0-9]{17})/i,
    /\b([A-HJ-NPR-Z0-9]{17})\b/,
  ], text);

  // Ticket Log has "Modelo:" separately from marca
  let marcaModelo = scanForKeyword(text, [
    'Marca/Modelo', 'Marca / Modelo', 'Marca e Modelo',
    'Descrição do Veículo',
  ]);
  if (!marcaModelo) {
    // Try "Veículo: PLACA - MODELO" pattern (Ticket Log header)
    const veiculoHeader = text.match(/Veículo:\s*[A-Z0-9]+\s*[-–]\s*(.+?)(?:\n|$)/i);
    if (veiculoHeader) marcaModelo = cleanField(veiculoHeader[1]);
  }
  if (!marcaModelo) {
    marcaModelo = scanForKeyword(text, ['Modelo', 'Veículo', 'Veiculo', 'Marca', 'PRODUTO']);
  }

  // Quilometragem - handle "Quilometragem do Veículo: 99.574" format
  const hodometro = extractFirst([
    /(?:Quilometragem\s*(?:do\s*Veículo|Informada)?|Hodômetro|Hodometro|Km\s*Atual|Odômetro|Odometro)[:\s]*([\d.]+)/i,
  ], text) || scanForKeyword(text, ['Quilometragem', 'Hodômetro', 'Hodometro', 'KM', 'Km Atual']);

  let anoFabricacao = "";
  let anoModelo = "";
  const anoMatch = text.match(/(?:Ano\s*(?:Fab(?:ricação|ricacao)?)?(?:\s*\/?\s*Mod(?:elo)?)?|Ano\/Modelo|Ano Fab\.?\s*\/?\s*Mod\.?)[:\s]+(\d{4})(?:\s*\/\s*(\d{4}))?/i);
  if (anoMatch) {
    anoFabricacao = anoMatch[1];
    anoModelo = anoMatch[2] || anoMatch[1];
  } else {
    // Ticket Log just has "Ano: 2014"
    const anoSimples = text.match(/\bAno[:\s]+(\d{4})\b/i);
    if (anoSimples) {
      anoFabricacao = anoSimples[1];
      anoModelo = anoSimples[1];
    } else {
      anoFabricacao = scanForKeyword(text, ['Ano Fabricação', 'Ano Fabricacao', 'Ano Fab']);
      anoModelo = scanForKeyword(text, ['Ano Modelo', 'Ano Mod']);
      if (!anoModelo && anoFabricacao) anoModelo = anoFabricacao;
    }
  }

  // Facchini: "VEÍCULO" field may contain "CHASSI -ANO" e.g., "94BF1553NPR068436 -2022"
  if (!anoFabricacao) {
    const facchiniAno = text.match(/(?:VEÍCULO|VEICULO)[:\s]*[A-Z0-9]+\s*[-–]\s*(\d{4})/i);
    if (facchiniAno) {
      anoFabricacao = facchiniAno[1];
      anoModelo = facchiniAno[1];
    }
  }

  const motorizacao = scanForKeyword(text, ['Motorização', 'Motorizacao', 'Motor', 'Potência', 'Potencia', 'Cilindrada']);
  const cor = scanForKeyword(text, ['Cor', 'Cor do Veículo', 'Cor Predominante']);
  const combustivel = scanForKeyword(text, ['Combustível', 'Combustivel', 'Tipo Combustível']);

  return { marcaModelo, anoFabricacao, anoModelo, placa, chassi, hodometro, motorizacao, cor, combustivel };
}

// --------------- OFICINA ---------------
export function extractOficina(text: string) {
  // Ticket Log: "Estabelecimento" section at the top
  const isTicketLog = /Estabelecimento/i.test(text);
  
  let nome = '';
  let cnpj = '';
  let endereco = '';
  let bairro = '';
  let cidade = '';
  let telefone = '';
  let responsavel = '';

  if (isTicketLog) {
    // Ticket Log puts establishment data near the top
    // "Nome XXXXX" right after "Estabelecimento"
    const estabSection = text.match(/Estabelecimento([\s\S]*?)(?:Ordem de Serviço|$)/i);
    const sec = estabSection?.[1] ?? text;
    
    nome = scanForKeyword(sec, ['Nome']);
    cnpj = extractFirst([/(?:CNPJ)[:\s]*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i], sec)
      || extractFirst([/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/], sec);
    endereco = scanForKeyword(sec, ['Logradouro/Número', 'Logradouro', 'Endereço', 'Endereco']);
    bairro = scanForKeyword(sec, ['Bairro']);
    cidade = extractCidadeUf(sec);
    telefone = scanForKeyword(sec, ['Fones', 'Telefone', 'Fone', 'Tel']) 
      || extractFirst([/(?:Fones?|Tel\.?)[:\s]+([\d()\s\-\/]+)/i], sec);
    responsavel = scanForKeyword(text, ['Responsável pelo Orçamento', 'Responsável', 'Responsavel']);
  } else {
    // Facchini: header has company info directly
    // Try extracting from header lines
    const secMatch = text.match(/(?:Estabelecimento|Oficina|Prestador|Dados\s*(?:da\s*)?Oficina)([\s\S]*)$/i);
    const sec = secMatch?.[1] ?? text;
    
    nome = scanForKeyword(sec, [
      'Nome da Oficina', 'Nome Oficina', 'Oficina', 'Estabelecimento',
      'Prestador', 'Razão Social', 'Razao Social',
    ]) || scanForKeyword(text, ['Oficina', 'Estabelecimento', 'Prestador']);
    
    // Facchini: company name is on the first line (e.g., "FACCHINI")
    if (!nome) {
      const firstLine = text.split('\n').find(l => l.trim().length > 2);
      if (firstLine && firstLine.trim().length < 50 && /^[A-Z\s]+$/.test(firstLine.trim())) {
        nome = firstLine.trim();
      }
    }

    cnpj = extractFirst([
      /(?:CNPJ)[:\s]*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i,
      /(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/,
    ], sec) || extractFirst([/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/], text);

    endereco = scanForKeyword(sec, ['Logradouro', 'Endereço', 'Endereco', 'Rua', 'Avenida']);
    bairro = scanForKeyword(sec, ['Bairro']);
    cidade = extractCidadeUf(sec) || extractCidadeUf(text);
    telefone = scanForKeyword(sec, ['Telefone', 'Fone', 'Fones', 'Tel', 'Celular'])
      || extractFirst([/(?:Fones?|Telefone|Tel\.?)[:\s]+([\d()\s\-\/]+)/i], sec);
    responsavel = scanForKeyword(sec, [
      'Responsável pelo Orçamento', 'Responsável', 'Responsavel',
      'Resp. Técnico', 'Consultor',
    ]);
  }

  return { nome, cnpj, endereco, bairro, cidade, telefone, responsavel };
}

// --------------- RELATOS ---------------
export function extractRelatos(text: string) {
  const relatoMotorista = scanForKeywordMultiline(text, ['Relato do Motorista', 'Relato Motorista']);
  const relatoOficina = scanForKeywordMultiline(text, ['Relato da Oficina', 'Relato Oficina']);
  const relatoGestor = scanForKeywordMultiline(text, ['Relato do Gestor', 'Relato Gestor']);
  return { relatoMotorista, relatoOficina, relatoGestor };
}

/**
 * Similar to scanForKeyword but captures multiline content until the next keyword/section.
 */
function scanForKeywordMultiline(text: string, keywords: string[]): string {
  const lines = text.split('\n');
  
  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();
    
    for (let i = 0; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase();
      const idx = lineLower.indexOf(kwLower);
      if (idx === -1) continue;
      
      let after = lines[i].substring(idx + kw.length).trim();
      after = after.replace(/^[\s:=\-–]+/, '').trim();
      
      // Collect continuation lines
      let result = after;
      for (let j = i + 1; j < lines.length && j < i + 5; j++) {
        const nextLine = lines[j].trim();
        // Stop at next section/keyword
        if (!nextLine) break;
        if (/^(?:Relato|Transação|Registro|Nota Fiscal|Ordem|Status|Nome|CNPJ|Estabelecimento|Veículo)/i.test(nextLine)) break;
        result += ' ' + nextLine;
      }
      
      result = cleanField(result);
      if (result.length > 0) return result;
    }
  }
  return '';
}

function extractCidadeUf(source: string): string {
  const direto = scanForKeyword(source, ['Cidade/UF', 'Cidade / UF', 'Cidade']);
  if (direto) {
    const cidadeComUf = direto.match(/([A-ZÀ-Ú][a-zà-ú\s]+?)\s*[-–\/]\s*([A-Z]{2})/i);
    if (cidadeComUf) return `${cidadeComUf[1].trim()} - ${cidadeComUf[2]}`;
    return direto;
  }
  const generico = source.match(/\b([A-ZÀ-Ú][a-zà-ú\s]{2,})\s*[-–]\s*([A-Z]{2})\b/);
  if (generico) return `${generico[1].trim()} - ${generico[2]}`;
  return '';
}
