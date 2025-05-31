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

const elements = {
  loginDiv: document.getElementById('loginDiv'),
  adminPanel: document.getElementById('adminPanel'),
  loginBtn: document.getElementById('loginBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  housesTableBody: document.querySelector('#housesTable tbody'),
  searchInput: document.getElementById('searchInput'),
  exportBtn: document.getElementById('exportBtn'),
  saveConfigBtn: document.getElementById('saveConfigBtn'),
  validateBtn: document.getElementById('validateBtn'),
  resetConfigBtn: document.getElementById('resetConfigBtn'),
  generateReportBtn: document.getElementById('generateReportBtn'),
  loginError: document.getElementById('loginError'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  modal: document.getElementById('houseModal'),
  modalClose: document.querySelector('.close'),
  modalDetails: document.getElementById('houseDetails')
};

function showLoading() {
  elements.loadingOverlay.classList.add('show');
}

function hideLoading() {
  elements.loadingOverlay.classList.remove('show');
}

auth.onAuthStateChanged(user => {
  if (user) {
    elements.loginDiv.style.display = 'none';
    elements.adminPanel.style.display = 'block';
    initializeAdmin();
  } else {
    elements.loginDiv.style.display = 'block';
    elements.adminPanel.style.display = 'none';
  }
});

elements.loginBtn.addEventListener('click', async () => {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  if (!email || !password) {
    elements.loginError.textContent = 'Preencha todos os campos';
    return;
  }
  
  showLoading();
  elements.loginError.textContent = '';
  
  try {
    await auth.signInWithEmailAndPassword(email, password);
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
    
    elements.loginError.textContent = errorMessage;
  } finally {
    hideLoading();
  }
});

elements.logoutBtn.addEventListener('click', () => {
  if (confirm('Deseja realmente sair?')) {
    auth.signOut();
  }
});

document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    
    this.classList.add('active');
    const tabId = this.getAttribute('data-tab') + 'Tab';
    document.getElementById(tabId).style.display = 'block';
  });
});

async function initializeAdmin() {
  showLoading();
  try {
    await Promise.all([loadHouses(), loadConfigJSON()]);
  } catch (error) {
    console.error('Erro ao inicializar:', error);
  } finally {
    hideLoading();
  }
}

async function loadHouses() {
  const snapshot = await db.collection('houses').orderBy('createdAt', 'desc').get();
  allHouses = [];
  
  snapshot.forEach(doc => {
    allHouses.push({ id: doc.id, ...doc.data() });
  });
  
  updateStats();
  displayHouses(allHouses);
}

function updateStats() {
  const totalHouses = allHouses.length;
  const totalResidents = allHouses.reduce((sum, house) => sum + (house.residents?.length || 0), 0);
  const avgResidents = totalHouses > 0 ? (totalResidents / totalHouses).toFixed(1) : 0;
  
  document.getElementById('totalHouses').textContent = totalHouses;
  document.getElementById('totalResidentsCount').textContent = totalResidents;
  document.getElementById('avgResidents').textContent = avgResidents;
}

