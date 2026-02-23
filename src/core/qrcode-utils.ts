/**
 * @fileoverview QR code utilities for login workflow.
 * Handles decoding, generating, and displaying QR codes for authentication.
 * @module core/qrcode-utils
 */

import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { exec } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { paths } from './config.js';

/**
 * Decode a QR code from a PNG image buffer.
 *
 * @param imageBuffer - PNG image data containing the QR code
 * @returns Decoded data from the QR code
 * @throws Error if PNG parsing or QR decoding fails
 */
export async function decodeQrCode(imageBuffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const png = new PNG();

    png.parse(imageBuffer, (err, data) => {
      if (err) {
        reject(new Error(`Failed to parse PNG: ${err.message}`));
        return;
      }

      const code = jsQR(new Uint8ClampedArray(data.data), data.width, data.height);

      if (!code) {
        reject(new Error('Failed to decode QR code from image'));
        return;
      }

      resolve(code.data);
    });
  });
}

/**
 * Generate an ASCII art QR code for terminal display.
 *
 * @param data - Data to encode in the QR code
 * @returns ASCII representation of the QR code
 */
export async function generateAsciiQrCode(data: string): Promise<string> {
  return QRCode.toString(data, {
    type: 'terminal',
    small: true,
  });
}

/**
 * Generate a QR code as a data URL for web display.
 *
 * @param data - Data to encode in the QR code
 * @returns Base64 data URL of the QR code image
 */
export async function generateQrCodeDataUrl(data: string): Promise<string> {
  return QRCode.toDataURL(data);
}

/**
 * Save a QR code image to file and open it with the system default viewer.
 * On Linux without a GUI (no DISPLAY env), saves to home directory and skips opening.
 *
 * @param imageBuffer - PNG image data of the QR code
 * @param filename - Filename to save as (default: 'login-qrcode.png')
 * @returns Absolute path to the saved file
 */
export async function saveAndOpenQrCode(imageBuffer: Buffer, filename: string = 'login-qrcode.png'): Promise<string> {
  const platform = process.platform;

  // On Linux, save to home directory since there may be no GUI
  let filePath: string;
  if (platform === 'linux') {
    const homeDir = process.env.HOME || '/tmp';
    filePath = join(homeDir, filename);
  } else {
    filePath = join(paths.qrcode, filename);
  }

  // Save the image
  writeFileSync(filePath, imageBuffer);
  console.error(`[qrcode] Saved QR code to: ${filePath}`);

  // Open with system default viewer (skip on Linux to avoid errors on headless systems)
  let command: string | null = null;

  if (platform === 'win32') {
    command = `start "" "${filePath}"`;
  } else if (platform === 'darwin') {
    command = `open "${filePath}"`;
  } else {
    // Linux: only try to open if DISPLAY is set (indicates GUI available)
    if (process.env.DISPLAY) {
      command = `xdg-open "${filePath}"`;
    } else {
      console.error(`[qrcode] No DISPLAY set, skipping auto-open. Please open manually: ${filePath}`);
    }
  }

  if (command) {
    exec(command, (error) => {
      if (error) {
        console.error(`[qrcode] Failed to open QR code: ${error.message}`);
      }
    });
  }

  return filePath;
}
