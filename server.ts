import express from "express";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Google Sheets integration
  app.post("/api/save-to-sheet", async (req, res) => {
    let clientEmail = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
    let spreadsheetId = (process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '').trim();
    // Extract ID if the user pasted the full URL
    const match = spreadsheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      spreadsheetId = match[1];
    }

    try {
      const { data } = req.body;
      
      if (!data) {
        return res.status(400).json({ error: "Missing data in request body" });
      }
      
      // Robust private key parsing
      let rawKey = process.env.GOOGLE_PRIVATE_KEY || '';
      let privateKey = rawKey;
      
      // 1. Try to parse as JSON in case the user pasted the entire JSON file
      try {
        const parsed = JSON.parse(rawKey);
        if (parsed.private_key) {
          privateKey = parsed.private_key;
        }
        // If the JSON contains the client_email, use it! This prevents mismatches.
        if (parsed.client_email) {
          clientEmail = parsed.client_email;
        }
      } catch (e) {
        // Not JSON, proceed normally
      }
      
      // 2. Remove surrounding quotes if the user copied them from the JSON
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }
      
      // 3. Replace literal '\n' strings with actual newline characters
      privateKey = privateKey.replace(/\\n/g, '\n');
      
      // 4. If the key was pasted as a single line without newlines, fix the headers
      if (!privateKey.includes('\n') && privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        privateKey = privateKey
          .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
          .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
      }

      // 5. Validate that it actually looks like a private key
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----') || !privateKey.includes('-----END PRIVATE KEY-----')) {
        return res.status(500).json({ 
          error: "Invalid Private Key", 
          details: "The GOOGLE_PRIVATE_KEY secret does not contain a valid RSA private key. Please copy the exact private_key value from your JSON file, including the BEGIN and END markers." 
        });
      }

      if (!spreadsheetId || !clientEmail || !rawKey) {
        console.warn("Google Sheets credentials missing. Required: GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY");
        return res.status(200).json({ 
          status: "skipped", 
          message: "Credentials missing. Please configure environment variables." 
        });
      }

      console.log(`Attempting to save to sheet: ${spreadsheetId.substring(0, 5)}...`);

      const auth = new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheets = google.sheets({ version: 'v4', auth });

      // Map data to sheet columns for comprehensive trend analysis
      const values = [[
        new Date().toLocaleString('en-US'), // Now includes both Date and Time of day
        data.owner || "Unknown",
        data.name || "Untitled",
        data.overview,
        data.strategicFit?.determination || "N/A",
        data.strategicFit?.explanation || "",
        data.scalability || "",
        data.efficiency?.impact || "",
        data.revenue?.forecast || "",
        data.experience || "",
        data.workflow || "",
        data.dataReadiness || "",
        data.scores?.businessCriticality || 0,
        data.scores?.implementationComplexity || 0,
        data.recommendation || "",
        data.summary || ""
      ]];

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'A:P', // Updated range for more columns
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });

      console.log("Successfully saved to Google Sheets");
      res.json({ status: "success" });
    } catch (error: any) {
      console.error("Error saving to Google Sheets:", error);
      
      let errorMessage = error.message || String(error);
      if (errorMessage.includes('invalid_grant')) {
        errorMessage = `Invalid grant: account not found. The Service Account Email (${clientEmail}) does not match the Private Key, or the account was deleted. Please verify your setup.`;
      } else if (errorMessage.includes('Requested entity was not found')) {
        errorMessage = `Requested entity was not found. The Spreadsheet ID (${spreadsheetId}) might be incorrect, or the Service Account (${clientEmail}) has not been granted Editor access to the sheet.`;
      }
      
      res.status(500).json({ error: "Failed to save to sheet", details: errorMessage });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
