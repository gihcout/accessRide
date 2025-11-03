// ---------- Elementos ----------
const el = id => document.getElementById(id);

// Mapa
const map = L.map('map').setView([-23.55, -46.63], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

// Estado global
let partidaCoords = null,
    destinoCoords = null,
    control = null,              // controle principal do routing (rota usuário)
    driverRouter = null,         // controle temporário para rota do motorista -> passageiro
    motoristaMarker = null,
    routePolyline = null,        // polyline que desenha o progresso do motorista
    routeCoordinates = [],       // array de LatLngs usado para animação
    animationInterval = null,    // interval usado para animar o motorista
    animationElapsed = 0,        // tempo acumulado da animação (para progressos)
    routeTraveled = null,        // parte da rota já percorrida
    routeRemaining = null;       // parte da rota restante
    corridaCancelada = false;   // indica se o usuário cancelou a corrida


// Ícone do carro (usando emoji para consistência com seu projeto)
const carIcon = L.divIcon({
  html: '<img src="../assets/img/cadeira.png" class="car-icon" />',
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

// ---------- Botões / Modais ----------
const btnTracar = el('btnTracar'),
      btnConfirm = el('btnConfirm'),
      btnAjuda = el('btnAjuda');
      closeModalBtn = el('closeModal');

const modal = el('modal'),
      modalProcurando = el('modalProcurando'),
      modalEncontrado = el('modalEncontrado'),
      modalTextoBusca = el('modalTextoBusca'),
      progressFill = el('progressFill'),
      tempoRestante = el('tempoRestante'),
      infoMotorista = el('infoMotorista');

// botão cancelar está dentro do modalEncontrado — buscar seguro
const cancelModalBtn = el('cancelModal');

// ---------- Fechar modal com o "X" ----------
if (closeModalBtn) {
  closeModalBtn.addEventListener('click', () => {
    modal.classList.add('modal-hidden');

    // Caso a animação esteja rodando, pausa
    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = null;
    }

    // Cancela estado se estiver no meio de uma corrida
    corridaCancelada = true;
    toggleCamposViagem(false);
    setButtonState('preRota');
  });
}

// Função global de alerta estilizado
function showAlert(message) {
  const modal = document.getElementById('alertModal');
  const msg = document.getElementById('alertMessage');
  const ok = document.getElementById('alertOk');
  const close = document.getElementById('closeAlert');

  msg.textContent = message;
  modal.classList.remove('hidden');

  const fechar = () => modal.classList.add('hidden');
  ok.onclick = fechar;
  close.onclick = fechar;
}

function ensureCloseButton() {
  let btn = document.getElementById('closeModal');
  if (!btn) return;
  btn.onclick = () => {
    modal.classList.add('modal-hidden');

    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = null;
    }
    corridaCancelada = true;
    toggleCamposViagem(false);
    setButtonState('preRota');
  };
}

// ---------- Funções auxiliares ----------

// Controla visibilidade dos botões conforme estado
function setButtonState(state) {
  // estados: 'preRota', 'rotaTraçada', 'viagemConfirmada', 'motoristaACaminho', 'motoristaChegou', 'emViagem', 'pósViagem'
  btnTracar.classList.toggle('hidden', !(state === 'preRota' && state !== 'rotaTraçada'));
  btnConfirm.classList.toggle('hidden', state !== 'rotaTraçada');
  btnAjuda.classList.toggle('hidden', !(state === 'motoristaChegou' || state === 'emViagem'));
}

// Simples geocoding via Nominatim (OpenStreetMap).
async function geocode(local) {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(local)}`);
  const data = await res.json();
  if (!data.length) throw new Error("Local não encontrado");
  return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
}

// Escolhe modelo com base em necessidades/equipamentos
function escolherModelo() {
  const need = el('need').value.toLowerCase();
  const equip = el('equip').value.toLowerCase();
  if (equip.includes("cadeira") || need.includes("cadeira")) return "Minivan Acessível";
  if (equip.includes("andador") || equip.includes("muleta") || need.includes("animal")) return "SUV Adaptado";
  return "Sedan";
}

// Escolhe o motorista com base em necessidades/equipamentos
function escolherMotorista() {
  const modelo = escolherModelo();
  if (modelo === "Minivan Acessível") return "Carlos S.";
  if (modelo === "SUV Adaptado") return "Ana P.";
  return "João M.";
}

// Apresenta a nota do motorista com base no modelo escolhido
function escolherNotaMotorista() {
  const modelo = escolherModelo();
  if (modelo === "Minivan Acessível") return "4.9 ★";
  if (modelo === "SUV Adaptado") return "4.8 ★";
  return "4.7 ★";
}

// Remove controle L.Routing.control antigo com segurança
function removerControle(ctrl) {
  try {
    if (ctrl && typeof ctrl.remove === 'function') ctrl.remove();
  } catch (e) {
    // ignore
  }
}

// Formata tempo restante para mm:ss
function formatMinuteSecond(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2,'0')}`;
}

