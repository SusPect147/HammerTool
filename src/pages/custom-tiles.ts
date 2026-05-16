// @ts-nocheck
import { supabase } from '../core/supabase-client.js';

// Base configurable tiles preset
const CORE_TILES = [
    // Base Desert Environment Tiles
    { id: 'Wall', label: 'Wall 1', src: './Resources/Desert/Tiles/Wall.png', hitbox: { y: 0.6, h: 0.4 } },
    { id: 'Wall2', label: 'Wall 2', src: './Resources/Desert/Tiles/Wall2.png', hitbox: { y: 0.6, h: 0.4 } },
    { id: 'Bush', label: 'Bush', src: './Resources/Desert/Tiles/Bush.png' },
    { id: 'Cactus', label: 'Cactus', src: './Resources/Desert/Tiles/Cactus.png' },
    { id: 'Crate', label: 'Crate', src: './Resources/Desert/Tiles/Crate.png' },
    { id: 'Barrel', label: 'Barrel', src: './Resources/Desert/Tiles/Barrel.png' },
    { id: 'Skull', label: 'Skull', src: './Resources/Desert/Tiles/Skull.png' },
    
    // Desert Floor Textures
    { id: 'BGDark', label: 'Floor Dark', src: './Resources/Desert/BGDark.png' },
    { id: 'BGLight', label: 'Floor Light', src: './Resources/Desert/BGLight.png' },

    // Gamemode Specific Elements
    { id: 'GM_Brawl_Ball', label: 'Brawl Ball Obstacle', src: './Resources/Desert/Gamemode_Specifics/Brawl_Ball.png' },
    { id: 'GM_Gem_Grab', label: 'Gem Mine Slot', src: './Resources/Desert/Gamemode_Specifics/Gem_Grab.png' },
    { id: 'GM_Heist', label: 'Safe Box', src: './Resources/Desert/Gamemode_Specifics/Heist.png' },
    { id: 'GM_Volley_Brawl', label: 'Volley Net Obstacle', src: './Resources/Desert/Gamemode_Specifics/Volley_Brawl.png' },

    // Fence Variants
    { id: 'Fence', label: 'Fence Base', src: './Resources/Desert/Fence/Fence.png' },
    { id: 'Fence_H', label: 'Fence Horiz.', src: './Resources/Desert/Fence/Horizontal.png' },
    { id: 'Fence_V', label: 'Fence Vert.', src: './Resources/Desert/Fence/Vertical.png' },
    
    // Rope Variants
    { id: 'Post', label: 'Rope Post Base', src: './Resources/Desert/Rope/Post.png' },
    { id: 'Post_R', label: 'Rope Post Right', src: './Resources/Desert/Rope/Post_R.png' },
    { id: 'Post_T', label: 'Rope Post Top', src: './Resources/Desert/Rope/Post_T.png' },
    { id: 'Post_TR', label: 'Rope Post Corner', src: './Resources/Desert/Rope/Post_TR.png' },

    // Common Core Globals
    { id: 'Unbreakable', label: 'Unbreakable', src: './Resources/Global/Unbreakable.png' },
    { id: 'Heal Pad', label: 'Heal Pad', src: './Resources/Global/Special_Tiles/HealPad.png' },
    { id: 'Speed Pad', label: 'Speed Pad', src: './Resources/Global/Special_Tiles/SpeedTile.png' },
    { id: 'Slow Pad', label: 'Slow Pad', src: './Resources/Global/Special_Tiles/SlowTile.png' },
    { id: 'Spikes', label: 'Spikes', src: './Resources/Global/Special_Tiles/Spikes.png' }
];

// Add ALL 47 Dynamic Connecting Water Edge Textures to satisfy 100% coverage
const WATER_FILENAMES = [
    "00000000.png", "00000010.png", "00001000.png", "00001010.png", "00001011.png",
    "00010000.png", "00010010.png", "00010110.png", "00011000.png", "00011010.png",
    "00011011.png", "00011110.png", "00011111.png", "01000000.png", "01000010.png",
    "01001000.png", "01001010.png", "01001011.png", "01010000.png", "01010010.png",
    "01010110.png", "01011000.png", "01011010.png", "01011011.png", "01011110.png",
    "01011111.png", "01101000.png", "01101010.png", "01101011.png", "01111000.png",
    "01111010.png", "01111011.png", "01111110.png", "01111111.png", "11010000.png",
    "11010010.png", "11010110.png", "11011000.png", "11011010.png", "11011011.png",
    "11011110.png", "11011111.png", "11111000.png", "11111010.png", "11111011.png",
    "11111110.png", "11111111.png"
];
WATER_FILENAMES.forEach(fname => {
    const labelId = fname.replace('.png', '');
    CORE_TILES.push({
        id: `Water_${labelId}`,
        label: `Water ${labelId}`,
        src: `./Resources/Desert/Water/${fname}`
    });
});

// Local state
let allPublicPacks = [];
let myPrivatePacks = [];
let currentUserId = null;
let currentUserName = 'Anonymous Builder';
let likedPackIds = new Set(); // Track synced user liked collections
let currentEquippedThemeIds = new Set(); // Tracks MULTIPLE equipped active themes
let currentEquipTargetPack = null; // Stores target pack during verification

