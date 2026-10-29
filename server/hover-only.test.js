import assert from 'node:assert/strict'
import test from 'node:test'
import { hoverOnly } from './hover-only.js'

test('wraps hover-only rules in a hover media query', () => {
  const output = hoverOnly('.a:hover{color:red}')
  assert.match(output, /@media \(hover: hover\)\{\.a:hover\{color:red\}\}/)
})

test('splits mixed selector lists and keeps focus styles outside the media query', () => {
  const output = hoverOnly('.a:hover, .a:focus-visible, .b:is(:focus, :active){x:1}')
  assert.match(output, /^\.a:focus-visible,\s*\.b:is\(:focus, :active\)\{x:1\}/)
  assert.match(output, /@media \(hover: hover\)\{\.a:hover\{x:1\}\}$/)
})

test('leaves already-guarded, keyframe and non-hover rules alone', () => {
  const css =
    '@media (hover: hover){.a:hover{x:1}} @keyframes k{0%{x:1}to{x:2}} .c{y:1} @media (max-width:600px){.d:hover{z:1}}'
  const output = hoverOnly(css)
  assert.ok(
    output.startsWith('@media (hover: hover){.a:hover{x:1}} @keyframes k{0%{x:1}to{x:2}} .c{y:1}'),
  )
  assert.match(
    output,
    /@media \(max-width:600px\)\{\s*@media \(hover: hover\)\{\.d:hover\{z:1\}\}\}/,
  )
})
