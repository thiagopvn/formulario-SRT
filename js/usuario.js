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
const auth = firebase.auth();
const db = firebase.firestore();

let allUsers = [];
let currentUser = null;
let deleteUserId = null;

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

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = 'admin.html';
    return;
  }
  
  currentUser = user;
  showLoading();
  
  try {
    const userDoc = await db.collection('users').doc(user.email).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      showToast('Acesso negado. Você não tem permissão de administrador.', 'error');
      setTimeout(() => {
        auth.signOut();
        window.location.href = 'admin.html';
      }, 2000);
      return;
    }
    
    await initializeApp();
  } catch (error) {
    console.error('Erro ao verificar permissões:', error);
    showToast('Erro ao verificar permissões', 'error');
  } finally {
    hideLoading();
  }
});

const initializeApp = async () => {
  initTheme();
  setupEventListeners();
  await loadUsers();
};

const setupEventListeners = () => {
  document.getElementById('addUserBtn').addEventListener('click', () => {
    openUserModal();
  });
  
  document.getElementById('refreshBtn').addEventListener('click', async () => {
    await loadUsers();
    showToast('Lista atualizada!');
  });
  
  document.getElementById('userForm').addEventListener('submit', handleUserSubmit);
  
  document.getElementById('searchInput').addEventListener('input', (e) => {
    filterUsers(e.target.value);
  });
  
  document.getElementById('logoutBtn').addEventListener('click', () => {
    if (confirm('Deseja realmente sair?')) {
      auth.signOut();
    }
  });
  
  document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    if (deleteUserId) {
      await deleteUser(deleteUserId);
      closeConfirmModal();
    }
  });
  
  document.getElementById('mobileMenuToggle')?.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('translate-x-0');
    sidebar.classList.toggle('-translate-x-full');
  });
};

const loadUsers = async () => {
  showLoading();
  try {
    const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
    allUsers = [];
    
    snapshot.forEach(doc => {
      allUsers.push({ id: doc.id, ...doc.data() });
    });
    
    updateStats();
    displayUsers(allUsers);
  } catch (error) {
    console.error('Erro ao carregar usuários:', error);
    showToast('Erro ao carregar usuários', 'error');
  } finally {
    hideLoading();
  }
};

