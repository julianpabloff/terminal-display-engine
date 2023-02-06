const BufferManager = require('./buffer.js');

const stdout = process.stdout;
const rows = stdout.rows;
const columns = stdout.columns;

async function wait(miliseconds) {
	return new Promise(resolve => setTimeout(resolve, miliseconds));
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
	const buffer = manager.new(bufferX, bufferY, bufferWidth, bufferHeight);
	const second = manager.new(bufferX, bufferY, bufferWidth, bufferHeight, 2);
	const middle = manager.new(bufferX + 20, bufferY + 10, 20, 3, 1);
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
		else manager.setColor('blue', 'none');
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
	middle.fill('white');
	manager.setColor('red', 'none');
	middle.draw('julian', 10, 1);
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
			console.log(manager.screens);
		} else if (keyPressed == 'escape') {
			stdout.cursorTo(0, rows - 2);
			stdout.write('\x1b[?25h\x1b[0m'); // show cursor
			process.exit();
		}
	});
}

async function test2() {
	stdout.write('\x1b[2J'); // clear screen
	stdout.write('\x1b[?25l'); // hide cursor

	const bufferWidth = 60;
	const bufferHeight = 40;
	const bufferX = Math.floor(columns / 2 - bufferWidth / 2);
	const bufferY = Math.floor(rows / 2 - bufferHeight / 2);
	const manager = new BufferManager();
	const buffer = manager.new(bufferX, bufferY, bufferWidth, bufferHeight);
	buffer.outline('cyan');
	buffer.fill('cyan');

	// const keypress = require('keypress');
	// keypress(process.stdin);
	// process.stdin.setRawMode(true);
	// process.stdin.on('keypress', function(chunk, key) {
	// 	const keyPressed = (key == undefined) ? chunk : key.name;
	// 	if (keyPressed == 'escape') {
	// 		stdout.cursorTo(0, rows - 2);
	// 		stdout.write('\x1b[?25h\x1b[0m'); // show cursor
	// 		process.exit();
	// 	}
	// });

	// const PixelEngine = require('./pixels.js');
	// const pixel = new PixelEngine();
	const grid = [
		[2, 3, 5, 0, 7, 3],
		[6, 5, 0, 4, 2, 8],
		[6, 5, 0, 4, 2, 8],
		[6, 5, 0, 4, 2, 8],
		[6, 5, 0, 4, 2, 8],
		// [2, 3, 5, 0],
		// [6, 5, 0, 4],
	];
	const card = [];
	const topRow = [7];
	for (let i = 0; i < 44; i++) topRow.push(1);
	topRow.push(7);
	card.push(topRow);
	const secondRow = [1,1];
	for (let i = 0; i < 41; i++) secondRow.push(8);
	secondRow.push(1,1,1);
	card.push(secondRow);
	for (let i = 0; i < 59; i++) {
		const row = [1];
		for (let i = 0; i < 43; i++) row.push(8);
		row.push(1,1);
		card.push(row);
	}
	card.push(secondRow, Array(46).fill(1), topRow);

	const ten = [
		[2,8,2,2,2],
		[2,8,2,8,2],
		[2,8,2,8,2],
		[2,8,2,8,2],
		[2,8,2,2,2]
	];
	const heart = [
		[8,2,8,2,8],
		[2,2,2,2,2],
		[2,2,2,2,2],
		[8,2,2,2,8],
		[8,8,2,8,8],
	];
	const bigHeart = [
		[8,8,8,8,8,8,8,8,8],
		[8,2,2,2,8,2,2,2,8],
		[2,2,2,2,2,2,2,2,2],
		[2,2,2,2,2,2,2,2,2],
		[2,2,2,2,2,2,2,2,2],
		[8,2,2,2,2,2,2,2,8],
		[8,8,2,2,2,2,2,8,8],
		[8,8,8,2,2,2,8,8,8],
		[8,8,8,8,2,8,8,8,8],
		[8,8,8,8,8,8,8,8,8]
	];
	const bigClub = [
		[8,8,8,1,1,1,8,8,8],
		[8,8,1,1,1,1,1,8,8],
		[8,8,1,1,1,1,1,8,8],
		[8,8,8,1,1,1,8,8,8],
		[8,1,1,8,1,8,1,1,8],
		[1,1,1,1,1,1,1,1,1],
		[1,1,1,1,1,1,1,1,1],
		[8,1,1,8,1,8,1,1,8],
		[8,8,8,8,1,8,8,8,8],
		[8,8,1,1,1,1,1,8,8]
	];
	const tenMap = [
		{x: 10, y: 6, inverted: false},
		{x: 26, y: 6, inverted: false},
		{x: 18, y: 13, inverted: false},
		{x: 10, y: 20, inverted: false},
		{x: 26, y: 20, inverted: false},
		{x: 10, y: 48, inverted: true},
		{x: 26, y: 48, inverted: true},
		{x: 18, y: 41, inverted: true},
		{x: 10, y: 34, inverted: true},
		{x: 26, y: 34, inverted: true},
	];
	buffer.enablePixels();

	buffer.pixel.fill('cyan');
	buffer.pixel.draw(card, 1, 1);
	// buffer.pixel.draw(ten, 4, 4);
	// buffer.pixel.draw(heart, 4, 10);
	// let bigSuit = bigClub;
	// for (let map of tenMap) {
	// 	let output = [];
	// 	let y = map.y;
	// 	if (map.inverted) {
	// 		y -= 1;
	// 		// for (let i = bigSuit.length - 1; i >= 0; i--)
	// 		// 	output.push(bigSuit[i]);
	// 	}
	// 	buffer.pixel.draw(bigSuit, 1 + map.x, 1 + y, map.inverted);
	// }
	const design = require('./cardDesign.json');
	const suitColorMap = {h: 2, c: 1, d: 2, s: 1};
	function drawCard(value, suit) {
		const valueGrid = design.values[value];
		const valueOutput = [];
		for (let i = 0; i < valueGrid.length; i++) {
			valueOutput.push([]);
			for (let j = 0; j < valueGrid[i].length; j++)
				if (valueGrid[i][j]) valueOutput[i].push(suitColorMap[suit]);
				else valueOutput[i].push(8);
		}
		const smallSuit = design.smallSuits[suit];
		buffer.pixel.draw(valueOutput, 4, 4);
		buffer.pixel.draw(smallSuit, 4, 10);
		const bigSuit = design.bigSuits[suit];
		for (let map of design.maps[value]) {
			let y = map.y;
			if (map.inverted) y--;
			buffer.pixel.draw(bigSuit, 1 + map.x, 1 + y, map.inverted);
		}
		buffer.pixel.draw(valueOutput, 38, 56, true);
		buffer.pixel.draw(smallSuit, 38, 49, true);
		buffer.pixel.apply();
		buffer.render();
	}
	drawCard(0, 'c');
	await wait(20);
	drawCard(0, 'h');
	await wait(20);
	drawCard(0, 'c');
	await wait(20);
	drawCard(0, 'h');
	await wait(20);
	drawCard(0, 'c');
	await wait(1000);
	drawCard(0, 'h');
	await wait(20);
	drawCard(0, 'c');
	await wait(20);
	drawCard(0, 'h');
	await wait(20);
	drawCard(0, 'c');
	await wait(20);
	drawCard(0, 'h');

	stdout.cursorTo(0, rows - 2); // move cursor
	stdout.write('\x1b[?25h\x1b[0m'); // show cursor
}

