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

let allUsers = [];
let editingUserId = null;
let currentUser = null;

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

// Verificar autenticação
auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    checkUserPermission(user);
  } else {
    window.location.href = 'admin.html';
  }
});

// Verificar se o usuário tem permissão de administrador
const checkUserPermission = async (user) => {
  try {
    const userDoc = await db.collection('users').doc(user.email).get();
    
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      showToast('Você não tem permissão para acessar esta página', 'error');
      setTimeout(() => {
        window.location.href = 'admin.html';
      }, 2000);
      return;
    }
    
    initializeApp();
  } catch (error) {
    console.error('Erro ao verificar permissões:', error);
    window.location.href = 'admin.html';
  }
};

const initializeApp = async () => {
  showLoading();
  initTheme();
  
  try {
    await loadUsers();
    setupEventListeners();
  } catch (error) {
    console.error('Erro ao inicializar:', error);
    showToast('Erro ao carregar dados', 'error');
  } finally {
    hideLoading();
  }
};

const setupEventListeners = () => {
  // Botão de adicionar usuário
  document.getElementById('addUserBtn').addEventListener('click', () => {
    editingUserId = null;
    document.getElementById('modalTitle').textContent = 'Adicionar Usuário';
    document.getElementById('submitBtnText').textContent = 'Criar Usuário';
    document.getElementById('userForm').reset();
    document.getElementById('passwordFields').style.display = 'grid';
    document.getElementById('userPassword').required = true;
    document.getElementById('confirmPassword').required = true;
    document.getElementById('userModal').style.display = 'block';
  });
  
  // Formulário de usuário
  document.getElementById('userForm').addEventListener('submit', handleUserSubmit);
  
  // Busca
  document.getElementById('searchInput').addEventListener('input', filterUsers);
  
  // Filtros
  document.getElementById('filterRole').addEventListener('change', filterUsers);
  document.getElementById('filterStatus').addEventListener('change', filterUsers);
  
  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    if (confirm('Deseja realmente sair?')) {
      auth.signOut();
    }
  });
  
  // Mobile menu toggle
  document.getElementById('mobileMenuToggle').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('translate-x-0');
    sidebar.classList.toggle('-translate-x-full');
  });
};

const loadUsers = async () => {
  const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
  allUsers = [];
  
  snapshot.forEach(doc => {
    allUsers.push({ id: doc.id, ...doc.data() });
  });
  
  updateStats();
  displayUsers(allUsers);
};

const updateStats = () => {
  const totalUsers = allUsers.length;
  const activeUsers = allUsers.filter(u => u.status === 'active').length;
  const adminUsers = allUsers.filter(u => u.role === 'admin').length;
  
  // Animação dos números
  animateNumber('totalUsers', totalUsers);
  animateNumber('activeUsers', activeUsers);
  animateNumber('adminUsers', adminUsers);
  
  // Último usuário cadastrado
  if (allUsers.length > 0) {
    const lastUser = allUsers[0];
    const date = lastUser.createdAt?.toDate();
    document.getElementById('lastUserAdded').textContent = date ? 
      date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '-';
  }
};

const animateNumber = (elementId, target) => {
  const element = document.getElementById(elementId);
  const current = parseInt(element.textContent) || 0;
  const duration = 1000;
  const startTime = performance.now();
  
  const animate = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    const currentValue = Math.round(current + (target - current) * easeOutQuart);
    
    element.textContent = currentValue;
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };
  
  requestAnimationFrame(animate);
};

