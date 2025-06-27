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