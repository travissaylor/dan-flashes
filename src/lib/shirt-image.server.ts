import '@tanstack/react-start/server-only'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Resvg } from '@resvg/resvg-js'
import { ShirtArtwork } from '@/components/ShirtArtwork'
import type { PatternLayer } from '@/lib/types'

const CANVAS_WIDTH = 1200
const CANVAS_HEIGHT = 630
const PAPER = '#f1eddf'
const INK = '#15201c'
const MUTED = '#6d7168'
const SERIF_STACK = "'DM Serif Display', Georgia, 'Times New Roman', serif"
const SANS_STACK = "'Archivo Narrow', Helvetica, Arial, sans-serif"

// ShirtArtwork's viewBox is "-12 0 224 235" — width 224, height 235.
const ARTWORK_ASPECT = 235 / 224

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function renderShirtPng(shirt: { name: string; layers: PatternLayer[] }, options?: { width?: number }): Buffer {
  const outputWidth = options?.width ?? CANVAS_WIDTH

  const artworkMarkup = renderToStaticMarkup(createElement(ShirtArtwork, { layers: shirt.layers, title: shirt.name }))
  const artWidth = 420
  const artHeight = Math.round(artWidth * ARTWORK_ASPECT)
  const artX = Math.round((CANVAS_WIDTH - artWidth) / 2)
  const artY = 90
  const sizedArtwork = artworkMarkup.replace('<svg ', `<svg x="${artX}" y="${artY}" width="${artWidth}" height="${artHeight}" `)

  const name = escapeXml(shirt.name)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}">
    <rect width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="${PAPER}"/>
    <text x="60" y="72" font-family="${SERIF_STACK}" font-size="26" fill="${INK}" letter-spacing="-0.5">Dan Flashes</text>
    <text x="${CANVAS_WIDTH - 60}" y="72" text-anchor="end" font-family="${SANS_STACK}" font-size="13" letter-spacing="2" fill="${MUTED}">ONE OF ONE</text>
    ${sizedArtwork}
    <text x="${CANVAS_WIDTH / 2}" y="600" text-anchor="middle" font-family="${SERIF_STACK}" font-size="44" letter-spacing="-1" fill="${INK}">${name}</text>
  </svg>`

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: outputWidth },
    font: { loadSystemFonts: true },
    background: PAPER,
  })

  return resvg.render().asPng()
}
