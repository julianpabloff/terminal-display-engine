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

	// const manager = new BufferModule.BufferManager();

	// const buffer = new BufferModule.DisplayBuffer(bufferX, bufferY, bufferWidth, bufferHeight, manager);
	// buffer.outline('red');

	// const second = new BufferModule.DisplayBuffer(bufferX + 10, bufferY + 5, 10, 5, manager, 1);
	// second.outline('green');

	const manager = new BufferManager();
	const buffer = manager.newBuffer(bufferX, bufferY, bufferWidth, bufferHeight);
	// const third = manager.newBuffer(bufferX + 40, bufferY + 20, 60, 10, 3);
	const second = manager.newBuffer(bufferX + 10, bufferY + 5, bufferWidth - 20, bufferHeight - 10, 2);
	buffer.outline('red');
	second.outline('green');
	// third.outline('blue');

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
		if (thing == blob) manager.setColor('green', 'blue');
		else manager.setColor('blue', 'green');
		for (let i = 0; i < thing.length; i++) {
			buffer.draw(thing[i], x, y + i);
		}
		buffer.render();
	}
	let blobX = 0; let blobY = 0;
	second.render();
	drawThing(blobX, blobY, blob);

	const keypress = require('keypress');
	keypress(process.stdin);
	process.stdin.setRawMode(true);

	process.stdin.on('keypress', function(chunk, key) {
		const keyPressed = (key == undefined) ? chunk : key.name;
		switch (keyPressed) {
			case 'left': if (blobX > 1) blobX -= 2; break;
			case 'right': if (blobX < bufferWidth - blob[0].length - 1) blobX += 2; break;
			case 'up': if (blobY > 0) blobY--; break;
			case 'down': if (blobY < bufferHeight - blob.length) blobY++; break;
		}
		drawThing(blobX, blobY, blob);
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