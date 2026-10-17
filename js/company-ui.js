/**
 * CONGLOMERADO — UI de empresas e holdings (Fase 2)
 * Telas, wizard de constituição e ações societárias.
 */
(function (global) {
  'use strict';

  const CompanyUI = {
    view: 'lista', // lista | detalhe | holdings
    selectedId: null,
    wizard: null,

    resetWizard() {
      const player = CGL.Game.getState()?.player;
      const home = player?.cidadeMoradiaId || CGL.Data.cities[0]?.id;
      this.wizard = {
        step: 0,
        nome: '',
        nomeFantasia: '',
        razaoSocial: '',
        corMarca: '#2ecc71',
        cidadeId: home,
        segmentoId: 'servicos',
        naturezaId: 'ltda',
        porte: 'micro',
        capitalSocial: 25000,
        sociosExtra: 0,
        socioPctJogador: 100,
        adminExtra: ''
      };
    },

    renderEmpresas(main) {
      if (this.view === 'detalhe' && this.selectedId) {
        this.renderDetail(main, this.selectedId);
        return;
      }
      if (this.view === 'holdings') {
        this.renderHoldings(main);
        return;
      }
      this.renderList(main);
    },

    renderList(main) {
      const state = CGL.Game.getState();
      const companies = CGL.Company.listPlayerCompanies(state);
      const competitors = CGL.Company.listCompetitors(state).slice(0, 8);

      main.innerHTML = `
        <div class="screen empresas-screen">
          <header class="screen-header row-between">
            <div>
              <h1>Empresas</h1>
              <p class="muted">Constituição, filiais, holdings e mercado.</p>
            </div>
            <div class="toolbar-actions">
              <button type="button" class="btn btn-secondary" id="btn-holdings-view">Holdings</button>
              <button type="button" class="btn btn-primary" id="btn-new-company">Abrir empresa</button>
            </div>
          </header>

          <div class="dash-grid">
            ${companies.length ? companies.map((e) => this._companyCard(e, state)).join('') : `
              ${CGL.UI.card('Nenhuma empresa', `
                <p>Você ainda não constitui nenhuma empresa.</p>
                <p class="muted">Use o capital pessoal para abrir sua primeira operação.</p>
                <button type="button" class="btn btn-accent" id="btn-new-company-empty">Constituição</button>
              `)}
            `}
          </div>

          ${competitors.length ? `
            <section class="section-block">
              <h2>Concorrentes no radar</h2>
              <div class="table-wrap">
                <table class="data-table">
                  <thead><tr>
                    <th>Empresa</th><th>Segmento</th><th>UF</th><th>Valor est.</th><th>Share</th><th></th>
                  </tr></thead>
                  <tbody>
                    ${competitors.map((c) => {
                      const seg = CGL.Data.getSegmentById(c.segmentoId);
                      return `<tr>
                        <td>${CGL.Company.logoHtml(c.logo, 'sm')} ${CGL.Utils.escapeHtml(c.nomeFantasia)}</td>
                        <td>${CGL.Utils.escapeHtml(seg?.nome || '—')}</td>
                        <td>${c.estadoSede}</td>
                        <td>${CGL.Utils.formatBRL(CGL.Company.calcValuation(c, state), { compact: true })}</td>
                        <td>${CGL.Utils.formatPercent(c.participacaoMercado)}</td>
                        <td><button type="button" class="btn btn-sm btn-secondary" data-buy="${c.id}">Comprar</button></td>
                      </tr>`;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </section>
          ` : ''}
        </div>
      `;

      main.querySelector('#btn-new-company')?.addEventListener('click', () => this.openCreationWizard());
      main.querySelector('#btn-new-company-empty')?.addEventListener('click', () => this.openCreationWizard());
      main.querySelector('#btn-holdings-view')?.addEventListener('click', () => {
        this.view = 'holdings';
        this.renderEmpresas(main);
      });
      main.querySelectorAll('[data-open]').forEach((btn) => {
        btn.onclick = () => {
          this.selectedId = btn.dataset.open;
          this.view = 'detalhe';
          this.renderEmpresas(main);
        };
      });
      main.querySelectorAll('[data-buy]').forEach((btn) => {
        btn.onclick = () => {
          const id = btn.dataset.buy;
          const c = CGL.Company.getById(state, id);
          const preco = Math.round(CGL.Company.calcValuation(c, state) * 1.08);
          CGL.UI.confirm(
            'Comprar empresa?',
            `Adquirir ${c.nomeFantasia} por ${CGL.Utils.formatBRL(preco)}?`,
            () => {
              try {
                CGL.Company.buyCompany(state, id, { preco });
                CGL.Game.save(false);
                CGL.Events.notify('success', 'Aquisição', `${c.nomeFantasia} agora é sua.`);
                CGL.UI.refreshTopbar();
                this.renderEmpresas(main);
              } catch (err) {
                CGL.Events.notify('error', 'Falha', err.message || String(err));
              }
            }
          );
        };
      });
    },

    _companyCard(e, state) {
      const seg = CGL.Data.getSegmentById(e.segmentoId);
      const porte = CGL.Data.getSizeTierById(e.porte);
      const val = CGL.Company.calcValuation(e, state);
      const stake = CGL.Company.playerStake(e, state.player.id);
      return CGL.UI.card(
        `${CGL.Company.logoHtml(e.logo, 'sm')} ${CGL.Utils.escapeHtml(e.nomeFantasia)}`,
        `
          <ul class="kv-list">
            <li><span>Segmento</span><span>${CGL.Utils.escapeHtml(seg?.nome || '—')}</span></li>
            <li><span>Porte</span><span>${CGL.Utils.escapeHtml(porte?.nome || e.porte)}</span></li>
            <li><span>Sede</span><span>${e.estadoSede}</span></li>
            <li><span>Sua participação</span><span>${CGL.Utils.formatPercent(stake)}</span></li>
            <li><span>Valor est.</span><span class="stat-gold">${CGL.Utils.formatBRL(val, { compact: true })}</span></li>
            <li><span>Caixa</span><span>${CGL.Utils.formatBRL(e.caixa, { compact: true })}</span></li>
            <li><span>Lucro/sem</span><span class="${e.lucro >= 0 ? 'pos' : 'neg'}">${CGL.Utils.formatBRL(e.lucro, { compact: true })}</span></li>
          </ul>
          ${CGL.UI.progressBar('Reputação', e.reputacao?.geral ?? 50)}
          <button type="button" class="btn btn-sm btn-secondary" data-open="${e.id}">Abrir ficha</button>
        `,
        { className: e.isHolding ? 'card-holding' : '' }
      );
    },

    renderHoldings(main) {
      const state = CGL.Game.getState();
      const holdings = CGL.Company.listHoldings(state);
      main.innerHTML = `
        <div class="screen">
          <header class="screen-header row-between">
            <div>
              <h1>Holdings</h1>
              <p class="muted">Controle, coligadas, minoritárias e integrais.</p>
            </div>
            <div class="toolbar-actions">
              <button type="button" class="btn btn-ghost" id="btn-back-emp">← Empresas</button>
              <button type="button" class="btn btn-primary" id="btn-new-holding">Nova holding</button>
            </div>
          </header>
          ${holdings.length ? holdings.map((h) => {
            const parts = (h.participacoesDetidas || []).map((p) => {
              const sub = CGL.Company.getById(state, p.empresaId);
              return `<li><strong>${CGL.Utils.escapeHtml(sub?.nomeFantasia || '?')}</strong> — ${CGL.Utils.formatPercent(p.percentual)} (${p.tipo})</li>`;
            }).join('') || '<li class="muted">Sem participações ainda.</li>';
            return CGL.UI.card(
              `${CGL.Company.logoHtml(h.logo, 'sm')} ${CGL.Utils.escapeHtml(h.nomeFantasia)}`,
              `
                <p class="muted">${h.holdingTipo === 'patrimonial' ? 'Patrimonial' : 'Operacional'} · ${h.cnpj}</p>
                <ul>${parts}</ul>
                <div class="toolbar-actions">
                  <button type="button" class="btn btn-sm btn-secondary" data-open="${h.id}">Ficha</button>
                  <button type="button" class="btn btn-sm btn-primary" data-acquire="${h.id}">Adquirir participação</button>
                </div>
              `
            );
          }).join('') : CGL.UI.card('Sem holdings', `
            <p>Constitua uma holding patrimonial ou operacional para montar o grupo.</p>
          `)}
        </div>
      `;
      main.querySelector('#btn-back-emp').onclick = () => {
        this.view = 'lista';
        this.renderEmpresas(main);
      };
      main.querySelector('#btn-new-holding').onclick = () => {
        this.openCreationWizard({ holding: true });
      };
      main.querySelectorAll('[data-open]').forEach((btn) => {
        btn.onclick = () => {
          this.selectedId = btn.dataset.open;
          this.view = 'detalhe';
          this.renderEmpresas(main);
        };
      });
      main.querySelectorAll('[data-acquire]').forEach((btn) => {
        btn.onclick = () => this.openAcquireModal(btn.dataset.acquire);
      });
    },

    renderDetail(main, id) {
      const state = CGL.Game.getState();
      const e = CGL.Company.getById(state, id);
      if (!e) {
        this.view = 'lista';
        this.renderList(main);
        return;
      }
      const city = CGL.Data.getCityById(e.cidadeSedeId);
      const seg = CGL.Data.getSegmentById(e.segmentoId);
      const nat = CGL.Data.getLegalNatureById(e.naturezaId);
      const porte = CGL.Data.getSizeTierById(e.porte);
      const st = CGL.Data.getStateByUf(e.estadoSede);
      const val = CGL.Company.calcValuation(e, state);
      const stake = CGL.Company.playerStake(e, state.player.id);

      main.innerHTML = `
        <div class="screen company-detail">
          <header class="screen-header row-between">
            <div class="detail-title">
              <button type="button" class="btn btn-ghost" id="btn-back">← Voltar</button>
              ${CGL.Company.logoHtml(e.logo, 'lg')}
              <div>
                <h1>${CGL.Utils.escapeHtml(e.nomeFantasia)}</h1>
                <p class="muted">${CGL.Utils.escapeHtml(e.razaoSocial)} · ${e.cnpj}</p>
              </div>
            </div>
          </header>

          <div class="dash-grid">
            ${CGL.UI.card('Identidade', `
              <ul class="kv-list">
                <li><span>Nome</span><span>${CGL.Utils.escapeHtml(e.nome)}</span></li>
                <li><span>Natureza</span><span>${CGL.Utils.escapeHtml(nat?.nome || '—')}</span></li>
                <li><span>Segmento</span><span>${CGL.Utils.escapeHtml(seg?.nome || '—')}</span></li>
                <li><span>Porte</span><span>${CGL.Utils.escapeHtml(porte?.nome || e.porte)}</span></li>
                <li><span>Sede</span><span>${city ? `${city.nome}/${city.estado}` : e.estadoSede}</span></li>
                <li><span>Fundação</span><span>Semana ${e.semanaFundacao}</span></li>
                <li><span>Sua participação</span><span>${CGL.Utils.formatPercent(stake)}</span></li>
              </ul>
            `)}
            ${CGL.UI.card('Financeiro', `
              <ul class="kv-list">
                <li><span>Valor estimado</span><span class="stat-gold">${CGL.Utils.formatBRL(val)}</span></li>
                <li><span>Capital social</span><span>${CGL.Utils.formatBRL(e.capitalSocial)}</span></li>
                <li><span>Caixa</span><span>${CGL.Utils.formatBRL(e.caixa)}</span></li>
                <li><span>Patrimônio líquido</span><span>${CGL.Utils.formatBRL(e.patrimonioLiquido)}</span></li>
                <li><span>Receita/sem</span><span>${CGL.Utils.formatBRL(e.receita)}</span></li>
                <li><span>Custos/sem</span><span>${CGL.Utils.formatBRL(e.custos)}</span></li>
                <li><span>Lucro/sem</span><span class="${e.lucro >= 0 ? 'pos' : 'neg'}">${CGL.Utils.formatBRL(e.lucro)}</span></li>
                <li><span>Endividamento</span><span>${CGL.Utils.formatBRL(e.endividamento)}</span></li>
              </ul>
            `)}
            ${CGL.UI.card('Operação', `
              <ul class="kv-list">
                <li><span>Funcionários</span><span>${e.funcionarios}</span></li>
                <li><span>Market share</span><span>${CGL.Utils.formatPercent(e.participacaoMercado)}</span></li>
                <li><span>Filiais</span><span>${(e.filiais || []).length}</span></li>
              </ul>
              ${CGL.UI.progressBar('Eficiência', e.eficiencia)}
              ${CGL.UI.progressBar('Tecnologia', e.nivelTech)}
              ${CGL.UI.progressBar('Cultura', e.cultura)}
              ${CGL.UI.progressBar('Reputação', e.reputacao?.geral ?? 50)}
            `)}
            ${CGL.UI.card('Reputação detalhada', `
              ${CGL.UI.progressBar('Qualidade', e.reputacao?.qualidade)}
              ${CGL.UI.progressBar('Atendimento', e.reputacao?.atendimento)}
              ${CGL.UI.progressBar('Salários', e.reputacao?.salarios)}
              ${CGL.UI.progressBar('Sustentabilidade', e.reputacao?.sustentabilidade)}
              ${CGL.UI.progressBar('Contratos', e.reputacao?.contratos)}
              ${CGL.UI.progressBar('Inovação', e.reputacao?.inovacao)}
              ${CGL.UI.progressBar('Social', e.reputacao?.social)}
            `)}
            ${st ? CGL.UI.card(`Estado ${st.uf}`, `
              <ul class="kv-list">
                <li><span>Demanda</span><span>${st.demanda}</span></li>
                <li><span>Tributação</span><span>${st.tributacao}</span></li>
                <li><span>Mão de obra</span><span>${st.maoDeObra}</span></li>
                <li><span>Incentivos</span><span>${st.incentivosFiscais}</span></li>
                <li><span>Custo logístico</span><span>${st.custoLogistico}</span></li>
              </ul>
            `) : ''}
          </div>

          ${CGL.FinanceUI ? CGL.FinanceUI.detailFinanceTabsHtml(e, state) : ''}

          <section class="section-block">
            <h2>Quadro societário</h2>
            <table class="data-table">
              <thead><tr><th>Sócio</th><th>%</th><th>Voto</th><th>Satisfação</th></tr></thead>
              <tbody>
                ${(e.socios || []).map((s) => `
                  <tr>
                    <td>${CGL.Utils.escapeHtml(s.nome)} ${s.tipo === 'jogador' ? '<em class="tag">você</em>' : ''}</td>
                    <td>${CGL.Utils.formatPercent(s.percentual)}</td>
                    <td>${CGL.Utils.formatPercent(s.poderVoto)}</td>
                    <td>${Math.round(s.satisfacao || 0)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </section>

          <section class="section-block">
            <h2>Administradores</h2>
            <ul>${(e.administradores || []).map((a) => `
              <li><strong>${CGL.Utils.escapeHtml(a.nome)}</strong> — ${CGL.Utils.escapeHtml(a.cargo)}</li>
            `).join('')}</ul>
          </section>

          <section class="section-block">
            <div class="row-between">
              <h2>Filiais</h2>
              ${stake >= 50 ? `<button type="button" class="btn btn-sm btn-primary" id="btn-branch">Abrir filial</button>` : ''}
            </div>
            ${(e.filiais || []).length ? `
              <table class="data-table">
                <thead><tr><th>Cidade</th><th>UF</th><th>m²</th><th>Func.</th><th>Receita</th><th>Rentab.</th></tr></thead>
                <tbody>
                  ${e.filiais.map((f) => {
                    const fc = CGL.Data.getCityById(f.cidadeId);
                    return `<tr>
                      <td>${CGL.Utils.escapeHtml(fc?.nome || '?')}</td>
                      <td>${f.estado}</td>
                      <td>${f.areaM2}</td>
                      <td>${f.funcionarios}</td>
                      <td>${CGL.Utils.formatBRL(f.receita, { compact: true })}</td>
                      <td>${CGL.Utils.formatPercent((f.rentabilidade || 0) * 100)}</td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            ` : '<p class="muted">Nenhuma filial.</p>'}
          </section>

          ${e.isHolding ? `
            <section class="section-block">
              <div class="row-between">
                <h2>Participações da holding</h2>
                <button type="button" class="btn btn-sm btn-primary" id="btn-acq">Adquirir</button>
              </div>
              <ul>
                ${(e.participacoesDetidas || []).map((p) => {
                  const sub = CGL.Company.getById(state, p.empresaId);
                  return `<li>${CGL.Utils.escapeHtml(sub?.nomeFantasia || p.empresaId)} — ${CGL.Utils.formatPercent(p.percentual)} (${p.tipo})</li>`;
                }).join('') || '<li class="muted">Nenhuma.</li>'}
              </ul>
            </section>
          ` : ''}

          <section class="section-block">
            <h2>Histórico empresarial</h2>
            <ul class="timeline big">
              ${(e.historico || []).slice(0, 20).map((h) => `
                <li>
                  <div class="tl-meta">Semana ${h.semana} · ${CGL.Utils.escapeHtml(h.tipo)}</div>
                  <strong>${CGL.Utils.escapeHtml(h.titulo)}</strong>
                  <p>${CGL.Utils.escapeHtml(h.descricao)}</p>
                </li>
              `).join('') || '<li class="muted">Sem eventos.</li>'}
            </ul>
          </section>

          ${stake >= 50 ? `
            <section class="section-block actions-row">
              <button type="button" class="btn btn-secondary" id="btn-sell">Vender</button>
              <button type="button" class="btn btn-secondary" id="btn-merge">Fundir com…</button>
              <button type="button" class="btn btn-ghost" id="btn-close" style="color:var(--red)">Encerrar</button>
            </section>
          ` : ''}
        </div>
      `;

      main.querySelector('#btn-back').onclick = () => {
        this.view = 'lista';
        this.selectedId = null;
        this.renderEmpresas(main);
      };
      if (CGL.FinanceUI) CGL.FinanceUI.bindDetailFinance(main);
      main.querySelector('#btn-branch')?.addEventListener('click', () => this.openBranchModal(e.id));
      main.querySelector('#btn-acq')?.addEventListener('click', () => this.openAcquireModal(e.id));
      main.querySelector('#btn-sell')?.addEventListener('click', () => {
        const preco = Math.round(val * (stake / 100) * 0.95);
        CGL.UI.confirm('Vender empresa?', `Receberá cerca de ${CGL.Utils.formatBRL(preco)}.`, () => {
          try {
            CGL.Company.sellCompany(state, e.id, { preco, venderTudo: true });
            CGL.Game.save(false);
            CGL.Events.notify('success', 'Venda', 'Participação vendida.');
            this.view = 'lista';
            CGL.UI.refreshTopbar();
            this.renderEmpresas(main);
          } catch (err) {
            CGL.Events.notify('error', 'Falha', err.message);
          }
        });
      });
      main.querySelector('#btn-merge')?.addEventListener('click', () => this.openMergeModal(e.id));
      main.querySelector('#btn-close')?.addEventListener('click', () => {
        CGL.UI.confirm('Encerrar atividades?', 'A liquidação será parcial. Confirma?', () => {
          try {
            const r = CGL.Company.closeCompany(state, e.id);
            CGL.Game.save(false);
            CGL.Events.notify('alert', 'Encerrada', `Liquidação: ${CGL.Utils.formatBRL(r.payout)}`);
            this.view = 'lista';
            CGL.UI.refreshTopbar();
            this.renderEmpresas(main);
          } catch (err) {
            CGL.Events.notify('error', 'Falha', err.message);
          }
        });
      });
    },

    /* ========== Wizard constituição ========== */

    openCreationWizard(opts = {}) {
      this.resetWizard();
      if (opts.holding) {
        this.wizard.naturezaId = 'holding_patrimonial';
        this.wizard.segmentoId = 'holding';
        this.wizard.capitalSocial = 80000;
      }
      this._renderWizardModal();
    },

    _renderWizardModal() {
      const w = this.wizard;
      const steps = ['Identidade', 'Local & setor', 'Natureza', 'Capital & sócios', 'Revisão'];
      const state = CGL.Game.getState();

      let body = `<div class="wizard"><div class="wizard-steps">${steps.map((s, i) => `
        <span class="wiz-step ${i === w.step ? 'active' : ''} ${i < w.step ? 'done' : ''}">${i + 1}. ${s}</span>
      `).join('')}</div><div class="wizard-body">`;

      if (w.step === 0) {
        body += `
          <label class="field"><span>Nome da empresa</span>
            <input type="text" id="w-nome" value="${CGL.Utils.escapeHtml(w.nome)}" maxlength="60" /></label>
          <label class="field"><span>Nome fantasia</span>
            <input type="text" id="w-fantasia" value="${CGL.Utils.escapeHtml(w.nomeFantasia)}" maxlength="60" /></label>
          <label class="field"><span>Razão social</span>
            <input type="text" id="w-razao" value="${CGL.Utils.escapeHtml(w.razaoSocial)}" maxlength="80" /></label>
          <label class="field"><span>Cor da marca</span>
            <input type="color" id="w-cor" value="${w.corMarca}" /></label>
          <p class="muted">O logotipo será gerado automaticamente com as iniciais.</p>
        `;
      } else if (w.step === 1) {
        const cities = CGL.Data.searchCities('', 40);
        body += `
          <label class="field"><span>Cidade da sede</span>
            <input type="search" id="w-city-q" placeholder="Buscar cidade..." />
            <select id="w-cidade" size="6">
              ${cities.map((c) => `<option value="${c.id}" ${c.id === w.cidadeId ? 'selected' : ''}>${c.nome}/${c.estado}</option>`).join('')}
            </select>
          </label>
          <label class="field"><span>Segmento</span>
            <select id="w-seg">
              ${CGL.Data.segments.map((s) => `<option value="${s.id}" ${s.id === w.segmentoId ? 'selected' : ''}>${s.nome} — cap. mín. ${CGL.Utils.formatBRL(s.capitalMin, { compact: true })}</option>`).join('')}
            </select>
          </label>
          <label class="field"><span>Porte inicial</span>
            <select id="w-porte">
              ${CGL.Data.sizeTiers.slice(0, 3).map((t) => `<option value="${t.id}" ${t.id === w.porte ? 'selected' : ''}>${t.nome}</option>`).join('')}
            </select>
          </label>
        `;
      } else if (w.step === 2) {
        body += `
          <div class="nature-grid">
            ${CGL.Data.legalNatures.map((n) => `
              <label class="nature-card ${w.naturezaId === n.id ? 'selected' : ''}">
                <input type="radio" name="w-nat" value="${n.id}" ${w.naturezaId === n.id ? 'checked' : ''} />
                <strong>${CGL.Utils.escapeHtml(n.nome)}</strong>
                <p class="muted">${CGL.Utils.escapeHtml(n.descricao)}</p>
                <p><em>⊕</em> ${CGL.Utils.escapeHtml(n.vantagem)}</p>
                <p><em>⊖</em> ${CGL.Utils.escapeHtml(n.limitacao)}</p>
                <p class="muted">Sócios ${n.sociosMin}–${n.sociosMax === 9999 ? '∞' : n.sociosMax} · Cap. mín. ${CGL.Utils.formatBRL(n.capitalMin, { compact: true })}</p>
              </label>
            `).join('')}
          </div>
        `;
      } else if (w.step === 3) {
        const nat = CGL.Data.getLegalNatureById(w.naturezaId);
        body += `
          <label class="field"><span>Capital social (R$)</span>
            <input type="number" id="w-cap" min="${nat?.capitalMin || 1000}" step="1000" value="${w.capitalSocial}" /></label>
          <p class="muted">Disponível: ${CGL.Utils.formatBRL(state.player.dinheiro)} · Mínimo natureza: ${CGL.Utils.formatBRL(nat?.capitalMin || 0)}</p>
          <label class="field"><span>Sua participação (%)</span>
            <input type="number" id="w-pct" min="1" max="100" value="${w.socioPctJogador}" /></label>
          <label class="field"><span>Sócios NPC adicionais</span>
            <input type="number" id="w-extra" min="0" max="${Math.max(0, (nat?.sociosMax || 10) - 1)}" value="${w.sociosExtra}" /></label>
          <label class="field"><span>Administrador extra (opcional)</span>
            <input type="text" id="w-admin" value="${CGL.Utils.escapeHtml(w.adminExtra)}" placeholder="Nome" /></label>
        `;
      } else {
        const city = CGL.Data.getCityById(w.cidadeId);
        const seg = CGL.Data.getSegmentById(w.segmentoId);
        const nat = CGL.Data.getLegalNatureById(w.naturezaId);
        const logo = CGL.Company.generateLogo(w.nomeFantasia || w.nome, w.corMarca);
        const aporte = w.capitalSocial * (w.socioPctJogador / 100);
        body += `
          <div class="review-block">
            ${CGL.Company.logoHtml(logo, 'lg')}
            <h3>${CGL.Utils.escapeHtml(w.nomeFantasia || w.nome)}</h3>
            <ul class="kv-list">
              <li><span>Razão</span><span>${CGL.Utils.escapeHtml(w.razaoSocial || CGL.Company.suggestRazaoSocial(w.nome, w.naturezaId))}</span></li>
              <li><span>Sede</span><span>${city ? `${city.nome}/${city.estado}` : '—'}</span></li>
              <li><span>Segmento</span><span>${seg?.nome || '—'}</span></li>
              <li><span>Natureza</span><span>${nat?.nome || '—'}</span></li>
              <li><span>Capital</span><span>${CGL.Utils.formatBRL(w.capitalSocial)}</span></li>
              <li><span>Seu aporte</span><span class="stat-gold">${CGL.Utils.formatBRL(aporte)}</span></li>
            </ul>
          </div>
        `;
      }

      body += `</div></div>`;

      const isLast = w.step === steps.length - 1;
      CGL.UI.closeModal();
      const wrap = CGL.UI.modal({
        title: 'Constituição de empresa',
        body,
        confirmLabel: isLast ? 'Constituir' : 'Próximo',
        cancelLabel: w.step === 0 ? 'Cancelar' : 'Voltar',
        onConfirm: () => {
          if (!this._readWizardStep(wrap)) return;
          // Reabre porque modal fecha no onConfirm — precisamos controlar fluxo
        },
        hideCancel: false
      });

      // Sobrescreve botões para não fechar cedo demais
      const ok = wrap.querySelector('[data-act="ok"]');
      const cancel = wrap.querySelector('[data-act="cancel"]');
      ok.onclick = () => {
        if (!this._readWizardStep(wrap)) return;
        if (!isLast) {
          w.step++;
          // Auto razão social
          if (w.step === 1 && !w.razaoSocial && w.nome) {
            w.razaoSocial = CGL.Company.suggestRazaoSocial(w.nome, w.naturezaId);
          }
          wrap.remove();
          this._renderWizardModal();
        } else {
          this._finishWizard(wrap);
        }
      };
      if (cancel) {
        cancel.onclick = () => {
          if (w.step === 0) {
            wrap.remove();
          } else {
            w.step--;
            wrap.remove();
            this._renderWizardModal();
          }
        };
      }

      // City search
      const q = wrap.querySelector('#w-city-q');
      const sel = wrap.querySelector('#w-cidade');
      if (q && sel) {
        q.oninput = CGL.Utils.debounce(() => {
          const list = CGL.Data.searchCities(q.value, 40);
          sel.innerHTML = list.map((c) =>
            `<option value="${c.id}" ${c.id === w.cidadeId ? 'selected' : ''}>${c.nome}/${c.estado}</option>`
          ).join('');
        }, 120);
      }

      // Nature cards
      wrap.querySelectorAll('input[name="w-nat"]').forEach((inp) => {
        inp.onchange = () => {
          w.naturezaId = inp.value;
          wrap.querySelectorAll('.nature-card').forEach((c) => c.classList.remove('selected'));
          inp.closest('.nature-card')?.classList.add('selected');
        };
      });
    },

    _readWizardStep(wrap) {
      const w = this.wizard;
      if (w.step === 0) {
        w.nome = wrap.querySelector('#w-nome')?.value.trim() || '';
        w.nomeFantasia = wrap.querySelector('#w-fantasia')?.value.trim() || w.nome;
        w.razaoSocial = wrap.querySelector('#w-razao')?.value.trim() || '';
        w.corMarca = wrap.querySelector('#w-cor')?.value || w.corMarca;
        if (w.nome.length < 2) {
          CGL.Events.notify('error', 'Nome', 'Informe o nome da empresa.');
          return false;
        }
      } else if (w.step === 1) {
        w.cidadeId = wrap.querySelector('#w-cidade')?.value || w.cidadeId;
        w.segmentoId = wrap.querySelector('#w-seg')?.value || w.segmentoId;
        w.porte = wrap.querySelector('#w-porte')?.value || w.porte;
      } else if (w.step === 2) {
        const checked = wrap.querySelector('input[name="w-nat"]:checked');
        if (checked) w.naturezaId = checked.value;
        if (!w.razaoSocial) w.razaoSocial = CGL.Company.suggestRazaoSocial(w.nome, w.naturezaId);
      } else if (w.step === 3) {
        w.capitalSocial = Number(wrap.querySelector('#w-cap')?.value) || w.capitalSocial;
        w.socioPctJogador = CGL.Utils.clamp(Number(wrap.querySelector('#w-pct')?.value) || 100, 1, 100);
        w.sociosExtra = Number(wrap.querySelector('#w-extra')?.value) || 0;
        w.adminExtra = wrap.querySelector('#w-admin')?.value.trim() || '';
        const nat = CGL.Data.getLegalNatureById(w.naturezaId);
        if (w.capitalSocial < (nat?.capitalMin || 0)) {
          CGL.Events.notify('error', 'Capital', `Mínimo: ${CGL.Utils.formatBRL(nat.capitalMin)}`);
          return false;
        }
      }
      return true;
    },

    _finishWizard(wrap) {
      const w = this.wizard;
      const state = CGL.Game.getState();
      const socios = [{
        nome: `${state.player.nome} ${state.player.sobrenome}`,
        tipo: 'jogador',
        playerId: state.player.id,
        percentual: w.socioPctJogador
      }];
      if (w.sociosExtra > 0) {
        const rest = 100 - w.socioPctJogador;
        const each = rest / w.sociosExtra;
        for (let i = 0; i < w.sociosExtra; i++) {
          const names = CGL.Data.names;
          socios.push({
            nome: `${CGL.Utils.pick(names.FIRST_M.concat(names.FIRST_F))} ${CGL.Utils.pick(names.SURNAMES)}`,
            tipo: 'npc',
            percentual: each
          });
        }
      }
      const admins = [];
      if (w.adminExtra) {
        admins.push({ nome: w.adminExtra, cargo: 'Diretor' });
      }

      try {
        const empresa = CGL.Company.constitute(state, {
          nome: w.nome,
          nomeFantasia: w.nomeFantasia || w.nome,
          razaoSocial: w.razaoSocial || CGL.Company.suggestRazaoSocial(w.nome, w.naturezaId),
          corMarca: w.corMarca,
          cidadeId: w.cidadeId,
          segmentoId: w.segmentoId,
          naturezaId: w.naturezaId,
          porte: w.porte,
          capitalSocial: w.capitalSocial,
          socios,
          administradores: admins.length ? [
            { nome: `${state.player.nome} ${state.player.sobrenome}`, cargo: 'Administrador' },
            ...admins
          ] : undefined
        });
        wrap.remove();
        CGL.Game.save(false);
        CGL.Events.notify('success', 'Empresa constituída', `${empresa.nomeFantasia} · ${empresa.cnpj}`);
        CGL.UI.refreshTopbar();
        this.selectedId = empresa.id;
        this.view = 'detalhe';
        const main = document.getElementById('main-content');
        if (main) this.renderEmpresas(main);
      } catch (err) {
        CGL.Events.notify('error', 'Constituição', err.message || String(err));
      }
    },

    openBranchModal(empresaId) {
      const state = CGL.Game.getState();
      const cities = CGL.Data.searchCities('', 30);
      const wrap = CGL.UI.modal({
        title: 'Abrir filial',
        body: `
          <label class="field"><span>Cidade</span>
            <input type="search" id="br-q" placeholder="Buscar..." />
            <select id="br-city" size="5">
              ${cities.map((c) => `<option value="${c.id}">${c.nome}/${c.estado}</option>`).join('')}
            </select>
          </label>
          <p class="muted">O custo sai do caixa da empresa e varia com a cidade.</p>
        `,
        confirmLabel: 'Abrir',
        onConfirm: () => {}
      });
      const sel = wrap.querySelector('#br-city');
      wrap.querySelector('#br-q').oninput = CGL.Utils.debounce((e) => {
        const list = CGL.Data.searchCities(e.target.value, 30);
        sel.innerHTML = list.map((c) => `<option value="${c.id}">${c.nome}/${c.estado}</option>`).join('');
      }, 120);
      wrap.querySelector('[data-act="ok"]').onclick = () => {
        try {
          const cityId = sel.value;
          CGL.Company.openBranch(state, empresaId, cityId);
          CGL.Game.save(false);
          CGL.Events.notify('success', 'Filial', 'Unidade aberta com sucesso.');
          wrap.remove();
          CGL.UI.refreshTopbar();
          this.renderDetail(document.getElementById('main-content'), empresaId);
        } catch (err) {
          CGL.Events.notify('error', 'Filial', err.message);
        }
      };
    },

    openAcquireModal(holdingId) {
      const state = CGL.Game.getState();
      const targets = CGL.Company.listAll(state).filter(
        (e) => e.ativa && e.id !== holdingId && (e.concorrente || CGL.Company.playerStake(e, state.player.id) < 100)
      );
      if (!targets.length) {
        CGL.Events.notify('alert', 'Sem alvos', 'Não há empresas disponíveis para aquisição.');
        return;
      }
      const wrap = CGL.UI.modal({
        title: 'Adquirir participação',
        body: `
          <label class="field"><span>Empresa-alvo</span>
            <select id="aq-target">
              ${targets.slice(0, 40).map((t) => `
                <option value="${t.id}">${CGL.Utils.escapeHtml(t.nomeFantasia)} (${t.concorrente ? 'concorrente' : 'grupo'}) — ${CGL.Utils.formatBRL(CGL.Company.calcValuation(t, state), { compact: true })}</option>
              `).join('')}
            </select>
          </label>
          <label class="field"><span>Percentual (%)</span>
            <input type="number" id="aq-pct" min="1" max="100" value="30" /></label>
        `,
        confirmLabel: 'Adquirir',
        onConfirm: () => {}
      });
      wrap.querySelector('[data-act="ok"]').onclick = () => {
        try {
          const targetId = wrap.querySelector('#aq-target').value;
          const pct = Number(wrap.querySelector('#aq-pct').value) || 30;
          const r = CGL.Company.acquireStake(state, holdingId, targetId, pct);
          CGL.Game.save(false);
          CGL.Events.notify('success', 'Participação', `Adquirido ${pct}% por ${CGL.Utils.formatBRL(r.preco)}`);
          wrap.remove();
          CGL.UI.refreshTopbar();
          this.view = 'holdings';
          this.renderEmpresas(document.getElementById('main-content'));
        } catch (err) {
          CGL.Events.notify('error', 'Aquisição', err.message);
        }
      };
    },

    openMergeModal(survivorId) {
      const state = CGL.Game.getState();
      const others = CGL.Company.listPlayerCompanies(state).filter(
        (e) => e.id !== survivorId && CGL.Company.playerStake(e, state.player.id) >= 50
      );
      if (!others.length) {
        CGL.Events.notify('alert', 'Fusão', 'Você precisa controlar outra empresa.');
        return;
      }
      const wrap = CGL.UI.modal({
        title: 'Fundir / incorporar',
        body: `
          <p>A empresa selecionada será incorporada à atual.</p>
          <label class="field"><span>Incorporar</span>
            <select id="mg-target">${others.map((o) =>
              `<option value="${o.id}">${CGL.Utils.escapeHtml(o.nomeFantasia)}</option>`
            ).join('')}</select>
          </label>
        `,
        confirmLabel: 'Fundir',
        onConfirm: () => {}
      });
      wrap.querySelector('[data-act="ok"]').onclick = () => {
        try {
          const absorbed = wrap.querySelector('#mg-target').value;
          CGL.Company.mergeCompanies(state, survivorId, absorbed);
          CGL.Game.save(false);
          CGL.Events.notify('success', 'Fusão', 'Incorporação concluída.');
          wrap.remove();
          this.renderDetail(document.getElementById('main-content'), survivorId);
          CGL.UI.refreshTopbar();
        } catch (err) {
          CGL.Events.notify('error', 'Fusão', err.message);
        }
      };
    },

    /** Card resumido para o Dashboard */
    dashboardSummaryHtml(state) {
      const list = CGL.Company.listPlayerCompanies(state);
      if (!list.length) {
        return `
          <p class="muted">Nenhuma empresa ainda.</p>
          <button type="button" class="btn btn-sm btn-accent" data-go="empresas">Abrir empresa</button>
        `;
      }
      return `
        <ul class="kv-list">
          ${list.slice(0, 4).map((e) => `
            <li>
              <span>${CGL.Company.logoHtml(e.logo, 'sm')} ${CGL.Utils.escapeHtml(e.nomeFantasia)}</span>
              <span class="${e.lucro >= 0 ? 'pos' : 'neg'}">${CGL.Utils.formatBRL(e.lucro, { compact: true })}/sem</span>
            </li>
          `).join('')}
        </ul>
        <p class="muted">${list.length} empresa(s) · patrimônio empres. ${CGL.Utils.formatBRL(state.player.patrimonioEmpresarial || 0, { compact: true })}</p>
        <button type="button" class="btn btn-sm btn-secondary" data-go="empresas">Gerenciar</button>
      `;
    }
  };

  global.CGL = global.CGL || {};
  global.CGL.CompanyUI = CompanyUI;
})(typeof window !== 'undefined' ? window : globalThis);
