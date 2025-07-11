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
let currentUser = null;
let currentTab = 'houses';
let occupancyChart = null;
let formConfig = null;
let editingFieldId = null;
let enderecoPorResidenciaId = {};

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

const initTabs = () => {
  const navItems = document.querySelectorAll('[data-tab]');
  const tabContents = document.querySelectorAll('.tab-content');
  
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.dataset.tab;
      
      navItems.forEach(nav => {
        nav.classList.remove('bg-blue-50', 'dark:bg-blue-900/20', 'text-blue-600', 'dark:text-blue-400');
        nav.classList.add('text-gray-600', 'dark:text-gray-400');
      });
      
      item.classList.add('bg-blue-50', 'dark:bg-blue-900/20', 'text-blue-600', 'dark:text-blue-400');
      item.classList.remove('text-gray-600', 'dark:text-gray-400');
      
      tabContents.forEach(content => {
        content.classList.remove('active');
      });
      
      const targetContent = document.getElementById(targetTab + 'Tab');
      if (targetContent) {
        targetContent.classList.add('active');
        currentTab = targetTab;
        
        if (targetTab === 'config') {
          loadFormConfiguration();
        } else if (targetTab === 'reports') {
          initReports();
        }
      }
    });
  });
};

const checkFirstTimeSetup = async () => {
  try {
    const usersSnapshot = await db.collection('users').where('role', '==', 'admin').limit(1).get();
    return usersSnapshot.empty;
  } catch (error) {
    console.error('Erro ao verificar setup inicial:', error);
    return false;
  }
};

const createInitialAdmin = async (email, name = 'Administrador Principal') => {
  try {
    const userData = {
      name: name,
      email: email,
      role: 'admin',
      status: 'active',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
      isInitialAdmin: true
    };
    
    await db.collection('users').doc(email).set(userData);
    console.log('Admin inicial criado:', email);
    return true;
  } catch (error) {
    console.error('Erro ao criar admin inicial:', error);
    return false;
  }
};