// ---------- Evento: Traçar rota (Ver preço) ----------
btnTracar.addEventListener('click', async () => {
  const need = el('need').value;
  const equip = el('equip').value;
  const partidaTxt = el('partida').value.trim();
  const destinoTxt = el('destino').value.trim();

  if (need === "Selecione sua condição")
    return showAlert("Por favor, selecione suas necessidades especiais antes de continuar.");
  if (equip === "Selecione seus equipamentos")
    return showAlert("Por favor, selecione seus equipamentos antes de continuar.");
  if (!partidaTxt || !destinoTxt)
    return showAlert("Preencha partida e destino para continuar.");


  // Limpar rotas anteriores
  removerControle(control);
  control = null;

  try {
    [partidaCoords, destinoCoords] = await Promise.all([geocode(partidaTxt), geocode(destinoTxt)]);
  } catch (err) {
    console.error(err);
    return showAlert("Não foi possível localizar os endereços");
  }

  // Criar novo controle de rota (principal)
  control = L.Routing.control({
    waypoints: [L.latLng(...partidaCoords), L.latLng(...destinoCoords)],
    lineOptions: { styles: [{ color: '#064d22ff', weight: 5 }] },
    routeWhileDragging: false,
    createMarker: () => null,
    addWaypoints: false,
    show: false, // 🔹 desativa o painel de instruções
  })
  .on('routesfound', e => {
    const rota = e.routes[0];
    const distanciaKm = (rota.summary.totalDistance / 1000).toFixed(2);
    const valor = (5 + 2.15 * distanciaKm).toFixed(2);
    el('distancia').textContent = `Distância: ${distanciaKm} km`;
    el('valor').textContent = `Valor estimado: R$ ${valor}`;
    el('resultado').classList.remove('hidden');
    setButtonState('rotaTraçada');

    // garante que o mapa renderize corretamente 
    setTimeout(() => map.invalidateSize(), 250);
  })
  .addTo(map);
});

// ---------- Bloquear / desbloquear campos ----------
function toggleCamposViagem(bloquear) {
  const campos = ['need', 'equip', 'partida', 'destino', 'tipoSolicitacao'];
  campos.forEach(id => {
    const campo = el(id);
    if (campo) campo.disabled = bloquear; // true = bloqueia; false = libera
  });
}

