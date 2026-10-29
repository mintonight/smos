#!/usr/bin/env node
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const extensionDir = path.join(root, 'extension')

function argument(name, fallback) {
  const index = process.argv.indexOf(name)
  return index === -1 ? fallback : process.argv[index + 1]
}

const keyPath = path.resolve(root, argument('--key', '.keys/smos-extension.pem'))
const outDir = path.resolve(root, argument('--out', 'dist'))

async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK)
    return true
  } catch {
    return false
  }
}

function uint32LE(value) {
  const buffer = Buffer.alloc(4)
  buffer.writeUInt32LE(value >>> 0, 0)
  return buffer
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let value = n
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }
    table[n] = value >>> 0
  }
  return table
})()

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

async function collectFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true })
  entries.sort((a, b) => a.name.localeCompare(b.name))
  const files = []
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectFiles(absolute, relative))
      continue
    }
    if (!entry.isFile()) {
      continue
    }
    if (entry.name === '.DS_Store' || entry.name.endsWith('.pem') || entry.name.endsWith('.crx')) {
      continue
    }
    files.push({ name: relative.replaceAll('\\', '/'), data: await readFile(absolute) })
  }
  return files
}

function createZip(files) {
  const localParts = []
  const centralParts = []
  let offset = 0

  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8')
    const compressed = zlib.deflateRawSync(file.data, { level: 9 })
    const crc = crc32(file.data)

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6)
    local.writeUInt16LE(8, 8)
    local.writeUInt16LE(0, 10)
    local.writeUInt16LE(0x0021, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(compressed.length, 18)
    local.writeUInt32LE(file.data.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(8, 10)
    central.writeUInt16LE(0, 12)
    central.writeUInt16LE(0x0021, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(compressed.length, 20)
    central.writeUInt32LE(file.data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt16LE(0, 30)
    central.writeUInt16LE(0, 32)
    central.writeUInt16LE(0, 34)
    central.writeUInt16LE(0, 36)
    central.writeUInt32LE(0, 38)
    central.writeUInt32LE(offset, 42)

    localParts.push(local, name, compressed)
    centralParts.push(central, name)
    offset += local.length + name.length + compressed.length
  }

  const central = Buffer.concat(centralParts)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(files.length, 8)
  eocd.writeUInt16LE(files.length, 10)
  eocd.writeUInt32LE(central.length, 12)
  eocd.writeUInt32LE(offset, 16)
  eocd.writeUInt16LE(0, 20)

  return Buffer.concat([...localParts, central, eocd])
}

function encodeVarint(value) {
  const bytes = []
  let remaining = value
  while (remaining > 0x7f) {
    bytes.push((remaining & 0x7f) | 0x80)
    remaining = Math.floor(remaining / 128)
  }
  bytes.push(remaining)
  return Buffer.from(bytes)
}

function bytesField(fieldNumber, value) {
  return Buffer.concat([encodeVarint(fieldNumber * 8 + 2), encodeVarint(value.length), value])
}

function parseFields(buffer) {
  const fields = []
  let offset = 0
  while (offset < buffer.length) {
    let key = 0
    let shift = 0
    while (true) {
      const byte = buffer[offset]
      offset += 1
      key += (byte & 0x7f) << shift
      if ((byte & 0x80) === 0) {
        break
      }
      shift += 7
    }
    const fieldNumber = key >>> 3
    const wireType = key & 7
    if (wireType !== 2) {
      throw new Error(`Unsupported protobuf wire type ${wireType} in CRX header`)
    }
    let length = 0
    shift = 0
    while (true) {
      const byte = buffer[offset]
      offset += 1
      length += (byte & 0x7f) << shift
      if ((byte & 0x80) === 0) {
        break
      }
      shift += 7
    }
    fields.push({ fieldNumber, value: buffer.subarray(offset, offset + length) })
    offset += length
  }
  return fields
}

function extensionId(publicKeyDer) {
  const hash = crypto.createHash('sha256').update(publicKeyDer).digest('hex').slice(0, 32)
  return [...hash].map(char => String.fromCharCode(97 + Number.parseInt(char, 16))).join('')
}

function createCrx(zip, privateKey) {
  const publicKeyDer = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'der' })
  const crxId = crypto.createHash('sha256').update(publicKeyDer).digest().subarray(0, 16)
  const signedHeaderData = bytesField(1, crxId)
  const signaturePayload = Buffer.concat([
    Buffer.from('CRX3 SignedData\x00', 'utf8'),
    uint32LE(signedHeaderData.length),
    signedHeaderData,
    zip,
  ])
  const signature = crypto.sign('sha256', signaturePayload, privateKey)
  const proof = Buffer.concat([
    bytesField(1, publicKeyDer),
    bytesField(2, signature),
  ])
  const header = Buffer.concat([
    bytesField(2, proof),
    bytesField(10000, signedHeaderData),
  ])
  return {
    crx: Buffer.concat([
      Buffer.from('Cr24', 'ascii'),
      uint32LE(3),
      uint32LE(header.length),
      header,
      zip,
    ]),
    publicKeyDer,
    crxId,
  }
}

