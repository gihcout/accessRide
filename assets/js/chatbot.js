// Seleção de elementos
const messagesEl = document.getElementById("chat-messages");
const inputEl = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

const chatBtn = document.getElementById("chatFloatingButton");
const chatWindow = document.getElementById("chatWindow");
const chatClose = document.getElementById("chatClose");

let state = "menu";

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
    msgEl.innerHTML = text.replace(/\n/g, "<br>");
    messagesEl.appendChild(msgEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function bot(text) {
    addMessage(text, "bot");
}

function user(text) {
    addMessage(text, "user");
}

/* --- Menu Principal --- */
function showMenu() {
    bot("Como posso te ajudar? Escolha uma opção:");
    bot(
        "1️⃣ Sobre o projeto\n" +
        "2️⃣ Requisitos do site\n" +
        "3️⃣ Como funcionam as viagens\n" +
        "4️⃣ Cadastro de motoristas e veículos\n" +
        "5️⃣ Pagamentos e tarifas\n" +
        "6️⃣ Acessibilidade do sistema\n" +
        "7️⃣ Contato e suporte"
    );
    state = "menu";
}

/* --- Fluxo do Chat --- */
function processInput(text) {
    text = text.trim();
    if (!text) return;

    user(text);

    if (state === "menu") {
        switch (text) {
            case "1":
                bot("📘 *Sobre o AccessRide*");
                bot("O AccessRide é uma plataforma criada para conectar passageiros com mobilidade reduzida a motoristas treinados e veículos adaptados, garantindo um transporte seguro, inclusivo e digno.");
                showMenu();
                break;

            case "2":
                bot("🧩 *Requisitos do site*");
                bot(
                    "Alguns requisitos funcionais:\n" +
                    "• Cadastro de passageiros e motoristas\n" +
                    "• Solicitação e agendamento de corridas\n" +
                    "• Acompanhamento em tempo real no mapa\n" +
                    "• Chat entre passageiro e motorista\n" +
                    "• Pagamento via cartão ou PIX"
                );
                bot(
                    "Requisitos não funcionais:\n" +
                    "• Compatível com Android/iOS\n" +
                    "• Alta acessibilidade visual e motora\n" +
                    "• Segurança e criptografia de dados\n" +
                    "• Disponibilidade 24/7"
                );
                showMenu();
                break;

            case "3":
                bot("🚘 *Como funcionam as viagens no AccessRide*");
                bot(
                    "• Passageiro informa origem e destino\n" +
                    "• Sistema encontra motoristas próximos e adaptados\n" +
                    "• Motorista aceita corrida e segue até o local\n" +
                    "• Trajeto pode ser acompanhado em tempo real\n" +
                    "• Ao final, motorista e passageiro avaliam a viagem"
                );
                showMenu();
                break;

            case "4":
                bot("🧑‍✈️ *Cadastro de motoristas e veículos*");
                bot(
                    "Regras principais:\n" +
                    "• Motorista deve ter curso para transporte de pessoas com mobilidade reduzida\n" +
                    "• Verificação de antecedentes\n" +
                    "• Veículo deve ser adaptado (rampa, elevador ou suporte para cadeira)\n" +
                    "• Veículo não pode ter mais de 18 anos\n" +
                    "• Documentação e CSV (INMETRO) obrigatórios"
                );
                showMenu();
                break;

            case "5":
                bot("💳 *Pagamentos e Tarifas*");
                bot(
                    "• Pagamento eletrônico via cartão ou PIX\n" +
                    "• Tarifa baseada em distância e tempo\n" +
                    "• Recibo eletrônico enviado ao usuário\n" +
                    "• Plataforma retém taxa de 10% por viagem"
                );
                showMenu();
                break;

            case "6":
                bot("🦽 *Acessibilidade do sistema*");
                bot(
                    "O AccessRide foi projetado para ser totalmente acessível:\n" +
                    "• Botões grandes e interface simples\n" +
                    "• Compatibilidade com leitores de tela\n" +
                    "• Web leve e responsivo\n" +
                    "• Fluxos simples para pessoas com necessidades motoras"
                );
                showMenu();
                break;

            case "7":
                bot("📩 *Contato e Suporte*");
                bot("Se você precisa de ajuda, encontrou um problema ou quer falar com a equipe:");
                bot("📧 Envie um e-mail para: accessride.contato@gmail.com");
                bot("Responderemos o mais rápido possível! 😊");
                showMenu();
                break;

            default:
                bot("Não entendi essa opção 😕. Por favor escolha um número de 1 a 7.");
                showMenu();
        }

        return;
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
bot("Olá! 👋 Bem-vindo(a) ao chatbot do AccessRide.");
bot("Sou seu assistente e posso tirar dúvidas sobre o projeto.");
showMenu();
