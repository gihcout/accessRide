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

    function updateRideButton() {
        const isLogged = localStorage.getItem("accessride_logged") === "true";
        const user = JSON.parse(localStorage.getItem("accessride_user") || "{}");

        // Desktop
        const btnViajarDesktop = document.getElementById("btnViajarDesktop");
        const btnLoginDesktop = document.getElementById("btnLoginDesktop");
        const greetDesktop = document.getElementById("userGreetingDesktop");
        const btnLogoutDesktop = document.getElementById("btnLogoutDesktop");

        // Mobile
        const btnViajarMobile = document.getElementById("btnViajarMobile");
        const btnLoginMobile = document.getElementById("btnLoginMobile");
        const greetMobile = document.getElementById("userGreetingMobile");
        const btnLogoutMobile = document.getElementById("btnLogoutMobile");

        if (isLogged) {
            btnViajarDesktop?.classList.remove("opacity-40", "pointer-events-none");
            btnViajarMobile?.classList.remove("opacity-40", "pointer-events-none");

            btnLoginDesktop?.classList.add("hidden");
            btnLoginMobile?.classList.add("hidden");

            greetDesktop.textContent = `Olá, ${user.name}`;
            greetDesktop.classList.remove("hidden");

            greetMobile.textContent = `Olá, ${user.name}`;
            greetMobile.classList.remove("hidden");

            btnLogoutDesktop?.classList.remove("hidden");
            btnLogoutMobile?.classList.remove("hidden");

        } else {
            btnViajarDesktop?.classList.add("opacity-40", "pointer-events-none");
            btnViajarMobile?.classList.add("opacity-40", "pointer-events-none");

            btnLoginDesktop?.classList.remove("hidden");
            btnLoginMobile?.classList.remove("hidden");

            greetDesktop?.classList.add("hidden");
            greetMobile?.classList.add("hidden");

            btnLogoutDesktop?.classList.add("hidden");
            btnLogoutMobile?.classList.add("hidden");
        }

        btnLogoutDesktop?.addEventListener("click", logoutUser);
        btnLogoutMobile?.addEventListener("click", logoutUser);
    }

    function logoutUser() {
        localStorage.removeItem("accessride_logged");
        window.location.reload();
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
            updateRideButton();
        })
        .catch(err => console.error('Erro ao carregar templates:', err));
});