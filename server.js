const express = require("express");
const fs = require("node:fs/promises");
const path = require("node:path");

const app = express();
const port = Number(process.env.PORT || 5000);
const dataDir = process.env.DATA_DIR || (process.env.AMVERA ? "/data" : path.join(__dirname, "data"));
const dataFile = path.join(dataDir, "items.json");

async function readItems() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    return JSON.parse(await fs.readFile(dataFile, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    await fs.writeFile(dataFile, "[]");
    return [];
  }
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (request, response) => response.json({ ok: true, framework: "Express", storage: dataFile }));

app.get("/api/items", async (request, response) => {
  const items = await readItems();
  response.json({ items: items.toReversed(), count: items.length });
});

app.post("/api/items", async (request, response) => {
  const name = String(request.body.name || "").trim();
  if (!name || name.length > 120) return response.status(400).json({ error: "Name must contain from 1 to 120 characters" });
  const items = await readItems();
  const item = { id: items.reduce((max, value) => Math.max(max, value.id), 0) + 1, name };
  items.push(item);
  await fs.writeFile(dataFile, JSON.stringify(items, null, 2));
  response.status(201).json({ item });
});

app.delete("/api/items/:id", async (request, response) => {
  const items = await readItems();
  const id = Number(request.params.id);
  const next = items.filter(item => item.id !== id);
  if (next.length === items.length) return response.status(404).json({ error: "Item not found" });
  await fs.writeFile(dataFile, JSON.stringify(next, null, 2));
  response.json({ deleted: true, id });
});

app.listen(port, "0.0.0.0");
