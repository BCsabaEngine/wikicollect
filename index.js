const fs = require('fs')
const got = require('got')
const util = require('util')
const HTMLParser = require('node-html-parser')
const html_entities = require('html-entities')

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
  // fs.writeFileSync('./inspect1', util.inspect(dom, false, null, false))

  let titletext = ''
  let text = ''

  const titledom = dom.querySelector('title')
  if (titledom) {
    titletext = titledom.firstChild.rawText.replace('Wikipédia', '').replace('–', '').trim()
    text = titletext + '\n\n'
  }

  const output = dom.querySelectorAll('.mw-parser-output')[0]

  // fs.writeFileSync('./inspect2', util.inspect(output, false, null, false))

  const urls = []
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
      if (element.constructor.name == 'TextNode') {
        // console.log(element.rawText)
        if (element.rawText)
          text += html_entities.decode(element.rawText)
      }
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

  // console.log(text)
  // fs.writeFileSync('./text', text)

  urls.sort()
  // console.log(urls)

  return {
    title: titletext,
    text: text,
    urls: urls
  }

  //  const inspect = util.inspect(ouput[0], false, null, false)
  //  console.log(inspect)
  //console.log(tree.childNodes[1].childNodes[2])
}

async function Exec() {
  try {
    const wcontent = await GetWikiPage('/wiki/Pécs');
    console.log(wcontent.urls.length)
  }
  catch (error) {
    console.log(error.message)
  }
};
Exec()
