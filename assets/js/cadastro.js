document.addEventListener("DOMContentLoaded", () => {

    const fields = [
        "first-name",
        "last-name",
        "email",
        "phone",
        "password",
        "confirm-password",
        "wheelchair",
        "visual",
        "hearing",
        "service-animal-1",
        "service-animal-2"
    ];

    fields.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        const saved = localStorage.getItem("form_" + id);

        if (el.type === "checkbox") {
            el.checked = saved === "true";
        } else if (saved) {
            el.value = saved;
        }
    });

    const phone = document.getElementById("phone");
    phone.addEventListener("input", () => {
        let v = phone.value.replace(/\D/g, "");
        if (v.length > 11) v = v.slice(0, 11);

        if (v.length <= 10) {
            phone.value = v.replace(/^(\d{2})(\d)/, "($1) $2")
                           .replace(/(\d{4})(\d)/, "$1-$2");
        } else {
            phone.value = v.replace(/^(\d{2})(\d)/, "($1) $2")
                           .replace(/(\d{5})(\d)/, "$1-$2");
        }

        localStorage.setItem("form_phone", phone.value);
    });

    fields.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        el.addEventListener("input", () => {
            if (el.type === "checkbox") {
                localStorage.setItem("form_" + id, el.checked);
            } else {
                localStorage.setItem("form_" + id, el.value);
            }
        });
    });

    const form = document.querySelector("form");
    const modal = document.getElementById("success-modal");
    const closeModal = document.getElementById("close-modal");

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const userData = {
            email: document.getElementById("email").value,
            password: document.getElementById("password").value,
            name: document.getElementById("first-name").value
        };

        localStorage.setItem("accessride_user", JSON.stringify(userData));
        fields.forEach(id => localStorage.removeItem("form_" + id));
        modal.classList.remove("hidden");
        modal.classList.add("flex");
    });

    closeModal.addEventListener("click", () => {
        modal.classList.add("hidden");
        modal.classList.remove("flex");

        window.location.href = "./login.html";
    });
});
