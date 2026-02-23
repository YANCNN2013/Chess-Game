/**
 * 用户系统模块
 * 负责用户注册、登录和用户管理
 */



class UserSystem {
  constructor() {
    this.dbName = 'ChessGameDB';
    this.dbVersion = 1;
    this.db = null;
    this.currentUser = null;
    this.initDB();
  }
  
  /**
   * 初始化IndexedDB数据库
   */
  async initDB() {
    if (this.db) {
      // 如果数据库已经初始化，确保用户状态已加载
      if (!this.currentUser) {
        await this.loadCurrentUserFromStorage();
      }
      return this.db;
    }
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = (event) => {
        console.error('数据库打开失败:', event.target.error);
        reject(event.target.error);
      };
      
      request.onsuccess = async (event) => {
        this.db = event.target.result;
        // 等待用户状态加载完成
        await this.loadCurrentUserFromStorage();
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // 创建用户存储空间
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'username' });
          userStore.createIndex('email', 'email', { unique: true });
        }
        
        // 创建当前用户存储空间
        if (!db.objectStoreNames.contains('currentUser')) {
          db.createObjectStore('currentUser', { keyPath: 'id' });
        }
      };
    });
  }
  
  /**
   * 从存储加载当前登录用户
   */
  loadCurrentUserFromStorage() {
    return new Promise((resolve) => {
      if (!this.db) {
        this.initDB().then(() => {
          this.loadCurrentUserFromStorage().then(resolve);
        });
        return;
      }
      
      const transaction = this.db.transaction('currentUser', 'readonly');
      const store = transaction.objectStore('currentUser');
      const request = store.get(1);
      
      request.onsuccess = (event) => {
        this.currentUser = event.target.result ? event.target.result.user : null;
        console.log('用户状态加载成功:', this.currentUser);
        resolve(this.currentUser);
      };
      
      request.onerror = () => {
        this.currentUser = null;
        console.log('用户状态加载失败');
        resolve(null);
      };
    });
  }
  
  /**
   * 保存当前登录用户
   */
  saveCurrentUser(user) {
    return new Promise((resolve) => {
      this.initDB().then((db) => {
        const transaction = db.transaction('currentUser', 'readwrite');
        const store = transaction.objectStore('currentUser');
        
        if (user) {
          store.put({ id: 1, user });
        } else {
          store.delete(1);
        }
        
        this.currentUser = user;
        resolve();
      });
    });
  }
  
  /**
   * 加载所有用户数据
   */
  loadUsers() {
    return new Promise((resolve) => {
      this.initDB().then((db) => {
        const transaction = db.transaction('users', 'readonly');
        const store = transaction.objectStore('users');
        const request = store.getAll();
        
        request.onsuccess = (event) => {
          const usersArray = event.target.result;
          const usersObject = {};
          usersArray.forEach(user => {
            usersObject[user.username] = user;
          });
          resolve(usersObject);
        };
        
        request.onerror = () => {
          resolve({});
        };
      });
    });
  }
  
  /**
   * 保存用户数据
   */
  saveUser(user) {
    return new Promise((resolve) => {
      this.initDB().then((db) => {
        const transaction = db.transaction('users', 'readwrite');
        const store = transaction.objectStore('users');
        store.put(user);
        resolve();
      });
    });
  }
  
  /**
   * 获取单个用户数据
   */
  getUser(username) {
    return new Promise((resolve) => {
      this.initDB().then((db) => {
        const transaction = db.transaction('users', 'readonly');
        const store = transaction.objectStore('users');
        const request = store.get(username);
        
        request.onsuccess = (event) => {
          resolve(event.target.result);
        };
        
        request.onerror = () => {
          resolve(null);
        };
      });
    });
  }
  

  

  
  /**
   * 获取用户的安全问题
   * @param {string} username 用户名
   * @returns {Promise<object>} 获取结果
   */
  async getSecurityQuestion(username) {
    // 检查用户是否存在
    const user = await this.getUser(username);
    if (!user) {
      return { success: false, message: '用户名不存在' };
    }
    
    // 检查用户是否设置了安全问题
    if (!user.securityQuestion || !user.securityAnswer) {
      return { success: false, message: '用户未设置安全问题' };
    }
    
    return { success: true, question: user.securityQuestion, user: user };
  }
  
  /**
   * 验证安全答案并重置密码
   * @param {string} username 用户名
   * @param {string} securityAnswer 安全答案
   * @param {string} newPassword 新密码
   * @returns {Promise<object>} 验证和重置结果
   */
  async verifySecurityAnswerAndResetPassword(username, securityAnswer, newPassword) {
    // 检查用户是否存在
    const user = await this.getUser(username);
    if (!user) {
      return { success: false, message: '用户名不存在' };
    }
    
    // 检查用户是否设置了安全问题
    if (!user.securityQuestion || !user.securityAnswer) {
      return { success: false, message: '用户未设置安全问题' };
    }
    
    // 检查安全答案是否正确
    const hashedSecurityAnswer = this.hashPassword(securityAnswer);
    if (user.securityAnswer !== hashedSecurityAnswer) {
      return { success: false, message: '安全答案不正确' };
    }
    
    // 检查密码长度
    if (newPassword.length < 6) {
      return { success: false, message: '密码长度至少为6位' };
    }
    
    // 更新用户密码
    user.password = this.hashPassword(newPassword);
    
    // 保存用户数据
    await this.saveUser(user);
    
    return { success: true, message: '密码重置成功，请使用新密码登录' };
  }
  
  /**
   * 注册新用户
   * @param {string} username 用户名
   * @param {string} password 密码
   * @param {string} email 邮箱
   * @param {string} securityQuestion 安全问题
   * @param {string} securityAnswer 安全答案
   * @returns {Promise<object>} 注册结果
   */
  async register(username, password, email, securityQuestion, securityAnswer) {
    // 检查邮箱格式
    if (!this.isValidEmail(email)) {
      return { success: false, message: '邮箱格式不正确' };
    }
    
    // 检查密码长度
    if (password.length < 6) {
      return { success: false, message: '密码长度至少为6位' };
    }
    
    // 检查安全问题和答案
    if (!securityQuestion || !securityAnswer) {
      return { success: false, message: '请填写安全问题和答案' };
    }
    
    // 检查用户名是否已存在
    const existingUser = await this.getUser(username);
    if (existingUser) {
      return { success: false, message: '用户名已存在' };
    }
    
    // 创建新用户
    const hashedPassword = this.hashPassword(password);
    const hashedSecurityAnswer = this.hashPassword(securityAnswer);
    const newUser = {
      username,
      password: hashedPassword,
      email,
      securityQuestion,
      securityAnswer: hashedSecurityAnswer,
      createdAt: new Date().toISOString(),
      gameRecords: [],
      aiLearningData: this.getEmptyAILearningData(),
      settings: {
        difficulty: 'medium',
        aiLearning: true,
        soundEnabled: true,
        theme: 'default'
      }
    };
    
    // 保存用户数据
    await this.saveUser(newUser);
    
    return { success: true, message: '注册成功' };
  }
  
  /**
   * 登录用户
   * @param {string} username 用户名
   * @param {string} password 密码
   * @returns {Promise<object>} 登录结果
   */
  async login(username, password) {
    // 检查用户是否存在
    const user = await this.getUser(username);
    if (!user) {
      return { success: false, message: '用户名或密码错误' };
    }
    
    // 检查密码是否正确
    const hashedPassword = this.hashPassword(password);
    if (user.password !== hashedPassword) {
      return { success: false, message: '用户名或密码错误' };
    }
    
    // 保存当前用户
    await this.saveCurrentUser(user);
    
    return { success: true, message: '登录成功', user: user };
  }
  
  /**
   * 登出用户
   * @returns {Promise<void>}
   */
  async logout() {
    await this.saveCurrentUser(null);
  }
  
  /**
   * 检查用户是否已登录
   * @returns {boolean} 是否已登录
   */
  isLoggedIn() {
    return this.currentUser !== null;
  }
  
  /**
   * 获取当前登录用户
   * @returns {object} 当前用户
   */
  getCurrentUser() {
    return this.currentUser;
  }
  
  /**
   * 更新用户设置
   * @param {object} settings 新设置
   * @returns {Promise<object>} 更新结果
   */
  async updateUserSettings(settings) {
    if (!this.currentUser) {
      return { success: false, message: '用户未登录' };
    }
    
    // 获取最新用户数据
    const user = await this.getUser(this.currentUser.username);
    if (!user) {
      return { success: false, message: '用户不存在' };
    }
    
    // 更新设置
    user.settings = {
      ...user.settings,
      ...settings
    };
    
    // 保存数据
    await this.saveUser(user);
    
    // 更新当前用户对象
    this.currentUser.settings = user.settings;
    await this.saveCurrentUser(this.currentUser);
    
    return { success: true, message: '设置更新成功' };
  }
  
  /**
   * 保存用户游戏记录
   * @param {object} gameRecord 游戏记录
   * @returns {Promise<object>} 保存结果
   */
  async saveUserGameRecord(gameRecord) {
    if (!this.currentUser) {
      return { success: false, message: '用户未登录' };
    }
    
    // 获取最新用户数据
    const user = await this.getUser(this.currentUser.username);
    if (!user) {
      return { success: false, message: '用户不存在' };
    }
    
    // 初始化游戏记录数组
    if (!user.gameRecords) {
      user.gameRecords = [];
    }
    
    // 添加游戏记录
    user.gameRecords.push({
      ...gameRecord,
      date: new Date().toISOString()
    });
    
    // 限制游戏记录数量
    if (user.gameRecords.length > 50) {
      user.gameRecords.shift();
    }
    
    // 保存数据
    await this.saveUser(user);
    
    return { success: true, message: '游戏记录保存成功' };
  }
  
  /**
   * 获取用户游戏记录
   * @returns {Promise<array>} 游戏记录数组
   */
  async getUserGameRecords() {
    if (!this.currentUser) {
      return [];
    }
    
    // 获取最新用户数据
    const user = await this.getUser(this.currentUser.username);
    if (!user) {
      return [];
    }
    
    return user.gameRecords || [];
  }
  
  /**
   * 保存用户AI学习数据
   * @param {object} learningData AI学习数据
   * @returns {Promise<object>} 保存结果
   */
  async saveUserAILearningData(learningData) {
    if (!this.currentUser) {
      return { success: false, message: '用户未登录' };
    }
    
    // 获取最新用户数据
    const user = await this.getUser(this.currentUser.username);
    if (!user) {
      return { success: false, message: '用户不存在' };
    }
    
    // 更新AI学习数据
    user.aiLearningData = learningData;
    
    // 保存数据
    await this.saveUser(user);
    
    return { success: true, message: 'AI学习数据保存成功' };
  }
  
  /**
   * 获取用户AI学习数据
   * @returns {Promise<object>} AI学习数据
   */
  async getUserAILearningData() {
    if (!this.currentUser) {
      return this.getEmptyAILearningData();
    }
    
    // 获取最新用户数据
    const user = await this.getUser(this.currentUser.username);
    if (!user) {
      return this.getEmptyAILearningData();
    }
    
    return user.aiLearningData || this.getEmptyAILearningData();
  }
  
  /**
   * 密码哈希（简单实现，实际应用中应使用更安全的哈希算法）
   * @param {string} password 原始密码
   * @returns {string} 哈希后的密码
   */
  hashPassword(password) {
    // 简单的哈希实现，实际应用中应使用bcrypt等安全的哈希算法
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
  
  /**
   * 验证邮箱格式
   * @param {string} email 邮箱
   * @returns {boolean} 是否有效
   */
  isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }
  
  /**
   * 生成随机验证码
   * @returns {string} 生成的验证码
   */
  generateCaptcha() {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let captcha = '';
    for (let i = 0; i < 4; i++) {
      captcha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return captcha;
  }
  
  /**
   * 绘制验证码到画布
   * @param {HTMLCanvasElement} canvas 画布元素
   * @returns {string} 生成的验证码
   */
  drawCaptcha(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // 清空画布
    ctx.clearRect(0, 0, width, height);
    
    // 绘制背景
    ctx.fillStyle = '#F5F5DC';
    ctx.fillRect(0, 0, width, height);
    
    // 生成验证码
    const captcha = this.generateCaptcha();
    
    // 绘制干扰线
    ctx.strokeStyle = '#D2B48C';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.lineTo(Math.random() * width, Math.random() * height);
      ctx.stroke();
    }
    
    // 绘制干扰点
    ctx.fillStyle = '#CD853F';
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // 绘制验证码文字
    ctx.font = '18px Arial';
    ctx.fillStyle = '#8B4513';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 每个字符随机位置
    for (let i = 0; i < captcha.length; i++) {
      const x = (width / captcha.length) * i + (width / captcha.length) / 2;
      const y = height / 2 + (Math.random() * 10 - 5);
      const rotation = (Math.random() * 20 - 10) * Math.PI / 180;
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.fillText(captcha[i], 0, 0);
      ctx.restore();
    }
    
    return captcha;
  }
  
  /**
   * 获取空的AI学习数据
   * @returns {object} 空的AI学习数据
   */
  getEmptyAILearningData() {
    return {
      totalGames: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      totalMoves: 0,
      moves: {},
      openingPatterns: 0,
      openingSuccessRate: 0,
      middleTactics: 0,
      middleSuccessRate: 0,
      endgameSkills: 0,
      endgameSuccessRate: 0,
      defensiveStrategies: 0,
      defensiveSuccessRate: 0,
      attackingStrategies: 0,
      attackingSuccessRate: 0,
      lastOpeningImprovement: null,
      lastMiddleImprovement: null,
      lastEndgameImprovement: null,
      lastDefensiveImprovement: null,
      lastAttackingImprovement: null
    };
  }

  /**
   * 导出所有用户数据
   * @returns {Promise<object>} 导出的数据
   */
  async exportUserData() {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await this.initDB();
        const exportData = {
          exportDate: new Date().toISOString(),
          dbName: this.dbName,
          dbVersion: this.dbVersion,
          data: {
            users: [],
            currentUser: null
          }
        };

        // 获取所有用户数据
        const usersTransaction = db.transaction('users', 'readonly');
        const usersStore = usersTransaction.objectStore('users');
        const usersRequest = usersStore.getAll();

        usersRequest.onsuccess = (event) => {
          exportData.data.users = event.target.result;
        };

        // 获取当前用户数据
        const currentUserTransaction = db.transaction('currentUser', 'readonly');
        const currentUserStore = currentUserTransaction.objectStore('currentUser');
        const currentUserRequest = currentUserStore.get(1);

        currentUserRequest.onsuccess = (event) => {
          exportData.data.currentUser = event.target.result;
        };

        // 等待所有事务完成
        await Promise.all([
          new Promise((res) => usersTransaction.oncomplete = res),
          new Promise((res) => currentUserTransaction.oncomplete = res)
        ]);

        resolve(exportData);
      } catch (error) {
        console.error('导出用户数据失败:', error);
        reject(error);
      }
    });
  }

  /**
   * 下载用户数据为JSON文件
   * @param {object} data 要下载的数据
   */
  downloadUserData(data) {
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chess-game-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 导入用户数据
   * @param {object} importData 导入的数据
   * @returns {Promise<object>} 导入结果
   */
  async importUserData(importData) {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await this.initDB();

        // 检查导入数据的格式
        if (!importData || !importData.data || !Array.isArray(importData.data.users)) {
          throw new Error('导入数据格式不正确');
        }

        // 开始事务
        const usersTransaction = db.transaction('users', 'readwrite');
        const usersStore = usersTransaction.objectStore('users');
        const currentUserTransaction = db.transaction('currentUser', 'readwrite');
        const currentUserStore = currentUserTransaction.objectStore('currentUser');

        // 清空现有数据
        const clearUsersRequest = usersStore.clear();
        clearUsersRequest.onerror = (event) => {
          throw new Error('清空用户数据失败');
        };

        // 导入所有用户
        for (const user of importData.data.users) {
          const addUserRequest = usersStore.put(user);
          addUserRequest.onerror = (event) => {
            throw new Error(`导入用户 ${user.username} 失败`);
          };
        }

        // 导入当前用户
        if (importData.data.currentUser) {
          const addCurrentUserRequest = currentUserStore.put(importData.data.currentUser);
          addCurrentUserRequest.onerror = (event) => {
            throw new Error('导入当前用户数据失败');
          };
        } else {
          // 如果导入数据中没有当前用户，清空当前用户
          const deleteCurrentUserRequest = currentUserStore.delete(1);
          deleteCurrentUserRequest.onerror = (event) => {
            throw new Error('清空当前用户数据失败');
          };
        }

        // 等待所有事务完成
        await Promise.all([
          new Promise((res) => usersTransaction.oncomplete = res),
          new Promise((res) => currentUserTransaction.oncomplete = res)
        ]);

        // 重新加载当前用户
        await this.loadCurrentUserFromStorage();

        resolve({ success: true, message: '用户数据导入成功' });
      } catch (error) {
        console.error('导入用户数据失败:', error);
        reject({ success: false, message: `导入失败: ${error.message}` });
      }
    });
  }
}


// 将UserSystem类暴露到全局作用域
window.UserSystem = UserSystem;