// Configuração e conteúdo do catálogo. Troque os valores entre colchetes [ ] pelos dados reais.

export const config = {
  // Só dígitos, com DDI + DDD (ex.: 5511999999999). Enquanto for placeholder, o botão "Encomendar" leva à loja.
  whatsapp: '[WHATSAPP]',
  instagram: '[LINK_INSTAGRAM]',
  storeUrl: 'https://jpdemg.github.io/laberna-dulce/',
}

export const categories = [
  { slug: 'bem-casados', label: 'Bem-casados' },
  { slug: 'bolos', label: 'Bolos' },
  { slug: 'docinhos', label: 'Docinhos' },
  { slug: 'sobremesas', label: 'Sobremesas' },
  { slug: 'linha-to-go', label: 'Linha To Go' },
]

// Mesmos multiplicadores de tamanho da loja (laberna-dulce/src/data/pricing.js).
export const sizes = [
  { label: 'P', multiplier: 0.8 },
  { label: 'M', multiplier: 1 },
  { label: 'G', multiplier: 1.3 },
]

// Cada produto:
//   id        texto único, sem espaço (vira âncora #produto-id)
//   name      nome exibido
//   category  slug de uma das categorias acima
//   price     preço base (tamanho M) em reais; null = "sob consulta"
//   unit      opcional, ex.: 'unidade', 'cento', 'caixa com 6'
//   sized     true = mostra os tamanhos P/M/G (bolos); false = preço único
//   tag       opcional, selo no card (ex.: 'mais pedido', 'novo')
//   description  texto do detalhe
//   images    lista de caminhos de foto (ex.: 'assets/produtos/bem-casado.jpg'); vazia = arte placeholder
export const products = [
  {
    id: 'produto-1',
    name: '[Nome do produto]',
    category: 'bem-casados',
    price: null,
    unit: 'unidade',
    sized: false,
    tag: 'mais pedido',
    description: '[Descrição do produto]',
    images: [],
  },
  {
    id: 'produto-2',
    name: '[Nome do produto]',
    category: 'bolos',
    price: null,
    sized: true,
    description: '[Descrição do produto]',
    images: [],
  },
  {
    id: 'produto-3',
    name: '[Nome do produto]',
    category: 'docinhos',
    price: null,
    unit: 'cento',
    sized: false,
    description: '[Descrição do produto]',
    images: [],
  },
  {
    id: 'produto-4',
    name: '[Nome do produto]',
    category: 'sobremesas',
    price: null,
    sized: false,
    tag: 'novo',
    description: '[Descrição do produto]',
    images: [],
  },
  {
    id: 'produto-5',
    name: '[Nome do produto]',
    category: 'linha-to-go',
    price: null,
    sized: false,
    description: '[Descrição do produto]',
    images: [],
  },
  {
    id: 'produto-6',
    name: '[Nome do produto]',
    category: 'bolos',
    price: null,
    sized: true,
    description: '[Descrição do produto]',
    images: [],
  },
]
