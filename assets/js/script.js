// Global state
let selectedScenario = null;
let expandedPlatforms = new Set();
let sidebarOpen = false;
let rawLogsData = [];

function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (sidebarOpen) {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    } else {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }
}

function togglePlatform(platform) {
    const pathsElement = document.getElementById(`paths-${platform}`);
    const expandIcon = document.getElementById(`expand-${platform}`);
    const headerElement = document.querySelector(`[onclick="togglePlatform('${platform}')"]`);
    
    if (expandedPlatforms.has(platform)) {
        expandedPlatforms.delete(platform);
        pathsElement.classList.remove('expanded');
        expandIcon.classList.remove('rotated');
        headerElement.classList.remove('active');
    } else {
        expandedPlatforms.add(platform);
        pathsElement.classList.add('expanded');
        expandIcon.classList.add('rotated');
        headerElement.classList.add('active');
    }
}

function expandPlatform(platform) {
    toggleSidebar();
    setTimeout(() => {
        if (!expandedPlatforms.has(platform)) {
            togglePlatform(platform);
        }
    }, 300);
}

function selectScenario(scenarioId) {
    // Remove previous selection
    document.querySelectorAll('.attack-path').forEach(path => {
        path.classList.remove('selected');
    });
    
    // Add selection to clicked scenario
    event.target.closest('.attack-path').classList.add('selected');
    
    selectedScenario = scenarioId;
    loadScenario(scenarioId);
    
    // Switch to challenge view
    document.getElementById('overview-panel').style.display = 'none';
    document.getElementById('challenge-panel').classList.add('active');
    
    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        toggleSidebar();
    }
}

async function loadScenario(scenarioId) {
    // Load scenario data from CSV/KQL files
    const scenarioData = await window.dataLoader.loadScenarioData(scenarioId);
    if (!scenarioData) {
        console.error('Failed to load scenario:', scenarioId);
        return;
    }

    const metadata = scenarioData.metadata;
    
    // Update scenario details in UI
    document.getElementById('scenario-title').textContent = metadata.title;
    document.getElementById('scenario-platform').textContent = metadata.platform;
    document.getElementById('scenario-difficulty').textContent = metadata.difficulty;
    document.getElementById('scenario-duration').textContent = metadata.duration;
    document.getElementById('scenario-points').textContent = metadata.points + ' XP';
    document.getElementById('scenario-description').innerHTML = metadata.description;
    document.getElementById('hint-content').textContent = metadata.hint;
    
    // 🎯 NEW: Start with empty query editor instead of loading solution
    document.getElementById('query-editor').value = `// Write your KQL query here to detect ${metadata.title.toLowerCase()}
// Use the raw data table above to analyze the logs
// 
// Example structure:
// SigninLogs
// | where TimeGenerated > ago(24h)
// | where [your conditions here]
// | summarize [your analysis here]

`;
    
    // Hide hint panel and results
    document.getElementById('hint-panel').classList.remove('show');
    document.getElementById('results-workspace').style.display = 'none';
    
    // Update line numbers
    updateLineNumbers();
    
    // Generate and populate dynamic table
    populateDynamicTable(scenarioData);
}

// 🎯 NEW: Function to reveal the solution
async function revealSolution() {
    if (!selectedScenario) {
        console.error('No scenario selected');
        return;
    }

    const scenarioData = window.dataLoader.getCurrentData();
    if (!scenarioData || !scenarioData.solution) {
        console.error('No solution available for current scenario');
        return;
    }

    // Show confirmation dialog
    const confirmed = confirm(
        '🔍 Reveal Solution?\n\n' +
        'This will show the complete KQL solution for this scenario. ' +
        'Are you sure you want to see it? Try solving it yourself first for the best learning experience!'
    );

    if (confirmed) {
        document.getElementById('query-editor').value = scenarioData.solution;
        updateLineNumbers();
        
        // Show a notification
        showNotification('💡 Solution revealed! Study the query to understand the detection logic.', 'info');
    }
}

