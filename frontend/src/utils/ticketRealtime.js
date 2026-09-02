/**
 * Eventos de sincronização em tempo real (fallback quando socket atrasa ou falha).
 */

export const TICKET_MESSAGES_REFRESH = "ticketMessagesRefresh";
export const TICKET_UPDATED = "ticketUpdated";

export function emitTicketMessagesRefresh(ticketId) {
  if (ticketId == null || ticketId === "") return;
  window.dispatchEvent(
    new CustomEvent(TICKET_MESSAGES_REFRESH, {
      detail: { ticketId: Number(ticketId) || ticketId },
    })
  );
}

export function emitTicketUpdated(ticket) {
  if (!ticket?.id) return;
  window.dispatchEvent(
    new CustomEvent(TICKET_UPDATED, { detail: { ticket } })
  );
}
