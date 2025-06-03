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

const validationMessages = {
  required: 'Este campo é obrigatório',
  email: 'Digite um e-mail válido (exemplo@dominio.com)',
  tel: 'Digite um telefone válido com DDD',
  cep: 'CEP deve ter 8 dígitos (00000-000)',
  cnesCaps: 'CNES deve ter exatamente 7 dígitos',
  dataNascimento: 'Data de nascimento não pode ser futura',
  dataInauguracao: 'Data de inauguração não pode ser futura',
  idade: 'Idade deve estar entre 18 e 120 anos',
  vagasOcupadas: 'Vagas ocupadas não pode ser maior que vagas totais',
  numMoradores: 'Número de moradores deve ser igual às vagas ocupadas',
  totalProfissionais: 'Total de profissionais deve ser a soma de todos os tipos',
  relacaoCuidadorMorador: 'Formato: X:Y (exemplo: 1:4)'
};

const customValidators = {
  cep: (value) => {
    const cepClean = value.replace(/\D/g, '');
    return cepClean.length === 8;
  },
  
  cnes: (value) => {
    const cnesClean = value.replace(/\D/g, '');
    return cnesClean.length === 7;
  },
  
  telefone: (value) => {
    const telClean = value.replace(/\D/g, '');
    return telClean.length === 10 || telClean.length === 11;
  },
  
  dateNotFuture: (value) => {
    const inputDate = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return inputDate <= today;
  }
};

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

