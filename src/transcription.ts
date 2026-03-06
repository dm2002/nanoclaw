import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

import { logger } from './logger.js';

const execFileAsync = promisify(execFile);

const WHISPER_BIN =
  process.env.WHISPER_BIN || path.join(process.cwd(), 'data', 'whisper', 'whisper-cli');
const WHISPER_MODEL =
  process.env.WHISPER_MODEL ||
  path.join(process.cwd(), 'data', 'whisper', 'ggml-base.bin');

export async function transcribeBuffer(
  audioBuffer: Buffer,
  ext = 'ogg',
): Promise<string | null> {
  const tmpDir = os.tmpdir();
  const id = `nanoclaw-voice-${Date.now()}`;
  const tmpIn = path.join(tmpDir, `${id}.${ext}`);
  const tmpWav = path.join(tmpDir, `${id}.wav`);

  try {
    fs.writeFileSync(tmpIn, audioBuffer);

    await execFileAsync(
      'ffmpeg',
      ['-i', tmpIn, '-ar', '16000', '-ac', '1', '-f', 'wav', '-y', tmpWav],
      { timeout: 30_000 },
    );

    const { stdout } = await execFileAsync(
      WHISPER_BIN,
      ['-m', WHISPER_MODEL, '-f', tmpWav, '--no-timestamps', '-nt', '-l', 'auto'],
      { timeout: 120_000 },
    );

    const transcript = stdout.trim();
    logger.info({ chars: transcript.length }, 'Transcription complete');
    return transcript || null;
  } catch (err) {
    logger.error({ err }, 'Transcription failed');
    return null;
  } finally {
    for (const f of [tmpIn, tmpWav]) {
      try {
        fs.unlinkSync(f);
      } catch {
        /* best effort */
      }
    }
  }
}
