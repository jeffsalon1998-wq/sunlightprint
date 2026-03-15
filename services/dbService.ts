import { createClient } from "@libsql/client";
import { DocumentData, OrderItem } from '../types';
import { fetchMockDatabaseRecords } from './geminiService';

// Configuration from environment/prompt
const TURSO_URL = "libsql://warehousekimi-vercel-icfg-tf7wnf43zngjwvbur4t9rp6n.aws-us-east-1.turso.io";
const TURSO_AUTH_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM1NDQ1NTMsImlkIjoiMDE5Y2E3OGUtNDgwMS03OWU1LWE5YzUtYWJhY2I3OTI3YzEwIiwicmlkIjoiNDBlYjZkNTMtYWVlYi00NDQ3LWE3OGYtNDA3ZTZlOTkxM2U2In0.5icv8IUasCAY7v7Q3Xxv6RGOiN16HNi1e2UQpQFuxkU-pyRibqzIudn6BHDHFHxPYQ-Ga3XKkZenJZRynehvAQ";

// Lazy initialization pattern
let clientInstance: any = null;

const getClient = () => {
  if (!clientInstance) {
    clientInstance = createClient({
      url: TURSO_URL,
      authToken: TURSO_AUTH_TOKEN
    });
  }
  return clientInstance;
};

export const updateRequisitionStatus = async (id: string, status: string): Promise<void> => {
  try {
    const client = getClient();
    await client.execute({
      sql: "UPDATE requisitions SET status = ? WHERE id = ?",
      args: [status, id]
    });
  } catch (error) {
    console.error("Failed to update status in DB:", error);
  }
};

export const fetchDatabaseRecords = async (): Promise<DocumentData[]> => {
  try {
    console.log("Attempting to connect to Turso DB...");
    const client = getClient();
    
    // 1. Fetch the main requisitions
    // We select all columns, which includes the 'items' JSON column
    const requisitionsResult = await client.execute(`
      SELECT * FROM requisitions 
      ORDER BY date ASC 
      LIMIT 50
    `);

    if (requisitionsResult.rows.length === 0) {
      return [];
    }

    const documents: DocumentData[] = [];

    // 2. Iterate and map each row
    for (const row of requisitionsResult.rows) {
      const id = String(row.id);
      
      let items: OrderItem[] = [];

      // Logic to parse the 'items' column which is stored as a JSON string
      const itemsRaw = row.items;
      if (itemsRaw && typeof itemsRaw === 'string') {
        try {
          const parsedItems = JSON.parse(itemsRaw);
          if (Array.isArray(parsedItems)) {
             items = parsedItems.map((item: any) => {
                const qty = Number(item.quantity || 0);
                const cost = Number(item.estimatedCost || item.unitPrice || 0);
                
                return {
                  // Map 'name' -> Particulars (description)
                  description: String(item.name || item.description || ""),
                  // Map 'quantity' -> Qty Request
                  quantity: qty,
                  // Map 'unit' -> UOM
                  uom: String(item.unit || item.uom || ""),
                  // Map 'estimatedCost' -> Unit Cost
                  unitPrice: cost,
                  // Calculate Total
                  total: qty * cost,
                  // Map 'source' -> Remarks (optional but useful)
                  remarks: String(item.source || item.remarks || "")
                };
             });
          }
        } catch (e) {
          console.warn(`Failed to parse 'items' JSON for requisition ${id}`, e);
        }
      }

      const getStr = (val: any) => val ? String(val) : "";

      documents.push({
        id: id,
        type: 'Requisition Form',
        department: getStr(row.department),
        purpose: getStr(row.description || row.purpose),
        date: getStr(row.date),
        deliverOn: getStr(row.deliver_on || row.deliverOn),
        status: (['Approved', 'Pending', 'Processing', 'For signing'].includes(row.status as string) 
          ? row.status as any 
          : 'Pending'),
        items: items,
        totalAmount: Number(row.total_amount || row.totalAmount || items.reduce((acc, curr) => acc + curr.total, 0)),
        // Map 'requester' from DB to 'preparedBy'
        preparedBy: getStr(row.requester || row.prepared_by || row.preparedBy),
        notedBy: getStr(row.noted_by || row.notedBy),
        approvedBy: getStr(row.approved_by || row.approvedBy),
        receivedBy: getStr(row.received_by || row.receivedBy),
        checkedBy: getStr(row.checked_by || row.checkedBy),
        prFor: getStr(row.pr_for || row.prFor),
        prNumber: getStr(row.pr_for || row.prNumber)
      });
    }

    return documents;

  } catch (error) {
    console.warn("Primary Database Connection Failed. Error:", error);
    console.log("Switching to Gemini Mock Data Service...");
    
    // Fallback to Gemini Service
    try {
      return await fetchMockDatabaseRecords();
    } catch (fallbackError) {
      console.error("Fallback Service also failed:", fallbackError);
      throw error;
    }
  }
};