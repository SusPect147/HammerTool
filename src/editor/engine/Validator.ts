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

        const isRealBlockAt = (nx, ny) => {
            if (nx < 0 || nx >= this.mapWidth || ny < 0 || ny >= this.mapHeight) return false;
            return this.isBlock(this.tileGrid[this.defaultTileLayer][ny][nx]);
        };

        // Check for cardinal squeezes
        // A horizontal pair requires that if one side is the border, the opposite block must be part of a wall (not a 1x1 island)
        let horizontalPair = false;
        if (this.isBlockAt(x - 1, y) && this.isBlockAt(x + 1, y)) {
            const leftBorder = x - 1 < 0;
            const rightBorder = x + 1 >= this.mapWidth;
            if (leftBorder) {
                horizontalPair = this.isBlockAt(x + 1, y - 1) || this.isBlockAt(x + 1, y + 1);
            } else if (rightBorder) {
                horizontalPair = this.isBlockAt(x - 1, y - 1) || this.isBlockAt(x - 1, y + 1);
            } else {
                horizontalPair = true;
            }
        }

        let verticalPair = false;
        if (this.isBlockAt(x, y - 1) && this.isBlockAt(x, y + 1)) {
            const topBorder = y - 1 < 0;
            const bottomBorder = y + 1 >= this.mapHeight;
            if (topBorder) {
                verticalPair = this.isBlockAt(x - 1, y + 1) || this.isBlockAt(x + 1, y + 1);
            } else if (bottomBorder) {
                verticalPair = this.isBlockAt(x - 1, y - 1) || this.isBlockAt(x + 1, y - 1);
            } else {
                verticalPair = true;
            }
        }

        // Diagonal block corners squeezing against a flat wall or border
        const horizontalSqueezeLeft = this.isBlockAt(x - 1, y) && isRealBlockAt(x + 1, y - 1) && isRealBlockAt(x + 1, y + 1);
        const horizontalSqueezeRight = this.isBlockAt(x + 1, y) && isRealBlockAt(x - 1, y - 1) && isRealBlockAt(x - 1, y + 1);
        const verticalSqueezeTop = this.isBlockAt(x, y - 1) && isRealBlockAt(x - 1, y + 1) && isRealBlockAt(x + 1, y + 1);
        const verticalSqueezeBottom = this.isBlockAt(x, y + 1) && isRealBlockAt(x - 1, y - 1) && isRealBlockAt(x + 1, y - 1);

        const cornerSqueeze = horizontalSqueezeLeft || horizontalSqueezeRight || verticalSqueezeTop || verticalSqueezeBottom;

        // Standard diagonal-to-diagonal opposite blocks
        const diagonalPair = (this.isBlockAt(x - 1, y - 1) && this.isBlockAt(x + 1, y + 1) && !this.isBlockAt(x - 1, y) && !this.isBlockAt(x + 1, y) && !this.isBlockAt(x, y - 1) && !this.isBlockAt(x, y + 1)) ||
                             (this.isBlockAt(x + 1, y - 1) && this.isBlockAt(x - 1, y + 1) && !this.isBlockAt(x - 1, y) && !this.isBlockAt(x + 1, y) && !this.isBlockAt(x, y - 1) && !this.isBlockAt(x, y + 1));

        const isSqueezed = verticalPair || horizontalPair || cornerSqueeze || diagonalPair;

        // Fall back to transition/cluster detection for dense walled areas or fully enclosed cells
        const directions = [
            { dx: -1, dy: -1 },
            { dx: 0, dy: -1 },
            { dx: 1, dy: -1 },
            { dx: 1, dy: 0 },
            { dx: 1, dy: 1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 1 },
            { dx: -1, dy: 0 },
        ];

        const neighborBlocks = directions.map(dir => this.isBlockAt(x + dir.dx, y + dir.dy));

        let startIndex = 0;
        for (let i = 0; i < 7; i++) {
            if (neighborBlocks[i] !== neighborBlocks[(i + 1) % 8]) {
                startIndex = (i + 1) % 8;
                break;
            }
        }

        let transitions = -1;
        let blockCount = 0;
        for (let i = 0; i < 8; i++) {
            const current = neighborBlocks[(startIndex + i) % 8];
            const next = neighborBlocks[(startIndex + i + 1) % 8];
            if (current !== next) transitions++;
            if (next) blockCount++;
        }

        const fullySurrounded = transitions === 0 && neighborBlocks[startIndex];
        const denseCluster = transitions === 1 && blockCount > 5;

        return (fullySurrounded || denseCluster || isSqueezed);
    },

    toggleShowErrors() {
        this.showErrors = !this.showErrors;

        // Update UI
        const showErrorsBtn = document.getElementById('errorsBtn');
        if (showErrorsBtn) {
            showErrorsBtn.checked = this.showErrors;
            showErrorsBtn.parentElement.classList.toggle('active', this.showErrors);
            showErrorsBtn.parentElement.classList.toggle('active-red', this.showErrors);
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
