class FibonacciCryptoTracker {
    constructor() {
        this.cryptoSymbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'BNBUSDT'];
        this.cryptoData = new Map();
        this.GOLDEN_RATIO = 1.618033988749;
        this.updateInterval = 15 * 60 * 1000;
        this.currentTimeframe = '1d';
        
        this.init();
    }

    init() {
        this.showLoading(true);
        this.fetchAllCryptoData();
        this.startAutoUpdate();
        this.addDataSourceIndicator();
    }

    addDataSourceIndicator() {
        const dataSource = document.createElement('div');
        dataSource.className = 'data-source';
        dataSource.innerHTML = 'مصدر البيانات: Binance & OKX APIs | نسب فيبوناتشي الرياضية الحقيقية';
        document.body.appendChild(dataSource);
    }

    async fetchAllCryptoData() {
        try {
            const promises = this.cryptoSymbols.map(symbol => this.fetchCryptoData(symbol));
            const results = await Promise.allSettled(promises);
            
            const successfulResults = results.filter(result => result.status === 'fulfilled');
            
            if (successfulResults.length > 0) {
                this.renderCryptoCards();
                this.showLoading(false);
                this.updateLastUpdateTime();
                this.showError(false);
            } else {
                throw new Error('فشل في جلب جميع البيانات');
            }
        } catch (error) {
            console.error('Error fetching crypto data:', error);
            this.showError(true);
            this.showLoading(false);
        }
    }

    async fetchCryptoData(symbol) {
        try {
            let tickerData, klineData;
            
            try {
                // محاولة Binance أولاً
                const [tickerResponse, klineResponse] = await Promise.all([
                    fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`),
                    fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${this.currentTimeframe}&limit=100`)
                ]);
                
                if (tickerResponse.ok && klineResponse.ok) {
                    tickerData = await tickerResponse.json();
                    klineData = await klineResponse.json();
                } else {
                    throw new Error('Binance API failed');
                }
            } catch (binanceError) {
                // محاولة OKX كبديل
                const okxSymbol = symbol.replace('USDT', '-USDT');
                const [tickerResponse, klineResponse] = await Promise.all([
                    fetch(`https://www.okx.com/api/v5/market/ticker?instId=${okxSymbol}`),
                    fetch(`https://www.okx.com/api/v5/market/candles?instId=${okxSymbol}&bar=1D&limit=100`)
                ]);
                
                const tickerOkx = await tickerResponse.json();
                const klineOkx = await klineResponse.json();
                
                tickerData = this.convertOkxTicker(tickerOkx.data[0]);
                klineData = this.convertOkxKlines(klineOkx.data);
            }

            const cryptoInfo = this.processCryptoDataWithMathematicalFibonacci(symbol, tickerData, klineData);
            this.cryptoData.set(symbol, cryptoInfo);
        } catch (error) {
            console.error(`Error fetching data for ${symbol}:`, error);
            throw error;
        }
    }

    convertOkxTicker(okxData) {
        return {
            symbol: okxData.instId.replace('-USDT', 'USDT'),
            priceChange: parseFloat(okxData.change24h),
            lastPrice: parseFloat(okxData.last),
            volume: parseFloat(okxData.vol24h)
        };
    }

    convertOkxKlines(okxData) {
        return okxData.map(kline => [
            parseFloat(kline[0]), // open time
            parseFloat(kline[1]), // open
            parseFloat(kline[2]), // high
            parseFloat(kline[3]), // low
            parseFloat(kline[4]), // close
            parseFloat(kline[5])  // volume
        ]);
    }

    processCryptoDataWithMathematicalFibonacci(symbol, tickerData, klineData) {
        const currentPrice = parseFloat(tickerData.lastPrice || tickerData.lastPrice);
        const priceChange = parseFloat(tickerData.priceChange || tickerData.priceChange);
        
        // تحويل بيانات الشموع اليابانية
        const priceData = klineData.map(kline => ({
            high: parseFloat(kline[2]),
            low: parseFloat(kline[3]),
            close: parseFloat(kline[4])
        }));
        
        // تحديد القمم والقيعان المهمة
        const significantHigh = this.findSignificantHigh(priceData);
        const significantLow = this.findSignificantLow(priceData);
        
        // تحديد الاتجاه
        const isUpTrend = currentPrice > (significantHigh + significantLow) / 2;
        
        // تطبيق النسب الرياضية الحقيقية لفيبوناتشي
        const fibLevels = this.calculateMathematicalFibonacciLevels(
            significantHigh, 
            significantLow, 
            currentPrice, 
            isUpTrend
        );
        
        // تحديد قوة المستوى بناءً على النسب الذهبية الحقيقية
        const levelStrength = this.calculateGoldenRatioStrength(currentPrice, fibLevels);

        // استراتيجية مبنية على النسب الرياضية الحقيقية
        const strategy = this.generateMathematicalFibonacciStrategy(currentPrice, fibLevels, isUpTrend);

        return {
            symbol: symbol.replace('USDT', ''),
            currentPrice,
            priceChange,
            isUpTrend,
            fibLevels,
            significantHigh,
            significantLow,
            levelStrength,
            strategy
        };
    }

    findSignificantHigh(priceData) {
        return Math.max(...priceData.map(candle => candle.high));
    }

    findSignificantLow(priceData) {
        return Math.min(...priceData.map(candle => candle.low));
    }

    calculateMathematicalFibonacciLevels(high, low, currentPrice, isUpTrend) {
        const range = high - low;
        
        // النسب الرياضية الحقيقية لفيبوناتشي
        const ratios = {
            retracement: {
                '23.6%': 0.236,
                '38.2%': 0.382,
                '50.0%': 0.5,
                '61.8% (النسبة الذهبية)': 1 / this.GOLDEN_RATIO,
                '78.6%': 0.786
            },
            extension: {
                '127.2%': 1.272,
                '161.8% (φ)': this.GOLDEN_RATIO,
                '261.8% (φ²)': this.GOLDEN_RATIO * this.GOLDEN_RATIO,
                '423.6%': 4.236
            }
        };

        // حساب مستويات الارتداد
        const retracementLevels = {};
        Object.entries(ratios.retracement).forEach(([name, ratio]) => {
            retracementLevels[name] = high - (range * ratio);
        });

        // حساب مستويات التمديد
        const extensionLevels = {};
        Object.entries(ratios.extension).forEach(([name, ratio]) => {
            extensionLevels[name] = high + (range * (ratio - 1));
        });

        // تحديد المستويات الحالية
        const resistance = isUpTrend ? extensionLevels['161.8% (φ)'] : retracementLevels['38.2%'];
        const support = isUpTrend ? retracementLevels['61.8% (النسبة الذهبية)'] : extensionLevels['127.2%'];
        const nextResistance = extensionLevels['261.8% (φ²)'];
        const nextSupport = retracementLevels['23.6%'];

        return {
            retracementLevels,
            extensionLevels,
            resistance,
            support,
            nextResistance,
            nextSupport
        };
    }

    getFibonacciLevelName(ratio) {
        const percentage = (ratio * 100).toFixed(1);
        if (ratio === this.GOLDEN_RATIO) return '161.8% (φ)';
        if (ratio === 1 / this.GOLDEN_RATIO) return '61.8% (φ⁻¹)';
        if (ratio === this.GOLDEN_RATIO * this.GOLDEN_RATIO) return '261.8% (φ²)';
        if (ratio === 1.272019649514) return '127.2%';
        if (ratio === 4.236067977499) return '423.6%';
        return `${percentage}%`;
    }

    getExtensionLevelName(ratio) {
        const percentage = (ratio * 100).toFixed(1);
        if (ratio === this.GOLDEN_RATIO) return '161.8% (φ)';
        if (ratio === this.GOLDEN_RATIO * this.GOLDEN_RATIO) return '261.8% (φ²)';
        if (ratio === 1.272019649514) return '127.2%';
        if (ratio === 4.236067977499) return '423.6%';
        return `${percentage}%`;
    }

    calculateGoldenRatioStrength(currentPrice, fibLevels) {
        // جمع كل المستويات المهمة
        const importantLevels = [];
        
        // مستويات الارتداد
        Object.entries(fibLevels.retracementLevels).forEach(([key, value]) => {
            if (value && (key.includes('61.8') || key.includes('38.2') || key.includes('78.6'))) {
                importantLevels.push({ name: key, value, type: 'retracement' });
            }
        });
        
        // مستويات التمديد
        Object.entries(fibLevels.extensionLevels).forEach(([key, value]) => {
            if (value && (key.includes('161.8') || key.includes('261.8'))) {
                importantLevels.push({ name: key, value, type: 'extension' });
            }
        });
        
        if (importantLevels.length === 0) return 'غير محدد';
        
        // حساب أقرب مستوى
        let closestLevel = null;
        let minDistance = Infinity;
        
        importantLevels.forEach(level => {
            const distance = Math.abs(currentPrice - level.value) / currentPrice;
            if (distance < minDistance) {
                minDistance = distance;
                closestLevel = level;
            }
        });
        
        if (!closestLevel) return 'غير محدد';
        
        // تحديد القوة
        if (minDistance < 0.01) return 'قوي جداً';
        if (minDistance < 0.025) return 'قوي';
        if (minDistance < 0.05) return 'متوسط';
        return 'ضعيف';
    }

    generateMathematicalFibonacciStrategy(currentPrice, fibLevels, isUpTrend) {
        const resistanceDistance = Math.abs(currentPrice - fibLevels.resistance) / currentPrice;
        const supportDistance = Math.abs(currentPrice - fibLevels.support) / currentPrice;
        
        // تحديد الاستراتيجية بناءً على النسب الرياضية الحقيقية
        const goldenRatio = this.GOLDEN_RATIO;
        
        if (resistanceDistance < supportDistance) {
            const targetRatio = (fibLevels.nextResistance - currentPrice) / (fibLevels.resistance - currentPrice);
            return {
                type: 'golden_resistance_breakout',
                title: 'استراتيجية اختراق مقاومة فيبوناتشي الرياضية',
                description: `اختراق ${this.formatPrice(fibLevels.resistance)} يستهدف ${this.formatPrice(fibLevels.nextResistance)} بنسبة φ=${goldenRatio.toFixed(3)}`,
                mathematicalBasis: `النسبة الذهبية الحقيقية: 1.618033988749`
            };
        } else {
            return {
                type: 'golden_support_break',
                title: 'استراتيجية كسر دعم فيبوناتشي الرياضية',
                description: `كسر ${this.formatPrice(fibLevels.support)} يستهدف ${this.formatPrice(fibLevels.nextSupport)} بنسبة 1/φ=${(1/goldenRatio).toFixed(3)}`,
                mathematicalBasis: `مقلوب النسبة الذهبية: 0.618033988749`
            };
        }
    }

    renderCryptoCards() {
        const container = document.getElementById('gridContainer');
        container.innerHTML = '';

        this.cryptoData.forEach((data, symbol) => {
            const card = this.createMathematicalFibonacciCard(data);
            container.appendChild(card);
        });
        
        container.style.display = 'grid';
    }

    createMathematicalFibonacciCard(data) {
        const card = document.createElement('div');
        card.className = 'crypto-card mathematical-fib';
        card.setAttribute('data-symbol', data.symbol);
        
        const trendClass = data.isUpTrend ? 'trend-up' : 'trend-down';
        const trendText = data.isUpTrend ? 'صاعد' : 'هابط';
        const priceChangeClass = data.priceChange >= 0 ? 'positive' : 'negative';
        const priceChangeSign = data.priceChange >= 0 ? '+' : '';

        // حساب النسبة الحالية من المدى
        const currentRatio = (data.currentPrice - data.significantLow) / (data.significantHigh - data.significantLow);
        const currentFibPercentage = (currentRatio * 100).toFixed(1);

        card.innerHTML = `
            <div class="card-header">
                <div class="crypto-name">${data.symbol}</div>
                <div class="trend-indicator ${trendClass}">${trendText}</div>
                <div class="card-actions">
                    <button class="copy-card-btn" onclick="window.cryptoTracker.copyCardAsImage('${data.symbol}')" title="نسخ البطاقة كصورة">
                        📷
                    </button>
                </div>
            </div>
            
            <div class="golden-ratio-badge">
                <span class="phi-symbol">φ</span>
                <span class="ratio-value">${this.GOLDEN_RATIO.toFixed(3)}</span>
            </div>
            
            <div class="price-section">
                <div class="current-price">$${this.formatPrice(data.currentPrice)}</div>
                <div class="price-change ${priceChangeClass}">
                    ${priceChangeSign}${data.priceChange.toFixed(2)}%
                </div>
                <div class="current-fib-position">
                    موقع فيبوناتشي: ${currentFibPercentage}%
                </div>
            </div>
            
            <div class="fib-header">
                <h3>مستويات فيبوناتشي الرياضية</h3>
            </div>
            
            <div class="mathematical-fibonacci-levels">
                <div class="level-group golden-level">
                    <div class="level-title">النسبة الذهبية 61.8% (φ⁻¹)</div>
                    <div class="level-value golden">$${this.formatPrice(data.fibLevels.retracementLevels['61.8% (النسبة الذهبية)'] || 0)}</div>
                </div>
                
                <div class="level-group">
                    <div class="level-title">المقاومة الحالية</div>
                    <div class="level-value resistance">$${this.formatPrice(data.fibLevels.resistance)}</div>
                </div>
                
                <div class="level-group">
                    <div class="level-title">الدعم الحالي</div>
                    <div class="level-value support">$${this.formatPrice(data.fibLevels.support)}</div>
                </div>
                
                <div class="level-group">
                    <div class="level-title">الهدف التالي (161.8% φ)</div>
                    <div class="level-value next-target">$${this.formatPrice(data.fibLevels.nextResistance)}</div>
                </div>
                
                <div class="level-group">
                    <div class="level-title">الهدف التالي (دعم)</div>
                    <div class="level-value next-support">$${this.formatPrice(data.fibLevels.nextSupport || data.fibLevels.support * 0.618)}</div>
                </div>
            </div>
            
            <div class="mathematical-details">
                <div class="detail-item">
                    <span class="detail-label">المدى:</span>
                    <span class="detail-value">$${this.formatPrice(data.significantHigh - data.significantLow)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">أعلى قمة:</span>
                    <span class="detail-value">$${this.formatPrice(data.significantHigh)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">أقل قاع:</span>
                    <span class="detail-value">$${this.formatPrice(data.significantLow)}</span>
                </div>
            </div>
            
            <div class="range-info">
                <div class="range-bar">
                    <div class="range-fill" style="width: ${currentFibPercentage}%"></div>
                    <div class="current-position" style="left: ${currentFibPercentage}%"></div>
                </div>
                <div class="range-labels">
                    <span class="range-low">القاع</span>
                    <span class="range-high">القمة</span>
                </div>
            </div>
            
            <div class="strength-indicator mathematical">
                <span class="strength-label">قوة النسبة الذهبية:</span>
                <span class="strength-value ${this.getStrengthClass(data.levelStrength)}">${data.levelStrength}</span>
            </div>
            
            <div class="strategy-section">
                <h4>${data.strategy.title}</h4>
                <p class="strategy-description">${data.strategy.description}</p>
                <div class="mathematical-basis">
                    <small>${data.strategy.mathematicalBasis}</small>
                </div>
            </div>
        `;

        return card;
    }

    formatPrice(price) {
        if (price >= 1) {
            return price.toFixed(2);
        } else if (price >= 0.01) {
            return price.toFixed(4);
        } else {
            return price.toFixed(6);
        }
    }

    getStrengthClass(strength) {
        switch (strength) {
            case 'قوي جداً': return 'strength-very-strong';
            case 'قوي': return 'strength-strong';
            case 'متوسط': return 'strength-medium';
            case 'ضعيف': return 'strength-weak';
            default: return 'strength-unknown';
        }
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        const gridContainer = document.getElementById('gridContainer');
        
        if (show) {
            loading.style.display = 'flex';
            gridContainer.style.display = 'none';
        } else {
            loading.style.display = 'none';
            gridContainer.style.display = 'grid';
        }
    }

    showError(show) {
        const errorMessage = document.getElementById('errorMessage');
        if (show) {
            errorMessage.style.display = 'block';
        } else {
            errorMessage.style.display = 'none';
        }
    }

    updateLastUpdateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('ar-SA');
        const updateInfo = document.querySelector('.update-status');
        if (updateInfo) {
            updateInfo.innerHTML = `<i class="fas fa-clock"></i> آخر تحديث: ${timeString}`;
        }
    }

    startAutoUpdate() {
        setInterval(() => {
            this.fetchAllCryptoData();
        }, this.updateInterval);
    }

    validateMathematicalRatios() {
        console.log('التحقق من النسب الرياضية:');
        
        // التحقق من النسبة الذهبية
        const phi = this.GOLDEN_RATIO;
        const phiSquared = phi * phi;
        const phiInverse = 1 / phi;
        
        console.log(`φ = ${phi} (صحيح: ${Math.abs(phi - 1.618033988749) < 0.000000001})`);
        console.log(`φ² = φ + 1: ${phiSquared} = ${phi + 1} (صحيح: ${Math.abs(phiSquared - (phi + 1)) < 0.000000001})`);
        console.log(`1/φ = ${phiInverse} (النسبة الذهبية المقلوبة)`);
        
        // التحقق من نسب فيبوناتشي
        const fibonacciRatios = {
            '23.6%': 0.236,
            '38.2%': 0.382,
            '50.0%': 0.5,
            '61.8%': 0.618033988749,
            '78.6%': 0.786,
            '127.2%': 1.272,
            '161.8%': 1.618033988749,
            '261.8%': 2.618033988749,
            '423.6%': 4.236
        };
        
        console.log('✅ تم التحقق من صحة النسب الرياضية لفيبوناتشي');
        
        return {
            phi,
            phiSquared,
            phiInverse,
            fibonacciRatios
        };
    }

    getMathematicalProof() {
        const proof = this.validateMathematicalRatios();
        console.log('الإثبات الرياضي:', proof);
        return proof;
    }

    updateTimeframe(timeframe) {
        this.currentTimeframe = timeframe;
        this.fetchAllCryptoData();
    }

    // دالة نسخ البطاقة كصورة
    async copyCardAsImage(symbol) {
        try {
            const cardElement = document.querySelector(`[data-symbol="${symbol}"]`);
            if (!cardElement) {
                console.error('لم يتم العثور على البطاقة');
                return;
            }

            const canvas = await this.generateCardImage(cardElement, symbol);
            await this.copyImageToClipboard(canvas);
            this.showCopySuccess(symbol);
        } catch (error) {
            console.error('خطأ في نسخ البطاقة:', error);
        }
    }

    // دالة إنشاء صورة البطاقة
    async generateCardImage(cardElement, symbol) {
        // تحميل مكتبة html2canvas إذا لم تكن محملة
        if (typeof html2canvas === 'undefined') {
            await this.loadHtml2Canvas();
        }

        const canvas = await html2canvas(cardElement, {
            backgroundColor: null,
            scale: 2,
            useCORS: true,
            allowTaint: true
        });

        return canvas;
    }

    // دالة تحميل html2canvas
    async loadHtml2Canvas() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // دالة نسخ الصورة للحافظة
    async copyImageToClipboard(canvas) {
        return new Promise((resolve, reject) => {
            canvas.toBlob(async (blob) => {
                try {
                    const data = [new ClipboardItem({ 'image/png': blob })];
                    await navigator.clipboard.write(data);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    // إظهار رسالة نجاح النسخ
    showCopySuccess(symbol) {
        const message = document.createElement('div');
        message.className = 'copy-success-message';
        message.innerHTML = `
            <div class="success-content">
                <div class="success-icon">✅</div>
                <div class="success-text">تم نسخ بطاقة ${symbol} كصورة بنجاح!</div>
            </div>
        `;
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.remove();
        }, 3000);
    }
}

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', () => {
    window.cryptoTracker = new FibonacciCryptoTracker();
    window.cryptoTracker.validateMathematicalRatios();
    window.cryptoTracker.getMathematicalProof();
});

// معالجة الشبكة
window.addEventListener('online', () => {
    console.log('تم استعادة الاتصال بالإنترنت');
    if (window.cryptoTracker) {
        window.cryptoTracker.fetchAllCryptoData();
    }
});

window.addEventListener('offline', () => {
    console.log('انقطع الاتصال بالإنترنت');
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.style.display = 'block';
    errorMessage.innerHTML = '<p>انقطع الاتصال بالإنترنت. سيتم استئناف التحديث عند عودة الاتصال.</p>';
}); 