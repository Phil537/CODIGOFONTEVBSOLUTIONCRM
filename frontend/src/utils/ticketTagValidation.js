/**
 * Verifica se o ticket possui tags (contato ou ticket) para permitir fechamento.
 */
export const ticketHasClosingTags = (ticket) => {
  if (!ticket) return false;

  const contactTags = ticket?.contact?.tags;
  const ticketTags = ticket?.tags;

  return (
    (Array.isArray(contactTags) && contactTags.length > 0) ||
    (Array.isArray(ticketTags) && ticketTags.length > 0)
  );
};

/**
 * Consulta API quando as tags ainda não estão carregadas no objeto do ticket.
 */
export const fetchTicketHasClosingTags = async (api, ticket) => {
  if (ticketHasClosingTags(ticket)) return true;

  const contactId = ticket?.contact?.id;
  if (!contactId) return false;

  const ticketQuery = ticket?.id ? `?ticketId=${ticket.id}` : "";
  const { data } = await api.get(`/contactTags/${contactId}${ticketQuery}`);
  return !!data?.tags;
};
