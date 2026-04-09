/**
 * Orquestrador: limpa texto e delega para extratores especializados.
 */
import { cleanRawText } from './helpers';
import { extractOrdemServico, extractDadosOS, extractCliente, extractVeiculo, extractOficina } from './extractFields';
import { extractItensOrcamento } from './extractItems';

export function parseOSData(text: string) {
  const cleanText = cleanRawText(text);

  console.log("[Parser] Texto limpo (3000 chars):", cleanText.substring(0, 3000));

  const ordemServico = extractOrdemServico(cleanText);
  const dadosOS = extractDadosOS(cleanText);
  const dadosCliente = extractCliente(cleanText);
  const dadosVeiculo = extractVeiculo(cleanText);
  const dadosOficina = extractOficina(cleanText);
  const itens = extractItensOrcamento(cleanText);

  console.log("[Parser] Resultado:", { ordemServico, dadosOS, dadosCliente, dadosVeiculo, dadosOficina, itensCount: itens.length });

  return {
    ordemServico,
    dadosOS,
    dadosCliente,
    dadosVeiculo,
    dadosOficina,
    itens
  };
}
