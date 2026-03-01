import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("foodlog.db");

// Initialize database with separate tables for visits and dishes
db.exec(`
  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hotel_name TEXT,
    address TEXT,
    serving_quality INTEGER,
    cost_effectiveness INTEGER,
    ambience INTEGER,
    is_favorite INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS dishes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_id INTEGER,
    dish_name TEXT,
    price REAL,
    taste INTEGER,
    spicy_level INTEGER,
    freshness INTEGER,
    image_url TEXT,
    FOREIGN KEY(visit_id) REFERENCES visits(id) ON DELETE CASCADE
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/entries", (req, res) => {
    const visits = db.prepare("SELECT * FROM visits ORDER BY created_at DESC").all();
    const entries = visits.map(visit => {
      const dishes = db.prepare("SELECT * FROM dishes WHERE visit_id = ?").all(visit.id);
      return { ...visit, dishes };
    });
    res.json(entries);
  });

  app.post("/api/entries", (req, res) => {
    const {
      hotel_name,
      address,
      serving_quality,
      cost_effectiveness,
      ambience,
      dishes
    } = req.body;

    const insertVisit = db.prepare(`
      INSERT INTO visits (hotel_name, address, serving_quality, cost_effectiveness, ambience)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertDish = db.prepare(`
      INSERT INTO dishes (visit_id, dish_name, price, taste, spicy_level, freshness, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((visitData, dishesData) => {
      const visitInfo = insertVisit.run(
        visitData.hotel_name,
        visitData.address,
        visitData.serving_quality,
        visitData.cost_effectiveness,
        visitData.ambience
      );
      const visitId = visitInfo.lastInsertRowid;

      for (const dish of dishesData) {
        insertDish.run(
          visitId,
          dish.dish_name,
          dish.price,
          dish.taste,
          dish.spicy_level,
          dish.freshness,
          dish.image_url || `https://picsum.photos/seed/${dish.dish_name}/400/300`
        );
      }
      return visitId;
    });

    try {
      const visitId = transaction({ hotel_name, address, serving_quality, cost_effectiveness, ambience }, dishes);
      res.json({ id: visitId });
    } catch (error) {
      console.error("Transaction failed:", error);
      res.status(500).json({ error: "Failed to save entry" });
    }
  });

  app.patch("/api/entries/:id/favorite", (req, res) => {
    const { id } = req.params;
    const { is_favorite } = req.body;
    db.prepare("UPDATE visits SET is_favorite = ? WHERE id = ?").run(is_favorite ? 1 : 0, id);
    res.json({ success: true });
  });

  app.get("/api/search", (req, res) => {
    const { q } = req.query;
    const query = `%${q}%`;
    
    // Search in visits or dishes
    const visits = db.prepare(`
      SELECT DISTINCT v.* FROM visits v
      LEFT JOIN dishes d ON v.id = d.visit_id
      WHERE v.hotel_name LIKE ? OR d.dish_name LIKE ?
      ORDER BY v.created_at DESC
    `).all(query, query);

    const entries = visits.map(visit => {
      const dishes = db.prepare("SELECT * FROM dishes WHERE visit_id = ?").all(visit.id);
      return { ...visit, dishes };
    });
    res.json(entries);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
