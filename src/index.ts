import { handleClearCache, handleHealthCheck, handleListNewsPaper, handlerWithS3Client } from './Router'
import App from './App'
import dotenv from 'dotenv'
import express from 'express'

const main = async () => {
	dotenv.config()
	const appServer = new App()

	const port = parseInt(process.env.PORT || '3000')
	const expressApp = await appServer.listen(port, () => console.log('Server running on port: ' + port))
	await appServer.startCache()
	const s3Client = appServer.getS3Client()

	const router = express.Router()

	const { handleGetImage, handleListImages, handleScrappImage, handleScrappAllImages } = handlerWithS3Client(s3Client)

	router.get('/newspapers', handleListNewsPaper)
	router.get('/cover', handleScrappImage)
	router.get('/all-covers', handleScrappAllImages)
	router.get('/covers/:date', handleListImages)
	router.get('/images/:fileName', handleGetImage)
	router.post('/cache', handleClearCache)
	expressApp.use('/health', handleHealthCheck)

	expressApp.use('/api', router)

	expressApp.use(appServer.notFoundHandler, appServer.errorHandler)
}

main()
