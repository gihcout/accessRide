document.addEventListener('DOMContentLoaded', () => {
  // Detecta se estamos dentro da pasta /pages
  const path = window.location.pathname.includes('/pages/')
    ? '../components/templates.html'
    : './components/templates.html';

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
          // target.innerHTML = ''; // não apagar tudo
          target.appendChild(tpl.content.cloneNode(true));
        }
      }

      // Insere o conteúdo dos templates no HTML
      injectTemplate('tpl-head', 'head');       // adiciona metatags e links
      injectTemplate('tpl-header', '#header');  // insere o header no container
      injectTemplate('tpl-footer', '#footer');  // insere o footer no container

      // Ajusta links do header quando estiver em /pages/
      if (window.location.pathname.includes('/pages/')) {
        document.querySelectorAll('#header a').forEach(link => {
          if (link.getAttribute('href').startsWith('pages/')) {
            link.setAttribute('href', link.getAttribute('href').replace('pages/', './'));
          }
        });
      }
    })
    .catch(err => console.error('Erro ao carregar templates:', err));
});