// Editor state
let selectedTileKey = null;
let editedTileFiles = {}; // Map of key -> File/Blob object

document.addEventListener('DOMContentLoaded', async () => {
    initStudioControls();
    initEquipControls();
    refreshEquippedBanner();
    await initUserData();
    await loadPacks();
    
    // Listen to global filters
    document.getElementById('packSearch')?.addEventListener('input', renderPacks);
    document.getElementById('packSortFilter')?.addEventListener('change', renderPacks);
});

/**
 * Setup Confirm/Cancel buttons for Equip Modal and Unequip banner
 */
function initEquipControls() {
    const confirmModal = document.getElementById('equipConfirmModal');
    const cancelBtn = document.getElementById('cancelEquipBtn');
    const confirmBtn = document.getElementById('confirmEquipBtn');
    const closeBtn = document.getElementById('closePreviewBtn');
    const unequipBtn = document.getElementById('unequipThemeBtn');

    const hideModal = () => {
        confirmModal.classList.remove('active');
        currentEquipTargetPack = null;
    };

    cancelBtn.onclick = hideModal;
    if (closeBtn) closeBtn.onclick = hideModal;

    confirmBtn.onclick = () => {
        if (currentEquipTargetPack) {
            equipTheme(currentEquipTargetPack);
        }
        hideModal();
    };

    unequipBtn.onclick = () => {
        window.unequipTheme();
    };
}

/**
 * Inspect localStorage to determine if a theme is active
 */
/**
 * Inspect localStorage to determine if themes are active
 */
function refreshEquippedBanner() {
    const banner = document.getElementById('equippedThemeBanner');
    const textNode = document.getElementById('equippedBannerText');
    const clearBtn = document.getElementById('unequipThemeBtn');
    if (!banner || !textNode) return;
    
    let equippedArr = [];
    try {
        const activeJSON = localStorage.getItem('equipped_themes');
        if (activeJSON) {
            equippedArr = JSON.parse(activeJSON);
            if (!Array.isArray(equippedArr)) equippedArr = [];
        }
    } catch (e) {
        console.error("Stored theme parse failed:", e);
        equippedArr = [];
    }

    // Populate set for fast visual lookup on cards
    currentEquippedThemeIds = new Set(equippedArr.map(p => p.id));
    
    if (equippedArr.length > 0) {
        // Render an elegant, interactive list of active theme chips!
        let html = '<span style="margin-right: 8px;">Active Layers:</span>';
        
        equippedArr.forEach((pack, index) => {
            const safeName = escapeHTML(pack.name || 'Theme');
            // High priority tags appear first (top of stack)
            html += `
                <span class="theme-chip" title="Priority #${index + 1} (Top layer)">
                    ${safeName}
                    <span class="chip-remove" onclick="event.stopPropagation(); window.unequipTheme('${pack.id}')" title="Remove layer">×</span>
                </span>
            `;
        });
        
        textNode.innerHTML = html;
        if(clearBtn) clearBtn.textContent = 'Clear All Layers';
        banner.style.display = 'flex';
    } else {
        banner.style.display = 'none';
    }
}

/**
 * Show modal verification to equip and display a full tile preview catalog
 */
function triggerEquipPrompt(pack) {
    currentEquipTargetPack = pack;
    
    const modal = document.getElementById('equipConfirmModal');
    const nameDisplay = document.getElementById('equipThemeNameDisplay');
    const authorDisplay = document.getElementById('equipThemeAuthorDisplay');
    const gridDisplay = document.getElementById('previewTilesGrid');
    const confirmBtn = document.getElementById('confirmEquipBtn');

    const isAlreadyEquipped = currentEquippedThemeIds.has(pack.id);
    
    nameDisplay.textContent = pack.name || 'Custom Theme';
    authorDisplay.textContent = pack.user_name || 'Unknown';

    // Populate preview grid dynamically
    if (gridDisplay) {
        gridDisplay.innerHTML = '';
        const data = pack.tile_data || {};
        const keys = Object.keys(data);
        
        if (keys.length === 0) {
            gridDisplay.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:2rem; opacity:0.5;">${window.cp_translate('No customized tiles in this pack.')}</div>`;
        } else {
            keys.forEach(k => {
                const src = data[k];
                const matchingDef = CORE_TILES.find(t => t.id === k);
                const lbl = matchingDef ? (matchingDef.label || k) : k;
                
                const item = document.createElement('div');
                item.className = 'tile-preview-item';
                item.style.cssText = "display:flex; flex-direction:column; align-items:center; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:6px; aspect-ratio:1; justify-content:center;";
                item.innerHTML = `
                    <img src="${src}" style="width:36px; height:36px; object-fit:contain; margin-bottom:4px;" alt="${lbl}">
                    <span style="font-size:0.65rem; opacity:0.6; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; text-align:center;" title="${lbl}">${lbl}</span>
                `;
                gridDisplay.appendChild(item);
            });
        }
    }

    // Tweak confirmation button states based on active equipping stack
    if (confirmBtn) {
        if (isAlreadyEquipped) {
            confirmBtn.textContent = window.cp_translate('Equipped');
            confirmBtn.disabled = true;
            confirmBtn.style.opacity = "0.5";
            confirmBtn.style.cursor = "default";
        } else {
            confirmBtn.textContent = window.cp_translate('Equip Theme');
            confirmBtn.disabled = false;
            confirmBtn.style.opacity = "";
            confirmBtn.style.cursor = "";
        }
    }
    
    modal.classList.add('active');
}