// ---------- Evento: Confirmar viagem ----------
btnConfirm.addEventListener('click', () => {
  corridaCancelada = false; // reset no início de uma nova corrida

  const need = el('need').value;
  const equip = el('equip').value;
  const tipo = el('tipoSolicitacao').value;

  if (need === "Selecione sua condição")
    return showAlert("Por favor, selecione suas necessidades especiais antes de confirmar.");
  if (equip === "Selecione seus equipamentos")
    return showAlert("Por favor, selecione seus equipamentos antes de confirmar.");
  if (!tipo)
    return showAlert("Escolha o tipo de solicitação antes de confirmar.");

  const modelo = escolherModelo();
  const motorista = escolherMotorista();
  const nota = escolherNotaMotorista();
  // tempoBusca em centenas de ms: flexivel simulated 20-59 *100ms -> ~2s-6s; agendar 1.5s
  const tempoBusca = tipo === 'flexivel' ? Math.floor(Math.random() * 40 + 20) : 15;

  // Exibe modal de procurando
  modal.classList.remove('modal-hidden');
  ensureCloseButton();
  modalProcurando.classList.remove('hidden');
  modalEncontrado.classList.add('hidden');
  modalTextoBusca.textContent = `Procurando motorista com veículo: ${modelo}...`;

  setButtonState('viagemConfirmada');
  toggleCamposViagem(true);

  // Se o usuário clicar em cancelar, lidar
  setupCancelHandler();

  // Simula busca (tempoBusca * 100ms)
  setTimeout(() => {
    // Exibe modal de motorista encontrado
    modalProcurando.classList.add('hidden');
    modalEncontrado.classList.remove('hidden');
    infoMotorista.textContent = `${motorista} — ${modelo} — ${nota}`;

    // Depois de curto tempo, fechar modal e iniciar deslocamento do motorista
    setTimeout(() => {
      modal.classList.add('modal-hidden');

      // guaranteed map re-render before anim starts
      setTimeout(() => {
        map.invalidateSize();
        iniciarDeslocamentoMotorista();
      }, 200); // pequeno delay para o DOM atualizar
    }, 1500);
  }, tempoBusca * 100);
});

// ---------- Cancelar ----------
function setupCancelHandler() {
  if (!cancelModalBtn) return;
  
  // remove listeners antigos para evitar duplicações
  cancelModalBtn.replaceWith(cancelModalBtn.cloneNode(true));
  const newCancel = el('cancelModal');

  newCancel.addEventListener('click', () => {
    corridaCancelada = true; // 🔹 marca cancelamento global

    modal.classList.add('modal-hidden');

    // Para qualquer animação em andamento
    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = null;
    }

    // Remove marcador e polylines do mapa
    if (motoristaMarker) {
      try { map.removeLayer(motoristaMarker); } catch(e){}
      motoristaMarker = null;
    }
    if (routePolyline) {
      try { map.removeLayer(routePolyline); } catch(e){}
      routePolyline = null;
    }

    // Remove rotas
    removerControle(driverRouter);
    driverRouter = null;
    toggleCamposViagem(false);

    setButtonState('preRota');
    showAlert('🚫 Corrida cancelada.');
  });
}


// ---------- Inicia deslocamento do motorista até o passageiro ----------
function iniciarDeslocamentoMotorista() {
  // segurança: precisa ter partidaCoords
  if (corridaCancelada) return console.log("❌ Corrida cancelada antes do deslocamento.");

  console.log("→ iniciarDeslocamentoMotorista chamado");
  if (!partidaCoords) return console.warn('Sem coordenadas de partida.');

  // remove rota temporária anterior, se houver
  removerControle(driverRouter);
  driverRouter = null;

  // cria coordenadas aleatórias próximas (300-800m simulado via +/- offsets)
  const latOffset = (Math.random() * 0.008) - 0.004; // ~ +/- 400m
  const lngOffset = (Math.random() * 0.008) - 0.004;
  const motoristaCoords = [partidaCoords[0] + latOffset, partidaCoords[1] + lngOffset];

  // Cria um routing control temporário para motorista -> passageiro para obter percursos reais
  driverRouter = L.Routing.control({
    waypoints: [L.latLng(...motoristaCoords), L.latLng(...partidaCoords)],
    createMarker: () => null,
    lineOptions: { styles: [{ color: '#000000ff', weight: 4 }] },
    routeWhileDragging: false,
    addWaypoints: false,
    show: false, 
    lineOptions: { styles: [{ opacity: 0 }] } // linha invisível, só queremos os pontos
  });

  driverRouter.on('routesfound', e => {
    console.log("→ routesfound motorista -> passageiro");
    console.log("🚗 Rota encontrada", e.routes[0]);
    // Extrai polyline da rota e inicia animação
    routeCoordinates = e.routes[0].coordinates;
    if (!routeCoordinates.length) return console.warn("Sem coordenadas de rota!");

    if (motoristaMarker) motoristaMarker.setLatLng(routeCoordinates[0]);
    else motoristaMarker = L.marker(routeCoordinates[0], { icon: carIcon }).addTo(map);

    if (routePolyline) map.removeLayer(routePolyline);
    routePolyline = L.polyline([routeCoordinates[0]], { color: '#064d22ff', weight: 5 }).addTo(map);

    map.fitBounds(L.latLngBounds(routeCoordinates).pad(0.25));
    animarMotorista(routeCoordinates, 'toPassenger');
  });

  driverRouter.addTo(map);
}

