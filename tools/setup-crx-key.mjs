#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const keyPath = path.join(root, '.keys', 'smos-extension.pem')
const manifestPath = path.join(root, 'extension', 'manifest.json')

async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK)
    return true
  } catch {
    return false
  }
}

function extensionId(publicKeyDer) {
  const hash = crypto.createHash('sha256').update(publicKeyDer).digest('hex').slice(0, 32)
  return [...hash].map(char => String.fromCharCode(97 + Number.parseInt(char, 16))).join('')
}

let privateKeyPem
if (await exists(keyPath)) {
  privateKeyPem = await readFile(keyPath, 'utf8')
  console.log(`Using existing signing key: ${path.relative(root, keyPath)}`)
} else {
  const pair = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })
  await mkdir(path.dirname(keyPath), { recursive: true })
  await writeFile(keyPath, pair.privateKey, { mode: 0o600 })
  privateKeyPem = pair.privateKey
  console.log(`Generated signing key: ${path.relative(root, keyPath)}`)
}

const privateKey = crypto.createPrivateKey(privateKeyPem)
const publicKeyDer = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'der' })
const publicKeyBase64 = publicKeyDer.toString('base64')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))

if (manifest.key !== publicKeyBase64) {
  manifest.key = publicKeyBase64
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  console.log('Updated extension/manifest.json with the public key.')
}

console.log(`Extension ID: ${extensionId(publicKeyDer)}`)
console.log('')
console.log('Next steps:')
console.log('1. Keep .keys/smos-extension.pem private; it is gitignored.')
console.log('2. Add its base64 form as the GitHub Actions secret CRX_PRIVATE_KEY:')
console.log('   PowerShell: [Convert]::ToBase64String([IO.File]::ReadAllBytes(".keys/smos-extension.pem")) | gh secret set CRX_PRIVATE_KEY')
console.log('   Bash:       base64 -w0 .keys/smos-extension.pem | gh secret set CRX_PRIVATE_KEY')
console.log('3. Build the CRX: node tools/pack-crx.mjs')