const ensureUserExists = async (user) => {
  try {
    const userDoc = await db.collection('users').doc(user.email).get();
    
    if (!userDoc.exists) {
      const userData = {
        name: user.displayName || 'Usuário',
        email: user.email,
        role: 'admin',
        status: 'active',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      await db.collection('users').doc(user.email).set(userData);
      console.log('Usuário criado automaticamente:', user.email);
    } else {
      await db.collection('users').doc(user.email).update({
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Erro ao verificar/criar usuário:', error);
    throw error;
  }
};

auth.onAuthStateChanged(async (user) => {
  const loginDiv = document.getElementById('loginDiv');
  const adminPanel = document.getElementById('adminPanel');
  
  if (user) {
    currentUser = user;
    showLoading();
    
    try {
      const isFirstTime = await checkFirstTimeSetup();
      
      if (isFirstTime) {
        await createInitialAdmin(user.email, 'Administrador Principal');
      }
      
      await ensureUserExists(user);
      
      loginDiv.style.display = 'none';
      adminPanel.style.display = 'flex';
      
      await initializeApp();
      
    } catch (error) {
      console.error('Erro na autenticação:', error);
      showToast('Erro ao carregar sistema: ' + error.message, 'error');
    } finally {
      hideLoading();
    }
  } else {
    currentUser = null;
    if (loginDiv) loginDiv.style.display = 'flex';
    if (adminPanel) adminPanel.style.display = 'none';
  }
});
const checkUserPermission = async (user) => {
  try {
    const needsSetup = await checkFirstTimeSetup();
    
    if (needsSetup) {
      const adminCreated = await createInitialAdmin(user.email);
      if (!adminCreated) {
        setTimeout(() => auth.signOut(), 3000);
        return;
      }
    }
    
    const userDoc = await db.collection('users').doc(user.email).get();
    
    if (!userDoc.exists) {
      showToast('Usuário não encontrado no sistema', 'error');
      setTimeout(() => auth.signOut(), 3000);
      return;
    }
    
    const userData = userDoc.data();
    
    if (userData.role !== 'admin') {
      showToast('Você não tem permissão de administrador', 'error');
      setTimeout(() => auth.signOut(), 3000);
      return;
    }
    
    if (userData.status !== 'active') {
      showToast('Sua conta está inativa', 'error');
      setTimeout(() => auth.signOut(), 3000);
      return;
    }
    
    try {
      await db.collection('users').doc(user.email).update({
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (updateError) {
      console.warn('Erro ao atualizar último acesso:', updateError);
    }
    
    document.getElementById('loginDiv').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'flex';
    initializeApp();
    
  } catch (error) {
    console.error('Erro ao verificar permissões:', error);
    showToast('Erro interno: ' + error.message, 'error');
    setTimeout(() => auth.signOut(), 3000);
  }
};

const initializeApp = async () => {
  try {
    initTheme();
    initTabs();
    
    await loadFormConfiguration();
    await loadHouses();
    setupEventListeners();
    
    showToast('Sistema carregado com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao inicializar:', error);
    showToast('Erro ao carregar dados: ' + error.message, 'error');
  }
};

const setupEventListeners = () => {
  document.getElementById('exportBtn').addEventListener('click', exportData);
  document.getElementById('searchInput').addEventListener('input', filterHouses);
  document.getElementById('logoutBtn').addEventListener('click', () => {
    if (confirm('Deseja realmente sair?')) {
      auth.signOut();
    }
  });
  
  document.getElementById('mobileMenuToggle').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('translate-x-0');
    sidebar.classList.toggle('-translate-x-full');
  });
  
  document.getElementById('addFieldBtn').addEventListener('click', () => {
    editingFieldId = null;
    document.getElementById('fieldModalTitle').textContent = 'Adicionar Campo';
    document.getElementById('fieldForm').reset();
    document.getElementById('fieldModal').style.display = 'block';
    updateFieldTypeOptions();
  });
  
  document.getElementById('fieldForm').addEventListener('submit', handleFieldSubmit);
  document.getElementById('fieldType').addEventListener('change', updateFieldTypeOptions);
  document.getElementById('addOptionBtn').addEventListener('click', addOption);
  
  document.getElementById('generateReportBtn').addEventListener('click', generateReport);
};

const handleLogin = async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorDiv = document.getElementById('loginError');
  const loginBtn = document.getElementById('loginBtn');
  
  if (!email || !password) {
    errorDiv.textContent = 'Por favor, preencha todos os campos';
    return;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errorDiv.textContent = 'Por favor, insira um e-mail válido';
    return;
  }
  
  loginBtn.disabled = true;
  loginBtn.innerHTML = `
    <div class="flex items-center gap-2">
      <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      <span>Entrando...</span>
    </div>
  `;
  errorDiv.textContent = '';
  
  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (error) {
    console.error('Erro no login:', error);
    
    let errorMessage = 'Erro ao fazer login';
    
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'Usuário não encontrado. Verifique o e-mail.';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Senha incorreta. Tente novamente.';
        break;
      case 'auth/invalid-email':
        errorMessage = 'E-mail inválido.';
        break;
      case 'auth/user-disabled':
        errorMessage = 'Esta conta foi desabilitada.';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Muitas tentativas de login. Tente novamente mais tarde.';
        break;
      case 'auth/network-request-failed':
        errorMessage = 'Erro de conexão. Verifique sua internet.';
        break;
      case 'auth/invalid-credential':
        errorMessage = 'Credenciais inválidas. Verifique e-mail e senha.';
        break;
      default:
        errorMessage = `Erro: ${error.message}`;
    }
    
    errorDiv.textContent = errorMessage;
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = `
      <span>Entrar</span>
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
    `;
  }
};

const loadHouses = async () => {
  const snapshot = await db.collection('srt').orderBy('createdAt', 'desc').get();
  allHouses = [];
  enderecoPorResidenciaId = {}; // Resetar para garantir dados atualizados
  
  snapshot.forEach(doc => {
    const houseData = { id: doc.id, ...doc.data() };
    allHouses.push(houseData);

    // Extrair e armazenar dados de endereço
    enderecoPorResidenciaId[doc.id] = {
      logradouro: houseData.logradouro || '',
      numero: houseData.numero || '',
      complemento: houseData.complemento || '',
      bairro: houseData.bairro || '',
      cep: houseData.cep || '',
      localizacao: houseData.localizacao || ''
    };
  });
  
  updateStats();
  displayHouses(allHouses);
  updateChart();
};

const updateStats = () => {
  const totalHouses = allHouses.length;
  const totalResidents = allHouses.reduce((sum, house) => {
    const residents = house.residents ? house.residents.length : 0;
    const numeroMoradores = parseInt(house.numeroMoradores) || 0;
    return sum + Math.max(residents, numeroMoradores);
  }, 0);
  
  const avgResidents = totalHouses > 0 ? (totalResidents / totalHouses).toFixed(1) : 0;
  
  const totalCapacity = allHouses.reduce((sum, house) => {
    return sum + (parseInt(house.vagasTotais) || 0);
  }, 0);
  
  const occupancyRate = totalCapacity > 0 ? ((totalResidents / totalCapacity) * 100).toFixed(1) : 0;
  
  animateNumber('totalHouses', totalHouses);
  animateNumber('totalResidentsCount', totalResidents);
  animateNumber('avgResidents', parseFloat(avgResidents));
  animateNumber('occupancyRate', parseFloat(occupancyRate));
};

const animateNumber = (elementId, target) => {
  const element = document.getElementById(elementId);
  const current = parseFloat(element.textContent) || 0;
  const duration = 1000;
  const startTime = performance.now();
  
  const animate = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    const currentValue = current + (target - current) * easeOutQuart;
    
    if (elementId === 'occupancyRate') {
      element.textContent = currentValue.toFixed(1) + '%';
    } else if (elementId === 'avgResidents') {
      element.textContent = currentValue.toFixed(1);
    } else {
      element.textContent = Math.round(currentValue);
    }
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };
  
  requestAnimationFrame(animate);
};

const displayHouses = (houses) => {
  const tbody = document.querySelector('#housesTable tbody');
  tbody.innerHTML = '';
  
  houses.forEach((house, index) => {
    const row = document.createElement('tr');
    row.className = 'table-row-hover transition-all duration-200';
    row.style.animationDelay = `${index * 50}ms`;
    row.classList.add('animate-fade-in');
    
    const capsVinculado = house.nome_do_caps_em_que_o_srt_esta_vinculada || '-';
    const tipoSRT = house.tipo_do_srt || '-';
    const moradores = house.residents ? house.residents.length : (house.numeroMoradores || 0);
    const vagas = house.vagasDisponiveis !== undefined ? house.vagasDisponiveis : '-';
    
    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm font-medium text-gray-900 dark:text-white">${capsVinculado}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm text-gray-600 dark:text-gray-300">${tipoSRT}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm text-gray-600 dark:text-gray-300">${moradores}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm text-gray-600 dark:text-gray-300">${vagas}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <button class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3 transform hover:scale-110 transition-all" onclick="viewHouse('${house.id}')">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
        <button class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transform hover:scale-110 transition-all" onclick="deleteHouse('${house.id}')">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
};

const filterHouses = () => {
  const search = document.getElementById('searchInput').value.toLowerCase();
  
  const filtered = allHouses.filter(house => {
    const capsVinculado = (house.nome_do_caps_em_que_o_srt_esta_vinculada || '').toLowerCase();
    const tipoSRT = (house.tipo_do_srt || '').toLowerCase();
    const municipio = (house.municipio || '').toLowerCase();
    const nomeResidencia = (house.nomeResidencia || '').toLowerCase();
    
    return capsVinculado.includes(search) || 
           tipoSRT.includes(search) || 
           municipio.includes(search) ||
           nomeResidencia.includes(search);
  });
  
  displayHouses(filtered);
};

window.viewHouse = async (houseId) => {
  const house = allHouses.find(h => h.id === houseId);
  if (!house) return;

  if (!formConfig) {
    await loadFormConfiguration();
  }
  
  const modal = document.getElementById('houseModal');
  const detailsDiv = document.getElementById('houseDetails');
  
  detailsDiv.innerHTML = generateHouseDetailsHTML(house);
  modal.style.display = 'block';
};

const generateHouseDetailsHTML = (house) => {
  if (!formConfig) {
    console.error("A configuração do formulário (formConfig) não foi carregada.");
    return '<p>Erro ao carregar a configuração do formulário. Não é possível exibir os detalhes.</p>';
  }

  const formatValue = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '-';
    return value;
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return '-';
    try {
      // Converte Timestamps do Firebase ou strings de data
      const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
      if (isNaN(date.getTime())) return dateValue; // Retorna o valor original se a data for inválida
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateValue;
    }
  };

  let html = '<div class="space-y-6">';

  const sectionsConfig = [
    { title: 'Informações do Município', icon: '🏛️', key: 'municipio' },
    { title: 'Dados do SRT', icon: '📋', key: 'general' },
    { title: 'Dados da Residência', icon: '🏠', key: 'residence' },
    { title: 'Dados da Equipe/Cuidadores', icon: '👥', key: 'caregivers' }
  ];

  sectionsConfig.forEach(section => {
    const fields = formConfig[section.key] || [];
    const sectionData = fields.map(field => {
      const value = house[field.key];
      if (value !== undefined && value !== null && value !== '') {
        return {
          label: field.label,
          value: field.type === 'date' ? formatDate(value) : formatValue(value)
        };
      }
      return null;
    }).filter(Boolean); // Remove os campos nulos

    if (sectionData.length > 0) {
      html += `
        <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
          <div class="flex items-center gap-3 mb-4">
            <span class="text-2xl">${section.icon}</span>
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white">${section.title}</h3>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      `;
      sectionData.forEach(item => {
        html += `
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4">
            <div class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">${item.label}</div>
            <div class="text-gray-900 dark:text-white">${item.value}</div>
          </div>
        `;
      });
      html += '</div></div>';
    }
  });

  // Adiciona a seção de Capacidade e Ocupação
  const capacityData = [
    { label: 'Cadastrados no CNES', value: house.vagasTotais || '-' },
    { label: 'Moradores Atuais', value: house.vagasOcupadas !== undefined ? house.vagasOcupadas : '-' },
    { label: 'Vagas Disponíveis', value: house.vagasDisponiveis !== undefined ? house.vagasDisponiveis : '-' },
    { label: 'Total de Moradores Cadastrados', value: house.numeroMoradores || '-' }
  ];

  html += `
    <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
      <div class="flex items-center gap-3 mb-4">
        <span class="text-2xl">📊</span>
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white">Capacidade e Ocupação</h3>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
  `;
  capacityData.forEach(item => {
    html += `
      <div class="bg-white dark:bg-gray-800 rounded-lg p-4">
        <div class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">${item.label}</div>
        <div class="text-gray-900 dark:text-white">${item.value}</div>
      </div>
    `;
  });
  html += '</div></div>';

  if (house.residents && house.residents.length > 0 && formConfig.residentFields) {
    html += `
      <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
        <div class="flex items-center gap-3 mb-4">
          <span class="text-2xl">🏥</span>
          <h3 class="text-lg font-semibold text-gray-800 dark:text-white">Moradores (${house.residents.length})</h3>
        </div>
        <div class="space-y-4">
    `;
    
    house.residents.forEach((resident, index) => {
      const residentName = formatValue(resident.nomeCompleto) || `Morador ${index + 1}`;
      const socialName = resident.nomeSocial ? `<span class="text-gray-500 ml-2">(${resident.nomeSocial})</span>` : '';

      html += `
        <div class="bg-white dark:bg-gray-800 rounded-lg p-4">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
              ${index + 1}
            </div>
            <div class="font-medium text-gray-900 dark:text-white">${residentName}${socialName}</div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
      `;
      
      formConfig.residentFields.forEach(field => {
        const value = resident[field.key];
        if (value !== undefined && value !== null && value !== '' && field.key !== 'nomeCompleto' && field.key !== 'nomeSocial') {
          const formattedValue = field.type === 'date' ? formatDate(value) : formatValue(value);
          html += `
            <div>
              <span class="text-gray-500 dark:text-gray-400">${field.label}:</span>
              <span class="text-gray-900 dark:text-white ml-1">${formattedValue}</span>
            </div>
          `;
        }
      });
      
      html += '</div></div>';
    });
    
    html += '</div></div>';
  }

  const createdAt = house.createdAt;
  if (createdAt) {
    html += `
      <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800 mt-6">
        <div class="flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="font-medium">Cadastrado em: ${formatDate(createdAt)}</span>
        </div>
      </div>
    `;
  }
  
  html += '</div>';
  return html;
};

window.deleteHouse = async (houseId) => {
  const house = allHouses.find(h => h.id === houseId);
  const houseName = house?.nomeResidencia || 'esta residência';
  
  if (!confirm(`Tem certeza que deseja excluir "${houseName}"? Esta ação não pode ser desfeita.`)) {
    return;
  }
  
  showLoading();
  try {
    await db.collection('srt').doc(houseId).delete();
    await loadHouses();
    showToast('Residência excluída com sucesso!');
  } catch (error) {
    console.error('Erro ao excluir:', error);
    showToast('Erro ao excluir residência', 'error');
  } finally {
    hideLoading();
  }
};

const updateChart = () => {
  const ctx = document.getElementById('occupancyChart');
  if (!ctx) return;
  
  if (occupancyChart) {
    occupancyChart.destroy();
  }
  
  const chartData = allHouses.slice(0, 10).map(house => {
    const total = parseInt(house.vagasTotais) || 0;
    const occupied = house.residents ? house.residents.length : (parseInt(house.numeroMoradores) || 0);
    const rate = total > 0 ? ((occupied / total) * 100).toFixed(1) : 0;
    
    return {
      name: house.nome_do_caps_em_que_o_srt_esta_vinculada || house.nomeResidencia || 'Sem nome',
      rate: parseFloat(rate)
    };
  });
  
  occupancyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chartData.map(item => item.name),
      datasets: [{
        label: 'Taxa de Ocupação (%)',
        data: chartData.map(item => item.rate),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function(value) {
              return value + '%';
            }
          }
        },
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 0
          }
        }
      }
    }
  });
};

