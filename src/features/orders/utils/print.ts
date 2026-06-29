import { statusLabels } from '@/features/orders/constants';
import { formatBrasiliaDate } from '@/shared/lib/dateTime';
import {
  getOrderItemName,
  getOrderItemConfigurationLines,
  getOrderItemQuantity,
  getOrderItemTotal,
  getOrderAddress,
  getOrderNeighborhood,
  getOrderPaymentMethod,
  getOrderStreetAddress,
  isDeliveryOrder,
} from '@/features/orders/utils/orderUtils';

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatMoney = (value: unknown) => {
  const number = typeof value === "number" ? value : Number(value);
  return (Number.isFinite(number) ? number : 0).toFixed(2).replace(".", ",");
};

const printableText = (value: unknown) => String(value ?? "").trim();
const renderItemConfiguration = (item: any) => getOrderItemConfigurationLines(item)
  .map((line) => `<p class="option">${escapeHtml(line)}</p>`)
  .join("");

const renderStoreHeader = (store: any) => {
  const name = printableText(store?.nome);
  const corporateName = printableText(store?.razao_social);
  const cnpj = printableText(store?.cnpj);
  const phone = printableText(store?.telefone);
  const email = printableText(store?.email);
  const slogan = printableText(store?.slogan);
  const lines = [
    name ? `<p class="large bold">${escapeHtml(name)}</p>` : "",
    corporateName && corporateName !== name
      ? `<p style="font-size:10px">${escapeHtml(corporateName)}</p>`
      : "",
    cnpj ? `<p style="font-size:10px">CNPJ: ${escapeHtml(cnpj)}</p>` : "",
    phone ? `<p style="font-size:10px">Tel: ${escapeHtml(phone)}</p>` : "",
    email ? `<p style="font-size:10px">${escapeHtml(email)}</p>` : "",
    slogan ? `<p style="font-size:10px">${escapeHtml(slogan)}</p>` : "",
  ].filter(Boolean);

  if (lines.length === 0) return "";

  return `<div class="center">${lines.join("")}</div><div class="divider-solid"></div>`;
};

