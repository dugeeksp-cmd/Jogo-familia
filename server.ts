import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API to save validated tests
  app.post("/api/validate", (req, res) => {
    const data = req.body;
    const logPath = path.join(process.cwd(), "validated_tests.json");
    const txtPath = path.join(process.cwd(), "validacoes.txt");
    
    let history = {};
    if (fs.existsSync(logPath)) {
      try {
        history = JSON.parse(fs.readFileSync(logPath, "utf-8"));
      } catch (e) {
        history = {};
      }
    }

    if (data.feature && data.version) {
      // Legacy single validation
      if (!history[data.version]) history[data.version] = {};
      history[data.version][data.feature] = data.validated;
      
      const txtLine = `[${new Date().toLocaleString()}] Versão ${data.version}: ${data.feature} -> ${data.validated ? 'VALIDADO' : 'PENDENTE'}\n`;
      fs.appendFileSync(txtPath, txtLine);
    } else {
      // Bulk update or Correction report
      Object.keys(data).forEach(key => {
        if (key.startsWith('RELATO_')) {
          const report = data[key];
          const txtLine = `[${new Date().toLocaleString()}] NOVO RELATO DE CORREÇÃO: ${report}\n`;
          fs.appendFileSync(txtPath, txtLine);
        } else {
          // Assume feature key (feat) and we find which version it belongs to
          // Or we just store it in a flat validations map for easier UI retrieval
          if (!history["current"]) history["current"] = {};
          history["current"][key] = true;
          
          const txtLine = `[${new Date().toLocaleString()}] VALIDADO: ${key}\n`;
          fs.appendFileSync(txtPath, txtLine);
        }
      });
    }

    fs.writeFileSync(logPath, JSON.stringify(history, null, 2));
    res.json({ status: "ok" });
  });

  // API to get validated tests
  app.get("/api/validated", (req, res) => {
    const logPath = path.join(process.cwd(), "validated_tests.json");
    if (fs.existsSync(logPath)) {
      try {
        const data = fs.readFileSync(logPath, "utf-8");
        res.json(JSON.parse(data));
      } catch (e) {
        res.json({});
      }
    } else {
      res.json({});
    }
  });

  // Serve static dist in production
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    // Vite middleware for development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