const displayUsers = (users) => {
  const tbody = document.querySelector('#usersTable tbody');
  tbody.innerHTML = '';
  
  users.forEach((user, index) => {
    const row = document.createElement('tr');
    row.className = 'table-row-hover transition-all duration-200';
    row.style.animationDelay = `${index * 50}ms`;
    row.classList.add('animate-fade-in');
    
    const statusColor = user.status === 'active' 
      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    
    const roleColor = user.role === 'admin' 
      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' 
      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    
    const createdDate = user.createdAt?.toDate();
    const formattedDate = createdDate ? createdDate.toLocaleDateString('pt-BR') : '-';
    
    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center">
          <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
            ${user.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div class="ml-3">
            <div class="text-sm font-medium text-gray-900 dark:text-white">${user.name || 'Sem nome'}</div>
          </div>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm text-gray-600 dark:text-gray-300">${user.email || user.id}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${roleColor}">
          ${user.role === 'admin' ? 'Administrador' : 'Usuário'}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}">
          ${user.status === 'active' ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
        ${formattedDate}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <button class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3 transform hover:scale-110 transition-all" onclick="editUser('${user.id}')">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        ${user.id !== currentUser.email ? `
          <button class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transform hover:scale-110 transition-all" onclick="deleteUser('${user.id}')">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        ` : ''}
      </td>
    `;
    tbody.appendChild(row);
  });
};

const filterUsers = () => {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const roleFilter = document.getElementById('filterRole').value;
  const statusFilter = document.getElementById('filterStatus').value;
  
  const filtered = allUsers.filter(user => {
    const matchSearch = user.name?.toLowerCase().includes(search) || 
                       user.email?.toLowerCase().includes(search) ||
                       user.id.toLowerCase().includes(search);
    const matchRole = !roleFilter || user.role === roleFilter;
    const matchStatus = !statusFilter || user.status === statusFilter;
    
    return matchSearch && matchRole && matchStatus;
  });
  
  displayUsers(filtered);
};

window.editUser = (userId) => {
  const user = allUsers.find(u => u.id === userId);
  if (!user) return;
  
  editingUserId = userId;
  document.getElementById('modalTitle').textContent = 'Editar Usuário';
  document.getElementById('submitBtnText').textContent = 'Salvar Alterações';
  
  // Preencher os campos
  document.getElementById('userName').value = user.name || '';
  document.getElementById('userEmail').value = user.email || user.id;
  document.getElementById('userRole').value = user.role || 'user';
  document.getElementById('userStatus').value = user.status || 'active';
  
  // Esconder campos de senha para edição
  document.getElementById('passwordFields').style.display = 'none';
  document.getElementById('userPassword').required = false;
  document.getElementById('confirmPassword').required = false;
  
  document.getElementById('userModal').style.display = 'block';
};

window.deleteUser = async (userId) => {
  const user = allUsers.find(u => u.id === userId);
  const userName = user?.name || user?.email || 'este usuário';
  
  if (!confirm(`Tem certeza que deseja excluir "${userName}"? Esta ação não pode ser desfeita.`)) {
    return;
  }
  
  showLoading();
  try {
    await db.collection('users').doc(userId).delete();
    await loadUsers();
    showToast('Usuário excluído com sucesso!');
  } catch (error) {
    console.error('Erro ao excluir:', error);
    showToast('Erro ao excluir usuário', 'error');
  } finally {
    hideLoading();
  }
};

const handleUserSubmit = async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('userName').value;
  const email = document.getElementById('userEmail').value;
  const password = document.getElementById('userPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const role = document.getElementById('userRole').value;
  const status = document.getElementById('userStatus').value;
  
  // Validações
  if (!editingUserId && password !== confirmPassword) {
    showToast('As senhas não coincidem', 'error');
    return;
  }
  
  showLoading();
  
  try {
    const userData = {
      name,
      role,
      status,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (editingUserId) {
      // Editar usuário existente
      if (editingUserId !== email) {
        // Se o e-mail mudou, criar novo documento e deletar o antigo
        userData.email = email;
        userData.createdAt = allUsers.find(u => u.id === editingUserId).createdAt;
        await db.collection('users').doc(email).set(userData);
        await db.collection('users').doc(editingUserId).delete();
      } else {
        // Apenas atualizar os dados
        await db.collection('users').doc(editingUserId).update(userData);
      }
      
      showToast('Usuário atualizado com sucesso!');
    } else {
      // Criar novo usuário
      try {
        // Criar usuário no Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Salvar dados no Firestore
        userData.email = email;
        userData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('users').doc(email).set(userData);
        
        showToast('Usuário criado com sucesso!');
      } catch (authError) {
        if (authError.code === 'auth/email-already-in-use') {
          // Se o e-mail já existe no Auth, apenas adicionar ao Firestore
          userData.email = email;
          userData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
          await db.collection('users').doc(email).set(userData);
          showToast('Usuário adicionado ao sistema!');
        } else {
          throw authError;
        }
      }
    }
    
    await loadUsers();
    closeUserModal();
  } catch (error) {
    console.error('Erro ao salvar usuário:', error);
    let errorMessage = 'Erro ao salvar usuário';
    
    switch (error.code) {
      case 'auth/weak-password':
        errorMessage = 'A senha deve ter pelo menos 6 caracteres';
        break;
      case 'auth/invalid-email':
        errorMessage = 'E-mail inválido';
        break;
      case 'auth/operation-not-allowed':
        errorMessage = 'Operação não permitida';
        break;
    }
    
    showToast(errorMessage, 'error');
  } finally {
    hideLoading();
  }
};

window.closeUserModal = () => {
  document.getElementById('userModal').style.display = 'none';
  document.getElementById('userForm').reset();
  document.getElementById('passwordFields').style.display = 'grid';
  document.getElementById('userPassword').required = true;
  document.getElementById('confirmPassword').required = true;
  editingUserId = null;
};