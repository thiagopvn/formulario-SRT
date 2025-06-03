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
        <div class="text-sm font-medium text-gray-900 dark:text-white">${house.nomeResidencia || '(Sem nome)'}</div>
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
            <p class="text-sm text-gray-600 dark:text-gray-400">CAPS Vinculada</p>
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
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Informações Gerais
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Nome da Residência</p>
            <p class="font-medium text-gray-900 dark:text-white">${house.nomeResidencia || '-'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">CAPS Vinculado</p>
            <p class="font-medium text-gray-900 dark:text-white">${house.nomeCaps || house.capsVinculadaSRT || '-'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Tipo SRT</p>
            <p class="font-medium text-gray-900 dark:text-white">${house.tipoSRT || '-'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Responsável</p>
            <p class="font-medium text-gray-900 dark:text-white">${house.responsavelNome || '-'} ${house.responsavelCargo ? `(${house.responsavelCargo})` : ''}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Contato</p>
            <p class="font-medium text-gray-900 dark:text-white">${house.contatoResponsavel || '-'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Data de Inauguração</p>
            <p class="font-medium text-gray-900 dark:text-white">${house.dataInauguracao || '-'}</p>
          </div>
        </div>
      </div>
      
      <div class="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <svg class="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Endereço
        </h3>
        <div class="space-y-2">
          <p class="text-gray-700 dark:text-gray-300">
            ${house.logradouro || ''} ${house.numero || ''} ${house.complemento || ''}
          </p>
          <p class="text-gray-700 dark:text-gray-300">
            ${house.bairro || ''} - ${house.municipio || ''}/${house.uf || ''}
          </p>
          <p class="text-gray-700 dark:text-gray-300">
            CEP: ${house.cep || '-'}
          </p>
        </div>
      </div>
      
      <div class="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          Capacidade
        </h3>
        <div class="grid grid-cols-3 gap-4 text-center">
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4">
            <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">${house.vagasTotais || 0}</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">Vagas Totais</p>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4">
            <p class="text-2xl font-bold text-green-600 dark:text-green-400">${house.vagasOcupadas || 0}</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">Vagas Ocupadas</p>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4">
            <p class="text-2xl font-bold text-orange-600 dark:text-orange-400">${house.vagasDisponiveis || 0}</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">Vagas Disponíveis</p>
          </div>
        </div>
      </div>
  `;
  
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
              <span class="font-medium text-gray-900 dark:text-white">${resident.nomeCompleto || '(Sem nome)'}</span>
            </div>
            <svg class="w-5 h-5 text-gray-400 transform transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div class="mt-3 bg-white dark:bg-gray-800 rounded-lg p-4 ml-11">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">Nome Social</p>
                <p class="font-medium text-gray-900 dark:text-white">${resident.nomeSocial || '-'}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">Data de Nascimento</p>
                <p class="font-medium text-gray-900 dark:text-white">${resident.dataNascimento || '-'}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">Idade</p>
                <p class="font-medium text-gray-900 dark:text-white">${resident.idade || '-'} anos</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">Instituição de Origem</p>
                <p class="font-medium text-gray-900 dark:text-white">${resident.instituicaoOrigem || '-'}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">Tempo de Internação</p>
                <p class="font-medium text-gray-900 dark:text-white">${resident.tempoInternacao || '-'} anos</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">Participa do PVC</p>
                <p class="font-medium text-gray-900 dark:text-white">${resident.participaPVC || '-'}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">Frequência CAPS</p>
                <p class="font-medium text-gray-900 dark:text-white">${resident.frequenciaCaps || '-'}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">Frequência UBS</p>
                <p class="font-medium text-gray-900 dark:text-white">${resident.frequenciaUBS || '-'}</p>
              </div>
            </div>
          </div>
        </details>
      `;
    });
    
    detailsHTML += '</div></div>';
  }
  
  detailsHTML += '</div>';
  
  document.getElementById('houseDetails').innerHTML = detailsHTML;
  document.getElementById('houseModal').style.display = 'block';
};

