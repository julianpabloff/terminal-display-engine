const BufferManager = function() {
	function sortedIndex(array, value) {
		let low = 0;
        let high = array.length;
		while (low < high) {
			const mid = (low + high) >>> 1;
			if (array[mid].zIndex < value) low = mid + 1;
			else high = mid;
		}
		return low;
	}
	this.zArray = [];
	this.newBuffer = function(x, y, width, height, zIndex = 0) {
		const newBuffer = new DisplayBuffer(x, y, width, height, this, zIndex);
		const bufferObj = newBuffer;
		if (this.zArray.length > 0) this.zArray.splice(sortedIndex(this.zArray, zIndex), 0, bufferObj);
		else this.zArray.push(bufferObj);
		return newBuffer;
	}
	this.somethingAbove = function(target, x, y) {
		let found = false;
		for (const buffer of this.zArray) {
			const index = buffer.screenToIndex(x, y);
			if (found && index != null) {
				if (buffer.previous[index] == undefined) return false;
				if (buffer.previous[index] != 0) return true;
			}
			if (buffer.id == target.id) found = true;
		}
		return false;
	}

	// Colors
	this.color = 0;
	this.colors = { reset: 0, black: 1, red: 2, green: 3, yellow: 4, blue: 5, magenta: 6, cyan: 7, white: 8 };
	this.setFg = function(color) {
		const fgCode = this.colors[color];
		this.color = (fgCode << 4) + (this.color & 0x0F);
	}
	this.setBg = function(color) {
		const bgCode = this.colors[color];
		this.color = (this.color & 0xF0) + bgCode;
	}
	this.setColor = function(foreground, background) {
		const fgCode = this.colors[foreground];
		const bgCode = this.colors[background];
		this.color = (fgCode << 4) + bgCode;
	}
	this.resetColor = function() {
		this.color = 0;
	}
}

