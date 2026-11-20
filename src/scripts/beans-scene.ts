/**
 * Roasted coffee beans falling behind the wordmark and bouncing off the slash, in raw WebGL2
 * (no library, ~5 KB gzipped). Runs in a worker (beans-worker.ts) or on the page, as beans.ts
 * decides; it only talks to its host through SceneHost and the ToScene / FromScene messages.
 *
 * - Every bean is the same procedural mesh: an ellipsoid with one face flattened and an
 *   S-shaped crease pressed into it. One instanced draw call renders them all.
 * - Soft contact shadows are a second instanced draw of gaussian ellipses on the page plane,
 *   stretched along each bean's long axis.
 * - The beans fall in slow motion on the dark side and bounce off the slash (a wall that slides
 *   with the cut as the hero scrolls) or, on phones, off the photo's slanted top edge, spinning
 *   harder on every hit. The pointer pushes them around; a tap knocks them away.
 * - Shading is a layered product-render material: roast diffuse with terminator translucency,
 *   an oily clear-coat reflecting a studio softbox environment, micro-surface bump, silverskin
 *   in the crease, depth haze and an ACES filmic curve.
 *
 * Frames stop whenever the hero is off-screen or the tab is hidden, and resolution drops if
 * they get slow. Reduced motion gets one still frame.
 */

type V3 = [number, number, number];

const VERT_BEAN = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNor;
layout(location=2) in float aCrease;
layout(location=3) in vec4 iPS;
layout(location=4) in vec3 iR0;
layout(location=5) in vec3 iR1;
layout(location=6) in vec3 iR2;
layout(location=7) in float iTone;
uniform mat4 uVP;
out vec3 vN; out vec3 vW; out vec3 vObj; out float vCrease; out float vTone;
void main() {
	mat3 R = mat3(iR0, iR1, iR2);
	vec3 w = R * (aPos * iPS.w) + iPS.xyz;
	vN = R * aNor; vW = w; vObj = aPos; vCrease = aCrease; vTone = iTone;
	gl_Position = uVP * vec4(w, 1.0);
}`;

const FRAG_BEAN = `#version 300 es
precision highp float;
in vec3 vN; in vec3 vW; in vec3 vObj; in float vCrease; in float vTone;
uniform vec3 uEye;
out vec4 outColor;
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) {
	vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
	           mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
const vec3 KEY = vec3(-0.5443, 0.6142, 0.5722);
const vec3 BACK = vec3(0.8513, 0.1502, -0.5008);
const vec3 INK = vec3(0.0070, 0.0056, 0.0045);

// A dark product-photography studio, as seen in reflections: one big warm softbox
// upper-left, a cool overhead strip, and a warm timber kicker from behind on the right.
vec3 studio(vec3 r) {
	vec3 c = vec3(0.010, 0.008, 0.007) + vec3(0.030, 0.025, 0.020) * max(r.y, 0.0);
	c += vec3(1.0, 0.92, 0.82) * 3.2 * smoothstep(0.86, 0.95, dot(r, KEY));
	c += vec3(0.88, 0.92, 1.0) * 1.1 * smoothstep(0.09, 0.02, abs(r.x + 0.1)) * smoothstep(0.35, 0.75, r.y);
	c += vec3(1.0, 0.55, 0.22) * 2.0 * smoothstep(0.72, 0.93, dot(r, BACK));
	return c;
}

// Bump mapping from a height field via screen-space derivatives (Mikkelsen), no tangents needed.
vec3 bump(vec3 n, vec3 p, float h) {
	vec3 dpdx = dFdx(p), dpdy = dFdy(p);
	vec3 r1 = cross(dpdy, n), r2 = cross(n, dpdx);
	float det = dot(dpdx, r1);
	vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
	return normalize(abs(det) * n - grad);
}

vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }

