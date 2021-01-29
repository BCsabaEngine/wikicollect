const mysql = require('mysql2/promise')

let dbinstance = null
let dbuse = 0
async function GetDatabase() {
  if (dbuse > 27) {
    dbinstance.close()
    dbinstance = null
  }

  if (!dbinstance) {
    dbinstance = await mysql.createConnection({ host: 'localhost', user: 'root', password: 'root', database: 'wikicollect' });
    dbuse = 0
  }

  dbuse++
  return dbinstance
}

async function StoreWikiPage(pageinfo) {
  const database = await GetDatabase();

  const [exists] = await database.query('SELECT 1 FROM Page WHERE Url = ?', [pageinfo.url])
  if (exists && exists.length)
    return

  await database.execute('INSERT INTO Page (Url, Title, Content) VALUES (?, ?, ?)', [pageinfo.url, pageinfo.title, pageinfo.text])

  await database.execute('UPDATE Url SET Processed = NOW() WHERE Url = ?', [pageinfo.url])

  for (const url of pageinfo.urls) {
    const [urlexists] = await database.query('SELECT 1 FROM Url WHERE Url = ?', [url])
    if (urlexists && urlexists.length) return

    await database.execute('INSERT INTO Url (Url) VALUES (?)', [url])
  }
}

async function FindUnProcessed() {
  const database = await GetDatabase();

  const [result] = await database.query('SELECT Url FROM Url WHERE Processed IS NULL ORDER BY RAND() LIMIT 1')
  if (result && result.length)
    return result[0].Url

  return null
}

async function GetPages(limit = 100) {
  const database = await GetDatabase();

  const [rows] = await database.query(`SELECT * FROM Page ORDER BY RAND() LIMIT ${limit}`)

  return rows

}

module.exports = { StoreWikiPage, FindUnProcessed, GetPages }