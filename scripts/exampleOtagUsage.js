// Script to extract otag links from Scryfall Tagger for a batch of cards using Puppeteer
import puppeteer from 'puppeteer';

// List of cards to process: [set, collectorNumber]
const cards = [
  ['ltr', '75'], // The Watcher in the Water
  ['sth', '104'], // Constant Mists
  ['neo', '1'],   // Example: Eiganjo, Seat of the Empire
  ['mh2', '1'],   // Example: Archon of Cruelty
  ['woe', '1'],   // Example: Agatha of the Vile Cauldron
  // Add more as needed
];

async function getOtagLinksPuppeteer(set, collectorNumber, page) {
  const taggerUrl = `https://tagger.scryfall.com/card/${set}/${collectorNumber}`;
  await page.goto(taggerUrl, { waitUntil: 'networkidle2' });
  try {
    await page.waitForSelector('a[href^="/tags/card/"]', { timeout: 5000 });
  } catch {
    return [];
  }
  const tagLinks = await page.$$eval('a[href^="/tags/card/"]', links =>
    links.map(link => link.getAttribute('href'))
  );
  // Extract just the tag name from the URL
  return tagLinks.map(href => href.replace('/tags/card/', ''));
}

async function main() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const otagCounts = {};

  for (const [set, collectorNumber] of cards) {
    console.log(`Processing ${set} ${collectorNumber}...`);
    const otags = await getOtagLinksPuppeteer(set, collectorNumber, page);
    otags.forEach(tag => {
      otagCounts[tag] = (otagCounts[tag] || 0) + 1;
    });
  }

  await browser.close();

  // Sort and print top 5 otags
  const topOtags = Object.entries(otagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  console.log('\nTop 5 otags:');
  topOtags.forEach(([tag, count]) => {
    console.log(`${tag}: ${count}`);
  });
}

main();
