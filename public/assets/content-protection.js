// Content Protection Script - Prevents copying and code inspection
(function() {
    'use strict';

    // Do not enable content protection inside editor, iframe previews, customize, share, or generated pages
    try {
        const path = window.location.pathname.toLowerCase();
        if (window.self !== window.top || 
            window.location.search.includes('mode=edit') || 
            path.includes('customize') ||
            path.includes('share') ||
            path.includes('preview') ||
            path.includes('generated') ||
            path.includes('admin')) {
            return;
        }
    } catch (e) {}

    // TEMPORARILY DISABLED FOR PAYMENT DEBUGGING
    // Disable right-click context menu
    // document.addEventListener('contextmenu', function(e) {
    //     e.preventDefault();
    //     return false;
    // });

    // TEMPORARILY DISABLED FOR PAYMENT DEBUGGING
    // Disable keyboard shortcuts for DevTools
    // document.addEventListener('keydown', function(e) {
    //     // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
    //     if (e.key === 'F12' || 
    //         (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
    //         // Ctrl+U (view source)
    //         (e.ctrlKey && e.key === 'u') ||
    //         // Ctrl+S (save)
    //         (e.ctrlKey && e.key === 's') ||
    //         // Ctrl+P (print)
    //         (e.ctrlKey && e.key === 'p')) {
    //         e.preventDefault();
    //         e.stopPropagation();
    //         return false;
    //     }
    // }, true);

    // UX Optimization for Organic Search & Google Page Experience:
    // Hostile text selection, copy alert popups, and clipboard clearing are disabled
    // to ensure smooth user engagement, low bounce rates, and frictionless sharing.

    console.log('%c⚠️ Copyright Notice', 'color: #7b5df6; font-size: 14px; font-weight: bold;');
    console.log('%cAll content on TheGreeter is protected by copyright law.', 'color: #64748b; font-size: 12px;');
    console.log('%cUnauthorized copying, reproduction, or distribution is prohibited.', 'color: red; font-size: 14px;');

})();
