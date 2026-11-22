'use strict';

const AvatarCrop = (() => {
  let editing = false;

  function loadPhoto(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('That photo couldn’t be opened. Try a JPEG or PNG.'));
      image.src = url;
    });
  }

  async function isHeic(file) {
    if (/\.(?:heic|heif)$/i.test(file.name) || /^image\/hei[cf]/i.test(file.type)) return true;
    const header = new TextDecoder().decode(await file.slice(0, 32).arrayBuffer());
    return header.slice(4, 8) === 'ftyp' && /hei[cmxs]|hevc|hevx|mif1|msf1/.test(header.slice(8));
  }

  async function edit(source, save) {
    if (editing) return;
    editing = true;
    const isFile = source instanceof Blob;
    const url = isFile ? URL.createObjectURL(source) : source;
    let image;
    try {
      try {
        image = await loadPhoto(url);
      } catch (error) {
        if (!isFile || !await isHeic(source)) throw error;
        try {
          const { decodeHeic } = await import('./avatar-heic.mjs');
          image = await decodeHeic(source);
        } catch {
          throw new Error('That HEIC photo couldn’t be opened. Try a JPEG or PNG copy.');
        }
      }
      await show(image, save);
    } finally {
      image?.close?.();
      if (isFile) URL.revokeObjectURL(url);
      editing = false;
    }
  }

  function show(image, save) {
    const dialog = document.getElementById('avatarCrop');
    const form = dialog.querySelector('form');
    const canvas = dialog.querySelector('canvas');
    const zoom = dialog.querySelector('input');
    const cancel = form.querySelector('[type=button]');
    const submit = form.querySelector('[type=submit]');
    const error = dialog.querySelector('[role=alert]');
    const context = canvas.getContext('2d', { alpha: false });
    const outputSize = canvas.width;
    const width = image.naturalWidth || image.width, height = image.naturalHeight || image.height;
    const shorterSide = Math.min(width, height);
    let centerX = width / 2, centerY = height / 2;
    let cropSize, drag, saving = false;

    function draw() {
      cropSize = shorterSide / zoom.valueAsNumber;
      const half = cropSize / 2;
      centerX = Math.max(half, Math.min(width - half, centerX));
      centerY = Math.max(half, Math.min(height - half, centerY));
      context.fillStyle = '#FFFDF7';
      context.fillRect(0, 0, outputSize, outputSize);
      context.drawImage(image, centerX - half, centerY - half, cropSize, cropSize, 0, 0, outputSize, outputSize);
    }

    const handlers = new AbortController();
    const listen = (element, type, fn) => element.addEventListener(type, fn, { signal: handlers.signal });
    listen(zoom, 'input', draw);
    listen(canvas, 'pointerdown', event => {
      if (saving || drag || (event.pointerType === 'mouse' && event.button !== 0)) return;
      canvas.setPointerCapture(event.pointerId);
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    });
    listen(canvas, 'pointermove', event => {
      if (event.pointerId !== drag?.id) return;
      const scale = cropSize / canvas.getBoundingClientRect().width;
      centerX -= (event.clientX - drag.x) * scale;
      centerY -= (event.clientY - drag.y) * scale;
      drag.x = event.clientX;
      drag.y = event.clientY;
      draw();
    });
    listen(canvas, 'lostpointercapture', () => { drag = null; });
    listen(canvas, 'keydown', event => {
      const delta = {
        ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
      }[event.key];
      if (saving || !delta) return;
      event.preventDefault();
      centerX += delta[0] * cropSize / 30;
      centerY += delta[1] * cropSize / 30;
      draw();
    });
    listen(cancel, 'click', () => dialog.close());
    listen(dialog, 'cancel', event => { if (saving) event.preventDefault(); });
    listen(form, 'submit', async event => {
      event.preventDefault();
      if (saving) return;
      saving = cancel.disabled = submit.disabled = zoom.disabled = true;
      drag = null;
      submit.textContent = 'Saving…';
      error.hidden = true;
      try {
        await save(canvas.toDataURL('image/jpeg', 0.85));
        dialog.close();
      } catch (err) {
        error.textContent = err.message || 'That photo couldn’t be saved. Try again.';
        error.hidden = false;
      } finally {
        saving = cancel.disabled = submit.disabled = zoom.disabled = false;
        submit.textContent = 'Save photo';
      }
    });

    zoom.value = '1';
    error.hidden = true;
    draw();
    dialog.showModal();
    return new Promise(resolve => {
      dialog.addEventListener('close', () => {
        handlers.abort();
        canvas.width = outputSize;
        resolve();
      }, { once: true });
    });
  }

  return { edit };
})();