const calculateColumnWidths = (sheetData, headers) => {
  const colWidths = headers.map((header, colIndex) => {
    let maxWidth = String(header).length; // Start with header length
    sheetData.forEach(row => {
      const cellValue = row[colIndex];
      if (cellValue !== undefined && cellValue !== null) {
        const valueLength = String(cellValue).length;
        if (valueLength > maxWidth) {
          maxWidth = valueLength;
        }
      }
    });
    return { wch: maxWidth + 2 }; // +2 for padding
  });
  return colWidths;
};

const exportData = () => {
  console.log('Iniciando exportação de dados...');
  if (!formConfig) {
    showToast('A configuração do formulário ainda está carregando. Tente novamente em alguns segundos.', 'error');
    console.error('Erro: formConfig não carregado.');
    return;
  }
  console.log('formConfig carregado:', formConfig);

  try {
    const wb = XLSX.utils.book_new();

  const palette = {
    primary: '1E40AF',
    secondary: '7C3AED',
    accent: '10B981',
    warning: 'F59E0B',
    danger: 'EF4444',
    info: '3B82F6',
    dark: '1F2937',
    light: 'F3F4F6',
    white: 'FFFFFF',
    gradientBlue: '60A5FA',
    gradientPurple: 'A78BFA',
    gradientGreen: '34D399',
    gradientOrange: 'FB923C',
    // New colors for styling
    mainTitleBg: 'F1F5FF',
    mainTitleFont: '1E2A78',
    headerBg: '4F6DFF',
    dataOddRow: 'F7F9FC',
    borderColor: 'D0D7E3'
  };

  const styles = {
    mainTitle: {
      font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: palette.mainTitleFont } },
      fill: { fgColor: { rgb: palette.mainTitleBg } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "medium", color: { rgb: palette.mainTitleBg } },
        bottom: { style: "medium", color: { rgb: palette.mainTitleBg } },
        left: { style: "medium", color: { rgb: palette.mainTitleBg } },
        right: { style: "medium", color: { rgb: palette.mainTitleBg } }
      }
    },
    sectionTitle: {
      font: { name: 'Calibri', sz: 18, bold: true, color: { rgb: palette.white } },
      fill: { fgColor: { rgb: palette.secondary } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: palette.white } },
        bottom: { style: "thin", color: { rgb: palette.white } },
        left: { style: "thin", color: { rgb: palette.white } },
        right: { style: "thin", color: { rgb: palette.white } }
      }
    },
    metricCard: {
      font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: palette.dark } },
      fill: { fgColor: { rgb: palette.gradientBlue } },
      alignment: { horizontal: "left", vertical: "center" },
      border: {
        top: { style: "medium", color: { rgb: palette.primary } },
        bottom: { style: "medium", color: { rgb: palette.primary } },
        left: { style: "medium", color: { rgb: palette.primary } },
        right: { style: "medium", color: { rgb: palette.primary } }
      }
    },
    metricValue: {
      font: { name: 'Calibri', sz: 36, bold: true, color: { rgb: palette.primary } },
      fill: { fgColor: { rgb: palette.light } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: palette.info } },
        bottom: { style: "thin", color: { rgb: palette.info } },
        left: { style: "thin", color: { rgb: palette.info } },
        right: { style: "thin", color: { rgb: palette.info } }
      }
    },
    tableHeader: {
      font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: palette.white } },
      fill: { fgColor: { rgb: palette.headerBg } }, // Updated background color
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: palette.borderColor } },
        bottom: { style: "thin", color: { rgb: palette.borderColor } }, // Updated border color
        left: { style: "thin", color: { rgb: palette.borderColor } },
        right: { style: "thin", color: { rgb: palette.borderColor } }
      }
    },
    tableCell: {
      font: { name: 'Calibri', sz: 11, color: { rgb: palette.dark } },
      fill: { fgColor: { rgb: palette.white } },
      alignment: { vertical: "center", wrapText: true, horizontal: "left" }, // Default text alignment
      border: {
        top: { style: "thin", color: { rgb: palette.borderColor } },
        bottom: { style: "thin", color: { rgb: palette.borderColor } },
        left: { style: "thin", color: { rgb: palette.borderColor } },
        right: { style: "thin", color: { rgb: palette.borderColor } }
      }
    },
    tableCellAlternate: {
      font: { name: 'Calibri', sz: 11, color: { rgb: palette.dark } },
      fill: { fgColor: { rgb: palette.dataOddRow } }, // Updated background color for odd rows
      alignment: { vertical: "center", wrapText: true, horizontal: "left" }, // Default text alignment
      border: {
        top: { style: "thin", color: { rgb: palette.borderColor } },
        bottom: { style: "thin", color: { rgb: palette.borderColor } },
        left: { style: "thin", color: { rgb: palette.borderColor } },
        right: { style: "thin", color: { rgb: palette.borderColor } }
      }
    },
    numberCell: { // New style for numbers
      font: { name: 'Calibri', sz: 11, color: { rgb: palette.dark } },
      fill: { fgColor: { rgb: palette.white } },
      alignment: { vertical: "center", horizontal: "center" },
      border: {
        top: { style: "thin", color: { rgb: palette.borderColor } },
        bottom: { style: "thin", color: { rgb: palette.borderColor } },
        left: { style: "thin", color: { rgb: palette.borderColor } },
        right: { style: "thin", color: { rgb: palette.borderColor } }
      }
    },
    numberCellAlternate: { // New style for numbers in alternate rows
      font: { name: 'Calibri', sz: 11, color: { rgb: palette.dark } },
      fill: { fgColor: { rgb: palette.dataOddRow } },
      alignment: { vertical: "center", horizontal: "center" },
      border: {
        top: { style: "thin", color: { rgb: palette.borderColor } },
        bottom: { style: "thin", color: { rgb: palette.borderColor } },
        left: { style: "thin", color: { rgb: palette.borderColor } },
        right: { style: "thin", color: { rgb: palette.borderColor } }
      }
    },
    dateCell: { // New style for dates
      font: { name: 'Calibri', sz: 11, color: { rgb: palette.dark } },
      fill: { fgColor: { rgb: palette.white } },
      alignment: { vertical: "center", horizontal: "center" },
      numFmt: 'DD/MM/YYYY',
      border: {
        top: { style: "thin", color: { rgb: palette.borderColor } },
        bottom: { style: "thin", color: { rgb: palette.borderColor } },
        left: { style: "thin", color: { rgb: palette.borderColor } },
        right: { style: "thin", color: { rgb: palette.borderColor } }
      }
    },
    dateCellAlternate: { // New style for dates in alternate rows
      font: { name: 'Calibri', sz: 11, color: { rgb: palette.dark } },
      fill: { fgColor: { rgb: palette.dataOddRow } },
      alignment: { vertical: "center", horizontal: "center" },
      numFmt: 'DD/MM/YYYY',
      border: {
        top: { style: "thin", color: { rgb: palette.borderColor } },
        bottom: { style: "thin", color: { rgb: palette.borderColor } },
        left: { style: "thin", color: { rgb: palette.borderColor } },
        right: { style: "thin", color: { rgb: palette.borderColor } }
      }
    },
    highlight: {
      font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: palette.white } },
      fill: { fgColor: { rgb: palette.accent } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "medium", color: { rgb: palette.accent } },
        bottom: { style: "medium", color: { rgb: palette.accent } },
        left: { style: "medium", color: { rgb: palette.accent } },
        right: { style: "medium", color: { rgb: palette.accent } }
      }
    }
  };

  const wsSummary = XLSX.utils.aoa_to_sheet([]);
  
  const summaryData = [];
  
  summaryData.push(['RESUMO EXECUTIVO - RESIDÊNCIAS TERAPÊUTICAS']);
  summaryData.push([]);
  summaryData.push(['Data de Geração:', new Date().toLocaleString('pt-BR')]);
  summaryData.push([]);
  
  summaryData.push(['INDICADORES GERAIS']);
  summaryData.push([]);
  
  const totalHouses = allHouses.length;
  const totalResidents = allHouses.reduce((sum, house) => sum + (house.residents ? house.residents.length : (parseInt(house.numeroMoradores) || 0)), 0);
  const totalCapacity = allHouses.reduce((sum, house) => sum + (parseInt(house.vagasTotais) || 0), 0);
  const occupancyRate = totalCapacity > 0 ? ((totalResidents / totalCapacity) * 100).toFixed(1) : 0;
  const avgResidentsPerHouse = totalHouses > 0 ? (totalResidents / totalHouses).toFixed(1) : 0;
  
  summaryData.push(['Total de Residências', totalHouses]);
  summaryData.push(['Total de Moradores', totalResidents]);
  summaryData.push(['Capacidade Total (CNES)', totalCapacity]);
  summaryData.push(['Taxa de Ocupação Geral', occupancyRate + '%']);
  summaryData.push(['Média de Moradores por Casa', avgResidentsPerHouse]);
  summaryData.push([]);
  
  summaryData.push(['DISTRIBUIÇÃO POR TIPO DE SRT']);
  summaryData.push([]);
  summaryData.push(['Tipo', 'Quantidade', 'Percentual']);
  
  const srtTypes = {};
  allHouses.forEach(house => {
    const type = house.tipo_do_srt || house.tipoSRT || 'Não informado';
    srtTypes[type] = (srtTypes[type] || 0) + 1;
  });
  
  Object.entries(srtTypes).forEach(([type, count]) => {
    const percentage = ((count / totalHouses) * 100).toFixed(1);
    summaryData.push([type, count, percentage + '%']);
  });
  
  summaryData.push([]);
  summaryData.push(['DISTRIBUIÇÃO POR MUNICÍPIO']);
  summaryData.push([]);
  summaryData.push(['Município', 'Residências', 'Moradores', 'Taxa de Ocupação']);
  
  const municipioStats = {};
  allHouses.forEach(house => {
    const municipio = house.municipio || 'Não informado';
    if (!municipioStats[municipio]) {
      municipioStats[municipio] = {
        houses: 0,
        residents: 0,
        capacity: 0
      };
    }
    municipioStats[municipio].houses++;
    municipioStats[municipio].residents += house.residents ? house.residents.length : (parseInt(house.numeroMoradores) || 0);
    municipioStats[municipio].capacity += parseInt(house.vagasTotais) || 0;
  });
  
  Object.entries(municipioStats).forEach(([municipio, stats]) => {
    const occupancy = stats.capacity > 0 ? ((stats.residents / stats.capacity) * 100).toFixed(1) : 0;
    summaryData.push([municipio, stats.houses, stats.residents, occupancy + '%']);
  });
  
  summaryData.push([]);
  summaryData.push(['ANÁLISE DOS MORADORES']);
  summaryData.push([]);
  
  const residentsByGender = {};
  const ageGroups = {
    '18-29 anos': 0,
    '30-39 anos': 0,
    '40-49 anos': 0,
    '50-59 anos': 0,
    '60+ anos': 0,
    'Não informado': 0
  };
  
  allHouses.forEach(house => {
    (house.residents || []).forEach(resident => {
      const gender = resident.sexo || 'Não informado';
      residentsByGender[gender] = (residentsByGender[gender] || 0) + 1;
      
      if (resident.dataNascimento) {
        const birthDate = new Date(resident.dataNascimento);
        const age = new Date().getFullYear() - birthDate.getFullYear();
        
        if (age < 30) ageGroups['18-29 anos']++;
        else if (age < 40) ageGroups['30-39 anos']++;
        else if (age < 50) ageGroups['40-49 anos']++;
        else if (age < 60) ageGroups['50-59 anos']++;
        else ageGroups['60+ anos']++;
      } else {
        ageGroups['Não informado']++;
      }
    });
  });
  
  summaryData.push(['Distribuição por Gênero']);
  summaryData.push(['Gênero', 'Quantidade', 'Percentual']);
  Object.entries(residentsByGender).forEach(([gender, count]) => {
    const percentage = ((count / totalResidents) * 100).toFixed(1);
    summaryData.push([gender, count, percentage + '%']);
  });
  
  summaryData.push([]);
  summaryData.push(['Distribuição por Faixa Etária']);
  summaryData.push(['Faixa Etária', 'Quantidade', 'Percentual']);
  Object.entries(ageGroups).forEach(([ageGroup, count]) => {
    if (count > 0) {
      const percentage = ((count / totalResidents) * 100).toFixed(1);
      summaryData.push([ageGroup, count, percentage + '%']);
    }
  });
  
  summaryData.push([]);
  summaryData.push(['TOP 10 RESIDÊNCIAS POR OCUPAÇÃO']);
  summaryData.push([]);
  summaryData.push(['CAPS Vinculado', 'Município', 'Moradores', 'Capacidade', 'Taxa de Ocupação']);
  
  const housesWithOccupancy = allHouses.map(house => {
    const capacity = parseInt(house.vagasTotais) || 0;
    const residents = house.residents ? house.residents.length : (parseInt(house.numeroMoradores) || 0);
    const rate = capacity > 0 ? ((residents / capacity) * 100) : 0;
    
    return {
      caps: house.nome_do_caps_em_que_o_srt_esta_vinculada || house.capsVinculado || '-',
      municipio: house.municipio || '-',
      residents,
      capacity,
      rate
    };
  }).sort((a, b) => b.rate - a.rate).slice(0, 10);
  
  housesWithOccupancy.forEach(house => {
    summaryData.push([house.caps, house.municipio, house.residents, house.capacity, house.rate.toFixed(1) + '%']);
  });
  
  XLSX.utils.sheet_add_aoa(wsSummary, summaryData, { origin: 'A1' });
  
  wsSummary['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 4 } },
    { s: { r: 13, c: 0 }, e: { r: 13, c: 4 } },
    { s: { r: 21, c: 0 }, e: { r: 21, c: 4 } },
    { s: { r: 28, c: 0 }, e: { r: 28, c: 4 } },
    { s: { r: 34, c: 0 }, e: { r: 34, c: 2 } },
    { s: { r: 40, c: 0 }, e: { r: 40, c: 2 } },
    { s: { r: 46, c: 0 }, e: { r: 46, c: 4 } }
  ];
  
  // Calculate column widths for summary sheet
  const summaryHeaders = summaryData[0]; // Assuming first row has headers for width calculation
  const summaryColWidths = calculateColumnWidths(summaryData.slice(1), summaryHeaders);
  wsSummary['!cols'] = summaryColWidths;
  
  wsSummary['!rows'] = [
    { hpt: 50 }, // Main title row
    { hpt: 20 },
    { hpt: 25 },
    { hpt: 20 },
    { hpt: 35 }, // Section title row
    { hpt: 20 },
    { hpt: 22 }, // Header row for 'DISTRIBUIÇÃO POR TIPO DE SRT'
    { hpt: 25 },
    { hpt: 25 },
    { hpt: 25 },
    { hpt: 25 },
    { hpt: 20 },
    { hpt: 25 },
    { hpt: 35 }
  ];
  
  const range = XLSX.utils.decode_range(wsSummary['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell_address = XLSX.utils.encode_cell({r: R, c: C});
      if (!wsSummary[cell_address]) continue;
      
      if (R === 0) {
        wsSummary[cell_address].s = styles.mainTitle;
      } else if ([4, 13, 21, 28, 34, 40, 46].includes(R)) {
        wsSummary[cell_address].s = styles.sectionTitle;
      } else if ([6, 15, 23, 30, 36, 42, 48].includes(R)) { // Adjusted header rows for tableHeader style
        wsSummary[cell_address].s = styles.tableHeader;
        wsSummary['!rows'][R] = { hpt: 22 }; // Set header row height
      } else {
        // Apply zebra striping and alignment for data rows
        const isEvenRow = (R % 2 === 0);
        const cellValue = wsSummary[cell_address].v;
        if (typeof cellValue === 'number') {
          wsSummary[cell_address].s = isEvenRow ? styles.numberCell : styles.numberCellAlternate;
        } else if (cellValue instanceof Date) {
          wsSummary[cell_address].s = isEvenRow ? styles.dateCell : styles.dateCellAlternate;
        } else {
          wsSummary[cell_address].s = isEvenRow ? styles.tableCell : styles.tableCellAlternate;
        }
      }
    }
  }
  
  wsSummary['!freeze'] = { xSplit: 0, ySplit: 1 }; // Freeze first row
  wsSummary['!autofilter'] = { ref: XLSX.utils.encode_range({s:{r:0,c:0},e:{r:0,c:summaryColWidths.length-1}}) }; // Autofilter on header

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo Executivo');

  const residenceSheetData = [];
  const residenceHeaders = [];
  const headerSections = [];

  const allResidenceFields = [
    ...formConfig.municipio, 
    ...formConfig.general, 
    ...formConfig.residence, 
    ...formConfig.caregivers
  ];

  const sections = {
      'Informações do Município': formConfig.municipio.length,
      'Dados do SRT': formConfig.general.length,
      'Dados da Residência': formConfig.residence.length,
      'Dados da Equipe/Cuidadores': formConfig.caregivers.length
  };

  headerSections.push(...Object.keys(sections).map(s => ({ name: s, count: sections[s] })));
  allResidenceFields.forEach(field => residenceHeaders.push(field.label));
  residenceHeaders.push('Data de Cadastro');

  const sheetData = [residenceHeaders];

  allHouses.forEach(house => {
    const row = [];
    allResidenceFields.forEach(field => {
      const value = house[field.key];
      if (field.type === 'date' && value && value.seconds) {
        row.push(new Date(value.seconds * 1000)); // Push Date object for proper formatting
      } else if (Array.isArray(value)) {
        row.push(value.join(', '));
      } else {
        row.push(value || '-');
      }
    });
    row.push(house.createdAt && house.createdAt.seconds ? new Date(house.createdAt.seconds * 1000) : '-'); // Push Date object
    sheetData.push(row);
  });
  
  const wsResidences = XLSX.utils.aoa_to_sheet([[]]);
  wsResidences['!merges'] = [];
  XLSX.utils.sheet_add_aoa(wsResidences, sheetData, {origin: 'A2'});

  const sectionColors = [palette.info, palette.accent, palette.secondary, palette.warning];
  let startCol = 0;
  headerSections.forEach((section, i) => {
      if(section.count > 0) {
          const color = sectionColors[i % sectionColors.length];
          wsResidences['!merges'].push({ s: { r: 0, c: startCol }, e: { r: 0, c: startCol + section.count - 1 } });
          const cellRef = XLSX.utils.encode_cell({ r: 0, c: startCol });
          wsResidences[cellRef] = { 
            t: 's', 
            v: section.name, 
            s: {
              font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: palette.white } },
              fill: { fgColor: { rgb: color } },
              alignment: { horizontal: "center", vertical: "center" },
              border: {
                top: { style: "medium", color: { rgb: palette.white } },
                bottom: { style: "medium", color: { rgb: palette.white } },
                left: { style: "medium", color: { rgb: palette.white } },
                right: { style: "medium", color: { rgb: palette.white } }
              }
            }
          };
          startCol += section.count;
      }
  });

  // Calculate column widths for residences sheet
  const residenceColWidths = calculateColumnWidths(sheetData.slice(1), residenceHeaders);
  wsResidences['!cols'] = residenceColWidths;

  const residenceRange = XLSX.utils.decode_range(wsResidences['!ref'] || 'A1');
  for (let R = 1; R <= residenceRange.e.r; ++R) {
    for (let C = 0; C <= residenceRange.e.c; ++C) {
      const cell_address = XLSX.utils.encode_cell({r: R, c: C});
      if (!wsResidences[cell_address]) continue;
      
      if (R === 1) { // Header row
        wsResidences[cell_address].s = styles.tableHeader;
      } else { // Data rows
        const isEvenRow = (R % 2 === 0);
        const cellValue = wsResidences[cell_address].v;
        if (typeof cellValue === 'number') {
          wsResidences[cell_address].s = isEvenRow ? styles.numberCell : styles.numberCellAlternate;
        } else if (cellValue instanceof Date) {
          wsResidences[cell_address].s = isEvenRow ? styles.dateCell : styles.dateCellAlternate;
        } else {
          wsResidences[cell_address].s = isEvenRow ? styles.tableCell : styles.tableCellAlternate;
        }
      }
    }
  }
  
  wsResidences['!rows'] = [{hpt: 22}, {hpt: 22}]; // Header row height
  wsResidences['!freeze'] = { xSplit: 0, ySplit: 1 }; // Freeze first row
  wsResidences['!autofilter'] = { ref: XLSX.utils.encode_range({s:{r:1,c:0},e:{r:1,c:residenceColWidths.length-1}}) }; // Autofilter on header

  XLSX.utils.book_append_sheet(wb, wsResidences, 'Residências');

  const residentsSheetData = [];
  const residentHeaders = ['CNES do CAPS', ...formConfig.residentFields.map(f => f.label)];

  // Find the index of 'Identidade de gênero' and insert new address headers
  const genderIdentityIndex = residentHeaders.indexOf('Identidade de gênero');
  if (genderIdentityIndex !== -1) {
    residentHeaders.splice(genderIdentityIndex + 1, 0, 
      'Logradouro', 'Número', 'Complemento', 'Bairro', 'CEP', 'Localização'
    );
  }

  allHouses.forEach(house => {
    if (house.residents && house.residents.length > 0) {
      // If there's only one residence, use its address for all residents
      const addressToUse = allHouses.length === 1 ? enderecoPorResidenciaId[allHouses[0].id] : null;

      house.residents.forEach(resident => {
        const row = { 'CNES do CAPS': house.cnesCapsVinculada || house.id };
        formConfig.residentFields.forEach(field => {
          const value = resident[field.key];
          if (field.type === 'date' && value) {
            row[field.label] = new Date(value); // Push Date object for proper formatting
          } else {
            row[field.label] = value || '-';
          }
        });
        // Append address details
        const address = addressToUse || enderecoPorResidenciaId[house.id];
        if (address) {
          row['Logradouro'] = address.logradouro;
          row['Número'] = address.numero;
          row['Complemento'] = address.complemento;
          row['Bairro'] = address.bairro;
          row['CEP'] = address.cep;
          row['Localização'] = address.localizacao;
        }
        residentsSheetData.push(row);
      });
    }
  });

  if (residentsSheetData.length > 0) {
    const wsResidents = XLSX.utils.json_to_sheet(residentsSheetData, { header: residentHeaders });
    
    // Calculate column widths for residents sheet
    const residentColWidths = calculateColumnWidths(residentsSheetData, residentHeaders);
    wsResidents['!cols'] = residentColWidths;

    const residentRange = XLSX.utils.decode_range(wsResidents['!ref']);
    for (let R = residentRange.s.r; R <= residentRange.e.r; ++R) {
      for (let C = residentRange.s.c; C <= residentRange.e.c; ++C) {
        const cell_address = XLSX.utils.encode_cell({c:C, r:R});
        if (!wsResidents[cell_address]) continue;
        
        if (R === 0) { // Header row
          wsResidents[cell_address].s = styles.tableHeader;
        } else { // Data rows
          const isEvenRow = (R % 2 !== 0); // Adjusted for 0-indexed row and 1-indexed Excel row
          const cellValue = wsResidents[cell_address].v;
          if (typeof cellValue === 'number') {
            wsResidents[cell_address].s = isEvenRow ? styles.numberCell : styles.numberCellAlternate;
          } else if (cellValue instanceof Date) {
            wsResidents[cell_address].s = isEvenRow ? styles.dateCell : styles.dateCellAlternate;
          } else {
            wsResidents[cell_address].s = isEvenRow ? styles.tableCell : styles.tableCellAlternate;
          }
        }
      }
    }
    
    wsResidents['!rows'] = [{hpt: 22}]; // Header row height
    wsResidents['!freeze'] = { xSplit: 0, ySplit: 1 }; // Freeze first row
    wsResidents['!autofilter'] = { ref: XLSX.utils.encode_range({s:{r:0,c:0},e:{r:0,c:residentColWidths.length-1}}) }; // Autofilter on header

    XLSX.utils.book_append_sheet(wb, wsResidents, 'Moradores');
  }

  const fileName = `Relatorio_SRT_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`;
  XLSX.writeFile(wb, fileName, {
    bookType: 'xlsx',
    bookSST: false,
    type: 'binary',
    cellStyles: true
  });
  
  showToast('Relatório exportado com sucesso!');
  } catch (error) {
    console.error('Erro ao exportar dados:', error);
    showToast('Erro ao exportar dados: ' + error.message, 'error');
  }
};

