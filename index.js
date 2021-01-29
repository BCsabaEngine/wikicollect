const fs = require('fs')

const { StoreWikiPage, FindUnProcessed, GetPages } = require('./lib/database')
const { GetWikiPage } = require('./lib/Wiki')
const { TrimEx } = require('./lib/Util')

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
  const sentences = []

  const pages = await GetPages(20000)
  for (const page of pages) {
    const content = page.Content.replaceAll('\t', '').replaceAll('\n\n', '\n')

    const lines = content.split('\n')
    lines.push(page.Title)

    for (const line of lines) {
      const lsents = line.split('. ')
      for (const lsent of lsents) {
        const lsentt = TrimEx(lsent, [' ?-*;,!()"\'&'])
        if (lsentt)
          sentences.push(lsentt)
      }
    }

  }
  console.log("Sorting...")
  sentences.sort()

  const usentences = []
  let last = ''
  for (const s of sentences) {
    if (last != s)
      usentences.push(s)
    last = s
  }

  console.log("To file...")
  fs.writeFileSync('./dat.json', JSON.stringify(usentences, null, 4))
  console.log("Completed")
}

try {
  //StartAt('/wiki/Pécs')
  //RunUnprocessed()
  FillMemIndex()
}
catch (error) {
  console.log(error.message)
}
