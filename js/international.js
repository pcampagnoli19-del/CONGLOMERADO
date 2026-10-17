/**
 * CONGLOMERADO — Internacionalização e comércio exterior (Fase 11)
 * Países, entrada, câmbio, EXIM, subsidiárias, riscos geopolíticos e ranking.
 */
(function (global) {
  'use strict';

  const EVENT_CAP = 50;
  const HISTORY_CAP = 60;
  const FX_HIST_CAP = 52;
  const ENTRY_CAP = 20;
  const SUB_CAP = 16;
  const EXIM_CAP = 40;
  const CENTER_CAP = 12;

  const International = {
    /* ========== Bootstrap ========== */

    createEmptyIntlState() {
      const taxas = {};
      (CGL.Data.countries || []).forEach((c) => {
        taxas[c.codigoMoeda] = c.taxaUsd;
      });
      return {
        version: 11,
        semanaUltimoTick: 0,
        taxas, // moeda → unidades por 1 USD
        historicoFx: [],
        acordos: (CGL.Data.tradeAgreements || []).map((a) => ({
          id: a.id, ativo: !!a.ativo, tarifaMult: a.tarifaMult
        })),
        eventos: [],
        ranking: [],
        buffsAtivos: [],
        repatriacaoBase: 0.15, // imposto sobre remessa
        volatilidadeFx: 1
      };
    },

    ensureInternational(state) {
      if (!state.international || typeof state.international !== 'object') {
        state.international = this.createEmptyIntlState();
      } else {
        const base = this.createEmptyIntlState();
        const taxas = { ...base.taxas, ...(state.international.taxas || {}) };
        state.international = {
          ...base,
          ...state.international,
          taxas,
          historicoFx: Array.isArray(state.international.historicoFx)
            ? state.international.historicoFx : [],
          acordos: Array.isArray(state.international.acordos) && state.international.acordos.length
            ? state.international.acordos : base.acordos,
          eventos: Array.isArray(state.international.eventos) ? state.international.eventos : [],
          ranking: Array.isArray(state.international.ranking) ? state.international.ranking : [],
          buffsAtivos: Array.isArray(state.international.buffsAtivos)
            ? state.international.buffsAtivos : [],
          version: 11
        };
      }
      // Alinha BRL com economia global se disponível
      if (state.economy?.cambioUSD) {
        state.international.taxas.BRL = state.economy.cambioUSD;
      }
      return state.international;
    },

    ensureCompanyIntl(empresa, state) {
      if (!empresa) return null;
      if (!empresa.international || typeof empresa.international !== 'object') {
        empresa.international = {};
      }
      const I = empresa.international;
      if (!Array.isArray(I.entradas)) I.entradas = [];
      if (!Array.isArray(I.subsidiarias)) I.subsidiarias = [];
      if (!Array.isArray(I.operacoesExim)) I.operacoesExim = [];
      if (!Array.isArray(I.centros)) I.centros = [];
      if (!Array.isArray(I.cargosGlobais)) I.cargosGlobais = [];
      if (!I.adaptacaoCultural || typeof I.adaptacaoCultural !== 'object') I.adaptacaoCultural = {};
      if (!Array.isArray(I.historico)) I.historico = [];
      if (!I.kpis) I.kpis = {};
      if (I.receitaExport == null) I.receitaExport = 0;
      if (I.custoImport == null) I.custoImport = 0;
      if (I.custoSemanal == null) I.custoSemanal = 0;
      if (I.receitaIntl == null) I.receitaIntl = 0;
      if (I.exposicaoCambial == null) I.exposicaoCambial = 0;
      if (I.ganhoCambial == null) I.ganhoCambial = 0;
      if (I.presencaPaises == null) I.presencaPaises = 0;
      if (I.seeded == null) I.seeded = false;
      return I;
    },

    migrateAll(state) {
      this.ensureInternational(state);
      (state.companies?.empresas || []).forEach((e) => {
        this.ensureCompanyIntl(e, state);
        e.international.seeded = true;
      });
      if (state.finance?.pessoal) state.finance.pessoal.version = 11;
      (state.companies?.empresas || []).forEach((e) => {
        if (e.finance) e.finance.version = 11;
      });
      return state;
    },

    onCompanyCreated(empresa, state) {
      this.ensureInternational(state);
      this.ensureCompanyIntl(empresa, state);
      empresa.international.seeded = true;
    },

    /* ========== Câmbio ========== */

    /** Taxa local → BRL (1 unidade moeda local em R$) */
    rateToBRL(state, codigoMoeda) {
      this.ensureInternational(state);
      const taxas = state.international.taxas;
      const brlPerUsd = taxas.BRL || state.economy?.cambioUSD || 5.2;
      if (codigoMoeda === 'BRL') return 1;
      const localPerUsd = taxas[codigoMoeda];
      if (!localPerUsd || localPerUsd <= 0) return brlPerUsd; // fallback: trata como USD
      // 1 local = (1/localPerUsd) USD * brlPerUsd
      return brlPerUsd / localPerUsd;
    },

    /** Converte valor em moeda local para BRL */
    toBRL(state, valorLocal, codigoMoeda) {
      return Math.round((Number(valorLocal) || 0) * this.rateToBRL(state, codigoMoeda));
    },

    /** Snapshot FX atual */
    fxSnapshot(state) {
      this.ensureInternational(state);
      const taxas = state.international.taxas;
      return {
        semana: state.world?.semanaAtual || 0,
        BRL: taxas.BRL,
        USD: 1,
        EUR: taxas.EUR,
        CNY: taxas.CNY,
        JPY: taxas.JPY,
        GBP: taxas.GBP
      };
    },

    /** Força movimento cambial (smoke / eventos) */
    shockFx(state, codigoMoeda, deltaPct) {
      this.ensureInternational(state);
      const t = state.international.taxas;
      if (t[codigoMoeda] == null) return null;
      const before = t[codigoMoeda];
      t[codigoMoeda] = CGL.Utils.clamp(before * (1 + deltaPct), before * 0.5, before * 2);
      if (codigoMoeda === 'BRL' && state.economy) {
        state.economy.cambioUSD = t.BRL;
      }
      return { moeda: codigoMoeda, before, after: t[codigoMoeda] };
    },

    _tickFx(state) {
      const intl = this.ensureInternational(state);
      const vol = intl.volatilidadeFx || 1;
      Object.keys(intl.taxas).forEach((code) => {
        if (code === 'USD') {
          intl.taxas.USD = 1;
          return;
        }
        const drift = CGL.Utils.randomFloat(-0.012, 0.012) * vol;
        const base = intl.taxas[code];
        // BRL acompanha economy se existir, senão oscila
        if (code === 'BRL' && state.economy?.cambioUSD) {
          intl.taxas.BRL = state.economy.cambioUSD;
        } else {
          intl.taxas[code] = CGL.Utils.clamp(base * (1 + drift), base * 0.4, base * 2.5);
        }
      });
      intl.historicoFx.unshift(this.fxSnapshot(state));
      if (intl.historicoFx.length > FX_HIST_CAP) intl.historicoFx.length = FX_HIST_CAP;
    },

    /* ========== Tarifas / EXIM ========== */

    effectiveTariff(state, paisOrigemId, paisDestinoId) {
      this.ensureInternational(state);
      const dest = CGL.Data.getCountryById(paisDestinoId);
      if (!dest) return 0.1;
      let tarifa = dest.tarifaImport || 0.1;
      const acordos = state.international.acordos.filter((a) => a.ativo);
      const mult = CGL.Data.agreementTariffMult(paisOrigemId, paisDestinoId, acordos.map((a) => {
        const def = CGL.Data.getAgreementById(a.id);
        return def ? { ...def, ativo: a.ativo, tarifaMult: a.tarifaMult } : null;
      }).filter(Boolean));
      tarifa *= mult;
      // Buffs geopolíticos
      state.international.buffsAtivos.forEach((b) => {
        if (b.tarifaMult) tarifa *= b.tarifaMult;
      });
      return Math.max(0, tarifa);
    },

    _freteBundle(state, paisId) {
      const fi = state.logistics?.freteInternacional || { indice: 1, seguro: 0.02, imposto: 0.08 };
      let indice = fi.indice || 1;
      let seguro = fi.seguro || 0.02;
      state.international?.buffsAtivos?.forEach((b) => {
        if (b.freteIntMult) indice *= b.freteIntMult;
      });
      const pais = CGL.Data.getCountryById(paisId);
      const distMult = pais ? (1 + (pais.barreiras || 30) / 200) : 1.2;
      return { indice: indice * distMult, seguro, imposto: fi.imposto || 0.08 };
    },

    /**
     * Inicia operação de exportação (Brasil → país).
     * volume = unidades simbólicas; receita estimada em BRL.
     */
    startExport(empresa, state, paisId, volume) {
      this.ensureInternational(state);
      this.ensureCompanyIntl(empresa, state);
      const pais = CGL.Data.getCountryById(paisId);
      if (!pais || pais.sedeJogador) throw new Error('País de destino inválido');
      const vol = Math.max(10, Math.round(Number(volume) || 100));
      const entrada = empresa.international.entradas.find(
        (e) => e.paisId === paisId && e.status === 'ativo'
      );
      if (!entrada) throw new Error('Entre no país (modo exportação ou outro) antes de exportar');

      const tarifa = this.effectiveTariff(state, 'br', paisId);
      const frete = this._freteBundle(state, paisId);
      const precoUn = 80 * (0.7 + (pais.poderCompra || 40) / 150);
      const receitaBruta = Math.round(vol * precoUn);
      const custoTarifa = Math.round(receitaBruta * tarifa);
      const custoFrete = Math.round(receitaBruta * 0.08 * frete.indice);
      const custoSeguro = Math.round(receitaBruta * frete.seguro);
      const barreiras = (pais.barreiras || 30) / 100;
      const docCusto = Math.round(2000 + barreiras * 8000);
      const custoTotal = custoTarifa + custoFrete + custoSeguro + docCusto;
      const semanas = Math.max(2, Math.round(3 + barreiras * 4 + frete.indice));

      // Debita custos iniciais (documentação + parte do frete)
      const adiantamento = Math.round(custoTotal * 0.4);
      this._debitEmpresa(empresa, state, adiantamento, 'exim_export_setup',
        `Exportação ${pais.nome}: setup/documentação`);

      const op = {
        id: CGL.Utils.uuid(),
        tipo: 'export',
        paisId,
        volume: vol,
        receitaBruta,
        tarifa,
        custoTarifa,
        custoFrete,
        custoSeguro,
        docCusto,
        custoTotal,
        adiantamento,
        semanasRestantes: semanas,
        status: 'transito',
        criadaEm: state.world?.semanaAtual || 0
      };
      empresa.international.operacoesExim.unshift(op);
      if (empresa.international.operacoesExim.length > EXIM_CAP) {
        empresa.international.operacoesExim.length = EXIM_CAP;
      }
      this._hist(empresa, state, {
        tipo: 'export',
        titulo: `Exportação → ${pais.nome}`,
        descricao: `${vol} un · tarifa ${CGL.Utils.formatPercent(tarifa)} · ETA ${semanas} sem.`
      });
      if (CGL.Events?.notify) {
        CGL.Events.notify('success', 'Exportação iniciada',
          `${empresa.nomeFantasia} → ${pais.nome} (${vol} un).`);
      }
      return op;
    },

    /** Importação (país → Brasil) */
    startImport(empresa, state, paisId, volume) {
      this.ensureInternational(state);
      this.ensureCompanyIntl(empresa, state);
      const pais = CGL.Data.getCountryById(paisId);
      if (!pais || pais.sedeJogador) throw new Error('País de origem inválido');
      const vol = Math.max(10, Math.round(Number(volume) || 100));
      const tarifa = this.effectiveTariff(state, paisId, 'br');
      const frete = this._freteBundle(state, paisId);
      const custoUn = 40 * (0.6 + (pais.custoMaoObra || 40) / 120);
      const valorCif = Math.round(vol * custoUn * frete.indice);
      const custoTarifa = Math.round(valorCif * tarifa);
      const custoSeguro = Math.round(valorCif * frete.seguro);
      const imposto = Math.round(valorCif * (frete.imposto || 0.08));
      const custoTotal = valorCif + custoTarifa + custoSeguro + imposto;
      const semanas = Math.max(2, Math.round(4 + (pais.barreiras || 30) / 40));

      this._debitEmpresa(empresa, state, Math.round(custoTotal * 0.5), 'exim_import_setup',
        `Importação ${pais.nome}: CIF parcial`);

      const op = {
        id: CGL.Utils.uuid(),
        tipo: 'import',
        paisId,
        volume: vol,
        valorCif,
        tarifa,
        custoTarifa,
        custoSeguro,
        imposto,
        custoTotal,
        semanasRestantes: semanas,
        status: 'transito',
        criadaEm: state.world?.semanaAtual || 0
      };
      empresa.international.operacoesExim.unshift(op);
      if (empresa.international.operacoesExim.length > EXIM_CAP) {
        empresa.international.operacoesExim.length = EXIM_CAP;
      }
      // Hook logística: pedido internacional leve
      if (CGL.Logistics?.ensureCompanyLogistics) {
        try {
          CGL.Logistics.ensureCompanyLogistics(empresa, state);
          if (state.logistics?.freteInternacional) {
            state.logistics.freteInternacional.indice = CGL.Utils.clamp(
              (state.logistics.freteInternacional.indice || 1) * 1.01, 0.5, 3
            );
          }
        } catch (e) { /* ok */ }
      }
      this._hist(empresa, state, {
        tipo: 'import',
        titulo: `Importação ← ${pais.nome}`,
        descricao: `${vol} un · custo ${CGL.Utils.formatBRL(custoTotal, { compact: true })}`
      });
      if (CGL.Events?.notify) {
        CGL.Events.notify('info', 'Importação iniciada',
          `${pais.nome} → ${empresa.nomeFantasia}`);
      }
      return op;
    },

    /* ========== Entrada no país ========== */

    /** Custo estimado de entrada */
    entryCost(empresa, paisId, modoId) {
      const pais = CGL.Data.getCountryById(paisId);
      const modo = CGL.Data.getEntryModeById(modoId);
      if (!pais || !modo) return 0;
      const base = Math.max(80000, (empresa.capitalSocial || 100000) * 0.25);
      const burocracia = 1 + (pais.burocracia || 50) / 100;
      const risco = 1 + (pais.riscoGeopolitico || 30) / 200;
      let custo = base * modo.custoMult * burocracia * risco;
      // Incentivo fábrica
      return Math.round(custo);
    },

    /**
     * Entra em um país com um modo.
     * Exportação não cria subsidiária; demais modos exigentes criam stub.
     */
    enterCountry(empresa, state, paisId, modoId, opts = {}) {
      this.ensureInternational(state);
      this.ensureCompanyIntl(empresa, state);
      const pais = CGL.Data.getCountryById(paisId);
      const modo = CGL.Data.getEntryModeById(modoId);
      if (!pais || pais.sedeJogador) throw new Error('Escolha um país estrangeiro');
      if (!modo) throw new Error('Modo de entrada inválido');

      const existente = empresa.international.entradas.find(
        (e) => e.paisId === paisId && e.status === 'ativo'
      );
      if (existente && existente.modo === modoId) {
        throw new Error('Já opera neste país com este modo');
      }

      let custo = this.entryCost(empresa, paisId, modoId);
      // Buff incentivo fábrica
      state.international.buffsAtivos.forEach((b) => {
        if (modoId === 'fabrica' && b.custoFabricaMult) custo *= b.custoFabricaMult;
      });
      custo = Math.round(custo);

      const caixa = empresa.caixa || 0;
      if (caixa < custo && !opts.silent) {
        throw new Error(`Caixa insuficiente (${CGL.Utils.formatBRL(custo)} necessários)`);
      }
      this._debitEmpresa(empresa, state, custo, 'intl_entrada',
        `Entrada ${pais.nome} via ${modo.nome}`);

      const entrada = {
        id: CGL.Utils.uuid(),
        paisId,
        modo: modoId,
        status: modo.semanasSetup > 1 ? 'setup' : 'ativo',
        semanasSetupRestantes: modo.semanasSetup,
        custoSetup: custo,
        controle: modo.controle,
        receitaPotencial: modo.receitaPotencial,
        adaptacao: 30,
        criadaEm: state.world?.semanaAtual || 0,
        gestao: opts.gestao || 'direta'
      };
      empresa.international.entradas.unshift(entrada);
      if (empresa.international.entradas.length > ENTRY_CAP) {
        empresa.international.entradas.length = ENTRY_CAP;
      }

      // Adaptação cultural inicial
      if (!empresa.international.adaptacaoCultural[paisId]) {
        empresa.international.adaptacaoCultural[paisId] = {
          score: 30,
          dims: Object.fromEntries((CGL.Data.cultureDims || []).map((d) => [d, 30]))
        };
      }

      let sub = null;
      if (modo.exigeSubsidiaria) {
        sub = this.createSubsidiary(empresa, state, paisId, {
          modo: modoId,
          gestao: entrada.gestao,
          silent: true,
          fromEntry: true
        });
        entrada.subsidiariaId = sub.id;
      }

      this._recalcPresenca(empresa);
      this._hist(empresa, state, {
        tipo: 'entrada',
        titulo: `Entrada em ${pais.nome}`,
        descricao: `${modo.nome} · CAPEX ${CGL.Utils.formatBRL(custo, { compact: true })}`
      });
      if (CGL.Events?.notify && !opts.silent) {
        CGL.Events.notify('success', 'Expansão internacional',
          `${empresa.nomeFantasia} entrou em ${pais.nome} (${modo.nome}).`);
      }
      return { entrada, subsidiaria: sub, custo };
    },

    /* ========== Subsidiárias ========== */

    createSubsidiary(empresa, state, paisId, opts = {}) {
      this.ensureCompanyIntl(empresa, state);
      const pais = CGL.Data.getCountryById(paisId);
      if (!pais || pais.sedeJogador) throw new Error('País inválido para subsidiária');
      if (empresa.international.subsidiarias.length >= SUB_CAP) {
        throw new Error('Limite de subsidiárias atingido');
      }
      const existente = empresa.international.subsidiarias.find(
        (s) => s.paisId === paisId && s.status === 'ativa'
      );
      if (existente && opts.fromEntry) return existente;

      const sub = {
        id: CGL.Utils.uuid(),
        paisId,
        nome: `${empresa.nomeFantasia} ${pais.codigo}`,
        moeda: pais.codigoMoeda,
        status: 'ativa',
        gestao: opts.gestao || 'local',
        modoOrigem: opts.modo || 'escritorio',
        funcionarios: Math.round(8 + (pais.populacao || 50) / 80),
        receitaLocal: 0,
        custosLocal: 0,
        lucroLocal: 0,
        plLocal: Math.round((empresa.capitalSocial || 100000) * 0.05),
        caixaLocal: 0,
        riscoPolitico: pais.riscoGeopolitico || 30,
        criadaEm: state.world?.semanaAtual || 0,
        semanasAtiva: 0
      };
      empresa.international.subsidiarias.unshift(sub);
      this._recalcPresenca(empresa);
      if (!opts.silent && CGL.Events?.notify) {
        CGL.Events.notify('success', 'Subsidiária criada',
          `${sub.nome} (${pais.moeda})`);
      }
      return sub;
    },

    /** Stub de caminho subsidiária a partir de exportação (upgrade) */
    upgradeToSubsidiary(empresa, state, paisId, modoId = 'escritorio') {
      const entrada = empresa.international?.entradas?.find(
        (e) => e.paisId === paisId && e.status === 'ativo'
      );
      if (!entrada) throw new Error('Sem entrada ativa neste país');
      if (entrada.subsidiariaId) {
        return empresa.international.subsidiarias.find((s) => s.id === entrada.subsidiariaId);
      }
      const modo = CGL.Data.getEntryModeById(modoId) || CGL.Data.getEntryModeById('escritorio');
      const custoExtra = Math.round(this.entryCost(empresa, paisId, modo.id) * 0.6);
      this._debitEmpresa(empresa, state, custoExtra, 'intl_upgrade_sub',
        `Upgrade subsidiária ${paisId}`);
      const sub = this.createSubsidiary(empresa, state, paisId, {
        modo: modo.id, gestao: 'local'
      });
      entrada.subsidiariaId = sub.id;
      entrada.modo = modo.id;
      entrada.controle = modo.controle;
      this._hist(empresa, state, {
        tipo: 'subsidiaria',
        titulo: 'Upgrade para subsidiária',
        descricao: `${sub.nome} · ${modo.nome}`
      });
      return sub;
    },

    /** Repatriação de lucros da subsidiária → matriz (BRL) */
    repatriate(empresa, state, subsidiariaId, valorLocal) {
      this.ensureInternational(state);
      this.ensureCompanyIntl(empresa, state);
      const sub = empresa.international.subsidiarias.find((s) => s.id === subsidiariaId);
      if (!sub) throw new Error('Subsidiária não encontrada');
      const disponivel = Math.max(0, sub.caixaLocal || 0);
      const pedir = Math.min(disponivel, Math.max(0, Number(valorLocal) || 0));
      if (pedir <= 0) throw new Error('Sem caixa local para repatriar');

      let taxa = state.international.repatriacaoBase || 0.15;
      state.international.buffsAtivos.forEach((b) => {
        if (b.repatriacaoMult) taxa *= b.repatriacaoMult;
      });
      // Centro financeiro reduz taxa
      empresa.international.centros.forEach((c) => {
        const def = CGL.Data.getCenterById(c.tipo);
        if (def?.efeitos?.repatriacao) taxa += def.efeitos.repatriacao;
      });
      taxa = CGL.Utils.clamp(taxa, 0.02, 0.45);

      const brutoBRL = this.toBRL(state, pedir, sub.moeda);
      const imposto = Math.round(brutoBRL * taxa);
      const liquido = brutoBRL - imposto;
      sub.caixaLocal -= pedir;
      this._creditEmpresa(empresa, state, liquido, 'intl_repatriacao',
        `Repatriação ${sub.nome} (−${CGL.Utils.formatPercent(taxa)} trib.)`);
      this._hist(empresa, state, {
        tipo: 'repatriacao',
        titulo: 'Repatriação',
        descricao: `${sub.nome}: ${CGL.Utils.formatBRL(liquido)} líquido`
      });
      return { brutoBRL, imposto, liquido, taxa };
    },

    /* ========== Centros e cargos ========== */

    buildCenter(empresa, state, tipoId, paisId) {
      this.ensureCompanyIntl(empresa, state);
      const def = CGL.Data.getCenterById(tipoId);
      const pais = CGL.Data.getCountryById(paisId);
      if (!def) throw new Error('Tipo de centro inválido');
      if (!pais) throw new Error('País inválido');
      if (empresa.international.centros.length >= CENTER_CAP) {
        throw new Error('Limite de centros atingido');
      }
      const custo = Math.round(def.custo * (1 + (pais.custoMaoObra || 50) / 200));
      this._debitEmpresa(empresa, state, custo, 'intl_centro',
        `Centro ${def.nome} em ${pais.nome}`);
      const centro = {
        id: CGL.Utils.uuid(),
        tipo: tipoId,
        nome: def.nome,
        paisId,
        opexSemanal: def.opexSemanal,
        status: 'ativo',
        criadaEm: state.world?.semanaAtual || 0
      };
      empresa.international.centros.push(centro);
      this._hist(empresa, state, {
        tipo: 'centro',
        titulo: def.nome,
        descricao: `${pais.nome} · ${CGL.Utils.formatBRL(custo, { compact: true })}`
      });
      return centro;
    },

    hireGlobalRole(empresa, state, roleId, paisId) {
      this.ensureCompanyIntl(empresa, state);
      const role = CGL.Data.getRoleById(roleId);
      if (!role) throw new Error('Cargo global inválido');
      const pais = CGL.Data.getCountryById(paisId) || CGL.Data.getCountryById('br');
      const salario = Math.round(role.salarioSemanal * (0.7 + (pais.custoMaoObra || 50) / 150));
      const cargo = {
        id: CGL.Utils.uuid(),
        roleId,
        nome: role.nome,
        paisId: pais.id,
        salarioSemanal: salario,
        idioma: pais.codigo === 'BR' ? 'pt' : 'en',
        adaptacao: 40,
        lealdade: 55,
        status: 'ativo',
        contratadoEm: state.world?.semanaAtual || 0
      };
      empresa.international.cargosGlobais.push(cargo);
      // Hook RH leve: registra no histórico da empresa
      this._hist(empresa, state, {
        tipo: 'rh_global',
        titulo: `Contratação: ${role.nome}`,
        descricao: `${pais.nome} · ${CGL.Utils.formatBRL(salario)}/sem`
      });
      if (CGL.Events?.notify) {
        CGL.Events.notify('success', 'Cargo global', `${role.nome} em ${pais.nome}`);
      }
      return cargo;
    },

    /** Investe em adaptação cultural */
    investCulture(empresa, state, paisId, dim, valor) {
      this.ensureCompanyIntl(empresa, state);
      const ad = empresa.international.adaptacaoCultural[paisId];
      if (!ad) throw new Error('Sem presença cultural neste país — entre primeiro');
      const dims = CGL.Data.cultureDims || [];
      if (dim && !dims.includes(dim)) throw new Error('Dimensão inválida');
      const v = Math.max(1000, Math.round(Number(valor) || 5000));
      this._debitEmpresa(empresa, state, v, 'intl_cultura',
        `Adaptação cultural ${paisId}${dim ? ' / ' + dim : ''}`);
      const ganho = Math.min(15, v / 4000);
      if (dim) {
        ad.dims[dim] = CGL.Utils.clamp((ad.dims[dim] || 30) + ganho * 2, 0, 100);
      } else {
        dims.forEach((d) => {
          ad.dims[d] = CGL.Utils.clamp((ad.dims[d] || 30) + ganho, 0, 100);
        });
      }
      const vals = Object.values(ad.dims);
      ad.score = Math.round(vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length));
      return ad;
    },

    /* ========== M&A cross-border stub ========== */

    crossBorderMaStub(empresa, state, paisId) {
      this.ensureCompanyIntl(empresa, state);
      const pais = CGL.Data.getCountryById(paisId);
      if (!pais) throw new Error('País inválido');
      const valuation = Math.round(
        (empresa.capitalSocial || 200000) * (1.5 + (pais.pib || 1) / 30)
      );
      return {
        paisId,
        valuationEst: valuation,
        auditoriaSemanas: 4,
        aprovacaoRegulatoria: pais.segurancaJuridica > 60 ? 0.75 : 0.45,
        riscoCultural: Math.round(100 - (pais.culturaConsumo || 50)),
        sinergiaEst: 0.08 + (pais.crescimento || 0.02),
        status: 'avaliacao',
        nota: 'Stub M&A internacional — integração plena na Fase 12/Market.'
      };
    },

    /* ========== Custos / receita / tick ========== */

    weeklyIntlCostEstimate(empresa, state) {
      this.ensureCompanyIntl(empresa, state);
      const I = empresa.international;
      let c = 0;
      // Opex de entradas ativas
      I.entradas.filter((e) => e.status === 'ativo' || e.status === 'setup').forEach((e) => {
        const modo = CGL.Data.getEntryModeById(e.modo);
        const pais = CGL.Data.getCountryById(e.paisId);
        const base = 2000 + (modo?.custoMult || 0.5) * 4000;
        const local = 1 + ((pais?.custoMaoObra || 40) / 150);
        c += base * local;
      });
      // Subsidiárias
      I.subsidiarias.filter((s) => s.status === 'ativa').forEach((s) => {
        const pais = CGL.Data.getCountryById(s.paisId);
        c += (s.funcionarios || 5) * (80 + (pais?.custoMaoObra || 40) * 2);
        if (s.gestao === 'direta') c += 3000;
      });
      // Centros
      I.centros.filter((x) => x.status === 'ativo').forEach((x) => {
        c += x.opexSemanal || 0;
      });
      // Cargos globais
      I.cargosGlobais.filter((g) => g.status === 'ativo').forEach((g) => {
        c += g.salarioSemanal || 0;
      });
      return Math.round(c);
    },

    /** Receita internacional semanal estimada (BRL) */
    weeklyIntlRevenue(empresa, state) {
      this.ensureCompanyIntl(empresa, state);
      this.ensureInternational(state);
      const I = empresa.international;
      let rev = 0;
      let demandaMult = 1;
      let margemMult = 1;
      state.international.buffsAtivos.forEach((b) => {
        if (b.demandaExportMult) demandaMult *= b.demandaExportMult;
        if (b.margemMult) margemMult *= b.margemMult;
        if (b.receitaExportMult) demandaMult *= b.receitaExportMult;
      });

      I.entradas.filter((e) => e.status === 'ativo').forEach((e) => {
        const pais = CGL.Data.getCountryById(e.paisId);
        const modo = CGL.Data.getEntryModeById(e.modo);
        if (!pais || !modo) return;
        const ad = I.adaptacaoCultural[e.paisId];
        const adapt = (ad?.score || 30) / 100;
        const pot = modo.receitaPotencial || 0.3;
        const mercado = (pais.poderCompra / 100) * (0.5 + pais.crescimento * 10);
        const base = (empresa.receita || empresa.capitalSocial * 0.01 || 5000) * 0.15;
        let r = base * pot * mercado * (0.5 + adapt) * demandaMult * margemMult;
        // FX: exportadores ganham com BRL fraco (mais BRL por USD)
        const fx = (state.international.taxas.BRL || 5.2) / 5.2;
        if (e.modo === 'exportacao' || e.modo === 'licenciamento' || e.modo === 'franquia') {
          r *= 0.85 + fx * 0.15;
        }
        // JV divide
        if (e.modo === 'jv') r *= 0.5;
        rev += r;
      });

      // P&L subsidiárias já convertido
      I.subsidiarias.filter((s) => s.status === 'ativa').forEach((s) => {
        rev += Math.max(0, this.toBRL(state, s.lucroLocal, s.moeda) * 0.3);
      });

      return Math.round(rev);
    },

    syncFinanceHook(empresa, state) {
      const custo = this.weeklyIntlCostEstimate(empresa, state);
      empresa.international.custoSemanal = custo;
      if (CGL.Finance?.ensureCompanyFinance) {
        try {
          const fin = CGL.Finance.ensureCompanyFinance(empresa, state);
          fin._intlCustoSemanal = custo;
        } catch (e) { /* ok */ }
      }
      return custo;
    },

    /** Fator de demanda internacional para Marketing/Company */
    intlDemandBoost(empresa, state) {
      this.ensureCompanyIntl(empresa, state);
      const n = empresa.international.entradas.filter((e) => e.status === 'ativo').length;
      if (!n) return 1;
      const rev = empresa.international.receitaIntl || 0;
      const base = empresa.receita || 1;
      return CGL.Utils.clamp(1 + Math.min(0.35, n * 0.03 + rev / Math.max(base, 1) * 0.2), 0.8, 1.4);
    },

    weeklyTick(state) {
      this.ensureInternational(state);
      const intl = state.international;
      const semana = state.world?.semanaAtual || 0;
      if (intl.semanaUltimoTick === semana) return;
      intl.semanaUltimoTick = semana;

      this._tickFx(state);
      this._tickBuffs(state);
      this._maybeEvent(state);

      const companies = (state.companies?.empresas || []).filter((e) => e.ativa && !e.concorrente);
      companies.forEach((empresa) => {
        this.ensureCompanyIntl(empresa, state);
        this._tickCompany(empresa, state);
      });

      this._updateRanking(state);
    },

    _tickCompany(empresa, state) {
      const I = empresa.international;
      // Setup → ativo
      I.entradas.forEach((e) => {
        if (e.status === 'setup') {
          e.semanasSetupRestantes = (e.semanasSetupRestantes || 1) - 1;
          if (e.semanasSetupRestantes <= 0) {
            e.status = 'ativo';
            e.semanasSetupRestantes = 0;
          }
        }
      });

      // EXIM em trânsito
      I.operacoesExim.filter((op) => op.status === 'transito').forEach((op) => {
        op.semanasRestantes -= 1;
        if (op.semanasRestantes <= 0) {
          this._settleExim(empresa, state, op);
        }
      });

      // P&L subsidiárias em moeda local
      let ganhoFx = 0;
      I.subsidiarias.filter((s) => s.status === 'ativa').forEach((s) => {
        s.semanasAtiva = (s.semanasAtiva || 0) + 1;
        const pais = CGL.Data.getCountryById(s.paisId);
        const ad = I.adaptacaoCultural[s.paisId];
        const adapt = (ad?.score || 30) / 100;
        let demMult = 1;
        let plMult = 1;
        state.international.buffsAtivos.forEach((b) => {
          if (b.demandaExportMult) demMult *= b.demandaExportMult;
          if (b.plLocalMult) plMult *= b.plLocalMult;
          if (b.valorSubsidiariaMult) plMult *= b.valorSubsidiariaMult;
        });
        const baseLocal = 5000 + (pais?.poderCompra || 40) * 80 + (s.funcionarios || 5) * 200;
        s.receitaLocal = Math.round(baseLocal * (0.6 + adapt) * demMult * (0.9 + Math.random() * 0.2));
        s.custosLocal = Math.round(
          s.receitaLocal * (0.55 + (pais?.custoMaoObra || 40) / 250) +
          (s.funcionarios || 5) * (20 + (pais?.custoMaoObra || 40) * 0.5)
        );
        s.lucroLocal = Math.round((s.receitaLocal - s.custosLocal) * plMult);
        s.caixaLocal = Math.max(0, (s.caixaLocal || 0) + s.lucroLocal);
        s.plLocal = Math.max(0, (s.plLocal || 0) + Math.round(s.lucroLocal * 0.4));
        s.riscoPolitico = pais?.riscoGeopolitico || s.riscoPolitico;

        // Efeito cambial no valor em BRL
        const rateNow = this.rateToBRL(state, s.moeda);
        const ratePrev = s._rateBRL || rateNow;
        const plBRL = s.plLocal * rateNow;
        const plBRLPrev = s.plLocal * ratePrev;
        ganhoFx += plBRL - plBRLPrev;
        s._rateBRL = rateNow;
      });

      I.ganhoCambial = Math.round(ganhoFx);
      I.exposicaoCambial = Math.round(
        I.subsidiarias.reduce((a, s) => a + this.toBRL(state, s.plLocal, s.moeda), 0)
      );

      const custo = this.weeklyIntlCostEstimate(empresa, state);
      const receita = this.weeklyIntlRevenue(empresa, state);
      I.custoSemanal = custo;
      I.receitaIntl = receita;
      I.receitaExport = I.operacoesExim
        .filter((o) => o.tipo === 'export' && o.status === 'concluida' &&
          o.concluidaEm === (state.world?.semanaAtual || 0))
        .reduce((a, o) => a + (o.receitaLiquida || 0), 0);
      I.custoImport = I.operacoesExim
        .filter((o) => o.tipo === 'import' && o.status === 'concluida' &&
          o.concluidaEm === (state.world?.semanaAtual || 0))
        .reduce((a, o) => a + (o.custoTotal || 0), 0);

      this.syncFinanceHook(empresa, state);
      this._recalcPresenca(empresa);
      this.calcKpis(empresa, state);

      // Drift leve adaptação
      Object.keys(I.adaptacaoCultural).forEach((pid) => {
        const ad = I.adaptacaoCultural[pid];
        ad.score = CGL.Utils.clamp(ad.score + CGL.Utils.randomFloat(-0.5, 0.8), 5, 100);
      });
    },

    _settleExim(empresa, state, op) {
      const pais = CGL.Data.getCountryById(op.paisId);
      if (op.tipo === 'export') {
        const restante = Math.max(0, (op.custoTotal || 0) - (op.adiantamento || 0));
        if (restante > 0) {
          this._debitEmpresa(empresa, state, restante, 'exim_export_custo',
            `Custo final export ${pais?.nome || ''}`);
        }
        // Receita: FX ajuda exportador se BRL fraco
        const fx = (state.international.taxas.BRL || 5.2) / 5.2;
        let liquida = Math.round((op.receitaBruta || 0) * (0.9 + fx * 0.1));
        state.international.buffsAtivos.forEach((b) => {
          if (b.receitaExportMult) liquida = Math.round(liquida * b.receitaExportMult);
          if (b.demandaExportMult) liquida = Math.round(liquida * b.demandaExportMult);
        });
        op.receitaLiquida = liquida;
        this._creditEmpresa(empresa, state, liquida, 'exim_export_receita',
          `Receita exportação ${pais?.nome || ''}`);
        // Boost estoque logístico simbólico (saída)
        if (CGL.Logistics?.ensureCompanyLogistics) {
          try {
            const L = CGL.Logistics.ensureCompanyLogistics(empresa, state);
            if (L.estoque) {
              L.estoque.unidades = Math.max(0, L.estoque.unidades - Math.round(op.volume * 0.3));
            }
          } catch (e) { /* ok */ }
        }
      } else if (op.tipo === 'import') {
        const restante = Math.max(0, Math.round((op.custoTotal || 0) * 0.5));
        if (restante > 0) {
          this._debitEmpresa(empresa, state, restante, 'exim_import_custo',
            `Custo final import ${pais?.nome || ''}`);
        }
        // Importador sofre com BRL fraco
        const fx = (state.international.taxas.BRL || 5.2) / 5.2;
        if (fx > 1.05) {
          const extra = Math.round((op.custoTotal || 0) * (fx - 1) * 0.3);
          this._debitEmpresa(empresa, state, extra, 'exim_fx_import',
            'Custo cambial adicional na importação');
        }
        if (CGL.Logistics?.moveStock) {
          try {
            CGL.Logistics.moveStock(empresa, state, Math.round(op.volume * 0.8), 'import');
          } catch (e) { /* ok */ }
        }
      }
      op.status = 'concluida';
      op.concluidaEm = state.world?.semanaAtual || 0;
      op.semanasRestantes = 0;
    },

    /* ========== Eventos / ranking ========== */

    pushEvent(state, ev) {
      this.ensureInternational(state);
      state.international.eventos.unshift({
        id: CGL.Utils.uuid(),
        semana: state.world?.semanaAtual || 0,
        ...ev
      });
      if (state.international.eventos.length > EVENT_CAP) {
        state.international.eventos.length = EVENT_CAP;
      }
    },

    _maybeEvent(state) {
      if (Math.random() > 0.12) return;
      const catalog = CGL.Data.intlEvents || [];
      if (!catalog.length) return;
      const total = catalog.reduce((a, e) => a + (e.peso || 1), 0);
      let r = Math.random() * total;
      let picked = catalog[0];
      for (const e of catalog) {
        r -= e.peso || 1;
        if (r <= 0) { picked = e; break; }
      }
      const buff = {
        eventId: picked.id,
        titulo: picked.titulo,
        semanasRestantes: picked.duracao || 4,
        ...picked.efeitos
      };
      state.international.buffsAtivos.push(buff);
      if (picked.efeitos?.fxVolatilidade) {
        state.international.volatilidadeFx = picked.efeitos.fxVolatilidade;
      }
      if (picked.id === 'acordo_novo') {
        const off = state.international.acordos.find((a) => !a.ativo);
        if (off) {
          off.ativo = true;
          off.tarifaMult = Math.min(off.tarifaMult || 0.7, 0.6);
        }
      }
      this.pushEvent(state, {
        tipo: picked.id,
        titulo: picked.titulo,
        descricao: picked.descricao,
        positivo: !!picked.positivo
      });
      if (CGL.Events?.notify) {
        CGL.Events.notify(
          picked.positivo ? 'success' : 'alerta',
          picked.titulo,
          picked.descricao
        );
      }
    },

    _tickBuffs(state) {
      const intl = state.international;
      intl.buffsAtivos = (intl.buffsAtivos || []).filter((b) => {
        b.semanasRestantes = (b.semanasRestantes || 1) - 1;
        return b.semanasRestantes > 0;
      });
      if (!intl.buffsAtivos.some((b) => b.fxVolatilidade)) {
        intl.volatilidadeFx = 1;
      }
    },

    calcKpis(empresa, state) {
      this.ensureCompanyIntl(empresa, state);
      const I = empresa.international;
      I.kpis = {
        paises: I.presencaPaises,
        subsidiarias: I.subsidiarias.filter((s) => s.status === 'ativa').length,
        receitaIntl: I.receitaIntl || 0,
        custoSemanal: I.custoSemanal || 0,
        exposicaoCambial: I.exposicaoCambial || 0,
        ganhoCambial: I.ganhoCambial || 0,
        adaptacaoMedia: this._avgAdaptacao(empresa),
        eximAtivas: I.operacoesExim.filter((o) => o.status === 'transito').length
      };
      return I.kpis;
    },

    _avgAdaptacao(empresa) {
      const ads = Object.values(empresa.international.adaptacaoCultural || {});
      if (!ads.length) return 0;
      return Math.round(ads.reduce((a, x) => a + (x.score || 0), 0) / ads.length);
    },

    _updateRanking(state) {
      const rows = (state.companies?.empresas || [])
        .filter((e) => e.ativa)
        .map((e) => {
          this.ensureCompanyIntl(e, state);
          this.calcKpis(e, state);
          const score =
            (e.international.presencaPaises || 0) * 12 +
            (e.international.receitaIntl || 0) / 5000 +
            (e.international.subsidiarias?.length || 0) * 8 +
            this._avgAdaptacao(e) * 0.3 +
            (e.reputacao || 50) * 0.2;
          return {
            id: e.id,
            nome: e.nomeFantasia,
            paises: e.international.presencaPaises,
            receitaIntl: e.international.receitaIntl,
            score: Math.round(score),
            reputacao: e.reputacao || 50
          };
        })
        .sort((a, b) => b.score - a.score);
      state.international.ranking = rows.slice(0, 20);
    },

    dashboardSummary(state) {
      this.ensureInternational(state);
      const companies = (CGL.Company?.listPlayerCompanies?.(state) || []).filter((e) => e.ativa);
      let paises = new Set();
      let subs = 0;
      let receita = 0;
      let custo = 0;
      let exposicao = 0;
      companies.forEach((e) => {
        this.ensureCompanyIntl(e, state);
        e.international.entradas.filter((x) => x.status === 'ativo' || x.status === 'setup')
          .forEach((x) => paises.add(x.paisId));
        subs += e.international.subsidiarias.filter((s) => s.status === 'ativa').length;
        receita += e.international.receitaIntl || 0;
        custo += e.international.custoSemanal || 0;
        exposicao += e.international.exposicaoCambial || 0;
      });
      const fx = state.international.taxas || {};
      return {
        paises: paises.size,
        subsidiarias: subs,
        receitaIntl: receita,
        custoSemanal: custo,
        exposicaoCambial: exposicao,
        usdBrl: fx.BRL || state.economy?.cambioUSD || 5.2,
        eventos: (state.international.eventos || []).length
      };
    },

    /* ========== Helpers ========== */

    _recalcPresenca(empresa) {
      const ids = new Set(
        (empresa.international.entradas || [])
          .filter((e) => e.status === 'ativo' || e.status === 'setup')
          .map((e) => e.paisId)
      );
      empresa.international.presencaPaises = ids.size;
    },

    _debitEmpresa(empresa, state, valor, categoria, descricao) {
      const v = Math.round(Math.max(0, valor));
      if (v <= 0) return;
      empresa.caixa = Math.max(0, (empresa.caixa || 0) - v);
      if (CGL.Finance?.ensureCompanyFinance) {
        try {
          const fin = CGL.Finance.ensureCompanyFinance(empresa, state);
          const conta = CGL.Finance.primaryAccount(fin);
          if (conta) {
            conta.disponivel = Math.max(0, (conta.disponivel || 0) - v);
            CGL.Finance._postLedger(fin, state, {
              tipo: 'saida',
              categoria,
              descricao,
              valor: v,
              contaId: conta.id,
              empresaId: empresa.id
            });
          }
        } catch (e) { /* ok */ }
      }
    },

    _creditEmpresa(empresa, state, valor, categoria, descricao) {
      const v = Math.round(Math.max(0, valor));
      if (v <= 0) return;
      empresa.caixa = (empresa.caixa || 0) + v;
      if (CGL.Finance?.ensureCompanyFinance) {
        try {
          const fin = CGL.Finance.ensureCompanyFinance(empresa, state);
          const conta = CGL.Finance.primaryAccount(fin);
          if (conta) {
            conta.disponivel = Math.round((conta.disponivel || 0) + v);
            CGL.Finance._postLedger(fin, state, {
              tipo: 'entrada',
              categoria,
              descricao,
              valor: v,
              contaId: conta.id,
              empresaId: empresa.id
            });
          }
        } catch (e) { /* ok */ }
      }
    },

    _hist(empresa, state, item) {
      this.ensureCompanyIntl(empresa, state);
      empresa.international.historico.unshift({
        id: CGL.Utils.uuid(),
        semana: state.world?.semanaAtual || 0,
        ...item
      });
      if (empresa.international.historico.length > HISTORY_CAP) {
        empresa.international.historico.length = HISTORY_CAP;
      }
    }
  };

  global.CGL = global.CGL || {};
  global.CGL.International = International;
})(typeof window !== 'undefined' ? window : globalThis);
