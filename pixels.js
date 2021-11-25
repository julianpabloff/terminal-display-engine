const PixelEngine = function(manager, buffer) {
	// const grid = [
	// 	[2, 3, 5, 0, 7, 3],
	// 	[6, 5, 0, 4, 2, 8],
	// ];
	// [▀,▀,▀, ],
	// [ , , , ]
	this.size = buffer.size * 2;
	this.grid = new Uint8Array(this.size);
	this.drawGrid = function(grid, x, y) {
		const output = [];
		for (let y = 0; y < grid.length; y++) {
			const row = grid[y];
			const starting = y % 2 == 0;
			if (starting) output.push([]);
			for (let x = 0; x < row.length; x++) {
				const pixel = row[x];
				const outputIndex = Math.floor(y / 2);
				if (starting) {
					const item = {};
					if (pixel) item.char = '▀';
					else item.char = ' ';
					item.color = pixel << 4;
					output[outputIndex].push(item);
				} else if (pixel) {
					const item = output[outputIndex][x];
					const color = item.color;
					if (color == 0) {
						item.char = '▄';
						item.color = pixel << 4;
					} else item.color = (color & 0xF0) + pixel;
				}
			}
		}
		// return output;
		// process.stdout.cursorTo(0,5);
		// console.log(output);
		let i = 0;
		lastColor = manager.setColorCode(output[0][0].color);
		manager.setColorCode(lastColor);
		for (const pixelArray of output) {
			buffer.cursorTo(x, y + i);
			for (let pixelPair of pixelArray) {
				const color = pixelPair.color;
				if (color != lastColor) {
					manager.setColorCode(color);
					lastColor = color;
				}
				buffer.write(pixelPair.char);
			}
			i++;
		}
		// buffer.render();
		return buffer;
	}
	const colors = { reset: 0, black: 1, red: 2, green: 3, yellow: 4, blue: 5, magenta: 6, cyan: 7, white: 8 };
	const coordinateIndex = (x, y) => (y * buffer.width) + x; // grid x & y to grid array index
	this.draw = function(grid, x, y, invert = false) {
		const width = grid[0].length;
		const height = grid.length;
		for (let i = 0; i < height; i++) {
			const gridIndex = invert ? height - i - 1 : i;
			const index = coordinateIndex(x, y + i);
			for (let j = 0; j < width; j++) {
				const rowIndex = invert ? width - j - 1 : j;
				this.grid[index + j] = grid[gridIndex][rowIndex];
			}
		}
	}
	this.apply = function() {
		const output = [];
		for (let i = 0; i < this.size; i += buffer.width) {
			const starting = i % (buffer.width * 2) == 0;
			if (starting) output.push([]);
			const outputIndex = Math.floor(i / (buffer.width * 2));
			for (let j = 0; j < buffer.width; j++) {
				const pixel = this.grid[i + j];
				if (starting) {
					const item = {};
					if (pixel) item.char = '▀';
					else item.char = ' ';
					item.color = pixel << 4;
					output[outputIndex].push(item);
				} else if (pixel) {
					const item = output[outputIndex][j];
					const color = item.color;
					if (color == 0) {
						item.char = '▄';
						item.color = pixel << 4;
					} else item.color = (color & 0xF0) + pixel;
				}
			}
		}
		let i = 0;
		lastColor = manager.setColorCode(output[0][0].color);
		manager.setColorCode(lastColor);
		buffer.cursorTo(0,0);
		for (const pixelArray of output) {
			for (let pixelPair of pixelArray) {
				const color = pixelPair.color;
				if (color != lastColor) {
					manager.setColorCode(color);
					lastColor = color;
				}
				buffer.write(pixelPair.char);
			}
			i++;
		}
	}
	this.fill = (color) => this.grid.fill(colors[color]);
}

module.exports = PixelEngine;
