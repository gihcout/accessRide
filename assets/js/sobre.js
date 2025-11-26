document.addEventListener("DOMContentLoaded", () => {
    const btnFale = document.getElementById("btnFaleConosco");
    const modal = document.getElementById("faleModal");
    const closeBtn = document.getElementById("closeFale");

    if (btnFale && modal && closeBtn) {
        btnFale.addEventListener("click", () => {
        modal.classList.remove("hidden");
        });

        closeBtn.addEventListener("click", () => {
        modal.classList.add("hidden");
        });

        modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.add("hidden");
        }
        });
    }
});
