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
let editingField = null;
let editingFieldIndex = null;
let editingFieldSection = null;

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
    
    if (occupancyChart) {
      updateChartTheme();
    }
  });
};

const updateChartTheme = () => {
  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#e5e7eb' : '#4b5563';
  const gridColor = isDark ? '#374151' : '#f3f4f6';
  
  occupancyChart.options.plugins.legend.labels.color = textColor;
  occupancyChart.options.scales.y.ticks.color = textColor;
  occupancyChart.options.scales.x.ticks.color = textColor;
  occupancyChart.options.scales.y.grid.color = gridColor;
  occupancyChart.update();
};

auth.onAuthStateChanged(async user => {
  if (user) {
    try {
      const userDoc = await db.collection('users').doc(user.email).get();
      
      if (!userDoc.exists) {
        await db.collection('users').doc(user.email).set({
          email: user.email,
          name: user.displayName || 'Administrador',
          role: 'admin',
          status: 'active',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        const userData = userDoc.data();
        if (userData.status !== 'active') {
          showToast('Sua conta está inativa. Entre em contato com o administrador.', 'error');
          auth.signOut();
          return;
        }
      }
    } catch (error) {
      console.error('Erro ao verificar usuário:', error);
    }
    
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
  const loginBtn = document.getElementById('loginBtn');
  
  loginBtn.disabled = true;
  loginBtn.innerHTML = `
    <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
    <span>Entrando...</span>
  `;
  
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
    document.getElementById('loginForm').classList.add('animate-shake');
    setTimeout(() => document.getElementById('loginForm').classList.remove('animate-shake'), 500);
  } finally {
    hideLoading();
    loginBtn.disabled = false;
    loginBtn.innerHTML = `
      <span>Entrar</span>
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
    `;
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  if (confirm('Deseja realmente sair?')) {
    auth.signOut();
    showToast('Logout realizado com sucesso!');
  }
});

document.getElementById('mobileMenuToggle').addEventListener('click', () => {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('translate-x-0');
  sidebar.classList.toggle('-translate-x-full');
});

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', function() {
    document.querySelectorAll('.nav-item').forEach(i => {
      i.classList.remove('bg-blue-50', 'dark:bg-blue-900/20', 'text-blue-600', 'dark:text-blue-400');
      i.classList.add('text-gray-600', 'dark:text-gray-400');
    });
    
    document.querySelectorAll('.tab-content').forEach(t => {
      t.classList.remove('active');
      t.style.display = 'none';
    });
    
    this.classList.remove('text-gray-600', 'dark:text-gray-400');
    this.classList.add('bg-blue-50', 'dark:bg-blue-900/20', 'text-blue-600', 'dark:text-blue-400');
    
    const tabId = this.getAttribute('data-tab') + 'Tab';
    const tab = document.getElementById(tabId);
    tab.style.display = 'block';
    setTimeout(() => tab.classList.add('active'), 10);
    
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth < 768) {
      sidebar.classList.add('-translate-x-full');
      sidebar.classList.remove('translate-x-0');
    }
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
  
  const statElements = [
    { id: 'totalHouses', value: totalHouses },
    { id: 'totalResidentsCount', value: totalResidents },
    { id: 'avgResidents', value: avgResidents },
    { id: 'occupancyRate', value: occupancyRate + '%' }
  ];
  
  statElements.forEach(({ id, value }) => {
    const element = document.getElementById(id);
    const current = parseFloat(element.textContent) || 0;
    const target = parseFloat(value) || 0;
    
    const duration = 1000;
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = current + (target - current) * easeOutQuart;
      
      element.textContent = id === 'occupancyRate' 
        ? currentValue.toFixed(1) + '%' 
        : Math.round(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  });
  
  updateChart();
};

const initializeChart = () => {
  const ctx = document.getElementById('occupancyChart');
  if (!ctx) return;
  
  const isDark = document.documentElement.classList.contains('dark');
  
  occupancyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Taxa de Ocupação (%)',
        data: [],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        borderRadius: 8,
        hoverBackgroundColor: 'rgba(139, 92, 246, 0.8)',
        hoverBorderColor: 'rgba(139, 92, 246, 1)',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
          titleColor: isDark ? '#f3f4f6' : '#111827',
          bodyColor: isDark ? '#e5e7eb' : '#4b5563',
          borderColor: isDark ? '#374151' : '#e5e7eb',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          displayColors: false,
          callbacks: {
            label: function(context) {
              return `Ocupação: ${context.parsed.y}%`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          grid: {
            color: isDark ? '#374151' : '#f3f4f6',
            drawBorder: false
          },
          ticks: {
            color: isDark ? '#e5e7eb' : '#4b5563',
            callback: value => value + '%',
            padding: 8
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: isDark ? '#e5e7eb' : '#4b5563',
            maxRotation: 45,
            minRotation: 45
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeOutQuart'
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
  
  houses.forEach((house, index) => {
    const row = document.createElement('tr');
    row.className = 'table-row-hover transition-all duration-200';
    row.style.animationDelay = `${index * 50}ms`;
    row.classList.add('animate-fade-in');
    
    const tipoColor = house.tipoSRT === 'Tipo I' 
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' 
      : 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
    
    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm font-medium text-gray-900 dark:text-white">${house.nomeResidencia || house.nomeResidenciaTherapeutica || house.nome_da_residencia_terapeutica_caso_possua || '(Sem nome)'}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm text-gray-600 dark:text-gray-300">${house.nomeCaps || house.capsVinculadaSRT || '-'}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${tipoColor}">
          ${house.tipoSRT || '-'}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
        <div class="flex items-center">
          <svg class="w-4 h-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          ${house.residents?.length || 0}
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
        <div class="flex items-center">
          <div class="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
            <div class="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500" style="width: ${house.vagasTotais > 0 ? (house.vagasOcupadas / house.vagasTotais * 100) : 0}%"></div>
          </div>
          <span>${house.vagasOcupadas || 0}/${house.vagasTotais || 0}</span>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <button class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3 transform hover:scale-110 transition-all" onclick="viewHouseDetails('${house.id}')">
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

const viewHouseDetails = (houseId) => {
  const house = allHouses.find(h => h.id === houseId);
  if (!house) return;
  
  let detailsHTML = `
    <div class="space-y-6">
  `;
  
  // Seção: Informações do Município
  if (house.regiaoSaude || house.municipio || house.responsavelPreenchimento) {
    detailsHTML += `
      <div class="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <svg class="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Informações do Município
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Região de Saúde</p>
            <p class="font-medium text-gray-900 dark:text-white">${house.regiaoSaude || '-'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Município</p>
            <p class="font-medium text-gray-900 dark:text-white">${house.municipio || '-'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Coordenação de Saúde Mental</p>
            <p class="font-medium text-gray-900 dark:text-white">${house.coordenacaoSaudeMental || '-'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Responsável pelo Preenchimento</p>
            <p class="font-medium text-gray-900 dark:text-white">${house.responsavelPreenchimento || '-'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Telefone do Responsável</p>
            <p class="font-medium text-gray-900 dark:text-white">${house.telefoneResponsavelPreenchimento || '-'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">E-mail do Responsável</p>
            <p class="font-medium text-gray-900 dark:text-white">${house.emailResponsavelPreenchimento || '-'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Data do Preenchimento Municipal</p>
            <p class="font-medium text-gray-900 dark:text-white">${house.dataPreenchimentoMunicipio || '-'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">CAPS de Referência da SRT</p>
            <p class="font-medium text-gray-900 dark:text-white">${house.capsVinculadaSRT || '-'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">CNES do CAPS</p>
            <p class="font-medium text-gray-900 dark:text-white">${house.cnesCapsVinculada || '-'}</p>
          </div>
        </div>
      </div>
    `;
  }
  
  detailsHTML += `
    <div class="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
        <svg class="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Dados do SRT
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">Data do Preenchimento</p>
          <p class="font-medium text-gray-900 dark:text-white">${house.dataPreenchimento || '-'}</p>
        </div>
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">Responsável pela Residência</p>
          <p class="font-medium text-gray-900 dark:text-white">${house.responsavelNome || '-'}</p>
        </div>
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">Cargo/Função</p>
          <p class="font-medium text-gray-900 dark:text-white">${house.responsavelCargo || '-'}</p>
        </div>
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">Telefone de Contato</p>
          <p class="font-medium text-gray-900 dark:text-white">${house.contatoResponsavel || '-'}</p>
        </div>
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">Nome Completo do CAPS</p>
          <p class="font-medium text-gray-900 dark:text-white">${house.nomeCaps || '-'}</p>
        </div>
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">Código CNES do CAPS</p>
          <p class="font-medium text-gray-900 dark:text-white">${house.cnesCaps || '-'}</p>
        </div>
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">Nome da Residência Terapêutica</p>
          <p class="font-medium text-gray-900 dark:text-white">${house.nomeResidencia || '-'}</p>
        </div>
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">Modalidade da SRT</p>
          <p class="font-medium text-gray-900 dark:text-white">${house.tipoSRT || '-'}</p>
        </div>
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">Esfera de Gestão</p>
          <p class="font-medium text-gray-900 dark:text-white">${house.esferaGestao || '-'}</p>
        </div>
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">Situação da Habilitação no MS</p>
          <p class="font-medium text-gray-900 dark:text-white">${house.situacaoHabilitacao || '-'}</p>
        </div>
        ${house.numeroPortaria ? `
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Número da Portaria</p>
            <p class="font-medium text-gray-900 dark:text-white">${house.numeroPortaria}</p>
          </div>
        ` : ''}
        ${house.dataPortaria ? `
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Data da Portaria</p>
            <p class="font-medium text-gray-900 dark:text-white">${house.dataPortaria}</p>
          </div>
        ` : ''}
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">Data de Início do Funcionamento</p>
          <p class="font-medium text-gray-900 dark:text-white">${house.dataInauguracao || '-'}</p>
        </div>
      </div>
    </div>
  `;
  
  // Seção: Dados da Residência Terapêutica
  detailsHTML += `
    <div class="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
        <svg class="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        Dados da Residência
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div class="md:col-span-2">
          <p class="text-sm text-gray-600 dark:text-gray-400">Endereço Completo</p>
          <p class="font-medium text-gray-900 dark:text-white">
            ${house.logradouro || ''} ${house.numero || ''} ${house.complemento || ''}
            ${house.logradouro || house.numero ? '-' : ''} ${house.bairro || ''}
            ${house.bairro ? '-' : ''} ${house.municipio || ''}/${house.uf || ''}
            ${house.cep ? `- CEP: ${house.cep}` : ''}
          </p>
        </div>
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">Zona</p>
          <p class="font-medium text-gray-900 dark:text-white">${house.localizacao || '-'}</p>
        </div>
      </div>
      
      <div class="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <h4 class="text-md font-semibold text-gray-700 dark:text-gray-300 mb-3">Estrutura Física</h4>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
            <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">${house.quartos || 0}</p>
            <p class="text-xs text-gray-600 dark:text-gray-400">Quartos</p>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
            <p class="text-2xl font-bold text-purple-600 dark:text-purple-400">${house.salas || 0}</p>
            <p class="text-xs text-gray-600 dark:text-gray-400">Salas</p>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
            <p class="text-2xl font-bold text-green-600 dark:text-green-400">${house.cozinhas || 0}</p>
            <p class="text-xs text-gray-600 dark:text-gray-400">Cozinhas</p>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
            <p class="text-2xl font-bold text-orange-600 dark:text-orange-400">${house.banheiros || 0}</p>
            <p class="text-xs text-gray-600 dark:text-gray-400">Banheiros</p>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
            <p class="text-2xl font-bold text-pink-600 dark:text-pink-400">${house.varanda || 0}</p>
            <p class="text-xs text-gray-600 dark:text-gray-400">Varandas</p>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
            <p class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">${house.lavanderia || 0}</p>
            <p class="text-xs text-gray-600 dark:text-gray-400">Lavanderias</p>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
            <p class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">${house.despensa || 0}</p>
            <p class="text-xs text-gray-600 dark:text-gray-400">Despensas</p>
          </div>
        </div>
        ${house.outros ? `
          <div class="mt-4">
            <p class="text-sm text-gray-600 dark:text-gray-400">Outros Cômodos</p>
            <p class="font-medium text-gray-900 dark:text-white">${house.outros}</p>
          </div>
        ` : ''}
      </div>
    </div>
  `;
  
  // Seção: Capacidade
  detailsHTML += `
    <div class="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
        <svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
        Capacidade e Ocupação
      </h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div class="bg-white dark:bg-gray-800 rounded-lg p-4">
          <p class="text-3xl font-bold text-blue-600 dark:text-blue-400">${house.totalResidents || house.totalMoradores || 0}</p>
          <p class="text-sm text-gray-600 dark:text-gray-400">Implantação</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-lg p-4">
          <p class="text-3xl font-bold text-purple-600 dark:text-purple-400">${house.vagasTotais || 0}</p>
          <p class="text-sm text-gray-600 dark:text-gray-400">Cadastrados CNES</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-lg p-4">
          <p class="text-3xl font-bold text-green-600 dark:text-green-400">${house.vagasOcupadas || 0}</p>
          <p class="text-sm text-gray-600 dark:text-gray-400">Moradores Atuais</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-lg p-4">
          <p class="text-3xl font-bold text-orange-600 dark:text-orange-400">${house.vagasDisponiveis || 0}</p>
          <p class="text-sm text-gray-600 dark:text-gray-400">Disponibilidade</p>
        </div>
      </div>
      ${house.vagasTotais > 0 ? `
        <div class="mt-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Taxa de Ocupação</span>
            <span class="text-sm font-bold text-gray-900 dark:text-white">${((house.vagasOcupadas / house.vagasTotais) * 100).toFixed(1)}%</span>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div class="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500" 
                 style="width: ${(house.vagasOcupadas / house.vagasTotais) * 100}%"></div>
          </div>
        </div>
      ` : ''}
    </div>
  `;
  
  // Seção: Equipe/Cuidadores
  if (house.totalProfissionais || house.totalCuidadores || house.escalaTrabalho) {
    detailsHTML += `
      <div class="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <svg class="w-5 h-5 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Equipe/Cuidadores
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Total de Profissionais</p>
            <p class="font-medium text-gray-900 dark:text-white">${house.totalProfissionais || '-'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Cuidadores</p>
            <p class="font-medium text-gray-900 dark:text-white">${house.totalCuidadores || '-'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Técnicos de Enfermagem</p>
            <p class="font-medium text-gray-900 dark:text-white">${house.totalTecnicos || '-'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Enfermeiros</p>
            <p class="font-medium text-gray-900 dark:text-white">${house.totalEnfermeiros || '-'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Outros Profissionais</p>
            <p class="font-medium text-gray-900 dark:text-white">${house.totalOutros || '-'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Cuidadores por Turno</p>
            <p class="font-medium text-gray-900 dark:text-white">${house.cuidadoresPorTurno || '-'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Proporção Cuidador/Morador</p>
            <p class="font-medium text-gray-900 dark:text-white">${house.relacaoCuidadorMorador || '-'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Educação Permanente</p>
            <p class="font-medium text-gray-900 dark:text-white">${house.participaEducacao || '-'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Reuniões de Equipe</p>
            <p class="font-medium text-gray-900 dark:text-white">${house.reunioesRegulares || '-'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Vínculos Empregatícios</p>
            <p class="font-medium text-gray-900 dark:text-white">${
              Array.isArray(house.vinculoEmpregaticio) 
                ? house.vinculoEmpregaticio.join(', ') 
                : house.vinculoEmpregaticio || '-'
            }</p>
          </div>
        </div>
        ${house.escalaTrabalho ? `
          <div class="mt-4">
            <p class="text-sm text-gray-600 dark:text-gray-400">Descrição da Escala de Trabalho</p>
            <p class="font-medium text-gray-900 dark:text-white mt-1">${house.escalaTrabalho}</p>
          </div>
        ` : ''}
        ${house.quemPromoveEducacao ? `
          <div class="mt-4">
            <p class="text-sm text-gray-600 dark:text-gray-400">Detalhes da Educação Permanente</p>
            <p class="font-medium text-gray-900 dark:text-white mt-1">${house.quemPromoveEducacao}</p>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  // Seção: Moradores
  if (house.residents && house.residents.length > 0) {
    detailsHTML += `
      <div class="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <svg class="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Moradores (${house.residents.length})
        </h3>
        <div class="space-y-3">
    `;
    
    house.residents.forEach((resident, index) => {
      detailsHTML += `
        <details class="group">
          <summary class="cursor-pointer bg-white dark:bg-gray-800 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">${index + 1}</span>
              <div>
                <span class="font-medium text-gray-900 dark:text-white">${resident.nomeCompleto || '(Sem nome)'}</span>
                ${resident.nomeSocial ? `<span class="text-sm text-gray-600 dark:text-gray-400 ml-2">(${resident.nomeSocial})</span>` : ''}
              </div>
            </div>
            <svg class="w-5 h-5 text-gray-400 transform transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div class="mt-3 bg-white dark:bg-gray-800 rounded-lg p-4 ml-11">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">Data de Nascimento</p>
                <p class="font-medium text-gray-900 dark:text-white">${resident.dataNascimento || '-'}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">Idade</p>
                <p class="font-medium text-gray-900 dark:text-white">${resident.idade || '-'} anos</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">Raça/Cor</p>
                <p class="font-medium text-gray-900 dark:text-white">${resident.racaCor || '-'}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">Sexo Biológico</p>
                <p class="font-medium text-gray-900 dark:text-white">${resident.generoNascimento || '-'}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">Identidade de Gênero</p>
                <p class="font-medium text-gray-900 dark:text-white">${resident.identidadeGenero || '-'}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">Município de Origem</p>
                <p class="font-medium text-gray-900 dark:text-white">${resident.origemTerritorial || '-'}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">Instituição de Origem</p>
                <p class="font-medium text-gray-900 dark:text-white">${resident.instituicaoOrigem || '-'}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">Tempo de Internação Anterior</p>
                <p class="font-medium text-gray-900 dark:text-white">${resident.tempoInternacao || '-'} anos</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">Participa do PVC</p>
                <p class="font-medium text-gray-900 dark:text-white">${resident.participaPVC || '-'}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">Vínculo Familiar</p>
                <p class="font-medium text-gray-900 dark:text-white">${resident.vinculoFamiliar || '-'}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">Frequência CAPS</p>
                <p class="font-medium text-gray-900 dark:text-white">${resident.frequenciaCaps || '-'}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">Acompanhamento UBS</p>
                <p class="font-medium text-gray-900 dark:text-white">${resident.frequenciaUBS || '-'}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">Frequenta Escola</p>
                <p class="font-medium text-gray-900 dark:text-white">${resident.escola || '-'}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">CRAS/CREAS</p>
                <p class="font-medium text-gray-900 dark:text-white">${resident.crasCreas || '-'}</p>
              </div>
            </div>
            ${resident.beneficios && resident.beneficios.length > 0 ? `
              <div class="mt-3">
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Benefícios</p>
                <div class="flex flex-wrap gap-2">
                  ${resident.beneficios.map(b => `
                    <span class="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded-full">${b}</span>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            ${resident.comorbidades && resident.comorbidades.length > 0 ? `
              <div class="mt-3">
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Comorbidades</p>
                <div class="flex flex-wrap gap-2">
                  ${resident.comorbidades.map(c => `
                    <span class="px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs rounded-full">${c}</span>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            ${resident.descricaoVinculo ? `
              <div class="mt-3">
                <p class="text-sm text-gray-600 dark:text-gray-400">Descrição do Vínculo Familiar</p>
                <p class="font-medium text-gray-900 dark:text-white mt-1">${resident.descricaoVinculo}</p>
              </div>
            ` : ''}
            ${resident.qualEscola ? `
              <div class="mt-3">
                <p class="text-sm text-gray-600 dark:text-gray-400">Instituição de Ensino</p>
                <p class="font-medium text-gray-900 dark:text-white mt-1">${resident.qualEscola}</p>
              </div>
            ` : ''}
            ${resident.vinculoMunicipio ? `
              <div class="mt-3">
                <p class="text-sm text-gray-600 dark:text-gray-400">Vínculo com o Município</p>
                <p class="font-medium text-gray-900 dark:text-white mt-1">${resident.vinculoMunicipio}</p>
              </div>
            ` : ''}
          </div>
        </details>
      `;
    });
    
    detailsHTML += '</div></div>';
  }
  
  // Seção: Metadados
  detailsHTML += `
    <div class="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
        <svg class="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Informações do Sistema
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">ID do Registro</p>
          <p class="font-medium text-gray-900 dark:text-white">${house.id}</p>
        </div>
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">Data de Cadastro</p>
          <p class="font-medium text-gray-900 dark:text-white">${
            house.createdAt 
              ? new Date(house.createdAt.toDate()).toLocaleString('pt-BR')
              : '-'
          }</p>
        </div>
      </div>
    </div>
  `;
  
  detailsHTML += '</div>';
  
  document.getElementById('houseDetails').innerHTML = detailsHTML;
  document.getElementById('houseModal').style.display = 'block';
};

const deleteHouse = async (houseId) => {
  const house = allHouses.find(h => h.id === houseId);
  const houseName = house?.nomeResidencia || house?.nomeResidenciaTherapeutica || house?.nome_da_residencia_terapeutica_caso_possua || 'esta casa';
  
  if (!confirm(`Tem certeza que deseja excluir "${houseName}"? Esta ação não pode ser desfeita.`)) {
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

document.getElementById('searchInput').addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const filtered = allHouses.filter(house => 
    house.nomeResidencia?.toLowerCase().includes(searchTerm) ||
    house.nomeResidenciaTherapeutica?.toLowerCase().includes(searchTerm) ||
    house.nomeCaps?.toLowerCase().includes(searchTerm) ||
    house.capsVinculadaSRT?.toLowerCase().includes(searchTerm) ||
    house.municipio?.toLowerCase().includes(searchTerm)
  );
  displayHouses(filtered);
});

document.getElementById('exportBtn').addEventListener('click', async () => {
  const exportBtn = document.getElementById('exportBtn');
  exportBtn.disabled = true;
  exportBtn.innerHTML = `
    <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
    <span>Exportando...</span>
  `;
  
  showLoading();
  
  try {
    const { workbook, fileName } = await ExportUtils.exportCompleteReport(allHouses);
    XLSX.writeFile(workbook, fileName);
    showToast('Relatório exportado com sucesso!');
  } catch (error) {
    console.error('Erro ao exportar:', error);
    showToast('Erro ao exportar dados', 'error');
  } finally {
    hideLoading();
    exportBtn.disabled = false;
    exportBtn.innerHTML = `
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span>Exportar</span>
    `;
  }
});

const fieldTypeIcons = {
  text: '<path d="M3 5h12m-6 0v14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  number: '<path d="M6 20h12M6 12h12M6 4h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  date: '<rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  select: '<path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  multiselect: '<rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><path d="M9 11l3 3L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  textarea: '<rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><path d="M7 7h10M7 12h10M7 17h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  tel: '<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  email: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" stroke-width="2"/><path d="M22 6l-10 7L2 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
};

const fieldTypeLabels = {
  text: 'Texto',
  number: 'Número',
  date: 'Data',
  select: 'Lista',
  multiselect: 'Múltipla Seleção',
  textarea: 'Texto Longo',
  tel: 'Telefone',
  email: 'E-mail'
};

const getDefaultConfig = () => ({
  municipio: [
    { 
      key: "regiaoSaude", 
      label: "Região de Saúde", 
      type: "text", 
      required: true,
      placeholder: "Ex: Metropolitana I, Baixada Litorânea",
      helpText: "Digite o nome da região de saúde conforme divisão estadual",
      maxLength: 100
    },
    { 
      key: "municipio", 
      label: "Nome do Município", 
      type: "text", 
      required: true,
      placeholder: "Ex: Rio de Janeiro, Niterói",
      helpText: "Nome completo do município sem abreviações",
      maxLength: 100
    },
    { 
      key: "coordenacaoSaudeMental", 
      label: "Coordenação de Saúde Mental Municipal", 
      type: "text", 
      required: true,
      placeholder: "Nome completo da coordenação",
      helpText: "Informe o nome oficial da coordenação responsável pela saúde mental",
      maxLength: 200
    },
    { 
      key: "responsavelPreenchimento", 
      label: "Responsável pelo Preenchimento", 
      type: "text", 
      required: true,
      placeholder: "Nome completo do responsável",
      helpText: "Pessoa responsável pelas informações fornecidas",
      maxLength: 150
    },
    { 
      key: "telefoneResponsavelPreenchimento", 
      label: "Telefone do Responsável", 
      type: "tel", 
      required: true,
      placeholder: "(21) 99999-9999",
      helpText: "Telefone com DDD para contato",
      mask: "(99) 99999-9999",
      pattern: "\\([0-9]{2}\\) [0-9]{4,5}-[0-9]{4}"
    },
    { 
      key: "emailResponsavelPreenchimento", 
      label: "E-mail do Responsável", 
      type: "email", 
      required: true,
      placeholder: "exemplo@prefeitura.rj.gov.br",
      helpText: "E-mail institucional válido para contato",
      maxLength: 150
    },
    { 
      key: "dataPreenchimentoMunicipio", 
      label: "Data do Preenchimento", 
      type: "date", 
      required: true,
      helpText: "Data em que este formulário está sendo preenchido",
      max: "today" // Não permite datas futuras
    },
    { 
      key: "capsVinculadaSRT", 
      label: "CAPS de Referência da SRT", 
      type: "text", 
      required: true,
      placeholder: "Ex: CAPS III João Ferreira da Silva",
      helpText: "Nome completo do CAPS que acompanha esta residência",
      maxLength: 200
    },
    { 
      key: "cnesCapsVinculada", 
      label: "CNES do CAPS", 
      type: "text", 
      required: true,
      placeholder: "0000000",
      helpText: "Código CNES com 7 dígitos",
      mask: "9999999",
      pattern: "[0-9]{7}",
      maxLength: 7
    }
  ],
  
  general: [
    { 
      key: "dataPreenchimento", 
      label: "Data do Preenchimento", 
      type: "date", 
      required: true,
      helpText: "Data atual do preenchimento deste cadastro",
      max: "today"
    },
    { 
      key: "responsavelNome", 
      label: "Responsável pela Residência", 
      type: "text", 
      required: true,
      placeholder: "Nome completo do coordenador/responsável",
      helpText: "Profissional responsável pela gestão da residência",
      maxLength: 150
    },
    { 
      key: "responsavelCargo", 
      label: "Cargo/Função", 
      type: "text", 
      required: true,
      placeholder: "Ex: Coordenador, Enfermeiro RT",
      helpText: "Cargo ou função do responsável na residência",
      maxLength: 100
    },
    { 
      key: "contatoResponsavel", 
      label: "Telefone de Contato", 
      type: "tel", 
      required: true,
      placeholder: "(21) 99999-9999",
      helpText: "Telefone direto do responsável",
      mask: "(99) 99999-9999"
    },
    { 
      key: "nomeCaps", 
      label: "Nome Completo do CAPS", 
      type: "text", 
      required: true,
      placeholder: "CAPS + tipo + nome (Ex: CAPS III Centro)",
      helpText: "Identificação completa do CAPS vinculado",
      maxLength: 200
    },
    { 
      key: "cnesCaps", 
      label: "Código CNES do CAPS", 
      type: "text", 
      required: true,
      placeholder: "0000000",
      helpText: "Cadastro Nacional de Estabelecimentos de Saúde - 7 dígitos",
      mask: "9999999",
      maxLength: 7
    },
    { 
      key: "nomeResidencia", 
      label: "Nome da Residência Terapêutica", 
      type: "text", 
      required: true,
      placeholder: "Ex: Residência Terapêutica Esperança",
      helpText: "Nome pelo qual a residência é conhecida",
      maxLength: 200
    },
    { 
      key: "tipoSRT", 
      label: "Modalidade da SRT", 
      type: "select", 
      options: ["Tipo I", "Tipo II"], 
      required: true,
      helpText: "Tipo I: até 8 moradores | Tipo II: até 10 moradores com maior necessidade de cuidados"
    },
    { 
      key: "esferaGestao", 
      label: "Esfera de Gestão", 
      type: "select", 
      options: ["Municipal", "Estadual", "Federal"], 
      required: true,
      helpText: "Nível administrativo responsável pela gestão"
    },
    { 
      key: "situacaoHabilitacao", 
      label: "Situação da Habilitação no MS", 
      type: "select", 
      options: ["Habilitada", "Em processo de habilitação", "Não habilitada"], 
      required: true,
      helpText: "Status atual junto ao Ministério da Saúde"
    },
    { 
      key: "numeroPortaria", 
      label: "Número da Portaria de Habilitação", 
      type: "text",
      placeholder: "Ex: Portaria nº 123/2023",
      helpText: "Preencher apenas se habilitada",
      conditional: { field: "situacaoHabilitacao", value: "Habilitada" }
    },
    { 
      key: "dataPortaria", 
      label: "Data da Portaria", 
      type: "date",
      helpText: "Data de publicação da portaria",
      conditional: { field: "situacaoHabilitacao", value: "Habilitada" }
    },
    { 
      key: "dataInauguracao", 
      label: "Data de Início do Funcionamento", 
      type: "date", 
      required: true,
      helpText: "Quando a residência começou a receber moradores",
      max: "today"
    }
  ],
  
  residence: [
    { 
      key: "logradouro", 
      label: "Endereço (Rua/Avenida)", 
      type: "text", 
      required: true,
      placeholder: "Ex: Rua das Flores, Avenida Brasil",
      helpText: "Nome completo do logradouro",
      maxLength: 200
    },
    { 
      key: "numero", 
      label: "Número", 
      type: "text", 
      required: true,
      placeholder: "Ex: 123, S/N",
      helpText: "Número do imóvel ou S/N",
      maxLength: 20
    },
    { 
      key: "complemento", 
      label: "Complemento", 
      type: "text",
      placeholder: "Ex: Casa 2, Fundos, Bloco A",
      helpText: "Informações adicionais do endereço (opcional)",
      maxLength: 100
    },
    { 
      key: "bairro", 
      label: "Bairro", 
      type: "text", 
      required: true,
      placeholder: "Nome do bairro",
      helpText: "Bairro onde está localizada a residência",
      maxLength: 100
    },
    { 
      key: "cep", 
      label: "CEP", 
      type: "text", 
      required: true,
      placeholder: "00000-000",
      helpText: "Código Postal com 8 dígitos",
      mask: "99999-999",
      pattern: "[0-9]{5}-[0-9]{3}"
    },
    { 
      key: "municipio", 
      label: "Município", 
      type: "text", 
      required: true,
      placeholder: "Nome do município",
      helpText: "Município onde está localizada a residência",
      maxLength: 100
    },
    { 
      key: "uf", 
      label: "Estado", 
      type: "select", 
      options: ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"], 
      required: true,
      helpText: "Unidade Federativa",
      defaultValue: "RJ"
    },
    { 
      key: "localizacao", 
      label: "Zona", 
      type: "select", 
      options: ["Urbana", "Rural"], 
      required: true,
      helpText: "Tipo de área onde está localizada"
    },
    { 
      key: "quartos", 
      label: "Quantidade de Quartos", 
      type: "number", 
      required: true,
      placeholder: "0",
      helpText: "Total de quartos disponíveis para moradores",
      min: 1,
      max: 20
    },
    { 
      key: "salas", 
      label: "Quantidade de Salas", 
      type: "number", 
      required: true,
      placeholder: "0",
      helpText: "Salas de estar/convivência",
      min: 0,
      max: 10
    },
    { 
      key: "cozinhas", 
      label: "Quantidade de Cozinhas", 
      type: "number", 
      required: true,
      placeholder: "0",
      helpText: "Total de cozinhas na residência",
      min: 1,
      max: 5
    },
    { 
      key: "banheiros", 
      label: "Quantidade de Banheiros", 
      type: "number", 
      required: true,
      placeholder: "0",
      helpText: "Total de banheiros completos",
      min: 1,
      max: 10
    },
    { 
      key: "varanda", 
      label: "Quantidade de Varandas/Áreas Externas", 
      type: "number",
      placeholder: "0",
      helpText: "Espaços externos cobertos (opcional)",
      min: 0,
      max: 5
    },
    { 
      key: "lavanderia", 
      label: "Quantidade de Lavanderias", 
      type: "number",
      placeholder: "0",
      helpText: "Áreas de serviço (opcional)",
      min: 0,
      max: 5
    },
    { 
      key: "despensa", 
      label: "Quantidade de Despensas", 
      type: "number",
      placeholder: "0",
      helpText: "Espaços para armazenamento (opcional)",
      min: 0,
      max: 5
    },
    { 
      key: "outros", 
      label: "Outros Cômodos", 
      type: "text",
      placeholder: "Ex: Escritório, sala de TV, quintal",
      helpText: "Descreva outros espaços disponíveis (opcional)",
      maxLength: 200
    }
  ],
  
  caregivers: [
    { 
      key: "totalProfissionais", 
      label: "Total de Profissionais na Equipe", 
      type: "number", 
      required: true,
      placeholder: "0",
      helpText: "Soma de todos os profissionais que atuam na residência",
      min: 1,
      max: 50
    },
    { 
      key: "totalCuidadores", 
      label: "Número de Cuidadores", 
      type: "number", 
      required: true,
      placeholder: "0",
      helpText: "Cuidadores diretos dos moradores",
      min: 0,
      max: 30
    },
    { 
      key: "totalTecnicos", 
      label: "Número de Técnicos de Enfermagem", 
      type: "number", 
      required: true,
      placeholder: "0",
      helpText: "Técnicos de enfermagem na equipe",
      min: 0,
      max: 20
    },
    { 
      key: "totalEnfermeiros", 
      label: "Número de Enfermeiros", 
      type: "number", 
      required: true,
      placeholder: "0",
      helpText: "Enfermeiros com nível superior",
      min: 0,
      max: 10
    },
    { 
      key: "totalOutros", 
      label: "Outros Profissionais", 
      type: "number",
      placeholder: "0",
      helpText: "Psicólogos, assistentes sociais, terapeutas, etc.",
      min: 0,
      max: 20
    },
    { 
      key: "escalaTrabalho", 
      label: "Descrição da Escala de Trabalho", 
      type: "textarea", 
      required: true,
      placeholder: "Ex: Plantões 12x36h com 2 cuidadores por turno. Enfermeiro disponível de segunda a sexta das 8h às 17h",
      helpText: "Detalhe como funciona a escala da equipe",
      maxLength: 500
    },
    { 
      key: "relacaoCuidadorMorador", 
      label: "Proporção Cuidador/Morador", 
      type: "text", 
      required: true,
      placeholder: "Ex: 1:4 (1 cuidador para 4 moradores)",
      helpText: "Quantos moradores cada cuidador acompanha",
      pattern: "[0-9]+:[0-9]+"
    },
    { 
      key: "cuidadoresPorTurno", 
      label: "Cuidadores por Turno", 
      type: "number", 
      required: true,
      placeholder: "0",
      helpText: "Quantidade mínima de cuidadores em cada plantão",
      min: 1,
      max: 10
    },
    { 
      key: "participaEducacao", 
      label: "A equipe participa de Educação Permanente?", 
      type: "select", 
      options: ["Sim", "Não"], 
      required: true,
      helpText: "Capacitações e treinamentos regulares"
    },
    { 
      key: "quemPromoveEducacao", 
      label: "Detalhes da Educação Permanente", 
      type: "textarea",
      placeholder: "Ex: Capacitações mensais promovidas pela SMS sobre manejo de crise, medicação, direitos dos usuários",
      helpText: "Quem promove, frequência e principais temas (preencher se respondeu Sim)",
      conditional: { field: "participaEducacao", value: "Sim" },
      maxLength: 500
    },
    { 
      key: "reunioesRegulares", 
      label: "Realiza reuniões de equipe regulares?", 
      type: "select", 
      options: ["Sim", "Não"], 
      required: true,
      helpText: "Reuniões para discussão de casos e planejamento"
    },
    { 
      key: "vinculoEmpregaticio", 
      label: "Qual vínculo empregatício dos profissionais da SRT?", 
      type: "multiselect", 
      options: ["Servidor estatutário", "RPA", "Contrato municipal", "CLT-OSS", "Outros"], 
      required: true,
      helpText: "Selecione todos os tipos de vínculo existentes"
    }
  ],
  
  residentFields: [
    { 
      key: "nomeCompleto", 
      label: "Nome Completo do Morador", 
      type: "text", 
      required: true,
      placeholder: "Nome completo conforme documentos",
      helpText: "Nome civil completo do morador",
      maxLength: 200
    },
    { 
      key: "nomeSocial", 
      label: "Nome Social", 
      type: "text",
      placeholder: "Nome pelo qual prefere ser chamado(a)",
      helpText: "Preencher se diferente do nome civil",
      maxLength: 200
    },
    { 
      key: "dataNascimento", 
      label: "Data de Nascimento", 
      type: "date", 
      required: true,
      helpText: "Data completa de nascimento",
      min: "1900-01-01",
      max: "today"
    },
    { 
      key: "idade", 
      label: "Idade Atual", 
      type: "number", 
      required: true,
      placeholder: "0",
      helpText: "Idade em anos completos",
      min: 18,
      max: 120
    },
    { 
      key: "instituicaoOrigem", 
      label: "Hospital/Instituição de Origem", 
      type: "text", 
      required: true,
      placeholder: "Ex: Hospital Psiquiátrico João de Deus",
      helpText: "De onde veio antes de morar na SRT",
      maxLength: 200
    },
    { 
      key: "cnesOrigem", 
      label: "CNES da Instituição de Origem", 
      type: "text",
      placeholder: "0000000",
      helpText: "Código CNES se disponível (opcional)",
      mask: "9999999",
      maxLength: 7
    },
    { 
      key: "tempoInternacao", 
      label: "Tempo de Internação Anterior (anos)", 
      type: "number", 
      required: true,
      placeholder: "0",
      helpText: "Quantos anos ficou internado antes da SRT",
      min: 0,
      max: 80
    },
    { 
      key: "racaCor", 
      label: "Raça/Cor", 
      type: "select", 
      options: ["Branca", "Preta", "Parda", "Amarela", "Indígena", "Não declarada"], 
      required: true,
      helpText: "Autodeclaração conforme IBGE"
    },
    { 
      key: "generoNascimento", 
      label: "Sexo Biológico", 
      type: "select", 
      options: ["Masculino", "Feminino"], 
      required: true,
      helpText: "Sexo designado ao nascimento"
    },
    { 
      key: "identidadeGenero", 
      label: "Identidade de Gênero", 
      type: "select", 
      options: ["Homem cisgênero", "Mulher cisgênero", "Homem trans", "Mulher trans", "Não-binário", "Outro", "Prefere não informar"],
      helpText: "Como a pessoa se identifica",
      defaultValue: "Prefere não informar"
    },
    { 
      key: "origemTerritorial", 
      label: "Município de Origem", 
      type: "text", 
      required: true,
      placeholder: "Ex: Rio de Janeiro, Niterói",
      helpText: "Cidade natal ou de origem do morador",
      maxLength: 100
    },
    { 
      key: "vinculoMunicipio", 
      label: "Vínculo com o Município Atual", 
      type: "text",
      placeholder: "Ex: Nasceu aqui, tem família na cidade",
      helpText: "Relação do morador com o município da SRT",
      maxLength: 200
    },
    { 
      key: "participaPVC", 
      label: "Beneficiário do Programa de Volta para Casa?", 
      type: "select", 
      options: ["Sim", "Não", "Em processo"], 
      required: true,
      helpText: "Recebe o auxílio-reabilitação psicossocial"
    },
    { 
      key: "vinculoFamiliar", 
      label: "Mantém Contato com Familiares?", 
      type: "select", 
      options: ["Sim", "Não", "Esporadicamente"], 
      required: true,
      helpText: "Se há algum tipo de contato familiar"
    },
    { 
      key: "descricaoVinculo", 
      label: "Descrição do Vínculo Familiar", 
      type: "textarea",
      placeholder: "Ex: Recebe visitas mensais da irmã. Fala por telefone com o filho semanalmente",
      helpText: "Detalhe o tipo e frequência do contato (se houver)",
      conditional: { field: "vinculoFamiliar", values: ["Sim", "Esporadicamente"] },
      maxLength: 300
    },
    { 
      key: "frequenciaCaps", 
      label: "Frequência de Comparecimento ao CAPS", 
      type: "select", 
      options: ["Diária", "2-3x por semana", "Semanal", "Quinzenal", "Mensal", "Não frequenta"], 
      required: true,
      helpText: "Com que regularidade vai ao CAPS"
    },
    { 
      key: "frequenciaUBS", 
      label: "Acompanhamento na Atenção Básica", 
      type: "select", 
      options: ["Regular (conforme necessidade)", "Apenas emergências", "Não faz acompanhamento"], 
      required: true,
      helpText: "Como é o acompanhamento na UBS/ESF"
    },
    { 
      key: "escola", 
      label: "Frequenta Alguma Instituição de Ensino?", 
      type: "select", 
      options: ["Sim", "Não"], 
      required: true,
      helpText: "Escola, EJA, cursos, etc."
    },
    { 
      key: "qualEscola", 
      label: "Qual Instituição/Curso?", 
      type: "text",
      placeholder: "Ex: EJA na Escola Municipal João Silva",
      helpText: "Nome da escola ou curso que frequenta",
      conditional: { field: "escola", value: "Sim" },
      maxLength: 200
    },
    { 
      key: "crasCreas", 
      label: "É Acompanhado pelo CRAS/CREAS?", 
      type: "select", 
      options: ["Sim - CRAS", "Sim - CREAS", "Sim - Ambos", "Não"], 
      required: true,
      helpText: "Se recebe acompanhamento da assistência social"
    },
    { 
      key: "beneficios", 
      label: "Benefícios que possui:", 
      type: "multiselect", 
      options: ["PVC", "BPC", "Aposentadoria", "Pensão", "Bolsa Rio", "Outros"], 
      required: true,
      helpText: "Selecione todos os benefícios que o morador recebe"
    },
    { 
      key: "comorbidades", 
      label: "Morador que possui algum tipo de comorbidade?", 
      type: "multiselect", 
      options: ["Hipertensão", "Diabetes", "Cardiopatia", "Neuropatia", "DPOC", "Asma", "Obesidade", "Outros"], 
      required: false,
      helpText: "Marque todas as comorbidades do morador"
    },
  ]
});

// Adicione também estas funções auxiliares para melhorar a experiência:

// Função para aplicar máscaras nos campos
const applyInputMask = (input, mask) => {
  input.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    let maskedValue = '';
    let maskIndex = 0;
    
    for (let i = 0; i < mask.length && maskIndex < value.length; i++) {
      if (mask[i] === '9') {
        maskedValue += value[maskIndex];
        maskIndex++;
      } else {
        maskedValue += mask[i];
      }
    }
    
    e.target.value = maskedValue;
  });
};

// Função para validar campos condicionais
const handleConditionalFields = (config) => {
  config.forEach(section => {
    section.forEach(field => {
      if (field.conditional) {
        const dependentField = document.getElementById(field.conditional.field);
        const fieldElement = document.getElementById(field.key);
        
        if (dependentField && fieldElement) {
          const checkVisibility = () => {
            const shouldShow = field.conditional.values 
              ? field.conditional.values.includes(dependentField.value)
              : dependentField.value === field.conditional.value;
            
            fieldElement.closest('.form-group').style.display = shouldShow ? 'block' : 'none';
            fieldElement.required = shouldShow && field.required;
          };
          
          dependentField.addEventListener('change', checkVisibility);
          checkVisibility(); // Verificar no carregamento
        }
      }
    });
  });
};

// Função melhorada para criar campos com todas as features
const createEnhancedInputGroup = (field, prefix = '') => {
  const group = document.createElement('div');
  group.className = 'form-group input-group relative';
  
  const inputId = prefix + field.key;

  const labelContainer = document.createElement('div');
  labelContainer.className = 'flex items-center justify-between mb-2';
  
  const label = document.createElement('label');
  label.setAttribute('for', inputId);
  label.className = 'block text-sm font-medium text-gray-700 dark:text-gray-300';
  label.innerHTML = field.label + (field.required ? ' <span class="text-red-500">*</span>' : '');
  
  // Adicionar ícone de ajuda se houver helpText
  if (field.helpText) {
    const helpIcon = document.createElement('span');
    helpIcon.className = 'inline-flex items-center text-gray-400 hover:text-gray-600 cursor-help ml-2';
    helpIcon.innerHTML = `
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    `;
    helpIcon.title = field.helpText;
    label.appendChild(helpIcon);
  }
  
  labelContainer.appendChild(label);
  
  // Criar o input apropriado
  let input;
  
  if (field.type === 'select' && field.options) {
    input = document.createElement('select');
    input.className = 'w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all';
    
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = field.placeholder || 'Selecione uma opção...';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    input.appendChild(defaultOption);
    
    field.options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      if (field.defaultValue === opt) option.selected = true;
      input.appendChild(option);
    });
  } else if (field.type === 'multiselect' && field.options) {
    // Criar container para checkboxes
    input = document.createElement('div');
    input.className = 'space-y-2 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl';
    input.id = inputId;
    
    // Criar um checkbox para cada opção
    field.options.forEach((opt, index) => {
      const checkboxWrapper = document.createElement('label');
      checkboxWrapper.className = 'flex items-center gap-3 cursor-pointer hover:bg-white dark:hover:bg-gray-700 p-2 rounded-lg transition-all';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = inputId;
      checkbox.value = opt;
      checkbox.className = 'w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600';
      checkbox.id = `${inputId}_${index}`;
      
      const label = document.createElement('span');
      label.className = 'text-sm font-medium text-gray-700 dark:text-gray-300';
      label.textContent = opt;
      
      checkboxWrapper.appendChild(checkbox);
      checkboxWrapper.appendChild(label);
      input.appendChild(checkboxWrapper);
    });
    
    // Adicionar validação customizada para campos obrigatórios
    if (field.required) {
      const checkboxes = input.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
          const checked = input.querySelectorAll('input[type="checkbox"]:checked').length > 0;
          checkboxes.forEach(checkbox => {
            checkbox.setCustomValidity(checked ? '' : 'Selecione pelo menos uma opção');
          });
        });
      });
    } 
  } else if (field.type === 'textarea') {
    input = document.createElement('textarea');
    input.rows = 3;
    input.className = 'w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all resize-none';
    if (field.placeholder) input.placeholder = field.placeholder;
  } else {
    input = document.createElement('input');
    input.type = field.type;
    input.className = 'w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all';
    if (field.placeholder) input.placeholder = field.placeholder;
    if (field.min !== undefined) input.min = field.min;
    if (field.max !== undefined) input.max = field.max;
    if (field.maxLength) input.maxLength = field.maxLength;
    if (field.pattern) input.pattern = field.pattern;
    
    // Aplicar valor máximo especial para datas
    if (field.type === 'date' && field.max === 'today') {
      input.max = new Date().toISOString().split('T')[0];
    }
  }
  
  input.id = inputId;
  input.name = inputId;
  if (field.required) input.required = true;
  
  // Aplicar máscara se existir
  if (field.mask) {
    applyInputMask(input, field.mask);
  }
  
  // Adicionar eventos para feedback visual
  input.addEventListener('invalid', (e) => {
    e.preventDefault();
    input.classList.add('border-red-500', 'dark:border-red-400');
    
    // Criar ou atualizar mensagem de erro
    let errorMsg = group.querySelector('.error-message');
    if (!errorMsg) {
      errorMsg = document.createElement('p');
      errorMsg.className = 'error-message text-sm text-red-500 mt-1';
      group.appendChild(errorMsg);
    }
    
    if (input.validity.valueMissing) {
      errorMsg.textContent = 'Este campo é obrigatório';
    } else if (input.validity.patternMismatch) {
      errorMsg.textContent = field.helpText || 'Formato inválido';
    } else if (input.validity.tooShort || input.validity.tooLong) {
      errorMsg.textContent = `Deve ter entre ${input.minLength || 0} e ${input.maxLength} caracteres`;
    } else if (input.validity.rangeUnderflow || input.validity.rangeOverflow) {
      errorMsg.textContent = `Valor deve estar entre ${input.min} e ${input.max}`;
    } else {
      errorMsg.textContent = 'Valor inválido';
    }
  });
  
  input.addEventListener('input', () => {
    input.classList.remove('border-red-500', 'dark:border-red-400');
    const errorMsg = group.querySelector('.error-message');
    if (errorMsg) errorMsg.remove();
    
    // Feedback positivo
    if (input.checkValidity() && input.value) {
      input.classList.add('border-green-500', 'dark:border-green-400');
      setTimeout(() => {
        input.classList.remove('border-green-500', 'dark:border-green-400');
      }, 2000);
    }
  });
  
  // Montar o grupo
  group.appendChild(labelContainer);
  group.appendChild(input);
  
  // Adicionar texto de ajuda
  if (field.helpText) {
    const helpText = document.createElement('p');
    helpText.className = 'text-sm text-gray-500 dark:text-gray-400 mt-1';
    helpText.textContent = field.helpText;
    group.appendChild(helpText);
  }
  
  // Adicionar contador de caracteres para campos de texto
  if ((field.type === 'text' || field.type === 'textarea') && field.maxLength) {
    const counter = document.createElement('p');
    counter.className = 'text-xs text-gray-400 text-right mt-1';
    counter.textContent = `0/${field.maxLength}`;
    
    input.addEventListener('input', () => {
      counter.textContent = `${input.value.length}/${field.maxLength}`;
      if (input.value.length > field.maxLength * 0.9) {
        counter.classList.add('text-orange-500');
      } else {
        counter.classList.remove('text-orange-500');
      }
    });
    
    group.appendChild(counter);
  }
  
  return group;
};

const loadConfigJSON = async () => {
  const configRef = db.collection("config").doc("srt");
  const configSnap = await configRef.get();
  
  if (configSnap.exists) {
    currentConfig = configSnap.data();
    if (!currentConfig.municipio) {
      currentConfig.municipio = getDefaultConfig().municipio;
      await configRef.set(currentConfig);
    }
  } else {
    currentConfig = getDefaultConfig();
    await configRef.set(currentConfig);
  }
  renderConfigFields();
};

const renderConfigFields = () => {
  if (!currentConfig) return;
  
  const sections = ['municipio', 'general', 'residence', 'caregivers', 'residentFields'];
  
  sections.forEach(section => {
    if (!currentConfig[section]) return;
    
    const container = document.getElementById(`${section}FieldsList`);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (currentConfig[section].length === 0) {
      container.innerHTML = `
        <div class="text-center py-12 text-gray-400">
          <svg class="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <p>Nenhum campo cadastrado</p>
        </div>
      `;
      return;
    }
    
    currentConfig[section].forEach((field, index) => {
      const fieldElement = createFieldElement(field, index, section);
      container.appendChild(fieldElement);
    });
    
    updateFieldCount(section);
    setupDragAndDrop(container, section);
  });
};

const createFieldElement = (field, index, section) => {
  const div = document.createElement('div');
  div.className = 'flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-move group';
  div.draggable = true;
  div.dataset.index = index;
  
  const typeColor = {
    text: 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    number: 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    date: 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    select: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400',
     multiselect: 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    textarea: 'bg-pink-100 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400',
    tel: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
    email: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'
  };
  
  div.innerHTML = `
    <div class="drag-handle text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">
      <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
      </svg>
    </div>
    
    <div class="p-2 rounded-lg ${typeColor[field.type] || typeColor.text}">
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24">
        ${fieldTypeIcons[field.type] || fieldTypeIcons.text}
      </svg>
    </div>
    
    <div class="flex-1">
      <div class="font-medium text-gray-900 dark:text-white">${field.label}</div>
      <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span class="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">${fieldTypeLabels[field.type] || field.type}</span>
        ${field.required ? '<span class="text-red-500 font-medium">Obrigatório</span>' : ''}
        ${field.options ? `<span>${field.options.length} opções</span>` : ''}
      </div>
    </div>
    
    <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <button class="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400 transition-colors" onclick="editField('${section}', ${index})">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      <button class="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 transition-colors" onclick="deleteField('${section}', ${index})">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  `;
  
  return div;
};

const setupDragAndDrop = (container, section) => {
  let draggedElement = null;
  
  container.addEventListener('dragstart', (e) => {
    if (e.target.draggable) {
      draggedElement = e.target;
      e.target.classList.add('opacity-50');
    }
  });
  
  container.addEventListener('dragend', (e) => {
    if (e.target.draggable) {
      e.target.classList.remove('opacity-50');
    }
  });
  
  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(container, e.clientY);
    if (afterElement == null) {
      container.appendChild(draggedElement);
    } else {
      container.insertBefore(draggedElement, afterElement);
    }
  });
  
  container.addEventListener('drop', async (e) => {
    e.preventDefault();
    if (!draggedElement) return;
    
    const newOrder = [...container.querySelectorAll('[draggable="true"]')].map(el => 
      parseInt(el.dataset.index)
    );
    
    const reorderedFields = newOrder.map(index => currentConfig[section][index]);
    currentConfig[section] = reorderedFields;
    
    await saveConfig();
    renderConfigFields();
  });
};

const getDragAfterElement = (container, y) => {
  const draggableElements = [...container.querySelectorAll('[draggable="true"]:not(.opacity-50)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
};

const updateFieldCount = (section) => {
  const card = document.querySelector(`[data-section="${section}"]`);
  if (!card) return;
  const countElement = card.querySelector('.field-count');
  if (!countElement) return;
  const count = currentConfig[section].length;
  countElement.textContent = `${count} campo${count !== 1 ? 's' : ''}`;
};

document.getElementById('addFieldBtn').addEventListener('click', () => {
  editingField = null;
  editingFieldIndex = null;
  editingFieldSection = null;
  document.getElementById('fieldModalTitle').textContent = 'Adicionar Campo';
  document.getElementById('fieldForm').reset();
  document.getElementById('fieldModal').style.display = 'block';
  updateFieldTypeUI();
});

window.editField = (section, index) => {
  const field = currentConfig[section][index];
  editingField = field;
  editingFieldIndex = index;
  editingFieldSection = section;
  
  document.getElementById('fieldModalTitle').textContent = 'Editar Campo';
  document.getElementById('fieldSection').value = section;
  document.getElementById('fieldType').value = field.type;
  document.getElementById('fieldLabel').value = field.label;
  document.getElementById('fieldKey').value = field.key;
  document.getElementById('fieldRequired').checked = field.required || false;
  
  if (field.type === 'number') {
    document.getElementById('fieldMin').value = field.min || '';
    document.getElementById('fieldMax').value = field.max || '';
  }
  
  if ((field.type === 'select' || field.type === 'multiselect') && field.options) {
    renderOptions(field.options);
  }
  
  updateFieldTypeUI();
  document.getElementById('fieldModal').style.display = 'block';
};

window.deleteField = async (section, index) => {
  const field = currentConfig[section][index];
  
  if (!confirm(`Tem certeza que deseja excluir o campo "${field.label}"?`)) {
    return;
  }
  
  currentConfig[section].splice(index, 1);
  await saveConfig();
  renderConfigFields();
  showToast('Campo excluído com sucesso!');
};

document.getElementById('fieldLabel').addEventListener('input', (e) => {
  const label = e.target.value;
  const key = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '');
  
  document.getElementById('fieldKey').value = key;
});

document.getElementById('fieldType').addEventListener('change', updateFieldTypeUI);

function updateFieldTypeUI() {
  const type = document.getElementById('fieldType').value;
  document.getElementById('optionsContainer').classList.toggle('hidden', type !== 'select' && type !== 'multiselect');
  document.getElementById('numberConstraints').classList.toggle('hidden', type !== 'number');
}

document.getElementById('addOptionBtn').addEventListener('click', () => {
  addOption();
});

const addOption = (value = '') => {
  const optionsList = document.getElementById('optionsList');
  const optionDiv = document.createElement('div');
  optionDiv.className = 'flex gap-2';
  
  optionDiv.innerHTML = `
    <input type="text" placeholder="Digite uma opção" value="${value}" required class="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all">
    <button type="button" onclick="removeOption(this)" class="p-2 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 rounded-xl text-red-600 dark:text-red-400 transition-colors">
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  `;
  
  optionsList.appendChild(optionDiv);
};

window.removeOption = (button) => {
  button.parentElement.remove();
};

const renderOptions = (options) => {
  const optionsList = document.getElementById('optionsList');
  optionsList.innerHTML = '';
  options.forEach(option => addOption(option));
};

document.getElementById('fieldForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const section = document.getElementById('fieldSection').value;
  const fieldData = {
    key: document.getElementById('fieldKey').value,
    label: document.getElementById('fieldLabel').value,
    type: document.getElementById('fieldType').value,
    required: document.getElementById('fieldRequired').checked
  };
  
  if (fieldData.type === 'select' || fieldData.type === 'multiselect') {
    const options = [...document.querySelectorAll('#optionsList input')]
      .map(input => input.value)
      .filter(value => value.trim());
    
    if (options.length === 0) {
      showToast('Adicione pelo menos uma opção para a lista', 'error');
      return;
    }
    
    fieldData.options = options;
  }
  
  if (fieldData.type === 'number') {
    const min = document.getElementById('fieldMin').value;
    const max = document.getElementById('fieldMax').value;
    
    if (min) fieldData.min = parseInt(min);
    if (max) fieldData.max = parseInt(max);
  }
  
  if (editingField !== null) {
    currentConfig[editingFieldSection][editingFieldIndex] = fieldData;
  } else {
    if (!currentConfig[section]) {
      currentConfig[section] = [];
    }
    currentConfig[section].push(fieldData);
  }
  
  await saveConfig();
  renderConfigFields();
  closeFieldModal();
  showToast(editingField ? 'Campo atualizado com sucesso!' : 'Campo adicionado com sucesso!');
});

window.closeFieldModal = () => {
  document.getElementById('fieldModal').style.display = 'none';
  document.getElementById('fieldForm').reset();
  document.getElementById('optionsList').innerHTML = '';
  editingField = null;
  editingFieldIndex = null;
  editingFieldSection = null;
};

const saveConfig = async () => {
  try {
    await db.collection('config').doc('srt').set(currentConfig);
  } catch (error) {
    console.error('Erro ao salvar configuração:', error);
    showToast('Erro ao salvar configuração', 'error');
  }
};

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

const generateSummaryReport = (filteredHouses, startDate, endDate) => {
  const totalHouses = filteredHouses.length;
  const totalResidents = filteredHouses.reduce((sum, house) => sum + (house.residents?.length || 0), 0);
  const totalVagas = filteredHouses.reduce((sum, house) => sum + (parseInt(house.vagasTotais) || 0), 0);
  const vagasOcupadas = filteredHouses.reduce((sum, house) => sum + (parseInt(house.vagasOcupadas) || 0), 0);
  const vagasDisponiveis = totalVagas - vagasOcupadas;
  const totalMoradoresImplantacao = filteredHouses.reduce((sum, house) => sum + (parseInt(house.totalResidents || house.totalMoradores) || 0), 0);
  
  // Análise por tipo
  const tipoCount = filteredHouses.reduce((acc, house) => {
    const tipo = house.tipoSRT || 'Não especificado';
    acc[tipo] = (acc[tipo] || 0) + 1;
    return acc;
  }, {});
  
  // Análise por município
  const municipioStats = {};
  filteredHouses.forEach(house => {
    const municipio = house.municipio || 'Não especificado';
    if (!municipioStats[municipio]) {
      municipioStats[municipio] = {
        casas: 0,
        moradores: 0,
        vagasTotais: 0,
        vagasOcupadas: 0,
        tipoI: 0,
        tipoII: 0
      };
    }
    municipioStats[municipio].casas++;
    municipioStats[municipio].moradores += house.residents?.length || 0;
    municipioStats[municipio].vagasTotais += parseInt(house.vagasTotais) || 0;
    municipioStats[municipio].vagasOcupadas += parseInt(house.vagasOcupadas) || 0;
    if (house.tipoSRT === 'Tipo I') municipioStats[municipio].tipoI++;
    if (house.tipoSRT === 'Tipo II') municipioStats[municipio].tipoII++;
  });
  
  // Análise por situação de habilitação
  const habilitacaoCount = filteredHouses.reduce((acc, house) => {
    const situacao = house.situacaoHabilitacao || 'Não informado';
    acc[situacao] = (acc[situacao] || 0) + 1;
    return acc;
  }, {});
  
  // Análise de profissionais
  const totalProfissionais = filteredHouses.reduce((sum, house) => sum + (parseInt(house.totalProfissionais) || 0), 0);
  const totalCuidadores = filteredHouses.reduce((sum, house) => sum + (parseInt(house.totalCuidadores) || 0), 0);
  const totalEnfermeiros = filteredHouses.reduce((sum, house) => sum + (parseInt(house.totalEnfermeiros) || 0), 0);
  const totalTecnicos = filteredHouses.reduce((sum, house) => sum + (parseInt(house.totalTecnicos) || 0), 0);
  
  // Análise de moradores
  const moradoresAnalise = {
    total: 0,
    porIdade: { '18-30': 0, '31-40': 0, '41-50': 0, '51-60': 0, '60+': 0 },
    porGenero: {},
    porRaca: {},
    comPVC: 0,
    semPVC: 0,
    comVinculoFamiliar: 0,
    frequentaCaps: {},
    comBeneficios: {},
    comComorbidades: 0
  };
  
  filteredHouses.forEach(house => {
    if (house.residents) {
      house.residents.forEach(resident => {
        moradoresAnalise.total++;
        
        // Idade
        const idade = parseInt(resident.idade) || 0;
        if (idade >= 18 && idade <= 30) moradoresAnalise.porIdade['18-30']++;
        else if (idade >= 31 && idade <= 40) moradoresAnalise.porIdade['31-40']++;
        else if (idade >= 41 && idade <= 50) moradoresAnalise.porIdade['41-50']++;
        else if (idade >= 51 && idade <= 60) moradoresAnalise.porIdade['51-60']++;
        else if (idade > 60) moradoresAnalise.porIdade['60+']++;
        
        // Gênero
        const genero = resident.generoNascimento || 'Não informado';
        moradoresAnalise.porGenero[genero] = (moradoresAnalise.porGenero[genero] || 0) + 1;
        
        // Raça
        const raca = resident.racaCor || 'Não informada';
        moradoresAnalise.porRaca[raca] = (moradoresAnalise.porRaca[raca] || 0) + 1;
        
        // PVC
        if (resident.participaPVC === 'Sim') moradoresAnalise.comPVC++;
        else if (resident.participaPVC === 'Não') moradoresAnalise.semPVC++;
        
        // Vínculo familiar
        if (resident.vinculoFamiliar === 'Sim' || resident.vinculoFamiliar === 'Esporadicamente') {
          moradoresAnalise.comVinculoFamiliar++;
        }
        
        // Frequência CAPS
        const freqCaps = resident.frequenciaCaps || 'Não informado';
        moradoresAnalise.frequentaCaps[freqCaps] = (moradoresAnalise.frequentaCaps[freqCaps] || 0) + 1;
        
        // Benefícios
        if (resident.beneficios && Array.isArray(resident.beneficios)) {
          resident.beneficios.forEach(beneficio => {
            moradoresAnalise.comBeneficios[beneficio] = (moradoresAnalise.comBeneficios[beneficio] || 0) + 1;
          });
        }
        
        // Comorbidades
        if (resident.comorbidades && resident.comorbidades.length > 0) {
          moradoresAnalise.comComorbidades++;
        }
      });
    }
  });
  
  // Análise de qualidade
  const qualidadeIndicadores = {
    casasComNome: filteredHouses.filter(h => h.nomeResidencia || h.nomeResidenciaTherapeutica).length,
    casasComEndereco: filteredHouses.filter(h => h.logradouro && h.numero).length,
    casasComResponsavel: filteredHouses.filter(h => h.responsavelNome).length,
    casasHabilitadas: filteredHouses.filter(h => h.situacaoHabilitacao === 'Habilitada').length,
    casasComEquipeCompleta: filteredHouses.filter(h => h.totalProfissionais > 0).length,
    divergenciaVagasMoradores: filteredHouses.filter(h => 
      parseInt(h.vagasOcupadas || 0) !== (h.residents?.length || 0)
    ).length
  };
  
  return `
    <div class="space-y-6 animate-fade-in">
      <!-- Cabeçalho do Relatório -->
      <div class="text-center mb-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl p-8">
        <h3 class="text-3xl font-bold mb-2">Relatório Resumido - SRT</h3>
        <p class="text-lg">Período: ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}</p>
        <p class="text-sm mt-2 opacity-90">Total de ${totalHouses} residências analisadas</p>
      </div>
      
      <!-- Cards de Indicadores Principais -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white hover-lift">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-3xl font-bold">${totalHouses}</h4>
            <svg class="w-8 h-8 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <p class="text-blue-100">Total de Casas</p>
          <p class="text-xs mt-2 opacity-75">${Object.keys(municipioStats).length} município(s)</p>
        </div>
        
        <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white hover-lift">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-3xl font-bold">${totalResidents}</h4>
            <svg class="w-8 h-8 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <p class="text-purple-100">Total de Moradores</p>
          <p class="text-xs mt-2 opacity-75">${totalHouses > 0 ? (totalResidents / totalHouses).toFixed(1) : 0} por casa</p>
        </div>
        
        <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white hover-lift">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-3xl font-bold">${totalVagas}</h4>
            <svg class="w-8 h-8 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p class="text-green-100">Total de Vagas</p>
          <p class="text-xs mt-2 opacity-75">${vagasDisponiveis} disponíveis</p>
        </div>
        
        <div class="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white hover-lift">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-3xl font-bold">${totalVagas ? ((vagasOcupadas/totalVagas)*100).toFixed(1) : 0}%</h4>
            <svg class="w-8 h-8 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p class="text-orange-100">Taxa de Ocupação</p>
          <p class="text-xs mt-2 opacity-75">${vagasOcupadas} de ${totalVagas} vagas</p>
        </div>
      </div>
      
      <!-- Distribuição por Tipo e Habilitação -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <h4 class="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Distribuição por Tipo
          </h4>
          <div class="space-y-3">
            ${Object.entries(tipoCount).map(([tipo, count]) => {
              const percent = totalHouses > 0 ? ((count/totalHouses)*100).toFixed(1) : 0;
              return `
                <div class="flex items-center justify-between">
                  <span class="text-gray-600 dark:text-gray-300">${tipo}</span>
                  <div class="flex items-center gap-2">
                    <div class="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div class="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500" style="width: ${percent}%"></div>
                    </div>
                    <span class="text-sm font-medium text-gray-800 dark:text-white w-16 text-right">${count} (${percent}%)</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <h4 class="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Situação de Habilitação
          </h4>
          <div class="space-y-3">
            ${Object.entries(habilitacaoCount).map(([situacao, count]) => {
              const percent = totalHouses > 0 ? ((count/totalHouses)*100).toFixed(1) : 0;
              const color = situacao === 'Habilitada' ? 'green' : situacao === 'Em processo de habilitação' ? 'yellow' : 'red';
              return `
                <div class="flex items-center justify-between">
                  <span class="text-gray-600 dark:text-gray-300">${situacao}</span>
                  <div class="flex items-center gap-2">
                    <div class="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div class="bg-${color}-500 h-2 rounded-full transition-all duration-500" style="width: ${percent}%"></div>
                    </div>
                    <span class="text-sm font-medium text-gray-800 dark:text-white w-16 text-right">${count} (${percent}%)</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
      
      <!-- Top 5 Municípios -->
      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <h4 class="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <svg class="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Análise por Município (Top 5)
        </h4>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th class="text-left py-3">Município</th>
                <th class="text-center py-3">Casas</th>
                <th class="text-center py-3">Moradores</th>
                <th class="text-center py-3">Taxa Ocupação</th>
                <th class="text-center py-3">Tipo I</th>
                <th class="text-center py-3">Tipo II</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              ${Object.entries(municipioStats)
                .sort((a, b) => b[1].casas - a[1].casas)
                .slice(0, 5)
                .map(([municipio, stats], index) => {
                  const taxaOcupacao = stats.vagasTotais > 0 ? ((stats.vagasOcupadas / stats.vagasTotais) * 100).toFixed(1) : 0;
                  return `
                    <tr>
                      <td class="py-3 text-sm">
                        <div class="flex items-center gap-2">
                          <span class="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">${index + 1}</span>
                          <span class="font-medium text-gray-900 dark:text-white">${municipio}</span>
                        </div>
                      </td>
                      <td class="py-3 text-sm text-center text-gray-600 dark:text-gray-300">${stats.casas}</td>
                      <td class="py-3 text-sm text-center text-gray-600 dark:text-gray-300">${stats.moradores}</td>
                      <td class="py-3 text-sm text-center">
                        <span class="px-2 py-1 text-xs rounded-full ${
                          taxaOcupacao >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                          taxaOcupacao >= 50 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                          'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        }">${taxaOcupacao}%</span>
                      </td>
                      <td class="py-3 text-sm text-center text-gray-600 dark:text-gray-300">${stats.tipoI}</td>
                      <td class="py-3 text-sm text-center text-gray-600 dark:text-gray-300">${stats.tipoII}</td>
                    </tr>
                  `;
                }).join('')}
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Perfil dos Moradores -->
      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <h4 class="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <svg class="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Perfil dos Moradores
        </h4>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- Faixa Etária -->
          <div>
            <h5 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Distribuição por Idade</h5>
            <div class="space-y-2">
              ${Object.entries(moradoresAnalise.porIdade).map(([faixa, count]) => {
                const percent = moradoresAnalise.total > 0 ? ((count/moradoresAnalise.total)*100).toFixed(1) : 0;
                return `
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-gray-600 dark:text-gray-400">${faixa} anos</span>
                    <span class="font-medium">${count} (${percent}%)</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          
          <!-- Gênero -->
          <div>
            <h5 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Distribuição por Gênero</h5>
            <div class="space-y-2">
              ${Object.entries(moradoresAnalise.porGenero)
                .sort((a, b) => b[1] - a[1])
                .map(([genero, count]) => {
                  const percent = moradoresAnalise.total > 0 ? ((count/moradoresAnalise.total)*100).toFixed(1) : 0;
                  return `
                    <div class="flex items-center justify-between text-sm">
                      <span class="text-gray-600 dark:text-gray-400">${genero}</span>
                      <span class="font-medium">${count} (${percent}%)</span>
                    </div>
                  `;
                }).join('')}
            </div>
          </div>
          
          <!-- PVC e Vínculos -->
          <div>
            <h5 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Indicadores Sociais</h5>
            <div class="space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">Com PVC</span>
                <span class="font-medium text-green-600">${moradoresAnalise.comPVC}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">Sem PVC</span>
                <span class="font-medium text-red-600">${moradoresAnalise.semPVC}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">Com vínculo familiar</span>
                <span class="font-medium">${moradoresAnalise.comVinculoFamiliar}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">Com comorbidades</span>
                <span class="font-medium">${moradoresAnalise.comComorbidades}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Benefícios -->
        ${Object.keys(moradoresAnalise.comBeneficios).length > 0 ? `
          <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h5 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Benefícios Recebidos</h5>
            <div class="flex flex-wrap gap-2">
              ${Object.entries(moradoresAnalise.comBeneficios)
                .sort((a, b) => b[1] - a[1])
                .map(([beneficio, count]) => `
                  <span class="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm rounded-full">
                    ${beneficio}: ${count}
                  </span>
                `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
      
      <!-- Equipe e Profissionais -->
      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <h4 class="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <svg class="w-5 h-5 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Análise da Equipe
        </h4>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-center">
            <p class="text-2xl font-bold text-pink-600 dark:text-pink-400">${totalProfissionais}</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">Total Profissionais</p>
          </div>
          <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-center">
            <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">${totalCuidadores}</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">Cuidadores</p>
          </div>
          <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-center">
            <p class="text-2xl font-bold text-purple-600 dark:text-purple-400">${totalEnfermeiros}</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">Enfermeiros</p>
          </div>
          <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-center">
            <p class="text-2xl font-bold text-green-600 dark:text-green-400">${totalTecnicos}</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">Técnicos</p>
          </div>
        </div>
      </div>
      
      <!-- Indicadores de Qualidade -->
      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <h4 class="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <svg class="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Indicadores de Qualidade
        </h4>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <span class="text-sm text-gray-600 dark:text-gray-400">Casas com nome cadastrado</span>
            <span class="font-medium ${qualidadeIndicadores.casasComNome === totalHouses ? 'text-green-600' : 'text-yellow-600'}">
              ${qualidadeIndicadores.casasComNome}/${totalHouses}
            </span>
          </div>
          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <span class="text-sm text-gray-600 dark:text-gray-400">Casas com endereço completo</span>
            <span class="font-medium ${qualidadeIndicadores.casasComEndereco === totalHouses ? 'text-green-600' : 'text-yellow-600'}">
              ${qualidadeIndicadores.casasComEndereco}/${totalHouses}
            </span>
          </div>
          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <span class="text-sm text-gray-600 dark:text-gray-400">Casas habilitadas</span>
            <span class="font-medium ${qualidadeIndicadores.casasHabilitadas === totalHouses ? 'text-green-600' : 'text-yellow-600'}">
              ${qualidadeIndicadores.casasHabilitadas}/${totalHouses}
            </span>
          </div>
          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <span class="text-sm text-gray-600 dark:text-gray-400">Com responsável cadastrado</span>
            <span class="font-medium ${qualidadeIndicadores.casasComResponsavel === totalHouses ? 'text-green-600' : 'text-yellow-600'}">
              ${qualidadeIndicadores.casasComResponsavel}/${totalHouses}
            </span>
          </div>
          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <span class="text-sm text-gray-600 dark:text-gray-400">Com equipe registrada</span>
            <span class="font-medium ${qualidadeIndicadores.casasComEquipeCompleta === totalHouses ? 'text-green-600' : 'text-yellow-600'}">
              ${qualidadeIndicadores.casasComEquipeCompleta}/${totalHouses}
            </span>
          </div>
          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <span class="text-sm text-gray-600 dark:text-gray-400">Divergência vagas/moradores</span>
            <span class="font-medium ${qualidadeIndicadores.divergenciaVagasMoradores === 0 ? 'text-green-600' : 'text-red-600'}">
              ${qualidadeIndicadores.divergenciaVagasMoradores} casas
            </span>
          </div>
        </div>
      </div>
      
      <!-- Rodapé do Relatório -->
      <div class="text-center text-sm text-gray-500 dark:text-gray-400 pt-6 border-t border-gray-200 dark:border-gray-700">
        <p>Relatório gerado em ${new Date().toLocaleString('pt-BR')}</p>
        <p class="mt-1">Sistema de Gerenciamento de Residências Terapêuticas - SRT</p>
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
    <div class="space-y-6 animate-fade-in">
      <div class="text-center mb-8">
        <h3 class="text-2xl font-bold text-gray-800 dark:text-white mb-2">Análise de Ocupação</h3>
        <p class="text-gray-600 dark:text-gray-400">Período: ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}</p>
      </div>
      
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg text-center">
          <div class="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">${avgOccupancy.toFixed(1)}%</div>
          <p class="text-gray-600 dark:text-gray-400">Taxa Média</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg text-center">
          <div class="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">${highOccupancy}</div>
          <p class="text-gray-600 dark:text-gray-400">Alta Ocupação</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg text-center">
          <div class="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">${mediumOccupancy}</div>
          <p class="text-gray-600 dark:text-gray-400">Média Ocupação</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg text-center">
          <div class="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">${lowOccupancy}</div>
          <p class="text-gray-600 dark:text-gray-400">Baixa Ocupação</p>
        </div>
      </div>
      
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div class="p-6">
          <h4 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">Detalhamento por Casa</h4>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Casa</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Município</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vagas</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Taxa de Ocupação</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              ${occupancyData.map(house => {
                const color = house.taxaOcupacao >= 80 ? 'green' : house.taxaOcupacao >= 50 ? 'yellow' : 'red';
                return `
                  <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">${house.nome}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">${house.municipio}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">${house.tipo}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">${house.vagasOcupadas}/${house.vagasTotais}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center gap-2">
                        <div class="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div class="bg-gradient-to-r from-${color}-400 to-${color}-600 h-2 rounded-full transition-all duration-500" style="width: ${house.taxaOcupacao}%"></div>
                        </div>
                        <span class="text-sm font-medium text-${color}-600 dark:text-${color}-400">${house.taxaOcupacao.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
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
  
  return `
    <div class="space-y-6 animate-fade-in">
      <div class="text-center mb-8">
        <h3 class="text-2xl font-bold text-gray-800 dark:text-white mb-2">Perfil dos Moradores</h3>
        <p class="text-gray-600 dark:text-gray-400">Período: ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}</p>
      </div>
      
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div class="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white text-center">
          <h4 class="text-4xl font-bold mb-2">${totalResidents}</h4>
          <p class="text-indigo-100">Total de Moradores</p>
        </div>
        <div class="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl p-6 text-white text-center">
          <h4 class="text-4xl font-bold mb-2">${houses.length > 0 ? (totalResidents / houses.length).toFixed(1) : 0}</h4>
          <p class="text-pink-100">Média por Casa</p>
        </div>
      </div>
      
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <h4 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">Distribuição por Faixa Etária</h4>
          <div class="space-y-3">
            ${Object.entries(ageGroups).map(([group, count]) => `
              <div class="flex items-center justify-between">
                <span class="text-gray-600 dark:text-gray-300">${group} anos</span>
                <div class="flex items-center gap-2">
                  <div class="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div class="bg-gradient-to-r from-indigo-500 to-pink-600 h-2 rounded-full" style="width: ${totalResidents ? ((count/totalResidents)*100) : 0}%"></div>
                  </div>
                  <span class="text-sm font-medium text-gray-800 dark:text-white">${count} (${totalResidents ? ((count/totalResidents)*100).toFixed(1) : 0}%)</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <h4 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">Programa de Volta para Casa</h4>
          <div class="grid grid-cols-2 gap-4">
            ${Object.entries(pvcCount).map(([pvc, count]) => {
              const percentage = totalResidents ? ((count/totalResidents)*100).toFixed(1) : 0;
              const color = pvc === 'Sim' ? 'green' : 'gray';
              return `
                <div class="bg-${color}-50 dark:bg-${color}-900/20 rounded-lg p-4 text-center">
                  <div class="text-2xl font-bold text-${color}-600 dark:text-${color}-400">${percentage}%</div>
                  <p class="text-sm text-${color}-700 dark:text-${color}-300">${pvc}</p>
                  <p class="text-xs text-${color}-600 dark:text-${color}-400 mt-1">${count} moradores</p>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
};