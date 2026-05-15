// @ts-nocheck
export const HistoryMixin = {
saveState() {
        // Save current state to undo stack
        const state = {
            tileGrid: this.cloneLayeredMap(),
            timestamp: Date.now()
        };

        this.undoStack.push(state);
        // Clear redo stack when new action is performed
        this.redoStack = [];

        // Limit stack size
        if (this.undoStack.length > this.maxStackSize) {
            this.undoStack.shift();
        }
    },

undo() {
        if (this.undoStack.length === 0) return;

        // Save current state to redo stack
        const currentState = {
            tileGrid: this.cloneLayeredMap(),
            timestamp: Date.now()
        };
        this.redoStack.push(currentState);

        // Restore previous state
        const previousState = this.undoStack.pop();
        this.tileGrid = this.cloneLayeredMap(previousState.tileGrid);
        this._errorsDirty = true;
        this.draw();
    },

redo() {
        if (this.redoStack.length === 0) return;

        // Save current state to undo stack
        const currentState = {
            tileGrid: this.cloneLayeredMap(),
            timestamp: Date.now()
        };
        this.undoStack.push(currentState);

        // Restore next state
        const nextState = this.redoStack.pop();
        this.tileGrid = this.cloneLayeredMap(nextState.tileGrid);
        this._errorsDirty = true;
        this.draw();
    }
};
