class RateLimiter {
    constructor(limit = 10, windowMs = 60000) {
        this.limit = limit;
        this.windowMs = windowMs;
        this.requests = new Map();
    }

    async checkLimit(key = 'default') {
        const now = Date.now();
        
        if (!this.requests.has(key)) {
            this.requests.set(key, []);
        }
        
        const userRequests = this.requests.get(key);
        
        // Remove expired requests
        const validRequests = userRequests.filter(time => now - time < this.windowMs);
        this.requests.set(key, validRequests);
        
        if (validRequests.length >= this.limit) {
            const oldestRequest = Math.min(...validRequests);
            const resetTime = oldestRequest + this.windowMs;
            const waitTime = resetTime - now;
            
            throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds.`);
        }
        
        validRequests.push(now);
        this.requests.set(key, validRequests);
        
        return true;
    }

    getRemainingRequests(key = 'default') {
        const now = Date.now();
        
        if (!this.requests.has(key)) {
            return this.limit;
        }
        
        const userRequests = this.requests.get(key);
        const validRequests = userRequests.filter(time => now - time < this.windowMs);
        
        return Math.max(0, this.limit - validRequests.length);
    }

    getResetTime(key = 'default') {
        const now = Date.now();
        
        if (!this.requests.has(key)) {
            return now;
        }
        
        const userRequests = this.requests.get(key);
        const validRequests = userRequests.filter(time => now - time < this.windowMs);
        
        if (validRequests.length === 0) {
            return now;
        }
        
        const oldestRequest = Math.min(...validRequests);
        return oldestRequest + this.windowMs;
    }

    clear(key = null) {
        if (key) {
            this.requests.delete(key);
        } else {
            this.requests.clear();
        }
    }
}

module.exports = RateLimiter;