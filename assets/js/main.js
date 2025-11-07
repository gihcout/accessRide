document.addEventListener('DOMContentLoaded', () => {
  // 1️⃣ Detecta automaticamente o ambiente (local ou GitHub Pages)
  const isGithubPages = window.location.hostname.includes('github.io');
  const repoName = 'accessRide'; // ajuste se o repositório tiver outro nome
  const basePath = isGithubPages ? `/${repoName}/` : '/';

  // 2️⃣ Monta o caminho correto do arquivo de templates
  // Se estiver em /pages/, precisa subir um nível
  const path = window.location.pathname.includes('/pages/')
    ? `${basePath}components/templates.html`
    : `${basePath}components/templates.html`;

  // 3️⃣ Carrega o arquivo de templates
  fetch(path)
    .then(res => {
      if (!res.ok) throw new Error(`Erro ${res.status} ao carregar ${path}`);
      return res.text();
    })
    .then(html => {
      const temp = document.createElement('div');
      temp.innerHTML = html;

      // Função para injetar um template em um seletor
      function injectTemplate(templateId, targetSelector) {
        const tpl = temp.querySelector(`#${templateId}`);
        const target = document.querySelector(targetSelector);
        if (tpl && target) {
          target.appendChild(tpl.content.cloneNode(true));
        }
      }

      // 4️⃣ Insere os templates no documento
      injectTemplate('tpl-head', 'head');
      injectTemplate('tpl-header', '#header');
      injectTemplate('tpl-footer', '#footer');

      // 5️⃣ Ajusta automaticamente os links do header e do footer
      document.querySelectorAll('#header a, #footer a').forEach(link => {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('http')) {
          // Evita links absolutos
          const normalized = href.replace(/^(\.?\/)+/, ''); // remove ./ ou ../
          link.setAttribute('href', basePath + normalized);
        }
      });

      // 6️⃣ Ajusta imagens também (opcional, mas útil)
      document.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src');
        if (src && !src.startsWith('http')) {
          const normalized = src.replace(/^(\.?\/)+/, '');
          img.setAttribute('src', basePath + normalized);
        }
      });
    })
    .catch(err => console.error('Erro ao carregar templates:', err));
});