/**
 * Add theme to equipped stack in localStorage
 */
function equipTheme(pack) {
    let equippedArr = [];
    try {
        const existing = localStorage.getItem('equipped_themes');
        if (existing) {
            equippedArr = JSON.parse(existing);
            if (!Array.isArray(equippedArr)) equippedArr = [];
        }
    } catch(e) { equippedArr = []; }

    // Prevent duplication: remove previous instance of this theme
    equippedArr = equippedArr.filter(p => p.id !== pack.id);
    
    // Push to the FRONT of stack (highest drawing priority)
    equippedArr.unshift({
        id: pack.id,
        name: pack.name,
        user_name: pack.user_name,
        tile_data: pack.tile_data
    });
    
    localStorage.setItem('equipped_themes', JSON.stringify(equippedArr));
    refreshEquippedBanner();
    
    // Refresh lists to re-paint pulsed borders
    renderPacks();
}

/**
 * Remove a specific theme or purge entire stack if no ID is provided
 */
window.unequipTheme = function(packId = null) {
    if (!packId) {
        // Clear ALL layers
        localStorage.removeItem('equipped_themes');
    } else {
        // Evict specific layer
        let equippedArr = [];
        try {
            const existing = localStorage.getItem('equipped_themes');
            if (existing) {
                equippedArr = JSON.parse(existing);
                if (!Array.isArray(equippedArr)) equippedArr = [];
            }
        } catch(e) { equippedArr = []; }
        
        equippedArr = equippedArr.filter(p => p.id !== packId);
        
        if (equippedArr.length > 0) {
            localStorage.setItem('equipped_themes', JSON.stringify(equippedArr));
        } else {
            localStorage.removeItem('equipped_themes');
        }
    }
    
    refreshEquippedBanner();
    
    // Re-render lists to reflect updated pulse outlines
    renderPacks();
};

/**
 * Initialise user profile and id
 */
async function initUserData() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
            currentUserId = session.user.id;
            currentUserName = session.user.user_metadata.full_name || session.user.user_metadata.name || 'Anonymous Builder';
        } else {
            // Force layout hide of "My Creations" for non-auth
            const myGrid = document.getElementById('myCreationsGrid');
            if (myGrid) {
                myGrid.innerHTML = `
                    <div class="empty-placeholder">
                        <div class="empty-placeholder-icon">🔒</div>
                        <p>Sign in via Discord to view, create, and manage your own tile packs.</p>
                    </div>
                `;
            }
        }
    } catch (e) {
        console.error('Auth check failed in custom tiles:', e);
    }
}

/**
 * Fetch both user packs and public marketplace packs from Supabase
 */
(window as any).loadPacks = loadPacks;
async function loadPacks() {
    const marketGrid = document.getElementById('marketGrid');
    if (marketGrid) marketGrid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; opacity:0.7;">Contacting servers...</div>';
    
    try {
        // 1. Fetch ALL packs and include counts of tile_pack_likes
        const { data: packs, error } = await supabase
            .from('custom_tile_packs')
            .select('*, tile_pack_likes(count)');
            
        if (error) throw error;
        
        // 2. Map the records nicely
        const normalizedPacks = packs.map(p => ({
            ...p,
            likesCount: p.tile_pack_likes?.[0]?.count || 0
        }));
        
        // 2.5. Fetch precise active user like flags to ensure synchronous UI rendering
        if (currentUserId) {
            const { data: myLikes } = await supabase
                .from('tile_pack_likes')
                .select('pack_id')
                .eq('user_id', currentUserId);
            if (myLikes) {
                likedPackIds = new Set(myLikes.map(l => l.pack_id));
            }
        }
        
        // 3. Separate personal collections
        if (currentUserId) {
            myPrivatePacks = normalizedPacks.filter(p => p.user_id === currentUserId);
        } else {
            myPrivatePacks = [];
        }
        
        // Marketplace holds all Public packs
        allPublicPacks = normalizedPacks.filter(p => p.is_public === true);
        
        renderPacks();
        
    } catch (err) {
        console.error('Database call failed:', err);
        if (marketGrid) marketGrid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; color: #ff4b4b;">Connection failure. Did you run the Supabase SQL script?</div>';
    }
}

/**
 * Filter, sort, and render grid lists
 */