const loadFormConfiguration = async () => {
  try {
    const configRef = db.collection('config').doc('srt');
    const configSnap = await configRef.get();
    
    if (configSnap.exists) {
      formConfig = configSnap.data();
    } else {
      formConfig = {
        municipio: [],
        general: [],
        residence: [],
        caregivers: [],
        residentFields: []
      };
    }
    
    displayFormConfiguration();
  } catch (error) {
    console.error('Erro ao carregar configuração:', error);
    showToast('Erro ao carregar configuração', 'error');
  }
};

const displayFormConfiguration = () => {
  const sections = ['municipio', 'general', 'residence', 'caregivers', 'residentFields'];
  
  sections.forEach(section => {
    const container = document.getElementById(section + 'FieldsList');
    const fields = formConfig[section] || [];
    
    container.innerHTML = '';
    
    fields.forEach((field, index) => {
      const fieldDiv = document.createElement('div');
      fieldDiv.className = 'bg-gray-50 dark:bg-gray-700 rounded-lg p-3 flex items-center justify-between';
      
      fieldDiv.innerHTML = `
        <div>
          <div class="font-medium text-gray-800 dark:text-white">${field.label}</div>
          <div class="text-sm text-gray-500 dark:text-gray-400">${field.type} ${field.required ? '(obrigatório)' : ''}</div>
        </div>
        <div class="flex gap-2">
          <button onclick="editField('${section}', ${index})" class="text-blue-600 hover:text-blue-800 dark:text-blue-400">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button onclick="deleteField('${section}', ${index})" class="text-red-600 hover:text-red-800 dark:text-red-400">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      `;
      
      container.appendChild(fieldDiv);
    });
    
    const sectionElement = document.querySelector(`[data-section="${section}"]`);
    if (sectionElement) {
      const countElement = sectionElement.querySelector('.field-count');
      if (countElement) {
        countElement.textContent = `${fields.length} campos`;
      }
    }
  });
};

