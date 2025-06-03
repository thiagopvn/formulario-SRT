const firebaseConfig = {
  apiKey: "AIzaSyBCcBXr4Uakt5Tk7qbvPZFkBb2axylDn5s",
  authDomain: "formulario-srt.firebaseapp.com",
  projectId: "formulario-srt",
  storageBucket: "formulario-srt.firebasestorage.app",
  messagingSenderId: "831395524525",
  appId: "1:831395524525:web:3e235a76f88b682b1a7b24",
  measurementId: "G-LV001X6P2E"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentConfig = null;

const showLoading = () => {
  const overlay = document.getElementById('loadingOverlay');
  overlay.style.display = 'flex';
  overlay.classList.add('animate-fade-in');
};

const hideLoading = () => {
  const overlay = document.getElementById('loadingOverlay');
  overlay.classList.remove('animate-fade-in');
  setTimeout(() => overlay.style.display = 'none', 300);
};

const showToast = (message, type = 'success') => {
  const toast = document.createElement('div');
  toast.className = `flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg transform transition-all duration-300 ${
    type === 'success' 
      ? 'bg-green-500 text-white' 
      : 'bg-red-500 text-white'
  } animate-slide-left`;
  
  const icon = type === 'success' 
    ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />'
    : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />';
  
  toast.innerHTML = `
    <div class="flex-shrink-0">
      <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        ${icon}
      </svg>
    </div>
    <p class="font-medium">${message}</p>
  `;
  
  const container = document.getElementById('toastContainer');
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-x-full');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};

const updateProgress = () => {
  const sections = document.querySelectorAll('.form-section');
  let filledSections = 0;
  
  sections.forEach(section => {
    const inputs = section.querySelectorAll('input[required], select[required], textarea[required]');
    const filled = Array.from(inputs).filter(input => input.value).length;
    if (filled === inputs.length && inputs.length > 0) filledSections++;
  });
  
  const progress = (filledSections / sections.length) * 100;
  const progressBar = document.getElementById('progressFill');
  progressBar.style.width = `${progress}%`;
  
  if (progress === 100) {
    progressBar.classList.add('animate-pulse-glow');
  } else {
    progressBar.classList.remove('animate-pulse-glow');
  }
};

const initTheme = () => {
  const theme = localStorage.getItem('theme') || 'light';
  document.documentElement.classList.toggle('dark', theme === 'dark');
  
  document.getElementById('themeToggle').addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    const particles = window.pJSDom && window.pJSDom[0];
    if (particles) {
      particles.pJS.particles.color.value = isDark ? '#8b5cf6' : '#3b82f6';
      particles.pJS.particles.line_linked.color = isDark ? '#8b5cf6' : '#3b82f6';
      particles.pJS.fn.particlesRefresh();
    }
  });
};

const createInputGroup = (field, prefix = '') => {
  const group = document.createElement('div');
  group.className = 'form-group input-group relative';
  
  const inputId = prefix + field.key;
  const hasFloatingLabel = field.type !== 'select' && field.type !== 'textarea';
  
  let input;
  
  if (field.type === 'select' && field.options) {
    input = document.createElement('select');
    input.className = 'w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all appearance-none cursor-pointer';
    
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Selecione...';
    input.appendChild(defaultOption);
    
    field.options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      input.appendChild(option);
    });
  } else if (field.type === 'textarea') {
    input = document.createElement('textarea');
    input.rows = 3;
    input.className = 'w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all resize-none';
  } else {
    input = document.createElement('input');
    input.type = field.type;
    input.className = 'w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all peer';
    if (hasFloatingLabel) input.placeholder = ' ';
    if (field.min !== undefined) input.min = field.min;
    if (field.max !== undefined) input.max = field.max;
    if (field.pattern) input.pattern = field.pattern;
  }
  
  input.id = inputId;
  input.name = inputId;
  if (field.required) input.required = true;
  
  input.addEventListener('input', () => {
    updateProgress();
    if (input.value && !input.classList.contains('border-green-500')) {
      input.classList.add('border-green-500', 'dark:border-green-400');
      setTimeout(() => {
        input.classList.remove('border-green-500', 'dark:border-green-400');
      }, 2000);
    }
  });
  
  input.addEventListener('focus', () => {
    group.classList.add('scale-105');
  });
  
  input.addEventListener('blur', () => {
    group.classList.remove('scale-105');
  });
  
  group.appendChild(input);
  
  const label = document.createElement('label');
  label.textContent = field.label + (field.required ? ' *' : '');
  label.setAttribute('for', inputId);
  
  if (hasFloatingLabel) {
    label.className = 'floating-label absolute left-4 top-3 text-gray-500 dark:text-gray-400 pointer-events-none transition-all';
  } else {
    label.className = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2';
    group.insertBefore(label, input);
  }
  
  if (hasFloatingLabel) {
    group.appendChild(label);
  }
  
  if (field.type === 'select') {
    const chevron = document.createElement('div');
    chevron.className = 'absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400';
    chevron.innerHTML = '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>';
    group.appendChild(chevron);
  }
  
  return group;
};

