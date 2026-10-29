# Laberna Catálogo

Catálogo de doces da Laberna Dulce. Site estático (HTML, CSS e JavaScript puro, sem build), publicado pelo GitHub Pages.

## Estrutura

```
index.html        página única: abertura, ateliê, catálogo, como encomendar, rodapé
css/styles.css    tokens da marca (mesmos da loja) e estilos
js/data.js        CONTEÚDO: produtos, categorias, tamanhos, WhatsApp/Instagram
js/main.js        catálogo (filtros, busca, detalhe), revelações no scroll
js/split.js       cena de abertura: bem-casado que se parte conforme o scroll
assets/           logos e favicon
```

## Como adicionar produtos

Tudo fica em `js/data.js`, na lista `products`. Cada produto:

| campo | o que é |
| --- | --- |
| `id` | texto único sem espaço; vira o link direto `#produto-<id>` |
| `name` | nome exibido |
| `category` | slug de uma categoria de `categories` |
| `price` | preço base em reais (tamanho M); `null` mostra "Sob consulta" |
| `unit` | opcional: `'unidade'`, `'cento'`, `'caixa com 6'` |
| `sized` | `true` mostra os tamanhos P/M/G (multiplicadores iguais aos da loja) |
| `tag` | opcional: selo no card (`'mais pedido'`, `'novo'`) |
| `description` | texto do detalhe |
| `images` | caminhos das fotos (ex.: `assets/produtos/bem-casado.jpg`); vazio usa a arte provisória |

Preencha também `config.whatsapp` (só dígitos, com DDI e DDD) para o botão "Encomendar" abrir o WhatsApp com a mensagem pronta. Enquanto for placeholder, ele leva à loja online.

## Rodar localmente

Os scripts são módulos ES, então é preciso um servidor (abrir o arquivo direto não funciona):

```
python3 -m http.server 8000
```

## Animações

- Abertura com scroll: o bem-casado é desembrulhado, racha, se parte girando para mostrar o miolo, o doce de leite estica e as migalhas caem. Rolar para cima desfaz tudo.
- Manifesto com palavras que acendem conforme o scroll.
- Cards entram em cascata; filtro e busca trocam com View Transitions; a foto do card "voa" até o detalhe.
- Quem tem "reduzir movimento" ativado no sistema vê a versão estática.
