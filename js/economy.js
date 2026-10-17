/**
 * CONGLOMERADO — Economia (esqueleto Fase 1)
 * Slots para inflação, juros, PIB etc. — preenchidos em fases futuras.
 */
(function (global) {
  'use strict';

  const Economy = {
    /** Estado econômico inicial */
    createInitial() {
      return {
        inflacaoAnual: 0.045,
        taxaJuros: 0.105,
        cambioUSD: 5.2,
        crescimentoPIB: 0.02,
        desemprego: 0.08,
        indiceConfianca: 55,
        ciclo: 'expansao', // expansao | estabilidade | recessao | crise
        historico: []
      };
    },

    /** Tick semanal leve (oscilações mínimas na Fase 1) */
    weeklyTick(economy, rng = Math.random) {
      const e = economy;
      e.inflacaoAnual = CGL.Utils.clamp(
        e.inflacaoAnual + (rng() - 0.5) * 0.0004,
        0.01,
        0.2
      );
      e.taxaJuros = CGL.Utils.clamp(
        e.taxaJuros + (rng() - 0.5) * 0.0003,
        0.02,
        0.25
      );
      e.cambioUSD = CGL.Utils.clamp(
        e.cambioUSD + (rng() - 0.5) * 0.04,
        3.5,
        8
      );
      e.indiceConfianca = CGL.Utils.clamp(
        e.indiceConfianca + (rng() - 0.5) * 1.2,
        10,
        95
      );
      return e;
    }
  };

  global.CGL = global.CGL || {};
  global.CGL.Economy = Economy;
})(typeof window !== 'undefined' ? window : globalThis);