const renderFormFields = () => {
  if (currentConfig.municipio) {
    const municipioGrid = document.querySelector('#municipioFields .grid');
    currentConfig.municipio.forEach((field, index) => {
      const fieldGroup = createInputGroup(field);
      fieldGroup.style.animationDelay = `${index * 50}ms`;
      fieldGroup.classList.add('animate-fade-in');
      municipioGrid.appendChild(fieldGroup);
    });
  }
  
  if (currentConfig.general) {
    const generalGrid = document.querySelector('#generalFields .grid');
    currentConfig.general.forEach((field, index) => {
      const fieldGroup = createInputGroup(field);
      fieldGroup.style.animationDelay = `${index * 50}ms`;
      fieldGroup.classList.add('animate-fade-in');
      generalGrid.appendChild(fieldGroup);
    });
  }
  
  if (currentConfig.residence) {
    const residenceGrid = document.querySelector('#residenceFields .grid');
    currentConfig.residence.forEach((field, index) => {
      const fieldGroup = createInputGroup(field);
      fieldGroup.style.animationDelay = `${index * 50}ms`;
      fieldGroup.classList.add('animate-fade-in');
      residenceGrid.appendChild(fieldGroup);
    });
  }
  
  if (currentConfig.caregivers) {
    const caregiverGrid = document.querySelector('#caregiverFields .grid');
    currentConfig.caregivers.forEach((field, index) => {
      const fieldGroup = createInputGroup(field);
      fieldGroup.style.animationDelay = `${index * 50}ms`;
      fieldGroup.classList.add('animate-fade-in');
      caregiverGrid.appendChild(fieldGroup);
    });
  }
};

const updateResidentBlocks = () => {
  const count = parseInt(document.getElementById('numMoradores').value) || 0;
  const container = document.getElementById('residentsContainer');
  
  const currentBlocks = container.children.length;
  
  if (count > currentBlocks) {
    for (let i = currentBlocks + 1; i <= count; i++) {
      const block = document.createElement('div');
      block.className = 'bg-white dark:bg-gray-700 rounded-xl p-6 shadow-lg border-2 border-gray-200 dark:border-gray-600 relative overflow-hidden group hover-lift animate-slide-up';
      block.style.animationDelay = `${(i - currentBlocks - 1) * 100}ms`;
      
      const accentBar = document.createElement('div');
      accentBar.className = 'absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-600 transition-all group-hover:w-2';
      block.appendChild(accentBar);
      
      const header = document.createElement('h3');
      header.className = 'text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2';
      header.innerHTML = `
        <span class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">${i}</span>
        Morador ${i}
      `;
      block.appendChild(header);
      
      const grid = document.createElement('div');
      grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
      
      currentConfig.residentFields.forEach((field, index) => {
        const fieldGroup = createInputGroup(field, `${field.key}_${i}_`);
        fieldGroup.style.animationDelay = `${index * 30}ms`;
        fieldGroup.classList.add('animate-fade-in');
        grid.appendChild(fieldGroup);
      });
      
      block.appendChild(grid);
      container.appendChild(block);
    }
  } else if (count < currentBlocks) {
    while (container.children.length > count) {
      const lastChild = container.lastElementChild;
      lastChild.classList.add('animate-fade-out');
      setTimeout(() => lastChild.remove(), 300);
    }
  }
  
  updateProgress();
};

