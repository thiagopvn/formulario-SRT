const EmailService = {
  init: function() {
    emailjs.init("d0sJQnEpzJuuj6k-Z");
  },

  config: {
    serviceId: "service_wkc23hq",
    templateId: "template_sfl4w8e",
    fromName: "Sistema SRT - Residências Terapêuticas"
  },

  formatters: {
    date: (dateStr) => {
      if (!dateStr) return '-';
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      } catch {
        return dateStr;
      }
    },

    datetime: (timestamp) => {
      if (!timestamp) return '-';
      try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch {
        return '-';
      }
    },

    array: (arr) => {
      if (!arr || !Array.isArray(arr)) return '-';
      if (arr.length === 0) return 'Nenhum selecionado';
      return arr.join(', ');
    },

    value: (value) => {
      if (value === null || value === undefined || value === '') return '-';
      if (Array.isArray(value)) return EmailService.formatters.array(value);
      return value;
    },

    number: (value) => {
      if (!value && value !== 0) return '-';
      return value.toString();
    },

    boolean: (value) => {
      if (value === true || value === 'true') return 'Sim';
      if (value === false || value === 'false') return 'Não';
      return value || '-';
    }
  },

  fieldTypeFormatters: {
    text: (value) => EmailService.formatters.value(value),
    number: (value) => EmailService.formatters.number(value),
    date: (value) => EmailService.formatters.date(value),
    select: (value) => EmailService.formatters.value(value),
    multiselect: (value) => EmailService.formatters.array(value),
    textarea: (value) => EmailService.formatters.value(value),
    tel: (value) => EmailService.formatters.value(value),
    email: (value) => EmailService.formatters.value(value)
  },

  sectionIcons: {
    municipio: '🏛️',
    general: '📋',
    residence: '🏠',
    caregivers: '👥',
    residentFields: '🏥'
  },

  sectionTitles: {
    municipio: 'Informações do Município',
    general: 'Dados da SRT',
    residence: 'Dados da Residência Terapêutica',
    caregivers: 'Dados da Equipe/Cuidadores',
    residentFields: 'Dados Individuais dos Moradores'
  },

  async loadConfiguration() {
    try {
      const configRef = firebase.firestore().collection('config').doc('srt');
      const configSnap = await configRef.get();
      
      if (configSnap.exists) {
        return configSnap.data();
      }
      return null;
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      return null;
    }
  },

  generateFieldHTML(field, value) {
    const formatter = this.fieldTypeFormatters[field.type] || this.fieldTypeFormatters.text;
    const formattedValue = formatter(value);
    
    const isHighlight = field.key === 'nomeResidencia' || field.key === 'tipoSRT';
    const valueClass = isHighlight ? '<span class="highlight">' + formattedValue + '</span>' : formattedValue;
    
    return `
      <div class="data-row">
        <div class="data-label">${field.label}</div>
        <div class="data-value">${valueClass}</div>
      </div>
    `;
  },

  generateSectionHTML(sectionKey, fields, data) {
    if (!fields || fields.length === 0) return '';
    
    let fieldsHTML = '';
    
    fields.forEach(field => {
      const value = data[field.key];
      
      if (field.conditional) {
        const dependentValue = data[field.conditional.field];
        const shouldShow = field.conditional.values 
          ? field.conditional.values.includes(dependentValue)
          : dependentValue === field.conditional.value;
        
        if (!shouldShow) return;
      }
      
      if (value !== undefined && value !== null && value !== '') {
        fieldsHTML += this.generateFieldHTML(field, value);
      }
    });
    
    if (!fieldsHTML) return '';
    
    return `
      <div class="section">
        <div class="section-header">
          <div class="section-icon">${this.sectionIcons[sectionKey] || '📄'}</div>
          <h2 class="section-title">${this.sectionTitles[sectionKey] || sectionKey}</h2>
        </div>
        ${fieldsHTML}
      </div>
    `;
  },

  generateCapacitySection(data) {
    return `
      <div class="section">
        <div class="section-header">
          <div class="section-icon">📊</div>
          <h2 class="section-title">Capacidade e Ocupação</h2>
        </div>
        <div class="stats-grid">
          <div class="stat-card">
            <p class="stat-value">${this.formatters.value(data.totalMoradores || data.totalResidents)}</p>
            <p class="stat-label">Moradores na Implantação</p>
          </div>
          <div class="stat-card">
            <p class="stat-value">${this.formatters.value(data.vagasTotais)}</p>
            <p class="stat-label">Vagas no CNES</p>
          </div>
          <div class="stat-card">
            <p class="stat-value">${this.formatters.value(data.vagasOcupadas)}</p>
            <p class="stat-label">Vagas Ocupadas</p>
          </div>
          <div class="stat-card">
            <p class="stat-value">${this.formatters.value(data.vagasDisponiveis)}</p>
            <p class="stat-label">Vagas Disponíveis</p>
          </div>
        </div>
      </div>
    `;
  },

  generateResidentHTML(resident, index, fields) {
    let fieldsHTML = '';
    
    fields.forEach(field => {
      const value = resident[field.key];
      
      if (field.conditional) {
        const dependentValue = resident[field.conditional.field];
        const shouldShow = field.conditional.values 
          ? field.conditional.values.includes(dependentValue)
          : dependentValue === field.conditional.value;
        
        if (!shouldShow) return;
      }
      
      if (value !== undefined && value !== null && value !== '') {
        fieldsHTML += this.generateFieldHTML(field, value);
      }
    });
    
    const residentName = this.formatters.value(resident.nomeCompleto);
    const socialName = resident.nomeSocial ? ` (${resident.nomeSocial})` : '';
    
    return `
      <div class="resident-card">
        <div class="resident-header">
          <div class="resident-number">${index + 1}</div>
          <div class="resident-name">
            ${residentName}${socialName ? `<span style="font-weight: normal; color: #6b7280;">${socialName}</span>` : ''}
          </div>
        </div>
        ${fieldsHTML}
      </div>
    `;
  },

  async generateReport(data) {
    const config = await this.loadConfiguration();
    
    if (!config) {
      console.error('Não foi possível carregar a configuração');
      return this.generateFallbackReport(data);
    }

    const { date: formatDate, datetime: formatDateTime, value: formatValue } = this.formatters;
    
    const municipioSection = config.municipio ? this.generateSectionHTML('municipio', config.municipio, data) : '';
    const generalSection = config.general ? this.generateSectionHTML('general', config.general, data) : '';
    const residenceSection = config.residence ? this.generateSectionHTML('residence', config.residence, data) : '';
    const caregiversSection = config.caregivers ? this.generateSectionHTML('caregivers', config.caregivers, data) : '';
    
    let residentsSection = '';
    if (data.residents && data.residents.length > 0 && config.residentFields) {
      const residentsHTML = data.residents.map((resident, index) => 
        this.generateResidentHTML(resident, index, config.residentFields)
      ).join('');
      
      residentsSection = `
        <div class="section">
          <div class="section-header">
            <div class="section-icon">🏥</div>
            <h2 class="section-title">Dados Individuais dos Moradores (${data.residents.length})</h2>
          </div>
          ${residentsHTML}
        </div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório SRT - ${data.nomeResidencia || 'Residência Terapêutica'}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            line-height: 1.6;
            color: #1a202c;
            background-color: #f7fafc;
          }
          
          .wrapper {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 0 50px rgba(0, 0, 0, 0.1);
          }
          
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 60px 40px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          
          .header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: pulse 4s ease-in-out infinite;
          }
          
          @keyframes pulse {
            0%, 100% { transform: scale(0.8); opacity: 0.5; }
            50% { transform: scale(1.2); opacity: 1; }
          }
          
          .header h1 {
            margin: 0 0 16px 0;
            font-size: 32px;
            font-weight: 800;
            letter-spacing: -0.5px;
            position: relative;
            z-index: 1;
          }
          
          .header .subtitle {
            margin: 0 0 8px 0;
            opacity: 0.95;
            font-size: 18px;
            font-weight: 500;
            position: relative;
            z-index: 1;
          }
          
          .header .date {
            margin-top: 24px;
            font-size: 14px;
            opacity: 0.85;
            position: relative;
            z-index: 1;
          }
          
          .header .badge {
            display: inline-block;
            background: rgba(255, 255, 255, 0.2);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin-top: 16px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.3);
          }
          
          .content {
            padding: 40px;
          }
          
          .section {
            margin-bottom: 32px;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            overflow: hidden;
            transition: all 0.3s ease;
          }
          
          .section:hover {
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          }
          
          .section-header {
            background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
            padding: 20px 24px;
            border-bottom: 2px solid #e2e8f0;
            display: flex;
            align-items: center;
            gap: 16px;
          }
          
          .section-icon {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          }
          
          .section-title {
            margin: 0;
            font-size: 20px;
            color: #2d3748;
            font-weight: 700;
            letter-spacing: -0.3px;
          }
          
          .data-row {
            display: flex;
            border-bottom: 1px solid #f1f5f9;
            transition: all 0.2s ease;
          }
          
          .data-row:hover {
            background-color: #f8fafc;
          }
          
          .data-row:last-child {
            border-bottom: none;
          }
          
          .data-label {
            flex: 0 0 40%;
            padding: 16px 24px;
            font-weight: 600;
            color: #64748b;
            background: #f8fafc;
            border-right: 1px solid #f1f5f9;
            font-size: 14px;
          }
          
          .data-value {
            flex: 1;
            padding: 16px 24px;
            color: #1e293b;
            font-size: 14px;
            line-height: 1.6;
          }
          
          .highlight {
            background: linear-gradient(120deg, #fbbf24 0%, #f59e0b 100%);
            padding: 4px 10px;
            border-radius: 6px;
            font-weight: 700;
            color: #fff;
            display: inline-block;
            box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
          }
          
          .resident-card {
            background: linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%);
            border: 2px solid #bae6fd;
            border-radius: 12px;
            margin: 24px;
            overflow: hidden;
            transition: all 0.3s ease;
          }
          
          .resident-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(59, 130, 246, 0.2);
          }
          
          .resident-header {
            background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
            padding: 20px 24px;
            display: flex;
            align-items: center;
            gap: 16px;
            border-bottom: 2px solid #93c5fd;
          }
          
          .resident-number {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 18px;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
          }
          
          .resident-name {
            font-size: 18px;
            font-weight: 700;
            color: #1e40af;
            letter-spacing: -0.3px;
          }
          
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 24px;
          }
          
          .stat-card {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border: 2px solid #bae6fd;
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            transition: all 0.3s ease;
          }
          
          .stat-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(59, 130, 246, 0.2);
          }
          
          .stat-value {
            font-size: 36px;
            font-weight: 800;
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin: 0 0 8px 0;
          }
          
          .stat-label {
            font-size: 14px;
            color: #64748b;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .footer {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            color: white;
            padding: 40px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          
          .footer::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%);
            animation: rotate 20s linear infinite;
          }
          
          @keyframes rotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .footer h3 {
            margin: 0 0 16px 0;
            font-size: 24px;
            font-weight: 800;
            position: relative;
            z-index: 1;
          }
          
          .footer p {
            margin: 8px 0;
            opacity: 0.9;
            font-size: 16px;
            position: relative;
            z-index: 1;
          }
          
          .footer .divider {
            width: 80px;
            height: 4px;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            margin: 24px auto;
            border-radius: 2px;
          }
          
          .footer .small {
            font-size: 13px;
            opacity: 0.7;
            margin-top: 24px;
            line-height: 1.6;
            position: relative;
            z-index: 1;
          }
          
          .footer .logo {
            display: inline-block;
            width: 60px;
            height: 60px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            margin-bottom: 16px;
            backdrop-filter: blur(10px);
            border: 2px solid rgba(255, 255, 255, 0.2);
            position: relative;
            z-index: 1;
          }
          
          .empty {
            color: #94a3b8;
            font-style: italic;
          }
          
          .info-box {
            background: #f0f9ff;
            border-left: 4px solid #3b82f6;
            padding: 16px 20px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
          }
          
          .info-box strong {
            color: #1e40af;
            display: block;
            margin-bottom: 4px;
          }
          
          @media print {
            body { background: white; }
            .wrapper { box-shadow: none; }
            .section:hover { box-shadow: none; }
          }
          
          @media (max-width: 600px) {
            .data-row { flex-direction: column; }
            .data-label {
              flex: none;
              border-right: none;
              border-bottom: 1px solid #f1f5f9;
            }
            .stats-grid { grid-template-columns: 1fr; }
            .header h1 { font-size: 24px; }
            .content { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header">
            <div class="logo"></div>
            <h1>Serviço de Residências Terapêuticas - SRT</h1>
            <p class="subtitle">Relatório Completo de Cadastro</p>
            <p class="date">
              ${new Date().toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })} às ${new Date().toLocaleTimeString('pt-BR')}
            </p>
            <div class="badge">DOCUMENTO OFICIAL</div>
          </div>
          
          <div class="content">
            ${municipioSection}
            ${generalSection}
            ${residenceSection}
            ${this.generateCapacitySection(data)}
            ${caregiversSection}
            ${residentsSection}
            
            ${data.createdAt ? `
            <div class="info-box">
              <strong>Data de Registro no Sistema:</strong>
              ${formatDateTime(data.createdAt)}
            </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <h3>Sistema SRT - Residências Terapêuticas</h3>
            <p>Secretaria de Estado de Saúde do Rio de Janeiro</p>
            <div class="divider"></div>
            <p>Este documento é um registro oficial do formulário de cadastro</p>
            <p>Todos os dados foram validados e armazenados com segurança</p>
            <p class="small">
              Documento gerado automaticamente pelo Sistema SRT<br>
              ID do Registro: ${data.id || 'Pendente'}<br>
              Hash de Verificação: ${this.generateHash(data)}<br>
              Mantenha este e-mail arquivado para seus registros oficiais
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  },

  generateHash(data) {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  },

  generateFallbackReport(data) {
    console.log('Usando relatório de fallback');
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Relatório SRT</title>
      </head>
      <body>
        <h1>Relatório de Cadastro SRT</h1>
        <p>Data: ${new Date().toLocaleString('pt-BR')}</p>
        <h2>Dados Cadastrados:</h2>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      </body>
      </html>
    `;
  },

  async sendEmail(data) {
  try {
    let recipientEmail = null;
    
    const emailFields = [
      'emailResponsavelPreenchimento',
      'email',
      'emailResponsavel',
      'email_responsavel',
      'responsavelEmail'
    ];
    
    for (const field of emailFields) {
      if (data[field] && data[field].includes('@')) {
        recipientEmail = data[field];
        console.log(`Email encontrado no campo: ${field} = ${recipientEmail}`);
        break;
      }
    }
    
    if (!recipientEmail) {
      for (const [key, value] of Object.entries(data)) {
        if (key.toLowerCase().includes('email') && value && typeof value === 'string' && value.includes('@')) {
          recipientEmail = value;
          console.log(`Email encontrado por busca: ${key} = ${recipientEmail}`);
          break;
        }
      }
    }
    
    console.log('Debug - Dados disponíveis:', {
      camposComEmail: Object.keys(data).filter(k => k.toLowerCase().includes('email')),
      todosOsCampos: Object.keys(data),
      emailEncontrado: recipientEmail
    });
    
    if (!recipientEmail) {
      const municipio = data.municipio || 'municipio';
      recipientEmail = `srt.${municipio.toLowerCase().replace(/\s+/g, '')}@saude.rj.gov.br`;
      console.warn(`Email não encontrado, usando padrão: ${recipientEmail}`);
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      console.error('Email inválido:', recipientEmail);
      throw new Error(`Email inválido: ${recipientEmail}`);
    }
    
    console.log(`Enviando email para: ${recipientEmail}`);
    
    const emailContent = await this.generateReport(data);
    
    const templateParams = {
      to_email: recipientEmail,
      from_name: this.config.fromName,
      subject: `Cadastro SRT - ${data.nomeResidencia || 'Residência Terapêutica'} - ${new Date().toLocaleDateString('pt-BR')}`,
      message_html: emailContent
    };

    console.log('Enviando email com parâmetros:', {
      destinatario: templateParams.to_email,
      assunto: templateParams.subject,
      de: templateParams.from_name
    });

    const response = await emailjs.send(
      this.config.serviceId,
      this.config.templateId,
      templateParams
    );

    console.log('Email enviado com sucesso:', response);
    return { 
      success: true, 
      message: `E-mail enviado com sucesso para ${recipientEmail}!`,
      email: recipientEmail
    };
    
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    
    console.error('Detalhes do erro:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      dadosDisponíveis: Object.keys(data)
    });
    
    return { 
      success: false, 
      message: `Erro ao enviar e-mail: ${error.message}`, 
      error: error 
    };
  }
},

  async testEmail(data) {
    const emailHTML = await this.generateReport(data);
    const blob = new Blob([emailHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
};

EmailService.init();