const updateProgress = () => {
  const sections = ['municipio', 'general', 'residence', 'caregivers'];
  let totalFields = 0;
  let filledFields = 0;
  
  sections.forEach(section => {
    const sectionElement = document.getElementById(`${section}Fields`);
    if (!sectionElement) return;
    
    let sectionTotal = 0;
    let sectionFilled = 0;
    
    const normalInputs = sectionElement.querySelectorAll('input[required]:not([type="checkbox"]):not([id*="_validation"]), select[required], textarea[required]');
    sectionTotal += normalInputs.length;
    sectionFilled += Array.from(normalInputs).filter(input => input.value.trim()).length;
    
    const multiselectGroups = new Set();
    sectionElement.querySelectorAll('input[type="checkbox"][data-field]').forEach(checkbox => {
      const fieldName = checkbox.getAttribute('data-field');
      if (fieldName) {
        multiselectGroups.add(fieldName);
      }
    });
    
    multiselectGroups.forEach(fieldName => {
      const hiddenValidation = document.getElementById(`${fieldName}_validation`);
      if (hiddenValidation && hiddenValidation.required) {
        sectionTotal += 1;
        
        const checkboxes = sectionElement.querySelectorAll(`input[type="checkbox"][data-field="${fieldName}"]`);
        const hasChecked = Array.from(checkboxes).some(cb => cb.checked);
        if (hasChecked) {
          sectionFilled += 1;
        }
      }
    });
    
    totalFields += sectionTotal;
    filledFields += sectionFilled;
    
    const sectionProgress = sectionTotal > 0 ? (sectionFilled / sectionTotal) * 100 : 0;
    const progressBar = document.querySelector(`[data-section="${section}"]`);
    const progressText = document.querySelector(`[data-section-percent="${section}"]`);
    
    if (progressBar) progressBar.style.width = `${sectionProgress}%`;
    if (progressText) progressText.textContent = `${Math.round(sectionProgress)}%`;
  });
  
  const residentInputs = document.querySelectorAll('#residentsContainer input[required]:not([type="checkbox"]):not([id*="_validation"]), #residentsContainer select[required], #residentsContainer textarea[required]');
  totalFields += residentInputs.length;
  filledFields += Array.from(residentInputs).filter(input => input.value.trim()).length;
  
  const residentMultiselectGroups = new Set();
  document.querySelectorAll('#residentsContainer input[type="checkbox"][data-field]').forEach(checkbox => {
    const fieldName = checkbox.getAttribute('data-field');
    if (fieldName) {
      residentMultiselectGroups.add(fieldName);
    }
  });
  
  residentMultiselectGroups.forEach(fieldName => {
    const hiddenValidation = document.getElementById(`${fieldName}_validation`);
    if (hiddenValidation && hiddenValidation.required) {
      totalFields += 1;
      
      const checkboxes = document.querySelectorAll(`#residentsContainer input[type="checkbox"][data-field="${fieldName}"]`);
      const hasChecked = Array.from(checkboxes).some(cb => cb.checked);
      if (hasChecked) {
        filledFields += 1;
      }
    }
  });
  
  const overallProgress = totalFields > 0 ? (filledFields / totalFields) * 100 : 0;
  const progressBar = document.getElementById('progressFill');
  progressBar.style.width = `${overallProgress}%`;
  
  if (overallProgress === 100) {
    progressBar.classList.add('animate-pulse-glow');
  } else {
    progressBar.classList.remove('animate-pulse-glow');
  }
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

// Substitua a função createEnhancedInputGroup em js/app.js pela versão corrigida:

const createEnhancedInputGroup = (field, prefix = '') => {
  const group = document.createElement('div');
  group.className = 'form-group relative';
  
  const inputId = prefix + field.key;
  
  const labelContainer = document.createElement('div');
  labelContainer.className = 'flex items-center justify-between mb-2';
  
  const label = document.createElement('label');
  label.setAttribute('for', inputId);
  label.className = `block text-sm font-medium text-gray-700 dark:text-gray-300 ${field.required ? 'required-indicator' : ''}`;
  label.textContent = field.label;
  
  if (field.helpText) {
    const tooltipWrapper = document.createElement('span');
    tooltipWrapper.className = 'tooltip-wrapper ml-2';
    tooltipWrapper.innerHTML = `
      <svg class="w-4 h-4 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span class="tooltip-content">${field.helpText}</span>
    `;
    label.appendChild(tooltipWrapper);
  }
  
  labelContainer.appendChild(label);
  
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
    
    input.id = inputId;
    input.name = inputId;
    if (field.required) input.required = true;
  } 
  else if (field.type === 'multiselect' && field.options) {
    input = document.createElement('div');
    input.className = 'checkbox-group max-h-48 overflow-y-auto space-y-2 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-gray-200 dark:border-gray-600';
    input.id = inputId;
    
    field.options.forEach((opt, index) => {
      const checkboxWrapper = document.createElement('label');
      checkboxWrapper.className = 'flex items-center gap-3 cursor-pointer hover:bg-white dark:hover:bg-gray-700 p-2 rounded-lg transition-all';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = inputId;
      checkbox.value = opt;
      checkbox.className = 'w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600';
      checkbox.id = `${inputId}_${index}`;
      checkbox.setAttribute('data-field', inputId);
      
      const labelText = document.createElement('span');
      labelText.className = 'text-sm font-medium text-gray-700 dark:text-gray-300';
      labelText.textContent = opt;
      
      checkboxWrapper.appendChild(checkbox);
      checkboxWrapper.appendChild(labelText);
      input.appendChild(checkboxWrapper);
    });
    
    if (field.required) {
      const hiddenInput = document.createElement('input');
      hiddenInput.type = 'hidden';
      hiddenInput.id = `${inputId}_validation`;
      hiddenInput.name = `${inputId}_validation`;
      hiddenInput.required = true;
      hiddenInput.setCustomValidity('Selecione pelo menos uma opção');
      
      const checkboxes = input.querySelectorAll('input[type="checkbox"]');
      
      const validateSelection = () => {
        const checkedCount = input.querySelectorAll('input[type="checkbox"]:checked').length;
        if (checkedCount > 0) {
          hiddenInput.setCustomValidity('');
          hiddenInput.value = 'valid';
          input.classList.remove('border-red-500');
          input.classList.add('border-green-500');
          
          const errorMsg = group.querySelector('.error-message');
          if (errorMsg) errorMsg.remove();
        } else {
          hiddenInput.setCustomValidity('Selecione pelo menos uma opção');
          hiddenInput.value = '';
          input.classList.remove('border-green-500');
          if (field.required) {
            input.classList.add('border-red-500');
          }
        }
      };
      
      checkboxes.forEach(cb => {
        cb.addEventListener('change', validateSelection);
        cb.addEventListener('change', updateProgress);
      });
      
      group.appendChild(hiddenInput);
      validateSelection();
    } else {
      input.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', updateProgress);
      });
    }
  }
  else if (field.type === 'textarea') {
    input = document.createElement('textarea');
    input.rows = 3;
    input.className = 'w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all resize-none';
    if (field.placeholder) input.placeholder = field.placeholder;
    
    input.id = inputId;
    input.name = inputId;
    if (field.required) input.required = true;
  } 
  else {
    input = document.createElement('input');
    input.type = field.type;
    input.className = 'w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all';
    if (field.placeholder) input.placeholder = field.placeholder;
    if (field.min !== undefined) input.min = field.min;
    if (field.max !== undefined) input.max = field.max;
    if (field.maxLength) input.maxLength = field.maxLength;
    if (field.pattern) input.pattern = field.pattern;
    
    if (field.type === 'date' && field.max === 'today') {
      input.max = new Date().toISOString().split('T')[0];
    }
    
    input.id = inputId;
    input.name = inputId;
    if (field.required) input.required = true;
  }
  
  if (field.type !== 'multiselect' && field.mask) {
    applyInputMask(input, field.mask);
  }
  
  if (field.type !== 'multiselect') {
    input.addEventListener('invalid', (e) => {
      e.preventDefault();
      showFieldError(input, field);
    });
    
    input.addEventListener('input', () => {
      removeFieldError(input);
      updateProgress();
      
      if (input.checkValidity() && input.value) {
        input.classList.add('border-green-500', 'dark:border-green-400', 'animate-pulse-border');
        setTimeout(() => {
          input.classList.remove('border-green-500', 'dark:border-green-400', 'animate-pulse-border');
        }, 1000);
      }
    });
  }
  
  group.appendChild(labelContainer);
  group.appendChild(input);
  
  if (field.helpText) {
    const helpText = document.createElement('p');
    helpText.className = 'help-text';
    helpText.textContent = field.helpText;
    group.appendChild(helpText);
  }
  
  if ((field.type === 'text' || field.type === 'textarea') && field.maxLength) {
    const counter = document.createElement('p');
    counter.className = 'char-counter';
    counter.textContent = `0/${field.maxLength}`;
    
    input.addEventListener('input', () => {
      counter.textContent = `${input.value.length}/${field.maxLength}`;
      if (input.value.length > field.maxLength * 0.9) {
        counter.classList.add('warning');
      } else {
        counter.classList.remove('warning');
      }
    });
    
    group.appendChild(counter);
  }
  
  if (field.conditional) {
    group.classList.add('conditional-field', 'hidden');
    group.dataset.dependsOn = field.conditional.field;
    if (field.conditional.value) {
      group.dataset.showWhen = field.conditional.value;
    } else if (field.conditional.values) {
      group.dataset.showWhen = field.conditional.values.join(',');
    }
  }
  
  return group;
};

