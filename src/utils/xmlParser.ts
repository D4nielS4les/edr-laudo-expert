/**
 * Parser de orçamento em XML -> estruturas do laudo.
 * Não altera o fluxo de importação por PDF.
 */
import type { DadosCliente, DadosVeiculo, DadosOS, ItemOrcamento } from "@/types/laudo";
import { ordenarPecasPrimeiro } from "@/utils/itemTipo";

export interface OrcamentoXMLTotais {
  valorLiquidoPecas: number;
  valorLiquidoMaoObra: number;
  valorTotalLiquidoGeral: number;
}

export interface OrcamentoXMLResult {
  ordemServico: string;
  dadosCliente: Partial<DadosCliente>;
  dadosVeiculo: Partial<DadosVeiculo>;
  dadosOS: Partial<DadosOS>;
  itens: ItemOrcamento[];
  totais: OrcamentoXMLTotais;
  relatos: { relatoOficina: string; relatoMotorista: string };
}

const child = (el: Element | null, tag: string): Element | null =>
  el ? el.querySelector(`:scope > ${tag}`) : null;

const txt = (el: Element | null, tag: string): string =>
  (child(el, tag)?.textContent ?? "").trim();

const num = (raw: string): number => {
  const s = raw.trim();
  if (!s) return 0;
  const normalized = s.includes(",")
    ? s.replace(/\./g, "").replace(",", ".")
    : s;
  const v = parseFloat(normalized.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(v) ? v : 0;
};

const numOf = (el: Element | null, tag: string): number => num(txt(el, tag));

const boolOf = (el: Element | null, tag: string): boolean =>
  /^(true|1|sim)$/i.test(txt(el, tag));

/** "dd/MM/yyyy HH:mm" -> "yyyy-MM-dd" */
const toISODate = (raw: string): string => {
  const m = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const iso = raw.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1] : "";
};

function parseVeiculo(veiculo: Element | null): Partial<DadosVeiculo> {
  const marca = txt(veiculo, "marca");
  const nome = txt(veiculo, "nome_veiculo");
  const marcaModelo = [marca, nome].filter(Boolean).join(" ").trim();

  const anos = nome.match(/\b(19|20)\d{2}\b/g) ?? [];
  const ano = anos.length ? anos[anos.length - 1] : "";
  const motor = nome.match(/\d\.\d/);
  const comb = nome.match(/FLEX|GASOLINA|DIESEL|ETANOL|EL[ÉE]TRICO|H[ÍI]BRIDO/i);

  return {
    marcaModelo,
    placa: txt(veiculo, "placa"),
    chassi: txt(veiculo, "chassi"),
    cor: txt(veiculo, "cor"),
    hodometro: txt(veiculo, "quilometragem"),
    anoModelo: ano,
    anoFabricacao: ano,
    motorizacao: motor ? motor[0] : "",
    combustivel: comb ? comb[0].toUpperCase() : "",
  };
}

function parseCliente(cliente: Element | null): Partial<DadosCliente> {
  const nome = txt(cliente, "nome");
  const ddd = txt(cliente, "ddd");
  const tel = txt(cliente, "telefone");
  const logradouro = txt(cliente, "logradouro");
  const numero = txt(cliente, "numero");
  const cidade = txt(cliente, "cidade");
  const uf = txt(cliente, "uf");

  return {
    empresa: nome,
    clienteFinal: nome,
    cpfCnpj: txt(cliente, "cnpj") || txt(cliente, "cpf"),
    email: txt(cliente, "email"),
    telefone: ddd ? `(${ddd}) ${tel}`.trim() : tel,
    endereco: [logradouro, numero].filter(Boolean).join(", "),
    bairro: txt(cliente, "bairro"),
    cidade: [cidade, uf].filter(Boolean).join(" - "),
    cep: txt(cliente, "cep"),
  };
}

interface ValoresHora { removInst: number; reparacao: number; pintura: number }

