import puppeteer from "puppeteer";
import fs from "fs/promises";

(async () => {
  const browser = await puppeteer.launch({ headless: false, slowMo: 20 });
  const page = await browser.newPage();

  const nomeArquivo = "turtles-data.json";

  await ensureFileRemoved(nomeArquivo);
  await page.goto("https://www.scrapethissite.com/pages/frames/");
  await page.setViewport({ width: 1080, height: 1024 });

  const iframe = await getIframe(page, "iframe");
  const turtleUrls = await collectTurtleUrls(iframe);

  const turtleData = await scrapeTurtleData(browser, turtleUrls);
  await saveDataToFile(nomeArquivo, turtleData);

  await browser.close();
})();

async function ensureFileRemoved(filename) {
  try {
    await fs.access(filename);
    await fs.unlink(filename);
    console.log(`File "${filename}" removed successfully.`);
  } catch {
    console.log(`File "${filename}" does not exist, skipping removal.`);
  }
}

async function getIframe(page, selector) {
  const iframeElement = await page.waitForSelector(selector);
  return iframeElement.contentFrame();
}

async function collectTurtleUrls(iframe) {
  const elements = await iframe.$$(".turtle-family-card");
  const urls = [];

  for (const element of elements) {
    const learnMoreBtn = await element.$(".btn");
    const href = await learnMoreBtn.evaluate((el) => el.getAttribute("href"));
    urls.push(`https://www.scrapethissite.com${href}`);
  }

  return urls;
}

async function scrapeTurtleData(browser, urls) {
  const data = [];

  for (const url of urls) {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const turtleInfo = await extractTurtleData(page);
    data.push(turtleInfo);

    await page.close();
  }

  return data;
}

async function extractTurtleData(page) {
  const name = await page.$eval(".family-name", (el) => el.textContent.trim());
  const description = await page.$eval(".lead", (el) => el.textContent.trim());
  const imageUrl = await page.$eval(".turtle-image", (el) => el.getAttribute("src"));

  return { species: name, description, imageUrl };
}

async function saveDataToFile(filename, data) {
  const jsonData = JSON.stringify(data, null, 2);

  try {
    await fs.writeFile(filename, jsonData);
    console.log(`Data successfully saved to ${filename}`);
  } catch (error) {
    console.error(`Error saving file: ${error.message}`);
  }
}