function verifyCrx(crx, publicKeyDer) {
  if (crx.subarray(0, 4).toString('ascii') !== 'Cr24') {
    throw new Error('CRX magic is invalid')
  }
  const version = crx.readUInt32LE(4)
  if (version !== 3) {
    throw new Error(`Unexpected CRX version: ${version}`)
  }
  const headerLength = crx.readUInt32LE(8)
  const header = crx.subarray(12, 12 + headerLength)
  const zip = crx.subarray(12 + headerLength)
  const headerFields = parseFields(header)
  const proof = headerFields.find(field => field.fieldNumber === 2)?.value
  const signedHeaderData = headerFields.find(field => field.fieldNumber === 10000)?.value
  if (!proof || !signedHeaderData) {
    throw new Error('CRX header is missing signed data')
  }
  const proofFields = parseFields(proof)
  const embeddedPublicKey = proofFields.find(field => field.fieldNumber === 1)?.value
  const signature = proofFields.find(field => field.fieldNumber === 2)?.value
  if (!embeddedPublicKey || !signature) {
    throw new Error('CRX proof is incomplete')
  }
  if (!embeddedPublicKey.equals(publicKeyDer)) {
    throw new Error('CRX public key does not match the signing key')
  }
  const payload = Buffer.concat([
    Buffer.from('CRX3 SignedData\x00', 'utf8'),
    uint32LE(signedHeaderData.length),
    signedHeaderData,
    zip,
  ])
  const publicKey = crypto.createPublicKey({ key: embeddedPublicKey, format: 'der', type: 'spki' })
  if (!crypto.verify('sha256', payload, publicKey, signature)) {
    throw new Error('CRX signature verification failed')
  }
}

async function main() {
  if (!await exists(keyPath)) {
    throw new Error(`Signing key not found: ${keyPath}\nRun node tools/setup-crx-key.mjs first.`)
  }
  const manifest = JSON.parse(await readFile(path.join(extensionDir, 'manifest.json'), 'utf8'))
  const privateKeyPem = await readFile(keyPath, 'utf8')
  const privateKey = crypto.createPrivateKey(privateKeyPem)
  const publicKeyDer = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'der' })
  const publicKeyBase64 = publicKeyDer.toString('base64')

  if (manifest.key !== publicKeyBase64) {
    throw new Error(
      'extension/manifest.json key does not match the signing key. Run node tools/setup-crx-key.mjs to update it.',
    )
  }

  const files = await collectFiles(extensionDir)
  const zip = createZip(files)
  const { crx } = createCrx(zip, privateKey)
  verifyCrx(crx, publicKeyDer)

  await mkdir(outDir, { recursive: true })
  const version = manifest.version
  const baseName = `smos-extension-${version}`
  const crxPath = path.join(outDir, `${baseName}.crx`)
  const zipPath = path.join(outDir, `${baseName}.zip`)
  await writeFile(crxPath, crx)
  await writeFile(zipPath, zip)

  console.log(`Packed SMOS v${version}`)
  console.log(`Extension ID: ${extensionId(publicKeyDer)}`)
  console.log(`CRX: ${path.relative(root, crxPath)} (${crx.length} bytes)`)
  console.log(`ZIP: ${path.relative(root, zipPath)} (${zip.length} bytes)`)
}

main().catch(error => {
  console.error(error.message || error)
  process.exitCode = 1
})