const showFieldError = (field, fieldConfig) => {
  const formGroup = field.closest('.form-group');
  if (!formGroup) return;
  
  formGroup.classList.add('has-error');
  field.classList.add('border-red-500', 'animate-shake');
  
  setTimeout(() => field.classList.remove('animate-shake'), 500);
  
  let errorElement = formGroup.querySelector('.error-message');
  if (!errorElement) {
    errorElement = document.createElement('p');
    errorElement.className = 'error-message';
    formGroup.appendChild(errorElement);
  }
  
  let errorMessage = validationMessages.required;
  
  if (field.validity.patternMismatch) {
    errorMessage = fieldConfig.helpText || 'Formato inválido';
  } else if (field.validity.typeMismatch) {
    errorMessage = validationMessages[field.type] || 'Valor inválido';
  } else if (field.validity.rangeUnderflow || field.validity.rangeOverflow) {
    errorMessage = `Valor deve estar entre ${field.min} e ${field.max}`;
  }
  
  errorElement.innerHTML = `
    <svg class="w-4 h-4 inline-block" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
    </svg>
    ${errorMessage}
  `;
};

const removeFieldError = (field) => {
  const formGroup = field.closest('.form-group');
  if (!formGroup) return;
  
  formGroup.classList.remove('has-error');
  field.classList.remove('border-red-500');
  
  const errorElement = formGroup.querySelector('.error-message');
  if (errorElement) {
    errorElement.remove();
  }
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
      max: "today"
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
    }
  ]
});

