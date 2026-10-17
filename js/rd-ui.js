/**
 * CONGLOMERADO — UI de P&D / Inovação (Fase 9)
 */
(function (global) {
  'use strict';

  const RdUI = {
    view: 'hub', // hub | empresa
    selectedId: null,
    empresaTab: 'dept', // dept | projetos | arvore | patentes | produtos | parcerias | historico

    render(main) {
      const state = CGL.Game.getState();
      if (!state?.player) return;
      CGL.Rd.ensureRd(state);
      if (this.view === 'empresa' && this.selectedId) {
        this.renderEmpresa(main);
      } else {
        this.renderHub(main);
      }
    },

    renderHub(main) {
      const state = CGL.Game.getState();
      const sum = CGL.Rd.dashboardSummary(state);
      const companies = CGL.Company.listPlayerCompanies(state);
      const eventos = (state.rd.eventos || []).slice(0, 8);
      const ranking = (state.rd.ranking || []).slice(0, 8);

      main.innerHTML = `
        <div class="screen rd-screen">
          <header class="screen-header row-between">
            <div>
              <h1>P&amp;D / Inovação</h1>
              <p class="muted">Tecnologia, patentes, ciclos de produto e vantagem competitiva.</p>
            </div>
          </header>

          <div class="dash-grid">
            ${CGL.UI.card('Índice de inovação', `
              <div class="stat-gold">${sum.inovacaoMedia}</div>
              <p class="muted">Média do grupo</p>
            `)}
            ${CGL.UI.card('Projetos ativos', `
              <div class="stat-gold">${sum.projetosAtivos}</div>
              <p class="muted">Em desenvolvimento</p>
            `)}
            ${CGL.UI.card('Patentes ativas', `
              <div class="stat-gold">${sum.patentesAtivas}</div>
              <p class="muted">Proteção temporária</p>
            `)}
            ${CGL.UI.card('Obsolescência média', `
              <div class="stat-gold ${sum.obsolescenciaMedia > 55 ? 'text-danger' : ''}">${sum.obsolescenciaMedia}</div>
              <p class="muted">Máquinas / processos</p>
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
                      <th>Setor tech</th>
                      <th>P&amp;D</th>
                      <th>Inovação</th>
                      <th>Nível tech</th>
                      <th>Obsolescência</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${companies.map((e) => {
                      CGL.Rd.ensureCompanyRd(e, state);
                      const sector = CGL.Data.getTechTree(CGL.Rd.sectorId(e));
                      return `
                        <tr>
                          <td><strong>${CGL.Utils.escapeHtml(e.nomeFantasia)}</strong></td>
                          <td>${CGL.Utils.escapeHtml(sector.nome)}</td>
                          <td>${e.rd.dept.ativo ? 'Ativo' : '—'}</td>
                          <td>${Math.round(e.rd.indiceInovacao)}</td>
                          <td>${Math.round(e.rd.dept.nivelTech)}</td>
                          <td>${Math.round(e.rd.obsolescencia)}</td>
                          <td><button type="button" class="btn btn-sm btn-secondary" data-open="${e.id}">Abrir</button></td>
                        </tr>`;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            ` : `<p class="muted">Nenhuma empresa. Funde uma em Empresas para investir em P&amp;D.</p>`}
          </section>

          <div class="dash-grid">
            <section class="section-block">
              <h2>Ranking de inovação</h2>
              ${ranking.length ? `
                <ul class="timeline">
                  ${ranking.map((r, i) => `
                    <li><strong>#${i + 1} ${CGL.Utils.escapeHtml(r.nome)}</strong>
                      — índice ${r.indice} · ${r.patentes} patentes · ${r.techs} techs</li>
                  `).join('')}
                </ul>
              ` : `<p class="muted">Sem dados ainda.</p>`}
            </section>
            <section class="section-block">
              <h2>Eventos tecnológicos</h2>
              ${eventos.length ? `
                <ul class="timeline">
                  ${eventos.map((ev) => `
                    <li><strong>${CGL.Utils.escapeHtml(ev.titulo || ev.tipo)}</strong>
                      <span class="muted"> · sem ${ev.semana}</span><br>
                      <span class="muted">${CGL.Utils.escapeHtml(ev.descricao || '')}</span></li>
                  `).join('')}
                </ul>
              ` : `<p class="muted">Nenhum evento recente.</p>`}
            </section>
          </div>
        </div>
      `;

      main.querySelectorAll('[data-open]').forEach((btn) => {
        btn.onclick = () => {
          this.selectedId = btn.dataset.open;
          this.view = 'empresa';
          this.empresaTab = 'dept';
          this.render(main);
        };
      });
    },

    renderEmpresa(main) {
      const state = CGL.Game.getState();
      const empresa = CGL.Company.getById
        ? CGL.Company.getById(state, this.selectedId)
        : (state.companies?.empresas || []).find((e) => e.id === this.selectedId);
      if (!empresa) {
        this.view = 'hub';
        this.renderHub(main);
        return;
      }
      CGL.Rd.ensureCompanyRd(empresa, state);
      CGL.Rd.calcInnovationIndex(empresa, state);
      const d = empresa.rd.dept;
      const tabs = [
        { id: 'dept', label: 'Departamento' },
        { id: 'projetos', label: 'Projetos' },
        { id: 'arvore', label: 'Árvore tech' },
        { id: 'patentes', label: 'Patentes' },
        { id: 'produtos', label: 'Produtos' },
        { id: 'parcerias', label: 'Parcerias' },
        { id: 'historico', label: 'Histórico' }
      ];

      main.innerHTML = `
        <div class="screen rd-screen">
          <header class="screen-header row-between">
            <div>
              <button type="button" class="btn btn-ghost btn-sm" id="btn-rd-back">← Hub P&amp;D</button>
              <h1>${CGL.Utils.escapeHtml(empresa.nomeFantasia)}</h1>
              <p class="muted">Inovação ${Math.round(empresa.rd.indiceInovacao)} ·
                Tech ${Math.round(d.nivelTech)} ·
                Obsolescência ${Math.round(empresa.rd.obsolescencia)} ·
                Custo ${CGL.Utils.formatBRL(CGL.Rd.weeklyRdCostEstimate(empresa), { compact: true })}/sem</p>
            </div>
          </header>

          <div class="finance-tabs" id="rd-tabs">
            ${tabs.map((t) => `
              <button type="button" class="finance-tab ${this.empresaTab === t.id ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>
            `).join('')}
          </div>
          <div id="rd-tab-body"></div>
        </div>
      `;

      main.querySelector('#btn-rd-back').onclick = () => {
        this.view = 'hub';
        this.selectedId = null;
        this.render(main);
      };
      main.querySelectorAll('#rd-tabs [data-tab]').forEach((btn) => {
        btn.onclick = () => {
          this.empresaTab = btn.dataset.tab;
          this.render(main);
        };
      });

      const body = main.querySelector('#rd-tab-body');
      if (this.empresaTab === 'dept') this._tabDept(body, empresa, state);
      else if (this.empresaTab === 'projetos') this._tabProjetos(body, empresa, state);
      else if (this.empresaTab === 'arvore') this._tabArvore(body, empresa, state);
      else if (this.empresaTab === 'patentes') this._tabPatentes(body, empresa, state);
      else if (this.empresaTab === 'produtos') this._tabProdutos(body, empresa, state);
      else if (this.empresaTab === 'parcerias') this._tabParcerias(body, empresa, state);
      else this._tabHistorico(body, empresa);
    },

    _tabDept(el, empresa, state) {
      const d = empresa.rd.dept;
      el.innerHTML = `
        <section class="section-block">
          <h2>Departamento de P&amp;D</h2>
          ${d.ativo ? `
            <div class="dash-grid">
              ${CGL.UI.card('Orçamento/sem', `<div class="stat-gold">${CGL.Utils.formatBRL(d.orcamentoSemanal, { compact: true })}</div>`)}
              ${CGL.UI.card('Pesquisadores', `<div class="stat-gold">${d.pesquisadores}</div>`)}
              ${CGL.UI.card('Diretores', `<div class="stat-gold">${d.diretores}</div>`)}
              ${CGL.UI.card('Eficiência lab', `<div class="stat-gold">${Math.round(d.eficiencia)}</div>`)}
              ${CGL.UI.card('Labs', `<div class="stat-gold">${d.laboratorios}</div>`)}
              ${CGL.UI.card('Ética', `<div class="stat-gold">${Math.round(d.etica)}</div>`)}
              ${CGL.UI.card('Cultura inovação', `<div class="stat-gold">${Math.round(d.culturaInovacao)}</div>`)}
              ${CGL.UI.card('Projetos máx.', `<div class="stat-gold">${d.maxProjetos}</div>`)}
            </div>
            <div class="actions-row" style="margin-top:1rem">
              <button type="button" class="btn btn-secondary" id="btn-rd-edit">Ajustar departamento</button>
              <button type="button" class="btn btn-secondary" id="btn-rd-spy">Espionagem industrial</button>
            </div>
            <p class="muted" style="margin-top:0.75rem">Obsolescência ${Math.round(empresa.rd.obsolescencia)} —
              redução de custo ${(empresa.rd.reducaoCusto * 100).toFixed(1)}% —
              boost demanda ${((empresa.rd.boostDemanda || 0) * 100).toFixed(1)}%</p>
          ` : `
            <p class="muted">Nenhum departamento ativo. Criar laboratórios e equipe de pesquisa.</p>
            <button type="button" class="btn btn-primary" id="btn-rd-activate">Criar departamento P&amp;D</button>
          `}
        </section>
      `;
      el.querySelector('#btn-rd-activate')?.addEventListener('click', () => this.modalActivate(empresa));
      el.querySelector('#btn-rd-edit')?.addEventListener('click', () => this.modalEditDept(empresa));
      el.querySelector('#btn-rd-spy')?.addEventListener('click', () => this.modalEspionage(empresa));
    },

    _tabProjetos(el, empresa, state) {
      const projetos = empresa.rd.projetos || [];
      el.innerHTML = `
        <section class="section-block">
          <div class="row-between">
            <h2>Projetos</h2>
            <button type="button" class="btn btn-primary" id="btn-rd-project" ${empresa.rd.dept.ativo ? '' : 'disabled'}>Novo projeto</button>
          </div>
          ${projetos.length ? `
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr><th>Tecnologia</th><th>Progresso</th><th>Semanas</th><th>Custo/sem</th><th>Status</th></tr>
                </thead>
                <tbody>
                  ${projetos.map((p) => `
                    <tr>
                      <td>${CGL.Utils.escapeHtml(p.nome)}</td>
                      <td>
                        <div class="meter"><div class="meter-fill" style="width:${Math.round(p.progresso)}%"></div></div>
                        ${Math.round(p.progresso)}%
                      </td>
                      <td>${p.semanasDecorridas || 0}/${p.semanasTotal}</td>
                      <td>${CGL.Utils.formatBRL(p.custoSemanal || 0, { compact: true })}</td>
                      <td>${CGL.Utils.escapeHtml(p.status)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `<p class="muted">Nenhum projeto. Inicie pesquisa na árvore tecnológica.</p>`}
        </section>
      `;
      el.querySelector('#btn-rd-project')?.addEventListener('click', () => this.modalProject(empresa));
    },

    _tabArvore(el, empresa) {
      const tree = CGL.Data.getTechTree(CGL.Rd.sectorId(empresa));
      const unlocked = new Set(empresa.rd.techsDesbloqueadas);
      const avail = new Set(CGL.Rd.availableTechs(empresa).map((t) => t.id));
      el.innerHTML = `
        <section class="section-block">
          <h2>Árvore — ${CGL.Utils.escapeHtml(tree.nome)}</h2>
          <div class="rd-tech-grid">
            ${tree.techs.map((t) => {
              const done = unlocked.has(t.id);
              const open = avail.has(t.id);
              const cls = done ? 'rd-tech done' : open ? 'rd-tech open' : 'rd-tech locked';
              return `
                <div class="${cls}">
                  <strong>${CGL.Utils.escapeHtml(t.nome)}</strong>
                  <p class="muted">${CGL.Utils.formatBRL(t.custo, { compact: true })} · ~${t.semanas} sem</p>
                  <p class="muted">${done ? 'Desbloqueada' : open ? 'Disponível' : 'Bloqueada'}</p>
                  ${open && empresa.rd.dept.ativo ? `
                    <button type="button" class="btn btn-sm btn-primary" data-start="${t.id}">Pesquisar</button>
                  ` : ''}
                </div>`;
            }).join('')}
          </div>
        </section>
      `;
      el.querySelectorAll('[data-start]').forEach((btn) => {
        btn.onclick = () => {
          try {
            CGL.Rd.startProject(empresa, CGL.Game.getState(), btn.dataset.start);
            CGL.UI.toast?.('Projeto iniciado') || CGL.Events?.notify?.('success', 'P&D', 'Projeto iniciado');
            CGL.Game.save(false);
            this.empresaTab = 'projetos';
            this.render(document.getElementById('main-content'));
          } catch (err) {
            CGL.Events?.notify?.('error', 'P&D', err.message || String(err));
          }
        };
      });
    },

    _tabPatentes(el, empresa, state) {
      const pats = empresa.rd.patentes || [];
      const market = (state.rd.patentesGlobais || []).filter(
        (p) => p.status === 'ativa' && p.empresaId !== empresa.id
      );
      el.innerHTML = `
        <section class="section-block">
          <div class="row-between">
            <h2>Suas patentes</h2>
            <button type="button" class="btn btn-secondary" id="btn-rd-patent">Registrar patente</button>
          </div>
          ${pats.length ? `
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Tech</th><th>Status</th><th>Semanas</th><th>Valor</th><th>Licenças</th></tr></thead>
                <tbody>
                  ${pats.map((p) => `
                    <tr>
                      <td>${CGL.Utils.escapeHtml(p.nome)}</td>
                      <td>${CGL.Utils.escapeHtml(p.status)}</td>
                      <td>${p.semanasRestantes ?? '—'}</td>
                      <td>${CGL.Utils.formatBRL(p.valorMercado || 0, { compact: true })}</td>
                      <td>${p.licencasAtivas || 0}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `<p class="muted">Nenhuma patente registrada.</p>`}
        </section>
        <section class="section-block">
          <h2>Mercado de licenças</h2>
          ${market.length ? `
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Tech</th><th>Titular</th><th>Valor</th><th></th></tr></thead>
                <tbody>
                  ${market.map((p) => {
                    const owner = (state.companies?.empresas || []).find((e) => e.id === p.empresaId);
                    return `
                      <tr>
                        <td>${CGL.Utils.escapeHtml(p.nome)}</td>
                        <td>${CGL.Utils.escapeHtml(owner?.nomeFantasia || '?')}</td>
                        <td>${CGL.Utils.formatBRL(p.valorMercado || 0, { compact: true })}</td>
                        <td class="btn-row">
                          <button type="button" class="btn btn-sm btn-primary" data-lic="${p.id}">Licenciar</button>
                          <button type="button" class="btn btn-sm btn-secondary" data-buy="${p.id}">Comprar</button>
                          <button type="button" class="btn btn-sm btn-danger" data-chal="${p.id}">Contestar</button>
                        </td>
                      </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          ` : `<p class="muted">Nenhuma patente de terceiros no mercado.</p>`}
        </section>
      `;
      el.querySelector('#btn-rd-patent')?.addEventListener('click', () => this.modalPatent(empresa));
      el.querySelectorAll('[data-lic]').forEach((btn) => {
        btn.onclick = () => {
          try {
            CGL.Rd.licenseTech(empresa, state, btn.dataset.lic);
            CGL.Events?.notify?.('success', 'Licença', 'Licença adquirida.');
            CGL.Game.save(false);
            this.render(document.getElementById('main-content'));
          } catch (err) {
            CGL.Events?.notify?.('error', 'Licença', err.message || String(err));
          }
        };
      });
      el.querySelectorAll('[data-buy]').forEach((btn) => {
        btn.onclick = () => {
          CGL.UI.confirm('Comprar patente?', 'Transferência definitiva por ~110% do valor de mercado.', () => {
            try {
              CGL.Rd.buyPatent(empresa, state, btn.dataset.buy);
              CGL.Game.save(false);
              this.render(document.getElementById('main-content'));
            } catch (err) {
              CGL.Events?.notify?.('error', 'Patente', err.message || String(err));
            }
          });
        };
      });
      el.querySelectorAll('[data-chal]').forEach((btn) => {
        btn.onclick = () => {
          try {
            CGL.Rd.challengePatent(empresa, state, btn.dataset.chal);
            CGL.Game.save(false);
            this.render(document.getElementById('main-content'));
          } catch (err) {
            CGL.Events?.notify?.('error', 'Contestação', err.message || String(err));
          }
        };
      });
    },

    _tabProdutos(el, empresa) {
      const prods = empresa.rd.produtos || [];
      el.innerHTML = `
        <section class="section-block">
          <div class="row-between">
            <h2>Produtos / gerações</h2>
            <button type="button" class="btn btn-primary" id="btn-rd-product">Lançar geração</button>
          </div>
          ${prods.length ? `
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Produto</th><th>Geração</th><th>Ciclo</th><th>Desempenho</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  ${prods.map((p) => `
                    <tr>
                      <td>${CGL.Utils.escapeHtml(p.nome)}</td>
                      <td>${p.geracao}</td>
                      <td>${CGL.Utils.escapeHtml(p.ciclo)}</td>
                      <td>${Math.round(p.desempenho)}</td>
                      <td>${CGL.Utils.escapeHtml(p.status)}</td>
                      <td>${p.status === 'ativo' ? `
                        <button type="button" class="btn btn-sm btn-ghost" data-disc="${p.id}">Descontinuar</button>
                      ` : ''}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `<p class="muted">Nenhum produto. Lance uma geração para iniciar o ciclo de vida.</p>`}
        </section>
      `;
      el.querySelector('#btn-rd-product')?.addEventListener('click', () => this.modalProduct(empresa));
      el.querySelectorAll('[data-disc]').forEach((btn) => {
        btn.onclick = () => {
          try {
            CGL.Rd.discontinueProduct(empresa, CGL.Game.getState(), btn.dataset.disc);
            CGL.Game.save(false);
            this.render(document.getElementById('main-content'));
          } catch (err) {
            CGL.Events?.notify?.('error', 'Produto', err.message || String(err));
          }
        };
      });
    },

    _tabParcerias(el, empresa) {
      const pars = empresa.rd.parcerias || [];
      el.innerHTML = `
        <section class="section-block">
          <div class="row-between">
            <h2>Parcerias estratégicas</h2>
            <button type="button" class="btn btn-primary" id="btn-rd-partner" ${empresa.rd.dept.ativo ? '' : 'disabled'}>Nova parceria</button>
          </div>
          ${pars.length ? `
            <ul class="timeline">
              ${pars.map((p) => `
                <li><strong>${CGL.Utils.escapeHtml(p.nome)}</strong> —
                  ${p.status} · ${p.semanasRestantes} sem ·
                  ${CGL.Utils.formatBRL(p.custoSemanal, { compact: true })}/sem</li>
              `).join('')}
            </ul>
          ` : `<p class="muted">Universidades, startups, governo e centros de pesquisa aceleram projetos.</p>`}
        </section>
      `;
      el.querySelector('#btn-rd-partner')?.addEventListener('click', () => this.modalPartnership(empresa));
    },

    _tabHistorico(el, empresa) {
      const hist = (empresa.rd.historico || []).slice(0, 30);
      el.innerHTML = `
        <section class="section-block">
          <h2>Histórico de inovação</h2>
          ${hist.length ? `
            <ul class="timeline">
              ${hist.map((h) => `
                <li><strong>${CGL.Utils.escapeHtml(h.titulo || h.tipo)}</strong>
                  <span class="muted"> · sem ${h.semana}</span><br>
                  <span class="muted">${CGL.Utils.escapeHtml(h.descricao || '')}</span></li>
              `).join('')}
            </ul>
          ` : `<p class="muted">Sem histórico.</p>`}
        </section>
      `;
    },

    /* ========== Modais ========== */

    modalActivate(empresa) {
      CGL.UI.modal({
        title: 'Criar departamento P&D',
        body: `
          <p class="muted">Setup inicial (~R$ 65 mil com 1 lab). Defina equipe e orçamento.</p>
          <label class="field"><span>Orçamento semanal (R$)</span>
            <input type="number" id="rd-orc" value="8000" min="0" step="1000" /></label>
          <label class="field"><span>Pesquisadores</span>
            <input type="number" id="rd-pesq" value="3" min="0" max="200" /></label>
          <label class="field"><span>Diretores</span>
            <input type="number" id="rd-dir" value="1" min="0" max="20" /></label>
          <label class="field"><span>Laboratórios</span>
            <input type="number" id="rd-lab" value="1" min="0" max="10" /></label>
        `,
        confirmLabel: 'Criar',
        onConfirm: () => {
          const state = CGL.Game.getState();
          try {
            CGL.Rd.activateDept(empresa, state, {
              orcamentoSemanal: Number(document.getElementById('rd-orc')?.value) || 0,
              pesquisadores: Number(document.getElementById('rd-pesq')?.value) || 0,
              diretores: Number(document.getElementById('rd-dir')?.value) || 0,
              laboratorios: Number(document.getElementById('rd-lab')?.value) || 0
            });
            CGL.Game.save(false);
            this.render(document.getElementById('main-content'));
          } catch (err) {
            CGL.Events?.notify?.('error', 'P&D', err.message || String(err));
            return false;
          }
        }
      });
    },

    modalEditDept(empresa) {
      const d = empresa.rd.dept;
      CGL.UI.modal({
        title: 'Ajustar P&D',
        body: `
          <label class="field"><span>Orçamento semanal</span>
            <input type="number" id="rd-orc" value="${d.orcamentoSemanal}" min="0" step="1000" /></label>
          <label class="field"><span>Pesquisadores</span>
            <input type="number" id="rd-pesq" value="${d.pesquisadores}" min="0" /></label>
          <label class="field"><span>Diretores</span>
            <input type="number" id="rd-dir" value="${d.diretores}" min="0" /></label>
          <label class="field"><span>Laboratórios</span>
            <input type="number" id="rd-lab" value="${d.laboratorios}" min="0" /></label>
          <label class="field"><span>Ética (0–100)</span>
            <input type="number" id="rd-etica" value="${Math.round(d.etica)}" min="0" max="100" /></label>
        `,
        confirmLabel: 'Salvar',
        onConfirm: () => {
          CGL.Rd.updateDept(empresa, CGL.Game.getState(), {
            orcamentoSemanal: Number(document.getElementById('rd-orc')?.value),
            pesquisadores: Number(document.getElementById('rd-pesq')?.value),
            diretores: Number(document.getElementById('rd-dir')?.value),
            laboratorios: Number(document.getElementById('rd-lab')?.value),
            etica: Number(document.getElementById('rd-etica')?.value)
          });
          CGL.Game.save(false);
          this.render(document.getElementById('main-content'));
        }
      });
    },

    modalProject(empresa) {
      const techs = CGL.Rd.availableTechs(empresa);
      if (!techs.length) {
        CGL.Events?.notify?.('info', 'P&D', 'Nenhuma tecnologia disponível (pré-requisitos ou tudo desbloqueado).');
        return;
      }
      CGL.UI.modal({
        title: 'Novo projeto de pesquisa',
        body: `
          <label class="field"><span>Tecnologia</span>
            <select id="rd-tech">
              ${techs.map((t) => `
                <option value="${t.id}">${CGL.Utils.escapeHtml(t.nome)}
                  — ${CGL.Utils.formatBRL(t.custo, { compact: true })} (~${t.semanas} sem)</option>
              `).join('')}
            </select>
          </label>
        `,
        confirmLabel: 'Iniciar',
        onConfirm: () => {
          try {
            const id = document.getElementById('rd-tech')?.value;
            CGL.Rd.startProject(empresa, CGL.Game.getState(), id);
            CGL.Game.save(false);
            this.empresaTab = 'projetos';
            this.render(document.getElementById('main-content'));
          } catch (err) {
            CGL.Events?.notify?.('error', 'Projeto', err.message || String(err));
            return false;
          }
        }
      });
    },

    modalPatent(empresa) {
      const candidates = empresa.rd.techsDesbloqueadas
        .filter((id) => !String(id).endsWith('_lic'))
        .filter((id) => !empresa.rd.patentes.some((p) => p.techId === id && p.status === 'ativa'))
        .map((id) => CGL.Data.getTechById(id))
        .filter(Boolean);
      if (!candidates.length) {
        CGL.Events?.notify?.('info', 'Patente', 'Desenvolva tecnologias novas antes de registrar.');
        return;
      }
      CGL.UI.modal({
        title: 'Registrar patente',
        body: `
          <label class="field"><span>Tecnologia</span>
            <select id="rd-pat-tech">
              ${candidates.map((t) => `
                <option value="${t.id}">${CGL.Utils.escapeHtml(t.nome)}</option>
              `).join('')}
            </select>
          </label>
          <p class="muted">Vantagem temporária (~2 anos). Custo ~12% do desenvolvimento.</p>
        `,
        confirmLabel: 'Registrar',
        onConfirm: () => {
          try {
            CGL.Rd.filePatent(empresa, CGL.Game.getState(), document.getElementById('rd-pat-tech')?.value);
            CGL.Game.save(false);
            this.render(document.getElementById('main-content'));
          } catch (err) {
            CGL.Events?.notify?.('error', 'Patente', err.message || String(err));
            return false;
          }
        }
      });
    },

    modalProduct(empresa) {
      CGL.UI.modal({
        title: 'Lançar geração de produto',
        body: `
          <label class="field"><span>Nome da família</span>
            <input type="text" id="rd-prod-nome" value="Linha Alpha" maxlength="40" /></label>
          <p class="muted">Gerações novas empurram as antigas para declínio. Integra com pipeline de marketing.</p>
        `,
        confirmLabel: 'Lançar',
        onConfirm: () => {
          try {
            CGL.Rd.launchProduct(empresa, CGL.Game.getState(), {
              nome: document.getElementById('rd-prod-nome')?.value || 'Produto'
            });
            CGL.Game.save(false);
            this.render(document.getElementById('main-content'));
          } catch (err) {
            CGL.Events?.notify?.('error', 'Produto', err.message || String(err));
            return false;
          }
        }
      });
    },

    modalPartnership(empresa) {
      const tipos = CGL.Data.partnershipTypes || [];
      CGL.UI.modal({
        title: 'Parceria estratégica',
        body: `
          <label class="field"><span>Parceiro</span>
            <select id="rd-part">
              ${tipos.map((t) => `
                <option value="${t.id}">${CGL.Utils.escapeHtml(t.nome)}
                  — ${CGL.Utils.formatBRL(t.custoSem, { compact: true })}/sem · accel ×${t.aceleracao}</option>
              `).join('')}
            </select>
          </label>
          <label class="field"><span>Duração (semanas)</span>
            <input type="number" id="rd-part-dur" value="12" min="4" max="52" /></label>
        `,
        confirmLabel: 'Fechar parceria',
        onConfirm: () => {
          try {
            CGL.Rd.startPartnership(
              empresa,
              CGL.Game.getState(),
              document.getElementById('rd-part')?.value,
              Number(document.getElementById('rd-part-dur')?.value) || 12
            );
            CGL.Game.save(false);
            this.render(document.getElementById('main-content'));
          } catch (err) {
            CGL.Events?.notify?.('error', 'Parceria', err.message || String(err));
            return false;
          }
        }
      });
    },

    modalEspionage(empresa) {
      const state = CGL.Game.getState();
      const rivals = (state.companies?.empresas || []).filter(
        (e) => e.ativa && e.id !== empresa.id && e.segmentoId === empresa.segmentoId
      );
      if (!rivals.length) {
        CGL.Events?.notify?.('info', 'Espionagem', 'Nenhum concorrente no segmento.');
        return;
      }
      CGL.UI.modal({
        title: 'Espionagem industrial',
        body: `
          <p class="muted">Risco de multa e dano reputacional. Ética atual: ${Math.round(empresa.rd.dept.etica)}.</p>
          <label class="field"><span>Alvo</span>
            <select id="rd-spy-target">
              ${rivals.map((r) => `
                <option value="${r.id}">${CGL.Utils.escapeHtml(r.nomeFantasia)}</option>
              `).join('')}
            </select>
          </label>
          <label class="field"><span>Intensidade</span>
            <select id="rd-spy-lvl">
              <option value="baixa">Baixa</option>
              <option value="media" selected>Média</option>
              <option value="alta">Alta</option>
            </select>
          </label>
        `,
        confirmLabel: 'Executar',
        onConfirm: () => {
          try {
            CGL.Rd.attemptEspionage(
              empresa,
              state,
              document.getElementById('rd-spy-target')?.value,
              document.getElementById('rd-spy-lvl')?.value
            );
            CGL.Game.save(false);
            this.render(document.getElementById('main-content'));
          } catch (err) {
            CGL.Events?.notify?.('error', 'Espionagem', err.message || String(err));
            return false;
          }
        }
      });
    }
  };

  global.CGL = global.CGL || {};
  global.CGL.RdUI = RdUI;
})(typeof window !== 'undefined' ? window : globalThis);
