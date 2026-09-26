import { createHmac } from 'node:crypto';

/** Server only. Sign exact bytes for one authenticated owner; never log proofs. */
export function signAlphaCommand(owner: string, commandText: string, keyHex: string): string {
  if (!/^[a-f0-9]{64}$/.test(keyHex)) throw Error('alpha-server-key-invalid');
  return createHmac('sha256', Buffer.from(keyHex, 'hex')).update(`${owner}\n${commandText}`, 'utf8').digest('hex');
}
