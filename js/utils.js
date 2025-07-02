const ExportUtils = {
  STYLES: {
    MAIN_HEADER: {
      font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1E40AF" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "medium", color: { rgb: "000000" } },
        bottom: { style: "medium", color: { rgb: "000000" } },
        left: { style: "medium", color: { rgb: "000000" } },
        right: { style: "medium", color: { rgb: "000000" } }
      }
    },
    SECTION_HEADER: {
      font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "7C3AED" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    },
    COLUMN_HEADER: {
      font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "374151" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    },
    DATA_CELL: {
      font: { sz: 10, color: { rgb: "000000" } },
      fill: { fgColor: { rgb: "FFFFFF" } },
      alignment: { vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "D1D5DB" } },
        bottom: { style: "thin", color: { rgb: "D1D5DB" } },
        left: { style: "thin", color: { rgb: "D1D5DB" } },
        right: { style: "thin", color: { rgb: "D1D5DB" } }
      }
    },
    ALTERNATE_ROW: {
      font: { sz: 10, color: { rgb: "000000" } },
      fill: { fgColor: { rgb: "F9FAFB" } },
      alignment: { vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "D1D5DB" } },
        bottom: { style: "thin", color: { rgb: "D1D5DB" } },
        left: { style: "thin", color: { rgb: "D1D5DB" } },
        right: { style: "thin", color: { rgb: "D1D5DB" } }
      }
    },
    HIGHLIGHT_CELL: {
      font: { sz: 10, color: { rgb: "000000" }, bold: true },
      fill: { fgColor: { rgb: "FEF3C7" } },
      alignment: { vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "D1D5DB" } },
        bottom: { style: "thin", color: { rgb: "D1D5DB" } },
        left: { style: "thin", color: { rgb: "D1D5DB" } },
        right: { style: "thin", color: { rgb: "D1D5DB" } }
      }
    },
    NUMBER_CELL: {
      font: { sz: 10, color: { rgb: "000000" } },
      alignment: { horizontal: "center", vertical: "center" },
      numFmt: "#,##0",
      border: {
        top: { style: "thin", color: { rgb: "D1D5DB" } },
        bottom: { style: "thin", color: { rgb: "D1D5DB" } },
        left: { style: "thin", color: { rgb: "D1D5DB" } },
        right: { style: "thin", color: { rgb: "D1D5DB" } }
      }
    },
    PERCENTAGE_CELL: {
      font: { sz: 10, color: { rgb: "000000" } },
      alignment: { horizontal: "center", vertical: "center" },
      numFmt: "0.0%",
      border: {
        top: { style: "thin", color: { rgb: "D1D5DB" } },
        bottom: { style: "thin", color: { rgb: "D1D5DB" } },
        left: { style: "thin", color: { rgb: "D1D5DB" } },
        right: { style: "thin", color: { rgb: "D1D5DB" } }
      }
    },
    DATE_CELL: {
      font: { sz: 10, color: { rgb: "000000" } },
      alignment: { horizontal: "center", vertical: "center" },
      numFmt: "dd/mm/yyyy",
      border: {
        top: { style: "thin", color: { rgb: "D1D5DB" } },
        bottom: { style: "thin", color: { rgb: "D1D5DB" } },
        left: { style: "thin", color: { rgb: "D1D5DB" } },
        right: { style: "thin", color: { rgb: "D1D5DB" } }
      }
    }
  },

  formatValue(value, type = 'text') {
    if (value === null || value === undefined || value === '') return '';
    
    switch (type) {
      case 'array':
        return Array.isArray(value) ? value.filter(v => v).join(', ') : value;
      case 'date':
        if (value.toDate) return value.toDate();
        if (value instanceof Date) return value;
        return value;
      case 'datetime':
        if (value.toDate) return value.toDate();
        if (value instanceof Date) return value;
        return value;
      case 'boolean':
        return value === true || value === 'true' ? 'Sim' : 'Não';
      case 'number':
        const num = parseFloat(value);
        return isNaN(num) ? value : num;
      default:
        return value.toString();
    }
  },

  async loadConfig() {
    try {
      const configRef = firebase.firestore().collection('config').doc('srt');
      const configSnap = await configRef.get();
      return configSnap.exists ? configSnap.data() : null;
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      return null;
    }
  },

 buildCompleteDataStructure(houses, config) {
  const headers = [];
  const rows = [];
  
  headers.push('ID');
  headers.push('Data Cadastro');
  
  if (config.municipio) {
    config.municipio.forEach(field => {
      headers.push(`[MUN] ${field.label}`);
    });
  }
  
  headers.push('CAPS Vinculado');
  headers.push('Tipo SRT');
  headers.push('Vagas Totais');
  headers.push('Vagas Ocupadas');
  headers.push('Taxa Ocupação (%)');
  headers.push('Total Moradores');
  
  if (config.general) {
    config.general.forEach(field => {
      if (!['nomeResidencia', 'nomeCaps', 'tipoSRT'].includes(field.key)) {
        headers.push(`[GERAL] ${field.label}`);
      }
    });
  }
  
  if (config.residence) {
    config.residence.forEach(field => {
      headers.push(`[RES] ${field.label}`);
    });
  }
  
  if (config.caregivers) {
    config.caregivers.forEach(field => {
      headers.push(`[EQUIPE] ${field.label}`);
    });
  }
  
  const maxMoradores = Math.max(...houses.map(h => h.residents?.length || 0));
  
  for (let i = 1; i <= maxMoradores; i++) {
    headers.push(`[M${i}] Preenchido`);
    if (config.residentFields) {
      config.residentFields.forEach(field => {
        headers.push(`[M${i}] ${field.label}`);
      });
    }
  }
  
  let rowIndex = 0;
  houses.forEach((house, houseIndex) => {
    const row = [];
    
    row.push(houseIndex + 1);
    row.push(this.formatValue(house.createdAt, 'datetime'));
    
    if (config.municipio) {
      config.municipio.forEach(field => {
        row.push(this.formatValue(house[field.key], field.type));
      });
    }
    
    row.push(house.nomeCaps || house.capsVinculadaSRT || '');
    row.push(house.tipoSRT || '');
    row.push(this.formatValue(house.vagasTotais, 'number'));
    row.push(this.formatValue(house.vagasOcupadas, 'number'));
    
    const taxaOcupacao = house.vagasTotais > 0 ? (house.vagasOcupadas / house.vagasTotais) : 0;
    row.push(taxaOcupacao);
    
    row.push(house.residents?.length || 0);
    
    if (config.general) {
      config.general.forEach(field => {
        if (!['nomeResidencia', 'nomeCaps', 'tipoSRT'].includes(field.key)) {
          row.push(this.formatValue(house[field.key], field.type));
        }
      });
    }
    
    if (config.residence) {
      config.residence.forEach(field => {
        row.push(this.formatValue(house[field.key], field.type));
      });
    }
    
    if (config.caregivers) {
      config.caregivers.forEach(field => {
        row.push(this.formatValue(house[field.key], field.type));
      });
    }
    
    for (let i = 0; i < maxMoradores; i++) {
      if (house.residents && house.residents[i]) {
        const resident = house.residents[i];
        row.push('Sim');
        
        if (config.residentFields) {
          config.residentFields.forEach(field => {
            if (field.conditional) {
              const dependentValue = resident[field.conditional.field];
              const shouldShow = field.conditional.values 
                ? field.conditional.values.includes(dependentValue)
                : dependentValue === field.conditional.value;
              if (!shouldShow) {
                row.push('');
                return;
              }
            }
            row.push(this.formatValue(resident[field.key], field.type));
          });
        }
      } else {
        row.push('Não');
        if (config.residentFields) {
          config.residentFields.forEach(() => row.push(''));
        }
      }
    }
    
    rows.push(row);
    rowIndex++;
  });
  
  return { headers, rows };
},

  applyCompleteStyling(worksheet, headers, rows) {
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];
        
        if (!cell) {
          worksheet[cellAddress] = { t: 's', v: '', s: {} };
        }
        
        if (R === 0) {
          worksheet[cellAddress].s = this.STYLES.COLUMN_HEADER;
        } else {
          const isAlternateRow = R % 2 === 0;
          const baseStyle = isAlternateRow ? this.STYLES.ALTERNATE_ROW : this.STYLES.DATA_CELL;
          
          if (C <= 1) {
            worksheet[cellAddress].s = { ...baseStyle, ...this.STYLES.NUMBER_CELL };
          } else if (headers[C] && headers[C].includes('Data')) {
            worksheet[cellAddress].s = { ...baseStyle, ...this.STYLES.DATE_CELL };
            if (cell.v instanceof Date) {
              worksheet[cellAddress].t = 'd';
              worksheet[cellAddress].z = 'dd/mm/yyyy';
            }
          } else if (headers[C] && headers[C].includes('Taxa') && headers[C].includes('%')) {
            worksheet[cellAddress].s = { ...baseStyle, ...this.STYLES.PERCENTAGE_CELL };
            if (typeof cell.v === 'number') {
              worksheet[cellAddress].z = '0.0%';
            }
          } else if (typeof cell.v === 'number' && !isNaN(cell.v)) {
            worksheet[cellAddress].s = { ...baseStyle, ...this.STYLES.NUMBER_CELL };
          } else {
            worksheet[cellAddress].s = baseStyle;
          }
        }
      }
    }
    
    const cols = [];
    for (let i = 0; i < headers.length; i++) {
      let maxWidth = headers[i].length;
      
      for (let r = 0; r < rows.length && r < 100; r++) {
        const cellValue = rows[r][i];
        if (cellValue) {
          const valueLength = cellValue.toString().length;
          maxWidth = Math.max(maxWidth, valueLength);
        }
      }
      
      cols.push({ wch: Math.min(Math.max(maxWidth + 2, 10), 50) });
    }
    
    worksheet['!cols'] = cols;
    worksheet['!rows'] = [{ hpt: 30 }];
    
    worksheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
  },

  generateSummarySheet(houses) {
  const totalHouses = houses.length;
  const totalResidents = houses.reduce((sum, house) => sum + (house.residents?.length || 0), 0);
  const totalVagas = houses.reduce((sum, house) => sum + (parseInt(house.vagasTotais) || 0), 0);
  const vagasOcupadas = houses.reduce((sum, house) => sum + (parseInt(house.vagasOcupadas) || 0), 0);
  const vagasDisponiveis = totalVagas - vagasOcupadas;
  const taxaOcupacao = totalVagas > 0 ? (vagasOcupadas / totalVagas) : 0;
  
  const municipiosMap = new Map();
  const tiposCount = { 'Tipo I': 0, 'Tipo II': 0, 'Não especificado': 0 };
  const capsMap = new Map();
  const situacaoHabilitacao = { 'Habilitada': 0, 'Em processo de habilitação': 0, 'Não habilitada': 0 };
  
  houses.forEach(house => {
    const municipio = house.municipio || 'Não informado';
    if (!municipiosMap.has(municipio)) {
      municipiosMap.set(municipio, {
        casas: 0,
        moradores: 0,
        vagasTotais: 0,
        vagasOcupadas: 0,
        tipoI: 0,
        tipoII: 0
      });
    }
    
    const munData = municipiosMap.get(municipio);
    munData.casas++;
    munData.moradores += house.residents?.length || 0;
    munData.vagasTotais += parseInt(house.vagasTotais) || 0;
    munData.vagasOcupadas += parseInt(house.vagasOcupadas) || 0;
    
    const tipo = house.tipoSRT || 'Não especificado';
    tiposCount[tipo] = (tiposCount[tipo] || 0) + 1;
    if (tipo === 'Tipo I') munData.tipoI++;
    if (tipo === 'Tipo II') munData.tipoII++;
    
    const caps = house.nomeCaps || house.capsVinculadaSRT || 'Não informado';
    if (!capsMap.has(caps)) {
      capsMap.set(caps, { casas: 0, moradores: 0 });
    }
    const capsData = capsMap.get(caps);
    capsData.casas++;
    capsData.moradores += house.residents?.length || 0;
    
    const situacao = house.situacaoHabilitacao || 'Não informado';
    situacaoHabilitacao[situacao] = (situacaoHabilitacao[situacao] || 0) + 1;
  });
  
  const pvcStats = { 'Sim': 0, 'Não': 0, 'Em processo': 0 };
  const idadeRanges = { '18-30': 0, '31-40': 0, '41-50': 0, '51-60': 0, '60+': 0 };
  const generoStats = { 'Masculino': 0, 'Feminino': 0, 'Não informado': 0 };
  const racaStats = {};
  
  houses.forEach(house => {
    if (house.residents) {
      house.residents.forEach(resident => {
        const pvc = resident.participaPVC || 'Não informado';
        pvcStats[pvc] = (pvcStats[pvc] || 0) + 1;
        
        const idade = parseInt(resident.idade) || 0;
        if (idade >= 18 && idade <= 30) idadeRanges['18-30']++;
        else if (idade >= 31 && idade <= 40) idadeRanges['31-40']++;
        else if (idade >= 41 && idade <= 50) idadeRanges['41-50']++;
        else if (idade >= 51 && idade <= 60) idadeRanges['51-60']++;
        else if (idade > 60) idadeRanges['60+']++;
        
        const genero = resident.generoNascimento || 'Não informado';
        generoStats[genero] = (generoStats[genero] || 0) + 1;
        
        const raca = resident.racaCor || 'Não informado';
        racaStats[raca] = (racaStats[raca] || 0) + 1;
      });
    }
  });
  
  const summaryData = [
    ['RELATÓRIO EXECUTIVO - SERVIÇOS DE RESIDÊNCIAS TERAPÊUTICAS (SRT)'],
    [''],
    ['INFORMAÇÕES GERAIS', '', '', ''],
    ['Data do Relatório', new Date(), '', ''],
    ['Período de Análise', 'Todos os registros', '', ''],
    ['Total de Registros', totalHouses, '', ''],
    [''],
    ['INDICADORES PRINCIPAIS', 'Valor', 'Percentual', 'Observações'],
    ['Total de Residências Cadastradas', totalHouses, '', ''],
    ['Total de Moradores', totalResidents, '', ''],
    ['Total de Vagas (CNES)', totalVagas, '', ''],
    ['Vagas Ocupadas', vagasOcupadas, taxaOcupacao, `${(taxaOcupacao * 100).toFixed(1)}% de ocupação`],
    ['Vagas Disponíveis', vagasDisponiveis, vagasDisponiveis / totalVagas, `${((vagasDisponiveis / totalVagas) * 100).toFixed(1)}% disponível`],
    ['Média de Moradores por Casa', totalHouses > 0 ? (totalResidents / totalHouses).toFixed(1) : 0, '', ''],
    ['Municípios Atendidos', municipiosMap.size, '', ''],
    [''],
    ['DISTRIBUIÇÃO POR TIPO DE SRT', 'Quantidade', 'Percentual', 'Capacidade Média'],
    ...Object.entries(tiposCount).map(([tipo, count]) => {
      const percent = totalHouses > 0 ? count / totalHouses : 0;
      const casasTipo = houses.filter(h => (h.tipoSRT || 'Não especificado') === tipo);
      const mediaVagas = casasTipo.length > 0 
        ? casasTipo.reduce((sum, h) => sum + (parseInt(h.vagasTotais) || 0), 0) / casasTipo.length 
        : 0;
      return [tipo, count, percent, mediaVagas.toFixed(1)];
    }),
    [''],
    ['SITUAÇÃO DE HABILITAÇÃO NO MS', 'Quantidade', 'Percentual', ''],
    ...Object.entries(situacaoHabilitacao).filter(([_, count]) => count > 0).map(([situacao, count]) => [
      situacao, 
      count, 
      totalHouses > 0 ? count / totalHouses : 0,
      ''
    ]),
    [''],
    ['ANÁLISE POR MUNICÍPIO', 'Casas', 'Moradores', 'Taxa Ocupação', 'Tipo I', 'Tipo II'],
    ...[...municipiosMap.entries()]
      .sort((a, b) => b[1].casas - a[1].casas)
      .map(([municipio, data]) => {
        const taxa = data.vagasTotais > 0 ? data.vagasOcupadas / data.vagasTotais : 0;
        return [municipio, data.casas, data.moradores, taxa, data.tipoI, data.tipoII];
      }),
    [''],
    ['TOP 10 CAPS POR NÚMERO DE RESIDÊNCIAS', 'Casas Vinculadas', 'Total Moradores', ''],
    ...[...capsMap.entries()]
      .sort((a, b) => b[1].casas - a[1].casas)
      .slice(0, 10)
      .map(([caps, data]) => [caps, data.casas, data.moradores, '']),
    [''],
    ['PERFIL DOS MORADORES', '', '', ''],
    ['Indicador', 'Valor', 'Percentual', ''],
    ['Total de Moradores', totalResidents, '100%', ''],
    [''],
    ['Distribuição por Faixa Etária', 'Quantidade', 'Percentual', ''],
    ...Object.entries(idadeRanges).map(([faixa, count]) => [
      `${faixa} anos`, 
      count, 
      totalResidents > 0 ? count / totalResidents : 0,
      ''
    ]),
    [''],
    ['Distribuição por Gênero', 'Quantidade', 'Percentual', ''],
    ...Object.entries(generoStats).filter(([_, count]) => count > 0).map(([genero, count]) => [
      genero, 
      count, 
      totalResidents > 0 ? count / totalResidents : 0,
      ''
    ]),
    [''],
    ['Distribuição por Raça/Cor', 'Quantidade', 'Percentual', ''],
    ...Object.entries(racaStats).filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([raca, count]) => [
        raca, 
        count, 
        totalResidents > 0 ? count / totalResidents : 0,
        ''
      ]),
    [''],
    ['Programa de Volta para Casa (PVC)', 'Quantidade', 'Percentual', ''],
    ...Object.entries(pvcStats).filter(([_, count]) => count > 0).map(([status, count]) => [
      status, 
      count, 
      totalResidents > 0 ? count / totalResidents : 0,
      ''
    ]),
    [''],
    ['INDICADORES DE QUALIDADE', '', '', ''],
    ['Casas com 100% de ocupação', houses.filter(h => h.vagasTotais > 0 && h.vagasOcupadas === h.vagasTotais).length, '', ''],
    ['Casas com ocupação acima de 80%', houses.filter(h => h.vagasTotais > 0 && (h.vagasOcupadas / h.vagasTotais) >= 0.8).length, '', ''],
    ['Casas com ocupação entre 50-80%', houses.filter(h => h.vagasTotais > 0 && (h.vagasOcupadas / h.vagasTotais) >= 0.5 && (h.vagasOcupadas / h.vagasTotais) < 0.8).length, '', ''],
    ['Casas com ocupação abaixo de 50%', houses.filter(h => h.vagasTotais > 0 && (h.vagasOcupadas / h.vagasTotais) < 0.5).length, '', ''],
    ['Casas sem moradores', houses.filter(h => (h.vagasOcupadas || 0) === 0).length, '', ''],
    [''],
    ['OBSERVAÇÕES E ALERTAS', '', '', ''],
    ['Registros sem nome da residência', houses.filter(h => !h.nomeResidencia && !h.nomeResidenciaTherapeutica).length, '', ''],
    ['Registros sem município informado', houses.filter(h => !h.municipio).length, '', ''],
    ['Registros sem CAPS vinculado', houses.filter(h => !h.nomeCaps && !h.capsVinculadaSRT).length, '', ''],
    ['Divergência entre vagas ocupadas e moradores cadastrados', houses.filter(h => (h.vagasOcupadas || 0) !== (h.residents?.length || 0)).length, '', '']
  ];
  
  const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
  
  const range = XLSX.utils.decode_range(summaryWS['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = summaryWS[cellAddress];
      if (!cell) continue;
      
      if (R === 0) {
        cell.s = this.STYLES.MAIN_HEADER;
      } else if (cell.v === 'INFORMAÇÕES GERAIS' || 
                 cell.v === 'INDICADORES PRINCIPAIS' ||
                 cell.v === 'DISTRIBUIÇÃO POR TIPO DE SRT' ||
                 cell.v === 'SITUAÇÃO DE HABILITAÇÃO NO MS' ||
                 cell.v === 'ANÁLISE POR MUNICÍPIO' ||
                 cell.v === 'TOP 10 CAPS POR NÚMERO DE RESIDÊNCIAS' ||
                 cell.v === 'PERFIL DOS MORADORES' ||
                 cell.v === 'INDICADORES DE QUALIDADE' ||
                 cell.v === 'OBSERVAÇÕES E ALERTAS' ||
                 (cell.v && cell.v.toString().includes('Distribuição por'))) {
        cell.s = this.STYLES.SECTION_HEADER;
      } else if (['Indicador', 'Data do Relatório', 'Tipo', 'Município', 'CAPS'].some(header => 
                  cell.v && cell.v.toString().includes(header)) && C === 0) {
        cell.s = this.STYLES.COLUMN_HEADER;
      } else if (R === 3 && C === 1) {
        cell.s = this.STYLES.DATE_CELL;
        cell.t = 'd';
        cell.z = 'dd/mm/yyyy hh:mm';
      } else if (cell.v && typeof cell.v === 'number' && C === 2 && cell.v <= 1) {
        cell.s = this.STYLES.PERCENTAGE_CELL;
        cell.z = '0.0%';
      } else if (typeof cell.v === 'number') {
        cell.s = this.STYLES.NUMBER_CELL;
      } else {
        cell.s = R % 2 === 0 ? this.STYLES.ALTERNATE_ROW : this.STYLES.DATA_CELL;
      }
    }
  }
  
  summaryWS['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } }
  ];
  
  for (let i = 0; i < summaryData.length; i++) {
    if (summaryData[i][0] && summaryData[i][0].toString().includes('DISTRIBUIÇÃO') ||
        summaryData[i][0] && summaryData[i][0].toString().includes('PERFIL') ||
        summaryData[i][0] && summaryData[i][0].toString().includes('INDICADORES') ||
        summaryData[i][0] && summaryData[i][0].toString().includes('OBSERVAÇÕES')) {
      summaryWS['!merges'].push({ s: { r: i, c: 0 }, e: { r: i, c: 3 } });
    }
  }
  
  summaryWS['!cols'] = [
    { wch: 40 },
    { wch: 15 },
    { wch: 15 },
    { wch: 25 },
    { wch: 10 },
    { wch: 10 }
  ];
  
  summaryWS['!rows'] = [{ hpt: 40 }];
  
  return summaryWS;
},

  async exportCompleteReport(houses) {
    const config = await this.loadConfig();
    if (!config) {
      throw new Error('Não foi possível carregar a configuração');
    }
    
    const workbook = XLSX.utils.book_new();
    
    const summaryWS = this.generateSummarySheet(houses);
    XLSX.utils.book_append_sheet(workbook, summaryWS, "Resumo Executivo");
    
    const { headers, rows } = this.buildCompleteDataStructure(houses, config);
    const dataWS = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    this.applyCompleteStyling(dataWS, headers, rows);
    XLSX.utils.book_append_sheet(workbook, dataWS, "Dados Completos");
    
    workbook.Props = {
      Title: "Relatório SRT - Sistema de Residências Terapêuticas",
      Subject: "Dados completos das Residências Terapêuticas",
      Author: "Sistema SRT",
      CreatedDate: new Date(),
      Keywords: "SRT, Residências Terapêuticas, Saúde Mental"
    };
    
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '');
    const fileName = `SRT_Completo_${date}_${time}.xlsx`;
    
    return { workbook, fileName };
  }
};

window.ExportUtils = ExportUtils;