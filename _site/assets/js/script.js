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
    
    // Load the solution as default query
    document.getElementById('query-editor').value = scenarioData.solution;
    
    // Hide hint panel and results
    document.getElementById('hint-panel').classList.remove('show');
    document.getElementById('results-workspace').style.display = 'none';
    
    // Update line numbers
    updateLineNumbers();
    
    // Generate and populate dynamic table
    populateDynamicTable(scenarioData);
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
        // Execute query using data loader
        const validation = window.dataLoader.validateQuery(query, selectedScenario);
        
        if (validation.valid) {
            // Display successful results
            displayQueryResults(validation.results, validation.expectedResults);
            resultCount.textContent = `${validation.results.length} result(s) found • Query completed in 1.8s`;
            
            // Award XP for successful completion
            console.log('=== XP DEBUG INFO ===');
            console.log('Selected scenario:', selectedScenario);
            const scenarioMetadata = window.dataLoader.getScenarioMetadata(selectedScenario);
            console.log('Scenario metadata:', scenarioMetadata);
            console.log('XP Reward available:', scenarioMetadata?.xpReward);
            console.log('UserManager exists:', !!window.userManager);
            
            if (window.userManager && scenarioMetadata?.xpReward) {
                console.log('🎯 Attempting to award XP...');
                userManager.completeScenario(selectedScenario, scenarioMetadata.xpReward);
            } else {
                console.log('❌ XP award failed - Missing UserManager or xpReward');
            }
            console.log('=== END XP DEBUG ===');
            
        } else {
            // Display error or guidance
            resultsContent.innerHTML = `
                <div style="color: #f44336; background: #ffebee; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #f44336;">
                    <strong>❌ Query Issue</strong><br>
                    ${validation.message}
                    <br><br>
                    <strong>💡 Try:</strong> Check your syntax and filtering conditions. Make sure you're targeting the right columns.
                </div>
            `;
            resultCount.textContent = 'Query completed - Issues found';
        }
    }, 1500);
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