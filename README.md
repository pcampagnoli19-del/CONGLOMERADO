# CONGLOMERADO

Jogo de simulação empresarial em **HTML, CSS e JavaScript puros** (sem build, sem frameworks, sem dependências).

## Como abrir

1. Clone ou baixe este repositório.
2. Abra o arquivo `index.html` no navegador (duplo clique ou “Abrir arquivo”).
3. Opcional: sirva a pasta com um servidor local, por exemplo:

```bash
# Python 3
python3 -m http.server 8080
```

Depois acesse `http://localhost:8080`.

Não é necessário instalar Node, npm nem outras ferramentas.

## Estrutura

| Pasta / arquivo | Conteúdo |
|-----------------|----------|
| `index.html` | Entrada do jogo |
| `css/` | Estilos e animações |
| `js/` | Lógica do jogo e da interface |
| `data/` | Dados estáticos (cidades, bancos, segmentos etc.) |
| `assets/` | Ícones e imagens |
| `docs/plano.md` | Plano de implementação por fases |

## Progresso e LocalStorage

O save fica no **LocalStorage** do navegador (chave versionada para expansões futuras). Limpar dados do site no navegador apaga o progresso.

Recomendações:

- Use o mesmo navegador e o mesmo perfil para continuar a partida.
- Em modo anônimo/privado o save some ao fechar a janela.
- Não há servidor nem conta: tudo roda só no seu computador.

## Idioma e tema

Interface e comentários em português. Tema escuro corporativo (verde / vermelho / dourado).

## Plano

Veja o roadmap em [`docs/plano.md`](docs/plano.md).