window.editField = (section, index) => {
  const field = formConfig[section][index];
  editingFieldId = { section, index };
  
  document.getElementById('fieldModalTitle').textContent = 'Editar Campo';
  document.getElementById('fieldSection').value = section;
  document.getElementById('fieldType').value = field.type;
  document.getElementById('fieldLabel').value = field.label;
  document.getElementById('fieldKey').value = field.key;
  document.getElementById('fieldRequired').checked = field.required || false;
  
  if (field.min !== undefined) document.getElementById('fieldMin').value = field.min;
  if (field.max !== undefined) document.getElementById('fieldMax').value = field.max;
  
  updateFieldTypeOptions();
  
  if (field.options) {
    const optionsList = document.getElementById('optionsList');
    optionsList.innerHTML = '';
    field.options.forEach(option => {
      addOptionToList(option);
    });
  }
  
  document.getElementById('fieldModal').style.display = 'block';
};

window.deleteField = async (section, index) => {
  const field = formConfig[section][index];
  
  if (!confirm(`Tem certeza que deseja excluir o campo "${field.label}"?`)) {
    return;
  }
  
  formConfig[section].splice(index, 1);
  
  try {
    await db.collection('config').doc('srt').set(formConfig);
    displayFormConfiguration();
    showToast('Campo excluído com sucesso!');
  } catch (error) {
    console.error('Erro ao excluir campo:', error);
    showToast('Erro ao excluir campo', 'error');
  }
};

