// Seleção de elementos
const messagesEl = document.getElementById("chat-messages");
const inputEl = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

const chatBtn = document.getElementById("chatFloatingButton");
const chatWindow = document.getElementById("chatWindow");
const chatClose = document.getElementById("chatClose");

let state = "askName";
let userName = "";
let tipoCarro = "";
let destino = "";
let pagamento = "";

/* --- Abrir/Fechar Chat --- */
chatBtn.addEventListener("click", () => {
    chatWindow.classList.toggle("open");
});

chatClose.addEventListener("click", () => {
    chatWindow.classList.remove("open");
});

/* --- Mensagens --- */
function addMessage(text, className) {
    const msgEl = document.createElement("div");
    msgEl.classList.add("message", className);
    msgEl.textContent = text;
    messagesEl.appendChild(msgEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function bot(text) {
    addMessage(text, "bot");
}

function user(text) {
    addMessage(text, "user");
}

/* --- Fluxo do Chat --- */
function processInput(text) {
    text = text.trim();
    if (!text) {
        bot("Se precisar de uma corrida, estou à disposição 😊");
        state = "end";
        return;
    }

    user(text);

    switch (state) {
        case "askName":
            userName = text;
            bot(`Perfeito, ${userName}! Qual tipo de carro você deseja?`);
            bot("1.a Carro com rampa | 1.b Porta ampla | 1.c Espaço para cadeira");
            state = "askCar";
            break;

        case "askCar":
            tipoCarro = text;
            bot("Qual o destino?");
            state = "askDestino";
            break;

        case "askDestino":
            destino = text;
            bot("Qual a forma de pagamento?");
            bot("4.a Crédito | 4.b Débito | 4.c PIX | 4.d Dinheiro");
            state = "askPagamento";
            break;

        case "askPagamento":
            pagamento = text;
            bot("Corrida solicitada com sucesso! 🚗💨");
            simulateDriver();
            state = "end";
            break;
    }
}

/* --- Envio --- */
sendBtn.addEventListener("click", () => {
    const text = inputEl.value;
    inputEl.value = "";
    processInput(text);
});

inputEl.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendBtn.click();
});

/* Mensagem inicial */
bot("Olá! Seja bem-vindo(a) ao AcessRide 😊");
bot("Qual é o seu nome?");

/* --- Simulação --- */
async function simulateDriver() {
    await delay(3000);
    bot("Motorista a caminho 🚘");

    await delay(3000);
    bot("O motorista Carlos Oliveira está chegando (6 min).");

    await delay(6000);
    bot("Motorista chegou! ✔");

    await delay(8000);
    bot("Viagem concluída! Obrigado por usar o AcessRide 😄");
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
