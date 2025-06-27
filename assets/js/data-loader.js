// Debug Data Loader for Jekyll - Enhanced logging and validation
class DataLoader {
    constructor() {
        this.scenarios = {};
        this.currentScenarioData = null;
        this.currentColumns = [];
    }

    async loadScenariosConfig() {
        try {
            console.log('🔄 Loading scenarios config...');
            const response = await fetch('assets/data/scenarios.json');
            const config = await response.json();
            this.scenarios = config.scenarios;
            console.log('✅ Scenarios config loaded:', Object.keys(this.scenarios));
            return this.scenarios;
        } catch (error) {
            console.error('❌ Failed to load scenarios config:', error);
            return {};
        }
    }

    async loadScenarioData(scenarioId) {
        const scenario = this.scenarios[scenarioId];
        if (!scenario) {
            console.error('❌ Scenario not found:', scenarioId);
            return null;
        }

        try {
            console.log(`🔄 Loading scenario data for: ${scenarioId}`);
            
            // Load CSV data
            const csvResponse = await fetch(`assets/data/scenarios/${scenarioId}/${scenario.dataFile}`);
            if (!csvResponse.ok) {
                throw new Error(`CSV file not found: ${csvResponse.status}`);
            }
            const csvText = await csvResponse.text();
            console.log('📄 CSV text loaded, length:', csvText.length);
            console.log('📄 First 200 chars:', csvText.substring(0, 200));
            
            // Load KQL solution
            const kqlResponse = await fetch(`assets/data/scenarios/${scenarioId}/${scenario.solutionFile}`);
            if (!kqlResponse.ok) {
                throw new Error(`KQL file not found: ${kqlResponse.status}`);
            }
            const kqlText = await kqlResponse.text();
            console.log('📝 KQL solution loaded, length:', kqlText.length);

            // Parse CSV with PapaParse
            const parsedData = Papa.parse(csvText, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                delimitersToGuess: [',', '\t', '|', ';']
            });

            console.log('📊 Papa Parse results:');
            console.log('  - Rows:', parsedData.data.length);
            console.log('  - Columns:', parsedData.meta.fields);
            console.log('  - Errors:', parsedData.errors);
            console.log('  - Sample row:', parsedData.data[0]);

            // Store data for current scenario
            this.currentScenarioData = {
                rows: parsedData.data,
                columns: parsedData.meta.fields.map(field => field.trim()),
                solution: kqlText.trim(),
                metadata: scenario
            };

            console.log(`✅ Loaded scenario '${scenarioId}':`, {
                rows: this.currentScenarioData.rows.length,
                columns: this.currentScenarioData.columns.length,
                solutionLines: this.currentScenarioData.solution.split('\n').length
            });

            // Debug: Show some sample data
            console.log('🔍 Sample data analysis:');
            const failedLogins = this.currentScenarioData.rows.filter(row => 
                row.ResultType && row.ResultType !== 0 && row.ResultType !== '0'
            );
            console.log('  - Total rows:', this.currentScenarioData.rows.length);
            console.log('  - Failed logins:', failedLogins.length);
            console.log('  - ResultType values:', [...new Set(this.currentScenarioData.rows.map(r => r.ResultType))]);
            console.log('  - Sample failed login:', failedLogins[0]);

            return this.currentScenarioData;
        } catch (error) {
            console.error(`❌ Failed to load scenario data for '${scenarioId}':`, error);
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
            console.error('❌ No dataset available for query execution');
            return { success: false, error: 'No data available' };
        }

        console.log('🔍 Executing query on dataset:', {
            rows: dataset.rows.length,
            columns: dataset.columns,
            query: queryText.substring(0, 100) + '...'
        });

