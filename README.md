# slürk BEER — Website

Site institucional com e-commerce da cervejaria artesanal **slürk** (ESTD 2025).
Mobile First, sem build step: HTML semântico + CSS moderno + JavaScript vanilla (ES Modules).

## Rodando localmente

Por usar ES Modules, sirva os arquivos por HTTP (não abra via `file://`):

```bash
python3 -m http.server 8000
# http://localhost:8000
```

Qualquer host estático funciona em produção (GitHub Pages, Netlify, Vercel, S3…).

## Estrutura

```
├── index.html            Home (hero, destaques, diferenciais, avaliações, CTA)
├── cardapio.html         Cardápio com busca, filtros, categorias e ordenação
├── carrinho.html         Carrinho (quantidades, observações, resumo)
├── checkout.html         Checkout (dados, pagamento, validação acessível)
├── obrigado.html         Confirmação do pedido + envio via WhatsApp
├── sobre.html            História, missão, produção e valores
├── contato.html          WhatsApp, redes, mapa, horários e formulário
├── 404.html              Página de erro
├── robots.txt / sitemap.xml / site.webmanifest
└── assets/
    ├── css/main.css      Design tokens da marca + componentes (mobile first)
    ├── fonts/            Archivo / Archivo Black (self-hosted, woff2)
    ├── img/              Logos oficiais, favicons e SVGs de produto
    └── js/
        ├── data/products.js    Catálogo — fonte única de dados (pronto p/ virar API)
        ├── modules/cart.js     Estado do carrinho (localStorage + evento cart:changed)
        ├── modules/format.js   Moeda pt-BR, máscara de telefone, escape de HTML
        ├── modules/ui.js       Toast, reveal on scroll, card de produto
        ├── main.js             Global: navegação, badge do carrinho
        └── pages/              Scripts por página (home, menu, cart, checkout…)
```

## Identidade visual

Tokens extraídos do manual da marca:

| Cor | Hex | Uso |
| --- | --- | --- |
| Marrom | `#823B00` | Primária (logo, títulos, botões) |
| Âmbar | `#A15600` | Secundária (links, detalhes) |
| Amarelo | `#EDE662` | Destaque e CTAs |
| Off-white | `#F2EEE9` | Fundo |

Tipografia: **Archivo Black** (display, alinhada ao peso do logo) e **Archivo** (texto), self-hosted em woff2 com `font-display: swap`.

## Decisões técnicas

- **Sem framework/build**: páginas estáticas + ES Modules → deploy trivial, Lighthouse alto, manutenção simples.
- **Carrinho** persistido em `localStorage`; mutações emitem `cart:changed` para desacoplar header/páginas.
- **Checkout** monta um objeto `order` estruturado (função `submitOrder` em `assets/js/pages/checkout.js` é o ponto único de integração futura com backend/gateway de pagamento). Hoje o pedido é confirmado e enviado via WhatsApp.
- **SEO**: meta tags, Open Graph, JSON-LD (`Brewery`, `BreadcrumbList`, `AboutPage`, `ContactPage`), sitemap, robots (carrinho/checkout com `noindex`).
- **Acessibilidade**: HTML semântico, skip link, `aria-current`, `aria-live` (toast/contadores), labels e mensagens de erro por campo, alvos de toque ≥ 44px, `prefers-reduced-motion`.
- **Performance**: fontes com `preload`, imagens com `loading="lazy"` + dimensões explícitas (sem CLS), SVGs vetoriais leves para produtos, CSS único e sem dependências externas.

## Painel administrativo (`/admin/`)

SPA em vanilla JS acessível pelo link "Admin" no rodapé. No primeiro acesso o painel pede a criação de uma senha (hash SHA-256 via WebCrypto). Seções:

- **Pedidos** — pedidos do checkout do site entram automaticamente; mudança de status (novo → confirmado → entregue → recolhido / cancelado), criação manual, emissão de **nota de pedido** numerada e imprimível (documento interno; NF-e oficial exige integração com a SEFAZ).
- **Contratos** — contrato de locação de chopeira gerado do pedido ou avulso, com **assinatura eletrônica desenhada na tela** (canvas), status rascunho/assinado e impressão com as assinaturas.
- **Checklists** — controle de **entrega** e de **busca** da chopeira anexado ao pedido, com responsável, data, observações e impressão.
- **Clientes / Fornecedores** — cadastros CRUD.
- **Financeiro** — lançamento das **notas de compra dos barris** por fornecedor; KPIs de receita, custo, **lucro dos aluguéis** e margem; gráficos SVG comparando **custo médio × preço de venda** por barril, lucro por barril e receita×custo×lucro mensal.
- **Configurações** — troca de senha, backup/restauração em JSON e dados de demonstração.

⚠️ Os dados do painel vivem no `localStorage` do navegador (o contrato de dados em `assets/js/admin/store.js` espelha uma API REST para migração futura). O login client-side é uma barreira de acesso para uso interno — para segurança real (multiusuário, dados sensíveis), migre para um backend autenticado. Faça backups pela aba Configurações.

## Configuração pendente (produção)

- Trocar o domínio placeholder `slurkbeer.com.br` (canonical, OG, sitemap, robots).
- Atualizar `WHATSAPP_NUMBER` em `assets/js/pages/confirm.js` e `contact.js`, telefone/endereço no rodapé e no JSON-LD.
- Substituir as ilustrações SVG por fotos reais dos produtos quando disponíveis.
