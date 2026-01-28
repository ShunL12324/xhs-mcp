/**
 * @fileoverview Utility functions for browser automation.
 * Includes anti-detection helpers, human-like scrolling, and stealth script loading.
 * @module xhs/utils
 */

import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import type { Page } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load the stealth script for anti-detection.
 * The script modifies browser fingerprints to avoid detection.
 * @returns Stealth script content or empty string if not found
 */
export async function getStealthScript(): Promise<string> {
  const stealthPath = path.join(__dirname, 'stealth.js');
  if (await fs.pathExists(stealthPath)) {
    return await fs.readFile(stealthPath, 'utf-8');
  }
  return '';
}

/**
 * Sleep for a specified duration.
 * @param ms - Duration in milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a webId cookie value to bypass slider verification.
 * Format: 32 hex characters (e.g., "1234567890abcdef1234567890abcdef")
 * @returns Random webId string
 */
export function generateWebId(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate a random number within a range.
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (exclusive)
 */
function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Easing function - easeInOutQuad.
 * Starts slow, speeds up in the middle, slows down at the end.
 * Simulates realistic scrolling behavior.
 * @param t - Progress value from 0 to 1
 * @returns Eased progress value
 */
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Options for human-like scrolling behavior.
 */
export interface HumanScrollOptions {
  /** Minimum scroll distance in pixels (default: 300) */
  minDistance?: number;
  /** Maximum scroll distance in pixels (default: 700) */
  maxDistance?: number;
  /** Minimum delay between scrolls in ms (default: 800) */
  minDelay?: number;
  /** Maximum delay between scrolls in ms (default: 2500) */
  maxDelay?: number;
  /** Probability of scrolling back up (default: 0.1) */
  scrollBackChance?: number;
  /** Probability of mouse movement (default: 0.4) */
  mouseMoveChance?: number;
}

/**
 * Simulate human-like scrolling behavior.
 *
 * Features:
 * - Uses mouse.wheel() for realistic scrolling
 * - Splits scroll into multiple steps with easing
 * - Random distances and delays
 * - Occasional mouse movement and scroll-back
 *
 * @param page - Playwright page instance
 * @param options - Scrolling behavior options
 */
export async function humanScroll(
  page: Page,
  options: HumanScrollOptions = {}
): Promise<void> {
  const {
    minDistance = 300,
    maxDistance = 700,
    minDelay = 800,
    maxDelay = 2500,
    scrollBackChance = 0.1,
    mouseMoveChance = 0.4
  } = options;

  // Random total scroll distance
  const totalDistance = randomBetween(minDistance, maxDistance);

  // Split into 5-12 small steps (simulates smooth scrolling)
  const steps = Math.floor(randomBetween(5, 12));

  let scrolled = 0;

  for (let i = 0; i < steps; i++) {
    // Use easing function to calculate speed factor at current progress
    const progress = (i + 1) / steps;
    const prevProgress = i / steps;
    const easedProgress = easeInOutQuad(progress);
    const prevEasedProgress = easeInOutQuad(prevProgress);

    // Calculate distance for this step
    const stepRatio = easedProgress - prevEasedProgress;
    const stepDistance = totalDistance * stepRatio * (0.8 + Math.random() * 0.4);

    // Execute scroll
    await page.mouse.wheel(0, stepDistance);
    scrolled += stepDistance;

    // Add small horizontal jitter (more realistic)
    if (Math.random() < 0.3) {
      const jitter = (Math.random() - 0.5) * 10;
      await page.mouse.wheel(jitter, 0);
    }

    // Short pause between steps (20-80ms)
    await sleep(randomBetween(20, 80));
  }

  // Random mouse movement (simulates eyes following content)
  if (Math.random() < mouseMoveChance) {
    const x = randomBetween(300, 1200);
    const y = randomBetween(200, 600);
    // Move mouse in multiple steps for natural motion
    await page.mouse.move(x, y, { steps: Math.floor(randomBetween(5, 15)) });
  }

  // Main delay (simulates reading content)
  const readingDelay = randomBetween(minDelay, maxDelay);
  await sleep(readingDelay);

  // Occasionally scroll back up (humans review content)
  if (Math.random() < scrollBackChance) {
    const backDistance = randomBetween(30, 120);
    const backSteps = Math.floor(randomBetween(2, 5));

    for (let i = 0; i < backSteps; i++) {
      await page.mouse.wheel(0, -backDistance / backSteps);
      await sleep(randomBetween(20, 50));
    }

    // Short pause after scrolling back
    await sleep(randomBetween(200, 500));
  }
}

/**
 * Scroll to the bottom of a page using human-like behavior.
 * Calls humanScroll repeatedly until reaching the bottom.
 *
 * @param page - Playwright page instance
 * @param options - Scrolling options plus maxScrolls limit
 * @returns True if bottom was reached, false if max scrolls exceeded
 */
export async function humanScrollToBottom(
  page: Page,
  options: HumanScrollOptions & { maxScrolls?: number } = {}
): Promise<boolean> {
  const { maxScrolls = 50, ...scrollOptions } = options;

  let previousHeight = 0;
  let sameHeightCount = 0;

  for (let i = 0; i < maxScrolls; i++) {
    // Get current scroll position and page height
    const { scrollTop, scrollHeight, clientHeight } = await page.evaluate(() => ({
      scrollTop: window.scrollY,
      scrollHeight: document.body.scrollHeight,
      clientHeight: window.innerHeight
    }));

    // Check if we've reached the bottom
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      // May have reached bottom, but could be loading more
      if (scrollHeight === previousHeight) {
        sameHeightCount++;
        if (sameHeightCount >= 3) {
          // Height unchanged 3 times in a row - confirmed at bottom
          return true;
        }
      } else {
        sameHeightCount = 0;
      }
    }

    previousHeight = scrollHeight;

    // Perform human-like scroll
    await humanScroll(page, scrollOptions);
  }

  return false;
}
