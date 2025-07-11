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

let currentStep = 1;
let totalSteps = 5;
let formConfig = null;
let residents = [];

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

const initializeApp = async () => {
  showLoading();
  initTheme();
  
  try {
    await loadFormConfiguration();
    generateFormFields();
    setupEventListeners();
    updateProgress();
    initializeCapacityDisplay();
  } catch (error) {
    console.error('Erro ao inicializar:', error);
    showToast('Erro ao carregar configuração do formulário', 'error');
  } finally {
    hideLoading();
  }
};

const loadFormConfiguration = async () => {
  try {
    const configRef = db.collection('config').doc('srt');
    const configSnap = await configRef.get();
    
    if (configSnap.exists) {
      formConfig = configSnap.data();
    } else {
      formConfig = getDefaultConfig();
    }
  } catch (error) {
    console.error('Erro ao carregar configuração:', error);
    formConfig = getDefaultConfig();
  }
};

const getDefaultConfig = () => {
  return {
    municipio: [
      { key: 'municipio', label: 'Município', type: 'text', required: true },
      { key: 'responsavelPreenchimento', label: 'Responsável pelo Preenchimento', type: 'text', required: true },
      { key: 'emailResponsavelPreenchimento', label: 'E-mail do Responsável', type: 'email', required: true }
    ],
    general: [
      { key: 'capsVinculado', label: 'CAPS Vinculado', type: 'text', required: true },
      { key: 'tipoSRT', label: 'Tipo SRT', type: 'select', required: true, options: ['SRT I', 'SRT II', 'SRT III'] },
      { key: 'dataHabilitacao', label: 'Data de Habilitação', type: 'date', required: false }
    ],
    residence: [
      { key: 'nomeResidencia', label: 'Nome da Residência', type: 'text', required: true },
      { key: 'enderecoCompleto', label: 'Endereço Completo', type: 'text', required: true },
      { key: 'zona', label: 'Zona', type: 'select', required: false, options: ['Norte', 'Sul', 'Leste', 'Oeste', 'Centro'] },
      { key: 'vagasTotais', label: 'Cadastrados no CNES', type: 'number', required: true, min: 0 },
      { key: 'vagasOcupadas', label: 'Moradores Atuais', type: 'number', required: false, min: 0 }
    ],
    caregivers: [
      { key: 'coordenadorNome', label: 'Nome do Coordenador', type: 'text', required: false },
      { key: 'coordenadorTelefone', label: 'Telefone do Coordenador', type: 'tel', required: false },
      { key: 'equipeComposicao', label: 'Composição da Equipe', type: 'textarea', required: false }
    ],
    residentFields: [
      { key: 'nomeCompleto', label: 'Nome Completo', type: 'text', required: true },
      { key: 'nomeSocial', label: 'Nome Social', type: 'text', required: false },
      { key: 'cpf', label: 'CPF', type: 'text', required: false },
      { key: 'dataNascimento', label: 'Data de Nascimento', type: 'date', required: false },
      { key: 'sexo', label: 'Sexo', type: 'select', required: false, options: ['Masculino', 'Feminino', 'Outro'] },
      { key: 'diagnosticoPrincipal', label: 'Diagnóstico Principal', type: 'text', required: false },
      { key: 'endereco', label: 'Endereço', type: 'textarea', required: false }
    ]
  };
};

const generateFormFields = () => {
  const sections = [
    { key: 'municipio', containerId: 'municipioFields' },
    { key: 'general', containerId: 'generalFields' },
    { key: 'residence', containerId: 'residenceFields' },
    { key: 'caregivers', containerId: 'caregiversFields' }
  ];
  
  sections.forEach(section => {
    const container = document.getElementById(section.containerId);
    const fields = formConfig[section.key] || [];
    
    container.innerHTML = '';
    
    fields.forEach(field => {
      const fieldHTML = generateFieldHTML(field);
      container.insertAdjacentHTML('beforeend', fieldHTML);
    });
  });
};