const updateVagasDisponiveis = () => {
  const total = parseInt(document.getElementById('vagasTotais').value) || 0;
  const ocupadas = parseInt(document.getElementById('vagasOcupadas').value) || 0;
  const disponiveis = Math.max(0, total - ocupadas);
  document.getElementById('vagasDisponiveis').value = disponiveis;
  
  const disponiveisCard = document.getElementById('vagasDisponiveis').closest('.group');
  if (disponiveis === 0) {
    disponiveisCard.classList.add('animate-pulse');
  } else {
    disponiveisCard.classList.remove('animate-pulse');
  }
};

const clearForm = () => {
  if (confirm('Tem certeza que deseja limpar todos os dados do formulário?')) {
    document.getElementById('srtForm').reset();
    document.getElementById('residentsContainer').innerHTML = '';
    updateProgress();
    
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.classList.add('animate-shake');
      setTimeout(() => input.classList.remove('animate-shake'), 500);
    });
    
    showToast('Formulário limpo com sucesso!');
  }
};

const validateForm = () => {
  const numMoradores = parseInt(document.getElementById('numMoradores').value) || 0;
  const vagasOcupadas = parseInt(document.getElementById('vagasOcupadas').value) || 0;
  
  if (numMoradores !== vagasOcupadas) {
    const moradoresInput = document.getElementById('numMoradores');
    const vagasInput = document.getElementById('vagasOcupadas');
    
    [moradoresInput, vagasInput].forEach(input => {
      input.classList.add('border-red-500', 'animate-shake');
      setTimeout(() => {
        input.classList.remove('border-red-500', 'animate-shake');
      }, 1000);
    });
    
    showToast('O número de moradores deve ser igual ao número de vagas ocupadas.', 'error');
    return false;
  }
  
  return true;
};

const submitForm = async (event) => {
  event.preventDefault();
  
  if (!validateForm()) return;
  
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
    <span>Enviando...</span>
  `;
  
  showLoading();
  
  try {
    const houseData = {
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: 'active'
    };
    
    document.querySelectorAll('#municipioFields input, #municipioFields select, #municipioFields textarea').forEach(field => {
      if (field.value) houseData[field.id] = field.value;
    });
    
    document.querySelectorAll('#generalFields input, #generalFields select, #generalFields textarea').forEach(field => {
      if (field.value) houseData[field.id] = field.value;
    });
    
    document.querySelectorAll('#residenceFields input, #residenceFields select, #residenceFields textarea').forEach(field => {
      if (field.value) houseData[field.id] = field.value;
    });
    
    document.querySelectorAll('#caregiverFields input, #caregiverFields select, #caregiverFields textarea').forEach(field => {
      if (field.value) houseData[field.id] = field.value;
    });
    
    houseData.totalMoradores = document.getElementById('totalResidents').value;
    houseData.vagasTotais = document.getElementById('vagasTotais').value;
    houseData.vagasOcupadas = document.getElementById('vagasOcupadas').value;
    houseData.vagasDisponiveis = document.getElementById('vagasDisponiveis').value;
    
    const count = parseInt(document.getElementById('numMoradores').value) || 0;
    houseData.residents = [];
    
    for (let i = 1; i <= count; i++) {
      const resident = {};
      currentConfig.residentFields.forEach(field => {
        const element = document.getElementById(`${field.key}_${i}_${field.key}`);
        if (element && element.value) {
          resident[field.key] = element.value;
        }
      });
      houseData.residents.push(resident);
    }
    
    await db.collection('houses').add(houseData);
    
    showToast('Dados salvos com sucesso!');
    
    const celebration = document.createElement('div');
    celebration.className = 'fixed inset-0 pointer-events-none z-50';
    celebration.innerHTML = `
      <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <svg class="w-32 h-32 text-green-500 animate-bounce-in" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    `;
    document.body.appendChild(celebration);
    
    setTimeout(() => {
      celebration.remove();
      if (confirm('Deseja cadastrar outra residência?')) {
        clearForm();
      } else {
        window.location.href = 'admin.html';
      }
    }, 2000);
    
  } catch (error) {
    console.error('Erro ao salvar:', error);
    showToast('Erro ao salvar dados. Tente novamente.', 'error');
  } finally {
    hideLoading();
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Enviar Dados
    `;
  }
};

