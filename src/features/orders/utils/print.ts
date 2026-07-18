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
  getOrderPaymentStatus,
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
const normalizeText = (value: unknown) =>
  printableText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const firstPresent = (...values: unknown[]) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const getDailyTicketNumber = (order: any) => {
  const formatted = printableText(order?.numero_comanda_codigo);
  if (formatted) return formatted;

  const numeric = Number(order?.numero_comanda_diario);
  return Number.isFinite(numeric) && numeric > 0
    ? String(numeric).padStart(5, "0")
    : "";
};

const getOrderPhone = (order: any) =>
  printableText(
    firstPresent(
      order?.cliente?.telefone,
      order?.cliente?.phone,
      order?.telefone,
      order?.phone,
    ),
  ) || "Não informado";

const getOrderCustomerDocument = (order: any) =>
  printableText(
    firstPresent(
      order?.cliente?.cpf,
      order?.cliente?.documento,
      order?.cpf,
      order?.cpf_na_nota_cpf,
    ),
  );

const getOrderTypeLabelForPrint = (order: any) => {
  const type = normalizeText(
    firstPresent(
      order?.tipo_pedido,
      order?.tipo_entrega,
      order?.type,
      order?.tipo,
      order?.order_type,
    ),
  );

  if (["retirada", "pickup"].includes(type)) return "RETIRADA";
  if (["salao", "salão", "mesa", "comanda"].includes(type)) return "SALAO";
  return "ENTREGA";
};

export type ComandaPrintMode = "cozinha" | "cliente" | "cliente_cozinha";

type PrintComandaOptions = {
  mode?: ComandaPrintMode;
};

const renderItemConfiguration = (item: any) => getOrderItemConfigurationLines(item)
  .map((line) => `<p class="option">${escapeHtml(line)}</p>`)
  .join("");

const getCashChangeLines = (order: any, payment: any, total: unknown) => {
  const activePayment = payment || order?.pagamento || {};
  const method = normalizeText(
    firstPresent(
      activePayment?.forma_pagamento,
      activePayment?.metodo,
      activePayment?.method,
      order?.pagamento?.forma_pagamento,
      order?.pagamento?.metodo,
      order?.pagamento?.method,
      order?.payment,
    ),
  );
  const paymentOnDeliveryMethod = normalizeText(
    firstPresent(
      activePayment?.pagamento_entrega_tipo,
      activePayment?.paymentOnDeliveryMethod,
      activePayment?.metadata?.pagamento_entrega_tipo,
      order?.pagamento?.pagamento_entrega_tipo,
      order?.pagamento?.paymentOnDeliveryMethod,
      order?.pagamento?.metadata?.pagamento_entrega_tipo,
    ),
  );

  const isCashPayment =
    method === "dinheiro" || paymentOnDeliveryMethod === "dinheiro";

  if (!isCashPayment || paymentOnDeliveryMethod === "cartao") return "";

  if (activePayment?.sem_troco === true || order?.pagamento?.sem_troco === true) {
    return '<p class="cash-change"><span class="bold">Troco:</span> Não precisa de troco</p>';
  }

  const changeFor = firstPresent(
    activePayment?.troco_para,
    order?.pagamento?.troco_para,
    order?.troco_para,
  );
  if (changeFor === undefined) {
    return '<p class="cash-change"><span class="bold">Troco:</span> Não informado</p>';
  }

  const explicitChangeAmount = firstPresent(
    activePayment?.troco_valor,
    order?.pagamento?.troco_valor,
    order?.troco_valor,
  );
  const changeForNumber = Number(changeFor);
  const totalNumber = Number(total);
  const changeAmountNumber =
    explicitChangeAmount !== undefined
      ? Number(explicitChangeAmount)
      : changeForNumber - totalNumber;
  const safeChangeAmount = Number.isFinite(changeAmountNumber)
    ? Math.max(0, changeAmountNumber)
    : 0;

  return `
    <p class="cash-change"><span class="bold">Troco para:</span> R$ ${formatMoney(changeFor)}</p>
    <p class="cash-change"><span class="bold">Troco a levar:</span> R$ ${formatMoney(safeChangeAmount)}</p>
  `;
};

