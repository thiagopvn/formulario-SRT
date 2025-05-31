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
const auth = firebase.auth();

let allHouses = [];
let currentConfig = null;
let occupancyChart = null;

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

auth.onAuthStateChanged(user => {
  if (user) {
    document.getElementById('loginDiv').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'flex';
    initializeAdmin();
  } else {
    document.getElementById('loginDiv').style.display = 'flex';
    document.getElementById('adminPanel').style.display = 'none';
  }
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  showLoading();
  document.getElementById('loginError').textContent = '';
  
  try {
    await auth.signInWithEmailAndPassword(email, password);
    showToast('Login realizado com sucesso!');
  } catch (error) {
    let errorMessage = 'Erro ao fazer login';
    
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'Usuário não encontrado';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Senha incorreta';
        break;
      case 'auth/invalid-email':
        errorMessage = 'E-mail inválido';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Muitas tentativas. Tente novamente mais tarde';
        break;
    }
    
    document.getElementById('loginError').textContent = errorMessage;
  } finally {
    hideLoading();
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  if (confirm('Deseja realmente sair?')) {
    auth.signOut();
    showToast('Logout realizado com sucesso!');
  }
});

document.getElementById('mobileMenuToggle').addEventListener('click', () => {
  document.querySelector('.sidebar').classList.toggle('active');
});

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', function() {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => {
      t.classList.remove('active');
      t.style.display = 'none';
    });
    
    this.classList.add('active');
    const tabId = this.getAttribute('data-tab') + 'Tab';
    const tab = document.getElementById(tabId);
    tab.style.display = 'block';
    setTimeout(() => tab.classList.add('active'), 10);
    
    document.querySelector('.sidebar').classList.remove('active');
  });
});

const initializeAdmin = async () => {
  showLoading();
  initTheme();
  
  try {
    await Promise.all([loadHouses(), loadConfigJSON()]);
    initializeChart();
  } catch (error) {
    console.error('Erro ao inicializar:', error);
    showToast('Erro ao carregar dados', 'error');
  } finally {
    hideLoading();
  }
};

const loadHouses = async () => {
  const snapshot = await db.collection('houses').orderBy('createdAt', 'desc').get();
  allHouses = [];
  
  snapshot.forEach(doc => {
    allHouses.push({ id: doc.id, ...doc.data() });
  });
  
  updateStats();
  displayHouses(allHouses);
};

const updateStats = () => {
  const totalHouses = allHouses.length;
  const totalResidents = allHouses.reduce((sum, house) => sum + (house.residents?.length || 0), 0);
  const avgResidents = totalHouses > 0 ? (totalResidents / totalHouses).toFixed(1) : 0;
  
  const totalVagas = allHouses.reduce((sum, house) => sum + (parseInt(house.vagasTotais) || 0), 0);
  const vagasOcupadas = allHouses.reduce((sum, house) => sum + (parseInt(house.vagasOcupadas) || 0), 0);
  const occupancyRate = totalVagas > 0 ? ((vagasOcupadas / totalVagas) * 100).toFixed(1) : 0;
  
  document.getElementById('totalHouses').textContent = totalHouses;
  document.getElementById('totalResidentsCount').textContent = totalResidents;
  document.getElementById('avgResidents').textContent = avgResidents;
  document.getElementById('occupancyRate').textContent = occupancyRate + '%';
  
  updateChart();
};

const initializeChart = () => {
  const ctx = document.getElementById('occupancyChart');
  if (!ctx) return;
  
  const chartColors = getComputedStyle(document.documentElement);
  
  occupancyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Taxa de Ocupação (%)',
        data: [],
        backgroundColor: chartColors.getPropertyValue('--primary').trim(),
        borderColor: chartColors.getPropertyValue('--primary-dark').trim(),
        borderWidth: 0,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: chartColors.getPropertyValue('--bg-primary').trim(),
          titleColor: chartColors.getPropertyValue('--text-primary').trim(),
          bodyColor: chartColors.getPropertyValue('--text-secondary').trim(),
          borderColor: chartColors.getPropertyValue('--border').trim(),
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          grid: {
            color: chartColors.getPropertyValue('--border-light').trim(),
            drawBorder: false
          },
          ticks: {
            color: chartColors.getPropertyValue('--text-secondary').trim(),
            callback: value => value + '%'
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: chartColors.getPropertyValue('--text-secondary').trim()
          }
        }
      }
    }
  });
};

