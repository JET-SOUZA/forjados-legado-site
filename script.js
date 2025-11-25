// script.js — para index.html
const FOTO_JSON = 'fotos.json';
const EVENT_INDEX = 'event-index.json'; // gerado por admin.html
const MODELS_PATH = './Forjados/Forjados/models'; // sua estrutura atual

const statusEl = () => document.getElementById('status');
const galleryEl = () => document.getElementById('gallery');

let fotos = [];
let descriptorsIndex = []; // [{nome, url, descriptor:Array<number>}]

async function init(){
  statusEl().innerText = 'Carregando fotos e índices...';
  // carregar fotos.json
  try {
    const r = await fetch(FOTO_JSON);
    fotos = await r.json();
  } catch (e) {
    console.error('Erro fotos.json', e);
    statusEl().innerText = 'Erro ao carregar fotos.json';
    return;
  }

  // carregar event-index.json (pode não existir; admin.html cria)
  try {
    const r2 = await fetch(EVENT_INDEX);
    descriptorsIndex = await r2.json();
  } catch (e) {
    console.warn('event-index.json não encontrado ou mal formado. A busca por selfie ainda pode processar imagens em tempo real, porém será mais lenta.');
    descriptorsIndex = [];
  }

  // carregar face-api.js modelos
  statusEl().innerText = 'Carregando modelos de face-api.js...';
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_PATH),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_PATH),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_PATH),
  ]);
  statusEl().innerText = 'Modelos carregados. Pronto para busca por selfie.';

  // exibir inicialmente todas fotos (miniaturas)
  renderGallery(fotos);
}

// render grid de miniaturas
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
    img.alt = it.alt || it.src;
    img.dataset.full = it.src;
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
    document.getElementById('lightbox').style.display = 'none';
  };
}

// distância euclidiana entre descritores
function euclidean(a, b){
  let sum = 0;
  for(let i=0;i<a.length;i++){
    const d = a[i] - b[i];
    sum += d*d;
  }
  return Math.sqrt(sum);
}

// busca por selfie usando event-index.json (rápido) ou comparação direta com fotos
async function handleSelfie(file){
  statusEl().innerText = 'Processando selfie...';
  const img = await faceapi.bufferToImage(file);
  const det = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
  if(!det){
    statusEl().innerText = 'Rosto não detectado na selfie.';
    return;
  }
  const queryDesc = Array.from(det.descriptor);

  // se temos descriptorsIndex (event-index.json), use-o (rápido)
  let matches = [];
  if(descriptorsIndex && descriptorsIndex.length){
    for(const entry of descriptorsIndex){
      const dist = euclidean(queryDesc, entry.descriptor);
      if(dist <= 0.58){ // threshold ajustável (0.55-0.6)
        matches.push({url: entry.url || entry.url, name: entry.nome || entry.name || entry.url, dist});
      }
    }
  } else {
    // fallback: processar fotos.json (mais lento)
    statusEl().innerText = 'Comparando com todas as fotos (pode demorar)...';
    for(const f of fotos){
      try {
        const res = await fetch(f.src);
        const blob = await res.blob();
        const imgF = await faceapi.bufferToImage(blob);
        const detF = await faceapi.detectSingleFace(imgF, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
        if(detF){
          const dist = euclidean(queryDesc, Array.from(detF.descriptor));
          if(dist <= 0.58) matches.push({url: f.src, name: f.alt || f.src, dist});
        }
      } catch (e){
        console.warn('Erro processando foto', f.src, e);
      }
    }
  }

  if(matches.length === 0){
    statusEl().innerText = 'Nenhuma foto correspondente encontrada.';
    renderGallery([]); // limpa resultados
    return;
  }

  // ordenar por distância (melhor primeiro) e mapear para fotos originais
  matches.sort((a,b) => a.dist - b.dist);

  // pegar objetos do fotos.json que correspondam às urls
  const resultados = fotos.filter(f => matches.some(m => (m.url === f.src || m.url === f.url || m.url === f.url_original || m.url === f.url)));
  statusEl().innerText = `Encontradas ${resultados.length} fotos (melhor distância ${matches[0].dist.toFixed(3)})`;
  renderGallery(resultados);
}

// input selfie
document.getElementById('selfie').addEventListener('change', e => {
  const f = e.target.files && e.target.files[0];
  if(f) handleSelfie(f);
});

// iniciar
init();
