/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import { Op } from "sequelize";
import Inventory from "../models/Inventory";
import XLSX from "xlsx";

type IndexQuery = {
  searchParam?: string;
  pageNumber?: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { searchParam, pageNumber } = req.query as IndexQuery;

  const where: any = { companyId };
  if (searchParam) {
    where.name = { [Op.iLike]: `%${searchParam}%` };
  }

  const limit = 20;
  const page = +(pageNumber || 1);
  const offset = limit * (page - 1);

  const { rows, count } = await Inventory.findAndCountAll({
    where,
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });

  const hasMore = count > offset + rows.length;
  const inventory = rows;
  return res.json({ inventory, count, hasMore });
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const record = await Inventory.findByPk(id);
  return res.json(record);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { name, price, quantity, status, currency, image, sku, category, brand, description } = req.body;

  const qty = quantity ?? 0;
  let computedStatus = status;
  if (!computedStatus) {
    if (qty <= 0) computedStatus = "out_of_stock";
    else if (qty > 0 && qty <= 5) computedStatus = "low_stock";
    else computedStatus = "in_stock";
  }

  const record = await Inventory.create({
    name,
    price,
    quantity: qty,
    currency: currency || "BRL",
    image: image || null,
    sku: sku || null,
    category: category || null,
    brand: brand || null,
    description: description || null,
    status: computedStatus,
    companyId
  });

  return res.status(201).json(record);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const data = req.body;
  const record = await Inventory.findByPk(id);
  if (!record) {
    return res.status(404).json({ error: "Not found" });
  }
  await record.update(data);
  return res.json(record);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const record = await Inventory.findOne({ where: { id, companyId } });
  if (!record) {
    return res.status(404).json({ error: "Not found" });
  }

  await record.destroy();
  return res.status(200).json({ message: "Inventory deleted" });
};

export const importFile = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const file = (req as any).file;
  if (!file) {
    return res.status(400).json({ error: "File is required" });
  }
  try {
    const workbook = XLSX.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    const items = rows.map((r) => {
      const name = String(r.name || r.Nome || r.Item || "").trim();
      const price = Number(r.price ?? r.Preco ?? r.Valor ?? 0) || 0;
      const quantity = Number(r.quantity ?? r.Quantidade ?? r.Qtd ?? 0) || 0;
      const currency = String(r.currency || r.Moeda || "BRL").toUpperCase();
      const status = String(r.status || r.Status || "") || undefined;
      const sku = r.sku || r.SKU || r.Codigo || null;
      const category = r.category || r.Categoria || null;
      const brand = r.brand || r.Marca || null;
      const description = r.description || r.Descricao || null;
      const image = r.image || r.Imagem || null;

      let computedStatus = status;
      if (!computedStatus) {
        if (quantity <= 0) computedStatus = "out_of_stock";
        else if (quantity > 0 && quantity <= 5) computedStatus = "low_stock";
        else computedStatus = "in_stock";
      }
      return {
        name,
        price,
        quantity,
        currency,
        status: computedStatus,
        sku,
        category,
        brand,
        description,
        image,
        companyId
      };
    }).filter(i => i.name);

    if (!items.length) {
      return res.status(400).json({ error: "No valid rows" });
    }

    const created = await Inventory.bulkCreate(items, { returning: true });
    return res.status(201).json({ created: created.length, items: created });
  } catch (err) {
    return res.status(500).json({ error: "Failed to import file" });
  }
};
