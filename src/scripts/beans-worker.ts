/**
 * Worker entry for the bean scene: renders on an OffscreenCanvas so the page's main thread never
 * waits on the GPU. Browsers without requestAnimationFrame in workers ask the page for each
 * frame instead, so motion stays locked to the display (60 or 120 Hz) everywhere.
 */
import { createScene, type FromScene, type Scene, type ToScene } from './beans-scene';

const scope = self as unknown as {
	postMessage: (msg: FromScene) => void;
	onmessage: ((event: MessageEvent<ToScene>) => void) | null;
	requestAnimationFrame?: (cb: (t: number) => void) => number;
	cancelAnimationFrame?: (id: number) => void;
};

let scene: Scene | null = null;

scope.onmessage = (event) => {
	const msg = event.data;
	if (msg.type !== 'init') return scene?.handle(msg);

	const raf = scope.requestAnimationFrame?.bind(scope) ?? null;
	const result = createScene(msg.canvas, msg.layout, msg.still, {
		post: (m) => scope.postMessage(m),
		raf,
		cancel: (id) => scope.cancelAnimationFrame?.(id),
	});
	if (typeof result === 'string') scope.postMessage({ type: 'fail', reason: result });
	else scene = result;
};
