/**
 * CONGLOMERADO — Família NPC e relacionamentos (hooks para tick semanal)
 */
(function (global) {
  'use strict';

  const RELACOES = ['pai', 'mae', 'irmao', 'irma', 'tio', 'tia', 'avo', 'ava'];

  const Family = {
    /**
     * Gera família automática a partir do jogador e origem
     */
    generate(player, origin) {
      const names = CGL.Data.names;
      const surname = player.sobrenome || CGL.Utils.pick(names.SURNAMES);
      const motherSurname = CGL.Utils.pick(names.SURNAMES);
      const traitsPool = CGL.Data.traits.map((t) => t.id);
      const wealth = origin?.id || 'media';

      const fatherAge = CGL.Utils.randomInt(45, 62);
      const motherAge = CGL.Utils.randomInt(42, 58);
      const members = [];

      members.push(this._makeMember({
        relacao: 'pai',
        sexo: 'M',
        nome: CGL.Utils.pick(names.FIRST_M),
        sobrenome: surname,
        idade: fatherAge,
        wealth,
        traitsPool
      }));

      members.push(this._makeMember({
        relacao: 'mae',
        sexo: 'F',
        nome: CGL.Utils.pick(names.FIRST_F),
        sobrenome: motherSurname,
        idade: motherAge,
        wealth,
        traitsPool
      }));

      const siblings = CGL.Utils.randomInt(0, 3);
      for (let i = 0; i < siblings; i++) {
        const isF = Math.random() < 0.5;
        const age = CGL.Utils.randomInt(16, 30);
        members.push(this._makeMember({
          relacao: isF ? 'irma' : 'irmao',
          sexo: isF ? 'F' : 'M',
          nome: CGL.Utils.pick(isF ? names.FIRST_F : names.FIRST_M),
          sobrenome: surname,
          idade: age,
          wealth,
          traitsPool
        }));
      }

      // Avós ocasionais
      if (Math.random() < 0.55) {
        members.push(this._makeMember({
          relacao: 'avo',
          sexo: 'M',
          nome: CGL.Utils.pick(names.FIRST_M),
          sobrenome: surname,
          idade: CGL.Utils.randomInt(68, 88),
          wealth,
          traitsPool
        }));
      }
      if (Math.random() < 0.55) {
        members.push(this._makeMember({
          relacao: 'ava',
          sexo: 'F',
          nome: CGL.Utils.pick(names.FIRST_F),
          sobrenome: motherSurname,
          idade: CGL.Utils.randomInt(66, 90),
          wealth,
          traitsPool
        }));
      }

      return members;
    },

    _makeMember({ relacao, sexo, nome, sobrenome, idade, wealth, traitsPool }) {
      const wealthMod = {
        extremamente_pobre: -30,
        pobre: -20,
        media_baixa: -10,
        media: 0,
        media_alta: 15,
        rica: 35,
        extremamente_rica: 55
      }[wealth] || 0;

      const saude = CGL.Utils.clamp(55 + CGL.Utils.randomInt(-15, 20) - Math.max(0, idade - 60), 15, 95);
      const expectativa = CGL.Utils.clamp(
        72 + CGL.Utils.randomInt(-8, 12) + (wealthMod > 20 ? 5 : 0) - (saude < 40 ? 5 : 0),
        55,
        98
      );

      return {
        id: CGL.Utils.uuid(),
        relacao,
        nome,
        sobrenome,
        sexo,
        idade,
        profissao: this._professionFor(relacao, wealth),
        personalidade: CGL.Utils.shuffle(traitsPool).slice(0, 2),
        condicaoFinanceira: CGL.Utils.clamp(40 + wealthMod + CGL.Utils.randomInt(-15, 15), 5, 99),
        relacionamento: CGL.Utils.clamp(55 + CGL.Utils.randomInt(-20, 25), 10, 95),
        saude,
        expectativaVida: expectativa,
        cidadeId: null,
        vivo: true,
        eventos: [],
        // Hooks stub para tick semanal (fases futuras expandem)
        hooks: {
          podeEmprestar: ['pai', 'mae'].includes(relacao),
          podePedirAjuda: true,
          podeAbrirEmpresa: ['irmao', 'irma', 'pai', 'mae'].includes(relacao),
          podeCompetir: ['irmao', 'irma'].includes(relacao),
          podeCasar: ['irmao', 'irma'].includes(relacao) && idade >= 18
        }
      };
    },

    _professionFor(relacao, wealth) {
      const rich = ['rica', 'extremamente_rica'].includes(wealth);
      const poor = ['extremamente_pobre', 'pobre'].includes(wealth);
      const pool = CGL.Data.names.PROFESSIONS.slice();
      if (rich) {
        return CGL.Utils.pick(['Empresário(a)', 'Advogado(a)', 'Médico(a)', 'Engenheiro(a)', 'Bancário(a)', 'Aposentado(a)']);
      }
      if (poor) {
        return CGL.Utils.pick(['Comerciante', 'Motorista', 'Autônomo(a)', 'Pedreiro(a)', 'Vendedor(a)', 'Agricultor(a)', 'Motorista de aplicativo']);
      }
      return CGL.Utils.pick(pool);
    },

    /**
     * Tick semanal da família — variações leves + hooks stub
     * Eventos profundos (empréstimos, falecimento, etc.) nas fases futuras.
     */
    weeklyTick(state) {
      const family = state.player?.familia || [];
      const logs = [];

      family.forEach((m) => {
        if (!m.vivo) return;

        // Envelhecimento anual na semana do aniversário aproximado
        if (state.world.semanaAtual % 52 === 0) {
          m.idade += 1;
        }

        // Oscilação de saúde/relacionamento
        m.saude = CGL.Utils.clamp(m.saude + CGL.Utils.randomInt(-2, 2), 5, 100);
        m.relacionamento = CGL.Utils.clamp(
          m.relacionamento + CGL.Utils.randomInt(-1, 2),
          0,
          100
        );
        m.condicaoFinanceira = CGL.Utils.clamp(
          m.condicaoFinanceira + CGL.Utils.randomInt(-1, 1),
          0,
          100
        );

        // Chance rara de evento stub (registrado, sem consequências profundas ainda)
        if (Math.random() < 0.02) {
          const stubEvents = [
            { tipo: 'contato', texto: `${m.nome} ligou para conversar.` },
            { tipo: 'pedido_stub', texto: `${m.nome} mencionou dificuldades financeiras.` },
            { tipo: 'noticia', texto: `${m.nome} pensou em mudar de cidade.` },
            { tipo: 'saude_leve', texto: `${m.nome} teve um resfriado.` }
          ];
          const ev = CGL.Utils.pick(stubEvents);
          m.eventos.push({
            semana: state.world.semanaAtual,
            ...ev
          });
          logs.push(ev.texto);
          if (ev.tipo === 'saude_leve') m.saude = CGL.Utils.clamp(m.saude - 3, 5, 100);
        }

        // Falecimento extremo (muito raro; estrutura pronta)
        if (m.idade >= m.expectativaVida && Math.random() < 0.08) {
          m.vivo = false;
          const msg = `${m.nome} ${m.sobrenome} faleceu.`;
          logs.push(msg);
          CGL.Player.addHistory(state, {
            tipo: 'falecimento_familiar',
            titulo: 'Falecimento na família',
            descricao: msg
          });
        }
      });

      return logs;
    }
  };

  global.CGL = global.CGL || {};
  global.CGL.Family = Family;
})(typeof window !== 'undefined' ? window : globalThis);
