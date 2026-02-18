const API = '';
let questionnaire = null;
let currentStep = 0;
let formData = {};

function apiFetch(url, opts = {}) {
  return fetch(url, { ...opts, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

async function init() {
  try {
    const token = window._authToken || localStorage.getItem('sv_token') || '';
    console.log('[app] init, token:', token.substring(0, 10));
    const res = await apiFetch(`${API}/api/questionnaire`);
    if (!res.ok) {
      const err = await res.text();
      console.error('[app] questionnaire failed:', res.status, err);
      document.getElementById('formContainer').innerHTML = '<div style="padding:20px;color:#e53e3e;text-align:center"><p>Erro ao carregar questionário</p><p style="font-size:.8rem;color:#666;margin-top:8px">Status: '+res.status+'</p><button class="btn btn-primary" onclick="init()" style="margin-top:12px">Tentar novamente</button></div>';
      return;
    }
    questionnaire = await res.json();
    console.log('[app] questionnaire loaded:', questionnaire?.steps?.length, 'steps');
    renderProgress();
    renderStep(0);
  } catch(e) {
    console.error('[app] init error:', e);
    document.getElementById('formContainer').innerHTML = '<div style="padding:20px;color:#e53e3e;text-align:center"><p>Erro de conexão</p><button class="btn btn-primary" onclick="init()" style="margin-top:12px">Tentar novamente</button></div>';
  }
}

function renderProgress() {
  const container = document.getElementById('progressSteps');
  container.innerHTML = questionnaire.steps.map((s, i) =>
    `<span class="progress-step ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'completed' : ''}">${s.title}</span>`
  ).join('');
  
  const fill = document.getElementById('progressFill');
  fill.style.width = `${((currentStep + 1) / questionnaire.steps.length) * 100}%`;
}

function renderStep(idx) {
  currentStep = idx;
  const step = questionnaire.steps[idx];
  const container = document.getElementById('formContainer');
  
  let html = `<h2 class="step-title">${step.title}</h2>`;
  
  for (const field of step.fields) {
    const value = formData[field.id] || '';
    const req = field.required ? '<span class="required">*</span>' : '';
    
    html += `<div class="field-group">`;
    html += `<label for="${field.id}">${field.label}${req}</label>`;
    
    if (field.type === 'select') {
      html += `<select id="${field.id}" onchange="saveField('${field.id}', this.value)" ${field.required ? 'required' : ''}>`;
      html += `<option value="">Selecione...</option>`;
      for (const opt of field.options) {
        html += `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>`;
      }
      html += `</select>`;
    } else if (field.type === 'textarea') {
      html += `<textarea id="${field.id}" oninput="saveField('${field.id}', this.value)" placeholder="Descreva em detalhes..." ${field.required ? 'required' : ''}>${value}</textarea>`;
    } else {
      html += `<input type="${field.type}" id="${field.id}" value="${value}" oninput="saveField('${field.id}', this.value)" ${field.required ? 'required' : ''} placeholder="${field.type === 'number' ? '0,00' : ''}">`;
    }
    
    html += `</div>`;
  }
  
  container.innerHTML = html;
  renderProgress();
  updateNav();
}

function saveField(id, value) {
  formData[id] = value;
}

function validateStep() {
  const step = questionnaire.steps[currentStep];
  for (const field of step.fields) {
    if (field.required && !formData[field.id]) {
      const el = document.getElementById(field.id);
      el.focus();
      el.style.borderColor = '#e53e3e';
      setTimeout(() => el.style.borderColor = '', 2000);
      return false;
    }
  }
  return true;
}

function updateNav() {
  const isLast = currentStep === questionnaire.steps.length - 1;
  document.getElementById('prevBtn').disabled = currentStep === 0;
  document.getElementById('nextBtn').style.display = isLast ? 'none' : '';
  document.getElementById('generateBtn').style.display = isLast ? '' : 'none';
}

function nextStep() {
  if (!validateStep()) return;
  if (currentStep < questionnaire.steps.length - 1) {
    renderStep(currentStep + 1);
  }
}

function prevStep() {
  if (currentStep > 0) {
    renderStep(currentStep - 1);
  }
}

async function generate() {
  if (!validateStep()) return;
  
  document.getElementById('formContainer').style.display = 'none';
  document.querySelector('.nav-buttons').style.display = 'none';
  document.querySelector('.progress-bar').style.display = 'none';
  document.getElementById('loading').style.display = 'block';
  
  try {
    const res = await apiFetch(`${API}/api/stream`, {
      method: 'POST',
      credentials: "same-origin", headers: {"Content-Type":"application/json"},
      body: JSON.stringify(formData)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // Show result area with streaming content
    document.getElementById('loading').style.display = 'none';
    document.getElementById('result').style.display = 'block';
    document.getElementById('result').scrollIntoView({ behavior: 'smooth' });
    
    const content = document.getElementById('resultContent');
    const sources = document.getElementById('resultSources');
    content.innerHTML = '<p class="streaming-cursor">Gerando parecer...</p>';
    
    let fullText = '';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line
      
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          
          if (data.type === 'analysis') {
            if (data.sources?.length) {
              sources.innerHTML = `<strong>📚 Fontes:</strong> ${data.sources.join(' • ')}`;
            }
            lastResult = { opinion: '', sources: data.sources || [], formData, generatedAt: new Date().toISOString(), treatyAnalysis: data.treatyAnalysis };
          }
          
          if (data.token) {
            fullText += data.token;
            content.innerHTML = formatOpinion(fullText) + '<span class="streaming-cursor">▊</span>';
            content.scrollTop = content.scrollHeight;
          }
          
          if (data.done || data.type === 'complete') {
            content.innerHTML = formatOpinion(fullText || data.opinion || '');
          }
        } catch {}
      }
    }
    
    if (fullText) {
      content.innerHTML = formatOpinion(fullText);
      if (lastResult) lastResult.opinion = fullText;
      else lastResult = { opinion: fullText, sources: [], formData, generatedAt: new Date().toISOString() };
    }
    
  } catch (e) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('formContainer').style.display = 'block';
    document.querySelector('.nav-buttons').style.display = 'flex';
    document.querySelector('.progress-bar').style.display = 'block';
    alert(`Erro ao gerar parecer: ${e.message}`);
  }
}

function formatOpinion(text) {
  // Basic markdown-like formatting
  return text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '• $1')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

function copyResult() {
  const text = document.getElementById('resultContent').innerText;
  navigator.clipboard.writeText(text).then(() => {
    alert('Parecer copiado!');
  });
}

function printResult() {
  window.print();
}

let lastResult = null;

async function downloadPDF() {
  if (!lastResult) return alert('Nenhum parecer gerado ainda.');
  try {
    const res = await apiFetch(`${API}/api/pdf`, {
      method: 'POST',
      credentials: "same-origin", headers: {"Content-Type":"application/json"},
      body: JSON.stringify(lastResult)
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parecer-${(formData.client_name || 'cliente').replace(/\s+/g, '-').toLowerCase()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert('Erro ao gerar PDF: ' + e.message);
  }
}

function newConsultation() {
  formData = {};
  currentStep = 0;
  document.getElementById('result').style.display = 'none';
  document.getElementById('formContainer').style.display = 'block';
  document.querySelector('.nav-buttons').style.display = 'flex';
  document.querySelector('.progress-bar').style.display = 'block';
  renderStep(0);
}

// Check session after app.js is loaded (init is now defined)
if (typeof window._checkSession === 'function') window._checkSession();
