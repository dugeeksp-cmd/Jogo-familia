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
    const { version, feature, validated } = req.body;
    const logPath = path.join(process.cwd(), "validated_tests.json");
    
    let history = {};
    if (fs.existsSync(logPath)) {
      try {
        history = JSON.parse(fs.readFileSync(logPath, "utf-8"));
      } catch (e) {
        history = {};
      }
    }

    if (!history[version]) history[version] = {};
    history[version][feature] = validated;

    fs.writeFileSync(logPath, JSON.stringify(history, null, 2));
    
    // Also save as plain text for easy reading as requested
    const txtPath = path.join(process.cwd(), "validacoes.txt");
    const txtLine = `[${new Date().toLocaleString()}] Versão ${version}: ${feature} -> ${validated ? 'VALIDADO' : 'PENDENTE'}\n`;
    fs.appendFileSync(txtPath, txtLine);

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
