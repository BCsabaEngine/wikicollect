const Database = require('./lib/Database')
const { GetWikiPage } = require('./lib/Wiki')

let dbinstance = null
let dbuse = 0
function CreateDatabase() {
  if (dbuse > 49) {
    dbinstance.close()
    dbinstance = null
  }

  if (!dbinstance) {
    dbinstance = new Database({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'wikicollect'
    });
    dbuse = 0
  }

  dbuse++
  return dbinstance
}

async function StoreWikiPage(pageinfo) {
  const database = CreateDatabase();

  await database.query('SELECT 1 FROM Page WHERE Url = ?', pageinfo.url)
    .then((exists) => {
      if (exists && exists.length) return

      var pagerow = { Url: pageinfo.url, Title: pageinfo.title, Content: pageinfo.text };
      database.query('INSERT INTO Page SET ?', pagerow)
    })


  await database.query('UPDATE Url SET Processed = NOW() WHERE Url = ?', pageinfo.url)

  for (const url of pageinfo.urls)
    await database.query('SELECT 1 FROM Url WHERE Url = ?', url)
      .then((exists) => {
        if (exists && exists.length) return

        var urlrow = { Url: url };
        database.query('INSERT INTO Url SET ?', urlrow)
      })
}

async function FindUnProcessed() {
  const database = CreateDatabase();

  const result = await database.query('SELECT Url FROM Url WHERE Processed IS NULL ORDER BY RAND() LIMIT 1')
  if (result && result.length)
    return result[0].Url

  return null
}

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

try {
  //StartAt('/wiki/Pécs')
  RunUnprocessed()
}
catch (error) {
  console.log(error.message)
}
