const express = require("express");
const path = require("path");
const puppeteer = require("puppeteer");
const { getCampaignById, campaigns } = require("./mockData");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.json());

app.get("/api/campaigns", (req, res) => {
  res.json(campaigns);
});

app.get("/api/campaigns/:id", (req, res) => {
  const campaign = getCampaignById(req.params.id);
  if (!campaign) {
    return res.status(404).json({ message: "Not found" });
  }
  res.json(campaign);
});

async function renderFlyerHtml(campaignId) {
  const campaign = getCampaignById(campaignId);
  if (!campaign) return null;

  return new Promise((resolve, reject) => {
    app.render("flyer", { campaign }, (err, html) => {
      if (err) reject(err);
      else resolve(html);
    });
  });
}

app.get("/api/campaigns/:id/flyer.pdf", async (req, res) => {
  try {
    const html = await renderFlyerHtml(req.params.id);
    if (!html) return res.status(404).send("Not found");

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=flyer.pdf");
    res.send(pdf);
  } catch (e) {
    console.error(e);
    res.status(500).send("Error");
  }
});

app.get("/api/campaigns/:id/flyer.png", async (req, res) => {
  try {
    console.log("Rendering flyer.png", req.params.id);
    const html = await renderFlyerHtml(req.params.id);
    if (!html) return res.status(404).send("Not found");

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setContent(html, { waitUntil: "networkidle0" });

    const png = await page.screenshot({ fullPage: true });

    await browser.close();

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", "inline; filename=flyer.png");
    res.send(png);
  } catch (e) {
    console.error(e);
    res.status(500).send("Error");
  }
});

const PORT = process.env.PORT || 5151;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
