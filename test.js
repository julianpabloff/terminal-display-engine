const BufferManager = require('./buffer.js');

const stdout = process.stdout;
const rows = stdout.rows;
const columns = stdout.columns;

async function wait(miliseconds) {
	return new Promise(function(resolve) {
		setTimeout(() => {
			resolve();
		}, miliseconds);
	});
}

async function test() {
	stdout.write('\x1b[2J'); // clear screen
	stdout.write('\x1b[?25l'); // hide cursor

	await wait(500);
	const bufferWidth = 80;
	const bufferHeight = 26;
	const bufferSize = bufferWidth * bufferHeight;
	const bufferX = Math.floor(columns / 2 - bufferWidth / 2);
	const bufferY = Math.floor(rows / 2 - bufferHeight / 2);

	const manager = new BufferManager();
	const buffer = manager.newBuffer(bufferX, bufferY, bufferWidth, bufferHeight);
	const second = manager.newBuffer(bufferX, bufferY, bufferWidth, bufferHeight, 2);
	const middle = manager.newBuffer(bufferX + 20, bufferY + 10, 20, 2, 1);
	buffer.outline('red');

	const blob = [
		'..............',
		'..............',
		'..............',
		'..............',
		'..............',
		'..............',
		'..............',
	];
	const bleh = [
		'00000000000',
		'00000000000',
		'00000000000',
		'00000000000',
		'00000000000',
	];
	function drawThing(x, y, thing) {
		let buf = (thing == blob) ? buffer : second;
		if (thing == blob) manager.setColor('white', 'green');
		else manager.setColor('black', 'blue');
		for (let i = 0; i < thing.length; i++) {
			buf.draw(thing[i], x, y + i);
		}
		buf.render();
	}
	let blobX = 20; let blobY = 0;
	let blehX = 0; let blehY = 0;
	drawThing(blehX, blehY, bleh);
	drawThing(blobX, blobY, blob);
	await wait(1000);
	middle.transparent = false;
	middle.fill('red');
	manager.setColor('red', 'yellow');
	middle.draw('julian', 10, 0);
	middle.render();

	const keypress = require('keypress');
	keypress(process.stdin);
	process.stdin.setRawMode(true);

	process.stdin.on('keypress', function(chunk, key) {
		const keyPressed = (key == undefined) ? chunk : key.name;
		let moved = false;
		switch (keyPressed) {
			case 'left': if (blobX > 1) blobX -= 2; moved = 'blob'; break;
			case 'right': if (blobX < bufferWidth - blob[0].length - 1) blobX += 2; moved = 'blob'; break;
			case 'up': if (blobY > 0) blobY--; moved = 'blob'; break;
			case 'down': if (blobY < bufferHeight - blob.length) blobY++; moved = 'blob'; break;
			case 'w': if (blehY > 0) blehY--; moved = 'bleh'; break;
			case 'a': if (blehX > 1) blehX -= 2; moved = 'bleh'; break;
			case 's': if (blehY < bufferHeight - bleh.length) blehY++; moved = 'bleh'; break;
			case 'd': if (blehX < bufferWidth - bleh[0].length - 1) blehX += 2; moved = 'bleh'; break;
		}
		if (moved == 'blob') drawThing(blobX, blobY, blob);
		if (moved == 'bleh') drawThing(blehX, blehY, bleh);
		if (keyPressed == 'space') {
			stdout.cursorTo(0,0);
			// let current = manager.zList.head;
			// while (current) {
			// 	console.log(current.zIndex);
			// 	current = current.next;
			// }
			// console.log(manager.zList);
			console.log(manager.zArray);
		} else if (keyPressed == 'escape') {
			stdout.cursorTo(0, rows - 2);
			stdout.write('\x1b[?25h\x1b[0m'); // show cursor
			process.exit();
		}
	});
}
test();
