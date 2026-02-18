import { GoogleGenAI, Type } from "@google/genai";
import { DocumentData } from '../types';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fetchMockDatabaseRecords = async (): Promise<DocumentData[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate 6 mock "Requisition Form" records for a hotel or resort called "MaroonPrint Resort".
      
      Fields required:
      - id (Serial Code, e.g., NO. 12345)
      - department (e.g., Kitchen, Housekeeping, Front Office)
      - purpose (e.g., "For guest amenities", "Weekly restocking")
      - date (current dates)
      - deliverOn (future dates)
      - status (Pending, Approved)
      - items: Array of { description, quantity, uom (pcs, box, kg), unitPrice, total }
      - totalAmount (sum of item totals)
      - Signatories names: preparedBy, notedBy, approvedBy, receivedBy, checkedBy.

      Ensure the data is realistic for a hotel requisition context.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['Requisition Form'] },
              department: { type: Type.STRING },
              purpose: { type: Type.STRING },
              date: { type: Type.STRING },
              deliverOn: { type: Type.STRING },
              status: { type: Type.STRING, enum: ['Approved', 'Pending', 'Processing'] },
              totalAmount: { type: Type.NUMBER },
              preparedBy: { type: Type.STRING },
              notedBy: { type: Type.STRING },
              approvedBy: { type: Type.STRING },
              receivedBy: { type: Type.STRING },
              checkedBy: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    description: { type: Type.STRING },
                    quantity: { type: Type.INTEGER },
                    uom: { type: Type.STRING },
                    unitPrice: { type: Type.NUMBER },
                    total: { type: Type.NUMBER },
                    remarks: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text) as DocumentData[];
      return data;
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch from Gemini DB:", error);
    // Fallback data
    return [
      {
        id: "001592",
        type: "Requisition Form",
        department: "Housekeeping",
        purpose: "Guest Room Supplies",
        date: "2024-10-25",
        deliverOn: "2024-10-27",
        status: "Pending",
        totalAmount: 4500.00,
        preparedBy: "Maria Cruz",
        notedBy: "Sarah Lee",
        approvedBy: "John Doe",
        receivedBy: "Mike Smith",
        checkedBy: "Anna White",
        items: [
          { description: "Shampoo Bottles (30ml)", quantity: 100, uom: "pcs", unitPrice: 15.00, total: 1500.00 },
          { description: "Bath Towels", quantity: 20, uom: "pcs", unitPrice: 150.00, total: 3000.00 }
        ]
      }
    ];
  }
};