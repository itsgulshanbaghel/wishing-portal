// Content Protection Script - Prevents copying and code inspection
(function() {
    'use strict';

    // Disable right-click context menu
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });

    // Disable keyboard shortcuts for DevTools
    document.addEventListener('keydown', function(e) {
        // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
            // Ctrl+U (view source)
            (e.ctrlKey && e.key === 'u') ||
            // Ctrl+S (save)
            (e.ctrlKey && e.key === 's') ||
            // Ctrl+P (print)
            (e.ctrlKey && e.key === 'p')) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }, true);

    // Disable text selection
    document.addEventListener('selectstart', function(e) {
        e.preventDefault();
        return false;
    });

    // Disable drag and drop
    document.addEventListener('dragstart', function(e) {
        e.preventDefault();
        return false;
    });

    // Disable copy
    document.addEventListener('copy', function(e) {
        e.preventDefault();
        alert('Content copying is disabled. All content is protected by copyright.');
        return false;
    });

    // Disable cut
    document.addEventListener('cut', function(e) {
        e.preventDefault();
        return false;
    });

    // Clear clipboard on page unload
    window.addEventListener('beforeunload', function() {
        try {
            navigator.clipboard.writeText('');
        } catch (e) {
            // Ignore clipboard errors
        }
    });

    // Detect DevTools opening
    const devtools = {
        open: false,
        threshold: 160
    };

    const checkDevTools = function() {
        const widthThreshold = window.outerWidth - window.innerWidth > devtools.threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > devtools.threshold;
        
        if (widthThreshold || heightThreshold) {
            if (!devtools.open) {
                devtools.open = true;
                console.clear();
                console.log('%c⚠️ Developer Tools Detected', 'color: red; font-size: 20px; font-weight: bold;');
                console.log('%cThis website\'s source code is protected by copyright.', 'color: red; font-size: 14px;');
            }
        } else {
            devtools.open = false;
        }
    };

    setInterval(checkDevTools, 500);

    // Disable inspect element on images
    document.querySelectorAll('img').forEach(function(img) {
        img.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            return false;
        });
        img.addEventListener('dragstart', function(e) {
            e.preventDefault();
            return false;
        });
    });

    console.log('%c⚠️ Copyright Notice', 'color: red; font-size: 20px; font-weight: bold;');
    console.log('%cAll content on this website is protected by copyright law.', 'color: red; font-size: 14px;');
    console.log('%cUnauthorized copying, reproduction, or distribution is prohibited.', 'color: red; font-size: 14px;');

})();
