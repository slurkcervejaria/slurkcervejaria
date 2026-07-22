/**
 * Cardápio oficial slürk (chopeira) — barris de 30L e 50L.
 * Fonte única de dados do site — ao migrar para uma API/CMS,
 * basta trocar este módulo por um fetch mantendo o mesmo contrato.
 *
 * DRINKS agrupa cada bebida com suas variações de volume (para os cards);
 * PRODUCTS é a lista achatada (uma entrada por barril) usada pelo carrinho.
 */
export const CATEGORIES = [
  { id: 'com-alcool', label: 'Com álcool' },
  { id: 'sem-alcool', label: 'Sem álcool' },
];

export const DRINKS = [
  {
    id: 'chopp-pilsen',
    name: 'Chopp Pilsen',
    tagline: 'O Clássico',
    category: 'com-alcool',
    description: 'Leve, dourado e refrescante — aquele chopp que desce redondo do primeiro ao último copo. Unanimidade em qualquer festa.',
    image: 'assets/img/products/chopp-pilsen.svg',
    featured: true,
    variants: [
      { id: 'chopp-pilsen-30', volume: '30L', price: 450 },
      { id: 'chopp-pilsen-50', volume: '50L', price: 650 },
    ],
  },
  {
    id: 'chopp-ipa',
    name: 'Chopp IPA',
    tagline: 'Pra Quem Entende',
    category: 'com-alcool',
    description: 'Lúpulo em primeiro plano: aroma cítrico, sabor marcante e personalidade de sobra. Feito pra quem gosta de cerveja com atitude.',
    image: 'assets/img/products/chopp-ipa.svg',
    featured: true,
    variants: [
      { id: 'chopp-ipa-30', volume: '30L', price: 600 },
      { id: 'chopp-ipa-50', volume: '50L', price: 900 },
    ],
  },
  {
    id: 'slurk-mate',
    name: 'Slürk Mate',
    tagline: 'Nossa Criação',
    category: 'sem-alcool',
    description: 'Mate gelado, gaseificado e do jeitinho que os mineiros gostam — refrescante, levemente doce e perigoso de tão fácil de beber.',
    image: 'assets/img/products/slurk-mate.svg',
    featured: true,
    variants: [
      { id: 'slurk-mate-30', volume: '30L', price: 480 },
      { id: 'slurk-mate-50', volume: '50L', price: 700 },
    ],
  },
  {
    id: 'caipirinha',
    name: 'Caipirinha Gaseificada',
    tagline: 'A Brasileira',
    category: 'com-alcool',
    description: 'Limão, cachaça e gás na medida certa — a caipirinha de sempre, servida na pressão, sempre gelada e sem trabalho pra ninguém.',
    image: 'assets/img/products/caipirinha.svg',
    featured: true,
    variants: [
      { id: 'caipirinha-30', volume: '30L', price: 480 },
      { id: 'caipirinha-50', volume: '50L', price: 700 },
    ],
  },
  {
    id: 'chopp-vinho',
    name: 'Chopp de Vinho',
    tagline: 'O Diferente',
    category: 'com-alcool',
    description: 'Frisante, frutado e servido bem gelado. A elegância do vinho com a leveza do chopp — sucesso garantido no fim de tarde.',
    image: 'assets/img/products/chopp-vinho.svg',
    featured: false,
    variants: [
      { id: 'chopp-vinho-30', volume: '30L', price: 600 },
      { id: 'chopp-vinho-50', volume: '50L', price: 900 },
    ],
  },
  {
    id: 'agua-gaseificada',
    name: 'Água Gaseificada',
    tagline: 'A Equilibrada',
    category: 'sem-alcool',
    description: 'Geladinha, com gás na conta certa pra acompanhar a festa do começo ao fim. Não vai dar PT!',
    image: 'assets/img/products/agua-gaseificada.svg',
    featured: false,
    variants: [
      { id: 'agua-gaseificada-30', volume: '30L', price: 100 },
      { id: 'agua-gaseificada-50', volume: '50L', price: 150 },
    ],
  },
];

/** Lista achatada: um produto por barril (contrato do carrinho/checkout). */
export const PRODUCTS = DRINKS.flatMap((drink) =>
  drink.variants.map((v) => ({
    id: v.id,
    name: `${drink.name} — Barril ${v.volume}`,
    category: drink.category,
    style: drink.tagline,
    description: drink.description,
    volume: `Barril ${v.volume}`,
    abv: null,
    ibu: null,
    price: v.price,
    image: drink.image,
    featured: drink.featured,
  })),
);

/** Busca um produto (barril) pelo id. */
export function getProduct(id) {
  return PRODUCTS.find((p) => p.id === id) ?? null;
}
