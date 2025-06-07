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
    
    headers.push('Nome da Residência');
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
      
      row.push(house.nomeResidencia || '');
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
    const taxaOcupacao = totalVagas > 0 ? (vagasOcupadas / totalVagas) : 0;
    
    const municipiosSet = new Set(houses.map(h => h.municipio).filter(Boolean));
    const tiposCount = houses.reduce((acc, house) => {
      const tipo = house.tipoSRT || 'Não especificado';
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {});
    
    const summaryData = [
      ['RESUMO EXECUTIVO - RESIDÊNCIAS TERAPÊUTICAS'],
      [''],
      ['Indicador', 'Valor'],
      ['Data do Relatório', new Date()],
      ['Total de Residências', totalHouses],
      ['Total de Moradores', totalResidents],
      ['Total de Vagas (CNES)', totalVagas],
      ['Vagas Ocupadas', vagasOcupadas],
      ['Vagas Disponíveis', totalVagas - vagasOcupadas],
      ['Taxa de Ocupação Geral', taxaOcupacao],
      ['Média de Moradores por Casa', totalHouses > 0 ? totalResidents / totalHouses : 0],
      ['Municípios Atendidos', municipiosSet.size],
      [''],
      ['DISTRIBUIÇÃO POR TIPO'],
      ...Object.entries(tiposCount).map(([tipo, count]) => [tipo, count]),
      [''],
      ['ANÁLISE POR MUNICÍPIO'],
      ['Município', 'Qtd Casas', 'Total Moradores', 'Taxa Ocupação'],
      ...[...municipiosSet].map(municipio => {
        const casasMunicipio = houses.filter(h => h.municipio === municipio);
        const totalMoradoresMun = casasMunicipio.reduce((sum, h) => sum + (h.residents?.length || 0), 0);
        const vagasTotaisMun = casasMunicipio.reduce((sum, h) => sum + (parseInt(h.vagasTotais) || 0), 0);
        const vagasOcupadasMun = casasMunicipio.reduce((sum, h) => sum + (parseInt(h.vagasOcupadas) || 0), 0);
        const taxaMun = vagasTotaisMun > 0 ? vagasOcupadasMun / vagasTotaisMun : 0;
        return [municipio, casasMunicipio.length, totalMoradoresMun, taxaMun];
      })
    ];
    
    const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
    
    const range = XLSX.utils.decode_range(summaryWS['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!summaryWS[cellAddress]) continue;
        
        if (R === 0) {
          summaryWS[cellAddress].s = this.STYLES.MAIN_HEADER;
        } else if (summaryWS[cellAddress].v === 'Indicador' || 
                   summaryWS[cellAddress].v === 'DISTRIBUIÇÃO POR TIPO' ||
                   summaryWS[cellAddress].v === 'ANÁLISE POR MUNICÍPIO') {
          summaryWS[cellAddress].s = this.STYLES.SECTION_HEADER;
        } else if (R === 2 || R === 13 || R === 17) {
          summaryWS[cellAddress].s = this.STYLES.COLUMN_HEADER;
        } else if (R === 3 && C === 1) {
          summaryWS[cellAddress].s = this.STYLES.DATE_CELL;
          summaryWS[cellAddress].t = 'd';
          summaryWS[cellAddress].z = 'dd/mm/yyyy hh:mm';
        } else if ((R === 9 || (R >= 18 && C === 3)) && C > 0) {
          summaryWS[cellAddress].s = this.STYLES.PERCENTAGE_CELL;
          if (typeof summaryWS[cellAddress].v === 'number') {
            summaryWS[cellAddress].z = '0.0%';
          }
        } else if (typeof summaryWS[cellAddress].v === 'number' && R > 3) {
          summaryWS[cellAddress].s = this.STYLES.NUMBER_CELL;
        } else {
          summaryWS[cellAddress].s = R % 2 === 0 ? this.STYLES.ALTERNATE_ROW : this.STYLES.DATA_CELL;
        }
      }
    }
    
    summaryWS['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 13, c: 0 }, e: { r: 13, c: 1 } },
      { s: { r: 16, c: 0 }, e: { r: 16, c: 3 } }
    ];
    
    summaryWS['!cols'] = [
      { wch: 30 },
      { wch: 15 },
      { wch: 20 },
      { wch: 15 }
    ];
    
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