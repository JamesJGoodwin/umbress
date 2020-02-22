import delay from 'delay'
import dotenv from 'dotenv'
import express from 'express'
import umbress from '../../dist/index'
import request from 'supertest'
import Redis from 'ioredis'

const redis = new Redis({
    keyPrefix: 'umbress_'
})

dotenv.config()

beforeAll(async done => {
    const keys = await redis.keys('umbress_abuseipdb_*')
    const command = ['del']

    for (const key of keys) {
        command.push(key.replace('umbress_', ''))
    }

    await redis.pipeline([command]).exec()

    done()
})

describe('send request with malicious IP, get response with automated check', function() {
    const app = express()

    app.use(
        umbress({
            isProxyTrusted: true,
            checkSuspiciousAddresses: {
                enabled: true,
                token: process.env.ABUSEIPDB_TOKEN,
                action: 'check'
            }
        })
    )

    app.get('/', function(req, res) {
        res.send('Access granted!')
    })

    it('should response with 503', async done => {
        await request(app)
            .get('/')
            .set('X-Forwarded-For', '222.186.42.155')
            .expect(200)
            .expect('Access granted!')

        await delay(5000)

        await request(app)
            .get('/')
            .set('X-Forwarded-For', '222.186.42.155')
            .expect('Content-type', /html/)
            .expect(503)
            .expect(/Checking your browser before accessing the website/)

        done()
    }, 10_000)
})

describe('send request with malicious IP, get response with block', function() {
    const app = express()

    app.use(
        umbress({
            isProxyTrusted: true,
            checkSuspiciousAddresses: {
                enabled: true,
                token: process.env.ABUSEIPDB_TOKEN,
                action: 'block'
            }
        })
    )

    app.get('/', function(req, res) {
        res.send('Access granted!')
    })

    it('should response with 503', async done => {
        await request(app)
            .get('/')
            .set('X-Forwarded-For', '112.85.42.188')
            .expect('Content-type', /html/)
            .expect(200)
            .expect('Access granted!')

        await delay(5000)

        await request(app)
            .get('/')
            .set('X-Forwarded-For', '112.85.42.188')
            .expect(403)

        done()
    }, 10_000)
})

describe('send request with bad IP, get blocked by 403', function() {
    const app = express()

    app.use(
        umbress({
            isProxyTrusted: true,
            checkSuspiciousAddresses: {
                enabled: true,
                token: process.env.ABUSEIPDB_TOKEN,
                action: 'block'
            }
        })
    )

    app.get('/', function(req, res) {
        res.send('Access granted!')
    })

    it('should forbid access', async done => {
        await request(app)
            .get('/')
            .set('X-Forwarded-For', '222.186.190.92')
            .expect('Content-type', /html/)
            .expect(200)
            .expect('Access granted!')

        await delay(5000)

        await request(app)
            .get('/')
            .set('X-Forwarded-For', '222.186.190.92')
            .expect(403)

        done()
    }, 10_000)
})

describe('send request with good IP, access should be granted', function() {
    const app = express()

    app.use(
        umbress({
            isProxyTrusted: true,
            checkSuspiciousAddresses: {
                enabled: true,
                token: process.env.ABUSEIPDB_TOKEN,
                action: 'check'
            }
        })
    )

    app.get('/', function(req, res) {
        res.send('Access granted!')
    })

    it('should response with 200 ok', async done => {
        await request(app)
            .get('/')
            .set('X-Forwarded-For', '140.82.118.3')
            .expect('Content-type', /html/)
            .expect(200)
            .expect('Access granted!')

        await delay(5000)

        await request(app)
            .get('/')
            .set('X-Forwarded-For', '140.82.118.3')
            .expect('Content-type', /html/)
            .expect(200)
            .expect('Access granted!')

        done()
    }, 10_000)
})