const isPaidPayment = (order: any, payment: any) => {
  const status = normalizeText(
    firstPresent(
      payment?.status,
      order?.pagamento?.status,
      order?.payment_status,
    ),
  );

  return Boolean(payment?.pago_em || order?.pagamento?.pago_em) ||
    ["aprovado", "confirmado", "pago", "paid"].includes(status);
};

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
    .row span:first-child, .row-total span:first-child { min-width: 0; overflow-wrap: anywhere; word-break: break-word; }
    .obs { font-size: 22px; line-height: 1.12; margin: 0 0 7px 16px; font-style: italic; }
    .option { font-size: 19px; line-height: 1.12; margin: 0 0 5px 16px; }
    p, .option, .obs, .address-line, .cash-change, .product-row span { max-width: 100%; overflow-wrap: anywhere; word-break: break-word; white-space: normal; }
    p { margin-bottom: 4px; }
    .tag { display: inline-block; border: 1px solid #000; padding: 1px 6px; font-size: 15px; margin: 2px 0; }
    .ticket-number { border: 2px solid #000; padding: 8px 4px; margin: 8px 0; text-align: center; }
    .ticket-label { font-size: 15px; font-weight: 800; letter-spacing: 0; }
    .ticket-value { display: block; font-size: 42px; line-height: 1; font-weight: 900; margin-top: 3px; }
    .order-block { border: 1px dashed #000; padding: 8px; margin-bottom: 8px; }
    .num { display: inline-block; width: 22px; height: 22px; border: 1px solid #000; text-align: center; line-height: 22px; margin-right: 4px; font-size: 14px; }
    .info-box { border: 1px solid #000; padding: 7px; margin: 8px 0; }
    .info-title { font-size: 15px; font-weight: 900; text-align: center; margin-bottom: 5px; }
    .address-box { border: 2px solid #000; padding: 8px; margin: 9px 0; }
    .address-title { font-size: 17px; font-weight: 900; text-align: center; margin-bottom: 6px; }
    .address-line { font-size: 19px; line-height: 1.15; margin-bottom: 5px; }
    .payment-box { border: 2px solid #000; padding: 8px; margin: 9px 0; }
    .payment-title { font-size: 17px; font-weight: 900; text-align: center; margin-bottom: 6px; }
    .payment-status { border: 1px solid #000; padding: 5px; text-align: center; font-size: 18px; font-weight: 900; margin: 5px 0; }
    .product-row { font-size: 26px; line-height: 1.12; margin-bottom: 7px; }
    .product-row span:first-child { flex: 1; min-width: 0; }
    .product-row span:last-child { white-space: nowrap; }
    .cash-change { font-size: 19px; line-height: 1.15; margin-bottom: 4px; }
    @page { size: 80mm 200mm; margin: 0; }
    @media print {
      html, body { width: 80mm; min-height: 30mm; }
      body { margin: 0; padding: 3mm; }
    }
`;

const clientReceiptStyles = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 80mm; min-height: 30mm; }
    body {
      font-family: 'Courier New', Courier, monospace;
      width: 80mm;
      min-height: 30mm;
      max-width: 80mm;
      margin: 0 auto;
      padding: 3mm;
      font-size: 13px;
      font-weight: 400;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body * { color: #000 !important; }
    .center { text-align: center; }
    .bold { font-weight: 800; }
    .large { font-size: 16px; }
    .divider-solid { border-top: 1px solid #000; margin: 7px 0; }
    .divider { border-top: 1px dashed #000; margin: 7px 0; }
    .row { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 3px; }
    .row-total { display: flex; justify-content: space-between; gap: 8px; font-size: 15px; font-weight: 800; margin-bottom: 3px; }
    .row span:first-child, .row-total span:first-child { min-width: 0; overflow-wrap: anywhere; word-break: break-word; }
    .obs { font-size: 13px; line-height: 1.2; margin: 0 0 5px 12px; font-style: italic; }
    .option { font-size: 12px; line-height: 1.2; margin: 0 0 3px 12px; }
    p, .option, .obs, .address-line, .cash-change, .product-row span { max-width: 100%; overflow-wrap: anywhere; word-break: break-word; white-space: normal; }
    p { margin-bottom: 4px; }
    .tag { display: inline-block; border: 1px solid #000; padding: 1px 6px; font-size: 12px; margin: 2px 0; }
    .ticket-number { border: 1px solid #000; padding: 5px 4px; margin: 7px 0; text-align: center; }
    .ticket-label { font-size: 12px; font-weight: 800; letter-spacing: 0; }
    .ticket-value { display: block; font-size: 24px; line-height: 1; font-weight: 900; margin-top: 3px; }
    .info-box { border: 1px solid #000; padding: 6px; margin: 7px 0; }
    .info-title { font-size: 12px; font-weight: 900; text-align: center; margin-bottom: 5px; }
    .address-box { border: 2px solid #000; padding: 7px; margin: 8px 0; }
    .address-title { font-size: 13px; font-weight: 900; text-align: center; margin-bottom: 5px; }
    .address-line { font-size: 14px; line-height: 1.2; margin-bottom: 4px; }
    .payment-box { border: 2px solid #000; padding: 7px; margin: 8px 0; }
    .payment-title { font-size: 13px; font-weight: 900; text-align: center; margin-bottom: 5px; }
    .payment-status { border: 1px solid #000; padding: 4px; text-align: center; font-size: 14px; font-weight: 900; margin: 5px 0; }
    .product-row { font-size: 14px; line-height: 1.2; margin-bottom: 4px; }
    .product-row span:first-child { flex: 1; min-width: 0; }
    .product-row span:last-child { white-space: nowrap; }
    .cash-change { font-size: 13px; line-height: 1.2; margin-bottom: 4px; }
    @page { size: 80mm 200mm; margin: 0; }
    @media print {
      html, body { width: 80mm; min-height: 30mm; }
      body { margin: 0; padding: 3mm; }
    }
`;

const kitchenReceiptStyles = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 80mm; min-height: 30mm; }
    body {
      font-family: 'Courier New', Courier, monospace;
      width: 80mm;
      min-height: 30mm;
      max-width: 80mm;
      margin: 0 auto;
      padding: 3mm;
      font-size: 19px;
      font-weight: 900;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body * { color: #000 !important; font-weight: 900; }
    .center { text-align: center; }
    .bold { font-weight: 900; }
    .large { font-size: 22px; }
    .divider-solid { border-top: 2px solid #000; margin: 10px 0; }
    .divider { border-top: 1px dashed #000; margin: 9px 0; }
    .tag { display: inline-block; border: 2px solid #000; padding: 2px 8px; font-size: 18px; margin: 3px 0; }
    .kitchen-meta { border: 2px solid #000; padding: 6px; margin: 8px 0; text-align: left; }
    .kitchen-meta p { font-size: 18px; line-height: 1.16; }
    .ticket-number { border: 3px solid #000; padding: 9px 4px; margin: 8px 0; text-align: center; }
    .ticket-label { font-size: 17px; font-weight: 900; letter-spacing: 0; }
    .ticket-value { display: block; font-size: 54px; line-height: .95; font-weight: 900; margin-top: 3px; }
    .product-block { border-bottom: 2px solid #000; padding-bottom: 9px; margin-bottom: 10px; }
    .product-row { display: flex; justify-content: space-between; gap: 8px; font-size: 29px; line-height: 1.08; margin-bottom: 7px; }
    .product-row span:first-child { flex: 1; min-width: 0; }
    .option { font-size: 22px; line-height: 1.1; margin: 0 0 5px 12px; padding-left: 8px; border-left: 3px solid #000; }
    .obs { border: 2px solid #000; padding: 5px; font-size: 24px; line-height: 1.1; margin: 6px 0 7px 0; font-style: italic; }
    p, .option, .obs, .product-row span { max-width: 100%; overflow-wrap: anywhere; word-break: break-word; white-space: normal; }
    p { margin-bottom: 4px; }
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
  options: PrintComandaOptions = {},
) => {
  const mode = options.mode || "cliente_cozinha";
  const itemsForPrint = Array.isArray(orderItems) ? orderItems : [];
  const subtotal = itemsForPrint.reduce(
    (value, item) => value + getOrderItemTotal(item),
    0,
  );
  const delivery = isDeliveryOrder(order)
    ? order.taxa_entrega ?? store?.taxa_entrega_padrao ?? 0
    : 0;
  const redelivery = Number(order.taxa_reentrega_total || 0);
  const total = order.total ?? order.valor_total ?? 0;
  const orderDate = order.realizado_em || order.criado_em || order.created_at || new Date();
  const scheduledDate = order.agendado_para;
  const orderNumber = escapeHtml(order.numero_pedido || order.id);
  const dailyTicketNumber = getDailyTicketNumber(order);
  const isDelivery = isDeliveryOrder(order);
  const customerName = printableText(order.cliente?.nome || order.customer) || "Não informado";
  const customerDocument = getOrderCustomerDocument(order);
  const orderTypeLabel = getOrderTypeLabelForPrint(order);
  const storeHeader = renderStoreHeader(store);
  const storeName = printableText(store?.nome);
  const activePayment = order?.pagamento || {};
  const paymentMethod = getOrderPaymentMethod(order, activePayment);
  const paymentStatus = getOrderPaymentStatus(order, activePayment);
  const paidLabel = isPaidPayment(order, activePayment) ? "PAGO" : "PAGAMENTO PENDENTE";
  const salaoComanda = order?.salao_comanda || order?.comanda || {};
  const tableNumber = printableText(
    salaoComanda?.mesa?.numero ||
      salaoComanda?.mesa_numero ||
      order?.mesa?.numero ||
      order?.mesa_numero,
  );

  if (mode === "cozinha") {
    const kitchenHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Comanda da Cozinha ${orderNumber}</title>
  <style>
${kitchenReceiptStyles}
  </style>
</head>
<body>
  <div class="center">
    <p class="bold large">COMANDA DA COZINHA</p>
    ${dailyTicketNumber ? `<div class="ticket-number"><span class="ticket-label">COMANDA DO DIA</span><span class="ticket-value">${escapeHtml(dailyTicketNumber)}</span></div>` : ""}
    <span class="tag">${escapeHtml(orderTypeLabel)}</span>
    ${tableNumber ? `<span class="tag">MESA ${escapeHtml(tableNumber)}</span>` : ""}
  </div>
  <div class="kitchen-meta">
    <p>Pedido: <span class="bold">${orderNumber}</span></p>
    <p>Cliente: <span class="bold">${escapeHtml(customerName)}</span></p>
    <p>Telefone: <span class="bold">${escapeHtml(getOrderPhone(order))}</span></p>
    <p>Data: ${escapeHtml(formatBrasiliaDate(new Date(), { dateStyle: "short", timeStyle: "medium" }))}</p>
  </div>
  <div class="divider-solid"></div>
  <p class="bold">PRODUTOS:</p>
  ${itemsForPrint.length > 0 ? itemsForPrint
    .map(
      (i) => `
    <section class="product-block">
      <div class="product-row">
        <span>${escapeHtml(getOrderItemQuantity(i))}x ${escapeHtml(getOrderItemName(i))}</span>
      </div>
      ${renderItemConfiguration(i)}
      ${i.observacoes || i.obs ? `<p class="obs">Obs: ${escapeHtml(i.observacoes || i.obs)}</p>` : ""}
    </section>
  `,
    )
    .join("") : "<p>Nenhum item selecionado.</p>"}
  <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }</script>
</body>
</html>`;

    const win = targetWindow || window.open("", "_blank", "width=420,height=650");
    if (win) {
      win.document.write(kitchenHtml);
      win.document.close();
    }
    return;
  }

  const receiptStyles =
    mode === "cliente" ? clientReceiptStyles : thermalReceiptStyles;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Comanda ${orderNumber}</title>
  <style>
${receiptStyles}
  </style>
</head>
<body>
  ${storeHeader}
  <div class="center">
    <p class="bold large">COMANDA DE PEDIDO</p>
    ${dailyTicketNumber ? `<div class="ticket-number"><span class="ticket-label">COMANDA DO DIA</span><span class="ticket-value">${escapeHtml(dailyTicketNumber)}</span></div>` : ""}
    <p>Pedido: <span class="bold">${orderNumber}</span></p>
    <p>Data: ${escapeHtml(formatBrasiliaDate(orderDate, { dateStyle: "short", timeStyle: "medium" }))}</p>
    ${scheduledDate ? `<p>Entrega agendada: <span class="bold">${escapeHtml(formatBrasiliaDate(scheduledDate, { dateStyle: "short", timeStyle: "short" }))}</span></p>` : ""}
    <span class="tag">${escapeHtml(orderTypeLabel)}</span>
  </div>
  <div class="divider"></div>
  <div class="info-box">
    <p class="info-title">DADOS DO CLIENTE</p>
    <p><span class="bold">Nome:</span> ${escapeHtml(customerName)}</p>
    <p><span class="bold">Telefone:</span> ${escapeHtml(getOrderPhone(order))}</p>
    ${customerDocument ? `<p><span class="bold">Documento:</span> ${escapeHtml(customerDocument)}</p>` : ""}
  </div>
  ${order.cpf_na_nota ? `<p><span class="bold">CPF na nota:</span> ${escapeHtml(order.cpf_na_nota_cpf || "Informado")}</p>` : ""}
  ${isDelivery ? `
  <div class="address-box">
    <p class="address-title">ENDEREÇO DE ENTREGA</p>
    <p class="address-line"><span class="bold">Endereço:</span> ${escapeHtml(getOrderStreetAddress(order))}</p>
    <p class="address-line"><span class="bold">Bairro:</span> ${escapeHtml(getOrderNeighborhood(order))}</p>
    <p class="address-line"><span class="bold">Completo:</span> ${escapeHtml(getOrderAddress(order))}</p>
    ${printableText(order.endereco_cliente?.ponto_referencia) ? `<p class="address-line"><span class="bold">Referência:</span> ${escapeHtml(order.endereco_cliente.ponto_referencia)}</p>` : ""}
  </div>
  ` : '<div class="address-box"><p class="address-title">RETIRADA NO BALCÃO</p><p class="address-line">Cliente retira o pedido na loja.</p></div>'}
  <div class="divider"></div>
  <p class="bold" style="margin-bottom:6px">ITENS DO PEDIDO:</p>
  ${itemsForPrint
    .map(
      (i) => `
    <div class="row product-row">
      <span>${escapeHtml(getOrderItemQuantity(i))}x ${escapeHtml(getOrderItemName(i))}</span>
      <span>R$ ${formatMoney(getOrderItemTotal(i))}</span>
    </div>
    ${renderItemConfiguration(i)}
    ${i.observacoes || i.obs ? `<p class="obs">Obs: ${escapeHtml(i.observacoes || i.obs)}</p>` : ""}
  `,
    )
    .join("")}
  <div class="divider"></div>
  <div class="row"><span>Subtotal</span><span>R$ ${formatMoney(itemsForPrint.length > 0 ? subtotal : order.subtotal)}</span></div>
  ${isDelivery ? `<div class="row"><span>Taxa de entrega</span><span>R$ ${formatMoney(delivery)}</span></div>` : '<div class="row"><span>Retirada na loja</span><span>Grátis</span></div>'}
  ${redelivery > 0 ? `<div class="row"><span>Taxa de nova entrega</span><span>R$ ${formatMoney(redelivery)}</span></div>` : ""}
  ${Number(order.desconto || 0) > 0 ? `<div class="row"><span>Desconto</span><span>- R$ ${formatMoney(order.desconto)}</span></div>` : ""}
  ${Number(order.acrescimo || 0) > 0 ? `<div class="row"><span>Acréscimo</span><span>+ R$ ${formatMoney(order.acrescimo)}</span></div>` : ""}
  <div class="divider-solid"></div>
  <div class="row-total"><span>TOTAL A PAGAR</span><span>R$ ${formatMoney(total)}</span></div>
  <div class="payment-box">
    <p class="payment-title">PAGAMENTO</p>
    <p><span class="bold">Forma:</span> ${escapeHtml(paymentMethod)}</p>
    <p><span class="bold">Status:</span> ${escapeHtml(paymentStatus)}</p>
    <p class="payment-status">${escapeHtml(paidLabel)}</p>
    ${getCashChangeLines(order, activePayment, total)}
  </div>
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
      <p class="address-line">${getOrderStreetAddress(o)}</p>
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