const generateFieldHTML = (field) => {
  const requiredAttr = field.required ? 'required' : '';
  const requiredLabel = field.required ? '<span class="text-red-500">*</span>' : '';
  
  let inputHTML = '';
  
  switch (field.type) {
    case 'text':
    case 'email':
    case 'tel':
      inputHTML = `
        <div class="floating-label">
          <input type="${field.type}" id="${field.key}" name="${field.key}" ${requiredAttr} 
                 class="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all" 
                 placeholder=" ">
          <label for="${field.key}">${field.label} ${requiredLabel}</label>
        </div>
      `;
      break;
      
    case 'number':
      const minAttr = field.min !== undefined ? `min="${field.min}"` : '';
      const maxAttr = field.max !== undefined ? `max="${field.max}"` : '';
      inputHTML = `
        <div class="floating-label">
          <input type="number" id="${field.key}" name="${field.key}" ${requiredAttr} ${minAttr} ${maxAttr}
                 class="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all" 
                 placeholder=" ">
          <label for="${field.key}">${field.label} ${requiredLabel}</label>
        </div>
      `;
      break;
      
    case 'date':
      inputHTML = `
        <div class="floating-label">
          <input type="date" id="${field.key}" name="${field.key}" ${requiredAttr}
                 class="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all" 
                 placeholder=" ">
          <label for="${field.key}">${field.label} ${requiredLabel}</label>
        </div>
      `;
      break;
      
    case 'select':
      const options = field.options || [];
      inputHTML = `
        <div class="floating-label">
          <select id="${field.key}" name="${field.key}" ${requiredAttr}
                  class="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all">
            <option value="">Selecione...</option>
            ${options.map(option => `<option value="${option}">${option}</option>`).join('')}
          </select>
          <label for="${field.key}">${field.label} ${requiredLabel}</label>
        </div>
      `;
      break;
      
    case 'multiselect':
      const multioptions = field.options || [];
      inputHTML = `
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            ${field.label} ${requiredLabel}
          </label>
          <div class="checkbox-group">
            ${multioptions.map(option => `
              <label class="checkbox-item">
                <input type="checkbox" name="${field.key}" value="${option}" class="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">${option}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `;
      break;
      
    case 'textarea':
      inputHTML = `
        <div class="floating-label">
          <textarea id="${field.key}" name="${field.key}" ${requiredAttr} rows="4"
                    class="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all resize-none" 
                    placeholder=" "></textarea>
          <label for="${field.key}">${field.label} ${requiredLabel}</label>
        </div>
      `;
      break;
  }
  
  return `<div class="form-field">${inputHTML}</div>`;
};

const setupEventListeners = () => {
  document.getElementById('nextBtn').addEventListener('click', nextStep);
  document.getElementById('prevBtn').addEventListener('click', prevStep);
  document.getElementById('srtForm').addEventListener('submit', handleSubmit);
  document.getElementById('previewBtn').addEventListener('click', showPreview);
  document.getElementById('clearBtn').addEventListener('click', clearForm);
  document.getElementById('addResidentBtn').addEventListener('click', addResident);
  
  document.addEventListener('change', (e) => {
    if (e.target.name === 'vagasTotais' || e.target.name === 'vagasOcupadas') {
      calculateCapacityMetrics();
    }
  });
  
  document.addEventListener('input', (e) => {
    if (e.target.name === 'vagasTotais' || e.target.name === 'vagasOcupadas') {
      calculateCapacityMetrics();
    }
  });
};

const nextStep = () => {
  if (validateCurrentStep()) {
    if (currentStep < totalSteps) {
      currentStep++;
      updateStepDisplay();
      updateProgress();
    }
  }
};

const prevStep = () => {
  if (currentStep > 1) {
    currentStep--;
    updateStepDisplay();
    updateProgress();
  }
};

const validateCurrentStep = () => {
  const currentSection = document.getElementById(`step${currentStep}`);
  const requiredFields = currentSection.querySelectorAll('[required]');
  let isValid = true;
  
  requiredFields.forEach(field => {
    if (!field.value.trim()) {
      field.classList.add('animate-shake');
      field.focus();
      isValid = false;
      
      setTimeout(() => {
        field.classList.remove('animate-shake');
      }, 500);
      
      return false;
    }
  });
  
  if (!isValid) {
    showToast('Por favor, preencha todos os campos obrigatórios', 'error');
  }
  
  return isValid;
};

const updateStepDisplay = () => {
  document.querySelectorAll('.form-section').forEach(section => {
    section.classList.remove('active');
  });
  
  document.getElementById(`step${currentStep}`).classList.add('active');
  
  document.querySelectorAll('.step-indicator').forEach((indicator, index) => {
    const stepNumber = index + 1;
    const circle = indicator.querySelector('div');
    const span = indicator.querySelector('span');
    
    if (stepNumber <= currentStep) {
      circle.className = 'w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold';
      span.className = 'text-sm font-medium text-blue-600 dark:text-blue-400';
      indicator.classList.add('active');
    } else {
      circle.className = 'w-8 h-8 bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 rounded-full flex items-center justify-center text-sm font-bold';
      span.className = 'text-sm font-medium text-gray-500 dark:text-gray-400';
      indicator.classList.remove('active');
    }
  });
  
  document.getElementById('prevBtn').style.display = currentStep === 1 ? 'none' : 'flex';
  document.getElementById('nextBtn').style.display = currentStep === totalSteps ? 'none' : 'flex';
  document.getElementById('submitBtn').style.display = currentStep === totalSteps ? 'flex' : 'none';
};

const updateProgress = () => {
  const progress = (currentStep / totalSteps) * 100;
  document.getElementById('progressFill').style.width = `${progress}%`;
};

const calculateCapacityMetrics = () => {
  const totalSlots = parseInt(document.getElementById('vagasTotais')?.value) || 0;
  const occupiedSlots = parseInt(document.getElementById('vagasOcupadas')?.value) || 0;
  const availableSlots = Math.max(0, totalSlots - occupiedSlots);
  
  updateCapacityDisplay(availableSlots);
};



const updateCapacityDisplay = (available) => {
  const animateNumber = (elementId, value) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.classList.add('capacity-number-animate');
    element.textContent = value;
    
    setTimeout(() => {
      element.classList.remove('capacity-number-animate');
    }, 600);
  };
  
  animateNumber('capacityAvailableDisplay', available);
};



const addResident = () => {
  const residentIndex = residents.length;
  const residentHTML = generateResidentHTML(residentIndex);
  
  document.getElementById('residentsContainer').insertAdjacentHTML('beforeend', residentHTML);
  residents.push({});
  
  calculateCapacityMetrics();
};

const generateResidentHTML = (index) => {
  const fields = formConfig.residentFields || [];
  
  let fieldsHTML = '';
  fields.forEach(field => {
    const fieldKey = `resident_${index}_${field.key}`;
    const fieldHTML = generateFieldHTML({
      ...field,
      key: fieldKey
    });
    fieldsHTML += fieldHTML;
  });
  
  return `
    <div class="resident-card" data-resident="${index}">
      <div class="resident-header">
        <div class="flex items-center gap-3">
          <div class="resident-number">${index + 1}</div>
          <h4 class="text-lg font-semibold text-gray-800 dark:text-white">Morador ${index + 1}</h4>
        </div>
        <button type="button" onclick="removeResident(${index})" class="text-red-600 hover:text-red-800 dark:text-red-400 transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${fieldsHTML}
      </div>
    </div>
  `;
};

window.removeResident = (index) => {
  const residentCard = document.querySelector(`[data-resident="${index}"]`);
  if (residentCard) {
    residentCard.remove();
    residents.splice(index, 1);
    updateResidentNumbers();
    calculateCapacityMetrics();
  }
};

const updateResidentNumbers = () => {
  const residentCards = document.querySelectorAll('.resident-card');
  residentCards.forEach((card, index) => {
    card.setAttribute('data-resident', index);
    const numberElement = card.querySelector('.resident-number');
    const titleElement = card.querySelector('h4');
    
    if (numberElement) numberElement.textContent = index + 1;
    if (titleElement) titleElement.textContent = `Morador ${index + 1}`;
    
    const removeButton = card.querySelector('button[onclick]');
    if (removeButton) {
      removeButton.setAttribute('onclick', `removeResident(${index})`);
    }
    
    const inputs = card.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      const oldName = input.name;
      if (oldName.startsWith('resident_')) {
        const fieldKey = oldName.split('_').slice(2).join('_');
        input.name = `resident_${index}_${fieldKey}`;
        input.id = `resident_${index}_${fieldKey}`;
        
        const label = card.querySelector(`label[for="${oldName}"]`);
        if (label) {
          label.setAttribute('for', input.id);
        }
      }
    });
  });
};
const initializeCapacityDisplay = () => {
  calculateCapacityMetrics();
};
const showPreview = () => {
  const formData = collectFormData();
  const previewHTML = generatePreviewHTML(formData);
  
  document.getElementById('previewContent').innerHTML = previewHTML;
  document.getElementById('previewModal').style.display = 'block';
};

const collectFormData = () => {
  const formData = {};
  const form = document.getElementById('srtForm');
  const formDataObj = new FormData(form);
  
  for (let [key, value] of formDataObj.entries()) {
    if (key.startsWith('resident_')) {
      const parts = key.split('_');
      const residentIndex = parseInt(parts[1]);
      const fieldKey = parts.slice(2).join('_');
      
      if (!formData.residents) formData.residents = [];
      if (!formData.residents[residentIndex]) formData.residents[residentIndex] = {};
      
      formData.residents[residentIndex][fieldKey] = value;
    } else {
      const checkboxes = form.querySelectorAll(`input[name="${key}"][type="checkbox"]:checked`);
      if (checkboxes.length > 0) {
        formData[key] = Array.from(checkboxes).map(cb => cb.value);
      } else {
        formData[key] = value;
      }
    }
  }
  
  formData.residents = (formData.residents || []).filter(resident => 
    resident && Object.values(resident).some(value => value && value.trim())
  );
  
  return formData;
};

const generatePreviewHTML = (data) => {
  const formatValue = (value) => {
    if (value === null || value === undefined || value === '') return null;
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : null;
    return value;
  };
  
  const formatDate = (dateValue) => {
    if (!dateValue) return null;
    try {
      const date = new Date(dateValue);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateValue;
    }
  };
  
  let html = '<div class="space-y-6">';
  
  const sections = [
    {
      title: 'Informações do Município',
      icon: '🏛️',
      fields: formConfig.municipio || []
    },
    {
      title: 'Dados do SRT',
      icon: '📋',
      fields: formConfig.general || []
    },
    {
      title: 'Dados da Residência',
      icon: '🏠',
      fields: formConfig.residence || []
    },
    {
      title: 'Dados da Equipe/Cuidadores',
      icon: '👥',
      fields: formConfig.caregivers || []
    }
  ];
  
  sections.forEach(section => {
    const sectionFields = section.fields.filter(field => {
      const value = data[field.key];
      return value !== undefined && value !== null && value !== '';
    });
    
    if (sectionFields.length > 0) {
      html += `
        <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
          <div class="flex items-center gap-3 mb-4">
            <span class="text-2xl">${section.icon}</span>
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white">${section.title}</h3>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      `;
      
      sectionFields.forEach(field => {
        const value = data[field.key];
        const formattedValue = field.type === 'date' ? formatDate(value) : formatValue(value);
        
        if (formattedValue !== null) {
          html += `
            <div class="bg-white dark:bg-gray-800 rounded-lg p-4">
              <div class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">${field.label}</div>
              <div class="text-gray-900 dark:text-white">${formattedValue}</div>
            </div>
          `;
        }
      });
      
      html += '</div></div>';
    }
  });
  
  if (data.residents && data.residents.length > 0) {
    html += `
      <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
        <div class="flex items-center gap-3 mb-4">
          <span class="text-2xl">🏥</span>
          <h3 class="text-lg font-semibold text-gray-800 dark:text-white">Moradores (${data.residents.length})</h3>
        </div>
        <div class="space-y-4">
    `;
    
    data.residents.forEach((resident, index) => {
      const residentFields = (formConfig.residentFields || []).filter(field => {
        const value = resident[field.key];
        return value !== undefined && value !== null && value !== '';
      });
      
      if (residentFields.length > 0) {
        html += `
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                ${index + 1}
              </div>
              <div class="font-medium text-gray-900 dark:text-white">
                ${formatValue(resident.nomeCompleto) || `Morador ${index + 1}`}
                ${resident.nomeSocial ? `<span class="text-gray-500 ml-2">(${resident.nomeSocial})</span>` : ''}
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        `;
        
        residentFields.forEach(field => {
          const value = resident[field.key];
          const formattedValue = field.type === 'date' ? formatDate(value) : formatValue(value);
          
          if (formattedValue !== null && field.key !== 'nomeCompleto') {
            html += `
              <div>
                <span class="text-gray-500 dark:text-gray-400">${field.label}:</span>
                <span class="text-gray-900 dark:text-white ml-1">${formattedValue}</span>
              </div>
            `;
          }
        });
        
        html += '</div></div>';
      }
    });
    
    html += '</div></div>';
  }
  
  html += '</div>';
  return html;
};

