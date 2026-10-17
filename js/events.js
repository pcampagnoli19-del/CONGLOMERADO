/**
 * CONGLOMERADO — Sistema de eventos (base Fase 1)
 * Preparado para decisões, alertas e eventos pessoais/empresariais futuros.
 */
(function (global) {
  'use strict';

  const Events = {
    /** Fila de notificações em memória (UI) */
    _queue: [],

    notify(type, title, message, opts = {}) {
      const item = {
        id: CGL.Utils.uuid(),
        type: type || 'info', // success | alert | error | event | decision | info
        title,
        message,
        timestamp: Date.now(),
        ...opts
      };
      this._queue.unshift(item);
      if (this._queue.length > 50) this._queue.pop();
      if (global.CGL.UI && typeof CGL.UI.onNotify === 'function') {
        CGL.UI.onNotify(item);
      }
      return item;
    },

    getAll() {
      return this._queue.slice();
    },

    clear() {
      this._queue = [];
    },

    /**
     * Eventos aleatórios leves no tick semanal (Fase 1)
     */
    weeklyTick(state) {
      const rolls = [];
      const personalMult = CGL.Difficulty?.eventChanceMult
        ? CGL.Difficulty.eventChanceMult(state, 'pessoal')
        : 1;
      if (personalMult <= 0) return rolls;
      if (Math.random() < 0.12 * personalMult) {
        const personal = [
          {
            title: 'Fim de semana produtivo',
            message: 'Você descansou bem e ganhou energia.',
            apply: () => {
              state.player.necessidades.energia = CGL.Utils.clamp(
                state.player.necessidades.energia + 8,
                0,
                100
              );
              state.player.necessidades.felicidade = CGL.Utils.clamp(
                state.player.necessidades.felicidade + 3,
                0,
                100
              );
            }
          },
          {
            title: 'Noite mal dormida',
            message: 'Preocupações com o futuro atrapalharam o sono.',
            apply: () => {
              state.player.necessidades.energia = CGL.Utils.clamp(
                state.player.necessidades.energia - 6,
                0,
                100
              );
              state.player.necessidades.estresse = CGL.Utils.clamp(
                state.player.necessidades.estresse + 5,
                0,
                100
              );
            }
          },
          {
            title: 'Networking casual',
            message: 'Uma conversa informal pode render contatos no futuro.',
            apply: () => {
              state.player.contatos = (state.player.contatos || 0) + 1;
              state.player.necessidades.motivacao = CGL.Utils.clamp(
                state.player.necessidades.motivacao + 2,
                0,
                100
              );
            }
          },
          {
            title: 'Notícia econômica',
            message: 'Os jornais discutem os juros e a inflação da semana.',
            apply: () => {}
          }
        ];
        const ev = CGL.Utils.pick(personal);
        ev.apply();
        this.notify('event', ev.title, ev.message);
        rolls.push(ev.title);
        state.player.estatisticas.eventosVividos =
          (state.player.estatisticas.eventosVividos || 0) + 1;
      }
      return rolls;
    }
  };

  global.CGL = global.CGL || {};
  global.CGL.Events = Events;
})(typeof window !== 'undefined' ? window : globalThis);