const renderFormFields = () => {
  if (currentConfig.municipio) {
    const container = document.getElementById('municipioFields');
    currentConfig.municipio.forEach((field, index) => {
      const fieldGroup = createEnhancedInputGroup(field);
      fieldGroup.style.animationDelay = `${index * 50}ms`;
      fieldGroup.classList.add('animate-fade-in');
      container.appendChild(fieldGroup);
    });
  }
  
  if (currentConfig.general) {
    const container = document.getElementById('generalFields');
    currentConfig.general.forEach((field, index) => {
      const fieldGroup = createEnhancedInputGroup(field);
      fieldGroup.style.animationDelay = `${index * 50}ms`;
      fieldGroup.classList.add('animate-fade-in');
      container.appendChild(fieldGroup);
    });
  }
  
  if (currentConfig.residence) {
    const container = document.getElementById('residenceFields');
    currentConfig.residence.forEach((field, index) => {
      const fieldGroup = createEnhancedInputGroup(field);
      fieldGroup.style.animationDelay = `${index * 50}ms`;
      fieldGroup.classList.add('animate-fade-in');
      container.appendChild(fieldGroup);
    });
  }
  
  if (currentConfig.caregivers) {
    const container = document.getElementById('caregiverFields');
    currentConfig.caregivers.forEach((field, index) => {
      const fieldGroup = createEnhancedInputGroup(field);
      fieldGroup.style.animationDelay = `${index * 50}ms`;
      fieldGroup.classList.add('animate-fade-in');
      container.appendChild(fieldGroup);
    });
  }
  
  setupConditionalFields();
};

const setupConditionalFields = () => {
  document.querySelectorAll('[data-depends-on]').forEach(field => {
    const dependsOn = field.dataset.dependsOn;
    const showWhen = field.dataset.showWhen;
    const dependentField = document.getElementById(dependsOn);
    
    if (!dependentField) return;
    
    const checkVisibility = () => {
      const values = showWhen.split(',');
      const shouldShow = values.includes(dependentField.value);
      
      if (shouldShow) {
        field.classList.remove('hidden');
        field.querySelectorAll('input, select, textarea').forEach(input => {
          if (input.dataset.wasRequired === 'true') {
            input.required = true;
          }
        });
      } else {
        field.classList.add('hidden');
        field.querySelectorAll('input, select, textarea').forEach(input => {
          input.dataset.wasRequired = input.required;
          input.required = false;
          input.value = '';
        });
      }
      updateProgress();
    };
    
    dependentField.addEventListener('change', checkVisibility);
    checkVisibility();
  });
};

const updateResidentBlocks = () => {
  const countInput = document.getElementById('numMoradores');
  if (!countInput) return;
  
  const count = parseInt(countInput.value) || 0;
  const container = document.getElementById('residentsContainer');
  if (!container) return;
  
  const currentBlocks = container.children.length;
  
  if (count > currentBlocks) {
    for (let i = currentBlocks + 1; i <= count; i++) {
      const block = createResidentBlock(i);
      container.appendChild(block);
      setupConditionalFieldsForResident(i);
    }
  } else if (count < currentBlocks) {
    const blocksToKeep = [];
    for (let i = 0; i < count; i++) {
      if (container.children[i]) {
        blocksToKeep.push({
          element: container.children[i],
          data: collectResidentData(i + 1)
        });
      }
    }
    
    container.innerHTML = '';
    
    blocksToKeep.forEach((blockInfo, index) => {
      const newBlock = createResidentBlock(index + 1);
      container.appendChild(newBlock);
      restoreResidentData(index + 1, blockInfo.data);
      setupConditionalFieldsForResident(index + 1);
    });
  }
  
  updateProgress();
};

const createResidentBlock = (i) => {
  const block = document.createElement('div');
  block.className = 'bg-white dark:bg-gray-700 rounded-xl p-6 shadow-lg border-2 border-gray-200 dark:border-gray-600 relative overflow-hidden group hover-lift animate-slide-up';
  block.style.animationDelay = `${(i - 1) * 100}ms`;
  block.dataset.residentNumber = i;
  
  const accentBar = document.createElement('div');
  accentBar.className = 'absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-600 transition-all group-hover:w-2';
  block.appendChild(accentBar);
  
  const header = document.createElement('h3');
  header.className = 'text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2';
  header.innerHTML = `
    <span class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">${i}</span>
    Morador ${i}
  `;
  block.appendChild(header);
  
  const progressDiv = document.createElement('div');
  progressDiv.className = 'section-progress mb-4';
  progressDiv.innerHTML = `
    <span class="section-progress-text">Progresso do morador:</span>
    <div class="section-progress-bar">
      <div class="section-progress-fill" data-section="resident-${i}" style="width: 0%"></div>
    </div>
    <span class="section-progress-text" data-section-percent="resident-${i}">0%</span>
  `;
  block.appendChild(progressDiv);
  
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
  
  if (currentConfig && currentConfig.residentFields) {
    currentConfig.residentFields.forEach((field, index) => {
      const fieldGroup = createEnhancedInputGroup(field, `resident_${i}_`);
      fieldGroup.style.animationDelay = `${index * 30}ms`;
      fieldGroup.classList.add('animate-fade-in');
      grid.appendChild(fieldGroup);
    });
  }
  
  block.appendChild(grid);
  
  block.querySelectorAll('input, select, textarea').forEach(element => {
    element.addEventListener('input', updateProgress);
    element.addEventListener('change', updateProgress);
  });
  
  return block;
};

