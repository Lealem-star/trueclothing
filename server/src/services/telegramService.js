import { env } from '../config/env.js';

export const telegramService = {
  /**
   * Send a message to Telegram channel or admin chat
   */
  async sendMessage(message) {
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_ADMIN_CHAT_ID) {
      console.log('[Telegram Alert Skipped: Bot token or chat ID not configured]');
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_ADMIN_CHAT_ID,
          text: message,
          parse_mode: 'HTML'
        })
      });

      if (!response.ok) {
        const text = await response.text();
        console.warn(`[Telegram Alert Error ${response.status}]:`, text);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[Telegram Alert Failed]:', err.message);
      return false;
    }
  },

  async notifyNewOrder(order) {
    const formattedTotal = Number(order.total).toLocaleString('en') + ' ETB';
    const text = `🛍 <b>New Order ${order.code}</b>\n\n` +
      `<b>Customer:</b> ${order.customerName}\n` +
      `<b>Phone:</b> ${order.customerPhone}\n` +
      `<b>Type:</b> ${order.type}\n` +
      `<b>Description:</b> ${order.description}\n` +
      `<b>Total:</b> ${formattedTotal}\n` +
      `<b>Status:</b> ${order.status}`;
    return this.sendMessage(text);
  },

  async notifyNewRequest(request) {
    let detailsStr = '';
    if (request.details && typeof request.details === 'object') {
      detailsStr = Object.entries(request.details)
        .map(([k, v]) => `• <b>${k}:</b> ${v}`)
        .join('\n');
    }
    const text = `📩 <b>New Request (${request.type})</b>\n\n` +
      `<b>Name:</b> ${request.name}\n` +
      `<b>Phone:</b> ${request.phone}\n` +
      (detailsStr ? `<b>Details:</b>\n${detailsStr}\n` : '') +
      (request.notes ? `<b>Notes:</b> ${request.notes}\n` : '') +
      `<b>Status:</b> ${request.status}`;
    return this.sendMessage(text);
  }
};

