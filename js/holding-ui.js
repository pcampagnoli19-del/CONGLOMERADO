/**
 * CONGLOMERADO — UI Conglomerado / Holding (Fase 12)
 * Árvore societária, governança, M&A, departamentos e ranking.
 */
(function (global) {
  'use strict';

  const HoldingUI = {
    view: 'hub', // hub | arvore | ma | governanca | corporativo | sucessao | ranking
    selectedHoldingId: null,
    selectedDealId: null,

    render(main) {
      const state = CGL.Game.getState();
      if (!state?.player) return;
      CGL.Holding.ensureHolding(state);
      const holdings = CGL.Company.listHoldings(state);
      if (!this.selectedHoldingId && holdings[0]) {
        this.selectedHoldingId = holdings[0].id;
      }
      if (this.view === 'arvore') this.renderArvore(main);
      else if (this.view === 'ma') this.renderMa(main);
      else if (this.view === 'governanca') this.renderGovernanca(main);
      else if (this.view === 'corporativo') this.renderCorporativo(main);
      else if (this.view === 'sucessao') this.renderSucessao(main);
      else if (this.view === 'ranking') this.renderRanking(main);
      else this.renderHub(main);
    },

    _nav(main) {
      const tabs = [
        { id: 'hub', label: 'Visão geral' },
        { id: 'arvore', label: 'Árvore' },
        { id: 'ma', label: 'M&A' },
        { id: 'governanca', label: 'Governança' },
        { id: 'corporativo', label: 'Corporativo' },
        { id: 'sucessao', label: 'Sucessão' },
        { id: 'ranking', label: 'Ranking' }
      ];
      return `
        <div class="finance-tabs holding-tabs">
          ${tabs.map((t) => `
            <button type="button" class="finance-tab ${this.view === t.id ? 'active' : ''}"
              data-htab="${t.id}">${t.label}</button>
          `).join('')}
        </div>
      `;
    },

    _bindTabs(main) {
      main.querySelectorAll('[data-htab]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.view = btn.dataset.htab;
          this.render(main);
        });
      });
    },

    _holdingSelect(state) {
      const holdings = CGL.Company.listHoldings(state);
      if (!holdings.length) return '<p class="muted">Nenhuma holding constituída.</p>';
      return `
        <label class="field inline-field">
          <span>Holding</span>
          <select id="holding-root-select">
            ${holdings.map((h) => `
              <option value="${h.id}" ${h.id === this.selectedHoldingId ? 'selected' : ''}>
                ${CGL.Utils.escapeHtml(h.nomeFantasia)}
              </option>
            `).join('')}
          </select>
        </label>
      `;
    },

    renderHub(main) {
      const state = CGL.Game.getState();
      const sum = CGL.Holding.dashboardSummary(state);
      const brand = CGL.Data.getBrandStrategyById(state.holding.brandStrategy);
      const eventos = (state.holding.eventos || []).slice(0, 6);
      const sinergias = (state.holding.sinergiasAtivas || []).slice(0, 6);
      const holdings = CGL.Company.listHoldings(state);

      main.innerHTML = `
        <div class="screen holding-screen">
          <header class="screen-header row-between">
            <div>
              <h1>Conglomerado / Holding</h1>
              <p class="muted">${CGL.Utils.escapeHtml(sum.nomeGrupo || 'Monte seu grupo empresarial')} · marca ${CGL.Utils.escapeHtml(brand.nome)}</p>
            </div>
            <div class="row-actions">
              <button type="button" class="btn btn-primary" id="btn-new-holding-cgl">Nova holding</button>
              <button type="button" class="btn btn-secondary" id="btn-attach">Anexar empresa</button>
            </div>
          </header>
          ${this._nav(main)}

          <div class="dash-grid">
            ${CGL.UI.card('Holdings', `<div class="stat-gold">${sum.holdings}</div>`)}
            ${CGL.UI.card('Controladas', `<div class="stat-gold">${sum.controladas}</div>`)}
            ${CGL.UI.card('Valor do grupo', `<div class="stat-gold">${CGL.Utils.formatBRL(sum.valorTotal, { compact: true })}</div>`)}
            ${CGL.UI.card('Funcionários', `<div class="stat-gold">${sum.funcionarios}</div>`)}
            ${CGL.UI.card('Sinergias', `<div class="stat-gold">${sum.sinergias}</div>`)}
            ${CGL.UI.card('M&A ativos', `<div class="stat-gold">${sum.maAtivos}</div>`)}
            ${CGL.UI.card('Governança', `<div class="stat-gold">${sum.govScore}</div>`)}
            ${CGL.UI.card('Ranking', `<div class="stat-gold">${sum.rankingPos ? '#' + sum.rankingPos : '—'}</div>`)}
          </div>

          ${!holdings.length ? CGL.UI.card('Comece pelo grupo', `
            <p>Constitua uma <strong>holding patrimonial ou operacional</strong> (Empresas → Holdings) e anexe companhias à árvore.</p>
          `) : ''}

          <div class="detail-grid">
            ${CGL.UI.card('Estratégia de marca', `
              <p class="muted">${CGL.Utils.escapeHtml(brand.descricao)}</p>
              <div class="row-actions" style="margin-top:0.75rem">
                ${(CGL.Data.brandStrategies || []).map((b) => `
                  <button type="button" class="btn btn-sm ${b.id === brand.id ? 'btn-primary' : 'btn-secondary'}"
                    data-brand="${b.id}">${CGL.Utils.escapeHtml(b.nome)}</button>
                `).join('')}
              </div>
            `)}
            ${CGL.UI.card('Sinergias ativas', sinergias.length ? `
              <ul class="kv-list">
                ${sinergias.map((s) => `
                  <li><span>${CGL.Utils.escapeHtml(s.nome)}</span>
                  <span>×${Number(s.receitaMult).toFixed(2)} rec.</span></li>
                `).join('')}
              </ul>
            ` : '<p class="muted">Anexe empresas de segmentos complementares.</p>')}
            ${CGL.UI.card('Eventos de império', eventos.length ? `
              <ul class="kv-list">
                ${eventos.map((e) => `
                  <li><span>${CGL.Utils.escapeHtml(e.titulo)}</span>
                  <span class="muted">sem ${e.semana}</span></li>
                `).join('')}
              </ul>
            ` : '<p class="muted">Nenhum evento recente.</p>')}
          </div>
        </div>
      `;
      this._bindTabs(main);
      main.querySelector('#btn-new-holding-cgl')?.addEventListener('click', () => {
        if (CGL.CompanyUI) {
          CGL.CompanyUI.view = 'holdings';
          CGL.UI.navigate('empresas');
          CGL.CompanyUI.openCreationWizard({ holding: true });
        }
      });
      main.querySelector('#btn-attach')?.addEventListener('click', () => this.openAttachModal());
      main.querySelectorAll('[data-brand]').forEach((btn) => {
        btn.addEventListener('click', () => {
          try {
            CGL.Holding.setBrandStrategy(state, btn.dataset.brand);
            CGL.Events.notify('success', 'Marca', 'Estratégia atualizada.');
            this.render(main);
          } catch (err) {
            CGL.Events.notify('error', 'Marca', err.message);
          }
        });
      });
    },

    renderArvore(main) {
      const state = CGL.Game.getState();
      const holdings = CGL.Company.listHoldings(state);
      if (!holdings.length) {
        main.innerHTML = `
          <div class="screen holding-screen">
            <header class="screen-header"><h1>Árvore societária</h1></header>
            ${this._nav(main)}
            <p class="muted">Crie uma holding para visualizar a árvore.</p>
          </div>`;
        this._bindTabs(main);
        return;
      }
      if (!this.selectedHoldingId) this.selectedHoldingId = holdings[0].id;
      const tree = CGL.Holding.buildOwnershipTree(state, this.selectedHoldingId);
      const sum = tree.summary;

      main.innerHTML = `
        <div class="screen holding-screen">
          <header class="screen-header row-between">
            <div>
              <h1>Árvore societária</h1>
              <p class="muted">Holding → subsidiárias → filiais → unidades</p>
            </div>
            ${this._holdingSelect(state)}
          </header>
          ${this._nav(main)}

          <div class="dash-grid">
            ${CGL.UI.card('Valor', CGL.Utils.formatBRL(sum.valorTotal, { compact: true }))}
            ${CGL.UI.card('Lucro/sem', CGL.Utils.formatBRL(sum.lucroTotal, { compact: true }))}
            ${CGL.UI.card('Dívida', CGL.Utils.formatBRL(sum.dividaTotal, { compact: true }))}
            ${CGL.UI.card('Headcount', String(sum.funcionarios))}
          </div>

          <section class="section-block">
            <div class="ownership-tree">
              ${this._renderTreeNodes(tree)}
            </div>
          </section>

          <div class="row-actions" style="margin-top:1rem">
            <button type="button" class="btn btn-secondary" id="btn-split">Cindir empresa</button>
            <button type="button" class="btn btn-secondary" id="btn-merge">Fundir controladas</button>
          </div>
        </div>
      `;
      this._bindTabs(main);
      main.querySelector('#holding-root-select')?.addEventListener('change', (e) => {
        this.selectedHoldingId = e.target.value;
        this.render(main);
      });
      main.querySelector('#btn-split')?.addEventListener('click', () => this.openSplitModal());
      main.querySelector('#btn-merge')?.addEventListener('click', () => this.openMergeModal());
    },

    _renderTreeNodes(tree) {
      if (!tree.root) return '<p class="muted">Árvore vazia.</p>';
      const byParent = {};
      tree.edges.forEach((e) => {
        byParent[e.from] = byParent[e.from] || [];
        byParent[e.from].push(e);
      });
      const nodeMap = {};
      tree.nodes.forEach((n) => { nodeMap[n.id] = n; });

      const renderNode = (nodeId, depth) => {
        const n = nodeMap[nodeId];
        if (!n) return '';
        const children = byParent[nodeId] || [];
        const tipoClass = `tree-tipo-${n.tipo}`;
        return `
          <div class="tree-node ${tipoClass}" style="--depth:${depth}">
            <div class="tree-card">
              <div class="tree-card-head">
                <strong>${CGL.Utils.escapeHtml(n.nome)}</strong>
                <span class="tree-badge">${CGL.Utils.escapeHtml(n.tipo)}</span>
              </div>
              <ul class="kv-list tree-metrics">
                <li><span>Participação</span><span>${CGL.Utils.formatPercent(n.percentual || 0)}</span></li>
                <li><span>Valor</span><span>${CGL.Utils.formatBRL(n.valor || 0, { compact: true })}</span></li>
                <li><span>Lucro</span><span>${CGL.Utils.formatBRL(n.lucro || 0, { compact: true })}</span></li>
                <li><span>Dívida</span><span>${CGL.Utils.formatBRL(n.divida || 0, { compact: true })}</span></li>
                <li><span>Funcionários</span><span>${n.funcionarios || 0}</span></li>
                <li><span>Diretor</span><span>${CGL.Utils.escapeHtml(n.diretor || '—')}</span></li>
              </ul>
            </div>
            ${children.length ? `
              <div class="tree-children">
                ${children.map((ed) => renderNode(ed.to, depth + 1)).join('')}
              </div>
            ` : ''}
          </div>
        `;
      };
      return renderNode(tree.root.id, 0);
    },

    renderMa(main) {
      const state = CGL.Game.getState();
      const pipeline = state.holding.maPipeline || [];
      const holdings = CGL.Company.listHoldings(state);

      main.innerHTML = `
        <div class="screen holding-screen">
          <header class="screen-header row-between">
            <div>
              <h1>Fusões & Aquisições</h1>
              <p class="muted">Encontrar → proposta → negociar → diligence → aprovar → integrar</p>
            </div>
            <div class="row-actions">
              <button type="button" class="btn btn-primary" id="btn-find-ma" ${!holdings.length ? 'disabled' : ''}>
                Encontrar oportunidade
              </button>
            </div>
          </header>
          ${this._nav(main)}

          ${pipeline.length ? `
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Alvo</th>
                    <th>Tipo</th>
                    <th>Estágio</th>
                    <th>Preço</th>
                    <th>Risco DD</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${pipeline.map((d) => {
                    const stage = CGL.Data.getMaStageById(d.estagio);
                    const preco = d.precoNegociado || d.precoOferta || 0;
                    return `
                      <tr>
                        <td>${CGL.Utils.escapeHtml(d.alvoNome)}</td>
                        <td>${CGL.Utils.escapeHtml(d.tipoAlvo)}</td>
                        <td>${CGL.Utils.escapeHtml(stage?.nome || d.estagio)}</td>
                        <td>${CGL.Utils.formatBRL(preco, { compact: true })}</td>
                        <td>${d.dueDiligence?.scoreRisco ?? '—'}</td>
                        <td><button type="button" class="btn btn-sm btn-secondary" data-deal="${d.id}">Abrir</button></td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          ` : '<p class="muted">Nenhum deal no pipeline.</p>'}

          <div id="ma-detail"></div>
        </div>
      `;
      this._bindTabs(main);
      main.querySelector('#btn-find-ma')?.addEventListener('click', () => {
        try {
          const hid = this.selectedHoldingId || holdings[0].id;
          const deal = CGL.Holding.findOpportunity(state, hid, { tipoAlvo: 'concorrente' });
          CGL.Events.notify('success', 'M&A', `Oportunidade: ${deal.alvoNome}`);
          this.selectedDealId = deal.id;
          this.render(main);
        } catch (err) {
          CGL.Events.notify('error', 'M&A', err.message);
        }
      });
      main.querySelectorAll('[data-deal]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.selectedDealId = btn.dataset.deal;
          this._renderDealDetail(main);
        });
      });
      if (this.selectedDealId) this._renderDealDetail(main);
    },

    _renderDealDetail(main) {
      const state = CGL.Game.getState();
      const deal = (state.holding.maPipeline || []).find((d) => d.id === this.selectedDealId);
      const box = main.querySelector('#ma-detail');
      if (!box || !deal) return;
      const issues = deal.issuesRevelados || [];

      box.innerHTML = CGL.UI.card(`Deal — ${CGL.Utils.escapeHtml(deal.alvoNome)}`, `
        <p class="muted">Estágio: <strong>${CGL.Utils.escapeHtml(deal.estagio)}</strong> · status ${deal.status}</p>
        <ul class="kv-list">
          <li><span>Valuation base</span><span>${CGL.Utils.formatBRL(deal.valuationBase)}</span></li>
          <li><span>Oferta</span><span>${CGL.Utils.formatBRL(deal.precoOferta || 0)}</span></li>
          <li><span>Negociado</span><span>${deal.precoNegociado != null ? CGL.Utils.formatBRL(deal.precoNegociado) : '—'}</span></li>
        </ul>
        ${issues.length ? `
          <h3>Due diligence</h3>
          <ul class="kv-list">
            ${issues.map((i) => `
              <li><span>${CGL.Utils.escapeHtml(i.nome)}</span>
              <span>sev. ${Math.round((i.severidade || 0) * 100)}</span></li>
            `).join('')}
          </ul>
        ` : ''}
        <div class="row-actions" style="margin-top:0.75rem">
          <button type="button" class="btn btn-sm btn-secondary" data-ma-act="proposta">Proposta</button>
          <button type="button" class="btn btn-sm btn-secondary" data-ma-act="negociar">Negociar</button>
          <button type="button" class="btn btn-sm btn-primary" data-ma-act="dd">Due diligence</button>
          <button type="button" class="btn btn-sm btn-primary" data-ma-act="aprovar">Aprovar</button>
          <button type="button" class="btn btn-sm btn-primary" data-ma-act="integrar">Integrar</button>
          <button type="button" class="btn btn-sm btn-danger" data-ma-act="cancelar">Cancelar</button>
        </div>
        <h3 style="margin-top:1rem">Histórico</h3>
        <ul class="kv-list">
          ${(deal.historico || []).slice().reverse().map((h) => `
            <li><span>sem ${h.semana} · ${CGL.Utils.escapeHtml(h.estagio)}</span>
            <span class="muted">${CGL.Utils.escapeHtml(h.nota || '')}</span></li>
          `).join('')}
        </ul>
      `);

      box.querySelectorAll('[data-ma-act]').forEach((btn) => {
        btn.addEventListener('click', () => {
          try {
            const act = btn.dataset.maAct;
            if (act === 'proposta') CGL.Holding.makeOffer(state, deal.id);
            else if (act === 'negociar') CGL.Holding.negotiate(state, deal.id);
            else if (act === 'dd') CGL.Holding.runDueDiligence(state, deal.id);
            else if (act === 'aprovar') CGL.Holding.approveDeal(state, deal.id);
            else if (act === 'integrar') CGL.Holding.integrateDeal(state, deal.id);
            else if (act === 'cancelar') CGL.Holding.cancelDeal(state, deal.id);
            CGL.Events.notify('success', 'M&A', `Ação: ${act}`);
            this.render(main);
          } catch (err) {
            CGL.Events.notify('error', 'M&A', err.message);
          }
        });
      });
    },

    renderGovernanca(main) {
      const state = CGL.Game.getState();
      const holding = CGL.Company.getById(state, this.selectedHoldingId)
        || CGL.Company.listHoldings(state)[0];
      if (!holding) {
        main.innerHTML = `
          <div class="screen holding-screen">
            <header class="screen-header"><h1>Governança</h1></header>
            ${this._nav(main)}
            <p class="muted">Sem holding.</p>
          </div>`;
        this._bindTabs(main);
        return;
      }
      CGL.Holding.ensureCompanyHolding(holding, state);
      CGL.Holding._maybeInitBoard(holding, state);
      const g = holding.holding.governanca;
      const board = holding.holding.conselho;

      main.innerHTML = `
        <div class="screen holding-screen">
          <header class="screen-header row-between">
            <div>
              <h1>Governança — ${CGL.Utils.escapeHtml(holding.nomeFantasia)}</h1>
              <p class="muted">Auditoria, compliance, riscos e ética</p>
            </div>
            ${this._holdingSelect(state)}
          </header>
          ${this._nav(main)}

          <div class="dash-grid">
            ${CGL.UI.card('Score', `<div class="stat-gold">${g.score}</div>`)}
            ${CGL.UI.card('Auditoria', this._meter(g.auditoria))}
            ${CGL.UI.card('Compliance', this._meter(g.compliance))}
            ${CGL.UI.card('Riscos', this._meter(g.risco))}
            ${CGL.UI.card('Ética', this._meter(g.etica))}
            ${CGL.UI.card('Pressão do board', this._meter(board.nivelPressao || 0))}
          </div>

          <section class="section-block">
            <h2>Políticas</h2>
            <div class="row-actions">
              ${(CGL.Data.govPolicies || []).map((p) => {
                const on = (g.politicasAtivas || []).includes(p.id);
                return `
                  <button type="button" class="btn btn-sm ${on ? 'btn-primary' : 'btn-secondary'}"
                    data-gov="${p.id}" ${on ? 'disabled' : ''}>
                    ${CGL.Utils.escapeHtml(p.nome)} (${CGL.Utils.formatBRL(p.custoSemanal)}/sem)
                  </button>
                `;
              }).join('')}
            </div>
          </section>

          <section class="section-block">
            <h2>Conselho de Administração ${board.ativo ? '' : '(inativo)'}</h2>
            ${board.membros.length ? `
              <div class="table-wrap">
                <table class="data-table">
                  <thead><tr><th>Nome</th><th>Papel</th><th>Indep.</th><th>Lealdade</th></tr></thead>
                  <tbody>
                    ${board.membros.map((m) => `
                      <tr>
                        <td>${CGL.Utils.escapeHtml(m.nome)}</td>
                        <td>${CGL.Utils.escapeHtml(m.papel)}</td>
                        <td>${m.independente ? 'Sim' : 'Não'}</td>
                        <td>${m.lealdade}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : '<p class="muted">Conselho ainda não formado.</p>'}
            <button type="button" class="btn btn-secondary" id="btn-add-board" style="margin-top:0.5rem">
              Adicionar conselheiro
            </button>
          </section>
        </div>
      `;
      this._bindTabs(main);
      main.querySelector('#holding-root-select')?.addEventListener('change', (e) => {
        this.selectedHoldingId = e.target.value;
        this.render(main);
      });
      main.querySelectorAll('[data-gov]').forEach((btn) => {
        btn.addEventListener('click', () => {
          try {
            CGL.Holding.investGovernance(state, holding.id, btn.dataset.gov);
            CGL.Events.notify('success', 'Governança', 'Política implantada.');
            this.render(main);
          } catch (err) {
            CGL.Events.notify('error', 'Governança', err.message);
          }
        });
      });
      main.querySelector('#btn-add-board')?.addEventListener('click', () => {
        CGL.Holding.addBoardMember(state, holding.id, {
          nome: CGL.Utils.pick(['Marina Lopes', 'Eduardo Prado', 'Beatriz Nunes', 'Rafael Torres']),
          papel: 'independente'
        });
        this.render(main);
      });
    },

    _meter(v) {
      const pct = CGL.Utils.clamp(Number(v) || 0, 0, 100);
      return `
        <div class="stat-gold">${Math.round(pct)}</div>
        <div class="meter"><span class="meter-fill" style="width:${pct}%"></span></div>
      `;
    },

    renderCorporativo(main) {
      const state = CGL.Game.getState();
      const holding = CGL.Company.getById(state, this.selectedHoldingId)
        || CGL.Company.listHoldings(state)[0];
      if (!holding) {
        main.innerHTML = `
          <div class="screen holding-screen">
            <header class="screen-header"><h1>Corporativo</h1></header>
            ${this._nav(main)}
            <p class="muted">Sem holding.</p>
          </div>`;
        this._bindTabs(main);
        return;
      }
      CGL.Holding.ensureCompanyHolding(holding, state);
      const depts = holding.holding.departamentos || [];
      const offices = holding.holding.escritorios || [];
      const custo = CGL.Holding.weeklyHoldingCostEstimate(holding, state);

      main.innerHTML = `
        <div class="screen holding-screen">
          <header class="screen-header row-between">
            <div>
              <h1>Escritórios & departamentos</h1>
              <p class="muted">Centros de custo compartilhados · ${CGL.Utils.formatBRL(custo)}/sem</p>
            </div>
            ${this._holdingSelect(state)}
          </header>
          ${this._nav(main)}

          <section class="section-block">
            <h2>Departamentos corporativos</h2>
            <div class="corp-grid">
              ${(CGL.Data.corpDepartments || []).map((d) => {
                const open = depts.find((x) => x.tipo === d.id);
                return `
                  <article class="corp-card">
                    <strong>${CGL.Utils.escapeHtml(d.nome)}</strong>
                    <p class="muted">${CGL.Utils.escapeHtml(d.beneficio)}</p>
                    <p>${CGL.Utils.formatBRL(d.custoBase)}/sem</p>
                    ${open
                      ? `<span class="tree-badge">Ativo · nv ${open.nivel}</span>`
                      : `<button type="button" class="btn btn-sm btn-primary" data-dept="${d.id}">Abrir</button>`}
                  </article>
                `;
              }).join('')}
            </div>
          </section>

          <section class="section-block">
            <h2>Escritórios</h2>
            <div class="corp-grid">
              ${(CGL.Data.corpOffices || []).map((o) => {
                const open = offices.find((x) => x.tipo === o.id);
                return `
                  <article class="corp-card">
                    <strong>${CGL.Utils.escapeHtml(o.nome)}</strong>
                    <p class="muted">${CGL.Utils.escapeHtml(o.beneficio)}</p>
                    <p>CAPEX ${CGL.Utils.formatBRL(o.capex, { compact: true })}</p>
                    ${open
                      ? `<span class="tree-badge">Inaugurado</span>`
                      : `<button type="button" class="btn btn-sm btn-primary" data-office="${o.id}">Construir</button>`}
                  </article>
                `;
              }).join('')}
            </div>
          </section>
        </div>
      `;
      this._bindTabs(main);
      main.querySelector('#holding-root-select')?.addEventListener('change', (e) => {
        this.selectedHoldingId = e.target.value;
        this.render(main);
      });
      main.querySelectorAll('[data-dept]').forEach((btn) => {
        btn.addEventListener('click', () => {
          try {
            CGL.Holding.openDepartment(state, holding.id, btn.dataset.dept);
            CGL.Events.notify('success', 'Corporativo', 'Departamento aberto.');
            this.render(main);
          } catch (err) {
            CGL.Events.notify('error', 'Corporativo', err.message);
          }
        });
      });
      main.querySelectorAll('[data-office]').forEach((btn) => {
        btn.addEventListener('click', () => {
          try {
            CGL.Holding.openOffice(state, holding.id, btn.dataset.office);
            CGL.Events.notify('success', 'Corporativo', 'Escritório inaugurado.');
            this.render(main);
          } catch (err) {
            CGL.Events.notify('error', 'Corporativo', err.message);
          }
        });
      });
    },

    renderSucessao(main) {
      const state = CGL.Game.getState();
      CGL.Holding.syncHeirsFromFamily(state);
      const suc = state.holding.sucessao;
      const herdeiros = suc.herdeiros || [];

      main.innerHTML = `
        <div class="screen holding-screen">
          <header class="screen-header row-between">
            <div>
              <h1>Sucessão familiar</h1>
              <p class="muted">Herdeiros, plano e conflitos (hooks Família)</p>
            </div>
            <button type="button" class="btn btn-secondary" id="btn-heir-stub">Adicionar herdeiro (stub)</button>
          </header>
          ${this._nav(main)}

          <section class="section-block">
            <h2>Plano de sucessão</h2>
            <div class="row-actions">
              ${[
                ['filho', 'Filho assume'],
                ['ceo_profissional', 'CEO profissional'],
                ['dividir', 'Dividir patrimônio'],
                ['conselho_familiar', 'Conselho familiar']
              ].map(([id, label]) => `
                <button type="button" class="btn btn-sm ${suc.plano === id ? 'btn-primary' : 'btn-secondary'}"
                  data-plano="${id}">${label}</button>
              `).join('')}
            </div>
            <p class="muted" style="margin-top:0.5rem">
              Conselho familiar: ${suc.conselhoFamiliar ? 'ativo' : 'inativo'}
            </p>
          </section>

          <section class="section-block">
            <h2>Herdeiros</h2>
            ${herdeiros.length ? `
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Nome</th><th>Idade</th><th>Formação</th>
                      <th>Inteligência</th><th>Liderança</th><th>Interesse</th><th>Relação</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${herdeiros.map((h) => `
                      <tr>
                        <td>${CGL.Utils.escapeHtml(h.nome)}</td>
                        <td>${h.idade}</td>
                        <td>${CGL.Utils.escapeHtml(h.formacao)}</td>
                        <td>${h.inteligencia}</td>
                        <td>${h.lideranca}</td>
                        <td>${h.interesse}</td>
                        <td>${h.relacaoFamiliar}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : '<p class="muted">Nenhum herdeiro — use o stub ou evolua a Família.</p>'}
          </section>

          ${(suc.conflitos || []).length ? `
            <section class="section-block">
              <h2>Conflitos</h2>
              <ul class="kv-list">
                ${suc.conflitos.slice(0, 8).map((c) => `
                  <li><span>${CGL.Utils.escapeHtml(c.tipo)}</span>
                  <span class="muted">${CGL.Utils.escapeHtml(c.descricao || '')}</span></li>
                `).join('')}
              </ul>
            </section>
          ` : ''}
        </div>
      `;
      this._bindTabs(main);
      main.querySelector('#btn-heir-stub')?.addEventListener('click', () => {
        CGL.Holding.addHeirStub(state, {
          nome: CGL.Utils.pick(['Lucas', 'Julia', 'Pedro', 'Mariana']) + ' ' + (state.player.sobrenome || ''),
          idade: CGL.Utils.randomInt(16, 28)
        });
        this.render(main);
      });
      main.querySelectorAll('[data-plano]').forEach((btn) => {
        btn.addEventListener('click', () => {
          CGL.Holding.setSuccessionPlan(state, btn.dataset.plano);
          CGL.Events.notify('success', 'Sucessão', 'Plano atualizado.');
          this.render(main);
        });
      });
    },

    renderRanking(main) {
      const state = CGL.Game.getState();
      CGL.Holding._updateRanking(state);
      const ranking = state.holding.ranking || [];

      main.innerHTML = `
        <div class="screen holding-screen">
          <header class="screen-header">
            <h1>Ranking global de conglomerados</h1>
            <p class="muted">Receita, valor, países, funcionários, poder e reputação</p>
          </header>
          ${this._nav(main)}
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>#</th><th>Grupo</th><th>Valor</th><th>Receita/ano</th>
                  <th>Países</th><th>Func.</th><th>Poder</th><th>Rep.</th>
                </tr>
              </thead>
              <tbody>
                ${ranking.slice(0, 15).map((r) => `
                  <tr class="${r.isPlayer ? 'row-active' : ''}">
                    <td>${r.posicao}</td>
                    <td>${CGL.Utils.escapeHtml(r.nome)}${r.isPlayer ? ' ★' : ''}</td>
                    <td>${CGL.Utils.formatBRL(r.valorMercado, { compact: true })}</td>
                    <td>${CGL.Utils.formatBRL(r.receitaAnual, { compact: true })}</td>
                    <td>${r.paises}</td>
                    <td>${r.funcionarios}</td>
                    <td>${Math.round(r.poder)}</td>
                    <td>${Math.round(r.reputacao)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
      this._bindTabs(main);
    },

    /* ========== Modais ========== */

    openAttachModal() {
      const state = CGL.Game.getState();
      const holdings = CGL.Company.listHoldings(state);
      if (!holdings.length) {
        CGL.Events.notify('warning', 'Holding', 'Crie uma holding primeiro.');
        return;
      }
      const holdingId = this.selectedHoldingId || holdings[0].id;
      const candidates = CGL.Company.listPlayerCompanies(state).filter(
        (e) => e.id !== holdingId && !e.isHolding
      );
      const concorrentes = CGL.Company.listCompetitors(state).slice(0, 12);
      const opts = [...candidates, ...concorrentes];
      if (!opts.length) {
        CGL.Events.notify('warning', 'Anexar', 'Sem empresas disponíveis.');
        return;
      }
      CGL.UI.modal({
        title: 'Anexar empresa à holding',
        body: `
          <label class="field"><span>Empresa</span>
            <select id="attach-target">
              ${opts.map((e) => `
                <option value="${e.id}">${CGL.Utils.escapeHtml(e.nomeFantasia)}
                  ${e.concorrente ? '(mercado)' : ''}</option>
              `).join('')}
            </select>
          </label>
          <label class="field"><span>Participação (%)</span>
            <input type="number" id="attach-pct" value="100" min="10" max="100" />
          </label>
        `,
        confirmLabel: 'Anexar',
        onConfirm: () => {
          try {
            const tid = document.getElementById('attach-target').value;
            const pct = Number(document.getElementById('attach-pct').value) || 100;
            // Capitaliza holding se necessário
            const h = CGL.Company.getById(state, holdingId);
            const target = CGL.Company.getById(state, tid);
            const need = Math.round(CGL.Company.calcValuation(target, state) * (pct / 100) * 1.02);
            if ((h.caixa || 0) < need) {
              CGL.Finance.creditEmpresa(state, holdingId, need + 50000, {
                categoria: 'aporte',
                descricao: 'Aporte para aquisição'
              });
              h.caixa = (h.caixa || 0) + need + 50000;
            }
            CGL.Holding.attachCompany(state, holdingId, tid, pct);
            CGL.Events.notify('success', 'Árvore', 'Empresa anexada.');
            this.view = 'arvore';
            CGL.UI.refreshCurrentScreen();
          } catch (err) {
            CGL.Events.notify('error', 'Anexar', err.message);
          }
        }
      });
    },

    openSplitModal() {
      const state = CGL.Game.getState();
      const companies = CGL.Company.listPlayerCompanies(state).filter((e) => !e.isHolding);
      if (!companies.length) return;
      CGL.UI.modal({
        title: 'Cindir empresa',
        body: `
          <label class="field"><span>Empresa</span>
            <select id="split-src">
              ${companies.map((e) => `
                <option value="${e.id}">${CGL.Utils.escapeHtml(e.nomeFantasia)}</option>
              `).join('')}
            </select>
          </label>
          <label class="field"><span>Fração (0.2–0.5)</span>
            <input type="number" id="split-frac" value="0.4" min="0.2" max="0.5" step="0.05" />
          </label>
        `,
        confirmLabel: 'Cindir',
        onConfirm: () => {
          try {
            const id = document.getElementById('split-src').value;
            const frac = Number(document.getElementById('split-frac').value) || 0.4;
            CGL.Holding.splitCompany(state, id, {
              fracao: frac,
              holdingId: this.selectedHoldingId
            });
            CGL.Events.notify('success', 'Cisão', 'Spin-off criado.');
            CGL.UI.refreshCurrentScreen();
          } catch (err) {
            CGL.Events.notify('error', 'Cisão', err.message);
          }
        }
      });
    },

    openMergeModal() {
      const state = CGL.Game.getState();
      const companies = CGL.Company.listPlayerCompanies(state);
      if (companies.length < 2) {
        CGL.Events.notify('warning', 'Fusão', 'Precisa de ao menos duas empresas.');
        return;
      }
      CGL.UI.modal({
        title: 'Fundir empresas',
        body: `
          <label class="field"><span>Sobrevivente</span>
            <select id="merge-a">
              ${companies.map((e) => `
                <option value="${e.id}">${CGL.Utils.escapeHtml(e.nomeFantasia)}</option>
              `).join('')}
            </select>
          </label>
          <label class="field"><span>Absorvida</span>
            <select id="merge-b">
              ${companies.map((e) => `
                <option value="${e.id}">${CGL.Utils.escapeHtml(e.nomeFantasia)}</option>
              `).join('')}
            </select>
          </label>
        `,
        confirmLabel: 'Fundir',
        onConfirm: () => {
          try {
            const a = document.getElementById('merge-a').value;
            const b = document.getElementById('merge-b').value;
            if (a === b) throw new Error('Escolha empresas diferentes.');
            CGL.Holding.mergeUnderGroup(state, a, b);
            CGL.Events.notify('success', 'Fusão', 'Empresas fusionadas.');
            CGL.UI.refreshCurrentScreen();
          } catch (err) {
            CGL.Events.notify('error', 'Fusão', err.message);
          }
        }
      });
    }
  };

  global.CGL = global.CGL || {};
  global.CGL.HoldingUI = HoldingUI;
  global.CGL.ConglomeradoUI = HoldingUI;
})(typeof window !== 'undefined' ? window : globalThis);
