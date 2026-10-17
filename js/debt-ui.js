/**
 * CONGLOMERADO — UI Endividamento / Agenda financeira (Fase 6)
 * Painéis sob Finanças: perfil, dashboard de dívida, captações, agenda, eventos.
 */
(function (global) {
  'use strict';

  const DebtUI = {
    /** Renderiza abas Endividamento ou Agenda no corpo da ficha financeira */
    renderEndividamento(el, empresa, state) {
      CGL.Debt.ensureCompanyDebt(empresa, state);
      CGL.Debt.ensureDebt(state);
      const perfil = CGL.Debt.financialProfile(empresa, state);
      const dash = CGL.Debt.debtDashboard(empresa, state);
      const fin = empresa.finance;
      const venc = Object.entries(dash.perfilVencimentos || {});

      el.innerHTML = `
        <div class="actions-row section-block">
          <button type="button" class="btn btn-primary" id="btn-d-loan">Empréstimo (modalidades)</button>
          <button type="button" class="btn btn-secondary" id="btn-d-deb">Debêntures</button>
          <button type="button" class="btn btn-secondary" id="btn-d-note">Nota / CP</button>
          <button type="button" class="btn btn-secondary" id="btn-d-sup">Fornecedor</button>
          <button type="button" class="btn btn-secondary" id="btn-d-ic">Intercompany</button>
          <button type="button" class="btn btn-secondary" id="btn-d-lease">Leasing</button>
          <button type="button" class="btn btn-secondary" id="btn-d-proj">Project finance</button>
        </div>

        <section class="section-block">
          <h2>Perfil financeiro</h2>
          <div class="dash-grid">
            ${CGL.UI.card('Liquidez', `<div class="stat-gold">${(perfil.liquidez || 0).toFixed(2)}x</div>`)}
            ${CGL.UI.card('Endividamento', `<div class="stat-gold">${((perfil.endividamento || 0) * 100).toFixed(0)}%</div>`)}
            ${CGL.UI.card('Histórico de crédito', `<div class="stat-gold">${perfil.historicoCredito}</div>`)}
            ${CGL.UI.card('Capacidade de pagamento', `<div class="stat-gold">${perfil.capacidadePagamento}</div>`)}
            ${CGL.UI.card('Nível de risco', `<div class="stat-gold">${perfil.nivelRisco}</div><p class="muted">Rating ${CGL.Utils.escapeHtml(perfil.rating)}</p>`)}
            ${CGL.UI.card('Geração de caixa', `<div class="stat-gold">${CGL.Utils.formatBRL(perfil.geracaoCaixa, { compact: true })}</div>`)}
          </div>
        </section>

        <section class="section-block">
          <h2>Painel de endividamento</h2>
          <div class="dash-grid">
            ${CGL.UI.card('Dívida total', `<div class="stat-gold">${CGL.Utils.formatBRL(dash.dividaTotal, { compact: true })}</div>`)}
            ${CGL.UI.card('Curto prazo', `<div class="stat-gold">${CGL.Utils.formatBRL(dash.dividaCurtoPrazo, { compact: true })}</div>`)}
            ${CGL.UI.card('Longo prazo', `<div class="stat-gold">${CGL.Utils.formatBRL(dash.dividaLongoPrazo, { compact: true })}</div>`)}
            ${CGL.UI.card('Dívida líquida', `<div class="stat-gold">${CGL.Utils.formatBRL(dash.dividaLiquida, { compact: true })}</div><p class="muted">Caixa ${CGL.Utils.formatBRL(dash.caixaDisponivel, { compact: true })}</p>`)}
            ${CGL.UI.card('Alavancagem', `<div class="stat-gold">${dash.alavancagem.toFixed(2)}x</div><p class="muted">Dívida / PL</p>`)}
            ${CGL.UI.card('Cobertura de juros', `<div class="stat-gold">${dash.coberturaJuros >= 99 ? '∞' : dash.coberturaJuros.toFixed(1) + 'x'}</div>`)}
          </div>
          ${venc.length ? `
            <h3 style="margin-top:1rem">Perfil de vencimentos</h3>
            <ul class="kv-list">
              ${venc.map(([k, v]) => `<li><span>${CGL.Utils.escapeHtml(k)}</span><span>${CGL.Utils.formatBRL(v, { compact: true })}</span></li>`).join('')}
            </ul>
          ` : ''}
        </section>

        <section class="section-block">
          <h2>Contratos bancários</h2>
          ${(fin.emprestimos || []).filter((l) => l.status === 'ativo' || l.status === 'atraso').length ? `
            <table class="data-table">
              <thead>
                <tr>
                  <th>Modalidade</th><th>Principal</th><th>Saldo</th><th>Taxa/sem</th>
                  <th>Amort.</th><th>Parcela</th><th>Garantias</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                ${fin.emprestimos.filter((l) => l.status === 'ativo' || l.status === 'atraso').map((l) => {
                  const pur = CGL.Data.getLoanPurposeById(l.finalidadeId);
                  const am = CGL.Data.getAmortizationById(l.amortizacao || 'price');
                  return `<tr>
                    <td>${CGL.Utils.escapeHtml(pur?.nome || l.modalidade || '—')}</td>
                    <td>${CGL.Utils.formatBRL(l.principal || l.valorOriginal)}</td>
                    <td>${CGL.Utils.formatBRL(l.saldo)}</td>
                    <td>${((l.taxaSemanal || 0) * 100).toFixed(3)}%</td>
                    <td>${CGL.Utils.escapeHtml(am?.nome || l.amortizacao || '—')}</td>
                    <td>${CGL.Utils.formatBRL(l.parcela)}</td>
                    <td>${(l.garantias || []).length}</td>
                    <td>${l.status}${l.carenciaSem ? ` · carência ${l.carenciaSem}s` : ''}</td>
                    <td><button type="button" class="btn btn-sm btn-ghost" data-reno6="${l.id}">Renegociar</button></td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          ` : '<p class="muted">Nenhum empréstimo ativo.</p>'}
        </section>

        ${this._blockList('Debêntures', (fin.debentures || []).filter((d) => d.status === 'ativa' || d.status === 'default'), (d) =>
          `${d.tipo}${d.conversivel ? ' (conv.)' : ''} · captado ${CGL.Utils.formatBRL(d.captado)} · apetite ${d.apetite != null ? (d.apetite * 100).toFixed(0) + '%' : '—'} · ${d.status}`)}
        ${this._blockList('Notas / CP', fin.notasPromissorias || [], (n) =>
          `${n.tipo} · ${CGL.Utils.formatBRL(n.saldo)} · ${n.semanasRestantes}s · ${n.status}`)}
        ${this._blockList('Fornecedores', fin.creditoFornecedor || [], (c) =>
          `${CGL.Utils.escapeHtml(c.fornecedor)} · ${CGL.Utils.formatBRL(c.saldo)} · ${c.status}`)}
        ${this._blockList('Intercompany', fin.creditoIntercompany || [], (c) =>
          `${c.papel} · ${CGL.Utils.formatBRL(c.saldo)} · ${c.status}`)}
        ${this._blockList('Leasing', fin.leasings || [], (l) =>
          `${l.tipoLeasing} ${CGL.Utils.escapeHtml(l.ativoNome)} · parcela ${CGL.Utils.formatBRL(l.parcela)} · ${l.status}`)}
        ${this._blockList('Project finance', fin.projectFinance || [], (p) =>
          `${CGL.Utils.escapeHtml(p.nome)} · ${p.fase} · dívida ${CGL.Utils.formatBRL(p.saldoDivida)} · ${p.status}`)}

        <section class="section-block">
          <h2>Covenants</h2>
          ${(fin.covenantsAtivos || []).length ? `
            <ul>${fin.covenantsAtivos.map((c) => `
              <li class="${c.status === 'violado' ? 'text-danger' : ''}">
                ${CGL.Utils.escapeHtml(c.nome)} · limite ${c.limite} · <strong>${c.status}</strong>
              </li>`).join('')}</ul>
          ` : '<p class="muted">Nenhum covenant ativo.</p>'}
        </section>

        ${this._ofertasHtml(state, empresa)}
      `;

      el.querySelector('#btn-d-loan').onclick = () => this._modalLoan(empresa.id);
      el.querySelector('#btn-d-deb').onclick = () => this._modalDeb(empresa.id);
      el.querySelector('#btn-d-note').onclick = () => this._modalNote(empresa.id);
      el.querySelector('#btn-d-sup').onclick = () => this._modalSupplier(empresa.id);
      el.querySelector('#btn-d-ic').onclick = () => this._modalIntercompany(empresa.id);
      el.querySelector('#btn-d-lease').onclick = () => this._modalLease(empresa.id);
      el.querySelector('#btn-d-proj').onclick = () => this._modalProject(empresa.id);
      el.querySelectorAll('[data-reno6]').forEach((btn) => {
        btn.onclick = () => this._modalRenegotiate(empresa.id, btn.dataset.reno6);
      });
      el.querySelectorAll('[data-refi]').forEach((btn) => {
        btn.onclick = () => {
          try {
            CGL.Debt.acceptRefiOffer(state, btn.dataset.refi);
            CGL.Game.save(false);
            CGL.Events.notify('success', 'Refi', 'Taxa reduzida.');
            CGL.FinanceUI.render(document.getElementById('main-content'));
          } catch (err) {
            CGL.Events.notify('error', 'Falha', err.message);
          }
        };
      });
      el.querySelectorAll('[data-proj-int]').forEach((btn) => {
        btn.onclick = () => {
          const int = (state.debt.interessesProjeto || []).find((x) => x.id === btn.dataset.projInt);
          if (!int) return;
          this._modalProject(empresa.id, {
            nome: 'Projeto com fundo',
            orcamento: int.orcamentoSugerido,
            sponsorFundo: true
          });
        };
      });
    },

    renderAgenda(el, empresa, state) {
      CGL.Debt.ensureCompanyDebt(empresa, state);
      const agenda = CGL.Debt.buildCalendar(empresa, state);
      const eventos = (state.debt?.eventos || []).filter(
        (e) => !e.empresaId || e.empresaId === empresa.id
      ).slice(0, 12);

      el.innerHTML = `
        <section class="section-block">
          <h2>Agenda financeira</h2>
          <p class="muted">Obrigações futuras — parcelas, debêntures, fornecedores, folha, tributos e dividendos.</p>
          ${agenda.length ? `
            <table class="data-table">
              <thead><tr><th>Quando</th><th>Tipo</th><th>Descrição</th><th>Valor</th></tr></thead>
              <tbody>
                ${agenda.slice(0, 40).map((a) => `
                  <tr>
                    <td>${a.offset === 0 ? 'Esta semana' : a.offset === 1 ? 'Próx. semana' : `+${a.offset} sem.`}</td>
                    <td><em class="tag">${CGL.Utils.escapeHtml(a.tipo)}</em></td>
                    <td>${CGL.Utils.escapeHtml(a.descricao)}</td>
                    <td>${a.valor ? CGL.Utils.formatBRL(a.valor) : '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<p class="muted">Nenhuma obrigação programada.</p>'}
        </section>
        <section class="section-block">
          <h2>Eventos de crédito</h2>
          ${eventos.length ? `
            <ul class="timeline-list">
              ${eventos.map((e) => `
                <li>
                  <strong>Sem. ${e.semana}</strong> — ${CGL.Utils.escapeHtml(e.titulo)}
                  <span class="muted"> · ${CGL.Utils.escapeHtml(e.descricao || '')}</span>
                </li>
              `).join('')}
            </ul>
          ` : '<p class="muted">Nenhum evento recente. Avançar semanas gera eventos de mercado de crédito.</p>'}
          <p class="muted" style="margin-top:0.75rem">
            Clima de juros: ${((state.debt?.climaCredito || 1) * 100).toFixed(0)}% ·
            Apetite debêntures: ${((state.debt?.apetiteDebentures || 1) * 100).toFixed(0)}%
          </p>
        </section>
      `;
    },

    _blockList(title, arr, fmt) {
      const active = (arr || []).filter((x) => {
        const st = x.status;
        return st && st !== 'quitado' && st !== 'pago' && st !== 'liquidada' && st !== 'encerrado' && st !== 'vencida';
      });
      return `
        <section class="section-block">
          <h2>${title}</h2>
          ${active.length ? `<ul>${active.map((x) => `<li>${fmt(x)}</li>`).join('')}</ul>` : `<p class="muted">Nenhum.</p>`}
        </section>`;
    },

    _ofertasHtml(state, empresa) {
      const refis = (state.debt?.ofertasRefi || []).filter((o) => o.empresaId === empresa.id);
      const projs = (state.debt?.interessesProjeto || []).filter((o) => o.empresaId === empresa.id);
      if (!refis.length && !projs.length) return '';
      return `
        <section class="section-block">
          <h2>Ofertas do mercado</h2>
          ${refis.map((o) => {
            const b = CGL.Data.getBankById(o.bancoId);
            return `<p>${CGL.Utils.escapeHtml(b?.nome || 'Banco')} — refinanciamento (−${Math.round((o.descontoTaxa || 0) * 100)}% taxa)
              <button type="button" class="btn btn-sm btn-primary" data-refi="${o.id}">Aceitar</button></p>`;
          }).join('')}
          ${projs.map((o) => `
            <p>${CGL.Utils.escapeHtml(o.fundo)} — interesse em projeto (~${CGL.Utils.formatBRL(o.orcamentoSugerido, { compact: true })})
              <button type="button" class="btn btn-sm btn-secondary" data-proj-int="${o.id}">Estruturar</button></p>
          `).join('')}
        </section>`;
    },

    _refresh() {
      CGL.Game.save(false);
      CGL.UI.refreshTopbar?.();
      CGL.FinanceUI.render(document.getElementById('main-content'));
    },

    _modalLoan(empresaId) {
      const banks = CGL.Data.banks.map((b) => `<option value="${b.id}">${b.nome}</option>`).join('');
      const purposes = CGL.Data.loanPurposes.map((p) =>
        `<option value="${p.id}">${p.nome}</option>`
      ).join('');
      const amorts = CGL.Data.amortizationSystems.map((a) =>
        `<option value="${a.id}">${a.nome}</option>`
      ).join('');
      const cols = CGL.Data.collateralTypes.map((c) =>
        `<option value="${c.id}">${c.nome}</option>`
      ).join('');
      CGL.UI.modal({
        title: 'Empréstimo bancário — modalidades',
        wide: true,
        body: `
          <div class="form-grid">
            <label class="field"><span>Banco</span><select id="m-bank">${banks}</select></label>
            <label class="field"><span>Modalidade</span><select id="m-fin">${purposes}</select></label>
            <label class="field"><span>Valor</span><input type="number" id="m-val" min="5000" step="1000" value="80000" /></label>
            <label class="field"><span>Prazo (sem.)</span><input type="number" id="m-prazo" min="4" max="260" value="52" /></label>
            <label class="field"><span>Amortização</span><select id="m-am">${amorts}</select></label>
            <label class="field"><span>Carência (sem.)</span><input type="number" id="m-car" min="0" max="26" value="0" /></label>
            <label class="field"><span>Garantia</span><select id="m-gar">${cols}</select></label>
            <label class="field"><span>Valor garantia</span><input type="number" id="m-gar-v" min="0" step="1000" value="60000" /></label>
            <label class="field"><span>Multa atraso</span><input type="number" id="m-multa" min="0" max="0.1" step="0.005" value="0.02" /></label>
          </div>
          <p class="muted">Condições variam com relacionamento, rating, garantias e clima econômico. Covenants em operações ≥ R$ 100 mil.</p>
        `,
        confirmLabel: 'Contratar',
        onConfirm: () => {
          try {
            const r = CGL.Debt.requestBankLoan(CGL.Game.getState(), empresaId, {
              bancoId: document.getElementById('m-bank').value,
              finalidadeId: document.getElementById('m-fin').value,
              valor: Number(document.getElementById('m-val').value),
              prazoSem: Number(document.getElementById('m-prazo').value),
              amortizacao: document.getElementById('m-am').value,
              carenciaSem: Number(document.getElementById('m-car').value),
              multaAtraso: Number(document.getElementById('m-multa').value),
              garantias: [{
                tipoId: document.getElementById('m-gar').value,
                valor: Number(document.getElementById('m-gar-v').value)
              }]
            });
            if (r.ok) CGL.Events.notify('success', 'Crédito', r.motivo || 'Aprovado');
            else CGL.Events.notify('alert', 'Recusado', r.motivo || 'Negado');
            CGL.FinanceUI.empresaTab = 'endividamento';
            this._refresh();
            return true;
          } catch (err) {
            CGL.Events.notify('error', 'Falha', err.message);
            return false;
          }
        }
      });
    },

    _modalRenegotiate(empresaId, loanId) {
      const opts = CGL.Data.renegotiationOptions.map((o) =>
        `<option value="${o.id}">${o.nome}</option>`
      ).join('');
      const cols = CGL.Data.collateralTypes.map((c) =>
        `<option value="${c.id}">${c.nome}</option>`
      ).join('');
      CGL.UI.modal({
        title: 'Renegociar dívida',
        body: `
          <label class="field"><span>Opção</span><select id="m-op">${opts}</select></label>
          <label class="field"><span>Nova garantia (se troca)</span><select id="m-gar">${cols}</select></label>
          <label class="field"><span>Valor garantia</span><input type="number" id="m-gar-v" value="50000" /></label>
          <p class="muted">Aceitação depende da confiança do credor (relacionamento + rating − atraso).</p>
        `,
        confirmLabel: 'Propor',
        onConfirm: () => {
          try {
            const r = CGL.Debt.renegotiateDebt(CGL.Game.getState(), empresaId, loanId,
              document.getElementById('m-op').value, {
                garantias: [{
                  tipoId: document.getElementById('m-gar').value,
                  valor: Number(document.getElementById('m-gar-v').value)
                }]
              });
            if (r.ok) CGL.Events.notify('success', 'Renegociação', r.opcao.nome);
            else CGL.Events.notify('alert', 'Recusada', r.motivo);
            CGL.FinanceUI.empresaTab = 'endividamento';
            this._refresh();
            return true;
          } catch (err) {
            CGL.Events.notify('error', 'Falha', err.message);
            return false;
          }
        }
      });
    },

    _modalDeb(empresaId) {
      CGL.UI.modal({
        title: 'Emitir debêntures',
        wide: true,
        body: `
          <div class="form-grid">
            <label class="field"><span>Valor</span><input type="number" id="m-val" value="500000" min="500000" step="50000" /></label>
            <label class="field"><span>Qtd. títulos</span><input type="number" id="m-qtd" value="500" min="1" /></label>
            <label class="field"><span>Prazo (sem.)</span><input type="number" id="m-prazo" value="104" min="52" /></label>
            <label class="field"><span>Remuneração a.a.</span><input type="number" id="m-rem" value="0.12" step="0.01" /></label>
            <label class="field"><span>Tipo</span>
              <select id="m-tipo">
                <option value="simples">Simples</option>
                <option value="conversivel">Conversível</option>
                <option value="incentivada">Incentivada</option>
              </select>
            </label>
            <label class="field"><span>Público-alvo</span>
              <select id="m-pub">
                <option value="institucional">Institucional</option>
                <option value="varejo">Varejo</option>
                <option value="misto">Misto</option>
              </select>
            </label>
          </div>
          <p class="muted">Apetite dos investidores (Market) decide se a emissão encontra compradores.</p>
        `,
        confirmLabel: 'Emitir',
        onConfirm: () => {
          try {
            const d = CGL.Debt.issueDebenture(CGL.Game.getState(), empresaId, {
              valor: Number(document.getElementById('m-val').value),
              quantidadeTitulos: Number(document.getElementById('m-qtd').value),
              prazoSem: Number(document.getElementById('m-prazo').value),
              remuneracaoAnual: Number(document.getElementById('m-rem').value),
              tipo: document.getElementById('m-tipo').value,
              publicoAlvo: document.getElementById('m-pub').value
            });
            CGL.Events.notify('success', 'Debêntures', `Captado ${CGL.Utils.formatBRL(d.captado)}`);
            CGL.FinanceUI.empresaTab = 'endividamento';
            this._refresh();
            return true;
          } catch (err) {
            CGL.Events.notify('error', 'Falha', err.message);
            return false;
          }
        }
      });
    },

    _modalNote(empresaId) {
      CGL.UI.modal({
        title: 'Nota promissória / commercial paper',
        body: `
          <label class="field"><span>Valor</span><input type="number" id="m-val" value="30000" min="10000" /></label>
          <label class="field"><span>Prazo (sem.)</span><input type="number" id="m-prazo" value="8" min="2" max="26" /></label>
          <p class="muted">Captação de curto prazo para caixa temporário.</p>
        `,
        confirmLabel: 'Emitir',
        onConfirm: () => {
          try {
            CGL.Debt.issueCommercialPaper(CGL.Game.getState(), empresaId, {
              valor: Number(document.getElementById('m-val').value),
              prazoSem: Number(document.getElementById('m-prazo').value)
            });
            CGL.Events.notify('success', 'Nota', 'Emitida.');
            CGL.FinanceUI.empresaTab = 'endividamento';
            this._refresh();
            return true;
          } catch (err) {
            CGL.Events.notify('error', 'Falha', err.message);
            return false;
          }
        }
      });
    },

    _modalSupplier(empresaId) {
      CGL.UI.modal({
        title: 'Crédito de fornecedor',
        body: `
          <label class="field"><span>Fornecedor</span><input type="text" id="m-nome" value="Fornecedor Alpha" /></label>
          <label class="field"><span>Valor</span><input type="number" id="m-val" value="25000" min="2000" /></label>
          <label class="field"><span>Prazo base (sem.)</span><input type="number" id="m-prazo" value="6" min="2" /></label>
          <label class="field"><span>Relacionamento</span><input type="number" id="m-rel" value="60" min="0" max="100" /></label>
        `,
        confirmLabel: 'Obter prazo',
        onConfirm: () => {
          try {
            CGL.Debt.grantSupplierCredit(CGL.Game.getState(), empresaId, {
              fornecedor: document.getElementById('m-nome').value,
              valor: Number(document.getElementById('m-val').value),
              prazoSem: Number(document.getElementById('m-prazo').value),
              relacionamento: Number(document.getElementById('m-rel').value)
            });
            CGL.Events.notify('success', 'Fornecedor', 'Prazo concedido.');
            CGL.FinanceUI.empresaTab = 'endividamento';
            this._refresh();
            return true;
          } catch (err) {
            CGL.Events.notify('error', 'Falha', err.message);
            return false;
          }
        }
      });
    },

    _modalIntercompany(empresaId) {
      const state = CGL.Game.getState();
      const others = CGL.Company.listPlayerCompanies(state)
        .filter((e) => e.id !== empresaId)
        .map((e) => `<option value="${e.id}">${CGL.Utils.escapeHtml(e.nomeFantasia)}</option>`)
        .join('');
      if (!others) {
        CGL.Events.notify('alert', 'Intercompany', 'É preciso outra empresa do grupo.');
        return;
      }
      CGL.UI.modal({
        title: 'Crédito intercompany',
        body: `
          <p class="muted">Esta empresa será a <strong>credora</strong> (sai caixa).</p>
          <label class="field"><span>Devedora</span><select id="m-para">${others}</select></label>
          <label class="field"><span>Valor</span><input type="number" id="m-val" value="40000" min="5000" /></label>
          <label class="field"><span>Prazo (sem.)</span><input type="number" id="m-prazo" value="26" /></label>
          <label class="field"><span>Taxa semanal</span><input type="number" id="m-taxa" value="0.002" step="0.0005" /></label>
          <label class="field row-check"><input type="checkbox" id="m-cons" checked /> Aprovado pelo conselho / governança</label>
        `,
        confirmLabel: 'Contratar',
        onConfirm: () => {
          try {
            CGL.Debt.intercompanyLoan(state, empresaId, document.getElementById('m-para').value, {
              valor: Number(document.getElementById('m-val').value),
              prazoSem: Number(document.getElementById('m-prazo').value),
              taxaSemanal: Number(document.getElementById('m-taxa').value),
              aprovadoConselho: document.getElementById('m-cons').checked
            });
            CGL.Events.notify('success', 'Intercompany', 'Contrato registrado.');
            CGL.FinanceUI.empresaTab = 'endividamento';
            this._refresh();
            return true;
          } catch (err) {
            CGL.Events.notify('error', 'Falha', err.message);
            return false;
          }
        }
      });
    },

    _modalLease(empresaId) {
      const tipos = CGL.Data.leasingTypes.map((t) =>
        `<option value="${t.id}">${t.nome}</option>`
      ).join('');
      const ativos = CGL.Data.leasingAssets.map((a) =>
        `<option value="${a.id}">${a.nome} (~${CGL.Utils.formatBRL(a.valorBase, { compact: true })})</option>`
      ).join('');
      CGL.UI.modal({
        title: 'Leasing',
        body: `
          <label class="field"><span>Tipo</span><select id="m-tipo">${tipos}</select></label>
          <label class="field"><span>Ativo</span><select id="m-ativo">${ativos}</select></label>
          <label class="field"><span>Valor do bem</span><input type="number" id="m-val" value="150000" /></label>
          <label class="field"><span>Prazo (sem.)</span><input type="number" id="m-prazo" value="104" /></label>
          <p class="muted">Financeiro: opção de compra ao final. Operacional: uso sem aquisição.</p>
        `,
        confirmLabel: 'Contratar',
        onConfirm: () => {
          try {
            CGL.Debt.startLeasing(CGL.Game.getState(), empresaId, {
              tipoLeasing: document.getElementById('m-tipo').value,
              ativoId: document.getElementById('m-ativo').value,
              valor: Number(document.getElementById('m-val').value),
              prazoSem: Number(document.getElementById('m-prazo').value)
            });
            CGL.Events.notify('success', 'Leasing', 'Contrato ativo.');
            CGL.FinanceUI.empresaTab = 'endividamento';
            this._refresh();
            return true;
          } catch (err) {
            CGL.Events.notify('error', 'Falha', err.message);
            return false;
          }
        }
      });
    },

    _modalProject(empresaId, preset = {}) {
      CGL.UI.modal({
        title: 'Project finance',
        body: `
          <label class="field"><span>Nome</span><input type="text" id="m-nome" value="${CGL.Utils.escapeHtml(preset.nome || 'Usina / Expansão')}" /></label>
          <label class="field"><span>Orçamento</span><input type="number" id="m-orc" value="${preset.orcamento || 500000}" min="200000" /></label>
          <label class="field"><span>% financiado</span><input type="number" id="m-pct" value="0.7" min="0.3" max="0.9" step="0.05" /></label>
          <label class="field"><span>Prazo obra (sem.)</span><input type="number" id="m-obra" value="40" min="12" /></label>
          <p class="muted">Durante a construção consome caixa sem gerar receita.</p>
        `,
        confirmLabel: 'Estruturar',
        onConfirm: () => {
          try {
            CGL.Debt.startProjectFinance(CGL.Game.getState(), empresaId, {
              nome: document.getElementById('m-nome').value,
              orcamento: Number(document.getElementById('m-orc').value),
              pctFinanciado: Number(document.getElementById('m-pct').value),
              prazoObraSem: Number(document.getElementById('m-obra').value),
              sponsorFundo: !!preset.sponsorFundo
            });
            CGL.Events.notify('success', 'Projeto', 'Financiamento estruturado.');
            CGL.FinanceUI.empresaTab = 'endividamento';
            this._refresh();
            return true;
          } catch (err) {
            CGL.Events.notify('error', 'Falha', err.message);
            return false;
          }
        }
      });
    }
  };

  global.CGL = global.CGL || {};
  global.CGL.DebtUI = DebtUI;
})(typeof window !== 'undefined' ? window : globalThis);
