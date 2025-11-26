document.addEventListener("DOMContentLoaded", () => {

    const userTypeSelect = document.getElementById("register-type");
    const clienteFields = document.getElementById("cliente-fields");
    const motoristaFields = document.getElementById("motorista-fields");
    const driverDocs = document.getElementById("driver-docs");
    const form = document.querySelector("form");
    const modal = document.getElementById("success-modal");
    const closeModal = document.getElementById("close-modal");

    function updateFormVisibility() {
        if (userTypeSelect.value === "motorista") {
            clienteFields.classList.add("hidden");
            motoristaFields.classList.remove("hidden");
            driverDocs.classList.remove("hidden");
        } else {
            clienteFields.classList.remove("hidden");
            motoristaFields.classList.add("hidden");
            driverDocs.classList.add("hidden");
        }
    }

    updateFormVisibility();
    userTypeSelect.addEventListener("change", updateFormVisibility);

    const phone = document.getElementById("phone");
    if (phone) {
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
        });
    }

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const type = userTypeSelect.value;

        let user = {
            type,
            driverApproved: type === "cliente",
            name: document.getElementById("first-name")?.value.trim() || "",
            lastName: document.getElementById("last-name")?.value.trim() || "",
            email: document.getElementById("email")?.value.trim() || "",
            phone: document.getElementById("phone")?.value.trim() || "",
            password: "",
            cnh: type === "motorista" ? document.getElementById("cnh")?.value.trim() || "" : ""
        };

        if (type === "motorista") {
            if (!user.cnh) {
                alert("Para cadastrar como motorista, é necessário informar a CNH.");
                return;
            }

            const password = document.getElementById("password")?.value.trim() || "";
            const confirmPassword = document.getElementById("confirm-password")?.value.trim() || "";

            if (!password) {
                alert("Informe a senha.");
                return;
            }

            if (password !== confirmPassword) {
                alert("As senhas não coincidem.");
                return;
            }

            user.password = password;
        } else {
            const password = document.getElementById("password")?.value.trim() || "";
            if (!password) {
                alert("Informe a senha.");
                return;
            }
            user.password = password;
        }

        localStorage.setItem("accessride_user", JSON.stringify(user));
        modal.classList.remove("hidden");
        modal.classList.add("flex");
    });

    closeModal.addEventListener("click", () => {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
        window.location.href = "./login.html";
    });

});