const collectResidentData = (residentNum) => {
  const data = {};
  if (currentConfig && currentConfig.residentFields) {
    currentConfig.residentFields.forEach(field => {
      const input = document.getElementById(`resident_${residentNum}_${field.key}`);
      if (input) {
        data[field.key] = input.value;
      }
    });
  }
  return data;
};

const restoreResidentData = (residentNum, data) => {
  if (!data) return;
  
  Object.keys(data).forEach(key => {
    const input = document.getElementById(`resident_${residentNum}_${key}`);
    if (input && data[key]) {
      input.value = data[key];
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
};

const setupConditionalFieldsForResident = (residentNum) => {
  const prefix = `resident_${residentNum}_`;
  
  currentConfig.residentFields.forEach(field => {
    if (field.conditional) {
      const fieldElement = document.getElementById(prefix + field.key)?.closest('.form-group');
      const dependentField = document.getElementById(prefix + field.conditional.field);
      
      if (!fieldElement || !dependentField) return;
      
      fieldElement.dataset.dependsOn = prefix + field.conditional.field;
      if (field.conditional.value) {
        fieldElement.dataset.showWhen = field.conditional.value;
      } else if (field.conditional.values) {
        fieldElement.dataset.showWhen = field.conditional.values.join(',');
      }
      
      const checkVisibility = () => {
        const shouldShow = field.conditional.values 
          ? field.conditional.values.includes(dependentField.value)
          : dependentField.value === field.conditional.value;
        
        if (shouldShow) {
          fieldElement.classList.remove('hidden');
          const input = fieldElement.querySelector('input, select, textarea');
          const hiddenValidation = fieldElement.querySelector('input[id*="_validation"]');
          
          if (input && input.dataset.wasRequired === 'true') {
            input.required = true;
          }
          if (hiddenValidation && hiddenValidation.dataset.wasRequired === 'true') {
            hiddenValidation.required = true;
          }
        } else {
          fieldElement.classList.add('hidden');
          const input = fieldElement.querySelector('input, select, textarea');
          const hiddenValidation = fieldElement.querySelector('input[id*="_validation"]');
          const checkboxes = fieldElement.querySelectorAll('input[type="checkbox"]');
          
          if (input) {
            input.dataset.wasRequired = input.required;
            input.required = false;
            input.value = '';
          }
          if (hiddenValidation) {
            hiddenValidation.dataset.wasRequired = hiddenValidation.required;
            hiddenValidation.required = false;
          }
          checkboxes.forEach(cb => cb.checked = false);
        }
        updateProgress();
      };
      
      dependentField.addEventListener('change', checkVisibility);
      checkVisibility();
    }
  });
};

const updateVagasDisponiveis = () => {
  const total = parseInt(document.getElementById('vagasTotais').value) || 0;
  const ocupadas = parseInt(document.getElementById('vagasOcupadas').value) || 0;
  const disponiveis = Math.max(0, total - ocupadas);
  document.getElementById('vagasDisponiveis').value = disponiveis;
  
  const disponiveisCard = document.getElementById('vagasDisponiveis').closest('.group');
  if (disponiveis === 0) {
    disponiveisCard.classList.add('animate-pulse');
  } else {
    disponiveisCard.classList.remove('animate-pulse');
  }
  
  if (ocupadas > total) {
    document.getElementById('vagasOcupadas').classList.add('border-red-500');
    document.getElementById('vagasTotais').classList.add('border-red-500');
  } else {
    document.getElementById('vagasOcupadas').classList.remove('border-red-500');
    document.getElementById('vagasTotais').classList.remove('border-red-500');
  }
};

const clearForm = () => {
  if (confirm('Tem certeza que deseja limpar todos os dados do formulário?')) {
    document.getElementById('srtForm').reset();
    document.getElementById('residentsContainer').innerHTML = '';
    updateProgress();
    
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.classList.add('animate-shake');
      setTimeout(() => input.classList.remove('animate-shake'), 500);
    });
    
    showToast('Formulário limpo com sucesso!');
  }
};

const validateForm = () => {
  const numMoradores = parseInt(document.getElementById('numMoradores').value) || 0;
  const vagasOcupadas = parseInt(document.getElementById('vagasOcupadas').value) || 0;
  
  if (numMoradores !== vagasOcupadas) {
    const moradoresInput = document.getElementById('numMoradores');
    const vagasInput = document.getElementById('vagasOcupadas');
    
    [moradoresInput, vagasInput].forEach(input => {
      input.classList.add('border-red-500', 'animate-shake');
      setTimeout(() => {
        input.classList.remove('border-red-500', 'animate-shake');
      }, 1000);
    });
    
    showToast('O número de moradores deve ser igual ao número de vagas ocupadas.', 'error');
    return false;
  }
  
  const totalProfissionais = parseInt(document.getElementById('totalProfissionais')?.value) || 0;
  const totalCuidadores = parseInt(document.getElementById('totalCuidadores')?.value) || 0;
  const totalTecnicos = parseInt(document.getElementById('totalTecnicos')?.value) || 0;
  const totalEnfermeiros = parseInt(document.getElementById('totalEnfermeiros')?.value) || 0;
  const totalOutros = parseInt(document.getElementById('totalOutros')?.value) || 0;
  
  const somaTotal = totalCuidadores + totalTecnicos + totalEnfermeiros + totalOutros;
  
  if (totalProfissionais > 0 && somaTotal > 0 && totalProfissionais !== somaTotal) {
    const totalField = document.getElementById('totalProfissionais');
    if (totalField) {
      totalField.classList.add('border-red-500', 'animate-shake');
      setTimeout(() => totalField.classList.remove('border-red-500', 'animate-shake'), 1000);
    }
    showToast(`Total de profissionais deve ser ${somaTotal} (soma dos tipos)`, 'error');
    return false;
  }
  
  return true;
};

const submitForm = async (event) => {
  event.preventDefault();
  
  if (!validateForm()) return;
  
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
    <span>Enviando...</span>
  `;
  
  showLoading();
  
  try {
    const houseData = {
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: 'active'
    };
    
    const collectSectionData = (sectionSelector) => {
      const section = document.querySelector(sectionSelector);
      if (!section) return;
      
      section.querySelectorAll('input:not([type="checkbox"]), select, textarea').forEach(field => {
        if (field.value && field.id) {
          houseData[field.id] = field.value;
        }
      });
      
      const multiselectGroups = {};
      section.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        const fieldName = checkbox.getAttribute('data-field') || checkbox.name;
        
        if (!multiselectGroups[fieldName]) {
          multiselectGroups[fieldName] = [];
        }
        
        if (checkbox.checked) {
          multiselectGroups[fieldName].push(checkbox.value);
        }
      });
      
      Object.keys(multiselectGroups).forEach(fieldName => {
        if (multiselectGroups[fieldName].length > 0) {
          houseData[fieldName] = multiselectGroups[fieldName];
        }
      });
    };
    
    collectSectionData('#municipioFields');
    collectSectionData('#generalFields');
    collectSectionData('#residenceFields');
    collectSectionData('#caregiverFields');
    
    const totalResidents = document.getElementById('totalResidents');
    const vagasTotais = document.getElementById('vagasTotais');
    const vagasOcupadas = document.getElementById('vagasOcupadas');
    const vagasDisponiveis = document.getElementById('vagasDisponiveis');
    
    if (totalResidents) houseData.totalMoradores = totalResidents.value;
    if (vagasTotais) houseData.vagasTotais = vagasTotais.value;
    if (vagasOcupadas) houseData.vagasOcupadas = vagasOcupadas.value;
    if (vagasDisponiveis) houseData.vagasDisponiveis = vagasDisponiveis.value;
    
    const count = parseInt(document.getElementById('numMoradores').value) || 0;
    houseData.residents = [];
    
    for (let i = 1; i <= count; i++) {
      const resident = {};
      const residentSection = document.querySelector(`[data-resident-number="${i}"]`);
      
      if (residentSection && currentConfig.residentFields) {
        currentConfig.residentFields.forEach(field => {
          const element = document.getElementById(`resident_${i}_${field.key}`);
          
          if (field.type === 'multiselect') {
            const checkboxes = residentSection.querySelectorAll(`input[name="resident_${i}_${field.key}"]`);
            const selectedValues = [];
            
            checkboxes.forEach(checkbox => {
              if (checkbox.checked) {
                selectedValues.push(checkbox.value);
              }
            });
            
            if (selectedValues.length > 0) {
              resident[field.key] = selectedValues;
            }
          } else if (element && element.value) {
            resident[field.key] = element.value;
          }
        });
        
        houseData.residents.push(resident);
      }
    }
    
    await db.collection('houses').add(houseData);
    
    showToast('Dados salvos com sucesso!');
    
    const celebration = document.createElement('div');
    celebration.className = 'fixed inset-0 pointer-events-none z-50';
    celebration.innerHTML = `
      <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <svg class="w-32 h-32 text-green-500 animate-bounce-in" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    `;
    document.body.appendChild(celebration);
    
    setTimeout(() => {
      celebration.remove();
      if (confirm('Deseja cadastrar outra residência?')) {
        clearForm();
      } else {
        window.location.href = 'admin.html';
      }
    }, 2000);
    
  } catch (error) {
    console.error('Erro ao salvar:', error);
    showToast('Erro ao salvar dados. Tente novamente.', 'error');
  } finally {
    hideLoading();
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Enviar Dados
    `;
  }
};

