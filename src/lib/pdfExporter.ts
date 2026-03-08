import { Denuncia, Relatorio, AutoInfracao } from '../types';

export function exportToPDF(denuncia: Denuncia, relatorio?: Relatorio, auto?: AutoInfracao) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Popup bloqueado. Permita popups para exportar o PDF.');
    return;
  }

  const fotosHTML = relatorio?.fotos?.length
    ? `<div class="section"><h3>📸 Fotos do Fiscal</h3><div class="photos">${relatorio.fotos.map(f => `<img src="${f}" alt="Foto" />`).join('')}</div></div>`
    : '';

  const assinaturaHTML = relatorio?.assinatura_base64
    ? `<div class="section"><h3>✍️ Assinatura Digital</h3><img src="${relatorio.assinatura_base64}" alt="Assinatura" style="max-width:300px;border:1px solid #ccc;border-radius:8px;" /></div>`
    : '';

  const autoHTML = auto
    ? `<div class="section"><h3>💰 Auto de Infração</h3><table><tr><td><strong>Tipo:</strong></td><td>${auto.tipo}</td></tr><tr><td><strong>Valor:</strong></td><td>R$ ${auto.valor.toFixed(2)}</td></tr><tr><td><strong>Embargo:</strong></td><td>${auto.embargo ? '✅ Sim' : '❌ Não'}</td></tr><tr><td><strong>Data:</strong></td><td>${new Date(auto.created_at).toLocaleDateString('pt-BR')}</td></tr></table></div>`
    : '';

  const osHTML = relatorio
    ? `<div class="section"><h3>📋 Ordens de Serviço</h3><p>${relatorio.os_2_0 ? '✅' : '⬜'} O.S. 2.0 — Ordem de serviço cumprida (+50 pts)</p><p>${relatorio.os_4_0 ? '✅' : '⬜'} O.S. 4.0 — Notificações (+50 pts)</p></div>`
    : '';

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório SIFAU - ${denuncia.protocolo}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#333;padding:20px;max-width:800px;margin:0 auto}.header{background:linear-gradient(135deg,#1e3a8a,#2563eb);color:white;padding:24px;border-radius:12px;margin-bottom:20px;display:flex;align-items:center;gap:16px;-webkit-print-color-adjust:exact;print-color-adjust:exact}.header h1{font-size:22px}.header p{font-size:12px;opacity:.8}.logo{width:50px;height:50px;background:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;color:#1e3a8a;font-size:16px}.section{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:14px}.section h3{color:#1e3a8a;margin-bottom:10px;font-size:15px;border-bottom:2px solid #dbeafe;padding-bottom:6px}table{width:100%;border-collapse:collapse}table td{padding:6px 8px;border-bottom:1px solid #f1f5f9;font-size:13px}.photos{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.photos img{width:100%;height:150px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0}.report-text{white-space:pre-wrap;font-size:13px;line-height:1.6;background:white;padding:12px;border-radius:8px;border:1px solid #e2e8f0}.footer{text-align:center;margin-top:30px;padding-top:16px;border-top:2px solid #e2e8f0;color:#94a3b8;font-size:11px}</style></head><body>
<div class="header"><div class="logo">S</div><div><h1>Relatório de Fiscalização</h1><p>SIFAU — Sistema Inteligente de Fiscalização e Atividades Urbanas</p></div></div>
<div class="section"><h3>📋 Dados da Denúncia</h3><table>
<tr><td><strong>Protocolo:</strong></td><td>#${denuncia.protocolo}</td></tr>
<tr><td><strong>Tipo:</strong></td><td>${denuncia.tipo}</td></tr>
<tr><td><strong>Endereço:</strong></td><td>${denuncia.endereco}</td></tr>
<tr><td><strong>Status:</strong></td><td>${denuncia.status}</td></tr>
<tr><td><strong>Data:</strong></td><td>${new Date(denuncia.created_at).toLocaleDateString('pt-BR')}</td></tr>
<tr><td><strong>SLA:</strong></td><td>${denuncia.sla_dias} dias</td></tr>
<tr><td><strong>Coordenadas:</strong></td><td>${denuncia.lat.toFixed(6)}, ${denuncia.lng.toFixed(6)}</td></tr>
</table></div>
${relatorio ? `<div class="section"><h3>📝 Relatório Técnico</h3><div class="report-text">${relatorio.texto || 'Sem texto'}</div></div>` : ''}
${osHTML}${autoHTML}${fotosHTML}${assinaturaHTML}
<div class="footer"><p>Documento gerado pelo SIFAU — ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p><p>© 2026 SIFAU — Criado e comandado por Douglas Gabriel</p></div>
<script>window.onload=function(){window.print()}</script></body></html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}
