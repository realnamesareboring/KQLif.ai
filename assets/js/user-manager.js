// user-manager.js - User Profile & Progress Management
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
                            <li>🎖️ Achievements unlocked</li>
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

    completeScenario(scenarioName, xpReward) {
        console.log('🎓 completeScenario called:', scenarioName, 'XP:', xpReward);
        
        // Mark scenario as completed
        const completed = this.getCompletedScenarios();
        console.log('Current completed scenarios:', completed);
        
        if (!completed.includes(scenarioName)) {
            console.log('✅ New scenario completion detected');
            completed.push(scenarioName);
            localStorage.setItem('kql_scenarios_completed', JSON.stringify(completed));
            
            // Award XP
            console.log('🏆 Awarding XP...');
            this.addXP(xpReward, scenarioName);
            
            // 🎯 ADD THIS LINE
            markScenarioCompleted(scenarioName);
        } else {
            console.log('⚠️ Scenario already completed, no XP awarded');
        }
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