async function test3() {
	stdout.write('\x1b[2J'); // clear screen
	stdout.write('\x1b[?25l'); // hide cursor
	const width = 30;
	const height = 8;
	const bufferX = Math.floor(columns / 2 - width / 2);
	const bufferY = Math.floor(rows / 2 - height / 2);
	const manager = new BufferManager();
	const buffer = manager.new(bufferX, bufferY, width, height, 'one');
	const second = manager.new(bufferX + 20, bufferY + 3, width, height, 'one', 1);
	const other = manager.new(bufferX - 5, bufferY - 3, width, height, 'two');

	const bleh = [
		'00000000000',
		'00000000000',
		'00000000000',
		'00000000000',
		'00000000000',
	];
	buffer.outline('green');
	second.outline('blue');
	other.outline('red');
	manager.setFg('magenta');
	for (let i = 0; i < bleh.length; i++)
		buffer.draw(bleh[i], 15, 3 + i);
	buffer.render();
	manager.setFg('yellow');
	for (let i = 0; i < bleh.length; i++)
		second.draw(bleh[i], 1, 1 + i);
	second.render();
	await wait(1000);
	manager.switch('two');
	await wait(1000);
	manager.switch('one');


	stdout.cursorTo(0, rows - 2); // move cursor
	stdout.write('\x1b[?25h\x1b[0m'); // show cursor
}

async function test4() {
	stdout.write('\x1b[2J'); // clear screen
	stdout.write('\x1b[?25l'); // hide cursor
	const width = process.stdout.columns;
	const height = process.stdout.rows;
	const manager = new BufferManager();
	const buffer = manager.new(0, 0, width, height);
	buffer.fill('red').simpleRender();

	const bleh = [
		'00000000000',
		'00000000000',
		'00000000000',
		'00000000000',
		'00000000000',
	];
	function drawThing(x, y) {
		buffer.fill('red');
		manager.setFg('white');
		for (let i = 0; i < bleh.length; i++)
			buffer.draw(bleh[i], x, y + i);
		buffer.simpleRender();
	}
	let blehX = 0;
	let blehY = 0;
	drawThing(0,0);

	let x = 0;
	const interval = setInterval(() => {
		if (x == width - bleh[0].length - 3) x = 0;
		drawThing(x, 10);
		x += 2;
	}, 3);

	const keypress = require('keypress');
	keypress(process.stdin);
	process.stdin.setRawMode(true);

	process.stdin.on('keypress', function(chunk, key) {
		const keyPressed = (key == undefined) ? chunk : key.name;
		switch (keyPressed) {
			case 'escape':
				stdout.cursorTo(0, rows - 2);
				stdout.write('\x1b[?25h\x1b[0m'); // show cursor
				process.exit();
		}
	});
}
// test();
test2();
// test3();
// test4();
