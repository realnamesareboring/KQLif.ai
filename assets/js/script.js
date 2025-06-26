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
            
            // Generate legitimate successful logins (last 24 hours)
            for (let i = 0; i < 45; i++) {
                const timeOffset = Math.random() * 24 * 60 * 60 * 1000; // Random time in last 24h
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
            
            // Generate password spray attack from 203.0.113.45
            const sprayIP = '203.0.113.45';
            const sprayStartTime = now.getTime() - (8 * 60 * 60 * 1000); // 8 hours ago
            
            for (let i = 0; i < 18; i++) {
                const timeOffset = Math.random() * 2 * 60 * 60 * 1000; // Spread over 2 hours
                const timestamp = new Date(sprayStartTime + timeOffset);
                
                logs.push({
                    TimeGenerated: timestamp.toISOString().slice(0, 19) + 'Z',
                    UserPrincipalName: sprayTargets[i],
                    IPAddress: sprayIP,
                    Location: 'Unknown',
                    ResultType: '50126', // Invalid username or password
                    AppDisplayName: 'Microsoft 365',
                    ClientAppUsed: 'Browser'
                });
            }
            
            // Generate some brute force against single user from different IP
            const bruteIP = '198.51.100.88';
            const bruteTarget = 'admin@contoso.com';
            const bruteStartTime = now.getTime() - (12 * 60 * 60 * 1000); // 12 hours ago
            
            for (let i = 0; i < 8; i++) {
                const timeOffset = i * 5 * 60 * 1000; // Every 5 minutes
                const timestamp = new Date(bruteStartTime + timeOffset);
                
                logs.push({
                    TimeGenerated: timestamp.toISOString().slice(0, 19) + 'Z',
                    UserPrincipalName: bruteTarget,
                    IPAddress: bruteIP,
                    Location: 'Unknown',
                    ResultType: '50126',
                    AppDisplayName: 'Microsoft 365',
                    ClientAppUsed: 'Browser'
                });
            }
            
            // Add some failed logins from legitimate users (wrong password, MFA failures)
            for (let i = 0; i < 12; i++) {
                const timeOffset = Math.random() * 24 * 60 * 60 * 1000;
                const timestamp = new Date(now.getTime() - timeOffset);
                
                logs.push({
                    TimeGenerated: timestamp.toISOString().slice(0, 19) + 'Z',
                    UserPrincipalName: legitUsers[Math.floor(Math.random() * legitUsers.length)],
                    IPAddress: legitIPs[Math.floor(Math.random() * legitIPs.length)],
                    Location: ['Seattle, WA', 'New York, NY', 'Chicago, IL'][Math.floor(Math.random() * 3)],
                    ResultType: ['50126', '50074', '50076'][Math.floor(Math.random() * 3)], // Various failure types
                    AppDisplayName: apps[Math.floor(Math.random() * apps.length)],
                    ClientAppUsed: clients[Math.floor(Math.random() * clients.length)]
                });
            }
            
            // Sort by timestamp (most recent first)
            logs.sort((a, b) => new Date(b.TimeGenerated) - new Date(a.TimeGenerated));
            
            return logs;
        }

        function populateRawLogs() {
            rawLogsData = generateSigninLogs();
            const tbody = document.getElementById('raw-logs-tbody');
            
            tbody.innerHTML = rawLogsData.map((log, index) => {
                let rowClass = '';
                let resultClass = 'result-type-0';
                let ipClass = '';
                
                if (log.ResultType !== '0') {
                    rowClass = 'log-failed';
                    resultClass = 'result-type-failed';
                } else {
                    rowClass = 'log-success';
                }
                
                if (log.IPAddress === '203.0.113.45') {
                    rowClass = 'log-spray-ip';
                    ipClass = 'suspicious-ip';
                }
                
                const resultText = log.ResultType === '0' ? 'Success' : `Failed (${log.ResultType})`;
                
                return `
                    <tr class="${rowClass}">
                        <td>${log.TimeGenerated}</td>
                        <td>${log.UserPrincipalName}</td>
                        <td class="${ipClass}">${log.IPAddress}</td>
                        <td>${log.Location}</td>
                        <td class="${resultClass}">${resultText}</td>
                        <td>${log.AppDisplayName}</td>
                        <td>${log.ClientAppUsed}</td>
                    </tr>
                `;
            }).join('');
        }

        // Scenario data
        const scenarios = {
            'password-spray': {
                title: 'Password Spray Attack Detection',
                platform: 'Microsoft Entra ID',
                difficulty: 'Beginner - Intermediate',
                duration: '15-20 minutes',
                points: '250 XP',
                description: `<strong>Scenario:</strong> A Security Operations Center has detected unusual authentication patterns across multiple user accounts. 
                Your task is to identify a potential password spray attack using KQL queries against Microsoft Entra ID sign-in logs. 
                <br><br>
                <strong>Learning Objectives:</strong> Master aggregation functions, time windows, IP address analysis, and user behavior correlation.
                <br><br>
                <strong>Data Sources:</strong> SigninLogs table from Microsoft Entra ID`,
                hint: 'Start by filtering the SigninLogs table for failed authentication attempts (ResultType != 0). Then group by source IP address and count the number of unique users targeted.',
                defaultQuery: `SigninLogs
| where TimeGenerated > ago(24h)
| where ResultType != 0  // Failed logins only
| summarize 
    UniqueUsers = dcount(UserPrincipalName),
    FailedAttempts = count()
    by IPAddress
| where UniqueUsers >= 5  // Potential spray threshold
| order by UniqueUsers desc`
            },
            'brute-force': {
                title: 'Brute Force Attack Analysis',
                platform: 'Microsoft Entra ID',
                difficulty: 'Beginner',
                duration: '10-15 minutes',
                points: '200 XP',
                description: `<strong>Scenario:</strong> Multiple failed login attempts against a single user account have been detected. Investigate potential brute force attacks targeting high-value accounts.
                <br><br>
                <strong>Learning Objectives:</strong> Basic filtering, counting operations, and user-focused analysis.
                <br><br>
                <strong>Data Sources:</strong> SigninLogs table from Microsoft Entra ID`,
                hint: 'Focus on a single user account and count failed login attempts over time. Look for patterns that indicate automated attacks.',
                defaultQuery: `SigninLogs
| where TimeGenerated > ago(24h)
| where ResultType != 0
| summarize FailedAttempts = count() by UserPrincipalName
| where FailedAttempts >= 10
| order by FailedAttempts desc`
            },
            's3-ransomware': {
                title: 'AWS S3 Ransomware via SSE-C',
                platform: 'Amazon S3',
                difficulty: 'Advanced',
                duration: '30-40 minutes',
                points: '500 XP',
                description: `<strong>Scenario:</strong> Threat actor "Codefinger" has been using compromised AWS credentials to encrypt S3 bucket data using Server-Side Encryption with Customer-Provided Keys (SSE-C).
                <br><br>
                <strong>Learning Objectives:</strong> Advanced encryption analysis, native service abuse detection, API call correlation.
                <br><br>
                <strong>Data Sources:</strong> AWS CloudTrail, S3 Access Logs`,
                hint: 'Look for unusual PutObject operations with SSE-C parameters, followed by lifecycle policy changes and ransom note uploads.',
                defaultQuery: `AWSCloudTrail
| where TimeGenerated > ago(24h)
| where EventName in ("PutObject", "PutBucketLifecycle")
| where RequestParameters contains "ServerSideEncryption"
| summarize Operations = make_list(EventName) by SourceIPAddress, UserIdentityUserName
| where array_length(Operations) > 1`
            }
        };

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

        function loadScenario(scenarioId) {
            const scenario = scenarios[scenarioId];
            if (!scenario) {
                console.log('Scenario not found:', scenarioId);
                return;
            }
            
            // Update scenario details
            document.getElementById('scenario-title').textContent = scenario.title;
            document.getElementById('scenario-platform').textContent = scenario.platform;
            document.getElementById('scenario-difficulty').textContent = scenario.difficulty;
            document.getElementById('scenario-duration').textContent = scenario.duration;
            document.getElementById('scenario-points').textContent = scenario.points;
            document.getElementById('scenario-description').innerHTML = scenario.description;
            document.getElementById('hint-content').textContent = scenario.hint;
            document.getElementById('query-editor').value = scenario.defaultQuery;
            
            // Hide hint panel and results
            document.getElementById('hint-panel').classList.remove('show');
            document.getElementById('results-workspace').style.display = 'none';
            
            // Update line numbers
            updateLineNumbers();
            
            // Initialize data based on scenario
            if (scenarioId === 'password-spray') {
                // Generate and populate raw logs
                populateRawLogs();
            }
        }

        function runQuery() {
            const query = document.getElementById('query-editor').value;
            const resultsWorkspace = document.getElementById('results-workspace');
            const resultsContent = document.getElementById('results-content');
            const resultCount = document.getElementById('result-count');
            
            // Show results workspace
            resultsWorkspace.style.display = 'block';
            
            // Scroll to results
            resultsWorkspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // Simulate query execution
            resultsContent.innerHTML = '<div style="color: #ff9800; padding: 1rem; text-align: center;">⏳ Executing query...</div>';
            resultCount.textContent = 'Processing...';
            
            setTimeout(() => {
                if (selectedScenario === 'password-spray') {
                    // Analyze the raw logs to generate results
                    const failedLogins = rawLogsData.filter(log => log.ResultType !== '0');
                    const ipSummary = {};
                    
                    failedLogins.forEach(log => {
                        if (!ipSummary[log.IPAddress]) {
                            ipSummary[log.IPAddress] = {
                                users: new Set(),
                                attempts: 0
                            };
                        }
                        ipSummary[log.IPAddress].users.add(log.UserPrincipalName);
                        ipSummary[log.IPAddress].attempts++;
                    });
                    
                    // Convert to array and filter for potential sprays
                    const results = Object.entries(ipSummary)
                        .map(([ip, data]) => ({
                            IPAddress: ip,
                            UniqueUsers: data.users.size,
                            FailedAttempts: data.attempts
                        }))
                        .filter(result => result.UniqueUsers >= 5)
                        .sort((a, b) => b.UniqueUsers - a.UniqueUsers);
                    
                    if (results.length > 0) {
                        resultsContent.innerHTML = `
                            <div style="font-family: monospace; font-size: 0.85rem;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr style="background: #f8f9fa; color: #2c5aa0; font-weight: 600;">
                                    <th style="padding: 0.8rem; text-align: left; border-bottom: 2px solid #2c5aa0;">IPAddress</th>
                                    <th style="padding: 0.8rem; text-align: left; border-bottom: 2px solid #2c5aa0;">UniqueUsers</th>
                                    <th style="padding: 0.8rem; text-align: left; border-bottom: 2px solid #2c5aa0;">FailedAttempts</th>
                                </tr>
                                ${results.map(result => `
                                    <tr style="border-bottom: 1px solid #e9ecef;">
                                        <td style="padding: 0.8rem; ${result.IPAddress === '203.0.113.45' ? 'color: #f44336; font-weight: 600;' : ''}">${result.IPAddress}</td>
                                        <td style="padding: 0.8rem; color: ${result.UniqueUsers > 15 ? '#f44336' : result.UniqueUsers > 10 ? '#ff9800' : '#4caf50'}; font-weight: 600;">${result.UniqueUsers}</td>
                                        <td style="padding: 0.8rem;">${result.FailedAttempts}</td>
                                    </tr>
                                `).join('')}
                            </table>
                            <div style="margin-top: 1.5rem; color: #4caf50; background: #e8f5e8; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #4caf50;">
                                <strong>🎯 Excellent Detection!</strong> Your query identified <strong>${results[0].UniqueUsers}</strong> unique users targeted from IP <strong>${results[0].IPAddress}</strong> - this is a clear password spray attack pattern!
                                <br><br>
                                <strong>Key Indicators:</strong>
                                <ul style="margin: 0.5rem 0; padding-left: 1.5rem; line-height: 1.6;">
                                    <li>High ratio of unique users to total attempts</li>
                                    <li>Failed authentication attempts across multiple accounts</li>
                                    <li>Single source IP address targeting many users</li>
                                    <li>Consistent ResultType (50126) indicating invalid credentials</li>
                                </ul>
                                <br>
                                <strong>💡 Next Steps:</strong> Investigate the target users to identify high-value accounts and consider blocking the source IP address.
                            </div>
                            </div>
                        `;
                        resultCount.textContent = `${results.length} suspicious IP(s) found • Query completed in 1.8s`;
                    } else {
                        resultsContent.innerHTML = `
                            <div style="color: #2c5aa0; background: #f0f4f8; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #2c5aa0;">
                                <strong>ℹ️ No Results</strong><br>
                                No password spray patterns detected with current thresholds. Try adjusting the UniqueUsers threshold or time window.
                            </div>
                        `;
                        resultCount.textContent = 'Query completed - No matches found';
                    }
                } else {
                    resultsContent.innerHTML = `
                        <div style="color: #4caf50; background: #e8f5e8; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #4caf50;">
                            <strong>✅ Query Executed Successfully!</strong><br>
                            Results will vary based on the selected scenario. This scenario data is not yet implemented.
                        </div>
                    `;
                    resultCount.textContent = 'Query completed successfully';
                }
            }, 1500);
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

        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            updateLineNumbers();
            // Load password spray scenario by default for demo
            if (!selectedScenario) {
                selectedScenario = 'password-spray';
                loadScenario('password-spray');
            }
        });