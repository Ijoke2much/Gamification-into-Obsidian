#!/usr/bin/env node
/**
 * Writes bundled 32×32 pixel-art PNG templates (weapons, gear, foes).
 * Run: node scripts/generate-pixel-sprites.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SIZE = 32;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const C = {
	x: [0, 0, 0, 0],
	ink: [18, 14, 28, 255],
	shadow: [28, 24, 42, 255],
	mid: [72, 58, 88, 255],
	steel: [138, 154, 176, 255],
	steelLt: [198, 210, 222, 255],
	gold: [212, 160, 24, 255],
	goldLt: [240, 214, 96, 255],
	brown: [92, 58, 32, 255],
	wood: [140, 92, 48, 255],
	cream: [232, 220, 196, 255],
	red: [194, 56, 72, 255],
	redLt: [232, 96, 108, 255],
	purple: [108, 64, 196, 255],
	purpleLt: [176, 136, 255, 255],
	cyan: [48, 196, 255, 255],
	green: [64, 140, 96, 255],
	skin: [196, 164, 132, 255],
	smoke: [58, 48, 78, 255],
	white: [244, 246, 250, 255],
};

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
	let c = n;
	for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	CRC_TABLE[n] = c >>> 0;
}

function crc32(buf) {
	let c = 0xffffffff;
	for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}

function u32(n) {
	return Buffer.from([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
}

function chunk(type, data) {
	const t = Buffer.from(type, 'ascii');
	const crc = crc32(Buffer.concat([t, data]));
	return Buffer.concat([u32(data.length), t, data, u32(crc)]);
}

function encodePng(pixels) {
	const raw = Buffer.alloc(SIZE * (1 + SIZE * 4));
	for (let y = 0; y < SIZE; y++) {
		const row = y * (1 + SIZE * 4);
		raw[row] = 0;
		for (let x = 0; x < SIZE; x++) {
			const p = pixels[y * SIZE + x];
			const o = row + 1 + x * 4;
			raw[o] = p[0];
			raw[o + 1] = p[1];
			raw[o + 2] = p[2];
			raw[o + 3] = p[3];
		}
	}
	const ihdr = Buffer.concat([
		u32(SIZE),
		u32(SIZE),
		Buffer.from([8, 6, 0, 0, 0]),
	]);
	return Buffer.concat([
		Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
		chunk('IHDR', ihdr),
		chunk('IDAT', deflateSync(raw, { level: 9 })),
		chunk('IEND', Buffer.alloc(0)),
	]);
}

function canvas() {
	return Array.from({ length: SIZE * SIZE }, () => C.x);
}

function plot(px, x, y, c) {
	if (x < 0 || y < 0 || x >= SIZE || y >= SIZE || !c || c[3] === 0) return;
	px[y * SIZE + x] = c;
}

function rect(px, x, y, w, h, c) {
	for (let yy = y; yy < y + h; yy++) {
		for (let xx = x; xx < x + w; xx++) plot(px, xx, yy, c);
	}
}

function outlineRect(px, x, y, w, h, c) {
	rect(px, x, y, w, 1, c);
	rect(px, x, y + h - 1, w, 1, c);
	rect(px, x, y, 1, h, c);
	rect(px, x + w - 1, y, 1, h, c);
}

function line(px, x0, y0, x1, y1, c, thick = 1) {
	let dx = Math.abs(x1 - x0);
	let sx = x0 < x1 ? 1 : -1;
	let dy = -Math.abs(y1 - y0);
	let sy = y0 < y1 ? 1 : -1;
	let err = dx + dy;
	for (;;) {
		for (let i = 0; i < thick; i++) {
			plot(px, x0, y0 + i, c);
			plot(px, x0 + i, y0, c);
		}
		if (x0 === x1 && y0 === y1) break;
		const e2 = 2 * err;
		if (e2 >= dy) {
			err += dy;
			x0 += sx;
		}
		if (e2 <= dx) {
			err += dx;
			y0 += sy;
		}
	}
}

function save(rel, px) {
	const path = join(root, rel);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, encodePng(px));
}

function sword() {
	const px = canvas();
	line(px, 8, 24, 24, 6, C.ink, 4);
	line(px, 9, 23, 23, 7, C.steel, 2);
	line(px, 11, 21, 22, 8, C.steelLt, 1);
	plot(px, 24, 6, C.white);
	rect(px, 7, 21, 9, 3, C.gold);
	rect(px, 8, 22, 7, 1, C.goldLt);
	rect(px, 6, 23, 3, 6, C.brown);
	rect(px, 7, 24, 1, 4, C.wood);
	rect(px, 5, 28, 5, 3, C.gold);
	return px;
}

function dagger() {
	const px = canvas();
	line(px, 12, 22, 22, 9, C.ink, 3);
	line(px, 13, 21, 21, 10, C.steelLt, 1);
	rect(px, 10, 20, 7, 3, C.gold);
	rect(px, 11, 22, 2, 6, C.brown);
	rect(px, 10, 27, 4, 2, C.gold);
	return px;
}

function staff() {
	const px = canvas();
	rect(px, 15, 10, 3, 20, C.ink);
	rect(px, 15, 11, 2, 18, C.brown);
	rect(px, 16, 12, 1, 16, C.wood);
	rect(px, 13, 5, 7, 7, C.ink);
	rect(px, 14, 6, 5, 5, C.purple);
	rect(px, 15, 7, 3, 3, C.purpleLt);
	plot(px, 16, 8, C.white);
	rect(px, 14, 28, 5, 2, C.gold);
	return px;
}

function bow() {
	const px = canvas();
	line(px, 8, 6, 10, 16, C.ink, 2);
	line(px, 10, 16, 8, 26, C.ink, 2);
	line(px, 8, 6, 8, 26, C.cream, 1);
	line(px, 9, 7, 10, 16, C.wood, 2);
	line(px, 10, 16, 9, 25, C.wood, 2);
	rect(px, 9, 15, 4, 3, C.gold);
	line(px, 11, 16, 24, 16, C.steelLt, 1);
	plot(px, 24, 16, C.goldLt);
	return px;
}

function hammer() {
	const px = canvas();
	rect(px, 14, 12, 4, 16, C.ink);
	rect(px, 15, 12, 2, 15, C.brown);
	rect(px, 8, 6, 16, 8, C.ink);
	rect(px, 9, 7, 14, 6, C.steel);
	rect(px, 10, 8, 5, 4, C.steelLt);
	rect(px, 20, 8, 2, 4, C.shadow);
	return px;
}

function shield() {
	const px = canvas();
	rect(px, 8, 6, 16, 18, C.ink);
	rect(px, 9, 7, 14, 16, C.steel);
	rect(px, 11, 9, 10, 12, C.gold);
	rect(px, 13, 11, 6, 8, C.goldLt);
	rect(px, 10, 22, 12, 4, C.ink);
	rect(px, 12, 23, 8, 3, C.steel);
	plot(px, 16, 14, C.red);
	plot(px, 15, 15, C.red);
	plot(px, 17, 15, C.red);
	plot(px, 16, 16, C.redLt);
	return px;
}

function hood() {
	const px = canvas();
	rect(px, 8, 6, 16, 14, C.ink);
	rect(px, 9, 7, 14, 12, C.mid);
	rect(px, 10, 8, 12, 8, C.purple);
	rect(px, 12, 14, 8, 5, C.shadow);
	rect(px, 13, 16, 2, 2, C.cyan);
	rect(px, 17, 16, 2, 2, C.cyan);
	rect(px, 14, 19, 4, 2, C.skin);
	return px;
}

function vest() {
	const px = canvas();
	rect(px, 8, 6, 16, 22, C.ink);
	rect(px, 9, 7, 14, 20, C.mid);
	rect(px, 10, 8, 12, 16, C.steel);
	rect(px, 12, 10, 8, 12, C.gold);
	rect(px, 14, 12, 4, 8, C.goldLt);
	rect(px, 8, 8, 3, 8, C.shadow);
	rect(px, 21, 8, 3, 8, C.shadow);
	return px;
}

function gloves() {
	const px = canvas();
	rect(px, 5, 10, 10, 12, C.ink);
	rect(px, 6, 11, 8, 10, C.brown);
	rect(px, 7, 12, 6, 3, C.wood);
	rect(px, 17, 10, 10, 12, C.ink);
	rect(px, 18, 11, 8, 10, C.brown);
	rect(px, 19, 12, 6, 3, C.wood);
	rect(px, 7, 20, 2, 3, C.ink);
	rect(px, 10, 20, 2, 3, C.ink);
	rect(px, 20, 20, 2, 3, C.ink);
	rect(px, 23, 20, 2, 3, C.ink);
	return px;
}

function boots() {
	const px = canvas();
	rect(px, 8, 10, 10, 14, C.ink);
	rect(px, 9, 11, 8, 12, C.brown);
	rect(px, 10, 12, 6, 4, C.wood);
	rect(px, 7, 20, 14, 6, C.ink);
	rect(px, 8, 21, 12, 4, C.shadow);
	rect(px, 8, 22, 11, 2, C.gold);
	return px;
}

function tag() {
	const px = canvas();
	rect(px, 8, 8, 16, 16, C.ink);
	rect(px, 9, 9, 14, 14, C.gold);
	rect(px, 11, 11, 10, 10, C.shadow);
	rect(px, 12, 12, 8, 8, C.goldLt);
	rect(px, 14, 6, 4, 4, C.steel);
	rect(px, 15, 5, 2, 2, C.steelLt);
	return px;
}

function notebook() {
	const px = canvas();
	rect(px, 8, 6, 16, 20, C.ink);
	rect(px, 9, 7, 14, 18, C.brown);
	rect(px, 11, 8, 11, 16, C.cream);
	rect(px, 12, 10, 9, 1, C.mid);
	rect(px, 12, 13, 9, 1, C.mid);
	rect(px, 12, 16, 7, 1, C.mid);
	rect(px, 8, 7, 3, 18, C.gold);
	return px;
}

function timer() {
	const px = canvas();
	rect(px, 10, 6, 12, 20, C.ink);
	rect(px, 11, 7, 10, 18, C.red);
	rect(px, 13, 9, 6, 6, C.redLt);
	rect(px, 14, 16, 4, 6, C.shadow);
	rect(px, 12, 4, 8, 3, C.ink);
	rect(px, 13, 5, 6, 2, C.gold);
	plot(px, 16, 12, C.white);
	return px;
}

function slotSilhouette(kind) {
	const px = canvas();
	const ink = C.mid;
	if (kind === 'head') {
		rect(px, 11, 8, 10, 10, ink);
		rect(px, 13, 18, 6, 4, ink);
	} else if (kind === 'body') {
		rect(px, 10, 8, 12, 16, ink);
		rect(px, 8, 10, 3, 6, ink);
		rect(px, 21, 10, 3, 6, ink);
	} else if (kind === 'hands') {
		rect(px, 8, 12, 7, 8, ink);
		rect(px, 17, 12, 7, 8, ink);
	} else if (kind === 'feet') {
		rect(px, 10, 12, 8, 8, ink);
		rect(px, 8, 18, 12, 5, ink);
	} else if (kind === 'weapon') {
		line(px, 10, 22, 22, 8, ink, 2);
		rect(px, 9, 20, 6, 2, ink);
	} else if (kind === 'accessory') {
		outlineRect(px, 10, 10, 12, 12, ink);
		rect(px, 14, 8, 4, 3, ink);
	} else {
		rect(px, 10, 8, 12, 16, ink);
		rect(px, 12, 11, 8, 1, ink);
		rect(px, 12, 14, 8, 1, ink);
	}
	return px;
}

function shade() {
	const px = canvas();
	rect(px, 10, 6, 12, 16, C.ink);
	rect(px, 11, 7, 10, 14, C.smoke);
	rect(px, 12, 8, 8, 8, C.mid);
	rect(px, 13, 11, 2, 2, C.cyan);
	rect(px, 17, 11, 2, 2, C.cyan);
	rect(px, 9, 20, 14, 6, C.shadow);
	rect(px, 12, 20, 8, 4, C.smoke);
	return px;
}

function slothGhost() {
	const px = canvas();
	rect(px, 8, 6, 16, 18, C.ink);
	rect(px, 9, 7, 14, 16, C.cream);
	rect(px, 11, 10, 3, 2, C.ink);
	rect(px, 18, 10, 3, 2, C.ink);
	rect(px, 13, 16, 6, 2, C.mid);
	rect(px, 10, 22, 4, 4, C.cream);
	rect(px, 18, 22, 4, 4, C.cream);
	return px;
}

function hydra() {
	const px = canvas();
	rect(px, 14, 16, 4, 10, C.ink);
	rect(px, 15, 16, 2, 9, C.green);
	for (const [x, y] of [
		[8, 6],
		[14, 4],
		[20, 6],
	]) {
		rect(px, x, y, 6, 10, C.ink);
		rect(px, x + 1, y + 1, 4, 8, C.green);
		plot(px, x + 2, y + 3, C.redLt);
		plot(px, x + 3, y + 3, C.goldLt);
	}
	return px;
}

function wraith() {
	const px = canvas();
	rect(px, 12, 4, 8, 4, C.ink);
	rect(px, 13, 5, 6, 2, C.gold);
	rect(px, 10, 8, 12, 16, C.ink);
	rect(px, 11, 9, 10, 14, C.purple);
	rect(px, 14, 12, 4, 8, C.goldLt);
	rect(px, 15, 20, 2, 6, C.smoke);
	rect(px, 12, 24, 8, 3, C.ink);
	rect(px, 13, 25, 6, 1, C.gold);
	return px;
}

function procrastinator() {
	const px = canvas();
	rect(px, 6, 8, 20, 16, C.ink);
	rect(px, 7, 9, 18, 14, C.smoke);
	rect(px, 8, 10, 16, 10, C.purple);
	rect(px, 10, 14, 3, 2, C.purpleLt);
	rect(px, 19, 14, 3, 2, C.purpleLt);
	rect(px, 11, 18, 10, 2, C.redLt);
	rect(px, 12, 19, 8, 1, C.ink);
	rect(px, 4, 6, 4, 8, C.purple);
	rect(px, 24, 6, 4, 8, C.purple);
	return px;
}

const files = {
	'assets/sprites/weapons/sword.png': sword(),
	'assets/sprites/weapons/dagger.png': dagger(),
	'assets/sprites/weapons/staff.png': staff(),
	'assets/sprites/weapons/bow.png': bow(),
	'assets/sprites/weapons/hammer.png': hammer(),
	'assets/sprites/weapons/shield.png': shield(),
	'assets/sprites/gear/hood.png': hood(),
	'assets/sprites/gear/vest.png': vest(),
	'assets/sprites/gear/gloves.png': gloves(),
	'assets/sprites/gear/boots.png': boots(),
	'assets/sprites/gear/tag.png': tag(),
	'assets/sprites/gear/notebook.png': notebook(),
	'assets/sprites/gear/timer.png': timer(),
	'assets/sprites/gear/slot-head.png': slotSilhouette('head'),
	'assets/sprites/gear/slot-body.png': slotSilhouette('body'),
	'assets/sprites/gear/slot-hands.png': slotSilhouette('hands'),
	'assets/sprites/gear/slot-feet.png': slotSilhouette('feet'),
	'assets/sprites/gear/slot-weapon.png': slotSilhouette('weapon'),
	'assets/sprites/gear/slot-accessory.png': slotSilhouette('accessory'),
	'assets/sprites/gear/slot-tool.png': slotSilhouette('tool'),
	'assets/sprites/foes/wandering-shade.png': shade(),
	'assets/sprites/foes/sloth-ghost.png': slothGhost(),
	'assets/sprites/foes/inbox-hydra.png': hydra(),
	'assets/sprites/foes/deadline-wraith.png': wraith(),
	'assets/sprites/foes/procrastinator.png': procrastinator(),
};

for (const [rel, px] of Object.entries(files)) save(rel, px);
console.log(`✅ Wrote ${Object.keys(files).length} pixel sprites under assets/sprites/`);
