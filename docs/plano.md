# CONGLOMERADO — plano de implementação

Jogo de simulação empresarial em HTML5 + CSS3 + JavaScript puro (ES6+), sem dependências. Abre via `index.html` no navegador. Brief completo: [brief original](brief-original.txt).

## Entrega

- Código jogável em `docs/game/` (raiz do jogo: `docs/game/index.html`).
- Comentários e UI em português; tema escuro corporativo (verde / vermelho / dourado).
- Save em LocalStorage com versão para expansões futuras.
- Ciclo semanal central; módulos novos só se encaixam — sem reescrever a base.

## Fases

### Fase 1 — Base + CEO (em andamento)
Engine semanal, estado global expansível, save, shell UI (topbar, menu lateral, telas dinâmicas), Dashboard com cartões, notificações, modais, componentes reutilizáveis, configurações, utils (moeda BRL etc.), criação completa do personagem (avatar CSS, cidades BR, formação, atributos, personalidade, sonhos, origem familiar, família NPC, necessidades, histórico).

### Fase 2 — Empresas e holdings
Constituição, CNPJ fictício, naturezas jurídicas, filiais, quadro societário, compra/venda/fusão, concorrência, reputação, expansão por estados, portes, histórico empresarial.

### Fase 3 — Finanças empresariais
Contas bancárias (PJ/PF separadas), fluxo de caixa, DRE, balanço, empréstimos, garantias, financiamentos, debêntures (base), aplicações, inadimplência, indicadores, dividendos, falência em estágios.

### Fase 4 — Remuneração sócios/admins
Pró-labore, dividendos, aportes, empréstimos sócio–empresa, independência financeira por empresa.

### Fase 5 — Mercado de capitais
Bancos, rating, investidores, valuation, IPO (base), bolsa simplificada, M&A avançado, confiança do mercado.

### Fase 6 — Dívida e captação
Modalidades de crédito, renegociação, notes, crédito intercompany, leasing, project finance, covenants, agenda financeira, eventos de crédito.

### Fase 7 — RH e cultura
Funcionários individuais, hierarquia, recrutamento/avaliação, carreira, benefícios, clima, sindicatos, burnout, eventos de RH.

### Fase 8 — Marketing e marca
Marca, segmentação, campanhas, preços, B2B/B2C, CRM, crises de imagem, lançamentos.

### Fase 9 — P&D e tecnologia
Departamento P&D, árvores por setor, ciclos de produto, patentes, licenças, obsolescência, eventos tech.

### Fase 10 — Logística
Cadeia, fornecedores, estoque, CDs, frota, rotas, riscos e indicadores.

### Fase 11 — Internacional
Países, entrada no exterior, câmbio, EXIM, riscos geopolíticos, subsidiárias.

### Fase 12 — Holding e governança
Árvore societária visual, sinergias, due diligence, conselho, sucessão familiar, departamentos corporativos.

### Fase 13 — Dificuldade, IA, sandbox
Níveis/presets, modos de partida, IA de concorrentes, automação do jogador, conquistas, cheats/debug, balanceamento.

## Notas do brief

- Vários pedidos se repetem (RH, P&D, mercado financeiro, dificuldade); a fase correspondente cobre a união sem duplicar módulos.
- UI dark pedida no brief prevalece sobre preferências genéricas de design.