const initializeApp = async () => {
  showLoading();
  initTheme();
  
  try {
    const configRef = db.collection('config').doc('srt');
    const configSnap = await configRef.get();
    
    if (configSnap.exists) {
      currentConfig = configSnap.data();
    } else {
      currentConfig = getDefaultConfig();
      await configRef.set(currentConfig);
    }
    
    renderFormFields();
    
    document.getElementById('numMoradores').addEventListener('change', updateResidentBlocks);
    document.getElementById('vagasOcupadas').addEventListener('input', updateVagasDisponiveis);
    document.getElementById('vagasTotais').addEventListener('input', updateVagasDisponiveis);
    document.getElementById('clearBtn').addEventListener('click', clearForm);
    document.getElementById('srtForm').addEventListener('submit', submitForm);
    
    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById('numMoradores');
        const current = parseInt(input.value) || 0;
        const action = btn.dataset.action;
        
        if (action === 'plus' && current < 20) {
          input.value = current + 1;
          btn.classList.add('animate-bounce');
        } else if (action === 'minus' && current > 0) {
          input.value = current - 1;
          btn.classList.add('animate-bounce');
        }
        
        setTimeout(() => btn.classList.remove('animate-bounce'), 500);
        input.dispatchEvent(new Event('change'));
      });
    });
    
    document.addEventListener('input', (e) => {
      if (e.target.name && e.target.name.includes('dataNascimento')) {
        const idadeField = e.target.closest('.grid')?.querySelector('[name*="idade"]');
        if (idadeField) {
          const birthDate = new Date(e.target.value);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          
          if (age > 0 && age < 120) {
            idadeField.value = age;
            idadeField.dispatchEvent(new Event('input'));
          }
        }
      }
    });
    
    ['totalCuidadores', 'totalTecnicos', 'totalEnfermeiros', 'totalOutros'].forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener('input', () => {
          const total = ['totalCuidadores', 'totalTecnicos', 'totalEnfermeiros', 'totalOutros']
            .reduce((sum, id) => sum + (parseInt(document.getElementById(id)?.value) || 0), 0);
          
          const totalField = document.getElementById('totalProfissionais');
          if (totalField && total > 0) {
            totalField.value = total;
            totalField.dispatchEvent(new Event('input'));
          }
        });
      }
    });
    
    document.querySelectorAll('input, select, textarea').forEach(element => {
      element.addEventListener('input', updateProgress);
      element.addEventListener('change', updateProgress);
    });
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('section').forEach(section => {
      observer.observe(section);
    });
    
  } catch (error) {
    console.error('Erro ao inicializar:', error);
    showToast('Erro ao carregar configurações', 'error');
  } finally {
    hideLoading();
  }
};

window.addEventListener('DOMContentLoaded', initializeApp);