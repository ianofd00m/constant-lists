// 🚀 OTAG DATA LOADER
// Quick script to load your CSV data into the local OTAG helper

console.log('🚀 OTAG Data Loader ready!');

// Function to load CSV data from a file input
function createOtagDataLoader() {
    // Create file input for CSV loading
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv';
    fileInput.style.display = 'none';
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            console.log(`📂 Loading OTAG data from: ${file.name}`);
            
            const reader = new FileReader();
            reader.onload = function(event) {
                const csvContent = event.target.result;
                
                if (window.localOtagHelper) {
                    const success = window.localOtagHelper.loadFromCSV(csvContent);
                    if (success) {
                        console.log('✅ OTAG data loaded successfully!');
                        console.log('🏷️ Modal enhancement is now active');
                        
                        // Show success notification
                        showOtagNotification('✅ OTAG data loaded! Card modals will now show functional tags.', 'success');
                    } else {
                        console.log('❌ Failed to load OTAG data');
                        showOtagNotification('❌ Failed to load OTAG data. Please check the CSV format.', 'error');
                    }
                } else {
                    console.log('❌ OTAG helper not available');
                    showOtagNotification('❌ OTAG helper not loaded. Please include local-otag-helper.js first.', 'error');
                }
            };
            
            reader.onerror = function() {
                console.log('❌ Error reading file');
                showOtagNotification('❌ Error reading file', 'error');
            };
            
            reader.readAsText(file);
        }
    });
    
    document.body.appendChild(fileInput);
    return fileInput;
}

// Show notification to user
function showOtagNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        z-index: 10000;
        font-weight: 600;
        max-width: 400px;
        animation: slideIn 0.3s ease;
    `;
    
    notification.textContent = message;
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Create floating button to load OTAG data
function createOtagLoadButton() {
    const button = document.createElement('button');
    button.innerHTML = '🏷️ Load OTAG Data';
    button.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 12px;
        padding: 12px 20px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 8px 25px rgba(102,126,234,0.3);
        z-index: 9999;
        transition: all 0.3s ease;
    `;
    
    button.addEventListener('mouseover', () => {
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 12px 30px rgba(102,126,234,0.4)';
    });
    
    button.addEventListener('mouseout', () => {
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = '0 8px 25px rgba(102,126,234,0.3)';
    });
    
    const fileInput = createOtagDataLoader();
    
    button.addEventListener('click', () => {
        fileInput.click();
    });
    
    document.body.appendChild(button);
    
    // Hide button if data is already loaded
    if (window.localOtagHelper && window.localOtagHelper.isLoaded) {
        button.style.display = 'none';
    }
    
    return button;
}

// Auto-load if CSV content is available in localStorage
function autoLoadOtagData() {
    if (window.localOtagHelper && window.localOtagHelper.isLoaded) {
        console.log('✅ OTAG data already loaded from cache');
        showOtagNotification('✅ OTAG data loaded from cache! Modal enhancement active.', 'success');
        return true;
    }
    return false;
}

// Initialize when DOM is ready
function initOtagLoader() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                if (!autoLoadOtagData()) {
                    createOtagLoadButton();
                }
            }, 1000);
        });
    } else {
        setTimeout(() => {
            if (!autoLoadOtagData()) {
                createOtagLoadButton();
            }
        }, 1000);
    }
}

// Start initialization
initOtagLoader();

// Manual functions for direct CSV loading
window.loadOtagFromText = function(csvText) {
    if (window.localOtagHelper) {
        const success = window.localOtagHelper.loadFromCSV(csvText);
        if (success) {
            showOtagNotification('✅ OTAG data loaded from text!', 'success');
            // Hide load button if it exists
            const loadButton = document.querySelector('button[innerHTML*="Load OTAG Data"]');
            if (loadButton) loadButton.style.display = 'none';
        }
        return success;
    }
    return false;
};

// Quick function to load data from the Downloads folder (for testing)
window.loadOtagFromDownloads = function() {
    console.log('💡 To load OTAG data from your Downloads folder:');
    console.log('1. Click the "🏷️ Load OTAG Data" button');
    console.log('2. Select your scryfall-card-otags-2025-08-06.csv file');
    console.log('3. Card modals will automatically show OTAG information!');
};

console.log('✅ OTAG Data Loader initialized!');
console.log('💡 Use the floating button or loadOtagFromText(csvContent) to load data');
console.log('💡 Once loaded, all card modals will automatically show functional tags!');
