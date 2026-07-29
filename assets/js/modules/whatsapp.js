/**
 * Finalização de pedidos via WhatsApp.
 *
 * O site não exibe preços: o cliente monta o carrinho e o pedido é fechado
 * numa conversa com a cervejaria, que responde com o orçamento. Este módulo
 * é a fonte única do número de destino e do formato da mensagem, usado pelo
 * checkout (envio) e pela página de confirmação (reenvio).
 */

/* Número oficial de pedidos da cervejaria (formato internacional, só dígitos) */
export const WHATSAPP_NUMBER = '5531973265982';

/** Monta a mensagem que o cliente envia para a cervejaria. */
export function buildOrderMessage(order) {
  const lines = [
    '🍺 *Novo pedido — slürk BEER*',
    '',
    '*Itens*',
    ...order.items.map((i) => `• ${i.qty}× ${i.name}`),
    '',
    '*Cliente*',
    `Nome: ${order.customer.name}`,
    `WhatsApp: ${order.customer.phone}`,
    '',
    '*Entrega*',
    order.customer.address,
  ];

  if (order.customer.cep) lines.push(`CEP: ${order.customer.cep}`);

  if (order.notes) {
    lines.push('', '*Observações*', order.notes);
  }

  lines.push('', 'Pedido montado pelo site. Aguardo o orçamento, por favor!');
  return lines.join('\n');
}

/** Link wa.me com a mensagem do pedido já preenchida. */
export function orderWhatsappUrl(order) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildOrderMessage(order))}`;
}