// ---------- Função principal de animação ----------
// coords: array de LatLngs
// fase: 'toPassenger' | 'toDestination'
function animarMotorista(coords, fase) {
  // limpando intervalos anteriores
  if (animationInterval) clearInterval(animationInterval);
  animationElapsed = 0;

  // Remove linhas antigas, se existirem
  if (routeTraveled) map.removeLayer(routeTraveled);
  if (routeRemaining) map.removeLayer(routeRemaining);

  // Cria linha da rota total (restante)
  routeRemaining = L.polyline([coords[0]], { color: '#000301ff', weight: 5 }).addTo(map);

  let idx = 0;         // índice do segmento atual
  let t = 0;           // progresso entre coords[idx] e coords[idx+1] [0..1]

  // parâmetros de tempo (duração total da animação em segundos)
  const totalDurationSec = (fase === 'toPassenger') ? Math.max(10, Math.floor(coords.length / 3)) : Math.max(12, Math.floor(coords.length / 2));
  const intervalMs = 40; // tick
  const stepsTotal = Math.ceil((totalDurationSec * 1000) / intervalMs);

  // controla progresso visual
  progressFill.style.width = '0%';
  setButtonState(fase === 'toPassenger' ? 'motoristaACaminho' : 'emViagem');

  // Função linear interpolation
  function lerp(a, b, t) { return a + (b - a) * t; }

  let steps = 0;
  animationInterval = setInterval(() => {
    if (corridaCancelada) {
      clearInterval(animationInterval);
      animationInterval = null;
      return console.log("⛔ Animação interrompida — corrida cancelada.");
    }

    if (idx >= coords.length - 1) {
      clearInterval(animationInterval);

      // remove linhas restantes
      if (routeRemaining) map.removeLayer(routeRemaining);
      if (routeTraveled) map.removeLayer(routeTraveled);

      animationInterval = null;

      // motorista chegou ao passageiro
      if (fase === 'toPassenger') {
        console.log("✅ Motorista chegou ao passageiro!");
        setButtonState('motoristaChegou');

        // pequena pausa de 1,5s antes de iniciar corrida
        setTimeout(() => {
          iniciarCorrida();
        }, 1500);
      }

      // motorista chegou ao destino
      else if (fase === 'toDestination') {
        console.log("🏁 Corrida finalizada!");
        setButtonState('pósViagem');
        setTimeout(() => finalizarCorrida(), 1000);
      }

      return;
    }

    // progress t across current segment based on steps
    // aqui usamos steps/stepsTotal para mover progressivamente ao longo do total
    const globalProgress = (steps / stepsTotal) * (coords.length - 1);
    idx = Math.min(Math.floor(globalProgress), coords.length - 2);
    t = globalProgress - idx;

    // Interpolação entre ponto idx e idx+1
    const a = coords[idx], b = coords[idx + 1];
    const lat = lerp(a.lat, b.lat, t);
    const lng = lerp(a.lng, b.lng, t);

    // Atualiza marcador e polyline (adiciona o ponto atual como "percorrido")
    if (motoristaMarker) motoristaMarker.setLatLng([lat, lng]);
    if (routeTraveled) routeTraveled.addLatLng([lat, lng]);

    // atualiza a rota restante (parte ainda não percorrida)
    if (routeRemaining) {
      const remaining = coords.slice(idx + 1);
      routeRemaining.setLatLngs(remaining);
    }


    // Move a viewport suavemente (sem "jump")
    map.panTo([lat, lng], { animate: true, duration: 0.5 });

    // Atualiza barra de progresso e tempo restante (estimativa)
    steps++;
    const pct = Math.min(100, Math.round((steps / stepsTotal) * 100));
    progressFill.style.width = `${pct}%`;

    animationElapsed += intervalMs / 1000;
    const restante = Math.max(0, Math.round(totalDurationSec - animationElapsed));
    tempoRestante.textContent = fase === 'toPassenger' ? `Chegada em ${formatMinuteSecond(restante)}` : `Tempo restante ${formatMinuteSecond(restante)}`;

    // segurança para não estourar tempo
    if (steps >= stepsTotal) {
      // mover índice ao fim para encerrar no próximo tick
      idx = coords.length - 1;
    }

  }, intervalMs);
}

