const got = require('got')
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
      if (element) {
        if (element.constructor)
          if (element.constructor.name == 'TextNode')
            return true

        if (element.constructor)
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
      }
      return false
    },
    function (element) {
      if (element) {
        if (element.constructor)
          if (element.constructor.name == 'TextNode')
            if (element.rawText)
              text += html_entities.decode(element.rawText)

        if (element.rawAttrs) {
          const match = element.rawAttrs.match(/href="(\/wiki\/[^"]*)"/)
          if (match)
            if (!urls.includes(match[1]))
              urls.push(match[1])
        }
      }
    });

  while (text.includes('\n\n\n'))
    text = text.replace('\n\n\n', '\n\n')
  //text.replace('/[\x{10000}-\x{10FFFF}]/u', "\xEF\xBF\xBD", $value);
  text = text.trim()

  urls.sort()
  return {
    url: url,
    title: titletext,
    text: text,
    urls: urls
  }
}

module.exports = { GetWikiPage }