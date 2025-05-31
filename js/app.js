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

const showLoading = () => document.getElementById('loadingOverlay').classList.add('show');
const hideLoading = () => document.getElementById('loadingOverlay').classList.remove('show');

const showToast = (message, type = 'success') => {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <svg class="toast-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
      ${type === 'success' 
        ? '<path d="M9 11l3 3L22 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' 
        : '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>'}
    </svg>
    <span>${message}</span>
  `;
  
  document.getElementById('toastContainer').appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
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
  document.getElementById('progressFill').style.width = `${progress}%`;
};

const initTheme = () => {
  const theme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  
  document.getElementById('themeToggle').addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  });
};

const createInputGroup = (field, prefix = '') => {
  const group = document.createElement('div');
  group.className = 'form-group';
  
  const label = document.createElement('label');
  label.textContent = field.label + (field.required ? ' *' : '');
  label.setAttribute('for', prefix + field.key);
  
  let input;
  
  if (field.type === 'select' && field.options) {
    input = document.createElement('select');
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
  } else {
    input = document.createElement('input');
    input.type = field.type;
    if (field.min !== undefined) input.min = field.min;
    if (field.max !== undefined) input.max = field.max;
    if (field.pattern) input.pattern = field.pattern;
  }
  
  input.id = prefix + field.key;
  input.name = prefix + field.key;
  if (field.required) input.required = true;
  
  input.addEventListener('input', updateProgress);
  
  group.appendChild(label);
  group.appendChild(input);
  
  return group;
};

const renderFormFields = () => {
  const generalGrid = document.querySelector('#generalFields .form-grid');
  currentConfig.general.forEach(field => {
    generalGrid.appendChild(createInputGroup(field));
  });
  
  const residenceGrid = document.querySelector('#residenceFields .form-grid');
  currentConfig.residence.forEach(field => {
    residenceGrid.appendChild(createInputGroup(field));
  });
  
  const caregiverGrid = document.querySelector('#caregiverFields .form-grid');
  currentConfig.caregivers.forEach(field => {
    caregiverGrid.appendChild(createInputGroup(field));
  });
};

const updateResidentBlocks = () => {
  const count = parseInt(document.getElementById('numMoradores').value) || 0;
  const container = document.getElementById('residentsContainer');
  container.innerHTML = '';
  
  for (let i = 1; i <= count; i++) {
    const block = document.createElement('div');
    block.className = 'resident-block';
    block.style.animationDelay = `${i * 0.1}s`;
    
    const header = document.createElement('h3');
    header.textContent = `Morador ${i}`;
    block.appendChild(header);
    
    const grid = document.createElement('div');
    grid.className = 'form-grid';
    
    currentConfig.residentFields.forEach(field => {
      grid.appendChild(createInputGroup(field, `${field.key}_${i}_`));
    });
    
    block.appendChild(grid);
    container.appendChild(block);
  }
  
  updateProgress();
};

const updateVagasDisponiveis = () => {
  const total = parseInt(document.getElementById('vagasTotais').value) || 0;
  const ocupadas = parseInt(document.getElementById('vagasOcupadas').value) || 0;
  document.getElementById('vagasDisponiveis').value = Math.max(0, total - ocupadas);
};

const clearForm = () => {
  if (confirm('Tem certeza que deseja limpar todos os dados do formulário?')) {
    document.getElementById('srtForm').reset();
    document.getElementById('residentsContainer').innerHTML = '';
    updateProgress();
    showToast('Formulário limpo com sucesso!');
  }
};

const validateForm = () => {
  const numMoradores = parseInt(document.getElementById('numMoradores').value) || 0;
  const vagasOcupadas = parseInt(document.getElementById('vagasOcupadas').value) || 0;
  
  if (numMoradores !== vagasOcupadas) {
    showToast('O número de moradores deve ser igual ao número de vagas ocupadas.', 'error');
    return false;
  }
  
  return true;
};

const submitForm = async (event) => {
  event.preventDefault();
  
  if (!validateForm()) return;
  
  showLoading();
  
  try {
    const houseData = {
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: 'active'
    };
    
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
    
    setTimeout(() => {
      if (confirm('Deseja cadastrar outra residência?')) {
        clearForm();
      } else {
        window.location.href = 'admin.html';
      }
    }, 1000);
    
  } catch (error) {
    console.error('Erro ao salvar:', error);
    showToast('Erro ao salvar dados. Tente novamente.', 'error');
  } finally {
    hideLoading();
  }
};

const getDefaultConfig = () => ({
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
    
    document.querySelectorAll('.number-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById('numMoradores');
        const current = parseInt(input.value) || 0;
        const action = btn.dataset.action;
        
        if (action === 'plus' && current < 20) {
          input.value = current + 1;
        } else if (action === 'minus' && current > 0) {
          input.value = current - 1;
        }
        
        input.dispatchEvent(new Event('change'));
      });
    });
    
    document.querySelectorAll('input, select, textarea').forEach(element => {
      element.addEventListener('input', updateProgress);
    });
    
  } catch (error) {
    console.error('Erro ao inicializar:', error);
    showToast('Erro ao carregar configurações', 'error');
  } finally {
    hideLoading();
  }
};

window.addEventListener('DOMContentLoaded', initializeApp);