function renderPacks() {
    const searchTerm = document.getElementById('packSearch')?.value.toLowerCase() || '';
    const sortRule = document.getElementById('packSortFilter')?.value || 'newest';
    
    // Sort comparator
    const sortFn = (a, b) => {
        if (sortRule === 'likes') {
            if (b.likesCount !== a.likesCount) return b.likesCount - a.likesCount;
        }
        // default Newest fallback
        return new Date(b.created_at) - new Date(a.created_at);
    };
    
    // 1. Filter & render "My Creations"
    const myGrid = document.getElementById('myCreationsGrid');
    if (myGrid && currentUserId) {
        let myFiltered = myPrivatePacks.filter(p => 
            (p.name || '').toLowerCase().includes(searchTerm)
        ).sort(sortFn);
        
        document.getElementById('myCountBadge').textContent = myFiltered.length;
        
        if (myFiltered.length === 0) {
            myGrid.innerHTML = `
                <div class="empty-placeholder">
                    <div class="empty-placeholder-icon">✨</div>
                    <p>No packs found. Create your first pack by clicking the "+" button above!</p>
                </div>
            `;
        } else {
            myGrid.innerHTML = '';
            myFiltered.forEach(pack => {
                myGrid.appendChild(createPackCard(pack, true));
            });
        }
    }
    
    // 2. Filter & render "Tile Marketplace"
    const marketGrid = document.getElementById('marketGrid');
    if (marketGrid) {
        let marketFiltered = allPublicPacks.filter(p => 
            (p.name || '').toLowerCase().includes(searchTerm)
        ).sort(sortFn);
        
        document.getElementById('marketCountBadge').textContent = marketFiltered.length;
        
        if (marketFiltered.length === 0) {
            marketGrid.innerHTML = `
                <div class="empty-placeholder">
                    <div class="empty-placeholder-icon">🔍</div>
                    <p>Marketplace is empty. Be the first to publish a custom pack!</p>
                </div>
            `;
        } else {
            marketGrid.innerHTML = '';
            marketFiltered.forEach(pack => {
                marketGrid.appendChild(createPackCard(pack, false));
            });
        }
    }
}

/**
 * Construct a HTML card item for a pack
 */
function createPackCard(pack, isOwner = false) {
    const div = document.createElement('div');
    const isEquipped = currentEquippedThemeIds.has(pack.id);
    
    div.className = `tile-pack-card ${isEquipped ? 'active-equipped' : ''}`;
    
    // Click anywhere on the card body (excluding buttons) to prompt Preview
    div.onclick = (e) => {
        triggerEquipPrompt(pack);
    };
    
    // Compute preview strip (first 3 modified tiles)
    const keys = Object.keys(pack.tile_data || {});
    let previewIcons = '';
    
    // Pull first 3 images or default fillers
    for(let i=0; i<3; i++) {
        const key = keys[i] || null;
        const src = key ? pack.tile_data[key] : CORE_TILES[i].src;
        previewIcons += `<img src="${src}" class="preview-tile-icon" alt="Tile Preview" loading="lazy">`;
    }
    
    const safeName = escapeHTML(pack.name || 'Default Pack');
    const safeAuthor = escapeHTML(pack.user_name || 'Anonymous Builder');
    
    // Verify real-time like status against synced client state
    const isLiked = likedPackIds.has(pack.id);
    
    div.innerHTML = `
        <div class="pack-preview-strip">
            ${previewIcons}
        </div>
        <div class="pack-info">
            <div class="pack-meta-top">
                <h3 class="pack-name">${safeName}</h3>
                <div class="pack-author">by ${safeAuthor}</div>
            </div>
            
            <div class="pack-controls">
                ${isOwner ? `
                    <div style="display: flex; gap: 0.4rem; align-items: center;">
                        <button class="privacy-toggle ${pack.is_public ? 'pub' : 'priv'}" 
                                title="Click to change privacy">
                            ${pack.is_public ? '🌍' : '🔒'}
                        </button>
                        <button class="pack-delete-btn" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; padding: 0.4rem 0.5rem; border-radius: 6px; cursor: pointer; transition: all 0.2s; font-size: 0.75rem;" title="Delete Tile Pack">
                            🗑️
                        </button>
                    </div>
                ` : `<span></span>`}
                
                <button class="pack-like-btn ${isLiked ? 'liked' : ''}" data-id="${pack.id}">
                    <svg viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    <span class="like-counter">${pack.likesCount}</span>
                </button>
            </div>
        </div>
    `;
    
    // Attach likes interaction
    const likeBtn = div.querySelector('.pack-like-btn');
    likeBtn.onclick = (e) => {
        e.stopPropagation(); // Don't trigger Equip modal
        handleLikeClick(pack.id, likeBtn);
    };
    
    // Attach privacy and delete switchers
    if (isOwner) {
        const privBtn = div.querySelector('.privacy-toggle');
        privBtn.onclick = (e) => {
            e.stopPropagation(); // Don't trigger Equip modal
            togglePrivacy(pack.id, pack.is_public, privBtn);
        };

        const delBtn = div.querySelector('.pack-delete-btn');
        if (delBtn) {
            delBtn.onmouseenter = () => delBtn.style.background = 'rgba(239, 68, 68, 0.3)';
            delBtn.onmouseleave = () => delBtn.style.background = 'rgba(239, 68, 68, 0.15)';
            delBtn.onclick = (e) => {
                e.stopPropagation(); // Don't trigger Equip modal
                handleDeletePack(pack.id, pack.name, delBtn);
            };
        }
    }
    
    return div;
}

/**
 * Handle flipping a pack visibility between public and private
 */
