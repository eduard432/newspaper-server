import App from './App'
import dotenv from 'dotenv'
import express from 'express'
import { handlerWithS3Client } from './Router'

const main = async () => {
	dotenv.config()
	const appServer = new App()

	const port = parseInt(process.env.PORT || '3000')
	const expressApp = await appServer.listen(port, () => console.log('Server running on port: ' + port))
	await appServer.startCache()
	const s3Client = appServer.getS3Client()

	const router = express.Router()

	const { handleGetImage, handleListImages, handleScrappImage } = handlerWithS3Client(s3Client)

	router.get('/images/:fileName', handleGetImage)
	router.get('/images/list/:date', handleListImages)
	router.get('/api/scrapper', handleScrappImage)

	expressApp.use(router)

	expressApp.use(appServer.notFoundHandler, appServer.errorHandler)
}

main()
