import { jsPDF } from 'jspdf';
import type { OrdemServico, Vistoria, AutoInfracao, AcaoFiscalizacao, Profile, PrefeituraConfig } from '@/lib/types';
import { ORIGEM_OS_LABEL, STATUS_OS_LABEL, CIENCIA_LABEL, ORGAO_APOIO_LABEL } from '@/lib/types';

interface PDFData {
  prefeitura: PrefeituraConfig | null;
  os: OrdemServico;
  vistoria: Vistoria | null;
  fiscal: Profile | null;
  gerente: Profile | null;
  acoes: AcaoFiscalizacao[];
  autoInfracao: AutoInfracao | null;
}

export function generateVistoriaPDF(data: PDFData): void {
  const { prefeitura, os, vistoria, fiscal, gerente, acoes, autoInfracao } = data;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (h: number) => {
    if (y + h > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const addSectionTitle = (title: string) => {
    ensureSpace(12);
    doc.setFillColor(240, 240, 245);
    doc.rect(margin, y, contentW, 8, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 60);
    doc.text(title, margin + 3, y + 5.5);
    y += 10;
  };

  const addLine = (label: string, value: string) => {
    ensureSpace(6);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(value || '—', contentW - 35);
    doc.text(lines, margin + 32, y);
    y += Math.max(5, lines.length * 4.5);
  };

  const addText = (text: string) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(text || '—', contentW);
    for (const line of lines) {
      ensureSpace(5);
      doc.text(line, margin, y);
      y += 4.5;
    }
  };

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 40);
  doc.text(prefeitura?.nome_prefeitura ?? 'Prefeitura Municipal', margin, y + 5);
  y += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Relatório de Vistoria — Sistema Integrado de Fiscalização Urbana (SIFAU)', margin, y);
  y += 8;

  doc.setDrawColor(200, 200, 210);
  doc.line(margin, y, pageW - margin, y);
  y += 4;

  // OS data
  addSectionTitle('Dados da Ordem de Serviço');
  addLine('Número da OS', os.numero_os);
  addLine('Origem', ORIGEM_OS_LABEL[os.origem_os]);
  addLine('Requerente', os.requerente);
  addLine('Endereço', os.endereco);
  addLine('Data de Emissão', new Date(os.data_emissao).toLocaleDateString('pt-BR'));
  addLine('Prazo de Resposta', new Date(os.prazo_resposta).toLocaleDateString('pt-BR'));
  addLine('Status', STATUS_OS_LABEL[os.status]);
  if (os.apoio_operacional) {
    let apo = os.orgao_apoio ? ORGAO_APOIO_LABEL[os.orgao_apoio] : '—';
    if (os.orgao_apoio === 'outro' && os.orgao_apoio_outro) apo = os.orgao_apoio_outro;
    addLine('Apoio Operacional', `Sim — ${apo}`);
  }

  addSectionTitle('Descrição do Serviço');
  addText(os.servico_descricao);

  if (os.legislacao_aplicavel && os.legislacao_aplicavel.length > 0) {
    addSectionTitle('Legislação Aplicável');
    addText(os.legislacao_aplicavel.join(', '));
  }

  // Fiscal & Gerente
  addSectionTitle('Equipe');
  addLine('Fiscal Responsável', fiscal ? `${fiscal.nome} (${fiscal.email})` : '—');
  addLine('Gerente Responsável', gerente ? `${gerente.nome} (${gerente.email})` : '—');

  // Actions
  if (acoes.length > 0) {
    addSectionTitle('Ações de Fiscalização Aplicadas');
    for (const a of acoes) {
      addText(`[${a.codigo}] ${a.nome}${a.descricao ? ' — ' + a.descricao : ''}`);
    }
  }

  // Vistoria
  if (vistoria) {
    addSectionTitle('Registro de Vistoria');
    addLine('Iniciada em', new Date(vistoria.iniciada_em).toLocaleString('pt-BR'));
    if (vistoria.finalizada_em) {
      addLine('Finalizada em', new Date(vistoria.finalizada_em).toLocaleString('pt-BR'));
    }
    if (vistoria.geo_inicio_lat != null && vistoria.geo_inicio_lng != null) {
      addLine('Geolocalização de Início', `${Number(vistoria.geo_inicio_lat).toFixed(6)}, ${Number(vistoria.geo_inicio_lng).toFixed(6)} (precisão: ${vistoria.geo_inicio_precisao_m ?? '?'}m)`);
    }
    if (vistoria.relatorio) {
      addLine('Relatório', '');
      addText(vistoria.relatorio);
    }
    if (vistoria.fotos && vistoria.fotos.length > 0) {
      addSectionTitle('Fotos Anexadas');
      let imgX = margin;
      const imgW = 50;
      const imgH = 38;
      for (let i = 0; i < vistoria.fotos.length; i++) {
        try {
          ensureSpace(imgH + 4);
          doc.addImage(vistoria.fotos[i], 'JPEG', imgX, y, imgW, imgH, undefined, 'FAST');
          doc.setFontSize(7);
          doc.setTextColor(120, 120, 120);
          doc.text(`Foto ${i + 1}`, imgX, y + imgH + 3);
          imgX += imgW + 5;
          if (imgX + imgW > pageW - margin) {
            imgX = margin;
            y += imgH + 6;
          }
        } catch {
          addText(`[Foto ${i + 1} — URL: ${vistoria.fotos[i]}]`);
        }
      }
      y += imgH + 6;
    }
  }

  // Auto de Infração
  if (autoInfracao) {
    addSectionTitle('Auto de Infração');
    addLine('Valor da Multa', `R$ ${Number(autoInfracao.valor_multa).toFixed(2)}`);
    addLine('Motivo', autoInfracao.motivo ?? '—');
    addLine('Autuado', autoInfracao.autuado_nome ?? '—');
    addLine('Documento', autoInfracao.autuado_documento ?? '—');
    addLine('Ciência', CIENCIA_LABEL[autoInfracao.ciencia_status]);
    if (autoInfracao.testemunha_nome) {
      addLine('Testemunha', autoInfracao.testemunha_nome);
    }
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `SIFAU — ${prefeitura?.nome_prefeitura ?? 'Prefeitura'} · OS ${os.numero_os} · Página ${i}/${pageCount} · Gerado em ${new Date().toLocaleString('pt-BR')}`,
      margin,
      pageH - 8
    );
  }

  doc.save(`relatorio-vistoria-${os.numero_os.replace('/', '-')}.pdf`);
}
