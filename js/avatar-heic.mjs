import initializeLibheif from './vendor/libheif-1.23.2.mjs';

export async function decodeHeic(file) {
  const libheif = await initializeLibheif();
  const decoder = new libheif.HeifDecoder();
  const frames = decoder.decode(new Uint8Array(await file.arrayBuffer()));
  try {
    const frame = frames.find(image => image.is_primary()) || frames[0];
    if (!frame) throw new Error('The file has no photo.');
    const width = frame.get_width(), height = frame.get_height();
    const pixels = new ImageData(width, height);
    await new Promise((resolve, reject) => frame.display(pixels, result => {
      if (result) resolve();
      else reject(new Error('The photo couldn’t be decoded.'));
    }));
    if (typeof createImageBitmap === 'function') {
      const scale = Math.min(1, 2400 / Math.max(width, height));
      try {
        return await createImageBitmap(pixels, {
          resizeWidth: Math.max(1, Math.round(width * scale)),
          resizeHeight: Math.max(1, Math.round(height * scale)),
          resizeQuality: 'high',
        });
      } catch {
        // Some browsers expose createImageBitmap without ImageData resizing.
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').putImageData(pixels, 0, 0);
    return canvas;
  } finally {
    for (const frame of frames) frame.free();
  }
}
