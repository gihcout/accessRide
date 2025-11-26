document.addEventListener('DOMContentLoaded', () => {
    const isGithubPages = window.location.hostname.includes('github.io');
    const repoName = 'accessRide';
    const basePath = isGithubPages ? `/${repoName}/` : '/';
    const path = `${basePath}components/templates.html`;

    function injectTemplate(templateId, targetSelector, tempDiv) {
        const tpl = tempDiv.querySelector(`#${templateId}`);
        const target = document.querySelector(targetSelector);
        if (tpl && target) {
            target.appendChild(tpl.content.cloneNode(true));
        }
    }

    function initMobileMenu() {
        const menuBtn = document.getElementById("menuMobileBtn");
        const menu = document.getElementById("menuMobile");
        const closeBtn = document.getElementById("closeMenu");

        if (!menuBtn || !menu || !closeBtn) return;
        menuBtn.onclick = (e) => {
            e.stopPropagation();
            menu.style.transform = "translateX(0)";
        };

        closeBtn.onclick = (e) => {
            e.stopPropagation();
            menu.style.transform = "translateX(100%)";
        };

        document.addEventListener("click", (e) => {
            if (!menu.contains(e.target) && e.target !== menuBtn) {
                menu.style.transform = "translateX(100%)";
            }
        });
    }

    fetch(path)
        .then(res => {
            if (!res.ok) throw new Error(`Erro ${res.status} ao carregar ${path}`);
            return res.text();
        })
        .then(html => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;

            injectTemplate('tpl-head', 'head', tempDiv);
            injectTemplate('tpl-header', '#header', tempDiv);
            injectTemplate('tpl-footer', '#footer', tempDiv);

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
            initMobileMenu();
        })
        .catch(err => console.error('Erro ao carregar templates:', err));
});

// Controle do botão "Solicite uma carona"
setTimeout(() => {
    const isLogged = localStorage.getItem("accessride_logged") === "true";
    const btnDesktop = document.querySelector('a[href="pages/viajar.html"]');
    const btnMobile = document.querySelector('#menuMobile a[href="pages/viajar.html"]');

    if (!isLogged) {
        btnDesktop?.classList.add("opacity-40", "pointer-events-none");
        btnMobile?.classList.add("opacity-40", "pointer-events-none");
    } else {
        btnDesktop?.classList.remove("opacity-40", "pointer-events-none");
        btnMobile?.classList.remove("opacity-40", "pointer-events-none");
    }
}, 300);
