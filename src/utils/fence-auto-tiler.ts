// @ts-nocheck
import {
    FENCE_LOGIC_TYPES,
    FENCE_LOGIC_BY_ENVIRONMENT,
    BORDER_FENCE_LOGIC_BY_ENVIRONMENT
} from '../editor/editor-config.js';

/**
 * FenceAutoTiler
 * Automatically calculates connecting fence tiles based on surrounding connectivity rules.
 */
export class FenceAutoTiler {
    constructor() {
        this.logicImplementations = {
            [FENCE_LOGIC_TYPES.SIMPLE_BLOCK]: this.handleSimpleBlockLogic,
            [FENCE_LOGIC_TYPES.BINARY_CODE]: this.handleBinaryCodeLogic,
            [FENCE_LOGIC_TYPES.SIX_PIECE]: this.handleSixPieceLogic,
            [FENCE_LOGIC_TYPES.FOUR_PIECE]: this.handleFourPieceLogic
        };
    }

    getFenceImageName(x, y, tileGrid, environment, isFence = true, isBorder = false) {
        // Determine lookup environment, mapping custom themes to standard 'Desert' baseline
        let lookupEnv = environment || 'Desert';
        if (typeof lookupEnv === 'string' && lookupEnv.startsWith('CUSTOM_')) {
            lookupEnv = 'Desert';
        }

        // Determine which logic to use based on environment
        let logicType = isBorder 
            ? BORDER_FENCE_LOGIC_BY_ENVIRONMENT[lookupEnv] 
            : isFence 
                ? FENCE_LOGIC_BY_ENVIRONMENT[lookupEnv] 
                : FENCE_LOGIC_TYPES.FOUR_PIECE;
        
        // Safe fallback if environment lookup yields undefined
        if (logicType === undefined) {
            logicType = FENCE_LOGIC_TYPES.SIMPLE_BLOCK;
        }
        
        // Get the implementation for this logic type
        const logicHandler = this.logicImplementations[logicType];
        if (!logicHandler) {
            console.error(`[FenceAutoTiler] No handler found for fence logic type: ${logicType}`);
            return 'Fence'; // Default fallback
        }

        // Get connections (true if connected, false if not)
        const connections = this.getConnections(x, y, tileGrid, isFence, isBorder, lookupEnv);
        
        // Call the appropriate logic handler
        const result = isBorder ? 'B' + logicHandler.call(this, connections) : logicHandler.call(this, connections);
        return result;
    }

    getConnections(x, y, tileGrid, isFence, isBorder, environment) {
        const height = tileGrid.length;
        const width = tileGrid[0].length;
        
        // Helper function to check if a tile is a fence/rope
        const isSameType = (cx, cy) => {
            if (cx < 0 || cx >= width || cy < 0 || cy >= height) return false;
            const tileId = tileGrid[cy][cx];
            if (environment === 'Brawl_Arena') return tileId === 40 || tileId === 43 || tileId === 44;
            if (environment === 'Rails' || environment === 'Train') return tileId === 68;
            if (isBorder) return tileId === 45;
            return isFence ? (tileId === 7) : (tileId === 9); // Assuming 7 is fence and 9 is rope
        };

        return {
            top: isSameType(x, y - 1),
            right: isSameType(x + 1, y),
            bottom: isSameType(x, y + 1),
            left: isSameType(x - 1, y)
        };
    }

    handleSimpleBlockLogic(connections) {
        const { top, right, bottom, left } = connections;
        
        // Horizontal case: connected on both sides but not top/bottom
        if (left && right && !top && !bottom) return 'Horizontal';
        
        // Vertical case: connected on top/bottom but not sides
        if (top && bottom && !left && !right) return 'Vertical';
        
        // Default to block for all other cases
        return 'Fence';
    }

    handleBinaryCodeLogic(connections) {
        const { top, right, bottom, left } = connections;
        
        // Convert connections to binary string
        const code = [top, left, right, bottom].map(c => c ? '1' : '0').join('');
        
        // Handle special cases first
        const connectedCount = (top ? 1 : 0) + (right ? 1 : 0) + (bottom ? 1 : 0) + (left ? 1 : 0);
        
        if (connectedCount >= 3) {
            if (left && right) return 'Fence';
            return '1001';
        }

        if (left && right) return 'Fence';  // Priority to horizontal connection
        if (!left && !right && !top && !bottom) return 'Fence'; // Default when no side connections
        
        const validCodes = ['0001', '0010', '0011', '0100', '0101', 'Fence', 
                           '1000', '1001', '1010', '1100'];
        
        return validCodes.includes(code) ? code : '0110'; // Default to 0110 if invalid
    }

    handleSixPieceLogic(connections) {
        const { top, right, bottom, left } = connections;
        
        if (top && right && !bottom && !left) return 'TR';
        if (top && left && !bottom && !right) return 'TL';
        if (bottom && right && !top && !left) return 'BR';
        if (bottom && left && !top && !right) return 'BL';
        
        if ((top || bottom) && (!right && !left) || // Connected vertically and not horizontally
            (top && bottom && (left || right))) { // Three connections with two vertical 
            return 'Ver';
        }
        
        return 'Fence';
    }

    handleFourPieceLogic(connections) {
        const { top, right } = connections;
        
        if (top && right) return 'TR';
        if (top) return 'T';
        if (right) return 'R';
        return 'Fence';
    }
}
