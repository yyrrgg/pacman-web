class PacmanGame {
    constructor() {
        console.log('游戏构造函数被调用');
        // 等待 DOM 加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeGame());
        } else {
            this.initializeGame();
        }
    }

    initializeGame() {
        console.log('开始初始化游戏');
        
        // 获取画布和容器
        this.canvas = document.getElementById('gameCanvas');
        const container = this.canvas.parentElement;
        
        // 设置画布大小为容器大小
        const containerSize = Math.min(container.offsetWidth, container.offsetHeight);
        this.canvas.width = containerSize;
        this.canvas.height = containerSize;
        
        this.ctx = this.canvas.getContext('2d');
        
        // 初始化游戏状态
        this.gameStates = {
            IDLE: 'idle',
            RUNNING: 'running',
            PAUSED: 'paused',
            VICTORY: 'victory'
        };
        this.currentState = this.gameStates.IDLE;
        
        // 初始化游戏数据
        this.dots = [];
        this.initialDotsCount = 0;
        this.gridSize = 40;
        
        // 初始化吃豆人
        this.pacman = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            size: containerSize / 20, // 相对大小
            speed: 0.02 * 10,
            direction: 0,
            mouthOpen: 0,
            isMoving: false
        };
        
        // 获取控制元素
        this.playButton = document.getElementById('playButton');
        this.restartButton = document.getElementById('restartButton');
        this.gameStatusElement = document.getElementById('gameStatus');
        this.progressText = document.getElementById('progressText');
        this.progressBar = document.getElementById('progressBar');
        this.speedControl = document.getElementById('speedControl');
        this.speedValue = document.getElementById('speedValue');
        this.densityControl = document.getElementById('densityControl');
        this.densityValue = document.getElementById('densityValue');
        
        // 设置控制范围
        this.setupControls();
        
        // 绑定事件
        this.bindEvents();
        
        // 初始化语音识别
        this.initSpeechRecognition();
        
        // 添加窗口大小改变事件
        window.addEventListener('resize', () => this.handleResize());
        
        // 初始绘制
        this.draw();
        console.log('游戏初始化完成');
    }

    setupControls() {
        // 设置速度控制
        this.speedControl.min = "0.01";
        this.speedControl.max = "0.1";
        this.speedControl.value = "0.02";
        this.speedControl.step = "0.01";
        this.speedValue.textContent = this.speedControl.value;
        
        // 设置密度控制
        this.densityControl.min = "20";
        this.densityControl.max = "60";
        this.densityControl.value = "40";
        this.densityControl.step = "10";
        this.densityValue.textContent = this.getDensityText(this.densityControl.value);
        
        // 初始按钮状态
        this.restartButton.disabled = true;
    }

    bindEvents() {
        // 绑定按钮事件
        this.playButton.onclick = () => this.togglePlay();
        this.restartButton.onclick = () => this.restartGame();
        
        // 绑定控制事件
        this.speedControl.addEventListener('input', () => {
            const newSpeed = parseFloat(this.speedControl.value);
            this.pacman.speed = newSpeed * 10;
            this.speedValue.textContent = newSpeed.toFixed(2);
        });
        
        this.densityControl.addEventListener('input', () => {
            const newDensity = parseInt(this.densityControl.value);
            this.gridSize = newDensity;
            this.densityValue.textContent = this.getDensityText(newDensity);
            if (this.currentState === this.gameStates.RUNNING) {
                this.regenerateDots();
            }
        });
        
        // 绑定键盘事件
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // 添加触摸事件支持
        this.canvas.addEventListener('touchstart', (e) => this.handleTouch(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouch(e));
    }

    handleResize() {
        const container = this.canvas.parentElement;
        const newSize = Math.min(container.offsetWidth, container.offsetHeight);
        
        // 保存当前位置的相对坐标
        const relX = this.pacman.x / this.canvas.width;
        const relY = this.pacman.y / this.canvas.height;
        
        // 更新画布大小
        this.canvas.width = newSize;
        this.canvas.height = newSize;
        
        // 更新吃豆人位置和大小
        this.pacman.x = relX * newSize;
        this.pacman.y = relY * newSize;
        this.pacman.size = newSize / 20;
        
        // 更新豆子位置
        this.dots = this.dots.map(dot => ({
            x: (dot.x / this.canvas.width) * newSize,
            y: (dot.y / this.canvas.height) * newSize
        }));
    }

    handleTouch(e) {
        e.preventDefault();
        
        if (this.currentState !== this.gameStates.RUNNING) return;
        
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        // 计算相对于吃豆人的方向
        const dx = x - this.pacman.x;
        const dy = y - this.pacman.y;
        
        // 根据最大分量决定方向
        if (Math.abs(dx) > Math.abs(dy)) {
            this.pacman.direction = dx > 0 ? 0 : 2;
        } else {
            this.pacman.direction = dy > 0 ? 1 : 3;
        }
        
        this.pacman.isMoving = true;
    }

    getDensityText(density) {
        const densityMap = {
            "20": "非常密集",
            "30": "密集",
            "40": "正常",
            "50": "稀疏",
            "60": "非常稀疏"
        };
        return densityMap[density] || "正常";
    }

    startGame() {
        console.log('开始游戏');
        this.dots = [];
        this.generateDots();
        this.initialDotsCount = this.dots.length;
        
        this.currentState = this.gameStates.RUNNING;
        this.playButton.innerHTML = '⏸ 暂停';
        this.playButton.classList.add('playing');
        this.restartButton.disabled = false;
        this.gameStatusElement.textContent = '游戏进行中';
        
        // 开始游戏循环
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
        }
        this.gameLoop = requestAnimationFrame(() => this.update());
        
        console.log('游戏已启动', {
            dots: this.dots.length,
            state: this.currentState
        });
    }

    togglePlay() {
        console.log('切换游戏状态', this.currentState);
        switch(this.currentState) {
            case this.gameStates.IDLE:
                this.startGame();
                break;
            case this.gameStates.RUNNING:
                this.pauseGame();
                break;
            case this.gameStates.PAUSED:
                this.resumeGame();
                break;
        }
    }

    generateDots() {
        this.dots = [];
        for (let x = this.gridSize; x < this.canvas.width - this.gridSize; x += this.gridSize) {
            for (let y = this.gridSize; y < this.canvas.height - this.gridSize; y += this.gridSize) {
                // 添加随机偏移，使豆子分布更自然
                const offsetX = (Math.random() - 0.5) * (this.gridSize * 0.3);
                const offsetY = (Math.random() - 0.5) * (this.gridSize * 0.3);
                this.dots.push({ 
                    x: x + offsetX, 
                    y: y + offsetY 
                });
            }
        }
    }

    regenerateDots() {
        // 保存当前进度比例
        const progressRatio = this.dots.length / this.initialDotsCount;
        
        // 重新生成豆子
        this.generateDots();
        
        // 根据之前的进度比例移除相应数量的豆子
        const dotsToRemove = Math.floor(this.dots.length * (1 - progressRatio));
        if (dotsToRemove > 0) {
            // 随机移除豆子
            for (let i = 0; i < dotsToRemove; i++) {
                const randomIndex = Math.floor(Math.random() * this.dots.length);
                this.dots.splice(randomIndex, 1);
            }
        }
        
        // 更新初始豆子数量和进度显示
        this.initialDotsCount = this.dots.length / progressRatio;
        this.updateProgress();
    }

    updateProgress() {
        const eatenDots = this.initialDotsCount - this.dots.length;
        const progress = (eatenDots / this.initialDotsCount * 100).toFixed(1);
        
        // 更新进度文本和进度条
        this.progressText.textContent = `${progress}% (${eatenDots}/${this.initialDotsCount})`;
        this.progressBar.style.width = `${progress}%`;
    }

    initSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window)) {
            console.log('浏览器不支持语音识别');
            this.voiceButton.style.display = 'none';
            return;
        }

        this.recognition = new webkitSpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'zh-CN';

        // 获取语音相关元素
        this.voiceButton = document.getElementById('voiceButton');
        this.voiceText = document.getElementById('voiceText');
        this.voiceHistory = document.getElementById('voiceHistory');

        // 初始化语音控制状态
        this.isVoiceControlActive = false;

        // 绑定语音按钮事件
        this.voiceButton.addEventListener('click', () => {
            console.log('语音按钮被点击');
            if (!this.isVoiceControlActive) {
                this.startVoiceControl();
            } else {
                this.stopVoiceControl();
            }
        });

        // 语音识别事件处理
        this.recognition.onstart = () => {
            console.log('语音识别已启动');
            this.voiceButton.textContent = '🎤 正在听...';
            this.voiceButton.classList.add('active');
            this.voiceText.textContent = '请说话...';
        };

        this.recognition.onend = () => {
            console.log('语音识别已结束');
            if (this.isVoiceControlActive) {
                setTimeout(() => {
                    this.recognition.start();
                }, 100);
            } else {
                this.voiceButton.textContent = '🎤 语音控制';
                this.voiceButton.classList.remove('active');
                this.voiceText.textContent = '等待语音输入...';
            }
        };

        this.recognition.onresult = (event) => {
            console.log('收到语音结果:', event);
            const command = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
            console.log('识别到命令:', command);
            this.voiceText.textContent = `识别到: ${command}`;

            // 添加到历史记录
            this.addVoiceHistory(command);

            // 处理速度控制命令
            if (command.includes('快') || command.includes('快一点') || command.includes('加速')) {
                if (this.currentState === this.gameStates.RUNNING) {
                    const currentSpeed = parseFloat(this.speedControl.value);
                    const newSpeed = Math.min(0.1, currentSpeed + 0.01).toFixed(2);
                    console.log('提高速度:', newSpeed);
                    
                    // 更新速度控制器
                    this.speedControl.value = newSpeed;
                    this.speedValue.textContent = newSpeed;
                    this.pacman.speed = parseFloat(newSpeed) * 10;
                    
                    // 添加视觉反馈
                    this.speedValue.style.color = '#4CAF50';
                    setTimeout(() => {
                        this.speedValue.style.color = '';
                    }, 500);
                    
                    this.addVoiceHistory(`速度提高到: ${newSpeed}`);
                }
            }
            else if (command.includes('慢') || command.includes('慢一点') || command.includes('减速')) {
                if (this.currentState === this.gameStates.RUNNING) {
                    const currentSpeed = parseFloat(this.speedControl.value);
                    const newSpeed = Math.max(0.01, currentSpeed - 0.01).toFixed(2);
                    console.log('降低速度:', newSpeed);
                    
                    // 更新速度控制器
                    this.speedControl.value = newSpeed;
                    this.speedValue.textContent = newSpeed;
                    this.pacman.speed = parseFloat(newSpeed) * 10;
                    
                    // 添加视觉反馈
                    this.speedValue.style.color = '#f44336';
                    setTimeout(() => {
                        this.speedValue.style.color = '';
                    }, 500);
                    
                    this.addVoiceHistory(`速度降低到: ${newSpeed}`);
                }
            }
            else if (command.includes('重新') || 
                     command.includes('重来') || 
                     command.includes('重新开始') || 
                     command.includes('重新玩') ||
                     command.includes('再来一次')) {
                console.log('执行重新开始命令');
                this.restartGame();
                this.addVoiceHistory('重新开始游戏');
            }
            else if (command.includes('密一些') || 
                     command.includes('稀一些') || 
                     command.includes('降低密度') ||
                     command.includes('减小密度')) {
                const currentDensity = parseInt(this.densityControl.value);
                const newDensity = Math.min(60, currentDensity + 10);
                console.log('降低密度:', newDensity);
                this.densityControl.value = newDensity;
                this.gridSize = newDensity;
                this.updateDensityDisplay(newDensity);
                if (this.currentState === this.gameStates.RUNNING) {
                    this.regenerateDots();
                }
                this.addVoiceHistory(`降低密度到: ${this.getDensityText(newDensity)}`);
            }
            else if (command.includes('疏一些') || 
                     command.includes('稠一些') || 
                     command.includes('增加密度') ||
                     command.includes('提高密度')) {
                const currentDensity = parseInt(this.densityControl.value);
                const newDensity = Math.max(20, currentDensity - 10);
                console.log('提高密度:', newDensity);
                this.densityControl.value = newDensity;
                this.gridSize = newDensity;
                this.updateDensityDisplay(newDensity);
                if (this.currentState === this.gameStates.RUNNING) {
                    this.regenerateDots();
                }
                this.addVoiceHistory(`提高密度到: ${this.getDensityText(newDensity)}`);
            }
            else if (command.includes('开始') || command.includes('开始游戏')) {
                if (this.currentState === this.gameStates.IDLE) {
                    this.startGame();
                }
            } else if (command.includes('暂停')) {
                if (this.currentState === this.gameStates.RUNNING) {
                    this.pauseGame();
                }
            } else if (command.includes('继续')) {
                if (this.currentState === this.gameStates.PAUSED) {
                    this.resumeGame();
                }
            } else if (this.currentState === this.gameStates.RUNNING) {
                // 方向控制
                if (command.includes('上')) {
                    this.pacman.direction = 3;
                    this.pacman.isMoving = true;
                } else if (command.includes('下')) {
                    this.pacman.direction = 1;
                    this.pacman.isMoving = true;
                } else if (command.includes('左')) {
                    this.pacman.direction = 2;
                    this.pacman.isMoving = true;
                } else if (command.includes('右')) {
                    this.pacman.direction = 0;
                    this.pacman.isMoving = true;
                }
            }
        };

        this.recognition.onerror = (event) => {
            console.error('语音识别错误:', event.error);
            this.voiceText.textContent = `错误: ${event.error}`;
            this.addVoiceHistory(`错误: ${event.error}`);
        };

        // 更新操作说明
        const instructions = document.querySelector('.instructions ul');
        if (instructions) {
            const voiceCommands = instructions.querySelector('li:last-child ul');
            if (voiceCommands) {
                voiceCommands.innerHTML = `
                    <li>"开始"/"暂停"/"继续"</li>
                    <li>"重新开始"/"重来"</li>
                    <li>"上"/"下"/"左"/"右"</li>
                    <li>"快一点"/"慢一点"</li>
                    <li>"密一些"/"稀一些"</li>
                `;
            }
        }
    }

    startVoiceControl() {
        console.log('开始语音控制');
        this.isVoiceControlActive = true;
        this.recognition.start();
    }

    stopVoiceControl() {
        console.log('停止语音控制');
        this.isVoiceControlActive = false;
        this.recognition.stop();
    }

    addVoiceHistory(text) {
        const item = document.createElement('div');
        item.className = 'history-item';
        
        const time = document.createElement('div');
        time.className = 'time';
        time.textContent = new Date().toLocaleTimeString();
        
        const content = document.createElement('div');
        content.className = 'text';
        content.textContent = text;
        
        item.appendChild(time);
        item.appendChild(content);
        
        this.voiceHistory.insertBefore(item, this.voiceHistory.firstChild);
        
        // 限制历史记录数量
        if (this.voiceHistory.children.length > 10) {
            this.voiceHistory.removeChild(this.voiceHistory.lastChild);
        }
    }

    draw() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制背景
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制豆子
        this.ctx.fillStyle = '#fff';
        this.dots.forEach(dot => {
            this.ctx.beginPath();
            this.ctx.arc(dot.x, dot.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        // 绘制吃豆人
        this.ctx.fillStyle = '#ffff00';
        this.ctx.beginPath();
        this.ctx.arc(
            this.pacman.x,
            this.pacman.y,
            this.pacman.size,
            this.pacman.direction * Math.PI/2 + Math.sin(this.pacman.mouthOpen) * 0.2,
            this.pacman.direction * Math.PI/2 + Math.PI * 2 - Math.sin(this.pacman.mouthOpen) * 0.2
        );
        this.ctx.lineTo(this.pacman.x, this.pacman.y);
        this.ctx.fill();
    }

    update() {
        if (this.currentState === this.gameStates.RUNNING) {
            if (this.pacman.isMoving) {
                this.handleInput();
                this.movePacman();
                this.checkCollisions();
            }
        }
        this.draw();
        this.gameLoop = requestAnimationFrame(() => this.update());
    }

    handleKeyPress(e) {
        if (this.currentState !== this.gameStates.RUNNING) return;
        
        console.log('按键被按下:', e.key);
        
        switch(e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                this.pacman.direction = 3;
                this.pacman.isMoving = true;
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                this.pacman.direction = 1;
                this.pacman.isMoving = true;
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.pacman.direction = 2;
                this.pacman.isMoving = true;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.pacman.direction = 0;
                this.pacman.isMoving = true;
                break;
            case ' ': // 空格键暂停/继续
                this.togglePlay();
                break;
        }
    }

    pauseGame() {
        console.log('暂停游戏');
        this.currentState = this.gameStates.PAUSED;
        this.pacman.isMoving = false;
        this.playButton.innerHTML = '▶ 继续';
        this.playButton.classList.remove('playing');
        this.gameStatusElement.textContent = '已暂停';
    }

    resumeGame() {
        console.log('继续游戏');
        this.currentState = this.gameStates.RUNNING;
        this.playButton.innerHTML = '⏸ 暂停';
        this.playButton.classList.add('playing');
        this.gameStatusElement.textContent = '游戏进行中';
    }

    restartGame() {
        console.log('重新开始游戏');
        this.dots = [];
        this.pacman = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            size: this.canvas.width / 20,
            speed: parseFloat(this.speedControl.value) * 10,
            direction: 0,
            mouthOpen: 0,
            isMoving: false
        };
        this.startGame();
    }

    handleInput() {
        // 处理移动逻辑
        if (this.pacman.isMoving) {
            let targetX = this.pacman.x;
            let targetY = this.pacman.y;
            
            switch(this.pacman.direction) {
                case 0: // 向右
                    targetX += this.pacman.speed;
                    targetY = Math.round(targetY / this.gridSize) * this.gridSize;
                    break;
                case 1: // 向下
                    targetY += this.pacman.speed;
                    targetX = Math.round(targetX / this.gridSize) * this.gridSize;
                    break;
                case 2: // 向左
                    targetX -= this.pacman.speed;
                    targetY = Math.round(targetY / this.gridSize) * this.gridSize;
                    break;
                case 3: // 向上
                    targetY -= this.pacman.speed;
                    targetX = Math.round(targetX / this.gridSize) * this.gridSize;
                    break;
            }
            
            // 平滑对齐
            if (this.pacman.direction === 0 || this.pacman.direction === 2) {
                this.pacman.y += (targetY - this.pacman.y) * 0.2;
            } else {
                this.pacman.x += (targetX - this.pacman.x) * 0.2;
            }
            
            // 更新位置
            this.pacman.x = targetX;
            this.pacman.y = targetY;
            
            // 边界检查
            this.pacman.x = Math.max(this.pacman.size/2, Math.min(this.canvas.width - this.pacman.size/2, this.pacman.x));
            this.pacman.y = Math.max(this.pacman.size/2, Math.min(this.canvas.height - this.pacman.size/2, this.pacman.y));
            
            // 更新嘴巴动画
            this.pacman.mouthOpen = (this.pacman.mouthOpen + 0.2) % Math.PI;
        }
    }

    movePacman() {
        // 检查碰撞
        const gridX = Math.round(this.pacman.x / this.gridSize) * this.gridSize;
        const gridY = Math.round(this.pacman.y / this.gridSize) * this.gridSize;
        const collisionRange = this.pacman.size * 0.75;
        
        // 根据方向检查豆子
        let dotsToCheck = [];
        switch(this.pacman.direction) {
            case 0:
            case 2:
                dotsToCheck = this.dots.filter(dot => 
                    Math.abs(dot.y - gridY) < collisionRange &&
                    Math.abs(dot.x - this.pacman.x) < collisionRange
                );
                break;
            case 1:
            case 3:
                dotsToCheck = this.dots.filter(dot => 
                    Math.abs(dot.x - gridX) < collisionRange &&
                    Math.abs(dot.y - this.pacman.y) < collisionRange
                );
                break;
        }
        
        // 吃掉豆子
        if (dotsToCheck.length > 0) {
            this.dots = this.dots.filter(dot => !dotsToCheck.includes(dot));
            this.updateProgress();
        }
    }

    checkCollisions() {
        // 检查是否完成游戏
        if (this.dots.length === 0) {
            this.currentState = this.gameStates.VICTORY;
            this.gameStatusElement.textContent = '胜利！';
            this.playButton.innerHTML = '🎮 重新开始';
            this.playButton.classList.remove('playing');
            cancelAnimationFrame(this.gameLoop);
        }
    }
}

// 创建游戏实例
window.addEventListener('load', () => {
    window.game = new PacmanGame();
}); 