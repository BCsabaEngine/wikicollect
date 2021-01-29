const { StoreWikiPage, FindUnProcessed, GetPages } = require('./lib/database')
const { GetWikiPage } = require('./lib/Wiki')

async function StartAt(startpage) {
  const pageinfo = await GetWikiPage(startpage);
  await StoreWikiPage(pageinfo)

  console.log("Ready")
}

async function RunUnprocessed() {
  while (true) {
    const nexturl = await FindUnProcessed();
    if (!nexturl)
      break;

    console.log(`Processing ${nexturl}`)

    const pageinfo = await GetWikiPage(nexturl);
    await StoreWikiPage(pageinfo)
  }
}

async function FillMemIndex() {
  const pages = await GetPages(1)
  for (const page of pages) {
    const content = page.Content.replaceAll('\t', '').replaceAll('\n\n', '\n')

    const lines = content.split('\n')
    lines.push(page.Title)

    const sentences = []
    for (const line of lines) {
      const lsents = line.split('. ')
      for (const lsent of lsents)
        if (lsent.trim())
          sentences.push(lsent.trim())
    }

    console.log(sentences)
  }
}

try {
  //StartAt('/wiki/Pécs')
  //RunUnprocessed()
  FillMemIndex()
}
catch (error) {
  console.log(error.message)
}
