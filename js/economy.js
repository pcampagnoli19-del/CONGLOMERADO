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

    /**
     * Tick semanal leve — volatilidade modulada pela dificuldade (Fase 13).
     * Assinatura: weeklyTick(economy, rng?, state?)
     */
    weeklyTick(economy, rng = Math.random, state = null) {
      const e = economy;
      const vol = state && CGL.Difficulty?.economyVolatilityMult
        ? CGL.Difficulty.economyVolatilityMult(state)
        : 1;
      const crisisBoost = state && CGL.Difficulty?.mult
        ? CGL.Difficulty.mult(state, 'frequenciaCrises')
        : 1;
      e.inflacaoAnual = CGL.Utils.clamp(
        e.inflacaoAnual + (rng() - 0.5) * 0.0004 * vol,
        0.01,
        0.2
      );
      e.taxaJuros = CGL.Utils.clamp(
        e.taxaJuros + (rng() - 0.5) * 0.0003 * vol,
        0.02,
        0.25
      );
      e.cambioUSD = CGL.Utils.clamp(
        e.cambioUSD + (rng() - 0.5) * 0.04 * vol,
        3.5,
        8
      );
      e.indiceConfianca = CGL.Utils.clamp(
        e.indiceConfianca + (rng() - 0.5) * 1.2 * vol - (crisisBoost - 1) * 0.15,
        10,
        95
      );
      // Chance leve de mudar ciclo em dificuldades altas
      if (state && crisisBoost > 1.2 && rng() < 0.02 * (crisisBoost - 1)) {
        e.ciclo = rng() < 0.5 ? 'recessao' : 'crise';
        e.indiceConfianca = Math.max(15, e.indiceConfianca - 5);
      } else if (state && CGL.Difficulty?.mult(state, 'recuperacaoCrises') > 1.2
        && (e.ciclo === 'crise' || e.ciclo === 'recessao')
        && rng() < 0.04 * CGL.Difficulty.mult(state, 'recuperacaoCrises')) {
        e.ciclo = 'expansao';
        e.indiceConfianca = Math.min(90, e.indiceConfianca + 4);
      }
      return e;
    }
  };

  global.CGL = global.CGL || {};
  global.CGL.Economy = Economy;
})(typeof window !== 'undefined' ? window : globalThis);
