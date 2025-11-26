document.addEventListener('DOMContentLoaded', () => {
  const isGithubPages = window.location.hostname.includes('github.io');
  const repoName = 'accessRide';
  const basePath = isGithubPages ? `/${repoName}/` : '/';

  const path = window.location.pathname.includes('/pages/')
    ? `${basePath}components/templates.html`
    : `${basePath}components/templates.html`;

  fetch(path)
    .then(res => {
      if (!res.ok) throw new Error(`Erro ${res.status} ao carregar ${path}`);
      return res.text();
    })
    .then(html => {
      const temp = document.createElement('div');
      temp.innerHTML = html;

      function injectTemplate(templateId, targetSelector) {
        const tpl = temp.querySelector(`#${templateId}`);
        const target = document.querySelector(targetSelector);
        if (tpl && target) {
          target.appendChild(tpl.content.cloneNode(true));
        }
      }

      injectTemplate('tpl-head', 'head');
      injectTemplate('tpl-header', '#header');
      injectTemplate('tpl-footer', '#footer');

      document.querySelectorAll('#header a, #footer a').forEach(link => {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('http')) {
          const normalized = href.replace(/^(\.?\/)+/, ''); 
          link.setAttribute('href', basePath + normalized);
        }
      });

      document.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src');
        if (src && !src.startsWith('http')) {
          const normalized = src.replace(/^(\.?\/)+/, '');
          img.setAttribute('src', basePath + normalized);
        }
      });
    })
    .catch(err => console.error('Erro ao carregar templates:', err));

    document.addEventListener("click", () => {
      const btn = document.getElementById("menuMobileBtn");
      const menu = document.getElementById("menuMobile");
      const closeBtn = document.getElementById("closeMenu");

      if (!btn || !menu || !closeBtn) return;

      btn.onclick = () => menu.style.transform = "translateX(0)";
      closeBtn.onclick = () => menu.style.transform = "translateX(100%)";
  });

});