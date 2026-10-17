/**
 * CONGLOMERADO — Utilitários centralizados
 * Formatação BRL, datas, porcentagens, números grandes, UUID, RNG.
 */
(function (global) {
  'use strict';

  const Utils = {
    /** Formata valor em Real brasileiro (R$ 1.234,56) */
    formatBRL(value, opts = {}) {
      const n = Number(value) || 0;
      const compact = opts.compact === true;
      if (compact) {
        return this.formatLargeNumber(n, { currency: true });
      }
      return n.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: opts.decimals ?? 2,
        maximumFractionDigits: opts.decimals ?? 2
      });
    },

    /** Formata data para exibição pt-BR */
    formatDate(date, style = 'short') {
      const d = date instanceof Date ? date : new Date(date);
      if (Number.isNaN(d.getTime())) return '—';
      if (style === 'week') {
        return `Semana ${this.getWeekOfYear(d)} · ${d.toLocaleDateString('pt-BR')}`;
      }
      if (style === 'long') {
        return d.toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }
      return d.toLocaleDateString('pt-BR');
    },

    /** Retorna número da semana ISO aproximado */
    getWeekOfYear(date) {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    },

    /** Formata porcentagem (0.125 → 12,5%) */
    formatPercent(value, decimals = 1) {
      const n = Number(value) || 0;
      const pct = Math.abs(n) <= 1 && Math.abs(n) > 0 && !Number.isInteger(n * 100)
        ? n * 100
        : n;
      return `${pct.toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      })}%`;
    },

    /** Números grandes: mil, mi, bi, tri */
    formatLargeNumber(value, opts = {}) {
      const n = Number(value) || 0;
      const abs = Math.abs(n);
      const sign = n < 0 ? '-' : '';
      const prefix = opts.currency ? 'R$ ' : '';
      const units = [
        { v: 1e12, s: 'tri' },
        { v: 1e9, s: 'bi' },
        { v: 1e6, s: 'mi' },
        { v: 1e3, s: 'mil' }
      ];
      for (const u of units) {
        if (abs >= u.v) {
          const num = (abs / u.v).toLocaleString('pt-BR', {
            maximumFractionDigits: abs >= u.v * 100 ? 0 : 1
          });
          return `${sign}${prefix}${num} ${u.s}`;
        }
      }
      if (opts.currency) return this.formatBRL(n);
      return `${sign}${abs.toLocaleString('pt-BR')}`;
    },

    /** UUID v4 simples */
    uuid() {
      if (global.crypto && typeof global.crypto.randomUUID === 'function') {
        return global.crypto.randomUUID();
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },

    /** Inteiro aleatório inclusivo [min, max] */
    randomInt(min, max) {
      const a = Math.ceil(min);
      const b = Math.floor(max);
      return Math.floor(Math.random() * (b - a + 1)) + a;
    },

    /** Float aleatório [min, max) */
    randomFloat(min, max) {
      return Math.random() * (max - min) + min;
    },

    /** Escolhe um item aleatório de array */
    pick(arr) {
      if (!arr || !arr.length) return undefined;
      return arr[this.randomInt(0, arr.length - 1)];
    },

    /** Embaralha array (cópia) */
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = this.randomInt(0, i);
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },

    /** Clampa valor entre min e max */
    clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    },

    /** Deep clone simples via JSON */
    clone(obj) {
      return JSON.parse(JSON.stringify(obj));
    },

    /** Merge raso de objetos */
    merge(target, source) {
      return Object.assign({}, target, source);
    },

    /** Debounce */
    debounce(fn, wait = 200) {
      let t;
      return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
      };
    },

    /** Escapa HTML */
    escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    /** Calcula idade a partir de nascimento e data de referência */
    calcAge(birthDate, refDate) {
      const b = birthDate instanceof Date ? birthDate : new Date(birthDate);
      const r = refDate instanceof Date ? refDate : new Date(refDate);
      let age = r.getFullYear() - b.getFullYear();
      const m = r.getMonth() - b.getMonth();
      if (m < 0 || (m === 0 && r.getDate() < b.getDate())) age--;
      return age;
    },

    /** Data de nascimento para idade 22 na data de referência */
    birthDateForAge22(refDate) {
      const r = refDate instanceof Date ? new Date(refDate) : new Date(refDate);
      r.setFullYear(r.getFullYear() - 22);
      return r;
    },

    /** Adiciona semanas a uma data */
    addWeeks(date, weeks) {
      const d = new Date(date);
      d.setDate(d.getDate() + weeks * 7);
      return d;
    },

    /** Capitaliza primeira letra */
    capitalize(str) {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    }
  };

  global.CGL = global.CGL || {};
  global.CGL.Utils = Utils;
})(typeof window !== 'undefined' ? window : globalThis);
