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

function showLoading() {
  document.getElementById('loadingOverlay').classList.add('show');
}

function hideLoading() {
  document.getElementById('loadingOverlay').classList.remove('show');
}

function createField(labelText, id, type = "text", required = false) {
  const label = document.createElement('label');
  label.textContent = labelText;
  label.setAttribute('for', id);
  
  const input = document.createElement('input');
  input.type = type;
  input.id = id;
  input.name = id;
  
  if (required) {
    input.required = true;
    label.textContent += ' *';
  }
  
  return [label, input];
}

function createSelectField(labelText, id, options, required = false) {
  const label = document.createElement('label');
  label.textContent = labelText;
  label.setAttribute('for', id);
  
  const select = document.createElement('select');
  select.id = id;
  select.name = id;
  
  if (required) {
    select.required = true;
    label.textContent += ' *';
  }
  
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Selecione...';
  select.appendChild(defaultOption);
  
  options.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt.value || opt;
    option.textContent = opt.label || opt;
    select.appendChild(option);
  });
  
  return [label, select];
}

function getDefaultConfig() {
  return {
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
  };
}

async function buildForm() {
  showLoading();
  
  try {
    const configRef = db.collection("config").doc("srt");
    const configSnap = await configRef.get();
    
    if (configSnap.exists) {
      currentConfig = configSnap.data();
    } else {
      currentConfig = getDefaultConfig();
      await configRef.set(currentConfig);
    }
    
    renderFormFields();
    setupEventListeners();
    
  } catch (error) {
    console.error("Erro ao carregar configuração:", error);
    alert("Erro ao carregar formulário. Por favor, recarregue a página.");
  } finally {
    hideLoading();
  }
}

function renderFormFields() {
  const generalSection = document.getElementById('generalFields');
  renderFields(currentConfig.general, generalSection);
  
  const residenceSection = document.getElementById('residenceFields');
  renderFields(currentConfig.residence, residenceSection);
  
  const caregiverSection = document.getElementById('caregiverFields');
  renderFields(currentConfig.caregivers, caregiverSection);
}

function renderFields(fields, container) {
  fields.forEach(field => {
    let elements;
    
    if (field.type === 'select' && field.options) {
      elements = createSelectField(field.label, field.key, field.options, field.required);
    } else if (field.type === 'textarea') {
      const label = document.createElement('label');
      label.textContent = field.label + (field.required ? ' *' : '');
      label.setAttribute('for', field.key);
      
      const textarea = document.createElement('textarea');
      textarea.id = field.key;
      textarea.name = field.key;
      textarea.rows = 3;
      if (field.required) textarea.required = true;
      
      elements = [label, textarea];
    } else {
      elements = createField(field.label, field.key, field.type, field.required);
      if (field.min !== undefined) elements[1].min = field.min;
      if (field.max !== undefined) elements[1].max = field.max;
      if (field.pattern) elements[1].pattern = field.pattern;
    }
    
    elements.forEach(el => container.appendChild(el));
  });
}

function setupEventListeners() {
  const numInput = document.getElementById('numMoradores');
  numInput.addEventListener('change', updateResidentBlocks);
  
  document.getElementById('vagasOcupadas').addEventListener('input', updateVagasDisponiveis);
  document.getElementById('vagasTotais').addEventListener('input', updateVagasDisponiveis);
  
  document.getElementById('clearBtn').addEventListener('click', clearForm);
}

function updateVagasDisponiveis() {
  const total = parseInt(document.getElementById('vagasTotais').value) || 0;
  const ocupadas = parseInt(document.getElementById('vagasOcupadas').value) || 0;
  document.getElementById('vagasDisponiveis').value = Math.max(0, total - ocupadas);
}

function updateResidentBlocks() {
  const count = parseInt(document.getElementById('numMoradores').value) || 0;
  const container = document.getElementById('residentsContainer');
  container.innerHTML = "";
  
  for (let i = 1; i <= count; i++) {
    const block = document.createElement('div');
    block.className = 'resident-block';
    block.innerHTML = `<h3>Morador ${i}</h3>`;
    
    currentConfig.residentFields.forEach(field => {
      if (field.type === 'select' && field.options) {
        const [label, select] = createSelectField(field.label, `${field.key}_${i}`, field.options, field.required);
        block.appendChild(label);
        block.appendChild(select);
      } else if (field.type === 'textarea') {
        const label = document.createElement('label');
        label.textContent = field.label + (field.required ? ' *' : '');
        const textarea = document.createElement('textarea');
        textarea.id = `${field.key}_${i}`;
        textarea.rows = 3;
        if (field.required) textarea.required = true;
        block.appendChild(label);
        block.appendChild(textarea);
      } else {
        const [label, input] = createField(field.label, `${field.key}_${i}`, field.type, field.required);
        if (field.min !== undefined) input.min = field.min;
        if (field.max !== undefined) input.max = field.max;
        block.appendChild(label);
        block.appendChild(input);
      }
    });
    
    container.appendChild(block);
  }
}

function clearForm() {
  if (confirm('Tem certeza que deseja limpar todos os dados do formulário?')) {
    document.getElementById('srtForm').reset();
    document.getElementById('residentsContainer').innerHTML = "";
  }
}

async function submitForm(event) {
  event.preventDefault();
  
  if (!validateForm()) {
    return;
  }
  
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
        const element = document.getElementById(`${field.key}_${i}`);
        if (element && element.value) {
          resident[field.key] = element.value;
        }
      });
      houseData.residents.push(resident);
    }
    
    const docRef = await db.collection('houses').add(houseData);
    
    alert('Dados salvos com sucesso!');
    
    if (confirm('Deseja cadastrar outra residência?')) {
      clearForm();
    } else {
      window.location.href = 'admin.html';
    }
    
  } catch (error) {
    console.error("Erro ao salvar:", error);
    alert('Erro ao salvar dados. Por favor, tente novamente.');
  } finally {
    hideLoading();
  }
}

function validateForm() {
  const numMoradores = parseInt(document.getElementById('numMoradores').value) || 0;
  const vagasOcupadas = parseInt(document.getElementById('vagasOcupadas').value) || 0;
  
  if (numMoradores !== vagasOcupadas) {
    alert('O número de moradores deve ser igual ao número de vagas ocupadas.');
    return false;
  }
  
  return true;
}

window.addEventListener('DOMContentLoaded', () => {
  buildForm();
  document.getElementById('srtForm').addEventListener('submit', submitForm);
});