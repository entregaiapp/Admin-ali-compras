import { orderItemsMock, statusLabels } from '@/features/orders/constants';
import {
  getOrderAddress,
  getOrderNeighborhood,
  getOrderPaymentMethod,
  getOrderStreetAddress,
} from '@/features/orders/utils/orderUtils';

export const printComanda = (order: any, orderItems: any[] = orderItemsMock) => {
  const subtotal = orderItems.reduce(
    (a, i) => a + (i.price_unit * i.quantity || i.price * i.qty),
    0,
  );
  const delivery =
    order.type === "Entrega" || order.tipo_pedido === "entrega"
      ? order.taxa_entrega || 6.99
      : 0;
  const total = order.total || order.valor_total || 0;
  const orderDate = order.realizado_em || order.criado_em || order.created_at || new Date();

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Comanda ${order.numero_pedido || order.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', Courier, monospace; max-width: 300px; margin: 0 auto; padding: 16px; font-size: 12px; color: #000; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .large { font-size: 15px; }
    .divider-solid { border-top: 1px solid #000; margin: 8px 0; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
    .row-total { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin-bottom: 3px; }
    .obs { font-size: 10px; color: #555; margin: 0 0 5px 16px; font-style: italic; }
    p { margin-bottom: 4px; }
    .tag { display: inline-block; border: 1px solid #000; padding: 1px 6px; font-size: 11px; margin: 2px 0; }
  </style>
</head>
<body>
  <div class="center">
    <p class="large bold">SÃO JORGE SUPER</p>
    <p style="font-size:10px">CNPJ: 00.000.000/0001-00</p>
    <p style="font-size:10px">Rua São Jorge, 100 – Centro</p>
    <p style="font-size:10px">Tel: (11) 3000-0000</p>
  </div>
  <div class="divider-solid"></div>
  <div class="center">
    <p class="bold large">COMANDA DE PEDIDO</p>
    <p>Pedido: <span class="bold">${order.numero_pedido || order.id}</span></p>
    <p>Data: ${new Date(orderDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })} ${new Date(orderDate).toLocaleTimeString("pt-BR")}</p>
    <span class="tag">${(order.tipo_pedido || order.type || "").toUpperCase()}</span>
  </div>
  <div class="divider"></div>
  <p><span class="bold">Cliente:</span> ${order.cliente?.nome || order.customer || "Não informado"}</p>
  <p><span class="bold">Telefone:</span> ${order.cliente?.telefone || order.phone || "Não informado"}</p>
  ${order.cpf_na_nota ? `<p><span class="bold">CPF na nota:</span> ${order.cpf_na_nota_cpf || "Informado"}</p>` : ""}
  ${order.type === "Entrega" || order.tipo_pedido === "entrega" ? `<p><span class="bold">Endereço:</span> ${getOrderAddress(order)}</p><p><span class="bold">Bairro:</span> ${getOrderNeighborhood(order)}</p>` : ""}
  <div class="divider"></div>
  <p class="bold" style="margin-bottom:6px">ITENS DO PEDIDO:</p>
  ${(Array.isArray(orderItems) ? orderItems : [])
    .map(
      (i) => `
    <div class="row">
      <span>${i.quantity || i.qty}x ${i.produto?.nome || i.name}</span>
      <span>R$ ${((i.price_unit || i.price) * (i.quantity || i.qty)).toFixed(2).replace(".", ",")}</span>
    </div>
    ${i.observacoes || i.obs ? `<p class="obs">Obs: ${i.observacoes || i.obs}</p>` : ""}
  `,
    )
    .join("")}
  <div class="divider"></div>
  <div class="row"><span>Subtotal</span><span>R$ ${subtotal.toFixed(2).replace(".", ",")}</span></div>
  ${order.type === "Entrega" || order.tipo_pedido === "entrega" ? `<div class="row"><span>Taxa de entrega</span><span>R$ ${delivery.toFixed(2).replace(".", ",")}</span></div>` : '<div class="row"><span>Retirada na loja</span><span>Grátis</span></div>'}
  <div class="row"><span>Desconto</span><span>R$ ${(order.desconto || 0).toFixed(2).replace(".", ",")}</span></div>
  <div class="divider-solid"></div>
  <div class="row-total"><span>TOTAL A PAGAR</span><span>R$ ${parseFloat(total).toFixed(2).replace(".", ",")}</span></div>
  <div class="divider"></div>
  <p><span class="bold">Pagamento:</span> ${getOrderPaymentMethod(order, order.pagamento)}</p>
  <div class="divider-solid"></div>
  <div class="center" style="margin-top: 8px;">
    <p>Obrigado pela preferência!</p>
    <p class="bold" style="margin-top:4px">São Jorge Super</p>
    <p style="font-size:10px;margin-top:2px">www.saojorgesuper.com.br</p>
  </div>
  <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=420,height=650");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
};

export const printBairroRoute = (bairro: string, bairroOrders: any[]) => {
  const total = bairroOrders.reduce(
    (a, o) => a + parseFloat(o.valor_total || o.total || 0),
    0,
  );
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Rota – ${bairro}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', Courier, monospace; max-width: 300px; margin: 0 auto; padding: 16px; font-size: 12px; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    .divider-solid { border-top: 1px solid #000; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
    p { margin-bottom: 4px; }
    .order-block { border: 1px dashed #555; padding: 8px; margin-bottom: 8px; }
    .num { display: inline-block; width: 18px; height: 18px; border: 1px solid #000; text-align: center; line-height: 18px; margin-right: 4px; font-size: 10px; }
  </style>
</head>
<body>
  <div class="center">
    <p class="bold" style="font-size:15px">SÃO JORGE SUPER</p>
    <p style="font-size:10px">FOLHA DE ROTA</p>
  </div>
  <div class="divider-solid"></div>
  <div class="center">
    <p class="bold" style="font-size:13px">BAIRRO: ${bairro.toUpperCase()}</p>
    <p>Data: ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
    <p>${bairroOrders.length} pedido${bairroOrders.length !== 1 ? "s" : ""} · R$ ${total.toFixed(2).replace(".", ",")}</p>
  </div>
  <div class="divider"></div>
  ${bairroOrders
    .map(
      (o, i) => `
    <div class="order-block">
      <p><span class="num">${i + 1}</span> <span class="bold">${o.numero_pedido || o.id}</span> – ${statusLabels[o.status] || o.status}</p>
      <p class="bold" style="margin-top:4px">${o.cliente?.nome || o.customer || "Não informado"}</p>
      <p>${o.cliente?.telefone || o.phone || "Não informado"}</p>
      <p>${getOrderStreetAddress(o)}</p>
      <div class="divider"></div>
      <div class="row"><span>Total</span><span class="bold">R$ ${parseFloat(
        o.valor_total || o.total || 0,
      )
        .toFixed(2)
        .replace(".", ",")}</span></div>
      <div class="row"><span>Pagamento</span><span>${getOrderPaymentMethod(o, o.pagamento)}</span></div>
    </div>
  `,
    )
    .join("")}
  <div class="divider-solid"></div>
  <div class="row bold"><span>TOTAL DA ROTA</span><span>R$ ${total.toFixed(2).replace(".", ",")}</span></div>
  <div style="margin-top:12px">
    <p>Entregador: _______________________</p>
    <p style="margin-top:8px">Saída: ______ Retorno: ______</p>
  </div>
  <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=420,height=700");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
};
