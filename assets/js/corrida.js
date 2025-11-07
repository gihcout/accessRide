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
    routeRemaining = null,       // parte da rota restante
    corridaCancelada = false;    // indica se o usuário cancelou a corrida

// Ícone do carro
const carIcon = L.divIcon({
  html: '<img src="../assets/img/cadeira.png" class="car-icon" />',
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

// ---------- Botões / Modais ----------
const btnTracar = el('btnTracar'),
      btnConfirm = el('btnConfirm'),
      btnAjuda = el('btnAjuda'),
      closeModalBtn = el('closeModal');

const modal = el('modal'),
      modalProcurando = el('modalProcurando'),
      modalEncontrado = el('modalEncontrado'),
      modalTextoBusca = el('modalTextoBusca'),
      progressFill = el('progressFill'),
      tempoRestante = el('tempoRestante'),
      infoMotorista = el('infoMotorista');

const cancelModalBtn = el('cancelModal');

// ---------- Fechar modal com o "X" ----------
if (closeModalBtn) {
  closeModalBtn.addEventListener('click', () => {
    modal.classList.add('modal-hidden');

    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = null;
    }

    corridaCancelada = true;
    toggleCamposViagem(false);
    setButtonState('preRota');
  });
}

// Função global de alerta estilizado
function showAlert(message) {
  const modalAlert = document.getElementById('alertModal');
  const msg = document.getElementById('alertMessage');
  const ok = document.getElementById('alertOk');
  const close = document.getElementById('closeAlert');

  msg.textContent = message;
  modalAlert.classList.remove('hidden');

  const fechar = () => modalAlert.classList.add('hidden');
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

function setButtonState(state) {
  // estados: 'preRota', 'rotaTraçada', 'viagemConfirmada', 'motoristaACaminho', 'motoristaChegou', 'emViagem', 'pósViagem'
  btnTracar.classList.toggle('hidden', !(state === 'preRota' && state !== 'rotaTraçada'));
  btnConfirm.classList.toggle('hidden', state !== 'rotaTraçada');
  btnAjuda.classList.toggle('hidden', !(state === 'motoristaChegou' || state === 'emViagem'));
}

async function geocode(local) {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(local)}`);
  const data = await res.json();
  if (!data.length) throw new Error("Local não encontrado");
  return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
}

function escolherModelo() {
  const need = el('need').value.toLowerCase();
  const equip = el('equip').value.toLowerCase();
  if (equip.includes("cadeira") || need.includes("cadeira")) return "Minivan Acessível";
  if (equip.includes("andador") || equip.includes("muleta") || need.includes("animal")) return "SUV Adaptado";
  return "Sedan";
}

function escolherMotorista() {
  const modelo = escolherModelo();
  if (modelo === "Minivan Acessível") return "Carlos S.";
  if (modelo === "SUV Adaptado") return "Ana P.";
  return "João M.";
}

function escolherNotaMotorista() {
  const modelo = escolherModelo();
  if (modelo === "Minivan Acessível") return "4.9 ★";
  if (modelo === "SUV Adaptado") return "4.8 ★";
  return "4.7 ★";
}

function removerControle(ctrl) {
  try {
    if (ctrl && typeof ctrl.remove === 'function') ctrl.remove();
  } catch (e) {
    // ignore
  }
}

function formatMinuteSecond(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ---------- Evento: Ver preço ----------
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

  removerControle(control);
  control = null;

  try {
    [partidaCoords, destinoCoords] = await Promise.all([geocode(partidaTxt), geocode(destinoTxt)]);
  } catch (err) {
    console.error(err);
    return showAlert("Não foi possível localizar os endereços");
  }

  control = L.Routing.control({
    waypoints: [L.latLng(...partidaCoords), L.latLng(...destinoCoords)],
    lineOptions: { styles: [{ color: '#064d22ff', weight: 5 }] },
    routeWhileDragging: false,
    createMarker: () => null,
    addWaypoints: false,
    show: false,
  })
  .on('routesfound', e => {
    const rota = e.routes[0];
    const distanciaKm = (rota.summary.totalDistance / 1000).toFixed(2);
    const valor = (5 + 2.15 * distanciaKm).toFixed(2);
    el('distancia').textContent = `Distância: ${distanciaKm} km`;
    el('valor').textContent = `Valor estimado: R$ ${valor}`;
    el('resultado').classList.remove('hidden');
    setButtonState('rotaTraçada');
    setTimeout(() => map.invalidateSize(), 250);
  })
  .addTo(map);
});

// ---------- Bloquear / desbloquear campos ----------
function toggleCamposViagem(bloquear) {
  const campos = ['need', 'equip', 'partida', 'destino', 'tipoSolicitacao'];
  campos.forEach(id => {
    const campo = el(id);
    if (campo) campo.disabled = bloquear;
  });
}

// ---------- Evento: Confirmar viagem ----------
btnConfirm.addEventListener('click', () => {
  corridaCancelada = false;

  const need = el('need').value;
  const equip = el('equip').value;
  const tipo = el('tipoSolicitacao').value;

  if (need === "Selecione sua condição")
    return showAlert("Por favor, selecione suas necessidades especiais antes de confirmar.");
  if (equip === "Selecione seus equipamentos")
    return showAlert("Por favor, selecione seus equipamentos antes de confirmar.");
  if (!tipo)
    return showAlert("Escolha o tipo de solicitação antes de confirmar.");

  // ====== [1] Fluxo de agendamento: data e hora ======
  if (tipo === 'agendar') {
    let agendamentoDiv = el('agendamentoContainer');
    if (!agendamentoDiv) {
      agendamentoDiv = document.createElement('div');
      agendamentoDiv.id = 'agendamentoContainer';
      agendamentoDiv.className = 'mt-6';
      agendamentoDiv.innerHTML = `
        <label class="block text-white mb-2">Data e hora da partida</label>
        <input id="dataHoraAgendada" type="datetime-local"
               class="w-full bg-[#29382f] text-white rounded-lg p-3">
      `;
      el('tipoSolicitacao').parentNode.insertAdjacentElement('afterend', agendamentoDiv);
    }

    // if (agendamentoDiv.classList.contains('hidden') || !el('dataHoraAgendada')) {
    //   agendamentoDiv.classList.remove('hidden');
    //   return showAlert("Escolha a data e hora desejadas e clique em Confirmar novamente.");
    // }
    // const dataInput = el('dataHoraAgendada');
    // if (!dataInput.value)
    //   return showAlert("Informe uma data e hora válidas para agendar sua carona.");
    // agendamentoDiv.classList.add('hidden');
    const dataInput = el('dataHoraAgendada');
    agendamentoDiv.classList.remove('hidden');

    // Define o mínimo possível = agora + 3h
    const agora = new Date();
    const min = new Date(agora.getTime() + 3 * 60 * 60 * 1000);
    dataInput.min = min.toISOString().slice(0,16);
    if (!dataInput.value) {
      return showAlert(`Escolha uma data e hora (mínimo: ${min.toLocaleString()}) e confirme novamente.`);
    }

    const agendado = new Date(dataInput.value);
    const diffHoras = (agendado - agora) / (1000 * 60 * 60);

    if (diffHoras < 3) {
      return showAlert("⚠️ O horário agendado deve ser pelo menos 3 horas após o horário atual.");
    }
    agendamentoDiv.classList.add('hidden');
  }

  // ====== [2] Dados comuns ======
  const modelo = escolherModelo();
  const motorista = escolherMotorista();
  const nota = escolherNotaMotorista();
  const tempoBusca = tipo === 'flexivel' ? Math.floor(Math.random() * 40 + 20) : 15;

  modal.classList.remove('modal-hidden');
  ensureCloseButton();
  modalProcurando.classList.remove('hidden');
  modalEncontrado.classList.add('hidden');

  modalTextoBusca.textContent = tipo === 'agendar'
    ? `Buscando motorista disponível para o horário agendado...`
    : `Procurando motorista com veículo: ${modelo}...`;

  setButtonState('viagemConfirmada');
  toggleCamposViagem(true);
  setupCancelHandler();

  // ====== [3] Simulação de busca ======
  setTimeout(() => {
    modalProcurando.classList.add('hidden');
    modalEncontrado.classList.remove('hidden');
    infoMotorista.textContent = `${motorista} — ${modelo} — ${nota}`;

    // ====== [4] Fluxo para corrida agendada ======
    if (tipo === 'agendar') {
      const msgConfirm = document.createElement('p');
      msgConfirm.className = 'mt-2 text-[#9eb7a8] text-sm';
      msgConfirm.textContent = 'Carona confirmada para o horário agendado ✅';
      modalEncontrado.appendChild(msgConfirm);
      const contador = document.createElement('p');
      contador.className = 'mt-2 text-[#38e07b] text-lg font-bold transition-all duration-500';
      modalEncontrado.appendChild(contador);

      const agendado = new Date(el('dataHoraAgendada').value);

      const atualizarContador = () => {
        const agora = new Date();
        const diff = agendado - agora;

        if (diff <= 0) {
          contador.textContent = "Motorista a caminho! Aguarde alguns minutos...";
          contador.style.color = '#38e07b';
          contador.style.animation = 'none';
          clearInterval(intervaloContador);
          setTimeout(() => {
            modal.classList.add('modal-hidden');
            iniciarDeslocamentoMotorista();
          }, 1500);
          return;
        }

        const min = Math.floor(diff / 60000);
        const seg = Math.floor((diff % 60000) / 1000);
        contador.textContent = `⏳ Corrida inicia em ${min}m ${seg < 10 ? '0' + seg : seg}s...`;

        // === Efeitos visuais ===
        contador.style.color = '#38e07b';
        contador.style.animation = 'none';

        if (diff <= 60000) {
          contador.style.color = '#f7e45c';
          contador.style.animation = 'piscarLento 1s infinite';
        }
        if (diff <= 10000) {
          contador.style.color = '#ff4d4d';
          contador.style.animation = 'piscarRapido 0.5s infinite';
        }
      };

      atualizarContador();
      const intervaloContador = setInterval(atualizarContador, 1000);
      return; 
    }

    // ====== [5] Fluxo padrão (corrida flexível) ======
    setTimeout(() => {
      modal.classList.add('modal-hidden');
      setTimeout(() => {
        map.invalidateSize();
        iniciarDeslocamentoMotorista();
      }, 200);
    }, 1500);

  }, tempoBusca * 100);
});


// ---------- Cancelar ----------
function setupCancelHandler() {
  if (!cancelModalBtn) return;
  cancelModalBtn.replaceWith(cancelModalBtn.cloneNode(true));
  const newCancel = el('cancelModal');
  newCancel.addEventListener('click', () => {
    corridaCancelada = true;

    modal.classList.add('modal-hidden');
    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = null;
    }
    if (motoristaMarker) {
      try { map.removeLayer(motoristaMarker); } catch(e){}
      motoristaMarker = null;
    }
    if (routePolyline) {
      try { map.removeLayer(routePolyline); } catch(e){}
      routePolyline = null;
    }
    removerControle(driverRouter);
    driverRouter = null;
    toggleCamposViagem(false);
    setButtonState('preRota');
    showAlert('🚫 Corrida cancelada.');
    setTimeout(() => {
      location.reload();
    }, 1500);
  });
}

// ---------- Inicia deslocamento do motorista até o passageiro ----------
function iniciarDeslocamentoMotorista() {
  removerControle(driverRouter);
  driverRouter = null;

  const latOffset = (Math.random() * 0.008) - 0.004;
  const lngOffset = (Math.random() * 0.008) - 0.004;
  const motoristaCoords = [partidaCoords[0] + latOffset, partidaCoords[1] + lngOffset];

  driverRouter = L.Routing.control({
    waypoints: [L.latLng(...motoristaCoords), L.latLng(...partidaCoords)],
    createMarker: () => null,
    routeWhileDragging: false,
    addWaypoints: false,
    show: false,
    lineOptions: { styles: [{ opacity: 0 }] }
  });

  driverRouter.on('routesfound', e => {
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
function animarMotorista(coords, fase) {
  if (animationInterval) clearInterval(animationInterval);
  animationElapsed = 0;

  if (routeTraveled) map.removeLayer(routeTraveled);
  if (routeRemaining) map.removeLayer(routeRemaining);

  routeRemaining = L.polyline([coords[0]], { color: '#000301ff', weight: 5 }).addTo(map);

  // let idx = 0, t = 0;
  // const totalDurationSec = (fase === 'toPassenger')
  //   ? Math.max(10, Math.floor(coords.length / 3))
  //   : Math.max(12, Math.floor(coords.length / 2));
  // const intervalMs = 40;
  // const stepsTotal = Math.ceil((totalDurationSec * 1000) / intervalMs);

  // progressFill.style.width = '0%';
  // setButtonState(fase === 'toPassenger' ? 'motoristaACaminho' : 'emViagem');
  let idx = 0, t = 0;
  const intervalMs = 40;
  let totalDist = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    totalDist += map.distance(coords[i], coords[i + 1]);
  }
  const velocidade = (fase === 'toPassenger') ? 6.9 : 11.1;
  const totalDurationSec = Math.max(10, totalDist / velocidade);
  const stepsTotal = Math.ceil((totalDurationSec * 1000) / intervalMs);
  progressFill.style.width = '0%';
  setButtonState(fase === 'toPassenger' ? 'motoristaACaminho' : 'emViagem');

  function lerp(a, b, t) { return a + (b - a) * t; }

  let steps = 0;
  animationInterval = setInterval(() => {
    if (corridaCancelada) {
      clearInterval(animationInterval);
      animationInterval = null;
      location.reload();
    }

    if (idx >= coords.length - 1) {
      clearInterval(animationInterval);
      if (routeRemaining) map.removeLayer(routeRemaining);
      if (routeTraveled) map.removeLayer(routeTraveled);
      animationInterval = null;

      if (fase === 'toPassenger') {
        setButtonState('motoristaChegou');
        setTimeout(() => {
          iniciarCorrida();
        }, 1500);
      } else if (fase === 'toDestination') {
        setButtonState('pósViagem');
        setTimeout(() => finalizarCorrida(), 1000);
      }
      return;
    }

    const globalProgress = (steps / stepsTotal) * (coords.length - 1);
    idx = Math.min(Math.floor(globalProgress), coords.length - 2);
    t = globalProgress - idx;
    const a = coords[idx], b = coords[idx + 1];
    const lat = lerp(a.lat, b.lat, t);
    const lng = lerp(a.lng, b.lng, t);

    if (motoristaMarker) motoristaMarker.setLatLng([lat, lng]);
    if (routeTraveled) routeTraveled.addLatLng([lat, lng]);
    if (routeRemaining) {
      const remaining = coords.slice(idx + 1);
      routeRemaining.setLatLngs(remaining);
    }

    map.panTo([lat, lng], { animate: true, duration: 0.5 });

    steps++;
    const pct = Math.min(100, Math.round((steps / stepsTotal) * 100));
    progressFill.style.width = `${pct}%`;
    animationElapsed += intervalMs / 1000;
    const restante = Math.max(0, Math.round(totalDurationSec - animationElapsed));
    tempoRestante.textContent = fase === 'toPassenger'
      ? `Chegada em ${formatMinuteSecond(restante)}`
      : `Tempo restante ${formatMinuteSecond(restante)}`;

    if (steps >= stepsTotal) {
      idx = coords.length - 1;
    }
  }, intervalMs);
}

// ---------- Iniciar corrida ----------
function iniciarCorrida() {
  removerControle(driverRouter);
  driverRouter = null;
  if (routePolyline) { map.removeLayer(routePolyline); routePolyline = null; }
  if (routeTraveled) { map.removeLayer(routeTraveled); routeTraveled = null; }
  if (routeRemaining) { map.removeLayer(routeRemaining); routeRemaining = null; }
  if (control) { try { control.remove(); } catch(e){} control = null; }

  const routingToDest = L.Routing.control({
    waypoints: [ L.latLng(...partidaCoords), L.latLng(...destinoCoords) ],
    createMarker: () => null,
    addWaypoints: false,
    show: false,
    lineOptions: { styles: [{ opacity: 0 }] }
  });

  routingToDest.on('routesfound', e => {
    routeCoordinates = e.routes[0].coordinates;
    if (motoristaMarker) motoristaMarker.setLatLng(routeCoordinates[0]);
    routePolyline = L.polyline([routeCoordinates[0]], { color: '#064d22ff', weight: 5 }).addTo(map);
    map.fitBounds(L.latLngBounds(routeCoordinates).pad(0.2));
    animarMotorista(routeCoordinates, 'toDestination');
    setTimeout(() => { try { routingToDest.remove(); } catch(e){} }, 500);
  });

  routingToDest.addTo(map);
}

// ---------- Finalizar corrida e mostrar avaliação ----------
function finalizarCorrida() {
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

// ---------- Configurar avaliação ----------
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

    if (avaliacao > 2) {
      modalProcurando.innerHTML = `
        <h3 class="text-2xl font-bold text-[#38e07b] mb-2">Obrigado pela avaliação!</h3>
        <p class="text-[#9eb7a8] mb-3">Você deu ${avaliacao} ${avaliacao === 1 ? 'estrela' : 'estrelas'}.</p>
        <p class="text-[#9eb7a8]">A AccessRide agradece seu feedback 💚</p>
      `;
    } 
    else {
      modalProcurando.innerHTML = `
        <h3 class="text-2xl font-bold text-[#ff4d4d] mb-2">Sentimos muito pela sua experiência 😔</h3>
        <p class="text-[#ff9999] mb-3">Você deu ${avaliacao} ${avaliacao === 1 ? 'estrela' : 'estrelas'}.</p>
        <p class="text-[#ff9999]">Entre em contato com nosso suporte para que possamos melhorar:<br>
        <a href="mailto:suporte@accessride.com.br" class="underline text-[#ff4d4d]">suporte@accessride.com.br</a></p>
      `;
    }
    ensureCloseButton();
    const btnFechar = document.getElementById('closeModal');
    if (btnFechar) {
      const recarregarAoFechar = () => {
        location.reload();
        btnFechar.removeEventListener('click', recarregarAoFechar);
      };
      btnFechar.addEventListener('click', recarregarAoFechar);
    }
  });
}
setButtonState('preRota');
window.addEventListener('load', () => setTimeout(() => map.invalidateSize(), 300));

// ---------- Autocomplete de endereços ----------
function setupAutocomplete(inputId) {
  const input = document.getElementById(inputId);
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
          const parts = [
            addr.road || addr.pedestrian || addr.residential || '',
            addr.suburb || addr.neighbourhood || '',
            addr.city || addr.town || addr.village || addr.state_district || '',
            addr.postcode || ''
          ].filter(Boolean);
          const shortAddress = parts.join(', ');
          const opt = document.createElement('div');
          opt.textContent = shortAddress || item.display_name;
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

  document.addEventListener('click', e => {
    if (!list.contains(e.target) && e.target !== input) {
      list.style.display = 'none';
    }
  });
}

setupAutocomplete('partida');
setupAutocomplete('destino');