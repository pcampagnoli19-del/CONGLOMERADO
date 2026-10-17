/**
 * CONGLOMERADO — UI Fase 13: Dificuldade / Sandbox / Conquistas / Cheats
 */
(function (global) {
  'use strict';

  const DifficultyUI = {
    view: 'hub', // hub | dificuldade | sandbox | conquistas | cheats | automacao
    cheatUnlockClicks: 0,

    render(main) {
      const state = CGL.Game.getState();
      if (!state) return;
      CGL.Difficulty.ensureDifficulty(state);
      const d = state.difficulty;
      const sum = CGL.Difficulty.summary(state);

      main.innerHTML = `
        <div class="difficulty-screen">
          <header class="screen-header">
            <h1>Dificuldade & Sandbox</h1>
            <p class="muted">Nível: <strong class="gold">${CGL.Utils.escapeHtml(sum.levelNome)}</strong>
              · Modo: ${CGL.Utils.escapeHtml(sum.startModeId)}
              ${sum.sandbox ? ' · <span class="badge-sandbox">Sandbox</span>' : ''}
              ${sum.cheatsMode ? ' · <span class="badge-cheats">Modo Cheats</span>' : ''}
            </p>
          </header>
          <nav class="diff-tabs" role="tablist">
            ${this._tab('hub', 'Hub')}
            ${this._tab('dificuldade', 'Dificuldade')}
            ${this._tab('automacao', 'Automação')}
            ${this._tab('sandbox', 'Sandbox')}
            ${this._tab('conquistas', 'Conquistas')}
            ${this._tab('cheats', 'Cheats', true)}
          </nav>
          <div class="diff-body" id="diff-body"></div>
        </div>
      `;
      this._bindTabs(main);
      const body = main.querySelector('#diff-body');
      if (this.view === 'dificuldade') this.renderDificuldade(body, state);
      else if (this.view === 'automacao') this.renderAutomacao(body, state);
      else if (this.view === 'sandbox') this.renderSandbox(body, state);
      else if (this.view === 'conquistas') this.renderConquistas(body, state);
      else if (this.view === 'cheats') this.renderCheats(body, state);
      else this.renderHub(body, state, sum);
    },

    _tab(id, label, secret) {
      const active = this.view === id ? 'active' : '';
      const hidden = secret && this.view !== 'cheats' && this.cheatUnlockClicks < 5
        ? 'style="opacity:0.35"'
        : '';
      return `<button type="button" class="diff-tab ${active}" data-view="${id}" ${hidden}>${label}</button>`;
    },

    _bindTabs(main) {
      main.querySelectorAll('.diff-tab').forEach((btn) => {
        btn.onclick = () => {
          const v = btn.dataset.view;
          if (v === 'cheats' && this.cheatUnlockClicks < 5 && this.view !== 'cheats') {
            this.cheatUnlockClicks += 1;
            if (this.cheatUnlockClicks < 5) {
              CGL.UI.toast(`Cheats: clique mais ${5 - this.cheatUnlockClicks}×…`, 'info');
              this.render(document.getElementById('main-content'));
              return;
            }
            CGL.UI.toast('Painel de Cheats desbloqueado.', 'alert');
          }
          this.view = v;
          this.render(document.getElementById('main-content'));
        };
      });
    },

    renderHub(body, state, sum) {
      const p = CGL.Difficulty.params(state);
      body.innerHTML = `
        <div class="diff-grid">
          ${CGL.UI.card('Partida', `
            <dl class="kv">
              <dt>Dificuldade</dt><dd>${CGL.Utils.escapeHtml(sum.levelNome)}</dd>
              <dt>Preset</dt><dd>${sum.presetId ? CGL.Utils.escapeHtml(sum.presetId) : '—'}</dd>
              <dt>Modo de partida</dt><dd>${CGL.Utils.escapeHtml(sum.startModeId)}</dd>
              <dt>Pressão dinâmica</dt><dd>×${(sum.pressure || 1).toFixed(2)}</dd>
              <dt>Conquistas</dt><dd>${sum.achievements}/${sum.achievementsTotal}</dd>
            </dl>
          `)}
          ${CGL.UI.card('Multiplicadores-chave', `
            <ul class="diff-mult-list">
              <li>Crédito ×${p.facilidadeCredito.toFixed(2)} (custo ×${p.custoCredito.toFixed(2)})</li>
              <li>IA ×${p.agressividadeIA.toFixed(2)} · rivais ×${p.crescimentoConcorrentes.toFixed(2)}</li>
              <li>Crises ×${p.frequenciaCrises.toFixed(2)} · margem ×${p.margemOperacional.toFixed(2)}</li>
              <li>Produtividade RH ×${p.produtividadeFuncionarios.toFixed(2)}</li>
            </ul>
          `)}
          ${CGL.UI.card('IA recente', `
            <ul class="diff-log">
              ${(sum.aiLogRecent || []).map((e) =>
                `<li><span class="muted">S${e.semana}</span> ${CGL.Utils.escapeHtml(e.msg)}</li>`
              ).join('') || '<li class="muted">Nenhuma ação ainda — avance semanas.</li>'}
            </ul>
          `)}
        </div>
        <p class="muted tip-line">Altere o nível em <strong>Dificuldade</strong> (seguro mid-run para params; capital inicial só em novo jogo). Configure automação por área ou ative Sandbox.</p>
      `;
    },

    renderDificuldade(body, state) {
      const d = state.difficulty;
      const levels = CGL.Data.difficultyLevels || [];
      const presets = CGL.Data.difficultyPresets || [];
      const modes = CGL.Data.startModes || [];
      const defs = CGL.Data.difficultyParamDefs || [];

      body.innerHTML = `
        <section class="diff-section">
          <h2>Níveis oficiais</h2>
          <div class="level-grid">
            ${levels.map((l) => `
              <button type="button" class="level-card ${d.levelId === l.id && !d.custom ? 'selected' : ''}"
                data-level="${l.id}">
                <strong>${CGL.Utils.escapeHtml(l.nome)}</strong>
                <span class="muted">${CGL.Utils.escapeHtml(l.subtitulo || '')}</span>
                <p>${CGL.Utils.escapeHtml(l.descricao)}</p>
              </button>
            `).join('')}
          </div>
        </section>
        <section class="diff-section">
          <h2>Presets de cenário</h2>
          <div class="preset-row">
            ${presets.map((p) => `
              <button type="button" class="btn btn-ghost ${d.presetId === p.id ? 'active' : ''}"
                data-preset="${p.id}" title="${CGL.Utils.escapeHtml(p.descricao)}">
                ${CGL.Utils.escapeHtml(p.nome)}
              </button>
            `).join('')}
            <button type="button" class="btn btn-secondary" id="btn-clear-preset">Limpar preset</button>
          </div>
        </section>
        <section class="diff-section">
          <h2>Modo de partida</h2>
          <p class="muted">Hooks leves — não substituem o wizard do CEO. Melhor aplicados em novo jogo.</p>
          <div class="preset-row">
            ${modes.map((m) => `
              <button type="button" class="btn btn-ghost ${d.startModeId === m.id ? 'active' : ''}"
                data-mode="${m.id}" title="${CGL.Utils.escapeHtml(m.descricao)}">
                ${CGL.Utils.escapeHtml(m.nome)}
              </button>
            `).join('')}
          </div>
        </section>
        <section class="diff-section">
          <h2>Personalizado</h2>
          <p class="muted">Ajuste sliders e salve como personalizado (sobrescreve o nível oficial).</p>
          <div class="slider-grid" id="custom-sliders">
            ${defs.map((def) => {
              const val = d.params[def.id] != null ? d.params[def.id] : (CGL.Data.DEFAULT_DIFFICULTY_PARAMS[def.id] ?? 1);
              const display = def.format === 'pct'
                ? `${(val * 100).toFixed(1)}%`
                : Number(val).toFixed(2);
              return `
                <label class="slider-row">
                  <span>${CGL.Utils.escapeHtml(def.label)} <em>${display}</em></span>
                  <input type="range" data-param="${def.id}"
                    min="${def.min}" max="${def.max}" step="${def.step}" value="${val}" />
                </label>
              `;
            }).join('')}
          </div>
          <div class="settings-actions">
            <button type="button" class="btn btn-primary" id="btn-apply-custom">Aplicar personalizado</button>
            <button type="button" class="btn btn-secondary" id="btn-reset-params">Resetar ao nível</button>
          </div>
        </section>
        <label class="check-row">
          <input type="checkbox" id="chk-dynamic" ${d.dynamic?.enabled !== false ? 'checked' : ''} />
          Dificuldade dinâmica (reage a sucesso/fracasso)
        </label>
      `;

      body.querySelectorAll('[data-level]').forEach((btn) => {
        btn.onclick = () => {
          try {
            CGL.Difficulty.setLevel(state, btn.dataset.level);
            CGL.Game.save(false);
            CGL.UI.toast(`Dificuldade: ${btn.dataset.level}`, 'success');
            this.render(document.getElementById('main-content'));
          } catch (e) {
            CGL.UI.toast(String(e.message || e), 'error');
          }
        };
      });
      body.querySelectorAll('[data-preset]').forEach((btn) => {
        btn.onclick = () => {
          CGL.Difficulty.setPreset(state, btn.dataset.preset);
          CGL.Game.save(false);
          CGL.UI.toast('Preset aplicado.', 'success');
          this.render(document.getElementById('main-content'));
        };
      });
      body.querySelector('#btn-clear-preset').onclick = () => {
        state.difficulty.presetId = null;
        CGL.Difficulty.setLevel(state, state.difficulty.levelId === 'personalizado' ? 'normal' : state.difficulty.levelId);
        CGL.Game.save(false);
        this.render(document.getElementById('main-content'));
      };
      body.querySelectorAll('[data-mode]').forEach((btn) => {
        btn.onclick = () => {
          CGL.Difficulty.setStartMode(state, btn.dataset.mode);
          CGL.Game.save(false);
          CGL.UI.toast(`Modo: ${btn.dataset.mode}`, 'info');
          this.render(document.getElementById('main-content'));
        };
      });
      body.querySelectorAll('#custom-sliders input').forEach((input) => {
        input.oninput = () => {
          const em = input.parentElement.querySelector('em');
          const def = defs.find((x) => x.id === input.dataset.param);
          const v = Number(input.value);
          if (em) {
            em.textContent = def?.format === 'pct' ? `${(v * 100).toFixed(1)}%` : v.toFixed(2);
          }
        };
      });
      body.querySelector('#btn-apply-custom').onclick = () => {
        const partial = {};
        body.querySelectorAll('#custom-sliders input').forEach((input) => {
          partial[input.dataset.param] = Number(input.value);
        });
        CGL.Difficulty.setCustomParams(state, partial);
        CGL.Game.save(false);
        CGL.UI.toast('Parâmetros personalizados aplicados.', 'success');
        this.render(document.getElementById('main-content'));
      };
      body.querySelector('#btn-reset-params').onclick = () => {
        const id = d.levelId === 'personalizado' ? 'normal' : d.levelId;
        CGL.Difficulty.setLevel(state, id);
        CGL.Game.save(false);
        this.render(document.getElementById('main-content'));
      };
      body.querySelector('#chk-dynamic').onchange = (ev) => {
        state.difficulty.dynamic.enabled = !!ev.target.checked;
        CGL.Game.save(false);
      };
    },

    renderAutomacao(body, state) {
      const auto = state.difficulty.automation;
      const levels = CGL.Data.automationLevels || [];
      const areas = CGL.Data.automationAreas || [];
      const profiles = CGL.Data.managementProfiles || [];

      body.innerHTML = `
        <section class="diff-section">
          <h2>Perfis de gestão</h2>
          <div class="preset-row">
            ${profiles.map((p) => `
              <button type="button" class="btn btn-ghost ${auto.profileId === p.id ? 'active' : ''}"
                data-profile="${p.id}">${CGL.Utils.escapeHtml(p.nome)}</button>
            `).join('')}
          </div>
        </section>
        <section class="diff-section">
          <h2>Por área</h2>
          <div class="auto-grid">
            ${areas.map((a) => `
              <label class="auto-row">
                <span>${CGL.Utils.escapeHtml(a.nome)}</span>
                <select data-area="${a.id}">
                  ${levels.map((l) => `
                    <option value="${l.id}" ${auto.areas[a.id] === l.id ? 'selected' : ''}>
                      ${CGL.Utils.escapeHtml(l.nome)}
                    </option>
                  `).join('')}
                </select>
              </label>
            `).join('')}
          </div>
        </section>
        <section class="diff-section">
          <h2>Sugestões (assistido)</h2>
          <ul class="diff-log">
            ${(auto.suggestions || []).slice(0, 8).map((s) =>
              `<li>${CGL.Utils.escapeHtml(s.texto)}</li>`
            ).join('') || '<li class="muted">Nenhuma sugestão pendente.</li>'}
          </ul>
          <h3>Log de automação</h3>
          <ul class="diff-log">
            ${(auto.log || []).slice(0, 8).map((e) =>
              `<li><span class="muted">S${e.semana}</span> ${CGL.Utils.escapeHtml(e.msg)}</li>`
            ).join('') || '<li class="muted">Sem ações automáticas ainda.</li>'}
          </ul>
        </section>
      `;

      body.querySelectorAll('[data-profile]').forEach((btn) => {
        btn.onclick = () => {
          CGL.Difficulty.applyManagementProfile(state, btn.dataset.profile);
          CGL.Game.save(false);
          CGL.UI.toast('Perfil de gestão aplicado.', 'success');
          this.render(document.getElementById('main-content'));
        };
      });
      body.querySelectorAll('[data-area]').forEach((sel) => {
        sel.onchange = () => {
          CGL.Difficulty.setAutomationLevel(state, sel.dataset.area, sel.value);
          CGL.Game.save(false);
        };
      });
    },

    renderSandbox(body, state) {
      const d = state.difficulty;
      const toggles = CGL.Data.sandboxToggles || [];
      body.innerHTML = `
        <section class="diff-section">
          <label class="check-row big">
            <input type="checkbox" id="chk-sandbox" ${d.sandbox ? 'checked' : ''} />
            Ativar modo Sandbox
          </label>
          <p class="muted">No Sandbox você liga/desliga sistemas sem quebrar os demais módulos.</p>
          <div class="sandbox-grid">
            ${toggles.map((t) => `
              <label class="check-row">
                <input type="checkbox" data-toggle="${t.id}"
                  ${(d.sandboxToggles[t.id] !== false) ? 'checked' : ''}
                  ${d.sandbox ? '' : 'disabled'} />
                ${CGL.Utils.escapeHtml(t.nome)}
              </label>
            `).join('')}
          </div>
        </section>
      `;
      body.querySelector('#chk-sandbox').onchange = (ev) => {
        CGL.Difficulty.setSandbox(state, ev.target.checked);
        CGL.Game.save(false);
        this.render(document.getElementById('main-content'));
      };
      body.querySelectorAll('[data-toggle]').forEach((chk) => {
        chk.onchange = () => {
          state.difficulty.sandboxToggles[chk.dataset.toggle] = !!chk.checked;
          CGL.Game.save(false);
        };
      });
    },

    renderConquistas(body, state) {
      const unlocked = new Set(state.difficulty.achievementsUnlocked || []);
      const list = CGL.Data.achievements || [];
      const byTipo = { empresarial: [], pessoal: [], financeiro: [] };
      list.forEach((a) => {
        (byTipo[a.tipo] || (byTipo[a.tipo] = [])).push(a);
      });
      body.innerHTML = `
        <p class="muted">${unlocked.size}/${list.length} desbloqueadas
          ${state.difficulty.cheatsMode ? ' · <span class="badge-cheats">partida com Cheats</span>' : ''}</p>
        ${Object.entries(byTipo).map(([tipo, items]) => `
          <section class="diff-section">
            <h2>${CGL.Utils.escapeHtml(tipo)}</h2>
            <div class="achieve-grid">
              ${items.map((a) => `
                <article class="achieve-card ${unlocked.has(a.id) ? 'unlocked' : 'locked'}">
                  <strong>${CGL.Utils.escapeHtml(a.nome)}</strong>
                  <p>${CGL.Utils.escapeHtml(a.descricao)}</p>
                  <span class="achieve-status">${unlocked.has(a.id) ? '✓' : '○'}</span>
                </article>
              `).join('')}
            </div>
          </section>
        `).join('')}
      `;
    },

    renderCheats(body, state) {
      const d = state.difficulty;
      const cheats = CGL.Data.cheats || [];
      const groups = {};
      cheats.forEach((c) => {
        groups[c.grupo] = groups[c.grupo] || [];
        groups[c.grupo].push(c);
      });
      body.innerHTML = `
        <div class="cheat-warn">
          <strong>Atenção</strong>
          <p>Cheats são só para diversão e testes. Ao usar qualquer um, a partida é marcada como
            <em>Modo Cheats</em> e recordes oficiais ficam inválidos.</p>
          ${d.cheatsMode ? '<p class="badge-cheats">Esta partida já está em Modo Cheats.</p>' : ''}
        </div>
        ${Object.entries(groups).map(([g, items]) => `
          <section class="diff-section">
            <h2>${CGL.Utils.escapeHtml(g)}</h2>
            <div class="cheat-row">
              ${items.map((c) => `
                <button type="button" class="btn btn-secondary" data-cheat="${c.id}">
                  ${CGL.Utils.escapeHtml(c.nome)}
                  ${c.toggle && d.cheatFlags[c.id] ? ' ●' : ''}
                </button>
              `).join('')}
            </div>
          </section>
        `).join('')}
      `;
      body.querySelectorAll('[data-cheat]').forEach((btn) => {
        btn.onclick = () => {
          try {
            const res = CGL.Difficulty.activateCheat(state, btn.dataset.cheat);
            CGL.Game.save(false);
            CGL.UI.toast(
              res.toggled
                ? (res.active ? 'Cheat ligado.' : 'Cheat desligado.')
                : 'Cheat aplicado.',
              'alert'
            );
            if (CGL.UI.refreshTopbar) CGL.UI.refreshTopbar();
            this.render(document.getElementById('main-content'));
          } catch (e) {
            CGL.UI.toast(String(e.message || e), 'error');
          }
        };
      });
    },

    /**
     * Painel pré-jogo (opcional) — chamado do menu / criação.
     * Mantém só hooks: não substitui o wizard do CEO.
     */
    renderPreGamePicker(container, onContinue) {
      const levels = CGL.Data.difficultyLevels || [];
      const modes = CGL.Data.startModes || [];
      let levelId = 'normal';
      let modeId = 'empreendedor';
      container.innerHTML = `
        <div class="pregame-diff">
          <h2>Configurar partida</h2>
          <label>Dificuldade
            <select id="pg-level">
              ${levels.map((l) =>
                `<option value="${l.id}" ${l.id === 'normal' ? 'selected' : ''}>${CGL.Utils.escapeHtml(l.nome)}</option>`
              ).join('')}
            </select>
          </label>
          <label>Modo
            <select id="pg-mode">
              ${modes.map((m) =>
                `<option value="${m.id}">${CGL.Utils.escapeHtml(m.nome)}</option>`
              ).join('')}
            </select>
          </label>
          <button type="button" class="btn btn-primary" id="pg-go">Continuar para o CEO</button>
        </div>
      `;
      container.querySelector('#pg-go').onclick = () => {
        levelId = container.querySelector('#pg-level').value;
        modeId = container.querySelector('#pg-mode').value;
        if (typeof onContinue === 'function') onContinue({ levelId, modeId });
      };
    }
  };

  global.CGL = global.CGL || {};
  global.CGL.DifficultyUI = DifficultyUI;
  global.CGL.SandboxUI = DifficultyUI;
})(typeof window !== 'undefined' ? window : globalThis);
