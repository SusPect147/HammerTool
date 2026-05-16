// @ts-nocheck
import { supabase } from '../../core/supabase-client.js';

export const IOMixin = {
async loadMap(mapId) {
        try {
            const { data, error } = await supabase
                .from('maps')
                .select('*')
                .eq('id', mapId)
                .single();

            if (error) throw error;
            if (!data) throw new Error('Map not found');

            console.log(`[HammerTool] Successfully loaded map details for ID: ${mapId}`);

            const { data: { user } } = await supabase.auth.getUser();
            const urlParams = new URLSearchParams(window.location.search);
            const isDirectEdit = urlParams.get('edit') === 'true';

            // 1. Configure UI values
            const nameInput = document.getElementById('mapName');
            if (isDirectEdit && user && data.user_id === user.id) {
                console.info(`[HammerTool] Activating DIRECT EDIT mode on loaded map ID: ${mapId}`);
                this.loadedMapId = mapId;
                if (nameInput) nameInput.value = data.name || 'Untitled Map';
            } else {
                this.loadedMapId = null; // Fresh clone!
                if (nameInput) {
                    nameInput.value = `Copy of ${data.name || 'Untitled Map'}`;
                }
            }

            const sizeSelect = document.getElementById('mapSize');
            if (sizeSelect) sizeSelect.value = data.size || 'regular';

            const gamemodeSelect = document.getElementById('gamemode');
            if (gamemodeSelect) gamemodeSelect.value = data.gamemode || 'Gem_Grab';

            const environmentSelect = document.getElementById('environment');
            if (environmentSelect) environmentSelect.value = data.environment || 'Desert';

            const isPublicToggle = document.getElementById('isPublicToggle');
            if (isPublicToggle) isPublicToggle.checked = data.is_public ?? true;

            const showThemeInGalleryToggle = document.getElementById('showThemeInGalleryToggle');
            const showThemeInDownloadToggle = document.getElementById('showThemeInDownloadToggle');
            
            const themeOptions = data.theme_options || { gallery: true, download: true };
            if (showThemeInGalleryToggle) showThemeInGalleryToggle.checked = themeOptions.gallery ?? true;
            if (showThemeInDownloadToggle) showThemeInDownloadToggle.checked = themeOptions.download ?? true;

            // 2. Configure instance variables and underlying grid
            this.gamemode = data.gamemode || 'Gem_Grab';
            this.environment = data.environment || 'Desert';

            // Resize boundaries gracefully without triggering visual purge alerts
            await this.setSize(data.size || 'regular', false);

            // Load grid content!
            if (data.map_data && Array.isArray(data.map_data)) {
                this.tileGrid = data.map_data;
            }

            // Pull and parse standard visual assets
            await this.setEnvironment(this.environment);
            await this.setGamemode(this.gamemode, false); // pass false to 'apply' so it does not overwrite our loaded tileGrid with default template!

            this._errorsDirty = true;
            this.draw();
            
            // Center and scale the map mathematically after the layout settling frame to guarantee normal zoom!
            requestAnimationFrame(() => {
                this.autoScaleViewport();
                this.centerCanvas();
            });

        } catch (error) {
            console.error('[HammerTool] Critical failure loading map payload:', error);
            alert(`${window.ht_translate('❌ Critical Failure: Could not retrieve map from secure database!')} (${error.message})`);
        }
    },

async saveMap() {
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError || !user) {
                alert(window.ht_translate("❌ You must be logged in with Discord to save maps! Go to the Home page to log in."));
                return;
            }

            const mapName = document.getElementById('mapName').value.trim() || 'Untitled Map';
            const mapSize = document.getElementById('mapSize').value;
            const gamemode = document.getElementById('gamemode').value;
            const environment = document.getElementById('environment').value;

            const author = user.user_metadata.full_name || 'Anonymous';

            const isPublic = document.getElementById('isPublicToggle')?.checked ?? true;

            const payload = { 
                name: mapName, 
                size: mapSize, 
                gamemode: gamemode, 
                environment: environment, 
                map_data: this.tileGrid,
                author_name: author,
                user_id: user.id,
                is_public: isPublic,
                theme_options: {
                    gallery: document.getElementById('showThemeInGalleryToggle')?.checked ?? true,
                    download: document.getElementById('showThemeInDownloadToggle')?.checked ?? true
                }
            };

            let savedMapId = null;
            if (this.loadedMapId) {
                console.info(`[HammerTool] Attempting database UPDATE on existing Map ID: ${this.loadedMapId}`);
                const { error } = await supabase
                    .from('maps')
                    .update(payload)
                    .eq('id', this.loadedMapId)
                    .eq('user_id', user.id);
                
                if (error) throw error;
                savedMapId = this.loadedMapId;
            } else {
                console.info(`[HammerTool] Attempting database INSERT for new map clone.`);
                const { data, error } = await supabase
                    .from('maps')
                    .insert([payload])
                    .select('*');
                
                if (error) throw error;
                savedMapId = data[0].id;
            }

            const mapLinkElement = document.getElementById('mapLink');
            if (mapLinkElement && savedMapId) {
                const currentLoc = window.location.origin + window.location.pathname.replace('editor.html', 'view.html');
                mapLinkElement.innerText = `${currentLoc}?id=${savedMapId}`;
                mapLinkElement.href = `${currentLoc}?id=${savedMapId}`;
            }

            alert(this.loadedMapId ? window.ht_translate('Map updated successfully in secure database!') : window.ht_translate('Map saved successfully to Supabase database!'));
        } catch (error) {
            console.error('Error saving map:', error);
            alert(`${window.ht_translate('Failed to save map:')} ${error.message || 'Unknown error'}`);
        }
    },

