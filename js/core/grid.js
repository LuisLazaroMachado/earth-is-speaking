// Load a lossless 8-bit PNG data grid into a Uint8Array (red channel), without the
// browser applying color management or premultiplied alpha.

export async function loadGrid(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
  const blob = await res.blob();
  const bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  const { width, height } = bmp;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0);
  const rgba = ctx.getImageData(0, 0, width, height).data;
  const data = new Uint8Array(width * height);
  for (let i = 0, j = 0; j < data.length; i += 4, j++) data[j] = rgba[i];
  return { width, height, data, channels: rgba };
}

/** Grid column/row for a lat/lon on a whole-world equirectangular grid. */
export function cellOf(grid, lat, lon) {
  let x = Math.floor(((lon + 180) / 360) * grid.width);
  let y = Math.floor(((90 - lat) / 180) * grid.height);
  x = ((x % grid.width) + grid.width) % grid.width;
  y = Math.max(0, Math.min(grid.height - 1, y));
  return { x, y, i: y * grid.width + x };
}

/** Center lat/lon of a grid cell. */
export function latLonOfCell(grid, x, y) {
  return { lat: 90 - ((y + 0.5) / grid.height) * 180, lon: ((x + 0.5) / grid.width) * 360 - 180 };
}
