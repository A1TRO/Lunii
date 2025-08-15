const https = require('https');
const axios = require('axios');

class SSLHelper {
    static setupSSLBypass() {
        // Create custom HTTPS agent with SSL bypass
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false,
            secureProtocol: 'TLSv1_2_method',
            timeout: 30000,
            keepAlive: true,
            maxSockets: 10,
            // Additional SSL options
            checkServerIdentity: () => undefined,
            secureOptions: require('constants').SSL_OP_NO_TLSv1 | require('constants').SSL_OP_NO_TLSv1_1
        });

        // Configure axios defaults
        axios.defaults.httpsAgent = httpsAgent;
        axios.defaults.timeout = 30000;
        
        // Set Node.js environment variables for SSL
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        
        // Override global HTTPS agent
        https.globalAgent = httpsAgent;
        
        return httpsAgent;
    }

    static createSecureRequest(options) {
        return new Promise((resolve, reject) => {
            const req = https.request({
                ...options,
                rejectUnauthorized: false,
                secureProtocol: 'TLSv1_2_method',
                timeout: 30000
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve({ data, statusCode: res.statusCode }));
            });

            req.on('error', reject);
            req.on('timeout', () => reject(new Error('Request timeout')));
            
            if (options.data) {
                req.write(options.data);
            }
            
            req.end();
        });
    }

    static async testDiscordConnection() {
        try {
            const response = await axios.get('https://discord.com/api/v9/gateway', {
                timeout: 10000,
                httpsAgent: this.setupSSLBypass()
            });
            
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    static logSSLError(error, context = '') {
        const sslErrors = [
            'CERT_UNTRUSTED',
            'CERT_HAS_EXPIRED',
            'CERT_AUTHORITY_INVALID',
            'UNABLE_TO_GET_LOCAL_ISSUER_CERTIFICATE',
            'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
            'CERT_CHAIN_TOO_LONG',
            'CERT_REVOKED',
            'INVALID_CA',
            'PATH_LENGTH_EXCEEDED',
            'INVALID_PURPOSE',
            'CERT_REJECTED',
            'HOSTNAME_MISMATCH'
        ];

        const isSSLError = sslErrors.some(sslError => 
            error.message.includes(sslError) || error.code === sslError
        );

        if (isSSLError) {
            console.warn(`SSL Certificate Error ${context}:`, {
                message: error.message,
                code: error.code,
                hostname: error.hostname,
                cert: error.cert ? {
                    subject: error.cert.subject,
                    issuer: error.cert.issuer,
                    valid_from: error.cert.valid_from,
                    valid_to: error.cert.valid_to
                } : null
            });
            
            return true;
        }
        
        return false;
    }
}

module.exports = SSLHelper;