// 🎯 NEW: Helper function to show notifications
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideInRight 0.3s ease;
    `;

    switch(type) {
        case 'success':
            notification.style.backgroundColor = '#4caf50';
            break;
        case 'info':
            notification.style.backgroundColor = '#2196f3';
            break;
        case 'warning':
            notification.style.backgroundColor = '#ff9800';
            break;
        default:
            notification.style.backgroundColor = '#2c5aa0';
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    // Auto remove after 4 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

function populateDynamicTable(scenarioData) {
    const tbody = document.getElementById('raw-logs-tbody');
    const tableContainer = document.querySelector('.logs-table-container');
    
    if (!scenarioData || !scenarioData.rows) {
        tbody.innerHTML = '<tr><td colspan="100%">No data available</td></tr>';
        return;
    }

    // Generate dynamic table HTML
    const tableHTML = window.dataLoader.generateTableHTML(scenarioData, 100);
    tableContainer.innerHTML = tableHTML;
    
    // Update table header description
    const logsHeader = document.querySelector('.logs-header h3');
    if (logsHeader) {
        logsHeader.textContent = `📋 ${scenarioData.metadata.tableName} Table - Raw Data (Last 24 Hours)`;
    }
    
    console.log(`Populated table with ${scenarioData.rows.length} rows and ${scenarioData.columns.length} columns`);
}

function runQuery() {
    const query = document.getElementById('query-editor').value;
    const resultsWorkspace = document.getElementById('results-workspace');
    const resultsContent = document.getElementById('results-content');
    const resultCount = document.getElementById('result-count');
    
    // Show results workspace
    resultsWorkspace.style.display = 'block';
    resultsWorkspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Show loading state
    resultsContent.innerHTML = '<div style="color: #ff9800; padding: 1rem; text-align: center;">⏳ Executing query...</div>';
    resultCount.textContent = 'Processing...';
    
    setTimeout(() => {
        // Get user name for personalized messages
        const userName = window.userManager ? window.userManager.getUserName() : 'Analyst';
        
        // Check if user is running the template/example
        if (isTemplateQuery(query)) {
            resultsContent.innerHTML = `
                <div style="color: #ff9800; background: #fff3e0; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #ff9800;">
                    <strong>⚠️ Template Detected, ${userName}!</strong><br>
                    You're running the example template. You need to write an actual KQL query to detect the attack pattern.
                    <br><br>
                    <strong>💡 Hint:</strong> Look at the raw data above and identify patterns like:
                    <ul style="margin: 0.5rem 0; padding-left: 1.5rem; line-height: 1.6;">
                        <li>Multiple failed login attempts (ResultType != 0)</li>
                        <li>Same IP address targeting many users</li>
                        <li>Group by IP address and count unique users</li>
                    </ul>
                </div>
            `;
            resultCount.textContent = 'Template detected - Write your own query!';
            return;
        }

        // Check if query is too basic or incomplete
        if (isIncompleteQuery(query)) {
            resultsContent.innerHTML = `
                <div style="color: #f44336; background: #ffebee; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #f44336;">
                    <strong>❌ Not quite, ${userName}! Try again.</strong><br>
                    Your query needs more analysis to detect the attack pattern. 
                    <br><br>
                    <strong>💡 Try adding:</strong>
                    <ul style="margin: 0.5rem 0; padding-left: 1.5rem; line-height: 1.6;">
                        <li>A <code>summarize</code> operation to group the data</li>
                        <li>Count unique users per IP address</li>
                        <li>Filter for suspicious thresholds</li>
                    </ul>
                </div>
            `;
            resultCount.textContent = 'Query too basic - Need more analysis!';
            return;
        }
        
        // Execute the actual user query
        const queryResult = window.dataLoader.executeQuery(query);
        
        if (!queryResult.success) {
            resultsContent.innerHTML = `
                <div style="color: #f44336; background: #ffebee; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #f44336;">
                    <strong>❌ Query Error, ${userName}!</strong><br>
                    ${queryResult.error}
                    <br><br>
                    <strong>💡 Check:</strong> Syntax, column names, and KQL operators.
                </div>
            `;
            resultCount.textContent = 'Query execution failed';
            return;
        }

        const results = queryResult.data;
        
        // Check if query returned meaningful results for attack detection
        if (results.length === 0) {
            resultsContent.innerHTML = `
                <div style="color: #ff9800; background: #fff3e0; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #ff9800;">
                    <strong>🔍 No Results Found, ${userName}!</strong><br>
                    Your query executed successfully but didn't find any attack patterns.
                    <br><br>
                    <strong>💡 Try:</strong>
                    <ul style="margin: 0.5rem 0; padding-left: 1.5rem; line-height: 1.6;">
                        <li>Adjusting your filter conditions</li>
                        <li>Lowering thresholds (try UniqueUsers >= 3)</li>
                        <li>Checking for failed logins (ResultType != 0)</li>
                    </ul>
                </div>
            `;
            resultCount.textContent = 'Query executed - No attack patterns found';
            return;
        }

        // Check if results show attack detection (successful scenario completion)
        const attackDetected = validateAttackDetection(results, selectedScenario);
        
        if (attackDetected.success) {
            // Display successful results
            displayQueryResults(results);
            resultCount.textContent = `${results.length} threat(s) detected • Query completed in 1.8s`;
            
            // Show success message
            showNotification(`🎉 Excellent work, ${userName}! Attack pattern detected successfully!`, 'success');
            
            // Award XP for successful completion
            const scenarioMetadata = window.dataLoader.getScenarioMetadata(selectedScenario);
            if (window.userManager && scenarioMetadata?.xpReward) {
                userManager.completeScenario(selectedScenario, scenarioMetadata.xpReward);
            }
        } else {
            // Query returned results but didn't detect the right attack pattern
            displayQueryResults(results);
            resultsContent.innerHTML += `
                <div style="margin-top: 1rem; color: #ff9800; background: #fff3e0; padding: 1rem; border-radius: 8px; border-left: 4px solid #ff9800;">
                    <strong>⚠️ Close, ${userName}!</strong><br>
                    Your query returned results, but ${attackDetected.message}
                </div>
            `;
            resultCount.textContent = `${results.length} result(s) found • Attack pattern needs refinement`;
        }
        
    }, 1500);
}

// Helper function to detect if user is running the template
function isTemplateQuery(query) {
    const normalizedQuery = query.toLowerCase().replace(/\s+/g, ' ').trim();
    
    // Check for template indicators
    const templateIndicators = [
        'write your kql query here',
        '[your conditions here]',
        '[your analysis here]',
        'example structure',
        '// signinlogs',
        'where timegenerated > ago(24h) // where [your conditions'
    ];
    
    return templateIndicators.some(indicator => 
        normalizedQuery.includes(indicator.toLowerCase())
    );
}

// Helper function to detect incomplete/basic queries
function isIncompleteQuery(query) {
    const normalizedQuery = query.toLowerCase().replace(/\s+/g, ' ').trim();
    
    // Check if query is too basic (missing key components for attack detection)
    const hasWhere = normalizedQuery.includes('where');
    const hasSummarize = normalizedQuery.includes('summarize');
    const hasFailedLoginFilter = normalizedQuery.includes('resulttype') && normalizedQuery.includes('!= 0');
    
    // If it's just a basic select or take without analysis, it's incomplete
    if (normalizedQuery.includes('take') && !hasSummarize) {
        return true;
    }
    
    // If no where clause or no summarize for grouping, likely incomplete
    if (!hasWhere || !hasSummarize) {
        return true;
    }
    
    // If not filtering for failed logins, likely incomplete for this scenario
    if (!hasFailedLoginFilter) {
        return true;
    }
    
    return false;
}

// Helper function to validate if query detected the actual attack pattern
function validateAttackDetection(results, scenarioId) {
    if (scenarioId === 'password-spray') {
        // Check if results show suspicious IP addresses with multiple users
        const suspiciousIPs = results.filter(row => 
            row.UniqueUsers && row.UniqueUsers >= 5
        );
        
        if (suspiciousIPs.length === 0) {
            return { 
                success: false, 
                message: "try filtering for IP addresses that target 5+ unique users to detect password spray attacks." 
            };
        }
        
        // Check if the known attack IP is detected
        const knownAttackIP = results.find(row => 
            row.IPAddress && row.IPAddress.includes('203.0.113.45')
        );
        
        if (!knownAttackIP) {
            return { 
                success: false, 
                message: "you're missing the main attack IP. Look for patterns with high unique user counts." 
            };
        }
        
        return { success: true, message: "Perfect detection!" };
    }
    
    // Default validation for other scenarios
    return { 
        success: results.length > 0, 
        message: results.length === 0 ? "no attack patterns were detected." : "Good detection!" 
    };
}

function displayQueryResults(results, expectedResults = null) {
    const resultsContent = document.getElementById('results-content');
    
    if (!results || results.length === 0) {
        resultsContent.innerHTML = `
            <div style="color: #2c5aa0; background: #f0f4f8; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #2c5aa0;">
                <strong>ℹ️ No Results</strong><br>
                No matches found with current query. Try adjusting your filters or thresholds.
            </div>
        `;
        return;
    }

    // Get column names from first result
    const columns = Object.keys(results[0]);
    
    let tableHTML = `
        <div style="font-family: monospace; font-size: 0.85rem;">
        <table style="width: 100%; border-collapse: collapse;">
            <tr style="background: #f8f9fa; color: #2c5aa0; font-weight: 600;">
                ${columns.map(col => `<th style="padding: 0.8rem; text-align: left; border-bottom: 2px solid #2c5aa0;">${col}</th>`).join('')}
            </tr>
    `;

    results.forEach(row => {
        tableHTML += '<tr style="border-bottom: 1px solid #e9ecef;">';
        columns.forEach(col => {
            let cellValue = row[col] || '';
            let cellStyle = 'padding: 0.8rem;';
            
            // Highlight suspicious values
            if (col === 'IPAddress' && (cellValue.includes('203.0.113.') || cellValue.includes('198.51.100.'))) {
                cellStyle += ' color: #f44336; font-weight: 600;';
            } else if (col === 'UniqueUsers' && cellValue > 10) {
                cellStyle += ' color: #f44336; font-weight: 600;';
            } else if (col === 'UniqueUsers' && cellValue > 5) {
                cellStyle += ' color: #ff9800; font-weight: 600;';
            }
            
            tableHTML += `<td style="${cellStyle}">${cellValue}</td>`;
        });
        tableHTML += '</tr>';
    });

    tableHTML += `
        </table>
        <div style="margin-top: 1.5rem; color: #4caf50; background: #e8f5e8; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #4caf50;">
            <strong>🎯 Excellent Detection!</strong> Your query successfully identified security threats!
            <br><br>
            <strong>Key Findings:</strong>
            <ul style="margin: 0.5rem 0; padding-left: 1.5rem; line-height: 1.6;">
                <li>Found ${results.length} suspicious pattern(s)</li>
                <li>Analysis completed successfully</li>
                <li>Results match expected threat indicators</li>
            </ul>
            <br>
            <strong>💡 Next Steps:</strong> Review the identified threats and consider implementing preventive measures.
        </div>
        </div>
    `;

    resultsContent.innerHTML = tableHTML;
}

function toggleHint() {
    const hintPanel = document.getElementById('hint-panel');
    hintPanel.classList.toggle('show');
}

function updateLineNumbers() {
    const textarea = document.getElementById('query-editor');
    const lines = textarea.value.split('\n').length;
    const lineNumbers = document.getElementById('line-numbers');
    let lineNumbersHTML = '';
    for (let i = 1; i <= Math.max(lines, 10); i++) {
        lineNumbersHTML += i + '<br>';
    }
    lineNumbers.innerHTML = lineNumbersHTML;
}

// Handle textarea line numbers
document.getElementById('query-editor').addEventListener('input', updateLineNumbers);

// Close sidebar when clicking outside
document.addEventListener('click', function(event) {
    if (sidebarOpen && !event.target.closest('.sidebar') && !event.target.closest('.hamburger')) {
        toggleSidebar();
    }
});

// Update sidebar to show completed scenarios
function updateSidebarProgress() {
    if (!window.userManager) return;
    
    const completedScenarios = userManager.getCompletedScenarios();
    console.log('Updating sidebar progress for:', completedScenarios);
    
    // Remove all existing completion indicators
    document.querySelectorAll('.attack-path').forEach(path => {
        path.classList.remove('completed');
    });
    
    // Add completion indicators for completed scenarios
    completedScenarios.forEach(scenarioId => {
        const scenarioElement = document.querySelector(`[onclick="selectScenario('${scenarioId}')"]`);
        if (scenarioElement) {
            scenarioElement.classList.add('completed');
            console.log(`Marked ${scenarioId} as completed`);
        }
    });
}

// Mark a specific scenario as completed in the UI
function markScenarioCompleted(scenarioId) {
    const scenarioElement = document.querySelector(`[onclick="selectScenario('${scenarioId}')"]`);
    if (scenarioElement) {
        scenarioElement.classList.add('completed');
        console.log(`Marked ${scenarioId} as completed in UI`);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    updateLineNumbers();
    
    // Initialize data loader
    console.log('Initializing data loader...');
    await window.dataLoader.loadScenariosConfig();
    
    // Wait for user manager to initialize, then update progress
    setTimeout(() => {
        updateSidebarProgress();
        
        if (!selectedScenario) {
            selectedScenario = 'password-spray';
            loadScenario('password-spray');
        }
    }, 200);
});
// Add these helper functions at the end of your script.js file, before the DOMContentLoaded event

        // Helper function to detect if user is running the template
        function isTemplateQuery(query) {
            const normalizedQuery = query.toLowerCase().replace(/\s+/g, ' ').trim();
            
            // Check for template indicators
            const templateIndicators = [
                'write your kql query here',
                '[your conditions here]',
                '[your analysis here]',
                'example structure',
                '// signinlogs',
                'where timegenerated > ago(24h) // where [your conditions'
            ];
            
            return templateIndicators.some(indicator => 
                normalizedQuery.includes(indicator.toLowerCase())
            );
        }

        // Helper function to detect incomplete/basic queries
        function isIncompleteQuery(query) {
            const normalizedQuery = query.toLowerCase().replace(/\s+/g, ' ').trim();
            
            // Check if query is too basic (missing key components for attack detection)
            const hasWhere = normalizedQuery.includes('where');
            const hasSummarize = normalizedQuery.includes('summarize');
            const hasFailedLoginFilter = normalizedQuery.includes('resulttype') && normalizedQuery.includes('!= 0');
            
            // If it's just a basic select or take without analysis, it's incomplete
            if (normalizedQuery.includes('take') && !hasSummarize) {
                return true;
            }
            
            // If no where clause or no summarize for grouping, likely incomplete
            if (!hasWhere || !hasSummarize) {
                return true;
            }
            
            // If not filtering for failed logins, likely incomplete for this scenario
            if (!hasFailedLoginFilter) {
                return true;
            }
            
            return false;
        }

        // Helper function to validate if query detected the actual attack pattern
        function validateAttackDetection(results, scenarioId) {
            if (scenarioId === 'password-spray') {
                // Check if results show suspicious IP addresses with multiple users
                const suspiciousIPs = results.filter(row => 
                    row.UniqueUsers && row.UniqueUsers >= 5
                );
                
                if (suspiciousIPs.length === 0) {
                    return { 
                        success: false, 
                        message: "try filtering for IP addresses that target 5+ unique users to detect password spray attacks." 
                    };
                }
                
                // Check if the known attack IP is detected
                const knownAttackIP = results.find(row => 
                    row.IPAddress && row.IPAddress.includes('203.0.113.45')
                );
                
                if (!knownAttackIP) {
                    return { 
                        success: false, 
                        message: "you're missing the main attack IP. Look for patterns with high unique user counts." 
                    };
                }
                
                return { success: true, message: "Perfect detection!" };
            }
            
            // Default validation for other scenarios
            return { 
                success: results.length > 0, 
                message: results.length === 0 ? "no attack patterns were detected." : "Good detection!" 
            };
        }
// FIXED: Progressive Hints System (Stacking) + Working Walkthrough
// Replace the hint-related functions in your script.js with these updated versions

// Global state for hints
let currentHintLevel = 0;
let maxHintsForScenario = 0;
let displayedHints = []; // Track which hints are currently displayed

// Enhanced loadScenario function - UPDATE your existing function
async function loadScenario(scenarioId) {
    // Load scenario data from CSV/KQL files
    const scenarioData = await window.dataLoader.loadScenarioData(scenarioId);
    if (!scenarioData) {
        console.error('Failed to load scenario:', scenarioId);
        return;
    }

    const metadata = scenarioData.metadata;
    
    // Update scenario details in UI
    document.getElementById('scenario-title').textContent = metadata.title;
    document.getElementById('scenario-platform').textContent = metadata.platform;
    document.getElementById('scenario-difficulty').textContent = metadata.difficulty;
    document.getElementById('scenario-duration').textContent = metadata.duration;
    document.getElementById('scenario-points').textContent = metadata.points + ' XP';
    document.getElementById('scenario-description').innerHTML = metadata.description;
    
    // Initialize progressive hints system
    initializeProgressiveHints(metadata);
    
    // Start with empty query editor
    document.getElementById('query-editor').value = `// Write your KQL query here to detect ${metadata.title.toLowerCase()}
