/**
 * CONGLOMERADO — Logística e cadeia de suprimentos (Fase 10)
 * Fornecedores, estoque, CDs, frota, rotas, tech, riscos e KPIs.
 */
(function (global) {
  'use strict';

  const EVENT_CAP = 50;
  const HISTORY_CAP = 60;
  const CD_CAP = 12;
  const VEHICLE_CAP = 40;
  const ROUTE_CAP = 30;
  const ORDER_CAP = 40;

  const Logistics = {
    /* ========== Bootstrap ========== */

    createEmptyLogisticsState() {
      return {
        version: 10,
        semanaUltimoTick: 0,
        eventos: [],
        ranking: [],
        freteInternacional: { indice: 1, seguro: 0.02, imposto: 0.08 },
        buffsAtivos: [] // efeitos temporários de eventos
      };
    },

    defaultInventory(empresa) {
      const porte = empresa?.porte || 'micro';
      const maxByPorte = {
        micro: 400, pequena: 1200, media: 5000,
        grande: 20000, corporacao: 80000, conglomerado: 200000
      };
      const max = maxByPorte[porte] || 400;
      return {
        unidades: Math.round(max * 0.25),
        minimo: Math.round(max * 0.1),
        maximo: max,
        holdingPorUnidade: 2.5, // R$/un/semana
        validadeSemanas: 40,
        idadeMedia: 4,
        perdasSemana: 0,
        stockouts: 0,
        semanasStockout: 0
      };
    },

    defaultFleet() {
      return {
        modo: '3pl',
        veiculos: [],
        custo3plBase: 3500,
        taxa3plPorUnidade: 1.8
      };
    },

    defaultChain() {
      const stages = (CGL.Data.supplyStages || []).map((s) => ({
        id: s.id,
        nome: s.nome,
        saude: 55,
        gargalo: false
      }));
      return { etapas: stages };
    },

    ensureLogistics(state) {
      if (!state.logistics || typeof state.logistics !== 'object') {
        state.logistics = this.createEmptyLogisticsState();
      } else {
        const base = this.createEmptyLogisticsState();
        state.logistics = {
          ...base,
          ...state.logistics,
          eventos: Array.isArray(state.logistics.eventos) ? state.logistics.eventos : [],
          ranking: Array.isArray(state.logistics.ranking) ? state.logistics.ranking : [],
          buffsAtivos: Array.isArray(state.logistics.buffsAtivos) ? state.logistics.buffsAtivos : [],
          freteInternacional: {
            ...base.freteInternacional,
            ...(state.logistics.freteInternacional || {})
          },
          version: 10
        };
      }
      return state.logistics;
    },

    ensureCompanyLogistics(empresa, state) {
      if (!empresa) return null;
      if (!empresa.logistics || typeof empresa.logistics !== 'object') empresa.logistics = {};
      const L = empresa.logistics;
      if (!L.cadeia) L.cadeia = this.defaultChain();
      if (!L.estoque) L.estoque = this.defaultInventory(empresa);
      else {
        const def = this.defaultInventory(empresa);
        L.estoque = { ...def, ...L.estoque };
      }
      if (!L.frota) L.frota = this.defaultFleet();
      else {
        const def = this.defaultFleet();
        L.frota = { ...def, ...L.frota, veiculos: Array.isArray(L.frota.veiculos) ? L.frota.veiculos : [] };
      }
      if (!Array.isArray(L.contratos)) L.contratos = [];
      if (!Array.isArray(L.cds)) L.cds = [];
      if (!Array.isArray(L.rotas)) L.rotas = [];
      if (!Array.isArray(L.pedidos)) L.pedidos = []; // pedidos em trânsito
      if (!Array.isArray(L.techs)) L.techs = [];
      if (!Array.isArray(L.historico)) L.historico = [];
      if (!L.kpis) L.kpis = {};
      if (L.integracaoVertical == null) L.integracaoVertical = false;
      if (L.investimentoVertical == null) L.investimentoVertical = 0;
      if (L.fornecedorAtivoId == null) L.fornecedorAtivoId = null;
      if (L.custoSemanal == null) L.custoSemanal = 0;
      if (L.eficienciaLogistica == null) L.eficienciaLogistica = 40;
      if (L.dependenciaFornecedores == null) L.dependenciaFornecedores = 75;
      if (L.prazoMedioEntrega == null) L.prazoMedioEntrega = 2;
      if (L.satisfacaoClienteLog == null) L.satisfacaoClienteLog = 50;
      if (L.fatorProducao == null) L.fatorProducao = 1;
      if (L.fatorDistribuicao == null) L.fatorDistribuicao = 1;
      if (L.ehTransportadora == null) {
        L.ehTransportadora = empresa.segmentoId === 'logistica';
      }
      if (L.clientesExternos == null) L.clientesExternos = 0; // receita 3PL externa
      if (L.seeded == null) L.seeded = false;
      return L;
    },

    migrateAll(state) {
      this.ensureLogistics(state);
      (state.companies?.empresas || []).forEach((e) => {
        this.ensureCompanyLogistics(e, state);
        e.logistics.seeded = true;
      });
      if (state.finance?.pessoal) state.finance.pessoal.version = 10;
      (state.companies?.empresas || []).forEach((e) => {
        if (e.finance) e.finance.version = 10;
      });
      return state;
    },

    onCompanyCreated(empresa, state) {
      this.ensureLogistics(state);
      this.ensureCompanyLogistics(empresa, state);
      // Seed: contrato local padrão se não for transportadora pura
      if (!empresa.logistics.fornecedorAtivoId && empresa.segmentoId !== 'logistica') {
        try {
          this.setSupplier(empresa, state, 'sup_local_bom', { silent: true });
        } catch (e) { /* ok */ }
      }
      empresa.logistics.seeded = true;
    },

    addHistory(empresa, state, entry) {
      this.ensureCompanyLogistics(empresa, state);
      empresa.logistics.historico.unshift({
        id: CGL.Utils.uuid(),
        semana: state.world?.semanaAtual || 0,
        ...entry
      });
      if (empresa.logistics.historico.length > HISTORY_CAP) {
        empresa.logistics.historico.length = HISTORY_CAP;
      }
    },

    pushEvent(state, entry) {
      const log = this.ensureLogistics(state);
      log.eventos.unshift({
        id: CGL.Utils.uuid(),
        semana: state.world?.semanaAtual || 0,
        ...entry
      });
      if (log.eventos.length > EVENT_CAP) log.eventos.length = EVENT_CAP;
    },

    /* ========== Fornecedores ========== */

    setSupplier(empresa, state, supplierId, opts = {}) {
      this.ensureCompanyLogistics(empresa, state);
      const tpl = CGL.Data.getSupplierById(supplierId);
      if (!tpl) throw new Error('Fornecedor inválido.');
      if (tpl.tipo === 'proprio' && !empresa.logistics.integracaoVertical) {
        throw new Error('Ative integração vertical antes de usar produção própria.');
      }
      // Encerra contratos ativos
      empresa.logistics.contratos.forEach((c) => {
        if (c.status === 'ativo') c.status = 'encerrado';
      });
      const contrato = {
        id: CGL.Utils.uuid(),
        supplierId: tpl.id,
        nome: tpl.nome,
        tipo: tpl.tipo,
        preco: tpl.preco,
        qualidade: tpl.qualidade,
        leadTime: tpl.leadTime,
        confiabilidade: tpl.confiabilidade,
        capacidade: tpl.capacidade,
        status: 'ativo',
        semanasAtivo: 0
      };
      empresa.logistics.contratos.unshift(contrato);
      if (empresa.logistics.contratos.length > 20) empresa.logistics.contratos.length = 20;
      empresa.logistics.fornecedorAtivoId = tpl.id;
      this._recalcDependency(empresa);
      this._updateChainHealth(empresa);
      if (!opts.silent) {
        this.addHistory(empresa, state, {
          tipo: 'fornecedor',
          titulo: 'Fornecedor definido',
          descricao: `${tpl.nome} (${tpl.tipo}) — preço ×${tpl.preco}, lead ${tpl.leadTime} sem.`
        });
        CGL.Events?.notify?.('success', 'Logística', `Fornecedor: ${tpl.nome}`);
      }
      return contrato;
    },

    getActiveContract(empresa) {
      this.ensureCompanyLogistics(empresa);
      return (empresa.logistics.contratos || []).find((c) => c.status === 'ativo') || null;
    },

    /**
     * Integração vertical: CAPEX alto, passa a usar produção própria.
     */
    enableVerticalIntegration(empresa, state) {
      this.ensureCompanyLogistics(empresa, state);
      if (empresa.logistics.integracaoVertical) return empresa.logistics;
      const capex = Math.round(120000 + (empresa.capitalSocial || 50000) * 0.35);
      if (CGL.Finance?.debitEmpresa) {
        CGL.Finance.debitEmpresa(state, empresa.id, capex, {
          categoria: 'logistica',
          descricao: 'Integração vertical — produção própria de insumos'
        });
      }
      empresa.logistics.integracaoVertical = true;
      empresa.logistics.investimentoVertical = capex;
      this.setSupplier(empresa, state, 'sup_vertical', { silent: true });
      this._recalcDependency(empresa);
      this.addHistory(empresa, state, {
        tipo: 'vertical',
        titulo: 'Integração vertical',
        descricao: `Investimento de ${CGL.Utils.formatBRL(capex)}. Insumos próprios.`
      });
      CGL.Events?.notify?.('success', 'Integração vertical',
        `${empresa.nomeFantasia} passa a produzir insumos internos.`);
      return empresa.logistics;
    },

    _recalcDependency(empresa) {
      const c = this.getActiveContract(empresa);
      if (!c) {
        empresa.logistics.dependenciaFornecedores = 90;
        return;
      }
      if (c.tipo === 'proprio') empresa.logistics.dependenciaFornecedores = 15;
      else if (c.tipo === 'local') empresa.logistics.dependenciaFornecedores = 55;
      else if (c.tipo === 'nacional') empresa.logistics.dependenciaFornecedores = 70;
      else empresa.logistics.dependenciaFornecedores = 85;
    },

    /* ========== Pedidos / estoque ========== */

    /**
     * Encomenda matéria-prima do fornecedor ativo.
     * Cria pedido em trânsito; chega após leadTime (± confiabilidade).
     */
    orderMaterials(empresa, state, qty, opts = {}) {
      this.ensureCompanyLogistics(empresa, state);
      const c = this.getActiveContract(empresa);
      if (!c) throw new Error('Defina um fornecedor primeiro.');
      const q = Math.max(1, Math.floor(Number(qty) || 0));
      if (q > c.capacidade && c.tipo !== 'proprio') {
        throw new Error(`Capacidade do fornecedor: ${c.capacidade} un.`);
      }
      const unitCost = 12 * c.preco; // custo base por unidade de insumo
      const freteInt = c.tipo === 'internacional'
        ? this._intlFreightCost(state, q)
        : 0;
      const total = Math.round(q * unitCost + freteInt);
      if (!opts.gratis && CGL.Finance?.debitEmpresa) {
        CGL.Finance.debitEmpresa(state, empresa.id, total, {
          categoria: 'logistica',
          descricao: `Pedido insumos ${c.nome} (${q} un.)`
        });
      }
      // Atraso se confiabilidade baixa
      let lead = c.leadTime;
      if (CGL.Utils.randomFloat(0, 100) > c.confiabilidade) {
        lead += CGL.Utils.randomInt(1, 3);
      }
      lead = Math.round(lead * this._activePrazoMult(state));

      const pedido = {
        id: CGL.Utils.uuid(),
        supplierId: c.supplierId,
        quantidade: q,
        custo: total,
        qualidade: c.qualidade,
        semanasRestantes: Math.max(1, lead),
        leadOriginal: lead,
        status: 'transito',
        internacional: c.tipo === 'internacional'
      };
      empresa.logistics.pedidos.unshift(pedido);
      if (empresa.logistics.pedidos.length > ORDER_CAP) {
        empresa.logistics.pedidos.length = ORDER_CAP;
      }
      this.addHistory(empresa, state, {
        tipo: 'pedido',
        titulo: 'Pedido de insumos',
        descricao: `${q} un. de ${c.nome} — chega em ~${lead} sem. (${CGL.Utils.formatBRL(total)})`
      });
      if (!opts.silent) {
        CGL.Events?.notify?.('info', 'Pedido enviado', `${q} unidades em trânsito.`);
      }
      return pedido;
    },

    /**
     * Movimenta estoque interno (produção → armazenagem / ajuste manual).
     */
    moveStock(empresa, state, delta, motivo = 'ajuste') {
      this.ensureCompanyLogistics(empresa, state);
      const est = empresa.logistics.estoque;
      const before = est.unidades;
      est.unidades = CGL.Utils.clamp(
        Math.round(est.unidades + Number(delta)),
        0,
        est.maximo * 1.15 // leve overflow permitido (custo extra)
      );
      const moved = est.unidades - before;
      if (moved !== 0) {
        this.addHistory(empresa, state, {
          tipo: 'estoque',
          titulo: 'Movimentação de estoque',
          descricao: `${moved > 0 ? '+' : ''}${moved} un. (${motivo}). Saldo: ${est.unidades}.`
        });
      }
      this._updateChainHealth(empresa);
      return est;
    },

    updateInventoryPolicy(empresa, state, opts = {}) {
      this.ensureCompanyLogistics(empresa, state);
      const est = empresa.logistics.estoque;
      if (opts.minimo != null) est.minimo = Math.max(0, Math.floor(Number(opts.minimo)));
      if (opts.maximo != null) est.maximo = Math.max(est.minimo + 10, Math.floor(Number(opts.maximo)));
      if (opts.holdingPorUnidade != null) {
        est.holdingPorUnidade = Math.max(0.1, Number(opts.holdingPorUnidade));
      }
      if (opts.validadeSemanas != null) {
        est.validadeSemanas = Math.max(4, Math.floor(Number(opts.validadeSemanas)));
      }
      return est;
    },

    /* ========== Centros de distribuição ========== */

    buildCD(empresa, state, typeId, uf) {
      this.ensureCompanyLogistics(empresa, state);
      if (empresa.logistics.cds.length >= CD_CAP) {
        throw new Error(`Limite de ${CD_CAP} centros.`);
      }
      const tpl = CGL.Data.getCdTypeById(typeId);
      if (!tpl) throw new Error('Tipo de CD inválido.');
      const estado = CGL.Data.getStateByUf(uf);
      if (!estado) throw new Error('UF inválida.');
      if (CGL.Finance?.debitEmpresa) {
        CGL.Finance.debitEmpresa(state, empresa.id, tpl.custo, {
          categoria: 'logistica',
          descricao: `Construção ${tpl.nome} em ${estado.nome}`
        });
      }
      const cd = {
        id: CGL.Utils.uuid(),
        tipoId: tpl.id,
        nome: `${tpl.nome} ${estado.uf}`,
        uf: estado.uf,
        capacidade: tpl.capacidade,
        ocupacao: 0,
        opexSemanal: tpl.opexSemanal,
        refrigerado: tpl.refrigerado,
        fatorCusto: tpl.fatorCusto,
        funcionarios: Math.max(2, Math.round(tpl.capacidade / 800)),
        status: 'ativo'
      };
      empresa.logistics.cds.push(cd);
      this._updateChainHealth(empresa);
      this.addHistory(empresa, state, {
        tipo: 'cd',
        titulo: 'CD construído',
        descricao: `${cd.nome} — cap. ${cd.capacidade}.`
      });
      CGL.Events?.notify?.('success', 'Centro de distribuição', cd.nome);
      return cd;
    },

    /* ========== Frota ========== */

    setFleetMode(empresa, state, modeId) {
      this.ensureCompanyLogistics(empresa, state);
      const mode = CGL.Data.getFleetModeById(modeId);
      empresa.logistics.frota.modo = mode.id;
      this.addHistory(empresa, state, {
        tipo: 'frota',
        titulo: 'Modo de frota',
        descricao: mode.nome
      });
      CGL.Events?.notify?.('info', 'Frota', mode.nome);
      return empresa.logistics.frota;
    },

    buyVehicle(empresa, state, vehicleTypeId) {
      this.ensureCompanyLogistics(empresa, state);
      const tpl = CGL.Data.getVehicleTypeById(vehicleTypeId);
      if (!tpl) throw new Error('Veículo inválido.');
      if (empresa.logistics.frota.veiculos.length >= VEHICLE_CAP) {
        throw new Error(`Limite de ${VEHICLE_CAP} veículos.`);
      }
      if (empresa.logistics.frota.modo === '3pl') {
        // Auto-migra para híbrida ao comprar
        empresa.logistics.frota.modo = 'hibrida';
      }
      if (CGL.Finance?.debitEmpresa) {
        CGL.Finance.debitEmpresa(state, empresa.id, tpl.custo, {
          categoria: 'logistica',
          descricao: `Aquisição ${tpl.nome}`
        });
      }
      // Ativo físico
      if (CGL.Finance?.ensureCompanyFinance) {
        try {
          const fin = CGL.Finance.ensureCompanyFinance(empresa, state);
          if (fin.ativosFisicos) {
            fin.ativosFisicos.veiculos = (fin.ativosFisicos.veiculos || 0) + tpl.custo;
          }
        } catch (e) { /* ok */ }
      }
      const v = {
        id: CGL.Utils.uuid(),
        tipoId: tpl.id,
        nome: tpl.nome,
        capacidade: tpl.capacidade,
        manutencao: tpl.manutencao,
        consumo: tpl.consumo,
        vidaUtil: tpl.vidaUtil,
        idade: 0,
        status: 'ativo',
        modo: tpl.modo
      };
      empresa.logistics.frota.veiculos.push(v);
      this.addHistory(empresa, state, {
        tipo: 'frota',
        titulo: 'Veículo adquirido',
        descricao: `${tpl.nome} (cap. ${tpl.capacidade})`
      });
      CGL.Events?.notify?.('success', 'Frota', `${tpl.nome} adicionado.`);
      return v;
    },

    /**
     * Marca empresa do segmento logística como transportadora do conglomerado.
     */
    enableAsLogisticsCompany(empresa, state) {
      this.ensureCompanyLogistics(empresa, state);
      empresa.logistics.ehTransportadora = true;
      if (empresa.logistics.frota.modo === '3pl') {
        empresa.logistics.frota.modo = 'propria';
      }
      this.addHistory(empresa, state, {
        tipo: 'transportadora',
        titulo: 'Transportadora do grupo',
        descricao: 'Pode atender empresas do conglomerado e clientes externos.'
      });
      CGL.Events?.notify?.('success', 'Logística',
        `${empresa.nomeFantasia} opera como transportadora do conglomerado.`);
      return empresa.logistics;
    },

    /* ========== Rotas ========== */

    createRoute(empresa, state, ufOrigem, ufDestino, opts = {}) {
      this.ensureCompanyLogistics(empresa, state);
      if (empresa.logistics.rotas.length >= ROUTE_CAP) {
        throw new Error(`Limite de ${ROUTE_CAP} rotas.`);
      }
      const factors = CGL.Data.routeFactors(ufOrigem, ufDestino);
      const techCusto = this._techCustoMult(empresa);
      const custoBase = Math.round(800 * factors.custoMult * techCusto * this._activeCustoMult(state));
      const rota = {
        id: CGL.Utils.uuid(),
        origem: ufOrigem,
        destino: ufDestino,
        distanciaIdx: factors.distanciaIdx,
        tempoSemanas: factors.tempoSemanas,
        custoSemanal: custoBase,
        volumeSemanal: Math.max(0, Number(opts.volume) || 100),
        ativa: true,
        portoId: opts.portoId || null
      };
      empresa.logistics.rotas.push(rota);
      this.addHistory(empresa, state, {
        tipo: 'rota',
        titulo: 'Rota criada',
        descricao: `${ufOrigem} → ${ufDestino} · ${CGL.Utils.formatBRL(custoBase)}/sem`
      });
      return rota;
    },

    /* ========== Tech logística ========== */

    availableTechs(empresa) {
      this.ensureCompanyLogistics(empresa);
      const unlocked = new Set(empresa.logistics.techs);
      return (CGL.Data.logisticsTech || []).filter((t) => {
        if (unlocked.has(t.id)) return false;
        return (t.prereqs || []).every((p) => unlocked.has(p));
      });
    },

    investTech(empresa, state, techId) {
      this.ensureCompanyLogistics(empresa, state);
      const tech = CGL.Data.getLogisticsTechById(techId);
      if (!tech) throw new Error('Tecnologia inválida.');
      if (empresa.logistics.techs.includes(techId)) throw new Error('Já investida.');
      const avail = this.availableTechs(empresa).some((t) => t.id === techId);
      if (!avail) throw new Error('Pré-requisitos não atendidos.');
      if (CGL.Finance?.debitEmpresa) {
        CGL.Finance.debitEmpresa(state, empresa.id, tech.custo, {
          categoria: 'logistica',
          descricao: `Tech logística: ${tech.nome}`
        });
      }
      empresa.logistics.techs.push(techId);
      this._recalcEfficiency(empresa);
      this.addHistory(empresa, state, {
        tipo: 'tech',
        titulo: 'Tech logística',
        descricao: tech.nome
      });
      CGL.Events?.notify?.('success', 'Tecnologia', tech.nome);
      return tech;
    },

    _techEffects(empresa) {
      const eff = { eficiencia: 0, custo: 0, holding: 0, prazo: 0, opexCd: 0, satisfacao: 0, alcance: 0 };
      (empresa.logistics.techs || []).forEach((id) => {
        const t = CGL.Data.getLogisticsTechById(id);
        if (!t?.efeitos) return;
        Object.keys(t.efeitos).forEach((k) => {
          if (eff[k] != null) eff[k] += t.efeitos[k];
          else if (k === 'erros') { /* usado indireto */ }
        });
      });
      return eff;
    },

    _techCustoMult(empresa) {
      const e = this._techEffects(empresa);
      return CGL.Utils.clamp(1 + (e.custo || 0), 0.6, 1.1);
    },

    _recalcEfficiency(empresa) {
      this.ensureCompanyLogistics(empresa);
      const L = empresa.logistics;
      const te = this._techEffects(empresa);
      const cds = (L.cds || []).filter((c) => c.status === 'ativo').length;
      const fleetCap = this._fleetCapacity(empresa);
      const contract = this.getActiveContract(empresa);
      const conf = contract ? contract.confiabilidade : 40;
      const stockHealth = L.estoque.unidades >= L.estoque.minimo
        ? 20 : (L.estoque.unidades / Math.max(1, L.estoque.minimo)) * 20;
      let score = 25
        + te.eficiencia
        + cds * 4
        + Math.min(20, fleetCap / 200)
        + conf * 0.15
        + stockHealth
        + (L.integracaoVertical ? 8 : 0)
        + (L.frota.modo === 'propria' ? 5 : L.frota.modo === 'hibrida' ? 3 : 0);
      // Obsolescência de P&D pode afetar frota/CDs
      if (empresa.rd?.obsolescencia > 60) {
        score -= (empresa.rd.obsolescencia - 60) * 0.25;
      }
      L.eficienciaLogistica = CGL.Utils.clamp(Math.round(score), 5, 98);
      return L.eficienciaLogistica;
    },

    _fleetCapacity(empresa) {
      const veiculos = empresa.logistics?.frota?.veiculos || [];
      return veiculos
        .filter((v) => v.status === 'ativo')
        .reduce((s, v) => s + (v.capacidade || 0), 0);
    },

    _cdCapacity(empresa) {
      return (empresa.logistics?.cds || [])
        .filter((c) => c.status === 'ativo')
        .reduce((s, c) => s + (c.capacidade || 0), 0);
    },

    /* ========== Frete internacional (leve) ========== */

    _intlFreightCost(state, qty) {
      const fi = state.logistics?.freteInternacional || { indice: 1, seguro: 0.02, imposto: 0.08 };
      const base = qty * 4.5 * (fi.indice || 1) * this._activeFreteIntMult(state);
      const seguro = base * (fi.seguro || 0.02);
      const imposto = base * (fi.imposto || 0.08);
      return Math.round(base + seguro + imposto);
    },

    _activeCustoMult(state) {
      const buffs = state.logistics?.buffsAtivos || [];
      return buffs.reduce((m, b) => m * (b.custoMult || 1), 1);
    },

    _activePrazoMult(state) {
      const buffs = state.logistics?.buffsAtivos || [];
      return buffs.reduce((m, b) => m * (b.prazoMult || 1), 1);
    },

    _activeFreteIntMult(state) {
      const buffs = state.logistics?.buffsAtivos || [];
      return buffs.reduce((m, b) => m * (b.freteIntMult || 1), 1);
    },

    /* ========== Cadeia / produção ========== */

    _updateChainHealth(empresa) {
      this.ensureCompanyLogistics(empresa);
      const L = empresa.logistics;
      const stages = L.cadeia.etapas || [];
      const c = this.getActiveContract(empresa);
      const est = L.estoque;
      const stockRatio = est.unidades / Math.max(1, est.minimo);
      const cdCap = this._cdCapacity(empresa);
      const fleet = this._fleetCapacity(empresa);
      const map = {
        materia_prima: c ? CGL.Utils.clamp(c.qualidade * 0.7 + c.confiabilidade * 0.3, 20, 95) : 25,
        fornecedor: c ? c.confiabilidade : 20,
        producao: CGL.Utils.clamp(
          40 + (empresa.eficiencia || 50) * 0.4 + (stockRatio >= 1 ? 15 : stockRatio * 15) - (est.semanasStockout || 0) * 5,
          10, 95
        ),
        armazenamento: cdCap > 0
          ? CGL.Utils.clamp(50 + Math.min(30, cdCap / 500) + this._techEffects(empresa).eficiencia * 0.5, 20, 95)
          : CGL.Utils.clamp(35 + stockRatio * 15, 15, 70),
        transporte: L.frota.modo === '3pl'
          ? 55
          : CGL.Utils.clamp(40 + Math.min(40, fleet / 100), 20, 95),
        distribuicao: CGL.Utils.clamp(
          30 + (L.rotas.filter((r) => r.ativa).length) * 8 + (L.cds.length) * 5 + this._techEffects(empresa).alcance,
          15, 95
        ),
        cliente: CGL.Utils.clamp(L.satisfacaoClienteLog || 50, 10, 95)
      };
      stages.forEach((s) => {
        s.saude = Math.round(map[s.id] ?? 50);
        s.gargalo = s.saude < 40;
      });
      // Fator de produção: falta de material reduz
      const materialOk = stockRatio >= 1 && c;
      L.fatorProducao = materialOk
        ? CGL.Utils.clamp(0.85 + (c.qualidade / 100) * 0.25 + (L.eficienciaLogistica / 100) * 0.15, 0.4, 1.25)
        : CGL.Utils.clamp(0.35 + stockRatio * 0.4, 0.15, 0.85);
      // Distribuição afeta marketing
      L.fatorDistribuicao = CGL.Utils.clamp(
        0.5 + (map.distribuicao / 100) * 0.55 + (L.eficienciaLogistica / 100) * 0.2,
        0.35,
        1.3
      );
      return L.cadeia;
    },

    /**
     * Multiplicador de receita operacional (falta de material / logística).
     */
    productionMult(empresa) {
      this.ensureCompanyLogistics(empresa);
      return empresa.logistics.fatorProducao || 1;
    },

    /**
     * Boost de distribuição para Marketing.
     */
    distributionBoost(empresa) {
      this.ensureCompanyLogistics(empresa);
      return empresa.logistics.fatorDistribuicao || 1;
    },

    /* ========== Custos ========== */

    weeklyLogisticsCostEstimate(empresa, state) {
      this.ensureCompanyLogistics(empresa, state);
      const L = empresa.logistics;
      const te = this._techEffects(empresa);
      let c = 0;

      // Holding cost
      const holdMult = CGL.Utils.clamp(1 + (te.holding || 0), 0.5, 1.1);
      const overflow = Math.max(0, L.estoque.unidades - L.estoque.maximo);
      c += L.estoque.unidades * L.estoque.holdingPorUnidade * holdMult;
      c += overflow * L.estoque.holdingPorUnidade * 2.5;

      // CDs opex
      const opexMult = CGL.Utils.clamp(1 + (te.opexCd || 0), 0.5, 1.1);
      L.cds.filter((cd) => cd.status === 'ativo').forEach((cd) => {
        c += cd.opexSemanal * opexMult * (cd.fatorCusto || 1);
      });

      // Frota
      const modo = L.frota.modo;
      const fleetCap = this._fleetCapacity(empresa);
      if (modo === '3pl' || modo === 'hibrida') {
        const vol = Math.max(50, L.estoque.unidades * 0.15);
        const need3pl = modo === 'hibrida' ? Math.max(0, vol - fleetCap * 0.3) : vol;
        c += L.frota.custo3plBase + need3pl * L.frota.taxa3plPorUnidade * this._activeCustoMult(state);
      }
      if (modo === 'propria' || modo === 'hibrida') {
        L.frota.veiculos.filter((v) => v.status === 'ativo').forEach((v) => {
          c += (v.manutencao || 0) + (v.consumo || 1) * 180 * this._activeCustoMult(state);
        });
      }

      // Rotas
      L.rotas.filter((r) => r.ativa).forEach((r) => {
        c += (r.custoSemanal || 0) * this._techCustoMult(empresa) * this._activeCustoMult(state);
      });

      // Integração vertical — opex de planta interna
      if (L.integracaoVertical) {
        c += 4500 + (L.investimentoVertical || 0) * 0.002;
      }

      // Transportadora: receita externa parcial (reduz custo líquido depois)
      return Math.round(c);
    },

    syncFinanceHook(empresa, state) {
      const custo = this.weeklyLogisticsCostEstimate(empresa, state);
      empresa.logistics.custoSemanal = custo;
      if (CGL.Finance?.ensureCompanyFinance) {
        try {
          const fin = CGL.Finance.ensureCompanyFinance(empresa, state);
          fin._logCustoSemanal = custo;
        } catch (e) { /* ok */ }
      }
      return custo;
    },

    /* ========== KPIs / ranking ========== */

    calcKpis(empresa, state) {
      this.ensureCompanyLogistics(empresa, state);
      this._recalcEfficiency(empresa);
      this._updateChainHealth(empresa);
      const L = empresa.logistics;
      const custo = this.weeklyLogisticsCostEstimate(empresa, state);
      const un = Math.max(1, L.estoque.unidades);
      L.kpis = {
        eficiencia: L.eficienciaLogistica,
        custoPorUnidade: Math.round((custo / un) * 100) / 100,
        prazoMedio: L.prazoMedioEntrega,
        nivelEstoque: Math.round((L.estoque.unidades / Math.max(1, L.estoque.maximo)) * 100),
        satisfacao: Math.round(L.satisfacaoClienteLog),
        dependencia: Math.round(L.dependenciaFornecedores),
        alcance: Math.min(100, L.cds.length * 12 + L.rotas.filter((r) => r.ativa).length * 8),
        stockouts: L.estoque.stockouts || 0
      };
      return L.kpis;
    },

    dashboardSummary(state) {
      this.ensureLogistics(state);
      const companies = (CGL.Company?.listPlayerCompanies?.(state) || [])
        .filter((e) => e.ativa);
      if (!companies.length) {
        return {
          eficienciaMedia: 0, estoqueTotal: 0, cds: 0,
          veiculos: 0, custoSemanal: 0, stockouts: 0
        };
      }
      let eff = 0, stock = 0, cds = 0, veiculos = 0, custo = 0, so = 0;
      companies.forEach((e) => {
        this.ensureCompanyLogistics(e, state);
        this.calcKpis(e, state);
        eff += e.logistics.eficienciaLogistica;
        stock += e.logistics.estoque.unidades;
        cds += e.logistics.cds.length;
        veiculos += e.logistics.frota.veiculos.length;
        custo += e.logistics.custoSemanal || 0;
        so += e.logistics.estoque.stockouts || 0;
      });
      const n = companies.length;
      return {
        eficienciaMedia: Math.round(eff / n),
        estoqueTotal: stock,
        cds,
        veiculos,
        custoSemanal: custo,
        stockouts: so
      };
    },

    _updateRanking(state) {
      const all = (state.companies?.empresas || []).filter((e) => e.ativa);
      const rows = all.map((e) => {
        this.ensureCompanyLogistics(e, state);
        this.calcKpis(e, state);
        return {
          id: e.id,
          nome: e.nomeFantasia,
          eficiencia: e.logistics.eficienciaLogistica,
          custoPorUnidade: e.logistics.kpis.custoPorUnidade,
          alcance: e.logistics.kpis.alcance,
          dependencia: e.logistics.dependenciaFornecedores
        };
      });
      rows.sort((a, b) => b.eficiencia - a.eficiencia || a.custoPorUnidade - b.custoPorUnidade);
      state.logistics.ranking = rows.slice(0, 15);
      return state.logistics.ranking;
    },

    /* ========== Tick semanal ========== */

    weeklyTick(state) {
      this.ensureLogistics(state);
      const log = state.logistics;
      const semana = state.world?.semanaAtual || 0;
      if (log.semanaUltimoTick === semana) return log;
      log.semanaUltimoTick = semana;

      // Buffs de eventos
      log.buffsAtivos = (log.buffsAtivos || []).filter((b) => {
        b.semanasRestantes = (b.semanasRestantes || 1) - 1;
        return b.semanasRestantes > 0;
      });
      // Drift frete internacional
      log.freteInternacional.indice = CGL.Utils.clamp(
        (log.freteInternacional.indice || 1) * CGL.Utils.randomFloat(0.98, 1.03),
        0.7,
        2.5
      );

      (state.companies?.empresas || []).forEach((empresa) => {
        if (!empresa.ativa) return;
        this.ensureCompanyLogistics(empresa, state);
        if (empresa.concorrente) {
          empresa.logistics.eficienciaLogistica = CGL.Utils.clamp(
            (empresa.logistics.eficienciaLogistica || 40) + CGL.Utils.randomFloat(-1, 1),
            20, 80
          );
          return;
        }

        this._tickOrders(empresa, state);
        this._tickInventory(empresa, state);
        this._tickFleet(empresa, state);
        this._tickAutoReorder(empresa, state);
        this._recalcEfficiency(empresa);
        this._updateChainHealth(empresa);
        this.calcKpis(empresa, state);
        this.syncFinanceHook(empresa, state);

        // Satisfação do cliente sobe com entrega boa
        const soPenalty = (empresa.logistics.estoque.semanasStockout || 0) > 0 ? -2 : 0.4;
        empresa.logistics.satisfacaoClienteLog = CGL.Utils.clamp(
          empresa.logistics.satisfacaoClienteLog + soPenalty + (empresa.logistics.eficienciaLogistica - 50) * 0.02,
          5, 98
        );

        // Sync ativos estoque no balanço
        if (CGL.Finance?.ensureCompanyFinance) {
          try {
            const fin = CGL.Finance.ensureCompanyFinance(empresa, state);
            if (fin.ativosFisicos) {
              fin.ativosFisicos.estoques = Math.round(
                empresa.logistics.estoque.unidades * 12
              );
            }
          } catch (e) { /* ok */ }
        }

        // Marketing: distribuição ganha boost logístico
        if (empresa.marketing?.distribuicao) {
          const boost = this.distributionBoost(empresa);
          const target = CGL.Utils.clamp(Math.round(30 * boost), 10, 95);
          empresa.marketing.distribuicao.score = Math.round(
            (empresa.marketing.distribuicao.score || 30) * 0.85 + target * 0.15
          );
        }

        // Receita leve se transportadora com frota ociosa
        if (empresa.logistics.ehTransportadora && this._fleetCapacity(empresa) > 200) {
          const ext = Math.round(this._fleetCapacity(empresa) * 0.8);
          empresa.logistics.clientesExternos = ext;
          if (CGL.Finance?.creditEmpresa) {
            try {
              CGL.Finance.creditEmpresa(state, empresa.id, ext, {
                categoria: 'logistica',
                descricao: 'Frete para clientes externos'
              });
            } catch (e) { /* ok */ }
          }
        }
      });

      this._tickRiskEvents(state);
      this._updateRanking(state);
      return log;
    },

    _tickOrders(empresa, state) {
      empresa.logistics.pedidos.forEach((p) => {
        if (p.status !== 'transito') return;
        p.semanasRestantes = (p.semanasRestantes || 1) - 1;
        if (p.semanasRestantes <= 0) {
          p.status = 'entregue';
          const room = Math.max(0, empresa.logistics.estoque.maximo * 1.15 - empresa.logistics.estoque.unidades);
          const added = Math.min(p.quantidade, room);
          empresa.logistics.estoque.unidades += added;
          // Qualidade do fornecedor afeta reputação
          if (empresa.reputacao && p.qualidade) {
            empresa.reputacao.qualidade = CGL.Utils.clamp(
              empresa.reputacao.qualidade * 0.97 + p.qualidade * 0.03,
              0, 100
            );
          }
          empresa.logistics.prazoMedioEntrega = Math.round(
            ((empresa.logistics.prazoMedioEntrega || 2) * 0.7 + (p.leadOriginal || 2) * 0.3) * 10
          ) / 10;
          this.addHistory(empresa, state, {
            tipo: 'entrega',
            titulo: 'Insumos recebidos',
            descricao: `+${added} un. no estoque.`
          });
        }
      });
    },

    _tickInventory(empresa, state) {
      const est = empresa.logistics.estoque;
      const te = this._techEffects(empresa);
      // Spoilage / validade
      est.idadeMedia = (est.idadeMedia || 0) + 1;
      let perdas = 0;
      if (est.idadeMedia > est.validadeSemanas * 0.7 && est.unidades > 0) {
        const rate = 0.02 + Math.max(0, est.idadeMedia - est.validadeSemanas) * 0.01;
        perdas = Math.round(est.unidades * rate * (1 + (te.holding || 0) * -0.5));
        perdas = Math.max(0, perdas);
        est.unidades = Math.max(0, est.unidades - perdas);
        est.perdasSemana = perdas;
        if (perdas > 0) {
          this.addHistory(empresa, state, {
            tipo: 'perda',
            titulo: 'Perda de estoque',
            descricao: `${perdas} un. vencidas/estragadas.`
          });
        }
      } else {
        est.perdasSemana = 0;
      }
      // Consumo de produção (insumos → produto)
      const consumo = Math.round(
        Math.max(5, (empresa.funcionarios || 5) * 2 + (empresa.capitalSocial || 10000) * 0.0004)
        * (empresa.logistics.fatorProducao || 1)
      );
      if (est.unidades >= consumo) {
        est.unidades -= consumo;
        est.semanasStockout = 0;
        // Produção gera "espaço" de product stock conceptual — rejuvenesce idade
        est.idadeMedia = Math.max(0, est.idadeMedia * 0.85);
      } else {
        // Stockout
        const used = est.unidades;
        est.unidades = 0;
        est.stockouts = (est.stockouts || 0) + 1;
        est.semanasStockout = (est.semanasStockout || 0) + 1;
        empresa.logistics.fatorProducao = CGL.Utils.clamp(
          0.2 + used / Math.max(1, consumo),
          0.15,
          0.7
        );
        if (est.semanasStockout === 1) {
          this.addHistory(empresa, state, {
            tipo: 'stockout',
            titulo: 'Falta de estoque',
            descricao: 'Produção limitada por falta de insumos.'
          });
          CGL.Events?.notify?.('warning', empresa.nomeFantasia, 'Stockout de insumos!');
        }
      }
    },

    _tickAutoReorder(empresa, state) {
      const est = empresa.logistics.estoque;
      const c = this.getActiveContract(empresa);
      if (!c) return;
      const inTransit = empresa.logistics.pedidos
        .filter((p) => p.status === 'transito')
        .reduce((s, p) => s + p.quantidade, 0);
      if (est.unidades + inTransit < est.minimo) {
        const need = Math.min(
          c.capacidade,
          Math.max(est.minimo - est.unidades - inTransit, Math.round(est.maximo * 0.2))
        );
        if (need > 0) {
          try {
            this.orderMaterials(empresa, state, need, { silent: true });
          } catch (e) { /* sem caixa etc. */ }
        }
      }
    },

    _tickFleet(empresa) {
      empresa.logistics.frota.veiculos.forEach((v) => {
        if (v.status !== 'ativo') return;
        v.idade = (v.idade || 0) + 1;
        if (v.idade >= v.vidaUtil) {
          v.status = 'aposentado';
        } else if (v.idade > v.vidaUtil * 0.85) {
          v.manutencao = Math.round((v.manutencao || 500) * 1.02);
        }
      });
    },

    _tickRiskEvents(state) {
      // ~12% chance por semana de evento
      if (CGL.Utils.randomFloat(0, 1) > 0.12) return;
      const events = CGL.Data.logisticsEvents || [];
      if (!events.length) return;
      const totalW = events.reduce((s, e) => s + (e.peso || 1), 0);
      let roll = CGL.Utils.randomFloat(0, totalW);
      let chosen = events[0];
      for (const e of events) {
        roll -= e.peso || 1;
        if (roll <= 0) { chosen = e; break; }
      }
      const eff = chosen.efeitos || {};
      state.logistics.buffsAtivos.push({
        eventId: chosen.id,
        titulo: chosen.titulo,
        semanasRestantes: eff.semanas || 2,
        custoMult: eff.custoMult || 1,
        prazoMult: eff.prazoMult || 1,
        freteIntMult: eff.freteIntMult || 1
      });
      if (eff.freteIntMult) {
        state.logistics.freteInternacional.indice *= eff.freteIntMult;
      }

      // Aplica a uma empresa aleatória do jogador
      const players = (CGL.Company?.listPlayerCompanies?.(state) || []).filter((e) => e.ativa);
      if (players.length) {
        const alvo = players[CGL.Utils.randomInt(0, players.length - 1)];
        this.ensureCompanyLogistics(alvo, state);
        if (eff.cancelContrato) {
          const c = this.getActiveContract(alvo);
          if (c && c.tipo !== 'proprio') {
            c.status = 'quebrado';
            alvo.logistics.fornecedorAtivoId = null;
            this.addHistory(alvo, state, {
              tipo: 'risco',
              titulo: 'Fornecedor quebrou',
              descricao: `${c.nome} encerrou o contrato.`
            });
          }
        }
        if (eff.stockoutChance && CGL.Utils.randomFloat(0, 1) < eff.stockoutChance) {
          const lost = Math.round(alvo.logistics.estoque.unidades * 0.2);
          alvo.logistics.estoque.unidades = Math.max(0, alvo.logistics.estoque.unidades - lost);
        }
        this.pushEvent(state, {
          tipo: chosen.id,
          empresaId: alvo.id,
          titulo: chosen.titulo,
          descricao: `${chosen.descricao} (${alvo.nomeFantasia})`
        });
        CGL.Events?.notify?.('warning', 'Risco logístico', chosen.titulo);
      } else {
        this.pushEvent(state, {
          tipo: chosen.id,
          titulo: chosen.titulo,
          descricao: chosen.descricao
        });
      }
    }
  };

  global.CGL = global.CGL || {};
  global.CGL.Logistics = Logistics;
})(typeof window !== 'undefined' ? window : globalThis);
