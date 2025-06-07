const ExportUtils = {
  STYLES: {
    TITLE: {
      font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "2563EB" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "medium", color: { rgb: "1D4ED8" } },
        bottom: { style: "medium", color: { rgb: "1D4ED8" } },
        left: { style: "medium", color: { rgb: "1D4ED8" } },
        right: { style: "medium", color: { rgb: "1D4ED8" } }
      }
    },
    HEADER: {
      font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1F2937" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "medium", color: { rgb: "111827" } },
        bottom: { style: "medium", color: { rgb: "111827" } },
        left: { style: "thin", color: { rgb: "374151" } },
        right: { style: "thin", color: { rgb: "374151" } }
      }
    },
    SUBHEADER: {
      font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "6366F1" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "4F46E5" } },
        bottom: { style: "thin", color: { rgb: "4F46E5" } },
        left: { style: "thin", color: { rgb: "4F46E5" } },
        right: { style: "thin", color: { rgb: "4F46E5" } }
      }
    },
    CELL: {
      font: { sz: 10, color: { rgb: "1F2937" } },
      alignment: { vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "E5E7EB" } },
        bottom: { style: "thin", color: { rgb: "E5E7EB" } },
        left: { style: "thin", color: { rgb: "E5E7EB" } },
        right: { style: "thin", color: { rgb: "E5E7EB" } }
      }
    },
    CELL_HIGHLIGHT: {
      font: { sz: 10, color: { rgb: "1F2937" }, bold: true },
      fill: { fgColor: { rgb: "FEF3C7" } },
      alignment: { vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "E5E7EB" } },
        bottom: { style: "thin", color: { rgb: "E5E7EB" } },
        left: { style: "thin", color: { rgb: "E5E7EB" } },
        right: { style: "thin", color: { rgb: "E5E7EB" } }
      }
    },
    SECTION_HEADER: {
      font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "7C3AED" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "medium", color: { rgb: "6D28D9" } },
        bottom: { style: "medium", color: { rgb: "6D28D9" } },
        left: { style: "medium", color: { rgb: "6D28D9" } },
        right: { style: "medium", color: { rgb: "6D28D9" } }
      }
    }
  },

  COLUMN_WIDTHS: {
    SMALL: 12,
    MEDIUM: 20,
    LARGE: 30,
    XLARGE: 40,
    XXLARGE: 60
  },

  formatValue(value, type = 'text') {
    if (value === null || value === undefined || value === '') return '';
    
    switch (type) {
      case 'array':
        return Array.isArray(value) ? value.join(', ') : value;
      case 'date':
        if (value.toDate) return value.toDate().toLocaleDateString('pt-BR');
        if (value instanceof Date) return value.toLocaleDateString('pt-BR');
        return value;
      case 'datetime':
        if (value.toDate) {
          const date = value.toDate();
          return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR')}`;
        }
        if (value instanceof Date) {
          return `${value.toLocaleDateString('pt-BR')} ${value.toLocaleTimeString('pt-BR')}`;
        }
        return value;
      case 'boolean':
        if (value === true || value === 'true') return 'Sim';
        if (value === false || value === 'false') return 'Não';
        return value;
      default:
        return value.toString();
    }
  },

  generateSummaryData(houses) {
    const totalHouses = houses.length;
    const totalResidents = houses.reduce((sum, house) => sum + (house.residents?.length || 0), 0);
    const totalVagas = houses.reduce((sum, house) => sum + (parseInt(house.vagasTotais) || 0), 0);
    const vagasOcupadas = houses.reduce((sum, house) => sum + (parseInt(house.vagasOcupadas) || 0), 0);
    const occupancyRate = totalVagas > 0 ? ((vagasOcupadas / totalVagas) * 100).toFixed(1) : '0';

    const municipios = [...new Set(houses.map(h => h.municipio).filter(Boolean))];
    const tiposDistribution = houses.reduce((acc, house) => {
      const tipo = house.tipoSRT || 'Não especificado';
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {});

    const data = [
      ['RELATÓRIO GERAL DE RESIDÊNCIAS TERAPÊUTICAS - SRT'],
      ['Estado do Rio de Janeiro'],
      [`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`],
      [],
      ['RESUMO EXECUTIVO'],
      ['Total de Casas Cadastradas', totalHouses],
      ['Total de Moradores', totalResidents],
      ['Total de Vagas (CNES)', totalVagas],
      ['Vagas Ocupadas', vagasOcupadas],
      ['Vagas Disponíveis', totalVagas - vagasOcupadas],
      ['Taxa de Ocupação Geral', `${occupancyRate}%`],
      ['Média de Moradores por Casa', totalHouses > 0 ? (totalResidents / totalHouses).toFixed(1) : '0'],
      ['Municípios Atendidos', municipios.length],
      [],
      ['DISTRIBUIÇÃO POR TIPO DE SRT'],
      ...Object.entries(tiposDistribution).map(([tipo, count]) => [
        tipo, 
        count, 
        `${((count / totalHouses) * 100).toFixed(1)}%`
      ]),
      [],
      ['MUNICÍPIOS CADASTRADOS'],
      ...municipios.map(municipio => {
        const casasNoMunicipio = houses.filter(h => h.municipio === municipio).length;
        return [municipio, casasNoMunicipio];
      })
    ];

    return data;
  },

  generateHousesListData(houses) {
    const headers = [
      'ID',
      'Nome da Residência',
      'Município',
      'CAPS Vinculado',
      'Tipo SRT',
      'Vagas Totais',
      'Vagas Ocupadas',
      'Vagas Disponíveis',
      'Taxa de Ocupação (%)',
      'Total de Moradores',
      'Data de Inauguração',
      'Responsável',
      'Telefone',
      'Status CNES',
      'Data de Cadastro'
    ];

    const data = [headers];

    houses.forEach((house, index) => {
      const occupancyRate = house.vagasTotais > 0 
        ? ((house.vagasOcupadas / house.vagasTotais) * 100).toFixed(1)
        : '0';

      data.push([
        index + 1,
        house.nomeResidencia || '',
        house.municipio || '',
        house.nomeCaps || house.capsVinculadaSRT || '',
        house.tipoSRT || '',
        house.vagasTotais || 0,
        house.vagasOcupadas || 0,
        house.vagasDisponiveis || 0,
        occupancyRate,
        house.residents?.length || 0,
        this.formatValue(house.dataInauguracao, 'date'),
        house.responsavelNome || '',
        house.contatoResponsavel || '',
        house.situacaoHabilitacao || '',
        this.formatValue(house.createdAt, 'datetime')
      ]);
    });

    return data;
  },

  generateDetailedHouseData(house, config) {
    const data = [];
    const sections = ['municipio', 'general', 'residence', 'caregivers'];

    data.push([`RESIDÊNCIA: ${house.nomeResidencia || 'Sem nome'}`]);
    data.push([]);

    sections.forEach(sectionKey => {
      if (!config[sectionKey]) return;

      const sectionTitles = {
        municipio: 'INFORMAÇÕES DO MUNICÍPIO',
        general: 'DADOS DA SRT',
        residence: 'DADOS DA RESIDÊNCIA',
        caregivers: 'DADOS DA EQUIPE/CUIDADORES'
      };

      data.push([sectionTitles[sectionKey]]);
      
      config[sectionKey].forEach(field => {
        if (field.conditional) {
          const dependentValue = house[field.conditional.field];
          const shouldShow = field.conditional.values 
            ? field.conditional.values.includes(dependentValue)
            : dependentValue === field.conditional.value;
          if (!shouldShow) return;
        }

        const value = house[field.key];
        if (value !== undefined && value !== null && value !== '') {
          let formattedValue;
          if (field.type === 'multiselect' || Array.isArray(value)) {
            formattedValue = this.formatValue(value, 'array');
          } else if (field.type === 'date') {
            formattedValue = this.formatValue(value, 'date');
          } else {
            formattedValue = this.formatValue(value);
          }
          data.push([field.label, formattedValue]);
        }
      });
      data.push([]);
    });

    data.push(['CAPACIDADE E OCUPAÇÃO']);
    data.push(['Moradores na Implantação', house.totalMoradores || house.totalResidents || '']);
    data.push(['Vagas Totais (CNES)', house.vagasTotais || '']);
    data.push(['Vagas Ocupadas', house.vagasOcupadas || '']);
    data.push(['Vagas Disponíveis', house.vagasDisponiveis || '']);
    data.push([]);

    if (house.residents && house.residents.length > 0) {
      data.push([`MORADORES (${house.residents.length})`]);
      data.push([]);

      house.residents.forEach((resident, index) => {
        data.push([`MORADOR ${index + 1}`]);
        
        if (config.residentFields) {
          config.residentFields.forEach(field => {
            if (field.conditional) {
              const dependentValue = resident[field.conditional.field];
              const shouldShow = field.conditional.values 
                ? field.conditional.values.includes(dependentValue)
                : dependentValue === field.conditional.value;
              if (!shouldShow) return;
            }

            const value = resident[field.key];
            if (value !== undefined && value !== null && value !== '') {
              let formattedValue;
              if (field.type === 'multiselect' || Array.isArray(value)) {
                formattedValue = this.formatValue(value, 'array');
              } else if (field.type === 'date') {
                formattedValue = this.formatValue(value, 'date');
              } else {
                formattedValue = this.formatValue(value);
              }
              data.push([field.label, formattedValue]);
            }
          });
        }
        data.push([]);
      });
    }

    return data;
  },

  generateResidentsData(houses, config) {
    if (!config?.residentFields) return [['Configuração de campos não encontrada']];

    const headers = ['Casa', 'Município'];
    config.residentFields.forEach(field => {
      headers.push(field.label);
    });

    const data = [headers];

    houses.forEach(house => {
      if (house.residents && house.residents.length > 0) {
        house.residents.forEach(resident => {
          const row = [
            house.nomeResidencia || '',
            house.municipio || ''
          ];

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

            const value = resident[field.key];
            if (value !== undefined && value !== null && value !== '') {
              if (field.type === 'multiselect' || Array.isArray(value)) {
                row.push(this.formatValue(value, 'array'));
              } else if (field.type === 'date') {
                row.push(this.formatValue(value, 'date'));
              } else {
                row.push(this.formatValue(value));
              }
            } else {
              row.push('');
            }
          });

          data.push(row);
        });
      }
    });

    return data;
  },

  applyStyles(worksheet, data, startRow = 0) {
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];
        
        if (!cell) continue;

        if (R === startRow && data[R] && data[R][0] && data[R][0].includes('RELATÓRIO')) {
          cell.s = this.STYLES.TITLE;
        } else if (R === startRow + 1 && data[R] && data[R][0] && data[R][0].includes('Estado')) {
          cell.s = this.STYLES.SUBHEADER;
        } else if (data[R] && data[R][C] && typeof data[R][C] === 'string' && 
                   (data[R][C].includes('INFORMAÇÕES') || 
                    data[R][C].includes('DADOS') || 
                    data[R][C].includes('RESUMO') ||
                    data[R][C].includes('DISTRIBUIÇÃO') ||
                    data[R][C].includes('RESIDÊNCIA:') ||
                    data[R][C].includes('MORADORES') ||
                    data[R][C].includes('CAPACIDADE'))) {
          cell.s = this.STYLES.SECTION_HEADER;
        } else if (R === startRow && C === 0) {
          cell.s = this.STYLES.HEADER;
        } else {
          cell.s = this.STYLES.CELL;
        }
      }
    }
  },

  setColumnWidths(worksheet, numCols) {
    const cols = [];
    for (let i = 0; i < numCols; i++) {
      if (i === 0) {
        cols.push({ wch: this.COLUMN_WIDTHS.LARGE });
      } else if (i === 1) {
        cols.push({ wch: this.COLUMN_WIDTHS.XXLARGE });
      } else {
        cols.push({ wch: this.COLUMN_WIDTHS.MEDIUM });
      }
    }
    worksheet['!cols'] = cols;
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

  async exportCompleteReport(houses) {
    const config = await this.loadConfig();
    const workbook = XLSX.utils.book_new();

    const summaryData = this.generateSummaryData(houses);
    const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
    this.applyStyles(summaryWS, summaryData);
    this.setColumnWidths(summaryWS, 3);
    XLSX.utils.book_append_sheet(workbook, summaryWS, "Resumo Geral");

    const housesListData = this.generateHousesListData(houses);
    const housesListWS = XLSX.utils.aoa_to_sheet(housesListData);
    this.applyStyles(housesListWS, housesListData);
    this.setColumnWidths(housesListWS, housesListData[0].length);
    XLSX.utils.book_append_sheet(workbook, housesListWS, "Lista de Casas");

    if (config) {
      const residentsData = this.generateResidentsData(houses, config);
      const residentsWS = XLSX.utils.aoa_to_sheet(residentsData);
      this.applyStyles(residentsWS, residentsData);
      this.setColumnWidths(residentsWS, residentsData[0].length);
      XLSX.utils.book_append_sheet(workbook, residentsWS, "Dados dos Moradores");

      houses.forEach((house, index) => {
        if (index >= 20) return;
        
        const houseData = this.generateDetailedHouseData(house, config);
        const houseWS = XLSX.utils.aoa_to_sheet(houseData);
        this.applyStyles(houseWS, houseData);
        this.setColumnWidths(houseWS, 2);
        
        const sheetName = `Casa ${index + 1}`.substring(0, 31);
        XLSX.utils.book_append_sheet(workbook, houseWS, sheetName);
      });
    }

    workbook.Props = {
      Title: "Relatório Completo SRT - Sistema de Residências Terapêuticas",
      Subject: "Dados completos das Residências Terapêuticas do Estado do Rio de Janeiro",
      Author: "Sistema SRT - Secretaria de Estado de Saúde",
      CreatedDate: new Date(),
      Keywords: "SRT, Residências Terapêuticas, Saúde Mental, Rio de Janeiro"
    };

    const date = new Date().toISOString().split('T')[0];
    const fileName = `relatorio_completo_srt_${date}.xlsx`;
    
    return { workbook, fileName };
  }
};

window.ExportUtils = ExportUtils;