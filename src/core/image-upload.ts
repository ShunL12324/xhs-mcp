import https from 'https';

/**
 * Upload image to temporary image hosting service
 * Returns a URL that can be accessed from anywhere
 */

/**
 * Upload to litterbox.catbox.moe (temporary file hosting)
 * Supports expiration: 1h, 12h, 24h, 72h
 */
export async function uploadToLitterbox(
  imageBuffer: Buffer,
  filename: string = 'qrcode.png',
  expiry: '1h' | '12h' | '24h' | '72h' = '1h'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);

    const bodyParts: Buffer[] = [];

    // Add time field
    bodyParts.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="time"\r\n\r\n` +
      `${expiry}\r\n`
    ));

    // Add reqtype field
    bodyParts.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="reqtype"\r\n\r\n` +
      `fileupload\r\n`
    ));

    // Add file field
    bodyParts.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="fileToUpload"; filename="${filename}"\r\n` +
      `Content-Type: image/png\r\n\r\n`
    ));
    bodyParts.push(imageBuffer);
    bodyParts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

    const body = Buffer.concat(bodyParts);

    const options = {
      hostname: 'litterbox.catbox.moe',
      port: 443,
      path: '/resources/internals/api.php',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200 && data.startsWith('https://')) {
          resolve(data.trim());
        } else {
          reject(new Error(`Upload failed: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Upload timeout'));
    });

    req.write(body);
    req.end();
  });
}

/**
 * Upload to 0x0.st (simple file hosting, no expiry control but files persist for a while)
 */
export async function uploadTo0x0(
  imageBuffer: Buffer,
  filename: string = 'qrcode.png'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);

    const bodyParts: Buffer[] = [];

    // Add file field
    bodyParts.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: image/png\r\n\r\n`
    ));
    bodyParts.push(imageBuffer);
    bodyParts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

    const body = Buffer.concat(bodyParts);

    const options = {
      hostname: '0x0.st',
      port: 443,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200 && data.startsWith('https://')) {
          resolve(data.trim());
        } else {
          reject(new Error(`Upload failed: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Upload timeout'));
    });

    req.write(body);
    req.end();
  });
}

/**
 * Try multiple upload services, return the first successful URL
 */
export async function uploadQrCode(imageBuffer: Buffer): Promise<string> {
  const errors: string[] = [];

  // Try litterbox first (1 hour expiry is perfect for QR codes)
  try {
    return await uploadToLitterbox(imageBuffer, 'xhs-qrcode.png', '1h');
  } catch (e) {
    errors.push(`litterbox: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Fallback to 0x0.st
  try {
    return await uploadTo0x0(imageBuffer, 'xhs-qrcode.png');
  } catch (e) {
    errors.push(`0x0.st: ${e instanceof Error ? e.message : String(e)}`);
  }

  throw new Error(`All upload services failed: ${errors.join('; ')}`);
}