async function togglePrivacy(packId, isCurrentlyPublic, button) {
    if (!currentUserId) return;
    
    button.disabled = true;
    button.textContent = '...';
    const nextState = !isCurrentlyPublic;
    
    try {
        const { error } = await supabase
            .from('custom_tile_packs')
            .update({ is_public: nextState })
            .eq('id', packId);
            
        if (error) throw error;
        
        // Force re-fetch data quietly and render
        await loadPacks();
        
    } catch (e) {
        console.error("Privacy patch failed:", e);
        alert(window.cp_translate("Failed to update privacy settings."));
        button.disabled = false;
    }
}

/**
 * Handler to permanently delete custom tile pack with double alerts
 */
async function handleDeletePack(packId, packName, button) {
    if (!currentUserId) return;

    const confirmMsg = `🚨 Are you absolutely SURE you want to PERMANENTLY delete the tile pack "${packName}"?\nThis actions cannot be undone!`;
    if (!confirm(confirmMsg)) return;

    const finalMsg = `⚠️ FINAL WARNING: Click OK to erase this pack and all its customized textures FOREVER.`;
    if (!confirm(finalMsg)) return;

    button.disabled = true;
    const orig = button.textContent;
    button.textContent = '...';

    try {
        // Step 1: Delete relational constraints (likes collection)
        await supabase.from('tile_pack_likes').delete().eq('pack_id', packId);

        // Step 2: Delete parent record from Database
        const { error } = await supabase
            .from('custom_tile_packs')
            .delete()
            .eq('id', packId)
            .eq('user_id', currentUserId);

        if (error) throw error;

        // Step 3: Purge memory references in localStorage if this skin set was equipped
        try {
            const existing = localStorage.getItem('equipped_themes');
            if (existing) {
                let equippedArr = JSON.parse(existing);
                if (Array.isArray(equippedArr)) {
                    const filtered = equippedArr.filter(p => p.id !== packId);
                    if (filtered.length < equippedArr.length) {
                        if (filtered.length > 0) {
                            localStorage.setItem('equipped_themes', JSON.stringify(filtered));
                        } else {
                            localStorage.removeItem('equipped_themes');
                        }
                        refreshEquippedBanner();
                    }
                }
            }
        } catch(e) { console.warn("LocalStorage clean failed", e); }

        alert(`${window.cp_translate('✅ Tile pack')} "${packName}" ${window.cp_translate('has been successfully deleted!')}`);
        await loadPacks(); // Fully reload listings silently
        
    } catch (err) {
        console.error("Failed to delete pack:", err);
        alert(`${window.cp_translate('❌ Delete operation failed:')} ${err.message}`);
        button.disabled = false;
        button.textContent = orig;
    }
}

/**
 * Click handler for Likes
 */
async function handleLikeClick(packId, button) {
    if (!currentUserId) {
        alert(window.cp_translate('Please sign in to like tile packs!'));
        return;
    }
    
    let wasLiked = false;
    
    try {
        // Optimistic check: insert inside tile_pack_likes
        const { error } = await supabase
            .from('tile_pack_likes')
            .insert({ user_id: currentUserId, pack_id: packId });
            
        if (error) {
            // If error code is 23505, unique constraint hit -> user already liked -> UNLIKE
            if (error.code === '23505') {
                const { error: delError } = await supabase
                    .from('tile_pack_likes')
                    .delete()
                    .eq('user_id', currentUserId)
                    .eq('pack_id', packId);
                if (delError) throw delError;
                
                likedPackIds.delete(packId);
                wasLiked = false;
            } else {
                throw error;
            }
        } else {
            likedPackIds.add(packId);
            wasLiked = true;
        }
        
        // Refresh quiet fetch for accurate totals
        const { data: cnt } = await supabase
            .from('tile_pack_likes')
            .select('id', { count: 'exact' })
            .eq('pack_id', packId);
            
        const finalCount = cnt ? (cnt.length || 0) : 0;
        
        // Update local state cache lists so filter re-rendering maintains counts!
        [...myPrivatePacks, ...allPublicPacks].forEach(p => {
            if (p.id === packId) {
                p.likesCount = finalCount;
            }
        });
        
        // MASS DOM SYNCHRONIZATION: Loop all hearts in both grids with this packId!
        const allMatchingBtns = document.querySelectorAll(`.pack-like-btn[data-id="${packId}"]`);
        allMatchingBtns.forEach(btn => {
            btn.classList.toggle('liked', wasLiked);
            const svg = btn.querySelector('svg');
            if(svg) svg.setAttribute('fill', wasLiked ? 'currentColor' : 'none');
            const counter = btn.querySelector('.like-counter');
            if(counter) counter.textContent = finalCount;
        });
        
    } catch (e) {
        console.error("Like failed:", e);
    }
}

/* ==========================================
   EDITOR STUDIO & MODAL HANDLERS
   ========================================== */

