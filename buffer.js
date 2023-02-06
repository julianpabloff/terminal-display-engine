const BufferManager = function() {
	this.sortedIndex = function(array, value) {
		let low = 0;
        let high = array.length;
		while (low < high) {
			const mid = (low + high) >>> 1;
			if (array[mid].zIndex < value) low = mid + 1;
			else high = mid;
		}
		return low;
	}
	this.screens = {};
	this.enforceScreens = false;
	let idIncrement = 0;
	const newID = () => { idIncrement++; return idIncrement }
	this.new = function(x, y, width, height, zIndex = 0, screen = 'main') {
		if (!this.screen) this.screen = screen;
		if (!this.screens[screen]) this.screens[screen] = [];
		const zArray = this.screens[screen];
		const buffer = new DisplayBuffer(x, y, width, height, this, screen, zIndex);
		buffer.id = newID();
		if (zArray.length > 0) zArray.splice(this.sortedIndex(zArray, zIndex), 0, buffer);
		else zArray.push(buffer);
		return buffer;
	}
	this.setSize = function() {
		screenWidth = process.stdout.columns;
		screenSize = screenWidth * process.stdout.rows;
		this.codes = new Uint16Array(screenSize);
		this.colors = new Uint8Array(screenSize);
		this.allScreenCodes = new Uint16Array(screenSize);
		this.allScreenColors = new Uint8Array(screenSize);
		this.allScreenZIndeces = new Uint8Array(screenSize);
	}
	let screenWidth, screenSize;
	this.setSize();
	this.save = function(code, color, x, y) {
		const index = y * screenWidth + x;
		this.codes[index] = code;
		this.colors[index] = color;
	}
	this.saveAllScreen = function(code, color, x, y, zIndex) {
		const index = y * screenWidth + x;
		this.allScreenCodes[index] = code;
		this.allScreenColors[index] = color;
		this.allScreenZIndeces[index] = zIndex;
	}
	this.switch = function(screen) {
		for (const buffer of this.screens[this.screen]) {
			if (!buffer.empty) buffer.hide();
			if (buffer.outlined) buffer.outline.hide();
		}
		this.screen = screen;
		for (const buffer of this.screens[screen]) {
			if (buffer.outlined) buffer.outline();
			if (buffer.hidden) buffer.show();
		}
	}
	this.logScreens = function() {
		console.log(this.screens);
	}
	this.logScreen = function(screen) {
		console.log(this.gatherBuffersOnScreen(screen));
	}

	// Colors
	this.color = 0;
	this.lastRenderedColor = 0;
	this.lastRenderedLocation = {x: 0, y: 0};
	this.colorMap = { none: 0, black: 1, red: 2, green: 3, yellow: 4, blue: 5, magenta: 6, cyan: 7, white: 8 };
	this.setFg = function(color) {
		const fgCode = this.colorMap[color];
		this.color = (fgCode << 4) + (this.color & 0x0F);
		return this.color;
	}
	this.setBg = function(color) {
		const bgCode = this.colorMap[color];
		this.color = (this.color & 0xF0) + bgCode;
		return this.color;
	}
	this.setColor = function(foreground, background) {
		const fgCode = this.colorMap[foreground];
		const bgCode = this.colorMap[background];
		this.color = (fgCode << 4) + bgCode;
		return this.color;
	}
	this.setColorCode = code => this.color = code;
	this.resetColor = function() {
		this.color = 0;
	}
	this.fgToString = code => '\x1b[' + (29 + code).toString() + 'm';
	this.bgToString = code => '\x1b[' + (39 + code).toString() + 'm';
	this.resetColorString = '\x1b[0m';
	this.moveCursorString = (x, y) => '\x1b[' + (y + 1).toString() + ';' + (x + 1).toString() + 'H'

	this.gatherBuffersOnScreen = function(screen = this.screen) {
		const screenArray = this.screens[screen];
		const allScreen = this.screens['all'];
		let zArray = [];
		for (const buffer of screenArray) zArray.push(buffer);
		if (allScreen)
			for (const buffer of allScreen)
				zArray.splice(this.sortedIndex(zArray, buffer.zIndex), 0, buffer);
		return zArray;
	}
	// Other Buffers
	this.somethingAbove = function(target, x, y) {
		const zArray = this.gatherBuffersOnScreen();
		if (zArray.length < 2) return false;
		let found = false;
		let output = { code: 0, fg: 0, bg: 0 };
		for (const buffer of zArray) {
			const index = buffer.screenToIndex(x, y);
			if (found && index != null) {
				const code = buffer.previous[index];
				const color = buffer.prevColors[index];
				const fg = color >> 4; const bg = color & 0x0F;
				if (code) output.code = code;
				if (fg) output.fg = fg;
				if (bg) output.bg = bg;
			}
			if (buffer.id == target.id) found = true;
		}
		if (output.code || output.fg || output.bg) return output;
		return false;
	}
	this.somethingBelow = function(target, x, y) {
		const zArray = this.gatherBuffersOnScreen();
		if (zArray.length < 2) return false;
		let found = false;
		let output = { code: 0, fg: 0, bg: 0 };
		for (let i = zArray.length - 1; i >= 0; i--) {
			const buffer = zArray[i];
			const index = buffer.screenToIndex(x, y);
			if (found && index != null) {
				const code = buffer.previous[index];
				const color = buffer.prevColors[index];
				const fg = color >> 4; const bg = color & 0x0F;
				if (code && !output.code) output.code = code;
				if (fg && !output.fg) output.fg = fg;
				if (bg && !output.bg) output.bg = bg;
				// else if (!buffer.transparent) return false;
			}
			if (buffer.id == target.id) found = true; 
		}
		if (output.code || output.fg || output.bg) return output;
		return false;
	}
	this.generateSavedScreen = function(screen = this.screen) {
		const start = Date.now();
		const zArray = this.gatherBuffersOnScreen(screen);
		const output = [];
		this.setSize();
		for (let i = 0; i < screenSize; i++) {
			const x = i % screenWidth; const y = Math.floor(i / screenWidth);
			let bufferFound = false;
			let allBufferFound = false;
			const point = { code: 0, fg: 0, bg: 0 };
			const allPoint = { code: 0, fg: 0, bg: 0, zIndex: 0 };
			for (let j = zArray.length - 1; j >= 0; j--) {
				const buffer = zArray[j];
				const index = buffer.screenToIndex(x, y);
				if (index == null) continue;
				const code = buffer.current[index];
				const color = buffer.colors[index];
				buffer.previous[index] = code;
				buffer.prevColors[index] = color;
				if (!code && !color) continue;
				if (code && !point.code) {
					point.code = code;
					this.codes[i] = code;
				}
				if (color && !this.colors[i]) this.colors[i] = color;
				const fg = color >> 4; const bg = color & 0x0F;
				if (fg && !point.fg) point.fg = fg;
				if (bg && !point.bg) point.bg = bg;
				if (buffer.screen == 'all' && !allBufferFound) {
					if (code && !allPoint.code) {
						allPoint.code = code;
						allPoint.zIndex = buffer.zIndex;
					}
					if (fg && !allPoint.fg) allPoint.fg = fg;
					if (bg && !allPoint.bg) allPoint.bg = bg;
					allBufferFound = allPoint.code && allPoint.fg && allPoint.bg;
				}
				bufferFound = point.code && point.fg && point.bg;
				if (bufferFound && allBufferFound) {
					break;
				}
			}
			const outputColor = (point.fg << 4) + point.bg;
			this.addToOutput(output, point.code, outputColor, x, y);
			this.allScreenCodes[i] = allPoint.code;
			this.allScreenColors[i] = (allPoint.fg << 4) + allPoint.bg
			this.allScreenZIndeces[i] = allPoint.zIndex;
		}
		for (const buffer of zArray) buffer.clearDraw();
		process.stdout.write(output.join(''));
	}
	this.preRenderNew = function(screen) {
		const zArray = this.gatherBuffersOnScreen(screen);
		const newCodes = new Uint16Array(screenSize);
		const newColors = new Uint8Array(screenSize);
		const output = [];
		for (let i = 0; i < screenSize; i++) {
			const x = i % screenWidth; const y = Math.floor(i / screenWidth);
			const point = { code: 0, fg: 0, bg: 0};
			const codeOnScreen = this.codes[i];
			const colorOnScreen = this.colors[i];
			let somethingHere = false;
			for (let j = zArray.length - 1; j >= 0; j--) {
				const buffer = zArray[j];
				const index = buffer.screenToIndex(x, y);
				if (index == null) continue;
				let code, color;
				if (buffer.screen == 'all') {
					code = buffer.previous[index];
					color = buffer.prevColors[index];
				} else {
					code = buffer.current[index];
					color = buffer.colors[index];
				}
				buffer.previous[index] = code;
				buffer.prevColors[index] = color;
				if (!code && !color) continue;
				somethingHere = true;
				if (code && !point.code) point.code = code;
				const fg = color >> 4; const bg = color & 0x0F;
				if (fg && !point.fg) point.fg = fg;
				if (bg && !point.bg) point.bg = bg;
				if (point.code && point.fg && point.bg) break;
			}
			if (point.code || point.fg || point.bg) {
				const outputColor = (point.fg << 4) + point.bg;
				newCodes[i] = point.code;
				newColors[i] = outputColor;
				this.addToOutput(output, point.code, outputColor, x, y);
			} else if (codeOnScreen) {
				this.addToOutput(output, 32, 0, x, y);
			}
		}
		for (const buffer of zArray) buffer.clearDraw();
		this.codes = new Uint16Array(newCodes);
		this.colors = new Uint8Array(newColors);
		this.screen = screen;
		process.stdout.write(output.join(''));
	}
	// Still need to update this in the same way
	this.preRender = function(screen) {
		const zArray = this.gatherBuffersOnScreen(screen);
		const output = [];
		const newCodes = new Uint16Array(screenSize);
		const newColors = new Uint8Array(screenSize);
		for (let i = 0; i < screenSize; i++) {
			const x = i % screenWidth; const y = Math.floor(i / screenWidth);
			const codeOnScreen = this.codes[i];
			const colorOnScreen = this.colors[i];
			const allScreenCode = this.allScreenCodes[i];
			const allScreenColor = this.allScreenColors[i];
			const allScreenZIndex = this.allScreenZIndeces[i];
			let bufferHere = false;
			const point = { code: 0, fg: 0, bg: 0 };
			for (let j = zArray.length - 1; j >= 0; j--) {
				const buffer = zArray[j];
				const index = buffer.screenToIndex(x, y);
				if (index == null) continue;
				// if (buffer.zIndex < allScreenZIndex)
				let code, color;
				if (buffer.screen == 'all') {
					code = buffer.previous[index];
					color = buffer.prevColors[index];
				} else {
					code = buffer.current[index];
					color = buffer.colors[index];
				}
				if (!code && !color) continue;
				if (code && !point.code) point.code = (false) ? allScreenCode : code;
				if (color && !newColors[i]) newColors[i] = (false) ? allScreenColor : color;
				const fg = color >> 4; const bg = color & 0x0F;
				if (fg && !point.fg) point.fg = fg;
				if (bg && !point.bg) point.bg = bg;
				buffer.previous[index] = code;
				buffer.prevColors[index] = color;
				newCodes[i] = code;
				newColors[i] = color;
				bufferHere = true;
				if (point.code && point.fg && point.bg) break;
			}
			if (point.code || point.fg || point.bg) {
				const outputColor = (point.fg << 4) + point.bg;
				this.addToOutput(output, point.code, outputColor, x, y);
			}
			if (codeOnScreen) {
				if (!bufferHere) {
					if (allScreenCode && (allScreenCode != codeOnScreen || allScreenColor != colorOnScreen)) {
						newCodes[i] = allScreenCode;
						newColors[i] = allScreenColor;
					} else if (!allScreenCode) {
						newCodes[i] = 0;
						newColors[i] = 0;
					}
				}
			}
		}
		for (const buffer of zArray) if (buffer.screen != 'all') buffer.clearDraw();
		this.codes = new Uint16Array(newCodes);
		this.colors = new Uint8Array(newColors);
		this.screen = screen;
		process.stdout.write(output.join(''));
	}
	this.addToOutput = function(output, code, color, x, y) {
		const fgCode = color >> 4;
		const bgCode = color & 0x0F;
		if (color != this.lastRenderedColor) {
			if (fgCode == 0 || bgCode == 0) output.push(this.resetColorString);
			if (fgCode > 0) output.push(this.fgToString(fgCode));
			if (bgCode > 0) output.push(this.bgToString(bgCode));
		}
		const char = String.fromCharCode(code);
		const last = this.lastRenderedLocation;
		if (!(last.y == y && last.x == x - 1)) output.push(this.moveCursorString(x, y));
		output.push(char);
		this.lastRenderedColor = color;
		this.lastRenderedLocation = {x: x, y: y};
	}
	this.somethingHere = function(screen, x, y, previous = true) {
		const zArray = this.gatherBuffersOnScreen(screen);
		for (let i = zArray.length - 1; i >= 0; i--) {
			const buffer = zArray[i];
			const index = buffer.screenToIndex(x, y);
			if (index != null) {
				const code = previous ? buffer.previous[index] : buffer.current[index];
				const color = previous ? buffer.prevColors[index] : buffer.colors[index];
				if (code != 0 || color != 0) return { char: code, color: color, buffer: buffer, index: index };
			}
		}
		return false;
	}
	this.paintSavedScreen = function() {
		const output = [];
		for (let i = 0; i < screenSize; i++) {
			const x = i % screenWidth; const y = Math.floor(i / screenWidth);
			this.addToOutput(output, this.codes[i], this.colors[i], x, y);
		}
		process.stdout.write(output.join(''));
	}
}

