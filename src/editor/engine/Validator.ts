// @ts-nocheck
export const ValidatorMixin = {
    checkForErrors() {
        if (!this.showErrors) return;

        this.errorTiles.clear();

        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                if (this._validateTileAt(x, y)) {
                    this.errorTiles.add(`${x},${y}`);
                }
            }
        }
    },

    recalculateErrors() {
        this.errorTiles.clear();
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                if (this._validateTileAt(x, y)) {
                    this.errorTiles.add(`${x},${y}`);
                }
            }
        }
        this._errorsDirty = false;
    },

    /**
     * Internal helper to validate a single tile position.
     * Returns true if the tile has a connectivity error.
     */
    _validateTileAt(x, y) {
        const tileId = this.tileGrid[this.defaultTileLayer][y][x];

        // Skip block tiles
        if (this.isBlock(tileId)) return false;

        // Get 8 neighbors in clockwise order (starting top-left)
        const directions = [
            { dx: -1, dy: -1 }, // top-left
            { dx: 0, dy: -1 },  // top
            { dx: 1, dy: -1 },  // top-right
            { dx: 1, dy: 0 },   // right
            { dx: 1, dy: 1 },   // bottom-right
            { dx: 0, dy: 1 },   // bottom
            { dx: -1, dy: 1 },  // bottom-left
            { dx: -1, dy: 0 },  // left
        ];

        // Create circular array of block booleans
        const neighborBlocks = directions.map(dir => {
            const nx = x + dir.dx;
            const ny = y + dir.dy;
            return this.isBlockAt(nx, ny);
        });

        // Shift starting point to avoid false positives from block lines
        let startIndex = 0;
        for (let i = 0; i < 7; i++) {
            if (neighborBlocks[i] !== neighborBlocks[(i + 1) % 8]) {
                startIndex = (i + 1) % 8;
                break;
            }
        }

        // Count transitions and total blocks
        let transitions = -1;
        let blockCount = 0;
        for (let i = 0; i < 8; i++) {
            const current = neighborBlocks[(startIndex + i) % 8];
            const next = neighborBlocks[(startIndex + i + 1) % 8];
            if (current !== next) transitions++;
            if (next) blockCount++;
        }

        // Special case for certain connectivity patterns
        if (transitions > 1 && blockCount === 2) {
            const trueIndexes = neighborBlocks
                .map((val, index) => val ? index : -1)
                .filter(index => index !== -1);

            if (trueIndexes.every(a => a % 2 === 0) && trueIndexes[1] % 4 - trueIndexes[0] % 4 === 2) {
                return false; // Valid pattern
            }
        }

        // Extra helper check for vertical/horizontal aligned blocks
        const verticalPair = this.isBlockAt(x, y - 1) && this.isBlockAt(x, y + 1);
        const horizontalPair = this.isBlockAt(x - 1, y) && this.isBlockAt(x + 1, y);

        const fullySurrounded = transitions === 0 && neighborBlocks[startIndex];
        const disconnected = transitions >= 2;
        const denseCluster = transitions === 1 && blockCount > 5;
        const specialCase = transitions === 1 && blockCount === 5 && (verticalPair || horizontalPair);

        return (fullySurrounded || disconnected || denseCluster || specialCase);
    },

    toggleShowErrors() {
        this.showErrors = !this.showErrors;

        // Update UI
        const showErrorsBtn = document.getElementById('errorsBtn');
        if (showErrorsBtn) {
            showErrorsBtn.checked = this.showErrors;
        }

        // Clear error tiles if deactivated
        if (!this.showErrors) {
            this.errorTiles.clear();
        } else {
            this._errorsDirty = true; // Force fresh check on activation
        }
        this.draw();
    }
};
