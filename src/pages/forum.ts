// @ts-nocheck
import { supabase } from '../core/supabase-client.js';

// ⚙ CONFIG
const FORUM_COOLDOWN_MS = 15000; // 15 seconds cooldown
const ADMIN_UUID = 'cc1e4139-e600-45e8-88f0-922e0fb69998'; // Secure admin ID

// STATE
let currentSession = null;
let currentUserId = null;
let isAdmin = false;
let isSubmitting = false;
let cooldownInterval = null;
let allMessages = [];
let currentSort = 'newest';


// DOM ELEMENTS
const forumInput = document.getElementById('forumInput');
const anonCheck = document.getElementById('anonCheck');
const submitMsgBtn = document.getElementById('submitMsgBtn');
const messagesFeed = document.getElementById('messagesFeed');
const cooldownDisplay = document.getElementById('cooldownDisplay');

async function initForum() {
    // 1. Get user session & check admin state
    try {
        const { data: { session } } = await supabase.auth.getSession();
        currentSession = session;
        currentUserId = session?.user?.id || null;
        
        if (currentUserId === ADMIN_UUID) {
            isAdmin = true;
        }
    } catch (err) {
        console.error("Failed to check session", err);
    }

    // 2. Initial feed load
    await loadMessages();

    // 3. Setup Event Listeners
    submitMsgBtn.addEventListener('click', handleSendMessage);
    
    // Bind Sorting Tabs
    const forumSortControls = document.getElementById('forumSortControls');
    if (forumSortControls) {
        const tabs = forumSortControls.querySelectorAll('.sort-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentSort = tab.getAttribute('data-sort');
                sortAndRenderMessages();
            });
        });
    }

    // Initial cooldown check
    checkCooldown();

    // Subscribe to real-time updates to keep feed live (messages + votes)
    supabase
        .channel('forum_realtime_events')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_messages' }, () => {
            loadMessages(); 
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_message_votes' }, () => {
            loadMessages(); // Refresh UI when votes are cast
        })
        .subscribe();
}

// Check for active cooldown in localStorage
function checkCooldown() {
    const lastPostStr = localStorage.getItem('hammer_forum_last_post');
    if (!lastPostStr) return false;

    const lastPost = parseInt(lastPostStr, 10);
    const elapsed = Date.now() - lastPost;

    if (elapsed < FORUM_COOLDOWN_MS) {
        startCooldownTimer(FORUM_COOLDOWN_MS - elapsed);
        return true;
    }
    return false;
}

// Timer UI logic
function startCooldownTimer(msRemaining) {
    clearInterval(cooldownInterval);
    submitMsgBtn.disabled = true;
    cooldownDisplay.style.display = 'block';
    
    let remainingSec = Math.ceil(msRemaining / 1000);
    
    const updateUI = () => {
        cooldownDisplay.innerText = `${window.cp_translate('Cooldown:')} ${remainingSec}s`;
        if (remainingSec <= 0) {
            clearInterval(cooldownInterval);
            cooldownDisplay.style.display = 'none';
            submitMsgBtn.disabled = false;
        }
        remainingSec--;
    };

    updateUI();
    cooldownInterval = setInterval(updateUI, 1000);
}

// Helper to escape HTML and prevent XSS
function escapeHTML(text) {
    const div = document.createElement('div');
    div.innerText = text;
    return div.innerHTML;
}

// Load & Render all messages with votes
async function loadMessages() {
    try {
        const { data, error } = await supabase
            .from('forum_messages')
            .select('*, forum_message_votes(*)');

        if (error) throw error;
        allMessages = data || [];
        sortAndRenderMessages();
    } catch (err) {
        console.error("Failed to fetch forum messages:", err);
        messagesFeed.innerHTML = `<div class="empty-feed" style="color:#ff6b6b">${window.cp_translate('Failed to load messages. Please try again later.')}</div>`;
    }
}

