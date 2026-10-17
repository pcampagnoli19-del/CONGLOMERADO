/**
 * CONGLOMERADO — Telas de Finanças (Fase 3)
 * Visão conglomerado, ficha financeira da empresa, finanças pessoais.
 */
(function (global) {
  'use strict';

  const FinanceUI = {
    view: 'hub', // hub | empresa | pessoal
    selectedId: null,
    empresaTab: 'resumo', // resumo | contas | fluxo | dre | balanco | credito | aplicacoes | dividendos
    drePeriodo: 'semanal',

    render(main) {
      const state = CGL.Game.getState();
      if (!state?.player) return;
      CGL.Finance.ensurePersonal(state);
      if (this.view === 'empresa' && this.selectedId) {
        this.renderEmpresaFinance(main, this.selectedId);
      } else if (this.view === 'pessoal') {
        this.renderPessoal(main);
      } else {
        this.renderHub(main);
      }
    },

    renderHub(main) {
      const state = CGL.Game.getState();
      const sum = CGL.Finance.dashboardSummary(state);
      const companies = CGL.Company.listPlayerCompanies(state);

      main.innerHTML = `
        <div class="screen finance-screen">
          <header class="screen-header row-between">
            <div>
              <h1>Finanças</h1>
              <p class="muted">Caixa por empresa — holdings não compartilham recursos automaticamente.</p>
            </div>
            <button type="button" class="btn btn-secondary" id="btn-pf">Finanças pessoais</button>
          </header>

          <div class="dash-grid">
            ${CGL.UI.card('Caixa do grupo', `
              <div class="stat-gold">${CGL.Utils.formatBRL(sum.caixaGrupo, { compact: true })}</div>
              <p class="muted">${sum.empresas} empresa(s) sob seu controle</p>
            `)}
            ${CGL.UI.card('Liquidez média', `
              <div class="stat-gold">${sum.liquidezMedia.toFixed(2)}x</div>
              <p class="muted">Indicador corrente agregado</p>
            `)}
            ${CGL.UI.card('Endividamento', `
              <div class="stat-gold">${CGL.Utils.formatBRL(sum.dividaGrupo, { compact: true })}</div>
              <p class="muted">Empréstimos + financiamentos + debêntures</p>
            `)}
            ${CGL.UI.card('Caixa pessoal', `
              <div class="stat-gold">${CGL.Utils.formatBRL(sum.caixaPessoal, { compact: true })}</div>
              <p class="muted">Contas PF separadas das PJ</p>
              <button type="button" class="btn btn-sm btn-secondary" id="btn-pf-2">Abrir PF</button>
            `)}
          </div>

          <section class="section-block">
            <h2>Empresas</h2>
            ${companies.length ? `
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Caixa</th>
                      <th>Dívida</th>
                      <th>Liquidez</th>
                      <th>Risco</th>
                      <th>Estágio</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${companies.map((e) => {
                      CGL.Finance.ensureCompanyFinance(e, state);
                      const ind = e.finance.indicadores || {};
                      const fal = CGL.Data.getBankruptcyStage(e.finance.falencia?.estagio || 0);
                      return `<tr>
                        <td>
                          ${CGL.Company.logoHtml(e.logo, 'sm')}
                          ${CGL.Utils.escapeHtml(e.nomeFantasia)}
                        </td>
                        <td>${CGL.Utils.formatBRL(e.caixa, { compact: true })}</td>
                        <td>${CGL.Utils.formatBRL(e.endividamento, { compact: true })}</td>
                        <td>${(ind.liquidez ?? 0).toFixed(2)}</td>
                        <td>${Math.round(ind.riscoFinanceiro || 0)}</td>
                        <td><span class="tag">${CGL.Utils.escapeHtml(fal.nome)}</span></td>
                        <td><button type="button" class="btn btn-sm btn-primary" data-fin="${e.id}">Abrir</button></td>
                      </tr>`;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            ` : '<p class="muted">Nenhuma empresa. Constitua uma em Empresas.</p>'}
          </section>
        </div>
      `;

      main.querySelector('#btn-pf')?.addEventListener('click', () => {
        this.view = 'pessoal';
        this.render(main);
      });
      main.querySelector('#btn-pf-2')?.addEventListener('click', () => {
        this.view = 'pessoal';
        this.render(main);
      });
      main.querySelectorAll('[data-fin]').forEach((btn) => {
        btn.onclick = () => {
          this.view = 'empresa';
          this.selectedId = btn.dataset.fin;
          this.empresaTab = 'resumo';
          this.render(main);
        };
      });
    },

    renderEmpresaFinance(main, id) {
      const state = CGL.Game.getState();
      const e = CGL.Company.getById(state, id);
      if (!e) {
        this.view = 'hub';
        this.renderHub(main);
        return;
      }
      CGL.Finance.ensureCompanyFinance(e, state);
      const tabs = [
        { id: 'resumo', label: 'Resumo' },
        { id: 'contas', label: 'Contas' },
        { id: 'fluxo', label: 'Fluxo' },
        { id: 'dre', label: 'DRE' },
        { id: 'balanco', label: 'Balanço' },
        { id: 'credito', label: 'Crédito' },
        { id: 'aplicacoes', label: 'Aplicações' },
        { id: 'dividendos', label: 'Dividendos' }
      ];

      main.innerHTML = `
        <div class="screen finance-screen">
          <header class="screen-header row-between">
            <div class="detail-title">
              <button type="button" class="btn btn-ghost" id="btn-back">← Finanças</button>
              ${CGL.Company.logoHtml(e.logo, 'md')}
              <div>
                <h1>${CGL.Utils.escapeHtml(e.nomeFantasia)}</h1>
                <p class="muted">Saúde financeira independente · ${e.cnpj}</p>
              </div>
            </div>
          </header>
          <div class="finance-tabs" role="tablist">
            ${tabs.map((t) => `
              <button type="button" class="finance-tab ${this.empresaTab === t.id ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>
            `).join('')}
          </div>
          <div id="finance-tab-body"></div>
        </div>
      `;

      main.querySelector('#btn-back').onclick = () => {
        this.view = 'hub';
        this.selectedId = null;
        this.render(main);
      };
      main.querySelectorAll('[data-tab]').forEach((btn) => {
        btn.onclick = () => {
          this.empresaTab = btn.dataset.tab;
          this.render(main);
        };
      });
      this._renderEmpresaTab(main.querySelector('#finance-tab-body'), e, state);
    },

    _renderEmpresaTab(el, e, state) {
      if (!el) return;
      const fin = e.finance;
      const tab = this.empresaTab;
      if (tab === 'resumo') this._tabResumo(el, e, state);
      else if (tab === 'contas') this._tabContas(el, e, state);
      else if (tab === 'fluxo') this._tabFluxo(el, e, state);
      else if (tab === 'dre') this._tabDre(el, e, state);
      else if (tab === 'balanco') this._tabBalanco(el, e, state);
      else if (tab === 'credito') this._tabCredito(el, e, state);
      else if (tab === 'aplicacoes') this._tabAplicacoes(el, e, state);
      else if (tab === 'dividendos') this._tabDividendos(el, e, state);
    },

    _tabResumo(el, e, state) {
      const ind = e.finance.indicadores || CGL.Finance.recalcIndicators(e, state);
      const fal = CGL.Data.getBankruptcyStage(e.finance.falencia?.estagio || 0);
      el.innerHTML = `
        <div class="dash-grid">
          ${CGL.UI.card('Caixa disponível', `<div class="stat-gold">${CGL.Utils.formatBRL(ind.caixaDisponivel)}</div>`)}
          ${CGL.UI.card('Capital de giro', `<div class="stat-gold">${CGL.Utils.formatBRL(ind.capitalGiro, { compact: true })}</div>`)}
          ${CGL.UI.card('Liquidez', `<div class="stat-gold">${ind.liquidez}</div>`)}
          ${CGL.UI.card('Risco financeiro', `
            ${CGL.UI.progressBar('Risco', ind.riscoFinanceiro, { invert: true })}
          `)}
          ${CGL.UI.card('Indicadores', `
            <ul class="kv-list">
              <li><span>Endividamento</span><span>${CGL.Utils.formatPercent(ind.endividamento * 100)}</span></li>
              <li><span>Margem</span><span>${CGL.Utils.formatPercent(ind.margemLucro * 100)}</span></li>
              <li><span>ROE</span><span>${CGL.Utils.formatPercent(ind.roe * 100)}</span></li>
              <li><span>ROA</span><span>${CGL.Utils.formatPercent(ind.roa * 100)}</span></li>
              <li><span>Eficiência</span><span>${CGL.Utils.formatPercent(ind.eficienciaOperacional * 100)}</span></li>
              <li><span>Crescimento/sem</span><span>${CGL.Utils.formatPercent(ind.crescimento * 100)}</span></li>
            </ul>
          `)}
          ${CGL.UI.card('Trajetória de insolvência', `
            <p><strong>${CGL.Utils.escapeHtml(fal.nome)}</strong> (estágio ${fal.id}/8)</p>
            <p class="muted">Falência só ocorre após sequência de problemas — não é instantânea.</p>
            ${CGL.UI.progressBar('Estágio', (fal.id / 8) * 100, { invert: true })}
          `)}
        </div>
        <section class="section-block actions-row">
          <button type="button" class="btn btn-secondary" id="btn-transfer">Transferência intercompany</button>
        </section>
      `;
      el.querySelector('#btn-transfer')?.addEventListener('click', () => this._modalTransfer(e.id));
    },

    _tabContas(el, e, state) {
      const fin = e.finance;
      el.innerHTML = `
        <div class="row-between section-block">
          <h2>Contas bancárias PJ</h2>
          <button type="button" class="btn btn-sm btn-primary" id="btn-open-acc">Abrir conta</button>
        </div>
        <div class="dash-grid">
          ${fin.contas.map((c) => `
            ${CGL.UI.card(c.bancoNome, `
              <ul class="kv-list">
                <li><span>Disponível</span><span class="pos">${CGL.Utils.formatBRL(c.disponivel)}</span></li>
                <li><span>Bloqueado</span><span>${CGL.Utils.formatBRL(c.bloqueado)}</span></li>
                <li><span>Limite</span><span>${CGL.Utils.formatBRL(c.limiteCredito)}</span></li>
                <li><span>Tarifa/mês</span><span>${CGL.Utils.formatBRL(c.tarifaMensal)}</span></li>
                <li><span>Rendimento auto</span><span>${c.rendimentoAuto ? 'Sim' : 'Não'}</span></li>
                <li><span>Relacionamento</span><span>${Math.round(c.relacionamento)}</span></li>
              </ul>
              ${CGL.UI.progressBar('Relacionamento', c.relacionamento)}
            `)}
          `).join('')}
        </div>
      `;
      el.querySelector('#btn-open-acc').onclick = () => this._modalOpenAccount(e.id);
    },

    _tabFluxo(el, e) {
      const rows = (e.finance.ledger || []).slice(0, 40);
      el.innerHTML = `
        <section class="section-block">
          <h2>Fluxo de caixa (ledger permanente)</h2>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Sem.</th><th>Tipo</th><th>Categoria</th><th>Descrição</th><th>Valor</th></tr></thead>
              <tbody>
                ${rows.map((r) => `
                  <tr>
                    <td>${r.semana}</td>
                    <td class="${r.tipo === 'entrada' ? 'pos' : 'neg'}">${r.tipo}</td>
                    <td>${CGL.Utils.escapeHtml(r.categoria)}</td>
                    <td>${CGL.Utils.escapeHtml(r.descricao)}</td>
                    <td class="${r.tipo === 'entrada' ? 'pos' : 'neg'}">${r.tipo === 'entrada' ? '+' : '−'}${CGL.Utils.formatBRL(r.valor)}</td>
                  </tr>
                `).join('') || '<tr><td colspan="5" class="muted">Sem lançamentos.</td></tr>'}
              </tbody>
            </table>
          </div>
        </section>
      `;
    },

    _tabDre(el, e) {
      const dre = CGL.Finance.aggregateDre(e, this.drePeriodo);
      const periods = [
        { id: 'semanal', label: 'Semanal' },
        { id: 'mensal', label: 'Mensal' },
        { id: 'trimestral', label: 'Trimestral' },
        { id: 'anual', label: 'Anual' }
      ];
      el.innerHTML = `
        <div class="finance-tabs" style="margin-bottom:1rem">
          ${periods.map((p) => `
            <button type="button" class="finance-tab ${this.drePeriodo === p.id ? 'active' : ''}" data-dre="${p.id}">${p.label}</button>
          `).join('')}
        </div>
        <p class="muted">${dre.semanas} semana(s) agregada(s)</p>
        <ul class="kv-list dre-list">
          <li><span>Receita bruta</span><span>${CGL.Utils.formatBRL(dre.receitaBruta)}</span></li>
          <li><span>(−) Deduções</span><span>${CGL.Utils.formatBRL(dre.deducoes)}</span></li>
          <li><span>Receita líquida</span><span>${CGL.Utils.formatBRL(dre.receitaLiquida)}</span></li>
          <li><span>(−) Custos operacionais</span><span>${CGL.Utils.formatBRL(dre.custosOperacionais)}</span></li>
          <li><span>(−) Despesas administrativas</span><span>${CGL.Utils.formatBRL(dre.despesasAdministrativas)}</span></li>
          <li><span>(−) Despesas financeiras</span><span>${CGL.Utils.formatBRL(dre.despesasFinanceiras)}</span></li>
          <li><span>Resultado operacional</span><span>${CGL.Utils.formatBRL(dre.resultadoOperacional)}</span></li>
          <li><span>(−) Impostos</span><span>${CGL.Utils.formatBRL(dre.impostos)}</span></li>
          <li class="dre-result"><span>Lucro líquido</span><span class="${dre.lucroLiquido >= 0 ? 'pos' : 'neg'}">${CGL.Utils.formatBRL(dre.lucroLiquido)}</span></li>
        </ul>
      `;
      el.querySelectorAll('[data-dre]').forEach((btn) => {
        btn.onclick = () => {
          this.drePeriodo = btn.dataset.dre;
          this.render(document.getElementById('main-content'));
        };
      });
    },

    _tabBalanco(el, e, state) {
      const bal = e.finance.balanco || CGL.Finance.rebuildBalanceSheet(e, state);
      const row = (obj) => Object.entries(obj).map(([k, v]) => `
        <li><span>${CGL.Utils.escapeHtml(k)}</span><span>${CGL.Utils.formatBRL(v)}</span></li>
      `).join('');
      el.innerHTML = `
        <div class="dash-grid">
          ${CGL.UI.card('Ativos', `
            <ul class="kv-list">${row(bal.ativos)}</ul>
            <p><strong>Total ${CGL.Utils.formatBRL(bal.totalAtivos)}</strong></p>
          `)}
          ${CGL.UI.card('Passivos', `
            <ul class="kv-list">${row(bal.passivos)}</ul>
            <p><strong>Total ${CGL.Utils.formatBRL(bal.totalPassivos)}</strong></p>
          `)}
          ${CGL.UI.card('Patrimônio líquido', `
            <ul class="kv-list">${row(bal.patrimonioLiquido)}</ul>
            <p><strong>Total ${CGL.Utils.formatBRL(bal.totalPL)}</strong></p>
          `)}
        </div>
      `;
    },

    _tabCredito(el, e, state) {
      const fin = e.finance;
      const canDeb = CGL.Finance.canIssueDebentures(e);
      el.innerHTML = `
        <div class="actions-row section-block">
          <button type="button" class="btn btn-primary" id="btn-loan">Solicitar empréstimo</button>
          <button type="button" class="btn btn-secondary" id="btn-fin">Financiamento</button>
          <button type="button" class="btn btn-secondary" id="btn-deb" ${canDeb ? '' : 'disabled'} title="${canDeb ? '' : 'Porte/natureza insuficientes'}">Emitir debêntures</button>
        </div>
        <section class="section-block">
          <h2>Empréstimos</h2>
          ${(fin.emprestimos || []).length ? `
            <table class="data-table">
              <thead><tr><th>Finalidade</th><th>Saldo</th><th>Parcela</th><th>Status</th><th></th></tr></thead>
              <tbody>
                ${fin.emprestimos.map((l) => {
                  const pur = CGL.Data.getLoanPurposeById(l.finalidadeId);
                  return `<tr>
                    <td>${CGL.Utils.escapeHtml(pur?.nome || l.finalidadeId)}</td>
                    <td>${CGL.Utils.formatBRL(l.saldo)}</td>
                    <td>${CGL.Utils.formatBRL(l.parcela)}</td>
                    <td>${l.status}${l.semanasAtraso ? ` (${l.semanasAtraso}s atraso)` : ''}</td>
                    <td>${l.status === 'atraso' || l.status === 'ativo' ? `<button type="button" class="btn btn-sm btn-ghost" data-reno="${l.id}">Renegociar</button>` : ''}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          ` : '<p class="muted">Nenhum empréstimo.</p>'}
        </section>
        <section class="section-block">
          <h2>Financiamentos</h2>
          ${(fin.financiamentos || []).length ? `
            <table class="data-table">
              <thead><tr><th>Bem</th><th>Saldo</th><th>Parcela</th><th>Status</th></tr></thead>
              <tbody>
                ${fin.financiamentos.map((f) => `
                  <tr>
                    <td>${CGL.Utils.escapeHtml(f.tipoBem)}</td>
                    <td>${CGL.Utils.formatBRL(f.saldo)}</td>
                    <td>${CGL.Utils.formatBRL(f.parcela)}</td>
                    <td>${f.status}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<p class="muted">Nenhum financiamento.</p>'}
        </section>
        <section class="section-block">
          <h2>Debêntures</h2>
          ${(fin.debentures || []).length ? `
            <ul>${fin.debentures.map((d) => `
              <li>${d.tipo} — captado ${CGL.Utils.formatBRL(d.captado)} · saldo ${CGL.Utils.formatBRL(d.saldo)} · ${d.status}</li>
            `).join('')}</ul>
          ` : '<p class="muted">Nenhuma emissão.</p>'}
        </section>
        <section class="section-block">
          <h2>Garantias</h2>
          ${(fin.garantias || []).length ? `
            <ul>${fin.garantias.map((g) => {
              const t = CGL.Data.collateralTypes.find((x) => x.id === g.tipoId);
              return `<li>${CGL.Utils.escapeHtml(t?.nome || g.tipoId)} — ${CGL.Utils.formatBRL(g.valor)}${g.executada ? ' <em class="tag">executada</em>' : ''}</li>`;
            }).join('')}</ul>
          ` : '<p class="muted">Nenhuma garantia registrada.</p>'}
        </section>
      `;
      el.querySelector('#btn-loan').onclick = () => this._modalLoan(e.id);
      el.querySelector('#btn-fin').onclick = () => this._modalFinancing(e.id);
      el.querySelector('#btn-deb')?.addEventListener('click', () => this._modalDebentures(e.id));
      el.querySelectorAll('[data-reno]').forEach((btn) => {
        btn.onclick = () => {
          try {
            CGL.Finance.renegotiateLoan(state, e.id, btn.dataset.reno);
            CGL.Game.save(false);
            CGL.Events.notify('success', 'Renegociação', 'Contrato ajustado.');
            this.render(document.getElementById('main-content'));
          } catch (err) {
            CGL.Events.notify('error', 'Falha', err.message);
          }
        };
      });
    },

    _tabAplicacoes(el, e, state) {
      const fin = e.finance;
      el.innerHTML = `
        <div class="row-between section-block">
          <h2>Aplicações de caixa excedente</h2>
          <button type="button" class="btn btn-sm btn-primary" id="btn-invest">Nova aplicação</button>
        </div>
        ${(fin.aplicacoes || []).filter((a) => a.status === 'ativa').length ? `
          <table class="data-table">
            <thead><tr><th>Produto</th><th>Valor atual</th><th>Liquidez</th><th></th></tr></thead>
            <tbody>
              ${fin.aplicacoes.filter((a) => a.status === 'ativa').map((a) => `
                <tr>
                  <td>${CGL.Utils.escapeHtml(a.nome)}</td>
                  <td>${CGL.Utils.formatBRL(a.valorAtual)}</td>
                  <td>${a.semanasRestantesResgate > 0 ? `${a.semanasRestantesResgate} sem.` : 'Disponível'}</td>
                  <td><button type="button" class="btn btn-sm btn-secondary" data-resgate="${a.id}" ${a.semanasRestantesResgate > 0 ? 'disabled' : ''}>Resgatar</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p class="muted">Nenhuma aplicação ativa.</p>'}
        <p class="muted" style="margin-top:1rem">Produtos: ${(CGL.Data.investmentProducts || []).map((p) => p.nome).join(', ')}.</p>
      `;
      el.querySelector('#btn-invest').onclick = () => this._modalInvest(e.id);
      el.querySelectorAll('[data-resgate]').forEach((btn) => {
        btn.onclick = () => {
          try {
            const v = CGL.Finance.redeemInvestment(state, e.id, btn.dataset.resgate);
            CGL.Game.save(false);
            CGL.Events.notify('success', 'Resgate', CGL.Utils.formatBRL(v));
            this.render(document.getElementById('main-content'));
          } catch (err) {
            CGL.Events.notify('error', 'Falha', err.message);
          }
        };
      });
    },

    _tabDividendos(el, e, state) {
      const fin = e.finance;
      const pol = CGL.Data.getDividendPolicyById(fin.politicaDividendos);
      el.innerHTML = `
        <div class="dash-grid">
          ${CGL.UI.card('Política atual', `
            <p><strong>${CGL.Utils.escapeHtml(pol.nome)}</strong></p>
            <p class="muted">Payout ${(pol.payout * 100).toFixed(0)}% · afeta satisfação dos sócios</p>
            <label class="field">
              <span>Alterar política</span>
              <select id="sel-pol">
                ${CGL.Data.dividendPolicies.map((p) => `
                  <option value="${p.id}" ${p.id === pol.id ? 'selected' : ''}>${CGL.Utils.escapeHtml(p.nome)}</option>
                `).join('')}
              </select>
            </label>
            <button type="button" class="btn btn-sm btn-secondary" id="btn-set-pol">Salvar política</button>
          `)}
          ${CGL.UI.card('Lucros acumulados', `
            <div class="stat-gold">${CGL.Utils.formatBRL(fin.lucrosAcumulados || 0, { compact: true })}</div>
            <button type="button" class="btn btn-primary" id="btn-dist">Distribuir agora</button>
            <p class="muted" style="margin-top:0.5rem">Pró-labore detalhado fica para Fase 4 (stub).</p>
          `)}
        </div>
      `;
      el.querySelector('#btn-set-pol').onclick = () => {
        const id = el.querySelector('#sel-pol').value;
        CGL.Finance.setDividendPolicy(state, e.id, id);
        CGL.Game.save(false);
        CGL.Events.notify('success', 'Política', 'Atualizada.');
        this.render(document.getElementById('main-content'));
      };
      el.querySelector('#btn-dist').onclick = () => {
        try {
          const r = CGL.Finance.distributeDividends(state, e.id);
          CGL.Game.save(false);
          CGL.UI.refreshTopbar();
          CGL.Events.notify('success', 'Dividendos', `Total ${CGL.Utils.formatBRL(r.total)}`);
          this.render(document.getElementById('main-content'));
        } catch (err) {
          CGL.Events.notify('error', 'Falha', err.message);
        }
      };
    },

    /* ========== Pessoal ========== */

    renderPessoal(main) {
      const state = CGL.Game.getState();
      const pf = CGL.Finance.ensurePersonal(state);
      main.innerHTML = `
        <div class="screen finance-screen">
          <header class="screen-header row-between">
            <div class="detail-title">
              <button type="button" class="btn btn-ghost" id="btn-back">← Finanças</button>
              <div>
                <h1>Finanças pessoais</h1>
                <p class="muted">Contas PF totalmente separadas das empresas</p>
              </div>
            </div>
            <button type="button" class="btn btn-sm btn-primary" id="btn-open-pf">Abrir conta</button>
          </header>
          <div class="dash-grid">
            ${CGL.UI.card('Dinheiro disponível', `
              <div class="stat-gold">${CGL.Utils.formatBRL(state.player.dinheiro)}</div>
            `)}
            ${pf.contas.map((c) => CGL.UI.card(c.bancoNome, `
              <ul class="kv-list">
                <li><span>Disponível</span><span>${CGL.Utils.formatBRL(c.disponivel)}</span></li>
                <li><span>Bloqueado</span><span>${CGL.Utils.formatBRL(c.bloqueado)}</span></li>
                <li><span>Limite</span><span>${CGL.Utils.formatBRL(c.limiteCredito)}</span></li>
              </ul>
            `)).join('')}
          </div>
          <section class="section-block">
            <div class="row-between">
              <h2>Aplicações pessoais</h2>
              <button type="button" class="btn btn-sm btn-secondary" id="btn-inv-pf">Aplicar</button>
            </div>
            <ul>
              ${(pf.aplicacoes || []).filter((a) => a.status === 'ativa').map((a) => `
                <li>${CGL.Utils.escapeHtml(a.nome)} — ${CGL.Utils.formatBRL(a.valorAtual)}
                  <button type="button" class="btn btn-sm btn-ghost" data-resgate-pf="${a.id}" ${a.semanasRestantesResgate > 0 ? 'disabled' : ''}>Resgatar</button>
                </li>
              `).join('') || '<li class="muted">Nenhuma.</li>'}
            </ul>
          </section>
          <section class="section-block">
            <h2>Extrato recente</h2>
            <ul class="timeline">
              ${(pf.ledger || []).slice(0, 15).map((r) => `
                <li>
                  <div class="tl-meta">S${r.semana} · ${r.categoria}</div>
                  <strong class="${r.tipo === 'entrada' ? 'pos' : 'neg'}">${r.tipo === 'entrada' ? '+' : '−'}${CGL.Utils.formatBRL(r.valor)}</strong>
                  <p>${CGL.Utils.escapeHtml(r.descricao)}</p>
                </li>
              `).join('') || '<li class="muted">Vazio.</li>'}
            </ul>
          </section>
        </div>
      `;
      main.querySelector('#btn-back').onclick = () => {
        this.view = 'hub';
        this.render(main);
      };
      main.querySelector('#btn-open-pf').onclick = () => this._modalOpenAccount(null, true);
      main.querySelector('#btn-inv-pf').onclick = () => this._modalInvest(null, true);
      main.querySelectorAll('[data-resgate-pf]').forEach((btn) => {
        btn.onclick = () => {
          try {
            CGL.Finance.redeemInvestment(state, null, btn.dataset.resgatePf, { pessoal: true });
            CGL.Game.save(false);
            CGL.UI.refreshTopbar();
            this.render(main);
          } catch (err) {
            CGL.Events.notify('error', 'Falha', err.message);
          }
        };
      });
    },

    /* ========== Modais ========== */

    _modalOpenAccount(empresaId, pessoal = false) {
      const used = new Set();
      if (pessoal) {
        CGL.Finance.ensurePersonal(CGL.Game.getState()).contas.forEach((c) => used.add(c.bancoId));
      } else {
        const e = CGL.Company.getById(CGL.Game.getState(), empresaId);
        (e?.finance?.contas || []).forEach((c) => used.add(c.bancoId));
      }
      const opts = CGL.Data.banks
        .filter((b) => !used.has(b.id))
        .map((b) => `<option value="${b.id}">${b.nome} (${b.tipo})</option>`)
        .join('');
      CGL.UI.modal({
        title: pessoal ? 'Abrir conta pessoal' : 'Abrir conta empresarial',
        body: `
          <label class="field"><span>Banco</span>
            <select id="m-bank">${opts || '<option value="">Nenhum disponível</option>'}</select>
          </label>
        `,
        confirmLabel: 'Abrir',
        onConfirm: () => {
          const bancoId = document.getElementById('m-bank')?.value;
          if (!bancoId) return false;
          try {
            if (pessoal) CGL.Finance.openPersonalAccount(CGL.Game.getState(), bancoId);
            else CGL.Finance.openCompanyAccount(CGL.Game.getState(), empresaId, bancoId);
            CGL.Game.save(false);
            CGL.Events.notify('success', 'Conta', 'Aberta com sucesso.');
            this.render(document.getElementById('main-content'));
            return true;
          } catch (err) {
            CGL.Events.notify('error', 'Falha', err.message);
            return false;
          }
        }
      });
    },

    _modalLoan(empresaId) {
      const banks = CGL.Data.banks.map((b) => `<option value="${b.id}">${b.nome}</option>`).join('');
      const purposes = CGL.Data.loanPurposes.map((p) => `<option value="${p.id}">${p.nome}</option>`).join('');
      const cols = CGL.Data.collateralTypes.map((c) => `<option value="${c.id}">${c.nome}</option>`).join('');
      CGL.UI.modal({
        title: 'Solicitar empréstimo',
        wide: true,
        body: `
          <div class="form-grid">
            <label class="field"><span>Banco</span><select id="m-bank">${banks}</select></label>
            <label class="field"><span>Finalidade</span><select id="m-fin">${purposes}</select></label>
            <label class="field"><span>Valor (R$)</span><input type="number" id="m-val" min="5000" step="1000" value="50000" /></label>
            <label class="field"><span>Prazo (semanas)</span><input type="number" id="m-prazo" min="4" max="208" value="52" /></label>
            <label class="field"><span>Garantia</span><select id="m-gar">${cols}</select></label>
            <label class="field"><span>Valor da garantia</span><input type="number" id="m-gar-v" min="0" step="1000" value="40000" /></label>
          </div>
          <p class="muted">Aprovação depende de histórico, reputação, endividamento, garantias e economia.</p>
        `,
        confirmLabel: 'Avaliar e contratar',
        onConfirm: () => {
          try {
            const state = CGL.Game.getState();
            const r = CGL.Finance.requestLoan(state, empresaId, {
              bancoId: document.getElementById('m-bank').value,
              finalidadeId: document.getElementById('m-fin').value,
              valor: Number(document.getElementById('m-val').value),
              prazoSem: Number(document.getElementById('m-prazo').value),
              garantias: [{
                tipoId: document.getElementById('m-gar').value,
                valor: Number(document.getElementById('m-gar-v').value)
              }]
            });
            CGL.Game.save(false);
            CGL.UI.refreshTopbar();
            if (r.ok) CGL.Events.notify('success', 'Aprovado', r.motivo);
            else CGL.Events.notify('alert', 'Recusado', r.motivo);
            this.empresaTab = 'credito';
            this.render(document.getElementById('main-content'));
            return true;
          } catch (err) {
            CGL.Events.notify('error', 'Falha', err.message);
            return false;
          }
        }
      });
    },

    _modalFinancing(empresaId) {
      CGL.UI.modal({
        title: 'Financiamento parcelado',
        body: `
          <div class="form-grid">
            <label class="field"><span>Tipo de bem</span>
              <select id="m-bem">
                <option value="maquinas">Máquinas</option>
                <option value="equipamentos">Equipamentos</option>
                <option value="veiculos">Veículos</option>
                <option value="imoveis">Imóveis</option>
                <option value="terrenos">Terrenos</option>
                <option value="projetos">Grandes projetos</option>
              </select>
            </label>
            <label class="field"><span>Valor do bem</span><input type="number" id="m-val" value="80000" min="10000" step="1000" /></label>
            <label class="field"><span>Entrada</span><input type="number" id="m-ent" value="16000" min="0" step="1000" /></label>
            <label class="field"><span>Prazo (semanas)</span><input type="number" id="m-prazo" value="52" min="8" /></label>
          </div>
        `,
        confirmLabel: 'Contratar',
        onConfirm: () => {
          try {
            CGL.Finance.requestFinancing(CGL.Game.getState(), empresaId, {
              tipoBem: document.getElementById('m-bem').value,
              valor: Number(document.getElementById('m-val').value),
              entrada: Number(document.getElementById('m-ent').value),
              prazoSem: Number(document.getElementById('m-prazo').value)
            });
            CGL.Game.save(false);
            CGL.Events.notify('success', 'Financiamento', 'Contrato ativo.');
            this.render(document.getElementById('main-content'));
            return true;
          } catch (err) {
            CGL.Events.notify('error', 'Falha', err.message);
            return false;
          }
        }
      });
    },

    _modalDebentures(empresaId) {
      CGL.UI.modal({
        title: 'Emitir debêntures',
        body: `
          <div class="form-grid">
            <label class="field"><span>Valor ofertado</span><input type="number" id="m-val" value="500000" min="500000" step="50000" /></label>
            <label class="field"><span>Prazo (semanas)</span><input type="number" id="m-prazo" value="104" min="52" /></label>
            <label class="field"><span>Remuneração anual</span><input type="number" id="m-rem" value="0.12" min="0.05" max="0.3" step="0.01" /></label>
            <label class="field"><span>Tipo</span>
              <select id="m-tipo">
                <option value="simples">Simples</option>
                <option value="conversivel">Conversível</option>
                <option value="incentivada">Incentivada</option>
              </select>
            </label>
          </div>
          <p class="muted">Investidores decidem pela demanda conforme risco. IPO completo fica na Fase 5.</p>
        `,
        confirmLabel: 'Emitir',
        onConfirm: () => {
          try {
            const d = CGL.Finance.issueDebentures(CGL.Game.getState(), empresaId, {
              valor: Number(document.getElementById('m-val').value),
              prazoSem: Number(document.getElementById('m-prazo').value),
              remuneracaoAnual: Number(document.getElementById('m-rem').value),
              tipo: document.getElementById('m-tipo').value
            });
            CGL.Game.save(false);
            CGL.Events.notify('success', 'Debêntures', `Captado ${CGL.Utils.formatBRL(d.captado)}`);
            this.render(document.getElementById('main-content'));
            return true;
          } catch (err) {
            CGL.Events.notify('error', 'Falha', err.message);
            return false;
          }
        }
      });
    },

    _modalInvest(empresaId, pessoal = false) {
      const opts = CGL.Data.investmentProducts.map((p) =>
        `<option value="${p.id}">${p.nome} (~${(p.rentabilidadeAnual * 100).toFixed(1)}% a.a., liq. ${p.liquidezSem}sem)</option>`
      ).join('');
      CGL.UI.modal({
        title: pessoal ? 'Aplicação pessoal' : 'Aplicar caixa excedente',
        body: `
          <label class="field"><span>Produto</span><select id="m-prod">${opts}</select></label>
          <label class="field"><span>Valor</span><input type="number" id="m-val" value="10000" min="1000" step="500" /></label>
        `,
        confirmLabel: 'Aplicar',
        onConfirm: () => {
          try {
            CGL.Finance.invest(
              CGL.Game.getState(),
              empresaId,
              document.getElementById('m-prod').value,
              Number(document.getElementById('m-val').value),
              { pessoal }
            );
            CGL.Game.save(false);
            CGL.UI.refreshTopbar();
            CGL.Events.notify('success', 'Aplicação', 'Recursos aplicados.');
            this.render(document.getElementById('main-content'));
            return true;
          } catch (err) {
            CGL.Events.notify('error', 'Falha', err.message);
            return false;
          }
        }
      });
    },

    _modalTransfer(fromId) {
      const state = CGL.Game.getState();
      const others = CGL.Company.listPlayerCompanies(state)
        .filter((e) => e.id !== fromId && CGL.Company.playerStake(e, state.player.id) >= 50);
      if (!others.length) {
        CGL.Events.notify('alert', 'Transferência', 'É preciso outra empresa com controle ≥50%.');
        return;
      }
      CGL.UI.modal({
        title: 'Transferência intercompany',
        body: `
          <p class="muted">Holdings não compartilham caixa automaticamente. Use este mecanismo explícito.</p>
          <label class="field"><span>Destino</span>
            <select id="m-to">${others.map((e) => `<option value="${e.id}">${CGL.Utils.escapeHtml(e.nomeFantasia)}</option>`).join('')}</select>
          </label>
          <label class="field"><span>Valor</span><input type="number" id="m-val" value="10000" min="100" step="100" /></label>
        `,
        confirmLabel: 'Transferir',
        onConfirm: () => {
          try {
            CGL.Finance.transferBetweenCompanies(
              state,
              fromId,
              document.getElementById('m-to').value,
              Number(document.getElementById('m-val').value)
            );
            CGL.Game.save(false);
            CGL.Events.notify('success', 'Transferência', 'Concluída.');
            this.render(document.getElementById('main-content'));
            return true;
          } catch (err) {
            CGL.Events.notify('error', 'Falha', err.message);
            return false;
          }
        }
      });
    },

    /** Bloco para ficha da empresa (CompanyUI) */
    detailFinanceTabsHtml(empresa, state) {
      CGL.Finance.ensureCompanyFinance(empresa, state);
      const ind = empresa.finance.indicadores || {};
      const fal = CGL.Data.getBankruptcyStage(empresa.finance.falencia?.estagio || 0);
      return `
        <section class="section-block finance-embed">
          <div class="row-between">
            <h2>Finanças</h2>
            <button type="button" class="btn btn-sm btn-primary" data-goto-fin="${empresa.id}">Abrir módulo</button>
          </div>
          <div class="dash-grid">
            ${CGL.UI.card('Caixa / liquidez', `
              <ul class="kv-list">
                <li><span>Caixa</span><span>${CGL.Utils.formatBRL(empresa.caixa)}</span></li>
                <li><span>Liquidez</span><span>${(ind.liquidez ?? 0).toFixed(2)}</span></li>
                <li><span>Risco</span><span>${Math.round(ind.riscoFinanceiro || 0)}</span></li>
                <li><span>Estágio</span><span>${CGL.Utils.escapeHtml(fal.nome)}</span></li>
              </ul>
            `)}
            ${CGL.UI.card('DRE (última semana)', (() => {
              const d = (empresa.finance.dreHistorico || [])[0];
              if (!d) return '<p class="muted">Aguarde o próximo tick semanal.</p>';
              return `<ul class="kv-list">
                <li><span>Receita bruta</span><span>${CGL.Utils.formatBRL(d.receitaBruta)}</span></li>
                <li><span>Lucro líquido</span><span class="${d.lucroLiquido >= 0 ? 'pos' : 'neg'}">${CGL.Utils.formatBRL(d.lucroLiquido)}</span></li>
              </ul>`;
            })())}
          </div>
        </section>
      `;
    },

    bindDetailFinance(main) {
      main.querySelectorAll('[data-goto-fin]').forEach((btn) => {
        btn.onclick = () => {
          this.view = 'empresa';
          this.selectedId = btn.dataset.gotoFin;
          this.empresaTab = 'resumo';
          CGL.UI.navigate('financas');
        };
      });
    },

    dashboardCardsHtml(state) {
      const sum = CGL.Finance.dashboardSummary(state);
      return CGL.UI.card('Caixa e liquidez', `
        <ul class="kv-list">
          <li><span>Caixa do grupo</span><span class="stat-gold" style="font-size:1.1rem">${CGL.Utils.formatBRL(sum.caixaGrupo, { compact: true })}</span></li>
          <li><span>Caixa pessoal</span><span>${CGL.Utils.formatBRL(sum.caixaPessoal, { compact: true })}</span></li>
          <li><span>Liquidez média</span><span>${sum.liquidezMedia.toFixed(2)}x</span></li>
          <li><span>Dívida do grupo</span><span>${CGL.Utils.formatBRL(sum.dividaGrupo, { compact: true })}</span></li>
        </ul>
        <button type="button" class="btn btn-sm btn-secondary" data-go="financas">Abrir Finanças</button>
      `);
    }
  };

  global.CGL = global.CGL || {};
  global.CGL.FinanceUI = FinanceUI;
})(typeof window !== 'undefined' ? window : globalThis);
