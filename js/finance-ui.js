/**
 * CONGLOMERADO — Telas de Finanças (Fases 3–6)
 * Visão conglomerado, ficha financeira da empresa, finanças pessoais.
 * Fase 4: Remuneração · Fase 5: rating/Mercado · Fase 6: Endividamento + Agenda.
 */
(function (global) {
  'use strict';

  const FinanceUI = {
    view: 'hub', // hub | empresa | pessoal
    selectedId: null,
    empresaTab: 'resumo', // resumo | contas | fluxo | dre | balanco | credito | endividamento | agenda | aplicacoes | remuneracao
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
              <p class="muted">PJ e PF separados — retiradas só via pró-labore, dividendos, reembolso, mútuo, venda ou restituição.</p>
            </div>
            <div class="btn-row">
              <button type="button" class="btn btn-secondary" id="btn-mercado">Mercado</button>
              <button type="button" class="btn btn-secondary" id="btn-pf">Conta pessoal (PF)</button>
            </div>
            <p class="muted" style="margin-top:0.5rem">Dívida profunda: abra uma empresa → abas Endividamento / Agenda financeira.</p>
          </header>

          <div class="dash-grid">
            ${CGL.UI.card('Caixa do grupo (PJ)', `
              <div class="stat-gold">${CGL.Utils.formatBRL(sum.caixaGrupo, { compact: true })}</div>
              <p class="muted">${sum.empresas} empresa(s) · caixas independentes</p>
            `)}
            ${CGL.UI.card('Liquidez média', `
              <div class="stat-gold">${sum.liquidezMedia.toFixed(2)}x</div>
              <p class="muted">Indicador corrente agregado</p>
            `)}
            ${CGL.UI.card('Endividamento PJ', `
              <div class="stat-gold">${CGL.Utils.formatBRL(sum.dividaGrupo, { compact: true })}</div>
              <p class="muted">Bancos + debêntures + mútuos de sócios</p>
            `)}
            ${CGL.UI.card('Patrimônio pessoal (PF)', `
              <div class="stat-gold">${CGL.Utils.formatBRL(sum.caixaPessoal, { compact: true })}</div>
              <p class="muted">Nunca confundir com caixa das empresas</p>
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
                      <th>Rating</th>
                      <th>Liquidez</th>
                      <th>Risco</th>
                      <th>Estágio</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${companies.map((e) => {
                      CGL.Finance.ensureCompanyFinance(e, state);
                      if (CGL.Market) {
                        CGL.Market.ensureCompanyMarket(e, state);
                        CGL.Market.updateCreditRating(e, state);
                      }
                      const ind = e.finance.indicadores || {};
                      const fal = CGL.Data.getBankruptcyStage(e.finance.falencia?.estagio || 0);
                      return `<tr>
                        <td>
                          ${CGL.Company.logoHtml(e.logo, 'sm')}
                          ${CGL.Utils.escapeHtml(e.nomeFantasia)}
                        </td>
                        <td>${CGL.Utils.formatBRL(e.caixa, { compact: true })}</td>
                        <td>${CGL.Utils.formatBRL(e.endividamento, { compact: true })}</td>
                        <td><strong>${CGL.Utils.escapeHtml(e.rating?.nota || '—')}</strong></td>
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

      main.querySelector('#btn-mercado')?.addEventListener('click', () => {
        CGL.UI.navigate('mercado');
      });
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
        { id: 'endividamento', label: 'Endividamento' },
        { id: 'agenda', label: 'Agenda financeira' },
        { id: 'aplicacoes', label: 'Aplicações' },
        { id: 'remuneracao', label: 'Remuneração' }
      ];
      // Compat: saves/UI antigos apontando para "dividendos"
      if (this.empresaTab === 'dividendos') this.empresaTab = 'remuneracao';

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
      else if (tab === 'endividamento') {
        if (CGL.DebtUI) CGL.DebtUI.renderEndividamento(el, e, state);
        else el.innerHTML = '<p class="muted">Módulo de dívida indisponível.</p>';
      } else if (tab === 'agenda') {
        if (CGL.DebtUI) CGL.DebtUI.renderAgenda(el, e, state);
        else el.innerHTML = '<p class="muted">Agenda financeira indisponível.</p>';
      }
      else if (tab === 'aplicacoes') this._tabAplicacoes(el, e, state);
      else if (tab === 'remuneracao' || tab === 'dividendos') this._tabRemuneracao(el, e, state);
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
          ${CGL.Market ? (() => {
            CGL.Market.ensureCompanyMarket(e, state);
            CGL.Market.updateCreditRating(e, state);
            const val = CGL.Market.calcValuation(e, state);
            return CGL.UI.card('Mercado de capitais', `
              <ul class="kv-list">
                <li><span>Rating</span><span>${e.rating.nota}</span></li>
                <li><span>Valuation</span><span>${CGL.Utils.formatBRL(val, { compact: true })}</span></li>
                <li><span>Confiança</span><span>${Math.round(e.confiancaMercado || 0)}</span></li>
                <li><span>IPO</span><span>${e.ipo.listada ? e.ipo.ticker : e.ipo.status}</span></li>
              </ul>
              <button type="button" class="btn btn-sm btn-secondary" id="btn-go-market">Abrir Mercado</button>
            `);
          })() : ''}
        </div>
        <section class="section-block actions-row">
          <button type="button" class="btn btn-secondary" id="btn-transfer">Transferência intercompany</button>
        </section>
      `;
      el.querySelector('#btn-transfer')?.addEventListener('click', () => this._modalTransfer(e.id));
      el.querySelector('#btn-go-market')?.addEventListener('click', () => {
        if (CGL.MarketUI) {
          CGL.MarketUI.view = 'empresa';
          CGL.MarketUI.selectedId = e.id;
        }
        CGL.UI.navigate('mercado');
      });
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
          if (CGL.DebtUI) {
            CGL.DebtUI._modalRenegotiate(e.id, btn.dataset.reno);
            return;
          }
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
      const linkEndiv = document.createElement('p');
      linkEndiv.className = 'muted';
      linkEndiv.style.marginTop = '1rem';
      linkEndiv.innerHTML = 'Painel completo: aba <strong>Endividamento</strong> · obrigações em <strong>Agenda financeira</strong>.';
      el.appendChild(linkEndiv);
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

    _tabRemuneracao(el, e, state) {
      const fin = e.finance;
      CGL.Finance._ensureAdminsProLabore(e);
      const pol = CGL.Data.getDividendPolicyById(fin.politicaDividendos);
      const ref = CGL.Finance.referenciaProLabore(e);
      const mutuos = (fin.emprestimosSocio || []).filter((m) => m.status === 'ativo' || m.status === 'atraso');
      const canais = (CGL.Finance.canaisRetiradaPermitidos() || []).join(', ');

      el.innerHTML = `
        <p class="muted" style="margin-bottom:1rem">
          Conta <strong>PJ</strong> desta empresa ≠ conta <strong>PF</strong> do CEO.
          Canais de retirada: ${CGL.Utils.escapeHtml(canais)}.
        </p>
        <div class="dash-grid">
          ${CGL.UI.card('Pró-labore (mensal)', `
            <p class="muted">Referência de mercado: ${CGL.Utils.formatBRL(ref)}/mês · pago a cada 4 semanas</p>
            <table class="data-table">
              <thead><tr><th>Administrador</th><th>Valor/mês</th><th>Satisfação</th><th></th></tr></thead>
              <tbody>
                ${(e.administradores || []).map((a) => `
                  <tr>
                    <td>${CGL.Utils.escapeHtml(a.nome)} ${a.ehContratado ? '<em class="tag">contratado</em>' : '<em class="tag">sócio</em>'}</td>
                    <td>
                      <input type="number" class="input-inline" data-pl-id="${a.id}" min="0" step="100"
                        value="${Math.round(a.proLaboreMensal || 0)}" style="width:7rem" />
                    </td>
                    <td>${Math.round(a.satisfacao || 0)}</td>
                    <td><button type="button" class="btn btn-sm btn-secondary" data-save-pl="${a.id}">Salvar</button></td>
                  </tr>
                `).join('') || '<tr><td colspan="4" class="muted">Nenhum administrador.</td></tr>'}
              </tbody>
            </table>
            <p class="muted" style="margin-top:0.5rem">Valores altos elevam custo operacional; muito baixos insatisfazem contratados.</p>
          `)}
          ${CGL.UI.card('Dividendos', `
            <p><strong>${CGL.Utils.escapeHtml(pol.nome)}</strong></p>
            <p class="muted">Payout ${(pol.payout * 100).toFixed(0)}% · pro-rata à participação · exige lucro acumulado</p>
            <div class="stat-gold">${CGL.Utils.formatBRL(fin.lucrosAcumulados || 0, { compact: true })}</div>
            <p class="muted">Lucros acumulados</p>
            <label class="field">
              <span>Política</span>
              <select id="sel-pol">
                ${CGL.Data.dividendPolicies.map((p) => `
                  <option value="${p.id}" ${p.id === pol.id ? 'selected' : ''}>${CGL.Utils.escapeHtml(p.nome)}</option>
                `).join('')}
              </select>
            </label>
            <div class="actions-row" style="margin-top:0.5rem">
              <button type="button" class="btn btn-sm btn-secondary" id="btn-set-pol">Salvar política</button>
              <button type="button" class="btn btn-sm btn-primary" id="btn-dist">Distribuir agora</button>
            </div>
          `)}
          ${CGL.UI.card('Aporte e restituição', `
            <p class="muted">Aporte: PF → PJ (aumenta capital). Restituição: PJ → PF (quando permitido).</p>
            <label class="field"><span>Valor (R$)</span>
              <input type="number" id="inp-cap" min="500" step="500" value="5000" /></label>
            <div class="actions-row">
              <button type="button" class="btn btn-sm btn-primary" id="btn-aporte">Aportar capital</button>
              <button type="button" class="btn btn-sm btn-secondary" id="btn-rest">Restituir capital</button>
            </div>
            <p class="muted" style="margin-top:0.5rem">Capital social: ${CGL.Utils.formatBRL(e.capitalSocial)}</p>
          `)}
          ${CGL.UI.card('Reembolso de despesas', `
            <p class="muted">Despesas pagas pessoalmente e reembolsadas pela empresa (teto por receita).</p>
            <label class="field"><span>Valor (R$)</span>
              <input type="number" id="inp-reemb" min="50" step="50" value="500" /></label>
            <label class="field"><span>Descrição</span>
              <input type="text" id="inp-reemb-desc" value="Despesas operacionais" /></label>
            <button type="button" class="btn btn-sm btn-secondary" id="btn-reemb">Solicitar reembolso</button>
          `)}
        </div>

        <section class="section-block">
          <div class="row-between">
            <h2>Empréstimos sócio ↔ empresa</h2>
          </div>
          <p class="muted">Mútuos com limites e juros (obrigatórios quando a PJ empresta ao sócio).</p>
          <div class="actions-row">
            <button type="button" class="btn btn-sm btn-primary" id="btn-mutuo-pf">Sócio → empresa</button>
            <button type="button" class="btn btn-sm btn-secondary" id="btn-mutuo-pj">Empresa → sócio</button>
          </div>
          ${mutuos.length ? `
            <table class="data-table" style="margin-top:1rem">
              <thead><tr><th>Direção</th><th>Saldo</th><th>Parcela</th><th>Taxa a.a.</th><th>Status</th></tr></thead>
              <tbody>
                ${mutuos.map((m) => `
                  <tr>
                    <td>${m.direcao === 'socio_para_empresa' ? 'Sócio → PJ' : 'PJ → sócio'}</td>
                    <td>${CGL.Utils.formatBRL(m.saldo)}</td>
                    <td>${CGL.Utils.formatBRL(m.parcela)}</td>
                    <td>${((m.taxaAnual || 0) * 100).toFixed(1)}%</td>
                    <td>${m.status}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<p class="muted" style="margin-top:0.75rem">Nenhum mútuo ativo.</p>'}
        </section>
      `;

      el.querySelectorAll('[data-save-pl]').forEach((btn) => {
        btn.onclick = () => {
          const id = btn.dataset.savePl;
          const inp = el.querySelector(`[data-pl-id="${id}"]`);
          try {
            CGL.Finance.setProLabore(state, e.id, id, Number(inp?.value) || 0);
            CGL.Game.save(false);
            CGL.Events.notify('success', 'Pró-labore', 'Valor atualizado.');
            this.render(document.getElementById('main-content'));
          } catch (err) {
            CGL.Events.notify('error', 'Falha', err.message);
          }
        };
      });
      el.querySelector('#btn-set-pol').onclick = () => {
        CGL.Finance.setDividendPolicy(state, e.id, el.querySelector('#sel-pol').value);
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
      el.querySelector('#btn-aporte').onclick = () => {
        try {
          const v = Number(el.querySelector('#inp-cap').value);
          CGL.Finance.contributeCapital(state, e.id, v);
          CGL.Game.save(false);
          CGL.UI.refreshTopbar();
          CGL.Events.notify('success', 'Aporte', CGL.Utils.formatBRL(v));
          this.render(document.getElementById('main-content'));
        } catch (err) {
          CGL.Events.notify('error', 'Falha', err.message);
        }
      };
      el.querySelector('#btn-rest').onclick = () => {
        try {
          const v = Number(el.querySelector('#inp-cap').value);
          CGL.Finance.restituteCapital(state, e.id, v);
          CGL.Game.save(false);
          CGL.UI.refreshTopbar();
          CGL.Events.notify('success', 'Restituição', CGL.Utils.formatBRL(v));
          this.render(document.getElementById('main-content'));
        } catch (err) {
          CGL.Events.notify('error', 'Falha', err.message);
        }
      };
      el.querySelector('#btn-reemb').onclick = () => {
        try {
          const v = Number(el.querySelector('#inp-reemb').value);
          const d = el.querySelector('#inp-reemb-desc').value;
          CGL.Finance.reimburseExpense(state, e.id, v, d);
          CGL.Game.save(false);
          CGL.UI.refreshTopbar();
          CGL.Events.notify('success', 'Reembolso', CGL.Utils.formatBRL(v));
          this.render(document.getElementById('main-content'));
        } catch (err) {
          CGL.Events.notify('error', 'Falha', err.message);
        }
      };
      el.querySelector('#btn-mutuo-pf').onclick = () => this._modalMutuo(e.id, 'socio_para_empresa');
      el.querySelector('#btn-mutuo-pj').onclick = () => this._modalMutuo(e.id, 'empresa_para_socio');
    },

    _modalMutuo(empresaId, direcao) {
      const paraEmpresa = direcao === 'socio_para_empresa';
      CGL.UI.modal({
        title: paraEmpresa ? 'Empréstimo do sócio à empresa' : 'Empréstimo da empresa ao sócio',
        body: `
          <p class="muted">${paraEmpresa
            ? 'Seu dinheiro pessoal (PF) entra no caixa da empresa (PJ).'
            : 'Caixa PJ vai para sua conta PF — juros obrigatórios e limites de segurança.'}</p>
          <div class="form-grid">
            <label class="field"><span>Valor (R$)</span>
              <input type="number" id="m-mut-val" min="1000" step="500" value="10000" /></label>
            <label class="field"><span>Prazo (semanas)</span>
              <input type="number" id="m-mut-prazo" min="4" max="208" value="${paraEmpresa ? 52 : 26}" /></label>
            ${paraEmpresa ? `
              <label class="field"><span>Taxa a.a. (opcional)</span>
                <input type="number" id="m-mut-taxa" min="0" max="0.4" step="0.01" value="0.06" /></label>
            ` : `
              <label class="field"><span>Taxa a.a. (mín. 8%)</span>
                <input type="number" id="m-mut-taxa" min="0.08" max="0.5" step="0.01" value="0.12" /></label>
            `}
          </div>
        `,
        confirmLabel: 'Contratar',
        onConfirm: () => {
          const state = CGL.Game.getState();
          const valor = Number(document.getElementById('m-mut-val')?.value);
          const prazoSem = Number(document.getElementById('m-mut-prazo')?.value);
          const taxaAnual = Number(document.getElementById('m-mut-taxa')?.value);
          try {
            if (paraEmpresa) {
              CGL.Finance.loanShareholderToCompany(state, empresaId, valor, { prazoSem, taxaAnual });
            } else {
              CGL.Finance.loanCompanyToShareholder(state, empresaId, valor, { prazoSem, taxaAnual });
            }
            CGL.Game.save(false);
            CGL.UI.refreshTopbar();
            CGL.Events.notify('success', 'Mútuo', 'Contrato registrado.');
            this.render(document.getElementById('main-content'));
            return true;
          } catch (err) {
            CGL.Events.notify('error', 'Falha', err.message);
            return false;
          }
        }
      });
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
                <h1>Conta pessoal (PF)</h1>
                <p class="muted">Separada do caixa PJ — entradas só por canais formais (pró-labore, dividendos, etc.)</p>
              </div>
            </div>
            <button type="button" class="btn btn-sm btn-primary" id="btn-open-pf">Abrir conta</button>
          </header>
          <div class="dash-grid">
            ${CGL.UI.card('Saldo pessoal', `
              <div class="stat-gold">${CGL.Utils.formatBRL(state.player.dinheiro)}</div>
              <p class="muted">Não é caixa das suas empresas</p>
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
            const loanOpts = {
              bancoId: document.getElementById('m-bank').value,
              finalidadeId: document.getElementById('m-fin').value,
              valor: Number(document.getElementById('m-val').value),
              prazoSem: Number(document.getElementById('m-prazo').value),
              garantias: [{
                tipoId: document.getElementById('m-gar').value,
                valor: Number(document.getElementById('m-gar-v').value)
              }]
            };
            const r = CGL.Debt?.requestBankLoan
              ? CGL.Debt.requestBankLoan(state, empresaId, loanOpts)
              : CGL.Finance.requestLoan(state, empresaId, loanOpts);
            CGL.Game.save(false);
            CGL.UI.refreshTopbar();
            if (r.ok) CGL.Events.notify('success', 'Aprovado', r.motivo);
            else CGL.Events.notify('alert', 'Recusado', r.motivo);
            this.empresaTab = 'endividamento';
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
          <p class="muted">Apetite dos investidores (Fase 6) decide se a emissão encontra compradores.</p>
        `,
        confirmLabel: 'Emitir',
        onConfirm: () => {
          try {
            const debOpts = {
              valor: Number(document.getElementById('m-val').value),
              prazoSem: Number(document.getElementById('m-prazo').value),
              remuneracaoAnual: Number(document.getElementById('m-rem').value),
              tipo: document.getElementById('m-tipo').value
            };
            const d = CGL.Debt?.issueDebenture
              ? CGL.Debt.issueDebenture(CGL.Game.getState(), empresaId, debOpts)
              : CGL.Finance.issueDebentures(CGL.Game.getState(), empresaId, debOpts);
            CGL.Game.save(false);
            CGL.Events.notify('success', 'Debêntures', `Captado ${CGL.Utils.formatBRL(d.captado)}`);
            this.empresaTab = 'endividamento';
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
      CGL.Finance._ensureAdminsProLabore(empresa);
      const ind = empresa.finance.indicadores || {};
      const fal = CGL.Data.getBankruptcyStage(empresa.finance.falencia?.estagio || 0);
      const plTotal = CGL.Finance.totalProLaboreMensal(empresa);
      const mutuos = (empresa.finance.emprestimosSocio || []).filter((m) => m.status === 'ativo').length;
      return `
        <section class="section-block finance-embed">
          <div class="row-between">
            <h2>Finanças (PJ)</h2>
            <div class="actions-row">
              <button type="button" class="btn btn-sm btn-secondary" data-goto-fin-tab="${empresa.id}|remuneracao">Remuneração</button>
              <button type="button" class="btn btn-sm btn-primary" data-goto-fin="${empresa.id}">Abrir módulo</button>
            </div>
          </div>
          <div class="dash-grid">
            ${CGL.UI.card('Caixa / liquidez', `
              <ul class="kv-list">
                <li><span>Caixa PJ</span><span>${CGL.Utils.formatBRL(empresa.caixa)}</span></li>
                <li><span>Liquidez</span><span>${(ind.liquidez ?? 0).toFixed(2)}</span></li>
                <li><span>Risco</span><span>${Math.round(ind.riscoFinanceiro || 0)}</span></li>
                <li><span>Estágio</span><span>${CGL.Utils.escapeHtml(fal.nome)}</span></li>
              </ul>
            `)}
            ${CGL.UI.card('Remuneração', `
              <ul class="kv-list">
                <li><span>Pró-labore/mês</span><span>${CGL.Utils.formatBRL(plTotal)}</span></li>
                <li><span>Política dividendos</span><span>${CGL.Utils.escapeHtml(CGL.Data.getDividendPolicyById(empresa.finance.politicaDividendos).nome)}</span></li>
                <li><span>Lucros acum.</span><span>${CGL.Utils.formatBRL(empresa.finance.lucrosAcumulados || 0, { compact: true })}</span></li>
                <li><span>Mútuos ativos</span><span>${mutuos}</span></li>
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
      main.querySelectorAll('[data-goto-fin-tab]').forEach((btn) => {
        btn.onclick = () => {
          const [id, tab] = (btn.dataset.gotoFinTab || '').split('|');
          this.view = 'empresa';
          this.selectedId = id;
          this.empresaTab = tab || 'remuneracao';
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
