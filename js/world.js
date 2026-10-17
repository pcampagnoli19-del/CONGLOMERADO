/**
 * CONGLOMERADO — Mundo e calendário semanal
 */
(function (global) {
  'use strict';

  const World = {
    /** Data inicial padrão da campanha */
    START_DATE: '2026-01-05', // segunda-feira aproximada

    createInitial(homeCityId = null) {
      const start = new Date(this.START_DATE + 'T12:00:00');
      return {
        dataAtual: start.toISOString(),
        semanaAtual: 1,
        ano: start.getFullYear(),
        cidadeAtivaId: homeCityId,
        eventosPendentes: [],
        noticias: [],
        flags: {}
      };
    },

    getDate(world) {
      return new Date(world.dataAtual);
    },

    /** Avança exatamente uma semana */
    advanceWeek(world) {
      const next = CGL.Utils.addWeeks(this.getDate(world), 1);
      world.dataAtual = next.toISOString();
      world.semanaAtual += 1;
      world.ano = next.getFullYear();
      return world;
    },

    formatGameDate(world) {
      const d = this.getDate(world);
      return `Semana ${world.semanaAtual} · ${CGL.Utils.formatDate(d)}`;
    }
  };

  global.CGL = global.CGL || {};
  global.CGL.World = World;
})(typeof window !== 'undefined' ? window : globalThis);