function displayHouses(houses) {
  elements.housesTableBody.innerHTML = '';
  
  houses.forEach(house => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${house.nomeResidencia || '(Sem nome)'}</td>
      <td>${house.nomeCaps || '-'}</td>
      <td>${house.tipoSRT || '-'}</td>
      <td>${house.residents?.length || 0}</td>
      <td>${house.vagasDisponiveis || 0}</td>
      <td>
        <button class="btn-primary view-btn" data-id="${house.id}">Ver Detalhes</button>
        <button class="btn-danger delete-btn" data-id="${house.id}">Excluir</button>
      </td>
    `;
    elements.housesTableBody.appendChild(row);
  });
  
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', (e) => viewHouseDetails(e.target.dataset.id));
  });
  
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => deleteHouse(e.target.dataset.id));
  });
}

function viewHouseDetails(houseId) {
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
  
  elements.modalDetails.innerHTML = detailsHTML;
  elements.modal.style.display = 'block';
}

async function deleteHouse(houseId) {
  if (!confirm('Tem certeza que deseja excluir esta casa? Esta ação não pode ser desfeita.')) {
    return;
  }
  
  showLoading();
  try {
    await db.collection('houses').doc(houseId).delete();
    await loadHouses();
    alert('Casa excluída com sucesso!');
  } catch (error) {
    console.error('Erro ao excluir:', error);
    alert('Erro ao excluir casa. Tente novamente.');
  } finally {
    hideLoading();
  }
}

elements.modalClose.addEventListener('click', () => {
  elements.modal.style.display = 'none';
});

window.addEventListener('click', (event) => {
  if (event.target === elements.modal) {
    elements.modal.style.display = 'none';
  }
});

elements.searchInput.addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const filtered = allHouses.filter(house => 
    house.nomeResidencia?.toLowerCase().includes(searchTerm) ||
    house.nomeCaps?.toLowerCase().includes(searchTerm) ||
    house.municipio?.toLowerCase().includes(searchTerm)
  );
  displayHouses(filtered);
});

elements.exportBtn.addEventListener('click', async () => {
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
    
  } catch (error) {
    console.error('Erro ao exportar:', error);
    alert('Erro ao exportar dados. Tente novamente.');
  } finally {
    hideLoading();
  }
});

async function loadConfigJSON() {
  const configRef = db.collection("config").doc("srt");
  const configSnap = await configRef.get();
  
  if (configSnap.exists) {
    currentConfig = configSnap.data();
    document.getElementById('configJSON').value = JSON.stringify(currentConfig, null, 2);
  }
}

elements.validateBtn.addEventListener('click', () => {
  try {
    const json = document.getElementById('configJSON').value;
    JSON.parse(json);
    alert('JSON válido!');
  } catch (e) {
    alert('JSON inválido: ' + e.message);
  }
});

elements.saveConfigBtn.addEventListener('click', async () => {
  try {
    const newConfig = JSON.parse(document.getElementById('configJSON').value);
    
    if (!newConfig.general || !newConfig.residence || !newConfig.caregivers || !newConfig.residentFields) {
      throw new Error('Configuração deve conter: general, residence, caregivers e residentFields');
    }
    
    showLoading();
    await db.collection("config").doc("srt").set(newConfig);
    currentConfig = newConfig;
    alert('Configuração salva com sucesso!');
  } catch (e) {
    alert('Erro ao salvar configuração: ' + e.message);
  } finally {
    hideLoading();
  }
});

elements.resetConfigBtn.addEventListener('click', async () => {
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
});

elements.generateReportBtn.addEventListener('click', async () => {
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  
  if (!startDate || !endDate) {
    alert('Selecione o período completo');
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
    
    const totalHouses = filteredHouses.length;
    const totalResidents = filteredHouses.reduce((sum, house) => sum + (house.residents?.length || 0), 0);
    const totalVagas = filteredHouses.reduce((sum, house) => sum + (parseInt(house.vagasTotais) || 0), 0);
    const vagasOcupadas = filteredHouses.reduce((sum, house) => sum + (parseInt(house.vagasOcupadas) || 0), 0);
    
    const tipoCount = filteredHouses.reduce((acc, house) => {
      const tipo = house.tipoSRT || 'Não especificado';
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {});
    
    let reportHTML = `
      <div class="report-summary">
        <h3>Resumo do Período</h3>
        <p><strong>Período:</strong> ${start.toLocaleDateString('pt-BR')} a ${end.toLocaleDateString('pt-BR')}</p>
        <p><strong>Total de Casas:</strong> ${totalHouses}</p>
        <p><strong>Total de Moradores:</strong> ${totalResidents}</p>
        <p><strong>Total de Vagas:</strong> ${totalVagas}</p>
        <p><strong>Vagas Ocupadas:</strong> ${vagasOcupadas}</p>
        <p><strong>Taxa de Ocupação:</strong> ${totalVagas ? ((vagasOcupadas/totalVagas)*100).toFixed(1) : 0}%</p>
        
        <h4>Distribuição por Tipo</h4>
        ${Object.entries(tipoCount).map(([tipo, count]) => 
          `<p>${tipo}: ${count} casas</p>`
        ).join('')}
      </div>
    `;
    
    document.getElementById('reportContent').innerHTML = reportHTML;
    
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    alert('Erro ao gerar relatório');
  } finally {
    hideLoading();
  }
});