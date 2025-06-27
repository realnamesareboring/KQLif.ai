// user-manager.js - User Profile & Progress Management with Recovery System
class UserManager {
    constructor() {
        this.defaultRanks = [
            { title: 'Security Rookie', subtitle: 'Just Starting Out', minXP: 0, maxXP: 499 },
            { title: 'Cyber Detective', subtitle: 'Security Analyst', minXP: 500, maxXP: 1499 },
            { title: 'Threat Hunter', subtitle: 'Security Specialist', minXP: 1500, maxXP: 2999 },
            { title: 'SOC Master', subtitle: 'Senior Analyst', minXP: 3000, maxXP: 5999 },
            { title: 'Security Expert', subtitle: 'Principal Analyst', minXP: 6000, maxXP: 9999 },
            { title: 'Cyber Guardian', subtitle: 'Security Architect', minXP: 10000, maxXP: 19999 },
            { title: 'Elite Defender', subtitle: 'Security Leader', minXP: 20000, maxXP: 99999 }
        ];
        
        // Recovery code mappings
        this.scenarioCodes = {
            'password-spray': 'PWS-7K4M',
            'brute-force': 'BRU-8L5N',
            's3-ransomware': 'S3R-9M6O'
        };
        
        this.init();
    }

    init() {
        // Check if user exists
        if (!this.hasUser()) {
            this.showWelcomeModal();
        } else {
            this.updateUI();
        }
    }

    hasUser() {
        return localStorage.getItem('kql_user_name') !== null;
    }

    showWelcomeModal() {
        const modal = this.createWelcomeModal();
        document.body.appendChild(modal);
        modal.style.display = 'flex';
        
        // Focus on input
        setTimeout(() => {
            document.getElementById('user-name-input').focus();
        }, 100);
    }

    createWelcomeModal() {
        const modal = document.createElement('div');
        modal.className = 'welcome-modal-overlay';
        modal.innerHTML = `
            <div class="welcome-modal">
                <div class="welcome-header">
                    <h2>🎯 Welcome to KQL Security Training!</h2>
                    <p>Let's personalize your learning journey</p>
                </div>
                <div class="welcome-content">
                    <label for="user-name-input">What should I call you?</label>
                    <input type="text" id="user-name-input" placeholder="Enter your name..." maxlength="30">
                    <div class="welcome-benefits">
                        <h4>🚀 Your Progress Will Be Tracked:</h4>
                        <ul>
                            <li>✅ Scenarios completed</li>
                            <li>🏆 XP points earned</li>
                            <li>📈 Rank progression</li>
                            <li>🎖️ Completion certificates</li>
                            <li>🔐 Recovery codes for progress backup</li>
                        </ul>
                    </div>
                </div>
                <div class="welcome-actions">
                    <button class="btn btn-primary" onclick="userManager.saveUser()">Start Learning!</button>
                </div>
            </div>
        `;
        return modal;
    }

    saveUser() {
        const nameInput = document.getElementById('user-name-input');
        const userName = nameInput.value.trim();
        
        if (!userName) {
            nameInput.style.borderColor = '#f44336';
            nameInput.placeholder = 'Please enter your name!';
            return;
        }

        // Save user data
        localStorage.setItem('kql_user_name', userName);
        localStorage.setItem('kql_user_xp', '0');
        localStorage.setItem('kql_scenarios_completed', JSON.stringify([]));
        localStorage.setItem('kql_user_created', new Date().toISOString());

        // Remove modal
        document.querySelector('.welcome-modal-overlay').remove();
        
        // Update UI
        this.updateUI();
        
        // Show welcome message
        this.showWelcomeMessage(userName);
    }

