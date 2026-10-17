/**
 * CONGLOMERADO — UI de RH / Funcionários / Cultura (Fase 7)
 */
(function (global) {
  'use strict';

  const HrUI = {
    view: 'hub', // hub | empresa | funcionario
    selectedId: null,
    empId: null,
    empresaTab: 'equipe', // equipe | candidatos | clima | cultura | beneficios | sindicatos | historico
    filterDept: 'all',
    filterStatus: 'ativos',

    render(main) {
      const state = CGL.Game.getState();
      if (!state?.player) return;
      CGL.Hr.ensureHr(state);
      if (this.view === 'funcionario' && this.selectedId && this.empId) {
        this.renderFuncionario(main);
      } else if (this.view === 'empresa' && this.selectedId) {
        this.renderEmpresa(main);
      } else {
        this.renderHub(main);
      }
    },

    renderHub(main) {
      const state = CGL.Game.getState();
      const sum = CGL.Hr.dashboardSummary(state);
      const companies = CGL.Company.listPlayerCompanies(state);
      const eventos = (state.hr.eventos || []).slice(0, 8);

      main.innerHTML = `
        <div class="screen hr-screen">
          <header class="screen-header row-between">
            <div>
              <h1>Funcionários</h1>
              <p class="muted">RH, clima organizacional e cultura — pessoas, não só headcount.</p>
            </div>
          </header>

          <div class="dash-grid">
            ${CGL.UI.card('Headcount do grupo', `
              <div class="stat-gold">${CGL.Utils.formatNumber(sum.headcount)}</div>
              <p class="muted">${sum.empresas} empresa(s)</p>
            `)}
            ${CGL.UI.card('Folha semanal', `
              <div class="stat-gold">${CGL.Utils.formatBRL(sum.folhaSemanal, { compact: true })}</div>
              <p class="muted">Salários + residual</p>
            `)}
            ${CGL.UI.card('Moral média', `
              <div class="stat-gold">${sum.moralMedia}</div>
              <p class="muted">Clima agregado</p>
            `)}
            ${CGL.UI.card('Talentos excepcionais', `
              <div class="stat-gold">${sum.talentos}</div>
              <p class="muted">Contratados na campanha</p>
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
                      <th>Equipe</th>
                      <th>Moral</th>
                      <th>Produtividade</th>
                      <th>Folha/sem</th>
                      <th>Sindicato</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${companies.map((e) => {
                      CGL.Hr.ensureCompanyHR(e, state);
                      const n = CGL.Hr.listActive(e).length;
                      const clima = e.hr.clima;
                      return `
                        <tr>
                          <td><strong>${CGL.Utils.escapeHtml(e.nomeFantasia)}</strong></td>
                          <td>${n}</td>
                          <td>${Math.round(clima.moral)}</td>
                          <td>${e.hr.produtividadeMedia || '—'}</td>
                          <td>${CGL.Utils.formatBRL(CGL.Hr.weeklyPayroll(e), { compact: true })}</td>
                          <td>${e.hr.sindicato?.greveAtiva ? '<span class="text-danger">Greve</span>' : (e.hr.sindicato?.presente ? 'Sim' : '—')}</td>
                          <td><button type="button" class="btn btn-sm btn-secondary" data-open="${e.id}">Abrir RH</button></td>
                        </tr>`;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            ` : `<p class="muted">Nenhuma empresa. Funde uma em Empresas para gerir pessoas.</p>`}
          </section>

          <section class="section-block">
            <h2>Eventos de RH recentes</h2>
            ${eventos.length ? `
              <ul class="timeline">
                ${eventos.map((ev) => `
                  <li>
                    <strong>Sem ${ev.semana}</strong> · ${CGL.Utils.escapeHtml(ev.empresaNome || '')}
                    — ${CGL.Utils.escapeHtml(ev.mensagem || ev.tipo)}
                  </li>
                `).join('')}
              </ul>
            ` : `<p class="muted">Sem eventos ainda. Avance semanas com equipe ativa.</p>`}
          </section>
        </div>
      `;

      main.querySelectorAll('[data-open]').forEach((btn) => {
        btn.onclick = () => {
          this.selectedId = btn.dataset.open;
          this.view = 'empresa';
          this.empresaTab = 'equipe';
          this.render(main);
        };
      });
    },

    renderEmpresa(main) {
      const state = CGL.Game.getState();
      const empresa = CGL.Company.getById?.(state, this.selectedId)
        || (state.companies?.empresas || []).find((e) => e.id === this.selectedId);
      if (!empresa) {
        this.view = 'hub';
        this.renderHub(main);
        return;
      }
      CGL.Hr.ensureCompanyHR(empresa, state);
      const tabs = [
        { id: 'equipe', label: 'Equipe' },
        { id: 'candidatos', label: 'Candidatos' },
        { id: 'clima', label: 'Clima' },
        { id: 'cultura', label: 'Cultura' },
        { id: 'beneficios', label: 'Benefícios' },
        { id: 'sindicatos', label: 'Sindicato' },
        { id: 'historico', label: 'Histórico' }
      ];

      let body = '';
      if (this.empresaTab === 'equipe') body = this._tabEquipe(empresa, state);
      else if (this.empresaTab === 'candidatos') body = this._tabCandidatos(empresa, state);
      else if (this.empresaTab === 'clima') body = this._tabClima(empresa);
      else if (this.empresaTab === 'cultura') body = this._tabCultura(empresa);
      else if (this.empresaTab === 'beneficios') body = this._tabBeneficios(empresa);
      else if (this.empresaTab === 'sindicatos') body = this._tabSindicato(empresa);
      else body = this._tabHistorico(empresa);

      main.innerHTML = `
        <div class="screen hr-screen">
          <header class="screen-header row-between">
            <div>
              <button type="button" class="btn btn-sm btn-secondary" id="hr-back">← Grupo</button>
              <h1 style="margin-top:0.5rem">${CGL.Utils.escapeHtml(empresa.nomeFantasia)}</h1>
              <p class="muted">RH · ${CGL.Hr.listActive(empresa).length} colaboradores · folha ${CGL.Utils.formatBRL(CGL.Hr.weeklyPayroll(empresa), { compact: true })}/sem</p>
            </div>
            <div class="btn-row">
              <button type="button" class="btn btn-primary" id="btn-hire">Contratar</button>
              <button type="button" class="btn btn-secondary" id="btn-fire">Demitir…</button>
            </div>
          </header>

          <div class="finance-tabs">
            ${tabs.map((t) => `
              <button type="button" class="finance-tab ${this.empresaTab === t.id ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>
            `).join('')}
          </div>

          <div class="hr-tab-body">${body}</div>
        </div>
      `;

      main.querySelector('#hr-back').onclick = () => {
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
      main.querySelector('#btn-hire').onclick = () => this.modalHire(empresa);
      main.querySelector('#btn-fire').onclick = () => this.modalFire(empresa);
      this._bindEmpresaActions(main, empresa, state);
    },

    _bindEmpresaActions(main, empresa, state) {
      main.querySelectorAll('[data-emp]').forEach((btn) => {
        btn.onclick = () => {
          this.empId = btn.dataset.emp;
          this.view = 'funcionario';
          CGL.UI.refreshCurrentScreen();
        };
      });
      main.querySelectorAll('[data-assess]').forEach((btn) => {
        btn.onclick = () => this.modalAssess(empresa, btn.dataset.assess);
      });
      main.querySelectorAll('[data-hire-cand]').forEach((btn) => {
        btn.onclick = () => {
          try {
            CGL.Hr.hireCandidate(empresa, state, btn.dataset.hireCand);
            CGL.Game.save(false);
            CGL.Events.notify('success', 'Contratação', 'Novo colaborador admitido.');
            this.empresaTab = 'equipe';
            CGL.UI.refreshCurrentScreen();
          } catch (err) {
            CGL.Events.notify('error', 'Contratação', err.message || String(err));
          }
        };
      });
      main.querySelectorAll('[data-reject]').forEach((btn) => {
        btn.onclick = () => {
          CGL.Hr.rejectCandidate(empresa, btn.dataset.reject);
          CGL.UI.refreshCurrentScreen();
        };
      });
      const saveCult = main.querySelector('#btn-save-culture');
      if (saveCult) {
        saveCult.onclick = () => {
          const ids = [...main.querySelectorAll('[name="cult"]:checked')].map((el) => el.value);
          const inten = Number(main.querySelector('#cult-inten')?.value || 50);
          CGL.Hr.setCulture(empresa, state, ids, inten);
          CGL.Game.save(false);
          CGL.Events.notify('success', 'Cultura', 'Valores organizacionais atualizados.');
          CGL.UI.refreshCurrentScreen();
        };
      }
      const saveBen = main.querySelector('#btn-save-benefits');
      if (saveBen) {
        saveBen.onclick = () => {
          const ids = [...main.querySelectorAll('[name="ben"]:checked')].map((el) => el.value);
          CGL.Hr.setBenefits(empresa, state, ids);
          CGL.Game.save(false);
          CGL.Events.notify('success', 'Benefícios', 'Pacote atualizado.');
          CGL.UI.refreshCurrentScreen();
        };
      }
      const filterDept = main.querySelector('#filter-dept');
      if (filterDept) {
        filterDept.onchange = () => {
          this.filterDept = filterDept.value;
          CGL.UI.refreshCurrentScreen();
        };
      }
    },

    _tabEquipe(empresa, state) {
      let list = CGL.Hr.listActive(empresa);
      if (this.filterDept !== 'all') {
        list = list.filter((f) => f.deptId === this.filterDept);
      }
      const depts = CGL.Data.departments || [];
      return `
        <div class="row-between" style="margin-bottom:0.75rem">
          <label>Departamento
            <select id="filter-dept">
              <option value="all">Todos</option>
              ${depts.map((d) => `<option value="${d.id}" ${this.filterDept === d.id ? 'selected' : ''}>${d.nome}</option>`).join('')}
            </select>
          </label>
          <p class="muted">${list.length} pessoa(s)</p>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Cargo</th>
                <th>Depto</th>
                <th>Salário</th>
                <th>Prod.</th>
                <th>Motiv.</th>
                <th>Estresse</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${list.length ? list.map((f) => {
                const role = CGL.Data.getRoleById(f.cargoId);
                const dept = CGL.Data.getDeptById(f.deptId);
                return `
                  <tr class="${f.burnout ? 'row-warn' : ''} ${f.exceptional ? 'row-talent' : ''}">
                    <td>${CGL.Utils.escapeHtml(f.nome)}${f.exceptional ? ' ★' : ''}</td>
                    <td>${CGL.Utils.escapeHtml(role?.nome || f.cargoId)}</td>
                    <td>${CGL.Utils.escapeHtml(dept?.nome || f.deptId)}</td>
                    <td>${CGL.Utils.formatBRL(f.salario, { compact: true })}</td>
                    <td>${f.produtividade}</td>
                    <td>${f.motivacao}</td>
                    <td class="${f.estresse >= 80 ? 'text-danger' : ''}">${f.estresse}</td>
                    <td>${f.status}${f.burnout ? ' · burnout' : ''}</td>
                    <td><button type="button" class="btn btn-sm btn-secondary" data-emp="${f.id}">Ficha</button></td>
                  </tr>`;
              }).join('') : `<tr><td colspan="9" class="muted">Nenhum colaborador. Use Contratar.</td></tr>`}
            </tbody>
          </table>
        </div>
      `;
    },

    _tabCandidatos(empresa) {
      const cands = empresa.hr.candidatos || [];
      return `
        <p class="muted">Informações ocultas até avaliações. Quanto mais testes, menor o risco.</p>
        ${cands.length ? `
          <div class="dash-grid">
            ${cands.map((c) => {
              const role = CGL.Data.getRoleById(c.cargoId);
              const nota = c.notaPercebida != null ? c.notaPercebida : '—';
              const tests = (c.avaliacoesFeitas || []).length;
              return CGL.UI.card(CGL.Utils.escapeHtml(c.nome), `
                <ul class="kv-list">
                  <li><span>Cargo alvo</span><span>${CGL.Utils.escapeHtml(role?.nome || '')}</span></li>
                  <li><span>Expectativa</span><span>${CGL.Utils.formatBRL(c.salarioExpectativa || c.salario)}</span></li>
                  <li><span>Canal</span><span>${CGL.Utils.escapeHtml(c.canalOrigem || '')}</span></li>
                  <li><span>Avaliações</span><span>${tests}</span></li>
                  <li><span>Nota percebida</span><span>${nota}</span></li>
                  <li><span>Traços</span><span>${(c.tracosRevelados || []).map((id) => CGL.Data.getTraitById(id)?.nome || id).join(', ') || '—'}</span></li>
                </ul>
                <div class="btn-row" style="margin-top:0.5rem">
                  <button type="button" class="btn btn-sm btn-secondary" data-assess="${c.id}">Avaliar</button>
                  <button type="button" class="btn btn-sm btn-primary" data-hire-cand="${c.id}">Contratar</button>
                  <button type="button" class="btn btn-sm" data-reject="${c.id}">Recusar</button>
                </div>
              `);
            }).join('')}
          </div>
        ` : `<p class="muted">Sem candidatos. Abra um processo em Contratar.</p>`}
      `;
    },

    _tabClima(empresa) {
      const c = empresa.hr.clima;
      return `
        <div class="dash-grid">
          ${CGL.UI.card('Indicadores de clima', `
            ${CGL.UI.progressBar('Moral', c.moral)}
            ${CGL.UI.progressBar('Engajamento', c.engajamento)}
            ${CGL.UI.progressBar('Confiança', c.confianca)}
            ${CGL.UI.progressBar('Cultura', c.cultura)}
            ${CGL.UI.progressBar('Comunicação', c.comunicacao)}
            ${CGL.UI.progressBar('Colaboração', c.colaboracao)}
          `)}
          ${CGL.UI.card('Impacto', `
            <ul class="kv-list">
              <li><span>Produtividade média</span><span>${empresa.hr.produtividadeMedia}</span></li>
              <li><span>Eficiência empresa</span><span>${Math.round(empresa.eficiencia || 0)}</span></li>
              <li><span>Folha semanal</span><span>${CGL.Utils.formatBRL(empresa.hr.folhaSemanal || 0)}</span></li>
              <li><span>Benefícios/sem</span><span>${CGL.Utils.formatBRL(empresa.hr.custoBeneficiosSemanal || 0)}</span></li>
            </ul>
            <p class="muted" style="margin-top:0.75rem">Clima afeta retenção, greves e eficiência operacional.</p>
          `)}
        </div>
      `;
    },

    _tabCultura(empresa) {
      const cult = empresa.hr.culturaOrg || { valores: [], intensidade: 50 };
      const values = CGL.Data.cultureValues || [];
      return `
        <p class="muted">Valores influenciam quem se candidata e o comportamento da equipe.</p>
        <div class="nature-grid">
          ${values.map((v) => `
            <label class="nature-card ${cult.valores.includes(v.id) ? 'selected' : ''}">
              <input type="checkbox" name="cult" value="${v.id}" ${cult.valores.includes(v.id) ? 'checked' : ''}/>
              <strong>${CGL.Utils.escapeHtml(v.nome)}</strong>
            </label>
          `).join('')}
        </div>
        <label style="display:block;margin:1rem 0">Intensidade cultural
          <input type="range" id="cult-inten" min="0" max="100" value="${cult.intensidade}"/>
          <span class="muted">${cult.intensidade}</span>
        </label>
        <button type="button" class="btn btn-primary" id="btn-save-culture">Salvar cultura</button>
      `;
    },

    _tabBeneficios(empresa) {
      const current = empresa.hr.beneficios || [];
      const bens = CGL.Data.benefits || [];
      const n = Math.max(1, CGL.Hr.listActive(empresa).length);
      return `
        <p class="muted">Benefícios elevam satisfação e custo operacional (estimado por colaborador/mês).</p>
        <div class="nature-grid">
          ${bens.map((b) => `
            <label class="nature-card ${current.includes(b.id) ? 'selected' : ''}">
              <input type="checkbox" name="ben" value="${b.id}" ${current.includes(b.id) ? 'checked' : ''}/>
              <strong>${CGL.Utils.escapeHtml(b.nome)}</strong>
              <p>+${b.satisfacao} sat · ${CGL.Utils.formatBRL(b.custoPorFunc)}/func</p>
            </label>
          `).join('')}
        </div>
        <p class="muted">Custo semanal estimado agora: ${CGL.Utils.formatBRL(CGL.Hr.benefitWeeklyCost(empresa))} (${n} func.)</p>
        <button type="button" class="btn btn-primary" id="btn-save-benefits">Salvar benefícios</button>
      `;
    },

    _tabSindicato(empresa) {
      const s = empresa.hr.sindicato;
      return `
        <div class="dash-grid">
          ${CGL.UI.card('Representação', `
            <ul class="kv-list">
              <li><span>Presente</span><span>${s.presente ? 'Sim' : 'Não'}</span></li>
              <li><span>Força</span><span>${s.forca}</span></li>
              <li><span>Satisfação</span><span>${Math.round(s.satisfacao)}</span></li>
              <li><span>Greve</span><span class="${s.greveAtiva ? 'text-danger' : ''}">${s.greveAtiva ? 'ATIVA' : 'Não'}</span></li>
              <li><span>Próx. dissídio</span><span>${s.proximoDissidio} sem.</span></li>
            </ul>
            <p class="muted" style="margin-top:0.75rem">Negociações coletivas, reajustes e greves surgem conforme clima e setor.</p>
          `)}
        </div>
      `;
    },

    _tabHistorico(empresa) {
      const hist = empresa.hr.historico || [];
      return hist.length ? `
        <ul class="timeline">
          ${hist.map((h) => `<li><strong>Sem ${h.semana}</strong> — ${CGL.Utils.escapeHtml(h.texto)}</li>`).join('')}
        </ul>
      ` : `<p class="muted">Sem histórico de RH.</p>`;
    },

    renderFuncionario(main) {
      const state = CGL.Game.getState();
      const empresa = (state.companies?.empresas || []).find((e) => e.id === this.selectedId);
      const emp = empresa ? CGL.Hr.getEmployee(empresa, this.empId) : null;
      if (!empresa || !emp) {
        this.view = 'empresa';
        this.renderEmpresa(main);
        return;
      }
      const role = CGL.Data.getRoleById(emp.cargoId);
      const dept = CGL.Data.getDeptById(emp.deptId);
      const edu = (CGL.Data.educationLevels || []).find((e) => e.id === emp.educacao);
      const traits = (emp.tracosRevelados || []).map((id) => CGL.Data.getTraitById(id)?.nome || id);

      main.innerHTML = `
        <div class="screen hr-screen">
          <header class="screen-header row-between">
            <div>
              <button type="button" class="btn btn-sm btn-secondary" id="emp-back">← Equipe</button>
              <h1 style="margin-top:0.5rem">${CGL.Utils.escapeHtml(emp.nome)}${emp.exceptional ? ' ★' : ''}</h1>
              <p class="muted">${CGL.Utils.escapeHtml(role?.nome || '')} · ${CGL.Utils.escapeHtml(dept?.nome || '')} · ${emp.status}</p>
            </div>
            <div class="btn-row">
              <button type="button" class="btn btn-secondary" id="btn-review">Avaliar desempenho</button>
              <button type="button" class="btn btn-secondary" id="btn-train">Treinar</button>
              <button type="button" class="btn btn-secondary" id="btn-promo">Promover</button>
              <button type="button" class="btn btn-danger" id="btn-term">Desligar</button>
            </div>
          </header>

          <div class="dash-grid">
            ${CGL.UI.card('Perfil', `
              <ul class="kv-list">
                <li><span>Idade</span><span>${emp.idade} anos</span></li>
                <li><span>Formação</span><span>${CGL.Utils.escapeHtml(edu?.nome || emp.educacao)}</span></li>
                <li><span>Experiência</span><span>${emp.experiencia} anos</span></li>
                <li><span>Salário</span><span>${CGL.Utils.formatBRL(emp.salario)}</span></li>
                <li><span>Tempo de casa</span><span>${emp.tenureSemanas} sem.</span></li>
                <li><span>Traços</span><span>${traits.join(', ') || '—'}</span></li>
              </ul>
            `)}
            ${CGL.UI.card('Atributos', `
              <div class="attr-readout">
                ${['produtividade','motivacao','lealdade','saude','estresse','lideranca','criatividade','inteligencia','etica','aprendizado','potencial'].map((k) => `
                  <div><span>${CGL.Utils.capitalize(k)}</span><strong>${emp[k]}</strong></div>
                `).join('')}
              </div>
            `)}
            ${CGL.UI.card('Última avaliação', emp.ultimaAvaliacao ? `
              <ul class="kv-list">
                <li><span>Nota</span><span>${emp.ultimaAvaliacao.nota}</span></li>
                <li><span>Metas</span><span>${emp.ultimaAvaliacao.metas}</span></li>
                <li><span>Qualidade</span><span>${emp.ultimaAvaliacao.qualidade}</span></li>
                <li><span>Semana</span><span>${emp.ultimaAvaliacao.semana}</span></li>
              </ul>
            ` : `<p class="muted">Ainda não avaliado.</p>`)}
          </div>
        </div>
      `;

      main.querySelector('#emp-back').onclick = () => {
        this.view = 'empresa';
        this.empId = null;
        this.empresaTab = 'equipe';
        CGL.UI.refreshCurrentScreen();
      };
      main.querySelector('#btn-review').onclick = () => {
        try {
          const r = CGL.Hr.performanceReview(empresa, state, emp.id);
          CGL.Game.save(false);
          CGL.Events.notify('success', 'Avaliação', `Nota ${r.nota}`);
          CGL.UI.refreshCurrentScreen();
        } catch (err) {
          CGL.Events.notify('error', 'Avaliação', err.message || String(err));
        }
      };
      main.querySelector('#btn-train').onclick = () => this.modalTrain(empresa, emp);
      main.querySelector('#btn-promo').onclick = () => {
        try {
          CGL.Hr.promote(empresa, state, emp.id);
          CGL.Game.save(false);
          CGL.UI.refreshCurrentScreen();
        } catch (err) {
          CGL.Events.notify('error', 'Promoção', err.message || String(err));
        }
      };
      main.querySelector('#btn-term').onclick = () => this.modalFire(empresa, emp.id);
    },

    /* ========== Modais ========== */

    modalHire(empresa) {
      const state = CGL.Game.getState();
      const channels = CGL.Data.recruitmentChannels.filter((c) => c.id !== 'aquisicao');
      const roles = CGL.Data.roles || [];
      const depts = CGL.Data.departments || [];
      CGL.UI.modal({
        title: 'Abrir recrutamento',
        wide: true,
        confirmLabel: 'Buscar candidatos',
        body: `
          <div class="form-grid">
            <label>Canal
              <select id="hire-channel">
                ${channels.map((c) => `<option value="${c.id}">${c.nome} (custo base ${CGL.Utils.formatBRL(c.custoBase)})</option>`).join('')}
              </select>
            </label>
            <label>Cargo
              <select id="hire-role">
                ${roles.map((r) => `<option value="${r.id}" ${r.id === 'analista_jr' ? 'selected' : ''}>${r.nome}</option>`).join('')}
              </select>
            </label>
            <label>Departamento
              <select id="hire-dept">
                ${depts.map((d) => `<option value="${d.id}">${d.nome}</option>`).join('')}
              </select>
            </label>
            <label>Qtd. candidatos
              <input type="number" id="hire-qty" min="1" max="8" value="3"/>
            </label>
          </div>
          <p class="muted">Candidatos entram com currículo parcial. Use avaliações antes de contratar.</p>
        `,
        onConfirm: () => {
          try {
            const channelId = document.getElementById('hire-channel').value;
            const roleId = document.getElementById('hire-role').value;
            const deptId = document.getElementById('hire-dept').value;
            const qty = Number(document.getElementById('hire-qty').value) || 3;
            CGL.Hr.openRecruitment(empresa, state, channelId, { roleId, deptId, qty });
            CGL.Game.save(false);
            this.empresaTab = 'candidatos';
            CGL.Events.notify('success', 'Recrutamento', 'Candidatos disponíveis.');
            CGL.UI.refreshCurrentScreen();
          } catch (err) {
            CGL.Events.notify('error', 'Recrutamento', err.message || String(err));
            return false;
          }
        }
      });
    },

    modalAssess(empresa, candidateId) {
      const state = CGL.Game.getState();
      const cand = (empresa.hr.candidatos || []).find((c) => c.id === candidateId);
      if (!cand) return;
      const types = CGL.Data.assessmentTypes || [];
      const done = cand.avaliacoesFeitas || [];
      CGL.UI.modal({
        title: `Avaliar — ${cand.nome}`,
        wide: true,
        confirmLabel: 'Aplicar',
        body: `
          <p class="muted">Já aplicados: ${done.length ? done.join(', ') : 'nenhum'}</p>
          <label>Tipo de avaliação
            <select id="assess-type">
              ${types.map((a) => `
                <option value="${a.id}" ${done.includes(a.id) ? 'disabled' : ''}>
                  ${a.nome} — ${CGL.Utils.formatBRL(a.custo)}${done.includes(a.id) ? ' (feito)' : ''}
                </option>
              `).join('')}
            </select>
          </label>
        `,
        onConfirm: () => {
          try {
            const id = document.getElementById('assess-type').value;
            CGL.Hr.runAssessment(empresa, state, candidateId, id);
            CGL.Game.save(false);
            CGL.Events.notify('success', 'Avaliação', 'Informações reveladas.');
            CGL.UI.refreshCurrentScreen();
          } catch (err) {
            CGL.Events.notify('error', 'Avaliação', err.message || String(err));
            return false;
          }
        }
      });
    },

    modalTrain(empresa, emp) {
      const state = CGL.Game.getState();
      const trains = CGL.Data.trainings || [];
      CGL.UI.modal({
        title: `Treinar — ${emp.nome}`,
        confirmLabel: 'Iniciar',
        body: `
          <label>Programa
            <select id="train-id">
              ${trains.map((t) => `
                <option value="${t.id}">${t.nome} — ${CGL.Utils.formatBRL(t.custo)} · ${t.semanas} sem.</option>
              `).join('')}
            </select>
          </label>
          <p class="muted">Durante o treinamento o colaborador fica fora da operação.</p>
        `,
        onConfirm: () => {
          try {
            CGL.Hr.startTraining(empresa, state, emp.id, document.getElementById('train-id').value);
            CGL.Game.save(false);
            CGL.Events.notify('success', 'Treinamento', 'Programa iniciado.');
            CGL.UI.refreshCurrentScreen();
          } catch (err) {
            CGL.Events.notify('error', 'Treinamento', err.message || String(err));
            return false;
          }
        }
      });
    },

    modalFire(empresa, preselectId) {
      const state = CGL.Game.getState();
      const list = CGL.Hr.listActive(empresa).filter((f) => f.status === 'ativo' || f.status === 'treinamento' || f.status === 'afastado');
      const types = CGL.Data.terminationTypes.filter((t) => t.id !== 'pedido' && t.id !== 'aposentadoria');
      CGL.UI.modal({
        title: 'Desligamento',
        wide: true,
        confirmLabel: 'Confirmar',
        body: `
          <label>Colaborador
            <select id="fire-emp">
              ${list.map((f) => `
                <option value="${f.id}" ${f.id === preselectId ? 'selected' : ''}>${CGL.Utils.escapeHtml(f.nome)} — ${CGL.Data.getRoleById(f.cargoId)?.nome || ''}</option>
              `).join('')}
            </select>
          </label>
          <label>Modalidade
            <select id="fire-tipo">
              ${types.map((t) => `<option value="${t.id}">${t.nome}</option>`).join('')}
            </select>
          </label>
          <p class="muted">Afeta moral, reputação e gera custo rescisório.</p>
        `,
        onConfirm: () => {
          try {
            const id = document.getElementById('fire-emp')?.value;
            const tipo = document.getElementById('fire-tipo')?.value || 'individual';
            if (!id) throw new Error('Selecione um colaborador.');
            const r = CGL.Hr.terminate(empresa, state, id, tipo);
            CGL.Game.save(false);
            CGL.Events.notify('info', 'Desligamento', `Rescisão ${CGL.Utils.formatBRL(r.rescisao)}`);
            this.view = 'empresa';
            this.empId = null;
            CGL.UI.refreshCurrentScreen();
          } catch (err) {
            CGL.Events.notify('error', 'Desligamento', err.message || String(err));
            return false;
          }
        }
      });
    }
  };

  global.CGL = global.CGL || {};
  global.CGL.HrUI = HrUI;
})(typeof window !== 'undefined' ? window : globalThis);
