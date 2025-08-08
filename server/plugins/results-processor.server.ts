import { startResultsConsumer, stopResultsConsumer } from '../utils/results/results-consumer'

/**
 * Auto-start results processor plugin for Nuxt server
 */
export default defineNitroPlugin(async (nitroApp) => {
  // Check if results processor should be enabled
  const enabled = process.env.RESULTS_PROCESSOR_ENABLED !== 'false'
  
  if (!enabled) {
    console.info('🚫 Results processor disabled via environment variable')
    return
  }
  
  // Check required environment variables
  const redisUrl = process.env.REDIS_URL || process.env.KV_REST_API_URL
  if (!redisUrl) {
    console.warn('⚠️ REDIS_URL not configured, results processor will not start')
    return
  }
  
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase credentials not configured, results processor will not start')
    return
  }
  
  try {
    console.info('🚀 Starting results processor plugin...')
    
    // Start the results consumer
    await startResultsConsumer()
    
    console.info('✅ Results processor started successfully')
    
    // Setup graceful shutdown
    const shutdownHandler = async () => {
      console.info('🛑 Shutting down results processor...')
      try {
        await stopResultsConsumer()
        console.info('✅ Results processor stopped successfully')
      } catch (error) {
        console.error('❌ Error stopping results processor:', error)
      }
    }
    
    // Register shutdown handlers
    process.on('SIGTERM', shutdownHandler)
    process.on('SIGINT', shutdownHandler)
    process.on('SIGUSR2', shutdownHandler) // Nodemon restart signal
    
    // Handle Nitro close event
    nitroApp.hooks.hook('close', async () => {
      await shutdownHandler()
    })
    
  } catch (error) {
    console.error('💥 Failed to start results processor:', error)
    
    // In production, we might want to exit the process
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 Exiting process due to results processor startup failure')
      process.exit(1)
    }
  }
})

/**
 * Process lifecycle events
 */
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception in results processor:', error)
  // Log error but don't exit - let the main process handle it
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled rejection in results processor:', reason, 'at', promise)
  // Log error but don't exit - let the main process handle it
})