const deleteHouse = async (houseId) => {
  const house = allHouses.find(h => h.id === houseId);
  const houseName = house?.nomeResidencia || 'esta casa';
  
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
    const rows = [];
    
    const styles = {
      title: {
        font: { bold: true, sz: 18, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "3B82F6" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "medium", color: { rgb: "2563EB" } },
          bottom: { style: "medium", color: { rgb: "2563EB" } },
          left: { style: "medium", color: { rgb: "2563EB" } },
          right: { style: "medium", color: { rgb: "2563EB" } }
        }
      },
      subtitle: {
        font: { sz: 12, color: { rgb: "1F2937" } },
        fill: { fgColor: { rgb: "E5E7EB" } },
        alignment: { horizontal: "right", vertical: "center" }
      },
      summary: {
        font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "8B5CF6" } },
        alignment: { horizontal: "left", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "7C3AED" } },
          bottom: { style: "thin", color: { rgb: "7C3AED" } },
          left: { style: "thin", color: { rgb: "7C3AED" } },
          right: { style: "thin", color: { rgb: "7C3AED" } }
        }
      },
      summaryValue: {
        font: { sz: 12, color: { rgb: "1F2937" } },
        fill: { fgColor: { rgb: "F3E8FF" } },
        alignment: { horizontal: "left", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "E9D5FF" } },
          bottom: { style: "thin", color: { rgb: "E9D5FF" } },
          left: { style: "thin", color: { rgb: "E9D5FF" } },
          right: { style: "thin", color: { rgb: "E9D5FF" } }
        }
      },
      header: {
        font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1F2937" } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: { style: "medium", color: { rgb: "111827" } },
          bottom: { style: "medium", color: { rgb: "111827" } },
          left: { style: "thin", color: { rgb: "374151" } },
          right: { style: "thin", color: { rgb: "374151" } }
        }
      },
      cell: {
        font: { sz: 10, color: { rgb: "1F2937" } },
        alignment: { vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "E5E7EB" } },
          bottom: { style: "thin", color: { rgb: "E5E7EB" } },
          left: { style: "thin", color: { rgb: "E5E7EB" } },
          right: { style: "thin", color: { rgb: "E5E7EB" } }
        }
      },
      cellAlt: {
        font: { sz: 10, color: { rgb: "1F2937" } },
        fill: { fgColor: { rgb: "F9FAFB" } },
        alignment: { vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "E5E7EB" } },
          bottom: { style: "thin", color: { rgb: "E5E7EB" } },
          left: { style: "thin", color: { rgb: "E5E7EB" } },
          right: { style: "thin", color: { rgb: "E5E7EB" } }
        }
      },
      number: {
        font: { sz: 10, color: { rgb: "1F2937" } },
        alignment: { horizontal: "center", vertical: "center" },
        numFmt: "#,##0"
      },
      percentage: {
        font: { sz: 10, color: { rgb: "059669" }, bold: true },
        alignment: { horizontal: "center", vertical: "center" },
        numFmt: "0.0%"
      },
      date: {
        font: { sz: 10, color: { rgb: "1F2937" } },
        alignment: { horizontal: "center", vertical: "center" },
        numFmt: "dd/mm/yyyy"
      }
    };
    
    rows.push(['RELATÓRIO DE RESIDÊNCIAS TERAPÊUTICAS - SRT']);
    rows.push([`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`]);
    rows.push([]);
    
    const totalMoradores = allHouses.reduce((sum, house) => sum + (house.residents?.length || 0), 0);
    const taxaMedia = allHouses.reduce((sum, house) => {
      const taxa = house.vagasTotais > 0 ? (house.vagasOcupadas / house.vagasTotais * 100) : 0;
      return sum + taxa;
    }, 0) / (allHouses.length || 1);
    
    rows.push(['RESUMO GERAL']);
    rows.push([`Total de Casas: ${allHouses.length}`]);
    rows.push([`Total de Moradores: ${totalMoradores}`]);
    rows.push([`Taxa de Ocupação Média: ${taxaMedia.toFixed(1)}%`]);
    
    rows.push([]);
    
    const headers = [
      'ID da Casa', 'Região de Saúde', 'Município', 'Coordenação Saúde Mental',
      'Responsável Preenchimento Municipal', 'Telefone Responsável Municipal',
      'E-mail Responsável Municipal', 'Data Preenchimento Municipal',
      'CAPS Vinculada SRT', 'CNES CAPS Vinculada',
      'Nome da Residência', 'CAPS Vinculado', 'CNES do CAPS',
      'Tipo SRT', 'Data de Preenchimento', 'Responsável', 'Cargo', 'Contato',
      'Endereço', 'Bairro', 'Município', 'UF', 'CEP', 'Total de Moradores',
      'Vagas Totais', 'Vagas Ocupadas', 'Vagas Disponíveis', 'Taxa de Ocupação (%)',
      'Morador Nº', 'Nome do Morador', 'Nome Social', 'Data de Nascimento',
      'Idade', 'Instituição de Origem', 'Tempo de Internação', 'Raça/Cor',
      'Sexo Biológico', 'Identidade de Gênero', 'Participa do PVC',
      'Vínculo Familiar', 'Frequência CAPS', 'Frequência UBS'
    ];
    rows.push(headers);
    
    for (const house of allHouses) {
      const taxaOcupacao = house.vagasTotais > 0 ? ((house.vagasOcupadas / house.vagasTotais) * 100).toFixed(1) : '0.0';
      
      const baseInfo = {
        'ID da Casa': house.id,
        'Região de Saúde': house.regiaoSaude || '',
        'Município': house.municipio || '',
        'Coordenação Saúde Mental': house.coordenacaoSaudeMental || '',
        'Responsável Preenchimento Municipal': house.responsavelPreenchimento || '',
        'Telefone Responsável Municipal': house.telefoneResponsavelPreenchimento || '',
        'E-mail Responsável Municipal': house.emailResponsavelPreenchimento || '',
        'Data Preenchimento Municipal': house.dataPreenchimentoMunicipio || '',
        'CAPS Vinculada SRT': house.capsVinculadaSRT || '',
        'CNES CAPS Vinculada': house.cnesCapsVinculada || '',
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
        'Vagas Totais': parseInt(house.vagasTotais) || 0,
        'Vagas Ocupadas': parseInt(house.vagasOcupadas) || 0,
        'Vagas Disponíveis': parseInt(house.vagasDisponiveis) || 0,
        'Taxa de Ocupação (%)': parseFloat(taxaOcupacao)
      };
      
      if (house.residents && house.residents.length > 0) {
        house.residents.forEach((resident, index) => {
          rows.push([
            baseInfo['ID da Casa'],
            baseInfo['Região de Saúde'],
            baseInfo['Município'],
            baseInfo['Coordenação Saúde Mental'],
            baseInfo['Responsável Preenchimento Municipal'],
            baseInfo['Telefone Responsável Municipal'],
            baseInfo['E-mail Responsável Municipal'],
            baseInfo['Data Preenchimento Municipal'],
            baseInfo['CAPS Vinculada SRT'],
            baseInfo['CNES CAPS Vinculada'],
            baseInfo['Nome da Residência'],
            baseInfo['CAPS Vinculado'],
            baseInfo['CNES do CAPS'],
            baseInfo['Tipo SRT'],
            baseInfo['Data de Preenchimento'],
            baseInfo['Responsável'],
            baseInfo['Cargo'],
            baseInfo['Contato'],
            baseInfo['Endereço'],
            baseInfo['Bairro'],
            baseInfo['Município'],
            baseInfo['UF'],
            baseInfo['CEP'],
            baseInfo['Total de Moradores'],
            baseInfo['Vagas Totais'],
            baseInfo['Vagas Ocupadas'],
            baseInfo['Vagas Disponíveis'],
            baseInfo['Taxa de Ocupação (%)'],
            index + 1,
            resident.nomeCompleto || '',
            resident.nomeSocial || '',
            resident.dataNascimento || '',
            resident.idade || '',
            resident.instituicaoOrigem || '',
            resident.tempoInternacao || '',
            resident.racaCor || '',
            resident.generoNascimento || '',
            resident.identidadeGenero || '',
            resident.participaPVC || '',
            resident.vinculoFamiliar || '',
            resident.frequenciaCaps || '',
            resident.frequenciaUBS || ''
          ]);
        });
      } else {
        rows.push([
          baseInfo['ID da Casa'],
          baseInfo['Região de Saúde'],
          baseInfo['Município'],
          baseInfo['Coordenação Saúde Mental'],
          baseInfo['Responsável Preenchimento Municipal'],
          baseInfo['Telefone Responsável Municipal'],
          baseInfo['E-mail Responsável Municipal'],
          baseInfo['Data Preenchimento Municipal'],
          baseInfo['CAPS Vinculada SRT'],
          baseInfo['CNES CAPS Vinculada'],
          baseInfo['Nome da Residência'],
          baseInfo['CAPS Vinculado'],
          baseInfo['CNES do CAPS'],
          baseInfo['Tipo SRT'],
          baseInfo['Data de Preenchimento'],
          baseInfo['Responsável'],
          baseInfo['Cargo'],
          baseInfo['Contato'],
          baseInfo['Endereço'],
          baseInfo['Bairro'],
          baseInfo['Município'],
          baseInfo['UF'],
          baseInfo['CEP'],
          baseInfo['Total de Moradores'],
          baseInfo['Vagas Totais'],
          baseInfo['Vagas Ocupadas'],
          baseInfo['Vagas Disponíveis'],
          baseInfo['Taxa de Ocupação (%)'],
          '', '', '', '', '', '', '', '', '', '', '', '', '', ''
        ]);
      }
    }
    
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    
    worksheet['A1'].s = styles.title;
    worksheet['A2'].s = styles.subtitle;
    worksheet['A4'].s = styles.summary;
    for (let i = 5; i <= 7; i++) {
      worksheet[`A${i}`].s = styles.summaryValue;
    }
    
    for (let C = 0; C <= 41; C++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 8, c: C });
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].s = styles.header;
      }
    }
    
    let isAlternate = false;
    for (let R = 9; R <= range.e.r; R++) {
      for (let C = 0; C <= 41; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s = isAlternate ? styles.cellAlt : styles.cell;
          
          if (C >= 23 && C <= 26) {
            worksheet[cellAddress].s = {
              ...worksheet[cellAddress].s,
              ...styles.number
            };
          } else if (C === 27) {
            worksheet[cellAddress].s = {
              ...worksheet[cellAddress].s,
              ...styles.percentage
            };
            worksheet[cellAddress].t = 'n';
            worksheet[cellAddress].v = worksheet[cellAddress].v / 100;
          } else if (C === 7 || C === 14 || C === 31) {
            if (worksheet[cellAddress].v && worksheet[cellAddress].v.includes('-')) {
              const dateParts = worksheet[cellAddress].v.split('-');
              if (dateParts.length === 3) {
                worksheet[cellAddress].v = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
              }
            }
          }
          
          if (C === 10) {
            worksheet[cellAddress].s.font = { ...worksheet[cellAddress].s.font, bold: true };
          }
        }
      }
      isAlternate = !isAlternate;
    }
    
    const colWidths = [
      { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 30 },
      { wch: 30 }, { wch: 20 }, { wch: 30 }, { wch: 18 },
      { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 25 },
      { wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 25 },
      { wch: 20 }, { wch: 18 }, { wch: 35 }, { wch: 20 },
      { wch: 20 }, { wch: 8 }, { wch: 12 }, { wch: 18 },
      { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 20 },
      { wch: 12 }, { wch: 30 }, { wch: 25 }, { wch: 18 },
      { wch: 10 }, { wch: 30 }, { wch: 20 }, { wch: 15 },
      { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 18 },
      { wch: 18 }, { wch: 18 }
    ];
    
    worksheet['!cols'] = colWidths;
    
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 41 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 41 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 4 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: 4 } },
      { s: { r: 5, c: 0 }, e: { r: 5, c: 4 } },
      { s: { r: 6, c: 0 }, e: { r: 6, c: 4 } }
    ];
    
    worksheet['!rows'] = [
      { hpt: 30 }, { hpt: 20 }, { hpt: 15 }, { hpt: 25 },
      { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, { hpt: 15 }, { hpt: 30 }
    ];
    
    worksheet['!freeze'] = { xSplit: 0, ySplit: 9, topLeftCell: "A10" };
    worksheet['!autofilter'] = { ref: `A9:AP${range.e.r}` };
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Casas SRT");
    
    workbook.Props = {
      Title: "Relatório SRT - Sistema de Residências Terapêuticas",
      Subject: "Dados completos das Residências Terapêuticas",
      Author: "Sistema SRT",
      CreatedDate: new Date(),
      Keywords: "SRT, Residências Terapêuticas, Saúde Mental"
    };
    
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `relatorio_srt_${date}.xlsx`);
    
    showToast('Dados exportados com sucesso!');
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
  textarea: '<rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><path d="M7 7h10M7 12h10M7 17h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  tel: '<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  email: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" stroke-width="2"/><path d="M22 6l-10 7L2 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
};

