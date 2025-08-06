/**
 * Test Upstash Redis REST API
 * POST /api/test/upstash-rest
 */

export default defineEventHandler(async (event) => {
  try {
    const restUrl = process.env.UPSTASH_REDIS_REST_URL
    const restToken = process.env.UPSTASH_REDIS_REST_TOKEN

    if (!restUrl || !restToken) {
      return {
        success: false,
        error: 'Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN',
        debug: {
          restUrl: restUrl ? 'Set' : 'Not set',
          restToken: restToken ? 'Set' : 'Not set'
        }
      }
    }

    const headers = {
      'Authorization': `Bearer ${restToken}`,
      'Content-Type': 'application/json'
    }

    console.log('Testing Upstash REST API...')

    // Test 1: PING command
    const pingResponse = await fetch(`${restUrl}/ping`, {
      method: 'GET',
      headers
    })

    if (!pingResponse.ok) {
      throw new Error(`PING failed: ${pingResponse.status} ${pingResponse.statusText}`)
    }

    const pingResult = await pingResponse.text()
    console.log('✅ PING successful:', pingResult)

    // Test 2: SET command
    const testKey = `test:${Date.now()}`
    const testValue = JSON.stringify({
      message: 'Hello from Upstash REST!',
      timestamp: new Date().toISOString()
    })

    const setResponse = await fetch(`${restUrl}/set/${testKey}`, {
      method: 'POST',
      headers,
      body: testValue
    })

    if (!setResponse.ok) {
      throw new Error(`SET failed: ${setResponse.status} ${setResponse.statusText}`)
    }

    const setResult = await setResponse.text()
    console.log('✅ SET successful:', setResult)

    // Test 3: GET command
    const getResponse = await fetch(`${restUrl}/get/${testKey}`, {
      method: 'GET',
      headers
    })

    if (!getResponse.ok) {
      throw new Error(`GET failed: ${getResponse.status} ${getResponse.statusText}`)
    }

    const getValue = await getResponse.json()
    console.log('✅ GET successful:', getValue)

    // Test 4: List operations (for queue simulation)
    const queueKey = `test-queue:${Date.now()}`
    
    // LPUSH - add to queue
    const lpushResponse = await fetch(`${restUrl}/lpush/${queueKey}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(['job1', 'job2', 'job3'])
    })

    const lpushResult = await lpushResponse.json()
    console.log('✅ LPUSH successful:', lpushResult)

    // LLEN - get queue length
    const llenResponse = await fetch(`${restUrl}/llen/${queueKey}`, {
      method: 'GET',
      headers
    })

    const queueLength = await llenResponse.json()
    console.log('✅ LLEN successful:', queueLength)

    // RPOP - remove from queue
    const rpopResponse = await fetch(`${restUrl}/rpop/${queueKey}`, {
      method: 'POST',
      headers
    })

    const poppedItem = await rpopResponse.json()
    console.log('✅ RPOP successful:', poppedItem)

    // Cleanup
    await fetch(`${restUrl}/del/${testKey}`, { method: 'POST', headers })
    await fetch(`${restUrl}/del/${queueKey}`, { method: 'POST', headers })

    return {
      success: true,
      message: 'Upstash REST API test completed successfully!',
      results: {
        ping: pingResult,
        setGet: {
          key: testKey,
          setValue: testValue,
          getValue: getValue
        },
        queue: {
          queueKey,
          itemsPushed: lpushResult,
          queueLength: queueLength,
          poppedItem: poppedItem
        }
      },
      config: {
        restUrl: restUrl,
        tokenPrefix: restToken.substring(0, 10) + '...'
      },
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('Upstash REST API test error:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      config: {
        restUrl: process.env.UPSTASH_REDIS_REST_URL || 'Not set',
        restToken: process.env.UPSTASH_REDIS_REST_TOKEN ? 'Set' : 'Not set'
      },
      timestamp: new Date().toISOString()
    }
  }
})