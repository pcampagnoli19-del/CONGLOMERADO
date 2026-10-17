/**
 * CONGLOMERADO — P&D, inovação e tecnologia (Fase 9)
 * Departamento, árvores por setor, produtos, patentes, licenças,
 * espionagem, parcerias, índice de inovação e obsolescência.
 */
(function (global) {
  'use strict';

  const EVENT_CAP = 50;
  const HISTORY_CAP = 60;
  const PROJECT_CAP = 30;
  const PATENT_CAP = 40;
  const PRODUCT_CAP = 40;

  const Rd = {
    /* ========== Bootstrap ========== */

    createEmptyRdState() {
      return {
        version: 9,
        semanaUltimoTick: 0,
        eventos: [],
        patentesGlobais: [], // registro cross-company para licenças
        ranking: []
      };
    },

    defaultDept(empresa) {
      const porte = empresa?.porte || 'micro';
      const maxProj = { micro: 1, pequena: 2, media: 3, grande: 4, corporacao: 5, conglomerado: 6 }[porte] || 1;
      return {
        ativo: false,
        orcamentoSemanal: 0,
        pesquisadores: 0,
        diretores: 0,
        nivelTech: empresa?.nivelTech ?? 30,
        eficiencia: 45,
        maxProjetos: maxProj,
        laboratorios: 0,
        etica: 70, // baixa ética → mais espionagem, mais risco
        culturaInovacao: 40
      };
    },

    ensureRd(state) {
      if (!state.rd || typeof state.rd !== 'object') {
        state.rd = this.createEmptyRdState();
      } else {
        const base = this.createEmptyRdState();
        state.rd = {
          ...base,
          ...state.rd,
          eventos: Array.isArray(state.rd.eventos) ? state.rd.eventos : [],
          patentesGlobais: Array.isArray(state.rd.patentesGlobais) ? state.rd.patentesGlobais : [],
          ranking: Array.isArray(state.rd.ranking) ? state.rd.ranking : [],
          version: 9
        };
      }
      return state.rd;
    },

    ensureCompanyRd(empresa, state) {
      if (!empresa) return null;
      if (!empresa.rd || typeof empresa.rd !== 'object') empresa.rd = {};
      const r = empresa.rd;
      if (!r.dept) r.dept = this.defaultDept(empresa);
      else {
        const def = this.defaultDept(empresa);
        r.dept = { ...def, ...r.dept };
      }
      if (!Array.isArray(r.projetos)) r.projetos = [];
      if (!Array.isArray(r.techsDesbloqueadas)) r.techsDesbloqueadas = [];
      if (!Array.isArray(r.patentes)) r.patentes = [];
      if (!Array.isArray(r.licencasCompradas)) r.licencasCompradas = [];
      if (!Array.isArray(r.licencasVendidas)) r.licencasVendidas = [];
      if (!Array.isArray(r.produtos)) r.produtos = [];
      if (!Array.isArray(r.parcerias)) r.parcerias = [];
      if (!Array.isArray(r.historico)) r.historico = [];
      if (r.indiceInovacao == null) r.indiceInovacao = 20;
      if (r.obsolescencia == null) r.obsolescencia = 15; // 0 = moderno, 100 = obsoleto
      if (r.custoSemanal == null) r.custoSemanal = 0;
      if (r.boostEficiencia == null) r.boostEficiencia = 0;
      if (r.boostQualidade == null) r.boostQualidade = 0;
      if (r.boostDemanda == null) r.boostDemanda = 0;
      if (r.reducaoCusto == null) r.reducaoCusto = 0;
      if (r.incentivoFiscal == null) r.incentivoFiscal = 0;
      if (r.seeded == null) r.seeded = false;
      // Sync nível tech empresa ↔ dept
      if (empresa.nivelTech != null) {
        r.dept.nivelTech = Math.max(r.dept.nivelTech || 0, empresa.nivelTech);
      }
      return r;
    },

    migrateAll(state) {
      this.ensureRd(state);
      (state.companies?.empresas || []).forEach((e) => {
        this.ensureCompanyRd(e, state);
        e.rd.seeded = true;
      });
      if (state.finance?.pessoal) state.finance.pessoal.version = 9;
      (state.companies?.empresas || []).forEach((e) => {
        if (e.finance) e.finance.version = 9;
      });
      return state;
    },

    onCompanyCreated(empresa, state) {
      this.ensureRd(state);
      this.ensureCompanyRd(empresa, state);
      empresa.rd.seeded = true;
    },

    addHistory(empresa, state, entry) {
      this.ensureCompanyRd(empresa, state);
      empresa.rd.historico.unshift({
        id: CGL.Utils.uuid(),
        semana: state.world?.semanaAtual || 0,
        ...entry
      });
      if (empresa.rd.historico.length > HISTORY_CAP) {
        empresa.rd.historico.length = HISTORY_CAP;
      }
    },

    pushEvent(state, entry) {
      const rd = this.ensureRd(state);
      rd.eventos.unshift({
        id: CGL.Utils.uuid(),
        semana: state.world?.semanaAtual || 0,
        ...entry
      });
      if (rd.eventos.length > EVENT_CAP) rd.eventos.length = EVENT_CAP;
    },

    /* ========== Departamento ========== */

    activateDept(empresa, state, opts = {}) {
      this.ensureCompanyRd(empresa, state);
      const d = empresa.rd.dept;
      d.ativo = true;
      d.orcamentoSemanal = Math.max(0, Number(opts.orcamentoSemanal) || 5000);
      d.pesquisadores = Math.max(0, Number(opts.pesquisadores) || 2);
      d.diretores = Math.max(0, Number(opts.diretores) || 1);
      d.laboratorios = Math.max(0, Number(opts.laboratorios) || 1);
      const setup = 25000 + d.laboratorios * 40000;
      if (CGL.Finance?.debitEmpresa) {
        CGL.Finance.debitEmpresa(state, empresa.id, setup, {
          categoria: 'pd',
          descricao: 'Criação do departamento de P&D'
        });
      }
      this._recalcDeptEfficiency(empresa);
      this.addHistory(empresa, state, {
        tipo: 'dept',
        titulo: 'P&D ativado',
        descricao: `Departamento criado (${d.pesquisadores} pesquisadores, orçamento ${CGL.Utils.formatBRL(d.orcamentoSemanal)}/sem).`
      });
      CGL.Events?.notify?.('success', 'P&D', `Departamento de inovação em ${empresa.nomeFantasia}.`);
      return d;
    },

    updateDept(empresa, state, opts = {}) {
      this.ensureCompanyRd(empresa, state);
      const d = empresa.rd.dept;
      if (!d.ativo) return d;
      if (opts.orcamentoSemanal != null) d.orcamentoSemanal = Math.max(0, Number(opts.orcamentoSemanal));
      if (opts.pesquisadores != null) d.pesquisadores = Math.max(0, Math.floor(Number(opts.pesquisadores)));
      if (opts.diretores != null) d.diretores = Math.max(0, Math.floor(Number(opts.diretores)));
      if (opts.laboratorios != null) d.laboratorios = Math.max(0, Math.floor(Number(opts.laboratorios)));
      if (opts.etica != null) d.etica = CGL.Utils.clamp(Number(opts.etica), 0, 100);
      const porte = empresa.porte || 'micro';
      d.maxProjetos = { micro: 1, pequena: 2, media: 3, grande: 4, corporacao: 5, conglomerado: 6 }[porte] || 1;
      d.maxProjetos += Math.min(2, Math.floor(d.laboratorios / 2));
      this._recalcDeptEfficiency(empresa);
      return d;
    },

    _recalcDeptEfficiency(empresa) {
      const d = empresa.rd.dept;
      const staff = d.pesquisadores + d.diretores * 1.5;
      const budgetFactor = Math.min(1.4, d.orcamentoSemanal / Math.max(1, 3000 + staff * 2000));
      d.eficiencia = CGL.Utils.clamp(
        30 + staff * 4 + (d.laboratorios || 0) * 5 + budgetFactor * 20 + (d.culturaInovacao || 40) * 0.15,
        15,
        95
      );
      return d.eficiencia;
    },

    /* ========== Projetos / árvore ========== */

    sectorId(empresa) {
      return CGL.Data.getRdSectorForSegment(empresa.segmentoId);
    },

    availableTechs(empresa) {
      this.ensureCompanyRd(empresa);
      const tree = CGL.Data.getTechTree(this.sectorId(empresa));
      const unlocked = new Set(empresa.rd.techsDesbloqueadas);
      return tree.techs.filter((t) => {
        if (unlocked.has(t.id)) return false;
        return (t.prereqs || []).every((p) => unlocked.has(p));
      });
    },

    startProject(empresa, state, techId) {
      this.ensureCompanyRd(empresa, state);
      const d = empresa.rd.dept;
      if (!d.ativo) throw new Error('Ative o departamento de P&D primeiro.');
      const ativos = empresa.rd.projetos.filter((p) => p.status === 'ativo').length;
      if (ativos >= d.maxProjetos) throw new Error(`Limite de ${d.maxProjetos} projetos simultâneos.`);
      const tech = CGL.Data.getTechById(techId);
      if (!tech) throw new Error('Tecnologia inválida.');
      if (empresa.rd.techsDesbloqueadas.includes(techId)) throw new Error('Tecnologia já desbloqueada.');
      const avail = this.availableTechs(empresa).some((t) => t.id === techId);
      if (!avail) throw new Error('Pré-requisitos não atendidos.');

      if (CGL.Finance?.debitEmpresa) {
        CGL.Finance.debitEmpresa(state, empresa.id, Math.round(tech.custo * 0.35), {
          categoria: 'pd',
          descricao: `Início projeto P&D: ${tech.nome}`
        });
      }

      const accel = this._partnershipAccel(empresa);
      const weeks = Math.max(3, Math.round(tech.semanas / (0.7 + d.eficiencia / 100) / accel));
      const project = {
        id: CGL.Utils.uuid(),
        techId: tech.id,
        nome: tech.nome,
        progresso: 0,
        semanasTotal: weeks,
        semanasDecorridas: 0,
        risco: CGL.Utils.clamp(0.15 + (tech.custo / 500000) - d.eficiencia / 400, 0.05, 0.45),
        status: 'ativo',
        custoSemanal: Math.round((tech.custo * 0.65) / weeks),
        sectorId: tech.sectorId
      };
      empresa.rd.projetos.unshift(project);
      if (empresa.rd.projetos.length > PROJECT_CAP) empresa.rd.projetos.length = PROJECT_CAP;
      this.addHistory(empresa, state, {
        tipo: 'projeto',
        titulo: 'Projeto iniciado',
        descricao: `${tech.nome} (~${weeks} sem).`
      });
      return project;
    },

    _partnershipAccel(empresa) {
      let a = 1;
      (empresa.rd.parcerias || []).filter((p) => p.status === 'ativa').forEach((p) => {
        const t = CGL.Data.getPartnershipType(p.tipoId);
        a *= t.aceleracao || 1;
      });
      return Math.min(2.2, a);
    },

    _completeProject(empresa, state, project) {
      const tech = CGL.Data.getTechById(project.techId);
      if (!tech) {
        project.status = 'fracassado';
        return;
      }
      // Chance de fracasso
      if (Math.random() < project.risco) {
        project.status = 'fracassado';
        project.progresso = 100;
        this.addHistory(empresa, state, {
          tipo: 'projeto',
          titulo: 'Projeto fracassou',
          descricao: `${tech.nome} não gerou resultados utilizáveis.`
        });
        CGL.Events?.notify?.('warning', 'P&D', `${tech.nome}: projeto fracassou.`);
        this.pushEvent(state, {
          tipo: 'projeto_fracassa',
          empresaId: empresa.id,
          titulo: 'Projeto fracassa',
          descricao: `${empresa.nomeFantasia}: ${tech.nome}`
        });
        return;
      }

      project.status = 'concluido';
      project.progresso = 100;
      if (!empresa.rd.techsDesbloqueadas.includes(tech.id)) {
        empresa.rd.techsDesbloqueadas.push(tech.id);
      }
      this._applyTechEffects(empresa, tech);
      this.addHistory(empresa, state, {
        tipo: 'projeto',
        titulo: 'Tecnologia desbloqueada',
        descricao: tech.nome
      });
      CGL.Events?.notify?.('success', 'P&D', `${tech.nome} desenvolvida!`);

      // Auto-patente se orçamento alto / cultura
      if (empresa.rd.dept.culturaInovacao >= 50 || Math.random() < 0.55) {
        try { this.filePatent(empresa, state, tech.id); } catch (e) { /* caixa */ }
      }

      // Acopla lançamento de marketing se existir pipeline ocioso
      if (CGL.Marketing?.startLaunch && Math.random() < 0.4) {
        try {
          CGL.Marketing.startLaunch(empresa, state, `Gen. ${tech.nome}`);
        } catch (e) { /* ok */ }
      }
    },

    _applyTechEffects(empresa, tech) {
      const ef = tech.efeitos || {};
      const d = empresa.rd.dept;
      if (ef.eficiencia) {
        empresa.eficiencia = CGL.Utils.clamp((empresa.eficiencia || 50) + ef.eficiencia, 10, 98);
        empresa.rd.boostEficiencia = (empresa.rd.boostEficiencia || 0) + ef.eficiencia * 0.5;
      }
      if (ef.nivelTech) {
        d.nivelTech = CGL.Utils.clamp(d.nivelTech + ef.nivelTech, 5, 99);
        empresa.nivelTech = d.nivelTech;
      }
      if (ef.qualidade) {
        empresa.rd.boostQualidade = (empresa.rd.boostQualidade || 0) + ef.qualidade;
        if (empresa.reputacao) {
          empresa.reputacao.qualidade = CGL.Utils.clamp(
            (empresa.reputacao.qualidade || 50) + ef.qualidade * 0.6, 0, 100
          );
        }
        if (empresa.marketing) {
          empresa.marketing.qualidade = CGL.Utils.clamp(
            (empresa.marketing.qualidade || 50) + ef.qualidade * 0.5, 0, 100
          );
        }
      }
      if (ef.custoProd) {
        empresa.rd.reducaoCusto = CGL.Utils.clamp(
          (empresa.rd.reducaoCusto || 0) + Math.abs(ef.custoProd), 0, 0.35
        );
      }
      if (ef.inovacao) {
        d.culturaInovacao = CGL.Utils.clamp(d.culturaInovacao + ef.inovacao * 0.5, 0, 100);
        empresa.rd.boostDemanda = CGL.Utils.clamp(
          (empresa.rd.boostDemanda || 0) + ef.inovacao * 0.008, 0, 0.45
        );
      }
      // Modernização reduz obsolescência
      empresa.rd.obsolescencia = CGL.Utils.clamp((empresa.rd.obsolescencia || 15) - 8, 0, 100);
    },

    /* ========== Patentes ========== */

    filePatent(empresa, state, techId) {
      this.ensureRd(state);
      this.ensureCompanyRd(empresa, state);
      const tech = CGL.Data.getTechById(techId);
      if (!tech) throw new Error('Tech inválida.');
      if (!empresa.rd.techsDesbloqueadas.includes(techId)) {
        throw new Error('Desenvolva a tecnologia antes de patentear.');
      }
      if (empresa.rd.patentes.some((p) => p.techId === techId && p.status === 'ativa')) {
        throw new Error('Já existe patente ativa.');
      }
      const custo = Math.round(tech.custo * 0.12);
      if (CGL.Finance?.debitEmpresa) {
        CGL.Finance.debitEmpresa(state, empresa.id, custo, {
          categoria: 'pd',
          descricao: `Registro de patente: ${tech.nome}`
        });
      }
      const patent = {
        id: CGL.Utils.uuid(),
        techId,
        nome: tech.nome,
        empresaId: empresa.id,
        status: 'ativa',
        semanasRestantes: CGL.Data.patentDurationWeeks,
        valorMercado: Math.round(tech.custo * 1.4),
        licencasAtivas: 0,
        contestada: false
      };
      empresa.rd.patentes.unshift(patent);
      if (empresa.rd.patentes.length > PATENT_CAP) empresa.rd.patentes.length = PATENT_CAP;
      state.rd.patentesGlobais.unshift({
        id: patent.id,
        techId,
        empresaId: empresa.id,
        nome: tech.nome,
        status: 'ativa',
        valorMercado: patent.valorMercado
      });
      this.addHistory(empresa, state, {
        tipo: 'patente',
        titulo: 'Patente registrada',
        descricao: tech.nome
      });
      return patent;
    },

    licenseTech(buyer, state, patentId) {
      this.ensureRd(state);
      this.ensureCompanyRd(buyer, state);
      const globalPat = (state.rd.patentesGlobais || []).find((p) => p.id === patentId && p.status === 'ativa');
      if (!globalPat) throw new Error('Patente não disponível.');
      if (globalPat.empresaId === buyer.id) throw new Error('Não pode licenciar a própria patente.');
      const owner = CGL.Company.getById?.(state, globalPat.empresaId)
        || (state.companies?.empresas || []).find((e) => e.id === globalPat.empresaId);
      if (!owner) throw new Error('Titular não encontrado.');
      this.ensureCompanyRd(owner, state);
      const patent = owner.rd.patentes.find((p) => p.id === patentId);
      if (!patent || patent.status !== 'ativa') throw new Error('Patente inativa.');

      const tech = CGL.Data.getTechById(patent.techId);
      const feeUpfront = Math.round((patent.valorMercado || tech.custo) * 0.2);
      const feeSem = Math.round((patent.valorMercado || tech.custo) * (CGL.Data.licenseFeeMult || 0.08) / 52);

      if (CGL.Finance?.debitEmpresa) {
        CGL.Finance.debitEmpresa(state, buyer.id, feeUpfront, {
          categoria: 'pd',
          descricao: `Licença tecnológica: ${patent.nome}`
        });
      }
      if (CGL.Finance?.creditEmpresa) {
        CGL.Finance.creditEmpresa(state, owner.id, feeUpfront, {
          categoria: 'pd',
          descricao: `Receita de licença: ${patent.nome}`
        });
      }

      const lic = {
        id: CGL.Utils.uuid(),
        patentId,
        techId: patent.techId,
        deEmpresaId: owner.id,
        paraEmpresaId: buyer.id,
        feeSemanal: feeSem,
        semanasRestantes: patent.semanasRestantes,
        status: 'ativa'
      };
      buyer.rd.licencasCompradas.unshift(lic);
      owner.rd.licencasVendidas.unshift({ ...lic });
      patent.licencasAtivas = (patent.licencasAtivas || 0) + 1;

      // Licenciado ganha efeitos parciais
      if (tech && !buyer.rd.techsDesbloqueadas.includes(tech.id)) {
        const partial = {
          ...tech,
          efeitos: Object.fromEntries(
            Object.entries(tech.efeitos || {}).map(([k, v]) => [k, typeof v === 'number' ? v * 0.55 : v])
          )
        };
        this._applyTechEffects(buyer, partial);
        buyer.rd.techsDesbloqueadas.push(tech.id + '_lic');
      }

      this.addHistory(buyer, state, {
        tipo: 'licenca',
        titulo: 'Licença adquirida',
        descricao: patent.nome
      });
      this.addHistory(owner, state, {
        tipo: 'licenca',
        titulo: 'Licença vendida',
        descricao: `${patent.nome} → ${buyer.nomeFantasia}`
      });
      return lic;
    },

    buyPatent(buyer, state, patentId) {
      this.ensureRd(state);
      this.ensureCompanyRd(buyer, state);
      const globalPat = (state.rd.patentesGlobais || []).find((p) => p.id === patentId && p.status === 'ativa');
      if (!globalPat) throw new Error('Patente indisponível.');
      const owner = (state.companies?.empresas || []).find((e) => e.id === globalPat.empresaId);
      if (!owner || owner.id === buyer.id) throw new Error('Compra inválida.');
      this.ensureCompanyRd(owner, state);
      const patent = owner.rd.patentes.find((p) => p.id === patentId);
      if (!patent || patent.status !== 'ativa') throw new Error('Patente inativa.');

      const price = Math.round(patent.valorMercado * 1.1);
      if (CGL.Finance?.debitEmpresa) {
        CGL.Finance.debitEmpresa(state, buyer.id, price, {
          categoria: 'pd',
          descricao: `Compra de patente: ${patent.nome}`
        });
      }
      if (CGL.Finance?.creditEmpresa) {
        CGL.Finance.creditEmpresa(state, owner.id, price, {
          categoria: 'pd',
          descricao: `Venda de patente: ${patent.nome}`
        });
      }

      patent.status = 'transferida';
      globalPat.empresaId = buyer.id;
      globalPat.status = 'ativa';
      const transferred = {
        ...patent,
        id: CGL.Utils.uuid(),
        empresaId: buyer.id,
        status: 'ativa'
      };
      buyer.rd.patentes.unshift(transferred);
      if (!buyer.rd.techsDesbloqueadas.includes(patent.techId)) {
        buyer.rd.techsDesbloqueadas.push(patent.techId);
        const tech = CGL.Data.getTechById(patent.techId);
        if (tech) this._applyTechEffects(buyer, tech);
      }
      this.addHistory(buyer, state, { tipo: 'patente', titulo: 'Patente comprada', descricao: patent.nome });
      this.addHistory(owner, state, { tipo: 'patente', titulo: 'Patente vendida', descricao: patent.nome });
      return transferred;
    },

    challengePatent(challenger, state, patentId) {
      this.ensureCompanyRd(challenger, state);
      const globalPat = (state.rd.patentesGlobais || []).find((p) => p.id === patentId && p.status === 'ativa');
      if (!globalPat) throw new Error('Patente não encontrada.');
      const owner = (state.companies?.empresas || []).find((e) => e.id === globalPat.empresaId);
      if (!owner || owner.id === challenger.id) throw new Error('Contestação inválida.');
      this.ensureCompanyRd(owner, state);
      const patent = owner.rd.patentes.find((p) => p.id === patentId);
      if (!patent) throw new Error('Patente local ausente.');

      const custo = 40000;
      if (CGL.Finance?.debitEmpresa) {
        CGL.Finance.debitEmpresa(state, challenger.id, custo, {
          categoria: 'pd',
          descricao: `Contestação judicial: ${patent.nome}`
        });
      }
      patent.contestada = true;
      const success = Math.random() < 0.35 + (challenger.rd.dept.nivelTech - owner.rd.dept.nivelTech) / 200;
      if (success) {
        patent.status = 'anulada';
        globalPat.status = 'anulada';
        this.addHistory(challenger, state, {
          tipo: 'patente',
          titulo: 'Patente anulada',
          descricao: `Contestou com sucesso: ${patent.nome}`
        });
        CGL.Events?.notify?.('success', 'Patente', `${patent.nome} anulada judicialmente.`);
      } else {
        if (challenger.reputacao) {
          challenger.reputacao.geral = CGL.Utils.clamp((challenger.reputacao.geral || 50) - 3, 0, 100);
        }
        this.addHistory(challenger, state, {
          tipo: 'patente',
          titulo: 'Contestação falhou',
          descricao: patent.nome
        });
        CGL.Events?.notify?.('warning', 'Patente', 'Contestação judicial sem sucesso.');
      }
      return { success };
    },

    /* ========== Espionagem ========== */

    attemptEspionage(empresa, state, targetId, intensidade = 'media') {
      this.ensureCompanyRd(empresa, state);
      const target = (state.companies?.empresas || []).find((e) => e.id === targetId);
      if (!target || target.id === empresa.id) throw new Error('Alvo inválido.');
      this.ensureCompanyRd(target, state);
      const risk = CGL.Data.espionageRisks[intensidade] || CGL.Data.espionageRisks.media;
      const etica = empresa.rd.dept.etica || 70;
      if (etica > 85 && intensidade !== 'baixa') {
        throw new Error('Ética corporativa alta impede espionagem agressiva.');
      }

      if (CGL.Finance?.debitEmpresa) {
        CGL.Finance.debitEmpresa(state, empresa.id, risk.custo, {
          categoria: 'pd',
          descricao: `Operação de inteligência tecnológica (${intensidade})`
        });
      }

      // Ética cai
      empresa.rd.dept.etica = CGL.Utils.clamp(etica - (intensidade === 'alta' ? 12 : intensidade === 'media' ? 6 : 3), 0, 100);

      const caught = Math.random() < risk.multaChance + (100 - etica) / 500;
      if (caught) {
        const multa = risk.custo * 3;
        if (CGL.Finance?.debitEmpresa) {
          try {
            CGL.Finance.debitEmpresa(state, empresa.id, multa, {
              categoria: 'multa',
              descricao: 'Multa por espionagem industrial'
            });
          } catch (e) { /* ok */ }
        }
        if (empresa.reputacao) {
          empresa.reputacao.geral = CGL.Utils.clamp(
            (empresa.reputacao.geral || 50) - risk.reputacaoRisk, 0, 100
          );
          empresa.reputacao.social = CGL.Utils.clamp(
            (empresa.reputacao.social || 50) - risk.reputacaoRisk * 0.8, 0, 100
          );
        }
        if (empresa.marketing?.marca) {
          empresa.marketing.marca.reputacao = CGL.Utils.clamp(
            empresa.marketing.marca.reputacao - risk.reputacaoRisk, 0, 100
          );
        }
        this.addHistory(empresa, state, {
          tipo: 'espionagem',
          titulo: 'Espionagem descoberta',
          descricao: `Operação contra ${target.nomeFantasia} — multa e dano reputacional.`
        });
        this.pushEvent(state, {
          tipo: 'espionagem',
          empresaId: empresa.id,
          titulo: 'Escândalo de espionagem',
          descricao: `${empresa.nomeFantasia} investigada.`
        });
        CGL.Events?.notify?.('error', 'Espionagem', 'Operação descoberta — multa e reputação.');
        return { success: false, caught: true };
      }

      const success = Math.random() < risk.chance + (empresa.rd.dept.eficiencia / 400);
      if (success) {
        const secret = target.rd.techsDesbloqueadas.find(
          (t) => !empresa.rd.techsDesbloqueadas.includes(t) && !String(t).endsWith('_lic')
        );
        if (secret) {
          const tech = CGL.Data.getTechById(secret);
          if (tech) {
            // Progresso parcial em projeto ou desbloqueio soft
            const existing = empresa.rd.projetos.find((p) => p.techId === secret && p.status === 'ativo');
            if (existing) {
              existing.progresso = CGL.Utils.clamp(existing.progresso + 35, 0, 99);
            } else if (!empresa.rd.techsDesbloqueadas.includes(secret)) {
              // Insight: reduz semanas se iniciar depois — marca como insight
              empresa.rd.insights = empresa.rd.insights || {};
              empresa.rd.insights[secret] = 0.3;
            }
            this.addHistory(empresa, state, {
              tipo: 'espionagem',
              titulo: 'Inteligência obtida',
              descricao: `Dados sobre ${tech.nome}.`
            });
          }
        } else {
          empresa.rd.dept.nivelTech = CGL.Utils.clamp(empresa.rd.dept.nivelTech + 2, 5, 99);
        }
        CGL.Events?.notify?.('info', 'Espionagem', 'Informações tecnológicas obtidas.');
        return { success: true, caught: false };
      }

      this.addHistory(empresa, state, {
        tipo: 'espionagem',
        titulo: 'Espionagem sem resultado',
        descricao: `Falha contra ${target.nomeFantasia}.`
      });
      return { success: false, caught: false };
    },

    /* ========== Parcerias ========== */

    startPartnership(empresa, state, tipoId, duracao = 12) {
      this.ensureCompanyRd(empresa, state);
      if (!empresa.rd.dept.ativo) throw new Error('Ative P&D primeiro.');
      const tipo = CGL.Data.getPartnershipType(tipoId);
      const p = {
        id: CGL.Utils.uuid(),
        tipoId: tipo.id,
        nome: tipo.nome,
        semanasRestantes: duracao,
        status: 'ativa',
        custoSemanal: tipo.custoSem,
        shareResults: tipo.shareResults
      };
      empresa.rd.parcerias.unshift(p);
      if (empresa.reputacao) {
        empresa.reputacao.geral = CGL.Utils.clamp(
          (empresa.reputacao.geral || 50) + (tipo.reputacao || 0), 0, 100
        );
      }
      if (tipo.incentivo) {
        empresa.rd.incentivoFiscal = Math.max(empresa.rd.incentivoFiscal || 0, tipo.incentivo);
      }
      this.addHistory(empresa, state, {
        tipo: 'parceria',
        titulo: `Parceria: ${tipo.nome}`,
        descricao: `${duracao} semanas.`
      });
      return p;
    },

    /* ========== Produtos / gerações ========== */

    launchProduct(empresa, state, opts = {}) {
      this.ensureCompanyRd(empresa, state);
      const nomeBase = (opts.nome || 'Produto').slice(0, 40);
      const sameFamily = empresa.rd.produtos.filter((p) => p.familia === nomeBase);
      const geracao = sameFamily.length + 1;
      const techBoost = (empresa.rd.dept.nivelTech || 30) / 100;
      const product = {
        id: CGL.Utils.uuid(),
        familia: nomeBase,
        nome: `${nomeBase} Geração ${geracao}`,
        geracao,
        ciclo: 'lancamento',
        semanasNoCiclo: 0,
        status: 'ativo',
        desempenho: CGL.Utils.clamp(50 + techBoost * 30 + geracao * 3, 20, 98),
        custoUnit: CGL.Utils.clamp(1 - geracao * 0.04 - (empresa.rd.reducaoCusto || 0), 0.5, 1),
        valorPercebido: CGL.Utils.clamp(45 + techBoost * 35 + geracao * 4, 20, 99)
      };
      // Gerações antigas entram em declínio acelerado
      sameFamily.forEach((old) => {
        if (old.status === 'ativo' && ['lancamento', 'crescimento', 'maturidade'].includes(old.ciclo)) {
          old.ciclo = 'declinio';
          old.semanasNoCiclo = 0;
        }
      });
      empresa.rd.produtos.unshift(product);
      if (empresa.rd.produtos.length > PRODUCT_CAP) empresa.rd.produtos.length = PRODUCT_CAP;

      // Wire marketing launch pipeline
      if (CGL.Marketing?.startLaunch) {
        try { CGL.Marketing.startLaunch(empresa, state, product.nome); } catch (e) { /* ok */ }
      }
      if (empresa.marketing?.marca) {
        empresa.marketing.marca.valorPercebido = CGL.Utils.clamp(
          empresa.marketing.marca.valorPercebido + 3 + geracao, 0, 100
        );
      }
      this.addHistory(empresa, state, {
        tipo: 'produto',
        titulo: 'Produto lançado',
        descricao: product.nome
      });
      return product;
    },

    discontinueProduct(empresa, state, productId) {
      this.ensureCompanyRd(empresa, state);
      const p = empresa.rd.produtos.find((x) => x.id === productId);
      if (!p) throw new Error('Produto não encontrado.');
      p.status = 'descontinuado';
      p.ciclo = 'descontinuacao';
      this.addHistory(empresa, state, {
        tipo: 'produto',
        titulo: 'Produto descontinuado',
        descricao: p.nome
      });
      return p;
    },

    /* ========== Índice de inovação ========== */

    calcInnovationIndex(empresa, state) {
      this.ensureCompanyRd(empresa, state);
      const r = empresa.rd;
      const d = r.dept;
      const patents = r.patentes.filter((p) => p.status === 'ativa').length;
      const techs = r.techsDesbloqueadas.filter((t) => !String(t).endsWith('_lic')).length;
      const products = r.produtos.filter((p) => p.status === 'ativo').length;
      const invest = Math.min(40, (d.orcamentoSemanal || 0) / 2000);
      const score = CGL.Utils.clamp(
        (d.ativo ? 10 : 0) +
        techs * 4 +
        patents * 5 +
        products * 3 +
        invest +
        (d.nivelTech || 0) * 0.25 +
        (d.culturaInovacao || 0) * 0.2 -
        (r.obsolescencia || 0) * 0.2,
        0,
        100
      );
      r.indiceInovacao = Math.round(score * 10) / 10;
      return r.indiceInovacao;
    },

    productDemandBoost(empresa) {
      this.ensureCompanyRd(empresa);
      let boost = 1;
      empresa.rd.produtos.filter((p) => p.status === 'ativo').forEach((p) => {
        const stage = CGL.Data.getLifecycleStage(p.ciclo);
        boost += ((stage.demandaMult || 1) - 1) * 0.35 * (p.desempenho / 100);
      });
      boost += empresa.rd.boostDemanda || 0;
      // Obsolescência penaliza
      boost *= 1 - (empresa.rd.obsolescencia || 0) / 250;
      return CGL.Utils.clamp(boost, 0.5, 1.8);
    },

    efficiencyMult(empresa) {
      this.ensureCompanyRd(empresa);
      const obs = empresa.rd.obsolescencia || 0;
      const boost = (empresa.rd.boostEficiencia || 0) / 100;
      return CGL.Utils.clamp(1 + boost - obs / 200, 0.55, 1.45);
    },

    costReduction(empresa) {
      this.ensureCompanyRd(empresa);
      const base = empresa.rd.reducaoCusto || 0;
      const obsPenalty = (empresa.rd.obsolescencia || 0) / 400;
      return CGL.Utils.clamp(base - obsPenalty, 0, 0.4);
    },

    /* ========== Custos / finance ========== */

    weeklyRdCostEstimate(empresa) {
      this.ensureCompanyRd(empresa);
      const d = empresa.rd.dept;
      if (!d.ativo) return 0;
      let c = d.orcamentoSemanal || 0;
      c += (d.pesquisadores || 0) * 3500;
      c += (d.diretores || 0) * 8000;
      c += (d.laboratorios || 0) * 4000;
      empresa.rd.projetos.filter((p) => p.status === 'ativo').forEach((p) => {
        c += p.custoSemanal || 0;
      });
      empresa.rd.parcerias.filter((p) => p.status === 'ativa').forEach((p) => {
        c += p.custoSemanal || 0;
      });
      empresa.rd.licencasCompradas.filter((l) => l.status === 'ativa').forEach((l) => {
        c += l.feeSemanal || 0;
      });
      // Incentivo fiscal reduz
      c *= 1 - Math.min(0.25, empresa.rd.incentivoFiscal || 0);
      return Math.round(c);
    },

    syncFinanceHook(empresa, state) {
      const custo = this.weeklyRdCostEstimate(empresa);
      empresa.rd.custoSemanal = custo;
      if (CGL.Finance?.ensureCompanyFinance) {
        try {
          const fin = CGL.Finance.ensureCompanyFinance(empresa, state);
          fin._rdCustoSemanal = custo;
        } catch (e) { /* ok */ }
      }
      return custo;
    },

    /* ========== Tick semanal ========== */

    weeklyTick(state) {
      this.ensureRd(state);
      const rd = state.rd;
      const semana = state.world?.semanaAtual || 0;
      if (rd.semanaUltimoTick === semana) return rd;
      rd.semanaUltimoTick = semana;

      (state.companies?.empresas || []).forEach((empresa) => {
        if (!empresa.ativa) return;
        this.ensureCompanyRd(empresa, state);
        if (empresa.concorrente) {
          // IA leve: obsolescência e tech drift
          empresa.rd.obsolescencia = CGL.Utils.clamp(
            (empresa.rd.obsolescencia || 20) + CGL.Utils.randomFloat(0.1, 0.5), 0, 100
          );
          return;
        }

        const d = empresa.rd.dept;
        if (d.ativo) {
          this._recalcDeptEfficiency(empresa);
          this._tickProjects(empresa, state);
          this._tickPatents(empresa, state);
          this._tickLicenses(empresa, state);
          this._tickPartnerships(empresa, state);
          this._tickProducts(empresa, state);
          // Cultura de inovação sobe com investimento
          d.culturaInovacao = CGL.Utils.clamp(
            d.culturaInovacao + (d.orcamentoSemanal > 8000 ? 0.3 : -0.15),
            0,
            100
          );
        }

        // Obsolescência natural (máquinas/processos)
        const modernizing = d.ativo && (d.orcamentoSemanal > 5000 || empresa.rd.projetos.some((p) => p.status === 'ativo'));
        empresa.rd.obsolescencia = CGL.Utils.clamp(
          empresa.rd.obsolescencia + (modernizing ? CGL.Utils.randomFloat(-0.4, 0.2) : CGL.Utils.randomFloat(0.25, 0.7)),
          0,
          100
        );

        // Aplica efeitos em eficiência/qualidade da empresa
        const effM = this.efficiencyMult(empresa);
        empresa.eficiencia = CGL.Utils.clamp(
          (empresa.eficiencia || 50) * 0.97 + (50 * effM) * 0.03,
          10,
          98
        );
        if (empresa.rd.obsolescencia > 60 && empresa.reputacao) {
          empresa.reputacao.qualidade = CGL.Utils.clamp(
            empresa.reputacao.qualidade - 0.3, 0, 100
          );
        }

        this.calcInnovationIndex(empresa, state);
        this.syncFinanceHook(empresa, state);

        // Índice alimenta reputação / marketing leve
        if (empresa.reputacao && empresa.rd.indiceInovacao > 50) {
          empresa.reputacao.geral = CGL.Utils.clamp(
            empresa.reputacao.geral + 0.05, 0, 100
          );
        }
        if (empresa.marketing?.marca && empresa.rd.indiceInovacao > 55) {
          empresa.marketing.marca.valorPercebido = CGL.Utils.clamp(
            empresa.marketing.marca.valorPercebido + 0.08, 0, 100
          );
        }

        // Decay incentivo fiscal
        if (empresa.rd.incentivoFiscal > 0) {
          empresa.rd.incentivoFiscal = Math.max(0, empresa.rd.incentivoFiscal - 0.005);
        }
      });

      this._tickTechEvents(state);
      this._updateRanking(state);
      return rd;
    },

    _tickProjects(empresa, state) {
      const d = empresa.rd.dept;
      const insightBonus = empresa.rd.insights || {};
      empresa.rd.projetos.forEach((p) => {
        if (p.status !== 'ativo') return;
        const weeklyGain = (100 / p.semanasTotal) * (0.85 + d.eficiencia / 200);
        const bonus = insightBonus[p.techId] ? 1 + insightBonus[p.techId] : 1;
        p.progresso = CGL.Utils.clamp(p.progresso + weeklyGain * bonus, 0, 100);
        p.semanasDecorridas = (p.semanasDecorridas || 0) + 1;
        if (p.progresso >= 100 || p.semanasDecorridas >= p.semanasTotal) {
          this._completeProject(empresa, state, p);
        }
      });
    },

    _tickPatents(empresa, state) {
      empresa.rd.patentes.forEach((p) => {
        if (p.status !== 'ativa') return;
        p.semanasRestantes = (p.semanasRestantes || 0) - 1;
        if (p.semanasRestantes <= 0) {
          p.status = 'expirada';
          const g = (state.rd.patentesGlobais || []).find((x) => x.id === p.id);
          if (g) g.status = 'expirada';
          this.addHistory(empresa, state, {
            tipo: 'patente',
            titulo: 'Patente expirou',
            descricao: p.nome
          });
          this.pushEvent(state, {
            tipo: 'patente_expira',
            empresaId: empresa.id,
            titulo: 'Patente expirou',
            descricao: `${p.nome} (${empresa.nomeFantasia})`
          });
        }
      });
    },

    _tickLicenses(empresa, state) {
      empresa.rd.licencasCompradas.forEach((l) => {
        if (l.status !== 'ativa') return;
        l.semanasRestantes = (l.semanasRestantes || 0) - 1;
        // Receita para titular
        const owner = (state.companies?.empresas || []).find((e) => e.id === l.deEmpresaId);
        if (owner && CGL.Finance?.creditEmpresa && (l.feeSemanal || 0) > 0) {
          try {
            CGL.Finance.creditEmpresa(state, owner.id, l.feeSemanal, {
              categoria: 'pd',
              descricao: `Royalty licença ${l.techId}`
            });
          } catch (e) { /* ok */ }
        }
        if (l.semanasRestantes <= 0) l.status = 'encerrada';
      });
      empresa.rd.licencasVendidas.forEach((l) => {
        if (l.status === 'ativa') {
          l.semanasRestantes = (l.semanasRestantes || 0) - 1;
          if (l.semanasRestantes <= 0) l.status = 'encerrada';
        }
      });
    },

    _tickPartnerships(empresa, state) {
      empresa.rd.parcerias.forEach((p) => {
        if (p.status !== 'ativa') return;
        p.semanasRestantes = (p.semanasRestantes || 0) - 1;
        if (p.semanasRestantes <= 0) {
          p.status = 'encerrada';
          this.addHistory(empresa, state, {
            tipo: 'parceria',
            titulo: 'Parceria encerrada',
            descricao: p.nome
          });
        }
      });
    },

    _tickProducts(empresa, state) {
      const stages = CGL.Data.productLifecycle || [];
      empresa.rd.produtos.forEach((prod) => {
        if (prod.status !== 'ativo') return;
        const stage = CGL.Data.getLifecycleStage(prod.ciclo);
        if (!stage || stage.id === 'descontinuacao') {
          prod.status = 'descontinuado';
          return;
        }
        prod.semanasNoCiclo = (prod.semanasNoCiclo || 0) + 1;
        // Drift de competitividade
        prod.desempenho = CGL.Utils.clamp(
          prod.desempenho - (prod.ciclo === 'declinio' ? 1.2 : 0.15),
          5,
          98
        );
        if (stage.semanas > 0 && prod.semanasNoCiclo >= stage.semanas) {
          const idx = stages.findIndex((s) => s.id === prod.ciclo);
          if (idx >= 0 && idx < stages.length - 1) {
            prod.ciclo = stages[idx + 1].id;
            prod.semanasNoCiclo = 0;
            if (prod.ciclo === 'descontinuacao') {
              prod.status = 'descontinuado';
              this.addHistory(empresa, state, {
                tipo: 'produto',
                titulo: 'Produto descontinuado (ciclo)',
                descricao: prod.nome
              });
            }
          }
        }
      });
    },

    _tickTechEvents(state) {
      if (Math.random() > 0.12) return;
      const defs = CGL.Data.techEvents || [];
      const pool = [];
      defs.forEach((d) => {
        for (let i = 0; i < (d.peso || 1); i++) pool.push(d);
      });
      const ev = CGL.Utils.pick(pool);
      if (!ev) return;
      const companies = CGL.Company.listPlayerCompanies(state);
      if (!companies.length) return;
      const emp = CGL.Utils.pick(companies);
      this.ensureCompanyRd(emp, state);

      switch (ev.id) {
        case 'descoberta':
          emp.rd.projetos.filter((p) => p.status === 'ativo').forEach((p) => {
            p.custoSemanal = Math.round((p.custoSemanal || 0) * 0.85);
            p.progresso = CGL.Utils.clamp(p.progresso + 8, 0, 99);
          });
          break;
        case 'incentivo_gov':
          emp.rd.incentivoFiscal = Math.max(emp.rd.incentivoFiscal || 0, 0.15);
          break;
        case 'pesquisador_famoso':
          if (emp.rd.dept.ativo) {
            emp.rd.dept.pesquisadores += 1;
            emp.rd.dept.eficiencia = CGL.Utils.clamp(emp.rd.dept.eficiencia + 5, 15, 95);
          }
          break;
        case 'projeto_fracassa': {
          const ativo = emp.rd.projetos.find((p) => p.status === 'ativo');
          if (ativo) {
            ativo.status = 'fracassado';
            CGL.Events?.notify?.('warning', 'P&D', `${ativo.nome} fracassou.`);
          }
          break;
        }
        case 'concorrente_rev':
          emp.rd.obsolescencia = CGL.Utils.clamp(emp.rd.obsolescencia + 8, 0, 100);
          emp.rd.boostDemanda = Math.max(0, (emp.rd.boostDemanda || 0) - 0.05);
          break;
        case 'tech_obsoleta':
          emp.rd.obsolescencia = CGL.Utils.clamp(emp.rd.obsolescencia + 12, 0, 100);
          break;
        case 'invencao_historica':
          emp.rd.dept.nivelTech = CGL.Utils.clamp(emp.rd.dept.nivelTech + 8, 5, 99);
          emp.nivelTech = emp.rd.dept.nivelTech;
          emp.rd.indiceInovacao = CGL.Utils.clamp(emp.rd.indiceInovacao + 10, 0, 100);
          break;
        case 'uni_parceria':
        case 'startup_disrupt':
          // Oportunidade — só registra; jogador pode iniciar parceria na UI
          break;
        case 'patente_expira': {
          const pat = emp.rd.patentes.find((p) => p.status === 'ativa');
          if (pat) pat.semanasRestantes = Math.min(pat.semanasRestantes, 2);
          break;
        }
        default:
          break;
      }

      this.pushEvent(state, {
        tipo: ev.id,
        empresaId: emp.id,
        titulo: ev.nome,
        descricao: `${emp.nomeFantasia}: ${ev.desc}`
      });
      CGL.Events?.notify?.(
        ev.tipo === 'negativo' ? 'warning' : 'info',
        'Tech',
        `${ev.nome}: ${emp.nomeFantasia}`
      );
    },

    _updateRanking(state) {
      const list = (state.companies?.empresas || [])
        .filter((e) => e.ativa && !e.concorrente)
        .map((e) => {
          this.calcInnovationIndex(e, state);
          return {
            empresaId: e.id,
            nome: e.nomeFantasia,
            indice: e.rd.indiceInovacao,
            patentes: e.rd.patentes.filter((p) => p.status === 'ativa').length,
            techs: e.rd.techsDesbloqueadas.filter((t) => !String(t).endsWith('_lic')).length
          };
        })
        .sort((a, b) => b.indice - a.indice);
      state.rd.ranking = list;
    },

    /* ========== Dashboard ========== */

    dashboardSummary(state) {
      this.ensureRd(state);
      const companies = CGL.Company.listPlayerCompanies(state);
      let inov = 0;
      let projetos = 0;
      let patentes = 0;
      let obs = 0;
      companies.forEach((e) => {
        this.ensureCompanyRd(e, state);
        this.calcInnovationIndex(e, state);
        inov += e.rd.indiceInovacao;
        projetos += e.rd.projetos.filter((p) => p.status === 'ativo').length;
        patentes += e.rd.patentes.filter((p) => p.status === 'ativa').length;
        obs += e.rd.obsolescencia || 0;
      });
      const n = Math.max(1, companies.length);
      return {
        empresas: companies.length,
        inovacaoMedia: Math.round(inov / n),
        projetosAtivos: projetos,
        patentesAtivas: patentes,
        obsolescenciaMedia: Math.round(obs / n),
        eventos: (state.rd.eventos || []).length
      };
    }
  };

  global.CGL = global.CGL || {};
  global.CGL.Rd = Rd;
})(typeof window !== 'undefined' ? window : globalThis);