void main() {
	vec3 v = normalize(uEye - vW);
	float g = noise(vObj * 6.0) * 0.6 + noise(vObj * 21.0) * 0.4;

	// Micro surface: fine pitting plus faint wrinkles running along the bean.
	float height = noise(vObj * 38.0) * 0.6 + noise(vObj * vec3(14.0, 3.0, 14.0)) * 0.4;
	vec3 n = bump(normalize(vN), vW, height * 0.0022);

	// Albedo: a medium roast, mottled; darker down the groove, with the pale silverskin
	// that real beans keep caught in the crease.
	vec3 roast = mix(vec3(0.028, 0.011, 0.005), vec3(0.110, 0.045, 0.017), clamp(vTone * 0.7 + g * 0.5, 0.0, 1.0));
	float groove = smoothstep(0.15, 0.6, vCrease);
	float chaff = smoothstep(0.62, 0.92, vCrease) * (0.55 + 0.45 * noise(vObj * vec3(40.0, 6.0, 40.0)));
	vec3 albedo = mix(roast * (1.0 - groove * 0.65), vec3(0.30, 0.20, 0.11), chaff * 0.8);
	float ao = 1.0 - groove * 0.5;

	// Diffuse, plus a warm translucent band at the terminator where light would scatter in.
	float nk = dot(n, KEY);
	vec3 diffuse = vec3(1.0, 0.9, 0.78) * max(nk, 0.0) * 1.9
		+ vec3(0.40, 0.40, 0.46) * max(dot(n, normalize(vec3(0.75, -0.3, 0.5))), 0.0) * 0.35
		+ vec3(0.03)
		+ vec3(0.9, 0.35, 0.1) * smoothstep(-0.35, 0.15, nk) * (1.0 - smoothstep(0.15, 0.6, nk)) * 0.3;
	vec3 col = albedo * diffuse * ao;

	// Oily clear-coat: Fresnel reflection of the studio, a crisp key highlight, a warm back rim.
	float nv = max(dot(n, v), 0.0);
	float fresnel = 0.04 + 0.96 * pow(1.0 - nv, 5.0);
	float gloss = (1.0 - chaff) * (0.7 + 0.3 * g);
	col += studio(reflect(-v, n)) * fresnel * gloss * ao;
	col += vec3(1.0, 0.92, 0.8) * pow(max(dot(n, normalize(KEY + v)), 0.0), 140.0) * 2.0 * gloss;
	col += vec3(1.0, 0.5, 0.2) * pow(1.0 - nv, 2.5) * max(dot(n, BACK) * 0.5 + 0.5, 0.0) * 0.55;

	// Depth haze toward the ink background, then a filmic tone curve.
	col = mix(col, INK, mix(0.42, 0.0, clamp((vW.z + 2.0) / 6.0, 0.0, 1.0)));
	outColor = vec4(pow(aces(col * 1.05), vec3(1.0 / 2.2)), 1.0);
}`;

const VERT_SHADOW = `#version 300 es
layout(location=0) in vec2 aCorner;
layout(location=3) in vec4 iCR;
layout(location=4) in vec4 iAx;
uniform mat4 uVP;
out vec2 vQ; out float vA;
void main() {
	vec2 major = iAx.xy, minor = vec2(-major.y, major.x);
	vec2 q = aCorner * 2.4;
	vec3 w = vec3(iCR.xy + major * q.y * iAx.z + minor * q.x * iAx.w, iCR.z);
	vQ = q; vA = iCR.w;
	gl_Position = uVP * vec4(w, 1.0);
}`;

const FRAG_SHADOW = `#version 300 es
precision mediump float;
in vec2 vQ; in float vA;
out vec4 outColor;
void main() {
	float a = vA * exp(-2.2 * dot(vQ, vQ));
	outColor = vec4(vec3(0.08, 0.05, 0.03) * a, a);
}`;

/* ------------------------------------------------------------------ mesh */

/** Bean surface for (u, v) in [0,1]²: u runs around the bean, v from tip to tip. */
function beanPoint(u: number, v: number): { p: V3; crease: number } {
	// Pack more columns near the crease (u = 0.5 is the middle of the flat face).
	const t = u * 2 - 1;
	const phi = Math.PI / 2 + Math.PI * Math.sign(t) * Math.abs(t) ** 1.7;
	const theta = v * Math.PI;
	const sx = Math.sin(theta) * Math.cos(phi);
	const sy = -Math.cos(theta);
	const sz = Math.sin(theta) * Math.sin(phi);

	// Real beans are never perfect ellipsoids: one end a touch narrower, the outline gently lumpy.
	const lump = 1 + 0.018 * Math.sin(phi * 3 + sy * 2.2) + 0.012 * Math.sin(phi * 5 - sy * 4.1);
	const x = sx * 0.66 * (1 - 0.07 * sy) * lump;
	const y = sy * (1 + 0.01 * Math.sin(phi * 2));
	// Domed back, flattened front, blended so the rim stays smooth.
	const flat = 1 - 0.48 * smooth(-0.25, 0.65, sz);
	let z = sz * 0.54 * flat * lump;

	// The crease: a narrow S-curve pressed into the flat face, fading out before the tips.
	const cx = 0.075 * Math.sin(sy * 2.6);
	const dx = (x - cx) / 0.072;
	const crease = Math.exp(-dx * dx) * smooth(0.98, 0.55, Math.abs(sy)) * smooth(0.05, 0.45, sz);
	z -= 0.17 * crease;
	return { p: [x, y, z], crease };
}

function smooth(a: number, b: number, x: number) {
	const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
}

function buildBean(U = 64, V = 32) {
	const verts: number[] = [];
	const idx: number[] = [];
	const e = 1e-3;
	for (let j = 0; j <= V; j++) {
		for (let i = 0; i <= U; i++) {
			const u = i / U;
			const v = Math.min(1 - e * 2, Math.max(e * 2, j / V));
			const { p, crease } = beanPoint(u, v);
			const a = beanPoint(u + e, v).p;
			const b = beanPoint(u, v + e).p;
			const du = [a[0] - p[0], a[1] - p[1], a[2] - p[2]];
			const dv = [b[0] - p[0], b[1] - p[1], b[2] - p[2]];
			let n: V3 = [du[1] * dv[2] - du[2] * dv[1], du[2] * dv[0] - du[0] * dv[2], du[0] * dv[1] - du[1] * dv[0]];
			const len = Math.hypot(...n) || 1;
			n = [n[0] / len, n[1] / len, n[2] / len];
			if (n[0] * p[0] + n[1] * p[1] + n[2] * p[2] < 0) n = [-n[0], -n[1], -n[2]];
			if (j === 0 || j === V) n = [0, j === 0 ? -1 : 1, 0];
			const tip = beanPoint(u, j / V).p;
			verts.push(tip[0], tip[1], tip[2], n[0], n[1], n[2], crease);
		}
	}
	for (let j = 0; j < V; j++) {
		for (let i = 0; i < U; i++) {
			const a = j * (U + 1) + i;
			const b = a + U + 1;
			idx.push(a, b, a + 1, a + 1, b, b + 1);
		}
	}
	return { verts: new Float32Array(verts), idx: new Uint16Array(idx) };
}

/* ------------------------------------------------------------------ math */

function perspective(fovy: number, aspect: number, near: number, far: number) {
	const f = 1 / Math.tan(fovy / 2);
	const nf = 1 / (near - far);
	return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
}

function lookAt(eye: V3, target: V3) {
	let zx = eye[0] - target[0], zy = eye[1] - target[1], zz = eye[2] - target[2];
	let l = Math.hypot(zx, zy, zz);
	zx /= l; zy /= l; zz /= l;
	// x = up(0,1,0) × z
	let xx = zz, xy = 0, xz = -zx;
	l = Math.hypot(xx, xy, xz);
	xx /= l; xy /= l; xz /= l;
	const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
	return [
		xx, yx, zx, 0,
		xy, yy, zy, 0,
		xz, yz, zz, 0,
		-(xx * eye[0] + xy * eye[1] + xz * eye[2]),
		-(yx * eye[0] + yy * eye[1] + yz * eye[2]),
		-(zx * eye[0] + zy * eye[1] + zz * eye[2]),
		1,
	];
}

function mul(a: number[], b: number[]) {
	const o = new Array<number>(16);
	for (let c = 0; c < 4; c++)
		for (let r = 0; r < 4; r++)
			o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
	return o;
}

function rng(seed: number) {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}


/* ------------------------------------------------------------------ scene */

interface Bean {
	x: number; // screen position, host pixels
	y: number;
	vx: number; // px per second
	vy: number;
	drag: number; // air drag: sets each bean's slow-motion terminal speed
	contact: number; // seconds since it last touched a surface, counting down from 0.12
	z: number; // depth: nearer beans are bigger and move more with the camera
	scale: number;
	q: [number, number, number, number];
	axis: V3;
	spin: number;
	boost: number;
	tone: number;
}

const D = 18; // camera distance
const GRAVITY = 150; // px/s², slowed right down: with drag, beans fall at ~100–190 px/s
const PLANE_Z = -3.6; // the page the shadows fall on

/* ---------------------------------------------------------------- messages */

/**
 * A wall the beans bounce off: a point on it and the normal pointing into the beans' side.
 */
export type Wall = [px: number, py: number, nx: number, ny: number];

/** A solid block the beans bounce off (the photo plate on phones): left, top, right, bottom. */
export type Box = [x0: number, y0: number, x1: number, y1: number];

/** Everything the scene needs from the page, measured on the main thread. */
export interface Layout {
	W: number;
	H: number;
	dpr: number;
	viewH: number;
	/**
	 * The slash as a moving wall: where it meets the top at rest, how far left it slides by the
	 * time the hero has scrolled away (mirrors --cut-scroll in motion.ts), and its lean.
	 */
	slash: { x: number; drift: number; angle: number } | null;
	walls: Wall[];
	boxes: Box[];
	/** Beans that fall past this line are dropped in again from the top. */
	floor: number;
	/** Where new beans drop in from, left to right, when there is no slash to aim them at. */
	spawn: [number, number];
}

export type ToScene =
	| { type: 'init'; canvas: OffscreenCanvas; layout: Layout; still: boolean }
	| { type: 'layout'; layout: Layout }
	| { type: 'pointer'; x: number; y: number; inside: boolean }
	| { type: 'tap'; x: number; y: number }
	| { type: 'scroll'; y: number }
	| { type: 'run'; on: boolean }
	/** A display-synced frame from the page, when the scene asked for one with 'frame'. */
	| { type: 'tick' };

export type FromScene =
	| { type: 'ready' }
	/** 'unsupported': no WebGL2 here (try elsewhere). 'software': no real GPU (give up). */
	| { type: 'fail'; reason: 'unsupported' | 'software' }
	/** The scene wants a frame and has no requestAnimationFrame of its own: reply with 'tick'. */
	| { type: 'frame' };

/** What the scene needs from wherever it runs: a worker (beans-worker.ts) or the page itself. */
export interface SceneHost {
	post: (msg: FromScene) => void;
	/** The host's requestAnimationFrame, or null to ask for frames with 'frame' messages. */
	raf: ((cb: (t: number) => void) => number) | null;
	cancel: (id: number) => void;
}

export type Scene = { handle: (msg: Exclude<ToScene, { type: 'init' }>) => void };

/* -------------------------------------------------------------------- scene */

export function createScene(
	canvas: OffscreenCanvas | HTMLCanvasElement,
	initial: Layout,
	still: boolean,
	host: SceneHost,
): Scene | 'unsupported' | 'software' {
	const gl = canvas.getContext('webgl2', {
		alpha: true,
		antialias: true,
		premultipliedAlpha: true,
		powerPreference: 'low-power',
		failIfMajorPerformanceCaveat: true,
	}) as WebGL2RenderingContext | null;
	if (!gl) return 'unsupported';

	// No real GPU, no beans: a software rasteriser (SwiftShader, llvmpipe) would spend a whole
	// CPU core on a garnish. The page is complete without this layer. Chrome masks RENDERER
	// ("WebKit WebGL"); Firefox and Safari report a real (if generalised) name directly.
	let renderer = String(gl.getParameter(gl.RENDERER));
	if (/^webkit webgl$/i.test(renderer)) {
		const info = gl.getExtension('WEBGL_debug_renderer_info');
		if (info) renderer = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
	}
	if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer)) return 'software';

	/* ---------------------------------------------------------- programs */

	const program = (vs: string, fs: string) => {
		const p = gl.createProgram()!;
		for (const [type, src] of [
			[gl.VERTEX_SHADER, vs],
			[gl.FRAGMENT_SHADER, fs],
		] as const) {
			const s = gl.createShader(type)!;
			gl.shaderSource(s, src);
			gl.compileShader(s);
			gl.attachShader(p, s);
		}
		gl.linkProgram(p);
		return p;
	};
	const beanProg = program(VERT_BEAN, FRAG_BEAN);
	const shadowProg = program(VERT_SHADOW, FRAG_SHADOW);
	if (!gl.getProgramParameter(beanProg, gl.LINK_STATUS) || !gl.getProgramParameter(shadowProg, gl.LINK_STATUS))
		return 'unsupported';
	const uBeanVP = gl.getUniformLocation(beanProg, 'uVP');
	const uEye = gl.getUniformLocation(beanProg, 'uEye');
	const uShadowVP = gl.getUniformLocation(shadowProg, 'uVP');

	/* -------------------------------------------------------------- data */

	let L = initial;
	const COUNT = L.W < 861 ? 10 : 18;
	const BEAN_STRIDE = 14;
	const SHADOW_STRIDE = 8;
	const beanData = new Float32Array(COUNT * BEAN_STRIDE);
	const shadowData = new Float32Array(COUNT * SHADOW_STRIDE);

	const mesh = buildBean();

	const beanVao = gl.createVertexArray()!;
	gl.bindVertexArray(beanVao);
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, mesh.verts, gl.STATIC_DRAW);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
	gl.enableVertexAttribArray(1);
	gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 12);
	gl.enableVertexAttribArray(2);
	gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 28, 24);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.idx, gl.STATIC_DRAW);
	const beanInst = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, beanInst);
	gl.bufferData(gl.ARRAY_BUFFER, beanData.byteLength, gl.DYNAMIC_DRAW);
	const layout: [number, number, number][] = [
		[3, 4, 0],
		[4, 3, 16],
		[5, 3, 28],
		[6, 3, 40],
		[7, 1, 52],
	];
	for (const [loc, size, off] of layout) {
		gl.enableVertexAttribArray(loc);
		gl.vertexAttribPointer(loc, size, gl.FLOAT, false, BEAN_STRIDE * 4, off);
		gl.vertexAttribDivisor(loc, 1);
	}

	const shadowVao = gl.createVertexArray()!;
	gl.bindVertexArray(shadowVao);
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
	const shadowInst = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, shadowInst);
	gl.bufferData(gl.ARRAY_BUFFER, shadowData.byteLength, gl.DYNAMIC_DRAW);
	for (const [loc, off] of [
		[3, 0],
		[4, 16],
	]) {
		gl.enableVertexAttribArray(loc);
		gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, SHADOW_STRIDE * 4, off);
		gl.vertexAttribDivisor(loc, 1);
	}
	gl.bindVertexArray(null);

	/* ------------------------------------------------------------- beans */

	let unit = 80;
	const radius = (b: Bean) => (0.78 * b.scale * unit * D) / (D - b.z);
	/**
	 * How far the bean reaches toward a surface with screen normal (nx, ny), in pixels: the
	 * support distance of its ellipsoid (semi-axes 0.66 × 1 × 0.42) in its current orientation.
	 */
	const extent = (b: Bean, nx: number, ny: number) => {
		const [x, y, z, w] = b.q;
		// The bean's own axes in world space (columns of its rotation); world y is screen-up.
		const mx = (1 - 2 * (y * y + z * z)) * nx - 2 * (x * y + w * z) * ny;
		const my = 2 * (x * y - w * z) * nx - (1 - 2 * (x * x + z * z)) * ny;
		const mz = 2 * (x * z + w * y) * nx - 2 * (y * z - w * x) * ny;
		const s = Math.hypot(0.66 * mx, my, 0.42 * mz);
		return (s * b.scale * unit * D) / (D - b.z);
	};
	/** Signed distance from a point to a wall, positive on the beans' side. */
	const side = (w: Wall, x: number, y: number) => (x - w[0]) * w[2] + (y - w[1]) * w[3];
	/** Distance from a point to a box, with the direction pointing out of it. */
	const away = ([x0, y0, x1, y1]: Box, x: number, y: number) => {
		const dx = x - Math.min(x1, Math.max(x0, x));
		const dy = y - Math.min(y1, Math.max(y0, y));
		const d = Math.hypot(dx, dy);
		if (d > 0) return { d, nx: dx / d, ny: dy / d };
		// Inside: leave by the nearest side.
		const exits = [
			{ d: x - x0, nx: -1, ny: 0 },
			{ d: x1 - x, nx: 1, ny: 0 },
			{ d: y - y0, nx: 0, ny: -1 },
			{ d: y1 - y, nx: 0, ny: 1 },
		].sort((a, b) => a.d - b.d)[0];
		return { d: -exits.d, nx: exits.nx, ny: exits.ny };
	};
	/** The slash wall right now: it slides left as the hero scrolls away, exactly like the cut. */
	let scrollY = 0;
	let slashWall: Wall | null = null;
	let walls: Wall[] = [];
	const updateWalls = () => {
		const s = L.slash;
		const p = Math.min(1, Math.max(0, scrollY / Math.max(1, L.H)));
		slashWall = s ? [s.x - s.drift * p, 0, -Math.cos(s.angle), -Math.sin(s.angle)] : null;
		walls = slashWall ? [...L.walls, slashWall] : L.walls;
	};
	updateWalls();
	const clear = (x: number, y: number, r: number) =>
		walls.every((w) => side(w, x, y) > r) && L.boxes.every((b) => away(b, x, y).d > r);

	const rand = rng(7);
	const beans: Bean[] = Array.from({ length: COUNT }, () => {
		const ax: V3 = [rand() - 0.5, rand() - 0.5, rand() - 0.5];
		const al = Math.hypot(...ax);
		const half = rand() * Math.PI;
		const qa: V3 = [rand() - 0.5, rand() - 0.5, rand() - 0.5];
		const ql = Math.hypot(...qa);
		const sh = Math.sin(half);
		return {
			x: 0,
			y: 0,
			vx: 0,
			vy: 0,
			drag: 0.8 + rand() * 0.7,
			contact: 0,
			z: -2 + rand() * 6,
			scale: 0.3 + rand() * 0.22,
			q: [(qa[0] / ql) * sh, (qa[1] / ql) * sh, (qa[2] / ql) * sh, Math.cos(half)],
			axis: [ax[0] / al, ax[1] / al, ax[2] / al],
			spin: 0.25 + rand() * 0.5,
			boost: still ? 0 : 3,
			tone: rand(),
		};
	});

	/**
	 * Drop a bean in from above. On desktop most start just left of where the slash meets the
	 * top, so they fall onto it and ricochet down its slope.
	 */
	const respawn = (b: Bean, anywhere = false) => {
		const r = radius(b);
		for (let tries = 0; tries < 60; tries++) {
			const [s0, s1] = L.spawn;
			b.x = slashWall ? slashWall[0] - r - rand() ** 1.6 * L.W * 0.5 : s0 + r + rand() * Math.max(0, s1 - s0 - 2 * r);
			b.y = anywhere ? rand() * L.floor : -r - rand() * L.floor * 0.35;
			if (clear(b.x, Math.max(b.y, r), r)) break;
		}
		b.vx = (rand() - 0.5) * 30;
		b.vy = anywhere ? 40 + rand() * 60 : 20 + rand() * 40;
	};
	const scatter = () => beans.forEach((b) => respawn(b, true));

	/* ------------------------------------------------------------- state */

	let quality = 1;
	const resize = () => {
		canvas.width = Math.max(1, Math.round(L.W * L.dpr * quality));
		canvas.height = Math.max(1, Math.round(L.H * L.dpr * quality));
		unit = Math.min(110, Math.max(44, Math.min(L.W, L.viewH) / 10.5));
	};
	resize();
	scatter();

	let px = -1e4, py = -1e4, pIn = false, ptx = 0, pty = 0;
	let running = false, raf = 0, pending = false, last = 0, start = performance.now(), slow = 0, frames = 0, announced = false;

	const tap = (x: number, y: number) => {
		// A tap knocks the nearby beans away and sets them spinning.
		for (const b of beans) {
			const d = Math.hypot(b.x - x, b.y - y);
			if (d > 300) continue;
			const k = (1 - d / 300) ** 2;
			const inv = 1 / (d || 1);
			b.vx += (b.x - x) * inv * 700 * k;
			b.vy += (b.y - y) * inv * 700 * k;
			b.boost += 8 * k;
		}
	};

	/* ------------------------------------------------------------- frame */

	const frame = (now: number) => {
		raf = 0;
		pending = false;
		const { W, H } = L;
		const dt = still ? 0 : Math.min(0.05, (now - last) / 1000 || 0.016);
		last = now;
		const T = still ? 99 : (now - start) / 1000;

		// Adaptive resolution: if the GPU can't keep up, render fewer pixels.
		if (!still && T > 1.5 && quality > 0.6) {
			frames++;
			if (dt > 0.03) slow++;
			if (frames === 90) {
				if (slow > 30) {
					quality = 0.6;
					resize();
				}
				frames = slow = 0;
			}
		}

		ptx += ((pIn ? px / W - 0.5 : 0) - ptx) * Math.min(1, dt * 3);
		pty += ((pIn ? py / H - 0.5 : 0) - pty) * Math.min(1, dt * 3);

		const fov = 2 * Math.atan(H / 2 / unit / D);
		const eye: V3 = [ptx * 1.4, -pty * 1, D];
		const vp = mul(perspective(fov, W / H, 0.5, 80), lookAt(eye, [0, 0, 0]));
		const pxToWorld = 1 / unit;

		updateWalls();

		// Beans at a similar depth knock into each other instead of passing through, so a pile
		// on the edge jostles and spreads like real beans. Soft, roughly round contact; equal mass.
		if (!still) {
			for (let i = 0; i < COUNT; i++) {
				const a = beans[i];
				for (let j = i + 1; j < COUNT; j++) {
					const b = beans[j];
					if (Math.abs(a.z - b.z) > 1.6) continue;
					const dx = b.x - a.x, dy = b.y - a.y;
					const min = 0.55 * (radius(a) + radius(b));
					const d2 = dx * dx + dy * dy;
					if (d2 >= min * min) continue;
					const d = Math.sqrt(d2) || 0.01;
					const nx = dx / d, ny = dy / d;
					const push = (min - d) / 2;
					a.x -= nx * push;
					a.y -= ny * push;
					b.x += nx * push;
					b.y += ny * push;
					const vrel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
					if (vrel >= 0) continue;
					const imp = (-(1 + 0.3) * vrel) / 2;
					a.vx -= imp * nx;
					a.vy -= imp * ny;
					b.vx += imp * nx;
					b.vy += imp * ny;
					if (-vrel > 40) {
						a.boost = Math.min(9, a.boost - vrel * 0.015);
						b.boost = Math.min(9, b.boost - vrel * 0.015);
					}
				}
			}
		}

		beans.forEach((b, i) => {
			const r = radius(b);
			if (!still) {
				// The pointer pushes beans away.
				const ddx = b.x - px, ddy = b.y - py;
				const d = Math.hypot(ddx, ddy);
				const R = 170 + r;
				if (d < R) {
					const k = (1 - d / R) ** 2;
					b.vx += (ddx / (d || 1)) * 2200 * k * dt;
					b.vy += (ddy / (d || 1)) * 2200 * k * dt;
					b.boost += 1.6 * k * dt;
				}

				// Slow-motion fall: gravity against air drag, so each bean drifts down at its own pace.
				// On a surface the drag is mostly gone, so a bean skids and rolls instead of crawling.
				b.vy += GRAVITY * dt;
				const k = Math.exp(-(b.contact > 0 ? 0.3 : b.drag) * dt);
				b.vx *= k;
				b.vy *= k;
				b.x += b.vx * dt;
				b.y += b.vy * dt;
				b.contact = Math.max(0, b.contact - dt);

				// Collide with the slash (and, on phones, the photo's slanted edge). The contact
				// distance is the bean's real extent toward the surface in its current orientation,
				// so a bean lying flat sits low, one on its end stands tall, and a tumbling bean rocks.
				const bounce = (sideOf: (x: number, y: number) => number, nx: number, ny: number) => {
					const reach = extent(b, nx, ny);
					const gap = sideOf(b.x, b.y) - reach;
					if (gap >= 0) return;
					b.x -= gap * nx;
					b.y -= gap * ny;
					b.contact = 0.12;
					const vn = b.vx * nx + b.vy * ny;
					if (vn >= 0) return;
					const tx = -ny, ty = nx;
					let vt = b.vx * tx + b.vy * ty;
					const impact = -vn;
					// A real bounce: a firm hit rebounds at about half speed and the hops decay;
					// a soft touch just settles into a slide. Friction bites hardest on impact.
					const out = impact > 45 ? impact * (0.42 + rand() * 0.14) : impact * 0.1;
					vt *= impact > 45 ? 0.82 : Math.exp(-0.5 * dt);
					b.vx = out * nx + vt * tx;
					b.vy = out * ny + vt * ty;
					// Tumble the way it is travelling: spin mostly about the screen axis, like rolling.
					if (impact > 45) {
						const dir = Math.sign(vt) || 1;
						const ax: V3 = [(rand() - 0.5) * 0.8, (rand() - 0.5) * 0.8, -dir];
						const al = Math.hypot(...ax);
						b.axis = [ax[0] / al, ax[1] / al, ax[2] / al];
						b.boost = Math.min(9, b.boost + impact * 0.03);
					}
					// While sliding, keep spinning at the speed it rolls along the surface.
					b.boost = Math.max(b.boost, Math.min(9, (Math.abs(vt) / Math.max(8, r)) * 0.6));
				};
				for (const w of walls) bounce((x, y) => side(w, x, y), w[2], w[3]);
				for (const box of L.boxes) {
					const { nx, ny } = away(box, b.x, b.y);
					bounce((x, y) => away(box, x, y).d, nx, ny);
				}
				b.boost *= Math.exp(-1.2 * dt);

				// Off the bottom or out the side: drop it in again from the top.
				if (b.y > L.floor + r * 2 || b.x < -r * 3 || b.x > L.W + r * 3) respawn(b);

				const a = (b.spin + b.boost) * dt;
				const sa = Math.sin(a / 2);
				const x1 = b.axis[0] * sa, y1 = b.axis[1] * sa, z1 = b.axis[2] * sa, w1 = Math.cos(a / 2);
				const [x2, y2, z2, w2] = b.q;
				const q: [number, number, number, number] = [
					w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
					w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
					w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2,
					w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
				];
				const ql = Math.hypot(...q);
				b.q = [q[0] / ql, q[1] / ql, q[2] / ql, q[3] / ql];
			}

			// Intro: each bean pops up out of the page, staggered.
			const a = Math.min(1, Math.max(0, (T - 0.05 - i * 0.05) / 1.1));
			const e = a === 1 ? 1 : 1 - (1 - a) ** 3 + Math.sin(a * Math.PI) * 0.12;

			// Screen → world on this bean's depth plane.
			const depth = (D - b.z) / D;
			const wx = (b.x - W / 2) * pxToWorld * depth;
			const wy = (H / 2 - b.y) * pxToWorld * depth;
			const wz = b.z;
			const scale = b.scale * e;

			const [x, y, z, w] = b.q;
			const r0: V3 = [1 - 2 * (y * y + z * z), 2 * (x * y + w * z), 2 * (x * z - w * y)];
			const r1: V3 = [2 * (x * y - w * z), 1 - 2 * (x * x + z * z), 2 * (y * z + w * x)];
			const r2: V3 = [2 * (x * z + w * y), 2 * (y * z - w * x), 1 - 2 * (x * x + y * y)];

			const o = i * BEAN_STRIDE;
			beanData[o] = wx;
			beanData[o + 1] = wy;
			beanData[o + 2] = wz;
			beanData[o + 3] = scale;
			beanData.set(r0, o + 4);
			beanData.set(r1, o + 7);
			beanData.set(r2, o + 10);
			beanData[o + 13] = b.tone;

			// Shadow: dropped down-right from the key light onto the page, softer the higher it floats.
			const h = Math.max(0.5, wz - PLANE_Z);
			const ml = Math.hypot(r1[0], r1[1]);
			const mx = ml > 0.05 ? r1[0] / ml : 0, my = ml > 0.05 ? r1[1] / ml : 1;
			const rad = scale * (1 + 0.1 * h);
			const so = i * SHADOW_STRIDE;
			shadowData[so] = wx + h * 0.22;
			shadowData[so + 1] = wy - h * 0.3;
			shadowData[so + 2] = PLANE_Z;
			shadowData[so + 3] = (0.2 * e) / (1 + 0.22 * h);
			shadowData[so + 4] = mx;
			shadowData[so + 5] = my;
			shadowData[so + 6] = rad * (0.62 + 0.42 * ml);
			shadowData[so + 7] = rad * 0.66;
		});

		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		gl.disable(gl.DEPTH_TEST);
		gl.useProgram(shadowProg);
		gl.uniformMatrix4fv(uShadowVP, false, vp);
		gl.bindVertexArray(shadowVao);
		gl.bindBuffer(gl.ARRAY_BUFFER, shadowInst);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, shadowData);
		gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, COUNT);

		gl.disable(gl.BLEND);
		gl.enable(gl.DEPTH_TEST);
		gl.useProgram(beanProg);
		gl.uniformMatrix4fv(uBeanVP, false, vp);
		gl.uniform3fv(uEye, eye);
		gl.bindVertexArray(beanVao);
		gl.bindBuffer(gl.ARRAY_BUFFER, beanInst);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, beanData);
		gl.drawElementsInstanced(gl.TRIANGLES, mesh.idx.length, gl.UNSIGNED_SHORT, 0, COUNT);
		gl.bindVertexArray(null);

		if (!announced) {
			announced = true;
			host.post({ type: 'ready' });
		}
		if (running && !still) draw();
	};

	/** Ask for the next frame: from our own requestAnimationFrame, or from the page if we have none. */
	const draw = () => {
		if (host.raf) {
			if (!raf) raf = host.raf(frame);
		} else if (!pending) {
			pending = true;
			host.post({ type: 'frame' });
		}
	};

	if (still) draw();

	return {
		handle(msg) {
			switch (msg.type) {
				case 'layout': {
					const resized = msg.layout.W !== L.W || msg.layout.H !== L.H;
					L = msg.layout;
					resize();
					updateWalls();
					if (resized) scatter();
					if (still) draw();
					break;
				}
				case 'pointer':
					pIn = msg.inside;
					px = msg.inside ? msg.x : -1e4;
					py = msg.inside ? msg.y : -1e4;
					break;
				case 'tap':
					tap(msg.x, msg.y);
					break;
				case 'scroll':
					scrollY = msg.y;
					break;
				case 'run':
					if (still) break;
					if (msg.on && !running) {
						running = true;
						last = performance.now();
						if (!announced) start = last;
						draw();
					} else if (!msg.on && running) {
						running = false;
						if (raf) host.cancel(raf);
						raf = 0;
						pending = false;
					}
					break;
				case 'tick':
					// Our own clock: the page's performance.now() has a different time origin in a worker.
					if (pending) frame(performance.now());
					break;
			}
		},
	};
}