const fieldTypeLabels = {
  text: 'Texto',
  number: 'Número',
  date: 'Data',
  select: 'Lista',
  textarea: 'Texto Longo',
  tel: 'Telefone',
  email: 'E-mail'
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
});

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
  
  if (field.type === 'select' && field.options) {
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
  
  document.getElementById('optionsContainer').classList.toggle('hidden', type !== 'select');
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
  
  if (fieldData.type === 'select') {
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
    <div class="space-y-6 animate-fade-in">
      <div class="text-center mb-8">
        <h3 class="text-2xl font-bold text-gray-800 dark:text-white mb-2">Relatório Resumido</h3>
        <p class="text-gray-600 dark:text-gray-400">Período: ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}</p>
      </div>
      
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <h4 class="text-3xl font-bold mb-2">${totalHouses}</h4>
          <p class="text-blue-100">Total de Casas</p>
        </div>
        <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <h4 class="text-3xl font-bold mb-2">${totalResidents}</h4>
          <p class="text-purple-100">Total de Moradores</p>
        </div>
        <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <h4 class="text-3xl font-bold mb-2">${totalVagas}</h4>
          <p class="text-green-100">Total de Vagas</p>
        </div>
        <div class="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <h4 class="text-3xl font-bold mb-2">${totalVagas ? ((vagasOcupadas/totalVagas)*100).toFixed(1) : 0}%</h4>
          <p class="text-orange-100">Taxa de Ocupação</p>
        </div>
      </div>
      
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <h4 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">Distribuição por Tipo</h4>
          <div class="space-y-3">
            ${Object.entries(tipoCount).map(([tipo, count]) => `
              <div class="flex items-center justify-between">
                <span class="text-gray-600 dark:text-gray-300">${tipo}</span>
                <div class="flex items-center gap-2">
                  <div class="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div class="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full" style="width: ${totalHouses ? ((count/totalHouses)*100) : 0}%"></div>
                  </div>
                  <span class="text-sm font-medium text-gray-800 dark:text-white">${count} (${totalHouses ? ((count/totalHouses)*100).toFixed(1) : 0}%)</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <h4 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">Top 5 Municípios</h4>
          <div class="space-y-3">
            ${Object.entries(municipioCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([municipio, count], index) => `
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">${index + 1}</span>
                  <span class="text-gray-600 dark:text-gray-300">${municipio}</span>
                </div>
                <span class="text-sm font-medium text-gray-800 dark:text-white">${count} casas</span>
              </div>
            `).join('')}
          </div>
        </div>
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