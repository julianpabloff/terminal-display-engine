const PixelBuffer = function(x, y, width, height, manager, zIndex = 0) {
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
	this.size = width * height;

	this.grid = new Uint8Array(this.size);

	const coordinateIndex = (x, y) => (y * this.width) + x;
	const colors = { reset: 0, black: 1, red: 2, green: 3, yellow: 4, blue: 5, magenta: 6, cyan: 7, white: 8 };
	this.draw = function(color, x, y) {
		this.grid[coordinateIndex(x, y)] = colors[color];
		console.log(this.grid);
	}
}

module.exports = PixelBuffer;