// ---------- Iniciar corrida (motorista agora leva passageiro ao destino) ----------
function iniciarCorrida() {
  if (corridaCancelada) return console.log("❌ Corrida cancelada antes de iniciar viagem.");

  // remove rotas antigas para desenhar nova rota
  removerControle(driverRouter);
  driverRouter = null;
  if (routePolyline) { map.removeLayer(routePolyline); routePolyline = null; }
  if (routeTraveled) { map.removeLayer(routeTraveled); routeTraveled = null; }
  if (routeRemaining) { map.removeLayer(routeRemaining); routeRemaining = null; }


  // Garante que control (rota do usuário) esteja removido para não conflitar
  if (control) {
    try { control.remove(); } catch(e) {}
    control = null;
  }

  // Cria controle de rota motorista -> destino para obter a lista de pontos
  const routingToDest = L.Routing.control({
    waypoints: [ L.latLng(...partidaCoords), L.latLng(...destinoCoords) ],
    createMarker: () => null,
    lineOptions: { styles: [{ color: '#064d22ff', weight: 5 }] },
    routeWhileDragging: false,
    addWaypoints: false,
    show: false,
    lineOptions: { styles: [{ opacity: 0 }] }
  });

  routingToDest.on('routesfound', e => {
    // transforma rota em lista de LatLngs
    routeCoordinates = e.routes[0].coordinates;

    // posiciona motorista no início da rota (garantia)
    if (motoristaMarker) motoristaMarker.setLatLng(routeCoordinates[0]);

    // remove polyline velha e cria nova para o trajeto da viagem
    if (routePolyline) map.removeLayer(routePolyline);
    routePolyline = L.polyline([routeCoordinates[0]], { color: '#064d22ff', weight: 5 }).addTo(map);

    // fit bounds para mostrar rota inteira
    const bounds = L.latLngBounds(routeCoordinates);
    map.fitBounds(bounds.pad(0.2));

    // anima motorista na rota para o destino
    animarMotorista(routeCoordinates, 'toDestination');

    // limpa o controle temporário depois de obter a rota
    setTimeout(() => { try { routingToDest.remove(); } catch(e){} }, 500);
  });

  routingToDest.addTo(map);
}

// ---------- Finalizar corrida e mostrar avaliação ----------
function finalizarCorrida() {
  // Mostrar modal com avaliação (reaproveitando modalProcurando área)
  modal.classList.remove('modal-hidden');
  modalEncontrado.classList.add('hidden');

  modalProcurando.innerHTML = `
    <h3 class="text-2xl font-bold text-[#38e07b] mb-2">Viagem concluída!</h3>
    <p class="text-[#9eb7a8] mb-3">Obrigado por usar AccessRide.</p>
    <p class="text-[#9eb7a8] mb-3">Avalie sua experiência:</p>
    <div id="avaliacao" class="flex justify-center gap-2 mb-3">
      ${[1,2,3,4,5].map(n => `<span class="estrela cursor-pointer text-2xl transition-transform hover:scale-125">⭐</span>`).join('')}
    </div>
    <button id="btnEnviarAvaliacao" class="mt-3 py-2 px-4 bg-[#38e07b] text-[#111714] font-bold rounded-lg hover:bg-green-400">Enviar Avaliação</button>
  `;
  modalProcurando.classList.remove('hidden');
  ensureCloseButton();
  setButtonState('pósViagem');
  toggleCamposViagem(false);
  configurarAvaliacao();
}