// Use the raw data table above to analyze the logs
// 
// Example structure:
// SigninLogs
// | where TimeGenerated > ago(24h)
// | where [your conditions here]
// | summarize [your analysis here]

`;
    
    // Reset hint system for new scenario
    resetHintSystem();
    
    // Hide hint panel and results
    document.getElementById('hint-panel').classList.remove('show');
    document.getElementById('results-workspace').style.display = 'none';
    
    // Update line numbers
    updateLineNumbers();
    
    // Generate and populate dynamic table
    populateDynamicTable(scenarioData);
}

// Initialize Progressive Hints System
function initializeProgressiveHints(metadata) {
    currentHintLevel = 0;
    maxHintsForScenario = metadata.progressiveHints ? metadata.progressiveHints.length : 0;
    displayedHints = [];
    
    console.log(`📝 Initialized hints: ${maxHintsForScenario} levels available`);
    
    // Update hint button text
    updateHintButton();
}

// Reset hint system when loading new scenario
function resetHintSystem() {
    currentHintLevel = 0;
    displayedHints = [];
    const hintPanel = document.getElementById('hint-panel');
    hintPanel.innerHTML = ''; // Clear existing hints
    hintPanel.classList.remove('show');
}

// FIXED: Enhanced toggleHint function - now stacks hints
function toggleHint() {
    const hintPanel = document.getElementById('hint-panel');
    const scenarioData = window.dataLoader.getCurrentData();
    
    if (!scenarioData || !scenarioData.metadata.progressiveHints) {
        console.error('No progressive hints available for this scenario');
        return;
    }
    
    const hints = scenarioData.metadata.progressiveHints;
    
    // If panel is hidden, show first hint
    if (!hintPanel.classList.contains('show')) {
        currentHintLevel = 1;
        displayedHints = [hints[0]]; // Start with first hint
        displayStackedHints();
        hintPanel.classList.add('show');
    } else {
        // Panel is visible, hide it
        hintPanel.classList.remove('show');
    }
    
    updateHintButton();
}

// FIXED: Show next hint in progression (stacking approach)
function showNextHint() {
    const scenarioData = window.dataLoader.getCurrentData();
    const hints = scenarioData.metadata.progressiveHints;
    
    if (currentHintLevel < hints.length) {
        currentHintLevel++;
        displayedHints.push(hints[currentHintLevel - 1]); // Add new hint to stack
        displayStackedHints(); // Re-render all hints
        updateHintButton();
        
        // Smooth scroll to the new hint
        setTimeout(() => {
            const newHint = document.querySelector('.hint-item:last-child');
            if (newHint) {
                newHint.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }
        }, 100);
    }
}

// NEW: Display all hints in a stacked format
function displayStackedHints() {
    const hintPanel = document.getElementById('hint-panel');
    
    let hintsHTML = `
        <div class="hints-header" style="margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid rgba(255, 193, 7, 0.3);">
            <div class="hint-title">
                <span>💡</span>
                <span>Progressive Hints (${currentHintLevel}/${maxHintsForScenario})</span>
            </div>
            <div style="color: #856404; font-size: 0.9rem; margin-top: 0.5rem;">
                🎯 Each hint builds on the previous ones - follow them in order for best results!
            </div>
        </div>
    `;
    
    // Add each displayed hint as a separate block
    displayedHints.forEach((hint, index) => {
        const hintNumber = index + 1;
        const isLatest = index === displayedHints.length - 1;
        
        hintsHTML += `
            <div class="hint-item ${isLatest ? 'hint-latest' : ''}" style="
                margin-bottom: 1.5rem;
                padding: 1.25rem;
                background: ${isLatest ? 'rgba(255, 193, 7, 0.15)' : 'rgba(255, 193, 7, 0.08)'};
                border-radius: 8px;
                border-left: 4px solid ${isLatest ? '#ffc107' : 'rgba(255, 193, 7, 0.4)'};
                ${isLatest ? 'animation: hintGlow 0.5s ease;' : ''}
            ">
                <div class="hint-step-header" style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
                    <span style="
                        background: ${isLatest ? '#ffc107' : 'rgba(255, 193, 7, 0.6)'};
                        color: ${isLatest ? '#fff' : '#856404'};
                        border-radius: 50%;
                        width: 24px; height: 24px;
                        display: flex; align-items: center; justify-content: center;
                        font-size: 0.85rem; font-weight: 600;
                        flex-shrink: 0;
                    ">${hintNumber}</span>
                    <h4 style="color: #856404; margin: 0; font-weight: 600; font-size: 1rem;">
                        ${hint.title}
                    </h4>
                </div>
                
                <div class="hint-content" style="color: #856404; line-height: 1.6; margin-bottom: 1rem;">
                    <p style="margin: 0 0 1rem 0;">${hint.content}</p>
                </div>
                
                ${hint.example ? `
                    <div class="hint-example" style="background: rgba(255, 255, 255, 0.7); border-radius: 6px; padding: 1rem; border-left: 3px solid #ffc107;">
                        <strong style="color: #856404; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            💻 KQL Example:
                        </strong>
                        <code style="
                            background: #f8f9fa; color: #1e3d6f; padding: 0.75rem; border-radius: 4px;
                            font-family: 'Consolas', 'Monaco', monospace; font-size: 0.9rem; line-height: 1.4;
                            border: 1px solid #e9ecef; display: block; overflow-x: auto;
                        ">${hint.example}</code>
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    // Add action buttons at the bottom
    hintsHTML += `
        <div class="hint-actions" style="
            margin-top: 1.5rem; padding-top: 1.5rem; 
            border-top: 2px solid rgba(255, 193, 7, 0.3);
            display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;
        ">
            ${currentHintLevel < maxHintsForScenario ? `
                <button class="btn btn-warning" onclick="showNextHint()" style="
                    font-size: 0.9rem; padding: 0.65rem 1.25rem; 
                    background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
                    border: none; border-radius: 8px; color: white; font-weight: 600;
                    box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
                    transition: all 0.3s ease;
                ">
                    🔍 Get Next Hint (${currentHintLevel + 1}/${maxHintsForScenario})
                </button>
            ` : `
                <div style="
                    background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
                    color: white; padding: 0.75rem 1.25rem; border-radius: 8px;
                    font-weight: 600; font-size: 0.9rem;
                    box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
                ">
                    ✅ All hints revealed! You're ready to write your query.
                </div>
            `}
            
            <button class="btn btn-secondary" onclick="toggleHint()" style="font-size: 0.85rem; padding: 0.5rem 1rem;">
                ❌ Hide All Hints
            </button>
            
            <button class="btn" onclick="showKQLWalkthrough()" style="
                background: linear-gradient(135deg, #2c5aa0 0%, #1e3d6f 100%);
                color: white; border: none; border-radius: 8px;
                font-size: 0.85rem; padding: 0.5rem 1rem; font-weight: 600;
                box-shadow: 0 2px 8px rgba(44, 90, 160, 0.3);
            ">
                🧠 Show KQL Walkthrough
            </button>
        </div>
    `;
    
    hintPanel.innerHTML = hintsHTML;
}

// Update hint button text based on current state
function updateHintButton() {
    const hintButton = document.querySelector('button[onclick="toggleHint()"]');
    if (!hintButton) return;
    
    const hintPanel = document.getElementById('hint-panel');
    
    if (!hintPanel.classList.contains('show')) {
        // Panel is hidden
        if (currentHintLevel === 0) {
            hintButton.innerHTML = `💡 Get Hint (1/${maxHintsForScenario})`;
        } else {
            hintButton.innerHTML = `💡 Show Hints (${currentHintLevel}/${maxHintsForScenario})`;
        }
    } else {
        // Panel is shown
        hintButton.innerHTML = `💡 Hide Hints`;
    }
}

// FIXED: Working KQL Walkthrough function
function showKQLWalkthrough() {
    console.log('🧠 showKQLWalkthrough called');
    
    const scenarioData = window.dataLoader.getCurrentData();
    
    if (!scenarioData) {
        showNotification('❌ No scenario data available', 'warning');
        return;
    }
    
    // For password spray specifically, create enhanced walkthrough
    if (selectedScenario === 'password-spray') {
        showPasswordSprayWalkthrough(scenarioData);
    } else if (scenarioData.metadata.walkthrough) {
        // Use scenario-specific walkthrough if available
        const walkthrough = scenarioData.metadata.walkthrough;
        const modal = createWalkthroughModal(walkthrough, scenarioData.solution);
        document.body.appendChild(modal);
        modal.style.display = 'flex';
    } else {
        showNotification('❌ No walkthrough available for this scenario yet', 'warning');
    }
}

// NEW: Enhanced Password Spray Walkthrough with detailed explanation
function showPasswordSprayWalkthrough(scenarioData) {
    const modal = document.createElement('div');
    modal.className = 'walkthrough-modal-overlay';
    modal.id = 'walkthrough-modal-overlay';
    
    modal.innerHTML = `
        <div class="walkthrough-modal" style="
            background: white; border-radius: 16px; padding: 2rem;
            max-width: 900px; width: 95%; max-height: 95vh; overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease;
        ">
            <!-- Header -->
            <div class="walkthrough-header" style="text-align: center; margin-bottom: 2rem; border-bottom: 2px solid #e9ecef; padding-bottom: 1.5rem;">
                <h2 style="color: #2c5aa0; margin-bottom: 0.5rem; font-size: 2rem; font-weight: 700;">
                    🧠 Password Spray Attack: KQL Detective Work
                </h2>
                <p style="color: #666; font-size: 1.1rem; margin: 0; line-height: 1.5;">
                    Let's understand WHY we built this query step-by-step and how each piece solves the puzzle
                </p>
            </div>
            
            <!-- The Problem Section -->
            <div style="margin-bottom: 2rem; padding: 1.5rem; background: #ffebee; border-radius: 8px; border-left: 4px solid #f44336;">
                <h3 style="color: #c62828; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <span>🎯</span> The Challenge: What Makes Password Spray Attacks Tricky?
                </h3>
                <div style="color: #c62828; line-height: 1.6;">
                    <p><strong>Password spray attacks are sneaky because:</strong></p>
                    <ul style="margin: 1rem 0; padding-left: 1.5rem;">
                        <li><strong>Low noise per user</strong> - Only 1-3 attempts per account (avoiding lockouts)</li>
                        <li><strong>High user coverage</strong> - Targets 50-100+ users with common passwords</li>
                        <li><strong>Spread over time</strong> - Can happen over hours/days to avoid detection</li>
                        <li><strong>Mixed with legitimate traffic</strong> - Blends in with normal failed logins</li>
                    </ul>
                    <p><strong>🔍 Our detective work:</strong> Find patterns that show <em>1 source → many targets → systematic behavior</em></p>
                </div>
            </div>
            
            <!-- The Solution Query -->
            <div style="margin-bottom: 2rem; padding: 1rem; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
                <h3 style="color: #2c5aa0; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <span>📝</span> Our Detective Query
                </h3>
                <pre style="background: #1e1e1e; color: #d4d4d4; padding: 1rem; border-radius: 6px; overflow-x: auto; margin: 0; font-size: 0.9rem; line-height: 1.4;"><code>SigninLogs
| where TimeGenerated > ago(24h)        // 🕐 Recent activity only
| where ResultType != 0                 // ❌ Failed logins only  
| summarize                            // 📊 Group and analyze
    UniqueUsers = dcount(UserPrincipalName),    // 👥 Count unique targets
    FailedAttempts = count(),                   // 🔢 Total attempts
    TargetedUsers = make_set(UserPrincipalName), // 📋 List of victims
    FirstAttempt = min(TimeGenerated),          // ⏰ Attack start
    LastAttempt = max(TimeGenerated)            // ⏰ Attack end
    by IPAddress, Location                      // 🌍 Group by source
| where UniqueUsers >= 5               // ⚠️ Suspicious threshold
| extend AttackDuration = LastAttempt - FirstAttempt,  // ⏱️ Time span
         AverageAttemptsPerUser = FailedAttempts / UniqueUsers // 📈 Intensity
| order by UniqueUsers desc, FailedAttempts desc       // 📊 Most suspicious first</code></pre>
            </div>
            
            <!-- Step by Step Reasoning -->
            <div style="margin-bottom: 2rem;">
                <h3 style="color: #2c5aa0; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <span>🔍</span> Step-by-Step Detective Reasoning
                </h3>
                
                <!-- Step 1 -->
                <div class="reasoning-step" style="margin-bottom: 1.5rem; padding: 1rem; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #2c5aa0;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
                        <span style="background: #2c5aa0; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 600;">1</span>
                        <h4 style="margin: 0; color: #2c5aa0;">Start with the Data Source</h4>
                    </div>
                    <p style="margin: 0.5rem 0; color: #333;"><strong>What we did:</strong> <code style="background: #e3f2fd; padding: 0.2rem 0.4rem; border-radius: 3px;">SigninLogs</code></p>
                    <p style="margin: 0.5rem 0; color: #333;"><strong>Why this works:</strong> This table contains every authentication attempt - successful and failed. It's our goldmine of evidence.</p>
                    <p style="margin: 0; color: #666; font-size: 0.9rem;"><strong>🎯 Detective insight:</strong> Like reviewing security camera footage - we need to see all the attempts, not just the successes.</p>
                </div>
                
                <!-- Step 2 -->
                <div class="reasoning-step" style="margin-bottom: 1.5rem; padding: 1rem; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #ff9800;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
                        <span style="background: #ff9800; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 600;">2</span>
                        <h4 style="margin: 0; color: #ff9800;">Focus on Recent Activity</h4>
                    </div>
                    <p style="margin: 0.5rem 0; color: #333;"><strong>What we did:</strong> <code style="background: #fff3e0; padding: 0.2rem 0.4rem; border-radius: 3px;">| where TimeGenerated > ago(24h)</code></p>
                    <p style="margin: 0.5rem 0; color: #333;"><strong>Why this works:</strong> Password spray campaigns happen in concentrated timeframes. Old data dilutes our analysis.</p>
                    <p style="margin: 0; color: #666; font-size: 0.9rem;"><strong>🎯 Detective insight:</strong> Fresh crime scenes have the clearest evidence. The <code>ago()</code> function is like setting the investigation timeframe.</p>
                </div>
                
                <!-- Step 3 -->
                <div class="reasoning-step" style="margin-bottom: 1.5rem; padding: 1rem; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #f44336;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
                        <span style="background: #f44336; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 600;">3</span>
                        <h4 style="margin: 0; color: #f44336;">Filter for Suspicious Activity</h4>
                    </div>
                    <p style="margin: 0.5rem 0; color: #333;"><strong>What we did:</strong> <code style="background: #ffebee; padding: 0.2rem 0.4rem; border-radius: 3px;">| where ResultType != 0</code></p>
                    <p style="margin: 0.5rem 0; color: #333;"><strong>Why this works:</strong> Successful logins (ResultType = 0) are normal. We're hunting for patterns in the failures.</p>
                    <p style="margin: 0; color: #666; font-size: 0.9rem;"><strong>🎯 Detective insight:</strong> We're looking for "attempts" not "successes" - like studying failed break-in attempts to understand burglar patterns.</p>
                </div>
                
                <!-- Step 4 -->
                <div class="reasoning-step" style="margin-bottom: 1.5rem; padding: 1rem; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #4caf50;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
                        <span style="background: #4caf50; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 600;">4</span>
                        <h4 style="margin: 0; color: #4caf50;">The Magic: Group by Attack Source</h4>
                    </div>
                    <p style="margin: 0.5rem 0; color: #333;"><strong>What we did:</strong> <code style="background: #e8f5e8; padding: 0.2rem 0.4rem; border-radius: 3px;">| summarize ... by IPAddress, Location</code></p>
                    <p style="margin: 0.5rem 0; color: #333;"><strong>Why this works:</strong> This flips our perspective from "per user" to "per attacker" - revealing the spray pattern!</p>
                    <p style="margin: 0; color: #666; font-size: 0.9rem;"><strong>🎯 Detective insight:</strong> Instead of asking "who got attacked?" we ask "who is doing the attacking?" - this reveals systematic behavior.</p>
                </div>
                
                <!-- Step 5 -->
                <div class="reasoning-step" style="margin-bottom: 1.5rem; padding: 1rem; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #9c27b0;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
                        <span style="background: #9c27b0; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 600;">5</span>
                        <h4 style="margin: 0; color: #9c27b0;">Count the Evidence</h4>
                    </div>
                    <p style="margin: 0.5rem 0; color: #333;"><strong>What we did:</strong> <code style="background: #f3e5f5; padding: 0.2rem 0.4rem; border-radius: 3px;">UniqueUsers = dcount(UserPrincipalName)</code></p>
                    <p style="margin: 0.5rem 0; color: #333;"><strong>Why this works:</strong> <code>dcount()</code> counts unique users per IP. High numbers = spray pattern!</p>
                    <p style="margin: 0; color: #666; font-size: 0.9rem;"><strong>🎯 Detective insight:</strong> One person failing to login 50 times = locked out user. One IP attempting 50 different users = attacker!</p>
                </div>
                
                <!-- Step 6 -->
                <div class="reasoning-step" style="margin-bottom: 1.5rem; padding: 1rem; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #795548;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
                        <span style="background: #795548; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 600;">6</span>
                        <h4 style="margin: 0; color: #795548;">Set the Trap (Threshold)</h4>
                    </div>
                    <p style="margin: 0.5rem 0; color: #333;"><strong>What we did:</strong> <code style="background: #efebe9; padding: 0.2rem 0.4rem; border-radius: 3px;">| where UniqueUsers >= 5</code></p>
                    <p style="margin: 0.5rem 0; color: #333;"><strong>Why this works:</strong> Legitimate users rarely try 5+ different accounts. This filters out noise and focuses on systematic attacks.</p>
                    <p style="margin: 0; color: #666; font-size: 0.9rem;"><strong>🎯 Detective insight:</strong> This is our "smoking gun" threshold - normal behavior vs attack behavior becomes clear.</p>
                </div>
            </div>
            
            <!-- What the Results Mean -->
            <div style="margin-bottom: 2rem; padding: 1.5rem; background: #e8f5e8; border-radius: 8px; border-left: 4px solid #4caf50;">
                <h3 style="color: #2e7d32; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <span>🎓</span> What Our Results Tell Us
                </h3>
                <div style="color: #2e7d32; line-height: 1.6;">
                    <p><strong>When our query finds results, here's what each field reveals:</strong></p>
                    <ul style="margin: 1rem 0; padding-left: 1.5rem;">
                        <li><strong>IPAddress + UniqueUsers ≥ 5:</strong> "This IP is systematically targeting multiple accounts"</li>
                        <li><strong>FailedAttempts:</strong> "Total volume of attack attempts from this source"</li>
                        <li><strong>TargetedUsers:</strong> "Exact list of victims - helps with incident response"</li>
                        <li><strong>AttackDuration:</strong> "How long the campaign lasted - indicates planning"</li>
                        <li><strong>AverageAttemptsPerUser:</strong> "Intensity per victim - shows restraint to avoid lockouts"</li>
                    </ul>
                    <p><strong>🎯 The pattern we're detecting:</strong> <em>Systematic, low-intensity, broad-target authentication attacks</em></p>
                </div>
            </div>
            
            <!-- Actions -->
            <div style="text-align: center; display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                <button class="btn btn-primary" onclick="copyQueryToClipboard()" style="padding: 0.75rem 1.5rem; font-size: 0.9rem;">
                    📋 Copy This Query
                </button>
                <button class="btn btn-secondary" onclick="closeWalkthroughModal()" style="padding: 0.75rem 1.5rem; font-size: 0.9rem;">
                    ✅ Got It!
                </button>
            </div>
        </div>
    `;
    
    // Add modal styles
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0, 0, 0, 0.8); display: flex; align-items: center; justify-content: center;
        z-index: 9999; animation: fadeIn 0.3s ease;
    `;
    
    document.body.appendChild(modal);
    
    // Add click outside to close
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeWalkthroughModal();
        }
    });
}

// Close walkthrough modal
function closeWalkthroughModal() {
    const modal = document.getElementById('walkthrough-modal-overlay');
    if (modal) {
        modal.remove();
    }
    console.log('✅ Walkthrough modal closed');
}

// Copy query to clipboard
function copyQueryToClipboard() {
    const scenarioData = window.dataLoader.getCurrentData();
    if (scenarioData && scenarioData.solution) {
        navigator.clipboard.writeText(scenarioData.solution).then(() => {
            showNotification('📋 Query copied to clipboard!', 'success');
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = scenarioData.solution;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showNotification('📋 Query copied to clipboard!', 'success');
        });
    }
}

// Add hint glow animation to CSS
const hintStyles = document.createElement('style');
hintStyles.textContent = `
    @keyframes hintGlow {
        0% { transform: translateX(-5px); box-shadow: 0 0 0 rgba(255, 193, 7, 0); }
        50% { transform: translateX(0); box-shadow: 0 4px 16px rgba(255, 193, 7, 0.3); }
        100% { transform: translateX(0); box-shadow: 0 2px 8px rgba(255, 193, 7, 0.2); }
    }
`;
document.head.appendChild(hintStyles);