const getDefaultConfig = () => ({
  municipio: [
    { key: "regiaoSaude", label: "Região de Saúde", type: "text", required: true },
    { key: "municipio", label: "Município", type: "text", required: true },
    { key: "coordenacaoSaudeMental", label: "Coordenação do Programa de Saúde Mental", type: "text", required: true },
    { key: "responsavelPreenchimento", label: "Responsável pelo preenchimento do formulário", type: "text", required: true },
    { key: "telefoneResponsavelPreenchimento", label: "Telefone do responsável pelo preenchimento", type: "tel", required: true },
    { key: "emailResponsavelPreenchimento", label: "E-mail do responsável pelo preenchimento", type: "email", required: true },
    { key: "dataPreenchimentoMunicipio", label: "Data do preenchimento", type: "date", required: true },
    { key: "capsVinculadaSRT", label: "CAPS em que a SRT está vinculada", type: "text", required: true },
    { key: "cnesCapsVinculada", label: "CNES do CAPS", type: "text", required: true }
  ],
  general: [
    { key: "dataPreenchimento", label: "Data do Preenchimento", type: "date", required: true },
    { key: "responsavelNome", label: "Nome do Responsável", type: "text", required: true },
    { key: "responsavelCargo", label: "Cargo do Responsável", type: "text", required: true },
    { key: "contatoResponsavel", label: "Contato do Responsável", type: "tel", required: true },
    { key: "nomeCaps", label: "Nome do CAPS Vinculado", type: "text", required: true },
    { key: "cnesCaps", label: "CNES do CAPS", type: "text", required: true },
    { key: "nomeResidencia", label: "Nome da Residência Terapêutica", type: "text", required: true },
    { key: "tipoSRT", label: "Tipo de SRT", type: "select", options: ["Tipo I", "Tipo II"], required: true },
    { key: "esferaGestao", label: "Esfera de Gestão Pública", type: "select", options: ["Municipal", "Estadual", "Federal"], required: true },
    { key: "situacaoHabilitacao", label: "Situação da Habilitação", type: "select", options: ["Habilitada", "Em processo", "Não habilitada"], required: true },
    { key: "numeroPortaria", label: "Número da Portaria", type: "text" },
    { key: "dataPortaria", label: "Data da Portaria", type: "date" },
    { key: "dataInauguracao", label: "Data de Inauguração", type: "date", required: true }
  ],
  residence: [
    { key: "logradouro", label: "Logradouro", type: "text", required: true },
    { key: "numero", label: "Número", type: "text", required: true },
    { key: "complemento", label: "Complemento", type: "text" },
    { key: "bairro", label: "Bairro", type: "text", required: true },
    { key: "cep", label: "CEP", type: "text", required: true, pattern: "\\d{5}-?\\d{3}" },
    { key: "municipio", label: "Município", type: "text", required: true },
    { key: "uf", label: "UF", type: "select", options: ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"], required: true },
    { key: "localizacao", label: "Localização", type: "select", options: ["Urbana", "Rural"], required: true },
    { key: "quartos", label: "Quantidade de Quartos", type: "number", required: true, min: 0 },
    { key: "salas", label: "Quantidade de Salas", type: "number", required: true, min: 0 },
    { key: "cozinhas", label: "Quantidade de Cozinhas", type: "number", required: true, min: 0 },
    { key: "banheiros", label: "Quantidade de Banheiros", type: "number", required: true, min: 0 },
    { key: "varanda", label: "Quantidade de Varandas", type: "number", min: 0 },
    { key: "lavanderia", label: "Quantidade de Lavanderias", type: "number", min: 0 },
    { key: "despensa", label: "Quantidade de Despensas", type: "number", min: 0 },
    { key: "outros", label: "Outros cômodos", type: "text" }
  ],
  caregivers: [
    { key: "totalProfissionais", label: "Total de Profissionais", type: "number", required: true, min: 0 },
    { key: "totalCuidadores", label: "Total de Cuidadores", type: "number", required: true, min: 0 },
    { key: "totalTecnicos", label: "Total de Técnicos", type: "number", required: true, min: 0 },
    { key: "totalEnfermeiros", label: "Total de Enfermeiros", type: "number", required: true, min: 0 },
    { key: "totalOutros", label: "Total de Outros", type: "number", min: 0 },
    { key: "escalaTrabalho", label: "Escala de Trabalho", type: "textarea", required: true },
    { key: "relacaoCuidadorMorador", label: "Relação Cuidador/Morador", type: "text", required: true },
    { key: "cuidadoresPorTurno", label: "Número de Cuidadores por Turno", type: "number", required: true, min: 1 },
    { key: "participaEducacao", label: "Participa de Educação Permanente?", type: "select", options: ["Sim", "Não"], required: true },
    { key: "quemPromoveEducacao", label: "Se sim, promovido por quem/frequência/temas", type: "textarea" },
    { key: "reunioesRegulares", label: "Reuniões de equipe regulares?", type: "select", options: ["Sim", "Não"], required: true }
  ],
  residentFields: [
    { key: "nomeCompleto", label: "Nome completo", type: "text", required: true },
    { key: "nomeSocial", label: "Nome social", type: "text" },
    { key: "dataNascimento", label: "Data de Nascimento", type: "date", required: true },
    { key: "idade", label: "Idade", type: "number", required: true, min: 0, max: 120 },
    { key: "instituicaoOrigem", label: "Instituição psiquiátrica de origem", type: "text", required: true },
    { key: "cnesOrigem", label: "CNES da Instituição de origem", type: "text" },
    { key: "tempoInternacao", label: "Tempo de internação (anos)", type: "number", required: true, min: 0 },
    { key: "racaCor", label: "Raça/Cor", type: "select", options: ["Branca", "Preta", "Parda", "Amarela", "Indígena", "Não declarada"], required: true },
    { key: "generoNascimento", label: "Sexo biológico", type: "select", options: ["Masculino", "Feminino"], required: true },
    { key: "identidadeGenero", label: "Identidade de gênero", type: "select", options: ["Homem cis", "Mulher cis", "Homem trans", "Mulher trans", "Não-binário", "Outro"] },
    { key: "origemTerritorial", label: "Origem territorial", type: "text", required: true },
    { key: "vinculoMunicipio", label: "Vínculo com o município atual", type: "text" },
    { key: "participaPVC", label: "Participa do Programa de Volta para Casa?", type: "select", options: ["Sim", "Não"], required: true },
    { key: "vinculoFamiliar", label: "Possui vínculo familiar ativo?", type: "select", options: ["Sim", "Não"], required: true },
    { key: "descricaoVinculo", label: "Se sim, descreva o vínculo", type: "textarea" },
    { key: "frequenciaCaps", label: "Frequência no CAPS", type: "select", options: ["Diária", "Semanal", "Quinzenal", "Mensal", "Não frequenta"], required: true },
    { key: "frequenciaUBS", label: "Frequência na UBS", type: "select", options: ["Regular", "Esporádica", "Não frequenta"], required: true },
    { key: "escola", label: "Frequenta instituição de ensino?", type: "select", options: ["Sim", "Não"], required: true },
    { key: "qualEscola", label: "Se sim, qual?", type: "text" },
    { key: "crasCreas", label: "Frequenta CRAS/CREAS?", type: "select", options: ["Sim", "Não"], required: true }
  ]
});

const initializeApp = async () => {
  showLoading();
  initTheme();
  
  try {
    const configRef = db.collection('config').doc('srt');
    const configSnap = await configRef.get();
    
    if (configSnap.exists) {
      currentConfig = configSnap.data();
    } else {
      currentConfig = getDefaultConfig();
      await configRef.set(currentConfig);
    }
    
    renderFormFields();
    
    document.getElementById('numMoradores').addEventListener('change', updateResidentBlocks);
    document.getElementById('vagasOcupadas').addEventListener('input', updateVagasDisponiveis);
    document.getElementById('vagasTotais').addEventListener('input', updateVagasDisponiveis);
    document.getElementById('clearBtn').addEventListener('click', clearForm);
    document.getElementById('srtForm').addEventListener('submit', submitForm);
    
    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById('numMoradores');
        const current = parseInt(input.value) || 0;
        const action = btn.dataset.action;
        
        if (action === 'plus' && current < 20) {
          input.value = current + 1;
          btn.classList.add('animate-bounce');
        } else if (action === 'minus' && current > 0) {
          input.value = current - 1;
          btn.classList.add('animate-bounce');
        }
        
        setTimeout(() => btn.classList.remove('animate-bounce'), 500);
        input.dispatchEvent(new Event('change'));
      });
    });
    
    document.querySelectorAll('input, select, textarea').forEach(element => {
      element.addEventListener('input', updateProgress);
    });
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.form-section').forEach(section => {
      observer.observe(section);
    });
    
  } catch (error) {
    console.error('Erro ao inicializar:', error);
    showToast('Erro ao carregar configurações', 'error');
  } finally {
    hideLoading();
  }
};

window.addEventListener('DOMContentLoaded', initializeApp);