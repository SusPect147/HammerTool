// @ts-nocheck
/**
 * Landing Page Dynamics (index.html)
 */
(function() {
    const slogans = [
        {
            html: '<span class="accent">The best</span> map&#8209;making<br>tool.',
            desc: 'Precision tile editor with 50+ environments, smart mirroring, real-time error detection, and every game mode supported. Build maps that dominate the competition.'
        },
        {
            html: 'Create, rate,<br><span class="accent">win!</span>',
            desc: 'Design your dream map, share it with the community, and climb to the top. Integrated gallery, one-click export, and powerful editing tools - all in your browser.'
        },
        {
            html: 'Build better<br><span class="accent">Maps.</span>',
            desc: 'Advanced map maker for Brawl Stars with full undo/redo, tile validation, auto-mirroring, and high-res PNG export. Your next map starts here.'
        },
        {
            html: 'Victory is just<br><span class="accent">around the corner.</span>',
            desc: 'Every great victory starts with a great map. Use our professional tools to craft, test, and share maps that make a difference. Coming soon: online map voting & leaderboards.'
        }
    ];

    const pick = slogans[Math.floor(Math.random() * slogans.length)];
    const sloganEl = document.getElementById('heroSlogan');
    const descEl = document.getElementById('heroDesc');
    
    if (sloganEl) sloganEl.innerHTML = pick.html;
    if (descEl) descEl.textContent = pick.desc;
})();