const updateFieldTypeOptions = () => {
  const fieldType = document.getElementById('fieldType').value;
  const optionsContainer = document.getElementById('optionsContainer');
  const numberConstraints = document.getElementById('numberConstraints');
  
  optionsContainer.style.display = ['select', 'multiselect'].includes(fieldType) ? 'block' : 'none';
  numberConstraints.style.display = fieldType === 'number' ? 'grid' : 'none';
};

const addOption = () => {
  addOptionToList('');
};

const addOptionToList = (value = '') => {
  const optionsList = document.getElementById('optionsList');
  const optionDiv = document.createElement('div');
  optionDiv.className = 'flex gap-2';
  
  optionDiv.innerHTML = `
    <input type="text" value="${value}" class="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Opção">
    <button type="button" onclick="this.parentElement.remove()" class="px-3 py-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition-all">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  `;
  
  optionsList.appendChild(optionDiv);
};

const handleFieldSubmit = async (e) => {
  e.preventDefault();
  
  const section = document.getElementById('fieldSection').value;
  const type = document.getElementById('fieldType').value;
  const label = document.getElementById('fieldLabel').value;
  const key = document.getElementById('fieldKey').value;
  const required = document.getElementById('fieldRequired').checked;
  
  const field = {
    type,
    label,
    key,
    required
  };
  
  if (type === 'number') {
    const min = document.getElementById('fieldMin').value;
    const max = document.getElementById('fieldMax').value;
    if (min) field.min = parseInt(min);
    if (max) field.max = parseInt(max);
  }
  
  if (['select', 'multiselect'].includes(type)) {
    const optionInputs = document.querySelectorAll('#optionsList input');
    field.options = Array.from(optionInputs)
      .map(input => input.value.trim())
      .filter(value => value);
  }
  
  try {
    if (editingFieldId) {
      formConfig[editingFieldId.section][editingFieldId.index] = field;
    } else {
      if (!formConfig[section]) formConfig[section] = [];
      formConfig[section].push(field);
    }
    
    await db.collection('config').doc('srt').set(formConfig);
    displayFormConfiguration();
    closeFieldModal();
    showToast(editingFieldId ? 'Campo atualizado com sucesso!' : 'Campo adicionado com sucesso!');
  } catch (error) {
    console.error('Erro ao salvar campo:', error);
    showToast('Erro ao salvar campo', 'error');
  }
};