function initStudioControls() {
    const modal = document.getElementById('studioModal');
    const openBtn = document.getElementById('openStudioBtn');
    const closeBtn = document.getElementById('closeStudioBtn');
    const cancelBtn = document.getElementById('cancelStudioBtn');
    const saveBtn = document.getElementById('savePackBtn');
    const fileInput = document.getElementById('tileFileInput');
    
    // HammerStudio V2 UI Elements
    const cropModal = document.getElementById('cropModal');
    const closeCropBtn = document.getElementById('closeCropBtn');
    const cancelCropBtn = document.getElementById('cancelCropBtn');
    const applyCropBtn = document.getElementById('applyCropBtn');
    
    const workspace = document.getElementById('studioWorkspace');
    const transformLayer = document.getElementById('transformLayer');
    const croppingSource = document.getElementById('croppingSource') as HTMLImageElement;
    const gridOverlay = document.getElementById('slicingGridOverlay');
    
    const zoomSlider = document.getElementById('zoomSlider') as HTMLInputElement;
    const rotateSlider = document.getElementById('rotateSlider') as HTMLInputElement;
    const resetBtn = document.getElementById('resetTransformBtn');
    const fitBtn = document.getElementById('fitImageBtn');
    
    const gridSizeWInput = document.getElementById('gridSizeWInput') as HTMLInputElement;
    const gridSizeHInput = document.getElementById('gridSizeHInput') as HTMLInputElement;
    const gridMarginInput = document.getElementById('gridMarginInput') as HTMLInputElement;
    const gridSpacingInput = document.getElementById('gridSpacingInput') as HTMLInputElement;
    const showGridCheck = document.getElementById('showGridCheck') as HTMLInputElement;

    // Open main studio modal
    if (openBtn) {
        openBtn.onclick = () => {
            if (!currentUserId) {
                alert(window.cp_translate("Please sign in via Discord to create custom tile packs!"));
                return;
            }
            resetStudio();
            modal?.classList.add('active');
        };
    }
    
    // Close main studio modal
    const closeModal = () => modal?.classList.remove('active');
    if (closeBtn) closeBtn.onclick = closeModal;
    if (cancelBtn) cancelBtn.onclick = closeModal;
    
    // Transform State
    let transform = { x: 0, y: 0, scale: 1, rotation: 0 };
    let isDragging = false;
    let startX = 0, startY = 0;

    const updateTransforms = () => {
        if (!transformLayer) return;
        // Use translate3d for hardware acceleration and smoother movement
        transformLayer.style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(${transform.rotation}deg) scale(${transform.scale})`;
        
        // Sync UI Slider without triggering jumping
        if (zoomSlider) zoomSlider.value = transform.scale.toString();
        if (rotateSlider) rotateSlider.value = transform.rotation.toString();
        
        updateSlicingGrid();
    };

    const updateSlicingGrid = () => {
        if (!gridOverlay || !croppingSource) return;
        
        const gw = parseInt(gridSizeWInput?.value || '32');
        const gh = parseInt(gridSizeHInput?.value || '32');
        const gm = parseInt(gridMarginInput?.value || '0');
        const gs = parseInt(gridSpacingInput?.value || '0');
        
        gridOverlay.style.setProperty('--grid-w', gw + 'px');
        gridOverlay.style.setProperty('--grid-h', gh + 'px');
        gridOverlay.style.setProperty('--grid-m', gm + 'px');
        gridOverlay.style.setProperty('--grid-s', gs + 'px');
        
        gridOverlay.style.display = showGridCheck?.checked ? 'block' : 'none';
        
        // Update Ghost Info
        const ghostHitbox = document.getElementById('ghostHitbox');
        const activeTile = CORE_TILES.find(t => t.id === selectedTileKey);
        
        if (activeTile?.hitbox && ghostHitbox) {
            ghostHitbox.style.display = 'flex'; // Use flex for center text
            ghostHitbox.style.top = (activeTile.hitbox.y * 100) + '%';
            ghostHitbox.style.left = '0';
            ghostHitbox.style.width = '100%';
            ghostHitbox.style.height = (activeTile.hitbox.h * 100) + '%';
        } else if (ghostHitbox) {
            ghostHitbox.style.display = 'none';
        }
    };

    const resetTransform = () => {
        transform = { x: 0, y: 0, scale: 1, rotation: 0 };
        updateTransforms();
    };

    const fitImage = () => {
        if (!croppingSource || !workspace) return;
        const wsRect = workspace.getBoundingClientRect();
        const imgW = croppingSource.naturalWidth;
        const imgH = croppingSource.naturalHeight;
        
        // Center the image and fit to view
        const scale = Math.min(wsRect.width / imgW, wsRect.height / imgH) * 0.8;
        transform.scale = scale;
        transform.x = 0;
        transform.y = 0;
        updateTransforms();
    };

    // Mouse / Touch Dragging
    if (workspace) {
        let lastMouseX = 0;
        let lastMouseY = 0;

        workspace.onmousedown = (e) => {
            if (e.button !== 0 && e.button !== 2) return;
            isDragging = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            workspace.style.cursor = 'grabbing';
            e.preventDefault();
        };

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - lastMouseX;
            const dy = e.clientY - lastMouseY;
            
            transform.x += dx;
            transform.y += dy;
            
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            
            requestAnimationFrame(updateTransforms);
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
            if (workspace) workspace.style.cursor = 'grab';
        });

        workspace.onwheel = (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newScale = Math.max(0.05, Math.min(20, transform.scale * delta));
            
            // Adjust translation to keep mouse point anchored
            const rect = workspace.getBoundingClientRect();
            const mouseX = e.clientX - rect.left - rect.width / 2;
            const mouseY = e.clientY - rect.top - rect.height / 2;
            
            // Math: Point P in world space = (Mouse - X) / Scale
            // We want (Mouse - X_new) / Scale_new = (Mouse - X_old) / Scale_old
            transform.x = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
            transform.y = mouseY - (mouseY - transform.y) * (newScale / transform.scale);
            transform.scale = newScale;
            
            updateTransforms();
        };

        workspace.oncontextmenu = (e) => e.preventDefault();
    }

    // Grid Interaction
    if (gridOverlay) {
        gridOverlay.onclick = (e) => {
            e.stopPropagation();
            const rect = gridOverlay.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            
            const gw = parseInt(gridSizeWInput?.value || '32');
            const gh = parseInt(gridSizeHInput?.value || '32');
            const gm = parseInt(gridMarginInput?.value || '0');
            const gs = parseInt(gridSpacingInput?.value || '0');
            
            const col = Math.floor((clickX - gm) / (gw + gs));
            const row = Math.floor((clickY - gm) / (gh + gs));
            
            if (col >= 0 && row >= 0) {
                // Center this cell in the workspace
                const cellCenterX = gm + col * (gw + gs) + gw / 2;
                const cellCenterY = gm + row * (gh + gs) + gh / 2;
                
                const imgW = croppingSource.naturalWidth;
                const imgH = croppingSource.naturalHeight;
                
                // We want cellCenterX, cellCenterY to be at workspace center (0,0 in relative coords)
                // Offset = (Center - ImageCenter)
                transform.x = (imgW / 2 - cellCenterX) * transform.scale;
                transform.y = (imgH / 2 - cellCenterY) * transform.scale;
                updateTransforms();
            }
        };
    }

    // UI Events
    zoomSlider?.addEventListener('input', () => {
        const newScale = parseFloat(zoomSlider.value);
        // Compensate translation to keep center stable during zoom
        const delta = newScale / transform.scale;
        transform.x *= delta;
        transform.y *= delta;
        transform.scale = newScale;
        updateTransforms();
    });
    rotateSlider?.addEventListener('input', () => {
        transform.rotation = parseFloat(rotateSlider.value);
        updateTransforms();
    });
    resetBtn?.addEventListener('click', resetTransform);
    fitBtn?.addEventListener('click', fitImage);
    
    [gridSizeWInput, gridSizeHInput, gridMarginInput, gridSpacingInput, showGridCheck].forEach(el => {
        el?.addEventListener('input', updateSlicingGrid);
    });

    // File Input
    fileInput.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file || !selectedTileKey) return;
        
        if (file.size > 5 * 1024 * 1024) {
            alert(window.cp_translate("Original file size too large! Max limit 5MB."));
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (evt) => {
            croppingSource.src = evt.target?.result as string;
            croppingSource.onload = () => {
                cropModal?.classList.add('active');
                
                // Initialize Ghost (Always Desert version)
                const ghostImg = document.getElementById('ghostImg') as HTMLImageElement;
                const activeTile = CORE_TILES.find(t => t.id === selectedTileKey);
                if (ghostImg && activeTile) {
                    // Bypass the global theme interceptor to ensure we see the base reference
                    ghostImg.dataset.noTheme = 'true';
                    
                    // Force path to Desert if it's a theme-able resource
                    let desertSrc = activeTile.src;
                    if (desertSrc.includes('/Resources/') && !desertSrc.includes('/Desert/') && !desertSrc.includes('/Global/')) {
                        // Attempt to map environment-specific tiles to Desert
                        desertSrc = desertSrc.replace(/\/Resources\/[^/]+\//, '/Resources/Desert/');
                    }
                    ghostImg.src = desertSrc;
                }
                
                resetTransform();
                fitImage();
            };
        };
        reader.readAsDataURL(file);
    };

    const cleanupAndCloseCrop = () => {
        cropModal?.classList.remove('active');
        fileInput.value = "";
    };

    closeCropBtn.onclick = cleanupAndCloseCrop;
    cancelCropBtn.onclick = cleanupAndCloseCrop;

    applyCropBtn.onclick = () => {
        const outputSize = 512;
        const ghostSize = 128; // The size of the ghost layer in DOM
        const ratio = outputSize / ghostSize;

        const canvas = document.createElement('canvas');
        canvas.width = outputSize;
        canvas.height = outputSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 1. Move to the center of the target canvas
        ctx.translate(outputSize / 2, outputSize / 2);
        
        // 2. Apply Rotation
        ctx.rotate(transform.rotation * Math.PI / 180);
        
        // 3. Apply Scaling (including the ratio between DOM and Canvas)
        const finalScale = transform.scale * ratio;
        ctx.scale(finalScale, finalScale);
        
        // 4. Apply Translation (must be divided by current scale to work with translate() after scale())
        // transform.x/y are screen-space offsets from center. 
        // We need to convert them to "natural" space at current scale.
        ctx.translate(transform.x / transform.scale, transform.y / transform.scale);
        
        // 5. Draw image centered
        ctx.drawImage(croppingSource, -croppingSource.naturalWidth / 2, -croppingSource.naturalHeight / 2);

        const dataUrl = canvas.toDataURL('image/png');
        const cell = document.querySelector(`.tile-edit-cell[data-id="${selectedTileKey}"]`);
        if (cell) {
            (cell.querySelector('.tile-cell-img') as HTMLImageElement).src = dataUrl;
            cell.classList.add('customized');
            if (!cell.querySelector('.customized-badge')) {
                const b = document.createElement('div');
                b.className = 'customized-badge';
                cell.appendChild(b);
            }
        }

        canvas.toBlob((blob) => {
            if (blob) editedTileFiles[selectedTileKey] = blob;
            cleanupAndCloseCrop();
        }, 'image/png');
    };

    saveBtn.onclick = handleStudioSubmit;
    renderStudioPresets();
}

/**
 * Clear Studio local memory
 */
function resetStudio() {
    editedTileFiles = {};
    selectedTileKey = null;
    document.getElementById('packNameInput').value = '';
    document.getElementById('packPublicCheck').checked = true;
    document.getElementById('studioLoader').classList.remove('active');
    renderStudioPresets();
}

/**
 * Print the base core tiles inside modal body
 */
function renderStudioPresets() {
    const grid = document.getElementById('studioTileGrid');
    if(!grid) return;
    
    grid.innerHTML = '';
    
    CORE_TILES.forEach(tile => {
        const cell = document.createElement('div');
        cell.className = 'tile-edit-cell';
        cell.setAttribute('data-id', tile.id);
        cell.innerHTML = `
            <img src="${tile.src}" class="tile-cell-img" alt="${tile.label}">
            <span class="tile-cell-label">${tile.label}</span>
        `;
        
        // Trigger hidden file inputs
        cell.onclick = () => {
            selectedTileKey = tile.id;
            document.getElementById('tileFileInput').click();
        };
        
        grid.appendChild(cell);
    });
}

/**
 * The Master Submit Routine: uploads each texture, links references, pushes JSONB metadata
 */
async function handleStudioSubmit() {
    const nameInput = (document.getElementById('packNameInput') as HTMLInputElement).value.trim();
    if(!nameInput) {
        alert(window.cp_translate('Please give your Tile Pack a name!'));
        return;
    }
    
    const modifiedCount = Object.keys(editedTileFiles).length;
    if(modifiedCount === 0) {
        alert(window.cp_translate('Customize at least one tile before saving!'));
        return;
    }
    
    const loader = document.getElementById('studioLoader');
    const loaderText = document.getElementById('loaderText');
    const saveBtn = document.getElementById('savePackBtn') as HTMLButtonElement;
    
    // Anti-Spam protection! Disable inputs.
    saveBtn.disabled = true;
    loader.classList.add('active');
    
    try {
        const isPublic = (document.getElementById('packPublicCheck') as HTMLInputElement).checked;
        const timestamp = Date.now();
        const sanitizedName = nameInput.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        
        if (loaderText) loaderText.textContent = `Preparing uploads (0/${modifiedCount})...`;
        
        const finalTileData = {};
        let uploadIdx = 0;
        
        // Step 1: Run asynchronous loop to upload textures to Storage
        for(const [tileId, fileObj] of Object.entries(editedTileFiles)) {
            uploadIdx++;
            if (loaderText) loaderText.textContent = `Uploading ${tileId} (${uploadIdx}/${modifiedCount})...`;
            
            const fileExt = (fileObj as any).name ? (fileObj as any).name.split('.').pop() : 'png';
            // Store inside storage pathway: user_id / timestamp_packname / tile_id . ext
            const uploadPath = `${currentUserId}/${timestamp}_${sanitizedName}/${tileId}.${fileExt}`;
            
            const { data: sData, error: sError } = await (supabase as any).storage
                .from('custom_tiles')
                .upload(uploadPath, fileObj, { upsert: true });
                
            if (sError) throw sError;
            
            // Step 2: Acquire read URL
            const { data: { publicUrl } } = (supabase as any).storage
                .from('custom_tiles')
                .getPublicUrl(uploadPath);
                
            finalTileData[tileId] = publicUrl;
        }
        
        if (loaderText) loaderText.textContent = 'Saving metadata to cloud DB...';
        
        // Step 3: Push JSON into custom_tile_packs
        const { error: dbError } = await (supabase as any)
            .from('custom_tile_packs')
            .insert({
                user_id: currentUserId,
                user_name: currentUserName,
                name: nameInput,
                is_public: isPublic,
                tile_data: finalTileData
            });
            
        if (dbError) throw dbError;
        
        // Complete & reload
        loader.classList.remove('active');
        document.getElementById('studioModal').classList.remove('active');
        
        alert(window.cp_translate('Tile Pack safely deployed and published! ✨'));
        await loadPacks();
        
    } catch (err) {
        console.error("Publishing failed:", err);
        alert(`${window.cp_translate('Deployment failed. Verify your internet or Supabase SQL script implementation! Details:')} ${err.message || err}`);
    } finally {
        // Restore interactivity and clean overlay
        loader.classList.remove('active');
        saveBtn.disabled = false;
    }
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