const crypto = require('crypto');
const DisplayBuffer = function(x, y, width, height, manager, zIndex = 0) {
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
	this.size = width * height;
	this.empty = true;
	this.outlined = false;
	this.zIndex = zIndex;
	this.id = crypto.randomBytes(32);

	function bufferWithSpaces(size) {
		let buffer = new Uint16Array(size);
		return buffer.fill(32);
	}
	// this.current = bufferWithSpaces(this.size);
	// this.previous = bufferWithSpaces(this.size);
	this.current = new Uint16Array(this.size);
	this.previous = new Uint16Array(this.size);
	this.colors = new Uint8Array(this.size);
	this.prevColors = new Uint8Array(this.size);

	// Coordinates
	this.coordinateIndex = (x, y) => (y * this.width) + x; // buffer x & y to buffer array index
	this.indexToScreen = (index) => { return {x: this.x + (index % this.width), y: this.y + Math.floor(index / this.width)} }
	this.screenToIndex = function(x, y) {
		if (this.outlined)
			if (x < this.x - 1 || x > this.x + width || y < this.y - 1 || y > this.y + this.height) return null;
		else
			if (x < this.x || x >= this.x + this.width || y < this.y || y >= this.y + this.height) return null;
		return ((y - this.y) * this.width) + x - this.x;
	}

	// Writing to buffer
	let cursorIndex = 0;
	this.print = function(string, index) {
		for (let i = 0; i < string.length; i++) {
			this.current[index + i] = string.charCodeAt(i);
			this.colors[index + i] = manager.color;
		}
		cursorIndex = index + string.length;
		if (cursorIndex > this.size) cursorIndex = this.size;
	}
	this.cursorTo = function(x, y) {
		cursorIndex = this.coordinateIndex(x, y);
	}
	this.write = function(string) {
		this.print(string, cursorIndex);
	}
	this.draw = function(string, x, y) {
		const index = this.coordinateIndex(x, y);
		this.print(string, index);
	}
	this.erase = function(x, y, count = 1) {
		const index = this.coordinateIndex(x, y);
		for (let i = 0; i < count; i++) {
			this.current[index + i] = 0;
			this.colors[index + i] = 0;
		}
	}

	// Rendering buffer
	function drawToScreen(string, x, y) {
		process.stdout.cursorTo(x, y);
		process.stdout.write(string);
	}
	let drawCount = 0;
	let colorChangeCount = 0;
	let currentColor = { fg: 0, bg: 0 };
	this.render = function(clearLastFrame = true, debug = false) {
		for (let i = 0; i < this.size; i++) {
			const screenLocation = this.indexToScreen(i);
			let code = this.current[i];
			const prevCode = this.previous[i];
			const colorCode = this.colors[i];
			const prevColorCode = this.prevColors[i];
			if (code == 0 && clearLastFrame) {
				code = 32;
			}
			if (code != prevCode || colorCode != prevColorCode) {
				if (!manager.somethingAbove(this, screenLocation.x, screenLocation.y)) {
					const fgCode = colorCode >> 4;
					const bgCode = colorCode & 0x0F;
					if (fgCode != currentColor.fg || bgCode != currentColor.bg) {
						if (fgCode == 0 || bgCode == 0) {
							process.stdout.write('\x1b[0m');
							currentColor.fg = currentColor.bg = 0;
						}
						if (fgCode > 0) {
							process.stdout.write('\x1b[' + (29 + fgCode).toString() + 'm');
							currentColor.fg = fgCode;
						}
						if (bgCode > 0) {
							process.stdout.write('\x1b[' + (39 + bgCode).toString() + 'm');
							currentColor.bg = bgCode;
						}
					}
					drawToScreen(String.fromCharCode(code), screenLocation.x, screenLocation.y);
					drawCount++;
				}
			}
			this.current[i] = 0;
			this.previous[i] = code;
			this.colors[i] = 0;
			this.prevColors[i] = colorCode;
		}
		if (debug) {
			drawToScreen('                ', this.x, this.y - 2);
			drawToScreen('painted ' + drawCount.toString() + ' chars', this.x, this.y - 2);
			drawToScreen('                          ', this.x, this.y + this.height + 1);
			drawToScreen('changed color ' + colorChangeCount.toString() + ' times', this.x, this.y + this.height + 1);
		}
		if (drawCount > 0) this.empty = false;
		drawCount = 0;
		colorChangeCount = 0;
	}
	this.paint = () => this.render(false); // For adding to the canvas without it clearing
	this.fill = function(color, char = ' ') {
		this.current.fill(char.charCodeAt(0));
		manager.setBg(color);
		this.colors.fill(manager.color);
	}

	// Saving buffer and reading from the save
	let savedBuffer, savedColors;
	this.save = function() {
		savedBuffer = new Uint16Array(this.current);
		for (let i = 0; i < this.size; i++) {
			if (savedBuffer[i] == 0) savedBuffer[i] = 32;
		}
		savedColors = new Uint8Array(this.colors);
	}
	const colorLookup = ['reset', 'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
	this.read = function(x, y) {
		const index = this.coordinateIndex(x, y);
		const colorCode = savedColors[index];
		return {
			char: String.fromCharCode(savedBuffer[index]),
			fg: colorLookup[colorCode >> 4],
			bg: colorLookup[colorCode & 0x0F]
		};
	}
	this.load = function() {
		this.current = new Uint16Array(savedBuffer);
		this.colors = new Uint8Array(savedColors);
		this.render();
	}

	this.clear = function() {
		this.current = bufferWithSpaces(this.size);
		this.colors = new Uint16Array(this.size);
		this.render();
		this.empty = true;
		if (this.outlined) this.outline('reset', false);
	}
	// Only meant to be used for when the screen dimensions change
	this.move = function(x, y) {
		const wasOutlined = this.outlined;
		const tempBuffer = new Uint16Array(this.previous);
		const tempColorBuffer = new Uint8Array(this.prevColors);
		this.clear();
		if (wasOutlined) this.outline('reset', false);
		this.current = tempBuffer;
		this.colors = tempColorBuffer;
		this.x = x; this.y = y;
		this.render();
		if (wasOutlined) this.outline(outlineColor);
	}

	// For seeing where it is
	let outlineColor = 'reset';
	this.outline = function(color = 'reset', draw = true) {
		const fgCode = manager.colors[color];
		process.stdout.write('\x1b[0m');
		process.stdout.write('\x1b[' + (29 * (fgCode != 0) + fgCode).toString() + 'm');
		const sq = draw ?
			{tl: '┌', h: '─', tr: '┐', v: '│', bl: '└', br: '┘'}:
			{tl: ' ', h: ' ', tr: ' ', v: ' ', bl: ' ', br: ' '};
		drawToScreen(sq.tl + sq.h.repeat(this.width) + sq.tr, this.x - 1, this.y - 1);
		for (let i = 0; i < this.height; i++) {
			drawToScreen(sq.v, this.x - 1, this.y + i);
			drawToScreen(sq.v, this.x + this.width, this.y + i);
		}
		drawToScreen(sq.bl + sq.h.repeat(this.width) + sq.br, this.x - 1, this.y + this.height);
		this.outlined = draw;
		if (draw) outlineColor = color;
		currentColor = { fg: fgCode, bg: 0 };
	}
	this.outline.clear = () => {
		if (this.outlined) this.outline('reset', false);
	}
}

module.exports = BufferManager;
// module.exports.BufferManager = BufferManager;
// module.exports.DisplayBuffer = DisplayBuffer;
