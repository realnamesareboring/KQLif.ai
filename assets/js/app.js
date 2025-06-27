// app.js - Main Application Logic (Updated to work with user-manager.js)

// Global state
let selectedScenario = null;
let expandedPlatforms = new Set();
let sidebarOpen = false;
let rawLogsData = [];

// Generate realistic SigninLogs data
function generateSigninLogs() {
    const logs = [];
    const now = new Date();
    
    // Legitimate users
    const legitUsers = [
        'sarah.johnson@contoso.com', 'mike.chen@contoso.com', 'alex.rodriguez@contoso.com',
        'emma.thompson@contoso.com', 'david.kim@contoso.com', 'lisa.anderson@contoso.com',
        'john.williams@contoso.com', 'maria.garcia@contoso.com', 'chris.brown@contoso.com'
    ];
    
    // Spray attack target users
    const sprayTargets = [
        'admin@contoso.com', 'administrator@contoso.com', 'service.account@contoso.com',
        'backup.user@contoso.com', 'test.user@contoso.com', 'guest@contoso.com',
        'support@contoso.com', 'helpdesk@contoso.com', 'security@contoso.com',
        'finance@contoso.com', 'hr@contoso.com', 'it.admin@contoso.com',
        'robert.miller@contoso.com', 'jennifer.davis@contoso.com', 'michael.wilson@contoso.com',
        'susan.moore@contoso.com', 'james.taylor@contoso.com', 'patricia.white@contoso.com'
    ];
    
    // Legitimate IPs
    const legitIPs = ['10.0.1.15', '10.0.1.23', '10.0.1.87', '192.168.1.45', '172.16.0.12'];
    
    // Apps
    const apps = ['Microsoft 365', 'Microsoft Teams', 'SharePoint Online', 'Exchange Online', 'Office 365'];
    const clients = ['Browser', 'Mobile Apps and Desktop clients', 'Modern Authentication', 'Legacy Authentication'];
    
    // [Same log generation logic as before...]
    // Generate legitimate successful logins (last 24 hours)
    for (let i = 0; i < 45; i++) {
        const timeOffset = Math.random() * 24 * 60 * 60 * 1000;
        const timestamp = new Date(now.getTime() - timeOffset);
        
        logs.push({
            TimeGenerated: timestamp.toISOString().slice(0, 19) + 'Z',
            UserPrincipalName: legitUsers[Math.floor(Math.random() * legitUsers.length)],
            IPAddress: legitIPs[Math.floor(Math.random() * legitIPs.length)],
            Location: ['Seattle, WA', 'New York, NY', 'Chicago, IL', 'San Francisco, CA'][Math.floor(Math.random() * 4)],
            ResultType: '0',
            AppDisplayName: apps[Math.floor(Math.random() * apps.length)],
            ClientAppUsed: clients[Math.floor(Math.random() * clients.length)]
        });
    }
    
    // [Continue with rest of log generation...]
    // Password spray attack, brute force, etc.
    
    return logs;
}

// Scenario data with XP rewards
const scenarios = {
    'password-spray': {
        title: 'Password Spray Attack Detection',
        platform: 'Microsoft Entra ID',
        difficulty: 'Beginner - Intermediate',
        duration: '15-20 minutes',
        points: 250,  // Changed to number for XP system
        xpReward: 250,
        description: `<strong>Scenario:</strong> A Security Operations Center has detected unusual authentication patterns across multiple user accounts...`,
        hint: 'Start by filtering the SigninLogs table for failed authentication attempts...',
        defaultQuery: `SigninLogs | where TimeGenerated > ago(24h)...`
    },
    'brute-force': {
        title: 'Brute Force Attack Analysis',
        platform: 'Microsoft Entra ID',
        difficulty: 'Beginner',
        duration: '10-15 minutes',
        points: 200,
        xpReward: 200,
        // ... rest of scenario
    }
    // ... other scenarios
};

// Modified runQuery function to award XP
function runQuery() {
    const query = document.getElementById('query-editor').value;
    const resultsWorkspace = document.getElementById('results-workspace');
    const resultsContent = document.getElementById('results-content');
    const resultCount = document.getElementById('result-count');
    
    // Show results workspace
    resultsWorkspace.style.display = 'block';
    resultsWorkspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Simulate query execution
    resultsContent.innerHTML = '<div style="color: #ff9800; padding: 1rem; text-align: center;">⏳ Executing query...</div>';
    resultCount.textContent = 'Processing...';
    
    setTimeout(() => {
        if (selectedScenario === 'password-spray') {
            // [Same result analysis logic...]
            
            if (results.length > 0) {
                // Show results...
                
                // Award XP for successful completion
                if (window.userManager) {
                    userManager.completeScenario(selectedScenario, scenarios[selectedScenario].xpReward);
                }
            }
        }
    }, 1500);
}

// [Rest of your existing functions...]
// toggleSidebar, togglePlatform, selectScenario, etc.

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    updateLineNumbers();
    
    // Wait for user manager to initialize
    setTimeout(() => {
        if (!selectedScenario) {
            selectedScenario = 'password-spray';
            loadScenario('password-spray');
        }
    }, 100);
});