async createMapPNG() {
        const tileSize = this.tileSize;
        const padding = this.canvasPadding;

        const canvas = document.createElement('canvas');
        canvas.width = (this.mapWidth * tileSize) + (padding * 2);
        canvas.height = (this.mapHeight * tileSize) + (padding * 2);
        const ctx = canvas.getContext('2d');

        // Draw background
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const isDark = (x + y) % 2 === 0;
                const bgImg = isDark ? this.bgDark : this.bgLight;

                // Skip Brawl Ball corners in regular size
                if (
                    (this.gamemode === 'Brawl_Ball' || this.gamemode === 'Hockey') &&
                    this.mapSize === this.mapSizes.regular
                ) {
                    const atTop = y < 4;
                    const atBottom = y >= this.mapHeight - 4;
                    const atLeft = x < 7;
                    const atRight = x >= this.mapWidth - 7;
                    if ((atTop || atBottom) && (atLeft || atRight)) continue;
                }

                if (bgImg?.complete) {
                    ctx.drawImage(
                        bgImg,
                        x * tileSize + padding,
                        y * tileSize + padding,
                        tileSize,
                        tileSize
                    );
                }
            }
        }

        if (this.gamemode === 'Basket_Brawl' && this.mapSize === this.mapSizes.basket) { 
            // Cache basket images if not already loaded
            if (!this.basketMarkingsImage) {
                this.basketMarkingsImage = new Image();
                this.basketMarkingsImage.src = 'Resources/Global/BasketMarkings.png';
            }
            if (!this.basketsImage) {
                this.basketsImage = new Image();
                this.basketsImage.src = 'Resources/Global/Baskets.png';
            }

            // Draw basket markings if loaded
            if (this.basketMarkingsImage.complete) {
                ctx.drawImage( 
                    this.basketMarkingsImage, 
                    this.canvasPadding, 
                    this.canvasPadding, 
                    this.mapWidth * this.tileSize, 
                    this.mapHeight * this.tileSize 
                ); 
            }
        }

        if (this.gamemode === 'Siege' && this.mapSize === this.mapSizes.siege) { 
            // Cache siege markings image if not already loaded
            if (!this.siegeMarkingsImage) {
                this.siegeMarkingsImage = new Image();
                this.siegeMarkingsImage.src = 'Resources/Global/SiegeMarkings.png';
            }

            // Draw siege markings if loaded
            if (this.siegeMarkingsImage.complete) {
                ctx.drawImage( 
                    this.siegeMarkingsImage, 
                    this.canvasPadding, 
                    this.canvasPadding, 
                    this.mapWidth * this.tileSize, 
                    this.mapHeight * this.tileSize 
                ); 
            }
        }

        if (this.gamemode === 'Spirit_Wars' && this.mapSize === this.mapSizes.regular) { 
            // Cache siege markings image if not already loaded
            if (!this.siegeMarkingsImage) {
                this.siegeMarkingsImage = new Image();
                this.siegeMarkingsImage.src = 'Resources/Global/SpiritWarsMarkings.png';
            }

            // Draw siege markings if loaded
            if (this.siegeMarkingsImage.complete) {
                ctx.drawImage( 
                    this.siegeMarkingsImage, 
                    this.canvasPadding, 
                    this.canvasPadding, 
                    this.mapWidth * this.tileSize, 
                    this.mapHeight * this.tileSize 
                ); 
            }
        }

        // Group tiles by layer
        const tilesByLayer = new Map();
        for (let layerIndex = 0; layerIndex < this.layerCount; layerIndex++) {
            const layerGrid = this.tileGrid[layerIndex];
            if (!layerGrid) continue;

            for (let y = 0; y < this.mapHeight; y++) {
                for (let x = 0; x < this.mapWidth; x++) {
                    const tileId = layerGrid[y][x];
                    if (tileId === 0 || tileId === -1) continue;

                    const def = this.tileDefinitions[tileId];
                    if (!def) continue;

                    const layerKey = typeof def.layer === 'number' ? def.layer : this.defaultTileLayer;

                    if (!tilesByLayer.has(layerKey)) {
                        tilesByLayer.set(layerKey, []);
                    }
                    tilesByLayer.get(layerKey).push({ x, y, tileId, red: false, layerKey });

                }
            }
        }

        function getTileAt(layerKey, x, y) {
            const tiles = tilesByLayer.get(layerKey);
            if (!tiles) return null;

            return tiles.find(tile => tile.x === x && tile.y === y) || null;
        }

        if (this.gamemode === 'Brawl_Arena'){
            const trackLayerIndex = this.tileDefinitions[40]?.layer ?? this.defaultTileLayer;
            const smallIkeLayerIndex = this.tileDefinitions[47]?.layer ?? this.defaultTileLayer;
            const resolveLayerGrid = (index) => this.tileGrid[index] || this.tileGrid[this.defaultTileLayer];
            const trackLayerGrid = resolveLayerGrid(trackLayerIndex);
            const smallIkeLayerGrid = resolveLayerGrid(smallIkeLayerIndex);
            const getTrackConnections = (x, y) => {
                const height = trackLayerGrid.length;
                const width = trackLayerGrid[0].length;
                
                // Helper function to check if a tile is a fence/rope
                const isSameType = (x, y) => {
                    if (x < 0 || x >= width || y < 0 || y >= height) return false;
                    const id = trackLayerGrid[y][x];
                    return id === 40;
                };

                return {
                    top: isSameType(x, y - 1),
                    right: isSameType(x + 1, y),
                    bottom: isSameType(x, y + 1),
                    left: isSameType(x - 1, y)
                };
            };

                            for (let y = 0; y < this.mapHeight; y++) {
                for (let x = 0; x < this.mapWidth; x++) {
                    if (smallIkeLayerGrid[y][x] === 47){
                        let firstRun = true;
                        const addRedToConnections = (x, y) => {
                            if (!firstRun) {
                                const tile = getTileAt(trackLayerIndex, x, y);
                                if (!tile) {
                                    return;
                                }
                                if (tile.red) {
                                    return;
                                }

                                tile.red = true;
                            }   

                            firstRun = false;
                            const { top, right, bottom, left } = getTrackConnections(x, y);
                            if (top) addRedToConnections(x, y - 1);
                            if (right) addRedToConnections(x + 1, y);
                            if (bottom) addRedToConnections(x, y + 1);
                            if (left) addRedToConnections(x - 1, y);
                        };

                        addRedToConnections(x, y);
                    }
                }
            }
        }

        // Draw tiles in layer order
        Array.from(tilesByLayer.keys())
            .sort((a, b) => a - b)
            .forEach(layerKey => {
                const tiles = tilesByLayer.get(layerKey);

                // Group tiles by row (y value)
                const rows = new Map();

                tiles.forEach(tile => {
                    const { y } = tile;
                    if (!rows.has(y)) {
                        rows.set(y, []);
                    }
                    rows.get(y).push(tile);
                });

                // Draw tiles row by row
                Array.from(rows.keys())
                    .sort((a, b) => a - b)
                    .forEach(y => {
                        const rowTiles = rows.get(y);

                        rowTiles.sort((a, b) => a.x - b.x);

                        rowTiles.forEach(({ x, y, tileId }) => {
                            const tile = getTileAt(layerKey, x, y);
                            const red = tile?.red ?? false;

                            this.drawTile(ctx, tileId, x, y, red);

                        });
                    });
            });

        if (this.gamemode === 'Basket_Brawl' && this.mapSize === this.mapSizes.basket) { 
            if (this.basketsImage.complete) {
                ctx.drawImage( 
                    this.basketsImage, 
                    this.canvasPadding, 
                    this.canvasPadding, 
                    this.mapWidth * this.tileSize,
                    this.mapHeight * this.tileSize 
                ); 
            }
        }

        // Draw goal images if any
        if (this.goalImages?.length) {
            for (const goal of this.goalImages) {
                const img =
                    this.goalImageCache[`${goal.name}${this.environment}`] ||
                    this.goalImageCache[goal.name];
                if (!img || !img.complete) continue;

                ctx.drawImage(
                    img,
                    goal.x * tileSize + padding + (goal.offsetX || 0),
                    goal.y * tileSize + padding + (goal.offsetY || 0),
                    (goal.w || 1) * tileSize,
                    (goal.h || 1) * tileSize
                );
            }
        }

        return canvas.toDataURL('image/png');
    },

async exportMap() {
        const mapName = document.getElementById('mapName').value || 'Untitled Map';
        const includeTheme = document.getElementById('showThemeInDownloadToggle')?.checked ?? true;
        
        const originalEnv = this.environment;
        let targetEnv = this.environment;

        if (!includeTheme && targetEnv.startsWith('CUSTOM_')) {
            const fallback = prompt("Export Theme is disabled for this map. Enter a standard environment name (e.g., Desert, Arcade, Stadium) or leave blank for Desert:", "Desert");
            targetEnv = fallback || "Desert";
        }

        if (targetEnv !== originalEnv) {
            this.environment = targetEnv;
            await this.loadTileImages();
            await this.loadEnvironmentBackgrounds();
        }

        const dataUrl = await this.createMapPNG();

        if (targetEnv !== originalEnv) {
            this.environment = originalEnv;
            await this.loadTileImages();
            await this.loadEnvironmentBackgrounds();
        }

        const link = document.createElement('a');
        link.download = `${mapName}.png`;
        link.href = dataUrl;
        link.click();
    }
};