window.closeFieldModal = () => {
  document.getElementById('fieldModal').style.display = 'none';
  document.getElementById('fieldForm').reset();
  document.getElementById('optionsList').innerHTML = '';
  editingFieldId = null;
};

const initReports = () => {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  
  document.getElementById('startDate').value = firstDay.toISOString().split('T')[0];
  document.getElementById('endDate').value = today.toISOString().split('T')[0];
};

const generateReport = () => {
  const startDate = new Date(document.getElementById('startDate').value);
  const endDate = new Date(document.getElementById('endDate').value);
  const reportType = document.getElementById('reportType').value;
  
  const filteredHouses = allHouses.filter(house => {
    if (!house.createdAt) return false;
    const houseDate = house.createdAt.toDate();
    return houseDate >= startDate && houseDate <= endDate;
  });
  
  let reportHTML = '';
  
  switch (reportType) {
    case 'summary':
      reportHTML = generateSummaryReport(filteredHouses);
      break;
    case 'occupancy':
      reportHTML = generateOccupancyReport(filteredHouses);
      break;
    case 'residents':
      reportHTML = generateResidentsReport(filteredHouses);
      break;
  }
  
  document.getElementById('reportContent').innerHTML = reportHTML;
};

const generateSummaryReport = (houses) => {
  const totalHouses = houses.length;
  const totalResidents = houses.reduce((sum, house) => {
    return sum + (house.residents ? house.residents.length : (parseInt(house.numeroMoradores) || 0));
  }, 0);
  
  const municipios = [...new Set(houses.map(h => h.municipio).filter(Boolean))];
  const tiposSRT = [...new Set(houses.map(h => h.tipoSRT || h.tipo).filter(Boolean))];
  
  return `
    <div class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">${totalHouses}</div>
          <div class="text-sm text-gray-600 dark:text-gray-400">Total de Residências</div>
        </div>
        <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-green-600 dark:text-green-400">${totalResidents}</div>
          <div class="text-sm text-gray-600 dark:text-gray-400">Total de Moradores</div>
        </div>
        <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">${municipios.length}</div>
          <div class="text-sm text-gray-600 dark:text-gray-400">Municípios</div>
        </div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 class="font-semibold text-gray-800 dark:text-white mb-3">Municípios</h4>
          <div class="space-y-2">
            ${municipios.map(m => `<div class="text-sm text-gray-600 dark:text-gray-400">• ${m}</div>`).join('')}
          </div>
        </div>
        <div>
          <h4 class="font-semibold text-gray-800 dark:text-white mb-3">Tipos de SRT</h4>
          <div class="space-y-2">
            ${tiposSRT.map(t => `<div class="text-sm text-gray-600 dark:text-gray-400">• ${t}</div>`).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
};

const generateOccupancyReport = (houses) => {
  const occupancyData = houses.map(house => {
    const total = parseInt(house.vagasTotais) || 0;
    const occupied = house.residents ? house.residents.length : (parseInt(house.numeroMoradores) || 0);
    const rate = total > 0 ? ((occupied / total) * 100).toFixed(1) : 0;
    
    return {
      name: house.nome_do_caps_em_que_o_srt_esta_vinculada || house.nomeResidencia || 'Sem nome',
      total,
      occupied,
      rate: parseFloat(rate)
    };
  }).sort((a, b) => b.rate - a.rate);
  
  const avgOccupancy = occupancyData.length > 0 
    ? (occupancyData.reduce((sum, item) => sum + item.rate, 0) / occupancyData.length).toFixed(1)
    : 0;
  
  return `
    <div class="space-y-6">
      <div class="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-orange-600 dark:text-orange-400">${avgOccupancy}%</div>
        <div class="text-sm text-gray-600 dark:text-gray-400">Taxa Média de Ocupação</div>
      </div>
      
      <div class="space-y-3">
        ${occupancyData.map(item => `
          <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div class="flex justify-between items-center mb-2">
              <div class="font-medium text-gray-800 dark:text-white">${item.name}</div>
              <div class="text-lg font-bold text-blue-600 dark:text-blue-400">${item.rate}%</div>
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400">
              ${item.occupied} de ${item.total} vagas ocupadas
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-2">
              <div class="bg-blue-500 h-2 rounded-full" style="width: ${item.rate}%"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
};

const generateResidentsReport = (houses) => {
  const allResidents = houses.flatMap(house => 
    (house.residents || []).map(resident => ({
      ...resident,
      houseName: house.nome_do_caps_em_que_o_srt_esta_vinculada || house.nomeResidencia || 'Sem nome'
    }))
  );
  
  const sexCount = allResidents.reduce((acc, resident) => {
    const sex = resident.sexo || 'Não informado';
    acc[sex] = (acc[sex] || 0) + 1;
    return acc;
  }, {});
  
  const ageGroups = allResidents.reduce((acc, resident) => {
    if (resident.dataNascimento) {
      const birthDate = new Date(resident.dataNascimento);
      const age = new Date().getFullYear() - birthDate.getFullYear();
      
      let group;
      if (age < 30) group = '18-29 anos';
      else if (age < 40) group = '30-39 anos';
      else if (age < 50) group = '40-49 anos';
      else if (age < 60) group = '50-59 anos';
      else group = '60+ anos';
      
      acc[group] = (acc[group] || 0) + 1;
    }
    return acc;
  }, {});
  
  return `
    <div class="space-y-6">
      <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">${allResidents.length}</div>
        <div class="text-sm text-gray-600 dark:text-gray-400">Total de Moradores</div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 class="font-semibold text-gray-800 dark:text-white mb-3">Distribuição por Sexo</h4>
          <div class="space-y-2">
            ${Object.entries(sexCount).map(([sex, count]) => `
              <div class="flex justify-between items-center">
                <span class="text-gray-600 dark:text-gray-400">${sex}</span>
                <span class="font-medium text-gray-800 dark:text-white">${count}</span>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div>
          <h4 class="font-semibold text-gray-800 dark:text-white mb-3">Distribuição por Faixa Etária</h4>
          <div class="space-y-2">
            ${Object.entries(ageGroups).map(([group, count]) => `
              <div class="flex justify-between items-center">
                <span class="text-gray-600 dark:text-gray-400">${group}</span>
                <span class="font-medium text-gray-800 dark:text-white">${count}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
};

document.addEventListener('DOMContentLoaded', () => {
  const loginDiv = document.getElementById('loginDiv');
  if (loginDiv) {
    loginDiv.style.display = 'flex';
  }

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
});