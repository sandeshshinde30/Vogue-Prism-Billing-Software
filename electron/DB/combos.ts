import { getDatabase } from './connection';
import { addActivityLog } from './logs';

export interface ComboItem {
  productId: number;
  quantity: number;
}

export interface ComboData {
  name: string;
  description?: string;
  comboPrice?: number | null;
  items: ComboItem[];
}

export function getCombos() {
  const db = getDatabase();
  const combos = db.prepare(`SELECT * FROM combos WHERE isActive = 1 ORDER BY createdAt DESC`).all();
  const itemsStmt = db.prepare(`
    SELECT ci.*, p.name as productName, p.price, p.stock, p.size, p.category, p.costPrice
    FROM combo_items ci
    JOIN products p ON p.id = ci.productId
    WHERE ci.comboId = ?
  `);
  return combos.map((combo: any) => ({
    ...combo,
    comboPrice: combo.comboPrice ?? null,
    items: itemsStmt.all(combo.id),
  }));
}

export function createCombo(data: ComboData) {
  const db = getDatabase();
  const tx = db.transaction(() => {
    const result = db.prepare(
      `INSERT INTO combos (name, description, comboPrice) VALUES (?, ?, ?)`
    ).run(data.name, data.description || null, data.comboPrice ?? null);
    const comboId = result.lastInsertRowid as number;
    const itemStmt = db.prepare(
      `INSERT INTO combo_items (comboId, productId, quantity) VALUES (?, ?, ?)`
    );
    for (const item of data.items) {
      itemStmt.run(comboId, item.productId, item.quantity);
    }
    return comboId;
  });
  const comboId = tx();
  addActivityLog(
    'create', 'system',
    `Created combo: "${data.name}" with ${data.items.length} item(s)`,
    comboId, undefined, JSON.stringify(data)
  );
  return comboId;
}

export function updateCombo(id: number, data: ComboData) {
  const db = getDatabase();
  const old = db.prepare(`SELECT * FROM combos WHERE id = ?`).get(id) as any;
  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE combos SET name = ?, description = ?, comboPrice = ?, updatedAt = datetime('now','localtime') WHERE id = ?`
    ).run(data.name, data.description || null, data.comboPrice ?? null, id);
    db.prepare(`DELETE FROM combo_items WHERE comboId = ?`).run(id);
    const itemStmt = db.prepare(
      `INSERT INTO combo_items (comboId, productId, quantity) VALUES (?, ?, ?)`
    );
    for (const item of data.items) {
      itemStmt.run(id, item.productId, item.quantity);
    }
  });
  tx();
  addActivityLog(
    'update', 'system',
    `Updated combo: "${data.name}"`,
    id,
    old ? JSON.stringify({ name: old.name, description: old.description }) : undefined,
    JSON.stringify(data)
  );
}

export function deleteCombo(id: number) {
  const db = getDatabase();
  const combo = db.prepare(`SELECT * FROM combos WHERE id = ?`).get(id) as any;
  db.prepare(`UPDATE combos SET isActive = 0 WHERE id = ?`).run(id);
  addActivityLog(
    'delete', 'system',
    `Deleted combo: "${combo?.name || id}"`,
    id, JSON.stringify(combo), undefined
  );
}
