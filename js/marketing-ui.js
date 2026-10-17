/**
 * CONGLOMERADO — UI de Marketing / Marca / Campanhas (Fase 8)
 */
(function (global) {
  'use strict';

  const MarketingUI = {
    view: 'hub', // hub | empresa
    selectedId: null,
    empresaTab: 'marca', // marca | campanhas | precos | canais | crm | crises | lancamentos | historico

    render(main) {
      const state = CGL.Game.getState();
      if (!state?.player) return;
      CGL.Marketing.ensureMarketing(state);
      if (this.view === 'empresa' && this.selectedId) {
        this.renderEmpresa(main);
      } else {
        this.renderHub(main);
      }
    },

    renderHub(main) {
      const state = CGL.Game.getState();
      const sum = CGL.Marketing.dashboardSummary(state);
      const companies = CGL.Company.listPlayerCompanies(state);
      const eventos = (state.marketing.eventos || []).slice(0, 8);
      const acoes = (state.marketing.acoesConcorrentes || []).slice(0, 6);

      main.innerHTML = `
        <div class="screen mkt-screen">
          <header class="screen-header row-between">
            <div>
              <h1>Marketing & Marca</h1>
              <p class="muted">Demanda real: marca, preço, qualidade, distribuição, ads e concorrência.</p>
            </div>
          </header>

          <div class="dash-grid">
            ${CGL.UI.card('Awareness médio', `
              <div class="stat-gold">${sum.awarenessMedia}</div>
              <p class="muted">${sum.empresas} empresa(s)</p>
            `)}
            ${CGL.UI.card('Valor de marca', `
              <div class="stat-gold">${CGL.Utils.formatBRL(sum.valorMarca, { compact: true })}</div>
              <p class="muted">Agregado do grupo</p>
            `)}
            ${CGL.UI.card('Campanhas ativas', `
              <div class="stat-gold">${sum.campanhasAtivas}</div>
              <p class="muted">Em andamento</p>
            `)}
            ${CGL.UI.card('Crises ativas', `
              <div class="stat-gold ${sum.crisesAtivas ? 'text-danger' : ''}">${sum.crisesAtivas}</div>
              <p class="muted">Requerem resposta</p>
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
                      <th>Posicionamento</th>
                      <th>Awareness</th>
                      <th>Demanda</th>
                      <th>Preço</th>
                      <th>Campanhas</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${companies.map((e) => {
                      CGL.Marketing.ensureCompanyMarketing(e, state);
                      const pos = CGL.Data.getBrandPositionById(e.marketing.marca.posicionamento);
                      const dem = e.marketing.demandaUltima?.fator ?? '—';
                      const price = CGL.Data.getPricingStrategyById(e.marketing.precificacao.estrategia);
                      const camps = e.marketing.campanhas.filter((c) => c.status === 'ativa').length;
                      return `
                        <tr>
                          <td><strong>${CGL.Utils.escapeHtml(e.nomeFantasia)}</strong></td>
                          <td>${CGL.Utils.escapeHtml(pos.nome)}</td>
                          <td>${Math.round(e.marketing.marca.awareness)}</td>
                          <td>${typeof dem === 'number' ? dem.toFixed(2) : dem}</td>
                          <td>${CGL.Utils.escapeHtml(price.nome)}</td>
                          <td>${camps}</td>
                          <td><button type="button" class="btn btn-sm btn-secondary" data-open="${e.id}">Abrir</button></td>
                        </tr>`;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            ` : `<p class="muted">Nenhuma empresa. Funde uma em Empresas para construir marca.</p>`}
          </section>

          <div class="dash-grid">
            <section class="section-block">
              <h2>Eventos de marketing</h2>
              ${eventos.length ? `
                <ul class="timeline">
                  ${eventos.map((ev) => `
                    <li>
                      <strong>Sem ${ev.semana}</strong> · ${CGL.Utils.escapeHtml(ev.empresaNome || '')}
                      — ${CGL.Utils.escapeHtml(ev.mensagem || ev.tipo)}
                    </li>
                  `).join('')}
                </ul>
              ` : `<p class="muted">Sem eventos ainda. Lance campanhas e avance semanas.</p>`}
            </section>
            <section class="section-block">
              <h2>Ações da concorrência</h2>
              ${acoes.length ? `
                <ul class="timeline">
                  ${acoes.map((a) => `
                    <li>
                      <strong>Sem ${a.semana}</strong> · ${CGL.Utils.escapeHtml(a.rivalNome || '')}
                      — ${CGL.Utils.escapeHtml(a.nome)}
                    </li>
                  `).join('')}
                </ul>
              ` : `<p class="muted">Nenhuma ação comercial recente dos rivais.</p>`}
            </section>
          </div>
        </div>
      `;

      main.querySelectorAll('[data-open]').forEach((btn) => {
        btn.onclick = () => {
          this.selectedId = btn.dataset.open;
          this.view = 'empresa';
          this.empresaTab = 'marca';
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
      CGL.Marketing.ensureCompanyMarketing(empresa, state);
      const m = empresa.marketing;
      const tabs = [
        { id: 'marca', label: 'Marca' },
        { id: 'campanhas', label: 'Campanhas' },
        { id: 'precos', label: 'Preços' },
        { id: 'canais', label: 'Canais & Dist.' },
        { id: 'crm', label: 'CRM' },
        { id: 'crises', label: 'Crises' },
        { id: 'lancamentos', label: 'Lançamentos' },
        { id: 'historico', label: 'Histórico' }
      ];

      let body = '';
      if (this.empresaTab === 'marca') body = this._tabMarca(empresa, state);
      else if (this.empresaTab === 'campanhas') body = this._tabCampanhas(empresa, state);
      else if (this.empresaTab === 'precos') body = this._tabPrecos(empresa);
      else if (this.empresaTab === 'canais') body = this._tabCanais(empresa);
      else if (this.empresaTab === 'crm') body = this._tabCrm(empresa);
      else if (this.empresaTab === 'crises') body = this._tabCrises(empresa);
      else if (this.empresaTab === 'lancamentos') body = this._tabLancamentos(empresa);
      else body = this._tabHistorico(empresa);

      const dem = m.demandaUltima;

      main.innerHTML = `
        <div class="screen mkt-screen">
          <header class="screen-header row-between">
            <div>
              <button type="button" class="btn btn-sm btn-secondary" id="mkt-back">← Grupo</button>
              <h1 style="margin-top:0.5rem">${CGL.Utils.escapeHtml(empresa.nomeFantasia)}</h1>
              <p class="muted">
                Demanda ×${dem?.fator?.toFixed?.(2) || '—'} ·
                custo mkt ${CGL.Utils.formatBRL(m.custoSemanal || 0, { compact: true })}/sem ·
                valor marca ${CGL.Utils.formatBRL(m.marca.valorMarca || 0, { compact: true })}
              </p>
            </div>
            <div class="btn-row">
              <button type="button" class="btn btn-primary" id="btn-new-campaign">Nova campanha</button>
              <button type="button" class="btn btn-secondary" id="btn-research">Pesquisar</button>
            </div>
          </header>

          <div class="finance-tabs">
            ${tabs.map((t) => `
              <button type="button" class="finance-tab ${this.empresaTab === t.id ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>
            `).join('')}
          </div>

          <div class="mkt-tab-body">${body}</div>
        </div>
      `;

      main.querySelector('#mkt-back').onclick = () => {
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
      main.querySelector('#btn-new-campaign').onclick = () => this.modalCampaign(empresa);
      main.querySelector('#btn-research').onclick = () => this.modalResearch(empresa);
      this._bindEmpresaActions(main, empresa, state);
    },

    _bindEmpresaActions(main, empresa, state) {
      const savePos = main.querySelector('#btn-save-pos');
      if (savePos) {
        savePos.onclick = () => {
          const id = main.querySelector('#pos-select')?.value;
          try {
            CGL.Marketing.setPositioning(empresa, state, id);
            CGL.Game.save(false);
            CGL.Events.notify('success', 'Marca', 'Posicionamento atualizado.');
            CGL.UI.refreshCurrentScreen();
          } catch (err) {
            CGL.Events.notify('error', 'Marca', err.message || String(err));
          }
        };
      }
      const savePrice = main.querySelector('#btn-save-price');
      if (savePrice) {
        savePrice.onclick = () => {
          const id = main.querySelector('#price-select')?.value;
          const desc = Number(main.querySelector('#price-desc')?.value || 0) / 100;
          try {
            CGL.Marketing.setPricing(empresa, state, id, {
              desconto: desc,
              semanas: desc > 0 ? 4 : 0
            });
            CGL.Game.save(false);
            CGL.Events.notify('success', 'Preço', 'Estratégia atualizada.');
            CGL.UI.refreshCurrentScreen();
          } catch (err) {
            CGL.Events.notify('error', 'Preço', err.message || String(err));
          }
        };
      }
      main.querySelectorAll('[data-dist]').forEach((input) => {
        input.onchange = () => {
          const nivel = Number(input.value) / 100;
          try {
            CGL.Marketing.setDistribution(empresa, state, input.dataset.dist, nivel);
            CGL.Game.save(false);
            CGL.UI.refreshCurrentScreen();
          } catch (err) {
            CGL.Events.notify('error', 'Distribuição', err.message || String(err));
          }
        };
      });
      const saveCrm = main.querySelector('#btn-save-crm');
      if (saveCrm) {
        saveCrm.onclick = () => {
          const n = Number(main.querySelector('#crm-level')?.value || 0);
          CGL.Marketing.setCrmLevel(empresa, state, n);
          CGL.Game.save(false);
          CGL.Events.notify('success', 'CRM', 'Nível atualizado.');
          CGL.UI.refreshCurrentScreen();
        };
      }
      main.querySelectorAll('[data-respond]').forEach((btn) => {
        btn.onclick = () => this.modalCrisisResponse(empresa, btn.dataset.respond);
      });
      const btnLaunch = main.querySelector('#btn-start-launch');
      if (btnLaunch) {
        btnLaunch.onclick = () => {
          const nome = main.querySelector('#launch-name')?.value || 'Novo produto';
          try {
            CGL.Marketing.startLaunch(empresa, state, nome);
            CGL.Game.save(false);
            CGL.Events.notify('success', 'Lançamento', 'Pipeline iniciado.');
            CGL.UI.refreshCurrentScreen();
          } catch (err) {
            CGL.Events.notify('error', 'Lançamento', err.message || String(err));
          }
        };
      }
      const btnInf = main.querySelector('#btn-hire-inf');
      if (btnInf) {
        btnInf.onclick = () => this.modalInfluencer(empresa);
      }
      const btnSpon = main.querySelector('#btn-sponsor');
      if (btnSpon) {
        btnSpon.onclick = () => this.modalSponsor(empresa);
      }
    },

    _meter(label, value) {
      const v = CGL.Utils.clamp(Math.round(value), 0, 100);
      return `
        <div class="mkt-meter">
          <div class="row-between"><span>${label}</span><strong>${v}</strong></div>
          <div class="mkt-bar"><span style="width:${v}%"></span></div>
        </div>`;
    },

    _tabMarca(empresa, state) {
      const b = empresa.marketing.marca;
      const dem = empresa.marketing.demandaUltima;
      const posList = CGL.Data.brandPositions;
      const insights = Object.keys(empresa.marketing.insights || {});
      return `
        <div class="dash-grid">
          ${CGL.UI.card('Indicadores de marca', `
            ${this._meter('Awareness', b.awareness)}
            ${this._meter('Reputação', b.reputacao)}
            ${this._meter('Confiança', b.confianca)}
            ${this._meter('Valor percebido', b.valorPercebido)}
            ${this._meter('Fidelidade', b.fidelidade)}
            <p class="muted" style="margin-top:0.5rem">Valor da marca: ${CGL.Utils.formatBRL(b.valorMarca || 0, { compact: true })}</p>
          `)}
          ${CGL.UI.card('Fatores de demanda', `
            ${dem?.fatores ? Object.entries(dem.fatores).map(([k, v]) =>
              `<div class="row-between"><span>${k}</span><span>×${v}</span></div>`
            ).join('') : '<p class="muted">Avance uma semana para calcular.</p>'}
            <p style="margin-top:0.75rem"><strong>Fator total ×${dem?.fator?.toFixed?.(2) || '—'}</strong></p>
          `)}
          ${CGL.UI.card('Posicionamento', `
            <label>Estratégia de marca
              <select id="pos-select">
                ${posList.map((p) => `
                  <option value="${p.id}" ${b.posicionamento === p.id ? 'selected' : ''}>${p.nome}</option>
                `).join('')}
              </select>
            </label>
            <button type="button" class="btn btn-primary btn-sm" id="btn-save-pos" style="margin-top:0.75rem">Aplicar</button>
            <p class="muted" style="margin-top:0.5rem">Cada posicionamento atrai segmentos diferentes (luxo, jovem, B2B…).</p>
          `)}
          ${CGL.UI.card('Insights de pesquisa', `
            ${insights.length
              ? `<ul>${insights.map((i) => `<li>${CGL.Utils.escapeHtml(i)}</li>`).join('')}</ul>`
              : '<p class="muted">Invista em pesquisas de mercado para desbloquear dados.</p>'}
            <button type="button" class="btn btn-secondary btn-sm" id="btn-hire-inf" style="margin-top:0.5rem">Contratar influenciador</button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-sponsor" style="margin-top:0.5rem">Patrocínio</button>
          `)}
        </div>
        <section class="section-block">
          <h2>Segmentos-alvo do posicionamento</h2>
          <div class="mkt-chips">
            ${(CGL.Data.getBrandPositionById(b.posicionamento).segmentos || []).map((sid) => {
              const s = CGL.Data.getConsumerSegmentById(sid);
              return `<span class="mkt-chip">${CGL.Utils.escapeHtml(s?.nome || sid)}</span>`;
            }).join('')}
          </div>
        </section>
      `;
    },

    _tabCampanhas(empresa) {
      const camps = empresa.marketing.campanhas || [];
      const infs = empresa.marketing.influenciadores || [];
      const spons = empresa.marketing.patrocinios || [];
      return `
        <div class="row-between" style="margin-bottom:0.75rem">
          <p class="muted">${camps.filter((c) => c.status === 'ativa').length} campanha(s) ativa(s)</p>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mensagem</th>
                <th>Canal</th>
                <th>Objetivo</th>
                <th>Orçamento/sem</th>
                <th>Restante</th>
                <th>Status</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              ${camps.length ? camps.slice(0, 20).map((c) => {
                const ch = CGL.Data.getAdChannelById(c.canalId);
                const g = CGL.Data.getCampaignGoalById(c.objetivoId);
                return `
                  <tr>
                    <td>${CGL.Utils.escapeHtml(c.mensagem)}</td>
                    <td>${CGL.Utils.escapeHtml(ch?.nome || c.canalId)}</td>
                    <td>${CGL.Utils.escapeHtml(g?.nome || c.objetivoId)}</td>
                    <td>${CGL.Utils.formatBRL(c.orcamentoSemanal, { compact: true })}</td>
                    <td>${c.semanasRestantes ?? '—'}</td>
                    <td>${c.status}</td>
                    <td>${c.resultado || '—'}</td>
                  </tr>`;
              }).join('') : `<tr><td colspan="7" class="muted">Nenhuma campanha. Use "Nova campanha".</td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="dash-grid" style="margin-top:1rem">
          ${CGL.UI.card('Influenciadores', `
            ${infs.length ? `<ul class="timeline">${infs.slice(0, 6).map((i) => `
              <li>${CGL.Utils.escapeHtml(i.nome)} · ${i.status} · ${CGL.Utils.formatBRL(i.custoSemanal, { compact: true })}/sem
              ${i.status === 'escandalo' ? ' <span class="text-danger">escândalo</span>' : ''}</li>
            `).join('')}</ul>` : '<p class="muted">Nenhum contrato.</p>'}
          `)}
          ${CGL.UI.card('Patrocínios', `
            ${spons.length ? `<ul class="timeline">${spons.slice(0, 6).map((p) => {
              const t = CGL.Data.getSponsorshipTypeById(p.tipoId);
              return `<li>${CGL.Utils.escapeHtml(t?.nome || p.tipoId)} · ${p.status} · ${p.semanasRestantes} sem</li>`;
            }).join('')}</ul>` : '<p class="muted">Nenhum patrocínio ativo.</p>'}
          `)}
        </div>
      `;
    },

    _tabPrecos(empresa) {
      const p = empresa.marketing.precificacao;
      const list = CGL.Data.pricingStrategies;
      return `
        ${CGL.UI.card('Estratégia de preços', `
          <label>Modelo
            <select id="price-select">
              ${list.map((s) => `
                <option value="${s.id}" ${p.estrategia === s.id ? 'selected' : ''}>${s.nome}</option>
              `).join('')}
            </select>
          </label>
          <label style="display:block;margin-top:0.75rem">Desconto promocional (%)
            <input type="number" id="price-desc" min="0" max="50" value="${Math.round((p.descontoAtivo || 0) * 100)}" />
          </label>
          <p class="muted">Índice atual: ${p.indicePreco} · afeta margem, volume e percepção.</p>
          <button type="button" class="btn btn-primary btn-sm" id="btn-save-price">Salvar preço</button>
        `)}
      `;
    },

    _tabCanais(empresa) {
      const d = empresa.marketing.distribuicao;
      const channels = CGL.Data.salesChannels;
      return `
        <p class="muted">Score de distribuição: <strong>${d.score}</strong> — B2C (lojas, e-commerce, apps, franquias) e B2B (corporativo, governo, distribuidores).</p>
        <div class="dash-grid">
          ${channels.map((ch) => {
            const val = Math.round((d[ch.id] || 0) * 100);
            return CGL.UI.card(ch.nome, `
              <p class="muted">${ch.tipo.toUpperCase()} · alcance base ${Math.round(ch.alcance * 100)}%</p>
              <label>Intensidade ${val}%
                <input type="range" min="0" max="100" value="${val}" data-dist="${ch.id}" />
              </label>
            `);
          }).join('')}
        </div>
      `;
    },

    _tabCrm(empresa) {
      const crm = empresa.marketing.crm;
      const levels = CGL.Data.crmLevels;
      const k = empresa.marketing.kpis || {};
      return `
        <div class="dash-grid">
          ${CGL.UI.card('Programa CRM / fidelidade', `
            <label>Nível
              <select id="crm-level">
                ${levels.map((l) => `
                  <option value="${l.id}" ${crm.nivel === l.id ? 'selected' : ''}>
                    ${l.nome} (${CGL.Utils.formatBRL(l.custoSem, { compact: true })}/sem)
                  </option>
                `).join('')}
              </select>
            </label>
            <button type="button" class="btn btn-primary btn-sm" id="btn-save-crm" style="margin-top:0.75rem">Aplicar</button>
          `)}
          ${CGL.UI.card('KPIs comerciais', `
            <div class="row-between"><span>Faturamento/sem</span><span>${CGL.Utils.formatBRL(k.faturamentoSemanal || 0, { compact: true })}</span></div>
            <div class="row-between"><span>Crescimento vendas</span><span>${k.crescimentoVendas ?? '—'}%</span></div>
            <div class="row-between"><span>Market share</span><span>${k.participacaoMercado ?? '—'}%</span></div>
            <div class="row-between"><span>CAC</span><span>${k.cac ?? '—'}</span></div>
            <div class="row-between"><span>Fidelização</span><span>${k.fidelizacao ?? '—'}</span></div>
            <div class="row-between"><span>Satisfação</span><span>${k.satisfacao ?? '—'}</span></div>
            <div class="row-between"><span>NPS</span><span>${crm.nps ?? '—'}</span></div>
            <div class="row-between"><span>Valor da marca</span><span>${CGL.Utils.formatBRL(k.valorMarca || 0, { compact: true })}</span></div>
          `)}
        </div>
      `;
    },

    _tabCrises(empresa) {
      const crises = empresa.marketing.crises || [];
      const ativas = crises.filter((c) => c.status === 'ativa');
      return `
        <p class="muted">${ativas.length} crise(s) ativa(s). Responda antes que a confiança desabe.</p>
        ${crises.length ? `
          <div class="dash-grid">
            ${crises.slice(0, 10).map((c) => CGL.UI.card(CGL.Utils.escapeHtml(c.nome), `
              <p>Status: <strong class="${c.status === 'ativa' ? 'text-danger' : ''}">${c.status}</strong></p>
              <p class="muted">Severidade restante: ${Math.round(c.severidadeRestante || 0)}</p>
              ${c.status === 'ativa' ? `
                <button type="button" class="btn btn-primary btn-sm" data-respond="${c.id}">Responder</button>
              ` : `<p class="muted">Resposta: ${c.respostaId || '—'}</p>`}
            `)).join('')}
          </div>
        ` : `<p class="muted">Nenhuma crise registrada. Campanhas ruins ou escândalos podem gerar uma.</p>`}
      `;
    },

    _tabLancamentos(empresa) {
      const list = empresa.marketing.lancamentos || [];
      return `
        <div class="row-between" style="margin-bottom:0.75rem;gap:0.5rem;flex-wrap:wrap">
          <label>Nome do produto
            <input type="text" id="launch-name" placeholder="Ex.: Linha Aurora" maxlength="60" />
          </label>
          <button type="button" class="btn btn-primary" id="btn-start-launch">Iniciar pipeline</button>
        </div>
        <p class="muted">Pesquisa → Desenvolvimento → Teste → Campanha → Lançamento → Avaliação.</p>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr><th>Produto</th><th>Estágio</th><th>Score</th><th>Status</th><th>Resultado</th></tr>
            </thead>
            <tbody>
              ${list.length ? list.map((l) => {
                const st = CGL.Data.getLaunchStageById(l.estagio);
                return `
                  <tr>
                    <td>${CGL.Utils.escapeHtml(l.nome)}</td>
                    <td>${CGL.Utils.escapeHtml(st?.nome || l.estagio)}</td>
                    <td>${Math.round(l.score)}</td>
                    <td>${l.status}</td>
                    <td>${l.resultado || '—'}</td>
                  </tr>`;
              }).join('') : `<tr><td colspan="5" class="muted">Nenhum lançamento no pipeline.</td></tr>`}
            </tbody>
          </table>
        </div>
      `;
    },

    _tabHistorico(empresa) {
      const h = empresa.marketing.historico || [];
      return h.length ? `
        <ul class="timeline">
          ${h.map((e) => `
            <li>
              <strong>Sem ${e.semana}</strong> · ${CGL.Utils.escapeHtml(e.titulo || e.tipo)}
              — ${CGL.Utils.escapeHtml(e.descricao || '')}
            </li>
          `).join('')}
        </ul>
      ` : `<p class="muted">Histórico vazio.</p>`;
    },

    /* ========== Modais ========== */

    modalCampaign(empresa) {
      const state = CGL.Game.getState();
      const channels = CGL.Data.adChannels;
      const goals = CGL.Data.campaignGoals;
      const segs = CGL.Data.consumerSegments;
      const body = `
        <div class="form-grid">
          <label>Canal
            <select id="mc-canal">
              ${channels.map((c) => `<option value="${c.id}">${c.nome} (base ${CGL.Utils.formatBRL(c.custoBase, { compact: true })})</option>`).join('')}
            </select>
          </label>
          <label>Objetivo
            <select id="mc-goal">
              ${goals.map((g) => `<option value="${g.id}">${g.nome}</option>`).join('')}
            </select>
          </label>
          <label>Público-alvo
            <select id="mc-publico">
              ${segs.map((s) => `<option value="${s.id}">${s.nome}</option>`).join('')}
            </select>
          </label>
          <label>Duração (semanas)
            <input type="number" id="mc-dur" min="1" max="26" value="4" />
          </label>
          <label>Orçamento total (R$)
            <input type="number" id="mc-orc" min="500" step="500" value="24000" />
          </label>
          <label>Mensagem
            <input type="text" id="mc-msg" maxlength="120" value="Escolha ${empresa.nomeFantasia}" />
          </label>
        </div>
        <p class="muted">Campanhas podem viralizar, fortalecer a marca — ou gerar backlash e crise.</p>
      `;
      CGL.UI.modal({
        title: 'Nova campanha',
        body,
        confirmLabel: 'Lançar campanha',
        onConfirm: () => {
          try {
            const root = document.querySelector('.modal-body') || document;
            CGL.Marketing.createCampaign(empresa, state, {
              canalId: document.getElementById('mc-canal')?.value,
              objetivoId: document.getElementById('mc-goal')?.value,
              publicoId: document.getElementById('mc-publico')?.value,
              duracao: Number(document.getElementById('mc-dur')?.value || 4),
              orcamento: Number(document.getElementById('mc-orc')?.value || 24000),
              mensagem: document.getElementById('mc-msg')?.value
            });
            CGL.Game.save(false);
            this.empresaTab = 'campanhas';
            CGL.UI.refreshCurrentScreen();
            return true;
          } catch (err) {
            CGL.Events.notify('error', 'Campanha', err.message || String(err));
            return false;
          }
        }
      });
    },

    modalResearch(empresa) {
      const state = CGL.Game.getState();
      const types = CGL.Data.researchTypes;
      const body = `
        <label>Tipo de pesquisa
          <select id="mr-tipo">
            ${types.map((t) => `
              <option value="${t.id}">${t.nome} — ${CGL.Utils.formatBRL(t.custo, { compact: true })} · ${t.semanas} sem</option>
            `).join('')}
          </select>
        </label>
      `;
      CGL.UI.modal({
        title: 'Pesquisa de mercado',
        body,
        confirmLabel: 'Investir',
        onConfirm: () => {
          try {
            CGL.Marketing.startResearch(empresa, state, document.getElementById('mr-tipo')?.value);
            CGL.Game.save(false);
            CGL.UI.refreshCurrentScreen();
            return true;
          } catch (err) {
            CGL.Events.notify('error', 'Pesquisa', err.message || String(err));
            return false;
          }
        }
      });
    },

    modalCrisisResponse(empresa, crisisId) {
      const state = CGL.Game.getState();
      const resps = CGL.Data.crisisResponses;
      const body = `
        <label>Resposta
          <select id="mcr-resp">
            ${resps.map((r) => `
              <option value="${r.id}">${r.nome}${r.custo ? ` (${CGL.Utils.formatBRL(r.custo, { compact: true })})` : ''}</option>
            `).join('')}
          </select>
        </label>
        <p class="muted">Ignorar é barato e arriscado. Recuperação de imagem custa caro e costuma funcionar.</p>
      `;
      CGL.UI.modal({
        title: 'Responder à crise',
        body,
        confirmLabel: 'Executar',
        onConfirm: () => {
          try {
            CGL.Marketing.respondCrisis(empresa, state, crisisId, document.getElementById('mcr-resp')?.value);
            CGL.Game.save(false);
            CGL.UI.refreshCurrentScreen();
            return true;
          } catch (err) {
            CGL.Events.notify('error', 'Crise', err.message || String(err));
            return false;
          }
        }
      });
    },

    modalInfluencer(empresa) {
      const state = CGL.Game.getState();
      const pool = CGL.Marketing.generateInfluencerPool(5);
      const body = `
        <label>Personalidade
          <select id="mi-inf">
            ${pool.map((p, i) => {
              const arch = CGL.Data.getInfluencerArchetypeById(p.archetypeId);
              return `<option value="${i}">${CGL.Utils.escapeHtml(p.nome)} · ${arch?.nome || ''} · ${CGL.Utils.formatBRL(p.custoSemanal, { compact: true })}/sem · risco ${Math.round((p.riscoEscandalo || 0) * 100)}%</option>`;
            }).join('')}
          </select>
        </label>
        <label>Duração (semanas)
          <input type="number" id="mi-sem" min="2" max="52" value="8" />
        </label>
      `;
      // Guarda pool no closure
      CGL.UI.modal({
        title: 'Contratar influenciador / celebridade',
        body,
        confirmLabel: 'Contratar',
        onConfirm: () => {
          try {
            const idx = Number(document.getElementById('mi-inf')?.value || 0);
            const sem = Number(document.getElementById('mi-sem')?.value || 8);
            CGL.Marketing.hireInfluencer(empresa, state, pool[idx], sem);
            CGL.Game.save(false);
            this.empresaTab = 'campanhas';
            CGL.UI.refreshCurrentScreen();
            return true;
          } catch (err) {
            CGL.Events.notify('error', 'Influenciador', err.message || String(err));
            return false;
          }
        }
      });
    },

    modalSponsor(empresa) {
      const state = CGL.Game.getState();
      const types = CGL.Data.sponsorshipTypes;
      const body = `
        <label>Tipo
          <select id="ms-tipo">
            ${types.map((t) => `
              <option value="${t.id}">${t.nome} — ${CGL.Utils.formatBRL(t.custoSemanal, { compact: true })}/sem · mín. ${t.duracaoMin} sem</option>
            `).join('')}
          </select>
        </label>
        <label>Duração (semanas)
          <input type="number" id="ms-sem" min="2" max="52" value="12" />
        </label>
      `;
      CGL.UI.modal({
        title: 'Patrocínio',
        body,
        confirmLabel: 'Contratar',
        onConfirm: () => {
          try {
            CGL.Marketing.startSponsorship(
              empresa,
              state,
              document.getElementById('ms-tipo')?.value,
              Number(document.getElementById('ms-sem')?.value || 12)
            );
            CGL.Game.save(false);
            this.empresaTab = 'campanhas';
            CGL.UI.refreshCurrentScreen();
            return true;
          } catch (err) {
            CGL.Events.notify('error', 'Patrocínio', err.message || String(err));
            return false;
          }
        }
      });
    }
  };

  global.CGL = global.CGL || {};
  global.CGL.MarketingUI = MarketingUI;
})(typeof window !== 'undefined' ? window : globalThis);
