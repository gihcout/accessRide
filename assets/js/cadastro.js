document.addEventListener("DOMContentLoaded", () => {

    const userTypeSelect = document.getElementById("register-type");
    const clienteFields = document.getElementById("cliente-fields");
    const motoristaFields = document.getElementById("motorista-fields");
    const driverDocs = document.getElementById("driver-docs");
    const form = document.querySelector("form");

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

    const modal = document.getElementById("success-modal");
    const closeModal = document.getElementById("close-modal");

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const type = userTypeSelect.value;

        let user = {
            type,
            driverApproved: type === "cliente",
            name: document.getElementById("first-name")?.value || "",
            lastName: document.getElementById("last-name")?.value || "",
            email: document.getElementById("email")?.value || "",
            phone: document.getElementById("phone")?.value || "",
            password: document.getElementById("password")?.value || "",
            cnh: type === "motorista" ? document.getElementById("cnh")?.value || "" : ""
        };

        if (type === "motorista" && !user.cnh.trim()) {
            alert("Para cadastrar como motorista, é necessário informar a CNH.");
            return;
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