const DisplayBuffer = function(x, y, width, height, manager, screen, zIndex = 0) {
	this.outlined = false;
	this.screen = screen;
	this.zIndex = zIndex;
	this.transparent = true;

	this.reset = function() {
		this.current = new Uint16Array(this.size);
		this.previous = new Uint16Array(this.size);
		this.colors = new Uint8Array(this.size);
		this.prevColors = new Uint8Array(this.size);
		this.changed = false;
	}
	// this.reset();

	this.setSize = function(x, y, width, height) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.end = width - 1;
		this.bottom = height - 1;
		this.size = width * height;
		this.empty = true;
		this.reset();
	}
	this.setSize(x, y, width, height);

	// Coordinates
	this.coordinateIndex = (x, y) => (y * this.width) + x; // buffer x & y to buffer array index
	this.indexToScreen = index => { return {x: this.x + (index % this.width), y: this.y + Math.floor(index / this.width)} }
	this.screenToIndex = function(x, y) {
		if (x < this.x || x >= this.x + this.width || y < this.y || y >= this.y + this.height) return null;
		return ((y - this.y) * this.width) + x - this.x;
	}

	// Writing to buffer
	let cursorIndex = 0;
	this.print = function(string, index, fg = false, bg = false) {
		if (fg) manager.setFg(fg);
		if (bg) manager.setBg(bg);
		for (let i = 0; i < string.length; i++) {
			this.current[index + i] = string.charCodeAt(i);
			this.colors[index + i] = manager.color;
		}
		cursorIndex = index + string.length;
		// if (cursorIndex > this.size) cursorIndex = this.size;
		if (cursorIndex > this.size) cursorIndex = 0;
		this.changed = true;
	}
	this.cursorTo = (x, y) => cursorIndex = this.coordinateIndex(x, y);
	this.write = function(string, fg = false, bg = false) {
		this.print(string, cursorIndex, fg, bg);
		return this;
	}
	this.draw = function(string, x, y, fg = false, bg = false) {
		const index = this.coordinateIndex(x, y);
		this.print(string, index, fg, bg);
		return this;
	}
	this.erase = function(x, y, count = 1) {
		const index = this.coordinateIndex(x, y);
		for (let i = 0; i < count; i++) {
			this.current[index + i] = 0;
			this.colors[index + i] = 0;
		}
		return this;
	}

	// Rendering buffer
	function drawToScreen(string, x, y) {
		process.stdout.cursorTo(x, y);
		process.stdout.write(string);
	}
	this.moveToPrevious = function(index, code, color) {
		this.current[index] = 0;
		this.colors[index] = 0;
		this.previous[index] = code;
		this.prevColors[index] = color;
	}
	this.render = function(clearLastFrame = true) {
		if (!this.changed) return;
		const output = [];
		for (let i = 0; i < this.size; i++) {
			let code = this.current[i];
			let colorCode = this.colors[i];
			const prevCode = this.previous[i];
			const prevColorCode = this.prevColors[i];
			if (!clearLastFrame && code == 0 && prevCode != 0) {
				code = prevCode;
				colorCode = prevColorCode;
			}
			const screenLocation = this.indexToScreen(i);
			const x = screenLocation.x; const y = screenLocation.y;
			let drawingCode = code;
			let drawingColorCode = colorCode;
			if (code == 0) {// && clearLastFrame) {
				const below = manager.somethingBelow(this, x, y);
				if (below) {
					drawingCode = below.code;
					drawingColorCode = (below.fg << 4) + below.bg;
				} else {
					if (!this.transparent) code = 32;
					drawingCode = 32;
					drawingColorCode = 0;
				}
			} else if ((colorCode & 0x0F) == 0) { // Character present but no background color
				const below = manager.somethingBelow(this, x, y);
				if (below) drawingColorCode = (drawingColorCode & 0xF0) + below.bg;
			}
			const bufferOnActiveScreen = !(manager.enforceScreens && manager.screen != this.screen);
			const differentThanPrev = code != prevCode || colorCode != prevColorCode;
			const above = manager.somethingAbove(this, x, y);
			if (bufferOnActiveScreen && differentThanPrev) {
				let draw = !above.code;
				if (above.code && !above.bg) {
					drawingCode = above.code;
					// Uses the code and color of the above point, but preserves the background of this buffer's point
					drawingColorCode = (above.fg << 4) + (drawingColorCode & 0x0F);
					draw = true;
				}
				if (draw) {
					manager.addToOutput(output, drawingCode, drawingColorCode, x, y);
					manager.save(drawingCode, drawingColorCode, x, y);
				}
			}
			if (this.screen == 'all' && differentThanPrev)
				manager.saveAllScreen(drawingCode, drawingColorCode, x, y, this.zIndex);
			this.moveToPrevious(i, code, colorCode);
		}
		this.changed = false;
		if (true) process.stdout.write(output.join(''));
		return this;
	}
	// For adding to the canvas without it clearing
	this.paint = function() {
		this.render(false);
		return this;
	}
	this.fill = function(color, char = ' ', foreground = null) {
		this.current.fill(char.charCodeAt(0));
		manager.setBg(color);
		if (foreground) manager.setFg(foreground);
		this.colors.fill(manager.color);
		this.changed = true;
		return this;
	}
	this.fillPrevious = function(color, char = ' ', foreground = null) {
		this.previous.fill(char.charCodeAt(0));
		manager.setBg(color);
		if (foreground) manager.setFg(foreground);
		this.prevColors.fill(manager.color);
		return this;
	}

	// Saving buffer and reading from the save
	let savedBuffer, savedColors;
	this.save = function() {
		savedBuffer = new Uint16Array(this.current);
		for (let i = 0; i < this.size; i++) {
			if (savedBuffer[i] == 0) savedBuffer[i] = 32;
		}
		savedColors = new Uint8Array(this.colors);
		return this;
	}
	const colorLookup = ['none', 'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
	this.read = function(x, y) {
		const index = this.coordinateIndex(x, y);
		const colorCode = savedColors[index];
		return {
			char: String.fromCharCode(savedBuffer[index]),
			fg: colorLookup[colorCode >> 4],
			bg: colorLookup[colorCode & 0x0F]
		};
		return this;
	}
	this.load = function() {
		this.current = new Uint16Array(savedBuffer);
		this.colors = new Uint8Array(savedColors);
		this.changed = true;
		return this;
	}
	this.loadArea = function(x, y, width = 1, height = 1) {
		const area = width * height;
		let index = this.coordinateIndex(x, y);
		let i = 0;
		do {
			this.current[index] = savedBuffer[index];
			this.colors[index] = savedColors[index];
			i++;
			if (i % width == 0) index = this.coordinateIndex(x, y + (i / width));
			else index++;
		} while (i < area);
		this.changed = true;
		return this;
	}
	let hideBuffer, hideColors;
	this.hidden = false;
	this.hide = function() {
		hideBuffer = new Uint16Array(this.previous);
		hideColors = new Uint8Array(this.prevColors);
		this.clear();
		this.hidden = true;
	}
	this.show = function() {
		this.current = new Uint16Array(hideBuffer);
		this.colors = new Uint8Array(hideColors);
		this.render();
		this.hidden = false;
	}
	// Empties current drawing buffers
	this.clearDraw = function() {
		this.current = new Uint16Array(this.size);
		this.colors = new Uint8Array(this.size);
		this.changed = false;
	}
	this.clear = function(render = false) {
		this.clearDraw();
		this.render();
		this.empty = true;
	}
	// Only meant to be used for when the screen dimensions change
	this.move = function(x, y) {
		const wasOutlined = this.outlined;
		const tempBuffer = new Uint16Array(this.previous);
		const tempColorBuffer = new Uint8Array(this.prevColors);
		if (!this.hidden) this.clear();
		if (wasOutlined) this.outline('none', false);
		this.current = tempBuffer;
		this.colors = tempColorBuffer;
		this.changed = true;
		this.x = x; this.y = y;
		if (!this.hidden) {
			this.render();
			if (wasOutlined) this.outline(outlineColor);
		}
	}
	this.simpleMove = (x, y) => { this.x = x; this.y = y }

	this.roll = function(amount) {
		this.size += this.width * amount;
	}

	// These parameters are all deltas. Width/height gets added to right/bottom
	this.transform = function(top, right = 0, bottom = 0, left = 0) {
		const newX = this.x - left;
		const newY = this.y - top;
		const newW = this.width + left + right;
		const newH = this.height + top + bottom;
		for (let i = 0; i < this.size; i++) {
			const screenLocation = this.indexToScreen(i);
			const x = screenLocation.x; const y = screenLocation.y;
			const localX = i % this.width;
			const localY = Math.floor(i / this.width);
			if (x < newX || x > newX + newW - 1 || y < newY || y > newY + newH - 1) {
				this.current[i] = 0;
				this.colors[i] = 0;
			} else {
				this.current[i] = this.previous[i];
				this.colors[i] = this.prevColors[i];
			};
		}
		this.render();
		const tempBuffer = new Uint16Array(this.previous);
		const tempColorBuffer = new Uint8Array(this.prevColors);
		
	}
	this.randomFill = function() {
		for (let i = 0; i < this.size; i++) {
			const random = Math.random() * 50 + 65;
			const char = String.fromCharCode(random);
			this.draw(char, i % this.width, Math.floor(i / this.width));
		}
		this.render();
	}

	// For seeing where it is
	let outlineColor = 'none';
	this.outline = function(color = outlineColor, draw = true) {
		if (this.screen == manager.screen) {
			const fgCode = manager.colorMap[color];
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
			manager.lastRenderedColor = manager.setColor(color, 'none');
		}
		this.outlined = draw;
		if (draw) outlineColor = color;
	}
	this.outline.clear = () => {
		if (this.outlined) this.outline('none', false);
	}
	this.outline.hide = () => {
		this.outline.clear();
		this.outlined = true;
	}
	this.enablePixels = function() {
		const PixelEngine = require('./pixels.js');
		this.pixel = new PixelEngine(manager, this);
	}
}

module.exports = BufferManager;
