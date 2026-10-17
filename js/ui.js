/**
 * CONGLOMERADO — Interface: shell, telas dinâmicas, componentes reutilizáveis
 */
(function (global) {
  'use strict';

  const SCREENS = [
    { id: 'dashboard', label: 'Dashboard', icon: '▣' },
    { id: 'empresas', label: 'Empresas', icon: '🏢' },
    { id: 'financas', label: 'Finanças', icon: '💰' },
    { id: 'mercado', label: 'Mercado', icon: '📈' },
    { id: 'investimentos', label: 'Investimentos', icon: '📉' },
    { id: 'vida', label: 'Vida Pessoal', icon: '👤' },
    { id: 'economia', label: 'Economia', icon: '📊', stub: true },
    { id: 'funcionarios', label: 'Funcionários', icon: '👥', stub: true },
    { id: 'diretoria', label: 'Diretoria', icon: '⚖', stub: true },
    { id: 'patrimonio', label: 'Patrimônio', icon: '⚜', stub: true },
    { id: 'familia', label: 'Família', icon: '⌂' },
    { id: 'historico', label: 'Histórico', icon: '📜' },
    { id: 'estatisticas', label: 'Estatísticas', icon: '⌀', stub: true },
    { id: 'config', label: 'Configurações', icon: '⚙' }
  ];

  const UI = {
    currentScreen: 'dashboard',
    sidebarOpen: true,
    notifOpen: false,

    /** Boot / menu inicial */
    showBoot() {
      const app = document.getElementById('app');
      const meta = CGL.Save.getMeta();
      app.innerHTML = `
        <div class="boot-screen">
          <div class="boot-bg"></div>
          <div class="boot-content">
            <p class="boot-eyebrow">Simulação empresarial</p>
            <h1 class="boot-title">CONGLOMERADO</h1>
            <p class="boot-sub">Do diploma ao império. Uma semana de cada vez.</p>
            <div class="boot-actions">
              <button type="button" class="btn btn-primary btn-lg" id="btn-new">Novo jogo</button>
              <button type="button" class="btn btn-secondary btn-lg" id="btn-continue" ${CGL.Save.hasSave() ? '' : 'disabled'}>Continuar</button>
            </div>
            ${meta && CGL.Save.hasSave() ? `
              <p class="boot-meta muted">
                Save: ${CGL.Utils.escapeHtml(meta.playerName || 'CEO')} ·
                Semana ${meta.week || '?'} ·
                ${CGL.Utils.formatBRL(meta.netWorth || 0, { compact: true })}
              </p>` : ''}
          </div>
        </div>
      `;
      document.getElementById('btn-new').onclick = () => {
        if (CGL.Save.hasSave()) {
          this.confirm(
            'Novo jogo',
            'Isso substituirá o save atual. Continuar?',
            () => {
              CGL.Save.clear();
              CGL.Game.startNewGame();
            }
          );
        } else {
          CGL.Game.startNewGame();
        }
      };
      document.getElementById('btn-continue').onclick = () => CGL.Game.continueGame();
    },

    showCharacterCreation() {
      const app = document.getElementById('app');
      app.innerHTML = `<div id="creation-root" class="creation-root"></div>`;
      CGL.CharacterCreation.reset();
      CGL.CharacterCreation.render(document.getElementById('creation-root'));
    },

    /** Shell principal do jogo */
    enterGame() {
      const app = document.getElementById('app');
      app.innerHTML = `
        <div class="game-shell" id="game-shell">
          <header class="topbar" id="topbar"></header>
          <div class="shell-body">
            <aside class="sidebar" id="sidebar"></aside>
            <main class="main-content" id="main-content"></main>
          </div>
          <div id="toast-host" class="toast-host"></div>
          <div id="modal-host"></div>
          <div id="notif-panel" class="notif-panel hidden"></div>
        </div>
      `;
      this.renderSidebar();
      this.refreshTopbar();
      this.navigate('dashboard');
      this._bindShellKeys();
    },

    _bindShellKeys() {
      // Evita múltiplos listeners
      if (this._keysBound) return;
      this._keysBound = true;
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeModal();
          this.notifOpen = false;
          this._renderNotifPanel();
        }
      });
    },

    renderSidebar() {
      const sb = document.getElementById('sidebar');
      if (!sb) return;
      sb.innerHTML = `
        <button type="button" class="sidebar-toggle" id="sidebar-toggle" title="Menu">☰</button>
        <nav class="sidebar-nav">
          ${SCREENS.map((s) => `
            <button type="button" class="nav-item ${this.currentScreen === s.id ? 'active' : ''}" data-screen="${s.id}">
              <span class="nav-icon">${s.icon}</span>
              <span class="nav-label">${s.label}${s.stub ? ' <em class="soon">em breve</em>' : ''}</span>
            </button>
          `).join('')}
        </nav>
        <div class="sidebar-footer">
          <button type="button" class="btn btn-accent btn-block" id="btn-advance-week">Avançar semana ▶</button>
        </div>
      `;
      sb.querySelector('#sidebar-toggle').onclick = () => {
        document.getElementById('game-shell')?.classList.toggle('sidebar-collapsed');
        this.sidebarOpen = !this.sidebarOpen;
      };
      sb.querySelectorAll('.nav-item').forEach((btn) => {
        btn.onclick = () => this.navigate(btn.dataset.screen);
      });
      sb.querySelector('#btn-advance-week').onclick = () => CGL.Game.advanceWeek();
    },

    refreshTopbar() {
      const tb = document.getElementById('topbar');
      const s = CGL.Game.getState();
      if (!tb || !s?.player) return;
      const p = s.player;
      const nw = CGL.Player.calcNetWorth(p);
      tb.innerHTML = `
        <div class="topbar-left">
          <button type="button" class="icon-btn mobile-only" id="top-menu" aria-label="Menu">☰</button>
          <span class="topbar-brand">CONGLOMERADO</span>
          <span class="topbar-player">${CGL.Utils.escapeHtml(p.nome)} ${CGL.Utils.escapeHtml(p.sobrenome)}</span>
        </div>
        <div class="topbar-center">
          <span class="topbar-date" id="top-date">${CGL.World.formatGameDate(s.world)}</span>
        </div>
        <div class="topbar-right">
          <span class="topbar-wealth" title="Patrimônio">${CGL.Utils.formatBRL(nw, { compact: true })}</span>
          <button type="button" class="icon-btn" id="top-notif" title="Notificações">🔔<span class="badge" id="notif-badge"></span></button>
          <button type="button" class="btn btn-sm btn-secondary" id="top-save">Salvar</button>
        </div>
      `;
      tb.querySelector('#top-save').onclick = () => CGL.Game.save(true);
      tb.querySelector('#top-notif').onclick = () => {
        this.notifOpen = !this.notifOpen;
        this._renderNotifPanel();
      };
      tb.querySelector('#top-menu')?.addEventListener('click', () => {
        document.getElementById('game-shell')?.classList.toggle('sidebar-collapsed');
      });
      this._updateNotifBadge();
    },

    _updateNotifBadge() {
      const badge = document.getElementById('notif-badge');
      if (!badge) return;
      const n = CGL.Events.getAll().length;
      badge.textContent = n > 0 ? String(Math.min(n, 9)) : '';
      badge.classList.toggle('hidden', n === 0);
    },

    _renderNotifPanel() {
      const panel = document.getElementById('notif-panel');
      if (!panel) return;
      if (!this.notifOpen) {
        panel.classList.add('hidden');
        return;
      }
      const items = CGL.Events.getAll();
      panel.classList.remove('hidden');
      panel.innerHTML = `
        <div class="notif-header">
          <strong>Notificações</strong>
          <button type="button" class="btn btn-sm btn-ghost" id="notif-close">Fechar</button>
        </div>
        <div class="notif-list">
          ${items.length ? items.map((n) => `
            <div class="notif-item notif-${n.type}">
              <strong>${CGL.Utils.escapeHtml(n.title)}</strong>
              <p>${CGL.Utils.escapeHtml(n.message)}</p>
            </div>
          `).join('') : '<p class="muted">Nenhuma notificação.</p>'}
        </div>
      `;
      panel.querySelector('#notif-close').onclick = () => {
        this.notifOpen = false;
        panel.classList.add('hidden');
      };
    },

    onNotify(item) {
      this.toast(`${item.title}: ${item.message}`, item.type);
      this._updateNotifBadge();
      if (this.notifOpen) this._renderNotifPanel();
    },

    navigate(screenId) {
      // Ao entrar em Empresas pela sidebar, volta à lista (ficha fica via cards)
      if (screenId === 'empresas' && this.currentScreen !== 'empresas' && CGL.CompanyUI) {
        CGL.CompanyUI.view = 'lista';
        CGL.CompanyUI.selectedId = null;
      }
      if (screenId === 'financas' && this.currentScreen !== 'financas' && CGL.FinanceUI) {
        // Mantém selectedId se veio da ficha da empresa
        if (!CGL.FinanceUI.selectedId) CGL.FinanceUI.view = 'hub';
      }
      if (screenId === 'mercado' && this.currentScreen !== 'mercado' && CGL.MarketUI) {
        CGL.MarketUI.view = 'mercado';
        CGL.MarketUI.selectedId = null;
      }
      if (screenId === 'investimentos' && CGL.MarketUI) {
        CGL.MarketUI.view = 'investimentos';
      }
      this.currentScreen = screenId;
      document.querySelectorAll('.nav-item').forEach((el) => {
        el.classList.toggle('active', el.dataset.screen === screenId);
      });
      this.refreshCurrentScreen();
    },

    refreshCurrentScreen() {
      const main = document.getElementById('main-content');
      if (!main) return;
      const id = this.currentScreen;
      if (id === 'dashboard') this.renderDashboard(main);
      else if (id === 'empresas') {
        if (CGL.CompanyUI) CGL.CompanyUI.renderEmpresas(main);
        else this.renderStub(main, SCREENS.find((s) => s.id === id));
      } else if (id === 'financas') {
        if (CGL.FinanceUI) CGL.FinanceUI.render(main);
        else this.renderStub(main, SCREENS.find((s) => s.id === id));
      } else if (id === 'mercado') {
        if (CGL.MarketUI) CGL.MarketUI.renderMercado(main);
        else this.renderStub(main, SCREENS.find((s) => s.id === id));
      } else if (id === 'investimentos') {
        if (CGL.MarketUI) CGL.MarketUI.renderInvestimentos(main);
        else this.renderStub(main, SCREENS.find((s) => s.id === id));
      } else if (id === 'vida') this.renderVida(main);
      else if (id === 'familia') this.renderFamilia(main);
      else if (id === 'historico') this.renderHistorico(main);
      else if (id === 'config') this.renderConfig(main);
      else this.renderStub(main, SCREENS.find((s) => s.id === id));
    },

    flashWeekAdvance() {
      const shell = document.getElementById('game-shell');
      if (!shell) return;
      shell.classList.remove('week-flash');
      void shell.offsetWidth;
      shell.classList.add('week-flash');
    },

    /* ========== Componentes reutilizáveis ========== */

    card(title, content, opts = {}) {
      return `
        <article class="card ${opts.className || ''}">
          ${title ? `<header class="card-header"><h3>${title}</h3>${opts.actions || ''}</header>` : ''}
          <div class="card-body">${content}</div>
        </article>
      `;
    },

    progressBar(label, value, opts = {}) {
      const v = CGL.Utils.clamp(Number(value) || 0, 0, 100);
      const tone = opts.invert
        ? v > 70 ? 'bad' : v > 40 ? 'mid' : 'good'
        : v > 70 ? 'good' : v > 40 ? 'mid' : 'bad';
      return `
        <div class="progress-block">
          <div class="progress-label"><span>${label}</span><span>${Math.round(v)}</span></div>
          <div class="progress-track"><div class="progress-fill tone-${tone}" style="width:${v}%"></div></div>
        </div>
      `;
    },

    simpleChart(values, opts = {}) {
      const max = Math.max(...values.map(Math.abs), 1);
      return `
        <div class="css-chart ${opts.className || ''}">
          ${values.map((v, i) => {
            const h = Math.max(4, (Math.abs(v) / max) * 100);
            return `<div class="css-bar ${v < 0 ? 'neg' : 'pos'}" style="height:${h}%" title="${opts.labels?.[i] || i}: ${v}"></div>`;
          }).join('')}
        </div>
      `;
    },

    table(columns, rows, opts = {}) {
      const page = opts.page || 0;
      const pageSize = opts.pageSize || 10;
      const filtered = opts.filterFn ? rows.filter(opts.filterFn) : rows;
      const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
      const slice = filtered.slice(page * pageSize, page * pageSize + pageSize);
      return `
        <div class="table-wrap">
          ${opts.searchable ? `<div class="toolbar"><input type="search" class="table-search" placeholder="Pesquisar..." /></div>` : ''}
          <table class="data-table">
            <thead><tr>${columns.map((c) => `<th>${c.label}</th>`).join('')}</tr></thead>
            <tbody>
              ${slice.map((row) => `<tr>${columns.map((c) => `<td>${c.render ? c.render(row) : CGL.Utils.escapeHtml(String(row[c.key] ?? ''))}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${columns.length}" class="muted">Sem dados</td></tr>`}
            </tbody>
          </table>
          ${opts.paginate !== false && filtered.length > pageSize ? `
            <div class="pager">
              <span>Página ${page + 1}/${totalPages}</span>
            </div>` : ''}
        </div>
      `;
    },

    toast(message, type = 'info') {
      const host = document.getElementById('toast-host') || this._ensureToastHost();
      const el = document.createElement('div');
      el.className = `toast toast-${type}`;
      el.textContent = message;
      host.appendChild(el);
      const speed = Number(document.documentElement.style.getPropertyValue('--anim-speed')) || 1;
      setTimeout(() => {
        el.classList.add('out');
        setTimeout(() => el.remove(), 300);
      }, 2800 / speed);
    },

    _ensureToastHost() {
      let host = document.getElementById('toast-host');
      if (!host) {
        host = document.createElement('div');
        host.id = 'toast-host';
        host.className = 'toast-host';
        document.body.appendChild(host);
      }
      return host;
    },

    modal({ title, body, confirmLabel = 'OK', cancelLabel = 'Cancelar', onConfirm, onCancel, hideCancel, wide }) {
      const host = document.getElementById('modal-host') || document.body;
      const wrap = document.createElement('div');
      wrap.className = 'modal-backdrop';
      wrap.innerHTML = `
        <div class="modal ${wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true">
          <header class="modal-header"><h2>${title}</h2></header>
          <div class="modal-body">${body}</div>
          <footer class="modal-footer">
            ${hideCancel ? '' : `<button type="button" class="btn btn-ghost" data-act="cancel">${cancelLabel}</button>`}
            <button type="button" class="btn btn-primary" data-act="ok">${confirmLabel}</button>
          </footer>
        </div>
      `;
      const close = () => wrap.remove();
      wrap.addEventListener('click', (e) => {
        if (e.target === wrap) {
          if (onCancel) onCancel();
          close();
        }
      });
      wrap.querySelector('[data-act="ok"]').onclick = () => {
        if (onConfirm) {
          const ok = onConfirm();
          if (ok === false) return;
        }
        close();
      };
      const cancelBtn = wrap.querySelector('[data-act="cancel"]');
      if (cancelBtn) {
        cancelBtn.onclick = () => {
          if (onCancel) onCancel();
          close();
        };
      }
      host.appendChild(wrap);
      return wrap;
    },

    closeModal() {
      document.querySelectorAll('.modal-backdrop').forEach((el) => el.remove());
    },

    confirm(title, message, onYes) {
      const s = CGL.Game.getState();
      if (s?.settings?.confirmImportant === false) {
        onYes();
        return;
      }
      this.modal({
        title,
        body: `<p>${CGL.Utils.escapeHtml(message)}</p>`,
        confirmLabel: 'Confirmar',
        onConfirm: onYes
      });
    },

    /* ========== Telas ========== */

    renderDashboard(main) {
      const s = CGL.Game.getState();
      const p = s.player;
      const n = p.necessidades;
      const city = CGL.Data.getCityById(p.cidadeMoradiaId);
      const course = CGL.Data.getCourseById(p.cursoId);
      const econ = s.economy;

      main.innerHTML = `
        <div class="screen dashboard-screen">
          <header class="screen-header">
            <h1>Dashboard</h1>
            <p class="muted">Visão geral da campanha — indicadores preparados para expansão.</p>
          </header>
          <div class="dash-hero">
            <div class="avatar-css sm" id="dash-avatar"></div>
            <div>
              <h2>${CGL.Utils.escapeHtml(p.nome)} ${CGL.Utils.escapeHtml(p.sobrenome)}</h2>
              <p>${p.idade} anos · ${course?.nome || '—'} · ${city ? `${city.nome}/${city.estado}` : '—'}</p>
            </div>
            <button type="button" class="btn btn-accent" id="dash-week">Avançar semana ▶</button>
          </div>
          <div class="dash-grid">
            ${this.card('Patrimônio', `
              <div class="stat-gold">${CGL.Utils.formatBRL(CGL.Player.calcNetWorth(p))}</div>
              <p class="muted">Dinheiro disponível: ${CGL.Utils.formatBRL(p.dinheiro)}</p>
            `)}
            ${this.card('Economia', `
              <ul class="kv-list">
                <li><span>Inflação</span><span>${CGL.Utils.formatPercent(econ.inflacaoAnual * 100)}</span></li>
                <li><span>Juros</span><span>${CGL.Utils.formatPercent(econ.taxaJuros * 100)}</span></li>
                <li><span>USD</span><span>${econ.cambioUSD.toFixed(2)}</span></li>
                <li><span>Confiança</span><span>${Math.round(econ.indiceConfianca)}</span></li>
              </ul>
              ${this.simpleChart([
                econ.indiceConfianca,
                econ.taxaJuros * 500,
                econ.inflacaoAnual * 800,
                100 - econ.desemprego * 400
              ], { labels: ['Confiança', 'Juros', 'Inflação', 'Emprego'] })}
            `)}
            ${this.card('Necessidades', `
              ${this.progressBar('Saúde', n.saude)}
              ${this.progressBar('Estresse', n.estresse, { invert: true })}
              ${this.progressBar('Energia', n.energia)}
              ${this.progressBar('Felicidade', n.felicidade)}
              ${this.progressBar('Reputação', n.reputacao)}
              ${this.progressBar('Motivação', n.motivacao)}
            `)}
            ${this.card('Empresas', CGL.CompanyUI
              ? CGL.CompanyUI.dashboardSummaryHtml(s)
              : '<p class="muted">Módulo de empresas indisponível.</p>')}
            ${CGL.FinanceUI
              ? CGL.FinanceUI.dashboardCardsHtml(s)
              : this.card('Finanças', '<p class="muted">Módulo financeiro indisponível.</p>')}
            ${CGL.MarketUI
              ? CGL.MarketUI.dashboardCardsHtml(s)
              : this.card('Mercado', '<p class="muted">Mercado de capitais indisponível.</p>')}
            ${this.card('Família', `
              <p>${(p.familia || []).filter((m) => m.vivo).length} familiares ativos</p>
              <button type="button" class="btn btn-sm btn-secondary" data-go="familia">Ver família</button>
            `)}
            ${this.card('Histórico recente', `
              <ul class="timeline">
                ${(p.historico || []).slice(0, 5).map((h) => `
                  <li><strong>${CGL.Utils.escapeHtml(h.titulo)}</strong>
                  <span class="muted">S${h.semana}</span>
                  <p>${CGL.Utils.escapeHtml(h.descricao)}</p></li>
                `).join('') || '<li class="muted">Sem eventos</li>'}
              </ul>
              <button type="button" class="btn btn-sm btn-ghost" data-go="historico">Ver tudo</button>
            `)}
          </div>
        </div>
      `;
      CGL.CharacterCreation.renderAvatarInto(document.getElementById('dash-avatar'), p.avatar);
      main.querySelector('#dash-week').onclick = () => CGL.Game.advanceWeek();
      main.querySelectorAll('[data-go]').forEach((btn) => {
        btn.onclick = () => this.navigate(btn.dataset.go);
      });
    },

    renderVida(main) {
      const p = CGL.Game.getState().player;
      const attrs = p.atributos || {};
      const n = p.necessidades;
      main.innerHTML = `
        <div class="screen">
          <header class="screen-header"><h1>Vida Pessoal</h1></header>
          <div class="dash-grid">
            ${this.card('Atributos', `
              <div class="attr-readout">
                ${CGL.Data.attributeDefs.map((a) => `
                  <div><span>${a.nome}</span><strong>${attrs[a.id] ?? '—'}</strong></div>
                `).join('')}
              </div>
            `)}
            ${this.card('Personalidade', `
              <div class="chip-grid readonly">
                ${(p.personalidade || []).map((id) => {
                  const t = CGL.Data.getTraitById(id);
                  return `<span class="chip selected">${t?.nome || id}</span>`;
                }).join('') || '<span class="muted">—</span>'}
              </div>
            `)}
            ${this.card('Sonhos', `
              <ul>${(p.sonhos || []).map((id) => {
                const d = CGL.Data.getDreamById(id);
                return `<li><strong>${d?.nome || id}</strong><p class="muted">${d?.descricao || ''}</p></li>`;
              }).join('')}</ul>
            `)}
            ${this.card('Estado atual', `
              ${this.progressBar('Saúde', n.saude)}
              ${this.progressBar('Estresse', n.estresse, { invert: true })}
              ${this.progressBar('Energia', n.energia)}
              ${this.progressBar('Felicidade', n.felicidade)}
              ${this.progressBar('Reputação', n.reputacao)}
              ${this.progressBar('Motivação', n.motivacao)}
            `)}
          </div>
        </div>
      `;
    },

    renderFamilia(main) {
      const family = CGL.Game.getState().player.familia || [];
      main.innerHTML = `
        <div class="screen">
          <header class="screen-header">
            <h1>Família</h1>
            <p class="muted">NPCs com vida própria — eventos profundos nas próximas fases; hooks semanais já ativos.</p>
          </header>
          <div class="family-grid">
            ${family.map((m) => `
              <article class="card family-card ${m.vivo ? '' : 'dead'}">
                <header class="card-header">
                  <h3>${CGL.Utils.escapeHtml(m.nome)} ${CGL.Utils.escapeHtml(m.sobrenome)}</h3>
                  <span class="tag">${m.relacao}</span>
                </header>
                <div class="card-body">
                  <p>${m.idade} anos · ${CGL.Utils.escapeHtml(m.profissao)} ${m.vivo ? '' : '· Falecido'}</p>
                  ${this.progressBar('Relacionamento', m.relacionamento)}
                  ${this.progressBar('Saúde', m.saude)}
                  ${this.progressBar('Condição financeira', m.condicaoFinanceira)}
                  <p class="muted">Expectativa de vida: ~${m.expectativaVida} anos</p>
                </div>
              </article>
            `).join('')}
          </div>
        </div>
      `;
    },

    renderHistorico(main) {
      const hist = CGL.Game.getState().player.historico || [];
      const q = this._histFilter || '';
      const filtered = hist.filter((h) => {
        if (!q) return true;
        const s = `${h.titulo} ${h.descricao} ${h.tipo}`.toLowerCase();
        return s.includes(q.toLowerCase());
      });
      const pageSize = 8;
      const page = this._histPage || 0;
      const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
      const slice = filtered.slice(page * pageSize, page * pageSize + pageSize);

      main.innerHTML = `
        <div class="screen">
          <header class="screen-header"><h1>Histórico pessoal</h1></header>
          <div class="toolbar">
            <input type="search" id="hist-q" placeholder="Filtrar eventos..." value="${CGL.Utils.escapeHtml(q)}" />
          </div>
          <ul class="timeline big">
            ${slice.map((h) => `
              <li>
                <div class="tl-meta">Semana ${h.semana} · ${CGL.Utils.escapeHtml(h.tipo)}</div>
                <strong>${CGL.Utils.escapeHtml(h.titulo)}</strong>
                <p>${CGL.Utils.escapeHtml(h.descricao)}</p>
              </li>
            `).join('') || '<li class="muted">Nenhum evento.</li>'}
          </ul>
          <div class="pager">
            <button type="button" class="btn btn-sm" id="hist-prev">Anterior</button>
            <span>${page + 1} / ${totalPages}</span>
            <button type="button" class="btn btn-sm" id="hist-next">Próxima</button>
          </div>
        </div>
      `;
      main.querySelector('#hist-q').oninput = CGL.Utils.debounce((e) => {
        this._histFilter = e.target.value;
        this._histPage = 0;
        this.renderHistorico(main);
      }, 150);
      main.querySelector('#hist-prev').onclick = () => {
        this._histPage = Math.max(0, page - 1);
        this.renderHistorico(main);
      };
      main.querySelector('#hist-next').onclick = () => {
        this._histPage = Math.min(totalPages - 1, page + 1);
        this.renderHistorico(main);
      };
    },

    renderConfig(main) {
      const settings = CGL.Game.getState().settings;
      main.innerHTML = `
        <div class="screen">
          <header class="screen-header"><h1>Configurações</h1></header>
          <div class="settings-form">
            <label class="field">
              <span>Velocidade das animações</span>
              <select id="cfg-anim">
                <option value="0.5" ${settings.animationSpeed === 0.5 ? 'selected' : ''}>Lenta</option>
                <option value="1" ${Number(settings.animationSpeed) === 1 ? 'selected' : ''}>Normal</option>
                <option value="1.5" ${settings.animationSpeed === 1.5 ? 'selected' : ''}>Rápida</option>
                <option value="2" ${settings.animationSpeed === 2 ? 'selected' : ''}>Muito rápida</option>
              </select>
            </label>
            <label class="field">
              <span>Volume (${Math.round((settings.volume || 0) * 100)}%)</span>
              <input type="range" id="cfg-vol" min="0" max="1" step="0.05" value="${settings.volume || 0}" />
            </label>
            <label class="checkbox-row">
              <input type="checkbox" id="cfg-dark" ${settings.darkMode ? 'checked' : ''} />
              Modo escuro
            </label>
            <label class="checkbox-row">
              <input type="checkbox" id="cfg-confirm" ${settings.confirmImportant ? 'checked' : ''} />
              Confirmar decisões importantes
            </label>
            <label class="checkbox-row">
              <input type="checkbox" id="cfg-autosave" ${settings.autosave !== false ? 'checked' : ''} />
              Autosave
            </label>
            <label class="checkbox-row">
              <input type="checkbox" id="cfg-motion" ${settings.reduceMotion ? 'checked' : ''} />
              Reduzir movimento
            </label>
            <div class="settings-actions">
              <button type="button" class="btn btn-primary" id="cfg-save">Aplicar</button>
              <button type="button" class="btn btn-ghost" id="cfg-menu">Voltar ao menu</button>
            </div>
          </div>
        </div>
      `;
      main.querySelector('#cfg-save').onclick = () => {
        CGL.Game.updateSettings({
          animationSpeed: Number(main.querySelector('#cfg-anim').value),
          volume: Number(main.querySelector('#cfg-vol').value),
          darkMode: main.querySelector('#cfg-dark').checked,
          confirmImportant: main.querySelector('#cfg-confirm').checked,
          autosave: main.querySelector('#cfg-autosave').checked,
          reduceMotion: main.querySelector('#cfg-motion').checked
        });
        this.toast('Configurações salvas.', 'success');
      };
      main.querySelector('#cfg-menu').onclick = () => {
        this.confirm('Sair para o menu?', 'O progresso será salvo automaticamente.', () => {
          CGL.Game.save(false);
          CGL.Game.phase = 'menu';
          this.showBoot();
        });
      };
    },

    renderStub(main, screen) {
      main.innerHTML = `
        <div class="screen stub-screen">
          <header class="screen-header">
            <h1>${screen?.label || 'Em breve'}</h1>
            <p class="muted">Esta tela é um stub da Fase 1. O módulo correspondente será plugado nas próximas fases sem reescrever a shell.</p>
          </header>
          ${this.card('Estado preparado', `
            <p>Slots no estado global já existem para este sistema.</p>
            <p class="muted">Navegação dinâmica ativa — sem reload.</p>
          `, { className: 'card-stub' })}
        </div>
      `;
    }
  };

  global.CGL = global.CGL || {};
  global.CGL.UI = UI;
  global.CGL.SCREENS = SCREENS;
})(typeof window !== 'undefined' ? window : globalThis);