const updateChart = () => {
  if (!occupancyChart) return;
  
  const houseOccupancy = allHouses.map(house => ({
    name: house.nomeResidencia || 'Sem nome',
    rate: house.vagasTotais > 0 ? ((house.vagasOcupadas / house.vagasTotais) * 100) : 0
  })).slice(0, 10);
  
  occupancyChart.data.labels = houseOccupancy.map(h => h.name);
  occupancyChart.data.datasets[0].data = houseOccupancy.map(h => h.rate.toFixed(1));
  occupancyChart.update();
};

const displayHouses = (houses) => {
  const tbody = document.querySelector('#housesTable tbody');
  tbody.innerHTML = '';
  
  houses.forEach(house => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${house.nomeResidencia || '(Sem nome)'}</td>
      <td>${house.nomeCaps || '-'}</td>
      <td><span class="badge">${house.tipoSRT || '-'}</span></td>
      <td>${house.residents?.length || 0}</td>
      <td>${house.vagasDisponiveis || 0}/${house.vagasTotais || 0}</td>
      <td class="table-actions">
        <button class="btn btn-sm btn-primary view-btn" data-id="${house.id}">Detalhes</button>
        <button class="btn btn-sm btn-danger delete-btn" data-id="${house.id}">Excluir</button>
      </td>
    `;
    tbody.appendChild(row);
  });
  
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', (e) => viewHouseDetails(e.target.dataset.id));
  });
  
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => deleteHouse(e.target.dataset.id));
  });
};

const viewHouseDetails = (houseId) => {
  const house = allHouses.find(h => h.id === houseId);
  if (!house) return;
  
  let detailsHTML = `
    <div class="house-info">
      <h3>Informações Gerais</h3>
      <p><strong>Nome:</strong> ${house.nomeResidencia || '-'}</p>
      <p><strong>CAPS Vinculado:</strong> ${house.nomeCaps || '-'}</p>
      <p><strong>Tipo SRT:</strong> ${house.tipoSRT || '-'}</p>
      <p><strong>Responsável:</strong> ${house.responsavelNome || '-'} (${house.responsavelCargo || '-'})</p>
      <p><strong>Contato:</strong> ${house.contatoResponsavel || '-'}</p>
      <p><strong>Data de Inauguração:</strong> ${house.dataInauguracao || '-'}</p>
    </div>
    
    <div class="address-info">
      <h3>Endereço</h3>
      <p>${house.logradouro || ''} ${house.numero || ''} ${house.complemento || ''}</p>
      <p>${house.bairro || ''} - ${house.municipio || ''}/${house.uf || ''}</p>
      <p>CEP: ${house.cep || '-'}</p>
    </div>
    
    <div class="capacity-info">
      <h3>Capacidade</h3>
      <p><strong>Vagas Totais:</strong> ${house.vagasTotais || 0}</p>
      <p><strong>Vagas Ocupadas:</strong> ${house.vagasOcupadas || 0}</p>
      <p><strong>Vagas Disponíveis:</strong> ${house.vagasDisponiveis || 0}</p>
    </div>
  `;
  
  if (house.residents && house.residents.length > 0) {
    detailsHTML += '<div class="residents-info"><h3>Moradores</h3>';
    house.residents.forEach((resident, index) => {
      detailsHTML += `
        <details>
          <summary>Morador ${index + 1}: ${resident.nomeCompleto || '(Sem nome)'}</summary>
          <div class="resident-details">
            <p><strong>Nome Social:</strong> ${resident.nomeSocial || '-'}</p>
            <p><strong>Data de Nascimento:</strong> ${resident.dataNascimento || '-'}</p>
            <p><strong>Idade:</strong> ${resident.idade || '-'} anos</p>
            <p><strong>Instituição de Origem:</strong> ${resident.instituicaoOrigem || '-'}</p>
            <p><strong>Tempo de Internação:</strong> ${resident.tempoInternacao || '-'} anos</p>
            <p><strong>Participa do PVC:</strong> ${resident.participaPVC || '-'}</p>
            <p><strong>Frequência CAPS:</strong> ${resident.frequenciaCaps || '-'}</p>
            <p><strong>Frequência UBS:</strong> ${resident.frequenciaUBS || '-'}</p>
          </div>
        </details>
      `;
    });
    detailsHTML += '</div>';
  }
  
  document.getElementById('houseDetails').innerHTML = detailsHTML;
  document.getElementById('houseModal').style.display = 'block';
};

const deleteHouse = async (houseId) => {
  if (!confirm('Tem certeza que deseja excluir esta casa? Esta ação não pode ser desfeita.')) {
    return;
  }
  
  showLoading();
  try {
    await db.collection('houses').doc(houseId).delete();
    await loadHouses();
    showToast('Casa excluída com sucesso!');
  } catch (error) {
    console.error('Erro ao excluir:', error);
    showToast('Erro ao excluir casa', 'error');
  } finally {
    hideLoading();
  }
};

document.querySelector('.modal-close').addEventListener('click', () => {
  document.getElementById('houseModal').style.display = 'none';
});

document.querySelector('.modal-backdrop').addEventListener('click', () => {
  document.getElementById('houseModal').style.display = 'none';
});

document.getElementById('searchInput').addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const filtered = allHouses.filter(house => 
    house.nomeResidencia?.toLowerCase().includes(searchTerm) ||
    house.nomeCaps?.toLowerCase().includes(searchTerm) ||
    house.municipio?.toLowerCase().includes(searchTerm)
  );
  displayHouses(filtered);
});

document.getElementById('exportBtn').addEventListener('click', async () => {
  showLoading();
  
  try {
    const rows = [];
    
    for (const house of allHouses) {
      const baseInfo = {
        'ID da Casa': house.id,
        'Nome da Residência': house.nomeResidencia || '',
        'CAPS Vinculado': house.nomeCaps || '',
        'CNES do CAPS': house.cnesCaps || '',
        'Tipo SRT': house.tipoSRT || '',
        'Data de Preenchimento': house.dataPreenchimento || '',
        'Responsável': house.responsavelNome || '',
        'Cargo': house.responsavelCargo || '',
        'Contato': house.contatoResponsavel || '',
        'Endereço': `${house.logradouro || ''} ${house.numero || ''}`,
        'Bairro': house.bairro || '',
        'Município': house.municipio || '',
        'UF': house.uf || '',
        'CEP': house.cep || '',
        'Total de Moradores': house.residents?.length || 0,
        'Vagas Totais': house.vagasTotais || 0,
        'Vagas Ocupadas': house.vagasOcupadas || 0,
        'Vagas Disponíveis': house.vagasDisponiveis || 0
      };
      
      if (house.residents && house.residents.length > 0) {
        house.residents.forEach((resident, index) => {
          rows.push({
            ...baseInfo,
            'Morador Nº': index + 1,
            'Nome do Morador': resident.nomeCompleto || '',
            'Nome Social': resident.nomeSocial || '',
            'Data de Nascimento': resident.dataNascimento || '',
            'Idade': resident.idade || '',
            'Instituição de Origem': resident.instituicaoOrigem || '',
            'Tempo de Internação': resident.tempoInternacao || '',
            'Raça/Cor': resident.racaCor || '',
            'Sexo Biológico': resident.generoNascimento || '',
            'Identidade de Gênero': resident.identidadeGenero || '',
            'Participa do PVC': resident.participaPVC || '',
            'Vínculo Familiar': resident.vinculoFamiliar || '',
            'Frequência CAPS': resident.frequenciaCaps || '',
            'Frequência UBS': resident.frequenciaUBS || ''
          });
        });
      } else {
        rows.push(baseInfo);
      }
    }
    
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Casas SRT");
    
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `export_srt_${date}.xlsx`);
    
    showToast('Dados exportados com sucesso!');
  } catch (error) {
    console.error('Erro ao exportar:', error);
    showToast('Erro ao exportar dados', 'error');
  } finally {
    hideLoading();
  }
});

const loadConfigJSON = async () => {
  const configRef = db.collection("config").doc("srt");
  const configSnap = await configRef.get();
  
  if (configSnap.exists) {
    currentConfig = configSnap.data();
    const configJSON = JSON.stringify(currentConfig, null, 2);
    document.getElementById('configJSON').value = configJSON;
    updateLineNumbers();
    updatePreview();
  }
};

const updateLineNumbers = () => {
  const textarea = document.getElementById('configJSON');
  const lines = textarea.value.split('\n').length;
  const lineNumbers = document.getElementById('lineNumbers');
  
  let numbersHTML = '';
  for (let i = 1; i <= lines; i++) {
    numbersHTML += `${i}<br>`;
  }
  
  lineNumbers.innerHTML = numbersHTML;
};

const updatePreview = () => {
  try {
    const config = JSON.parse(document.getElementById('configJSON').value);
    const preview = document.getElementById('configPreview');
    
    let previewHTML = '<div class="preview-sections">';
    
    Object.entries(config).forEach(([section, fields]) => {
      previewHTML += `<div class="preview-section"><h4>${section}</h4><ul>`;
      fields.forEach(field => {
        previewHTML += `<li>${field.label} (${field.type})${field.required ? ' *' : ''}</li>`;
      });
      previewHTML += '</ul></div>';
    });
    
    previewHTML += '</div>';
    preview.innerHTML = previewHTML;
  } catch (e) {
    document.getElementById('configPreview').innerHTML = '<p class="text-muted">JSON inválido</p>';
  }
};

document.getElementById('configJSON').addEventListener('input', () => {
  updateLineNumbers();
  updatePreview();
});

document.getElementById('formatBtn').addEventListener('click', () => {
  try {
    const json = JSON.parse(document.getElementById('configJSON').value);
    document.getElementById('configJSON').value = JSON.stringify(json, null, 2);
    updateLineNumbers();
    showToast('JSON formatado com sucesso!');
  } catch (e) {
    showToast('JSON inválido', 'error');
  }
});

document.getElementById('validateBtn').addEventListener('click', () => {
  try {
    JSON.parse(document.getElementById('configJSON').value);
    showToast('JSON válido!');
  } catch (e) {
    showToast('JSON inválido: ' + e.message, 'error');
  }
});

document.getElementById('saveConfigBtn').addEventListener('click', async () => {
  try {
    const newConfig = JSON.parse(document.getElementById('configJSON').value);
    
    if (!newConfig.general || !newConfig.residence || !newConfig.caregivers || !newConfig.residentFields) {
      throw new Error('Configuração deve conter: general, residence, caregivers e residentFields');
    }
    
    showLoading();
    await db.collection("config").doc("srt").set(newConfig);
    currentConfig = newConfig;
    showToast('Configuração salva com sucesso!');
  } catch (e) {
    showToast('Erro ao salvar: ' + e.message, 'error');
  } finally {
    hideLoading();
  }
});

document.getElementById('resetConfigBtn').addEventListener('click', async () => {
  if (!confirm('Tem certeza que deseja restaurar a configuração padrão?')) {
    return;
  }
  
  const defaultConfig = {
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
      { key: "cep", label: "CEP", type: "text", required: true },
      { key: "municipio", label: "Município", type: "text", required: true },
      { key: "uf", label: "UF", type: "select", options: ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"], required: true },
      { key: "localizacao", label: "Localização", type: "select", options: ["Urbana", "Rural"], required: true },
      { key: "quartos", label: "Quantidade de Quartos", type: "number", required: true },
      { key: "salas", label: "Quantidade de Salas", type: "number", required: true },
      { key: "cozinhas", label: "Quantidade de Cozinhas", type: "number", required: true },
      { key: "banheiros", label: "Quantidade de Banheiros", type: "number", required: true },
      { key: "varanda", label: "Quantidade de Varandas", type: "number" },
      { key: "lavanderia", label: "Quantidade de Lavanderias", type: "number" },
      { key: "despensa", label: "Quantidade de Despensas", type: "number" },
      { key: "outros", label: "Outros cômodos", type: "text" }
    ],
    caregivers: [
      { key: "totalProfissionais", label: "Total de Profissionais", type: "number", required: true },
      { key: "totalCuidadores", label: "Total de Cuidadores", type: "number", required: true },
      { key: "totalTecnicos", label: "Total de Técnicos", type: "number", required: true },
      { key: "totalEnfermeiros", label: "Total de Enfermeiros", type: "number", required: true },
      { key: "totalOutros", label: "Total de Outros", type: "number" },
      { key: "escalaTrabalho", label: "Escala de Trabalho", type: "textarea", required: true },
      { key: "relacaoCuidadorMorador", label: "Relação Cuidador/Morador", type: "text", required: true },
      { key: "cuidadoresPorTurno", label: "Número de Cuidadores por Turno", type: "number", required: true },
      { key: "participaEducacao", label: "Participa de Educação Permanente?", type: "select", options: ["Sim", "Não"], required: true },
      { key: "quemPromoveEducacao", label: "Se sim, promovido por quem/frequência/temas", type: "textarea" },
      { key: "reunioesRegulares", label: "Reuniões de equipe regulares?", type: "select", options: ["Sim", "Não"], required: true }
    ],
    residentFields: [
      { key: "nomeCompleto", label: "Nome completo", type: "text", required: true },
      { key: "nomeSocial", label: "Nome social", type: "text" },
      { key: "dataNascimento", label: "Data de Nascimento", type: "date", required: true },
      { key: "idade", label: "Idade", type: "number", required: true },
      { key: "instituicaoOrigem", label: "Instituição psiquiátrica de origem", type: "text", required: true },
      { key: "cnesOrigem", label: "CNES da Instituição de origem", type: "text" },
      { key: "tempoInternacao", label: "Tempo de internação (anos)", type: "number", required: true },
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
  
  document.getElementById('configJSON').value = JSON.stringify(defaultConfig, null, 2);
  updateLineNumbers();
  updatePreview();
  showToast('Configuração padrão restaurada!');
});

document.getElementById('generateReportBtn').addEventListener('click', async () => {
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const reportType = document.getElementById('reportType').value;
  
  if (!startDate || !endDate) {
    showToast('Selecione o período completo', 'error');
    return;
  }
  
  showLoading();
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const filteredHouses = allHouses.filter(house => {
      if (house.createdAt) {
        const houseDate = house.createdAt.toDate();
        return houseDate >= start && houseDate <= end;
      }
      return false;
    });
    
    let reportHTML = '';
    
    switch (reportType) {
      case 'summary':
        reportHTML = generateSummaryReport(filteredHouses, start, end);
        break;
      case 'occupancy':
        reportHTML = generateOccupancyReport(filteredHouses, start, end);
        break;
      case 'residents':
        reportHTML = generateResidentsReport(filteredHouses, start, end);
        break;
    }
    
    document.getElementById('reportContent').innerHTML = reportHTML;
    showToast('Relatório gerado com sucesso!');
    
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    showToast('Erro ao gerar relatório', 'error');
  } finally {
    hideLoading();
  }
});

const generateSummaryReport = (houses, startDate, endDate) => {
  const totalHouses = houses.length;
  const totalResidents = houses.reduce((sum, house) => sum + (house.residents?.length || 0), 0);
  const totalVagas = houses.reduce((sum, house) => sum + (parseInt(house.vagasTotais) || 0), 0);
  const vagasOcupadas = houses.reduce((sum, house) => sum + (parseInt(house.vagasOcupadas) || 0), 0);
  
  const tipoCount = houses.reduce((acc, house) => {
    const tipo = house.tipoSRT || 'Não especificado';
    acc[tipo] = (acc[tipo] || 0) + 1;
    return acc;
  }, {});
  
  const municipioCount = houses.reduce((acc, house) => {
    const municipio = house.municipio || 'Não especificado';
    acc[municipio] = (acc[municipio] || 0) + 1;
    return acc;
  }, {});
  
  return `
    <div class="report-summary">
      <div class="report-header">
        <h3>Relatório Resumido</h3>
        <p class="text-muted">Período: ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}</p>
      </div>
      
      <div class="report-stats">
        <div class="report-stat-card">
          <h4>${totalHouses}</h4>
          <p>Total de Casas</p>
        </div>
        <div class="report-stat-card">
          <h4>${totalResidents}</h4>
          <p>Total de Moradores</p>
        </div>
        <div class="report-stat-card">
          <h4>${totalVagas}</h4>
          <p>Total de Vagas</p>
        </div>
        <div class="report-stat-card">
          <h4>${totalVagas ? ((vagasOcupadas/totalVagas)*100).toFixed(1) : 0}%</h4>
          <p>Taxa de Ocupação</p>
        </div>
      </div>
      
      <div class="report-section">
        <h4>Distribuição por Tipo</h4>
        <table class="report-table">
          <thead>
            <tr>
              <th>Tipo SRT</th>
              <th>Quantidade</th>
              <th>Percentual</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(tipoCount).map(([tipo, count]) => `
              <tr>
                <td>${tipo}</td>
                <td>${count}</td>
                <td>${totalHouses ? ((count/totalHouses)*100).toFixed(1) : 0}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="report-section">
        <h4>Distribuição por Município</h4>
        <table class="report-table">
          <thead>
            <tr>
              <th>Município</th>
              <th>Quantidade</th>
              <th>Percentual</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(municipioCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([municipio, count]) => `
              <tr>
                <td>${municipio}</td>
                <td>${count}</td>
                <td>${totalHouses ? ((count/totalHouses)*100).toFixed(1) : 0}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

const generateOccupancyReport = (houses, startDate, endDate) => {
  const occupancyData = houses.map(house => ({
    nome: house.nomeResidencia || 'Sem nome',
    municipio: house.municipio || '-',
    tipo: house.tipoSRT || '-',
    vagasTotais: parseInt(house.vagasTotais) || 0,
    vagasOcupadas: parseInt(house.vagasOcupadas) || 0,
    vagasDisponiveis: parseInt(house.vagasDisponiveis) || 0,
    taxaOcupacao: house.vagasTotais > 0 ? ((house.vagasOcupadas / house.vagasTotais) * 100) : 0
  })).sort((a, b) => b.taxaOcupacao - a.taxaOcupacao);
  
  const avgOccupancy = occupancyData.length > 0 
    ? occupancyData.reduce((sum, h) => sum + h.taxaOcupacao, 0) / occupancyData.length 
    : 0;
  
  const highOccupancy = occupancyData.filter(h => h.taxaOcupacao >= 80).length;
  const mediumOccupancy = occupancyData.filter(h => h.taxaOcupacao >= 50 && h.taxaOcupacao < 80).length;
  const lowOccupancy = occupancyData.filter(h => h.taxaOcupacao < 50).length;
  
  return `
    <div class="report-occupancy">
      <div class="report-header">
        <h3>Análise de Ocupação</h3>
        <p class="text-muted">Período: ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}</p>
      </div>
      
      <div class="report-stats">
        <div class="report-stat-card">
          <h4>${avgOccupancy.toFixed(1)}%</h4>
          <p>Taxa Média de Ocupação</p>
        </div>
        <div class="report-stat-card high">
          <h4>${highOccupancy}</h4>
          <p>Alta Ocupação (≥80%)</p>
        </div>
        <div class="report-stat-card medium">
          <h4>${mediumOccupancy}</h4>
          <p>Média Ocupação (50-79%)</p>
        </div>
        <div class="report-stat-card low">
          <h4>${lowOccupancy}</h4>
          <p>Baixa Ocupação (<50%)</p>
        </div>
      </div>
      
      <div class="report-section">
        <h4>Detalhamento por Casa</h4>
        <table class="report-table">
          <thead>
            <tr>
              <th>Casa</th>
              <th>Município</th>
              <th>Tipo</th>
              <th>Vagas Totais</th>
              <th>Ocupadas</th>
              <th>Disponíveis</th>
              <th>Taxa de Ocupação</th>
            </tr>
          </thead>
          <tbody>
            ${occupancyData.map(house => `
              <tr>
                <td>${house.nome}</td>
                <td>${house.municipio}</td>
                <td><span class="badge">${house.tipo}</span></td>
                <td>${house.vagasTotais}</td>
                <td>${house.vagasOcupadas}</td>
                <td>${house.vagasDisponiveis}</td>
                <td>
                  <div class="occupancy-bar">
                    <div class="occupancy-fill ${house.taxaOcupacao >= 80 ? 'high' : house.taxaOcupacao >= 50 ? 'medium' : 'low'}" 
                         style="width: ${house.taxaOcupacao}%"></div>
                    <span>${house.taxaOcupacao.toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

const generateResidentsReport = (houses, startDate, endDate) => {
  const allResidents = [];
  houses.forEach(house => {
    if (house.residents) {
      house.residents.forEach(resident => {
        allResidents.push({
          ...resident,
          casa: house.nomeResidencia || 'Sem nome',
          municipio: house.municipio || '-'
        });
      });
    }
  });
  
  const totalResidents = allResidents.length;
  
  const ageGroups = {
    '18-30': 0,
    '31-40': 0,
    '41-50': 0,
    '51-60': 0,
    '60+': 0
  };
  
  allResidents.forEach(resident => {
    const age = parseInt(resident.idade) || 0;
    if (age >= 18 && age <= 30) ageGroups['18-30']++;
    else if (age >= 31 && age <= 40) ageGroups['31-40']++;
    else if (age >= 41 && age <= 50) ageGroups['41-50']++;
    else if (age >= 51 && age <= 60) ageGroups['51-60']++;
    else if (age > 60) ageGroups['60+']++;
  });
  
  const genderCount = allResidents.reduce((acc, resident) => {
    const gender = resident.generoNascimento || 'Não informado';
    acc[gender] = (acc[gender] || 0) + 1;
    return acc;
  }, {});
  
  const pvcCount = allResidents.reduce((acc, resident) => {
    const pvc = resident.participaPVC || 'Não informado';
    acc[pvc] = (acc[pvc] || 0) + 1;
    return acc;
  }, {});
  
  const vinculoCount = allResidents.reduce((acc, resident) => {
    const vinculo = resident.vinculoFamiliar || 'Não informado';
    acc[vinculo] = (acc[vinculo] || 0) + 1;
    return acc;
  }, {});
  
  return `
    <div class="report-residents">
      <div class="report-header">
        <h3>Perfil dos Moradores</h3>
        <p class="text-muted">Período: ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}</p>
      </div>
      
      <div class="report-stats">
        <div class="report-stat-card">
          <h4>${totalResidents}</h4>
          <p>Total de Moradores</p>
        </div>
        <div class="report-stat-card">
          <h4>${houses.length > 0 ? (totalResidents / houses.length).toFixed(1) : 0}</h4>
          <p>Média por Casa</p>
        </div>
      </div>
      
      <div class="report-grid">
        <div class="report-section">
          <h4>Distribuição por Faixa Etária</h4>
          <table class="report-table">
            <thead>
              <tr>
                <th>Faixa Etária</th>
                <th>Quantidade</th>
                <th>Percentual</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(ageGroups).map(([group, count]) => `
                <tr>
                  <td>${group} anos</td>
                  <td>${count}</td>
                  <td>${totalResidents ? ((count/totalResidents)*100).toFixed(1) : 0}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="report-section">
          <h4>Distribuição por Gênero</h4>
          <table class="report-table">
            <thead>
              <tr>
                <th>Gênero</th>
                <th>Quantidade</th>
                <th>Percentual</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(genderCount).map(([gender, count]) => `
                <tr>
                  <td>${gender}</td>
                  <td>${count}</td>
                  <td>${totalResidents ? ((count/totalResidents)*100).toFixed(1) : 0}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="report-section">
          <h4>Programa de Volta para Casa</h4>
          <table class="report-table">
            <thead>
              <tr>
                <th>Participa do PVC</th>
                <th>Quantidade</th>
                <th>Percentual</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(pvcCount).map(([pvc, count]) => `
                <tr>
                  <td>${pvc}</td>
                  <td>${count}</td>
                  <td>${totalResidents ? ((count/totalResidents)*100).toFixed(1) : 0}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="report-section">
          <h4>Vínculo Familiar</h4>
          <table class="report-table">
            <thead>
              <tr>
                <th>Possui Vínculo</th>
                <th>Quantidade</th>
                <th>Percentual</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(vinculoCount).map(([vinculo, count]) => `
                <tr>
                  <td>${vinculo}</td>
                  <td>${count}</td>
                  <td>${totalResidents ? ((count/totalResidents)*100).toFixed(1) : 0}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
};

const style = document.createElement('style');
style.textContent = `
  .badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    border-radius: 9999px;
    background: var(--primary-light);
    color: var(--primary);
  }
  
  .report-summary, .report-occupancy, .report-residents {
    animation: fadeIn 0.3s ease-out;
  }
  
  .report-header {
    margin-bottom: 2rem;
  }
  
  .report-header h3 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
  }
  
  .report-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
    margin-bottom: 3rem;
  }
  
  .report-stat-card {
    background: var(--bg-secondary);
    padding: 1.5rem;
    border-radius: var(--radius-lg);
    text-align: center;
  }
  
  .report-stat-card h4 {
    font-size: 2rem;
    font-weight: 800;
    color: var(--primary);
    margin-bottom: 0.5rem;
  }
  
  .report-stat-card.high h4 {
    color: var(--success);
  }
  
  .report-stat-card.medium h4 {
    color: var(--warning);
  }
  
  .report-stat-card.low h4 {
    color: var(--danger);
  }
  
  .report-section {
    margin-bottom: 2rem;
  }
  
  .report-section h4 {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 1rem;
  }
  
  .report-table {
    width: 100%;
    background: var(--bg-secondary);
    border-radius: var(--radius);
    overflow: hidden;
  }
  
  .report-table th {
    background: var(--bg-tertiary);
    padding: 0.75rem;
    text-align: left;
    font-weight: 600;
    color: var(--text-secondary);
    font-size: 0.875rem;
  }
  
  .report-table td {
    padding: 0.75rem;
    border-bottom: 1px solid var(--border-light);
  }
  
  .report-table tbody tr:last-child td {
    border-bottom: none;
  }
  
  .occupancy-bar {
    position: relative;
    height: 24px;
    background: var(--bg-tertiary);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }
  
  .occupancy-fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    transition: width 0.3s ease-out;
  }
  
  .occupancy-fill.high {
    background: var(--success);
  }
  
  .occupancy-fill.medium {
    background: var(--warning);
  }
  
  .occupancy-fill.low {
    background: var(--danger);
  }
  
  .occupancy-bar span {
    position: relative;
    z-index: 1;
    display: block;
    text-align: center;
    line-height: 24px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  
  .report-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
  }
  
  .preview-sections {
    display: grid;
    gap: 1.5rem;
  }
  
  .preview-section h4 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--primary);
    margin-bottom: 0.5rem;
    text-transform: capitalize;
  }
  
  .preview-section ul {
    list-style: none;
    padding: 0;
  }
  
  .preview-section li {
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border-light);
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
  
  .preview-section li:last-child {
    border-bottom: none;
  }
`;

document.head.appendChild(style);