const clearForm = () => {
  if (confirm('Tem certeza que deseja limpar todos os dados do formulário?')) {
    document.getElementById('srtForm').reset();
    document.getElementById('residentsContainer').innerHTML = '';
    residents = [];
    currentStep = 1;
    updateStepDisplay();
    updateProgress();
    showToast('Formulário limpo com sucesso!');
  }
};

const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!validateCurrentStep()) {
    return;
  }
  
  showLoading();
  
  try {
    const formData = collectFormData();
    formData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    formData.numeroMoradores = formData.residents ? formData.residents.length : 0;

    const totalSlots = parseInt(formData.vagasTotais) || 0;
    const occupiedSlots = parseInt(formData.vagasOcupadas) || 0;
    formData.vagasDisponiveis = Math.max(0, totalSlots - occupiedSlots);
    
    const docRef = await db.collection('srt').add(formData);
    formData.id = docRef.id;
    
    const emailResult = await EmailService.sendEmail(formData);
    
    let successMessage = 'Cadastro realizado com sucesso!';
    if (emailResult.success) {
      successMessage += `<br><small class="text-green-600">E-mail enviado para: ${emailResult.email}, consulte a caixa de spam.</small>`;
    } else {
      successMessage += `<br><small class="text-orange-600">Aviso: ${emailResult.message}</small>`;
    }
    
    document.getElementById('successMessage').innerHTML = successMessage;
    document.getElementById('successModal').style.display = 'block';
    
  } catch (error) {
    console.error('Erro ao salvar:', error);
    showToast('Erro ao salvar dados. Tente novamente.', 'error');
  } finally {
    hideLoading();
  }
};

window.closePreviewModal = () => {
  document.getElementById('previewModal').style.display = 'none';
};

document.addEventListener('DOMContentLoaded', initializeApp);

