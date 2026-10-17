/**
 * CONGLOMERADO — Recursos Humanos, gestão de pessoas e cultura (Fase 7)
 * Funcionários individuais, recrutamento, clima, folha, eventos de RH.
 */
(function (global) {
  'use strict';

  const EVENT_CAP = 40;
  const CANDIDATE_CAP = 24;
  const HISTORY_CAP = 60;
  /** Limite de NPCs nomeados gerados de uma vez (performance) */
  const SEED_CAP = 80;

  const ATTR_KEYS = [
    'produtividade', 'motivacao', 'lealdade', 'saude', 'estresse',
    'lideranca', 'criatividade', 'inteligencia', 'etica', 'aprendizado', 'potencial'
  ];

  const Hr = {
    /* ========== Bootstrap ========== */

    createEmptyHrState() {
      return {
        version: 7,
        semanaUltimoTick: 0,
        eventos: [],
        talentosExcepcionais: 0
      };
    },

    defaultClimate() {
      return {
        moral: 55,
        engajamento: 50,
        confianca: 50,
        cultura: 50,
        comunicacao: 50,
        colaboracao: 50
      };
    },

    defaultCulture() {
      return {
        valores: ['meritocracia', 'resultados'],
        intensidade: 50
      };
    },

    defaultUnion() {
      return {
        presente: false,
        forca: 0,
        satisfacao: 50,
        greveAtiva: false,
        semanasGreve: 0,
        proximoDissidio: 26
      };
    },

    ensureHr(state) {
      if (!state.hr || typeof state.hr !== 'object') {
        state.hr = this.createEmptyHrState();
      } else {
        const base = this.createEmptyHrState();
        state.hr = {
          ...base,
          ...state.hr,
          eventos: Array.isArray(state.hr.eventos) ? state.hr.eventos : [],
          version: 7
        };
      }
      if (!Array.isArray(state.employees)) state.employees = [];
      return state.hr;
    },

    ensureCompanyHR(empresa, state) {
      if (!empresa) return null;
      if (!empresa.hr || typeof empresa.hr !== 'object') empresa.hr = {};
      const hr = empresa.hr;
      if (!Array.isArray(hr.funcionarios)) hr.funcionarios = [];
      if (!Array.isArray(hr.candidatos)) hr.candidatos = [];
      if (!Array.isArray(hr.departamentos)) {
        hr.departamentos = (CGL.Data.departments || []).map((d) => d.id);
      }
      if (!hr.clima) hr.clima = this.defaultClimate();
      if (!hr.culturaOrg) hr.culturaOrg = this.defaultCulture();
      if (!Array.isArray(hr.beneficios)) hr.beneficios = ['vr'];
      if (!hr.sindicato) hr.sindicato = this.defaultUnion();
      if (!Array.isArray(hr.historico)) hr.historico = [];
      if (!Array.isArray(hr.treinamentosAtivos)) hr.treinamentosAtivos = [];
      if (!Array.isArray(hr.avaliacoesPendentes)) hr.avaliacoesPendentes = [];
      if (hr.folhaSemanal == null) hr.folhaSemanal = 0;
      if (hr.custoBeneficiosSemanal == null) hr.custoBeneficiosSemanal = 0;
      if (hr.produtividadeMedia == null) hr.produtividadeMedia = 50;
      if (hr.semanaUltimoReview == null) hr.semanaUltimoReview = 0;
      if (hr.seeded == null) hr.seeded = hr.funcionarios.length > 0;
      // Alinha cultura legada (número) com clima
      if (typeof empresa.cultura === 'number') {
        hr.clima.cultura = CGL.Utils.clamp(empresa.cultura, 0, 100);
      }
      return hr;
    },

    migrateAll(state) {
      this.ensureHr(state);
      (state.companies?.empresas || []).forEach((e) => {
        this.ensureCompanyHR(e, state);
        if (!e.hr.seeded && (e.funcionarios || 0) > 0 && e.ativa) {
          this.seedStaff(e, state, Math.min(e.funcionarios || 0, SEED_CAP));
          e.hr.seeded = true;
        }
        this.syncHeadcount(e);
      });
      return state.hr;
    },

    onCompanyCreated(empresa, state) {
      this.ensureCompanyHR(empresa, state);
      if (empresa.hr.seeded) {
        this.syncHeadcount(empresa);
        return empresa.hr;
      }
      const n = Math.min(empresa.funcionarios || 0, SEED_CAP);
      if (n > 0) this.seedStaff(empresa, state, n);
      empresa.hr.seeded = true;
      // Micro/pequena: sindicato raro; média+: chance por setor
      const porte = empresa.porte || 'micro';
      if (['media', 'grande', 'corporacao', 'conglomerado'].includes(porte) || Math.random() < 0.15) {
        empresa.hr.sindicato.presente = true;
        empresa.hr.sindicato.forca = CGL.Utils.randomInt(20, 60);
      }
      this.syncHeadcount(empresa);
      this.recalcClimate(empresa, state);
      return empresa.hr;
    },

    /* ========== Geração de pessoas ========== */

    _randomName() {
      const names = CGL.Data.names || {};
      const sex = Math.random() < 0.5 ? 'M' : 'F';
      const first = sex === 'M'
        ? CGL.Utils.pick(names.FIRST_M || ['João'])
        : CGL.Utils.pick(names.FIRST_F || ['Maria']);
      const last = CGL.Utils.pick(names.SURNAMES || ['Silva']);
      const last2 = Math.random() < 0.35 ? ` ${CGL.Utils.pick(names.SURNAMES || ['Santos'])}` : '';
      return { nome: `${first} ${last}${last2}`, sexo: sex };
    },

    _pickEducation(roleNivel) {
      const levels = CGL.Data.educationLevels || [];
      let idx = Math.min(levels.length - 1, Math.floor(roleNivel / 2) + CGL.Utils.randomInt(0, 2));
      idx = CGL.Utils.clamp(idx, 0, levels.length - 1);
      return levels[idx]?.id || 'medio';
    },

    _pickTraits() {
      const pool = CGL.Data.employeeTraits || [];
      const n = CGL.Utils.randomInt(1, 3);
      const picked = CGL.Utils.shuffle(pool).slice(0, n);
      return picked.map((t) => t.id);
    },

    _rollAttr(base, spread) {
      return CGL.Utils.clamp(Math.round(base + CGL.Utils.randomFloat(-spread, spread)), 5, 98);
    },

    generateEmployee(empresa, state, opts = {}) {
      const roleId = opts.roleId || this._defaultRoleForPorte(empresa.porte);
      const role = CGL.Data.getRoleById(roleId) || CGL.Data.roles[0];
      const deptId = opts.deptId || CGL.Utils.pick(role.depts || ['ops']);
      const { nome, sexo } = this._randomName();
      const idade = opts.idade || CGL.Utils.randomInt(18, Math.min(65, 22 + role.nivel * 3));
      const experiencia = Math.max(0, idade - 18 - CGL.Utils.randomInt(0, 4));
      const exceptional = !!opts.exceptional || Math.random() < 0.02;
      const base = exceptional ? 78 : 45 + role.nivel * 2;
      const spread = exceptional ? 12 : 22;

      const attrs = {};
      ATTR_KEYS.forEach((k) => {
        attrs[k] = this._rollAttr(base + (k === 'estresse' ? -10 : 0), spread);
      });
      if (exceptional) {
        attrs.produtividade = CGL.Utils.clamp(attrs.produtividade + 20, 70, 99);
        attrs.potencial = CGL.Utils.clamp(attrs.potencial + 25, 75, 99);
        attrs.inteligencia = CGL.Utils.clamp(attrs.inteligencia + 15, 70, 99);
      }

      const traits = opts.traits || this._pickTraits();
      this._applyTraitEffects(attrs, traits);

      const salMin = role.salarioMin;
      const salMax = role.salarioMax;
      let salario = Math.round(CGL.Utils.randomFloat(salMin, salMax));
      if (exceptional) salario = Math.round(salario * 1.35);

      const edu = opts.educacao || this._pickEducation(role.nivel);
      const curso = CGL.Utils.pick(CGL.Data.courses || [])?.id || null;

      const emp = {
        id: CGL.Utils.uuid(),
        empresaId: empresa.id,
        nome,
        sexo,
        idade,
        educacao: edu,
        cursoId: curso,
        experiencia,
        cargoId: role.id,
        deptId,
        salario,
        salarioExpectativa: Math.round(salario * CGL.Utils.randomFloat(0.95, 1.15)),
        tenureSemanas: opts.tenureSemanas || 0,
        ...attrs,
        tracos: traits,
        tracosRevelados: traits.filter((id) => {
          const t = CGL.Data.getTraitById(id);
          return t && !t.oculto;
        }),
        revelado: {
          nome: true,
          idade: true,
          educacao: true,
          experiencia: Math.random() < 0.7,
          cargo: true,
          salario: true,
          // atributos ocultos até avaliação
          produtividade: false,
          motivacao: false,
          lealdade: false,
          saude: false,
          estresse: false,
          lideranca: false,
          criatividade: false,
          inteligencia: false,
          etica: false,
          aprendizado: false,
          potencial: false
        },
        canalOrigem: opts.canal || 'processo',
        status: 'ativo', // ativo | treinamento | afastado | demitido | pediu | aposentado
        semanasTreinamento: 0,
        treinamentoId: null,
        ultimaAvaliacao: null,
        historicoAvaliacoes: [],
        exceptional,
        burnout: false,
        emGreve: false,
        semanaContratacao: state.world?.semanaAtual || 0,
        historico: []
      };

      // Candidatos: revelação parcial
      if (opts.asCandidate) {
        emp.status = 'candidato';
        emp.revelado = this._candidateReveal(opts.revelacao || 0.35);
      }

      return emp;
    },

    _candidateReveal(level) {
      const r = {
        nome: true,
        idade: true,
        educacao: level > 0.2,
        experiencia: level > 0.25,
        cargo: true,
        salario: true,
        produtividade: level > 0.7,
        motivacao: level > 0.55,
        lealdade: level > 0.8,
        saude: level > 0.75,
        estresse: level > 0.85,
        lideranca: level > 0.6,
        criatividade: level > 0.6,
        inteligencia: level > 0.65,
        etica: level > 0.9,
        aprendizado: level > 0.7,
        potencial: level > 0.85
      };
      return r;
    },

    _applyTraitEffects(attrs, traitIds) {
      (traitIds || []).forEach((id) => {
        const t = CGL.Data.getTraitById(id);
        if (!t?.efeitos) return;
        Object.keys(t.efeitos).forEach((k) => {
          if (attrs[k] != null) {
            attrs[k] = CGL.Utils.clamp(attrs[k] + t.efeitos[k], 1, 99);
          }
        });
      });
    },

    _defaultRoleForPorte(porte) {
      const map = {
        micro: 'assistente',
        pequena: 'analista_jr',
        media: 'analista_pl',
        grande: 'analista_sr',
        corporacao: 'coordenador',
        conglomerado: 'gerente'
      };
      return map[porte] || 'assistente';
    },

    seedStaff(empresa, state, count) {
      this.ensureCompanyHR(empresa, state);
      const n = Math.max(0, Math.floor(count));
      const roles = CGL.Data.roles || [];
      for (let i = 0; i < n; i++) {
        // Mix hierárquico: maioria operacional
        let role;
        const roll = Math.random();
        if (roll < 0.15) role = roles.find((r) => r.id === 'estagiario');
        else if (roll < 0.35) role = roles.find((r) => r.id === 'assistente');
        else if (roll < 0.6) role = roles.find((r) => r.id === 'analista_jr');
        else if (roll < 0.8) role = roles.find((r) => r.id === 'analista_pl');
        else if (roll < 0.92) role = roles.find((r) => r.id === 'analista_sr');
        else if (roll < 0.97) role = roles.find((r) => r.id === 'coordenador');
        else role = roles.find((r) => r.id === 'gerente');
        const emp = this.generateEmployee(empresa, state, {
          roleId: role?.id,
          tenureSemanas: CGL.Utils.randomInt(0, 200),
          canal: 'processo'
        });
        // Staff semeado já é conhecido
        ATTR_KEYS.forEach((k) => { emp.revelado[k] = true; });
        emp.revelado.experiencia = true;
        emp.revelado.educacao = true;
        empresa.hr.funcionarios.push(emp);
        this._indexEmployee(state, emp);
      }
      this.syncHeadcount(empresa);
      return empresa.hr.funcionarios;
    },

    _indexEmployee(state, emp) {
      if (!Array.isArray(state.employees)) state.employees = [];
      const i = state.employees.findIndex((e) => e.id === emp.id);
      if (i >= 0) state.employees[i] = { id: emp.id, empresaId: emp.empresaId, nome: emp.nome };
      else state.employees.push({ id: emp.id, empresaId: emp.empresaId, nome: emp.nome });
    },

    syncHeadcount(empresa) {
      if (!empresa?.hr) return 0;
      const ativos = (empresa.hr.funcionarios || []).filter((f) =>
        f.status === 'ativo' || f.status === 'treinamento' || f.status === 'afastado'
      ).length;
      // Mantém headcount abstrato se porte grande e seed limitado
      const abstrato = Math.max(0, (empresa.funcionarios || 0) - (empresa.hr._seededCount || ativos));
      if (!empresa.hr._seededCount) empresa.hr._seededCount = ativos;
      // Após RH real, funcionarios = ativos nomeados (+ residual se migração)
      const residual = Math.max(0, (empresa.hr.headcountResidual || 0));
      empresa.funcionarios = ativos + residual;
      return empresa.funcionarios;
    },

    listActive(empresa) {
      this.ensureCompanyHR(empresa);
      return (empresa.hr.funcionarios || []).filter((f) =>
        f.status === 'ativo' || f.status === 'treinamento' || f.status === 'afastado'
      );
    },

    getEmployee(empresa, empId) {
      return (empresa?.hr?.funcionarios || []).find((f) => f.id === empId) || null;
    },

    /* ========== Recrutamento ========== */

    openRecruitment(empresa, state, channelId, opts = {}) {
      this.ensureCompanyHR(empresa, state);
      const channel = CGL.Data.getChannelById(channelId) || CGL.Data.recruitmentChannels[0];
      const qty = opts.qty || CGL.Utils.randomInt(2, 5);
      const roleId = opts.roleId || this._defaultRoleForPorte(empresa.porte);
      const deptId = opts.deptId || null;

      // Custo do canal
      const custo = Math.round(channel.custoBase * qty * (1 + (CGL.Data.getRoleById(roleId)?.nivel || 1) * 0.08));
      if ((empresa.caixa || 0) < custo) {
        throw new Error(`Caixa insuficiente para recrutamento (${CGL.Utils.formatBRL(custo)}).`);
      }
      this._chargeCompany(empresa, state, custo, 'rh_recrutamento', `Recrutamento via ${channel.nome}`);

      // Interno: promove da própria base como candidatos
      if (channel.id === 'interno') {
        const pool = this.listActive(empresa).filter((f) => f.status === 'ativo');
        const cands = CGL.Utils.shuffle(pool).slice(0, qty).map((f) => {
          const clone = CGL.Utils.clone(f);
          clone.id = CGL.Utils.uuid();
          clone._origemInternaId = f.id;
          clone.status = 'candidato';
          clone.canalOrigem = 'interno';
          clone.cargoAlvoId = roleId;
          clone.revelado = this._candidateReveal(channel.revelacao);
          ATTR_KEYS.forEach((k) => { clone.revelado[k] = true; });
          return clone;
        });
        empresa.hr.candidatos = (empresa.hr.candidatos || []).concat(cands).slice(-CANDIDATE_CAP);
        this._logHr(empresa, state, `Abriu vaga interna (${cands.length} candidatos).`);
        return cands;
      }

      const cands = [];
      for (let i = 0; i < qty; i++) {
        const exceptional = Math.random() < 0.03 + channel.qualidade * 0.04;
        const emp = this.generateEmployee(empresa, state, {
          roleId,
          deptId: deptId || undefined,
          canal: channel.id,
          asCandidate: true,
          revelacao: channel.revelacao,
          exceptional
        });
        // Qualidade do canal empurra atributos
        ATTR_KEYS.forEach((k) => {
          if (k === 'estresse') return;
          emp[k] = CGL.Utils.clamp(
            Math.round(emp[k] + (channel.qualidade - 0.5) * 30),
            5,
            98
          );
        });
        emp.avaliacoesFeitas = [];
        cands.push(emp);
      }
      empresa.hr.candidatos = (empresa.hr.candidatos || []).concat(cands).slice(-CANDIDATE_CAP);
      this._logHr(empresa, state, `Recrutamento (${channel.nome}): ${cands.length} candidatos.`);
      return cands;
    },

    runAssessment(empresa, state, candidateId, assessmentId) {
      this.ensureCompanyHR(empresa, state);
      const cand = (empresa.hr.candidatos || []).find((c) => c.id === candidateId);
      if (!cand) throw new Error('Candidato não encontrado.');
      const assess = CGL.Data.getAssessmentById(assessmentId);
      if (!assess) throw new Error('Avaliação inválida.');
      if ((cand.avaliacoesFeitas || []).includes(assessmentId)) {
        throw new Error('Esta avaliação já foi aplicada neste candidato.');
      }
      if ((empresa.caixa || 0) < assess.custo) {
        throw new Error(`Caixa insuficiente (${CGL.Utils.formatBRL(assess.custo)}).`);
      }
      this._chargeCompany(empresa, state, assess.custo, 'rh_avaliacao', assess.nome);

      cand.avaliacoesFeitas = cand.avaliacoesFeitas || [];
      cand.avaliacoesFeitas.push(assessmentId);
      cand.scoreAvaliacao = (cand.scoreAvaliacao || 0) + assess.qualidadeBonus;

      // Revela atributos
      (assess.revela || []).forEach((key) => {
        if (key === 'tracosVisiveis') {
          (cand.tracos || []).forEach((tid) => {
            const t = CGL.Data.getTraitById(tid);
            if (t && !t.oculto && !cand.tracosRevelados.includes(tid)) {
              cand.tracosRevelados.push(tid);
            }
          });
        } else if (key === 'tracosOcultos') {
          (cand.tracos || []).forEach((tid) => {
            if (!cand.tracosRevelados.includes(tid)) cand.tracosRevelados.push(tid);
          });
        } else if (key === 'historico') {
          cand.revelado.etica = true;
          cand.revelado.experiencia = true;
        } else if (key === 'comunicacao') {
          cand.revelado.motivacao = true;
          cand.revelado.lideranca = true;
        } else if (cand.revelado[key] != null) {
          cand.revelado[key] = true;
        } else if (ATTR_KEYS.includes(key)) {
          cand.revelado[key] = true;
        }
      });

      // Score percebido (ruído se pouca avaliação)
      const noise = (1 - (cand.scoreAvaliacao || 0)) * 20;
      cand.notaPercebida = CGL.Utils.clamp(
        Math.round(
          (cand.produtividade + cand.inteligencia + cand.etica + cand.motivacao) / 4 +
            CGL.Utils.randomFloat(-noise, noise)
        ),
        1,
        100
      );

      return cand;
    },

    hireCandidate(empresa, state, candidateId, opts = {}) {
      this.ensureCompanyHR(empresa, state);
      const idx = (empresa.hr.candidatos || []).findIndex((c) => c.id === candidateId);
      if (idx < 0) throw new Error('Candidato não encontrado.');
      const cand = empresa.hr.candidatos[idx];

      // Risco de "problemático" cai com avaliações
      const risk = Math.max(0.02, 0.35 - (cand.scoreAvaliacao || 0));
      if (Math.random() < risk && (cand.etica || 50) < 40) {
        // Contrata mesmo assim — problema latente
        cand._problematico = true;
      }

      const salario = opts.salario != null ? opts.salario : cand.salarioExpectativa || cand.salario;
      cand.salario = Math.round(salario);
      cand.status = 'ativo';
      cand.semanaContratacao = state.world?.semanaAtual || 0;
      cand.tenureSemanas = 0;
      cand.empresaId = empresa.id;
      if (opts.cargoId) cand.cargoId = opts.cargoId;
      if (opts.deptId) cand.deptId = opts.deptId;

      // Interno: promove o original
      if (cand._origemInternaId) {
        const orig = this.getEmployee(empresa, cand._origemInternaId);
        if (orig) {
          orig.cargoId = cand.cargoAlvoId || cand.cargoId;
          orig.salario = cand.salario;
          orig.motivacao = CGL.Utils.clamp(orig.motivacao + 12, 0, 100);
          orig.lealdade = CGL.Utils.clamp(orig.lealdade + 8, 0, 100);
          empresa.hr.candidatos.splice(idx, 1);
          this._logHr(empresa, state, `${orig.nome} promovido(a) internamente.`);
          this.recalcClimate(empresa, state);
          this.syncHeadcount(empresa);
          return orig;
        }
      }

      empresa.hr.candidatos.splice(idx, 1);
      empresa.hr.funcionarios.push(cand);
      this._indexEmployee(state, cand);
      this.syncHeadcount(empresa);
      this.recalcClimate(empresa, state);

      if (cand.exceptional) {
        state.hr = this.ensureHr(state);
        state.hr.talentosExcepcionais = (state.hr.talentosExcepcionais || 0) + 1;
        CGL.Events.notify('success', 'Talento excepcional', `${cand.nome} pode revolucionar o departamento.`);
      }

      this._logHr(empresa, state, `Contratou ${cand.nome} (${CGL.Data.getRoleById(cand.cargoId)?.nome || cand.cargoId}).`);
      CGL.Company.addHistory(empresa, state, {
        tipo: 'rh',
        titulo: 'Contratação',
        descricao: `${cand.nome} admitido(a) como ${CGL.Data.getRoleById(cand.cargoId)?.nome}.`
      });
      return cand;
    },

    rejectCandidate(empresa, candidateId) {
      this.ensureCompanyHR(empresa);
      empresa.hr.candidatos = (empresa.hr.candidatos || []).filter((c) => c.id !== candidateId);
    },

    /* ========== Desligamento ========== */

    terminate(empresa, state, empId, tipoId, opts = {}) {
      this.ensureCompanyHR(empresa, state);
      const emp = this.getEmployee(empresa, empId);
      if (!emp || emp.status === 'demitido' || emp.status === 'pediu' || emp.status === 'aposentado') {
        throw new Error('Funcionário inválido.');
      }
      const tipo = CGL.Data.getTerminationById(tipoId) || CGL.Data.terminationTypes[0];
      const meses = Math.max(1, Math.floor((emp.tenureSemanas || 0) / 4));
      const rescisao = Math.round(emp.salario * tipo.custoMult * (0.5 + Math.min(meses, 12) * 0.08));

      if (tipoId !== 'pedido' && tipoId !== 'aposentadoria') {
        if ((empresa.caixa || 0) < rescisao) {
          throw new Error(`Caixa insuficiente para rescisão (${CGL.Utils.formatBRL(rescisao)}).`);
        }
        this._chargeCompany(empresa, state, rescisao, 'rh_rescisao', `Rescisão — ${emp.nome}`);
      } else if (rescisao > 0 && (empresa.caixa || 0) >= rescisao) {
        this._chargeCompany(empresa, state, rescisao, 'rh_rescisao', `Verbas — ${emp.nome}`);
      }

      emp.status = tipoId === 'pedido' ? 'pediu' : tipoId === 'aposentadoria' ? 'aposentado' : 'demitido';
      emp.semanaSaida = state.world?.semanaAtual || 0;

      // Moral / reputação
      const clima = empresa.hr.clima;
      clima.moral = CGL.Utils.clamp(clima.moral - tipo.moralHit, 0, 100);
      clima.confianca = CGL.Utils.clamp(clima.confianca - tipo.moralHit * 0.5, 0, 100);
      if (empresa.reputacao) {
        empresa.reputacao.salarios = CGL.Utils.clamp(
          (empresa.reputacao.salarios || 50) - tipo.reputacaoHit,
          0,
          100
        );
        empresa.reputacao.geral = CGL.Utils.clamp(
          (empresa.reputacao.geral || 50) - tipo.reputacaoHit * 0.5,
          0,
          100
        );
      }

      this.syncHeadcount(empresa);
      this.recalcClimate(empresa, state);
      this._logHr(empresa, state, `${emp.nome}: ${tipo.nome} (custo ${CGL.Utils.formatBRL(rescisao)}).`);
      CGL.Company.addHistory(empresa, state, {
        tipo: 'rh',
        titulo: tipo.nome,
        descricao: `${emp.nome} — ${tipo.nome}.`
      });

      // Sucessão interna se cargo alto e opts.autoSuccession
      if (opts.autoSuccession !== false && (CGL.Data.getRoleById(emp.cargoId)?.nivel || 0) >= 8) {
        this.tryInternalSuccession(empresa, state, emp.cargoId, emp.deptId);
      }

      return { emp, rescisao, tipo };
    },

    tryInternalSuccession(empresa, state, cargoId, deptId) {
      const role = CGL.Data.getRoleById(cargoId);
      if (!role) return null;
      const candidates = this.listActive(empresa)
        .filter((f) => f.status === 'ativo' && f.deptId === deptId)
        .filter((f) => (CGL.Data.getRoleById(f.cargoId)?.nivel || 0) >= role.nivel - 2)
        .filter((f) => f.cargoId !== cargoId)
        .sort((a, b) => (b.lideranca + b.potencial + b.lealdade) - (a.lideranca + a.potencial + a.lealdade));
      const pick = candidates[0];
      if (!pick) return null;
      const oldRole = pick.cargoId;
      pick.cargoId = cargoId;
      pick.salario = Math.round(
        CGL.Utils.clamp(pick.salario * 1.25, role.salarioMin, role.salarioMax)
      );
      pick.motivacao = CGL.Utils.clamp(pick.motivacao + 15, 0, 100);
      pick.lealdade = CGL.Utils.clamp(pick.lealdade + 10, 0, 100);
      this._logHr(empresa, state, `Sucessão: ${pick.nome} assume ${role.nome} (antes ${CGL.Data.getRoleById(oldRole)?.nome}).`);
      CGL.Events.notify('info', 'Sucessão interna', `${pick.nome} promovido(a) a ${role.nome}.`);
      return pick;
    },

    /* ========== Treinamento ========== */

    startTraining(empresa, state, empId, trainingId) {
      this.ensureCompanyHR(empresa, state);
      const emp = this.getEmployee(empresa, empId);
      if (!emp || emp.status !== 'ativo') throw new Error('Funcionário indisponível para treinamento.');
      const tr = CGL.Data.getTrainingById(trainingId);
      if (!tr) throw new Error('Treinamento inválido.');
      if ((empresa.caixa || 0) < tr.custo) {
        throw new Error(`Caixa insuficiente (${CGL.Utils.formatBRL(tr.custo)}).`);
      }
      this._chargeCompany(empresa, state, tr.custo, 'rh_treinamento', `${tr.nome} — ${emp.nome}`);
      emp.status = 'treinamento';
      emp.treinamentoId = tr.id;
      emp.semanasTreinamento = tr.semanas;
      empresa.hr.treinamentosAtivos.push({
        empId: emp.id,
        trainingId: tr.id,
        semanasRestantes: tr.semanas
      });
      this._logHr(empresa, state, `${emp.nome} em treinamento: ${tr.nome} (${tr.semanas} sem.).`);
      return emp;
    },

    _completeTraining(empresa, emp, trainingId) {
      const tr = CGL.Data.getTrainingById(trainingId);
      if (!tr) return;
      Object.keys(tr.boosts || {}).forEach((k) => {
        if (emp[k] != null) emp[k] = CGL.Utils.clamp(emp[k] + tr.boosts[k], 0, 100);
      });
      Object.keys(tr.attrs || {}).forEach((k) => {
        if (emp[k] != null) emp[k] = CGL.Utils.clamp(emp[k] + tr.attrs[k], 0, 100);
      });
      emp.aprendizado = CGL.Utils.clamp(emp.aprendizado + 3, 0, 100);
      emp.experiencia += 1;
      emp.status = 'ativo';
      emp.treinamentoId = null;
      emp.semanasTreinamento = 0;
    },

    /* ========== Avaliação de desempenho ========== */

    performanceReview(empresa, state, empId) {
      this.ensureCompanyHR(empresa, state);
      const emp = this.getEmployee(empresa, empId);
      if (!emp || (emp.status !== 'ativo' && emp.status !== 'treinamento')) {
        throw new Error('Funcionário inválido.');
      }
      const metas = CGL.Utils.randomInt(40, 95);
      const qualidade = CGL.Utils.clamp(Math.round((emp.etica + emp.inteligencia) / 2 + CGL.Utils.randomInt(-8, 8)), 1, 100);
      const assiduidade = CGL.Utils.clamp(100 - emp.estresse * 0.4 - (emp.burnout ? 20 : 0), 1, 100);
      const equipe = CGL.Utils.clamp(Math.round((emp.motivacao + emp.lealdade) / 2), 1, 100);
      const iniciativa = CGL.Utils.clamp(Math.round((emp.potencial + emp.criatividade) / 2), 1, 100);
      const nota = Math.round(
        emp.produtividade * 0.25 +
          metas * 0.15 +
          qualidade * 0.15 +
          assiduidade * 0.1 +
          equipe * 0.1 +
          emp.lideranca * 0.1 +
          iniciativa * 0.15
      );
      const review = {
        semana: state.world?.semanaAtual || 0,
        metas,
        produtividade: emp.produtividade,
        qualidade,
        assiduidade: Math.round(assiduidade),
        equipe,
        lideranca: emp.lideranca,
        iniciativa,
        nota: CGL.Utils.clamp(nota, 1, 100)
      };
      emp.ultimaAvaliacao = review;
      emp.historicoAvaliacoes = (emp.historicoAvaliacoes || []).slice(0, 8);
      emp.historicoAvaliacoes.unshift(review);

      // Revela mais atributos com o tempo
      ATTR_KEYS.forEach((k) => { emp.revelado[k] = true; });
      (emp.tracos || []).forEach((tid) => {
        if (!emp.tracosRevelados.includes(tid) && Math.random() < 0.35) {
          emp.tracosRevelados.push(tid);
        }
      });

      // Bônus / promoção / risco demissão
      if (nota >= 85) {
        emp.motivacao = CGL.Utils.clamp(emp.motivacao + 8, 0, 100);
        if (Math.random() < 0.25) this.promote(empresa, state, emp.id, { silent: true });
      } else if (nota < 40) {
        emp.motivacao = CGL.Utils.clamp(emp.motivacao - 10, 0, 100);
      }
      return review;
    },

    promote(empresa, state, empId, opts = {}) {
      const emp = this.getEmployee(empresa, empId);
      if (!emp) throw new Error('Funcionário não encontrado.');
      const role = CGL.Data.getRoleById(emp.cargoId);
      const next = (CGL.Data.roles || []).find((r) => r.nivel === (role?.nivel || 0) + 1);
      if (!next) throw new Error('Já está no topo da hierarquia.');
      emp.cargoId = next.id;
      emp.salario = Math.round(CGL.Utils.clamp(emp.salario * 1.2, next.salarioMin, next.salarioMax));
      emp.motivacao = CGL.Utils.clamp(emp.motivacao + 10, 0, 100);
      emp.lealdade = CGL.Utils.clamp(emp.lealdade + 6, 0, 100);
      if (!opts.silent) {
        this._logHr(empresa, state, `${emp.nome} promovido(a) a ${next.nome}.`);
        CGL.Events.notify('success', 'Promoção', `${emp.nome} → ${next.nome}`);
      }
      return emp;
    },

    /* ========== Benefícios e cultura ========== */

    setBenefits(empresa, state, benefitIds) {
      this.ensureCompanyHR(empresa, state);
      empresa.hr.beneficios = (benefitIds || []).filter((id) => CGL.Data.getBenefitById(id));
      this.recalcClimate(empresa, state);
      return empresa.hr.beneficios;
    },

    setCulture(empresa, state, valueIds, intensidade) {
      this.ensureCompanyHR(empresa, state);
      const vals = (valueIds || []).filter((id) => CGL.Data.getCultureById(id)).slice(0, 4);
      empresa.hr.culturaOrg = {
        valores: vals.length ? vals : ['meritocracia'],
        intensidade: CGL.Utils.clamp(intensidade != null ? intensidade : 50, 0, 100)
      };
      empresa.cultura = empresa.hr.culturaOrg.intensidade;
      this.recalcClimate(empresa, state);
      return empresa.hr.culturaOrg;
    },

    benefitWeeklyCost(empresa) {
      this.ensureCompanyHR(empresa);
      const n = this.listActive(empresa).length || 1;
      let cost = 0;
      (empresa.hr.beneficios || []).forEach((id) => {
        const b = CGL.Data.getBenefitById(id);
        if (b) cost += (b.custoPorFunc || 0) * n;
      });
      // PLR: estimado sobre lucro
      const plr = (empresa.hr.beneficios || []).some((id) => id === 'plr');
      if (plr && (empresa.lucro || 0) > 0) {
        const def = CGL.Data.getBenefitById('plr');
        cost += Math.round((empresa.lucro || 0) * (def?.plrPct || 0.05));
      }
      return Math.round(cost / 4); // mensal → semanal
    },

    weeklyPayroll(empresa) {
      this.ensureCompanyHR(empresa);
      const ativos = this.listActive(empresa);
      let total = ativos.reduce((s, f) => s + (f.salario || 0), 0);
      // Residual headcount abstrato
      const residual = empresa.hr.headcountResidual || 0;
      if (residual > 0) total += residual * 2800;
      return Math.round(total / 4);
    },

    /* ========== Clima ========== */

    recalcClimate(empresa, state) {
      this.ensureCompanyHR(empresa, state);
      const ativos = this.listActive(empresa);
      const clima = empresa.hr.clima;
      if (!ativos.length) {
        Object.assign(clima, this.defaultClimate());
        return clima;
      }
      const avg = (key) => ativos.reduce((s, f) => s + (f[key] || 50), 0) / ativos.length;
      const benSat = (empresa.hr.beneficios || []).reduce((s, id) => {
        const b = CGL.Data.getBenefitById(id);
        return s + (b?.satisfacao || 0);
      }, 0);
      const cult = empresa.hr.culturaOrg?.intensidade || 50;

      clima.moral = CGL.Utils.clamp(Math.round(avg('motivacao') * 0.6 + benSat * 1.2 + (100 - avg('estresse')) * 0.2), 0, 100);
      clima.engajamento = CGL.Utils.clamp(Math.round(avg('produtividade') * 0.5 + avg('motivacao') * 0.5), 0, 100);
      clima.confianca = CGL.Utils.clamp(Math.round(avg('lealdade') * 0.7 + avg('etica') * 0.3), 0, 100);
      clima.cultura = CGL.Utils.clamp(Math.round(cult * 0.7 + avg('lealdade') * 0.3), 0, 100);
      clima.comunicacao = CGL.Utils.clamp(Math.round(50 + (ativos.filter((f) => (f.tracosRevelados || []).includes('comunicativo')).length / ativos.length) * 40), 0, 100);
      clima.colaboracao = CGL.Utils.clamp(Math.round(avg('motivacao') * 0.4 + clima.confianca * 0.4 + clima.comunicacao * 0.2), 0, 100);

      empresa.hr.produtividadeMedia = Math.round(avg('produtividade'));
      empresa.cultura = clima.cultura;

      // Eficiência da empresa sofre influência do clima
      if (empresa.eficiencia != null) {
        const target = 35 + clima.engajamento * 0.35 + empresa.hr.produtividadeMedia * 0.15;
        empresa.eficiencia = CGL.Utils.clamp(
          Math.round(empresa.eficiencia * 0.85 + target * 0.15),
          15,
          95
        );
      }
      return clima;
    },

    /* ========== Folha / finanças ========== */

    /**
     * Calcula folha real e alimenta Finance/agenda.
     * Não debita caixa de novo: o custo de headcount já entra no tick operacional
     * da Company; aqui só reconciliamos o valor e o clima se a empresa estiver sem caixa.
     */
    processPayroll(empresa, state) {
      this.ensureCompanyHR(empresa, state);
      if (!empresa.ativa || empresa.concorrente) return 0;
      const folha = this.weeklyPayroll(empresa);
      const benef = this.benefitWeeklyCost(empresa);
      empresa.hr.folhaSemanal = folha;
      empresa.hr.custoBeneficiosSemanal = benef;
      const total = folha + benef;

      if (CGL.Finance?.ensureCompanyFinance) {
        try {
          const fin = CGL.Finance.ensureCompanyFinance(empresa, state);
          fin._folhaRhSemanal = folha;
          fin._beneficiosRhSemanal = benef;
          fin._folhaReal = total;
        } catch (e) { /* ok */ }
      }

      // Empresa sem caixa para honrar a folha implícita → clima e moral sofrem
      if (total > 0 && (empresa.caixa || 0) < total * 0.25) {
        empresa.hr.clima.moral = CGL.Utils.clamp((empresa.hr.clima.moral || 50) - 6, 0, 100);
        this.listActive(empresa).forEach((f) => {
          f.motivacao = CGL.Utils.clamp(f.motivacao - 4, 0, 100);
          f.lealdade = CGL.Utils.clamp(f.lealdade - 2, 0, 100);
        });
        if (Math.random() < 0.35) {
          CGL.Events.notify('warning', empresa.nomeFantasia, 'Caixa apertado frente à folha — clima deteriora.');
        }
      }
      return total;
    },

    payrollAgendaEstimate(empresa) {
      this.ensureCompanyHR(empresa);
      const v = this.weeklyPayroll(empresa) + this.benefitWeeklyCost(empresa);
      return v > 0 ? v : Math.round((empresa.funcionarios || 0) * 1800 / 4);
    },

    /* ========== Tick semanal ========== */

    weeklyTick(state) {
      this.ensureHr(state);
      const hrState = state.hr;
      const semana = state.world?.semanaAtual || 0;
      if (hrState.semanaUltimoTick === semana) return hrState;
      hrState.semanaUltimoTick = semana;

      (state.companies?.empresas || []).forEach((empresa) => {
        if (!empresa.ativa || empresa.concorrente) return;
        this.ensureCompanyHR(empresa, state);
        if (!empresa.hr.seeded && (empresa.funcionarios || 0) > 0) {
          this.seedStaff(empresa, state, Math.min(empresa.funcionarios, SEED_CAP));
          empresa.hr.seeded = true;
        }

        this._tickEmployees(empresa, state);
        this._tickTrainings(empresa, state);
        this._tickBurnout(empresa, state);
        this._tickResignations(empresa, state);
        this._tickUnion(empresa, state);
        this.processPayroll(empresa, state);
        this.recalcClimate(empresa, state);
        this._tickReviews(empresa, state);
        this._tickHrEvents(empresa, state);
        this.syncHeadcount(empresa);

        // Produtividade média alimenta receita residual via eficiência (já em recalcClimate)
      });

      return hrState;
    },

    _tickEmployees(empresa, state) {
      const ativos = this.listActive(empresa);
      ativos.forEach((f) => {
        if (f.status === 'afastado') {
          f.saude = CGL.Utils.clamp(f.saude + 4, 0, 100);
          f.estresse = CGL.Utils.clamp(f.estresse - 6, 0, 100);
          if (f.saude > 60 && f.estresse < 50 && Math.random() < 0.4) {
            f.status = 'ativo';
            f.burnout = false;
          }
          return;
        }
        f.tenureSemanas = (f.tenureSemanas || 0) + 1;
        // Idade ~1 ano / 52 semanas
        if (f.tenureSemanas % 52 === 0) {
          f.idade = (f.idade || 30) + 1;
          f.experiencia = (f.experiencia || 0) + 1;
        }
        // Estresse sobe com sobrecarga; benefícios e cultura mitigam
        const benefRelief = (empresa.hr.beneficios || []).reduce((s, id) => {
          const b = CGL.Data.getBenefitById(id);
          return s + (b?.estresseBoost || 0);
        }, 0);
        const workPressure = 2 + (empresa.hr.sindicato?.greveAtiva ? 5 : 0);
        f.estresse = CGL.Utils.clamp(f.estresse + workPressure + benefRelief * 0.25, 0, 100);
        f.motivacao = CGL.Utils.clamp(
          f.motivacao + (empresa.hr.clima.moral - 50) * 0.05 - (f.estresse > 70 ? 2 : 0),
          0,
          100
        );
        // Aprendizado natural
        if (Math.random() < 0.1) {
          f.produtividade = CGL.Utils.clamp(f.produtividade + f.aprendizado * 0.02, 0, 100);
        }
        // Revela traços ocultos com tenure
        if (f.tenureSemanas > 12 && Math.random() < 0.08) {
          (f.tracos || []).forEach((tid) => {
            if (!f.tracosRevelados.includes(tid)) f.tracosRevelados.push(tid);
          });
        }
        // Aposentadoria
        if (f.idade >= 65 && Math.random() < 0.08) {
          try {
            this.terminate(empresa, state, f.id, 'aposentadoria', { autoSuccession: true });
          } catch (e) { /* ok */ }
        }
      });
    },

    _tickTrainings(empresa) {
      const list = empresa.hr.treinamentosAtivos || [];
      const remain = [];
      list.forEach((t) => {
        t.semanasRestantes -= 1;
        const emp = this.getEmployee(empresa, t.empId);
        if (!emp) return;
        if (t.semanasRestantes <= 0) {
          this._completeTraining(empresa, emp, t.trainingId);
        } else {
          emp.semanasTreinamento = t.semanasRestantes;
          remain.push(t);
        }
      });
      empresa.hr.treinamentosAtivos = remain;
    },

    _tickBurnout(empresa, state) {
      this.listActive(empresa).forEach((f) => {
        if (f.status !== 'ativo') return;
        if (f.estresse >= 85) {
          f.burnout = true;
          f.produtividade = CGL.Utils.clamp(f.produtividade - 8, 5, 100);
          f.saude = CGL.Utils.clamp(f.saude - 5, 1, 100);
          if (f.estresse >= 95 && Math.random() < 0.2) {
            f.status = 'afastado';
            this._logHr(empresa, state, `${f.nome} afastado(a) por burnout.`);
            CGL.Events.notify('warning', 'Burnout', `${f.nome} foi afastado(a).`);
          } else if (f.estresse >= 90 && Math.random() < 0.12) {
            try {
              this.terminate(empresa, state, f.id, 'pedido', { autoSuccession: true });
              CGL.Events.notify('warning', 'Pedido de demissão', `${f.nome} saiu por estresse.`);
            } catch (e) { /* ok */ }
          }
        } else if (f.estresse < 60) {
          f.burnout = false;
        }
      });
    },

    _tickResignations(empresa, state) {
      this.listActive(empresa).forEach((f) => {
        if (f.status !== 'ativo') return;
        let chance = 0.005;
        if (f.lealdade < 30) chance += 0.04;
        if (f.motivacao < 25) chance += 0.03;
        if (f.exceptional) chance += 0.02; // propostas da concorrência
        if (empresa.hr.clima.moral < 35) chance += 0.02;
        if (Math.random() < chance) {
          try {
            this.terminate(empresa, state, f.id, 'pedido', { autoSuccession: true });
          } catch (e) { /* ok */ }
        }
      });
    },

    _tickUnion(empresa, state) {
      const syn = empresa.hr.sindicato;
      if (!syn.presente) {
        // Chance de sindicalização se moral baixa
        if (empresa.hr.clima.moral < 40 && Math.random() < 0.02) {
          syn.presente = true;
          syn.forca = CGL.Utils.randomInt(25, 55);
          CGL.Events.notify('warning', empresa.nomeFantasia, 'Funcionários formaram representação sindical.');
        }
        return;
      }
      syn.proximoDissidio = (syn.proximoDissidio || 26) - 1;
      syn.satisfacao = CGL.Utils.clamp(
        syn.satisfacao + (empresa.hr.clima.moral - 50) * 0.1,
        0,
        100
      );
      if (syn.greveAtiva) {
        syn.semanasGreve = (syn.semanasGreve || 0) + 1;
        // Greve reduz operação
        empresa.receita = Math.round((empresa.receita || 0) * 0.55);
        if (syn.semanasGreve >= 2 && (syn.satisfacao > 55 || Math.random() < 0.35)) {
          syn.greveAtiva = false;
          syn.semanasGreve = 0;
          // Reajuste obrigatório
          this.listActive(empresa).forEach((f) => {
            f.salario = Math.round(f.salario * 1.05);
          });
          CGL.Events.notify('info', 'Fim da greve', `${empresa.nomeFantasia}: acordo com reajuste de 5%.`);
        }
      } else if (syn.satisfacao < 30 && syn.forca > 40 && Math.random() < 0.08) {
        syn.greveAtiva = true;
        syn.semanasGreve = 0;
        CGL.Events.notify('error', 'Greve', `Greve em ${empresa.nomeFantasia}!`);
        this._pushEvent(state, empresa, 'greve_iminente', 'Greve deflagrada');
      }
      if (syn.proximoDissidio <= 0) {
        syn.proximoDissidio = 26;
        this.listActive(empresa).forEach((f) => {
          f.salario = Math.round(f.salario * 1.03);
        });
        syn.satisfacao = CGL.Utils.clamp(syn.satisfacao + 8, 0, 100);
        this._logHr(empresa, state, 'Dissídio coletivo: reajuste de 3%.');
      }
    },

    _tickReviews(empresa, state) {
      const semana = state.world?.semanaAtual || 0;
      // Avaliações periódicas a cada ~13 semanas
      if (semana - (empresa.hr.semanaUltimoReview || 0) < 13) return;
      empresa.hr.semanaUltimoReview = semana;
      const sample = CGL.Utils.shuffle(this.listActive(empresa).filter((f) => f.status === 'ativo')).slice(0, 5);
      sample.forEach((f) => {
        try { this.performanceReview(empresa, state, f.id); } catch (e) { /* ok */ }
      });
    },

    _tickHrEvents(empresa, state) {
      const defs = CGL.Data.hrEventDefs || [];
      defs.forEach((def) => {
        let chance = def.chance;
        if (def.id === 'greve_iminente' && empresa.hr.sindicato?.satisfacao < 40) chance *= 2;
        if (def.id === 'burnout_crise' && empresa.hr.produtividadeMedia < 40) chance *= 1.5;
        if (def.id === 'escandalo') {
          const bad = this.listActive(empresa).filter((f) => f.etica < 30 || f._problematico);
          if (!bad.length) return;
          chance *= 1.5;
        }
        if (Math.random() > chance) return;
        this._resolveHrEvent(empresa, state, def);
      });
    },

    _resolveHrEvent(empresa, state, def) {
      const ativos = this.listActive(empresa);
      const pick = CGL.Utils.pick(ativos);
      let msg = def.nome;
      switch (def.id) {
        case 'processo_trabalhista': {
          const custo = CGL.Utils.randomInt(5000, 40000);
          this._chargeCompany(empresa, state, Math.min(custo, empresa.caixa || 0), 'rh_processo', 'Processo trabalhista');
          if (empresa.reputacao) {
            empresa.reputacao.processos = (empresa.reputacao.processos || 0) + 1;
            empresa.reputacao.geral = CGL.Utils.clamp((empresa.reputacao.geral || 50) - 4, 0, 100);
          }
          msg = `Processo trabalhista — custo ${CGL.Utils.formatBRL(custo)}.`;
          break;
        }
        case 'diretor_demite': {
          const dirs = ativos.filter((f) => ['diretor', 'vp', 'gerente'].includes(f.cargoId));
          const d = dirs[0] || pick;
          if (d) {
            try { this.terminate(empresa, state, d.id, 'pedido', { autoSuccession: true }); } catch (e) { /* ok */ }
            msg = `${d.nome} (liderança) pediu demissão.`;
          }
          break;
        }
        case 'greve_iminente':
          if (empresa.hr.sindicato.presente) {
            empresa.hr.sindicato.satisfacao = CGL.Utils.clamp(empresa.hr.sindicato.satisfacao - 15, 0, 100);
            msg = 'Tensão sindical aumenta — greve pode eclodir.';
          } else {
            msg = 'Movimentação por direitos trabalhistas.';
          }
          break;
        case 'acidente':
          if (pick) {
            pick.saude = CGL.Utils.clamp(pick.saude - 25, 1, 100);
            pick.status = 'afastado';
            if (empresa.reputacao) empresa.reputacao.acidentes = (empresa.reputacao.acidentes || 0) + 1;
            msg = `Acidente envolvendo ${pick.nome}.`;
          }
          break;
        case 'trainee_sucesso':
          empresa.hr.clima.engajamento = CGL.Utils.clamp(empresa.hr.clima.engajamento + 8, 0, 100);
          msg = 'Programa de trainee reforça o pipeline de talentos.';
          break;
        case 'viral_positivo':
          if (empresa.reputacao) {
            empresa.reputacao.social = CGL.Utils.clamp((empresa.reputacao.social || 50) + 8, 0, 100);
            empresa.reputacao.geral = CGL.Utils.clamp((empresa.reputacao.geral || 50) + 3, 0, 100);
          }
          msg = pick ? `${pick.nome} viraliza positivamente.` : def.nome;
          break;
        case 'escandalo':
          if (pick) {
            if (empresa.reputacao) {
              empresa.reputacao.escandalos = (empresa.reputacao.escandalos || 0) + 1;
              empresa.reputacao.geral = CGL.Utils.clamp((empresa.reputacao.geral || 50) - 10, 0, 100);
            }
            msg = `Escândalo envolvendo ${pick.nome}.`;
          }
          break;
        case 'parceria_uni':
          empresa.hr.clima.cultura = CGL.Utils.clamp(empresa.hr.clima.cultura + 5, 0, 100);
          msg = 'Parceria com universidade para formação de talentos.';
          break;
        case 'concorrente_poe': {
          const talent = ativos.filter((f) => f.exceptional || f.produtividade > 80);
          const t = talent[0] || pick;
          if (t && Math.random() < 0.4) {
            try { this.terminate(empresa, state, t.id, 'pedido'); } catch (e) { /* ok */ }
            msg = `Concorrente contratou ${t.nome}.`;
          } else {
            msg = 'Concorrente tentou poachar a equipe — retenção ok.';
            if (t) t.lealdade = CGL.Utils.clamp(t.lealdade + 5, 0, 100);
          }
          break;
        }
        case 'burnout_crise':
          ativos.slice(0, 3).forEach((f) => {
            f.estresse = CGL.Utils.clamp(f.estresse + 15, 0, 100);
          });
          msg = 'Onda de burnout no time.';
          break;
        default:
          break;
      }
      this._pushEvent(state, empresa, def.id, msg);
      this._logHr(empresa, state, msg);
      const tone = def.severidade >= 3 ? 'error' : def.severidade >= 2 ? 'warning' : 'info';
      CGL.Events.notify(tone, 'RH', msg);
    },

    /* ========== Helpers ========== */

    _chargeCompany(empresa, state, valor, categoria, desc) {
      const v = Math.round(Math.max(0, valor));
      if (v <= 0) return;
      empresa.caixa = Math.max(0, (empresa.caixa || 0) - v);
      if (CGL.Finance?.ensureCompanyFinance) {
        try {
          const fin = CGL.Finance.ensureCompanyFinance(empresa, state);
          const conta = CGL.Finance.primaryAccount?.(fin);
          if (conta) {
            conta.disponivel = Math.max(0, (conta.disponivel || 0) - v);
            if (CGL.Finance._postLedger) {
              CGL.Finance._postLedger(fin, state, {
                tipo: 'saida',
                categoria: categoria || 'rh',
                descricao: desc || 'Despesa de RH',
                valor: v,
                contaId: conta.id,
                empresaId: empresa.id
              });
            }
          }
        } catch (e) { /* ok */ }
      }
    },

    _logHr(empresa, state, texto) {
      const hr = empresa.hr;
      hr.historico = hr.historico || [];
      hr.historico.unshift({
        semana: state.world?.semanaAtual || 0,
        texto
      });
      if (hr.historico.length > HISTORY_CAP) hr.historico.length = HISTORY_CAP;
    },

    _pushEvent(state, empresa, tipo, mensagem) {
      this.ensureHr(state);
      state.hr.eventos.unshift({
        id: CGL.Utils.uuid(),
        semana: state.world?.semanaAtual || 0,
        empresaId: empresa.id,
        empresaNome: empresa.nomeFantasia,
        tipo,
        mensagem
      });
      if (state.hr.eventos.length > EVENT_CAP) state.hr.eventos.length = EVENT_CAP;
    },

    /** Visão pública de atributo (respeita revelação) */
    visibleAttr(emp, key) {
      if (!emp) return null;
      if (emp.revelado?.[key] || emp.status === 'ativo' && emp.tenureSemanas > 0 && emp.revelado?.[key] !== false) {
        // Para funcionários ativos com tenure, muitos attrs já revelados
      }
      if (emp.status === 'candidato' && !emp.revelado?.[key]) return null;
      if (emp.revelado && emp.revelado[key] === false) return null;
      return emp[key];
    },

    dashboardSummary(state) {
      this.ensureHr(state);
      const companies = CGL.Company.listPlayerCompanies(state);
      let headcount = 0;
      let folha = 0;
      let moral = 0;
      let n = 0;
      companies.forEach((e) => {
        this.ensureCompanyHR(e, state);
        headcount += this.listActive(e).length;
        folha += this.weeklyPayroll(e);
        moral += e.hr.clima.moral || 50;
        n += 1;
      });
      return {
        empresas: n,
        headcount,
        folhaSemanal: folha,
        moralMedia: n ? Math.round(moral / n) : 50,
        eventos: (state.hr.eventos || []).length,
        talentos: state.hr.talentosExcepcionais || 0
      };
    }
  };

  // Patch Debt agenda folha quando disponível
  function patchDebtAgenda() {
    if (!global.CGL?.Debt?.buildCalendar || global.CGL.Debt._hrPatched) return;
    const orig = global.CGL.Debt.buildCalendar.bind(global.CGL.Debt);
    global.CGL.Debt.buildCalendar = function (empresa, state) {
      const agenda = orig(empresa, state);
      if (!empresa?.hr || !CGL.Hr) return agenda;
      try {
        const folha = CGL.Hr.payrollAgendaEstimate(empresa);
        const item = (empresa.finance?.agendaFinanceira || []).find((a) => a.tipo === 'folha');
        if (item) {
          item.valor = folha;
          item.descricao = 'Folha salarial + benefícios (RH)';
        }
      } catch (e) { /* ok */ }
      return agenda;
    };
    global.CGL.Debt._hrPatched = true;
  }

  // Patch Company.constitute para bootstrap RH
  function patchCompanyCreate() {
    if (!global.CGL?.Company?.constitute || global.CGL.Company._hrPatched) return;
    const orig = global.CGL.Company.constitute.bind(global.CGL.Company);
    global.CGL.Company.constitute = function (state, data) {
      const empresa = orig(state, data);
      try { CGL.Hr.onCompanyCreated(empresa, state); } catch (e) { console.warn(e); }
      return empresa;
    };
    global.CGL.Company._hrPatched = true;
  }

  // Patch Finance.applyOperatingWeek: DRE/ledger de salários usa folha RH quando existir
  function patchFinancePayroll() {
    if (!global.CGL?.Finance?.applyOperatingWeek || global.CGL.Finance._hrPatched) return;
    const orig = global.CGL.Finance.applyOperatingWeek.bind(global.CGL.Finance);
    global.CGL.Finance.applyOperatingWeek = function (empresa, state) {
      // Garante métricas de folha antes do desdobramento contábil
      if (empresa && !empresa.concorrente && CGL.Hr?.weeklyPayroll) {
        try {
          CGL.Hr.ensureCompanyHR(empresa, state);
          const folha = CGL.Hr.weeklyPayroll(empresa);
          const benef = CGL.Hr.benefitWeeklyCost(empresa);
          empresa.hr.folhaSemanal = folha;
          empresa.hr.custoBeneficiosSemanal = benef;
          const fin = CGL.Finance.ensureCompanyFinance(empresa, state);
          fin._folhaRhSemanal = folha;
          fin._beneficiosRhSemanal = benef;
          fin._folhaReal = folha + benef;
        } catch (e) { /* ok */ }
      }
      orig(empresa, state);
      // Substitui alocação estimada de salários no último DRE pela folha RH
      const fin = empresa?.finance;
      if (fin?._folhaReal > 0 && fin.dreHistorico?.[0]) {
        const dre = fin.dreHistorico[0];
        const real = fin._folhaReal;
        if (dre.salarios != null) dre.salarios = real;
        dre.beneficios = fin._beneficiosRhSemanal || 0;
      }
    };
    global.CGL.Finance._hrPatched = true;
  }

  function installPatches() {
    patchDebtAgenda();
    patchCompanyCreate();
    patchFinancePayroll();
  }

  global.CGL = global.CGL || {};
  global.CGL.Hr = Hr;
  installPatches();
  // Re-tenta após outros scripts (index carrega hr antes de debt às vezes)
  if (typeof setTimeout === 'function') {
    setTimeout(installPatches, 0);
  }
})(typeof window !== 'undefined' ? window : globalThis);
