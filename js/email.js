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
        return date.toLocaleDateString('pt-BR');
      } catch {
        return dateStr;
      }
    },

    array: (arr) => {
      if (!arr || !Array.isArray(arr)) return '-';
      return arr.join(', ');
    },

    value: (value) => {
      if (value === null || value === undefined || value === '') return '-';
      if (Array.isArray(value)) return EmailService.formatters.array(value);
      return value;
    }
  },

  generateReport: function(data) {
    const { date: formatDate, array: formatArray, value: formatValue } = this.formatters;

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório SRT - ${data.nomeResidencia || 'Residência Terapêutica'}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .wrapper {
            max-width: 800px;
            margin: 0 auto;
            background: white;
          }
          .header {
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0 0 10px 0;
            font-size: 28px;
            font-weight: 700;
          }
          .header .subtitle {
            margin: 0;
            opacity: 0.9;
            font-size: 16px;
          }
          .header .date {
            margin-top: 20px;
            font-size: 14px;
            opacity: 0.8;
          }
          .content {
            padding: 30px;
          }
          .section {
            margin-bottom: 30px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
          }
          .section-header {
            background: #f9fafb;
            padding: 16px 20px;
            border-bottom: 2px solid #e5e7eb;
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .section-icon {
            width: 36px;
            height: 36px;
            background: #3b82f6;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 18px;
          }
          .section-title {
            margin: 0;
            font-size: 18px;
            color: #1f2937;
            font-weight: 600;
          }
          .data-row {
            display: flex;
            border-bottom: 1px solid #f3f4f6;
          }
          .data-row:last-child {
            border-bottom: none;
          }
          .data-label {
            flex: 0 0 40%;
            padding: 14px 20px;
            font-weight: 600;
            color: #6b7280;
            background: #f9fafb;
            border-right: 1px solid #f3f4f6;
          }
          .data-value {
            flex: 1;
            padding: 14px 20px;
            color: #1f2937;
          }
          .highlight {
            background: #fef3c7;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 600;
          }
          .resident-card {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 8px;
            margin: 20px;
            overflow: hidden;
          }
          .resident-header {
            background: #e0f2fe;
            padding: 16px 20px;
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .resident-number {
            width: 32px;
            height: 32px;
            background: #0284c7;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 16px;
          }
          .resident-name {
            font-size: 16px;
            font-weight: 600;
            color: #0369a1;
          }
          .address-block {
            background: #f3f4f6;
            padding: 16px;
            border-radius: 6px;
            margin: 10px 0;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin: 20px;
          }
          .stat-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 16px;
            text-align: center;
          }
          .stat-value {
            font-size: 28px;
            font-weight: 700;
            color: #3b82f6;
            margin: 0;
          }
          .stat-label {
            font-size: 14px;
            color: #6b7280;
            margin: 4px 0 0 0;
          }
          .footer {
            background: #1f2937;
            color: white;
            padding: 30px;
            text-align: center;
          }
          .footer p {
            margin: 5px 0;
            opacity: 0.9;
          }
          .footer .small {
            font-size: 12px;
            opacity: 0.7;
            margin-top: 20px;
          }
          .empty {
            color: #9ca3af;
            font-style: italic;
          }
          @media (max-width: 600px) {
            .data-row {
              flex-direction: column;
            }
            .data-label {
              flex: none;
              border-right: none;
              border-bottom: 1px solid #f3f4f6;
            }
            .stats-grid {
              grid-template-columns: 1fr;
            }
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header">
            <h1>Cadastro de Residência Terapêutica - SRT</h1>
            <p class="subtitle">Relatório Completo do Formulário</p>
            <p class="date">
              ${new Date().toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })} às ${new Date().toLocaleTimeString('pt-BR')}
            </p>
          </div>
          
          <div class="content">
            <!-- MUNICÍPIO -->
            <div class="section">
              <div class="section-header">
                <div class="section-icon">🏛️</div>
                <h2 class="section-title">Informações do Município</h2>
              </div>
              <div class="data-row">
                <div class="data-label">Região de Saúde</div>
                <div class="data-value">${formatValue(data.regiaoSaude)}</div>
              </div>
              <div class="data-row">
                <div class="data-label">Município</div>
                <div class="data-value">${formatValue(data.municipio)}</div>
              </div>
              <div class="data-row">
                <div class="data-label">Coordenação de Saúde Mental</div>
                <div class="data-value">${formatValue(data.coordenacaoSaudeMental)}</div>
              </div>
              <div class="data-row">
                <div class="data-label">Responsável pelo Preenchimento</div>
                <div class="data-value">${formatValue(data.responsavelPreenchimento)}</div>
              </div>
              <div class="data-row">
                <div class="data-label">Telefone do Responsável</div>
                <div class="data-value">${formatValue(data.telefoneResponsavelPreenchimento)}</div>
              </div>
              <div class="data-row">
                <div class="data-label">E-mail do Responsável</div>
                <div class="data-value">${formatValue(data.emailResponsavelPreenchimento)}</div>
              </div>
              <div class="data-row">
                <div class="data-label">Data do Preenchimento</div>
                <div class="data-value">${formatDate(data.dataPreenchimentoMunicipio)}</div>
              </div>
              <div class="data-row">
                <div class="data-label">CAPS de Referência</div>
                <div class="data-value">${formatValue(data.capsVinculadaSRT)}</div>
              </div>
              <div class="data-row">
                <div class="data-label">CNES do CAPS</div>
                <div class="data-value">${formatValue(data.cnesCapsVinculada)}</div>
              </div>
            </div>

            <!-- DADOS DA SRT -->
            <div class="section">
              <div class="section-header">
                <div class="section-icon">📋</div>
                <h2 class="section-title">Dados da SRT</h2>
              </div>
              <div class="data-row">
                <div class="data-label">Nome da Residência</div>
                <div class="data-value"><span class="highlight">${formatValue(data.nomeResidencia)}</span></div>
              </div>
              <div class="data-row">
                <div class="data-label">Data do Cadastro</div>
                <div class="data-value">${formatDate(data.dataPreenchimento)}</div>
              </div>
              <div class="data-row">
                <div class="data-label">Responsável pela Residência</div>
                <div class="data-value">${formatValue(data.responsavelNome)}</div>
              </div>
              <div class="data-row">
                <div class="data-label">Cargo/Função</div>
                <div class="data-value">${formatValue(data.responsavelCargo)}</div>
              </div>
              <div class="data-row">
                <div class="data-label">Telefone de Contato</div>
                <div class="data-value">${formatValue(data.contatoResponsavel)}</div>
              </div>
              <div class="data-row">
                <div class="data-label">Nome do CAPS</div>
                <div class="data-value">${formatValue(data.nomeCaps)}</div>
              </div>
              <div class="data-row">
                <div class="data-label">CNES do CAPS</div>
                <div class="data-value">${formatValue(data.cnesCaps)}</div>
              </div>
              <div class="data-row">
                <div class="data-label">Tipo de SRT</div>
                <div class="data-value"><span class="highlight">${formatValue(data.tipoSRT)}</span></div>
              </div>
              <div class="data-row">
                <div class="data-label">Esfera de Gestão</div>
                <div class="data-value">${formatValue(data.esferaGestao)}</div>
              </div>
              <div class="data-row">
                <div class="data-label">Situação da Habilitação</div>
                <div class="data-value">${formatValue(data.situacaoHabilitacao)}</div>
              </div>
              ${data.numeroPortaria ? `
              <div class="data-row">
                <div class="data-label">Número da Portaria</div>
                <div class="data-value">${formatValue(data.numeroPortaria)}</div>
              </div>` : ''}
              ${data.dataPortaria ? `
              <div class="data-row">
                <div class="data-label">Data da Portaria</div>
                <div class="data-value">${formatDate(data.dataPortaria)}</div>
              </div>` : ''}
              <div class="data-row">
                <div class="data-label">Data de Inauguração</div>
                <div class="data-value">${formatDate(data.dataInauguracao)}</div>
              </div>
            </div>

            <!-- ENDEREÇO -->
            <div class="section">
              <div class="section-header">
                <div class="section-icon">📍</div>
                <h2 class="section-title">Localização da Residência</h2>
              </div>
              <div style="padding: 20px;">
                <div class="address-block">
                  <strong>Endereço Completo:</strong><br>
                  ${formatValue(data.logradouro)}, ${formatValue(data.numero)} 
                  ${data.complemento ? `- ${data.complemento}` : ''}<br>
                  ${formatValue(data.bairro)} - ${formatValue(data.municipio)}/${formatValue(data.uf)}<br>
                  CEP: ${formatValue(data.cep)}<br>
                  Zona: ${formatValue(data.localizacao)}
                </div>
              </div>
            </div>

            <!-- ESTRUTURA FÍSICA -->
            <div class="section">
              <div class="section-header">
                <div class="section-icon">🏠</div>
                <h2 class="section-title">Estrutura Física</h2>
              </div>
              <div class="data-row">
                <div class="data-label">Quantidade de Quartos</div>
                <div class="data-value">${formatValue(data.quartos)}</div>
              </div>
              <div class="data-row">
                <div class="data-label">Quantidade de Salas</div>
                <div class="data-value">${formatValue(data.salas)}</div>
              </div>
              <div class="data-row">
                <div class="data-label">Quantidade de Cozinhas</div>
                <div class="data-value">${formatValue(data.cozinhas)}</div>
              </div>
              <div class="data-row">
                <div class="data-label">Quantidade de Banheiros</div>
                <div class="data-value">${formatValue(data.banheiros)}</div>
              </div>
              <div class="data-row">
                <div class="data-label">Quantidade de Varandas</div>
                <div class="data-value">${formatValue(data.varanda || '0')}</div>
              </div>
              <div class="data-row">
                <div class="data-label">Quantidade de Lavanderias</div>
                <div class="data-value">${formatValue(data.lavanderia || '0')}</div>
              </div>
              <div class="data-row">
                <div class="data-label">Quantidade de Despensas</div>
                <div class="data-value">${formatValue(data.despensa || '0')}</div>
              </div>
              ${data.outros ? `
              <div class="data-row">
                <div class="data-label">Outros Cômodos</div>
                <div class="data-value">${formatValue(data.outros)}</div>
              </div>` : ''}
            </div>

            <!-- CAPACIDADE -->
            <div class="section">
              <div class="section-header">
                <div class="section-icon">📊</div>
                <h2 class="section-title">Capacidade e Ocupação</h2>
              </div>
              <div class="stats-grid">
                <div class="stat-card">
                  <p class="stat-value">${formatValue(data.totalMoradores)}</p>
                  <p class="stat-label">Moradores na Implantação</p>
                </div>
                <div class="stat-card">
                  <p class="stat-value">${formatValue(data.vagasTotais)}</p>
                  <p class="stat-label">Vagas no CNES</p>
                </div>
                <div class="stat-card">
                  <p class="stat-value">${formatValue(data.vagasOcupadas)}</p>
                  <p class="stat-label">Vagas Ocupadas</p>
                </div>
                <div class="stat-card">
                  <p class="stat-value">${formatValue(data.vagasDisponiveis)}</p>
                  <p class="stat-label">Vagas Disponíveis</p>
                </div>
              </div>
            </div>

            <!-- EQUIPE -->
            <div class="section">
              <div class="section-header">
                <div class="section-icon">👥</div>
                <h2 class="section-title">Dados da Equipe/Cuidadores</h2>
              </div>
              <div class="data-row">
                <div class="data-label">Total de Profissionais</div>
                <div class="data-value"><span class="highlight">${formatValue(data.totalProfissionais)}</span></div>
              </div>
              <div class="data-row">
                <div class="data-label">Número de Cuidadores</div>
                <div class="data-value">${formatValue(data.totalCuidadores)}</div>
              </div>
              <div class="data-row">
                <div class="data-label">Técnicos de Enfermagem</div>
                <div class="data-value">${formatValue(data.totalTecnicos)}</div>
              </div>
              <div class="data-row">
                <div class="data-label">Enfermeiros</div>
                <div class="data-value">${formatValue(data.totalEnfermeiros)}</div>
              </div>
              <div class="data-row">
                <div class="data-label">Outros Profissionais</div>
                <div class="data-value">${formatValue(data.totalOutros || '0')}</div>
              </div>
              <div class="data-row">
                <div class="data-label">Escala de Trabalho</div>
                <div class="data-value">${formatValue(data.escalaTrabalho)}</div>
              </div>
              <div class="data-row">
                <div class="data-label">Proporção Cuidador/Morador</div>
                <div class="data-value">${formatValue(data.relacaoCuidadorMorador)}</div>
              </div>
              <div class="data-row">
                <div class="data-label">Cuidadores por Turno</div>
                <div class="data-value">${formatValue(data.cuidadoresPorTurno)}</div>
              </div>
              <div class="data-row">
                <div class="data-label">Participa de Educação Permanente?</div>
                <div class="data-value">${formatValue(data.participaEducacao)}</div>
              </div>
              ${data.quemPromoveEducacao ? `
              <div class="data-row">
                <div class="data-label">Detalhes da Educação Permanente</div>
                <div class="data-value">${formatValue(data.quemPromoveEducacao)}</div>
              </div>` : ''}
              <div class="data-row">
                <div class="data-label">Realiza Reuniões Regulares?</div>
                <div class="data-value">${formatValue(data.reunioesRegulares)}</div>
              </div>
              <div class="data-row">
                <div class="data-label">Vínculos Empregatícios</div>
                <div class="data-value">${formatArray(data.vinculoEmpregaticio)}</div>
              </div>
            </div>

            <!-- MORADORES -->
            ${data.residents && data.residents.length > 0 ? `
            <div class="section">
              <div class="section-header">
                <div class="section-icon">🏥</div>
                <h2 class="section-title">Dados Individuais dos Moradores (${data.residents.length})</h2>
              </div>
              ${data.residents.map((resident, index) => `
                <div class="resident-card">
                  <div class="resident-header">
                    <div class="resident-number">${index + 1}</div>
                    <div class="resident-name">
                      ${formatValue(resident.nomeCompleto)}
                      ${resident.nomeSocial ? `<span style="font-weight: normal; color: #6b7280;"> (${resident.nomeSocial})</span>` : ''}
                    </div>
                  </div>
                  <div class="data-row">
                    <div class="data-label">Data de Nascimento</div>
                    <div class="data-value">${formatDate(resident.dataNascimento)}</div>
                  </div>
                  <div class="data-row">
                    <div class="data-label">Idade</div>
                    <div class="data-value">${formatValue(resident.idade)} anos</div>
                  </div>
                  <div class="data-row">
                    <div class="data-label">Instituição de Origem</div>
                    <div class="data-value">${formatValue(resident.instituicaoOrigem)}</div>
                  </div>
                  ${resident.cnesOrigem ? `
                  <div class="data-row">
                    <div class="data-label">CNES da Instituição</div>
                    <div class="data-value">${formatValue(resident.cnesOrigem)}</div>
                  </div>` : ''}
                  <div class="data-row">
                    <div class="data-label">Tempo de Internação</div>
                    <div class="data-value">${formatValue(resident.tempoInternacao)} anos</div>
                  </div>
                  <div class="data-row">
                    <div class="data-label">Raça/Cor</div>
                    <div class="data-value">${formatValue(resident.racaCor)}</div>
                  </div>
                  <div class="data-row">
                    <div class="data-label">Sexo Biológico</div>
                    <div class="data-value">${formatValue(resident.generoNascimento)}</div>
                  </div>
                  <div class="data-row">
                    <div class="data-label">Identidade de Gênero</div>
                    <div class="data-value">${formatValue(resident.identidadeGenero)}</div>
                  </div>
                  <div class="data-row">
                    <div class="data-label">Município de Origem</div>
                    <div class="data-value">${formatValue(resident.origemTerritorial)}</div>
                  </div>
                  ${resident.vinculoMunicipio ? `
                  <div class="data-row">
                    <div class="data-label">Vínculo com Município</div>
                    <div class="data-value">${formatValue(resident.vinculoMunicipio)}</div>
                  </div>` : ''}
                  <div class="data-row">
                    <div class="data-label">Beneficiário do PVC?</div>
                    <div class="data-value">${formatValue(resident.participaPVC)}</div>
                  </div>
                  <div class="data-row">
                    <div class="data-label">Vínculo Familiar</div>
                    <div class="data-value">${formatValue(resident.vinculoFamiliar)}</div>
                  </div>
                  ${resident.descricaoVinculo ? `
                  <div class="data-row">
                    <div class="data-label">Descrição do Vínculo</div>
                    <div class="data-value">${formatValue(resident.descricaoVinculo)}</div>
                  </div>` : ''}
                  <div class="data-row">
                    <div class="data-label">Frequência ao CAPS</div>
                    <div class="data-value">${formatValue(resident.frequenciaCaps)}</div>
                  </div>
                  <div class="data-row">
                    <div class="data-label">Acompanhamento UBS</div>
                    <div class="data-value">${formatValue(resident.frequenciaUBS)}</div>
                  </div>
                  <div class="data-row">
                    <div class="data-label">Frequenta Escola?</div>
                    <div class="data-value">${formatValue(resident.escola)}</div>
                  </div>
                  ${resident.qualEscola ? `
                  <div class="data-row">
                    <div class="data-label">Qual Instituição?</div>
                    <div class="data-value">${formatValue(resident.qualEscola)}</div>
                  </div>` : ''}
                  <div class="data-row">
                    <div class="data-label">CRAS/CREAS</div>
                    <div class="data-value">${formatValue(resident.crasCreas)}</div>
                  </div>
                  <div class="data-row">
                    <div class="data-label">Benefícios</div>
                    <div class="data-value">${formatArray(resident.beneficios)}</div>
                  </div>
                  ${resident.comorbidades && resident.comorbidades.length > 0 ? `
                  <div class="data-row">
                    <div class="data-label">Comorbidades</div>
                    <div class="data-value">${formatArray(resident.comorbidades)}</div>
                  </div>` : ''}
                </div>
              `).join('')}
            </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <p><strong>Sistema SRT - Serviço de Residências Terapêuticas</strong></p>
            <p>Estado do Rio de Janeiro</p>
            <p>Este é um registro oficial do formulário preenchido</p>
            <p class="small">
              Documento gerado automaticamente em ${new Date().toLocaleString('pt-BR')}<br>
              Mantenha este e-mail arquivado para seus registros
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  },

  sendEmail: async function(data) {
    try {
      const recipientEmail = data.emailResponsavelPreenchimento || data.email || 'default@email.com';
      const emailContent = this.generateReport(data);
      
      const templateParams = {
        to_email: recipientEmail,
        from_name: this.config.fromName,
        subject: `Cadastro SRT - ${data.nomeResidencia || 'Residência Terapêutica'} - ${new Date().toLocaleDateString('pt-BR')}`,
        message_html: emailContent
      };

      const response = await emailjs.send(
        this.config.serviceId,
        this.config.templateId,
        templateParams
      );

      console.log('Email enviado com sucesso:', response);
      return { success: true, message: 'E-mail enviado com sucesso!' };
      
    } catch (error) {
      console.error('Erro ao enviar e-mail:', error);
      return { success: false, message: 'Erro ao enviar e-mail', error: error };
    }
  },

  previewEmail: function(data) {
    const emailHTML = this.generateReport(data);
    const previewWindow = window.open('', '_blank');
    previewWindow.document.write(emailHTML);
    previewWindow.document.close();
  }
};

EmailService.init();