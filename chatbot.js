// Chatbot AcessRide - Arquivo chatbot.js em JavaScript puro

// Seleciona elementos
const messagesEl = document.getElementById("chat-messages");
const inputEl = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

let state = "askName";
let userName = "";
let tipoCarro = "";
let destino = "";
let pagamento = "";

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

function processInput(text) {
  text = text.trim();
  if (!text) {
    bot("Caso tenha interesse, pode nos contratar a hora que quiser.");
    state = "end";
    return;
  }

  user(text);

  switch (state) {
    case "askName":
      userName = text;
      bot(`Perfeito, ${userName}! Qual o tipo de carro solicitado?`);
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
      bot("4.a Cartão de crédito | 4.b Cartão de débito | 4.c PIX | 4.d Dinheiro");
      state = "askPagamento";
      break;

    case "askPagamento":
      pagamento = text;
      bot("Perfeito! corrida solicitada com sucesso");
      state = "waitingDriver";
      simulateDriver();
      break;
  }
}

sendBtn.addEventListener("click", () => {
  const text = inputEl.value;
  inputEl.value = "";
  processInput(text);
});

inputEl.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendBtn.click();
});

// Mensagens iniciais
bot("Olá! Seja bem-vindo(a) ao nosso aplicativo de corridas acessíveis AcessRide. 😊");
bot("Qual seu nome?");

// Simulações de tempo
async function simulateDriver() {
  await delay(5000);
  bot("Motorista a caminho ✅");
  bot("O motorista Carlos Oliveira está a caminho em um Fiat Doblo Adaptado, placa ABC-4F56.");
  bot("Tempo estimado de chegada: 6 minutos.");

  await delay(5000);
  bot("Ebaa! Carlos Oliveira chegou!");

  await delay(10000);
  bot("O tempo de viagem é de 45 min");

  await delay(10000);
  bot("Você chegou ao seu destino. Para a próxima corrida, preparamos um cupom de 5% de desconto 😊");

  state = "end";
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
