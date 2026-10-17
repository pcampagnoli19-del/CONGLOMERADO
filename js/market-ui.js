/**
 * CONGLOMERADO — Telas Mercado e Investimentos (Fase 5)
 * Bolsa, rating, IPO, ofertas de investidores, carteira de ações.
 */
(function (global) {
  'use strict';

  const MarketUI = {
    view: 'mercado', // mercado | investimentos | empresa
    selectedId: null,
    bolsaTab: 'cotacoes', // cotacoes | ipo | bancos | rating

    renderMercado(main) {
      this.view = 'mercado';
      this._render(main);
    },

    renderInvestimentos(main) {
      this.view = 'investimentos';
      this._render(main);
    },

    _render(main) {
      const state = CGL.Game.getState();
      if (!state?.player) return;
      CGL.Market.ensureMarket(state);
      if (this.view === 'investimentos') {
        this._renderInvestimentos(main, state);
      } else if (this.view === 'empresa' && this.selectedId) {
        this._renderEmpresaMercado(main, state, this.selectedId);
      } else {
        this._renderMercadoHub(main, state);
      }
    },

    _renderMercadoHub(main, state) {
      const sum = CGL.Market.dashboardSummary(state);
      const listadas = CGL.Market.listListed(state);
      const companies = CGL.Company.listPlayerCompanies(state);
      const ofertas = CGL.Market.listPendingOffers(state);

      main.innerHTML = `
        <div class="screen market-screen">
          <header class="screen-header row-between">
            <div>
              <h1>Mercado</h1>
              <p class="muted">Bolsa, rating, IPO e confiança do mercado de capitais.</p>
            </div>
            <div class="btn-row">
              <button type="button" class="btn btn-secondary" id="btn-go-inv">Investimentos</button>
              <button type="button" class="btn btn-ghost" id="btn-go-fin">Finanças</button>
            </div>
          </header>

          <div class="dash-grid">
            ${CGL.UI.card('Índice da bolsa', `
              <div class="stat-gold">${CGL.Utils.formatNumber(sum.indice)}</div>
              <p class="muted">${sum.listadas} empresa(s) listada(s)</p>
            `)}
            ${CGL.UI.card('Carteira (PF)', `
              <div class="stat-gold">${CGL.Utils.formatBRL(sum.carteira, { compact: true })}</div>
              <p class="muted">Ações em bolsa</p>
              <button type="button" class="btn btn-sm btn-secondary" id="btn-carteira">Ver carteira</button>
            `)}
            ${CGL.UI.card('Ofertas pendentes', `
              <div class="stat-gold">${sum.ofertasPendentes}</div>
              <p class="muted">Aportes espontâneos de investidores</p>
            `)}
            ${CGL.UI.card('Confiança média', `
              <div class="stat-gold">${sum.confiancaMedia}</div>
              <p class="muted">Percepção de analistas / bancos</p>
            `)}
          </div>

          <div class="finance-tabs" role="tablist">
            <button type="button" class="finance-tab ${this.bolsaTab === 'cotacoes' ? 'active' : ''}" data-mtab="cotacoes">Cotações</button>
            <button type="button" class="finance-tab ${this.bolsaTab === 'ipo' ? 'active' : ''}" data-mtab="ipo">IPO</button>
            <button type="button" class="finance-tab ${this.bolsaTab === 'bancos' ? 'active' : ''}" data-mtab="bancos">Bancos</button>
            <button type="button" class="finance-tab ${this.bolsaTab === 'rating' ? 'active' : ''}" data-mtab="rating">Rating</button>
          </div>

          <div id="market-tab-body"></div>

          ${ofertas.length ? `
            <section class="section-block">
              <h2>Ofertas de investidores</h2>
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Investidor</th><th>Empresa</th><th>Valor</th><th>%</th><th>Conselho</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${ofertas.map((o) => {
                      const emp = CGL.Company.getById(state, o.empresaId);
                      return `<tr>
                        <td>${CGL.Utils.escapeHtml(o.investidorNome)} <em class="tag">${CGL.Utils.escapeHtml(o.tipoNome)}</em></td>
                        <td>${CGL.Utils.escapeHtml(emp?.nomeFantasia || '?')}</td>
                        <td>${CGL.Utils.formatBRL(o.valor)}</td>
                        <td>${o.percentual}%</td>
                        <td>${o.assentoConselho ? 'sim' : 'não'}</td>
                        <td class="btn-row">
                          <button type="button" class="btn btn-sm btn-primary" data-acc="${o.id}">Aceitar</button>
                          <button type="button" class="btn btn-sm btn-secondary" data-neg="${o.id}">Negociar</button>
                          <button type="button" class="btn btn-sm btn-ghost" data-rec="${o.id}">Recusar</button>
                        </td>
                      </tr>`;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </section>
          ` : ''}
        </div>
      `;

      const body = main.querySelector('#market-tab-body');
      this._fillBolsaTab(body, state, companies, listadas);

      main.querySelector('#btn-go-inv').onclick = () => {
        this.view = 'investimentos';
        CGL.UI.navigate('investimentos');
      };
      main.querySelector('#btn-go-fin').onclick = () => CGL.UI.navigate('financas');
      main.querySelector('#btn-carteira').onclick = () => {
        this.view = 'investimentos';
        CGL.UI.navigate('investimentos');
      };
      main.querySelectorAll('[data-mtab]').forEach((btn) => {
        btn.onclick = () => {
          this.bolsaTab = btn.dataset.mtab;
          this._render(main);
        };
      });
      this._bindOffers(main, state);
    },

    _fillBolsaTab(body, state, companies, listadas) {
      if (!body) return;
      if (this.bolsaTab === 'cotacoes') {
        body.innerHTML = `
          <section class="section-block">
            <h2>Empresas listadas</h2>
            ${listadas.length ? `
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Ticker</th><th>Empresa</th><th>Preço</th><th>Market cap</th>
                      <th>P/L</th><th>Yield</th><th>Confiança</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${listadas.map((e) => `
                      <tr>
                        <td><strong>${CGL.Utils.escapeHtml(e.ipo.ticker)}</strong></td>
                        <td>${CGL.Company.logoHtml(e.logo, 'sm')} ${CGL.Utils.escapeHtml(e.nomeFantasia)}
                          ${e.concorrente ? '<em class="tag">concorrente</em>' : ''}</td>
                        <td>${CGL.Utils.formatBRL(e.ipo.preco)}</td>
                        <td>${CGL.Utils.formatBRL(e.ipo.marketCap, { compact: true })}</td>
                        <td>${e.ipo.plRatio || '—'}</td>
                        <td>${CGL.Utils.formatPercent((e.ipo.dividendYield || 0) * 100)}</td>
                        <td>${Math.round(e.confiancaMercado || 0)}</td>
                        <td>
                          <button type="button" class="btn btn-sm btn-primary" data-trade="${e.id}">Negociar</button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : '<p class="muted">Nenhuma empresa listada. Prepare um IPO ou aguarde concorrentes na bolsa.</p>'}
            ${state.market.bolsa.historico.length ? `
              <h3>Índice (histórico)</h3>
              ${CGL.UI.simpleChart(
                state.market.bolsa.historico.slice(-16).map((h) => h.indice),
                { labels: state.market.bolsa.historico.slice(-16).map((h) => 'S' + h.semana) }
              )}
            ` : ''}
          </section>
        `;
        body.querySelectorAll('[data-trade]').forEach((btn) => {
          btn.onclick = () => this._modalTrade(btn.dataset.trade);
        });
      } else if (this.bolsaTab === 'ipo') {
        body.innerHTML = `
          <section class="section-block">
            <h2>Caminho de IPO</h2>
            <p class="muted">Requisitos de porte, faturamento, governança e rating. Captura recursos e cria pressão de conselho.</p>
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr><th>Empresa</th><th>Status</th><th>Rating</th><th>Valuation</th><th>Elegível</th><th></th></tr>
                </thead>
                <tbody>
                  ${companies.map((e) => {
                    CGL.Market.ensureCompanyMarket(e, state);
                    CGL.Market.updateCreditRating(e, state);
                    const check = CGL.Market.checkIpoRequirements(e, state);
                    const val = CGL.Market.calcValuation(e, state);
                    return `<tr>
                      <td>${CGL.Utils.escapeHtml(e.nomeFantasia)}</td>
                      <td><span class="tag">${CGL.Utils.escapeHtml(e.ipo.status)}</span>
                        ${e.ipo.ticker ? ' ' + CGL.Utils.escapeHtml(e.ipo.ticker) : ''}</td>
                      <td>${e.rating.nota}</td>
                      <td>${CGL.Utils.formatBRL(val, { compact: true })}</td>
                      <td>${e.ipo.listada ? 'listada' : check.ok ? 'sim' : 'não'}</td>
                      <td>
                        <button type="button" class="btn btn-sm btn-secondary" data-mip="${e.id}">Detalhes</button>
                        ${!e.ipo.listada ? `<button type="button" class="btn btn-sm btn-primary" data-ipo="${e.id}">IPO</button>` : ''}
                      </td>
                    </tr>`;
                  }).join('') || '<tr><td colspan="6" class="muted">Nenhuma empresa do jogador.</td></tr>'}
                </tbody>
              </table>
            </div>
          </section>
        `;
        body.querySelectorAll('[data-mip]').forEach((btn) => {
          btn.onclick = () => {
            this.selectedId = btn.dataset.mip;
            this.view = 'empresa';
            this._render(document.getElementById('main-content'));
          };
        });
        body.querySelectorAll('[data-ipo]').forEach((btn) => {
          btn.onclick = () => this._modalIpo(btn.dataset.ipo);
        });
      } else if (this.bolsaTab === 'bancos') {
        body.innerHTML = `
          <section class="section-block">
            <h2>Instituições financeiras</h2>
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr><th>Banco</th><th>Perfil</th><th>Tipo</th><th>Taxa base</th><th>IPO</th><th>Setores</th></tr>
                </thead>
                <tbody>
                  ${(CGL.Data.banks || []).map((b) => `
                    <tr>
                      <td>${CGL.Utils.escapeHtml(b.nome)}</td>
                      <td><em class="tag">${CGL.Utils.escapeHtml(b.perfil || '—')}</em></td>
                      <td>${CGL.Utils.escapeHtml(b.tipo)}</td>
                      <td>${CGL.Utils.formatPercent((b.taxaBase || 0) * 100)}</td>
                      <td>${b.coordenaIPO ? 'sim' : 'não'}</td>
                      <td class="muted">${(b.setoresPreferidos || []).join(', ') || 'geral'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            <h3>Relacionamento por empresa</h3>
            ${companies.map((e) => {
              CGL.Market.ensureCompanyMarket(e, state);
              const banks = Object.keys(e.relacionamentoBancos || {});
              if (!banks.length && e.finance?.contas) {
                e.finance.contas.forEach((c) => CGL.Market.getBankRelationship(e, c.bancoId));
              }
              const rows = Object.entries(e.relacionamentoBancos || {}).map(([id, v]) => {
                const b = CGL.Data.getBankById(id);
                return `<li>${CGL.Utils.escapeHtml(b?.nome || id)}: <strong>${Math.round(v)}</strong></li>`;
              }).join('');
              return `<div class="card" style="margin-bottom:0.75rem">
                <header class="card-header"><h3>${CGL.Utils.escapeHtml(e.nomeFantasia)}</h3></header>
                <div class="card-body"><ul class="kv-list">${rows || '<li class="muted">Sem histórico bancário</li>'}</ul></div>
              </div>`;
            }).join('') || '<p class="muted">Sem empresas.</p>'}
          </section>
        `;
      } else {
        // rating
        body.innerHTML = `
          <section class="section-block">
            <h2>Rating de crédito</h2>
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr><th>Empresa</th><th>Nota</th><th>Score</th><th>WACC</th><th>Dívida/PL</th><th>Confiança</th></tr>
                </thead>
                <tbody>
                  ${companies.map((e) => {
                    CGL.Market.ensureCompanyMarket(e, state);
                    CGL.Market.updateCreditRating(e, state);
                    CGL.Market.calcCapitalStructure(e, state);
                    const ec = e.estruturaCapital;
                    return `<tr>
                      <td>${CGL.Utils.escapeHtml(e.nomeFantasia)}</td>
                      <td><strong>${e.rating.nota}</strong></td>
                      <td>${e.rating.score}</td>
                      <td>${CGL.Utils.formatPercent((ec.wacc || 0) * 100)}</td>
                      <td>${CGL.Utils.formatPercent((ec.debtRatio || 0) * 100)}</td>
                      <td>${Math.round(e.confiancaMercado || 0)}</td>
                    </tr>`;
                  }).join('') || '<tr><td colspan="6" class="muted">—</td></tr>'}
                </tbody>
              </table>
            </div>
          </section>
        `;
      }
    },

    _renderInvestimentos(main, state) {
      const m = state.market;
      const carteira = m.carteiraJogador || [];
      const valor = CGL.Market.portfolioValue(state);
      const listadas = CGL.Market.listListed(state);

      main.innerHTML = `
        <div class="screen market-screen">
          <header class="screen-header row-between">
            <div>
              <h1>Investimentos</h1>
              <p class="muted">Carteira de ações (próprias e concorrentes) · PF separado do caixa PJ.</p>
            </div>
            <div class="btn-row">
              <button type="button" class="btn btn-secondary" id="btn-go-merc">Mercado</button>
              <button type="button" class="btn btn-ghost" id="btn-go-emp">Empresas</button>
            </div>
          </header>

          <div class="dash-grid">
            ${CGL.UI.card('Valor da carteira', `
              <div class="stat-gold">${CGL.Utils.formatBRL(valor)}</div>
              <p class="muted">${carteira.length} posição(ões)</p>
            `)}
            ${CGL.UI.card('Caixa pessoal', `
              <div class="stat-gold">${CGL.Utils.formatBRL(state.player.dinheiro, { compact: true })}</div>
              <p class="muted">Usado para comprar ações</p>
            `)}
          </div>

          <section class="section-block">
            <h2>Minha carteira</h2>
            ${carteira.length ? `
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr><th>Ticker</th><th>Ações</th><th>Custo médio</th><th>Preço</th><th>Valor</th><th>P&L</th><th></th></tr>
                  </thead>
                  <tbody>
                    ${carteira.map((p) => {
                      const e = CGL.Company.getById(state, p.empresaId);
                      const preco = e?.ipo?.preco || 0;
                      const mtm = p.acoes * preco;
                      const pnl = mtm - p.acoes * p.custoMedio;
                      return `<tr>
                        <td><strong>${CGL.Utils.escapeHtml(p.ticker || e?.ipo?.ticker || '?')}</strong></td>
                        <td>${CGL.Utils.formatNumber(p.acoes)}</td>
                        <td>${CGL.Utils.formatBRL(p.custoMedio)}</td>
                        <td>${CGL.Utils.formatBRL(preco)}</td>
                        <td>${CGL.Utils.formatBRL(mtm)}</td>
                        <td class="${pnl >= 0 ? 'pos' : 'neg'}">${CGL.Utils.formatBRL(pnl)}</td>
                        <td>
                          <button type="button" class="btn btn-sm btn-primary" data-trade="${p.empresaId}">Negociar</button>
                        </td>
                      </tr>`;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            ` : '<p class="muted">Carteira vazia. Compre ações na aba Mercado.</p>'}
          </section>

          <section class="section-block">
            <h2>Negociar</h2>
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Ticker</th><th>Preço</th><th>Liquidez</th><th></th></tr></thead>
                <tbody>
                  ${listadas.map((e) => `
                    <tr>
                      <td>${CGL.Utils.escapeHtml(e.ipo.ticker)} — ${CGL.Utils.escapeHtml(e.nomeFantasia)}</td>
                      <td>${CGL.Utils.formatBRL(e.ipo.preco)}</td>
                      <td>${Math.round(e.ipo.liquidez || 0)}</td>
                      <td><button type="button" class="btn btn-sm btn-accent" data-trade="${e.id}">Comprar / vender</button></td>
                    </tr>
                  `).join('') || '<tr><td colspan="4" class="muted">Sem listadas.</td></tr>'}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      `;

      main.querySelector('#btn-go-merc').onclick = () => CGL.UI.navigate('mercado');
      main.querySelector('#btn-go-emp').onclick = () => CGL.UI.navigate('empresas');
      main.querySelectorAll('[data-trade]').forEach((btn) => {
        btn.onclick = () => this._modalTrade(btn.dataset.trade);
      });
    },

    _renderEmpresaMercado(main, state, empresaId) {
      const e = CGL.Company.getById(state, empresaId);
      if (!e) {
        this.view = 'mercado';
        this._render(main);
        return;
      }
      CGL.Market.ensureCompanyMarket(e, state);
      CGL.Market.updateCreditRating(e, state);
      CGL.Market.calcCapitalStructure(e, state);
      CGL.Market.updateMarketConfidence(e, state);
      const check = CGL.Market.checkIpoRequirements(e, state);
      const val = CGL.Market.calcValuation(e, state);
      const ec = e.estruturaCapital;
      const res = e.reservasEstrategicas;

      main.innerHTML = `
        <div class="screen market-screen">
          <header class="screen-header row-between">
            <div>
              <button type="button" class="btn btn-sm btn-ghost" id="btn-back">← Mercado</button>
              <h1>${CGL.Company.logoHtml(e.logo, 'sm')} ${CGL.Utils.escapeHtml(e.nomeFantasia)}</h1>
              <p class="muted">Mercado de capitais · rating ${e.rating.nota} · confiança ${Math.round(e.confiancaMercado)}</p>
            </div>
            <div class="btn-row">
              <button type="button" class="btn btn-secondary" id="btn-fin">Finanças</button>
              <button type="button" class="btn btn-ghost" id="btn-emp">Ficha</button>
            </div>
          </header>

          <div class="dash-grid">
            ${CGL.UI.card('Valuation', `<div class="stat-gold">${CGL.Utils.formatBRL(val)}</div>`)}
            ${CGL.UI.card('Estrutura de capital', `
              <ul class="kv-list">
                <li><span>Equity</span><span>${CGL.Utils.formatBRL(ec.equity, { compact: true })}</span></li>
                <li><span>Dívida</span><span>${CGL.Utils.formatBRL(ec.debt, { compact: true })}</span></li>
                <li><span>WACC</span><span>${CGL.Utils.formatPercent(ec.wacc * 100)}</span></li>
                <li><span>Ke / Kd</span><span>${CGL.Utils.formatPercent(ec.custoEquity * 100)} / ${CGL.Utils.formatPercent(ec.custoDebt * 100)}</span></li>
              </ul>
            `)}
            ${CGL.UI.card('IPO', `
              <p>Status: <strong>${CGL.Utils.escapeHtml(e.ipo.status)}</strong>
                ${e.ipo.ticker ? ' · ' + CGL.Utils.escapeHtml(e.ipo.ticker) : ''}</p>
              ${e.ipo.listada ? `
                <ul class="kv-list">
                  <li><span>Preço</span><span>${CGL.Utils.formatBRL(e.ipo.preco)}</span></li>
                  <li><span>Market cap</span><span>${CGL.Utils.formatBRL(e.ipo.marketCap, { compact: true })}</span></li>
                  <li><span>Pressão conselho</span><span>${Math.round(e.boardPressure?.nivel || 0)}</span></li>
                </ul>
              ` : `<p class="muted">${check.ok ? 'Elegível para IPO' : 'Requisitos pendentes'}</p>
                <button type="button" class="btn btn-sm btn-primary" id="btn-ipo">Preparar / executar IPO</button>`}
            `)}
            ${CGL.UI.card('Reservas de caixa', `
              <p>Modo: <strong>${CGL.Utils.escapeHtml(res.modo)}</strong></p>
              <p class="muted">Alvo ≈ ${CGL.Utils.formatBRL(res.alvoCaixa, { compact: true })}</p>
              <div class="btn-row">
                <button type="button" class="btn btn-sm btn-ghost" data-res="conservador">Conservador</button>
                <button type="button" class="btn btn-sm btn-ghost" data-res="normal">Normal</button>
                <button type="button" class="btn btn-sm btn-ghost" data-res="agressivo">Agressivo</button>
              </div>
              <p class="muted" style="margin-top:0.5rem">Tradeoff: rentabilidade ${res.tradeoffRentabilidade} · risco ${res.tradeoffRisco}</p>
            `)}
          </div>

          <section class="section-block">
            <h2>Requisitos de IPO</h2>
            <ul class="timeline">
              ${check.requisitos.map((r) => `
                <li class="${r.ok ? 'pos' : 'neg'}">
                  <strong>${r.ok ? '✓' : '✗'}</strong> ${CGL.Utils.escapeHtml(r.label)}
                </li>
              `).join('')}
            </ul>
          </section>

          ${e.ipo.listada && e.ipo.historicoPrecos?.length ? `
            <section class="section-block">
              <h2>Histórico de preços</h2>
              ${CGL.UI.simpleChart(
                e.ipo.historicoPrecos.slice(-20).map((h) => h.preco),
                { labels: e.ipo.historicoPrecos.slice(-20).map((h) => 'S' + h.semana) }
              )}
            </section>
          ` : ''}
        </div>
      `;

      main.querySelector('#btn-back').onclick = () => {
        this.view = 'mercado';
        this.selectedId = null;
        this._render(main);
      };
      main.querySelector('#btn-fin').onclick = () => {
        if (CGL.FinanceUI) {
          CGL.FinanceUI.view = 'empresa';
          CGL.FinanceUI.selectedId = empresaId;
        }
        CGL.UI.navigate('financas');
      };
      main.querySelector('#btn-emp').onclick = () => {
        if (CGL.CompanyUI) {
          CGL.CompanyUI.view = 'ficha';
          CGL.CompanyUI.selectedId = empresaId;
        }
        CGL.UI.navigate('empresas');
      };
      const ipoBtn = main.querySelector('#btn-ipo');
      if (ipoBtn) ipoBtn.onclick = () => this._modalIpo(empresaId);
      main.querySelectorAll('[data-res]').forEach((btn) => {
        btn.onclick = () => {
          try {
            CGL.Market.setCashReserveMode(state, empresaId, btn.dataset.res);
            CGL.Game.save(false);
            this._render(main);
          } catch (err) {
            CGL.Events.notify('error', 'Reservas', err.message);
          }
        };
      });
    },

    _bindOffers(main, state) {
      main.querySelectorAll('[data-acc]').forEach((btn) => {
        btn.onclick = () => {
          try {
            CGL.Market.respondToOffer(state, btn.dataset.acc, 'aceitar');
            CGL.Game.save(false);
            this._render(main);
          } catch (err) {
            CGL.Events.notify('error', 'Oferta', err.message);
          }
        };
      });
      main.querySelectorAll('[data-rec]').forEach((btn) => {
        btn.onclick = () => {
          try {
            CGL.Market.respondToOffer(state, btn.dataset.rec, 'recusar');
            CGL.Game.save(false);
            this._render(main);
          } catch (err) {
            CGL.Events.notify('error', 'Oferta', err.message);
          }
        };
      });
      main.querySelectorAll('[data-neg]').forEach((btn) => {
        btn.onclick = () => this._modalNegotiate(btn.dataset.neg);
      });
    },

    _modalNegotiate(ofertaId) {
      const state = CGL.Game.getState();
      const o = state.market.ofertasPendentes.find((x) => x.id === ofertaId);
      if (!o) return;
      CGL.UI.modal({
        title: 'Negociar aporte',
        wide: true,
        confirmLabel: 'Enviar proposta',
        body: `
          <p class="muted">${CGL.Utils.escapeHtml(o.investidorNome)} — oferta base ${CGL.Utils.formatBRL(o.valor)} por ${o.percentual}%.</p>
          <label class="field"><span>Valor (R$)</span>
            <input type="number" id="n-val" value="${o.valor}" min="1000" step="1000" /></label>
          <label class="field"><span>Percentual (%)</span>
            <input type="number" id="n-pct" value="${o.percentual}" min="1" max="49" step="0.5" /></label>
          <label class="field row-check"><input type="checkbox" id="n-cons" ${o.assentoConselho ? 'checked' : ''}/>
            <span>Assento no conselho</span></label>
          <label class="field row-check"><input type="checkbox" id="n-div" ${o.preferenciaDividendos ? 'checked' : ''}/>
            <span>Preferência em dividendos</span></label>
        `,
        onConfirm: () => {
          try {
            CGL.Market.respondToOffer(state, ofertaId, 'negociar', {
              valor: Number(document.getElementById('n-val').value),
              percentual: Number(document.getElementById('n-pct').value),
              assentoConselho: document.getElementById('n-cons').checked,
              preferenciaDividendos: document.getElementById('n-div').checked
            });
            CGL.Game.save(false);
            CGL.UI.refreshCurrentScreen();
            return true;
          } catch (err) {
            CGL.Events.notify('error', 'Negociação', err.message);
            return false;
          }
        }
      });
    },

    _modalIpo(empresaId) {
      const state = CGL.Game.getState();
      const e = CGL.Company.getById(state, empresaId);
      if (!e) return;
      CGL.Market.ensureCompanyMarket(e, state);
      const check = CGL.Market.checkIpoRequirements(e, state);
      const val = CGL.Market.calcValuation(e, state);
      const banks = (CGL.Data.banks || []).filter((b) => b.coordenaIPO);

      const wrap = CGL.UI.modal({
        title: 'IPO — ' + e.nomeFantasia,
        wide: true,
        confirmLabel: 'Executar oferta',
        cancelLabel: 'Fechar',
        body: `
          <ul class="timeline">
            ${check.requisitos.map((r) => `
              <li>${r.ok ? '✓' : '✗'} ${CGL.Utils.escapeHtml(r.label)}</li>
            `).join('')}
          </ul>
          <label class="field"><span>Percentual ofertado (10–40%)</span>
            <input type="number" id="ipo-pct" value="20" min="10" max="40" step="1" /></label>
          <label class="field"><span>Valuation de referência</span>
            <input type="number" id="ipo-val" value="${val}" min="1000" step="1000" /></label>
          <label class="field"><span>Banco coordenador</span>
            <select id="ipo-bank">
              ${banks.map((b) => `<option value="${b.id}">${CGL.Utils.escapeHtml(b.nome)}</option>`).join('')}
            </select>
          </label>
          <p class="muted">Use «Preparar» para só registrar, ou confirme para executar a oferta pública.</p>
          <button type="button" class="btn btn-secondary" id="ipo-prep">Preparar IPO</button>
          ${!check.ok ? '<p class="muted">Requisitos incompletos — a execução falhará até cumpri-los.</p>' : ''}
        `,
        onConfirm: () => {
          try {
            const r = CGL.Market.executeIpo(state, empresaId, {
              percentual: Number(document.getElementById('ipo-pct').value),
              valuation: Number(document.getElementById('ipo-val').value),
              bancoCoordenadorId: document.getElementById('ipo-bank').value
            });
            CGL.Game.save(false);
            if (r.ok) {
              CGL.Events.notify('success', 'IPO', `${r.ticker} @ ${CGL.Utils.formatBRL(r.preco)}`);
            }
            CGL.UI.refreshCurrentScreen();
            return true;
          } catch (err) {
            CGL.Events.notify('error', 'IPO', err.message);
            return false;
          }
        }
      });
      wrap.querySelector('#ipo-prep')?.addEventListener('click', () => {
        try {
          CGL.Market.prepareIpo(state, empresaId, {
            percentual: Number(document.getElementById('ipo-pct').value),
            valuation: Number(document.getElementById('ipo-val').value),
            bancoCoordenadorId: document.getElementById('ipo-bank').value
          });
          CGL.Game.save(false);
          CGL.Events.notify('info', 'IPO', 'Preparação iniciada.');
          CGL.UI.closeModal();
          CGL.UI.refreshCurrentScreen();
        } catch (err) {
          CGL.Events.notify('error', 'IPO', err.message);
        }
      });
    },

    _modalTrade(empresaId) {
      const state = CGL.Game.getState();
      const e = CGL.Company.getById(state, empresaId);
      if (!e?.ipo?.listada) return;
      const pos = CGL.Market.getPlayerPosition(state, empresaId);

      const wrap = CGL.UI.modal({
        title: `Negociar ${e.ipo.ticker}`,
        wide: true,
        confirmLabel: 'Comprar',
        cancelLabel: 'Fechar',
        body: `
          <p>${CGL.Utils.escapeHtml(e.nomeFantasia)} · preço ${CGL.Utils.formatBRL(e.ipo.preco)} ·
            pos. ${pos ? CGL.Utils.formatNumber(pos.acoes) : 0} ações</p>
          <label class="field"><span>Quantidade</span>
            <input type="number" id="t-qtd" value="1000" min="1" step="100" /></label>
          <button type="button" class="btn btn-secondary" id="t-sell">Vender</button>
        `,
        onConfirm: () => {
          try {
            CGL.Market.buyShares(state, empresaId, Number(document.getElementById('t-qtd').value));
            CGL.Game.save(false);
            CGL.UI.refreshCurrentScreen();
            return true;
          } catch (err) {
            CGL.Events.notify('error', 'Compra', err.message);
            return false;
          }
        }
      });
      wrap.querySelector('#t-sell')?.addEventListener('click', () => {
        try {
          CGL.Market.sellShares(state, empresaId, Number(document.getElementById('t-qtd').value));
          CGL.Game.save(false);
          CGL.UI.closeModal();
          CGL.UI.refreshCurrentScreen();
        } catch (err) {
          CGL.Events.notify('error', 'Venda', err.message);
        }
      });
    },

    /** Card no Dashboard */
    dashboardCardsHtml(state) {
      if (!CGL.Market) return '';
      CGL.Market.ensureMarket(state);
      const sum = CGL.Market.dashboardSummary(state);
      return CGL.UI.card('Mercado de capitais', `
        <ul class="kv-list">
          <li><span>Índice</span><span>${CGL.Utils.formatNumber(sum.indice)}</span></li>
          <li><span>Listadas</span><span>${sum.listadas}</span></li>
          <li><span>Carteira</span><span>${CGL.Utils.formatBRL(sum.carteira, { compact: true })}</span></li>
          <li><span>Ofertas</span><span>${sum.ofertasPendentes}</span></li>
        </ul>
        <button type="button" class="btn btn-sm btn-secondary" data-go="mercado">Abrir Mercado</button>
      `);
    },

    /** Bloco na ficha da empresa */
    companyBlockHtml(empresa, state) {
      CGL.Market.ensureCompanyMarket(empresa, state);
      CGL.Market.updateCreditRating(empresa, state);
      const val = CGL.Market.calcValuation(empresa, state);
      return `
        <section class="section-block">
          <h2>Mercado de capitais</h2>
          <ul class="kv-list">
            <li><span>Rating</span><span>${empresa.rating.nota} (${empresa.rating.score})</span></li>
            <li><span>Valuation</span><span>${CGL.Utils.formatBRL(val, { compact: true })}</span></li>
            <li><span>Confiança</span><span>${Math.round(empresa.confiancaMercado || 0)}</span></li>
            <li><span>IPO</span><span>${empresa.ipo.listada ? empresa.ipo.ticker + ' @ ' + CGL.Utils.formatBRL(empresa.ipo.preco) : empresa.ipo.status}</span></li>
          </ul>
          <div class="btn-row">
            <button type="button" class="btn btn-sm btn-secondary" data-go-market="${empresa.id}">Abrir no Mercado</button>
            <button type="button" class="btn btn-sm btn-ghost" data-go="financas">Finanças</button>
          </div>
        </section>
      `;
    }
  };

  global.CGL = global.CGL || {};
  global.CGL.MarketUI = MarketUI;
})(typeof window !== 'undefined' ? window : globalThis);
