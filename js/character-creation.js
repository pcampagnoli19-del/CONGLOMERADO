/**
 * CONGLOMERADO — Criação completa do CEO
 * Fluxo multi-etapas antes do Dashboard.
 */
(function (global) {
  'use strict';

  const STEPS = [
    { id: 'identidade', titulo: 'Identidade' },
    { id: 'avatar', titulo: 'Aparência' },
    { id: 'cidades', titulo: 'Cidades' },
    { id: 'formacao', titulo: 'Formação' },
    { id: 'atributos', titulo: 'Atributos' },
    { id: 'personalidade', titulo: 'Personalidade' },
    { id: 'sonhos', titulo: 'Sonhos' },
    { id: 'origem', titulo: 'Origem' },
    { id: 'resumo', titulo: 'Resumo' }
  ];

  const AVATAR_OPTS = {
    pele: ['#f5d0b0', '#e0ac69', '#c68642', '#8d5524', '#5c3310', '#3b2210'],
    cabelo: ['#1a1a1a', '#4a3728', '#8b4513', '#d4a017', '#c0c0c0', '#e8d5b7', 'transparent'],
    cabeloEstilo: ['curto', 'medio', 'longo', 'careca', 'topete'],
    barba: ['nenhuma', 'shadow', 'cheia', 'bigode'],
    oculos: ['nenhum', 'redondo', 'quadrado'],
    roupa: ['#1a365d', '#276749', '#742a2a', '#2d3748', '#744210', '#553c9a']
  };

  const CharacterCreation = {
    step: 0,
    data: null,
    cityPage: { birth: 0, home: 0 },
    cityFilter: { birth: '', home: '', estado: '' },
    courseFilter: '',
    coursePage: 0,

    reset() {
      const start = new Date(CGL.World.START_DATE + 'T12:00:00');
      const birth = CGL.Utils.birthDateForAge22(start);
      const attrs = CGL.Player.defaultAttributes();
      this.step = 0;
      this.cityPage = { birth: 0, home: 0 };
      this.cityFilter = { birth: '', home: '', estado: '' };
      this.courseFilter = '';
      this.coursePage = 0;
      this.data = {
        nome: '',
        sobrenome: '',
        sexo: 'M',
        dataNascimento: birth.toISOString().slice(0, 10),
        avatar: {
          pele: AVATAR_OPTS.pele[1],
          cabelo: AVATAR_OPTS.cabelo[0],
          cabeloEstilo: 'curto',
          barba: 'nenhuma',
          oculos: 'nenhum',
          roupa: AVATAR_OPTS.roupa[0]
        },
        cidadeNascimentoId: null,
        cidadeMoradiaId: null,
        cursoId: null,
        atributos: attrs,
        pontosRestantes: CGL.Data.ATTR_POINTS,
        tracos: [],
        sonhos: [],
        origemId: 'media'
      };
    },

    render(container) {
      if (!this.data) this.reset();
      container.innerHTML = `
        <div class="creation-shell">
          <header class="creation-header">
            <div class="brand-mark">CONGLOMERADO</div>
            <h1>Criação do CEO</h1>
            <p class="muted">Você tem 22 anos e acaba de se formar. Defina quem será o protagonista da campanha.</p>
            <ol class="creation-steps" id="creation-steps"></ol>
          </header>
          <div class="creation-body" id="creation-body"></div>
          <footer class="creation-footer">
            <button type="button" class="btn btn-ghost" id="cc-back">Voltar</button>
            <button type="button" class="btn btn-primary" id="cc-next">Continuar</button>
          </footer>
        </div>
      `;
      this._renderSteps();
      this._renderBody();
      container.querySelector('#cc-back').onclick = () => this.prev();
      container.querySelector('#cc-next').onclick = () => this.next();
    },

    _renderSteps() {
      const el = document.getElementById('creation-steps');
      if (!el) return;
      el.innerHTML = STEPS.map((s, i) => `
        <li class="${i === this.step ? 'active' : ''} ${i < this.step ? 'done' : ''}">
          <span class="step-num">${i + 1}</span>
          <span class="step-label">${s.titulo}</span>
        </li>
      `).join('');
    },

    _renderBody() {
      const body = document.getElementById('creation-body');
      const back = document.getElementById('cc-back');
      const next = document.getElementById('cc-next');
      if (!body) return;
      back.disabled = this.step === 0;
      next.textContent = this.step === STEPS.length - 1 ? 'Iniciar campanha' : 'Continuar';

      const id = STEPS[this.step].id;
      if (id === 'identidade') this._renderIdentidade(body);
      else if (id === 'avatar') this._renderAvatar(body);
      else if (id === 'cidades') this._renderCidades(body);
      else if (id === 'formacao') this._renderFormacao(body);
      else if (id === 'atributos') this._renderAtributos(body);
      else if (id === 'personalidade') this._renderPersonalidade(body);
      else if (id === 'sonhos') this._renderSonhos(body);
      else if (id === 'origem') this._renderOrigem(body);
      else if (id === 'resumo') this._renderResumo(body);
    },

    _renderIdentidade(body) {
      const d = this.data;
      body.innerHTML = `
        <div class="form-grid">
          <label class="field">
            <span>Nome</span>
            <input type="text" id="cc-nome" maxlength="40" value="${CGL.Utils.escapeHtml(d.nome)}" placeholder="Ex.: Pedro" autocomplete="off" />
          </label>
          <label class="field">
            <span>Sobrenome</span>
            <input type="text" id="cc-sobrenome" maxlength="40" value="${CGL.Utils.escapeHtml(d.sobrenome)}" placeholder="Ex.: Campagnoli" autocomplete="off" />
          </label>
          <label class="field">
            <span>Sexo</span>
            <select id="cc-sexo">
              <option value="M" ${d.sexo === 'M' ? 'selected' : ''}>Masculino</option>
              <option value="F" ${d.sexo === 'F' ? 'selected' : ''}>Feminino</option>
              <option value="O" ${d.sexo === 'O' ? 'selected' : ''}>Outro</option>
            </select>
          </label>
          <label class="field">
            <span>Data de nascimento</span>
            <input type="date" id="cc-birth" value="${d.dataNascimento}" />
            <small class="hint">Idade fixa: 22 anos no início da campanha.</small>
          </label>
        </div>
      `;
      const birthInput = body.querySelector('#cc-birth');
      birthInput.addEventListener('change', () => {
        // Mantém idade 22: recalcula data se o jogador alterar
        const start = new Date(CGL.World.START_DATE + 'T12:00:00');
        const forced = CGL.Utils.birthDateForAge22(start);
        birthInput.value = forced.toISOString().slice(0, 10);
        d.dataNascimento = birthInput.value;
        CGL.UI.toast('Idade inicial fixada em 22 anos.', 'alert');
      });
    },

    _renderAvatar(body) {
      const a = this.data.avatar;
      body.innerHTML = `
        <div class="avatar-creator">
          <div class="avatar-preview-wrap">
            <div class="avatar-css" id="cc-avatar-preview"></div>
          </div>
          <div class="avatar-controls">
            ${this._swatchRow('Pele', 'pele', AVATAR_OPTS.pele, a.pele, true)}
            ${this._swatchRow('Cabelo', 'cabelo', AVATAR_OPTS.cabelo, a.cabelo, true)}
            <label class="field"><span>Estilo de cabelo</span>
              <select id="cc-cabeloEstilo">${AVATAR_OPTS.cabeloEstilo.map((s) =>
                `<option value="${s}" ${a.cabeloEstilo === s ? 'selected' : ''}>${s}</option>`
              ).join('')}</select>
            </label>
            <label class="field"><span>Barba</span>
              <select id="cc-barba">${AVATAR_OPTS.barba.map((s) =>
                `<option value="${s}" ${a.barba === s ? 'selected' : ''}>${s}</option>`
              ).join('')}</select>
            </label>
            <label class="field"><span>Óculos</span>
              <select id="cc-oculos">${AVATAR_OPTS.oculos.map((s) =>
                `<option value="${s}" ${a.oculos === s ? 'selected' : ''}>${s}</option>`
              ).join('')}</select>
            </label>
            ${this._swatchRow('Roupa', 'roupa', AVATAR_OPTS.roupa, a.roupa, true)}
          </div>
        </div>
      `;
      this._paintAvatar(document.getElementById('cc-avatar-preview'), a);
      body.querySelectorAll('[data-swatch]').forEach((btn) => {
        btn.onclick = () => {
          const key = btn.dataset.swatch;
          a[key] = btn.dataset.value;
          this._renderBody();
        };
      });
      ['cabeloEstilo', 'barba', 'oculos'].forEach((key) => {
        const el = body.querySelector(`#cc-${key}`);
        if (el) el.onchange = () => { a[key] = el.value; this._paintAvatar(document.getElementById('cc-avatar-preview'), a); };
      });
    },

    _swatchRow(label, key, values, current, isColor) {
      return `
        <div class="field">
          <span>${label}</span>
          <div class="swatches">
            ${values.map((v) => `
              <button type="button" class="swatch ${current === v ? 'active' : ''}"
                data-swatch="${key}" data-value="${v}"
                style="${isColor ? `background:${v === 'transparent' ? '#222' : v}` : ''}"
                title="${v}"></button>
            `).join('')}
          </div>
        </div>
      `;
    },

    _paintAvatar(el, a) {
      if (!el) return;
      const hairH = a.cabeloEstilo === 'longo' ? '38%' : a.cabeloEstilo === 'medio' ? '28%' : a.cabeloEstilo === 'topete' ? '22%' : '18%';
      const showHair = a.cabeloEstilo !== 'careca' && a.cabelo !== 'transparent';
      el.innerHTML = `
        <div class="av-body" style="background:${a.roupa}">
          <div class="av-neck" style="background:${a.pele}"></div>
          <div class="av-head" style="background:${a.pele}">
            ${showHair ? `<div class="av-hair av-hair-${a.cabeloEstilo}" style="background:${a.cabelo};height:${hairH}"></div>` : ''}
            <div class="av-eyes"><span></span><span></span></div>
            ${a.oculos !== 'nenhum' ? `<div class="av-glasses av-glasses-${a.oculos}"></div>` : ''}
            ${a.barba !== 'nenhuma' ? `<div class="av-beard av-beard-${a.barba}" style="background:${a.cabelo === 'transparent' ? '#333' : a.cabelo}"></div>` : ''}
            <div class="av-mouth"></div>
          </div>
        </div>
      `;
    },

    _renderCidades(body) {
      body.innerHTML = `
        <div class="city-pick-grid">
          <section>
            <h3>Cidade natal</h3>
            <div class="toolbar">
              <input type="search" id="cc-birth-q" placeholder="Buscar município..." value="${CGL.Utils.escapeHtml(this.cityFilter.birth)}" />
              <select id="cc-birth-uf"><option value="">Todos os estados</option>${this._ufOptions()}</select>
            </div>
            <div id="cc-birth-list" class="city-list"></div>
            <div class="pager" id="cc-birth-pager"></div>
          </section>
          <section>
            <h3>Cidade onde vai morar</h3>
            <div class="toolbar">
              <input type="search" id="cc-home-q" placeholder="Buscar município..." value="${CGL.Utils.escapeHtml(this.cityFilter.home)}" />
            </div>
            <div id="cc-home-list" class="city-list"></div>
            <div class="pager" id="cc-home-pager"></div>
            <label class="checkbox-row"><input type="checkbox" id="cc-same-city" /> Usar a mesma cidade natal</label>
          </section>
        </div>
      `;
      const refresh = (which) => this._fillCityList(which);
      body.querySelector('#cc-birth-q').oninput = CGL.Utils.debounce((e) => {
        this.cityFilter.birth = e.target.value;
        this.cityPage.birth = 0;
        refresh('birth');
      }, 150);
      body.querySelector('#cc-home-q').oninput = CGL.Utils.debounce((e) => {
        this.cityFilter.home = e.target.value;
        this.cityPage.home = 0;
        refresh('home');
      }, 150);
      body.querySelector('#cc-birth-uf').onchange = (e) => {
        this.cityFilter.estado = e.target.value;
        this.cityPage.birth = 0;
        refresh('birth');
      };
      body.querySelector('#cc-same-city').onchange = (e) => {
        if (e.target.checked && this.data.cidadeNascimentoId) {
          this.data.cidadeMoradiaId = this.data.cidadeNascimentoId;
          refresh('home');
        }
      };
      refresh('birth');
      refresh('home');
    },

    _ufOptions() {
      const ufs = [...new Set(CGL.Data.cities.map((c) => c.estado))].sort();
      return ufs.map((u) => `<option value="${u}" ${this.cityFilter.estado === u ? 'selected' : ''}>${u}</option>`).join('');
    },

    _fillCityList(which) {
      const pageSize = 8;
      const q = which === 'birth' ? this.cityFilter.birth : this.cityFilter.home;
      let list = CGL.Data.searchCities(q, 680);
      if (which === 'birth' && this.cityFilter.estado) {
        list = list.filter((c) => c.estado === this.cityFilter.estado);
      }
      const page = this.cityPage[which];
      const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
      const slice = list.slice(page * pageSize, page * pageSize + pageSize);
      const selected = which === 'birth' ? this.data.cidadeNascimentoId : this.data.cidadeMoradiaId;
      const listEl = document.getElementById(`cc-${which}-list`);
      const pagerEl = document.getElementById(`cc-${which}-pager`);
      if (!listEl) return;
      listEl.innerHTML = slice.map((c) => `
        <button type="button" class="city-item ${selected === c.id ? 'selected' : ''}" data-id="${c.id}">
          <strong>${CGL.Utils.escapeHtml(c.nome)}/${c.estado}</strong>
          <span class="muted">${c.regiao} · Pop. ${CGL.Utils.formatLargeNumber(c.populacao)}</span>
          <div class="mini-bars">
            <span title="Custo de vida">💰 ${c.custoVida}</span>
            <span title="Segurança">🛡 ${c.seguranca}</span>
            <span title="Educação">📚 ${c.educacao}</span>
            <span title="Desenvolvimento">📈 ${c.desenvolvimentoEconomico}</span>
            <span title="Potencial">🏢 ${c.potencialEmpresarial}</span>
          </div>
        </button>
      `).join('') || '<p class="muted">Nenhuma cidade encontrada.</p>';
      listEl.querySelectorAll('.city-item').forEach((btn) => {
        btn.onclick = () => {
          if (which === 'birth') this.data.cidadeNascimentoId = btn.dataset.id;
          else this.data.cidadeMoradiaId = btn.dataset.id;
          this._fillCityList(which);
        };
      });
      pagerEl.innerHTML = `
        <button type="button" class="btn btn-sm" ${page <= 0 ? 'disabled' : ''} data-dir="-1">Anterior</button>
        <span>${page + 1} / ${totalPages} (${list.length} cidades)</span>
        <button type="button" class="btn btn-sm" ${page >= totalPages - 1 ? 'disabled' : ''} data-dir="1">Próxima</button>
      `;
      pagerEl.querySelectorAll('button').forEach((b) => {
        b.onclick = () => {
          this.cityPage[which] = CGL.Utils.clamp(page + Number(b.dataset.dir), 0, totalPages - 1);
          this._fillCityList(which);
        };
      });
    },

    _renderFormacao(body) {
      const courses = CGL.Data.courses.filter((c) => {
        const q = this.courseFilter.toLowerCase();
        if (!q) return true;
        return c.nome.toLowerCase().includes(q) || c.area.toLowerCase().includes(q);
      });
      const pageSize = 6;
      const totalPages = Math.max(1, Math.ceil(courses.length / pageSize));
      if (this.coursePage >= totalPages) this.coursePage = 0;
      const slice = courses.slice(this.coursePage * pageSize, this.coursePage * pageSize + pageSize);
      body.innerHTML = `
        <div class="toolbar">
          <input type="search" id="cc-course-q" placeholder="Filtrar cursos..." value="${CGL.Utils.escapeHtml(this.courseFilter)}" />
          <span class="muted">${courses.length} cursos</span>
        </div>
        <div class="course-grid">
          ${slice.map((c) => `
            <button type="button" class="course-card ${this.data.cursoId === c.id ? 'selected' : ''}" data-id="${c.id}">
              <div class="course-area">${c.area}</div>
              <h4>${CGL.Utils.escapeHtml(c.nome)}</h4>
              <p><strong>Vantagens:</strong> ${c.vantagens.join('; ')}</p>
              <p><strong>Desvantagens:</strong> ${c.desvantagens.join('; ')}</p>
              <p class="muted">Afinidades: ${Object.entries(c.afinidades).map(([k, v]) => `${k} ${v}`).join(', ')}</p>
            </button>
          `).join('')}
        </div>
        <div class="pager" id="cc-course-pager">
          <button type="button" class="btn btn-sm" id="cc-course-prev">Anterior</button>
          <span>${this.coursePage + 1} / ${totalPages}</span>
          <button type="button" class="btn btn-sm" id="cc-course-next">Próxima</button>
        </div>
      `;
      body.querySelector('#cc-course-q').oninput = CGL.Utils.debounce((e) => {
        this.courseFilter = e.target.value;
        this.coursePage = 0;
        this._renderFormacao(body);
      }, 150);
      body.querySelectorAll('.course-card').forEach((btn) => {
        btn.onclick = () => {
          this.data.cursoId = btn.dataset.id;
          this._renderFormacao(body);
        };
      });
      body.querySelector('#cc-course-prev').onclick = () => {
        this.coursePage = Math.max(0, this.coursePage - 1);
        this._renderFormacao(body);
      };
      body.querySelector('#cc-course-next').onclick = () => {
        this.coursePage = Math.min(totalPages - 1, this.coursePage + 1);
        this._renderFormacao(body);
      };
    },

    _renderAtributos(body) {
      const defs = CGL.Data.attributeDefs;
      body.innerHTML = `
        <p class="muted">Distribua <strong id="cc-pts">${this.data.pontosRestantes}</strong> pontos. Base ${CGL.Data.ATTR_BASE}, máximo ${CGL.Data.ATTR_MAX} por atributo.</p>
        <div class="attr-grid">
          ${defs.map((a) => {
            const v = this.data.atributos[a.id];
            return `
              <div class="attr-row" data-attr="${a.id}">
                <div>
                  <strong>${a.nome}</strong>
                  <small class="muted">${a.desc}</small>
                </div>
                <div class="attr-controls">
                  <button type="button" class="btn btn-sm" data-delta="-1">−</button>
                  <span class="attr-val">${v}</span>
                  <button type="button" class="btn btn-sm" data-delta="1">+</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
      body.querySelectorAll('.attr-row').forEach((row) => {
        row.querySelectorAll('button').forEach((btn) => {
          btn.onclick = () => {
            const id = row.dataset.attr;
            const delta = Number(btn.dataset.delta);
            const cur = this.data.atributos[id];
            if (delta > 0) {
              if (this.data.pontosRestantes <= 0) return;
              if (cur >= CGL.Data.ATTR_MAX) return;
              this.data.atributos[id] = cur + 1;
              this.data.pontosRestantes -= 1;
            } else {
              if (cur <= CGL.Data.ATTR_BASE) return;
              this.data.atributos[id] = cur - 1;
              this.data.pontosRestantes += 1;
            }
            this._renderAtributos(body);
          };
        });
      });
    },

    _renderPersonalidade(body) {
      const max = CGL.Data.TRAIT_PICKS;
      body.innerHTML = `
        <p class="muted">Escolha até <strong>${max}</strong> traços (${this.data.tracos.length}/${max}). Traços opostos não podem ser combinados.</p>
        <div class="chip-grid">
          ${CGL.Data.traits.map((t) => `
            <button type="button" class="chip ${this.data.tracos.includes(t.id) ? 'selected' : ''}" data-id="${t.id}">
              ${t.nome}
            </button>
          `).join('')}
        </div>
      `;
      body.querySelectorAll('.chip').forEach((btn) => {
        btn.onclick = () => {
          const id = btn.dataset.id;
          const trait = CGL.Data.getTraitById(id);
          const idx = this.data.tracos.indexOf(id);
          if (idx >= 0) {
            this.data.tracos.splice(idx, 1);
          } else {
            if (this.data.tracos.length >= max) {
              CGL.UI.toast(`Máximo de ${max} traços.`, 'alert');
              return;
            }
            if (trait.oposto && this.data.tracos.includes(trait.oposto)) {
              CGL.UI.toast('Não combine traços opostos.', 'alert');
              return;
            }
            // Também checa se algum selecionado tem este como oposto
            const conflict = this.data.tracos.some((tid) => {
              const t = CGL.Data.getTraitById(tid);
              return t?.oposto === id;
            });
            if (conflict) {
              CGL.UI.toast('Não combine traços opostos.', 'alert');
              return;
            }
            this.data.tracos.push(id);
          }
          this._renderPersonalidade(body);
        };
      });
    },

    _renderSonhos(body) {
      const max = CGL.Data.DREAM_PICKS;
      body.innerHTML = `
        <p class="muted">Escolha até <strong>${max}</strong> sonhos de longo prazo (${this.data.sonhos.length}/${max}).</p>
        <div class="dream-grid">
          ${CGL.Data.dreams.map((d) => `
            <button type="button" class="dream-card ${this.data.sonhos.includes(d.id) ? 'selected' : ''}" data-id="${d.id}">
              <h4>${CGL.Utils.escapeHtml(d.nome)}</h4>
              <p>${CGL.Utils.escapeHtml(d.descricao)}</p>
            </button>
          `).join('')}
        </div>
      `;
      body.querySelectorAll('.dream-card').forEach((btn) => {
        btn.onclick = () => {
          const id = btn.dataset.id;
          const idx = this.data.sonhos.indexOf(id);
          if (idx >= 0) this.data.sonhos.splice(idx, 1);
          else if (this.data.sonhos.length < max) this.data.sonhos.push(id);
          else CGL.UI.toast(`Máximo de ${max} sonhos.`, 'alert');
          this._renderSonhos(body);
        };
      });
    },

    _renderOrigem(body) {
      body.innerHTML = `
        <p class="muted">Nenhuma origem é easy mode absoluto — riqueza traz pressão, escrutínio e rivalidade; pobreza traz fome e escassez.</p>
        <div class="origin-grid">
          ${CGL.Data.familyOrigins.map((o) => `
            <button type="button" class="origin-card ${this.data.origemId === o.id ? 'selected' : ''}" data-id="${o.id}">
              <h4>${CGL.Utils.escapeHtml(o.nome)}</h4>
              <p>${CGL.Utils.escapeHtml(o.descricao)}</p>
              <ul class="origin-stats">
                <li>Capital: ${CGL.Utils.formatBRL(o.capitalInicial)}</li>
                <li>Contatos: ${o.contatos}</li>
                <li>Acesso ao mercado: ${o.acessoMercado}</li>
                <li>Pressão familiar: ${o.pressao}</li>
                <li>Motivação: ${o.motivacaoBonus >= 0 ? '+' : ''}${o.motivacaoBonus}</li>
              </ul>
            </button>
          `).join('')}
        </div>
      `;
      body.querySelectorAll('.origin-card').forEach((btn) => {
        btn.onclick = () => {
          this.data.origemId = btn.dataset.id;
          this._renderOrigem(body);
        };
      });
    },

    _renderResumo(body) {
      const d = this.data;
      const course = CGL.Data.getCourseById(d.cursoId);
      const birth = CGL.Data.getCityById(d.cidadeNascimentoId);
      const home = CGL.Data.getCityById(d.cidadeMoradiaId);
      const origin = CGL.Data.getOriginById(d.origemId);
      const traits = d.tracos.map((id) => CGL.Data.getTraitById(id)?.nome).filter(Boolean);
      const dreams = d.sonhos.map((id) => CGL.Data.getDreamById(id)?.nome).filter(Boolean);
      body.innerHTML = `
        <div class="resumo-grid">
          <div class="avatar-preview-wrap"><div class="avatar-css" id="cc-resumo-avatar"></div></div>
          <div>
            <h3>${CGL.Utils.escapeHtml(d.nome)} ${CGL.Utils.escapeHtml(d.sobrenome)}</h3>
            <p>22 anos · ${d.sexo === 'M' ? 'Masculino' : d.sexo === 'F' ? 'Feminino' : 'Outro'}</p>
            <p>Formação: <strong>${course?.nome || '—'}</strong></p>
            <p>Nasceu em: <strong>${birth ? `${birth.nome}/${birth.estado}` : '—'}</strong></p>
            <p>Mora em: <strong>${home ? `${home.nome}/${home.estado}` : '—'}</strong></p>
            <p>Origem: <strong>${origin?.nome || '—'}</strong> · Capital ${CGL.Utils.formatBRL(origin?.capitalInicial || 0)}</p>
            <p>Traços: ${traits.join(', ') || '—'}</p>
            <p>Sonhos: ${dreams.join(', ') || '—'}</p>
            <p class="muted">Família NPC será gerada automaticamente ao iniciar.</p>
          </div>
        </div>
      `;
      this._paintAvatar(document.getElementById('cc-resumo-avatar'), d.avatar);
    },

    _collectCurrentStep() {
      const id = STEPS[this.step].id;
      if (id === 'identidade') {
        this.data.nome = document.getElementById('cc-nome')?.value.trim() || '';
        this.data.sobrenome = document.getElementById('cc-sobrenome')?.value.trim() || '';
        this.data.sexo = document.getElementById('cc-sexo')?.value || 'M';
        this.data.dataNascimento = document.getElementById('cc-birth')?.value || this.data.dataNascimento;
      }
    },

    _validateStep() {
      this._collectCurrentStep();
      const d = this.data;
      const id = STEPS[this.step].id;
      if (id === 'identidade') {
        if (d.nome.length < 2) return 'Informe um nome válido.';
        if (d.sobrenome.length < 2) return 'Informe um sobrenome válido.';
      }
      if (id === 'cidades') {
        if (!d.cidadeNascimentoId) return 'Selecione a cidade natal.';
        if (!d.cidadeMoradiaId) return 'Selecione a cidade onde vai morar.';
      }
      if (id === 'formacao' && !d.cursoId) return 'Selecione um curso.';
      if (id === 'atributos' && d.pontosRestantes > 0) return `Ainda restam ${d.pontosRestantes} pontos de atributo.`;
      if (id === 'personalidade' && d.tracos.length < 1) return 'Escolha pelo menos 1 traço de personalidade.';
      if (id === 'sonhos' && d.sonhos.length < 1) return 'Escolha pelo menos 1 sonho.';
      if (id === 'origem' && !d.origemId) return 'Selecione a origem familiar.';
      return null;
    },

    prev() {
      this._collectCurrentStep();
      if (this.step > 0) {
        this.step -= 1;
        this._renderSteps();
        this._renderBody();
      }
    },

    next() {
      const err = this._validateStep();
      if (err) {
        CGL.UI.toast(err, 'alert');
        return;
      }
      if (this.step < STEPS.length - 1) {
        this.step += 1;
        this._renderSteps();
        this._renderBody();
        return;
      }
      // Finaliza
      CGL.Game.finishCharacterCreation({ ...this.data });
    },

    /** Renderiza avatar em qualquer container (Dashboard etc.) */
    renderAvatarInto(el, avatar) {
      this._paintAvatar(el, avatar || this.data?.avatar);
    }
  };

  global.CGL = global.CGL || {};
  global.CGL.CharacterCreation = CharacterCreation;
  global.CGL.AVATAR_OPTS = AVATAR_OPTS;
})(typeof window !== 'undefined' ? window : globalThis);
