document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("form");

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const userData = JSON.parse(localStorage.getItem("accessride_user"));

        if (!userData) {
            alert("Nenhum usuário cadastrado! Crie sua conta.");
            return;
        }

        if (email === userData.email && password === userData.password) {
            localStorage.setItem("accessride_logged", "true");
            window.location.href = "../index.html";
        } else {
            alert("E-mail ou senha inválidos!");
        }
    });
});
