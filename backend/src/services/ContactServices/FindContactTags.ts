/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import ContactTag from "../../models/ContactTag";

type Param = {
    contactId: string
  };

const FindContactTags = async ({
    contactId
  }: Param): Promise<ContactTag[]> => {
  const contactsTags = await ContactTag.findAll({
    where: {
      contactId: Number(contactId)
    }
  });
  return contactsTags;
};

export default FindContactTags;
