/**
 * CONGLOMERADO — UI Mundo / Internacional (Fase 11)
 * Hub global, painel FX, wizard de entrada e gestão de subsidiárias.
 */
(function (global) {
  'use strict';

  const IntlUI = {
    view: 'hub', // hub | empresa | pais | fx | wizard
    selectedId: null,
    empresaTab: 'presenca', // presenca | exim | subsidiarias | centros | cultura | historico
    wizard: null, // { empresaId, step, paisId, modoId }

    render(main) {
      const state = CGL.Game.getState();
      if (!state?.player) return;
      CGL.International.ensureInternational(state);
      if (this.view === 'wizard' && this.wizard) {
        this.renderWizard(main);
      } else if (this.view === 'fx') {
        this.renderFx(main);
      } else if (this.view === 'pais' && this.selectedId) {
        this.renderPais(main);
      } else if (this.view === 'empresa' && this.selectedId) {
        this.renderEmpresa(main);
      } else {
        this.renderHub(main);
      }
    },

    renderHub(main) {
      const state = CGL.Game.getState();
      const sum = CGL.International.dashboardSummary(state);
      const companies = CGL.Company.listPlayerCompanies(state);
      const countries = CGL.Data.foreignCountries();
      const eventos = (state.international.eventos || []).slice(0, 8);
      const ranking = (state.international.ranking || []).slice(0, 8);
      const fx = state.international.taxas || {};

      main.innerHTML = `
        <div class="screen intl-screen">
          <header class="screen-header row-between">
            <div>
              <h1>Mundo / Internacional</h1>
              <p class="muted">Expansão global, câmbio, EXIM e subsidiárias.</p>
            </div>
            <div class="row-actions">
              <button type="button" class="btn btn-secondary" id="intl-fx">Painel FX</button>
            </div>
          </header>

          <div class="dash-grid">
            ${CGL.UI.card('Países ativos', `
              <div class="stat-gold">${sum.paises}</div>
              <p class="muted">Presença do conglomerado</p>
            `)}
            ${CGL.UI.card('Subsidiárias', `
              <div class="stat-gold">${sum.subsidiarias}</div>
              <p class="muted">Unidades no exterior</p>
            `)}
            ${CGL.UI.card('Receita intl / sem', `
              <div class="stat-gold">${CGL.Utils.formatBRL(sum.receitaIntl, { compact: true })}</div>
              <p class="muted">Exportações + unidades</p>
            `)}
            ${CGL.UI.card('USD / BRL', `
              <div class="stat-gold">${Number(sum.usdBrl).toFixed(2)}</div>
              <p class="muted">Exposição ${CGL.Utils.formatBRL(sum.exposicaoCambial, { compact: true })}</p>
            `)}
          </div>

          <p class="muted intl-fx-strip">
            EUR ${Number(fx.EUR || 0.92).toFixed(2)}/USD ·
            CNY ${Number(fx.CNY || 7.2).toFixed(1)} ·
            GBP ${Number(fx.GBP || 0.79).toFixed(2)} ·
            JPY ${Number(fx.JPY || 150).toFixed(0)} ·
            custo intl ${CGL.Utils.formatBRL(sum.custoSemanal, { compact: true })}/sem
          </p>

          <section class="section-block">
            <h2>Empresas</h2>
            ${companies.length ? `
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Países</th>
                      <th>Subsidiárias</th>
                      <th>Receita intl</th>
                      <th>Custo/sem</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${companies.map((e) => {
                      CGL.International.ensureCompanyIntl(e, state);
                      CGL.International.calcKpis(e, state);
                      const k = e.international.kpis;
                      return `
                        <tr>
                          <td><strong>${CGL.Utils.escapeHtml(e.nomeFantasia)}</strong></td>
                          <td>${k.paises}</td>
                          <td>${k.subsidiarias}</td>
                          <td>${CGL.Utils.formatBRL(k.receitaIntl, { compact: true })}</td>
                          <td>${CGL.Utils.formatBRL(k.custoSemanal, { compact: true })}</td>
                          <td>
                            <button type="button" class="btn btn-sm btn-secondary" data-open="${e.id}">Abrir</button>
                            <button type="button" class="btn btn-sm btn-primary" data-enter="${e.id}">Entrar em país</button>
                          </td>
                        </tr>`;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            ` : `<p class="muted">Nenhuma empresa. Funde uma em Empresas para expandir.</p>`}
          </section>

          <section class="section-block">
            <h2>Mercados</h2>
            <div class="intl-country-grid">
              ${countries.map((c) => {
                const atr = CGL.Data.marketAttractiveness(c);
                return `
                  <button type="button" class="intl-country-card" data-pais="${c.id}">
                    <strong>${CGL.Utils.escapeHtml(c.nome)}</strong>
                    <span class="muted">${CGL.Utils.escapeHtml(c.regiao)} · ${c.codigoMoeda}</span>
                    <div class="meter" style="width:100%"><span class="meter-fill" style="width:${atr}%"></span></div>
                    <span class="muted">Atratividade ${atr} · risco ${c.riscoGeopolitico}</span>
                  </button>`;
              }).join('')}
            </div>
          </section>

          <div class="dash-grid">
            <section class="section-block">
              <h2>Ranking global</h2>
              ${ranking.length ? `
                <ul class="timeline">
                  ${ranking.map((r, i) => `
                    <li><strong>#${i + 1} ${CGL.Utils.escapeHtml(r.nome)}</strong>
                      — score ${r.score} · ${r.paises} países ·
                      ${CGL.Utils.formatBRL(r.receitaIntl, { compact: true })}</li>
                  `).join('')}
                </ul>
              ` : `<p class="muted">Sem dados. Entre em mercados e avance semanas.</p>`}
            </section>
            <section class="section-block">
              <h2>Eventos geopolíticos</h2>
              ${eventos.length ? `
                <ul class="timeline">
                  ${eventos.map((ev) => `
                    <li class="${ev.positivo ? 'pos' : ''}">
                      <strong>${CGL.Utils.escapeHtml(ev.titulo)}</strong>
                      <span class="muted"> · sem ${ev.semana}</span>
                      <div class="muted">${CGL.Utils.escapeHtml(ev.descricao || '')}</div>
                    </li>
                  `).join('')}
                </ul>
              ` : `<p class="muted">Nenhum evento recente.</p>`}
            </section>
          </div>
        </div>
      `;

      main.querySelector('#intl-fx')?.addEventListener('click', () => {
        this.view = 'fx';
        this.render(main);
      });
      main.querySelectorAll('[data-open]').forEach((btn) => {
        btn.onclick = () => {
          this.view = 'empresa';
          this.selectedId = btn.dataset.open;
          this.empresaTab = 'presenca';
          this.render(main);
        };
      });
      main.querySelectorAll('[data-enter]').forEach((btn) => {
        btn.onclick = () => this.startWizard(btn.dataset.enter, main);
      });
      main.querySelectorAll('[data-pais]').forEach((btn) => {
        btn.onclick = () => {
          this.view = 'pais';
          this.selectedId = btn.dataset.pais;
          this.render(main);
        };
      });
    },

    renderFx(main) {
      const state = CGL.Game.getState();
      CGL.International.ensureInternational(state);
      const taxas = state.international.taxas || {};
      const hist = (state.international.historicoFx || []).slice(0, 12);
      const moedas = Object.keys(taxas).sort();

      main.innerHTML = `
        <div class="screen intl-screen">
          <header class="screen-header row-between">
            <div>
              <button type="button" class="btn btn-ghost btn-sm" id="intl-back">← Mundo</button>
              <h1>Painel de câmbio</h1>
              <p class="muted">Taxas vs USD · BRL acompanha a economia doméstica.</p>
            </div>
          </header>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Moeda</th><th>Por 1 USD</th><th>Em BRL</th></tr></thead>
              <tbody>
                ${moedas.map((m) => {
                  const perUsd = taxas[m];
                  const brl = CGL.International.rateToBRL(state, m);
                  return `<tr>
                    <td><strong>${m}</strong></td>
                    <td>${Number(perUsd).toLocaleString('pt-BR', { maximumFractionDigits: 4 })}</td>
                    <td>${CGL.Utils.formatBRL(brl, { decimals: 4 })}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
          <section class="section-block">
            <h2>Histórico recente</h2>
            ${hist.length ? `
              <ul class="timeline">
                ${hist.map((h) => `
                  <li>Sem ${h.semana}: BRL ${Number(h.BRL).toFixed(2)} ·
                    EUR ${Number(h.EUR).toFixed(3)} · CNY ${Number(h.CNY).toFixed(2)}</li>
                `).join('')}
              </ul>
            ` : `<p class="muted">Avance semanas para registrar o histórico.</p>`}
          </section>
          <p class="muted">Volatilidade atual: ×${Number(state.international.volatilidadeFx || 1).toFixed(1)}</p>
        </div>
      `;
      main.querySelector('#intl-back').onclick = () => {
        this.view = 'hub';
        this.render(main);
      };
    },

    renderPais(main) {
      const state = CGL.Game.getState();
      const c = CGL.Data.getCountryById(this.selectedId);
      if (!c) {
        this.view = 'hub';
        return this.render(main);
      }
      const atr = CGL.Data.marketAttractiveness(c);
      const rate = CGL.International.rateToBRL(state, c.codigoMoeda);

      main.innerHTML = `
        <div class="screen intl-screen">
          <header class="screen-header row-between">
            <div>
              <button type="button" class="btn btn-ghost btn-sm" id="intl-back">← Mundo</button>
              <h1>${CGL.Utils.escapeHtml(c.nome)}</h1>
              <p class="muted">${CGL.Utils.escapeHtml(c.regiao)} · ${c.codigoMoeda} · atratividade ${atr}</p>
            </div>
          </header>
          <div class="dash-grid">
            ${CGL.UI.card('População', `<div class="stat-gold">${c.populacao} mi</div>`)}
            ${CGL.UI.card('PIB', `<div class="stat-gold">US$ ${c.pib} tri</div>`)}
            ${CGL.UI.card('Crescimento', `<div class="stat-gold">${CGL.Utils.formatPercent(c.crescimento)}</div>`)}
            ${CGL.UI.card('Câmbio', `<div class="stat-gold">${CGL.Utils.formatBRL(rate, { decimals: 4 })}</div><p class="muted">1 ${c.codigoMoeda}</p>`)}
          </div>
          <div class="intl-stat-grid">
            ${this._stat('Inflação', CGL.Utils.formatPercent(c.inflacao))}
            ${this._stat('Juros', CGL.Utils.formatPercent(c.taxaJuros))}
            ${this._stat('Impostos', CGL.Utils.formatPercent(c.impostos))}
            ${this._stat('Burocracia', c.burocracia)}
            ${this._stat('Corrupção', c.corrupcao)}
            ${this._stat('Seg. jurídica', c.segurancaJuridica)}
            ${this._stat('Custo mão de obra', c.custoMaoObra)}
            ${this._stat('Qualificação', c.qualificacao)}
            ${this._stat('Poder de compra', c.poderCompra)}
            ${this._stat('Cultura consumo', c.culturaConsumo)}
            ${this._stat('Tarifa import.', CGL.Utils.formatPercent(c.tarifaImport))}
            ${this._stat('Barreiras', c.barreiras)}
            ${this._stat('Risco geopolítico', c.riscoGeopolitico)}
          </div>
          <p class="muted" style="margin-top:1rem">Use “Entrar em país” na empresa para expandir para ${CGL.Utils.escapeHtml(c.nome)}.</p>
        </div>
      `;
      main.querySelector('#intl-back').onclick = () => {
        this.view = 'hub';
        this.render(main);
      };
    },

    _stat(label, val) {
      return `<div class="intl-stat"><span class="muted">${label}</span><strong>${val}</strong></div>`;
    },

    startWizard(empresaId, main) {
      this.wizard = { empresaId, step: 1, paisId: null, modoId: null };
      this.view = 'wizard';
      this.render(main);
    },

    renderWizard(main) {
      const state = CGL.Game.getState();
      const w = this.wizard;
      const emp = CGL.Company.getById?.(state, w.empresaId) ||
        (state.companies?.empresas || []).find((e) => e.id === w.empresaId);
      if (!emp) {
        this.view = 'hub';
        return this.render(main);
      }

      const countries = CGL.Data.foreignCountries();
      const modes = CGL.Data.entryModes;

      let body = '';
      if (w.step === 1) {
        body = `
          <h2>1. Escolha o país</h2>
          <div class="intl-country-grid">
            ${countries.map((c) => `
              <button type="button" class="intl-country-card ${w.paisId === c.id ? 'selected' : ''}"
                data-pick-pais="${c.id}">
                <strong>${CGL.Utils.escapeHtml(c.nome)}</strong>
                <span class="muted">Atratividade ${CGL.Data.marketAttractiveness(c)}</span>
              </button>
            `).join('')}
          </div>`;
      } else if (w.step === 2) {
        const pais = CGL.Data.getCountryById(w.paisId);
        body = `
          <h2>2. Modo de entrada — ${CGL.Utils.escapeHtml(pais?.nome || '')}</h2>
          <div class="intl-mode-grid">
            ${modes.map((m) => {
              const custo = CGL.International.entryCost(emp, w.paisId, m.id);
              return `
                <button type="button" class="intl-mode-card ${w.modoId === m.id ? 'selected' : ''}"
                  data-pick-modo="${m.id}">
                  <strong>${CGL.Utils.escapeHtml(m.nome)}</strong>
                  <p class="muted">${CGL.Utils.escapeHtml(m.descricao)}</p>
                  <p>CAPEX ≈ ${CGL.Utils.formatBRL(custo, { compact: true })} ·
                    risco ${m.risco} · setup ${m.semanasSetup} sem.</p>
                </button>`;
            }).join('')}
          </div>`;
      } else {
        const pais = CGL.Data.getCountryById(w.paisId);
        const modo = CGL.Data.getEntryModeById(w.modoId);
        const custo = CGL.International.entryCost(emp, w.paisId, w.modoId);
        body = `
          <h2>3. Confirmar</h2>
          <p><strong>${CGL.Utils.escapeHtml(emp.nomeFantasia)}</strong> entrará em
            <strong>${CGL.Utils.escapeHtml(pais?.nome || '')}</strong> via
            <strong>${CGL.Utils.escapeHtml(modo?.nome || '')}</strong>.</p>
          <p>Investimento estimado: <strong>${CGL.Utils.formatBRL(custo)}</strong></p>
          <p class="muted">Caixa atual: ${CGL.Utils.formatBRL(emp.caixa || 0)}</p>
          ${modo?.exigeSubsidiaria ? `<p class="muted">Uma subsidiária local será criada (P&amp;L em ${pais?.codigoMoeda}).</p>` : ''}
          <button type="button" class="btn btn-primary" id="wiz-confirm">Confirmar entrada</button>`;
      }

      main.innerHTML = `
        <div class="screen intl-screen">
          <header class="screen-header row-between">
            <div>
              <button type="button" class="btn btn-ghost btn-sm" id="intl-back">← Cancelar</button>
              <h1>Wizard de entrada</h1>
              <p class="muted">${CGL.Utils.escapeHtml(emp.nomeFantasia)} · passo ${w.step}/3</p>
            </div>
          </header>
          ${body}
          <div class="row-actions" style="margin-top:1rem">
            ${w.step > 1 ? `<button type="button" class="btn btn-secondary" id="wiz-prev">Voltar</button>` : ''}
            ${w.step < 3 ? `<button type="button" class="btn btn-primary" id="wiz-next" ${
              (w.step === 1 && !w.paisId) || (w.step === 2 && !w.modoId) ? 'disabled' : ''
            }>Próximo</button>` : ''}
          </div>
        </div>
      `;

      main.querySelector('#intl-back').onclick = () => {
        this.wizard = null;
        this.view = 'hub';
        this.render(main);
      };
      main.querySelectorAll('[data-pick-pais]').forEach((btn) => {
        btn.onclick = () => {
          w.paisId = btn.dataset.pickPais;
          this.render(main);
        };
      });
      main.querySelectorAll('[data-pick-modo]').forEach((btn) => {
        btn.onclick = () => {
          w.modoId = btn.dataset.pickModo;
          this.render(main);
        };
      });
      main.querySelector('#wiz-prev')?.addEventListener('click', () => {
        w.step = Math.max(1, w.step - 1);
        this.render(main);
      });
      main.querySelector('#wiz-next')?.addEventListener('click', () => {
        if (w.step === 1 && w.paisId) w.step = 2;
        else if (w.step === 2 && w.modoId) w.step = 3;
        this.render(main);
      });
      main.querySelector('#wiz-confirm')?.addEventListener('click', () => {
        try {
          CGL.International.enterCountry(emp, state, w.paisId, w.modoId);
          CGL.Game.save(false);
          this.wizard = null;
          this.view = 'empresa';
          this.selectedId = emp.id;
          this.empresaTab = 'presenca';
          this.render(main);
        } catch (err) {
          CGL.Events.notify('error', 'Entrada bloqueada', String(err.message || err));
        }
      });
    },

    renderEmpresa(main) {
      const state = CGL.Game.getState();
      const emp = (state.companies?.empresas || []).find((e) => e.id === this.selectedId);
      if (!emp) {
        this.view = 'hub';
        return this.render(main);
      }
      CGL.International.ensureCompanyIntl(emp, state);
      CGL.International.calcKpis(emp, state);
      const I = emp.international;
      const tabs = [
        { id: 'presenca', label: 'Presença' },
        { id: 'exim', label: 'EXIM' },
        { id: 'subsidiarias', label: 'Subsidiárias' },
        { id: 'centros', label: 'Centros / cargos' },
        { id: 'cultura', label: 'Cultura' },
        { id: 'historico', label: 'Histórico' }
      ];

      main.innerHTML = `
        <div class="screen intl-screen">
          <header class="screen-header row-between">
            <div>
              <button type="button" class="btn btn-ghost btn-sm" id="intl-back">← Mundo</button>
              <h1>${CGL.Utils.escapeHtml(emp.nomeFantasia)}</h1>
              <p class="muted">${I.presencaPaises} países ·
                receita intl ${CGL.Utils.formatBRL(I.receitaIntl, { compact: true })} ·
                FX P&amp;L ${CGL.Utils.formatBRL(I.ganhoCambial || 0, { compact: true })}</p>
            </div>
            <button type="button" class="btn btn-primary" id="btn-enter">Entrar em país</button>
          </header>
          <div class="finance-tabs">
            ${tabs.map((t) => `
              <button type="button" class="finance-tab ${this.empresaTab === t.id ? 'active' : ''}"
                data-tab="${t.id}">${t.label}</button>
            `).join('')}
          </div>
          <div id="intl-tab-body">${this._tabBody(emp, state)}</div>
        </div>
      `;

      main.querySelector('#intl-back').onclick = () => {
        this.view = 'hub';
        this.selectedId = null;
        this.render(main);
      };
      main.querySelector('#btn-enter').onclick = () => this.startWizard(emp.id, main);
      main.querySelectorAll('[data-tab]').forEach((btn) => {
        btn.onclick = () => {
          this.empresaTab = btn.dataset.tab;
          this.render(main);
        };
      });
      this._bindTabActions(main, emp, state);
    },

    _tabBody(emp, state) {
      const I = emp.international;
      const tab = this.empresaTab;
      if (tab === 'presenca') {
        return I.entradas.length ? `
          <div class="table-wrap"><table class="data-table">
            <thead><tr><th>País</th><th>Modo</th><th>Status</th><th>Controle</th><th>Adaptação</th><th></th></tr></thead>
            <tbody>
              ${I.entradas.map((e) => {
                const p = CGL.Data.getCountryById(e.paisId);
                const m = CGL.Data.getEntryModeById(e.modo);
                const ad = I.adaptacaoCultural[e.paisId]?.score || 0;
                return `<tr>
                  <td>${CGL.Utils.escapeHtml(p?.nome || e.paisId)}</td>
                  <td>${CGL.Utils.escapeHtml(m?.nome || e.modo)}</td>
                  <td>${e.status}${e.status === 'setup' ? ` (${e.semanasSetupRestantes} sem)` : ''}</td>
                  <td>${e.controle}</td>
                  <td>${ad}</td>
                  <td>
                    ${!e.subsidiariaId && e.status === 'ativo' ? `
                      <button type="button" class="btn btn-sm btn-secondary"
                        data-upgrade="${e.paisId}">Criar subsidiária</button>` : ''}
                    ${e.modo === 'exportacao' && e.status === 'ativo' ? `
                      <button type="button" class="btn btn-sm btn-primary"
                        data-export="${e.paisId}">Exportar</button>` : ''}
                    <button type="button" class="btn btn-sm btn-secondary"
                      data-import="${e.paisId}">Importar</button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table></div>` : `<p class="muted">Sem presença internacional. Use o wizard de entrada.</p>`;
      }
      if (tab === 'exim') {
        return I.operacoesExim.length ? `
          <div class="table-wrap"><table class="data-table">
            <thead><tr><th>Tipo</th><th>País</th><th>Volume</th><th>Tarifa</th><th>Status</th><th>ETA</th></tr></thead>
            <tbody>
              ${I.operacoesExim.slice(0, 20).map((op) => {
                const p = CGL.Data.getCountryById(op.paisId);
                return `<tr>
                  <td>${op.tipo}</td>
                  <td>${CGL.Utils.escapeHtml(p?.nome || op.paisId)}</td>
                  <td>${op.volume}</td>
                  <td>${CGL.Utils.formatPercent(op.tarifa || 0)}</td>
                  <td>${op.status}</td>
                  <td>${op.status === 'transito' ? op.semanasRestantes + ' sem' : '—'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table></div>` : `<p class="muted">Nenhuma operação EXIM. Exporte ou importe a partir da aba Presença.</p>`;
      }
      if (tab === 'subsidiarias') {
        return I.subsidiarias.length ? `
          <div class="table-wrap"><table class="data-table">
            <thead><tr><th>Nome</th><th>Moeda</th><th>Receita local</th><th>Lucro local</th><th>Caixa</th><th>Gestão</th><th></th></tr></thead>
            <tbody>
              ${I.subsidiarias.map((s) => {
                const p = CGL.Data.getCountryById(s.paisId);
                return `<tr>
                  <td>${CGL.Utils.escapeHtml(s.nome)}
                    <div class="muted">${CGL.Utils.escapeHtml(p?.nome || '')}</div></td>
                  <td>${s.moeda}</td>
                  <td>${CGL.Utils.formatNumber(s.receitaLocal)}</td>
                  <td>${CGL.Utils.formatNumber(s.lucroLocal)}</td>
                  <td>${CGL.Utils.formatNumber(s.caixaLocal)}</td>
                  <td>${s.gestao}</td>
                  <td><button type="button" class="btn btn-sm btn-secondary"
                    data-repat="${s.id}" ${!(s.caixaLocal > 0) ? 'disabled' : ''}>Repatriar</button></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table></div>` : `<p class="muted">Nenhuma subsidiária. Modos como escritório/fábrica criam automaticamente.</p>`;
      }
      if (tab === 'centros') {
        const centers = CGL.Data.globalCenters;
        const roles = CGL.Data.globalRoles;
        const paisOpts = CGL.Data.countries.map((c) =>
          `<option value="${c.id}">${CGL.Utils.escapeHtml(c.nome)}</option>`).join('');
        return `
          <div class="dash-grid">
            <section class="section-block">
              <h3>Centros globais</h3>
              <ul class="timeline">
                ${I.centros.map((c) => {
                  const p = CGL.Data.getCountryById(c.paisId);
                  return `<li>${CGL.Utils.escapeHtml(c.nome)} — ${CGL.Utils.escapeHtml(p?.nome || '')}
                    · opex ${CGL.Utils.formatBRL(c.opexSemanal, { compact: true })}/sem</li>`;
                }).join('') || '<li class="muted">Nenhum centro</li>'}
              </ul>
              <div class="row-actions">
                <select id="centro-tipo">${centers.map((c) =>
                  `<option value="${c.id}">${CGL.Utils.escapeHtml(c.nome)} (${CGL.Utils.formatBRL(c.custo, { compact: true })})</option>`).join('')}</select>
                <select id="centro-pais">${paisOpts}</select>
                <button type="button" class="btn btn-sm btn-primary" id="btn-centro">Construir</button>
              </div>
            </section>
            <section class="section-block">
              <h3>Cargos globais</h3>
              <ul class="timeline">
                ${I.cargosGlobais.map((g) => `
                  <li>${CGL.Utils.escapeHtml(g.nome)} · ${CGL.Utils.formatBRL(g.salarioSemanal)}/sem</li>
                `).join('') || '<li class="muted">Nenhum cargo global</li>'}
              </ul>
              <div class="row-actions">
                <select id="role-tipo">${roles.map((r) =>
                  `<option value="${r.id}">${CGL.Utils.escapeHtml(r.nome)}</option>`).join('')}</select>
                <select id="role-pais">${paisOpts}</select>
                <button type="button" class="btn btn-sm btn-primary" id="btn-role">Contratar</button>
              </div>
            </section>
          </div>`;
      }
      if (tab === 'cultura') {
        const keys = Object.keys(I.adaptacaoCultural);
        if (!keys.length) return `<p class="muted">Entre em um país para adaptar produto/marketing.</p>`;
        return keys.map((pid) => {
          const p = CGL.Data.getCountryById(pid);
          const ad = I.adaptacaoCultural[pid];
          return `
            <section class="section-block">
              <h3>${CGL.Utils.escapeHtml(p?.nome || pid)} — score ${ad.score}</h3>
              <div class="intl-stat-grid">
                ${Object.entries(ad.dims || {}).map(([d, v]) => this._stat(d, Math.round(v))).join('')}
              </div>
              <button type="button" class="btn btn-sm btn-secondary" data-cultura="${pid}">
                Investir adaptação (R$ 5 mil)
              </button>
            </section>`;
        }).join('');
      }
      // historico
      return I.historico.length ? `
        <ul class="timeline">
          ${I.historico.slice(0, 25).map((h) => `
            <li><strong>${CGL.Utils.escapeHtml(h.titulo)}</strong>
              <span class="muted"> · sem ${h.semana}</span>
              <div class="muted">${CGL.Utils.escapeHtml(h.descricao || '')}</div></li>
          `).join('')}
        </ul>` : `<p class="muted">Sem histórico internacional.</p>`;
    },

    _bindTabActions(main, emp, state) {
      main.querySelectorAll('[data-upgrade]').forEach((btn) => {
        btn.onclick = () => {
          try {
            CGL.International.upgradeToSubsidiary(emp, state, btn.dataset.upgrade);
            CGL.Game.save(false);
            this.empresaTab = 'subsidiarias';
            this.render(main);
          } catch (err) {
            CGL.Events.notify('error', 'Upgrade', String(err.message || err));
          }
        };
      });
      main.querySelectorAll('[data-export]').forEach((btn) => {
        btn.onclick = () => {
          try {
            CGL.International.startExport(emp, state, btn.dataset.export, 150);
            CGL.Game.save(false);
            this.empresaTab = 'exim';
            this.render(main);
          } catch (err) {
            CGL.Events.notify('error', 'Exportação', String(err.message || err));
          }
        };
      });
      main.querySelectorAll('[data-import]').forEach((btn) => {
        btn.onclick = () => {
          try {
            CGL.International.startImport(emp, state, btn.dataset.import, 100);
            CGL.Game.save(false);
            this.empresaTab = 'exim';
            this.render(main);
          } catch (err) {
            CGL.Events.notify('error', 'Importação', String(err.message || err));
          }
        };
      });
      main.querySelectorAll('[data-repat]').forEach((btn) => {
        btn.onclick = () => {
          try {
            const sub = emp.international.subsidiarias.find((s) => s.id === btn.dataset.repat);
            const q = Math.round((sub?.caixaLocal || 0) * 0.5);
            CGL.International.repatriate(emp, state, btn.dataset.repat, q);
            CGL.Game.save(false);
            this.render(main);
          } catch (err) {
            CGL.Events.notify('error', 'Repatriação', String(err.message || err));
          }
        };
      });
      main.querySelector('#btn-centro')?.addEventListener('click', () => {
        try {
          const tipo = main.querySelector('#centro-tipo').value;
          const pais = main.querySelector('#centro-pais').value;
          CGL.International.buildCenter(emp, state, tipo, pais);
          CGL.Game.save(false);
          this.render(main);
        } catch (err) {
          CGL.Events.notify('error', 'Centro', String(err.message || err));
        }
      });
      main.querySelector('#btn-role')?.addEventListener('click', () => {
        try {
          const role = main.querySelector('#role-tipo').value;
          const pais = main.querySelector('#role-pais').value;
          CGL.International.hireGlobalRole(emp, state, role, pais);
          CGL.Game.save(false);
          this.render(main);
        } catch (err) {
          CGL.Events.notify('error', 'Cargo', String(err.message || err));
        }
      });
      main.querySelectorAll('[data-cultura]').forEach((btn) => {
        btn.onclick = () => {
          try {
            CGL.International.investCulture(emp, state, btn.dataset.cultura, null, 5000);
            CGL.Game.save(false);
            this.render(main);
          } catch (err) {
            CGL.Events.notify('error', 'Cultura', String(err.message || err));
          }
        };
      });
    }
  };

  global.CGL = global.CGL || {};
  global.CGL.IntlUI = IntlUI;
  global.CGL.InternationalUI = IntlUI;
})(typeof window !== 'undefined' ? window : globalThis);
