import { scrypt, randomBytes, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)
const KEY_LENGTH = 64

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = await scryptAsync(password, salt, KEY_LENGTH)
  return `${salt}:${derivedKey.toString('hex')}`
}

export async function verifyPassword(password, stored) {
  const [salt, hashHex] = stored.split(':')
  const storedBuf = Buffer.from(hashHex, 'hex')
  const derivedKey = await scryptAsync(password, salt, KEY_LENGTH)
  return derivedKey.length === storedBuf.length && timingSafeEqual(derivedKey, storedBuf)
}
