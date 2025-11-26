document.addEventListener("DOMContentLoaded", () => {
    const loginTypeSelect = document.getElementById("login-type");
    const clienteFields = document.getElementById("cliente-login-fields");
    const motoristaFields = document.getElementById("motorista-login-fields");
    const form = document.getElementById("login-form");
    const errorMsg = document.getElementById("error-msg");

    function updateLoginFields() {
        if (loginTypeSelect.value === "motorista") {
            clienteFields.classList.add("hidden");
            motoristaFields.classList.remove("hidden");
        } else {
            clienteFields.classList.remove("hidden");
            motoristaFields.classList.add("hidden");
        }
    }

    loginTypeSelect.addEventListener("change", updateLoginFields);
    updateLoginFields(); 

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        errorMsg.classList.add("hidden");
        errorMsg.textContent = "";

        const type = loginTypeSelect.value;
        const password = document.getElementById("password").value.trim();
        let userData = JSON.parse(localStorage.getItem("accessride_user")) || null;

        if (!userData) {
            errorMsg.textContent = "Nenhum usuário cadastrado.";
            errorMsg.classList.remove("hidden");
            return;
        }

        if (userData.type !== type) {
            errorMsg.textContent = `Não existe um ${type} cadastrado com essas informações.`;
            errorMsg.classList.remove("hidden");
            return;
        }

        if (type === "cliente") {
            const email = document.getElementById("email").value.trim();
            if (email !== userData.email || password !== userData.password) {
                errorMsg.textContent = "E-mail ou senha incorretos.";
                errorMsg.classList.remove("hidden");
                return;
            }
        } else if (type === "motorista") {
            const cnh = document.getElementById("cnh").value.trim();
            if (cnh !== userData.cnh || password !== userData.password) {
                errorMsg.textContent = "CNH ou senha incorretos.";
                errorMsg.classList.remove("hidden");
                return;
            }

            if (!userData.driverApproved) {
                errorMsg.textContent = "Cadastro em análise. Aguarde aprovação da equipe.";
                errorMsg.classList.remove("hidden");
                return;
            }
        }

        alert(`Login realizado como ${type}!`);
        window.location.href = "./index.html";
    });

});