function sortAndRenderMessages() {
    const sorted = [...allMessages];

    if (currentSort === 'newest') {
        // Sort newest first (created_at DESC)
        sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (currentSort === 'likes') {
        // Sort by likes DESC, secondary by created_at DESC
        sorted.sort((a, b) => {
            const aLikes = (a.forum_message_votes || []).filter(v => v.vote_type === 'like').length;
            const bLikes = (b.forum_message_votes || []).filter(v => v.vote_type === 'like').length;

            if (bLikes !== aLikes) {
                return bLikes - aLikes;
            }
            return new Date(b.created_at) - new Date(a.created_at);
        });
    }

    renderMessages(sorted);
}

function renderMessages(messages) {
    if (!messages || messages.length === 0) {
        messagesFeed.innerHTML = `<div class="empty-feed">${window.cp_translate('The community wall is silent. Be the first to break the silence!')}</div>`;
        return;
    }

    messagesFeed.innerHTML = ''; // Clear container

    messages.forEach(msg => {

        const isMsgAdmin = msg.user_id === ADMIN_UUID || msg.author_name === 'hammer147' || msg.author_name?.includes('hammer147');
        const postDate = new Date(msg.created_at).toLocaleString();

        // Compute voting counts
        const votes = msg.forum_message_votes || [];
        const likeCount = votes.filter(v => v.vote_type === 'like').length;
        const dislikeCount = votes.filter(v => v.vote_type === 'dislike').length;

        // Check if current logged user has already voted
        const userVote = votes.find(v => v.user_id === currentUserId);
        const isLiked = userVote?.vote_type === 'like';
        const isDisliked = userVote?.vote_type === 'dislike';

        const msgEl = document.createElement('div');
        msgEl.className = 'message-item';
        
        msgEl.innerHTML = `
            <div class="message-meta">
                <div class="message-author-info">
                    <span class="message-author ${isMsgAdmin ? 'admin' : ''}">${escapeHTML(msg.author_name || window.cp_translate('Anonymous'))}</span>
                    <span class="message-time">${postDate}</span>
                </div>
                <div class="message-actions">
                    <button class="delete-msg-btn" data-id="${msg.id}" title="${window.cp_translate('Delete Message')}" style="display: ${isAdmin ? 'block' : 'none'};">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>
            <div class="message-content">${escapeHTML(msg.content)}</div>
            
            <!-- Message Footer with Votes -->
            <div class="message-footer">
                <div class="voting-group">
                    <button class="vote-btn like ${isLiked ? 'active' : ''}" data-msgid="${msg.id}" data-type="like">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                        <span class="count">${likeCount}</span>
                    </button>
                    <button class="vote-btn dislike ${isDisliked ? 'active' : ''}" data-msgid="${msg.id}" data-type="dislike">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path></svg>
                        <span class="count">${dislikeCount}</span>
                    </button>
                </div>
            </div>
        `;

        // Delete action binding
        const delBtn = msgEl.querySelector('.delete-msg-btn');
        if (delBtn) {
            delBtn.addEventListener('click', () => handleDeleteMessage(msg.id));
        }

        // Vote triggers binding
        const voteBtns = msgEl.querySelectorAll('.vote-btn');
        voteBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mId = btn.getAttribute('data-msgid');
                const type = btn.getAttribute('data-type');
                handleVoteMessage(mId, type);
            });
        });

        messagesFeed.appendChild(msgEl);
    });
}

// Voting action handler (Robust, dynamic & 409-proof!)
async function handleVoteMessage(messageId, voteType) {
    if (!currentUserId) {
        alert(window.cp_translate("⚠️ Please sign in via Discord to vote on messages!"));
        return;
    }

    try {
        // Fetch absolute live state from backend to bypass stale closures and avoid 409 duplicate keys!
        const { data: existing, error: fetchErr } = await supabase
            .from('forum_message_votes')
            .select('*')
            .eq('message_id', messageId)
            .eq('user_id', currentUserId)
            .maybeSingle();

        if (fetchErr) throw fetchErr;

        if (existing) {
            if (existing.vote_type === voteType) {
                // Double click -> Remove vote
                const { error } = await supabase
                    .from('forum_message_votes')
                    .delete()
                    .eq('id', existing.id);
                
                if (error) throw error;
            } else {
                // Opposite type click -> Swap type
                const { error } = await supabase
                    .from('forum_message_votes')
                    .update({ vote_type: voteType })
                    .eq('id', existing.id);

                if (error) throw error;
            }
        } else {
            // New vote insert
            const { error } = await supabase
                .from('forum_message_votes')
                .insert([{
                    message_id: messageId,
                    user_id: currentUserId,
                    vote_type: voteType
                }]);

            if (error) throw error;
        }
        
        // Visual update is handled in real-time OR can be forced immediately!
        await loadMessages();

    } catch (err) {
        console.error("Vote error:", err);
        alert(window.cp_translate("Failed to cast vote:") + " " + err.message);
    }
}

// Handle Send Message action
async function handleSendMessage() {
    if (isSubmitting) return;

    const content = forumInput.value.trim();
    if (!content) {
        alert(window.cp_translate("Cannot send an empty message."));
        return;
    }

    if (content.length > 2500) {
        alert(window.cp_translate("Message too long! Max 2500 characters allowed."));
        return;
    }

    if (checkCooldown()) return;

    isSubmitting = true;
    submitMsgBtn.disabled = true;
    const originalBtnHTML = submitMsgBtn.innerHTML;
    submitMsgBtn.innerHTML = `<span>⏳</span> ${window.cp_translate('⏳ Sending...')}`;

    try {
        const isAnon = anonCheck.checked;
        let authorName = window.cp_translate('Anonymous');
        let userId = null;

        if (!isAnon && currentSession && currentSession.user) {
            const meta = currentSession.user.user_metadata;
            authorName = meta.global_name || meta.full_name || 'Authenticated User';
            userId = currentSession.user.id;
        }

        const { error } = await supabase
            .from('forum_messages')
            .insert([{
                content: content,
                author_name: authorName,
                user_id: userId
            }]);

        if (error) throw error;

        forumInput.value = '';
        localStorage.setItem('hammer_forum_last_post', Date.now().toString());
        startCooldownTimer(FORUM_COOLDOWN_MS);

        // Force absolute INSTANT rendering on UI!
        await loadMessages();

    } catch (err) {
        console.error("Failed to send message:", err);
        alert(window.cp_translate("Failed to send message:") + " " + (err.message || "Server error."));
    } finally {
        isSubmitting = false;
        submitMsgBtn.innerHTML = originalBtnHTML;
    }
}

// Admin delete action
async function handleDeleteMessage(msgId) {
    if (!isAdmin) return;
    
    const confirmDel = confirm(window.cp_translate("Are you absolutely sure you want to delete this message?"));
    if (!confirmDel) return;

    try {
        const { error } = await supabase
            .from('forum_messages')
            .delete()
            .eq('id', msgId);

        if (error) throw error;
    } catch (err) {
        console.error("Failed to delete message:", err);
        alert(window.cp_translate("Failed to delete:") + " " + (err.message || "Database restrictions."));
    }
}

// Start the page
window.addEventListener('DOMContentLoaded', initForum);
