// Project-specific lint rules for SMOS platform scripts. Wired up in eslint.config.mjs.
import path from 'node:path'

const relativeFile = context => path.relative(context.cwd, context.filename).split(path.sep).join('/')

const functionName = node => {
  if (node.type === 'FunctionDeclaration' && node.id) return node.id.name
  const parent = node.parent
  if (parent?.type === 'VariableDeclarator' && parent.id.type === 'Identifier') return parent.id.name
  if (parent?.type === 'Property' && parent.key.type === 'Identifier') return parent.key.name
  return null
}

const enclosingFunctionNames = (context, node) =>
  context.sourceCode
    .getAncestors(node)
    .filter(ancestor => /Function/.test(ancestor.type))
    .map(functionName)
    .filter(Boolean)

// Shared allowlist handling: entries are { file, inside, what, todo }.
const allowlisted = ruleId => ({
  meta: {
    type: 'problem',
    schema: [
      {
        type: 'object',
        properties: {
          allow: {
            type: 'array',
            items: {
              type: 'object',
              properties: { file: { type: 'string' }, inside: { type: 'string' }, what: { type: 'string' }, todo: { type: 'string' } },
              required: ['file', 'inside', 'what', 'todo'],
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      timer:
        '{{what}} in platform code usually papers over a timing problem (page not ready, focus stolen, state not observed). ' +
        'Wait on the real signal instead: a MutationObserver on the element/attribute, a DOM/media event, or a promise from the API. ' +
        'If it is truly unavoidable, add an entry with a TODO to the allowlist in eslint.config.mjs.',
      globalPatch:
        'Assigning {{what}} patches a page global. From a userscript sandbox or extension isolated world this does not affect the page\'s own calls ' +
        '(see extension/content/05-route-hook.js and commit 9b5c318). Hook in the page world instead, or observe the effect. ' +
        'Only window.__smos* namespace properties may be assigned.',
      unusedAllow: 'Allowlist entry for {{what}} inside {{inside}} is no longer needed; delete it from eslint.config.mjs.',
    },
  },
  create(context) {
    const file = relativeFile(context)
    const entries = (context.options[0]?.allow || []).filter(entry => entry.file === file)
    const used = new Set()
    const check = (node, what, messageId) => {
      const names = enclosingFunctionNames(context, node)
      const entry = entries.find(candidate => candidate.what === what && names.includes(candidate.inside))
      if (entry) {
        used.add(entry)
        return
      }
      context.report({ node, messageId, data: { what } })
    }
    const visitors = ruleId === 'no-timer-patch'
      ? {
          CallExpression(node) {
            const callee = node.callee
            const name = callee.type === 'Identifier'
              ? callee.name
              : callee.type === 'MemberExpression' && callee.object.type === 'Identifier' && callee.object.name === 'window' && callee.property.type === 'Identifier'
                ? callee.property.name
                : null
            if (name === 'setTimeout' || name === 'setInterval') {
              check(node, name, 'timer')
            }
          },
        }
      : {
          AssignmentExpression(node) {
            const left = node.left
            if (left.type !== 'MemberExpression') return
            const object = left.object
            const property = !left.computed && left.property.type === 'Identifier' ? left.property.name : null
            const isWindow = object.type === 'Identifier' && object.name === 'window'
            const isHistory =
              (object.type === 'Identifier' && object.name === 'history') ||
              (object.type === 'MemberExpression' && !object.computed && object.property.name === 'history')
            if (isWindow && property && property.startsWith('__smos')) return
            if (isWindow || isHistory) {
              check(node, context.sourceCode.getText(left).replace(/\[.*\]$/, '[…]'), 'globalPatch')
            }
          },
        }
    return {
      ...visitors,
      'Program:exit'(program) {
        for (const entry of entries) {
          if (!used.has(entry)) {
            context.report({ node: program, messageId: 'unusedAllow', data: entry })
          }
        }
      },
    }
  },
})

const guardedGm = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      unguarded:
        '{{name}} may not exist (extension compat layer, other userscript managers). Call it behind `typeof {{name}} === \'function\'` ' +
        'or use the readSetting/writeSetting helpers.',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.type !== 'Identifier' || !node.callee.name.startsWith('GM_')) return
        const name = node.callee.name
        const ancestors = context.sourceCode.getAncestors(node)
        const mentionsGuard = test => context.sourceCode.getText(test).includes(`typeof ${name}`)
        const wrapped = ancestors.some(
          ancestor => (ancestor.type === 'IfStatement' || ancestor.type === 'ConditionalExpression') && mentionsGuard(ancestor.test),
        )
        const earlyReturn = ancestors.some(
          ancestor =>
            /Function/.test(ancestor.type) &&
            ancestor.body.type === 'BlockStatement' &&
            ancestor.body.body.some(statement => statement.type === 'IfStatement' && mentionsGuard(statement.test)),
        )
        const guarded = wrapped || earlyReturn
        if (!guarded) {
          context.report({ node, messageId: 'unguarded', data: { name } })
        }
      },
    }
  },
}

export default {
  rules: {
    'no-timer-patch': allowlisted('no-timer-patch'),
    'no-global-patch': allowlisted('no-global-patch'),
    'guarded-gm': guardedGm,
  },
}