        try {
            const results = this.executeBasicKQLQuery(queryText, dataset);
            console.log('✅ Query execution complete. Results:', results.length);
            return { success: true, data: results };
        } catch (error) {
            console.error('❌ Query execution failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Basic KQL query execution (simplified) - Enhanced with debugging
    executeBasicKQLQuery(query, dataset) {
        const { rows } = dataset;
        let processedData = [...rows];

        console.log('🔄 Starting query execution with', processedData.length, 'rows');

        // Remove comments and normalize query
        const lines = query.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('//'));

        const queryText = lines.join(' ').toLowerCase();
        console.log('📝 Normalized query:', queryText);

        // Basic where filtering
        if (queryText.includes('where')) {
            console.log('🔍 Processing WHERE clauses...');
            const whereMatches = queryText.match(/where\s+(.+?)(?:\s*\||$)/g);
            if (whereMatches) {
                whereMatches.forEach((whereClause, index) => {
                    const condition = whereClause.replace('where', '').trim();
                    console.log(`  WHERE clause ${index + 1}:`, condition);
                    
                    if (condition.includes('resulttype != 0')) {
                        const beforeCount = processedData.length;
                        processedData = processedData.filter(row => {
                            const isNonZero = row.ResultType && row.ResultType !== 0 && row.ResultType !== '0';
                            return isNonZero;
                        });
                        console.log(`  Filtered ResultType != 0: ${beforeCount} → ${processedData.length}`);
                        console.log(`  Sample ResultTypes after filter:`, processedData.slice(0, 3).map(r => r.ResultType));
                    }
                });
            }
        }

        // Basic summarize operation
        if (queryText.includes('summarize')) {
            console.log('🔄 Processing SUMMARIZE...');
            const summarizeMatch = queryText.match(/summarize\s+(.+?)(?:\s+by\s+(.+?))?(?:\s*\||$)/);
            if (summarizeMatch) {
                const groupByField = summarizeMatch[2] ? summarizeMatch[2].trim() : null;
                console.log('  Group by field:', groupByField);
                
                if (groupByField && (groupByField.includes('ipaddress') || groupByField.includes('location'))) {
                    console.log('🔄 Grouping by IP address...');
                    const grouped = {};
                    processedData.forEach(row => {
                        const ip = row.IPAddress;
                        if (!grouped[ip]) {
                            grouped[ip] = {
                                IPAddress: ip,
                                Location: row.Location || 'Unknown',
                                UniqueUsers: new Set(),
                                FailedAttempts: 0,
                                TargetedUsers: [],
                                FirstAttempt: row.TimeGenerated,
                                LastAttempt: row.TimeGenerated
                            };
                        }
                        grouped[ip].UniqueUsers.add(row.UserPrincipalName);
                        grouped[ip].TargetedUsers.push(row.UserPrincipalName);
                        grouped[ip].FailedAttempts++;
                        
                        // Track time range
                        if (row.TimeGenerated < grouped[ip].FirstAttempt) {
                            grouped[ip].FirstAttempt = row.TimeGenerated;
                        }
                        if (row.TimeGenerated > grouped[ip].LastAttempt) {
                            grouped[ip].LastAttempt = row.TimeGenerated;
                        }
                    });

                    console.log('📊 Grouped results:', Object.keys(grouped).length, 'unique IPs');
                    Object.entries(grouped).forEach(([ip, data]) => {
                        console.log(`  ${ip}: ${data.UniqueUsers.size} users, ${data.FailedAttempts} attempts`);
                    });

                    // Convert to array format with calculated fields
                    processedData = Object.values(grouped).map(group => ({
                        IPAddress: group.IPAddress,
                        Location: group.Location,
                        UniqueUsers: group.UniqueUsers.size,
                        FailedAttempts: group.FailedAttempts,
                        AverageAttemptsPerUser: Math.round((group.FailedAttempts / group.UniqueUsers.size) * 10) / 10,
                        FirstAttempt: group.FirstAttempt,
                        LastAttempt: group.LastAttempt,
                        TargetedUsers: [...new Set(group.TargetedUsers)].slice(0, 5) // Show first 5 users
                    }));
                    
                    console.log('📊 After summarize:', processedData.length, 'grouped results');
                }
            }
        }

        // Basic where filtering after summarize (for thresholds)
        if (queryText.includes('uniqueusers >= 5')) {
            console.log('🔍 Filtering UniqueUsers >= 5...');
            const beforeCount = processedData.length;
            processedData = processedData.filter(row => row.UniqueUsers >= 5);
            console.log(`  Threshold filter: ${beforeCount} → ${processedData.length}`);
        }

        // Basic ordering
        if (queryText.includes('order by')) {
            console.log('🔄 Processing ORDER BY...');
            const orderMatch = queryText.match(/order by\s+(\w+)(?:\s+(desc|asc))?/);
            if (orderMatch) {
                const field = orderMatch[1];
                const direction = orderMatch[2] || 'asc';
                console.log(`  Ordering by ${field} ${direction}`);
                
                processedData.sort((a, b) => {
                    const aVal = a[field] || 0;
                    const bVal = b[field] || 0;
                    return direction === 'desc' ? bVal - aVal : aVal - bVal;
                });
            }
        }

        console.log('✅ Final query result:', processedData.length, 'rows');
        if (processedData.length > 0) {
            console.log('📊 Sample result:', processedData[0]);
        }

        return processedData;
    }

    // Check if query matches expected solution patterns
    validateQuery(userQuery, scenarioId) {
        console.log('🔍 Validating query for scenario:', scenarioId);
        
        const scenario = this.scenarios[scenarioId];
        if (!scenario) {
            console.error('❌ Scenario not found for validation');
            return { valid: false, message: 'Scenario not found' };
        }

        const solution = this.currentScenarioData?.solution;
        if (!solution) {
            console.error('❌ No solution available for validation');
            return { valid: false, message: 'No solution available' };
        }

        // Execute user query
        console.log('🔄 Executing user query...');
        const userResults = this.executeQuery(userQuery);
        if (!userResults.success) {
            console.error('❌ User query execution failed');
            return { valid: false, message: 'Query execution failed: ' + userResults.error };
        }

        console.log('📊 User query results:', userResults.data.length, 'rows');

        // Basic validation - check if results meet criteria
        const userResultsData = userResults.data;
        const expectedCriteria = scenario.expectedResults;

        console.log('📋 Expected criteria:', expectedCriteria);
        console.log('📊 Actual results count:', userResultsData.length);

        if (userResultsData.length >= expectedCriteria.minRows) {
            console.log('✅ Query validation successful!');
            return { 
                valid: true, 
                message: 'Query executed successfully!',
                results: userResultsData
            };
        } else {
            console.log('❌ Query validation failed - insufficient results');
            return { 
                valid: false, 
                message: `Expected at least ${expectedCriteria.minRows} results, got ${userResultsData.length}` 
            };
        }
    }
}

// Initialize global data loader
window.dataLoader = new DataLoader();