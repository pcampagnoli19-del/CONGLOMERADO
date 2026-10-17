/**
 * CONGLOMERADO — UI de Logística / Cadeia de suprimentos (Fase 10)
 */
(function (global) {
  'use strict';

  const LogisticsUI = {
    view: 'hub', // hub | empresa
    selectedId: null,
    empresaTab: 'cadeia', // cadeia | fornecedores | estoque | cds | frota | rotas | tech | historico

    render(main) {
      const state = CGL.Game.getState();
      if (!state?.player) return;
      CGL.Logistics.ensureLogistics(state);
      if (this.view === 'empresa' && this.selectedId) {
        this.renderEmpresa(main);
      } else {
        this.renderHub(main);
      }
    },

    renderHub(main) {
      const state = CGL.Game.getState();
      const sum = CGL.Logistics.dashboardSummary(state);
      const companies = CGL.Company.listPlayerCompanies(state);
      const eventos = (state.logistics.eventos || []).slice(0, 8);
      const ranking = (state.logistics.ranking || []).slice(0, 8);
      const frete = state.logistics.freteInternacional || {};

      main.innerHTML = `
        <div class="screen logistics-screen">
          <header class="screen-header row-between">
            <div>
              <h1>Logística</h1>
              <p class="muted">Cadeia de suprimentos, estoque, frota, CDs e distribuição.</p>
            </div>
          </header>

          <div class="dash-grid">
            ${CGL.UI.card('Eficiência média', `
              <div class="stat-gold">${sum.eficienciaMedia}</div>
              <p class="muted">Índice logístico do grupo</p>
            `)}
            ${CGL.UI.card('Estoque total', `
              <div class="stat-gold">${CGL.Utils.formatNumber(sum.estoqueTotal)}</div>
              <p class="muted">Unidades armazenadas</p>
            `)}
            ${CGL.UI.card('CDs / veículos', `
              <div class="stat-gold">${sum.cds} / ${sum.veiculos}</div>
              <p class="muted">Infraestrutura</p>
            `)}
            ${CGL.UI.card('Custo semanal', `
              <div class="stat-gold">${CGL.Utils.formatBRL(sum.custoSemanal, { compact: true })}</div>
              <p class="muted">Holding + frota + CDs</p>
            `)}
          </div>

          <p class="muted" style="margin:0.5rem 0 1rem">
            Frete internacional: índice ${Number(frete.indice || 1).toFixed(2)} ·
            seguro ${CGL.Utils.formatPercent(frete.seguro || 0.02)} ·
            stockouts acumulados: ${sum.stockouts}
          </p>

          <section class="section-block">
            <h2>Empresas</h2>
            ${companies.length ? `
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Fornecedor</th>
                      <th>Estoque</th>
                      <th>Eficiência</th>
                      <th>Modo frota</th>
                      <th>Custo/sem</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${companies.map((e) => {
                      CGL.Logistics.ensureCompanyLogistics(e, state);
                      CGL.Logistics.calcKpis(e, state);
                      const c = CGL.Logistics.getActiveContract(e);
                      const modo = CGL.Data.getFleetModeById(e.logistics.frota.modo);
                      return `
                        <tr>
                          <td><strong>${CGL.Utils.escapeHtml(e.nomeFantasia)}</strong></td>
                          <td>${c ? CGL.Utils.escapeHtml(c.nome) : '—'}</td>
                          <td>${e.logistics.estoque.unidades}/${e.logistics.estoque.maximo}</td>
                          <td>${e.logistics.eficienciaLogistica}</td>
                          <td>${CGL.Utils.escapeHtml(modo.nome)}</td>
                          <td>${CGL.Utils.formatBRL(e.logistics.custoSemanal || 0, { compact: true })}</td>
                          <td><button type="button" class="btn btn-sm btn-secondary" data-open="${e.id}">Abrir</button></td>
                        </tr>`;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            ` : `<p class="muted">Nenhuma empresa. Funde uma em Empresas para montar a cadeia.</p>`}
          </section>

          <div class="dash-grid">
            <section class="section-block">
              <h2>Ranking logístico</h2>
              ${ranking.length ? `
                <ul class="timeline">
                  ${ranking.map((r, i) => `
                    <li><strong>#${i + 1} ${CGL.Utils.escapeHtml(r.nome)}</strong>
                      — ef. ${r.eficiencia} · custo/un ${r.custoPorUnidade} · alcance ${r.alcance}</li>
                  `).join('')}
                </ul>
              ` : `<p class="muted">Sem dados ainda. Avance semanas.</p>`}
            </section>
            <section class="section-block">
              <h2>Riscos recentes</h2>
              ${eventos.length ? `
                <ul class="timeline">
                  ${eventos.map((ev) => `
                    <li><strong>${CGL.Utils.escapeHtml(ev.titulo || ev.tipo)}</strong>
                      <span class="muted"> · sem ${ev.semana}</span><br>
                      <span class="muted">${CGL.Utils.escapeHtml(ev.descricao || '')}</span></li>
                  `).join('')}
                </ul>
              ` : `<p class="muted">Nenhum evento logístico recente.</p>`}
            </section>
          </div>
        </div>
      `;

      main.querySelectorAll('[data-open]').forEach((btn) => {
        btn.onclick = () => {
          this.view = 'empresa';
          this.selectedId = btn.dataset.open;
          this.empresaTab = 'cadeia';
          this.render(main);
        };
      });
    },

    renderEmpresa(main) {
      const state = CGL.Game.getState();
      const empresa = CGL.Company.getById(state, this.selectedId);
      if (!empresa) {
        this.view = 'hub';
        this.renderHub(main);
        return;
      }
      CGL.Logistics.ensureCompanyLogistics(empresa, state);
      CGL.Logistics.calcKpis(empresa, state);
      const L = empresa.logistics;
      const k = L.kpis || {};
      const tabs = [
        { id: 'cadeia', label: 'Cadeia' },
        { id: 'fornecedores', label: 'Fornecedores' },
        { id: 'estoque', label: 'Estoque' },
        { id: 'cds', label: 'CDs' },
        { id: 'frota', label: 'Frota' },
        { id: 'rotas', label: 'Rotas' },
        { id: 'tech', label: 'Tech' },
        { id: 'historico', label: 'Histórico' }
      ];

      main.innerHTML = `
        <div class="screen logistics-screen">
          <header class="screen-header row-between">
            <div>
              <button type="button" class="btn btn-sm btn-ghost" id="log-back">← Voltar</button>
              <h1>${CGL.Utils.escapeHtml(empresa.nomeFantasia)}</h1>
              <p class="muted">Logística · eficiência ${L.eficienciaLogistica} ·
                produção ×${Number(L.fatorProducao || 1).toFixed(2)} ·
                distribuição ×${Number(L.fatorDistribuicao || 1).toFixed(2)}</p>
            </div>
          </header>

          <div class="dash-grid log-kpi-grid">
            ${CGL.UI.card('Custo/un', `<div class="stat-gold">${k.custoPorUnidade ?? '—'}</div>`)}
            ${CGL.UI.card('Prazo médio', `<div class="stat-gold">${k.prazoMedio ?? '—'} sem</div>`)}
            ${CGL.UI.card('Nível estoque', `<div class="stat-gold">${k.nivelEstoque ?? 0}%</div>`)}
            ${CGL.UI.card('Dependência', `<div class="stat-gold">${k.dependencia ?? 0}</div>`)}
          </div>

          <nav class="finance-tabs log-tabs" role="tablist">
            ${tabs.map((t) => `
              <button type="button" class="finance-tab ${this.empresaTab === t.id ? 'active' : ''}"
                data-tab="${t.id}">${t.label}</button>
            `).join('')}
          </nav>
          <div class="mkt-tab-body" id="log-tab-body"></div>
        </div>
      `;

      document.getElementById('log-back').onclick = () => {
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

      const body = document.getElementById('log-tab-body');
      if (this.empresaTab === 'cadeia') this._tabCadeia(body, empresa, state);
      else if (this.empresaTab === 'fornecedores') this._tabFornecedores(body, empresa, state);
      else if (this.empresaTab === 'estoque') this._tabEstoque(body, empresa, state);
      else if (this.empresaTab === 'cds') this._tabCds(body, empresa, state);
      else if (this.empresaTab === 'frota') this._tabFrota(body, empresa, state);
      else if (this.empresaTab === 'rotas') this._tabRotas(body, empresa, state);
      else if (this.empresaTab === 'tech') this._tabTech(body, empresa, state);
      else this._tabHistorico(body, empresa, state);
    },

    _tabCadeia(body, empresa, state) {
      CGL.Logistics._updateChainHealth(empresa);
      const etapas = empresa.logistics.cadeia.etapas || [];
      body.innerHTML = `
        <section class="section-block">
          <h2>Cadeia produtiva</h2>
          <p class="muted">Matéria-prima → fornecedor → produção → armazenamento → transporte → distribuição → cliente.</p>
          <div class="log-chain">
            ${etapas.map((e, i) => `
              <div class="log-stage ${e.gargalo ? 'bottleneck' : ''}">
                <div class="log-stage-name">${CGL.Utils.escapeHtml(e.nome)}</div>
                <div class="meter" style="width:100%"><div class="meter-fill" style="width:${e.saude}%"></div></div>
                <div class="muted">${e.saude}${e.gargalo ? ' · gargalo' : ''}</div>
              </div>
              ${i < etapas.length - 1 ? '<div class="log-chain-arrow">→</div>' : ''}
            `).join('')}
          </div>
        </section>
      `;
    },

    _tabFornecedores(body, empresa, state) {
      const ativo = CGL.Logistics.getActiveContract(empresa);
      const suppliers = CGL.Data.suppliers || [];
      body.innerHTML = `
        <section class="section-block">
          <h2>Fornecedor ativo</h2>
          ${ativo ? `
            <p><strong>${CGL.Utils.escapeHtml(ativo.nome)}</strong> (${ativo.tipo})
              · preço ×${ativo.preco} · qualidade ${ativo.qualidade}
              · lead ${ativo.leadTime} sem · confiabilidade ${ativo.confiabilidade}</p>
          ` : `<p class="muted">Nenhum contrato ativo.</p>`}
          ${empresa.logistics.integracaoVertical
            ? `<p class="muted">Integração vertical ativa (investimento ${CGL.Utils.formatBRL(empresa.logistics.investimentoVertical || 0)}).</p>`
            : `<button type="button" class="btn btn-secondary" id="log-vertical">Ativar integração vertical</button>`}
        </section>
        <section class="section-block">
          <h2>Catálogo</h2>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr><th>Nome</th><th>Tipo</th><th>Preço</th><th>Qual.</th><th>Lead</th><th>Conf.</th><th></th></tr>
              </thead>
              <tbody>
                ${suppliers.map((s) => {
                  const locked = s.tipo === 'proprio' && !empresa.logistics.integracaoVertical;
                  const selected = ativo?.supplierId === s.id;
                  return `
                    <tr class="${selected ? 'row-active' : ''}">
                      <td>${CGL.Utils.escapeHtml(s.nome)}
                        <br><span class="muted">${CGL.Utils.escapeHtml(s.descricao || '')}</span></td>
                      <td>${s.tipo}</td>
                      <td>×${s.preco}</td>
                      <td>${s.qualidade}</td>
                      <td>${s.leadTime}</td>
                      <td>${s.confiabilidade}</td>
                      <td>
                        ${selected ? 'Ativo' : `
                          <button type="button" class="btn btn-sm btn-primary" data-sup="${s.id}"
                            ${locked ? 'disabled' : ''}>Contratar</button>`}
                      </td>
                    </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </section>
      `;
      const vert = document.getElementById('log-vertical');
      if (vert) {
        vert.onclick = () => {
          CGL.UI.confirm('Integração vertical',
            'Investimento alto em produção própria de insumos. Continuar?',
            () => {
              try {
                CGL.Logistics.enableVerticalIntegration(empresa, state);
                CGL.Game.save(false);
                this.render(document.getElementById('main-content'));
              } catch (err) {
                CGL.Events.notify('error', 'Erro', err.message || String(err));
              }
            });
        };
      }
      body.querySelectorAll('[data-sup]').forEach((btn) => {
        btn.onclick = () => {
          try {
            CGL.Logistics.setSupplier(empresa, state, btn.dataset.sup);
            CGL.Game.save(false);
            this.render(document.getElementById('main-content'));
          } catch (err) {
            CGL.Events.notify('error', 'Fornecedor', err.message || String(err));
          }
        };
      });
    },

    _tabEstoque(body, empresa, state) {
      const est = empresa.logistics.estoque;
      const pedidos = (empresa.logistics.pedidos || []).filter((p) => p.status === 'transito');
      body.innerHTML = `
        <section class="section-block">
          <h2>Estoque</h2>
          <div class="dash-grid">
            ${CGL.UI.card('Saldo', `<div class="stat-gold">${est.unidades}</div><p class="muted">min ${est.minimo} · max ${est.maximo}</p>`)}
            ${CGL.UI.card('Holding', `<div class="stat-gold">${CGL.Utils.formatBRL(est.holdingPorUnidade)}/un</div>`)}
            ${CGL.UI.card('Validade', `<div class="stat-gold">${est.validadeSemanas} sem</div><p class="muted">idade média ${Math.round(est.idadeMedia)}</p>`)}
            ${CGL.UI.card('Stockouts', `<div class="stat-gold ${est.stockouts > 0 ? 'text-danger' : ''}">${est.stockouts}</div>`)}
          </div>
          <div class="form-row" style="margin-top:1rem;gap:0.5rem;flex-wrap:wrap;display:flex;align-items:end">
            <label>Pedir insumos
              <input type="number" id="log-order-qty" class="input" value="${Math.max(50, est.minimo)}" min="1" />
            </label>
            <button type="button" class="btn btn-primary" id="log-order">Encomendar</button>
            <label>Mover estoque (±)
              <input type="number" id="log-move-qty" class="input" value="50" />
            </label>
            <button type="button" class="btn btn-secondary" id="log-move">Movimentar</button>
          </div>
          <div class="form-row" style="margin-top:1rem;gap:0.5rem;flex-wrap:wrap;display:flex;align-items:end">
            <label>Mínimo <input type="number" id="log-min" class="input" value="${est.minimo}" /></label>
            <label>Máximo <input type="number" id="log-max" class="input" value="${est.maximo}" /></label>
            <button type="button" class="btn btn-ghost" id="log-policy">Salvar política</button>
          </div>
        </section>
        <section class="section-block">
          <h2>Pedidos em trânsito</h2>
          ${pedidos.length ? `
            <ul class="timeline">
              ${pedidos.map((p) => `
                <li>${p.quantidade} un. · chega em ${p.semanasRestantes} sem · ${CGL.Utils.formatBRL(p.custo)}</li>
              `).join('')}
            </ul>
          ` : `<p class="muted">Nenhum pedido em trânsito.</p>`}
        </section>
      `;
      document.getElementById('log-order').onclick = () => {
        const qty = Number(document.getElementById('log-order-qty').value);
        try {
          CGL.Logistics.orderMaterials(empresa, state, qty);
          CGL.Game.save(false);
          this.render(document.getElementById('main-content'));
        } catch (err) {
          CGL.Events.notify('error', 'Pedido', err.message || String(err));
        }
      };
      document.getElementById('log-move').onclick = () => {
        const d = Number(document.getElementById('log-move-qty').value);
        CGL.Logistics.moveStock(empresa, state, d, 'manual');
        CGL.Game.save(false);
        this.render(document.getElementById('main-content'));
      };
      document.getElementById('log-policy').onclick = () => {
        CGL.Logistics.updateInventoryPolicy(empresa, state, {
          minimo: Number(document.getElementById('log-min').value),
          maximo: Number(document.getElementById('log-max').value)
        });
        CGL.Game.save(false);
        CGL.Events.notify('success', 'Estoque', 'Política atualizada.');
        this.render(document.getElementById('main-content'));
      };
    },

    _tabCds(body, empresa, state) {
      const types = CGL.Data.cdTypes || [];
      const states = CGL.Data.states || [];
      const sede = empresa.estadoSede || 'SP';
      body.innerHTML = `
        <section class="section-block">
          <h2>Centros de distribuição</h2>
          ${(empresa.logistics.cds || []).length ? `
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Nome</th><th>UF</th><th>Capacidade</th><th>Opex/sem</th><th>Status</th></tr></thead>
                <tbody>
                  ${empresa.logistics.cds.map((cd) => `
                    <tr>
                      <td>${CGL.Utils.escapeHtml(cd.nome)}</td>
                      <td>${cd.uf}</td>
                      <td>${cd.capacidade}</td>
                      <td>${CGL.Utils.formatBRL(cd.opexSemanal)}</td>
                      <td>${cd.status}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `<p class="muted">Nenhum CD. Boa localização reduz custo de transporte.</p>`}
          <div class="form-row" style="margin-top:1rem;display:flex;gap:0.5rem;flex-wrap:wrap;align-items:end">
            <label>Tipo
              <select id="log-cd-type" class="input">
                ${types.map((t) => `<option value="${t.id}">${CGL.Utils.escapeHtml(t.nome)} — ${CGL.Utils.formatBRL(t.custo, { compact: true })}</option>`).join('')}
              </select>
            </label>
            <label>UF
              <select id="log-cd-uf" class="input">
                ${states.map((s) => `<option value="${s.uf}" ${s.uf === sede ? 'selected' : ''}>${s.uf} — ${CGL.Utils.escapeHtml(s.nome)}</option>`).join('')}
              </select>
            </label>
            <button type="button" class="btn btn-primary" id="log-cd-build">Construir</button>
          </div>
        </section>
      `;
      document.getElementById('log-cd-build').onclick = () => {
        try {
          CGL.Logistics.buildCD(
            empresa, state,
            document.getElementById('log-cd-type').value,
            document.getElementById('log-cd-uf').value
          );
          CGL.Game.save(false);
          this.render(document.getElementById('main-content'));
        } catch (err) {
          CGL.Events.notify('error', 'CD', err.message || String(err));
        }
      };
    },

    _tabFrota(body, empresa, state) {
      const modos = CGL.Data.fleetModes || [];
      const vtypes = CGL.Data.vehicleTypes || [];
      const frota = empresa.logistics.frota;
      body.innerHTML = `
        <section class="section-block">
          <h2>Modo de operação</h2>
          <div class="log-mode-row">
            ${modos.map((m) => `
              <button type="button" class="btn ${frota.modo === m.id ? 'btn-primary' : 'btn-secondary'} btn-sm"
                data-mode="${m.id}">${CGL.Utils.escapeHtml(m.nome)}</button>
            `).join('')}
          </div>
          <p class="muted" style="margin-top:0.5rem">${CGL.Utils.escapeHtml(CGL.Data.getFleetModeById(frota.modo).descricao || '')}</p>
          ${empresa.segmentoId === 'logistica' || empresa.logistics.ehTransportadora
            ? `<p class="muted">Transportadora do conglomerado ${empresa.logistics.ehTransportadora ? 'ativa' : 'disponível'}.</p>
               ${!empresa.logistics.ehTransportadora
                 ? `<button type="button" class="btn btn-secondary btn-sm" id="log-as-carrier">Ativar como transportadora</button>`
                 : `<p>Receita externa recente: ${CGL.Utils.formatBRL(empresa.logistics.clientesExternos || 0)}</p>`}`
            : ''}
        </section>
        <section class="section-block">
          <h2>Veículos (${frota.veiculos.length})</h2>
          ${frota.veiculos.length ? `
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Tipo</th><th>Cap.</th><th>Manutenção</th><th>Idade</th><th>Status</th></tr></thead>
                <tbody>
                  ${frota.veiculos.map((v) => `
                    <tr>
                      <td>${CGL.Utils.escapeHtml(v.nome)}</td>
                      <td>${v.capacidade}</td>
                      <td>${CGL.Utils.formatBRL(v.manutencao)}</td>
                      <td>${v.idade}/${v.vidaUtil}</td>
                      <td>${v.status}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `<p class="muted">Sem frota própria. Compre veículos ou use 3PL.</p>`}
          <div class="form-row" style="margin-top:1rem;display:flex;gap:0.5rem;flex-wrap:wrap;align-items:end">
            <label>Comprar
              <select id="log-veh" class="input">
                ${vtypes.map((v) => `<option value="${v.id}">${CGL.Utils.escapeHtml(v.nome)} — ${CGL.Utils.formatBRL(v.custo, { compact: true })}</option>`).join('')}
              </select>
            </label>
            <button type="button" class="btn btn-primary" id="log-buy-veh">Adquirir</button>
          </div>
        </section>
      `;
      body.querySelectorAll('[data-mode]').forEach((btn) => {
        btn.onclick = () => {
          CGL.Logistics.setFleetMode(empresa, state, btn.dataset.mode);
          CGL.Game.save(false);
          this.render(document.getElementById('main-content'));
        };
      });
      document.getElementById('log-buy-veh').onclick = () => {
        try {
          CGL.Logistics.buyVehicle(empresa, state, document.getElementById('log-veh').value);
          CGL.Game.save(false);
          this.render(document.getElementById('main-content'));
        } catch (err) {
          CGL.Events.notify('error', 'Frota', err.message || String(err));
        }
      };
      const carrier = document.getElementById('log-as-carrier');
      if (carrier) {
        carrier.onclick = () => {
          CGL.Logistics.enableAsLogisticsCompany(empresa, state);
          CGL.Game.save(false);
          this.render(document.getElementById('main-content'));
        };
      }
    },

    _tabRotas(body, empresa, state) {
      const states = CGL.Data.states || [];
      const ports = CGL.Data.ports || [];
      const sede = empresa.estadoSede || 'SP';
      body.innerHTML = `
        <section class="section-block">
          <h2>Rotas</h2>
          <p class="muted">Custo e tempo consideram estados, rodovias e infraestrutura regional.</p>
          ${(empresa.logistics.rotas || []).length ? `
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Origem</th><th>Destino</th><th>Dist.</th><th>Tempo</th><th>Custo/sem</th><th>Volume</th></tr></thead>
                <tbody>
                  ${empresa.logistics.rotas.map((r) => `
                    <tr>
                      <td>${r.origem}</td>
                      <td>${r.destino}</td>
                      <td>${r.distanciaIdx}</td>
                      <td>${r.tempoSemanas} sem</td>
                      <td>${CGL.Utils.formatBRL(r.custoSemanal)}</td>
                      <td>${r.volumeSemanal}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `<p class="muted">Nenhuma rota cadastrada.</p>`}
          <div class="form-row" style="margin-top:1rem;display:flex;gap:0.5rem;flex-wrap:wrap;align-items:end">
            <label>Origem
              <select id="log-r-from" class="input">
                ${states.map((s) => `<option value="${s.uf}" ${s.uf === sede ? 'selected' : ''}>${s.uf}</option>`).join('')}
              </select>
            </label>
            <label>Destino
              <select id="log-r-to" class="input">
                ${states.map((s) => `<option value="${s.uf}" ${s.uf === 'RJ' ? 'selected' : ''}>${s.uf}</option>`).join('')}
              </select>
            </label>
            <label>Porto (opc.)
              <select id="log-r-porto" class="input">
                <option value="">—</option>
                ${ports.map((p) => `<option value="${p.id}">${CGL.Utils.escapeHtml(p.nome)}</option>`).join('')}
              </select>
            </label>
            <button type="button" class="btn btn-primary" id="log-r-add">Criar rota</button>
          </div>
        </section>
        <section class="section-block">
          <h2>Hubs / portos</h2>
          <ul class="timeline">
            ${ports.map((p) => `
              <li><strong>${CGL.Utils.escapeHtml(p.nome)}</strong> (${p.uf}) —
                frete ×${p.custoFrete} · tempo base ${p.tempoBase} sem</li>
            `).join('')}
          </ul>
        </section>
      `;
      document.getElementById('log-r-add').onclick = () => {
        try {
          const porto = document.getElementById('log-r-porto').value || null;
          CGL.Logistics.createRoute(
            empresa, state,
            document.getElementById('log-r-from').value,
            document.getElementById('log-r-to').value,
            { portoId: porto }
          );
          CGL.Game.save(false);
          this.render(document.getElementById('main-content'));
        } catch (err) {
          CGL.Events.notify('error', 'Rota', err.message || String(err));
        }
      };
    },

    _tabTech(body, empresa, state) {
      const unlocked = new Set(empresa.logistics.techs || []);
      const avail = CGL.Logistics.availableTechs(empresa);
      const all = CGL.Data.logisticsTech || [];
      body.innerHTML = `
        <section class="section-block">
          <h2>Tecnologia logística</h2>
          <div class="rd-tech-grid">
            ${all.map((t) => {
              const done = unlocked.has(t.id);
              const open = avail.some((a) => a.id === t.id);
              const cls = done ? 'done' : open ? 'open' : 'locked';
              return `
                <div class="rd-tech ${cls}">
                  <strong>${CGL.Utils.escapeHtml(t.nome)}</strong>
                  <p class="muted">${CGL.Utils.formatBRL(t.custo, { compact: true })} · ~${t.semanas} sem</p>
                  ${done ? '<span class="muted">Investida</span>' : open
                    ? `<button type="button" class="btn btn-sm btn-primary" data-tech="${t.id}">Investir</button>`
                    : '<span class="muted">Bloqueada</span>'}
                </div>`;
            }).join('')}
          </div>
        </section>
      `;
      body.querySelectorAll('[data-tech]').forEach((btn) => {
        btn.onclick = () => {
          try {
            CGL.Logistics.investTech(empresa, state, btn.dataset.tech);
            CGL.Game.save(false);
            this.render(document.getElementById('main-content'));
          } catch (err) {
            CGL.Events.notify('error', 'Tech', err.message || String(err));
          }
        };
      });
    },

    _tabHistorico(body, empresa) {
      const hist = (empresa.logistics.historico || []).slice(0, 25);
      body.innerHTML = `
        <section class="section-block">
          <h2>Histórico logístico</h2>
          ${hist.length ? `
            <ul class="timeline">
              ${hist.map((h) => `
                <li><strong>${CGL.Utils.escapeHtml(h.titulo || h.tipo)}</strong>
                  <span class="muted"> · sem ${h.semana}</span><br>
                  <span class="muted">${CGL.Utils.escapeHtml(h.descricao || '')}</span></li>
              `).join('')}
            </ul>
          ` : `<p class="muted">Sem eventos ainda.</p>`}
        </section>
      `;
    }
  };

  global.CGL = global.CGL || {};
  global.CGL.LogisticsUI = LogisticsUI;
})(typeof window !== 'undefined' ? window : globalThis);
