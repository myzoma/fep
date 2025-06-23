async function fetchBinanceSymbols() {
    const res = await fetch('https://api1.binance.com/api/v3/exchangeInfo');
    const data = await res.json();
    return data.symbols
        .filter(s => s.symbol.endsWith('USDT') && s.status === 'TRADING')
        .map(s => s.symbol);
}

async function fetchOkxSymbols() {
    const res = await fetch('https://www.okx.com/api/v5/public/instruments?instType=SPOT');
    const data = await res.json();
    return data.data
        .filter(s => s.instId.endsWith('-USDT') && s.state === 'live')
        .map(s => s.instId.replace('-', ''));
}

async function getAllSymbols() {
    const [binance, okx] = await Promise.all([fetchBinanceSymbols(), fetchOkxSymbols()]);
    return Array.from(new Set([...binance, ...okx]));
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAllCryptoDataWithDelay(symbols) {
    const results = [];
    for (let i = 0; i < symbols.length; i++) {
        const symbol = symbols[i];
        // جلب البيانات للعملة
        try {
            const result = await fetchCryptoData(symbol);
            results.push(result);
        } catch (e) {
            // تجاهل الأخطاء أو سجلها
        }
        // تأخير تدريجي بين كل طلب (مثلاً 500 مللي ثانية)
        await sleep(500);
    }
    return results;
}
class FibonacciCryptoTracker {
    constructor() {
        this.cryptoData = new Map();
        this.updateInterval = 15 * 60 * 1000; // 15 دقائق
        this.fibonacciRatios = {
            retracement: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0],
            extension: [1.272, 1.414, 1.618, 2.0, 2.618, 3.14, 4.236]
        };
        this.init();
    }

    async init() {
        this.showLoading(true);
        this.cryptoSymbols = await getAllSymbols();
        await this.fetchAllCryptoData();
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
            const results = [];
for (let i = 0; i < this.cryptoSymbols.length; i++) {
    const symbol = this.cryptoSymbols[i];
    try {
        const result = await this.fetchCryptoData(symbol);
        results.push({ status: 'fulfilled', value: result });
    } catch (e) {
        results.push({ status: 'rejected', reason: e });
    }
    // تأخير 500 مللي ثانية بين كل طلب
    await sleep(500);
}

            // فقط العملات التي تحقق شرط "قوة فيبوناتشي = قوي"
            const successfulResults = results
                .filter(r => r.status === 'fulfilled' && r.value)
                .map(r => r.value)
                .filter(data => data && data.levelStrength === 'قوي');

            this.cryptoData = new Map(successfulResults.map(data => [data.symbol + 'USDT', data]));

            if (successfulResults.length > 0) {
                this.renderCryptoCards();
                this.showLoading(false);
                this.updateLastUpdateTime();
                this.showError(false);
            } else {
                throw new Error('لم يتم العثور على عملات تحقق الشروط');
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
                const [tickerResponse, klineResponse] = await Promise.all([
                    fetch(`https://api1.binance.com/api/v3/ticker/24hr?symbol=${symbol}`),
                    fetch(`https://api1.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=50`)
                ]);
                if (tickerResponse.ok && klineResponse.ok) {
                    tickerData = await tickerResponse.json();
                    klineData = await klineResponse.json();
                }
            } catch {
                const okxSymbol = symbol.replace('USDT', '-USDT');
                const [tickerResponse, klineResponse] = await Promise.all([
                    fetch(`https://www.okx.com/api/v5/market/ticker?instId=${okxSymbol}`),
                    fetch(`https://www.okx.com/api/v5/market/candles?instId=${okxSymbol}&bar=1D&limit=50`)
                ]);
                const tickerOkx = await tickerResponse.json();
                const klineOkx = await klineResponse.json();
                tickerData = this.convertOkxTicker(tickerOkx.data[0]);
                klineData = this.convertOkxKlines(klineOkx.data);
            }
            return this.processCryptoData(symbol, tickerData, klineData);
        } catch (error) {
            return null; // تجاهل العملات التي تفشل
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

    processCryptoData(symbol, tickerData, klineData) {
        if (!tickerData || !klineData || klineData.length < 10) return null;
        const currentPrice = parseFloat(tickerData.lastPrice);
        const priceChange = parseFloat(tickerData.priceChangePercent);
        const isUpTrend = priceChange > 0;

        const prices = klineData.map(candle => ({
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            timestamp: parseInt(candle[0])
        }));

        const swingHigh = Math.max(...prices.map(p => p.high));
        const swingLow = Math.min(...prices.map(p => p.low));

        const fibLevels = this.calculatePureFibonacciLevels(swingHigh, swingLow, currentPrice, isUpTrend);
        const levelStrength = this.calculateFibonacciStrength(currentPrice, fibLevels, prices);
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
        const retracementLevels = {};
        this.fibonacciRatios.retracement.forEach(ratio => {
            if (isUpTrend) {
                retracementLevels[`fib_${(ratio * 100).toFixed(1)}`] = high - (range * ratio);
            } else {
                retracementLevels[`fib_${(ratio * 100).toFixed(1)}`] = low + (range * ratio);
            }
        });

        const extensionLevels = {};
        this.fibonacciRatios.extension.forEach(ratio => {
            if (isUpTrend) {
                extensionLevels[`ext_${(ratio * 100).toFixed(1)}`] = low + (range * ratio);
            } else {
                extensionLevels[`ext_${(ratio * 100).toFixed(1)}`] = high - (range * ratio);
            }
        });

        const allLevels = { ...retracementLevels, ...extensionLevels };
        const sortedLevels = Object.values(allLevels).sort((a, b) => a - b);
        let resistance = null, nextResistance = null;
        let support = null, nextSupport = null;

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
        if (minDistanceToKeyLevel < 0.01) return 'قوي';
        if (minDistanceToKeyLevel < 0.025) return 'متوسط';
        return 'ضعيف';
    }

    generateFibonacciStrategy(currentPrice, fibLevels, isUpTrend) {
        const resistanceDistance = Math.abs(currentPrice - fibLevels.resistance) / currentPrice;
        const supportDistance = Math.abs(currentPrice - fibLevels.support) / currentPrice;
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
        setTimeout(() => {
            this.fetchAllCryptoData();
        }, 5000);
        setInterval(() => {
            this.fetchAllCryptoData();
        }, this.updateInterval);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.cryptoTracker = new FibonacciCryptoTracker();
});
