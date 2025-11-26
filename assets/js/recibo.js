document.addEventListener("DOMContentLoaded", () => {
  const { jsPDF } = window.jspdf;
  const reciboBtn = document.getElementById("btnRecibo");

  if (reciboBtn) {
    reciboBtn.addEventListener("click", () => {
      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Recibo - Simulação (Não tem valor fiscal)", 105, 20, { align: "center" });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(255, 0, 0);
      doc.text("**Este é apenas um recibo de exemplo para demonstração do site**", 105, 30, { align: "center" });
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");

      const startY = 45;
      const lineHeight = 8;
      const dados = [
        ["Cliente:", "Maria Silva"],
        ["Corrida:", "Av. Paulista, 1000 → Shopping Morumbi"],
        ["Veículo:", "Toyota Corolla Acessível"],
        ["Valor:", "R$ 21,50"],
        ["Data:", "25/11/2025"]
      ];

      dados.forEach((item, index) => {
        doc.text(item[0], 20, startY + index * lineHeight);
        doc.text(item[1], 60, startY + index * lineHeight);
      });

      const now = new Date();
      const dataHora = `Gerado em: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(dataHora, 60, startY + dados.length * lineHeight + 4);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text("Recibo gerado pelo sistema AccessRide de simulação, nenhum dado aqui apresentado é real.", 105, 280, { align: "center" });

      // Baixar PDF
      doc.save("recibo_simulado_accessride.pdf");
    });
  }
});
