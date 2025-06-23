class FibonacciCryptoTracker {
    constructor() {
        this.cryptoSymbols = [
            'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT',
            'XRPUSDT', 'SOLUSDT', 'DOTUSDT', 'DOGEUSDT',
            'AVAXUSDT', 'SHIBUSDT', 'MATICUSDT', 'LTCUSDT'
        ];
        // مستويات فيبوناتشي الحقيقية بدقة 100%
        this.fibonacciRatios = {
            retracement: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0],
            extension: [1.272, 1.414, 1.618, 2.0, 2.618, 3.14, 4.236]
        };
        this.cryptoData = new Map();
        this.updateInterval = 15 * 60 * 1000; // 15 minutes
        
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
        dataSource.innerHTML = 'مصدر البيانات: Binance & OKX APIs';
        document.body.appendChild(dataSource);
    }

    async fetchAllCryptoData() {
        try {
            const promises = this.cryptoSymbols.map(symbol => this.fetchCryptoData(symbol));
            const results = await Promise.allSettled(promises);
            
            // فلترة النتائج الناجحة فقط
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
            // جلب البيانات من Binance أولاً
            let tickerData, klineData;
            
            try {
                const [tickerResponse, klineResponse] = await Promise.all([
                    fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`),
                    fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=50`)
                ]);
                
                if (tickerResponse.ok && klineResponse.ok) {
                    tickerData = await tickerResponse.json();
                    klineData = await klineResponse.json();
                }
            } catch (binanceError) {
                console.log(`Binance failed for ${symbol}, trying OKX...`);
                // محاولة جلب البيانات من OKX كبديل
                const okxSymbol = symbol.replace('USDT', '-USDT');
                const [tickerResponse, klineResponse] = await Promise.all([
                    fetch(`https://www.okx.com/api/v5/market/ticker?instId=${okxSymbol}`),
                    fetch(`https://www.okx.com/api/v5/market/candles?instId=${okxSymbol}&bar=1D&limit=50`)
                ]);
                
                const tickerOkx = await tickerResponse.json();
                const klineOkx = await klineResponse.json();
                
                // تحويل بيانات OKX لتتوافق مع تنسيق Binance
                tickerData = this.convertOkxTicker(tickerOkx.data[0]);
                klineData = this.convertOkxKlines(klineOkx.data);
            }

            const cryptoInfo = this.processCryptoData(symbol, tickerData, klineData);
            this.cryptoData.set(symbol, cryptoInfo);
        } catch (error) {
            console.error(`Error fetching data for ${symbol}:`, error);
            throw error; // لا نضع بيانات وهمية، نرمي الخطأ
        }
    }

    convertOkxTicker(okxData) {
        return {
            lastPrice: okxData[1],
            priceChangePercent: ((parseFloat(okxData[1]) - parseFloat(okxData[2])) / parseFloat(okxData[2]) * 100).toString()
        };
    }

    convertOkxKlines(okxData) {
        return okxData.map(candle => [
            candle[0], // timestamp
            candle[1], // open
            candle[2], // high
            candle[3], // low
            candle[4], // close
            candle[5]  // volume
        ]);
    }

    processCryptoData(symbol, tickerData, klineData) {
        const currentPrice = parseFloat(tickerData.lastPrice);
        const priceChange = parseFloat(tickerData.priceChangePercent);
        const isUpTrend = priceChange > 0;

        // حساب أعلى وأقل سعر من البيانات التاريخية
        const prices = klineData.map(candle => ({
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            timestamp: parseInt(candle[0])
        }));

        // العثور على أعلى قمة وأقل قاع في الفترة الأخيرة
        const swingHigh = Math.max(...prices.map(p => p.high));
        const swingLow = Math.min(...prices.map(p => p.low));

        // تطبيق منطق فيبوناتشي الحقيقي 100%
        const fibLevels = this.calculatePureFibonacciLevels(swingHigh, swingLow, currentPrice, isUpTrend);
        
        // تحديد قوة المستوى بناءً على منطق فيبوناتشي
        const levelStrength = this.calculateFibonacciStrength(currentPrice, fibLevels, prices);

        // توليد الاستراتيجية بناءً على مستويات فيبوناتشي
        const strategy = this.generateFibonacciStrategy(currentPrice, fibLevels, isUpTrend);

        return {
            symbol: symbol.replace('USDT', ''),
            currentPrice,
            priceChange,
            isUpTrend,
            fibLevels,
            levelStrength,
            strategy,
            swingHigh,
            swingLow,
            lastUpdate: new Date()
        };
    }

    calculatePureFibonacciLevels(high, low, currentPrice, isUpTrend) {
        const range = high - low;
        
        // حساب مستويات فيبوناتشي الارتدادية (Retracement)
        const retracementLevels = {};
        this.fibonacciRatios.retracement.forEach(ratio => {
            if (isUpTrend) {
                // في الترند الصاعد: نحسب الارتداد من الأعلى
                retracementLevels[`fib_${(ratio * 100).toFixed(1)}`] = high - (range * ratio);
            } else {
                // في الترند الهابط: نحسب الارتداد من الأسفل
                retracementLevels[`fib_${(ratio * 100).toFixed(1)}`] = low + (range * ratio);
            }
        });

        // حساب مستويات فيبوناتشي التمديدية (Extension)
        const extensionLevels = {};
        this.fibonacciRatios.extension.forEach(ratio => {
            if (isUpTrend) {
                extensionLevels[`ext_${(ratio * 100).toFixed(1)}`] = low + (range * ratio);
            } else {
                extensionLevels[`ext_${(ratio * 100).toFixed(1)}`] = high - (range * ratio);
            }
        });

        // تحديد المقاومة والدعم الحاليين والتاليين بناءً على السعر الحالي
        const allLevels = { ...retracementLevels, ...extensionLevels };
        const sortedLevels = Object.values(allLevels).sort((a, b) => a - b);

        let resistance = null, nextResistance = null;
        let support = null, nextSupport = null;

        // العثور على أقرب مقاومة ودعم
        for (let i = 0; i < sortedLevels.length; i++) {
            if (sortedLevels[i] > currentPrice) {
                resistance = sortedLevels[i];
                nextResistance = sortedLevels[i + 1] || sortedLevels[i];
                break;
            }
        }

        for (let i = sortedLevels.length - 1; i >= 0; i--) {
            if (sortedLevels[i] < currentPrice) {
                support = sortedLevels[i];
                nextSupport = sortedLevels[i - 1] || sortedLevels[i];
                break;
            }
        }

        return {
            resistance: resistance || high,
            nextResistance: nextResistance || high,
            support: support || low,
            nextSupport: nextSupport || low,
            retracementLevels,
            extensionLevels,
            allLevels: sortedLevels
        };
    }

    calculateFibonacciStrength(currentPrice, fibLevels, priceHistory) {
        // حساب قوة المستوى بناءً على:
        // 1. المسافة من مستويات فيبوناتشي الرئيسية
        // 2. عدد مرات الاختبار التاريخي للمستوى
        // 3. حجم التداول عند المستوى

        const keyFibLevels = [
            fibLevels.retracementLevels.fib_38_2,
            fibLevels.retracementLevels.fib_50_0,
            fibLevels.retracementLevels.fib_61_8
        ];

        let minDistanceToKeyLevel = Infinity;
        keyFibLevels.forEach(level => {
            if (level) {
                const distance = Math.abs(currentPrice - level) / currentPrice;
                minDistanceToKeyLevel = Math.min(minDistanceToKeyLevel, distance);
            }
        });

        // تحديد القوة بناءً على القرب من مستويات فيبوناتشي الذهبية
        if (minDistanceToKeyLevel < 0.01) return 'قوي'; // ضمن 1% من مستوى فيبوناتشي رئيسي
        if (minDistanceToKeyLevel < 0.025) return 'متوسط'; // ضمن 2.5%
        return 'ضعيف';
    }

    generateFibonacciStrategy(currentPrice, fibLevels, isUpTrend) {
        const resistanceDistance = Math.abs(currentPrice - fibLevels.resistance) / currentPrice;
        const supportDistance = Math.abs(currentPrice - fibLevels.support) / currentPrice;

        // استراتيجية مبنية على مستويات فيبوناتشي الحقيقية
        if (resistanceDistance < supportDistance) {
            return {
                type: 'resistance_breakout',
                title: 'استراتيجية اختراق مقاومة فيبوناتشي',
                description: `اختراق مستوى ${this.formatPrice(fibLevels.resistance)} يستهدف ${this.formatPrice(fibLevels.nextResistance)} (مستوى فيبوناتشي التالي)`
            };
        } else {
            return {
                type: 'support_break',
                title: 'استراتيجية كسر دعم فيبوناتشي',
                description: `كسر مستوى ${this.formatPrice(fibLevels.support)} يستهدف ${this.formatPrice(fibLevels.nextSupport)} (مستوى فيبوناتشي التالي)`
            };
        }
    }

    renderCryptoCards() {
        const container = document.getElementById('gridContainer');
        container.innerHTML = '';

        this.cryptoData.forEach((data, symbol) => {
            const card = this.createCryptoCard(data);
            container.appendChild(card);
        });
    }

    createCryptoCard(data) {
        const card = document.createElement('div');
        card.className = 'crypto-card';
        
        const trendClass = data.isUpTrend ? 'trend-up' : 'trend-down';
        const trendText = data.isUpTrend ? 'صاعد' : 'هابط';
        const priceChangeClass = data.priceChange >= 0 ? 'positive' : 'negative';
        const priceChangeSign = data.priceChange >= 0 ? '+' : '';

        card.innerHTML = `
            <div class="card-header">
                <div class="crypto-name">${data.symbol}</div>
                <div class="trend-indicator ${trendClass}">${trendText}</div>
            </div>
            
            <div class="price-section">
                <div class="current-price">$${this.formatPrice(data.currentPrice)}</div>
                <div class="price-change ${priceChangeClass}">
                    ${priceChangeSign}${data.priceChange.toFixed(2)}%
                </div>
            </div>
            
            <div class="fibonacci-levels">
                <div class="level-group">
                    <div class="level-title">مقاومة فيبوناتشي</div>
                    <div class="level-value resistance">$${this.formatPrice(data.fibLevels.resistance)}</div>
                </div>
                
                <div class="level-group">
                    <div class="level-title">الهدف التالي (مقاومة)</div>
                    <div class="level-value next-target">$${this.formatPrice(data.fibLevels.nextResistance)}</div>
                </div>
                
                <div class="level-group">
                    <div class="level-title">دعم فيبوناتشي</div>
                    <div class="level-value support">$${this.formatPrice(data.fibLevels.support)}</div>
                </div>
                
                <div class="level-group">
                    <div class="level-title">الهدف التالي (دعم)</div>
                    <div class="level-value next-target">$${this.formatPrice(data.fibLevels.nextSupport)}</div>
                </div>
            </div>
            
            <div class="fibonacci-details">
                <div class="fib-range">
                    <small>المدى: $${this.formatPrice(data.swingLow)} - $${this.formatPrice(data.swingHigh)}</small>
                </div>
            </div>
            
            <div class="strength-indicator">
                <span class="strength-label">قوة مستوى فيبوناتشي:</span>
                <span class="strength-value ${this.getStrengthClass(data.levelStrength)}">${data.levelStrength}</span>
            </div>
            
            <div class="strategy-section">
                <div class="strategy-title">${data.strategy.title}</div>
                <div class="strategy-text">${data.strategy.description}</div>
            </div>
        `;

        return card;
    }

    formatPrice(price) {
        if (price >= 1000) {
            return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } else if (price >= 1) {
            return price.toFixed(4);
        } else if (price >= 0.01) {
            return price.toFixed(6);
        } else {
            return price.toFixed(8);
        }
    }

    getStrengthClass(strength) {
        switch (strength) {
            case 'قوي': return 'strength-strong';
            case 'متوسط': return 'strength-medium';
            case 'ضعيف': return 'strength-weak';
            default: return 'strength-weak';
        }
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        const container = document.getElementById('gridContainer');
        
        if (show) {
            loading.style.display = 'block';
            container.style.display = 'none';
        } else {
            loading.style.display = 'none';
            container.style.display = 'grid';
        }
    }

    showError(show) {
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.style.display = show ? 'block' : 'none';
    }

    updateLastUpdateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        document.getElementById('lastUpdate').textContent = timeString;
    }

    startAutoUpdate() {
        // تحديث فوري عند بدء التطبيق
        setTimeout(() => {
            this.fetchAllCryptoData();
        }, 5000);

        // ثم تحديث كل 15 دقيقة
        setInterval(() => {
            console.log('تحديث بيانات فيبوناتشي...');
            this.fetchAllCryptoData();
        }, this.updateInterval);
    }

    // دالة لحساب مستويات فيبوناتشي الدقيقة للتحليل المتقدم
    getDetailedFibonacciAnalysis(symbol) {
        const data = this.cryptoData.get(symbol + 'USDT');
        if (!data) return null;

        const analysis = {
            currentLevel: this.identifyCurrentFibLevel(data.currentPrice, data.fibLevels),
            nextKeyLevels: this.getNextKeyFibLevels(data.currentPrice, data.fibLevels),
            fibonacciZones: this.calculateFibonacciZones(data.fibLevels),
            recommendation: this.getFibonacciRecommendation(data)
        };

        return analysis;
    }

    identifyCurrentFibLevel(currentPrice, fibLevels) {
        const allLevels = fibLevels.allLevels;
        let closestLevel = null;
        let minDistance = Infinity;

        // العثور على أقرب مستوى فيبوناتشي
        Object.entries(fibLevels.retracementLevels).forEach(([key, value]) => {
            const distance = Math.abs(currentPrice - value);
            if (distance < minDistance) {
                minDistance = distance;
                closestLevel = {
                    level: key.replace('fib_', '').replace('_', '.') + '%',
                    price: value,
                    distance: (distance / currentPrice) * 100
                };
            }
        });

        return closestLevel;
    }

    getNextKeyFibLevels(currentPrice, fibLevels) {
        const keyLevels = [
            { name: '38.2%', value: fibLevels.retracementLevels.fib_38_2 },
            { name: '50%', value: fibLevels.retracementLevels.fib_50_0 },
            { name: '61.8%', value: fibLevels.retracementLevels.fib_61_8 },
            { name: '78.6%', value: fibLevels.retracementLevels.fib_78_6 }
        ].filter(level => level.value && Math.abs(level.value - currentPrice) / currentPrice > 0.005);

        return keyLevels.sort((a, b) => 
            Math.abs(a.value - currentPrice) - Math.abs(b.value - currentPrice)
        ).slice(0, 3);
    }

    calculateFibonacciZones(fibLevels) {
        // مناطق فيبوناتشي القوية (تجمع عدة مستويات)
        const zones = [];
        const levels = Object.values(fibLevels.retracementLevels).filter(v => v);
        
        for (let i = 0; i < levels.length - 1; i++) {
            const zone = {
                lower: Math.min(levels[i], levels[i + 1]),
                upper: Math.max(levels[i], levels[i + 1]),
                strength: this.calculateZoneStrength(levels[i], levels[i + 1])
            };
            zones.push(zone);
        }

        return zones.sort((a, b) => b.strength - a.strength).slice(0, 3);
    }

    calculateZoneStrength(level1, level2) {
        // حساب قوة المنطقة بناءً على أهمية مستويات فيبوناتشي
        const importantLevels = [0.382, 0.5, 0.618];
        let strength = 0;
        
        importantLevels.forEach(ratio => {
            const distance1 = Math.abs(level1 - ratio);
            const distance2 = Math.abs(level2 - ratio);
            if (distance1 < 0.05 || distance2 < 0.05) strength += 1;
        });

        return strength;
    }

    getFibonacciRecommendation(data) {
        const currentLevel = this.identifyCurrentFibLevel(data.currentPrice, data.fibLevels);
        const trend = data.isUpTrend ? 'صاعد' : 'هابط';
        
        let recommendation = '';
        
        if (currentLevel && currentLevel.distance < 2) {
            if (currentLevel.level.includes('61.8')) {
                recommendation = `السعر قريب من المستوى الذهبي ${currentLevel.level}. مستوى قوي للارتداد في الترند ${trend}.`;
            } else if (currentLevel.level.includes('50')) {
                recommendation = `السعر عند مستوى 50% - نقطة توازن مهمة. مراقبة الاختراق أو الارتداد.`;
            } else if (currentLevel.level.includes('38.2')) {
                recommendation = `السعر قريب من مستوى 38.2% - أول مستوى ارتداد مهم في الترند ${trend}.`;
            }
        } else {
            recommendation = `السعر بين مستويات فيبوناتشي. المستوى التالي: ${data.fibLevels.resistance > data.currentPrice ? 'مقاومة' : 'دعم'}.`;
        }

        return recommendation;
    }
}

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    window.cryptoTracker = new FibonacciCryptoTracker();
});

// معالجة أخطاء الشبكة
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

// معالجة الأخطاء العامة
window.addEventListener('error', (event) => {
    console.error('خطأ في التطبيق:', event.error);
});
// إضافة معلومات إضافية للـ CSS
