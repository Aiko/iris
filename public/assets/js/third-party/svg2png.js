// Aiko_SVG2PNG 0.1.0 | helloaiko.com | MIT licensed | (c) 2021 Priansh Shah
const SVG2PNG = _svg => {
  const div = document.createElement('div')
  div.innerHTML = _svg
  const svg = div.firstChild
  const xml = new XMLSerializer().serializeToString(svg)
  const b64 = btoa(xml)
  return 'data:image/svg+xml;base64,' + b64
}