const el=id=>document.getElementById(id);
const map=L.map('map').setView([-23.55,-46.63],13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);

let partidaCoords, destinoCoords;
let control=null, motoristaMarker=null, routePolyline=null, routeCoordinates=[], animationInterval=null;

const carIcon=L.divIcon({html:"🚗",className:"",iconSize:[30,30],iconAnchor:[15,15]});

const btnTracar=el('btnTracar'), btnConfirm=el('btnConfirm'), btnAjuda=el('btnAjuda');
const modal=el('modal'), modalProcurando=el('modalProcurando'), modalEncontrado=el('modalEncontrado'), modalChegou=el('modalChegou'), modalTextoBusca=el('modalTextoBusca');
const progressFill=el('progressFill'), tempoRestante=el('tempoRestante'), infoMotorista=el('infoMotorista');

async function geocode(local){
    const res=await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(local)}`);
    const data=await res.json();
    if(!data.length) throw new Error("Local não encontrado");
    return [parseFloat(data[0].lat),parseFloat(data[0].lon)];
}

function escolherModelo(){
    const need=el('need').value.toLowerCase();
    const equip=el('equip').value.toLowerCase();
    if(equip.includes("cadeira")||need.includes("cadeira")) return "Minivan Acessível";
    if(equip.includes("andador")||equip.includes("muleta")||need.includes("animal")) return "SUV Adaptado";
    return "Sedan";
}

// ---------- Botões ----------
function setButtonState(state){
    btnTracar.classList.toggle('hidden',state!=='preRota' && state!=='rotaTraçada');
    btnConfirm.classList.toggle('hidden',state!=='rotaTraçada');
    btnAjuda.classList.toggle('hidden',state!=='motoristaChegou');
}

// ---------- Traçar rota ----------
btnTracar.addEventListener('click',async()=>{
    const partidaTxt=el('partida').value,destinoTxt=el('destino').value;
    if(!partidaTxt||!destinoTxt) return alert("Preencha partida e destino");
    [partidaCoords,destinoCoords]=await Promise.all([geocode(partidaTxt),geocode(destinoTxt)]);
    if(control) map.removeControl(control);
    control=L.Routing.control({
    waypoints:[L.latLng(...partidaCoords),L.latLng(...destinoCoords)],
    lineOptions:{styles:[{color:'#38e07b',weight:5}]},
    routeWhileDragging:false,
    createMarker:()=>null
    }).on('routesfound', e=>{
    const rota=e.routes[0];
    const distanciaKm=(rota.summary.totalDistance/1000).toFixed(2);
    const valor=(5+2.15*distanciaKm).toFixed(2);
    el('distancia').textContent=`Distância: ${distanciaKm} km`;
    el('valor').textContent=`Valor estimado: R$ ${valor}`;
    el('resultado').classList.remove('hidden');
    setButtonState('rotaTraçada');
    map.invalidateSize();
    }).addTo(map);
});

// ---------- Confirmar viagem ----------
btnConfirm.addEventListener('click',async()=>{
    const tipo=el('tipoSolicitacao').value;
    if(!tipo) return alert("Escolha tipo de solicitação");
    const modelo=escolherModelo();
    const tempoBusca=tipo==='flexivel'?Math.floor(Math.random()*(60-20+1))+20:15;

    modal.classList.remove('modal-hidden');
    modalProcurando.classList.remove('hidden');
    modalEncontrado.classList.add('hidden');
    modalChegou.classList.add('hidden');
    modalTextoBusca.textContent=`Procurando motorista com veículo: ${modelo}...`;
    setButtonState('viagemConfirmada');

    setTimeout(async()=>{
    modalProcurando.classList.add('hidden');
    modalEncontrado.classList.remove('hidden');
    infoMotorista.textContent=`Carlos S. — ${modelo} — 4.9 ★`;

    const motoristaCoords=[partidaCoords[0]+(Math.random()*0.02-0.01),partidaCoords[1]+(Math.random()*0.02-0.01)];

    const router=L.Routing.control({
        waypoints:[L.latLng(...motoristaCoords),L.latLng(...partidaCoords)],
        createMarker:()=>null,
        lineOptions:{styles:[{color:'#ffaa00',weight:4}]},
        routeWhileDragging:false,
        addWaypoints:false
    }).addTo(map);

    router.on('routesfound', e=>{
        const routeLine=L.Routing.line(e.routes[0]);
        routeCoordinates=routeLine.getLatLngs();

        if(motoristaMarker) map.removeLayer(motoristaMarker);
        motoristaMarker=L.marker(routeCoordinates[0], {icon:carIcon}).addTo(map);

        if(routePolyline) map.removeLayer(routePolyline);
        routePolyline=L.polyline([routeCoordinates[0]], {color:'#ffaa00', weight:5}).addTo(map);

        startDriverAnimation(routeCoordinates,'toPassenger');
    });
    }, tempoBusca*1000);
});

// ---------- Animação motorista ----------
function startDriverAnimation(coords, phase) {
    if (animationInterval) clearInterval(animationInterval);
    let index = 0, progress = 0;
    const totalPoints = coords.length;
    const duration = phase === 'toPassenger' ? 180 : 240; // segundos
    const intervalTime = 40; // ms
    let elapsed = 0;
    progressFill.style.width = '0%';

    function lerp(a, b, t) { return a + (b - a) * t; }
    function angle(a, b) { return Math.atan2(b.lat - a.lat, b.lng - a.lng) * 180 / Math.PI; }

    setButtonState('motoristaA caminho');

    animationInterval = setInterval(() => {
    if (index >= totalPoints - 1) {
        clearInterval(animationInterval);
        if (phase === 'toPassenger') {
        modalEncontrado.classList.add('hidden');
        modalChegou.classList.remove('hidden');
        setButtonState('motoristaChegou');
        // Após alguns segundos, iniciar a viagem para destino
        setTimeout(() => {
            modalChegou.classList.add('hidden');
            startTripToDestination();
        }, 2000);
        } else {
        modal.classList.add('modal-hidden');
        alert('✅ Viagem concluída! Obrigado por usar AccessRide.');
        }
        return;
    }

    progress += intervalTime / ((duration * 1000) / totalPoints);
    if (progress >= 1) { progress = 0; index++; }
    const lat = lerp(coords[index].lat, coords[index + 1].lat, progress);
    const lng = lerp(coords[index].lng, coords[index + 1].lng, progress);

    motoristaMarker.setLatLng([lat, lng]);

    // Rotacionar ícone conforme direção
    const heading = angle(coords[index], coords[index + 1]);
    motoristaMarker.getElement()?.style?.setProperty('transform', `rotate(${heading}deg)`);

    routePolyline.addLatLng([lat, lng]);
    map.panTo([lat, lng], { animate: false });

    elapsed += intervalTime / 1000;
    const remaining = Math.max(0, Math.floor(duration - elapsed));
    tempoRestante.textContent = `Chegada em ${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, '0')}`;
    progressFill.style.width = `${Math.min(100, (elapsed / duration) * 100)}%`;
    }, intervalTime);
}

// ---------- Rota destino ----------
function startTripToDestination(){
    if(control) map.removeControl(control);
    L.Routing.control({
    waypoints:[L.latLng(...partidaCoords),L.latLng(...destinoCoords)],
    lineOptions:{styles:[{color:'#38e07b',weight:5}]},
    routeWhileDragging:false,
    addWaypoints:false,
    createMarker:()=>null
    }).on('routesfound',e=>{
    const routeLine=L.Routing.line(e.routes[0]);
    routeCoordinates=routeLine.getLatLngs();
    if(motoristaMarker) motoristaMarker.setLatLng(routeCoordinates[0]);
    if(routePolyline) map.removeLayer(routePolyline);
    routePolyline=L.polyline([routeCoordinates[0]],{color:'#38e07b',weight:5}).addTo(map);
    startDriverAnimation(routeCoordinates,'toDestination');
    }).addTo(map);
}

// ---------- Cancelar modal ----------
el('cancelModal').addEventListener('click',()=>{
    modal.classList.add('modal-hidden');
    if(animationInterval) clearInterval(animationInterval);
    if(motoristaMarker) { map.removeLayer(motoristaMarker); motoristaMarker=null; }
    if(routePolyline) { map.removeLayer(routePolyline); routePolyline=null; }
    alert('🚫 Corrida cancelada.');
});