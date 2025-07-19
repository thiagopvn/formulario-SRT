document.addEventListener('DOMContentLoaded', () => {
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

    const addUserBtn = document.getElementById('addUserBtn');
    const userModal = document.getElementById('userModal');
    const userForm = document.getElementById('userForm');
    const usersTableBody = document.querySelector('#usersTable tbody');
    const logoutBtn = document.getElementById('logoutBtn');

    // Check for auth state
    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = 'admin.html';
        }
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = 'index.html';
        });
    });

    // Open modal
    addUserBtn.addEventListener('click', () => {
        userForm.reset();
        document.getElementById('userModalTitle').textContent = 'Adicionar Usuário';
        document.getElementById('userId').value = '';
        userModal.style.display = 'flex';
    });

    // Close modal
    window.closeUserModal = () => {
        userModal.style.display = 'none';
    };

    // Handle form submission
    userForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('userEmail').value;
        const password = document.getElementById('userPassword').value;
        const userId = document.getElementById('userId').value;

        if (userId) {
            // Update user (password cannot be updated directly, only email)
            // This is a limitation of Firebase Auth
            showToast('Funcionalidade de edição em desenvolvimento.', 'info');

        } else {
            // Create user
            try {
                await auth.createUserWithEmailAndPassword(email, password);
                showToast('Usuário criado com sucesso!', 'success');
                closeUserModal();
                loadUsers();
            } catch (error) {
                showToast(`Erro ao criar usuário: ${error.message}`, 'error');
            }
        }
    });

    // Load users
    const loadUsers = async () => {
        // Firebase Auth does not provide a direct way to list all users from the client-side.
        // This would typically be done from a server environment with Admin SDK.
        // As a workaround, we will only show the current user.
        const user = auth.currentUser;
        if (user) {
            renderUser(user);
        } else {
            usersTableBody.innerHTML = '<tr><td colspan="2" class="text-center py-4">Nenhum usuário logado.</td></tr>';
        }
    };

    // Render user in table
    const renderUser = (user) => {
        usersTableBody.innerHTML = '';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">${user.email}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button class="text-red-600 hover:text-red-900" onclick="deleteUser('${user.uid}')">Deletar</button>
            </td>
        `;
        usersTableBody.appendChild(tr);
    };

    // Delete user
    window.deleteUser = async (uid) => {
        if (confirm('Tem certeza que deseja deletar este usuário?')) {
            // Deleting users from the client-side is also a sensitive operation.
            // Usually, this is done from a server with Admin SDK.
            // The currently logged-in user can delete their own account.
            const user = auth.currentUser;
            if (user && user.uid === uid) {
                try {
                    await user.delete();
                    showToast('Usuário deletado com sucesso!', 'success');
                    loadUsers();
                } catch (error) {
                    showToast(`Erro ao deletar usuário: ${error.message}`, 'error');
                }
            } else {
                showToast('Você só pode deletar sua própria conta.', 'error');
            }
        }
    };

    loadUsers();
});