function parseValoresHora(root: Element, veiculo: Element | null): ValoresHora {
  const padrao = child(root, "padrao_mao_de_obra");
  const removInst = numOf(padrao, "valor_hora_mao_de_obra");
  const reparacao = numOf(padrao, "valor_hora_reparacao") || removInst;
  const tricoat = /tricoat/i.test(txt(veiculo, "tipo_pintura"));
  const pinturaTag = tricoat ? "valor_hora_pintura_tricoat" : "valor_hora_pintura";
  const pintura = numOf(padrao, pinturaTag) || numOf(padrao, "valor_hora_pintura") || removInst;
  return { removInst, reparacao, pintura };
}

function parseItens(root: Element, vh: ValoresHora): ItemOrcamento[] {
  const container = child(root, "itens_orcamento");
  const nodes = container ? Array.from(container.querySelectorAll(":scope > item")) : [];

  const itens = nodes.map<ItemOrcamento>((n) => {
    const quantidade = numOf(n, "quantidade") || 1;
    const precoLiquido = numOf(n, "preco_liquido") || numOf(n, "preco");
    const troca = boolOf(n, "troca");

    const hRI = numOf(n, "hora_remocao_instalacao");
    const hRep = numOf(n, "hora_reparacao");
    const hPin = numOf(n, "hora_pintura");
    const horas = hRI + hRep + hPin;

    // Um mesmo item pode ter peça (troca) E mão de obra (horas) simultaneamente.
    let valorPeca = 0;
    let qtdPeca = 0;
    let valorMaoObra = 0;
    let qtdMaoObra = 0;
    const acoes: string[] = [];

    if (troca) {
      qtdPeca = quantidade;
      valorPeca = precoLiquido;
      acoes.push("Troca");
    }

    if (horas > 0) {
      qtdMaoObra = horas;
      valorMaoObra = hRI * vh.removInst + hRep * vh.reparacao + hPin * vh.pintura;
      if (hRI > 0) acoes.push("Rem-Inst");
      if (hRep > 0) acoes.push("Reparação");
      if (hPin > 0) acoes.push("Pintura");
    } else if (!troca) {
      // Serviço avulso (inclusão manual) — apenas preço
      qtdMaoObra = quantidade;
      valorMaoObra = precoLiquido * quantidade;
      acoes.push("Serviço");
    }

    return {
      id: crypto.randomUUID(),
      codigo: txt(n, "codigo") || txt(n, "codigo_peca"),
      grupo: txt(n, "tipo_remocao_instalacao") || txt(n, "tipo_item"),
      descricao: txt(n, "descricao") || txt(n, "nome"),
      acao: acoes.join(" / "),
      statusItem: txt(n, "tipo"),
      tipo: troca ? 'peca' : 'mao_obra',
      qtdPeca,
      valorPeca,
      qtdMaoObra,
      valorMaoObra,
      valorTotal: valorPeca + valorMaoObra,
      impostos: { ipi: 0, icms: 0 },
      justificativa: "",
      status: 'pendente',
      statusMaoObra: 'pendente',
      fotos: [],
    };
  });

  return ordenarPecasPrimeiro(itens);
}

export function parseOrcamentoXML(xmlString: string): OrcamentoXMLResult {
  const doc = new DOMParser().parseFromString(xmlString, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("XML inválido: não foi possível interpretar o arquivo.");
  }
  const root = doc.querySelector("orcamento");
  if (!root) throw new Error("XML inválido: elemento raiz <orcamento> não encontrado.");

  const cliente = child(root, "cliente");
  const veiculo = child(root, "veiculo");
  const totais = child(root, "total_do_orcamento");
  const vh = parseValoresHora(root, veiculo);

  return {
    ordemServico: txt(root, "numero_orcamento"),
    dadosCliente: parseCliente(cliente),
    dadosVeiculo: parseVeiculo(veiculo),
    dadosOS: {
      statusOS: txt(root, "status"),
      dataEmissao: toISODate(txt(root, "data_criacao_orcamento")),
    },
    itens: parseItens(root, vh),
    totais: {
      valorLiquidoPecas: numOf(totais, "valor_liquido_pecas"),
      valorLiquidoMaoObra: numOf(totais, "valor_liquido_mao_de_obra"),
      valorTotalLiquidoGeral:
        numOf(totais, "valor_total_liquido_geral") || numOf(totais, "valor_total_geral"),
    },
    relatos: {
      relatoOficina: txt(root, "notas_oficina"),
      relatoMotorista: txt(child(root, "conclusao"), "descricao"),
    },
  };
}