const thermalReceiptStyles = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 80mm; min-height: 30mm; }
    body {
      font-family: 'Courier New', Courier, monospace;
      width: 80mm;
      min-height: 30mm;
      max-width: 80mm;
      margin: 0 auto;
      padding: 3mm;
      font-size: 16px;
      font-weight: 700;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body * { color: #000 !important; font-weight: 700; }
    .center { text-align: center; }
    .bold { font-weight: 800; }
    .large { font-size: 19px; }
    .divider-solid { border-top: 1px solid #000; margin: 8px 0; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 3px; }
    .row-total { display: flex; justify-content: space-between; gap: 8px; font-size: 18px; font-weight: 800; margin-bottom: 3px; }
    .obs { font-size: 14px; margin: 0 0 5px 16px; font-style: italic; }
    .option { font-size: 14px; margin: 0 0 2px 16px; }
    p { margin-bottom: 4px; }
    .tag { display: inline-block; border: 1px solid #000; padding: 1px 6px; font-size: 15px; margin: 2px 0; }
    .order-block { border: 1px dashed #000; padding: 8px; margin-bottom: 8px; }
    .num { display: inline-block; width: 22px; height: 22px; border: 1px solid #000; text-align: center; line-height: 22px; margin-right: 4px; font-size: 14px; }
    @page { size: 80mm 200mm; margin: 0; }
    @media print {
      html, body { width: 80mm; min-height: 30mm; }
      body { margin: 0; padding: 3mm; }
    }
`;

export const printComanda = (
  order: any,
  orderItems: any[] = [],
  store?: any,
  targetWindow?: Window | null,
) => {
  const subtotal = orderItems.reduce(
    (value, item) => value + getOrderItemTotal(item),
    0,
  );
  const delivery = isDeliveryOrder(order)
    ? order.taxa_entrega ?? store?.taxa_entrega_padrao ?? 0
    : 0;
  const total = order.total ?? order.valor_total ?? 0;
  const orderDate = order.realizado_em || order.criado_em || order.created_at || new Date();
  const scheduledDate = order.agendado_para;
  const orderNumber = escapeHtml(order.numero_pedido || order.id);
  const isDelivery = isDeliveryOrder(order);
  const storeHeader = renderStoreHeader(store);
  const storeName = printableText(store?.nome);

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Comanda ${orderNumber}</title>
  <style>
${thermalReceiptStyles}
  </style>
</head>
<body>
  ${storeHeader}
  <div class="center">
    <p class="bold large">COMANDA DE PEDIDO</p>
    <p>Pedido: <span class="bold">${orderNumber}</span></p>
    <p>Data: ${escapeHtml(formatBrasiliaDate(orderDate, { dateStyle: "short", timeStyle: "medium" }))}</p>
    ${scheduledDate ? `<p>Entrega agendada: <span class="bold">${escapeHtml(formatBrasiliaDate(scheduledDate, { dateStyle: "short", timeStyle: "short" }))}</span></p>` : ""}
    <span class="tag">${escapeHtml((order.tipo_pedido || order.type || "").toUpperCase())}</span>
  </div>
  <div class="divider"></div>
  <p><span class="bold">Cliente:</span> ${escapeHtml(order.cliente?.nome || order.customer || "Não informado")}</p>
  <p><span class="bold">Telefone:</span> ${escapeHtml(order.cliente?.telefone || order.phone || "Não informado")}</p>
  ${order.cpf_na_nota ? `<p><span class="bold">CPF na nota:</span> ${escapeHtml(order.cpf_na_nota_cpf || "Informado")}</p>` : ""}
  ${isDelivery ? `<p><span class="bold">Endereço:</span> ${escapeHtml(getOrderAddress(order))}</p><p><span class="bold">Bairro:</span> ${escapeHtml(getOrderNeighborhood(order))}</p>` : ""}
  <div class="divider"></div>
  <p class="bold" style="margin-bottom:6px">ITENS DO PEDIDO:</p>
  ${(Array.isArray(orderItems) ? orderItems : [])
    .map(
      (i) => `
    <div class="row">
      <span>${escapeHtml(getOrderItemQuantity(i))}x ${escapeHtml(getOrderItemName(i))}</span>
      <span>R$ ${formatMoney(getOrderItemTotal(i))}</span>
    </div>
    ${renderItemConfiguration(i)}
    ${i.observacoes || i.obs ? `<p class="obs">Obs: ${escapeHtml(i.observacoes || i.obs)}</p>` : ""}
  `,
    )
    .join("")}
  <div class="divider"></div>
  <div class="row"><span>Subtotal</span><span>R$ ${formatMoney(orderItems.length > 0 ? subtotal : order.subtotal)}</span></div>
  ${isDelivery ? `<div class="row"><span>Taxa de entrega</span><span>R$ ${formatMoney(delivery)}</span></div>` : '<div class="row"><span>Retirada na loja</span><span>Grátis</span></div>'}
  <div class="row"><span>Desconto</span><span>R$ ${formatMoney(order.desconto)}</span></div>
  <div class="divider-solid"></div>
  <div class="row-total"><span>TOTAL A PAGAR</span><span>R$ ${formatMoney(total)}</span></div>
  <div class="divider"></div>
  <p><span class="bold">Pagamento:</span> ${escapeHtml(getOrderPaymentMethod(order, order.pagamento))}</p>
  <div class="divider-solid"></div>
  <div class="center" style="margin-top: 8px;">
    <p>Obrigado pela preferência!</p>
    ${storeName ? `<p class="bold" style="margin-top:4px">${escapeHtml(storeName)}</p>` : ""}
  </div>
  <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }</script>
</body>
</html>`;

  const win = targetWindow || window.open("", "_blank", "width=420,height=650");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
};

export const printBairroRoute = (bairro: string, bairroOrders: any[], store?: any) => {
  const total = bairroOrders.reduce(
    (a, o) => a + parseFloat(o.valor_total || o.total || 0),
    0,
  );
  const storeHeader = renderStoreHeader(store);
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Rota – ${bairro}</title>
  <style>
${thermalReceiptStyles}
  </style>
</head>
<body>
  ${storeHeader}
  <div class="center">
    <p style="font-size:10px">FOLHA DE ROTA</p>
  </div>
  <div class="divider-solid"></div>
  <div class="center">
    <p class="bold" style="font-size:13px">BAIRRO: ${bairro.toUpperCase()}</p>
    <p>Data: ${formatBrasiliaDate(new Date(), { dateStyle: "short", timeStyle: "short" })}</p>
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
