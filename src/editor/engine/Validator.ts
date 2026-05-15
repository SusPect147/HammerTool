// @ts-nocheck
export const ValidatorMixin = {
checkForErrors() {
        if (!this.showErrors) return;
    
        this.errorTiles.clear();
    
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const tileId = this.tileGrid[this.defaultTileLayer][y][x];
    
                // Skip block tiles
                if (this.isBlock(tileId)) continue;
    
                // Get 8 neighbors in clockwise order (starting top-left)
                const directions = [
                    { dx: -1, dy: -1 }, // top-left
                    { dx:  0, dy: -1 }, // top
                    { dx:  1, dy: -1 }, // top-right
                    { dx:  1, dy:  0 }, // right
                    { dx:  1, dy:  1 }, // bottom-right
                    { dx:  0, dy:  1 }, // bottom
                    { dx: -1, dy:  1 }, // bottom-left
                    { dx: -1, dy:  0 }, // left
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
                
                if (transitions > 1 && blockCount === 2){
                    const trueIndexes = neighborBlocks
                    .map((val, index) => val ? index : -1)
                    .filter(index => index !== -1);

                    if (trueIndexes.every(a => a % 2 === 0) && trueIndexes[1] % 4 - trueIndexes[0] % 4 === 2) break;
                }

                    // Extra helper check for vertical/horizontal aligned blocks
                const verticalPair = this.isBlockAt(x, y - 1) && this.isBlockAt(x, y + 1);
                const horizontalPair = this.isBlockAt(x - 1, y) && this.isBlockAt(x + 1, y);

                const fullySurrounded = transitions === 0 && neighborBlocks[startIndex];
                const disconnected = transitions >= 2;
                const denseCluster = transitions === 1 && blockCount > 5;
                const specialCase = transitions === 1 && blockCount === 5 && (verticalPair || horizontalPair);

                if (fullySurrounded || disconnected || denseCluster || specialCase) {
                    this.errorTiles.add(`${x},${y}`);
                }
            }
        }
    },

recalculateErrors() {
        this.errorTiles.clear();
        for (let ey = 0; ey < this.mapHeight; ey++) {
            for (let ex = 0; ex < this.mapWidth; ex++) {
                const eTileId = this.tileGrid[this.defaultTileLayer][ey][ex];
                if (this.isBlock(eTileId)) continue;
                const directions = [
                    { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
                    { dx: 1, dy: 0 }, { dx: 1, dy: 1 }, { dx: 0, dy: 1 },
                    { dx: -1, dy: 1 }, { dx: -1, dy: 0 },
                ];
                const neighborBlocks = directions.map(dir => this.isBlockAt(ex + dir.dx, ey + dir.dy));
                let startIndex = 0;
                for (let i = 0; i < 7; i++) {
                    if (neighborBlocks[i] !== neighborBlocks[(i + 1) % 8]) { startIndex = (i + 1) % 8; break; }
                }
                let transitions = -1, blockCount = 0;
                for (let i = 0; i < 8; i++) {
                    const current = neighborBlocks[(startIndex + i) % 8];
                    const next = neighborBlocks[(startIndex + i + 1) % 8];
                    if (current !== next) transitions++;
                    if (next) blockCount++;
                }
                if (transitions > 1 && blockCount === 2) {
                    const trueIndexes = neighborBlocks.map((val, index) => val ? index : -1).filter(index => index !== -1);
                    if (trueIndexes.every(a => a % 2 === 0) && trueIndexes[1] % 4 - trueIndexes[0] % 4 === 2) continue;
                }
                const verticalPair = this.isBlockAt(ex, ey - 1) && this.isBlockAt(ex, ey + 1);
                const horizontalPair = this.isBlockAt(ex - 1, ey) && this.isBlockAt(ex + 1, ey);
                const fullySurrounded = transitions === 0 && neighborBlocks[startIndex];
                const disconnected = transitions >= 2;
                const denseCluster = transitions === 1 && blockCount > 5;
                const specialCase = transitions === 1 && blockCount === 5 && (verticalPair || horizontalPair);
                if (fullySurrounded || disconnected || denseCluster || specialCase) {
                    this.errorTiles.add(`${ex},${ey}`);
                }
            }
        }
        this._errorsDirty = false;
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
