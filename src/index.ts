import { handleClearCache, handleHealthCheck, handleListNewsPaper, handlerWithS3Client } from './Router'
import App from './App'
import dotenv from 'dotenv'
import express from 'express'
import { handleScrapeAllCovers, handleScrapeCover } from './scrapeHandler'
import monitor from 'express-status-monitor'

const main = async () => {
	dotenv.config()
	const appServer = new App()

	const port = parseInt(process.env.PORT || '3000')
	const expressApp = await appServer.listen(port, () => console.log('Server running on port: ' + port))
	expressApp.use(monitor())
	await appServer.startCache()

	const router = express.Router()


	router.get('/scrape', handleScrapeCover)
	router.get('/scrape-all', handleScrapeAllCovers)
	router.get('/newspapers', handleListNewsPaper)
	router.post('/cache', handleClearCache)
	expressApp.use('/health', handleHealthCheck)

	expressApp.use('/api', router)

	expressApp.use(appServer.notFoundHandler, appServer.errorHandler)
}

main()
