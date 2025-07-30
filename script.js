class FibonacciCryptoTracker {
    constructor() {
        this.cryptoSymbols = [
            'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT',
            'XRPUSDT', 'SOLUSDT', 'DOTUSDT', 'DOGEUSDT',
            'AVAXUSDT', 'SHIBUSDT', 'MATICUSDT', 'LTCUSDT'
        ];
        
        // نسب فيبوناتشي الرياضية الحقيقية المستمدة من المتتالية
        // 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377...
        this.GOLDEN_RATIO = 1.618033988749; // φ (فاي) النسبة الذهبية الحقيقية
        
        // الإطار الزمني الحالي
        this.currentTimeframe = '1d';
        
        this.fibonacciRatios = {
            // نسب الارتداد الحقيقية المحسوبة رياضياً
            retracement: [
                0.0,                    // 0%
                0.236067977499,         // √φ - 1 = 23.6%
                0.381966011250,         // 1 - 1/φ = 38.2%
                0.5,                    // 50% (ليس من فيبوناتشي لكن مهم تقنياً)
                0.618033988749,         // 1/φ = 61.8% النسبة الذهبية
                0.786151377757,         // √(1/φ) = 78.6%
                1.0                     // 100%
            ],
            // نسب التمديد الحقيقية
            extension: [
                1.272019649514,         // √φ = 127.2%
                1.381966011250,         // φ - 0.236 = 138.2%
                1.618033988749,         // φ = 161.8% النسبة الذهبية
                2.0,                    // 200%
                2.618033988749,         // φ² = 261.8%
                3.141592653589,         // π (باي) = 314.2%
                4.236067977499          // φ² + φ = 423.6%
            ]
        };
        
        this.cryptoData = new Map();
        this.updateInterval = 15 * 60 * 1000;
        
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
                    fetch(`https://api1.binance.com/api/v3/ticker/24hr?symbol=${symbol}`),
                    fetch(`https://api1.binance.com/api/v3/klines?symbol=${symbol}&interval=${this.currentTimeframe}&limit=100`)
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
            lastPrice: okxData[1],
            priceChangePercent: ((parseFloat(okxData[1]) - parseFloat(okxData[2])) / parseFloat(okxData[2]) * 100).toString()
        };
    }

    convertOkxKlines(okxData) {
        return okxData.map(candle => [
            candle[0], candle[1], candle[2], candle[3], candle[4], candle[5]
        ]);
    }

    processCryptoDataWithMathematicalFibonacci(symbol, tickerData, klineData) {
        const currentPrice = parseFloat(tickerData.lastPrice);
        const priceChange = parseFloat(tickerData.priceChangePercent);
        const isUpTrend = priceChange > 0;

        // تحليل البيانات التاريخية لإيجاد أهم القمم والقيعان
        const priceData = klineData.map(candle => ({
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            timestamp: parseInt(candle[0])
        }));

        // إيجاد أعلى قمة وأقل قاع في الفترة المحددة
        const significantHigh = this.findSignificantHigh(priceData);
        const significantLow = this.findSignificantLow(priceData);

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
            levelStrength,
            strategy,
            significantHigh,
            significantLow,
            goldenRatio: this.GOLDEN_RATIO,
            lastUpdate: new Date()
        };
    }

    findSignificantHigh(priceData) {
        // إيجاد أعلى قمة مع تأكيد أنها قمة مهمة
        let maxHigh = 0;
        let maxIndex = 0;
        
        for (let i = 0; i < priceData.length; i++) {
            if (priceData[i].high > maxHigh) {
                maxHigh = priceData[i].high;
                maxIndex = i;
            }
        }
        
        return maxHigh;
    }

    findSignificantLow(priceData) {
        // إيجاد أقل قاع مع تأكيد أنه قاع مهم
        let minLow = Infinity;
        let minIndex = 0;
        
        for (let i = 0; i < priceData.length; i++) {
            if (priceData[i].low < minLow) {
                minLow = priceData[i].low;
                minIndex = i;
            }
        }
        
        return minLow;
    }

    calculateMathematicalFibonacciLevels(high, low, currentPrice, isUpTrend) {
        const range = high - low;
        
        // حساب مستويات الارتداد بالنسب الرياضية الحقيقية
        const retracementLevels = {};
        this.fibonacciRatios.retracement.forEach((ratio, index) => {
            const levelName = this.getFibonacciLevelName(ratio);
            if (isUpTrend) {
                // في الترند الصاعد: الارتداد من الأعلى
                retracementLevels[levelName] = high - (range * ratio);
            } else {
                // في الترند الهابط: الارتداد من الأسفل
                retracementLevels[levelName] = low + (range * ratio);
            }
        });

        // حساب مستويات التمديد بالنسب الرياضية الحقيقية
        const extensionLevels = {};
        this.fibonacciRatios.extension.forEach((ratio, index) => {
            const levelName = this.getExtensionLevelName(ratio);
            if (isUpTrend) {
                extensionLevels[levelName] = low + (range * ratio);
            } else {
                extensionLevels[levelName] = high - (range * ratio);
            }
        });

        // دمج جميع المستويات وترتيبها
        const allLevels = { ...retracementLevels, ...extensionLevels };
        const sortedLevels = Object.entries(allLevels)
            .sort(([,a], [,b]) => a - b)
            .map(([name, value]) => ({ name, value }));

        // تحديد المقاومة والدعم الحاليين والتاليين
        let resistance = null, nextResistance = null;
        let support = null, nextSupport = null;

        // العثور على أقرب مقاومة
       for (let level of sortedLevels) {
    if (level.value > currentPrice) {
        resistance = level.value;
        const nextIndex = sortedLevels.findIndex(l => l.value === level.value) + 1;
        nextResistance = nextIndex < sortedLevels.length ? 
                sortedLevels[nextIndex].value : 
                resistance + (range * 0.618);

        break;
    }
}


        // العثور على أقرب دعم
        for (let i = sortedLevels.length - 1; i >= 0; i--) {
    if (sortedLevels[i].value < currentPrice) {
        support = sortedLevels[i].value;
        const prevIndex = i - 1;
        nextSupport = prevIndex >= 0 ? 
             sortedLevels[prevIndex].value : 
             support - (range * 0.618);

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
            allLevels: sortedLevels,
            goldenRatioLevel: retracementLevels['61.8%'], // النسبة الذهبية الحقيقية
            range: range
        };
    }

    getFibonacciLevelName(ratio) {
        const percentage = (ratio * 100).toFixed(1);
        if (ratio === 0.618033988749) return '61.8% (النسبة الذهبية)';
        if (ratio === 0.381966011250) return '38.2%';
        if (ratio === 0.236067977499) return '23.6%';
        if (ratio === 0.786151377757) return '78.6%';
        return `${percentage}%`;
    }

    getExtensionLevelName(ratio) {
        const percentage = (ratio * 100).toFixed(1);
        if (ratio === 1.618033988749) return '161.8% (النسبة الذهبية)';
        if (ratio === 2.618033988749) return '261.8% (φ²)';
        if (ratio === 1.272019649514) return '127.2%';
        if (ratio === 4.236067977499) return '423.6%';
        return `${percentage}%`;
    }

   // استبدل الدالة الحالية بهذه
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
    
    // تسجيل للتتبع
    console.log(`أقرب مستوى ${closestLevel.name} على بُعد ${(minDistance * 100).toFixed(2)}%`);
    
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
        
        // تأكيد أن الحاوية تستخدم CSS Grid
        container.style.display = 'grid';
    }

   createMathematicalFibonacciCard(data) {
    const card = document.createElement('div');
    card.className = 'crypto-card mathematical-fib';
    
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
            case 'قوي جداً': return 'strength-very-strong';
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
            // سيتم تعيين display: grid في renderCryptoCards
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

        // تحديث كل 15 دقيقة
        setInterval(() => {
            console.log('تحديث بيانات فيبوناتشي الرياضية...');
            this.fetchAllCryptoData();
        }, this.updateInterval);
    }

    // دالة للتحقق من صحة النسب الرياضية
    validateMathematicalRatios() {
        const phi = this.GOLDEN_RATIO;
        const tolerance = 0.000000001; // دقة 9 خانات عشرية

        // التحقق من النسبة الذهبية: φ = (1 + √5) / 2
        const calculatedPhi = (1 + Math.sqrt(5)) / 2;
        const phiValid = Math.abs(phi - calculatedPhi) < tolerance;

        // التحقق من خاصية النسبة الذهبية: φ² = φ + 1
        const phiSquared = phi * phi;
        const phiPlusOne = phi + 1;
        const propertyValid = Math.abs(phiSquared - phiPlusOne) < tolerance;

        console.log('التحقق من النسب الرياضية:');
        console.log(`φ = ${phi} (صحيح: ${phiValid})`);
        console.log(`φ² = φ + 1: ${phiSquared} = ${phiPlusOne} (صحيح: ${propertyValid})`);
        console.log(`1/φ = ${1/phi} (النسبة الذهبية المقلوبة)`);

        return phiValid && propertyValid;
    }

    // دالة لعرض تفاصيل النسب الرياضية
    getMathematicalProof() {
        return {
           
            calculation: "(1 + √5) / 2",
            properties: {
                "φ² = φ + 1": `${(this.GOLDEN_RATIO * this.GOLDEN_RATIO).toFixed(9)} = ${(this.GOLDEN_RATIO + 1).toFixed(9)}`,
                "1/φ = φ - 1": `${(1/this.GOLDEN_RATIO).toFixed(9)} = ${(this.GOLDEN_RATIO - 1).toFixed(9)}`,
                "φ/1 = 1.618...": this.GOLDEN_RATIO.toFixed(9)
            },
            fibonacciSequence: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987],
            ratioProof: "lim(n→∞) F(n+1)/F(n) = φ"
        };
    }

    // دالة تحديث الإطار الزمني
    updateTimeframe(timeframe) {
        this.currentTimeframe = timeframe;
        console.log(`تم تحديث الإطار الزمني إلى: ${timeframe}`);
        
        // إعادة جلب البيانات بالإطار الزمني الجديد
        this.showLoading(true);
        this.fetchAllCryptoData();
    }

    // دالة نسخ البطاقة كصورة
    async copyCardAsImage(symbol) {
        try {
            // البحث عن البطاقة المحددة
            const cards = document.querySelectorAll('.crypto-card');
            let targetCard = null;
            
            cards.forEach(card => {
                const cardSymbol = card.querySelector('.crypto-name').textContent;
                if (cardSymbol === symbol) {
                    targetCard = card;
                }
            });
            
            if (!targetCard) {
                console.error('لم يتم العثور على البطاقة');
                return;
            }

            // استخدام html2canvas لتحويل البطاقة إلى صورة
            if (typeof html2canvas === 'undefined') {
                // تحميل html2canvas إذا لم يكن متوفراً
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                document.head.appendChild(script);
                
                script.onload = () => {
                    this.generateCardImage(targetCard, symbol);
                };
            } else {
                this.generateCardImage(targetCard, symbol);
            }
        } catch (error) {
            console.error('خطأ في نسخ البطاقة:', error);
            alert('حدث خطأ أثناء نسخ البطاقة كصورة');
        }
    }

    // دالة إنشاء صورة البطاقة
    async generateCardImage(cardElement, symbol) {
        try {
            const canvas = await html2canvas(cardElement, {
                backgroundColor: '#1a1a2e',
                scale: 2,
                logging: false,
                useCORS: true,
                allowTaint: true
            });

            // تحويل Canvas إلى Blob
            canvas.toBlob(async (blob) => {
                try {
                    // نسخ الصورة إلى الحافظة
                    await navigator.clipboard.write([
                        new ClipboardItem({
                            'image/png': blob
                        })
                    ]);
                    
                    // إظهار رسالة نجاح
                    this.showCopySuccess(symbol);
                } catch (clipboardError) {
                    // إذا فشل النسخ للحافظة، قم بتحميل الصورة
                    this.downloadCardImage(canvas, symbol);
                }
            }, 'image/png');
        } catch (error) {
            console.error('خطأ في إنشاء الصورة:', error);
            alert('حدث خطأ أثناء إنشاء الصورة');
        }
    }

    // دالة تحميل الصورة
    downloadCardImage(canvas, symbol) {
        const link = document.createElement('a');
        link.download = `fibonacci-analysis-${symbol}-${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL();
        link.click();
        
        this.showDownloadSuccess(symbol);
    }

    // إظهار رسالة نجاح النسخ
    showCopySuccess(symbol) {
        const message = document.createElement('div');
        message.className = 'copy-success-message';
        message.innerHTML = `
            <div class="success-content">
                <span class="success-icon">✅</span>
                <span class="success-text">تم نسخ بطاقة ${symbol} إلى الحافظة!</span>
            </div>
        `;
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.remove();
        }, 3000);
    }

    // إظهار رسالة نجاح التحميل
    showDownloadSuccess(symbol) {
        const message = document.createElement('div');
        message.className = 'copy-success-message';
        message.innerHTML = `
            <div class="success-content">
                <span class="success-icon">📥</span>
                <span class="success-text">تم تحميل بطاقة ${symbol} كصورة!</span>
            </div>
        `;
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.remove();
        }, 3000);
    }
}

// تهيئة التطبيق مع التحقق من النسب الرياضية
document.addEventListener('DOMContentLoaded', () => {
    window.cryptoTracker = new FibonacciCryptoTracker();
    
    // التحقق من صحة النسب الرياضية عند التشغيل
    const isValid = window.cryptoTracker.validateMathematicalRatios();
    if (!isValid) {
        console.error('خطأ في النسب الرياضية!');
    } else {
        console.log('✅ تم التحقق من صحة النسب الرياضية لفيبوناتشي');
    }
    
    // عرض الإثبات الرياضي
    console.log('الإثبات الرياضي:', window.cryptoTracker.getMathematicalProof());
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
