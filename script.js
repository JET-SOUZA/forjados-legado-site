// script.js — versão corrigida para sua estrutura REAL no GitHub

// caminhos corretos
const FOTO_JSON = './fotos.json';
const EVENT_INDEX = './event-index.json';     // pode nem existir ainda, tudo bem
const MODELS_PATH = './models';               // seus modelos estão na pasta models/

const statusEl = () => document.getElementById('status');
const galleryEl = () => document.getElementById('gallery');

let fotos = [];
let descriptorsIndex = [];

// ==============================================
// INICIALIZAÇÃO
// ==============================================
async function init(){
  statusEl().innerText = 'Carregando fotos...';

  // carregar fotos.json
  try {
    const r = await fetch(FOTO_JSON);
    fotos = await r.json();
  } catch (e) {
    console.error('Erro fotos.json', e);
    statusEl().innerText = 'Erro ao carregar fotos.json';
    return;
  }

  // carregar event-index.json (opcional)
  try {
    const r2 = await fetch(EVENT_INDEX);
    descriptorsIndex = await r2.json();
  } catch (e) {
    console.warn('event-index.json não encontrado. (Busca lenta ativada)');
    descriptorsIndex = [];
  }

  // carregar modelos face-api.js
  statusEl().innerText = 'Carregando modelos...';
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_PATH),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_PATH),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_PATH),
  ]);

  statusEl().innerText = 'Modelos carregados. Pronto.';

  // mostrar galeria inicial
  renderGallery(fotos);
}

// ==============================================
// GALERIA
// ==============================================
function renderGallery(items){
  const g = galleryEl();
  g.innerHTML = '';

  if(!items || items.length === 0){
    g.innerHTML = '<div style="color:#ccc">Nenhuma foto encontrada.</div>';
    return;
  }

  items.forEach(it => {
    const wrap = document.createElement('div');
    wrap.className = 'thumb-wrap';

    const img = document.createElement('img');
    img.loading = 'lazy';
    img.src = it.thumb || it.src;
    img.dataset.full = it.src;
    img.alt = it.alt;

    wrap.appendChild(img);
    g.appendChild(wrap);
  });

  // lightbox
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lb-img');
  const lbDownload = document.getElementById('lb-download');

  g.onclick = (e) => {
    if(e.target && e.target.tagName === 'IMG'){
      const full = e.target.dataset.full;
      lbImg.src = full;
      lbDownload.href = full;
      lb.style.display = 'flex';
    }
  };

  document.getElementById('closeLb').onclick = () => {
    lb.style.display = 'none';
  };
}

// ==============================================
// DISTÂNCIA FACE MATCH
// ==============================================
function euclidean(a, b){
  let sum = 0;
  for(let i=0;i<a.length;i++){
    const d = a[i] - b[i];
    sum += d*d;
  }
  return Math.sqrt(sum);
}

// ==============================================
// BUSCAR POR SELFIE
// ==============================================
async function handleSelfie(file){
  statusEl().innerText = 'Processando selfie...';

  const img = await faceapi.bufferToImage(file);
  const det = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

  if(!det){
    statusEl().innerText = 'Rosto não detectado.';
    return;
  }

  const query = Array.from(det.descriptor);
  let matches = [];

  if(descriptorsIndex.length){
    // modo rápido
    for(const f of descriptorsIndex){
      const dist = euclidean(query, f.descriptor);
      if(dist <= 0.58) matches.push({url: f.url, dist});
    }
  } else {
    // fallback: comparar uma por uma (lento)
    statusEl().innerText = 'Comparando com todas as fotos (lento)...';
    for(const f of fotos){
      try {
        const blob = await (await fetch(f.src)).blob();
        const imgF = await faceapi.bufferToImage(blob);
        const detF = await faceapi.detectSingleFace(imgF, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

        if(detF){
          const dist = euclidean(query, Array.from(detF.descriptor));
          if(dist <= 0.58) matches.push({url: f.src, dist});
        }
      }catch(e){}
    }
  }

  if(matches.length === 0){
    statusEl().innerText = 'Nenhuma foto encontrada.';
    renderGallery([]);
    return;
  }

  matches.sort((a,b)=>a.dist-b.dist);

  const results = fotos.filter(f => matches.some(m => m.url === f.src));

  statusEl().innerText = `Encontradas ${results.length} fotos`;
  renderGallery(results);
}

// input selfie
document.getElementById('selfie').addEventListener('change', e => {
  if(e.target.files.length) handleSelfie(e.target.files[0]);
});

// iniciar
init();
