/**
 * CONGLOMERADO — Jogador (CEO), necessidades e histórico pessoal
 */
(function (global) {
  'use strict';

  const NEED_KEYS = ['saude', 'estresse', 'energia', 'felicidade', 'reputacao', 'motivacao'];

  const Player = {
    NEED_KEYS,

    /** Atributos padrão */
    defaultAttributes() {
      const attrs = {};
      CGL.Data.attributeDefs.forEach((a) => {
        attrs[a.id] = CGL.Data.ATTR_BASE;
      });
      return attrs;
    },

    /** Necessidades iniciais */
    defaultNeeds(origin) {
      const base = {
        saude: 78,
        estresse: 28,
        energia: 72,
        felicidade: 65,
        reputacao: origin?.reputacaoInicial ?? 50,
        motivacao: CGL.Utils.clamp(60 + (origin?.motivacaoBonus || 0), 20, 95)
      };
      return base;
    },

    /**
     * Cria jogador a partir do formulário de criação
     */
    createFromCreation(data) {
      const origin = CGL.Data.getOriginById(data.origemId);
      const course = CGL.Data.getCourseById(data.cursoId);
      const attrs = { ...this.defaultAttributes(), ...data.atributos };

      // Aplica bônus do curso (limitado)
      if (course?.bonusAtributos) {
        Object.entries(course.bonusAtributos).forEach(([k, v]) => {
          if (attrs[k] != null) {
            attrs[k] = CGL.Utils.clamp(attrs[k] + v, 1, CGL.Data.ATTR_MAX + 2);
          }
        });
      }

      const birth = new Date(data.dataNascimento);
      const startDate = new Date(CGL.World.START_DATE + 'T12:00:00');
      const player = {
        id: CGL.Utils.uuid(),
        nome: data.nome.trim(),
        sobrenome: data.sobrenome.trim(),
        sexo: data.sexo,
        dataNascimento: birth.toISOString(),
        idade: 22,
        avatar: data.avatar,
        cidadeNascimentoId: data.cidadeNascimentoId,
        cidadeMoradiaId: data.cidadeMoradiaId,
        cursoId: data.cursoId,
        atributos: attrs,
        personalidade: data.tracos.slice(),
        sonhos: data.sonhos.slice(),
        origemId: data.origemId,
        necessidades: this.defaultNeeds(origin),
        patrimonio: origin?.capitalInicial ?? 10000,
        dinheiro: origin?.capitalInicial ?? 10000,
        contatos: origin?.contatos ?? 20,
        acessoMercado: origin?.acessoMercado ?? 30,
        ajudaFamiliar: origin?.ajudaFamiliar ?? 20,
        pressaoFamiliar: origin?.pressao ?? 5,
        herancaPotencial: origin?.herancaPotencial ?? 0,
        familia: [],
        historico: [],
        emprego: null,
        empresasIds: [],
        estatisticas: {
          semanasJogadas: 0,
          decisoes: 0,
          eventosVividos: 0
        }
      };

      player.familia = CGL.Family.generate(player, origin);
      player.familia.forEach((m) => {
        m.cidadeId = player.cidadeMoradiaId;
      });

      // Histórico inicial: formatura
      this.addHistory({ player, world: { semanaAtual: 1, dataAtual: startDate.toISOString() } }, {
        tipo: 'formatura',
        titulo: 'Formatura',
        descricao: `Formou-se em ${course?.nome || 'curso superior'} aos 22 anos.`
      }, true);

      this.addHistory({ player, world: { semanaAtual: 1, dataAtual: startDate.toISOString() } }, {
        tipo: 'mudanca',
        titulo: 'Nova etapa',
        descricao: `Começa a vida adulta em ${CGL.Data.getCityById(player.cidadeMoradiaId)?.nome || 'sua cidade'}.`
      }, true);

      if (origin) {
        this.addHistory({ player, world: { semanaAtual: 1, dataAtual: startDate.toISOString() } }, {
          tipo: 'origem',
          titulo: 'Origem familiar',
          descricao: `Origem: ${origin.nome}. ${origin.descricao}`
        }, true);
      }

      return player;
    },

    /** Adiciona entrada ao histórico pessoal */
    addHistory(state, entry, silent = false) {
      const player = state.player || state;
      if (!player.historico) player.historico = [];
      const world = state.world || {};
      player.historico.unshift({
        id: CGL.Utils.uuid(),
        semana: world.semanaAtual || 1,
        data: world.dataAtual || new Date().toISOString(),
        tipo: entry.tipo || 'geral',
        titulo: entry.titulo || 'Evento',
        descricao: entry.descricao || '',
        ...entry
      });
      if (!silent && player.estatisticas) {
        player.estatisticas.eventosVividos = (player.estatisticas.eventosVividos || 0) + 1;
      }
    },

    /** Recalcula patrimônio líquido simples (Fase 1) */
    calcNetWorth(player) {
      return (player.dinheiro || 0) + (player.patrimonioEmpresarial || 0) + (player.ativos || 0);
    },

    /**
     * Atualiza necessidades semanalmente — nunca estáticas
     */
    weeklyNeeds(state) {
      const p = state.player;
      const n = p.necessidades;
      const attrs = p.atributos || {};
      const origin = CGL.Data.getOriginById(p.origemId);

      // Recuperação natural de energia/saúde vs. estresse
      const stressResist = (attrs.resistenciaEstresse || 5) / 15;
      const healthAttr = (attrs.saude || 5) / 15;

      n.energia = CGL.Utils.clamp(
        n.energia + CGL.Utils.randomInt(-6, 5) + Math.floor(healthAttr * 2),
        5,
        100
      );
      n.estresse = CGL.Utils.clamp(
        n.estresse + CGL.Utils.randomInt(-3, 6) - Math.floor(stressResist * 3) + Math.floor((p.pressaoFamiliar || 0) / 20),
        0,
        100
      );
      n.saude = CGL.Utils.clamp(
        n.saude + CGL.Utils.randomInt(-3, 3) + (n.estresse > 70 ? -2 : 1) + (n.energia < 30 ? -2 : 0),
        5,
        100
      );
      n.felicidade = CGL.Utils.clamp(
        n.felicidade + CGL.Utils.randomInt(-4, 4) - (n.estresse > 60 ? 2 : 0) + (n.motivacao > 70 ? 1 : 0),
        5,
        100
      );
      n.motivacao = CGL.Utils.clamp(
        n.motivacao + CGL.Utils.randomInt(-3, 3) + (origin?.motivacaoBonus ? Math.sign(origin.motivacaoBonus) : 0),
        5,
        100
      );
      // Reputação oscila pouco sem empresas ainda
      n.reputacao = CGL.Utils.clamp(
        n.reputacao + CGL.Utils.randomInt(-1, 1),
        0,
        100
      );

      // Feedback extremo
      if (n.estresse >= 90 && Math.random() < 0.15) {
        this.addHistory(state, {
          tipo: 'doenca',
          titulo: 'Esgotamento',
          descricao: 'O estresse elevado prejudicou a saúde nesta semana.'
        });
        n.saude = CGL.Utils.clamp(n.saude - 5, 5, 100);
        n.energia = CGL.Utils.clamp(n.energia - 8, 5, 100);
      }

      p.patrimonio = this.calcNetWorth(p);
      p.estatisticas.semanasJogadas = (p.estatisticas.semanasJogadas || 0) + 1;

      // Idade a cada 52 semanas
      if (state.world.semanaAtual % 52 === 0) {
        p.idade = CGL.Utils.calcAge(p.dataNascimento, CGL.World.getDate(state.world));
      }
    }
  };

  global.CGL = global.CGL || {};
  global.CGL.Player = Player;
})(typeof window !== 'undefined' ? window : globalThis);
