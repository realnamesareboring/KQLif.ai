// Data Loader for CSV and KQL files
class DataLoader {
    constructor() {
        this.scenarios = {};
        this.currentScenarioData = null;
        this.currentColumns = [];
    }

    async loadScenariosConfig() {
        try {
            const response = await fetch('assets/data/scenarios.json');
            const config = await response.json();
            this.scenarios = config.scenarios;
            console.log('Scenarios config loaded:', Object.keys(this.scenarios));
            return this.scenarios;
        } catch (error) {
            console.error('Failed to load scenarios config:', error);
            return {};
        }
    }

    async loadScenarioData(scenarioId) {
        const scenario = this.scenarios[scenarioId];
        if (!scenario) {
            console.error('Scenario not found:', scenarioId);
            return null;
        }

        try {
            // Load CSV data
            const csvResponse = await fetch(`assets/data/scenarios/${scenarioId}/${scenario.dataFile}`);
            const csvText = await csvResponse.text();
            
            // Parse CSV with PapaParse
            const parsedData = Papa.parse(csvText, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                delimitersToGuess: [',', '\t', '|', ';']
            });

            // Load KQL solution
            const kqlResponse = await fetch(`assets/data/scenarios/${scenarioId}/${scenario.solutionFile}`);
            const kqlText = await kqlResponse.text();

            // Store data for current scenario
            this.currentScenarioData = {
                rows: parsedData.data,
                columns: parsedData.meta.fields.map(field => field.trim()),
                solution: kqlText.trim(),
                metadata: scenario
            };

            console.log(`Loaded scenario '${scenarioId}':`, {
                rows: this.currentScenarioData.rows.length,
                columns: this.currentScenarioData.columns.length,
                solutionLines: this.currentScenarioData.solution.split('\n').length
            });

            return this.currentScenarioData;
        } catch (error) {
            console.error(`Failed to load scenario data for '${scenarioId}':`, error);
            return null;
        }
    }

    getCurrentData() {
        return this.currentScenarioData;
    }

    getScenarioMetadata(scenarioId) {
        return this.scenarios[scenarioId] || null;
    }

    // Generate dynamic table HTML based on loaded data
    generateTableHTML(data, maxRows = 100) {
        if (!data || !data.rows || !data.columns) {
            return '<p>No data available</p>';
        }

        const { rows, columns } = data;
        const displayRows = rows.slice(0, maxRows);

        let html = `
            <table class="logs-table">
                <thead>
                    <tr>
                        ${columns.map(col => `<th>${col}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
        `;

        displayRows.forEach((row, index) => {
            // Determine row styling based on content
            let rowClass = '';
            let ipClass = '';
            
            // Check for failed logins (common pattern)
            if (row.ResultType && row.ResultType !== 0 && row.ResultType !== '0') {
                rowClass = 'log-failed';
            } else if (row.ResultType === 0 || row.ResultType === '0') {
                rowClass = 'log-success';
            }
            
            // Check for suspicious IPs (common spray patterns)
            if (row.IPAddress && (row.IPAddress.includes('203.0.113.') || row.IPAddress.includes('198.51.100.'))) {
                rowClass = 'log-spray-ip';
                ipClass = 'suspicious-ip';
            }

            html += `<tr class="${rowClass}">`;
            
            columns.forEach(col => {
                let cellValue = row[col] || '';
                let cellClass = '';
                
                // Special formatting for specific columns
                if (col === 'IPAddress' && ipClass) {
                    cellClass = ipClass;
                } else if (col === 'ResultType') {
                    if (cellValue === 0 || cellValue === '0') {
                        cellClass = 'result-type-0';
                        cellValue = 'Success';
                    } else if (cellValue) {
                        cellClass = 'result-type-failed';
                        cellValue = `Failed (${cellValue})`;
                    }
                }
                
                html += `<td class="${cellClass}">${cellValue}</td>`;
            });
            
            html += '</tr>';
        });

        html += `
                </tbody>
            </table>
        `;

        return html;
    }

    // Execute KQL-like query on loaded data
    executeQuery(queryText, data = null) {
        const dataset = data || this.currentScenarioData;
        if (!dataset || !dataset.rows) {
            return { success: false, error: 'No data available' };
        }

        try {
            // This is a simplified KQL executor for demo purposes
            // In a real implementation, you'd have a full KQL parser
            const results = this.executeBasicKQLQuery(queryText, dataset);
            return { success: true, data: results };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Basic KQL query execution (simplified)
    executeBasicKQLQuery(query, dataset) {
        const { rows } = dataset;
        let processedData = [...rows];

        // Remove comments and normalize query
        const lines = query.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('//'));

        const queryText = lines.join(' ').toLowerCase();

        // Basic where filtering
        if (queryText.includes('where')) {
            const whereMatch = queryText.match(/where\s+(.+?)(?:\s*\||$)/);
            if (whereMatch) {
                const condition = whereMatch[1].trim();
                
                // Handle basic conditions
                if (condition.includes('resulttype != 0')) {
                    processedData = processedData.filter(row => 
                        row.ResultType && row.ResultType !== 0 && row.ResultType !== '0'
                    );
                }
            }
        }

        // Basic summarize operation
        if (queryText.includes('summarize')) {
            const summarizeMatch = queryText.match(/summarize\s+(.+?)(?:\s+by\s+(.+?))?(?:\s*\||$)/);
            if (summarizeMatch) {
                const groupByField = summarizeMatch[2] ? summarizeMatch[2].trim() : null;
                
                if (groupByField === 'ipaddress') {
                    // Group by IP address and count unique users
                    const grouped = {};
                    processedData.forEach(row => {
                        const ip = row.IPAddress;
                        if (!grouped[ip]) {
                            grouped[ip] = {
                                IPAddress: ip,
                                UniqueUsers: new Set(),
                                FailedAttempts: 0
                            };
                        }
                        grouped[ip].UniqueUsers.add(row.UserPrincipalName);
                        grouped[ip].FailedAttempts++;
                    });

                    // Convert to array format
                    processedData = Object.values(grouped).map(group => ({
                        IPAddress: group.IPAddress,
                        UniqueUsers: group.UniqueUsers.size,
                        FailedAttempts: group.FailedAttempts
                    }));
                }
            }
        }

        // Basic where filtering after summarize
        if (queryText.includes('uniqueusers >= 5')) {
            processedData = processedData.filter(row => row.UniqueUsers >= 5);
        }

        // Basic ordering
        if (queryText.includes('order by')) {
            const orderMatch = queryText.match(/order by\s+(\w+)(?:\s+(desc|asc))?/);
            if (orderMatch) {
                const field = orderMatch[1];
                const direction = orderMatch[2] || 'asc';
                
                processedData.sort((a, b) => {
                    const aVal = a[field] || 0;
                    const bVal = b[field] || 0;
                    return direction === 'desc' ? bVal - aVal : aVal - bVal;
                });
            }
        }

        return processedData;
    }

    // Check if query matches expected solution patterns
    validateQuery(userQuery, scenarioId) {
        const scenario = this.scenarios[scenarioId];
        if (!scenario) return { valid: false, message: 'Scenario not found' };

        const solution = this.currentScenarioData?.solution;
        if (!solution) return { valid: false, message: 'No solution available' };

        // Execute both queries and compare results
        const userResults = this.executeQuery(userQuery);
        const solutionResults = this.executeQuery(solution);

        if (!userResults.success) {
            return { valid: false, message: 'Query execution failed: ' + userResults.error };
        }

        if (!solutionResults.success) {
            return { valid: false, message: 'Solution query failed' };
        }

        // Basic validation - check if results have the expected structure
        const userResultsData = userResults.data;
        const expectedCriteria = scenario.expectedResults;

        if (userResultsData.length >= expectedCriteria.minRows) {
            return { 
                valid: true, 
                message: 'Query executed successfully!',
                results: userResultsData,
                expectedResults: solutionResults.data
            };
        } else {
            return { 
                valid: false, 
                message: `Expected at least ${expectedCriteria.minRows} results, got ${userResultsData.length}` 
            };
        }
    }
}

// Initialize global data loader
window.dataLoader = new DataLoader();