    showWelcomeMessage(name) {
        const toast = document.createElement('div');
        toast.className = 'welcome-toast';
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">👋</span>
                <div>
                    <strong>Welcome aboard, ${name}!</strong>
                    <br>Ready to become a KQL master?
                </div>
            </div>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    updateUI() {
        const userName = this.getUserName();
        const userXP = this.getUserXP();
        const rank = this.getCurrentRank(userXP);
        
        // Update rank system in header
        const rankInfo = document.querySelector('.rank-info');
        const xpText = document.querySelector('.xp-text');
        const xpFill = document.querySelector('.xp-fill');
        
        if (rankInfo) {
            rankInfo.innerHTML = `
                <div class="rank-title">${rank.title}</div>
                <div class="rank-subtitle">${userName}</div>
            `;
        }
        
        if (xpText) {
            const nextRank = this.getNextRank(userXP);
            if (nextRank) {
                xpText.textContent = `${userXP} / ${nextRank.minXP} XP`;
                const progress = ((userXP - rank.minXP) / (nextRank.minXP - rank.minXP)) * 100;
                if (xpFill) {
                    xpFill.style.width = Math.min(progress, 100) + '%';
                }
            } else {
                xpText.textContent = `${userXP} XP (Max Rank!)`;
                if (xpFill) {
                    xpFill.style.width = '100%';
                }
            }
        }
    }

    getCurrentRank(xp) {
        for (let i = this.defaultRanks.length - 1; i >= 0; i--) {
            if (xp >= this.defaultRanks[i].minXP) {
                return this.defaultRanks[i];
            }
        }
        return this.defaultRanks[0];
    }

    getNextRank(xp) {
        const currentRank = this.getCurrentRank(xp);
        const currentIndex = this.defaultRanks.indexOf(currentRank);
        return currentIndex < this.defaultRanks.length - 1 ? this.defaultRanks[currentIndex + 1] : null;
    }

    addXP(points, scenarioName = '') {
        const currentXP = this.getUserXP();
        const newXP = currentXP + points;
        const oldRank = this.getCurrentRank(currentXP);
        const newRank = this.getCurrentRank(newXP);
        
        localStorage.setItem('kql_user_xp', newXP.toString());
        
        // Check for rank up
        if (oldRank.title !== newRank.title) {
            this.showRankUpModal(newRank, points);
        } else {
            this.showXPGain(points, scenarioName);
        }
        
        this.updateUI();
    }

    showRankUpModal(newRank, xpGained) {
        const modal = document.createElement('div');
        modal.className = 'rankup-modal-overlay';
        modal.innerHTML = `
            <div class="rankup-modal">
                <div class="rankup-animation">🎉</div>
                <h2>Rank Up!</h2>
                <div class="new-rank">
                    <div class="rank-title">${newRank.title}</div>
                    <div class="rank-subtitle">${newRank.subtitle}</div>
                </div>
                <div class="xp-gained">+${xpGained} XP</div>
                <button class="btn btn-primary" onclick="this.parentElement.parentElement.remove()">
                    Continue Learning! 🚀
                </button>
            </div>
        `;
        document.body.appendChild(modal);
        
        setTimeout(() => modal.classList.add('show'), 100);
    }

    showXPGain(points, scenarioName) {
        const toast = document.createElement('div');
        toast.className = 'xp-toast';
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">⭐</span>
                <div>
                    <strong>+${points} XP</strong>
                    ${scenarioName ? `<br>${scenarioName} completed!` : ''}
                </div>
            </div>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Enhanced completion with recovery code generation
    completeScenario(scenarioName, xpReward) {
        console.log('🎓 completeScenario called:', scenarioName, 'XP:', xpReward);
        
        const completed = this.getCompletedScenarios();
        
        if (!completed.includes(scenarioName)) {
            console.log('✅ New scenario completion detected');
            completed.push(scenarioName);
            localStorage.setItem('kql_scenarios_completed', JSON.stringify(completed));
            
            // Award XP
            this.addXP(xpReward, scenarioName);
            
            // Generate and show completion code
            const completionCode = this.generateCompletionCode(scenarioName);
            if (completionCode) {
                setTimeout(() => {
                    this.showCompletionCodeModal(scenarioName, completionCode);
                }, 2000); // Show after XP animation
            }
            
            markScenarioCompleted(scenarioName);
        } else {
            console.log('⚠️ Scenario already completed, no XP awarded');
        }
    }

    // Generate scenario completion codes
    generateCompletionCode(scenarioId) {
        const baseCode = this.scenarioCodes[scenarioId];
        if (!baseCode) return null;
        
        const userName = this.getUserName();
        const timestamp = Date.now();
        const hash = this.simpleHash(`${userName}-${scenarioId}-${timestamp}`);
        const suffix = Math.abs(hash).toString(36).toUpperCase().slice(0, 4);
        
        return `${baseCode}-${suffix}`;
    }

    // Validate and apply completion codes
    validateCompletionCode(code) {
        const parts = code.split('-');
        if (parts.length !== 3) {
            return { valid: false, message: 'Invalid code format. Use format: PWS-7K4M-ABCD' };
        }
        
        const scenarioPrefix = parts.slice(0, 2).join('-');
        const scenarioId = Object.keys(this.scenarioCodes).find(id => 
            this.scenarioCodes[id] === scenarioPrefix
        );
        
        if (!scenarioId) {
            return { valid: false, message: 'Unknown scenario code' };
        }
        
        // Check if already completed
        const completed = this.getCompletedScenarios();
        if (completed.includes(scenarioId)) {
            return { valid: false, message: 'Scenario already completed!' };
        }
        
        // Mark as completed and award XP
        completed.push(scenarioId);
        localStorage.setItem('kql_scenarios_completed', JSON.stringify(completed));
        
        const scenarioMetadata = window.dataLoader?.getScenarioMetadata(scenarioId);
        if (scenarioMetadata?.xpReward) {
            this.addXP(scenarioMetadata.xpReward, scenarioId);
        }
        
        markScenarioCompleted(scenarioId);
        
        return { 
            valid: true, 
            scenarioId, 
            message: `🎯 Successfully unlocked: ${scenarioId.replace('-', ' ')}!` 
        };
    }

    // Generate master recovery code
    generateMasterRecoveryCode() {
        const userData = {
            name: this.getUserName(),
            xp: this.getUserXP(),
            completed: this.getCompletedScenarios(),
            created: localStorage.getItem('kql_user_created'),
            version: 1
        };
        
        const encoded = btoa(JSON.stringify(userData));
        const hash = this.simpleHash(encoded).toString(36).toUpperCase().slice(0, 8);
        return `MASTER-${hash}-${Date.now().toString(36).toUpperCase()}`;
    }

    // Show completion code modal
    showCompletionCodeModal(scenarioName, code) {
        const modal = document.createElement('div');
        modal.className = 'rankup-modal-overlay';
        modal.innerHTML = `
            <div class="rankup-modal">
                <div class="rankup-animation">🎯</div>
                <h2>Scenario Completed!</h2>
                <div class="new-rank">
                    <div class="rank-title">${scenarioName.replace('-', ' ')}</div>
                    <div class="rank-subtitle">Challenge Mastered</div>
                </div>
                <div style="background: rgba(255,255,255,0.2); padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                    <strong>🔐 Your Completion Code:</strong><br>
                    <span style="font-family: monospace; font-size: 1.2rem; letter-spacing: 2px; color: #81c784;">${code}</span>
                </div>
                <p style="font-size: 0.9rem; opacity: 0.9;">💾 Save this code to restore progress or prove completion!</p>
                <button class="btn btn-primary" onclick="this.parentElement.parentElement.remove()">
                    Continue Training! 🚀
                </button>
            </div>
        `;
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 100);
    }

// Show recovery system modal - FIXED VERSION
showRecoveryModal() {
    const modal = document.createElement('div');
    modal.className = 'welcome-modal-overlay';
    modal.id = 'recovery-modal-overlay'; // Add ID for easy targeting
    modal.innerHTML = `
        <div class="welcome-modal" style="max-width: 600px;">
            <div class="welcome-header">
                <h2>🔐 Progress Recovery & Verification</h2>
                <p>Backup, restore, and verify your training progress</p>
            </div>
            <div class="welcome-content">
                <div style="margin-bottom: 1.5rem; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                    <h4 style="color: #2c5aa0; margin-bottom: 0.5rem;">🏆 Generate Certificate</h4>
                    <p style="font-size: 0.9rem; color: #666; margin-bottom: 1rem;">Create a printable certificate of your achievements</p>
                    <button class="btn btn-primary" onclick="userManager.generateAndShowCertificate()">🖨️ Generate Certificate</button>
                </div>
                
                <div style="margin-bottom: 1.5rem; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                    <h4 style="color: #2c5aa0; margin-bottom: 0.5rem;">💾 Master Recovery Code</h4>
                    <p style="font-size: 0.9rem; color: #666; margin-bottom: 1rem;">Backup all your progress with a single code</p>
                    <button class="btn btn-secondary" onclick="userManager.showMasterCode()">🔑 Generate Backup Code</button>
                </div>
                
                <div style="margin-bottom: 1.5rem; padding: 1rem; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
                    <h4 style="color: #856404; margin-bottom: 0.5rem;">🎯 Enter Completion Code</h4>
                    <p style="font-size: 0.9rem; color: #856404; margin-bottom: 1rem;">Unlock scenarios with completion codes</p>
                    <input type="text" id="completion-code" placeholder="PWS-7K4M-ABCD" style="width: 100%; margin-bottom: 0.5rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    <button class="btn btn-primary" onclick="userManager.validateCodeFromModal()">🔓 Unlock Scenario</button>
                    <div id="validation-result" style="margin-top: 0.5rem; font-size: 0.9rem;"></div>
                </div>
            </div>
            <div class="welcome-actions">
                <button class="btn btn-secondary" onclick="userManager.closeRecoveryModal()">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    // Add click outside to close functionality
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            userManager.closeRecoveryModal();
        }
    });
}

// NEW: Dedicated method to properly close recovery modal
closeRecoveryModal() {
    const modal = document.getElementById('recovery-modal-overlay');
    if (modal) {
        modal.remove();
    }
    
    // Ensure any leftover modal overlays are removed
    const anyModalOverlays = document.querySelectorAll('.welcome-modal-overlay');
    anyModalOverlays.forEach(overlay => {
        overlay.remove();
    });
    
    console.log('✅ Recovery modal closed successfully');
}

// Also update validateCodeFromModal to use the new close method
validateCodeFromModal() {
    const codeInput = document.getElementById('completion-code');
    const resultDiv = document.getElementById('validation-result');
    const code = codeInput.value.trim().toUpperCase();
    
    if (!code) {
        resultDiv.innerHTML = '<span style="color: #f44336;">Please enter a completion code</span>';
        return;
    }
    
    const result = this.validateCompletionCode(code);
    
    if (result.valid) {
        resultDiv.innerHTML = `<span style="color: #4caf50;">${result.message}</span>`;
        codeInput.value = '';
        
        // Update UI to show new completion
        setTimeout(() => {
            updateSidebarProgress();
            this.updateUI();
            
            // Auto-close modal after successful completion
            setTimeout(() => {
                this.closeRecoveryModal();
                
                // Show success toast
                this.showXPGain(0, `Scenario unlocked: ${result.scenarioId}`);
            }, 1500);
        }, 500);
    } else {
        resultDiv.innerHTML = `<span style="color: #f44336;">${result.message}</span>`;
    }
}

    // Generate and show master recovery code
    showMasterCode() {
        const code = this.generateMasterRecoveryCode();
        alert(`🔐 Master Recovery Code:\n\n${code}\n\n💾 Save this code to restore your complete progress later!`);
    }

    // Generate certificate
    generateAndShowCertificate() {
        const userData = {
            name: this.getUserName(),
            rank: this.getCurrentRank(this.getUserXP()),
            xp: this.getUserXP(),
            completed: this.getCompletedScenarios().length,
            completedScenarios: this.getCompletedScenarios(),
            dateGenerated: new Date().toLocaleDateString()
        };
        
        const certificateHTML = this.createCertificateHTML(userData);
        
        // Open in new window for printing
        const newWindow = window.open('', '_blank');
        newWindow.document.write(certificateHTML);
        newWindow.document.close();
    }

    createCertificateHTML(userData) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>KQL Security Training Certificate - ${userData.name}</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; background: #f8f9fa; }
                .certificate { border: 3px solid #2c5aa0; padding: 3rem; text-align: center; background: linear-gradient(135deg, #ffffff 0%, #e3f2fd 100%); box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
                .title { font-size: 2.5rem; color: #2c5aa0; margin-bottom: 0.5rem; font-weight: 700; }
                .subtitle { font-size: 1.2rem; color: #666; margin-bottom: 2rem; }
                .name { font-size: 2rem; color: #1e3d6f; margin: 1.5rem 0; font-weight: 600; border-bottom: 2px solid #2c5aa0; padding-bottom: 0.5rem; display: inline-block; }
                .rank { font-size: 1.5rem; color: #4caf50; margin: 1rem 0; font-weight: 600; }
                .details { margin: 2rem 0; line-height: 1.8; font-size: 1.1rem; text-align: left; background: #f8f9fa; padding: 1.5rem; border-radius: 8px; }
                .signature { margin-top: 3rem; border-top: 2px solid #2c5aa0; padding-top: 1rem; font-size: 0.9rem; color: #666; }
                .logo { font-size: 3rem; margin-bottom: 1rem; }
                @media print { body { margin: 0; background: white; } }
            </style>
        </head>
        <body>
            <div class="certificate">
                <div class="logo">🛡️</div>
                <div class="title">KQL Security Training Platform</div>
                <div class="subtitle">Certificate of Completion</div>
                
                <div>This is to certify that</div>
                <div class="name">${userData.name}</div>
                <div>has successfully completed KQL Security Training challenges</div>
                
                <div class="rank">🏆 Achieved Rank: ${userData.rank.title}</div>
                
                <div class="details">
                    <strong>📊 Training Summary:</strong><br>
                    • Total Experience Points: <strong>${userData.xp} XP</strong><br>
                    • Security Scenarios Completed: <strong>${userData.completed}</strong><br>
                    • Current Skill Level: <strong>${userData.rank.subtitle}</strong><br>
                    • Certificate Generated: <strong>${userData.dateGenerated}</strong><br>
                    ${userData.completedScenarios.length > 0 ? `• Mastered Scenarios: <strong>${userData.completedScenarios.map(s => s.replace('-', ' ')).join(', ')}</strong>` : ''}
                </div>
                
                <div class="signature">
                    <strong>KQL Security Training Platform</strong><br>
                    Professional Cybersecurity Education<br>
                    Certificate ID: KQL-${userData.xp}-${Date.now().toString(36).toUpperCase()}
                </div>
            </div>
            
            <script>
                window.onload = function() {
                    setTimeout(() => {
                        if (confirm('🖨️ Print certificate now?')) {
                            window.print();
                        }
                    }, 500);
                }
            </script>
        </body>
        </html>
        `;
    }

    // Helper functions
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }

    getCompletedScenarios() {
        const completed = localStorage.getItem('kql_scenarios_completed');
        try {
            return completed ? JSON.parse(completed) : [];
        } catch (e) {
            return [];
        }
    }

    getUserName() {
        return localStorage.getItem('kql_user_name') || 'Security Analyst';
    }

    getUserXP() {
        return parseInt(localStorage.getItem('kql_user_xp')) || 0;
    }

    resetProgress() {
        if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
            localStorage.removeItem('kql_user_name');
            localStorage.removeItem('kql_user_xp');
            localStorage.removeItem('kql_scenarios_completed');
            localStorage.removeItem('kql_user_created');
            location.reload();
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.userManager = new UserManager();
});