const fs = require('fs')
const got = require('got')
const util = require('util')
const HTMLParser = require('node-html-parser')
const html_entities = require('html-entities')
const mysql = require('mysql')

class Database {
  constructor(config) {
    this.connection = mysql.createConnection(config);
  }
  query(sql, args) {
    return new Promise((resolve, reject) => {
      this.connection.query(sql, args, (err, rows) => {
        if (err)
          return reject(err);
        resolve(rows);
      });
    });
  }
  close() {
    return new Promise((resolve, reject) => {
      this.connection.end(err => {
        if (err)
          return reject(err);
        resolve();
      });
    });
  }
}

const wikiroot = 'https://hu.wikipedia.org'

function DomTraversal(element, enabled, cb) {
  cb(element)
  if (element.childNodes)
    for (const child of element.childNodes)
      if (enabled(element))
        DomTraversal(child, enabled, cb)
}

async function GetWikiPage(url) {
  const html = await got(wikiroot + url)
  const dom = HTMLParser.parse(html.body);

  let titletext = ''
  let text = ''
  const urls = []

  const titledom = dom.querySelector('title')
  if (titledom) {
    titletext = titledom.firstChild.rawText.replace('Wikipédia', '').replace('–', '').trim()
    text = titletext + '\n\n'
  }

  const output = dom.querySelectorAll('.mw-parser-output')[0]
  DomTraversal(output,
    function (element) {
      if (element.constructor.name == 'TextNode')
        return true

      if (element.constructor.name == 'HTMLElement'
        && element.rawTagName != 'table'
        && element.rawTagName != 'style'
        && element.id != 'toc'
        && !element.classNames.includes('mw-editsection')
        && !element.classNames.includes('thumb')
        && !element.classNames.includes('noprint')
        && !element.classNames.includes('noviewer')
        && !element.classNames.includes('ref-1col')
        && !element.classNames.includes('ref-2col')
        && !element.classNames.includes('reference')
      ) return true

      return false
    },
    function (element) {
      if (element.constructor.name == 'TextNode')
        if (element.rawText)
          text += html_entities.decode(element.rawText)

      if (element.rawAttrs) {
        const match = element.rawAttrs.match(/href="(\/wiki\/[^"]*)"/)
        if (match)
          if (!urls.includes(match[1]))
            urls.push(match[1])
      }
    });

  while (text.includes('\n\n\n'))
    text = text.replace('\n\n\n', '\n\n')
  text = text.trim()

  urls.sort()
  return {
    url: url,
    title: titletext,
    text: text,
    urls: urls
  }
}

function GetDatabase() {
  return new Database({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'wikicollect'
  });
}

async function StoreWikiPage(pageinfo) {
  const database = GetDatabase();

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

  await database.close()
}

async function FindUnProcessed() {
  const database = GetDatabase();

  const result = await database.query('SELECT Url FROM Url WHERE Processed IS NULL ORDER BY RAND() LIMIT 1')
  await database.close()
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