const updateStats = () => {
  const totalUsers = allUsers.length;
  const activeUsers = allUsers.filter(user => user.status === 'active').length;
  const adminUsers = allUsers.filter(user => user.role === 'admin').length;
  const inactiveUsers = allUsers.filter(user => user.status === 'inactive').length;
  
  animateNumber('totalUsers', totalUsers);
  animateNumber('activeUsers', activeUsers);
  animateNumber('adminUsers', adminUsers);
  animateNumber('inactiveUsers', inactiveUsers);
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
    const currentValue = current + (target - current) * easeOutQuart;
    
    element.textContent = Math.round(currentValue);
    
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
    
    const lastLogin = user.lastLogin ? formatDate(user.lastLogin) : 'Nunca';
    const statusClass = user.status === 'active' ? 'status-active' : 'status-inactive';
    const statusText = user.status === 'active' ? 'Ativo' : 'Inativo';
    const roleClass = user.role === 'admin' ? 'role-admin' : 'role-user';
    const roleText = user.role === 'admin' ? 'Administrador' : 'Usuário';
    const statusIcon = user.status === 'active' 
      ? '<div class="w-2 h-2 bg-green-500 rounded-full"></div>'
      : '<div class="w-2 h-2 bg-red-500 rounded-full"></div>';
    
    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center">
          <div class="flex-shrink-0 h-10 w-10">
            <div class="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
              ${user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
          <div class="ml-4">
            <div class="text-sm font-medium text-gray-900 dark:text-white">
              ${user.name || 'Sem nome'}
            </div>
          </div>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm text-gray-900 dark:text-gray-300">${user.email}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="role-badge ${roleClass}">${roleText}</span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="status-badge ${statusClass}">
          ${statusIcon}
          ${statusText}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        ${lastLogin}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <button onclick="editUser('${user.id}')" class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        ${user.email !== currentUser.email ? `
          <button onclick="confirmDeleteUser('${user.id}')" class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
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

const filterUsers = (search) => {
  const filtered = allUsers.filter(user => {
    const name = (user.name || '').toLowerCase();
    const email = user.email.toLowerCase();
    const searchLower = search.toLowerCase();
    
    return name.includes(searchLower) || email.includes(searchLower);
  });
  
  displayUsers(filtered);
};

const openUserModal = (userId = null) => {
  const modal = document.getElementById('userModal');
  const form = document.getElementById('userForm');
  const modalTitle = document.getElementById('userModalTitle');
  const passwordFields = document.getElementById('passwordFields');
  const isEdit = document.getElementById('isEdit');
  const errorMessage = document.getElementById('errorMessage');
  
  form.reset();
  errorMessage.classList.add('hidden');
  
  if (userId) {
    const user = allUsers.find(u => u.id === userId);
    if (user) {
      modalTitle.textContent = 'Editar Usuário';
      document.getElementById('userId').value = user.id;
      document.getElementById('userName').value = user.name || '';
      document.getElementById('userEmail').value = user.email;
      document.getElementById('userRole').value = user.role || 'user';
      document.getElementById('userStatus').value = user.status || 'active';
      passwordFields.style.display = 'none';
      isEdit.value = 'true';
      
      document.getElementById('userPassword').removeAttribute('required');
      document.getElementById('userPasswordConfirm').removeAttribute('required');
    }
  } else {
    modalTitle.textContent = 'Adicionar Usuário';
    document.getElementById('userId').value = '';
    passwordFields.style.display = 'grid';
    isEdit.value = 'false';
    
    document.getElementById('userPassword').setAttribute('required', 'required');
    document.getElementById('userPasswordConfirm').setAttribute('required', 'required');
  }
  
  modal.style.display = 'block';
};

window.editUser = (userId) => {
  openUserModal(userId);
};

window.closeUserModal = () => {
  document.getElementById('userModal').style.display = 'none';
};

window.confirmDeleteUser = (userId) => {
  deleteUserId = userId;
  document.getElementById('confirmModal').style.display = 'block';
};

window.closeConfirmModal = () => {
  document.getElementById('confirmModal').style.display = 'none';
  deleteUserId = null;
};

const handleUserSubmit = async (e) => {
  e.preventDefault();
  
  const userId = document.getElementById('userId').value;
  const isEdit = document.getElementById('isEdit').value === 'true';
  const name = document.getElementById('userName').value.trim();
  const email = document.getElementById('userEmail').value.trim();
  const password = document.getElementById('userPassword').value;
  const passwordConfirm = document.getElementById('userPasswordConfirm').value;
  const role = document.getElementById('userRole').value;
  const status = document.getElementById('userStatus').value;
  const errorMessage = document.getElementById('errorMessage');
  
  errorMessage.classList.add('hidden');
  
  if (!isEdit && password !== passwordConfirm) {
    errorMessage.textContent = 'As senhas não coincidem';
    errorMessage.classList.remove('hidden');
    return;
  }
  
  if (!isEdit && password.length < 6) {
    errorMessage.textContent = 'A senha deve ter no mínimo 6 caracteres';
    errorMessage.classList.remove('hidden');
    return;
  }
  
  showLoading();
  
  try {
    if (isEdit) {
      await db.collection('users').doc(userId).update({
        name,
        email,
        role,
        status,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      showToast('Usuário atualizado com sucesso!');
    } else {
      const secondaryApp = firebase.initializeApp(firebaseConfig, 'Secondary');
      const secondaryAuth = secondaryApp.auth();
      
      try {
        const userCredential = await secondaryAuth.createUserWithEmailAndPassword(email, password);
        const newUser = userCredential.user;
        
        await db.collection('users').doc(email).set({
          uid: newUser.uid,
          name,
          email,
          role,
          status,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          createdBy: currentUser.email
        });
        
        await secondaryAuth.signOut();
        showToast('Usuário criado com sucesso!');
      } finally {
        await secondaryApp.delete();
      }
    }
    
    closeUserModal();
    await loadUsers();
  } catch (error) {
    console.error('Erro ao salvar usuário:', error);
    
    let errorMsg = 'Erro ao salvar usuário';
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMsg = 'Este e-mail já está em uso';
        break;
      case 'auth/invalid-email':
        errorMsg = 'E-mail inválido';
        break;
      case 'auth/weak-password':
        errorMsg = 'Senha muito fraca';
        break;
    }
    
    errorMessage.textContent = errorMsg;
    errorMessage.classList.remove('hidden');
  } finally {
    hideLoading();
  }
};

const deleteUser = async (userId) => {
  showLoading();
  
  try {
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }
    
    await db.collection('users').doc(userId).update({
      status: 'inactive',
      deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
      deletedBy: currentUser.email
    });
    
    await loadUsers();
    showToast('Usuário excluído com sucesso!');
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    showToast('Erro ao excluir usuário', 'error');
  } finally {
    hideLoading();
  }
};

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `Há ${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
      return `Há ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
    } else if (diffDays < 7) {
      return `Há ${diffDays} dia${diffDays !== 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  } catch (error) {
    return '';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const adminPanel = document.getElementById('adminPanel');
  if (adminPanel) {
    adminPanel.style.display = 'flex';
  }
});