// ---------- Configurar avaliação (event listeners) ----------
function configurarAvaliacao() {
  const estrelas = document.querySelectorAll('.estrela');
  const btnEnviar = document.getElementById('btnEnviarAvaliacao');
  let avaliacao = 0;

  estrelas.forEach((estrela, index) => {
    estrela.addEventListener('click', () => {
      avaliacao = index + 1;
      estrelas.forEach((e, i) => e.textContent = i < avaliacao ? '🌟' : '⭐');
    });
  });

  btnEnviar.addEventListener('click', () => {
    if (avaliacao === 0) return showAlert("Por favor, selecione uma nota antes de enviar.");
    modalProcurando.innerHTML = `
      <h3 class="text-2xl font-bold text-[#38e07b] mb-2">Obrigado pela avaliação!</h3>
      <p class="text-[#9eb7a8] mb-3">Você deu ${avaliacao} ${avaliacao === 1 ? 'estrela' : 'estrelas'}.</p>
      <p class="text-[#9eb7a8]">A AccessRide agradece seu feedback 💚</p>
    `;
    setTimeout(() => modal.classList.add('modal-hidden'), 2000);
  });
}

// Inicializa estado de botões ao carregar script
setButtonState('preRota');

// Garante tamanho correto do mapa quando a página termina de carregar
window.addEventListener('load', () => setTimeout(() => map.invalidateSize(), 300));

// ---------- Autocomplete de endereços (gratuito via Nominatim) ----------

// Aplica autocomplete a um input específico
function setupAutocomplete(inputId) {
  const input = document.getElementById(inputId);

  // Cria container de sugestões
  const list = document.createElement('div');
  list.className = 'autocomplete-list';
  list.style.position = 'absolute';
  list.style.background = '#29382f';
  list.style.borderRadius = '8px';
  list.style.marginTop = '2px';
  list.style.zIndex = '9999';
  list.style.width = '100%';
  list.style.maxHeight = '180px';
  list.style.overflowY = 'auto';
  list.style.display = 'none';
  input.parentNode.appendChild(list);

  let timeout = null;

  input.addEventListener('input', () => {
    clearTimeout(timeout);
    const query = input.value.trim();
    if (query.length < 3) {
      list.style.display = 'none';
      return;
    }

    // debounce 300ms
    timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`
        );
        const data = await res.json();

        list.innerHTML = '';
        if (!data.length) {
          list.style.display = 'none';
          return;
        }

        data.forEach(item => {
          const addr = item.address;
          
          // Monta um endereço mais limpo e curto
          const parts = [
            addr.road || addr.pedestrian || addr.residential || '',      // Rua
            addr.suburb || addr.neighbourhood || '',                     // Bairro
            addr.city || addr.town || addr.village || addr.state_district || '',  // Cidade
            addr.postcode || ''                                          // CEP
          ].filter(Boolean); // remove vazios
          
          const shortAddress = parts.join(', ');

          const opt = document.createElement('div');
          opt.textContent = shortAddress || item.display_name; // fallback se algo faltar
          opt.style.padding = '8px 10px';
          opt.style.cursor = 'pointer';
          opt.style.color = '#f2f2f2';
          opt.addEventListener('mouseenter', () => {
            opt.style.background = '#38e07b';
            opt.style.color = '#111714';
          });
          opt.addEventListener('mouseleave', () => {
            opt.style.background = '#29382f';
            opt.style.color = '#f2f2f2';
          });
          opt.addEventListener('click', () => {
            input.value = shortAddress || item.display_name;
            list.style.display = 'none';
          });
          list.appendChild(opt);
        });


        list.style.display = 'block';
      } catch (err) {
        console.error('Erro no autocomplete:', err);
        list.style.display = 'none';
      }
    }, 300);
  });

  // Esconde sugestões ao clicar fora
  document.addEventListener('click', e => {
    if (!list.contains(e.target) && e.target !== input) {
      list.style.display = 'none';
    }
  });
}

// Ativa o autocomplete nos dois campos
setupAutocomplete('partida');
setupAutocomplete('destino');