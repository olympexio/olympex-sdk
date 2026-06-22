import crypto from 'crypto';

export interface BuildSignedHeadersInput {
  readonly apiKey: string;
  readonly apiSecret: string;
  readonly passphrase: string;
  readonly body: string;
  readonly timestamp?: string;
  readonly nonce?: string;
}

export interface SignedHeaders {
  readonly 'x-api-key-id': string;
  readonly 'x-value-info': string;
  readonly 'x-passphrase': string;
  readonly 'x-signature': string;
}

interface SignInput {
  readonly message: string;
  readonly secret: string;
}

// TODO: esto está duplicado en accounts.ts "repositorio de backend" evaluar de movelor a un paquete shared npm
export function generateBodySignature(body: string): string {
  const hashBuffer = crypto.createHash('sha256').update(body).digest();
  return hashBuffer.toString('base64url');
}

// TODO: esto está duplicado en accounts.ts "repositorio de backend" evaluar de movelor a un paquete shared npm
function getTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

// TODO: esto está duplicado en accounts.ts "repositorio de backend" evaluar de movelor a un paquete shared npm
function generateNonce(): string {
  return crypto.randomBytes(12).toString('hex');
}

// TODO: esto está duplicado en accounts.ts "repositorio de backend" evaluar de movelor a un paquete shared npm
function sign({ message, secret }: SignInput): string {
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

export function buildSignedHeaders({
  apiKey,
  apiSecret,
  passphrase,
  body,
  timestamp,
  nonce,
}: BuildSignedHeadersInput): SignedHeaders {
  const bodyHash = generateBodySignature(body);
  const resolvedTimestamp = timestamp ?? getTimestamp();
  const resolvedNonce = nonce ?? generateNonce();
  const message = `${resolvedTimestamp}\n${resolvedNonce}\n${bodyHash}`;
  const headerData = Buffer.from(message).toString('base64');

  return {
    'x-api-key-id': apiKey,
    'x-value-info': headerData,
    'x-passphrase': passphrase,
    'x-signature': sign({ message, secret: apiSecret }),
  };
}
